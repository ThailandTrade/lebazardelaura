"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import type { IScannerControls } from "@zxing/browser";

// Scanner de code-barres (EAN-13 = ISBN-13). Caméra arrière, détection continue.
export function BarcodeScanner({ onDetected }: { onDetected: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const doneRef = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
    ]);
    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 200 });
    let cancelled = false;

    reader
      .decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } } },
        videoRef.current!,
        (result, _err, controls) => {
          if (controls && !controlsRef.current) controlsRef.current = controls;
          if (result && !doneRef.current) {
            doneRef.current = true;
            controls?.stop();
            onDetected(result.getText());
          }
        },
      )
      .then((controls) => {
        if (cancelled) controls.stop();
        else controlsRef.current = controls;
      })
      .catch((e) => {
        const name = e?.name ?? "";
        if (name === "NotAllowedError") setError("Accès à la caméra refusé. Autorise-la dans le navigateur.");
        else if (name === "NotFoundError") setError("Aucune caméra détectée.");
        else setError("Impossible d'ouvrir la caméra.");
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
  }, [onDetected]);

  return (
    <div className="relative overflow-hidden rounded-xl bg-black">
      <video
        ref={videoRef}
        className="aspect-[3/4] w-full object-cover"
        muted
        playsInline
        autoPlay
      />
      {/* viseur */}
      {!error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-28 w-[78%] rounded-lg border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          <p className="absolute bottom-4 left-0 right-0 text-center text-sm text-white/90">
            Vise le code-barres au dos du livre
          </p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white">
          {error}
        </div>
      )}
    </div>
  );
}
