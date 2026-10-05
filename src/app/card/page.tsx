import type { Metadata } from "next";
import { CircleAlert, CircleCheck, CircleX, ScanLine, ShieldCheck } from "lucide-react";
import { db } from "@/db";
import { requireRole } from "@/lib/session";
import { myStudentRecord } from "@/lib/queries";
import { campusDay, now } from "@/lib/today";
import { cardState, daysToExpiry, fullName } from "@/lib/verify";
import { fmtDate } from "@/lib/format";
import { requestOrigin } from "@/lib/origin";
import { AppBar } from "@/components/AppBar";
import { IdCardBack, IdCardFront, cardQr } from "@/components/IdCard";
import { Wallet } from "@/components/Wallet";

export const metadata: Metadata = { title: "My ID" };

export default async function CardPage() {
  const user = await requireRole("student");
  const rec = await myStudentRecord(db(), user.id);
  if (!rec) return <><AppBar user={user} active="card" /><div className="wrap empty">No student record is linked to this account.</div></>;
  const { student: s, courses } = rec;
  const today = campusDay(now());
  const state = cardState(s, today);
  const days = daysToExpiry(s.idExpiresOn, today);
  const qr = await cardQr(s, await requestOrigin());
  const stamp = state === "suspended" ? "SUSPENDED" : state === "expired" ? "EXPIRED" : undefined;
  const tone = state === "valid" ? "ok" : state === "expiring" ? "warn" : "bad";
  const StatusIcon = state === "valid" ? CircleCheck : state === "expiring" ? CircleAlert : CircleX;
  return (
    <>
      <AppBar user={user} active="card" />
      <main className="wrap">
        <div className="wallet">
          <section className="panel card-stage" aria-label="Your ID card">
            <Wallet front={<IdCardFront s={s} qr={qr} stamp={stamp} />} back={<IdCardBack s={s} />} qrSvg={qr.svg} name={fullName(s)} regNo={s.regNo} />
            <p className="hint">Show the QR code when a lecturer asks to check your ID.</p>
          </section>
          <div className="status-col" style={{ display: "grid", gap: 18 }}>
            <section className="panel status-panel">
              <div className="status-big" data-testid="card-status">
                <div className={`ring ${tone}`}><StatusIcon size={28} /></div>
                <div>
                  <b>{state === "valid" ? "Card is valid" : state === "expiring" ? `Expires in ${days} days` : state === "expired" ? "Card has expired" : "Studentship suspended"}</b>
                  <span className="muted" style={{ fontSize: 13.5 }}>
                    {state === "suspended" ? "Contact Student Affairs." : state === "expired" ? `Expired on ${fmtDate(s.idExpiresOn)}. Renew it at the ICT Centre.` : `Valid until ${fmtDate(s.idExpiresOn)}${state === "expiring" ? ". Renew it at the ICT Centre." : "."}`}
                  </span>
                </div>
              </div>
              {state !== "suspended" && days > 0 && (
                <div>
                  <div className="meter"><i style={{ width: `${Math.max(4, Math.min(100, Math.round((days / 730) * 100)))}%`, background: tone === "ok" ? "var(--ok)" : "var(--warn)" }} /></div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 5 }}>{days} days left on this card · card version {s.cardVersion}</div>
                </div>
              )}
            </section>
            <section className="panel" id="courses">
              <div className="panel-head"><h2>Classes this card admits you to</h2><span className="pill ok">{courses.length} courses</span></div>
              <div className="course-list" data-testid="course-list">
                {courses.map((c) => (
                  <div key={c.code}><span className="code">{c.code}</span><span><b style={{ fontWeight: 600 }}>{c.title}</b><div className="muted" style={{ fontSize: 12.5 }}>{c.lecturer} · {c.venue}</div></span><span className="muted">{c.units} units</span></div>
                ))}
                {courses.length === 0 && <div className="empty" style={{ display: "block" }}>No courses registered.</div>}
              </div>
            </section>
            <section className="panel status-panel">
              <b>What happens when you are scanned</b>
              <div className="check pass"><ShieldCheck size={16} /> The QR signature proves the card was issued by the university.</div>
              <div className="check pass"><CircleCheck size={16} /> Your status and expiry are checked against the student register.</div>
              <div className="check pass"><ScanLine size={16} /> The lecturer sees whether you are registered for their course.</div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
