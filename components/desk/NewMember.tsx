"use client";
// New member in under a minute: phone first (an existing member shows at once),
// then the name, then Space takes the photo, then the renewal side opens.
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cleanPhone, uid } from "@/lib/core/money";
import type { Snapshot } from "@/lib/core/types";
import { useGym } from "@/components/shell/Gym";

export function NewMember({ snap, onDone, onExisting, onCancel }: { snap: Snapshot; onDone: (id: string) => void; onExisting: (id: string) => void; onCancel: () => void }) {
  const { store } = useGym();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(true);
  const [photo, setPhoto] = useState<string | null>(null);
  const [cam, setCam] = useState<MediaStream | null>(null);
  const [err, setErr] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const clean = cleanPhone(phone);
  const existing = clean ? snap.members.find((m) => m.phone === clean && !m.archivedAt) : undefined;

  useEffect(() => () => cam?.getTracks().forEach((t) => t.stop()), [cam]);

  const startCam = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 384, facingMode: "user" } });
      setCam(s);
      setTimeout(() => {
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play();
        }
      }, 30);
    } catch {
      setErr("No camera here. You can add a photo later from the member card.");
    }
  };

  const snapPhoto = () => {
    const v = video.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = 120;
    c.height = 144;
    const g = c.getContext("2d")!;
    const r = Math.max(120 / v.videoWidth, 144 / v.videoHeight);
    g.drawImage(v, (120 - v.videoWidth * r) / 2, (144 - v.videoHeight * r) / 2, v.videoWidth * r, v.videoHeight * r);
    setPhoto(c.toDataURL("image/jpeg", 0.7));
    cam?.getTracks().forEach((t) => t.stop());
    setCam(null);
  };

  const save = () => {
    if (existing) return onExisting(existing.id);
    const id = uid();
    const r = store.run("member.add", { id, name, phone, photo, consent, source: "walk-in" });
    if (!r.ok) return setErr(r.error ?? "Not saved");
    onDone(id);
  };

  return (
    <motion.div className="fixed inset-0 z-[70] grid place-items-center bg-black/55 p-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onKeyDown={(e) => e.key === "Escape" && onCancel()}>
      <motion.form
        role="dialog"
        aria-modal="true"
        aria-label="New member"
        className="ledger w-full max-w-[560px] py-4 pl-[72px] pr-5"
        initial={{ y: 30 }}
        animate={{ y: 0 }}
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        onKeyDown={(e) => {
          if (e.key === " " && (cam || (e.target as HTMLElement).id === "nm-photo")) {
            e.preventDefault();
            if (cam) snapPhoto();
            else void startCam();
          }
        }}
      >
        <h2 className="t-stencil text-[30px]" style={{ color: "var(--ink)" }}>
          New member
        </h2>
        <label className="mt-2 block">
          <span className="t-teko text-[16px]" style={{ color: "var(--carbon)" }}>
            1 · Phone
          </span>
          <input autoFocus inputMode="tel" className="field" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="90000 01234" onKeyDown={(e) => e.key === "Enter" && clean && !existing && (e.preventDefault(), nameRef.current?.focus())} />
        </label>
        {phone.replace(/\D/g, "").length >= 10 && !clean && <p className="t-hand text-[15px]" style={{ color: "var(--margin-red)" }}>10 digits starting with 6, 7, 8 or 9</p>}
        {existing && (
          <p className="t-hand mt-1 text-[16px]" style={{ color: "var(--margin-red)" }}>
            Already a member: {existing.memberNo} {existing.name}. Enter opens their card.
          </p>
        )}
        {!existing && (
          <>
            <label className="mt-3 block">
              <span className="t-teko text-[16px]" style={{ color: "var(--carbon)" }}>
                2 · Name
              </span>
              <input ref={nameRef} className="field !font-[family-name:var(--font-sans)]" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <div className="mt-3 flex items-start gap-4">
              <div>
                <span className="t-teko text-[16px]" style={{ color: "var(--carbon)" }}>
                  3 · Photo
                </span>
                <div className="mt-1 grid h-[144px] w-[120px] place-items-center overflow-hidden" style={{ background: "#d9d4c6", border: "1px solid var(--ledger-rule)" }}>
                  {cam ? <video ref={video} muted playsInline className="h-full w-full object-cover" /> : photo ? <img src={photo} alt="New member" className="h-full w-full object-cover" style={{ filter: "grayscale(1) contrast(1.4)" }} /> : <span className="t-hand text-[14px]" style={{ color: "var(--muted-on-paper)" }}>no photo</span>}
                </div>
                <button id="nm-photo" type="button" className="btn-ink mt-1" onClick={() => (cam ? snapPhoto() : void startCam())}>
                  {cam ? "Take it (Space)" : "Webcam (Space)"}
                </button>
              </div>
              <label className="mt-6 flex items-start gap-2 text-[14px]" style={{ color: "var(--text-on-paper)" }}>
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-5" />
                <span>Member agrees to WhatsApp reminders and receipts. The time is recorded.</span>
              </label>
            </div>
          </>
        )}
        {err && <p className="t-hand mt-2 text-[15px]" style={{ color: "var(--margin-red)" }}>{err}</p>}
        <div className="mt-4 flex gap-2">
          <button type="submit" className="btn-brass">
            {existing ? "Open their card" : "Save, then renew"}
          </button>
          <button type="button" className="btn-ink" onClick={onCancel}>
            Esc
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
