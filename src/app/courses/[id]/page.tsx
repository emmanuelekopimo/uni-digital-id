import Link from "next/link";
import { notFound } from "next/navigation";
import { ScanLine } from "lucide-react";
import { db } from "@/db";
import { requireRole } from "@/lib/session";
import { classRoster, sessionLog } from "@/lib/queries";
import { campusDay, now } from "@/lib/today";
import { cardState, fullName } from "@/lib/verify";
import { avatarUri } from "@/lib/avatar";
import { fmtStamp, fmtTime } from "@/lib/format";
import { AppBar } from "@/components/AppBar";
import { ResultPill } from "@/components/ResultPill";

export default async function RegisterPage(props: PageProps<"/courses/[id]">) {
  const user = await requireRole("lecturer");
  const { id } = await props.params;
  const today = campusDay(now());
  const data = await classRoster(db(), user.id, Number(id), today);
  if (!data) notFound();
  const { course, roster, verifiedToday } = data;
  const outsiders = (await sessionLog(db(), user.id, course.id, today)).filter((s) => s.result !== "in_class");
  const problems = roster.filter((r) => cardState(r.student, today) !== "valid").length;
  return (
    <>
      <AppBar user={user} active="classes" />
      <main className="wrap" style={{ paddingBottom: 60 }}>
        <div className="page-title">
          <div>
            <div className="eyebrow">Attendance register · {today}</div>
            <h1><span className="mono" style={{ color: "var(--brand)" }}>{course.code}</span> {course.title}</h1>
            <p className="muted">{course.department} · {course.level} Level · {course.venue}</p>
          </div>
          <Link href={`/scan?course=${course.id}`} className="btn btn-brand"><ScanLine size={16} /> Open checkpoint</Link>
        </div>
        <div className="stat-row">
          <div className="panel stat"><b data-testid="enrolled-count">{roster.length}</b><span>Registered</span></div>
          <div className="panel stat"><b style={{ color: "var(--ok)" }}>{verifiedToday.size}</b><span>Admitted today</span></div>
          <div className="panel stat"><b>{roster.length - verifiedToday.size}</b><span>Not yet checked</span></div>
          <div className="panel stat"><b style={{ color: "var(--warn)" }}>{problems}</b><span>Card problems</span></div>
        </div>
        <section className="panel">
          <div className="panel-head"><h2>Class list</h2><span className="muted" style={{ fontSize: 13 }}>Sorted by surname</span></div>
          <div className="table-scroll">
            <table className="table">
              <thead><tr><th>Student</th><th>Reg. number</th><th>ID card</th><th>Today</th><th>Last admitted</th></tr></thead>
              <tbody>
                {roster.map(({ student: s, lastSeen }) => {
                  const st = cardState(s, today);
                  return (
                    <tr key={s.id} data-testid="roster-row">
                      <td><div className="person"><img src={avatarUri(s.regNo, s.gender)} alt="" /><b>{fullName(s)}</b></div></td>
                      <td className="mono">{s.regNo}</td>
                      <td>{st === "valid" ? <span className="pill ok">Valid</span> : st === "expiring" ? <span className="pill warn">Expiring</span> : st === "expired" ? <span className="pill warn">Expired</span> : <span className="pill bad">Suspended</span>}</td>
                      <td>{verifiedToday.has(s.id) ? <span className="pill ok">Present</span> : <span className="pill">Not checked</span>}</td>
                      <td className="muted" style={{ whiteSpace: "nowrap" }}>{lastSeen ? fmtStamp(new Date(lastSeen)) : "Never"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel" style={{ marginTop: 18 }}>
          <div className="panel-head"><h2>Flagged at this class today</h2></div>
          {outsiders.length ? (
            <table className="table"><tbody>
              {outsiders.map((o) => (
                <tr key={o.id}><td className="mono muted" style={{ width: 80 }}>{fmtTime(o.at)}</td><td>{o.regNo ? <><b>{o.firstName} {o.lastName}</b> <span className="muted">· {o.department}</span></> : <span className="muted">Unrecognised code</span>}</td><td style={{ textAlign: "right" }}><ResultPill result={o.result} /></td></tr>
              ))}
            </tbody></table>
          ) : <div className="empty">Nobody has been flagged today.</div>}
        </section>
      </main>
    </>
  );
}
