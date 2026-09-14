# Shadow Fox — Evolution Level 2

Shadow Fox is a layered Phaser puppet integrated from the approved artwork in
`assets/inbox/shadow-fox/level-2/`. The inbox files remain the immutable source package.

## Two-tail anatomy

The two supplied tail paintings stay separate in production:

- `tail-back` uses `tail2.png`, the taller astral tail mass behind the pet.
- `tail-front` uses `tail.png`, the darker foreground tail mass.

All four animation states override the shared rig so the tails rotate in opposite
directions with restrained amplitudes. This keeps the silhouette alive without
making the large soft-painted layers detach visibly from the body.

## Reproduction and limitations

Run `python3 scripts/prepare-shadow-fox.py` to rebuild normalized PNGs and the
600×600 rest-pose master. Blink swaps the supplied open and closed head images.
The elemental effect is used as the attack projectile; it is a single painted
image animated by Phaser, not a claimed sprite sheet.

## Revised leg perspective

The approved three-quarter leg revision is stored without replacing the original
inbox component:

- source revision: `assets/inbox/shadow-fox/level-2/layers/leg-angle-3q.png`;
- original component retained: `assets/inbox/shadow-fox/level-2/layers/leg.png`;
- runtime texture: `public/assets/pets/shadow-fox/level-2/layers/leg.png`.

All four puppet leg instances continue to reuse the same runtime texture and the
existing manifest anchors. `scripts/prepare-shadow-fox.py` selects the revised
source through `SOURCE_NAMES` when rebuilding production assets.
