import React, { createContext, useContext } from "react";
import { useCurrentFrame } from "remotion";

// Drawings and camera move "on twos": a new drawing every 2 frames (15 per second).
export const twos = (f: number) => Math.floor(f / 2) * 2;

// The global frame (not reset by <Sequence>), so the line boil and grain
// never restart at a cut.
const GlobalFrame = createContext(0);

export const GlobalFrameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  return <GlobalFrame.Provider value={frame}>{children}</GlobalFrame.Provider>;
};

export const useGlobalFrame = () => useContext(GlobalFrame);

// Local frame inside the current <Sequence>, held on twos.
export const useTwos = () => twos(useCurrentFrame());
