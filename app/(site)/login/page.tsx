import { Suspense } from "react";
import { AccountFrame } from "@/components/site/AccountFrame";
import { SiteFrame } from "@/components/site/Frame";
import { Login } from "@/components/shell/Account";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <SiteFrame>
      <AccountFrame>
        <Suspense>
          <Login />
        </Suspense>
      </AccountFrame>
    </SiteFrame>
  );
}
