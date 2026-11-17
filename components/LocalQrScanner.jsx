'use client';

import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

export default function LocalQrScanner({ onScan, onCancel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [camError, setCamError] = useState('');

  useEffect(() => {
    let active = true;
    let stream = null;
    let raf = null;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }

        const tick = () => {
          if (!active) return;
          const v = videoRef.current;
          const c = canvasRef.current;
          if (v && c && v.readyState === v.HAVE_ENOUGH_DATA && v.videoWidth > 0) {
            c.width = v.videoWidth;
            c.height = v.videoHeight;
            const ctx = c.getContext('2d', { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(v, 0, 0, c.width, c.height);
              const imgData = ctx.getImageData(0, 0, c.width, c.height);
              const code = jsQR(imgData.data, imgData.width, imgData.height, {
                inversionAttempts: 'dontInvert',
              });
              if (code?.data) {
                active = false;
                stream?.getTracks().forEach((t) => t.stop());
                onScan(code.data);
                return;
              }
            }
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch (err) {
        if (active) {
          setCamError('Camera unavailable — paste the code below instead.');
        }
      }
    };

    start();

    return () => {
      active = false;
      if (raf) cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [onScan]);

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {camError ? (
        <p className="text-xs text-white/60 text-center py-2">{camError}</p>
      ) : (
        <div className="relative w-56 h-56 rounded-2xl overflow-hidden border border-white/20 bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-4 rounded-xl border-2 border-white/45 pointer-events-none" />
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
      <button
        type="button"
        className="d2-btn plain !h-9 !text-xs"
        onClick={onCancel}
      >
        Cancel scan
      </button>
    </div>
  );
}
