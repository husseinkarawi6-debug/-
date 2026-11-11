import React from "react";
import { AbsoluteFill, Sequence, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { InkProps } from "./config";
import { Caption } from "./ink/Caption";
import { GlobalFrameProvider } from "./ink/frame";
import { HandDrawn } from "./ink/HandDrawn";
import { analysis, captions, shots } from "./timeline";
import { ShotView } from "./shots/ShotView";

/** The whole film: 23 shots with hard cuts, captions on top, one soundtrack. */
export const PianoMeme: React.FC<InkProps> = ({ boil, grain, withAudio }) => {
  return (
    <GlobalFrameProvider>
      <AbsoluteFill>
        <HandDrawn boil={boil} grain={grain}>
          {shots.map((s) => (
            <Sequence key={s.shot} from={s.start} durationInFrames={s.end - s.start + 1} name={`Shot ${s.shot}`}>
              <ShotView shot={s} />
            </Sequence>
          ))}
          {captions.map((c) => (
            <Sequence key={`${c.start}-${c.text}`} from={c.start} durationInFrames={c.end - c.start + 1} name={`Caption: ${c.text.slice(0, 20)}`}>
              <Caption text={c.text} lang={c.lang} from={0} anchor={c.text.split("\n").length > 2 ? "block" : "top"} align={c.start >= 858 ? "right" : "center"} />
            </Sequence>
          ))}
        </HandDrawn>
        {withAudio && analysis.audioPresent ? <Audio src={staticFile("audio/meme.wav")} /> : null}
      </AbsoluteFill>
    </GlobalFrameProvider>
  );
};
