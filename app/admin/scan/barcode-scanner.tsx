"use client";

import { useEffect, useRef, useState } from "react";
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

function errorMessage(e: unknown): string {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "Connexion non sécurisée : la caméra exige HTTPS.";
  }
  const name = (e as { name?: string })?.name ?? "";
  if (name === "NotAllowedError")
    return "Accès caméra refusé. Autorise la caméra pour ce site (icône cadenas → Autorisations), puis réessaie.";
  if (name === "NotFoundError") return "Aucune caméra détectée sur l'appareil.";
  if (name === "NotReadableError")
    return "Caméra déjà utilisée par une autre application. Ferme-la puis réessaie.";
  return `Impossible d'ouvrir la caméra (${name || "erreur inconnue"}).`;
}

type Status = "init" | "running" | "error";

// Scanner de code-barres (EAN-13 = ISBN-13), caméra arrière.
// zxing gère getUserMedia + lecture + décodage en un seul appel (pas de double play()).
export function BarcodeScanner({ onDetected }: { onDetected: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDetectedRef = useRef(onDetected);
  const [status, setStatus] = useState<Status>("init");
  const [message, setMessage] = useState("Démarrage de la caméra…");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    let cancelled = false;
    let controls: IScannerControls | null = null;
    let done = false;

    (async () => {
      try {
        const reader = new BrowserMultiFormatReader(hints());
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          videoRef.current ?? undefined,
          (result) => {
            if (result && !done) {
              done = true;
              controls?.stop();
              onDetectedRef.current(result.getText());
            }
          },
        );
        if (cancelled) controls.stop();
        else setStatus("running");
      } catch (e) {
        if (!cancelled) {
          setStatus("error");
          setMessage(errorMessage(e));
        }
      }
    })();

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [attempt]);

  function retry() {
    setStatus("init");
    setMessage("Démarrage de la caméra…");
    setAttempt((a) => a + 1);
  }

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
              onClick={retry}
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
