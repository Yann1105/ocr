import { useState, useCallback, useEffect } from "react";
import axios from "axios";

/**
 * Manages transcription history: load, select, delete.
 */
export function useHistory(API) {
  const [history, setHistory] = useState([]);
  const [activeHistoryId, setActiveHistoryId] = useState(null);

  const loadHistory = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/history`);
      setHistory(res.data);
    } catch (err) {
      console.error("Failed to load history:", err);
    }
  }, [API]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleHistoryDelete = useCallback(
    async (id) => {
      try {
        await axios.delete(`${API}/history/${id}`);
        setActiveHistoryId((prev) => (prev === id ? null : prev));
        await loadHistory();
      } catch (err) {
        console.error("Failed to delete history record:", err);
      }
    },
    [API, loadHistory]
  );

  return { history, activeHistoryId, setActiveHistoryId, loadHistory, handleHistoryDelete };
}
