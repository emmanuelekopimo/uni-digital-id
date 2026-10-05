import Link from "next/link";
import { notFound } from "next/navigation";
import { ScanLine } from "lucide-react";
import { db } from "@/db";
import { requireRole } from "@/lib/session";
import { classRoster } from "@/lib/queries";
import { campusDay, now } from "@/lib/today";
import { cardState, fullName } from "@/lib/verify";
import { avatarUri } from "@/lib/avatar";
import { fmtStamp } from "@/lib/format";
import { Shell } from "@/components/Shell";

export default async function CoursePage(props: PageProps<"/courses/[id]">) {
  const user = await requireRole("lecturer");
  const { id } = await props.params;
  const today = campusDay(now());
  const data = await classRoster(db(), user.id, Number(id), today);
  if (!data) notFound();
  const { course, roster, verifiedToday, outsiders } = data;
  const problems = roster.filter((r) => cardState(r.student, today) !== "valid").length;
  return (
    <Shell user={user} active={`course-${course.id}`} title={`${course.code} class list`} actions={<Link href={`/scan?course=${course.id}`} className="btn btn-dark btn-sm"><ScanLine size={15} /> Scan for this class</Link>}>
      <div className="page page-wide">
        <h1 style={{ fontSize: 26, marginTop: 10 }}>{course.code}: {course.title}</h1>
        <p className="muted">{course.department} · {course.level} Level · {course.units} units · {course.venue}</p>
        <div className="stats">
          <div className="stat"><b data-testid="enrolled-count">{roster.length}</b><span>registered students</span></div>
          <div className="stat"><b>{verifiedToday.size}</b><span>verified in class today</span></div>
          <div className="stat"><b>{outsiders + problems}</b><span>flags (outsiders today, card problems)</span></div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Student</th><th>Reg. number</th><th>Card</th><th>Last verified</th></tr></thead>
            <tbody>
              {roster.map(({ student: s, lastSeen }) => {
                const st = cardState(s, today);
                return (
                  <tr key={s.id} data-testid="roster-row">
                    <td><div className="person"><img src={avatarUri(s.regNo, s.gender)} alt="" /><div><div style={{ fontWeight: 500 }}>{fullName(s)}</div><div className="muted" style={{ fontSize: 12.5 }}>{s.department}</div></div></div></td>
                    <td style={{ whiteSpace: "nowrap" }}>{s.regNo}</td>
                    <td>{st === "valid" ? <span className="pill green">Valid</span> : st === "expiring" ? <span className="pill amber">Expiring</span> : st === "expired" ? <span className="pill amber">Expired</span> : <span className="pill red">Suspended</span>}</td>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>{verifiedToday.has(s.id) ? <span className="pill green">Today</span> : lastSeen ? fmtStamp(new Date(lastSeen)) : "Not yet"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Shell>
  );
}
