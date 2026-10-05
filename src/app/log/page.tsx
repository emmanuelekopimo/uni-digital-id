import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { requireRole } from "@/lib/session";
import { courseOverview, scanLog } from "@/lib/queries";
import { campusDay, now } from "@/lib/today";
import { fmtStamp } from "@/lib/format";
import { AppBar } from "@/components/AppBar";
import { ResultPill } from "@/components/ResultPill";

export const metadata: Metadata = { title: "Scan log" };

const GROUPS = [["", "All"], ["admitted", "Admitted"], ["flagged", "Flagged"], ["rejected", "Rejected"]] as const;

export default async function LogPage(props: PageProps<"/log">) {
  const user = await requireRole("lecturer");
  const sp = await props.searchParams;
  const group = GROUPS.some(([g]) => g && g === sp.group) ? (sp.group as "admitted" | "flagged" | "rejected") : undefined;
  const courseId = Number(sp.course) || undefined;
  const [rows, courses] = await Promise.all([scanLog(db(), user.id, { group, courseId }), courseOverview(db(), user.id, campusDay(now()))]);
  const href = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const m = { group, course: courseId ? String(courseId) : undefined, ...o };
    for (const [k, v] of Object.entries(m)) if (v) p.set(k, v);
    return `/log${p.size ? `?${p}` : ""}`;
  };
  return (
    <>
      <AppBar user={user} active="log" />
      <main className="wrap" style={{ paddingBottom: 60 }}>
        <div className="page-title"><div><div className="eyebrow">Every check you have made</div><h1>Scan log</h1></div></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {GROUPS.map(([g, l]) => <Link key={l} href={href({ group: g || undefined })} className={`btn btn-sm ${group === (g || undefined) ? "btn-brand" : ""}`}>{l}</Link>)}
          <span style={{ width: 12 }} />
          <Link href={href({ course: undefined })} className={`btn btn-sm ${!courseId ? "btn-brand" : ""}`}>All courses</Link>
          {courses.map(({ course }) => <Link key={course.id} href={href({ course: String(course.id) })} className={`btn btn-sm ${courseId === course.id ? "btn-brand" : ""}`}>{course.code}</Link>)}
        </div>
        <section className="panel">
          <div className="table-scroll">
            <table className="table" data-testid="scan-log">
              <thead><tr><th>Time</th><th>Course</th><th>Student</th><th>Department</th><th>Result</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>{fmtStamp(r.at)}</td>
                    <td className="mono">{r.code}</td>
                    <td>{r.regNo ? <><b style={{ fontWeight: 600 }}>{r.firstName} {r.lastName}</b><div className="mono muted" style={{ fontSize: 12 }}>{r.regNo}</div></> : <span className="muted">Unrecognised code</span>}</td>
                    <td className="muted">{r.department ?? "-"}</td>
                    <td><ResultPill result={r.result} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <div className="empty">No scans match this filter.</div>}
          </div>
        </section>
      </main>
    </>
  );
}
