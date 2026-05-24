import { useState, useCallback } from "react";
import axios from "axios";

/**
 * Handles OCR transcription API call, CSV download, and loading from history.
 */
export function useTranscription({ API, file, model, setActiveHistoryId, loadHistory }) {
  const [csvContent, setCsvContent] = useState("");
  const [currentFilename, setCurrentFilename] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState("");

  const handleTranscribe = useCallback(async () => {
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
        err.response?.data?.detail || "Erreur lors de la transcription. Veuillez réessayer."
      );
    } finally {
      setIsTranscribing(false);
    }
    // State setters (setIsTranscribing, setError, etc.) are stable from React.useState
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API, file, model, setActiveHistoryId, loadHistory]);

  const downloadCSV = useCallback(() => {
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
  }, [csvContent, currentFilename]);

  /** Load a past transcription record into the editor. */
  const loadFromHistory = useCallback(
    (record) => {
      setCsvContent(record.csv_content);
      setCurrentFilename(record.filename);
      setActiveHistoryId(record.id);
      setError("");
    },
    // State setters are stable; setActiveHistoryId comes from useHistory (also stable)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setActiveHistoryId]
  );

  return {
    csvContent,
    setCsvContent,
    isTranscribing,
    error,
    handleTranscribe,
    downloadCSV,
    loadFromHistory,
  };
}
