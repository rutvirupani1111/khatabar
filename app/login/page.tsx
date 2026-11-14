import { Suspense } from "react";
import { Login } from "@/components/shell/Account";

export const metadata = { title: "Owner sign in" };

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  );
}
