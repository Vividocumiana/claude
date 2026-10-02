import cv2, numpy as np
from PIL import Image, ImageFilter
W,H=1920,1080
def save(im,name): im.convert('RGB').save('out/'+name,quality=90,optimize=True,progressive=True)
def paste_center(bg,logo,cy=None):
    x=(W-logo.width)//2; y=((H-logo.height)//2) if cy is None else cy-logo.height//2
    bg.alpha_composite(logo,(x,y)); return bg
def fit(logo,maxw,maxh):
    r=min(maxw/logo.width,maxh/logo.height); return logo.resize((round(logo.width*r),round(logo.height*r)),Image.LANCZOS)

# Citroen: same artwork, sensible size
c=Image.open('6abe575079e7eb3f4377531e_12b18e3e-brand-bloc-citroen-complet-x-2-cv.jpeg').convert('RGB').resize((W,H),Image.LANCZOS)
save(c,'cover-citroen.jpg')

# DS: soften the noise so it stays clean when shrunk
d=cv2.imread('6abe16a3200c6657b217f952_de1fef3a-kv-1920x1080.png')
d=cv2.fastNlMeansDenoisingColored(d,None,6,6,7,21)
cv2.imwrite('out/cover-ds.jpg',d,[cv2.IMWRITE_JPEG_QUALITY,90])

# Leapmotor: erase small logo from the background, put a big white one
l=cv2.imread('6abe54a4cc5c90f0a8ff8a98_f192b19d-background-logo.jpeg')
g=cv2.cvtColor(l,cv2.COLOR_BGR2GRAY); m=(g>120).astype(np.uint8)*255
m[:, :500]=0; m[:, 1420:]=0; m[:300]=0; m[800:]=0
m=cv2.dilate(m,np.ones((9,9),np.uint8))
l=cv2.inpaint(l,m,12,cv2.INPAINT_TELEA)
bg=Image.fromarray(cv2.cvtColor(l,cv2.COLOR_BGR2RGB)).convert('RGBA')
lg=Image.open('6abe193ebc37c9508a37245a_66f6bec9-1-2-black-vertical-logo.png').convert('RGBA')
a=lg.split()[3]; white=Image.new('RGBA',lg.size,(255,255,255,0)); white.putalpha(a)
save(paste_center(bg,fit(white,880,600)),'cover-leapmotor.jpg')

# PEUGEOT: textured blue background without the old shield, white outline shield
p=cv2.imread('6abe5a7db4a019df56e910e0_78d0b8db-whatsapp-image-2026-10-01-at-15-04-20.jpeg')
g=cv2.cvtColor(p,cv2.COLOR_BGR2GRAY); hsv=cv2.cvtColor(p,cv2.COLOR_BGR2HSV)
m=((hsv[...,1]<70)&(g>150)).astype(np.uint8)*255
m[:150]=0; m[700:]=0; m[:, :100]=0; m[:, 700:]=0
m=cv2.dilate(m,np.ones((7,7),np.uint8))
p=cv2.inpaint(p,m,10,cv2.INPAINT_TELEA)
pb=Image.fromarray(cv2.cvtColor(p,cv2.COLOR_BGR2RGB))
# 800x900 -> cover 1920x1080
r=max(W/pb.width,H/pb.height); pb=pb.resize((round(pb.width*r),round(pb.height*r)),Image.LANCZOS)
x=(pb.width-W)//2; y=(pb.height-H)//2; bg=pb.crop((x,y,x+W,y+H)).filter(ImageFilter.GaussianBlur(1.2)).convert('RGBA')
src=np.array(Image.open('6abe1adb4b185932bf0febb8_6e2d91e3-peugeot-brand-logo-rvb-wbg.jpeg').convert('L').resize((2044,2104),Image.LANCZOS))
dark=(src<128).astype(np.uint8)
ys,xs=np.where(dark); dark=dark[ys.min():ys.max()+1, xs.min():xs.max()+1]; srcc=src[ys.min():ys.max()+1, xs.min():xs.max()+1]
filled=dark.copy(); cnts,_=cv2.findContours(dark,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); cv2.drawContours(filled,cnts,-1,1,-1)
edge=filled-cv2.erode(filled,np.ones((17,17),np.uint8))
inner=((srcc>=128)&(filled>0)).astype(np.uint8)
alpha=np.clip((edge|inner)*255,0,255).astype(np.uint8)
alpha=cv2.GaussianBlur(alpha,(3,3),0)
sh=Image.new('RGBA',(alpha.shape[1],alpha.shape[0]),(255,255,255,0)); sh.putalpha(Image.fromarray(alpha))
save(paste_center(bg,fit(sh,640,680)),'cover-peugeot.jpg')

# Stellantis Corporate: blue with the full wordmark inside the square safe area
bg=Image.new('RGBA',(W,H),(36,56,130,255))
import subprocess
