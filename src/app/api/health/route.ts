import { pingDb } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await pingDb();
    return Response.json({ status: "ok", database: "ok", time: new Date().toISOString() });
  } catch (e) {
    return Response.json({ status: "error", database: "unreachable", message: (e as Error).message }, { status: 503 });
  }
}
