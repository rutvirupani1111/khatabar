import { PairDevice } from "@/components/shell/Account";

export const metadata = { title: "Pair this desk", robots: { index: false } };

export default async function Pair({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <PairDevice code={code} />;
}
