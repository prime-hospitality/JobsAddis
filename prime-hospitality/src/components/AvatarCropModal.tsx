"use client";

import React, { useState, useRef, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { useT } from "@/lib/i18n";

const STAGE_SIZE = 300;
const OUTPUT_SIZE = 512;
const MIN_BOX = 32;

type Corner = "nw" | "ne" | "sw" | "se";
type Box = { x: number; y: number; size: number };
type DragState = { type: "move" | "resize"; corner?: Corner; startX: number; startY: number; startBox: Box };

const HANDLE_STYLE: Record<Corner, React.CSSProperties> = {
  nw: { left: -8, top: -8, cursor: "nwse-resize" },
  se: { right: -8, bottom: -8, cursor: "nwse-resize" },
  ne: { right: -8, top: -8, cursor: "nesw-resize" },
  sw: { left: -8, bottom: -8, cursor: "nesw-resize" },
};

/** Lets the user draw a resizable, draggable square crop box directly over
 *  the full image (rather than a zoom slider), and tells them live whether
 *  their selection is sharp enough — every avatar slot in the app is a
 *  fixed square box, so the exported crop is always a 512x512 PNG, but a
 *  small selection dragged from a small source photo would silently get
 *  upscaled and look blurry, which is what the quality readout warns about. */
export default function AvatarCropModal({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const t = useT();
  const [imgUrl] = useState(() => URL.createObjectURL(file));
  const [loaded, setLoaded] = useState(false);
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [box, setBox] = useState<Box>({ x: 0, y: 0, size: 0 });
  const [processing, setProcessing] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    return () => URL.revokeObjectURL(imgUrl);
  }, [imgUrl]);

  const displayScale = natural.width && natural.height ? STAGE_SIZE / Math.max(natural.width, natural.height) : 0;
  const imgDispW = natural.width * displayScale;
  const imgDispH = natural.height * displayScale;
  const imgOffsetX = (STAGE_SIZE - imgDispW) / 2;
  const imgOffsetY = (STAGE_SIZE - imgDispH) / 2;
  const maxBoxSize = Math.min(imgDispW, imgDispH);

  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  const handleImageLoad = () => {
    const el = imgRef.current;
    if (!el) return;
    const w = el.naturalWidth;
    const h = el.naturalHeight;
    const scale = STAGE_SIZE / Math.max(w, h);
    const dispW = w * scale;
    const dispH = h * scale;
    const offX = (STAGE_SIZE - dispW) / 2;
    const offY = (STAGE_SIZE - dispH) / 2;
    const initSize = Math.min(dispW, dispH) * 0.9;
    setNatural({ width: w, height: h });
    setBox({ x: offX + (dispW - initSize) / 2, y: offY + (dispH - initSize) / 2, size: initSize });
    setLoaded(true);
  };

  const handleBoxPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { type: "move", startX: e.clientX, startY: e.clientY, startBox: { ...box } };
  };

  const handleBoxPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.type !== "move") return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    setBox({
      size: d.startBox.size,
      x: clamp(d.startBox.x + dx, imgOffsetX, imgOffsetX + imgDispW - d.startBox.size),
      y: clamp(d.startBox.y + dy, imgOffsetY, imgOffsetY + imgDispH - d.startBox.size),
    });
  };

  const endDrag = () => { dragRef.current = null; };

  const handleHandlePointerDown = (e: React.PointerEvent, corner: Corner) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { type: "resize", corner, startX: e.clientX, startY: e.clientY, startBox: { ...box } };
  };

  const handleHandlePointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.type !== "resize" || !d.corner) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const { x: bx, y: by, size: bs } = d.startBox;

    let anchorX = bx;
    let anchorY = by;
    let deltaOutward = 0;
    let maxAllowed = maxBoxSize;

    switch (d.corner) {
      case "se":
        anchorX = bx; anchorY = by;
        deltaOutward = (dx + dy) / 2;
        maxAllowed = Math.min(maxAllowed, imgOffsetX + imgDispW - anchorX, imgOffsetY + imgDispH - anchorY);
        break;
      case "nw":
        anchorX = bx + bs; anchorY = by + bs;
        deltaOutward = -(dx + dy) / 2;
        maxAllowed = Math.min(maxAllowed, anchorX - imgOffsetX, anchorY - imgOffsetY);
        break;
      case "ne":
        anchorX = bx; anchorY = by + bs;
        deltaOutward = (dx - dy) / 2;
        maxAllowed = Math.min(maxAllowed, imgOffsetX + imgDispW - anchorX, anchorY - imgOffsetY);
        break;
      case "sw":
        anchorX = bx + bs; anchorY = by;
        deltaOutward = (dy - dx) / 2;
        maxAllowed = Math.min(maxAllowed, anchorX - imgOffsetX, imgOffsetY + imgDispH - anchorY);
        break;
    }

    const newSize = clamp(bs + deltaOutward, MIN_BOX, maxAllowed);
    let newX = anchorX;
    let newY = anchorY;
    if (d.corner === "nw") { newX = anchorX - newSize; newY = anchorY - newSize; }
    else if (d.corner === "ne") { newY = anchorY - newSize; }
    else if (d.corner === "sw") { newX = anchorX - newSize; }

    setBox({ x: newX, y: newY, size: newSize });
  };

  const naturalCropSize = displayScale > 0 ? box.size / displayScale : 0;
  const quality: "good" | "okay" | "bad" = naturalCropSize >= OUTPUT_SIZE ? "good" : naturalCropSize >= OUTPUT_SIZE * 0.5 ? "okay" : "bad";
  const qualityMeta = {
    good: { label: t("avatarCrop.qualityGood"), color: "#059669", Icon: CheckCircle2 },
    okay: { label: t("avatarCrop.qualityOkay"), color: "#d97706", Icon: Info },
    bad: { label: t("avatarCrop.qualityBad"), color: "#dc2626", Icon: AlertTriangle },
  }[quality];

  const handleConfirm = () => {
    const el = imgRef.current;
    if (!el || !loaded) return;
    setProcessing(true);

    const srcX = (box.x - imgOffsetX) / displayScale;
    const srcY = (box.y - imgOffsetY) / displayScale;
    const srcSize = box.size / displayScale;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setProcessing(false);
      return;
    }
    ctx.drawImage(el, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    canvas.toBlob((blob) => {
      setProcessing(false);
      if (blob) onConfirm(blob);
    }, "image/png");
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20000, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 380, boxShadow: "0 24px 48px -16px rgba(15,23,42,0.35)" }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{t("avatarCrop.title")}</h3>
        <p style={{ margin: "0 0 16px", fontSize: 12.5, color: "#64748b", lineHeight: 1.5 }}>
          {t("avatarCrop.instructions")}
        </p>

        <div
          style={{
            position: "relative",
            width: STAGE_SIZE,
            height: STAGE_SIZE,
            margin: "0 auto",
            borderRadius: 12,
            overflow: "hidden",
            background: "#0f172a",
          }}
        >
          <img
            ref={imgRef}
            src={imgUrl}
            alt=""
            draggable={false}
            onLoad={handleImageLoad}
            style={{
              position: "absolute",
              left: imgOffsetX,
              top: imgOffsetY,
              width: imgDispW || undefined,
              height: imgDispH || undefined,
              opacity: loaded ? 1 : 0,
              userSelect: "none",
              pointerEvents: "none",
            }}
          />

          {loaded && (
            <div
              onPointerDown={handleBoxPointerDown}
              onPointerMove={handleBoxPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              style={{
                position: "absolute",
                left: box.x,
                top: box.y,
                width: box.size,
                height: box.size,
                boxShadow: "0 0 0 9999px rgba(15,23,42,0.55)",
                border: "2px solid #fff",
                borderRadius: 8,
                cursor: "move",
                touchAction: "none",
              }}
            >
              {(Object.keys(HANDLE_STYLE) as Corner[]).map((corner) => (
                <div
                  key={corner}
                  onPointerDown={(e) => handleHandlePointerDown(e, corner)}
                  onPointerMove={handleHandlePointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  style={{
                    position: "absolute",
                    width: 16,
                    height: 16,
                    background: "#fff",
                    border: "2px solid #0284c7",
                    borderRadius: "50%",
                    touchAction: "none",
                    ...HANDLE_STYLE[corner],
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {loaded && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, fontSize: 12.5, fontWeight: 600, color: qualityMeta.color }}>
            <qualityMeta.Icon size={14} />
            {qualityMeta.label} · {Math.round(naturalCropSize)}×{Math.round(naturalCropSize)}px
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ background: "#f1f5f9", color: "#334155", border: "none", padding: "9px 16px", borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!loaded || processing}
            style={{ background: "#0284c7", color: "#fff", border: "none", padding: "9px 18px", borderRadius: 9, fontSize: 13.5, fontWeight: 700, cursor: loaded && !processing ? "pointer" : "not-allowed", opacity: loaded && !processing ? 1 : 0.6, fontFamily: "inherit" }}
          >
            {processing ? t("avatarCrop.saving") : t("avatarCrop.usePhoto")}
          </button>
        </div>
      </div>
    </div>
  );
}
