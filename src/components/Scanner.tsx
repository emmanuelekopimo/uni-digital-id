"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import jsQR from "jsqr";
import { ArrowUp, BookOpen, Camera, ImageUp, Loader2, ShieldAlert, ShieldCheck, ShieldX, X } from "lucide-react";
import { verifyAction, type ScanResponse } from "@/app/actions/scan";

type Course = { id: number; code: string; title: string };
type Sample = { label: string; value: string };
type Entry = { id: number; shown: string; res: ScanResponse };

function decodeImage(img: CanvasImageSource, w: number, h: number): string | null {
  const c = document.createElement("canvas");
  const scale = Math.min(1, 1000 / Math.max(w, h));
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  return jsQR(data.data, c.width, c.height)?.data ?? null;
}

export function Scanner({ courses, samples, initialCourse, startCamera = false }: { courses: Course[]; samples: Sample[]; initialCourse?: number; startCamera?: boolean }) {
  const [courseId, setCourseId] = useState<number>(initialCourse ?? courses[0]?.id ?? 0);
  const [value, setValue] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [camera, setCamera] = useState(startCamera);
  const [pending, start] = useTransition();
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastRef = useRef<{ v: string; t: number }>({ v: "", t: 0 });

  const submit = (raw: string, shown?: string) => {
    setError(null);
    start(async () => {
      const res = await verifyAction(courseId, raw);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setEntries((e) => [{ id: Date.now(), shown: shown ?? (raw.length > 48 ? `${raw.slice(0, 44)}...` : raw), res }, ...e]);
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
            const found = decodeImage(v, v.videoWidth, v.videoHeight);
            const now = Date.now();
            if (found && (found !== lastRef.current.v || now - lastRef.current.t > 4000)) {
              lastRef.current = { v: found, t: now };
              submit(found, "Scanned with camera");
            }
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        setError("Camera not available. Allow camera access, or upload a photo of the QR code instead.");
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

  const onUpload = (f: File | undefined) => {
    if (!f) return;
    const img = new Image();
    img.onload = () => {
      const found = decodeImage(img, img.naturalWidth, img.naturalHeight);
      URL.revokeObjectURL(img.src);
      if (!found) setError("No QR code found in that image. Try a sharper photo.");
      else submit(found, `Photo: ${f.name}`);
    };
    img.src = URL.createObjectURL(f);
  };

  const course = courses.find((c) => c.id === courseId);
  return (
    <div>
      {entries.length === 0 && (
        <div className="hero">
          <h1>Who are we checking in {course?.code ?? "class"}?</h1>
          <p>Scan a student&apos;s ID card, upload a photo of the QR code, or type a registration number.</p>
        </div>
      )}
      <form
        className="composer"
        style={{ marginTop: entries.length ? 18 : 0 }}
        onSubmit={(e) => {
          e.preventDefault();
          submit(value);
        }}
      >
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Paste a card code or type a reg. number, e.g. UU/23/CSC/045" aria-label="Card code or registration number" data-testid="scan-input" />
        <div className="composer-row">
          <label className="tool" title="Course">
            <BookOpen size={15} />
            <select value={courseId} onChange={(e) => setCourseId(Number(e.target.value))} aria-label="Course" data-testid="course-select">
              {courses.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
            </select>
          </label>
          <button type="button" className="tool" onClick={() => setCamera((c) => !c)} data-testid="camera-toggle"><Camera size={15} /> Camera</button>
          <label className="tool"><ImageUp size={15} /> Photo<input type="file" accept="image/*" className="sr-only" onChange={(e) => { onUpload(e.target.files?.[0]); e.target.value = ""; }} data-testid="qr-upload" /></label>
          <span className="grow" />
          <button className="send" disabled={pending || !value.trim()} aria-label="Verify" data-testid="verify">{pending ? <Loader2 size={17} className="spin" /> : <ArrowUp size={18} />}</button>
        </div>
      </form>
      {error && <p className="error" role="alert" style={{ marginTop: 8 }} data-testid="scan-error">{error}</p>}
      {camera && (
        <div className="camera" id="camera">
          <video ref={videoRef} playsInline muted />
          <div className="frame" />
          <button className="icon-btn close" onClick={() => setCamera(false)} aria-label="Close camera"><X size={18} /></button>
        </div>
      )}
      {entries.length === 0 && samples.length > 0 && (
        <>
          <div className="suggest" data-testid="samples">
            {samples.map((s) => (
              <button key={s.label} type="button" onClick={() => submit(s.value, s.label)}>{s.label}</button>
            ))}
          </div>
          <p className="hint">Sample cards from the seeded register, for rehearsing without a second phone.</p>
        </>
      )}
      <div className="thread">
        {entries.map((e) => (e.res.ok ? <ResultCard key={e.id} shown={e.shown} r={e.res} /> : null))}
      </div>
    </div>
  );
}

function ResultCard({ r, shown }: { r: Extract<ScanResponse, { ok: true }>; shown: string }) {
  const Icon = r.verdict.tone === "green" ? ShieldCheck : r.verdict.tone === "amber" ? ShieldAlert : ShieldX;
  return (
    <>
      <div className="bubble-user">{shown}</div>
      <div className={`result ${r.verdict.tone}`} data-testid="result" data-result={r.verdict.result}>
        <div className="result-head"><Icon size={19} /> <span data-testid="verdict">{r.verdict.headline}</span></div>
        {r.student ? (
          <div className="result-body">
            <img src={r.student.photo} alt="" />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }} data-testid="result-name">{r.student.name}</div>
              <div className="muted" style={{ fontSize: 13.5 }}>{r.verdict.detail}</div>
              <div className="rows">
                <div><span>Reg. no </span>{r.student.regNo}</div>
                <div><span>Level </span>{r.student.level}</div>
                <div><span>Dept </span>{r.student.department}</div>
                <div><span>Expires </span>{r.student.expires}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="result-body" style={{ gridTemplateColumns: "1fr" }}><div className="muted">{r.verdict.detail}</div></div>
        )}
        <div className="result-foot">
          {r.course} · {r.method === "qr" ? "Checked from QR signature" : "Looked up by registration number"} · {r.verdict.isUniuyo ? "UniUyo student" : "Not confirmed as a UniUyo student"}
        </div>
      </div>
    </>
  );
}
