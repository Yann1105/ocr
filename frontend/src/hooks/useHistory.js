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
    } catch {
      // Non-blocking – history panel degrades gracefully on network error
    }
    // setHistory is a stable React.useState setter; axios is a static import
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      } catch {
        // Non-blocking
      }
      // setActiveHistoryId is a stable React.useState setter; axios is a static import
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [API, loadHistory]
  );

  return { history, activeHistoryId, setActiveHistoryId, loadHistory, handleHistoryDelete };
}
