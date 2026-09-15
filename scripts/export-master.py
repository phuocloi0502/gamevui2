from pathlib import Path
from PIL import Image, ImageChops
import json
root=Path(__file__).resolve().parents[1]
pet=json.loads((root/'assets/pets/fire-fox/level-1/asset.json').read_text())
canvas=Image.new('RGBA',(600,600)); positions={}
for layer in sorted(pet['layers'],key=lambda l:l['z']):
    if layer.get('blink') == 'closed':
        continue
    px,py,ps=positions.get(layer.get('parent'),(300,510,1))
    x,y,s=px+layer['x']*ps,py+layer['y']*ps,ps*layer.get('scale',1)
    positions[layer['id']]=(x,y,s)
    im=Image.open(root/'public'/layer['src'].lstrip('/')).convert('RGBA')
    if 'sheet' in layer: im=im.crop((0,0,layer['sheet']['width'],layer['sheet']['height']))
    if 'tint' in layer:
        tint=layer['tint']; a=im.getchannel('A'); im=ImageChops.multiply(im,Image.new('RGBA',im.size,((tint>>16)&255,(tint>>8)&255,tint&255,255))); im.putalpha(a)
    im=im.resize((round(im.width*s),round(im.height*s)),Image.Resampling.LANCZOS)
    canvas.alpha_composite(im,(round(x-im.width*layer['originX']),round(y-im.height*layer['originY'])))
canvas.save(root/'public/assets/pets/fire-fox/level-1/master.png')
print('Exported master.png, 600×600 RGBA')
