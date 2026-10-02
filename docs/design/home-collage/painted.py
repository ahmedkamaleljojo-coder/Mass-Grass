from PIL import Image
import numpy as np
R='/home/user/Mass-Grass/'
rng=np.random.default_rng(7)
def noise(w,h,scale):
    n=np.zeros((h,w))
    for s,amp in [(scale,1),(scale/2.2,.45),(scale/5,.12)]:
        sw,sh=max(2,int(w/s)),max(2,int(h/s))
        n+=amp*np.asarray(Image.fromarray((rng.random((sh,sw))*255).astype('uint8')).resize((w,h),Image.BICUBIC)).astype(float)/255
    return n/1.57
def painted(src,out,crop=None,width=900,margin=.05):
    im=Image.open(src).convert('RGB')
    if crop: im=im.crop(crop)
    im=im.resize((width,int(width*im.height/im.width)),Image.LANCZOS)
    w,h=im.size; y,x=np.mgrid[0:h,0:w]
    d=np.minimum.reduce([x,w-1-x,y,h-1-y]).astype(float)/min(w,h)
    n=noise(w,h,w/5)
    edge=margin*(0.2+1.4*n)
    a=np.clip((d-edge)/0.004,0,1)
    rim=np.clip(1-(d-edge)/0.02,0,1)*(d>edge)*0.28
    px=np.asarray(im).astype(float)
    px=px*(1-rim[...,None])
    # lighter wash a little inside the rim, like pigment pulled to the edge
    lift=np.clip(1-np.abs(d-edge-0.05)/0.04,0,1)*0.08
    px=px+(255-px)*lift[...,None]
    Image.fromarray(np.dstack([np.clip(px,0,255),a*255*0.96]).astype('uint8'),'RGBA').save(out,quality=90)
if __name__=='__main__':
    painted(R+'assets/uploads/F.N.01 Post Card4.webp','a/p-boat.webp',crop=(75,45,1700,1196),width=1000)
    for f in ['jaffa','gaza','haifa','quds']:
        painted(R+f'assets/products/postcards/{f}.webp',f'a/p-{f}.webp',width=700,margin=.05)
    painted(R+'assets/products/calendar/apr.webp','a/p-apr.webp',width=700,margin=.03)
    painted(R+'assets/products/calendar/may.webp','a/p-may.webp',width=600,margin=.04)
