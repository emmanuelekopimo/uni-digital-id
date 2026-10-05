"use client";

import { useEffect, useState } from "react";
import { Maximize2, Printer, RotateCw, X } from "lucide-react";

/** Card stage: flip the card and open a full-screen QR with a live clock (a screenshot would show a frozen time). */
export function Wallet({ front, back, qrSvg, name, regNo }: { front: React.ReactNode; back: React.ReactNode; qrSvg: string; name: string; regNo: string }) {
  const [flipped, setFlipped] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    if (!showQr) return;
    const tick = () => setNow(new Date());
    const t = setInterval(tick, 1000);
    const first = setTimeout(tick, 0);
    return () => { clearInterval(t); clearTimeout(first); };
  }, [showQr]);
  return (
    <>
      <div className={`flip ${flipped ? "back" : ""}`}>
        <div className="flip-inner">
          <div className="flip-face">{front}</div>
          <div className="flip-face rear">{back}</div>
        </div>
      </div>
      <div className="card-actions no-print">
        <button className="btn btn-lg" style={{ background: "#fff", color: "var(--brand)", borderColor: "#fff" }} onClick={() => setShowQr(true)} data-testid="show-qr"><Maximize2 size={17} /> Show QR to lecturer</button>
        <button className="btn btn-ghost-dark" onClick={() => setFlipped((f) => !f)} data-testid="flip"><RotateCw size={16} /> {flipped ? "Front" : "Back"}</button>
        <button className="btn btn-ghost-dark" onClick={() => window.print()}><Printer size={16} /> Print</button>
      </div>
      {showQr && (
        <div className="qr-modal" role="dialog" aria-label="QR code" onClick={() => setShowQr(false)} data-testid="qr-modal">
          <div className="qr-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="eyebrow">Hold steady for the scanner</div>
            <div className="qr-big" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            <div><b style={{ fontSize: 17 }}>{name}</b><div className="mono muted">{regNo}</div></div>
            <div className="clock" suppressHydrationWarning>{now ? now.toLocaleTimeString("en-GB") : "--:--:--"}</div>
            <p className="muted" style={{ fontSize: 12.5 }}>The live clock shows this is your phone, not a screenshot.</p>
            <button className="btn" onClick={() => setShowQr(false)}><X size={16} /> Close</button>
          </div>
        </div>
      )}
    </>
  );
}
