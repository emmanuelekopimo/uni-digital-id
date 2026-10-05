import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, ShieldX } from "lucide-react";
import { db } from "@/db";
import { publicLookup } from "@/lib/queries";
import { campusDay, now } from "@/lib/today";
import { cardState, fullName } from "@/lib/verify";
import { avatarUri } from "@/lib/avatar";
import { fmtDate } from "@/lib/format";

export const metadata: Metadata = { title: "Card check" };

/** Public page opened when any phone camera scans the card. Shows only what is printed on the card. */
export default async function VerifyPage(props: PageProps<"/verify/[token]">) {
  const { token } = await props.params;
  const r = await publicLookup(db(), decodeURIComponent(token));
  const today = campusDay(now());
  const ok = r.ok && r.current && cardState(r.student, today) !== "suspended" && cardState(r.student, today) !== "expired";
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: "var(--side)" }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 24, border: "1px solid var(--line)", overflow: "hidden" }}>
        <div className={`result-head`} style={{ display: "flex", gap: 10, alignItems: "center", padding: "14px 18px", fontWeight: 600, background: ok ? "var(--green-soft)" : "var(--red-soft)", color: ok ? "#0b7a5e" : "var(--red)" }} data-testid="public-verdict">
          {ok ? <ShieldCheck size={20} /> : <ShieldX size={20} />}
          {!r.ok ? "Not a valid UniUyo ID" : !r.current ? "This card has been replaced" : ok ? "Genuine UniUyo student ID" : cardState(r.student, today) === "suspended" ? "Student suspended" : "Card expired"}
        </div>
        {r.ok ? (
          <div style={{ padding: 20, textAlign: "center" }}>
            <img src={avatarUri(r.student.regNo, r.student.gender)} alt="" style={{ width: 110, height: 110, borderRadius: 22, margin: "0 auto 12px", background: "var(--soft)" }} />
            <h1 style={{ fontSize: 20 }}>{fullName(r.student)}</h1>
            <p className="muted">{r.student.regNo}</p>
            <p style={{ marginTop: 8 }}>{r.student.department}, {r.student.level} Level</p>
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>Card expires {fmtDate(r.student.idExpiresOn)}</p>
          </div>
        ) : (
          <p style={{ padding: 20 }} className="muted">The QR code was not issued by the University of Uyo ID system, or it was altered.</p>
        )}
        <p className="muted" style={{ fontSize: 12.5, padding: "0 20px 18px", textAlign: "center" }}>Lecturers can log in to check class registration. <Link href="/login" style={{ textDecoration: "underline" }}>Log in</Link></p>
      </div>
    </main>
  );
}
