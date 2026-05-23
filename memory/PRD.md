# PRD - OCR Manuscrit (Handwriting OCR to CSV)

## Problem Statement
Build a web application that uses AI (GPT-4o and Claude Sonnet 4.6) to perform OCR on handwritten documents (images and PDFs), then structures the extracted data as a CSV table with semicolons (;) as separators.

## Architecture

### Backend (FastAPI + Motor/MongoDB)
- `server.py` — Single-file FastAPI backend
- MongoDB collection: `transcriptions`
- LLM: `emergentintegrations` library with EMERGENT_LLM_KEY
- PDF processing: `pymupdf` (fitz)

### Frontend (React + Tailwind CSS)
- `App.js` — Main layout and state management
- `components/HistorySidebar.jsx` — History panel
- `components/UploadZone.jsx` — Drag & drop file upload
- `components/CsvTable.jsx` — Inline editable CSV table

## Core Requirements (Static)
- OCR transcription of handwritten documents to CSV format
- Semicolon (;) as CSV separator
- No introduction text in output — pure CSV only
- Replace illegible text with [ILLISIBLE]
- Support JPG, PNG, WEBP, PDF (up to 10 pages)
- Max 20MB file size
- French language UI

## API Endpoints
- `POST /api/transcribe` — Upload file + model selection, returns CSV
- `GET /api/history` — Fetch all transcription records
- `DELETE /api/history/{id}` — Delete a record

## What's Been Implemented (2026-02)
### MVP Complete
- File upload zone with drag & drop (images + PDF)
- AI model selector: GPT-4o (OpenAI) and Claude Sonnet 4.6 (Anthropic)
- OCR transcription via emergentintegrations LlmChat
- PDF to image conversion via pymupdf (up to 10 pages)
- Multi-page PDF stitching (headers only once)
- Inline editable CSV table with add/delete row
- CSV download button
- Transcription history sidebar with delete
- Empty state illustration
- Swiss/High-Contrast design theme (International Klein Blue #002FA7)
- Cabinet Grotesk + IBM Plex Sans + IBM Plex Mono fonts

## User Personas
- Business analysts digitizing handwritten meeting notes
- Data entry professionals transcribing field survey forms
- Office workers converting handwritten inventory lists

## Test Results (2026-02)
- Backend: 100% (10/10 tests passed)
- Frontend: 100% — all features verified
- Both models tested: GPT-4o and Claude Sonnet 4.6

## Prioritized Backlog

### P0 (Critical - done)
- [x] File upload (image + PDF)
- [x] OCR with GPT-4o and Claude Sonnet
- [x] CSV output display
- [x] CSV download
- [x] Transcription history

### P1 (Important - next sprint)
- [ ] Multi-language OCR support toggle
- [ ] CSV raw text view alongside table view
- [ ] Batch upload (multiple files at once)
- [ ] Progress indicator for multi-page PDFs
- [ ] Mobile-responsive sidebar (currently hidden on mobile)

### P2 (Nice to have)
- [ ] Export to Excel (.xlsx)
- [ ] Share transcription via link
- [ ] Annotations on original document image
- [ ] OCR confidence scoring per cell
