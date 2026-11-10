import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// IM Fell English (Google Fonts, OFL). The file is the one @remotion/google-fonts
// downloads, kept in public/fonts because the render browser in the cloud
// machine cannot reach Google directly.
export const fellFamily = "IM Fell English";

loadFont({
  family: fellFamily,
  url: staticFile("fonts/IMFellEnglish-Regular.woff2"),
  weight: "400",
  style: "normal",
});
