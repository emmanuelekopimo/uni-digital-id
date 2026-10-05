import type { Metadata } from "next";
import Link from "next/link";
import { ScanLine } from "lucide-react";
import { db } from "@/db";
import { requireRole } from "@/lib/session";
import { courseOverview } from "@/lib/queries";
import { campusDay, now } from "@/lib/today";
import { fmtStamp } from "@/lib/format";
import { AppBar } from "@/components/AppBar";

export const metadata: Metadata = { title: "Classes" };

export default async function CoursesPage() {
  const user = await requireRole("lecturer");
  const list = await courseOverview(db(), user.id, campusDay(now()));
  return (
    <>
      <AppBar user={user} active="classes" />
      <main className="wrap">
        <div className="page-title"><div><div className="eyebrow">This semester</div><h1>Your classes</h1></div></div>
        <div className="course-grid">
          {list.map(({ course, enrolled, presentToday, flaggedToday, lastScan }) => (
            <div className="panel course-tile" key={course.id} data-testid="course-tile">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span className="code">{course.code}</span>
                <span className="muted" style={{ fontSize: 13 }}>{course.level} Level · {course.units} units</span>
              </div>
              <div><b>{course.title}</b><div className="muted" style={{ fontSize: 13 }}>{course.venue}</div></div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}><span>Admitted today</span><b className="mono">{presentToday} / {enrolled}</b></div>
                <div className="meter"><i style={{ width: `${enrolled ? Math.round((presentToday / enrolled) * 100) : 0}%` }} /></div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {flaggedToday > 0 && <span className="pill warn">{flaggedToday} flagged today</span>}
                <span className="muted" style={{ fontSize: 12.5 }}>{lastScan ? `Last scan ${fmtStamp(new Date(lastScan))}` : "No scans yet"}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Link className="btn btn-brand btn-sm" href={`/scan?course=${course.id}`}><ScanLine size={15} /> Open checkpoint</Link>
                <Link className="btn btn-sm" href={`/courses/${course.id}`}>Register</Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
