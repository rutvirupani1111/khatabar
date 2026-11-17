"use client";
// The landing page is the shutter. Raising it drops you into the demo desk.
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShutterUp } from "@/components/art/Shutter";
import { useFx } from "@/lib/client/fx";
import { lsSet } from "@/lib/client/idb";
import { todayIST } from "@/lib/core/dates";

export function Landing() {
  const router = useRouter();
  const fx = useFx();
  const [show, setShow] = useState(true);
  useEffect(() => {
    router.prefetch("/demo/desk");
  }, [router]);
  if (!show) return null;
  return (
    <ShutterUp
      gym="KHATABAR"
      branch="Gym ka register, counter ki speed par"
      calm={fx === "calm"}
      ctaLabel="Raise shutter"
      hint={<>Enter, Space or the button walks into the demo desk. Scroll or swipe up to read the register page first.</>}
      touchHint={<>Tap Raise shutter for the desk, or swipe up to read the page first.</>}
      onOpen={(via) => {
        setShow(false);
        // a scroll or swipe rolls the shutter up over the register page; a click or key walks into the desk
        if (via === "wheel" || via === "touch") {
          // start at the top of the page, not wherever the raising swipe would have carried it
          requestAnimationFrame(() => window.scrollTo({ top: 0 }));
          return;
        }
        lsSet(`kb_shutter_br-maninagar_${todayIST()}`, "1");
        router.push("/demo/desk");
      }}
    />
  );
}
