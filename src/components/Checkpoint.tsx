"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import jsQR from "jsqr";
import { Camera, CameraOff, CheckCircle2, CircleDashed, ImageUp, Loader2, ShieldAlert, ShieldCheck, ShieldX, TriangleAlert, XCircle } from "lucide-react";
import { verifyAction, type ScanResponse } from "@/app/actions/scan";
import { checklist, RESULT_UI } from "@/lib/tones";

type Sample = { label: string; value: string };
type Ok = Extract<ScanResponse, { ok: true }>;

function decode(img: CanvasImageSource, w: number, h: number): string | null {
  const c = document.createElement("canvas");
  const scale = Math.min(1, 1000 / Math.max(w, h));
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height)?.data ?? null;
}

export function Checkpoint({ courseId, courseCode, samples, startCamera = false, children }: { courseId: number; courseCode: string; samples: Sample[]; startCamera?: boolean; children?: React.ReactNode }) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<Ok | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [camera, setCamera] = useState(startCamera);
  const [pending, start] = useTransition();
  const videoRef = useRef<HTMLVideoElement>(null);
  const last = useRef({ v: "", t: 0 });
  const resultRef = useRef<HTMLDivElement>(null);

  // On phones the result sits under the camera, so bring it into view after each check.
  useEffect(() => {
    if (result && window.innerWidth < 960) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  const submit = (raw: string) => {
    setError(null);
    start(async () => {
      const res = await verifyAction(courseId, raw);
      if (!res.ok) return setError(res.error);
      setResult(res);
      setValue("");
    });
  };

  useEffect(() => {
    if (!camera) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play();
        const tick = () => {
          if (stopped) return;
          if (v.readyState >= 2) {
            const found = decode(v, v.videoWidth, v.videoHeight);
            const t = Date.now();
            if (found && (found !== last.current.v || t - last.current.t > 4000)) {
              last.current = { v: found, t };
              submit(found);
            }
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setError("Camera not available. Allow camera access, or upload a photo of the QR code.");
        setCamera(false);
      }
    })();
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, courseId]);

  const onUpload = (f?: File) => {
    if (!f) return;
    const img = new Image();
    img.onload = () => {
      const found = decode(img, img.naturalWidth, img.naturalHeight);
      URL.revokeObjectURL(img.src);
      if (found) submit(found);
      else setError("No QR code found in that photo. Try a sharper, closer photo.");
    };
    img.src = URL.createObjectURL(f);
  };

  return (
    <div className="checkpoint">
      <section className="panel reader" aria-label="Card reader">
        <div className="viewport" data-testid="viewport">
          {camera ? (
            <>
              <video ref={videoRef} playsInline muted />
              <span className="live"><i /> Scanning</span>
              <div className="corners"><i /><i /><i /><i /></div>
              <div className="laser" />
            </>
          ) : (
            <>
              <div className="corners"><i /><i /><i /><i /></div>
              <div className="idle">
                <CameraOff size={30} />
                <b style={{ color: "#fff" }}>Camera is off</b>
                <span style={{ fontSize: 13 }}>Point the camera at the QR code on the student&apos;s ID.</span>
                <button className="btn btn-brand" onClick={() => setCamera(true)} data-testid="camera-toggle"><Camera size={16} /> Start camera</button>
              </div>
            </>
          )}
        </div>
        <form className="manual" onSubmit={(e) => { e.preventDefault(); submit(value); }}>
          <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Reg. number (UU/23/CSC/045) or card code" aria-label="Registration number or card code" data-testid="scan-input" />
          <button className="btn btn-brand" disabled={pending || !value.trim()} data-testid="verify">{pending ? <Loader2 size={16} /> : <ShieldCheck size={16} />} Verify</button>
        </form>
        <div className="reader-tools">
          {camera && <button className="btn btn-sm" onClick={() => setCamera(false)}><CameraOff size={15} /> Stop camera</button>}
          <label className="btn btn-sm"><ImageUp size={15} /> Upload QR photo<input type="file" accept="image/*" className="sr-only" onChange={(e) => { onUpload(e.target.files?.[0]); e.target.value = ""; }} data-testid="qr-upload" /></label>
        </div>
        {error && <p className="error" role="alert" data-testid="scan-error">{error}</p>}
        {samples.length > 0 && (
          <div className="testcards" data-testid="samples">
            <span className="eyebrow">Demo cards from the register</span>
            <div className="row">{samples.map((s) => <button key={s.label} type="button" onClick={() => submit(s.value)}>{s.label}</button>)}</div>
          </div>
        )}
      </section>
      <div ref={resultRef} style={{ display: "grid", gap: 18, minWidth: 0, scrollMarginTop: 70 }}>
        {result ? <Verdict r={result} courseCode={courseCode} /> : <Waiting courseCode={courseCode} pending={pending} />}
        {children}
      </div>
    </div>
  );
}

function Waiting({ courseCode, pending }: { courseCode: string; pending: boolean }) {
  return (
    <section className="panel waiting" data-testid="waiting">
      <div className="ghost-card">{pending ? <Loader2 size={34} /> : <CircleDashed size={34} />}</div>
      <b style={{ color: "var(--ink)", fontSize: 17 }}>{pending ? "Checking card" : `Ready to check students for ${courseCode}`}</b>
      <span style={{ maxWidth: 380 }}>Each scan checks the card signature, the student register and the {courseCode} class list, then tells you whether to admit the student.</span>
    </section>
  );
}

const CHECK_ICON = { pass: CheckCircle2, fail: XCircle, warn: TriangleAlert, skip: CircleDashed };

function Verdict({ r, courseCode }: { r: Ok; courseCode: string }) {
  const ui = RESULT_UI[r.verdict.result];
  const Icon = ui.tone === "ok" ? ShieldCheck : ui.tone === "warn" ? ShieldAlert : ShieldX;
  return (
    <section className={`panel verdict ${ui.tone}`} data-testid="result" data-result={r.verdict.result} aria-live="polite">
      <div className="verdict-band">
        <Icon size={40} />
        <div>
          <div className="big" data-testid="verdict-big">{ui.big}</div>
          <div className="sub" data-testid="verdict">{r.verdict.headline}</div>
        </div>
      </div>
      {r.student ? (
        <div className="verdict-body">
          <div className="photo"><img src={r.student.photo} alt="" /></div>
          <div style={{ minWidth: 0 }}>
            <h3 data-testid="result-name">{r.student.name}</h3>
            <p className="muted" style={{ fontSize: 14 }}>{r.verdict.detail}</p>
            <div className="facts">
              <div><span>Reg. number</span><b className="mono">{r.student.regNo}</b></div>
              <div><span>Level</span><b>{r.student.level}</b></div>
              <div><span>Department</span><b>{r.student.department}</b></div>
              <div><span>Card expires</span><b>{r.student.expires}</b></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="verdict-body" style={{ gridTemplateColumns: "1fr" }}><p className="muted">{r.verdict.detail}</p></div>
      )}
      <div className="checks">
        {checklist(r.verdict.result, r.method).map((c) => {
          const I = CHECK_ICON[c.state];
          return <div key={c.label} className={`check ${c.state}`}><I size={16} /> <b style={{ fontWeight: 600 }}>{c.label}</b> <span className="muted">· {c.note}</span></div>;
        })}
      </div>
      <div className="verdict-foot">
        <span>{courseCode} · {r.method === "qr" ? "Checked from QR signature" : "Looked up by registration number"}</span>
        <span>{r.verdict.isUniuyo ? "UniUyo student" : "Not confirmed as a UniUyo student"}</span>
      </div>
    </section>
  );
}
