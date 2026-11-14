import type { Metadata } from "next";
import { LiveRoot } from "@/components/shell/LiveRoot";

export const metadata: Metadata = { title: "Desk", robots: { index: false } };

export default async function BranchPage({ params }: { params: Promise<{ branch: string; view: string }> }) {
  const { branch, view } = await params;
  return <LiveRoot branchId={branch} view={view} />;
}
