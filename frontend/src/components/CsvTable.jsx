import React, { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";

const parseCSV = (csvString) => {
  if (!csvString) return [];
  return csvString
    .split("\n")
    .filter((l) => l.trim())
    .map((line) => line.split(";"));
};

const serializeCSV = (data) => data.map((row) => row.join(";")).join("\n");

const CsvTable = ({ csvContent, onCsvChange }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    setData(parseCSV(csvContent));
  }, [csvContent]);

  const updateCell = (rowIdx, colIdx, value) => {
    const newData = data.map((row, r) =>
      r === rowIdx ? row.map((cell, c) => (c === colIdx ? value : cell)) : row
    );
    setData(newData);
    onCsvChange(serializeCSV(newData));
  };

  const addRow = () => {
    if (!data.length) return;
    const colCount = Math.max(...data.map((r) => r.length));
    const newData = [...data, Array(colCount).fill("")];
    setData(newData);
    onCsvChange(serializeCSV(newData));
  };

  const deleteRow = (rowIdx) => {
    const newData = data.filter((_, i) => i !== rowIdx);
    setData(newData);
    onCsvChange(serializeCSV(newData));
  };

  if (!data.length) return null;

  const headers = data[0];
  const rows = data.slice(1);

  const thStyle = {
    backgroundColor: "#F9F9F8",
    borderBottom: "2px solid #E5E7EB",
    borderRight: "1px solid #E5E7EB",
    padding: 0,
    position: "sticky",
    top: 0,
    zIndex: 1,
  };

  const thLast = { ...thStyle, borderRight: "none" };

  const tdStyle = {
    borderBottom: "1px solid #E5E7EB",
    borderRight: "1px solid #E5E7EB",
    padding: 0,
  };

  const tdLast = { ...tdStyle, borderRight: "none" };

  const inputBase = {
    width: "100%",
    border: "none",
    outline: "none",
    background: "transparent",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "0.8125rem",
    color: "#111110",
    padding: "8px 12px",
  };

  const headerInput = {
    ...inputBase,
    fontSize: "0.7rem",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    fontWeight: 600,
    color: "#4B5563",
  };

  return (
    <div
      data-testid="csv-data-table"
      style={{
        width: "100%",
        overflowX: "auto",
        border: "1px solid #E5E7EB",
        backgroundColor: "#FFFFFF",
        borderRadius: "4px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <table
        style={{
          width: "100%",
          textAlign: "left",
          borderCollapse: "collapse",
          minWidth: "400px",
        }}
      >
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                style={i === headers.length - 1 ? thLast : thStyle}
              >
                <input
                  type="text"
                  value={h}
                  onChange={(e) => updateCell(0, i, e.target.value)}
                  style={headerInput}
                  onFocus={(e) => {
                    e.currentTarget.parentElement.style.boxShadow =
                      "inset 0 0 0 2px #002FA7";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.parentElement.style.boxShadow = "none";
                  }}
                />
              </th>
            ))}
            {/* Delete column header */}
            <th
              style={{
                ...thStyle,
                borderRight: "none",
                width: "40px",
                minWidth: "40px",
              }}
            />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={ri}
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
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  style={ci === row.length - 1 ? tdLast : tdStyle}
                >
                  <input
                    type="text"
                    value={cell}
                    onChange={(e) => updateCell(ri + 1, ci, e.target.value)}
                    style={inputBase}
                    onFocus={(e) => {
                      e.currentTarget.parentElement.style.boxShadow =
                        "inset 0 0 0 2px #002FA7";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.parentElement.style.boxShadow = "none";
                    }}
                  />
                </td>
              ))}
              <td
                style={{
                  borderBottom: "1px solid #E5E7EB",
                  padding: "0",
                  width: "40px",
                  minWidth: "40px",
                }}
              >
                <button
                  className="row-delete-btn"
                  onClick={() => deleteRow(ri + 1)}
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
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#DC2626")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#9CA3AF")
                  }
                >
                  <Trash2 size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Add row */}
      <button
        onClick={addRow}
        style={{
          width: "100%",
          padding: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          border: "none",
          borderTop: "1px solid #E5E7EB",
          background: "transparent",
          cursor: "pointer",
          fontSize: "0.75rem",
          color: "#9CA3AF",
          transition: "background-color 0.15s, color 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#F3F4F6";
          e.currentTarget.style.color = "#002FA7";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = "#9CA3AF";
        }}
      >
        <Plus size={13} />
        Ajouter une ligne
      </button>
    </div>
  );
};

export default CsvTable;
