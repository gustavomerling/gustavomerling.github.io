# usage: still.sh <round> -> renders views 0..3 and builds cutaway-out/kaiju-<round>-views.png and -stack.png
set -e
cd "$(dirname "$0")/.."
node cutaway/sims/build.mjs kaiju-still >/dev/null
for v in 0 1 2 3; do node cutaway/sims/capture.mjs kaiju-still --size 1600x900 --dpr 1 --still $v.5 --out cutaway-out/kaiju-$1-v$v.png | grep -v gpu; done
python -I tools/sheet.py "$1"
