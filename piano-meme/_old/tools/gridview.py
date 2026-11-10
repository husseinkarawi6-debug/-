"""Preview helper: draw a labelled coordinate grid over an image (optionally a crop, optionally zoomed)
so polygon / pivot coordinates for the rig can be read by eye.
usage: python3 gridview.py in.png out.png [x0 y0 x1 y1] [zoom] [step]"""
import sys
from PIL import Image, ImageDraw, ImageFont
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGBA")
box = (0, 0, im.width, im.height)
if len(sys.argv) >= 7:
    box = tuple(int(v) for v in sys.argv[3:7])
zoom = float(sys.argv[7]) if len(sys.argv) >= 8 else 1.0
step = int(sys.argv[8]) if len(sys.argv) >= 9 else 50
bg = Image.new("RGBA", im.size, (90, 90, 100, 255)); bg.alpha_composite(im)
c = bg.crop(box).resize((int((box[2]-box[0])*zoom), int((box[3]-box[1])*zoom)), Image.LANCZOS)
d = ImageDraw.Draw(c)
try: f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13)
except Exception: f = ImageFont.load_default()
x = (box[0]//step)*step
while x <= box[2]:
    if x >= box[0]:
        X = (x-box[0])*zoom; d.line([(X,0),(X,c.height)], fill=(255,255,0,110) if x%(step*2)==0 else (255,255,255,60), width=1)
        d.text((X+2,2), str(x), fill=(255,255,0,255), font=f)
    x += step
y = (box[1]//step)*step
while y <= box[3]:
    if y >= box[1]:
        Y = (y-box[1])*zoom; d.line([(0,Y),(c.width,Y)], fill=(255,255,0,110) if y%(step*2)==0 else (255,255,255,60), width=1)
        d.text((2,Y+2), str(y), fill=(0,255,255,255), font=f)
    y += step
c.convert("RGB").save(out)
