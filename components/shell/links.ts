import { fill, templateFor } from "@/lib/core/templates";
import type { MemberState } from "@/lib/core/state";
import type { Lang, Snapshot, Stage } from "@/lib/core/types";

const ORIGIN = "https://khatabar.vercel.app";

export function origin() {
  return typeof window !== "undefined" ? window.location.origin : ORIGIN;
}

export function payLink(snap: Snapshot, mode: "demo" | "live", memberId: string) {
  const m = snap.members.find((x) => x.id === memberId);
  if (mode === "demo") return `${origin()}/demo/m/${m?.memberNo ?? ""}`;
  const tok = snap.links?.[memberId];
  return tok ? `${origin()}/m/${tok}` : `${origin()}`;
}

export function receiptLink(mode: "demo" | "live", paymentId: string) {
  return mode === "demo" ? `${origin()}/demo/r/${paymentId}` : `${origin()}/r/${paymentId}`;
}

const RENEW_STAGES: (Stage | "receipt")[] = ["pre7", "pre3", "day0", "post3"];

/** What a reminder asks for. Renewal stages ask for the next term plus anything already owed, so a
 *  member never pays the dues alone and thinks they have renewed. The dues stage asks for dues only. */
export function askFor(st: MemberState, stage: Stage | "receipt") {
  const price = st.endPlan?.price ?? st.plan?.price ?? 0;
  if (RENEW_STAGES.includes(stage)) return { price, dues: st.dues, total: price + st.dues };
  if (stage === "dues" || stage === "manual") return { price: 0, dues: st.dues, total: st.dues };
  return st.dues > 0 ? { price: 0, dues: st.dues, total: st.dues } : { price, dues: 0, total: price };
}

export function message(snap: Snapshot, mode: "demo" | "live", st: MemberState, stage: Stage | "receipt", lang: Lang, staffName: string, extra: { amount?: number; paymentId?: string; planName?: string; expiry?: string | null } = {}) {
  const body = templateFor(snap.templates, stage, lang);
  const amount = extra.amount ?? askFor(st, stage).total;
  return fill(
    body,
    {
      name: st.m.name,
      gym: snap.org.name,
      branch: snap.branch.name,
      plan: extra.planName ?? st.endPlan?.nameEn ?? st.plan?.nameEn ?? "membership",
      expiry: extra.expiry ?? st.endDate,
      daysLeft: st.daysLeft,
      amount,
      payLink: payLink(snap, mode, st.m.id),
      receiptLink: extra.paymentId ? receiptLink(mode, extra.paymentId) : "",
      staff: staffName,
    },
    lang,
  );
}
