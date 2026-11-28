import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MemberRoot } from "@/components/shell/MemberRoot";
import { hasDb } from "@/lib/server/db";
import { memberByToken } from "@/lib/server/member";

export const metadata: Metadata = { title: "My card", robots: { index: false } };

// A card link that does not exist (or was revoked) answers 404, so link checkers treat it as dead;
// the 404 page itself says what to do in plain words.
export default async function MemberPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{22}$/.test(token)) notFound();
  let found: boolean | null = null;
  try {
    if (hasDb()) found = !!(await memberByToken(token));
  } catch {
    found = null; // the database did not answer: let the card page try, it explains itself
  }
  if (found === false) notFound();
  return <MemberRoot token={token} />;
}
