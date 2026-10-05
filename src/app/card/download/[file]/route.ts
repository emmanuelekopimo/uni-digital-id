import { db } from "@/db";
import { getSession } from "@/lib/session";
import { myStudentRecord } from "@/lib/queries";
import { requestOrigin } from "@/lib/origin";
import { cardQr } from "@/components/IdCard";
import { renderCardPng } from "@/lib/card-image";
import { buildCardPdf } from "@/lib/card-pdf";
import { cardState, fullName } from "@/lib/verify";
import { campusDay, now } from "@/lib/today";

const FILES = ["front.png", "back.png", "card.pdf"] as const;

/** Downloads of the signed-in student's own card: front.png, back.png or a print-ready card.pdf. */
export async function GET(_: Request, ctx: RouteContext<"/card/download/[file]">) {
  const { file } = await ctx.params;
  if (!(FILES as readonly string[]).includes(file)) return new Response("Not found", { status: 404 });
  const session = await getSession();
  if (!session || session.role !== "student") return new Response("Sign in as a student to download your card", { status: 401 });
  const rec = await myStudentRecord(db(), session.userId);
  if (!rec) return new Response("No student record", { status: 404 });
  const s = rec.student;
  const state = cardState(s, campusDay(now()));
  const stamp = state === "suspended" ? "SUSPENDED" : state === "expired" ? "EXPIRED" : undefined;
  const qr = await cardQr(s, await requestOrigin());
  const base = `uniuyo-id-${s.regNo.replace(/\//g, "-").toLowerCase()}`;
  const headers = (type: string, name: string) => ({
    "Content-Type": type,
    "Content-Disposition": `attachment; filename="${name}"`,
    "Cache-Control": "private, no-store",
  });

  if (file === "front.png") return new Response(await renderCardPng("front", s, qr.svg, stamp), { headers: headers("image/png", `${base}-front.png`) });
  if (file === "back.png") return new Response(await renderCardPng("back", s, qr.svg), { headers: headers("image/png", `${base}-back.png`) });
  const [front, back] = await Promise.all([renderCardPng("front", s, qr.svg, stamp), renderCardPng("back", s, qr.svg)]);
  const generated = new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "Africa/Lagos" }).format(new Date());
  const pdf = await buildCardPdf(front, back, { name: fullName(s), regNo: s.regNo, generated });
  return new Response(new Uint8Array(pdf), { headers: headers("application/pdf", `${base}.pdf`) });
}
