import Link from "next/link";
import { BookOpen, IdCard, LogOut, ScanLine, ShieldCheck, SquarePen } from "lucide-react";
import { db } from "@/db";
import type { User } from "@/db/schema";
import { logout } from "@/app/actions/auth";
import { lecturerCourses, recentScans } from "@/lib/queries";
import { avatarUri } from "@/lib/avatar";
import { fmtTime } from "@/lib/format";
import { TONE } from "@/lib/tones";
import { ClientShell } from "./ClientShell";

export async function Shell({ user, active, title, actions, children }: { user: User; active: string; title: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode }) {
  let body: React.ReactNode;
  if (user.role === "lecturer") {
    const [courses, recent] = await Promise.all([lecturerCourses(db(), user.id), recentScans(db(), user.id, 14)]);
    body = (
      <>
        <Link href="/scan" className="sb-link" aria-current={active === "scan" ? "page" : undefined} data-testid="new-scan"><SquarePen size={17} /> New scan</Link>
        <div className="sb-title">Your courses</div>
        {courses.map(({ course, enrolled }) => (
          <Link key={course.id} href={`/courses/${course.id}`} className="sb-item" aria-current={active === `course-${course.id}` ? "page" : undefined}>
            <BookOpen size={13} style={{ display: "inline", verticalAlign: -2, marginRight: 7 }} />
            {course.code} <small>· {enrolled} students</small>
          </Link>
        ))}
        <div className="sb-title">Recent scans</div>
        {recent.map((r) => (
          <div key={r.id} className="sb-item" title={r.result}>
            <span className="sb-dot" style={{ background: TONE[r.result].color }} />
            {r.firstName ? `${r.firstName} ${r.lastName}` : "Unrecognised code"} <small>· {r.code} · {fmtTime(r.at)}</small>
          </div>
        ))}
      </>
    );
  } else {
    body = (
      <>
        <Link href="/card" className="sb-link" aria-current={active === "card" ? "page" : undefined}><IdCard size={17} /> My ID card</Link>
        <Link href="/card#courses" className="sb-link"><BookOpen size={17} /> Registered courses</Link>
        <div className="sb-title">About</div>
        <div className="sb-item" style={{ whiteSpace: "normal" }}><small>Show the QR code on your card to a lecturer. It proves you are a UniUyo student and which classes you are registered for.</small></div>
      </>
    );
  }
  return (
    <ClientShell
      title={title}
      actions={actions}
      sidebar={
        <>
          <Link href="/" className="sb-brand"><img src="/logo.svg" alt="" /> UniUyo ID</Link>
          {body}
          <div className="sb-title">Tools</div>
          <Link href="/verify" className="sb-link"><ShieldCheck size={17} /> Public card check</Link>
          {user.role === "lecturer" && <Link href="/scan?camera=1" className="sb-link"><ScanLine size={17} /> Camera scanner</Link>}
          <div className="sb-user">
            <img src={avatarUri(user.email)} alt="" />
            <div style={{ flex: 1, minWidth: 0 }}><b>{user.name}</b><span>{user.role === "lecturer" ? user.department : "Student"}</span></div>
            <form action={logout}><button className="icon-btn" aria-label="Sign out" title="Sign out" data-testid="logout"><LogOut size={16} /></button></form>
          </div>
        </>
      }
    >
      {children}
    </ClientShell>
  );
}
