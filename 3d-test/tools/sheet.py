import sys, os
from PIL import Image
r = sys.argv[1]
base = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
out = os.path.join(base, 'cutaway-out')
vs = [Image.open(os.path.join(out, f'kaiju-{r}-v{v}.png')).convert('RGB').resize((800, 450)) for v in range(4)]
sheet = Image.new('RGB', (1604, 904), (60, 60, 60))
for i, im in enumerate(vs): sheet.paste(im, ((i % 2) * 804, (i // 2) * 454))
sheet.save(os.path.join(out, f'kaiju-{r}-views.png'))
ref = Image.open(os.path.join(base, 'ref-kaiju.jpg')).convert('RGB')
ref = ref.resize((1600, int(1600 * ref.height / ref.width)))
ref = ref.crop((0, (ref.height - 900) // 2, 1600, (ref.height - 900) // 2 + 900)) if ref.height > 900 else ref
st = Image.open(os.path.join(out, f'kaiju-{r}-v0.png')).convert('RGB')
stack = Image.new('RGB', (3204, 900), (60, 60, 60))
stack.paste(ref, (0, 0)); stack.paste(st, (1604, 0))
stack.save(os.path.join(out, f'kaiju-{r}-stack.png'))
stack.resize((900, int(900 * 900 / 3204))).save(os.path.join(out, f'kaiju-{r}-stack900.png'))
