"use client";
// Add a new member in under a minute: phone first (an existing member shows at once), then the name,
// an optional photo, then the renewal opens for them.
import { useEffect, useRef, useState } from "react";
import { cleanPhone, uid } from "@/lib/core/money";
import type { Snapshot } from "@/lib/core/types";
import { useGym } from "@/components/shell/Gym";
import { Sheet } from "@/components/shell/Overlays";
import { Icon } from "@/components/ui/Icon";

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
      setErr("No camera here. You can add a photo later.");
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
    <Sheet title="New member" sentence="Phone number first. If they are already a member, we show their card." onClose={onCancel}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label>
          <span className="label">Phone number</span>
          <input autoFocus inputMode="tel" className="input t-mono mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="90000 01234" onKeyDown={(e) => e.key === "Enter" && clean && !existing && (e.preventDefault(), nameRef.current?.focus())} />
        </label>
        {phone.replace(/\D/g, "").length >= 10 && !clean && <p className="text-[14px] font-semibold text-[#9b0f3f]">The phone must be 10 digits starting with 6, 7, 8 or 9.</p>}
        {existing && (
          <p className="rounded-lg bg-[var(--marigold-pale)] p-2 text-[15px] font-semibold">
            Already a member: {existing.name} ({existing.memberNo}).
          </p>
        )}
        {!existing && (
          <>
            <label>
              <span className="label">Name</span>
              <input ref={nameRef} className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <div className="flex flex-wrap items-start gap-4">
              <div>
                <span className="label">Photo (optional)</span>
                <div className="mt-1 grid h-[144px] w-[120px] place-items-center overflow-hidden rounded-xl border-2 border-[var(--ink)] bg-[var(--paper)]">
                  {cam ? (
                    <video ref={video} muted playsInline className="h-full w-full object-cover" />
                  ) : photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt="New member" className="h-full w-full object-cover" />
                  ) : (
                    <Icon name="camera" size={28} />
                  )}
                </div>
                <button type="button" className="btn btn-sm mt-2" onClick={() => (cam ? snapPhoto() : void startCam())}>
                  {cam ? "Take the photo" : "Use the webcam"}
                </button>
              </div>
              <label className="mt-6 flex max-w-[260px] items-start gap-2 text-[14px]">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 size-5" />
                <span>They agree to WhatsApp reminders and receipts. The time is recorded.</span>
              </label>
            </div>
          </>
        )}
        {err && (
          <p role="alert" className="text-[14px] font-semibold text-[#9b0f3f]">
            {err}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn btn-primary btn-lg">
            {existing ? "Open their card" : "Save, then renew"}
          </button>
          <button type="button" className="btn btn-lg" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </Sheet>
  );
}
