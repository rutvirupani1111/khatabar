"use client";
import { useEffect } from "react";
import { bootFx } from "@/lib/client/fx";

export function FxBoot() {
  useEffect(() => {
    bootFx();
  }, []);
  return null;
}
