"use client";
// The desk's local copy. base = what the server has confirmed; queue = changes
// made here and not yet confirmed. What the screen shows is base + queue,
// recomputed with the same applyOp the server runs, so a rejected change rolls
// back cleanly and nothing is ever silently overwritten.
import { useSyncExternalStore } from "react";
import { DEMO_KEY, DEMO_PINS, demoSnapshot } from "@/lib/core/demo-seed";
import { applyMutations, applyOp, type Op, type OpActor } from "@/lib/core/ops";
import { todayIST } from "@/lib/core/dates";
import { uid } from "@/lib/core/money";
import type { Mutation, Role, Snapshot } from "@/lib/core/types";
import { idbDel, idbGet, idbSet } from "./idb";

export interface Note {
  id: string;
  text: string;
  tone: "red" | "ink";
  at: number;
}

export interface Repo {
  kind: "demo" | "live" | "member" | "member-demo";
  cacheKey: string;
  /** false: nothing is read from or written to IndexedDB (the home page's street demo) */
  persist?: boolean;
  load(): Promise<{ snap: Snapshot; key: string | null; actor: OpActor; vapid?: never }>;
  send?(ops: Op[]): Promise<{ id: string; ok: boolean; muts?: Mutation[]; error?: string; note?: string }[]>;
}

interface Queued {
  op: Op;
  rowIds: string[];
}

export interface StoreState {
  status: "loading" | "ready" | "error" | "locked";
  snap: Snapshot | null;
  actor: OpActor;
  queue: Queued[];
  unsynced: Set<string>;
  notes: Note[];
  online: boolean;
  error: string | null;
  lastSync: number;
}

const emptyActor: OpActor = { staffId: null, role: "desk" };

export class Store {
  state: StoreState = { status: "loading", snap: null, actor: emptyActor, queue: [], unsynced: new Set(), notes: [], online: true, error: null, lastSync: 0 };
  private base: Snapshot | null = null;
  private listeners = new Set<() => void>();
  private flushing = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private started: Promise<void> | null = null;
  private resets = new Set<() => void>();
  checkinKey: string | null = null;

  constructor(public repo: Repo) {}

  private get keep() {
    return this.repo.persist !== false;
  }
  private save(k: string, v: unknown) {
    if (this.keep) void idbSet(k, v);
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  get = () => this.state;
  private set(p: Partial<StoreState>) {
    this.state = { ...this.state, ...p };
    this.listeners.forEach((f) => f());
  }

  /** Called after resetDemo, so pictures and panels can return to their first pose. */
  onReset(fn: () => void) {
    this.resets.add(fn);
    return () => {
      this.resets.delete(fn);
    };
  }

  /** Safe to call from several places: the first call does the work, the rest wait for it. */
  init() {
    if (!this.started) this.started = this.start();
    return this.started;
  }

  /** The live desk calls this again after a PIN unlocks it. */
  reinit() {
    this.started = this.start();
    return this.started;
  }

  private async start() {
    const ck = this.repo.cacheKey;
    const cachedQueue = (this.keep ? await idbGet<Queued[]>(`${ck}:queue`) : undefined) ?? [];
    try {
      const { snap, key, actor } = await this.repo.load();
      this.base = snap;
      this.checkinKey = key;
      this.set({ actor, status: "loading", error: null });
      if (this.repo.kind === "live") this.save(`${ck}:base`, snap);
    } catch (e) {
      const cached = this.repo.kind === "live" && this.keep ? await idbGet<Snapshot>(`${ck}:base`) : undefined;
      if (!cached) {
        const msg = e instanceof Error ? e.message : "Could not load";
        this.set({ status: msg === "locked" ? "locked" : "error", error: msg });
        return;
      }
      this.base = cached;
      this.set({ online: false });
    }
    this.set({ queue: cachedQueue });
    this.recompute();
    this.set({ status: "ready", lastSync: Date.now() });
    if (this.repo.send && !this.timer) {
      void this.flush();
      this.timer = setInterval(() => void this.flush(), 15000);
      window.addEventListener("online", this.onOnline);
    }
  }

  dispose() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    window.removeEventListener("online", this.onOnline);
  }

