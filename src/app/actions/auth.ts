"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { checkPassword } from "@/lib/auth";
import { findUserByEmail } from "@/lib/queries";
import { createSession, destroySession } from "@/lib/session";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export type LoginState = { errors?: Record<string, string | undefined>; email?: string };

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const parsed = loginSchema.safeParse({ email, password: formData.get("password") });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { errors, email };
  }
  const user = await findUserByEmail(db(), parsed.data.email);
  if (!user || !(await checkPassword(parsed.data.password, user.passwordHash))) return { errors: { form: "Incorrect email or password" }, email };
  await createSession({ userId: user.id, role: user.role, name: user.name });
  redirect(user.role === "lecturer" ? "/scan" : "/card");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
