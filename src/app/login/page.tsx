import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getSession()) redirect("/");
  return (
    <main className="login">
      <aside className="login-art">
        <img src="/images/lecture-theatre.jpg" alt="Students in a lecture theatre" />
        <div className="art-copy">
          <img src="/logo-white.svg" alt="" style={{ width: 52 }} />
          <div className="eyebrow" style={{ color: "rgba(255,255,255,0.75)" }}>University of Uyo</div>
          <h2 style={{ fontSize: 34 }}>Digital student ID and class checkpoint</h2>
          <p style={{ opacity: 0.85 }}>Students carry a signed ID card on their phone. Lecturers scan it at the door and see straight away whether the student belongs to the class.</p>
        </div>
      </aside>
      <section className="login-main">
        <div className="inner">
          <h1 style={{ fontSize: 26 }}>Sign in</h1>
          <p className="muted" style={{ marginTop: 6 }}>Pick a demo account or use your university email.</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
