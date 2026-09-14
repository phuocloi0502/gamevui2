# Wind Fox

- **PET_ID:** wind-fox
- **PET_NAME:** Wind Fox
- **ELEMENT:** wind
- **Rig inheritance:** `pet-base`

This production asset package is designed for the shared **Phaser 3 + PetView** layered pet renderer in the `gamevui2` repository.
Fire Fox is the reference standard for anatomy, proportions, layer contract, anchors and overall production structure.

## File list

```text
wind-fox/
├── README.md
├── asset.json
├── master.png
├── preview.png
├── layers/
│   ├── body.png
│   ├── head.png
│   ├── head-closed.png
│   ├── tail.png
│   ├── leg.png
│   └── shadow.png
├── effects/
│   └── elemental-effect.png
└── source/
    └── source-artwork.png
```

## PNG sizes

- `layers/body.png` — 308×225 px
- `layers/head.png` — 302×318 px
- `layers/head-closed.png` — 302×318 px
- `layers/tail.png` — 228×220 px
- `layers/leg.png` — 70×123 px
- `layers/shadow.png` — 320×64 px
- `effects/elemental-effect.png` — 101×163 px
- `master.png` — 600×600 px
- `preview.png` — 600×600 px
- `source/source-artwork.png` — source reference artwork

## Layer notes

- `body.png`: body and chest fluff only; no head, no tail, no separate leg layer reuse baked into this file.
- `head.png`: head, ears and face only.
- `head-closed.png`: blink variant created by editing the `head.png` result so the eye regions close while preserving the same silhouette, canvas and alignment.
- `tail.png`: single large curled tail only.
- `leg.png`: one reusable leg for all four leg instances.
- `shadow.png`: soft elliptical ground shadow.
- `elemental-effect.png`: wind ribbons / leaf swirl effect only.
- `master.png`: assembled idle pose from the production layers.
- `preview.png`: presentation copy of the assembled master.

## Runtime note

The package follows the shared asset contract used by `packages/asset-core/src/types.ts` and is intended to be rendered by the common pet rig without creating a pet-specific renderer.
