import { Composition, Folder } from "remotion";
import S from "./data/timeline.json";
import { Pitch, totalSeconds } from "./Pitch";
import { Architecture } from "./scenes/Architecture";
import { Close } from "./scenes/Close";
import { Demo } from "./scenes/Demo";
import { Different } from "./scenes/Different";
import { Market } from "./scenes/Market";
import { Opening } from "./scenes/Opening";
import { Product } from "./scenes/Product";
import { Revenue } from "./scenes/Revenue";
import { TeamSlide, TeamSlideVertical } from "./TeamSlide";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="Pitch" component={Pitch} durationInFrames={totalSeconds * 30} fps={30} width={1920} height={1080} />
      <Folder name="Scenes">
        <Composition id="Opening" component={Opening} durationInFrames={S.opening * 30} fps={30} width={1920} height={1080} />
        <Composition id="Product" component={Product} durationInFrames={S.product * 30} fps={30} width={1920} height={1080} />
        <Composition id="Demo" component={Demo} durationInFrames={S.demo * 30} fps={30} width={1920} height={1080} />
        <Composition id="Architecture" component={Architecture} durationInFrames={S.architecture * 30} fps={30} width={1920} height={1080} />
        <Composition id="Market" component={Market} durationInFrames={S.market * 30} fps={30} width={1920} height={1080} />
        <Composition id="Revenue" component={Revenue} durationInFrames={S.revenue * 30} fps={30} width={1920} height={1080} />
        <Composition id="Different" component={Different} durationInFrames={S.different * 30} fps={30} width={1920} height={1080} />
        <Composition id="Close" component={Close} durationInFrames={S.close * 30} fps={30} width={1920} height={1080} />
      </Folder>
      <Folder name="Team">
        <Composition
          id="TeamSlide"
          component={TeamSlide}
          durationInFrames={300}
          fps={30}
          width={1920}
          height={1080}
          defaultProps={{ background: "#070B1A", cardBackground: "rgba(255,255,255,0.05)", text: "#F4F6FF", muted: "#9AA3C7", accent: "#4FD1C5", fontFamily: "Inter", sfx: true }}
        />
        <Composition
          id="TeamSlideVertical"
          component={TeamSlideVertical}
          durationInFrames={300}
          fps={30}
          width={1080}
          height={1920}
          defaultProps={{ background: "#070B1A", cardBackground: "rgba(255,255,255,0.05)", text: "#F4F6FF", muted: "#9AA3C7", accent: "#4FD1C5", fontFamily: "Inter", sfx: true }}
        />
      </Folder>
    </>
  );
};
