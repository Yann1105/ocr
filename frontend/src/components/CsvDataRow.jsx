import React from "react";
import { Trash2 } from "lucide-react";

const tdStyle = {
  borderBottom: "1px solid #E5E7EB",
  borderRight: "1px solid #E5E7EB",
  padding: 0,
};

const inputStyle = {
  width: "100%",
  border: "none",
  outline: "none",
  background: "transparent",
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "0.8125rem",
  color: "#111110",
  padding: "8px 12px",
};

const CsvDataRow = ({ row, colCount, onUpdate, onDelete }) => {
  // Pad cells to match header column count
  const cells =
    row.cells.length < colCount
      ? [...row.cells, ...Array(colCount - row.cells.length).fill("")]
      : row.cells;

  return (
    <tr
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "#F9F9F8";
        const btn = e.currentTarget.querySelector(".row-delete-btn");
        if (btn) btn.style.opacity = "1";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
        const btn = e.currentTarget.querySelector(".row-delete-btn");
        if (btn) btn.style.opacity = "0";
      }}
    >
      {cells.map((cell, ci) => (
        <td
          key={`${row.id}-${ci}`}
          style={ci === cells.length - 1 ? { ...tdStyle, borderRight: "none" } : tdStyle}
        >
          <input
            type="text"
            value={cell}
            onChange={(e) => onUpdate(row.id, ci, e.target.value)}
            style={inputStyle}
            onFocus={(e) => {
              e.currentTarget.parentElement.style.boxShadow = "inset 0 0 0 2px #002FA7";
            }}
            onBlur={(e) => {
              e.currentTarget.parentElement.style.boxShadow = "none";
            }}
          />
        </td>
      ))}
      <td style={{ borderBottom: "1px solid #E5E7EB", padding: 0, width: "40px", minWidth: "40px" }}>
        <button
          className="row-delete-btn"
          onClick={() => onDelete(row.id)}
          title="Supprimer la ligne"
          style={{
            opacity: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            background: "none",
            cursor: "pointer",
            color: "#9CA3AF",
            padding: "8px",
            transition: "opacity 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#DC2626")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#9CA3AF")}
        >
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  );
};

export default CsvDataRow;
