"use client";

import { useActionState, useRef, useState } from "react";
import { GraduationCap, Presentation, Scale } from "lucide-react";
import { login, type LoginState } from "@/app/actions/auth";

const DEMOS = [
  { key: "lecturer", icon: Presentation, title: "Lecturer", sub: "Dr. Aniefiok Ekong", email: "lecturer@uniuyo.edu.ng", password: "lecturer123" },
  { key: "student", icon: GraduationCap, title: "CSC student", sub: "Ubong Akpan", email: "student@uniuyo.edu.ng", password: "student123" },
  { key: "law", icon: Scale, title: "Law student", sub: "Uduak Etuk", email: "uduak.etuk@student.uniuyo.edu.ng", password: "student123" },
] as const;

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const [picked, setPicked] = useState<string>("lecturer");
  const email = useRef<HTMLInputElement>(null);
  const pw = useRef<HTMLInputElement>(null);
  return (
    <>
      <div className="role-pick" role="group" aria-label="Demo accounts">
        {DEMOS.map((d) => (
          <button key={d.key} type="button" aria-pressed={picked === d.key} data-testid={`demo-${d.key}`}
            onClick={() => { setPicked(d.key); email.current!.value = d.email; pw.current!.value = d.password; }}>
            <d.icon size={22} />
            <span>{d.title}<br /><span className="muted" style={{ fontWeight: 500 }}>{d.sub}</span></span>
          </button>
        ))}
      </div>
      <form action={action} className="form" noValidate>
        {state.errors?.form && <div className="form-error" role="alert">{state.errors.form}</div>}
        <div className="field" data-invalid={!!state.errors?.email}>
          <label htmlFor="email">University email</label>
          <input ref={email} id="email" name="email" type="email" className="input" defaultValue={state.email ?? DEMOS[0].email} />
          {state.errors?.email && <span className="error">{state.errors.email}</span>}
        </div>
        <div className="field" data-invalid={!!state.errors?.password}>
          <label htmlFor="password">Password</label>
          <input ref={pw} id="password" name="password" type="password" className="input" defaultValue={DEMOS[0].password} />
          {state.errors?.password && <span className="error">{state.errors.password}</span>}
        </div>
        <button className="btn btn-brand btn-lg" disabled={pending} data-testid="sign-in">{pending ? "Signing in" : "Sign in"}</button>
        <p className="muted" style={{ fontSize: 12.5 }}>Demo passwords: lecturer123 for the lecturer, student123 for every student.</p>
      </form>
    </>
  );
}
