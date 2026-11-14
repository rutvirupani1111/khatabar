import type { Metadata } from "next";
import { MemberRoot } from "@/components/shell/MemberRoot";

export const metadata: Metadata = { title: "My card", robots: { index: false } };

export default async function MemberPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <MemberRoot token={token} />;
}
