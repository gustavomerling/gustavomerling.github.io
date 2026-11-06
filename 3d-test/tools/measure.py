import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
crop = sys.argv[2] if len(sys.argv) > 2 else None
if crop:
    x0,y0,x1,y1 = map(int, crop.split(','))
    im = im.crop((x0,y0,x1,y1))
W,H = im.size
px = im.load()
# subject mask: pixels clearly differing from the near-white/very light-green backdrop
def luma(p): return 0.299*p[0]+0.587*p[1]+0.114*p[2]
xs=[];ys=[]
mask_cols=[0]*W; mask_rows=[0]*H
for y in range(0,H,2):
    for x in range(0,W,2):
        p=px[x,y]; l=luma(p)
        sat=max(p)-min(p)
        if l<200 or sat>60:
            mask_cols[x]+=1; mask_rows[y]+=1
cols=[x for x in range(W) if mask_cols[x]>2]; rows=[y for y in range(H) if mask_rows[y]>2]
bx0,bx1,by0,by1=min(cols),max(cols),min(rows),max(rows)
dark=tot=0
for y in range(by0,by1,2):
    for x in range(bx0,bx1,2):
        tot+=1
        if luma(px[x,y])<80: dark+=1
L=bx1-bx0
print(f"size {W}x{H} bbox x {bx0}-{bx1} y {by0}-{by1}  len {L} height {by1-by0}  h/len {(by1-by0)/L:.2f}  dark {dark/tot:.3f}")
