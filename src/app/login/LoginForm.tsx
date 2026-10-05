"use client";

import { useActionState, useRef } from "react";
import { GraduationCap, Presentation, Scale } from "lucide-react";
import { login, type LoginState } from "@/app/actions/auth";

const DEMOS = [
  { key: "lecturer", icon: Presentation, title: "Lecturer: Dr. Aniefiok Ekong", sub: "lecturer@uniuyo.edu.ng / lecturer123", email: "lecturer@uniuyo.edu.ng", password: "lecturer123" },
  { key: "student", icon: GraduationCap, title: "Student in CSC 311: Ubong Akpan", sub: "student@uniuyo.edu.ng / student123", email: "student@uniuyo.edu.ng", password: "student123" },
  { key: "law", icon: Scale, title: "Law student: Uduak Etuk", sub: "uduak.etuk@student.uniuyo.edu.ng / student123", email: "uduak.etuk@student.uniuyo.edu.ng", password: "student123" },
];

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const email = useRef<HTMLInputElement>(null);
  const pw = useRef<HTMLInputElement>(null);
  return (
    <>
      <form action={action} className="form" noValidate>
        {state.errors?.form && <div className="form-error" role="alert">{state.errors.form}</div>}
        <div className="field" data-invalid={!!state.errors?.email}>
          <label htmlFor="email">Email address</label>
          <input ref={email} id="email" name="email" type="email" className="input" defaultValue={state.email ?? DEMOS[0].email} />
          {state.errors?.email && <span className="error">{state.errors.email}</span>}
        </div>
        <div className="field" data-invalid={!!state.errors?.password}>
          <label htmlFor="password">Password</label>
          <input ref={pw} id="password" name="password" type="password" className="input" defaultValue={DEMOS[0].password} />
          {state.errors?.password && <span className="error">{state.errors.password}</span>}
        </div>
        <button className="btn btn-dark btn-block" disabled={pending} data-testid="sign-in">{pending ? "Logging in" : "Continue"}</button>
      </form>
      <div className="demo-list" aria-label="Demo accounts">
        {DEMOS.map((d) => (
          <button key={d.key} type="button" data-testid={`demo-${d.key}`} onClick={() => { email.current!.value = d.email; pw.current!.value = d.password; }}>
            <d.icon size={18} />
            <span><b style={{ fontWeight: 500, fontSize: 14 }}>{d.title}</b><small>{d.sub}</small></span>
          </button>
        ))}
      </div>
    </>
  );
}
