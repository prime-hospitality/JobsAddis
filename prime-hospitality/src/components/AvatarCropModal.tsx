"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";

const VIEWPORT_SIZE = 260;
const OUTPUT_SIZE = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

/** Lets the user pan/zoom a picked image into a fixed square before it's
 *  uploaded anywhere, so every employer/platform picture is stored at one
 *  consistent 512x512 square — the app only ever displays these avatars in
 *  square (rounded) boxes, so a non-square or tiny source image would
 *  otherwise get an uncontrolled center-crop or look blurry when scaled up. */
export default function AvatarCropModal({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const [imgUrl] = useState(() => URL.createObjectURL(file));
  const [loaded, setLoaded] = useState(false);
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [processing, setProcessing] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);

  useEffect(() => {
    return () => URL.revokeObjectURL(imgUrl);
  }, [imgUrl]);

  const clampPan = useCallback((nx: number, ny: number, z: number, bScale: number, w: number, h: number) => {
    const dispW = w * bScale * z;
    const dispH = h * bScale * z;
    const maxX = Math.max(0, (dispW - VIEWPORT_SIZE) / 2);
    const maxY = Math.max(0, (dispH - VIEWPORT_SIZE) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, nx)), y: Math.min(maxY, Math.max(-maxY, ny)) };
  }, []);

  const handleImageLoad = () => {
    const el = imgRef.current;
    if (!el) return;
    const w = el.naturalWidth;
    const h = el.naturalHeight;
    const bScale = VIEWPORT_SIZE / Math.min(w, h);
    setNatural({ width: w, height: h });
    setBaseScale(bScale);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setLoaded(true);
  };

  const handleZoomChange = (z: number) => {
    setZoom(z);
    setPan((prev) => clampPan(prev.x, prev.y, z, baseScale, natural.width, natural.height));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPanX: pan.x, startPanY: pan.y };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPan(clampPan(dragRef.current.startPanX + dx, dragRef.current.startPanY + dy, zoom, baseScale, natural.width, natural.height));
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handleConfirm = () => {
    const el = imgRef.current;
    if (!el || !loaded) return;
    setProcessing(true);

    const dispScale = baseScale * zoom;
    const imgLeft = (VIEWPORT_SIZE - natural.width * dispScale) / 2 + pan.x;
    const imgTop = (VIEWPORT_SIZE - natural.height * dispScale) / 2 + pan.y;
    const srcX = -imgLeft / dispScale;
    const srcY = -imgTop / dispScale;
    const srcSize = VIEWPORT_SIZE / dispScale;

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

  const dispW = natural.width * baseScale * zoom;
  const dispH = natural.height * baseScale * zoom;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20000, padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 340, boxShadow: "0 24px 48px -16px rgba(15,23,42,0.35)" }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Adjust Photo</h3>
        <p style={{ margin: "0 0 16px", fontSize: 12.5, color: "#64748b", lineHeight: 1.5 }}>
          Drag to reposition, use the slider to zoom. It&apos;ll be saved as a 512×512 square.
        </p>

        <div
          style={{
            position: "relative",
            width: VIEWPORT_SIZE,
            height: VIEWPORT_SIZE,
            margin: "0 auto",
            borderRadius: 20,
            overflow: "hidden",
            background: "#0f172a",
            touchAction: "none",
            cursor: loaded ? "grab" : "default",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <img
            ref={imgRef}
            src={imgUrl}
            alt=""
            draggable={false}
            onLoad={handleImageLoad}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: dispW || undefined,
              height: dispH || undefined,
              transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`,
              opacity: loaded ? 1 : 0,
              userSelect: "none",
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "absolute", inset: 0, borderRadius: 20, boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.5)", pointerEvents: "none" }} />
        </div>

        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(e) => handleZoomChange(Number(e.target.value))}
          disabled={!loaded}
          style={{ width: "100%", marginTop: 16 }}
        />

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ background: "#f1f5f9", color: "#334155", border: "none", padding: "9px 16px", borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!loaded || processing}
            style={{ background: "#0284c7", color: "#fff", border: "none", padding: "9px 18px", borderRadius: 9, fontSize: 13.5, fontWeight: 700, cursor: loaded && !processing ? "pointer" : "not-allowed", opacity: loaded && !processing ? 1 : 0.6, fontFamily: "inherit" }}
          >
            {processing ? "Saving…" : "Use Photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
