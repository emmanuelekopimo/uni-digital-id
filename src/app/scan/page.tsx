import type { Metadata } from "next";
import { db } from "@/db";
import { requireRole } from "@/lib/session";
import { lecturerCourses } from "@/lib/queries";
import { makeIdToken } from "@/lib/idtoken";
import { requestOrigin } from "@/lib/origin";
import { Shell } from "@/components/Shell";
import { Scanner } from "@/components/Scanner";
import { sql } from "drizzle-orm";
import { students } from "@/db/schema";

export const metadata: Metadata = { title: "Scan" };

/** A few seeded cards for rehearsing the demo with one device. */
async function samples(origin: string) {
  const want = [
    ["Sample: Ubong Akpan (CSC 311)", "Akpan", "Ubong"],
    ["Sample: Uduak Etuk (Law)", "Etuk", "Uduak"],
    ["Sample: Amaka Nnaji (CS, not in CSC 311)", "Nnaji", "Amaka"],
    ["Sample: Tobi Adebayo (suspended)", "Adebayo", "Tobi"],
  ] as const;
  const out: { label: string; value: string }[] = [];
  for (const [label, last, first] of want) {
    const [s] = await db().select().from(students).where(sql`${students.lastName} = ${last} and ${students.firstName} = ${first}`);
    if (s) out.push({ label, value: `${origin}/verify/${makeIdToken(s.regNo, s.cardVersion)}` });
  }
  out.push({ label: "Sample: forged code", value: `${origin}/verify/UU1.VVUvMjMvQ1NDLzk5OQ.1.AAAAAAAAAAAAAAAAAAAAAA` });
  return out;
}

export default async function ScanPage(props: PageProps<"/scan">) {
  const user = await requireRole("lecturer");
  const sp = await props.searchParams;
  const list = await lecturerCourses(db(), user.id);
  const initial = Number(sp.course) || undefined;
  return (
    <Shell user={user} active="scan" title={<>UniUyo ID <span className="muted" style={{ fontSize: 15 }}>Scanner</span></>}>
      <div className="page">
        <Scanner courses={list.map((c) => ({ id: c.course.id, code: c.course.code, title: c.course.title }))} samples={await samples(await requestOrigin())} initialCourse={initial} startCamera={sp.camera === "1"} />
      </div>
    </Shell>
  );
}
