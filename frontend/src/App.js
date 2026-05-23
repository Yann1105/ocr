import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  FileText,
  Download,
  RotateCw,
  Loader2,
  AlertCircle,
} from "lucide-react";
import HistorySidebar from "./components/HistorySidebar";
import UploadZone from "./components/UploadZone";
import CsvTable from "./components/CsvTable";
import "./App.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MODELS = [
  { id: "gpt-4o", label: "GPT-4o", provider: "OpenAI" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", provider: "Anthropic" },
];

function App() {
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [model, setModel] = useState("gpt-4o");
  const [csvContent, setCsvContent] = useState("");
  const [currentFilename, setCurrentFilename] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [activeHistoryId, setActiveHistoryId] = useState(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/history`);
      setHistory(res.data);
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleFileSelect = (selectedFile) => {
    setFile(selectedFile);
    setError("");
    if (selectedFile.type.startsWith("image/")) {
      const url = URL.createObjectURL(selectedFile);
      setFilePreview(url);
    } else {
      setFilePreview(null);
    }
  };

  const handleClear = () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setFile(null);
    setFilePreview(null);
    setError("");
  };

  const handleTranscribe = async () => {
    if (!file) return;
    setIsTranscribing(true);
    setError("");
    setCsvContent("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("model", model);

      const res = await axios.post(`${API}/transcribe`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setCsvContent(res.data.csv_content);
      setCurrentFilename(res.data.filename);
      setActiveHistoryId(res.data.id);
      await loadHistory();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Erreur lors de la transcription. Veuillez réessayer."
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  const downloadCSV = () => {
    if (!csvContent) return;
    const name = currentFilename
      ? currentFilename.replace(/\.[^/.]+$/, "") + ".csv"
      : "transcription.csv";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleHistorySelect = (record) => {
    setCsvContent(record.csv_content);
    setCurrentFilename(record.filename);
    setActiveHistoryId(record.id);
    setError("");
  };

  const handleHistoryDelete = async (id) => {
    try {
      await axios.delete(`${API}/history/${id}`);
      if (activeHistoryId === id) {
        setCsvContent("");
        setCurrentFilename("");
        setActiveHistoryId(null);
      }
      await loadHistory();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const getTableStats = () => {
    if (!csvContent) return null;
    const lines = csvContent.split("\n").filter((l) => l.trim());
    const cols = lines[0]?.split(";").length || 0;
    const dataRows = lines.length - 1;
    return `${dataRows} ligne${dataRows !== 1 ? "s" : ""} · ${cols} colonne${cols !== 1 ? "s" : ""}`;
  };

  return (
    <div className="app-grid">
      {/* Sidebar */}
      <aside className="sidebar">
        <HistorySidebar
          history={history}
          activeId={activeHistoryId}
          onSelect={handleHistorySelect}
          onDelete={handleHistoryDelete}
        />
      </aside>

      {/* Main */}
      <main className="main-area">
        {/* Header */}
        <header className="app-header">
          <div className="header-brand">
            <div className="brand-icon">
              <FileText size={18} strokeWidth={2} />
            </div>
            <div>
              <h1 className="brand-title">OCR Manuscrit</h1>
              <p className="brand-subtitle">Transcription automatique en CSV</p>
            </div>
          </div>
        </header>

        {/* Upload Zone */}
        <section>
          <UploadZone
            file={file}
            filePreview={filePreview}
            onFileSelect={handleFileSelect}
            onClear={handleClear}
          />
        </section>

        {/* Model Selector + Transcribe Button */}
        <section className="controls-row">
          <div className="model-selector-block" data-testid="model-selector">
            <span className="control-label">Modèle IA</span>
            <div className="model-toggle">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  className={`model-btn ${model === m.id ? "model-btn--active" : ""}`}
                  onClick={() => setModel(m.id)}
                >
                  <span className="model-provider">{m.provider}</span>
                  <span className="model-name">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            data-testid="transcribe-button"
            className={`transcribe-btn ${!file || isTranscribing ? "transcribe-btn--disabled" : ""}`}
            onClick={handleTranscribe}
            disabled={!file || isTranscribing}
          >
            {isTranscribing ? (
              <>
                <Loader2 size={16} className="spin-icon" />
                <span>Transcription en cours...</span>
              </>
            ) : (
              <>
                <RotateCw size={16} />
                <span>Transcrire</span>
              </>
            )}
          </button>
        </section>

        {/* Error */}
        {error && (
          <div className="error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Results */}
        {csvContent ? (
          <section className="results-section">
            <div className="results-header">
              <div>
                <h2 className="results-title">Résultat CSV</h2>
                {getTableStats() && (
                  <p className="results-meta">{getTableStats()}</p>
                )}
              </div>
              <button
                data-testid="download-csv-button"
                className="download-btn"
                onClick={downloadCSV}
              >
                <Download size={15} />
                <span>Télécharger CSV</span>
              </button>
            </div>
            <CsvTable csvContent={csvContent} onCsvChange={setCsvContent} />
          </section>
        ) : (
          !isTranscribing && (
            <section className="empty-state">
              <img
                src="https://static.prod-images.emergentagent.com/jobs/07409a9d-0182-413b-9568-5432b49bc1de/images/df93acf8bad154c6d161a7a301fdf4af6cdc00b3ecc8ac4a1d97cd9d06247e2d.png"
                alt="Illustration document vers données"
                className="empty-state-img"
              />
              <p className="empty-state-text">
                Uploadez un document manuscrit pour commencer la transcription
              </p>
            </section>
          )
        )}

        {/* Loading state (full results area) */}
        {isTranscribing && (
          <section className="loading-state">
            <div className="loading-inner">
              <Loader2 size={32} className="spin-icon text-[#002FA7]" />
              <p className="loading-text">Analyse en cours avec {model === "gpt-4o" ? "GPT-4o" : "Claude Sonnet 4.6"}...</p>
              <p className="loading-sub">Cela peut prendre quelques secondes</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
