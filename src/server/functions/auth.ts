import { and, eq, isNull } from "drizzle-orm";
import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { db } from "../db";
import { refreshTokens, users } from "../schema";
import {
  ACCESS_COOKIE,
  ACCESS_TTL_MS,
  REFRESH_COOKIE,
  REFRESH_TTL_MS,
  generateRefreshToken,
  hashPassword,
  hashToken,
  newId,
  signAccessToken,
  verifyAccessToken,
  verifyPassword,
} from "../auth";

const isProduction = process.env["NODE_ENV"] === "production";

const cookieOptions = (maxAgeMs: number) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax" as const,
  path: "/",
  maxAge: Math.floor(maxAgeMs / 1000),
});

async function issueSessionCookies(userId: string): Promise<void> {
  const accessToken = await signAccessToken(userId);
  const refreshToken = generateRefreshToken();
  const now = Date.now();
  await db.insert(refreshTokens).values({
    id: newId(),
    userId,
    tokenHash: hashToken(refreshToken),
    createdAt: now,
    expiresAt: now + REFRESH_TTL_MS,
  });
  setCookie(ACCESS_COOKIE, accessToken, cookieOptions(ACCESS_TTL_MS));
  setCookie(REFRESH_COOKIE, refreshToken, cookieOptions(REFRESH_TTL_MS));
}

function clearSessionCookies(): void {
  deleteCookie(ACCESS_COOKIE, { path: "/" });
  deleteCookie(REFRESH_COOKIE, { path: "/" });
}

/**
 * Validates the refresh cookie against `refresh_tokens` and rotates it: the
 * old row is marked revoked (linked via `replacedBy`) and a new access+refresh
 * pair is issued. A refresh token presented after it's already been rotated
 * means it was stolen/replayed, so every active token for that user is revoked
 * and the caller is forced back to login.
 */
async function rotateFromRefreshCookie(): Promise<string | null> {
  const refreshCookie = getCookie(REFRESH_COOKIE);
  if (!refreshCookie) return null;

  const tokenHash = hashToken(refreshCookie);
  const row = await db.query.refreshTokens.findFirst({
    where: eq(refreshTokens.tokenHash, tokenHash),
  });
  if (!row) return null;

  if (row.revokedAt !== null) {
    await db
      .update(refreshTokens)
      .set({ revokedAt: Date.now() })
      .where(and(eq(refreshTokens.userId, row.userId), isNull(refreshTokens.revokedAt)));
    clearSessionCookies();
    return null;
  }

  if (row.expiresAt < Date.now()) return null;

  const now = Date.now();
  const nextId = newId();
  const nextRefreshToken = generateRefreshToken();
  await db.insert(refreshTokens).values({
    id: nextId,
    userId: row.userId,
    tokenHash: hashToken(nextRefreshToken),
    createdAt: now,
    expiresAt: now + REFRESH_TTL_MS,
  });
  await db
    .update(refreshTokens)
    .set({ revokedAt: now, replacedBy: nextId })
    .where(eq(refreshTokens.id, row.id));

  setCookie(ACCESS_COOKIE, await signAccessToken(row.userId), cookieOptions(ACCESS_TTL_MS));
  setCookie(REFRESH_COOKIE, nextRefreshToken, cookieOptions(REFRESH_TTL_MS));

  return row.userId;
}

async function getAuthedUserId(): Promise<string | null> {
  const accessCookie = getCookie(ACCESS_COOKIE);
  if (accessCookie) {
    const userId = await verifyAccessToken(accessCookie);
    if (userId) return userId;
  }
  return rotateFromRefreshCookie();
}

async function getAuthedUser(): Promise<{ id: string; email: string } | null> {
  const userId = await getAuthedUserId();
  if (!userId) return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return null;
  return { id: user.id, email: user.email };
}

/** Attach to any server function that needs an authenticated caller; exposes `context.userId`. */
export const authMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const userId = await getAuthedUserId();
  if (!userId) throw new Error("UNAUTHENTICATED");
  return next({ context: { userId } });
});

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8),
});

export const register = createServerFn({ method: "POST" })
  .validator(credentialsSchema)
  .handler(async ({ data }) => {
    const existing = await db.query.users.findFirst({ where: eq(users.email, data.email) });
    if (existing) throw new Error("An account with this email already exists");

    const user = {
      id: newId(),
      email: data.email,
      passwordHash: hashPassword(data.password),
      createdAt: Date.now(),
    };
    await db.insert(users).values(user);
    await issueSessionCookies(user.id);
    return { id: user.id, email: user.email };
  });

export const login = createServerFn({ method: "POST" })
  .validator(credentialsSchema)
  .handler(async ({ data }) => {
    const user = await db.query.users.findFirst({ where: eq(users.email, data.email) });
    if (!user || !verifyPassword(data.password, user.passwordHash)) {
      throw new Error("Invalid email or password");
    }
    await issueSessionCookies(user.id);
    return { id: user.id, email: user.email };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const refreshCookie = getCookie(REFRESH_COOKIE);
  if (refreshCookie) {
    await db
      .update(refreshTokens)
      .set({ revokedAt: Date.now() })
      .where(eq(refreshTokens.tokenHash, hashToken(refreshCookie)));
  }
  clearSessionCookies();
  return null;
});

export const me = createServerFn({ method: "GET" }).handler(async () => getAuthedUser());
