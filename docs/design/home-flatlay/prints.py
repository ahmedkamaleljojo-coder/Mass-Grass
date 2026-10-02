from PIL import Image, ImageDraw, ImageFilter
import numpy as np
from painted import painted, noise
R='/home/user/Mass-Grass/'
paper=Image.open('a/paper.jpg').convert('RGB')
def sheet_tex(w,h,tone=(250,247,240)):
    t=paper.resize((max(w,paper.width),max(h,paper.height))).crop((0,0,w,h))
    a=np.asarray(t).astype(float); a=a-a.mean((0,1))+np.array(tone)
    return np.clip(a,0,255)
def deckle(src,out,width=1000,pad=.075,crop=None):
    painted(src,'_tmp.webp',crop=crop,width=width,margin=.025)
    art=Image.open('_tmp.webp')
    p=int(width*pad); W,H=art.width+2*p,art.height+2*int(p*1.05)
    base=sheet_tex(W,H)
    y,x=np.mgrid[0:H,0:W]; d=np.minimum.reduce([x,W-1-x,y,H-1-y]).astype(float)
    n=noise(W,H,18)
    a=np.clip((d-(2+6*n))/1.5,0,1)
    im=Image.fromarray(np.dstack([base,a*255]).astype('uint8'),'RGBA')
    # multiply the painting onto the sheet
    sh=np.asarray(im).astype(float); ar=np.asarray(art).astype(float)
    ox,oy=p,int(p*1.05); al=ar[...,3:]/255
    reg=sh[oy:oy+art.height,ox:ox+art.width,:3]
    sh[oy:oy+art.height,ox:ox+art.width,:3]=reg*(1-al)+reg*ar[...,:3]/255*al
    Image.fromarray(sh.astype('uint8'),'RGBA').save(out,quality=90)
def stamp(src,out,width=420):
    im=Image.open(src).convert('RGB')
    m=int(width*.075); W=width; H=int(width*1.2)
    base=Image.fromarray(sheet_tex(W,H,(251,249,244)).astype('uint8'))
    from PIL import ImageOps
    art=ImageOps.fit(im,(W-2*m,H-2*m),Image.LANCZOS,centering=(.62,.5)); base.paste(art,(m,m))
    mask=Image.new('L',(W,H),255); d=ImageDraw.Draw(mask); r=width*.018; step=r*3
    for xx in np.arange(step/2,W,step): d.ellipse((xx-r,-r,xx+r,r),0); d.ellipse((xx-r,H-r,xx+r,H+r),0)
    for yy in np.arange(step/2,H,step): d.ellipse((-r,yy-r,r,yy+r),0); d.ellipse((W-r,yy-r,W+r,yy+r),0)
    base.putalpha(mask); base.save(out,quality=90)
deckle(R+'assets/uploads/F.N.01 Post Card4.webp','a/print-boat.webp',crop=(75,45,1700,1196))
deckle(R+'assets/products/postcards/quds.webp','a/print-quds.webp',width=700)
for f in ['jaffa','nablus','gaza']: stamp(R+f'assets/products/postcards/{f}.webp',f'a/stamp-{f}.webp')
