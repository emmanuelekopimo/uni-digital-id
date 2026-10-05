import type { Metadata } from "next";
import { CircleAlert, CircleCheck, CircleX } from "lucide-react";
import { db } from "@/db";
import { requireRole } from "@/lib/session";
import { myStudentRecord } from "@/lib/queries";
import { campusDay, now } from "@/lib/today";
import { cardState, daysToExpiry } from "@/lib/verify";
import { fmtDate } from "@/lib/format";
import { requestOrigin } from "@/lib/origin";
import { Shell } from "@/components/Shell";
import { IdCardBack, IdCardFront } from "@/components/IdCard";
import { PrintButton } from "@/components/PrintButton";

export const metadata: Metadata = { title: "My ID card" };

export default async function CardPage() {
  const user = await requireRole("student");
  const rec = await myStudentRecord(db(), user.id);
  const today = campusDay(now());
  if (!rec) return <Shell user={user} active="card" title="My ID card"><div className="page"><p>No student record is linked to this account.</p></div></Shell>;
  const { student: s, courses } = rec;
  const state = cardState(s, today);
  const days = daysToExpiry(s.idExpiresOn, today);
  return (
    <Shell user={user} active="card" title="My ID card" actions={<PrintButton />}>
      <div className="page page-wide">
        <h1 style={{ fontSize: 26, margin: "10px 0 6px" }}>Hi {s.firstName}, here is your student ID</h1>
        <p className="muted" style={{ marginBottom: 14 }}>Lecturers scan the QR code to confirm you are a UniUyo student and check your course registration.</p>
        {state === "valid" && <div className="banner green" data-testid="card-status"><CircleCheck size={18} /> Valid until {fmtDate(s.idExpiresOn)}.</div>}
        {state === "expiring" && <div className="banner amber" data-testid="card-status"><CircleAlert size={18} /> Your card expires in {days} days. Renew it at the ICT Centre.</div>}
        {state === "expired" && <div className="banner red" data-testid="card-status"><CircleX size={18} /> This card expired on {fmtDate(s.idExpiresOn)}. Lecturers will see an expired warning.</div>}
        {state === "suspended" && <div className="banner red" data-testid="card-status"><CircleX size={18} /> Your studentship is suspended. Contact Student Affairs.</div>}
        <div className="cards">
          <IdCardFront s={s} origin={await requestOrigin()} void={state === "suspended" ? "SUSPENDED" : state === "expired" ? "EXPIRED" : undefined} />
          <IdCardBack s={s} />
        </div>
        <h2 className="section-title" id="courses">Registered courses this semester</h2>
        {courses.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Code</th><th>Title</th><th>Units</th><th>Lecturer</th><th>Venue</th></tr></thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.code}><td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{c.code}</td><td>{c.title}</td><td>{c.units}</td><td>{c.lecturer}</td><td className="muted">{c.venue}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No courses registered.</p>
        )}
      </div>
    </Shell>
  );
}