  private onOnline = () => void this.flush();

  private recompute() {
    if (!this.base) return;
    let s = this.base;
    const unsynced = new Set<string>();
    const keep: Queued[] = [];
    for (const q of this.state.queue) {
      const r = applyOp(s, q.op, this.state.actor, this.ctx(Date.parse(q.op.at)));
      if (r.error) continue;
      s = applyMutations(s, r.muts);
      r.muts.forEach((m) => unsynced.add(m.row.id));
      keep.push({ op: q.op, rowIds: r.muts.map((m) => m.row.id) });
    }
    this.set({ snap: s, unsynced, queue: keep });
  }

  private ctx(now?: number) {
    return {
      now,
      checkPin: (pin: string, roles: Role[]) => {
        if (this.repo.kind !== "demo" && this.repo.kind !== "member-demo") return pin.length === 4 ? "pending-server-check" : null;
        const hit = Object.entries(DEMO_PINS).find(([id, p]) => p === pin && roles.includes(this.base?.staff.find((s) => s.id === id)?.role as Role));
        return hit ? hit[0] : null;
      },
    };
  }

  setActor(actor: OpActor) {
    this.set({ actor });
  }

  note(text: string, tone: Note["tone"] = "red") {
    const n = { id: uid(), text, tone, at: Date.now() };
    this.set({ notes: [n, ...this.state.notes].slice(0, 4) });
    setTimeout(() => this.set({ notes: this.state.notes.filter((x) => x.id !== n.id) }), 6000);
  }

  /** Make a change: it shows at once, then syncs. */
  run(kind: string, payload: unknown): { ok: boolean; error?: string; note?: string; opId: string } {
    const op: Op = { id: uid(), kind, at: new Date().toISOString(), payload };
    const cur = this.state.snap;
    if (!cur || !this.base) return { ok: false, error: "Still loading", opId: op.id };
    const r = applyOp(cur, op, this.state.actor, this.ctx());
    if (r.error) return { ok: false, error: r.error, opId: op.id };
    if (!this.repo.send) {
      // demo: the browser is the whole database
      this.base = applyMutations(this.base, r.muts);
      this.set({ snap: applyMutations(cur, r.muts) });
      this.save(`${this.repo.cacheKey}:base`, this.base);
      return { ok: true, note: r.note, opId: op.id };
    }
    const queue = [...this.state.queue, { op, rowIds: r.muts.map((m) => m.row.id) }];
    const unsynced = new Set(this.state.unsynced);
    r.muts.forEach((m) => unsynced.add(m.row.id));
    this.set({ snap: applyMutations(cur, r.muts), queue, unsynced });
    this.save(`${this.repo.cacheKey}:queue`, queue);
    setTimeout(() => void this.flush(), 30);
    return { ok: true, note: r.note, opId: op.id };
  }

  /** Removes a change that has not reached the server yet. */
  dropUnsynced(opId: string): boolean {
    if (this.flushing && this.state.queue[0]?.op.id === opId) return false;
    const before = this.state.queue.length;
    this.set({ queue: this.state.queue.filter((q) => q.op.id !== opId) });
    if (this.state.queue.length === before) return false;
    this.save(`${this.repo.cacheKey}:queue`, this.state.queue);
    this.recompute();
    return true;
  }

  isUnsynced(opId: string) {
    return this.state.queue.some((q) => q.op.id === opId);
  }

  async flush() {
    if (!this.repo.send || this.flushing || !this.state.queue.length || !this.base) return;
    this.flushing = true;
    try {
      const batch = this.state.queue.slice(0, 20);
      const res = await this.repo.send(batch.map((q) => q.op));
      let base = this.base;
      const done = new Set<string>();
      for (const r of res) {
        done.add(r.id);
        if (r.ok && r.muts) base = applyMutations(base, r.muts);
        else if (!r.ok) {
          const q = batch.find((x) => x.op.id === r.id);
          this.note(`Not saved: ${r.error ?? "the server refused"}${q ? ` (${q.op.kind})` : ""}`);
        }
        if (r.note) this.note(r.note, "ink");
      }
      this.base = base;
      this.set({ queue: this.state.queue.filter((q) => !done.has(q.op.id)), online: true, lastSync: Date.now() });
      this.save(`${this.repo.cacheKey}:queue`, this.state.queue);
      this.save(`${this.repo.cacheKey}:base`, base);
      this.recompute();
    } catch {
      this.set({ online: false });
    } finally {
      this.flushing = false;
    }
    if (this.state.queue.length && this.state.online) void this.flush();
  }

