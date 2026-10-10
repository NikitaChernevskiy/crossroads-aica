import { Audio } from "@remotion/media";
import { AbsoluteFill, Series, staticFile, useVideoConfig } from "remotion";
import { Captions } from "./components/Captions";
import media from "./data/media.json";
import config from "./data/config.json";
import S from "./data/timeline.json";
import { Close } from "./scenes/Close";
import { Demo } from "./scenes/Demo";
import { Different } from "./scenes/Different";
import { Market } from "./scenes/Market";
import { Opening } from "./scenes/Opening";
import { Product } from "./scenes/Product";
import { Revenue } from "./scenes/Revenue";
import { TeamSlide, teamSlideDefaults } from "./TeamSlide";
import { Voiceover } from "./components/Voiceover";
import { colors } from "./theme";

// Shown until every required input exists (same conditions as scripts/check.mjs).
const isDraft =
  !media.demoFocused || !media.demoTense || !config.lovableContribution || Object.keys(media.voiceover).length < Object.keys(S).length;

export const totalSeconds = Object.values(S).reduce((a, b) => a + b, 0);

export const Pitch: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <Series>
        <Series.Sequence name="0:00 Opening" durationInFrames={S.opening * fps} premountFor={fps}>
          <Opening />
        </Series.Sequence>
        <Series.Sequence name="0:12 Product & buyer" durationInFrames={S.product * fps} premountFor={fps}>
          <Product />
        </Series.Sequence>
        <Series.Sequence name="0:25 Demo" durationInFrames={S.demo * fps} premountFor={fps}>
          <Demo />
        </Series.Sequence>
        <Series.Sequence name="0:52 Market" durationInFrames={S.market * fps} premountFor={fps}>
          <Market />
        </Series.Sequence>
        <Series.Sequence name="1:06 Revenue & GTM" durationInFrames={S.revenue * fps} premountFor={fps}>
          <Revenue />
        </Series.Sequence>
        <Series.Sequence name="1:21 Differentiation" durationInFrames={S.different * fps} premountFor={fps}>
          <Different />
        </Series.Sequence>
        <Series.Sequence name="1:35 Team" durationInFrames={S.team * fps} premountFor={fps}>
          <TeamSlide {...teamSlideDefaults} />
          <Voiceover id="team" />
        </Series.Sequence>
        <Series.Sequence name="1:45 Close" durationInFrames={S.close * fps} premountFor={fps}>
          <Close />
        </Series.Sequence>
      </Series>
      <Captions />
      {isDraft ? (
        <div
          style={{
            position: "absolute",
            top: 24,
            right: 28,
            padding: "6px 16px",
            borderRadius: 8,
            border: "2px solid #FF6B6B",
            color: "#FF6B6B",
            fontFamily: "Inter",
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: 3,
            background: "rgba(7,11,26,0.7)",
          }}
        >
          DRAFT
        </div>
      ) : null}
      {media.music ? <Audio name="Music" src={staticFile("music.wav")} loop volume={0.07} premountFor={fps} /> : null}
    </AbsoluteFill>
  );
};
