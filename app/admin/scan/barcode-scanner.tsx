"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import type { IScannerControls } from "@zxing/browser";

function hints() {
  const h = new Map();
  h.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
  ]);
  return h;
}

type Status = "init" | "running" | "error";

// Scanner de code-barres (EAN-13 = ISBN-13), caméra arrière.
// getUserMedia explicite + lecture forcée (autoplay mobile capricieux) + décodage zxing.
export function BarcodeScanner({ onDetected }: { onDetected: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const doneRef = useRef(false);

  const [status, setStatus] = useState<Status>("init");
  const [message, setMessage] = useState("Démarrage de la caméra…");

  const stopAll = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setStatus("error");
      setMessage("Connexion non sécurisée : la caméra exige HTTPS.");
      return;
    }
    try {
      stopAll();
      doneRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      try {
        await video.play();
      } catch {
        // autoplay bloqué : il faut un geste utilisateur → bouton « Activer la caméra »
        setStatus("error");
        setMessage("Touche « Activer la caméra » pour démarrer.");
        return;
      }
      setStatus("running");

      const reader = new BrowserMultiFormatReader(hints());
      controlsRef.current = await reader.decodeFromVideoElement(video, (result) => {
        if (result && !doneRef.current) {
          doneRef.current = true;
          onDetected(result.getText());
        }
      });
    } catch (e: unknown) {
      const name = (e as { name?: string })?.name ?? "";
      setStatus("error");
      setMessage(
        name === "NotAllowedError"
          ? "Accès caméra refusé. Autorise la caméra pour ce site (icône cadenas → Autorisations), puis réessaie."
          : name === "NotFoundError"
            ? "Aucune caméra détectée sur l'appareil."
            : name === "NotReadableError"
              ? "Caméra déjà utilisée par une autre application. Ferme-la puis réessaie."
              : "Impossible d'ouvrir la caméra. Réessaie ou saisis l'ISBN à la main.",
      );
    }
  }, [onDetected, stopAll]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    start();
    return () => stopAll();
  }, [start, stopAll]);

  return (
    <div className="relative overflow-hidden rounded-xl bg-black">
      <video ref={videoRef} className="aspect-[3/4] w-full bg-black object-cover" muted playsInline autoPlay />

      {status === "running" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-28 w-[78%] rounded-lg border-2 border-white/85 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          <p className="absolute bottom-4 left-0 right-0 text-center text-sm text-white/90">
            Vise le code-barres au dos du livre
          </p>
        </div>
      )}

      {status !== "running" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-sm text-white/90">{message}</p>
          {status === "error" && (
            <button
              type="button"
              onClick={() => start()}
              className="rounded-lg bg-white/95 px-5 py-2.5 text-sm font-medium text-black"
            >
              Activer la caméra
            </button>
          )}
        </div>
      )}
    </div>
  );
}