  async refresh() {
    if (this.state.queue.length) return;
    try {
      const { snap } = await this.repo.load();
      this.base = snap;
      this.recompute();
      this.set({ online: true, lastSync: Date.now() });
      if (this.repo.kind === "live") this.save(`${this.repo.cacheKey}:base`, snap);
    } catch {
      this.set({ online: false });
    }
  }

  /** Demo only: drop the browser's copy and start again from the seed. */
  async resetDemo() {
    if (this.repo.kind === "live" || this.repo.kind === "member") return;
    if (this.keep) await idbDel(`${this.repo.cacheKey}:base`);
    const { snap, actor } = await this.repo.load();
    this.base = snap;
    this.set({ queue: [], actor, notes: [] });
    this.recompute();
    this.resets.forEach((f) => f());
  }
}

export function useStore<T>(store: Store, sel: (s: StoreState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => sel(store.state),
    () => sel(store.state),
  );
}

// ---------- repos ----------

export function demoRepo(code: "LP" | "LV", actor: OpActor = { staffId: "st-ravi", role: "desk" }): Repo {
  const cacheKey = `kb_demo_${code}`;
  return {
    kind: "demo",
    cacheKey,
    async load() {
      // the seed version rides with the date, so a browser holding an older demo gets the new one
      const today = `${todayIST()}|seed-v4`;
      const cached = await idbGet<Snapshot & { seededFor?: string }>(`${cacheKey}:base`);
      let snap: Snapshot;
      if (cached && cached.seededFor === today) snap = cached;
      else {
        snap = Object.assign(demoSnapshot(code), { seededFor: today });
        await idbSet(`${cacheKey}:base`, snap);
      }
      return { snap, key: DEMO_KEY, actor };
    },
  };
}

export function memberDemoRepo(memberNo: string): Repo {
  const code = memberNo.startsWith("LV") ? "LV" : "LP";
  const inner = demoRepo(code);
  return {
    kind: "demo",
    cacheKey: inner.cacheKey,
    async load() {
      const r = await inner.load();
      const m = r.snap.members.find((x) => x.memberNo === memberNo.toUpperCase());
      return { ...r, actor: { staffId: null, role: "member", memberId: m?.id } };
    },
  };
}

async function j<T>(res: Response): Promise<T> {
  if (res.status === 401 || res.status === 403) throw new Error("locked");
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body as T;
}

export function liveRepo(branchId: string): Repo {
  return {
    kind: "live",
    cacheKey: `kb_live_${branchId}`,
    async load() {
      const r = await j<{ snap: Snapshot; key: string; actor: OpActor }>(await fetch(`/api/b/${branchId}/snapshot`, { cache: "no-store" }));
      return r;
    },
    async send(ops) {
      const r = await j<{ results: { id: string; ok: boolean; muts?: Mutation[]; error?: string; note?: string }[] }>(
        await fetch(`/api/ops`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ branchId, ops }) }),
      );
      return r.results;
    },
  };
}

export function memberLiveRepo(token: string): Repo {
  return {
    kind: "member",
    cacheKey: `kb_m_${token.slice(0, 8)}`,
    async load() {
      return j<{ snap: Snapshot; key: null; actor: OpActor }>(await fetch(`/api/m/${token}`, { cache: "no-store" }));
    },
    async send(ops) {
      const r = await j<{ results: { id: string; ok: boolean; muts?: Mutation[]; error?: string }[] }>(
        await fetch(`/api/m/${token}/op`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ops }) }),
      );
      return r.results;
    },
  };
}
