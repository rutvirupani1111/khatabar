import { AccountFrame } from "@/components/site/AccountFrame";
import { SiteFrame } from "@/components/site/Frame";
import { Start } from "@/components/shell/Account";

export const metadata = { title: "Start for my gym" };

export default function StartPage() {
  return (
    <SiteFrame>
      <AccountFrame
        aside={
          <div className="panel-flat p-4">
            <h2 className="text-[17px] font-bold">What happens next</h2>
            <ol className="mt-2 flex flex-col gap-2 text-[15px]">
              <li>
                <b>1.</b> Import your members from Excel.
              </li>
              <li>
                <b>2.</b> Check your plans and prices.
              </li>
              <li>
                <b>3.</b> Open the front desk.
              </li>
            </ol>
          </div>
        }
      >
        <Start />
      </AccountFrame>
    </SiteFrame>
  );
}
