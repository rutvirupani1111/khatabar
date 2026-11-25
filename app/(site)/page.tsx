import { SiteFrame } from "@/components/site/Frame";
import { StopRail } from "@/components/site/client";
import { Finale } from "@/components/site/scenes/Finale";
import { Scene1Hero } from "@/components/site/scenes/Scene1Hero";
import { Scene2Counter } from "@/components/site/scenes/Scene2Counter";
import { Scene3Fees } from "@/components/site/scenes/Scene3Fees";
import { Scene4Freeze } from "@/components/site/scenes/Scene4Freeze";
import { Scene5Card } from "@/components/site/scenes/Scene5Card";
import { Scene6Report } from "@/components/site/scenes/Scene6Report";
import { Scene7Import } from "@/components/site/scenes/Scene7Import";

// Khatabar Street, 6 am: seven stops and the street fully awake. Every scene is server-rendered
// art and words; each demo is a client island that loads when its scene is one screen away.
export default function Home() {
  return (
    <SiteFrame>
      <Scene1Hero />
      <Scene2Counter />
      <Scene3Fees />
      <Scene4Freeze />
      <Scene5Card />
      <Scene6Report />
      <Scene7Import />
      <Finale />
      <StopRail />
    </SiteFrame>
  );
}
