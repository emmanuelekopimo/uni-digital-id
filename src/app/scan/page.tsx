import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { requireRole } from "@/lib/session";
import { courseOverview, sessionLog } from "@/lib/queries";
import { campusDay, now } from "@/lib/today";
import { fmtTime } from "@/lib/format";
import { avatarUri } from "@/lib/avatar";
import { requestOrigin } from "@/lib/origin";
import { demoCards } from "@/lib/samples";
import { AppBar } from "@/components/AppBar";
import { Checkpoint } from "@/components/Checkpoint";
import { ResultPill } from "@/components/ResultPill";

export const metadata: Metadata = { title: "Checkpoint" };

export default async function ScanPage(props: PageProps<"/scan">) {
  const user = await requireRole("lecturer");
  const sp = await props.searchParams;
  const today = campusDay(now());
  const courses = await courseOverview(db(), user.id, today);
  const current = courses.find((c) => c.course.id === Number(sp.course)) ?? courses[0];
  if (!current) return <><AppBar user={user} active="checkpoint" /><div className="wrap empty">You are not assigned to any course.</div></>;
  const log = await sessionLog(db(), user.id, current.course.id, today);
  const dateLabel = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${today}T12:00:00Z`));
  return (
    <>
      <AppBar user={user} active="checkpoint" />
      <div className="session">
        <div className="wrap session-inner">
          <nav className="course-switch" aria-label="Course" data-testid="course-switch">
            {courses.map(({ course }) => (
              <Link key={course.id} href={`/scan?course=${course.id}`} aria-current={course.id === current.course.id} data-testid="course-option">{course.code}</Link>
            ))}
          </nav>
          <div className="session-meta" data-testid="session-title">
            <b>{current.course.code}: {current.course.title}</b>
            {current.course.venue} · {dateLabel}
          </div>
          <div className="counters">
            <div className="counter ok"><b data-testid="present-count">{current.presentToday}</b><span>Admitted</span></div>
            <div className="counter warn"><b>{current.flaggedToday}</b><span>Flagged</span></div>
            <div className="counter"><b>{current.enrolled}</b><span>Class size</span></div>
          </div>
        </div>
      </div>
      <main className="wrap">
        <Checkpoint key={current.course.id} courseId={current.course.id} courseCode={current.course.code} samples={await demoCards(await requestOrigin())} startCamera={sp.camera === "1"}>
          <section className="panel" aria-label="Today's checks">
            <div className="panel-head">
              <h2>Today at {current.course.code}</h2>
              <Link href={`/courses/${current.course.id}`} className="btn btn-sm">Attendance register</Link>
            </div>
            {log.length ? (
              <div className="table-scroll">
                <table className="table" data-testid="session-log">
                  <tbody>
                    {log.slice(0, 8).map((r) => (
                      <tr key={r.id}>
                        <td className="mono muted" style={{ width: 80 }}>{fmtTime(r.at)}</td>
                        <td>
                          {r.regNo ? (
                            <div className="person"><img src={avatarUri(r.regNo, r.gender ?? undefined)} alt="" /><div><b>{r.firstName} {r.lastName}</b><span className="mono muted" style={{ fontSize: 12 }}>{r.regNo}</span></div></div>
                          ) : <span className="muted">Unrecognised code</span>}
                        </td>
                        <td style={{ textAlign: "right" }}><ResultPill result={r.result} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">No students checked for {current.course.code} today yet.</div>
            )}
          </section>
        </Checkpoint>
      </main>
    </>
  );
}
