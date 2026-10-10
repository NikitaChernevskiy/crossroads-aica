import { Audio } from "@remotion/media";
import { staticFile, useVideoConfig } from "remotion";
import media from "../data/media.json";
import timeline from "../data/timeline.json";

export type SceneId = keyof typeof timeline;

// Narration starts this many seconds into each scene (shared with scripts/sync.mjs).
export const VO_LEAD_IN = 0.3;

// Plays public/voiceover/<id>.mp3 once it has been generated (npm run voiceover).
export const Voiceover: React.FC<{ readonly id: SceneId }> = ({ id }) => {
  const { fps } = useVideoConfig();
  if (!(media.voiceover as Record<string, number>)[id]) {
    return null;
  }

  return (
    <Audio
      name={`Voiceover ${id}`}
      src={staticFile(`voiceover/${id}.mp3`)}
      from={Math.round(VO_LEAD_IN * fps)}
      premountFor={fps}
    />
  );
};
