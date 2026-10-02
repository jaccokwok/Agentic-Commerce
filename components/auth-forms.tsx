"use client";

import { useActionState } from "react";
import { loginAction, registerAction, type AuthFormState } from "@/app/actions/auth";

const FIELD_LABEL =
  "font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400";

const INPUT_CLASS =
  "mt-1.5 w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-300 focus:border-[#a4cd39] focus:outline-none focus:ring-2 focus:ring-[#c8f14f]/40";

const initialState: AuthFormState = { error: null };

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-1 w-full rounded-full bg-[#c8f14f] py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-[#bdef38] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a4cd39] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "One moment…" : label}
    </button>
  );
}

function ErrorNotice({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p
      role="alert"
      className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600 ring-1 ring-red-100"
    >
      {error}
    </p>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4 text-left">
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="login-email" className={FIELD_LABEL}>
          Email
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label htmlFor="login-password" className={FIELD_LABEL}>
          Password
        </label>
        <input
          id="login-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className={INPUT_CLASS}
        />
      </div>

      <ErrorNotice error={state.error} />
      <SubmitButton pending={pending} label="Sign in" />
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(
    registerAction,
    initialState,
  );

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4 text-left">
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="register-name" className={FIELD_LABEL}>
          Name
        </label>
        <input
          id="register-name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Alex Shopper"
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label htmlFor="register-email" className={FIELD_LABEL}>
          Email
        </label>
        <input
          id="register-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label htmlFor="register-password" className={FIELD_LABEL}>
          Password
        </label>
        <input
          id="register-password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          className={INPUT_CLASS}
        />
      </div>

      <ErrorNotice error={state.error} />
      <SubmitButton pending={pending} label="Create account" />
    </form>
  );
}
