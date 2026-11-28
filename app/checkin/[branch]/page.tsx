import { notFound } from "next/navigation";
import { CheckinHop } from "@/components/shell/Screens";
import { db, hasDb } from "@/lib/server/db";

export const metadata = { title: "Check in", robots: { index: false } };

const DEMO_BRANCHES = new Set(["br-maninagar", "br-vastrapur"]);

// The door poster's link: a branch that does not exist answers 404 instead of a page.
// Real branch ids are made by /api/setup as "br_" plus 12 letters and digits.
export default async function Checkin({ params }: { params: Promise<{ branch: string }> }) {
  const { branch } = await params;
  if (DEMO_BRANCHES.has(branch)) return <CheckinHop />;
  if (!/^br_[A-Za-z0-9]{6,24}$/.test(branch)) notFound();
  let exists: boolean | null = null;
  try {
    if (hasDb()) {
      const rows = await db.query<{ id: string }>(`select id from branches where id = $1`, [branch]);
      exists = rows.length > 0;
    }
  } catch {
    exists = null; // the database did not answer: the hop page still works from this phone's card
  }
  if (exists === false) notFound();
  return <CheckinHop />;
}
