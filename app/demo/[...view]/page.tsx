import type { Metadata } from "next";
import { DemoRoot } from "@/components/shell/DemoRoot";

export const metadata: Metadata = { title: "Demo gym", robots: { index: false } };

export default async function DemoPage({ params }: { params: Promise<{ view: string[] }> }) {
  const { view } = await params;
  return <DemoRoot view={view} />;
}
