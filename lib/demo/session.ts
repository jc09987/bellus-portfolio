import { cookies } from "next/headers";
import { createSession } from "@/lib/demo/book";
import { decodeSession, encodeSession, sessionCookieNames } from "@/lib/demo/persist";
import type { Session } from "@/lib/demo/types";

const LEGACY_COOKIE = "bellus_demo";

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    secure: process.env.NODE_ENV === "production",
  };
}

function readChunks(): string[] {
  const jar = cookies();
  const chunks: string[] = [];
  for (const name of sessionCookieNames()) {
    const value = jar.get(name)?.value;
    if (!value) break;
    chunks.push(value);
  }
  return chunks;
}

export function openSession(): Session {
  return decodeSession(readChunks()) ?? createSession();
}

export function peekSession(): Session | null {
  return decodeSession(readChunks());
}

export function saveSession(session: Session) {
  const jar = cookies();
  const chunks = encodeSession(session);
  sessionCookieNames().forEach((name, index) => {
    const chunk = chunks[index];
    if (chunk) jar.set(name, chunk, cookieOptions(60 * 60 * 12));
    else jar.delete(name);
  });
  jar.delete(LEGACY_COOKIE);
}

export function resetSession(): Session {
  const session = createSession();
  saveSession(session);
  return session;
}
