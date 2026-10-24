import { headers } from "next/headers";
import { auth } from "./auth";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionData {
  id: string;
  userId: string;
  expiresAt: Date;
  token: string;
  createdAt: Date;
  updatedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface UserSession {
  user: SessionUser;
  session: SessionData;
}

/**
 * Retrieve active session on the server side (Next.js server component / server actions).
 * Returns null if unauthenticated or session expired (ADR-003 §2.1).
 */
export async function getServerSession(): Promise<UserSession | null> {
  const reqHeaders = await headers();
  const res = await auth.api.getSession({ headers: reqHeaders });
  if (!res) return null;
  return res as unknown as UserSession;
}
