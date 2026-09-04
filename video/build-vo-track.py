#!/usr/bin/env python3
"""Lay the eight VO segments onto one 2:50 track at their DEMO-SCRIPT beat starts.

    python3 video/build-vo-track.py [vo-dir] [out.wav]

Drop the output at 00:00 on the edit timeline and the narration is already
positioned; cut the screen capture to meet it. Re-run against video/vo-clone/
after swapping in the ElevenLabs voice clone.
"""
import sys, wave, glob, os

# Beat starts from video/CUE-SHEET.md v5, in seconds. Runtime cap is 3:00.
BEATS = [0, 20, 40, 65, 90, 105, 125, 145]
TOTAL = 170

src = sys.argv[1] if len(sys.argv) > 1 else 'video/vo'
out = sys.argv[2] if len(sys.argv) > 2 else 'video/vo-track.wav'
files = sorted(glob.glob(os.path.join(src, 'vo-0*.wav')))
assert len(files) == len(BEATS), f'{len(files)} segments, {len(BEATS)} beats'

with wave.open(files[0]) as w:
    params = w.getparams()
rate, width = params.framerate, params.sampwidth
track = bytearray(b'\x00' * (TOTAL * rate * width * params.nchannels))

for f, start in zip(files, BEATS):
    with wave.open(f) as w:
        assert (w.getframerate(), w.getsampwidth(), w.getnchannels()) == \
               (rate, width, params.nchannels), f'{f} has a different format'
        pcm = w.readframes(w.getnframes())
    off = start * rate * width * params.nchannels
    end = off + len(pcm)
    # A segment running past its beat would talk over the next one, not just run long.
    assert end <= len(track), f'{os.path.basename(f)} overruns the {TOTAL}s track'
    track[off:end] = pcm
    print(f'{os.path.basename(f):>10}  {start//60}:{start%60:02d}  '
          f'{len(pcm)/(rate*width*params.nchannels):5.2f}s')

with wave.open(out, 'wb') as w:
    w.setparams(params)
    w.writeframes(bytes(track))
print(f'\n{out}  {TOTAL}s ({TOTAL//60}:{TOTAL%60:02d})')

if __name__ == '__main__' and '--check' in sys.argv:
    # Self-check: every segment must end before the next beat starts.
    for i, (f, start) in enumerate(zip(files, BEATS)):
        with wave.open(f) as w:
            dur = w.getnframes() / w.getframerate()
        nxt = BEATS[i + 1] if i + 1 < len(BEATS) else TOTAL
        assert start + dur <= nxt, f'{f} ({dur:.2f}s) runs into the next beat'
    print('check: no segment overruns its beat')
