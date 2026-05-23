import React, { useState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import CsvDataRow from "./CsvDataRow";

// ─── Utilities ──────────────────────────────────────────────────────────────

const parseCSV = (csvString) => {
  if (!csvString) return [];
  return csvString
    .split("\n")
    .filter((l) => l.trim())
    .map((line) => line.split(";"));
};

const serializeRows = (rows) => rows.map((r) => r.cells.join(";")).join("\n");

const makeId = () => `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const toRows = (parsed) => parsed.map((cells) => ({ id: makeId(), cells }));

// ─── Header styles ──────────────────────────────────────────────────────────

const thStyle = {
  backgroundColor: "#F9F9F8",
  borderBottom: "2px solid #E5E7EB",
  borderRight: "1px solid #E5E7EB",
  padding: 0,
  position: "sticky",
  top: 0,
  zIndex: 1,
};

const headerInputStyle = {
  width: "100%",
  border: "none",
  outline: "none",
  background: "transparent",
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "0.7rem",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontWeight: 600,
  color: "#4B5563",
  padding: "8px 12px",
};

// ─── Component ──────────────────────────────────────────────────────────────

const CsvTable = ({ csvContent, onCsvChange }) => {
  const [rows, setRows] = useState([]);
  // Tracks the last value we sent via onCsvChange to avoid re-parsing our own updates
  const lastSentRef = useRef("");

  useEffect(() => {
    // Skip re-parse if this prop change was triggered by our own edit
    if (csvContent === lastSentRef.current) return;
    setRows(toRows(parseCSV(csvContent)));
    lastSentRef.current = csvContent;
    // csvContent is the only external trigger; lastSentRef is a stable ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [csvContent]);

  // Central update helper: keeps lastSentRef in sync so useEffect skips our own updates
  const applyUpdate = (updater) => {
    const updated = updater(rows);
    setRows(updated);
    const serialized = serializeRows(updated);
    lastSentRef.current = serialized;
    onCsvChange(serialized);
  };

  const updateCell = (rowId, colIdx, value) =>
    applyUpdate((prev) =>
      prev.map((row) =>
        row.id === rowId
          ? { ...row, cells: row.cells.map((c, i) => (i === colIdx ? value : c)) }
          : row
      )
    );

  const addRow = () =>
    applyUpdate((prev) => {
      if (!prev.length) return prev;
      const colCount = Math.max(...prev.map((r) => r.cells.length));
      return [...prev, { id: makeId(), cells: Array(colCount).fill("") }];
    });

  const deleteRow = (rowId) =>
    applyUpdate((prev) => prev.filter((r) => r.id !== rowId));

  if (!rows.length) return null;

  const [headerRow, ...dataRows] = rows;

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
        style={{ width: "100%", textAlign: "left", borderCollapse: "collapse", minWidth: "400px" }}
      >
        <thead>
          <tr>
            {headerRow.cells.map((h, i) => (
              <th
                key={`col-${i}`}
                style={
                  i === headerRow.cells.length - 1
                    ? { ...thStyle, borderRight: "none" }
                    : thStyle
                }
              >
                <input
                  type="text"
                  value={h}
                  onChange={(e) => updateCell(headerRow.id, i, e.target.value)}
                  style={headerInputStyle}
                  onFocus={(e) => {
                    e.currentTarget.parentElement.style.boxShadow = "inset 0 0 0 2px #002FA7";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.parentElement.style.boxShadow = "none";
                  }}
                />
              </th>
            ))}
            <th
              style={{ ...thStyle, borderRight: "none", width: "40px", minWidth: "40px" }}
            />
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row) => (
            <CsvDataRow
              key={row.id}
              row={row}
              colCount={headerRow.cells.length}
              onUpdate={updateCell}
              onDelete={deleteRow}
            />
          ))}
        </tbody>
      </table>

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
