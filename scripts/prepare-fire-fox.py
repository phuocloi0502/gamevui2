"""Reproducible processing of ImageGen artwork; user approved code alpha extraction.
Requires Pillow. Originals live in assets/pets/fire-fox/level-1/source, outside web bundle.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import math, json

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'assets/pets/fire-fox/level-1/source'
OUT = ROOT / 'public/assets/pets/fire-fox/level-1'
OUT.mkdir(parents=True, exist_ok=True)

def extract(name):
    im = Image.open(SRC / f'{name}.png').convert('RGBA')
    pixels = []
    for r,g,b,a in im.getdata():
        # Cyan screen is disjoint from this warm palette. Preserve white fur.
        excess = min(g,b)-r
        alpha = round(255 * max(0, min(1, (65-excess)/45)))
        if alpha < 255:
            g = min(g, max(r,b if b < r else r))
            b = min(b, r)
        pixels.append((r,g,b,alpha))
    im.putdata(pixels)
    return im

report = {}
for name, size in [('body',(300,220)),('head',(300,310)),('head-closed',(300,310)),('tail',(220,215)),('leg',(65,115)),('fire',(100,155))]:
    im = extract(name)
    bbox = im.getbbox()
    if name.startswith('head'):
        bbox = extract('head').getbbox()
    im = im.crop(bbox)
    im.thumbnail(size, Image.Resampling.LANCZOS)
    # Padding prevents edge sampling bleed in WebGL.
    padded = Image.new('RGBA', (im.width+8, im.height+8))
    padded.alpha_composite(im,(4,4))
    padded.save(OUT / f'{name}.png')
    report[name] = {'size':padded.size,'alpha':padded.getchannel('A').getextrema()}

shadow=Image.new('RGBA',(320,64))
d=ImageDraw.Draw(shadow); d.ellipse((22,18,298,48),fill=(25,12,20,95))
shadow.filter(ImageFilter.GaussianBlur(9)).save(OUT/'shadow.png')

# Procedural deformation of a painted flame, NOT hand-drawn new frames.
fire=Image.open(OUT/'fire.png')
sheet=Image.new('RGBA',(128*8,192))
for i in range(8):
    frame=Image.new('RGBA',(128,192))
    phase=i*math.tau/8
    for y in range(fire.height):
        strength=1-y/fire.height
        dx=round(math.sin(phase+y*.035)*7*strength)
        row=fire.crop((0,y,fire.width,y+1))
        frame.alpha_composite(row,((128-fire.width)//2+dx,192-fire.height+y-5))
    sheet.alpha_composite(frame,(128*i,0))
sheet.save(OUT/'fire-loop.png')
(OUT/'processing-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
