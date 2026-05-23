import React, { useRef, useState } from "react";
import { Upload, X, File, FileImage } from "lucide-react";

const ACCEPTED = ".jpg,.jpeg,.png,.webp,.pdf";
const MAX_SIZE_MB = 20;

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const validate = (f) => {
  if (f.size > MAX_SIZE_MB * 1024 * 1024) {
    alert(`Fichier trop volumineux (max ${MAX_SIZE_MB} MB)`);
    return false;
  }
  const ext = f.name.toLowerCase().split(".").pop();
  if (!["jpg", "jpeg", "png", "webp", "pdf"].includes(ext)) {
    alert("Format non supporté. Utilisez JPG, PNG, WEBP ou PDF.");
    return false;
  }
  return true;
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const DropZoneEmpty = ({ isDragOver, onClick }) => (
  <div
    onClick={onClick}
    style={{
      padding: "48px 24px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "12px",
      textAlign: "center",
      cursor: "pointer",
    }}
  >
    <div
      style={{
        width: "56px",
        height: "56px",
        borderRadius: "4px",
        backgroundColor: isDragOver ? "#002FA7" : "#F3F4F6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background-color 0.2s ease",
      }}
    >
      <Upload
        size={24}
        color={isDragOver ? "#FFFFFF" : "#9CA3AF"}
        strokeWidth={1.5}
      />
    </div>
    <div>
      <p style={{ margin: "0 0 4px 0", fontSize: "0.9rem", fontWeight: 600, color: "#111110" }}>
        Glissez-déposez votre document ici
      </p>
      <p style={{ margin: 0, fontSize: "0.8rem", color: "#9CA3AF" }}>
        ou{" "}
        <span style={{ color: "#002FA7", fontWeight: 600 }}>cliquez pour parcourir</span>
      </p>
    </div>
    <p
      style={{
        margin: 0,
        fontSize: "0.7rem",
        color: "#9CA3AF",
        fontFamily: "'IBM Plex Mono', monospace",
        background: "#F3F4F6",
        padding: "4px 12px",
        borderRadius: "10px",
      }}
    >
      Formats : JPG · PNG · WEBP · PDF &nbsp;|&nbsp; Max {MAX_SIZE_MB} MB
    </p>
  </div>
);

const FileSelected = ({ file, filePreview, onClear }) => {
  const isPDF = file.name.toLowerCase().endsWith(".pdf");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px 20px" }}>
      {filePreview && !isPDF ? (
        <img
          src={filePreview}
          alt="Aperçu"
          style={{
            width: "72px",
            height: "72px",
            objectFit: "cover",
            borderRadius: "4px",
            border: "1px solid #E5E7EB",
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: "72px",
            height: "72px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#EEF2FF",
            borderRadius: "4px",
            border: "1px solid #C7D2FE",
            flexShrink: 0,
          }}
        >
          {isPDF ? <File size={28} color="#002FA7" /> : <FileImage size={28} color="#002FA7" />}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: "0 0 4px 0",
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "#111110",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {file.name}
        </p>
        <p
          style={{
            margin: "0 0 4px 0",
            fontSize: "0.75rem",
            color: "#9CA3AF",
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {formatSize(file.size)}
        </p>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "0.7rem",
            color: "#16A34A",
            background: "#DCFCE7",
            padding: "2px 8px",
            borderRadius: "10px",
            fontWeight: 600,
          }}
        >
          Prêt pour transcription
        </span>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onClear(); }}
        title="Retirer le fichier"
        style={{
          border: "none",
          background: "none",
          cursor: "pointer",
          padding: "8px",
          color: "#9CA3AF",
          borderRadius: "4px",
          transition: "color 0.15s, background-color 0.15s",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#111110";
          e.currentTarget.style.backgroundColor = "#F3F4F6";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#9CA3AF";
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        <X size={18} />
      </button>
    </div>
  );
};

// ─── UploadZone ──────────────────────────────────────────────────────────────

const UploadZone = ({ file, filePreview, onFileSelect, onClear }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && validate(f)) onFileSelect(f);
  };

  const handleChange = (e) => {
    const f = e.target.files[0];
    if (f && validate(f)) onFileSelect(f);
    e.target.value = "";
  };

  return (
    <div
      data-testid="file-upload-zone"
      style={{
        width: "100%",
        border: `2px dashed ${isDragOver || file ? "#002FA7" : "#E5E7EB"}`,
        borderRadius: "4px",
        backgroundColor: isDragOver ? "rgba(0,47,167,0.04)" : "#FFFFFF",
        cursor: file ? "default" : "pointer",
        transition: "border-color 0.2s ease, background-color 0.2s ease",
      }}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !file && fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED}
        onChange={handleChange}
        style={{ display: "none" }}
      />
      {file ? (
        <FileSelected file={file} filePreview={filePreview} onClear={onClear} />
      ) : (
        <DropZoneEmpty isDragOver={isDragOver} onClick={() => fileInputRef.current?.click()} />
      )}
    </div>
  );
};

export default UploadZone;
