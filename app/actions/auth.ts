"use server";

import { redirect } from "next/navigation";
import { startSession, endSession } from "@/lib/auth";
import { createUser, getUserByEmail } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

export type AuthFormState = { error: string | null };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Only allow same-site relative redirect targets. */
function safeNext(raw: FormDataEntryValue | null): string {
  if (typeof raw === "string" && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return "/";
}

export async function registerAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (name.length > 60) return { error: "Name is too long." };
  if (!EMAIL_PATTERN.test(email)) {
    return { error: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  if (await getUserByEmail(email)) {
    return {
      error: "An account with this email already exists. Try signing in instead.",
    };
  }

  let user;
  try {
    user = await createUser(email, name, await hashPassword(password));
  } catch {
    return { error: "Could not create your account. Please try again." };
  }

  await startSession({ id: user.id, email: user.email, name: user.name });
  redirect(next === "/" ? "/account" : next);
}

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const user = await getUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return { error: "Invalid email or password." };
  }

  await startSession({ id: user.id, email: user.email, name: user.name });
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/");
}
