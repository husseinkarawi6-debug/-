// See all configuration options: https://remotion.dev/docs/config
import { Config } from "@remotion/cli/config";
import fs from "fs";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
// WebGL (for @remotion/three mesh warps) without a GPU
Config.setChromiumOpenGlRenderer("swangle");
Config.setConcurrency(3);

// In the cloud container the browser download host is blocked, so use the
// pre-installed headless shell when it exists. On a normal computer this path
// does not exist and Remotion downloads its own browser as usual.
const preinstalled =
  "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
if (fs.existsSync(preinstalled)) {
  Config.setBrowserExecutable(preinstalled);
}
