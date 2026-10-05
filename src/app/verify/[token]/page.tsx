import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { publicLookup } from "@/lib/queries";
import { campusDay, now } from "@/lib/today";
import { cardState, fullName } from "@/lib/verify";
import { avatarUri } from "@/lib/avatar";
import { fmtDate, fmtStamp } from "@/lib/format";

export const metadata: Metadata = { title: "ID verification" };

/** Public page opened when any phone camera scans the card. Shows only what is printed on the card. */
export default async function VerifyPage(props: PageProps<"/verify/[token]">) {
  const { token } = await props.params;
  const r = await publicLookup(db(), decodeURIComponent(token));
  const today = campusDay(now());
  const st = r.ok ? cardState(r.student, today) : null;
  const ok = r.ok && r.current && st !== "suspended" && st !== "expired";
  const title = !r.ok ? "Not a valid UniUyo ID" : !r.current ? "This card has been replaced" : ok ? "Genuine UniUyo student ID" : st === "suspended" ? "Student suspended" : "Card expired";
  return (
    <main className="cert">
      <div className="panel">
        <div className="cert-head"><img src="/logo-white.svg" alt="" /><div><b>University of Uyo</b><div style={{ fontSize: 12.5, opacity: 0.8 }}>Student ID verification</div></div></div>
        <div className={`stamp ${ok ? "ok" : "bad"}`}>{ok ? "VERIFIED" : "NOT VALID"}</div>
        <h1 style={{ textAlign: "center", fontSize: 20, padding: "0 18px" }} data-testid="public-verdict">{title}</h1>
        {r.ok ? (
          <div style={{ display: "grid", gridTemplateColumns: "96px minmax(0,1fr)", gap: 16, padding: 20, alignItems: "center" }}>
            <img src={avatarUri(r.student.regNo, r.student.gender)} alt="" style={{ width: 96, height: 120, objectFit: "cover", borderRadius: 10, background: "var(--surface-2)" }} />
            <div className="facts" style={{ marginTop: 0 }}>
              <div style={{ gridColumn: "1 / -1" }}><span>Name</span><b>{fullName(r.student)}</b></div>
              <div><span>Reg. number</span><b className="mono">{r.student.regNo}</b></div>
              <div><span>Level</span><b>{r.student.level}</b></div>
              <div style={{ gridColumn: "1 / -1" }}><span>Department</span><b>{r.student.department}</b></div>
              <div><span>Card expires</span><b>{fmtDate(r.student.idExpiresOn)}</b></div>
              <div><span>Card version</span><b>{r.student.cardVersion}</b></div>
            </div>
          </div>
        ) : (
          <p className="muted" style={{ padding: 20, textAlign: "center" }}>This QR code was not issued by the University of Uyo ID system, or it was altered.</p>
        )}
        <div className="verdict-foot"><span>Checked {fmtStamp(new Date())}</span><Link href="/login" style={{ textDecoration: "underline" }}>Lecturer sign in</Link></div>
      </div>
      <p className="muted" style={{ fontSize: 12.5, textAlign: "center", marginTop: 12 }}>Course registration is only shown to lecturers at the checkpoint.</p>
    </main>
  );
}
