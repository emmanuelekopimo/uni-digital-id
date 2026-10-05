import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { extractToken } from "@/lib/idtoken";

export const metadata: Metadata = { title: "Check an ID" };

async function go(formData: FormData) {
  "use server";
  const t = extractToken(String(formData.get("code") ?? ""));
  redirect(`/verify/${encodeURIComponent(t || "x")}`);
}

export default function VerifyLanding() {
  return (
    <main className="cert">
      <div className="panel">
        <div className="cert-head"><img src="/logo-white.svg" alt="" /><div><b>University of Uyo</b><div style={{ fontSize: 12.5, opacity: 0.8 }}>Student ID verification</div></div></div>
        <div style={{ padding: 20, display: "grid", gap: 12 }}>
          <p>Scan the QR code on a student ID with your phone camera, or paste the code here.</p>
          <form action={go} className="manual">
            <input name="code" placeholder="Card code" aria-label="Card code" />
            <button className="btn btn-brand">Check</button>
          </form>
        </div>
      </div>
    </main>
  );
}
