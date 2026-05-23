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
from typing import List
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """Tu es un expert en reconnaissance de caractères (OCR), extraction de données et business analysis.
Mission : Analyser une image contenant des écritures manuscrites (textes, listes ou tableaux tracés à la main) et transcrire l'intégralité des données textuelles et numériques.

Directives strictes de transcription :
- Déchiffre l'écriture manuscrite avec la plus grande précision possible. Si un mot est totalement illisible, remplace-le par [ILLISIBLE].
- Respecte scrupuleusement la structure visuelle originale (alignements, colonnes implicites, regroupements de données).
- Nettoie les ratures ou les corrections évidentes pour ne garder que la donnée finale voulue par l'auteur.

Format de sortie OBLIGATOIRE :
- Génère le résultat UNIQUEMENT sous la forme d'un tableau au format CSV.
- Utilise le point-virgule (;) comme séparateur de colonne.
- Assure-toi que la première ligne contient des en-têtes de colonnes clairs et logiques.
- Ne mets AUCUNE phrase d'introduction, aucune explication, aucun commentaire avant ou après le tableau.
- Commence directement par les en-têtes CSV.
- Ne mets pas de guillemets autour des valeurs sauf si elles contiennent des point-virgules."""


def clean_csv(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        start = 1
        end = len(lines) - 1 if lines[-1].strip().startswith("```") else len(lines)
        text = "\n".join(lines[start:end])
    return text.strip().replace("\r\n", "\n").replace("\r", "\n")


class TranscriptionRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    model_used: str
    csv_content: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    page_count: int = 1


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

    if model == "gpt-4o":
        provider, model_name = "openai", "gpt-4o"
    elif model == "claude-sonnet-4-6":
        provider, model_name = "anthropic", "claude-sonnet-4-6"
    else:
        raise HTTPException(status_code=400, detail=f"Modèle inconnu: {model}")

    images_b64: List[str] = []
    page_count = 1

    if ext in ("jpg", "jpeg", "png", "webp"):
        images_b64.append(base64.b64encode(content).decode("utf-8"))
        page_count = 1
    elif ext == "pdf":
        try:
            import fitz  # pymupdf

            pdf = fitz.open(stream=io.BytesIO(content), filetype="pdf")
            page_count = len(pdf)
            max_pages = min(page_count, 10)
            for i in range(max_pages):
                page = pdf[i]
                pix = page.get_pixmap(dpi=150)
                img_bytes = pix.tobytes("png")
                images_b64.append(base64.b64encode(img_bytes).decode("utf-8"))
        except Exception as e:
            logger.error(f"PDF processing error: {e}")
            raise HTTPException(status_code=400, detail=f"Erreur traitement PDF: {str(e)}")
    else:
        raise HTTPException(
            status_code=400,
            detail="Format non supporté. Utilisez JPG, PNG, WEBP ou PDF.",
        )

    csv_parts: List[str] = []

    for i, img_b64 in enumerate(images_b64):
        try:
            chat = LlmChat(
                api_key=api_key,
                session_id=str(uuid.uuid4()),
                system_message=SYSTEM_PROMPT,
            ).with_model(provider, model_name)

            image_content = ImageContent(image_base64=img_b64)
            page_label = f" (page {i + 1})" if len(images_b64) > 1 else ""
            user_message = UserMessage(
                text=f"Transcris ce document manuscrit en CSV.{page_label}",
                file_contents=[image_content],
            )

            response = await chat.send_message(user_message)
            csv_text = clean_csv(response)

            if i == 0:
                csv_parts.append(csv_text)
            else:
                lines = csv_text.split("\n")
                if len(lines) > 1:
                    csv_parts.append("\n".join(lines[1:]))
        except Exception as e:
            logger.error(f"LLM error on page {i + 1}: {e}")
            raise HTTPException(status_code=500, detail=f"Erreur transcription: {str(e)}")

    csv_content = "\n".join(csv_parts)

    record = TranscriptionRecord(
        filename=filename,
        model_used=model,
        csv_content=csv_content,
        page_count=page_count,
    )

    doc = record.model_dump()
    await db.transcriptions.insert_one(doc)

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
    records = (
        await db.transcriptions.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    )
    return records


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
