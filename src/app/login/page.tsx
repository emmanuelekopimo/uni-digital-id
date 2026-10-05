import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  if (await getSession()) redirect("/");
  return (
    <main className="login">
      <section className="login-main">
        <div className="inner">
          <img src="/logo.svg" alt="" style={{ width: 52, margin: "0 auto 22px" }} />
          <h1 style={{ fontSize: 30, fontWeight: 600 }}>Welcome back</h1>
          <p className="muted" style={{ margin: "8px 0 26px" }}>Log in to UniUyo ID to show your card or verify students in class.</p>
          <LoginForm />
        </div>
      </section>
      <aside className="login-photo">
        <img src="/images/lecture-theatre.jpg" alt="Students in a lecture theatre" />
        <div className="cap">
          <b>One scan, three answers.</b>
          <p className="muted" style={{ marginTop: 4 }}>Is this card genuine, is this a UniUyo student, and are they registered for this class?</p>
        </div>
      </aside>
    </main>
  );
}
