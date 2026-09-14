# Water Fox

> **LEGACY SOURCE RECORD:** This inventory preserves an existing `pet-base` package. Its reusable `leg.png` is historical data, not a production instruction for new Fox artwork.

- **PET_ID:** water-fox
- **PET_NAME:** Water Fox
- **SPECIES:** fox
- **ELEMENT:** water
- **Rig inheritance:** `pet-base`

## Purpose

This package is a production asset package for **Water Fox**, designed to work with **Phaser 3 + PetView** in the `gamevui2` repository.

Fire Fox is the reference standard for:

- anatomy;
- silhouette;
- layer contract;
- anchor/origin layout;
- shared rig behavior;
- cute/chibi fantasy art direction.

## File list

```text
water-fox/
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
- `source/source-artwork.png` — reference source image

## Layer description

### `layers/body.png`
Body only. No head, ears, tail, legs or water effect.

### `layers/head.png`
Head plus both ears, facing slightly right, large blue eyes, cute fantasy expression.

### `layers/head-closed.png`
Same aligned head layer as `head.png`, but with eyes closed for blink.

### `layers/tail.png`
Large curled fox tail only. Tail root sits toward the lower-right side to match the Fire Fox rig placement.

### `layers/leg.png`
Single reusable fox leg for all four leg instances.

### `layers/shadow.png`
Soft ellipse shadow only.

### `effects/elemental-effect.png`
Standalone water projectile/effect image, equivalent in role to Fire Fox `fire.png`.

### `master.png`
Composited full pet reference using the production layers.

### `preview.png`
Preview render for review and documentation.

### `source/source-artwork.png`
Reference source artwork. Not intended for direct runtime use.

## Notes

- Package is intended for the shared **PetView** layered renderer.
- Layer IDs and ordering match the Fire Fox layer contract.
- `asset.json` follows the repository schema used by `packages/asset-core/src/types.ts`.
- `water` is attached as a child of `tail`, mirroring Fire Fox flame placement behavior.
- Fire Fox remains the production reference asset for alignment and runtime expectations.
