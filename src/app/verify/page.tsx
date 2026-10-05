import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { extractToken } from "@/lib/idtoken";

export const metadata: Metadata = { title: "Public card check" };

async function go(formData: FormData) {
  "use server";
  const t = extractToken(String(formData.get("code") ?? ""));
  redirect(`/verify/${encodeURIComponent(t || "x")}`);
}

export default function VerifyLanding() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 560, textAlign: "center" }}>
        <img src="/logo.svg" alt="" style={{ width: 46, margin: "0 auto 18px" }} />
        <h1 style={{ fontSize: 26, fontWeight: 500 }}>Check a UniUyo ID card</h1>
        <p className="muted" style={{ margin: "8px 0 22px" }}>Scan the card with your phone camera, or paste the code below.</p>
        <form action={go} className="composer" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input name="code" placeholder="Paste the card code" aria-label="Card code" style={{ flex: 1 }} />
          <button className="btn btn-dark btn-sm">Check</button>
        </form>
      </div>
    </main>
  );
}
