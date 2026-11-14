"use client";
import { memberLiveRepo } from "@/lib/client/store";
import { MemberCard } from "@/components/member/MemberCard";
import { GymProvider } from "./Gym";

export function MemberRoot({ token }: { token: string }) {
  return (
    <GymProvider mode="live" base="" repo={() => memberLiveRepo(token)}>
      <MemberCard token={token} />
    </GymProvider>
  );
}
