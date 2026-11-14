import "server-only";
import { NextResponse } from "next/server";
import { hasDb } from "./db";

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });
export const fail = (error: string, status = 400) => json({ error }, status);
export const noDb = () => (hasDb() ? null : fail("This server has no database configured. The demo gym works without one.", 503));

export async function body<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
