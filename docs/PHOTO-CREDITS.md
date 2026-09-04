# Photo credits

`public/products/` now holds two kinds of photo, and the difference matters, so
it is stated plainly rather than buried.

## Real product photography (7 files)

These are real product photographs from the owner's own Shopify catalogs,
committed here with the owner's authorization for this demo:

| File | Brand | Product |
|---|---|---|
| `bluenotes-relaxed-tee.jpg` | Bluenotes | Relaxed Crew Neck Tee |
| `bluenotes-mom-jean.jpg` | Bluenotes | Super High Rise Baggy Mom Jean |
| `bluenotes-sherpa-shacket.jpg` | Bluenotes | Sherpa-Lined Button-Up Shacket |
| `bluenotes-crew-sweatshirt.jpg` | Bluenotes | Crew Neck Oversized Sweatshirt |
| `aero-ribbed-tee.jpg` | Aeropostale | AERO Ribbed Crew Neck Shrunken Tee |
| `aero-wide-leg-cargo-jean.jpg` | Aeropostale | AERO High Rise Wide Leg Cargo Jean |
| `aero-no-show-socks.jpg` | Aeropostale | AERO A87 No-Show Socks 3-Pack |

Fetched from the Shopify CDN at `?width=600` and committed, so the demo renders
offline and deterministically with no hotlinking. Products carrying licensed
third-party characters or team marks were deliberately excluded; these are plain
catalog basics.

**Where they appear, and where they deliberately do not.** They are the
shopper's own wardrobe and purchase history: things Maya already owns, across
several stores. They are never used on the merchant surface. The merchant in
this demo, **Northlight Apparel, is fictional**, and so is its catalog, its
locked offer, its prices and its promo code. That separation is deliberate: the
studio is the surface that makes promotional claims, and no real brand's name is
attached to a synthetic claim anywhere in this project.

## Unsplash (catalog + kids wardrobe)

Downloaded under the [Unsplash License](https://unsplash.com/license) (free to
use, no permission or attribution required; credited here anyway), re-encoded at
`w=640&q=72&fm=jpg&fit=crop`. None of these show a real, recognizable retail
brand logo or wordmark as the subject. They cover the fictional Northlight
catalog and the Kid wardrobe.

**Kids rows (`kids-*.jpg`) are flat-lay / product stills only — no faces.** Marco
required that for the public demo; lifestyle shots of children were removed.

| File | Unsplash photo | License |
|---|---|---|
| `northlight-hoodie.jpg` | https://unsplash.com/photos/photo-1746971054333-8b9610b397a5 | Unsplash License |
| `solstice-graphic-tee.jpg` | https://unsplash.com/photos/cb31e05da1c5 | Unsplash License |
| `harborview-crew-tee.jpg` | https://unsplash.com/photos/df123a1eb820 | Unsplash License |
| `east-side-straight-jean.jpg` | https://unsplash.com/photos/ddaf8b606da7 | Unsplash License |
| `tidewater-shell-jacket.jpg` | https://unsplash.com/photos/74786c5f1279 | Unsplash License |
| `amble-court-sneaker.jpg` | https://unsplash.com/photos/975ec94e6a86 | Unsplash License |
| `fieldhouse-cap.jpg` | https://unsplash.com/photos/1a3ee398de2a | Unsplash License |
| `camden-chino.jpg` | https://unsplash.com/photos/910e30c5666a | Unsplash License |
| `black-tee.jpg` | https://unsplash.com/photos/c5c6f4c7d575 | Unsplash License |
| `white-sneaker.jpg` | https://unsplash.com/photos/1c920cd92f19 | Unsplash License |
| `kids-hoodie.jpg` | https://unsplash.com/photos/photo-1620799140188-3b2a02fd9a77 | Unsplash License |
| `kids-tee.jpg` | https://unsplash.com/photos/photo-1467043237213-65f2da53396f | Unsplash License |
| `kids-denim.jpg` | https://unsplash.com/photos/photo-1617178388553-a9d022974a5c | Unsplash License |
| `kids-sneakers.jpg` | https://unsplash.com/photos/photo-1544441893-675973e31985 | Unsplash License |
| `kids-jacket.jpg` | https://unsplash.com/photos/photo-1551028719-00167b16eac5 | Unsplash License |
| `kids-cap.jpg` | https://unsplash.com/photos/photo-1556905055-8f358a7a47b2 | Unsplash License |
| `kids-crew.jpg` | https://unsplash.com/photos/photo-1632469188022-b5db09a70fbc | Unsplash License |
| `kids-chino.jpg` | https://unsplash.com/photos/photo-1516762689617-e1cffcef479d | Unsplash License |

A unit test asserts that every image path the seed wardrobe or the catalog
references resolves to a file in `public/`, so a credited file cannot silently
go missing and an uncredited one cannot silently appear.
