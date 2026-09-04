# Hemloop video cards

HyperFrames composition for the demo video intro and seven rail step cards.

| File | Role |
|---|---|
| `index.html` | Landscape 1920×1080, 10.9 s, 30 fps |
| `variants/portrait.html` | Portrait 1080×1920 (same timeline) |
| `out/cards-landscape.mp4` | Rendered landscape |
| `out/cards-portrait.mp4` | Rendered portrait |
| `BRIEF.md` | Locked brief |

Tokens: paper `#f4f0e6`, ink `#17211c`, lime `#b9f227`. Motion: label rises 12 px; lime dot orbits the ring once per card (finite GSAP, seek-safe).

```bash
npx hyperframes lint
npx hyperframes render --fps 30 --quality high --output out/cards-landscape.mp4
npx hyperframes render --composition variants/portrait.html --fps 30 --quality high --output out/cards-portrait.mp4
```

Cue placement: `../CUE-SHEET.md`.
