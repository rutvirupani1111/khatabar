// Rotating check-in codes: KB1.{branchCode}.{memberNo}.{slot}.{sig}
// sig = base64url(HMAC-SHA256(branchCheckinKey, memberId|slot)).slice(0,10)
// Works the same in the browser (desk, offline) and on the server (member page).

export const SLOT_SECONDS = 30;
export const slotNow = (ms = Date.now()) => Math.floor(ms / 1000 / SLOT_SECONDS);

const enc = new TextEncoder();
const keyCache = new Map<string, Promise<CryptoKey>>();

function key(secret: string) {
  let k = keyCache.get(secret);
  if (!k) {
    k = crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    keyCache.set(secret, k);
  }
  return k;
}

function b64url(buf: ArrayBuffer) {
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sig(secret: string, memberId: string, slot: number | "P") {
  const mac = await crypto.subtle.sign("HMAC", await key(secret), enc.encode(`${memberId}|${slot}`));
  return b64url(mac).slice(0, 10);
}

export async function codeFor(secret: string, branchCode: string, memberNo: string, memberId: string, slot: number | "P") {
  return `KB1.${branchCode}.${memberNo}.${slot}.${await sig(secret, memberId, slot)}`;
}

export interface ParsedCode {
  branchCode: string;
  memberNo: string;
  slot: number | "P";
  sig: string;
}

export function parseCode(raw: string): ParsedCode | null {
  const m = /^KB1\.([A-Z0-9]{2,6})\.([A-Z0-9]{2,6}-\d{3,6})\.(\d{5,12}|P)\.([A-Za-z0-9_-]{10})$/.exec(raw.trim());
  if (!m) return null;
  return { branchCode: m[1], memberNo: m[2], slot: m[3] === "P" ? "P" : Number(m[3]), sig: m[4] };
}

export type Verdict = "ok" | "photo" | "old" | "bad" | "branch";

/** Accepts the current slot and the one before it (30 s of clock drift). */
export async function verify(secret: string, branchCode: string, memberId: string, c: ParsedCode, ms = Date.now()): Promise<Verdict> {
  if (c.branchCode !== branchCode) return "branch";
  if (c.slot === "P") return (await sig(secret, memberId, "P")) === c.sig ? "photo" : "bad";
  const now = slotNow(ms);
  if (c.slot > now + 1) return "bad";
  if ((await sig(secret, memberId, c.slot)) !== c.sig) return "bad";
  return now - c.slot <= 1 ? "ok" : "old";
}
