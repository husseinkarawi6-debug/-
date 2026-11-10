import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";

/** Load a set of images from /public and hold the render until all are decoded. */
export const useImages = (files: string[]): Record<string, HTMLImageElement> | null => {
  const key = files.join("|");
  const [handle] = useState(() => delayRender("rig images " + key.slice(0, 60)));
  const [imgs, setImgs] = useState<Record<string, HTMLImageElement> | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all(
      files.map(
        (f) =>
          new Promise<[string, HTMLImageElement]>((resolve, reject) => {
            const im = new Image();
            im.onload = () => resolve([f, im]);
            im.onerror = () => reject(new Error("could not load " + f));
            im.src = staticFile(f);
          }),
      ),
    ).then((pairs) => {
      if (!alive) return;
      setImgs(Object.fromEntries(pairs));
      continueRender(handle);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return imgs;
};
