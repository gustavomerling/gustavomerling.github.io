"""Score for the KAIJU KX-1 film (entry kaiju-film), after the tarantula's: a bed for the whole film (E minor, 92 bpm,
e-piano, bass, soft drums and a pad), a quiet click on every button press, and short accents on the kaiju's moves:
hydraulic air as the crown lifts and a jaw clunk, a gear whirr while the core is open, servo blips down the arm,
ticks as the tail segments slide out, a whoosh into the explode and clicks as it seats, and the film's one riser and
low impact under the roar.

    TL=sims/kaiju-film/timeline.json python run_sfx.py sims/kaiju-shared/score.py
"""

import os

from sfx.score_kit import airy, bed, chords, hz, rumble, thud  # noqa: E402
from sfx.synth import blip, click, envelope, impact, pad, riser, whoosh  # noqa: E402

TIMELINE = os.environ.get("TL", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "kaiju-film", "timeline.json"))
OUT = os.environ.get("OUT", os.path.join(os.environ.get("CUTAWAY_OUT", "cutaway-out"), "kaiju-score.wav"))
TARGET_LUFS = -14.0
SEED = 41

CHORDS = chords("Em9:E3 G3 B3 D4 F#4/E2", "Cmaj7:C3 E3 G3 B3/C2", "Am9:A2 C3 E3 G3 B3/A1", "B7sus:B2 E3 F#3 A3/B1")
MOTIF = [(0.5, hz("B5")), (1.5, hz("G5")), (2.5, hz("F#5"))]


def score(mix, tl):
    dur = tl["duration"]
    left, right, low, drums = bed(dur, 92, CHORDS, MOTIF, motif_voice="blip", kicks=(0, 2.5), snares=(1, 3), hats=8, swing=0.06, keys_vel=0.75, keys_lp=3600)
    mix.put_stereo(0, left, right, 0.13)
    mix.put(0, low, 0.13)
    mix.put(0, drums, 0.05)
    bar = 4 * 60 / 92
    changes = [(0.12 + b * bar, [f for f in CHORDS[b % len(CHORDS)][0][:4]]) for b in range(int(dur / bar) + 1)]
    pl, pr = pad(dur, changes, volume=envelope([(0, 0), (1.0, 1), (dur - 1.6, 1), (dur, 0)]), detune=0.8, tremolo=0.18, xfade=0.5)
    mix.put_stereo(0, pl, pr, 0.07)

    for e in tl["script"]:
        t, act = e["t"], e["act"]
        mix.put(t, click(2400, 0.025), 0.055, pan=0.45)
        if act == "head":
            mix.put(t + 0.3, airy(1.0, 400, 1500, 0.6), 0.026)
            mix.put(t + 1.25, thud(110, 0.08, 0.3), 0.06)
            mix.put(t + 2.65, click(1900, 0.04), 0.06)
            mix.put(t + 2.67, thud(90, 0.06, 0.25), 0.05)
        elif act == "chest":
            mix.put(t + 0.3, airy(0.9, 500, 1800, 0.5), 0.022, pan=-0.1)
            mix.put(t + 0.6, rumble(2.0, lambda x: 70 + 40 * min(1, x / 0.6)), 0.035)
            for i, dt in enumerate((0.9, 1.1, 1.3)):
                mix.put(t + dt, click(3000 - 250 * i, 0.016), 0.028)
            mix.put(t + 2.6, click(2000, 0.03), 0.05)
        elif act == "arm":
            mix.put(t + 0.1, airy(0.5, 600, 1500, 0.5), 0.016, pan=-0.35)
            for i, dt in enumerate((0.45, 0.65, 0.85, 1.05)):
                mix.put(t + dt, blip(hz("E6") * 2 ** (i / 6), 0.18, 0.06), 0.02, pan=-0.35)
            mix.put(t + 2.6, click(2000, 0.03), 0.05, pan=-0.35)
        elif act == "tail":
            for i in range(10):
                mix.put(t + 0.35 + 0.09 * i, click(2600 - 90 * i, 0.016), 0.026, pan=0.3 - 0.06 * i)
            for i in range(6):
                mix.put(t + 2.25 + 0.07 * i, click(1800 + 120 * i, 0.016), 0.024, pan=-0.3 + 0.1 * i)
        elif act == "exploded":
            mix.put(t + 0.15, whoosh(1.3, 300, 2600, peak=0.4), 0.04)
            mix.put(t + 0.25, blip(hz("E6"), 0.3, 0.1), 0.025)
        elif act == "assemble":
            mix.put(t, airy(1.0, 2200, 600, 0.5), 0.02, pan=0.15)
            for i, dt in enumerate((0.6, 0.8, 1.0)):
                mix.put(t + dt, click(2000 + 300 * i, 0.03), 0.05, pan=-0.3 + 0.3 * i)
        elif act == "roar":
            mix.put(t - 1.0, riser(1.1), 0.05)
            mix.put(t + 0.1, impact(1.6), 0.22)
            mix.put(t + 0.15, rumble(2.2, lambda x: 55 + 25 * min(1, x / 0.3) - 15 * max(0, x - 1.2)), 0.07)
