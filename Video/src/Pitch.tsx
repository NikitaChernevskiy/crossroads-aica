import { Audio } from "@remotion/media";
import { AbsoluteFill, interpolate, Series, staticFile, useVideoConfig } from "remotion";
import { Captions } from "./components/Captions";
import media from "./data/media.json";
import config from "./data/config.json";
import S from "./data/timeline.json";
import { Architecture } from "./scenes/Architecture";
import { Built } from "./scenes/Built";
import { Business } from "./scenes/Business";
import { Close } from "./scenes/Close";
import { Demo } from "./scenes/Demo";
import { EuAiAct } from "./scenes/EuAiAct";
import { Opening } from "./scenes/Opening";
import { Product } from "./scenes/Product";
import { Title } from "./scenes/Title";
import { TeamSlide, teamSlideDefaults } from "./TeamSlide";
import { Voiceover } from "./components/Voiceover";
import { colors } from "./theme";

// Shown until every required input exists (same conditions as scripts/check.mjs).
const isDraft =
  !media.demoFocused || !media.demoTense || !config.lovableContribution || Object.keys(media.voiceover).length < media.voiceoverExpected;

const musicVolume = (f: number, fps: number) =>
  interpolate(
    f / fps,
    [0, 0.5, S.title - 0.5, S.title + 0.5, totalSeconds - 3, totalSeconds],
    [0, 0.5, 0.5, 0.14, 0.14, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

export const totalSeconds = Object.values(S).reduce((a, b) => a + b, 0);

export const Pitch: React.FC = () => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bg }}>
      <Series>
        <Series.Sequence name="0:00 Title" durationInFrames={S.title * fps} premountFor={fps}>
          <Title />
        </Series.Sequence>
        <Series.Sequence name="0:04 Opening" durationInFrames={S.opening * fps} premountFor={fps}>
          <Opening />
        </Series.Sequence>
        <Series.Sequence name="0:16 Product" durationInFrames={S.product * fps} premountFor={fps}>
          <Product />
        </Series.Sequence>
        <Series.Sequence name="0:27 Demo" durationInFrames={S.demo * fps} premountFor={fps}>
          <Demo />
        </Series.Sequence>
        <Series.Sequence name="0:49 Architecture" durationInFrames={S.architecture * fps} premountFor={fps}>
          <Architecture />
        </Series.Sequence>
        <Series.Sequence name="1:01 How we built it" durationInFrames={S.built * fps} premountFor={fps}>
          <Built />
        </Series.Sequence>
        <Series.Sequence name="1:10 EU AI Act" durationInFrames={S.euact * fps} premountFor={fps}>
          <EuAiAct />
        </Series.Sequence>
        <Series.Sequence name="1:20 Business" durationInFrames={S.business * fps} premountFor={fps}>
          <Business />
        </Series.Sequence>
        <Series.Sequence name="1:33 Team" durationInFrames={S.team * fps} premountFor={fps}>
          <TeamSlide {...teamSlideDefaults} />
          <Voiceover id="team" />
        </Series.Sequence>
        <Series.Sequence name="1:42 Ask & close" durationInFrames={S.close * fps} premountFor={fps}>
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
      {media.music ? <Audio name="Music" src={staticFile("music.wav")} loop volume={(f) => musicVolume(f, fps)} premountFor={fps} /> : null}
    </AbsoluteFill>
  );
};
