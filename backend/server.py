from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import base64
import uuid
import io
from datetime import datetime, timezone
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Tuple
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "Tu es un expert en reconnaissance de caractères (OCR), extraction de données et business analysis.\n"
    "Mission : Analyser une image contenant des écritures manuscrites et transcrire l'intégralité des données.\n\n"
    "Directives :\n"
    "- Si un mot est totalement illisible, remplace-le par [ILLISIBLE].\n"
    "- Respecte la structure visuelle originale (alignements, colonnes, regroupements).\n"
    "- Nettoie les ratures pour garder uniquement la donnée finale.\n\n"
    "Format de sortie OBLIGATOIRE :\n"
    "- CSV uniquement, séparateur point-virgule (;).\n"
    "- Première ligne = en-têtes de colonnes.\n"
    "- Aucune phrase d'introduction, aucun commentaire.\n"
    "- Commence directement par les en-têtes CSV."
)

MAX_PDF_PAGES = 10


class TranscriptionRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    model_used: str
    csv_content: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    page_count: int = 1


# ─── Helpers ──────────────────────────────────────────────────────────────────

def clean_csv(text: str) -> str:
    """Strip markdown fences and normalise line endings."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        end = len(lines) - 1 if lines[-1].strip().startswith("```") else len(lines)
        text = "\n".join(lines[1:end])
    return text.strip().replace("\r\n", "\n").replace("\r", "\n")


def resolve_model(model: str) -> Tuple[str, str]:
    """Return (provider, model_name) or raise HTTP 400."""
    mapping = {
        "gpt-4o": ("openai", "gpt-4o"),
        "claude-sonnet-4-6": ("anthropic", "claude-sonnet-4-6"),
    }
    if model not in mapping:
        raise HTTPException(status_code=400, detail=f"Modèle inconnu: {model}")
    return mapping[model]


def file_to_images(content: bytes, ext: str) -> Tuple[List[str], int]:
    """Convert uploaded file bytes to a list of base64-encoded PNG images."""
    if ext in ("jpg", "jpeg", "png", "webp"):
        return [base64.b64encode(content).decode("utf-8")], 1

    if ext == "pdf":
        try:
            import fitz  # pymupdf

            pdf = fitz.open(stream=io.BytesIO(content), filetype="pdf")
            page_count = len(pdf)
            images = []
            for i in range(min(page_count, MAX_PDF_PAGES)):
                pix = pdf[i].get_pixmap(dpi=150)
                images.append(base64.b64encode(pix.tobytes("png")).decode("utf-8"))
            return images, page_count
        except Exception as exc:
            logger.error("PDF processing error: %s", exc)
            raise HTTPException(status_code=400, detail=f"Erreur traitement PDF: {exc}") from exc

    raise HTTPException(
        status_code=400,
        detail="Format non supporté. Utilisez JPG, PNG, WEBP ou PDF.",
    )


async def transcribe_images(
    images_b64: List[str], provider: str, model_name: str, api_key: str
) -> str:
    """Send each image to the LLM and stitch the CSV parts together."""
    csv_parts: List[str] = []

    for i, img_b64 in enumerate(images_b64):
        try:
            chat = LlmChat(
                api_key=api_key,
                session_id=str(uuid.uuid4()),
                system_message=SYSTEM_PROMPT,
            ).with_model(provider, model_name)

            page_label = f" (page {i + 1})" if len(images_b64) > 1 else ""
            message = UserMessage(
                text=f"Transcris ce document manuscrit en CSV.{page_label}",
                file_contents=[ImageContent(image_base64=img_b64)],
            )
            response = await chat.send_message(message)
            csv_text = clean_csv(response)

            if i == 0:
                csv_parts.append(csv_text)
            else:
                lines = csv_text.split("\n")
                if len(lines) > 1:
                    csv_parts.append("\n".join(lines[1:]))
        except Exception as exc:
            logger.error("LLM error on page %d: %s", i + 1, exc)
            raise HTTPException(status_code=500, detail=f"Erreur transcription: {exc}") from exc

    return "\n".join(csv_parts)


# ─── Routes ───────────────────────────────────────────────────────────────────

@api_router.get("/")
async def root():
    return {"message": "OCR Manuscrit API"}


@api_router.post("/transcribe")
async def transcribe_document(
    file: UploadFile = File(...),
    model: str = Form(default="gpt-4o"),
):
    content = await file.read()
    filename = file.filename or "document"
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

    api_key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="Clé API non configurée")

    provider, model_name = resolve_model(model)
    images_b64, page_count = file_to_images(content, ext)
    csv_content = await transcribe_images(images_b64, provider, model_name, api_key)

    record = TranscriptionRecord(
        filename=filename,
        model_used=model,
        csv_content=csv_content,
        page_count=page_count,
    )
    await db.transcriptions.insert_one(record.model_dump())

    return {
        "id": record.id,
        "filename": record.filename,
        "model_used": record.model_used,
        "csv_content": record.csv_content,
        "created_at": record.created_at,
        "page_count": record.page_count,
    }


@api_router.get("/history")
async def get_history():
    return await db.transcriptions.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)


@api_router.delete("/history/{record_id}")
async def delete_history(record_id: str):
    result = await db.transcriptions.delete_one({"id": record_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Enregistrement non trouvé")
    return {"success": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
