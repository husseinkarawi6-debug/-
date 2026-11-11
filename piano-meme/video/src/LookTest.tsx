import React from "react";
import { InkProps } from "./config";
import { PianoMeme } from "./PianoMeme";

// Look test = the film itself from frame 0, cut short. Same shots, same cuts,
// and the soundtrack from second 0 of audio.wav (never trimmed, never offset).
export const LOOK_FRAMES = 291; // lines 1–6, frames 0–290
export const LookTest: React.FC<InkProps> = (props) => <PianoMeme {...props} />;
