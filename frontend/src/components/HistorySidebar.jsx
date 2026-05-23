import React from "react";
import { History, Trash2, FileText, Clock } from "lucide-react";

// ─── Model labels ────────────────────────────────────────────────────────────

const MODEL_LABELS = {
  "gpt-4o": "GPT-4o",
  "claude-sonnet-4-6": "Claude 4.6",
};

const formatDate = (isoString) => {
  try {
    return new Date(isoString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
};

// ─── HistoryItem ─────────────────────────────────────────────────────────────

const HistoryItem = ({ record, isActive, onSelect, onDelete }) => (
  <div
    data-testid="history-list-item"
    onClick={() => onSelect(record)}
    style={{
      position: "relative",
      padding: "12px 16px",
      borderBottom: "1px solid #E5E7EB",
      cursor: "pointer",
      backgroundColor: isActive ? "#EEF2FF" : "transparent",
      borderLeft: isActive ? "3px solid #002FA7" : "3px solid transparent",
      transition: "background-color 0.15s ease",
    }}
    onMouseEnter={(e) => {
      if (!isActive) e.currentTarget.style.backgroundColor = "#F9F9F8";
      const btn = e.currentTarget.querySelector(".delete-btn");
      if (btn) btn.style.opacity = "1";
    }}
    onMouseLeave={(e) => {
      if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
      const btn = e.currentTarget.querySelector(".delete-btn");
      if (btn) btn.style.opacity = "0";
    }}
  >
    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
      <FileText size={12} color="#9CA3AF" style={{ marginTop: "2px", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: "0 0 3px 0",
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "#111110",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {record.filename}
        </p>
        <p
          style={{
            margin: "0 0 2px 0",
            fontSize: "0.68rem",
            color: "#9CA3AF",
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {formatDate(record.created_at)}
        </p>
        <p style={{ margin: 0, fontSize: "0.7rem", color: "#4B5563" }}>
          {MODEL_LABELS[record.model_used] || record.model_used}
        </p>
      </div>
      <button
        className="delete-btn"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(record.id);
        }}
        title="Supprimer"
        style={{
          opacity: 0,
          border: "none",
          background: "none",
          cursor: "pointer",
          padding: "2px",
          color: "#9CA3AF",
          transition: "opacity 0.15s, color 0.15s",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#DC2626")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
      >
        <Trash2 size={13} />
      </button>
    </div>
  </div>
);

// ─── HistorySidebar ──────────────────────────────────────────────────────────

const HistorySidebar = ({ history, activeId, onSelect, onDelete }) => (
  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
    {/* Header */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "16px",
        borderBottom: "1px solid #E5E7EB",
      }}
    >
      <History size={14} color="#002FA7" strokeWidth={2} />
      <span
        style={{
          fontSize: "0.65rem",
          textTransform: "uppercase",
          letterSpacing: "0.15em",
          fontWeight: 700,
          color: "#4B5563",
        }}
      >
        Historique
      </span>
      {history.length > 0 && (
        <span
          style={{
            marginLeft: "auto",
            fontSize: "0.7rem",
            color: "#9CA3AF",
            fontFamily: "'IBM Plex Mono', monospace",
            background: "#F3F4F6",
            borderRadius: "10px",
            padding: "1px 7px",
          }}
        >
          {history.length}
        </span>
      )}
    </div>

    {/* List */}
    <div style={{ flex: 1, overflowY: "auto" }}>
      {history.length === 0 ? (
        <div
          style={{
            padding: "40px 16px",
            textAlign: "center",
            color: "#9CA3AF",
            fontSize: "0.8rem",
          }}
        >
          <Clock size={24} style={{ margin: "0 auto 8px", display: "block", opacity: 0.4 }} />
          <p style={{ margin: 0 }}>Aucune transcription</p>
        </div>
      ) : (
        history.map((record) => (
          <HistoryItem
            key={record.id}
            record={record}
            isActive={activeId === record.id}
            onSelect={onSelect}
            onDelete={onDelete}
          />
        ))
      )}
    </div>
  </div>
);

export default HistorySidebar;
