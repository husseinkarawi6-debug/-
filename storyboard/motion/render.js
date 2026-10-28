// Usage: node render.js preview 0.5,1.5,...   -> preview/tXX.jpg
//        node render.js full out.mp4           -> silent 24 fps video
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

(async () => {
  const [mode, arg] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.evaluate(() => window.ready);
  const canvas = await page.$('canvas');
  if (mode === 'preview') {
    fs.mkdirSync(path.join(__dirname, 'preview'), { recursive: true });
    for (const t of arg.split(',').map(Number)) {
      await page.evaluate(t => window.render(t), t);
      await canvas.screenshot({ path: path.join(__dirname, 'preview', `t${t.toFixed(2)}.jpg`), type: 'jpeg', quality: 85 });
    }
  } else {
    const fps = 24, n = Math.ceil(29.57 * fps);
    const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', arg], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let f = 0; f < n; f++) {
      const t = f / fps;
      await page.evaluate(t => window.render(t), t);
      const buf = await canvas.screenshot({ type: 'jpeg', quality: 95 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 48 === 0) process.stdout.write(`frame ${f}/${n}\n`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
  }
  if (errors.length) console.log('PAGE ERRORS:\n' + [...new Set(errors)].join('\n'));
  await browser.close();
})();
