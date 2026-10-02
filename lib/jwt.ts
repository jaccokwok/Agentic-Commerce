import { SignJWT, jwtVerify } from "jose";

// Edge-safe session token helpers. This module must stay free of Node-only
// imports (it is also used by `proxy.ts`, which runs on the Edge runtime).

export const SESSION_COOKIE = "scout_session";

/** Sessions last 7 days. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type SessionUser = {
  id: number;
  email: string;
  name: string;
};

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET is not set. Generate one with `openssl rand -base64 32` and provide it via the environment.",
      );
    }
    // Convenience fallback so `next dev` works without any setup.
    return new TextEncoder().encode("dev-only-insecure-secret-change-me");
  }

  return new TextEncoder().encode(secret);
}

export async function signSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      algorithms: ["HS256"],
    });

    const id = Number(payload.sub);
    const email = typeof payload.email === "string" ? payload.email : null;
    if (!Number.isInteger(id) || id <= 0 || !email) return null;

    return {
      id,
      email,
      name: typeof payload.name === "string" ? payload.name : "",
    };
  } catch {
    return null;
  }
}
