import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileDown, ImageDown, Info } from "lucide-react";
import { db } from "@/db";
import { requireRole } from "@/lib/session";
import { myStudentRecord } from "@/lib/queries";
import { requestOrigin } from "@/lib/origin";
import { campusDay, now } from "@/lib/today";
import { cardState, fullName } from "@/lib/verify";
import { AppBar } from "@/components/AppBar";
import { IdCardBack, IdCardFront, cardQr } from "@/components/IdCard";
import { PrintButton } from "@/components/PrintButton";

export const metadata: Metadata = { title: "Download and print" };

export default async function PrintPage() {
  const user = await requireRole("student");
  const rec = await myStudentRecord(db(), user.id);
  if (!rec) return <><AppBar user={user} active="print" /><div className="wrap empty">No student record is linked to this account.</div></>;
  const s = rec.student;
  const state = cardState(s, campusDay(now()));
  const stamp = state === "suspended" ? "SUSPENDED" : state === "expired" ? "EXPIRED" : undefined;
  const qr = await cardQr(s, await requestOrigin());
  return (
    <>
      <AppBar user={user} active="print" />
      <main className="wrap print-page">
        <div className="page-title no-print">
          <div>
            <Link href="/card" className="btn btn-sm" style={{ marginBottom: 12 }}><ArrowLeft size={15} /> My ID</Link>
            <div className="eyebrow">Your card, ready to keep or print</div>
            <h1>Download and print</h1>
          </div>
        </div>
        <div className="print-layout">
          <section className="panel sheet-wrap" aria-label="Print preview">
            <div className="sheet" data-testid="print-sheet">
              <div className="sheet-head">
                <b>University of Uyo: student identity card</b>
                <span className="mono">{fullName(s)} · {s.regNo}</span>
              </div>
              <div className="sheet-cards">
                <figure className="cut"><figcaption>Front</figcaption><div className="actual"><IdCardFront s={s} qr={qr} stamp={stamp} /></div></figure>
                <figure className="cut"><figcaption>Back</figcaption><div className="actual"><IdCardBack s={s} /></div></figure>
              </div>
              <p className="sheet-note">Print at 100% (actual size). Cut along the marks; each side is 85.6 mm by 54 mm. Glue or laminate the back to the front.</p>
            </div>
          </section>
          <aside className="no-print" style={{ display: "grid", gap: 14 }}>
            <section className="panel status-panel">
              <b style={{ fontSize: 16 }}>Print now</b>
              <p className="muted" style={{ fontSize: 14 }}>Opens your printer dialog with just this sheet. Choose A4 and 100% scale. You can also pick &quot;Save as PDF&quot; there.</p>
              <PrintButton />
            </section>
            <section className="panel status-panel">
              <b style={{ fontSize: 16 }}>Download</b>
              <a className="btn btn-lg" href="/card/download/card.pdf" download data-testid="download-pdf"><FileDown size={18} /> Print-ready PDF (A4)</a>
              <a className="btn" href="/card/download/front.png" download data-testid="download-front"><ImageDown size={16} /> Front as image (PNG)</a>
              <a className="btn" href="/card/download/back.png" download data-testid="download-back"><ImageDown size={16} /> Back as image (PNG)</a>
              <p className="muted" style={{ fontSize: 13 }}>Images are 1012 by 638 pixels, the card size at 300 dpi.</p>
            </section>
            <section className="panel status-panel">
              <div className="check pass" style={{ alignItems: "flex-start" }}><Info size={16} style={{ flexShrink: 0, marginTop: 2 }} /> <span>The QR code on a printed copy is checked against the student register every time it is scanned. If your card is replaced or your status changes, old copies stop working.</span></div>
              {stamp && <div className="pill bad" data-testid="print-stamp">This card is marked {stamp.toLowerCase()} and will print with that stamp.</div>}
            </section>
          </aside>
        </div>
      </main>
    </>
  );
}
