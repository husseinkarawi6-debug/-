# موشن كرافيك «خيالُ الظلّ: وقفةُ الحُرّ»

- `index.html`: يرسم كل إطار في الفيلم: 21 مشهداً بأسلوب خيال الظل، ونص القصيدة، والمؤثرات. الدالة `render(t)` ترسم الإطار عند الثانية `t`.
- `render.js`: يحوّل الصفحة إلى فيديو باستخدام Playwright وffmpeg.
  - معاينة لقطات محددة: `node render.js preview 1.5,10.9,23.1`
  - الفيديو كاملاً بدون صوت: `node render.js full raw.mp4`
- بعدها: أضف الحبيبات والتظليل، وضع صوت القصيدة الأصلي:
  `ffmpeg -i raw.mp4 -i audio.m4a -filter_complex "[0:v]noise=alls=4:allf=t,vignette=PI/5.5,format=yuv420p[v]" -map "[v]" -map 1:a -c:v libx264 -crf 22 -c:a aac -b:a 256k -t 29.57 out.mp4`
- الخطوط: Amiri (رخصة SIL OFL) من حزمة @fontsource.
