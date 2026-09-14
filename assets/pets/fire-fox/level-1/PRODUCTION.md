# Fire Fox — Evolution Level 1

> **LEGACY ASSET RECORD:** This file documents the existing Fire Fox pipeline only. Do not use its master-first/reusable-leg details as the production contract for new pets; use `docs/chatgpt-pet-layer-factory.md` and `packages/asset-core/src/petCatalog.ts`.

Generated with built-in ImageGen, 2026-09-14, using the user's concept board. PNG alpha extraction and normalization by code explicitly approved by user after ImageGen produced a baked checkerboard.

## Deliverables

`public/assets/pets/fire-fox/level-1/`: body, head, head-closed, tail, leg, fire, shadow, fire-loop and master PNGs. Four leg instances reuse one texture, two far legs tinted. Ears belong to the head layer in Level 1; they are not independently rigged. Blink swaps aligned head variants.

Four functional 2D puppet clips: idle breathing/tail sway/blink, walk in place with alternating legs, attack with projectile marker, and hurt recoil. Eight-frame flame loop is procedural row deformation of the painted flame. No claim of eight independently hand-painted fire frames.

The fox inherits the common `pet-base` clips. Its anatomy, layer coordinates, texture references and projectile effect live in its own asset.json. Alternate pets can override clips without editing PetView.

## Source and reproducibility

Originals in `source/` are immutable ImageGen outputs with solid cyan backgrounds. Recreate runtime PNGs with `python3 scripts/prepare-fire-fox.py` (Pillow required). `python3 scripts/export-master.py` creates the assembled rest-pose master from the manifest. Master is 600×600 RGBA; individual parts use pixel anchors in the manifest. Keep source images out of the deployed web bundle.

`scripts/write-rig.mjs` reproduces initial rig and manifest; it overwrites these two files. Do not run it after manually tuning JSON unless intentionally restoring those defaults.

## Prompt set

All prompts use the original concept board or generated body/head as reference. The shared requirement is painterly soft golden orange fur, cream highlights, chibi proportions, no labels/shadows/checkerboard and a flat #00FFFF background for extraction.

- Body final: "Game puppet torso layer edit. Keep orange fluffy fox body and creamy chest, facing right, remove ALL FOUR LEGS, head, tail. Only a small rounded horizontal oval torso with fluffy chest rising at RIGHT, rounded belly underneath, smooth full fur coverage where legs removed so legs can attach separately. No flat cutaway, no anatomical interior, no head or face. Same soft golden painterly style. Centered with padding on pure cyan #00FFFF flat solid background. No shadow, text, checkerboard."
- Head: "Production game sprite component. Match identity of large upper-left Fire Fox reference: painterly soft golden orange fur, cream fluffy cheeks, huge amber eyes, little coral nose, cute chibi. Generate ONLY its HEAD INCLUDING BOTH LARGE EARS and face, looking three-quarter RIGHT, no neck, no body, no tail, no text. Entire ears uncropped, generous padding. Clean silhouette. Background uniform solid pure cyan #00FFFF, no checkerboard, no shadows, no cyan reflected on fur. Centered isolated head for a layered puppet game rig."
- Closed head: "Precise edit for blink animation. Keep exact same fox head shape, size, position, ears, fur, palette, lighting, nose and mouth, same canvas and solid cyan background. Change ONLY both eyes to gently closed smiling curved eyelids, creamy fur filling the former eyeball area. No other change. This closed-eye head must overlay exactly with original open-eye head for game animation."
- Tail: "Game sprite component, painterly soft Fire Fox style of large upper left reference. Draw ONLY one detached fluffy orange fox TAIL, curved upward, root at LOWER RIGHT, large fluffy tip pointing UPPER LEFT. No body, head, legs or flame. Cream-golden lighter tip, orange fur. Three-quarter perspective matching fox facing right. Entire tail isolated centered with generous padding, no labels. Flat uniform solid pure cyan #00FFFF background for chroma key, no shadows or checkerboard or cyan color on subject."
- Leg: "One isolated fox leg sprite component: short chubby golden-orange furry leg, rounded shoulder at top, creamy white little paw at bottom facing right, three soft toe lines. Match soft painterly fox reference. No other legs, body, head, tail. Leg vertically oriented, complete rounded top to hide under torso for rigging. Pure cyan #00FFFF uniform background with generous padding, no shadow, no checkerboard, no labels."
- Fire: "Single isolated magical flame sprite for Fire Fox tail effect. Same warm painterly fantasy game style reference. Compact dancing teardrop flame with golden white core, yellow center, orange outer tongues sweeping upward. No tail or animal or text. Clean crisp contained silhouette, no diffuse glow outside outline. Centered whole flame with padding. Solid uniform pure cyan #00FFFF background, no shadow, no checkerboard. One flame only."
