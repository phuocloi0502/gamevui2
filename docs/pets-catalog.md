# Pets Catalog

> Status: Research / concept specification only.
>
> This document is intended as implementation guidance for Codex. The 50 IDs below are lineage IDs; each lineage supports three evolution asset forms.
>
> Do not create production PNG assets from this document alone.
> Do not modify Git history, commit, or push unless explicitly requested.

---

## 1. Architecture Summary

The pet system is data-driven.

A pet should primarily be defined by:

- shared rig / base animation data;
- pet-specific PNG layers;
- pet-specific JSON config;
- element-specific palette / VFX / behavior overrides.

Do **not** create a renderer per pet.

Preferred model:

```text
PetView
  -> resolved PetDefinition
  -> shared Rig / Clip archetype
  -> species asset.json
  -> element-specific textures / effects / overrides
```

Existing Fire Fox is the first concrete example.

A pet may inherit from a shared base such as:

```text
pet-base
```

For anatomies that differ significantly from quadrupeds, prefer additional rig archetypes instead of branching renderer logic.

Suggested rig archetypes:

```text
quadruped-base
  Fox
  Wolf

hopper-base
  Bunny

tank-base
  Turtle
  Golem

winged-base
  Dragon
  Owl
  Hawk

blob-base
  Slime

serpent-base
  Serpent
```

### Implemented catalog groups and upload recipes

Asset Studio exposes the catalog as six rig groups. A rig group owns shared motion;
each species inside it owns a separate upload recipe because species in the same
motion family can still have different anatomy.

| Group | Species | Rig | Template status |
|---|---|---|---|
| Quadruped | Fox, Wolf | `quadruped-base` | Fox validated; Wolf defaults provisional |
| Hopper | Bunny | `hopper-base` | Provisional until Fire Bunny |
| Tank | Turtle, Golem | `tank-base` | Provisional until Fire Turtle and Fire Golem |
| Winged | Dragon, Owl, Hawk | `winged-base` | Provisional until flying flagships |
| Blob | Slime | `blob-base` | Provisional until Fire Slime |
| Serpent | Serpent | `serpent-base` | Provisional until Fire Serpent |

The executable catalog and per-species layer defaults live in
`packages/asset-core/src/petCatalog.ts`. Do not copy the Fox layer list into a
different species merely because it shares a rig group.

Creation workflow in Asset Studio:

```text
choose species + element
  -> choose evolution level 1 / 2 / 3
  -> upload required transparent PNG slots
  -> keep originals in assets/inbox/<lineage-id>/level-<n>/
  -> copy runtime files to public/assets/pets/<lineage-id>/level-<n>/
  -> generate assets/pets/<lineage-id>/level-<n>/asset.json from species defaults
  -> tune X / Y / scale / origin / z in the UI
```

Newly imported pets start at `production`, never `ready`. Provisional templates
are starting coordinates only; validate one flagship before expanding all five
elements of that species.

Current evolution assignments:

| Lineage | Existing form |
|---|---:|
| Fire Fox | Level 1 |
| Water Fox | Level 2 |
| Wind Fox | Level 1 |
| Shadow Fox | Level 2 |

Missing levels remain empty slots; creating one must not overwrite another level
of the same lineage.

The renderer should remain generic and consume the resolved data.

---

## Evolution rules

Every elemental lineage has three separately authored forms:

- **Level 1 — base form:** smallest and simplest silhouette, restrained materials and VFX;
- **Level 2 — evolved form:** more developed anatomy accents and clearer elemental identity;
- **Level 3 — final form:** strongest silhouette and VFX treatment, while remaining readable and chibi.

All three levels must remain recognizably the same lineage. Evolution may add or
enlarge species-appropriate details, but must not change the pet into another
species. Each level owns its own PNG set, manifest and transforms. Rig and slot
recipe are shared by default, with per-level overrides only when the artwork
needs them.

---

## 2. Global Element Rules

All five elemental variants of one species must preserve the same recognizable silhouette.

Element identity changes:

- palette;
- material treatment;
- particles;
- aura;
- projectile / skill VFX;
- minor timing or gameplay behavior.

Element identity must **not** turn one species into a different anatomy.

### Fire

Palette:

- orange;
- red;
- yellow;
- ember gold.

VFX:

- flames;
- sparks;
- ember trails;
- heat distortion.

Gameplay tendency:

- burn;
- damage over time;
- aggressive impact.

### Water

Palette:

- blue;
- cyan;
- white highlight.

VFX:

- droplets;
- bubbles;
- splashes;
- waves;
- frost-like accents if needed.

Gameplay tendency:

- slow;
- splash;
- chill;
- defensive flow.

### Wind

Palette:

- pale green;
- mint;
- white.

VFX:

- wind ribbons;
- leaves;
- spirals;
- vortex streaks.

Gameplay tendency:

- speed;
- knockback;
- displacement;
- mobility.

### Light

Palette:

- cream;
- white;
- warm yellow;
- gold.

VFX:

- halos;
- sparkles;
- rays;
- celestial rings.

Gameplay tendency:

- pierce;
- heal;
- shield;
- buff.

### Shadow

Palette:

- dark purple;
- indigo;
- blue-black.

VFX:

- smoke;
- wisps;
- dark particles;
- void haze.

Gameplay tendency:

- drain;
- weaken;
- debuff;
- short blink / phase effects.

---

## 3. Species × Element Matrix

| Species | Fire | Water | Wind | Light | Shadow |
|---|---|---|---|---|---|
| Fox | Fire Fox | Water Fox | Wind Fox | Light Fox | Shadow Fox |
| Bunny | Fire Bunny | Water Bunny | Wind Bunny | Light Bunny | Shadow Bunny |
| Turtle | Fire Turtle | Water Turtle | Wind Turtle | Light Turtle | Shadow Turtle |
| Dragon | Fire Dragon | Water Dragon | Wind Dragon | Light Dragon | Shadow Dragon |
| Owl | Fire Owl | Water Owl | Wind Owl | Light Owl | Shadow Owl |
| Wolf | Fire Wolf | Water Wolf | Wind Wolf | Light Wolf | Shadow Wolf |
| Golem | Fire Golem | Water Golem | Wind Golem | Light Golem | Shadow Golem |
| Slime | Fire Slime | Water Slime | Wind Slime | Light Slime | Shadow Slime |
| Serpent | Fire Serpent | Water Serpent | Wind Serpent | Light Serpent | Shadow Serpent |
| Hawk | Fire Hawk | Water Hawk | Wind Hawk | Light Hawk | Shadow Hawk |

---

## 4. Full List of 50 Lineage IDs

```text
fire-fox
water-fox
wind-fox
light-fox
shadow-fox

fire-bunny
water-bunny
wind-bunny
light-bunny
shadow-bunny

fire-turtle
water-turtle
wind-turtle
light-turtle
shadow-turtle

fire-dragon
water-dragon
wind-dragon
light-dragon
shadow-dragon

fire-owl
water-owl
wind-owl
light-owl
shadow-owl

fire-wolf
water-wolf
wind-wolf
light-wolf
shadow-wolf

fire-golem
water-golem
wind-golem
light-golem
shadow-golem

fire-slime
water-slime
wind-slime
light-slime
shadow-slime

fire-serpent
water-serpent
wind-serpent
light-serpent
shadow-serpent

fire-hawk
water-hawk
wind-hawk
light-hawk
shadow-hawk
```

Lineage and evolution-stage ID convention:

```text
<element>-<species>
<element>-<species>-level-<1|2|3>
```

Use lower-case kebab-case. A complete catalog can contain 50 lineages and up to 150 evolution forms.

---

# 5. Species Catalog

## 5.1 Fox

### Variants

- Fire Fox — `fire-fox`
- Water Fox — `water-fox`
- Wind Fox — `wind-fox`
- Light Fox — `light-fox`
- Shadow Fox — `shadow-fox`

### Role

Agile elemental caster.

### Attack range

Medium.

### Main skill

**Element Tail Bolt**

The fox charges energy around its tail and fires an elemental projectile.

### Silhouette

Keep these features consistent across all five variants:

- low quadruped body;
- oversized chibi head;
- large triangular ears;
- short legs;
- very large curved tail.

The tail is the strongest species identifier.

### Species-specific parts

- body;
- head;
- closed-eye head / blink texture;
- reusable leg texture;
- large tail;
- tail elemental effect;
- shadow.

### Shared base animations

Good candidates for reuse:

- idle;
- walk;
- hurt;
- sleep;
- base attack timing.

### Species-specific animation / VFX

- tail charge;
- tail flare;
- elemental projectile;
- impact VFX.

### Element behavior

Fire:
- orange/red/gold;
- flame tail;
- ember projectile;
- burn.

Water:
- blue/cyan;
- liquid-flow tail;
- splash projectile;
- slow.

Wind:
- pale green/white;
- wind-ribbon tail;
- compressed air projectile;
- knockback.

Light:
- cream/gold/white;
- halo tail;
- radiant bolt;
- pierce or buff.

Shadow:
- purple/blue-black;
- smoky tail;
- shadow bolt;
- drain or weaken.

### Suggested PNG layers

```text
shadow
tail
element-tail-effect
rear-leg-far
front-leg-far
body
rear-leg-near
front-leg-near
head
head-closed
```

Leg textures should be reused where practical.

### Suggested attachment points

```text
root
ground
head-root
mouth
tail-root
tail-tip
projectile-origin
```

### Production difficulty

**Easy — 2/5**

Fire Fox already validates the workflow.

---

## 5.2 Bunny

### Variants

- Fire Bunny — `fire-bunny`
- Water Bunny — `water-bunny`
- Wind Bunny — `wind-bunny`
- Light Bunny — `light-bunny`
- Shadow Bunny — `shadow-bunny`

### Role

Fast melee / ram attacker.

### Attack range

Near.

### Main skill

**Burst Ram**

The bunny crouches, compresses its body, then launches forward and rams enemies.

### Silhouette

Keep consistent:

- round large head;
- very long ears;
- compact body;
- oversized hind legs;
- tiny tail.

### Species-specific parts

- body;
- head;
- front paws;
- hind legs;
- rear ear;
- front ear;
- tiny tail;
- dash trail.

### Shared base animations

Possible semantic reuse:

- idle;
- hurt;
- sleep.

Walk should be overridden into hopping.

### Species-specific animation / VFX

- hop locomotion;
- crouch / compression;
- fast ram;
- impact burst;
- dash trail.

### Element behavior

Fire:
- ember ears;
- flaming paw trail;
- ram causes burn.

Water:
- cyan ears;
- splash on hop;
- ram slows.

Wind:
- pale green;
- fluttering ears;
- longest / fastest dash;
- knockback.

Light:
- white/gold;
- bright speed streak;
- ram can pierce light enemies.

Shadow:
- indigo/purple;
- dark after-image;
- short blink-like dash.

### Suggested PNG layers

```text
shadow
rear-ear
body
hind-leg-far
hind-leg-near
front-paw-far
front-paw-near
head
front-ear
tail
element-trail
```

### Suggested attachment points

```text
root
ground
head-root
ear-left
ear-right
hind-leg-root
tail-root
dash-origin
impact-point
```

### Production difficulty

**Easy — 2/5**

---

## 5.3 Turtle

### Variants

- Fire Turtle — `fire-turtle`
- Water Turtle — `water-turtle`
- Wind Turtle — `wind-turtle`
- Light Turtle — `light-turtle`
- Shadow Turtle — `shadow-turtle`

### Role

Tank / control.

### Attack range

Near + area control.

### Main skill

**Element Cage**

The turtle creates a circular elemental prison around a target.

The visual language is inspired by an earth cage, but each element changes its material and effect.

### Silhouette

Keep consistent:

- very low body;
- very wide shell;
- shell occupies most of silhouette;
- small head;
- short legs.

### Species-specific parts

- shell;
- lower body;
- head;
- four feet;
- tiny tail;
- shell runes;
- cage VFX.

### Shared base animations

- idle;
- hurt;
- slow walk with smaller amplitude.

Sleep can become a shell-tuck variant.

### Species-specific animation / VFX

- brace;
- retract head;
- shell pulse;
- cage spawn;
- defensive shell glow.

### Element behavior

Fire:
- basalt shell;
- lava cracks;
- magma cage.

Water:
- blue jade / watery shell;
- bubble effect;
- water prison.

Wind:
- pale stone;
- swirl runes;
- wind barrier cage.

Light:
- ivory-gold shell;
- crystal pillars;
- radiant cage.

Shadow:
- obsidian shell;
- violet cracks;
- void prison.

### Suggested PNG layers

```text
shadow
rear-feet
body
shell
front-feet
head
shell-runes
element-aura
```

### Suggested attachment points

```text
root
ground
head-root
shell-center
front-left
front-right
rear-left
rear-right
cage-origin
```

### Production difficulty

**Easy — 2/5**

---

## 5.4 Dragon

### Variants

- Fire Dragon — `fire-dragon`
- Water Dragon — `water-dragon`
- Wind Dragon — `wind-dragon`
- Light Dragon — `light-dragon`
- Shadow Dragon — `shadow-dragon`

### Role

Long-range aerial caster.

### Attack range

Far.

### Main skill

**Element Meteor**

The dragon casts at a target position and summons an elemental object from the sky.

Examples:

- Fire: molten meteor;
- Water: ice/water comet;
- Wind: compressed-air sky spear;
- Light: celestial star;
- Shadow: dark moon fragment.

### Silhouette

Keep consistent:

- oversized dragon head;
- short muzzle;
- compact chibi torso;
- two large wings;
- long tail;
- two small legs;
- visible horns.

### Species-specific parts

- body;
- head;
- jaw if needed;
- back wing;
- front wing;
- legs;
- tail;
- horns;
- mouth / cast effect.

### Shared base animations

Semantic reuse only:

- idle;
- hurt.

Use a winged-base for:

- fly;
- hover;
- attack;
- sleep/perch.

### Species-specific animation / VFX

- wing flap;
- hover;
- casting pose;
- sky-target marker;
- meteor descent;
- meteor impact.

### Element behavior

Fire:
- lava horns / wing accents;
- molten meteor;
- burn zone.

Water:
- cyan fins / crystal accents;
- ice comet;
- chill splash.

Wind:
- pale green wing trails;
- air lance;
- knock-up.

Light:
- cream/gold;
- celestial star;
- radiant burst.

Shadow:
- purple-black;
- dark fragment;
- corruption field.

### Suggested PNG layers

```text
shadow
back-wing
tail
body
legs
front-wing
head
horns
mouth-effect
element-aura
```

### Suggested attachment points

```text
root
ground
head-root
mouth
horn-root
wing-left
wing-right
tail-root
cast-origin
meteor-marker-origin
```

### Production difficulty

**Very hard — 5/5**

---

## 5.5 Owl

### Variants

- Fire Owl — `fire-owl`
- Water Owl — `water-owl`
- Wind Owl — `wind-owl`
- Light Owl — `light-owl`
- Shadow Owl — `shadow-owl`

### Role

Long-range elemental shooter.

### Attack range

Far.

### Main skill

**Element Orb**

The owl fires an elemental orb from the beak / chest area.

### Silhouette

Keep consistent:

- very round body;
- huge eyes;
- strong circular face disc;
- broad fan-like wings;
- tiny talons;
- short tail feathers.

The Owl must remain visually distinct from Hawk.

Owl = round and compact.

Hawk = long and aerodynamic.

### Species-specific parts

- body;
- head / face disc;
- eyes or closed-eye layer;
- wings;
- talons;
- tail feathers;
- forehead rune;
- orb VFX.

### Shared base animations

Use winged-base:

- idle hover;
- flap;
- hurt;
- sleep/perch.

### Species-specific animation / VFX

- hover bob;
- wing flap;
- orb charge;
- ranged shot.

### Element behavior

Fire:
- ember wing tips;
- fire orb.

Water:
- blue feathers;
- bubble orb.

Wind:
- pale green-white;
- spiral air orb.

Light:
- cream-gold;
- radiant orb.

Shadow:
- purple-black;
- void orb.

### Suggested PNG layers

```text
shadow
back-wing
tail-feathers
body
talons
front-wing
head
eyes-or-closed
forehead-rune
orb-effect
```

### Suggested attachment points

```text
root
head-root
beak
wing-left
wing-right
talon-left
talon-right
orb-origin
```

### Production difficulty

**Medium — 3/5**

---

## 5.6 Wolf

### Variants

- Fire Wolf — `fire-wolf`
- Water Wolf — `water-wolf`
- Wind Wolf — `wind-wolf`
- Light Wolf — `light-wolf`
- Shadow Wolf — `shadow-wolf`

### Role

Aggressive melee attacker.

### Attack range

Near.

### Main skill

**Fang Rush**

The wolf quickly closes distance and bites the target.

### Silhouette

Keep consistent:

- longer torso than Fox;
- narrower muzzle;
- smaller ears than Fox;
- strong shoulders;
- powerful legs;
- thick but less oversized tail;
- visible mane.

This distinction is important so the Wolf never reads as "another fox."

### Species-specific parts

- body;
- head;
- jaw;
- mane;
- four legs;
- tail;
- fang effect.

### Shared base animations

Excellent quadruped-base candidate:

- idle;
- walk;
- hurt;
- sleep.

Attack should be overridden.

### Species-specific animation / VFX

- low stalking movement;
- short lunge;
- jaw snap;
- bite impact.

### Element behavior

Fire:
- ember mane;
- burn bite.

Water:
- icy/watery mane;
- slowing bite.

Wind:
- swept-back mane;
- faster lunge.

Light:
- ivory-gold mane;
- radiant fang.

Shadow:
- dark violet mane;
- drain bite.

### Suggested PNG layers

```text
shadow
tail
rear-leg-far
front-leg-far
body
mane
rear-leg-near
front-leg-near
head
jaw
fang-effect
```

### Suggested attachment points

```text
root
ground
head-root
jaw
bite-point
mane-root
tail-root
front-left
front-right
rear-left
rear-right
```

### Production difficulty

**Easy / Medium — 2.5/5**

---

## 5.7 Golem

### Variants

- Fire Golem — `fire-golem`
- Water Golem — `water-golem`
- Wind Golem — `wind-golem`
- Light Golem — `light-golem`
- Shadow Golem — `shadow-golem`

### Role

Heavy bruiser / ram / shockwave.

### Attack range

Near + area effect.

### Main skill

**Core Quake**

The golem slams the ground and creates a radial shockwave.

Secondary identity:

- heavy ram;
- unstoppable movement;
- impact control.

### Silhouette

Keep consistent:

- extremely wide shoulders;
- oversized arms / fists;
- small head;
- compact torso;
- short heavy legs;
- visible elemental core.

### Species-specific parts

- torso;
- head;
- shoulder masses;
- rear arm;
- front arm;
- fists;
- legs;
- elemental core;
- floating rock fragments.

### Shared base animations

Use a tank/heavy rig:

- idle;
- hurt.

Walk and attack should be heavy-specific.

### Species-specific animation / VFX

- slow heavy walk;
- shoulder ram;
- ground slam;
- radial quake;
- floating rock fragments.

### Element behavior

Fire:
- volcanic stone;
- lava cracks.

Water:
- coral / wet stone / ice-rock accents.

Wind:
- floating light stone;
- orbiting fragments.

Light:
- sandstone / crystal;
- glowing core.

Shadow:
- obsidian / amethyst;
- dark core.

### Suggested PNG layers

```text
shadow
rear-arm
rear-leg
torso
core
front-leg
front-arm
head
rock-fragments
ground-effect
```

### Suggested attachment points

```text
root
ground
core
head-root
shoulder-left
shoulder-right
fist-left
fist-right
foot-left
foot-right
ground-impact
```

### Production difficulty

**Medium — 3/5**

---

## 5.8 Slime

### Variants

- Fire Slime — `fire-slime`
- Water Slime — `water-slime`
- Wind Slime — `wind-slime`
- Light Slime — `light-slime`
- Shadow Slime — `shadow-slime`

### Role

Melee area-effect attacker.

### Attack range

Near + area effect.

### Main skill

**Element Pulse**

The slime compresses, expands, then releases a 360-degree elemental pulse.

### Silhouette

Keep consistent:

- one low rounded blob;
- simple large eyes;
- no normal limbs;
- same outer blob profile across the five elements.

### Species-specific parts

- blob;
- face;
- inner core;
- highlight / gloss;
- top elemental effect.

### Shared base animations

Use semantic state names:

- idle;
- attack;
- hurt;
- sleep.

But implement with blob-base clips.

### Species-specific animation / VFX

- squash;
- stretch;
- wobble;
- radial pulse;
- body ripple.

### Element behavior

Fire:
- magma jelly;
- flame crown.

Water:
- translucent cyan;
- droplets.

Wind:
- pale green cloud-like jelly;
- swirl rings.

Light:
- pearl-gold translucent body;
- halo pulse.

Shadow:
- dark purple viscous body;
- smoke leakage.

### Suggested PNG layers

```text
shadow
blob
inner-core
face
front-gloss
top-effect
```

### Suggested attachment points

```text
root
ground
center
core
top
front
aoe-origin
```

### Production difficulty

**Very easy asset-wise — 1/5**

Requires blob-base rather than quadruped-base.

---

## 5.9 Serpent

### Variants

- Fire Serpent — `fire-serpent`
- Water Serpent — `water-serpent`
- Wind Serpent — `wind-serpent`
- Light Serpent — `light-serpent`
- Shadow Serpent — `shadow-serpent`

### Role

Line-attack ranged unit.

### Attack range

Medium / Far.

### Main skill

**Element Lance**

The serpent emits a straight-line elemental attack that can pass through multiple targets.

### Silhouette

Keep consistent:

- oversized head;
- curved neck;
- long S-shaped body;
- coiled lower body;
- long tail;
- no legs.

### Species-specific parts

- head;
- jaw;
- neck;
- upper body;
- lower body;
- tail;
- crest;
- mouth VFX.

### Shared base animations

Use serpent-base.

Semantic states:

- idle;
- attack;
- hurt;
- sleep.

### Species-specific animation / VFX

- body sway;
- neck recoil;
- strike;
- beam / line projectile;
- body wave.

### Element behavior

Fire:
- ember scales;
- flame lance.

Water:
- glossy cyan scales;
- water jet.

Wind:
- pale green-white scales;
- compressed air line.

Light:
- ivory-gold;
- radiant lance.

Shadow:
- navy-purple;
- dark beam.

### Suggested PNG layers

```text
shadow
tail
body-lower
body-upper
head
jaw
crest
mouth-effect
```

### Suggested attachment points

```text
root
ground
head-root
jaw
mouth
neck-mid
body-mid
tail-tip
beam-origin
```

### Production difficulty

**Hard — 4/5**

---

## 5.10 Hawk

### Variants

- Fire Hawk — `fire-hawk`
- Water Hawk — `water-hawk`
- Wind Hawk — `wind-hawk`
- Light Hawk — `light-hawk`
- Shadow Hawk — `shadow-hawk`

### Role

Aerial controller / tornado attacker.

### Attack range

Medium + area effect.

### Main skill

**Cyclone Dive**

The Hawk circles or dives toward the target area and generates an elemental vortex.

### Silhouette

Keep consistent:

- broad but long wings;
- aerodynamic body;
- small sharp head;
- fan tail;
- tucked talons;
- pointed crest.

The Hawk must remain visually distinct from Owl.

### Species-specific parts

- body;
- head;
- back wing;
- front wing;
- tail fan;
- talons;
- crest;
- wing trail;
- vortex VFX.

### Shared base animations

Use winged-base:

- hover;
- fly;
- hurt;
- perch / sleep.

### Species-specific animation / VFX

- glide;
- dive;
- wing sweep;
- vortex spawn;
- tornado loop.

### Element behavior

Fire:
- fire tornado.

Water:
- waterspout.

Wind:
- classic pale-green tornado.

Light:
- golden cyclone.

Shadow:
- void vortex.

### Suggested PNG layers

```text
shadow
rear-wing
tail-fan
body
talons
front-wing
head
crest
wing-trail
vortex
```

### Suggested attachment points

```text
root
head-root
beak
wing-left
wing-right
tail-root
talon-left
talon-right
vortex-origin
```

### Production difficulty

**Hard — 4/5**

---

# 6. Attack Role and Skill Table

| Species | Primary Role | Range | Main Skill | Combat Identity |
|---|---|---|---|---|
| Fox | Agile caster | Medium | Element Tail Bolt | Projectile |
| Bunny | Ram / melee | Near | Burst Ram | Charge / ram |
| Turtle | Tank / control | Near + AoE | Element Cage | Earth-cage style control |
| Dragon | Ranged caster | Far | Element Meteor | Meteor from sky |
| Owl | Ranged shooter | Far | Element Orb | Elemental projectile |
| Wolf | Melee assassin | Near | Fang Rush | Bite / lunge |
| Golem | Heavy bruiser | Near + AoE | Core Quake | Heavy ram + shockwave |
| Slime | AoE melee | Near + AoE | Element Pulse | Radial area effect |
| Serpent | Line ranged | Medium / Far | Element Lance | Straight-line attack |
| Hawk | Aerial controller | Medium + AoE | Cyclone Dive | Tornado / vortex |

Required role diversity is covered:

- melee;
- ranged;
- ram;
- tornado;
- earth cage;
- meteor;
- area effect.

---

# 7. Attachment Point Vocabulary

Important:

The current runtime may not yet expose a formal attachment-point type.

Treat the following as a **recommended future vocabulary**, not as permission to invent unsupported JSON fields without checking the current schema.

Suggested common names:

```text
root
ground

head-root
mouth
projectile-origin

tail-root
tail-tip

wing-left
wing-right

hand-left
hand-right
fist-left
fist-right

foot-left
foot-right

core

cast-origin
impact-origin
aoe-origin
vortex-origin
beam-origin
```

Desired gameplay-facing API concept:

```ts
getAttachment("projectile-origin")
```

Gameplay should not need to know whether the projectile originates from:

- Fox tail;
- Owl chest;
- Dragon mouth;
- Serpent mouth.

The pet data should define that mapping.

---

# 8. Layer Design Rules

Follow these rules when producing future assets:

1. Split only parts that need independent movement.
2. Reuse identical limb textures where possible.
3. Keep pivots and canvas alignment consistent.
4. Preserve transparent padding consistently.
5. Keep species silhouette stable across all elements.
6. Use element VFX layers separately when they require independent animation.
7. Avoid over-fragmenting a pet into too many PNG files.
8. Do not bake gameplay timing into artwork.
9. Prefer data overrides over renderer branches.
10. Validate each flagship species before mass-producing its remaining four elements.

---

# 9. Production Order

Do **not** produce all 50 pets immediately.

Validate the system progressively.

## Phase 1 — Validate element variants using existing Fox rig

1. Water Fox
2. Wind Fox
3. Light Fox
4. Shadow Fox

Goal:

Confirm that element variants can share the same silhouette, rig, animation timing, and renderer.

## Phase 2 — Validate another quadruped

5. Fire Wolf

Goal:

Prove `quadruped-base` is not Fox-specific.

## Phase 3 — Validate alternate ground locomotion

6. Fire Bunny
7. Fire Turtle

Goal:

Test:

- hopping;
- ram;
- heavy movement;
- shell animation;
- cage effect.

## Phase 4 — Validate non-quadruped ground pets

8. Fire Slime
9. Fire Golem

Goal:

Introduce:

- `blob-base`;
- `tank-base`.

## Phase 5 — Validate flying pets

10. Fire Owl
11. Fire Hawk

Goal:

Introduce:

- hover;
- flap;
- dive;
- projectile;
- tornado.

## Phase 6 — Validate hardest body structures

12. Fire Serpent
13. Fire Dragon

Goal:

Test:

- long body motion;
- wings;
- tail;
- sky-target attack;
- meteor effect.

## Phase 7 — Expand remaining elements

Only after all ten species flagships are stable, produce:

- Water;
- Wind;
- Light;
- Shadow

for every remaining species.

This converts the final expansion into mostly:

- art variations;
- VFX variations;
- JSON config variations;
- small behavior modifiers.

---

# 10. Production Difficulty Summary

| Order | Species | Difficulty | Main Reason |
|---:|---|---|---|
| 1 | Fox variants | 1/5 | Existing production example |
| 2 | Slime | 1/5 | Very few layers |
| 3 | Bunny | 2/5 | Simple anatomy |
| 4 | Turtle | 2/5 | Low motion complexity |
| 5 | Wolf | 2.5/5 | Strong quadruped reuse |
| 6 | Golem | 3/5 | Heavy joints and effects |
| 7 | Owl | 3/5 | Wings + ranged projectile |
| 8 | Hawk | 4/5 | Flying + tornado |
| 9 | Serpent | 4/5 | Long-body animation |
| 10 | Dragon | 5/5 | Wings + tail + cast + meteor |

---

# 11. Recommended Implementation Principle

Avoid this:

```text
FoxRenderer
BunnyRenderer
TurtleRenderer
DragonRenderer
OwlRenderer
WolfRenderer
GolemRenderer
SlimeRenderer
SerpentRenderer
HawkRenderer
```

Prefer this:

```text
PetView
  -> PetDefinition
  -> rig archetype
  -> species-specific layers
  -> element-specific assets / VFX
  -> animation overrides
```

Example:

```text
Fire Dragon
  species = dragon
  rig = winged-base
  element = fire
  layers = dragon anatomy
  effects = fire meteor
  overrides = dragon cast/fly clips
```

Then:

```text
Water Dragon
```

should preserve:

- the same Dragon silhouette;
- the same wing / tail anatomy;
- the same attachment positions;
- most animation timing;
- the same generic renderer.

Primarily change:

- palette;
- textures;
- particles;
- projectile / meteor VFX;
- small gameplay behavior.

---

# 12. Concept Board Specification

A future concept board should represent all 50 variants as:

```text
10 rows × 5 columns
```

Rows:

1. Fox
2. Bunny
3. Turtle
4. Dragon
5. Owl
6. Wolf
7. Golem
8. Slime
9. Serpent
10. Hawk

Columns:

1. Fire
2. Water
3. Wind
4. Light
5. Shadow

Requirements:

- include existing Fire Fox;
- cute / chibi fantasy art direction;
- no text inside the image;
- no transparent-background requirement;
- no sprite sheet requirement;
- no separated production layers;
- each cell contains one small readable pet;
- same species silhouette across all five elements;
- Fire palette = orange/red/yellow + fire;
- Water palette = blue/cyan + droplets;
- Wind palette = pale green/white + wind;
- Light palette = cream/white/gold + halo;
- Shadow palette = dark purple/blue-black + smoke;
- do not copy exact reference pets;
- inherit only the overall art direction and design principles.

---

# 13. Codex Guardrails

When implementing from this document:

- inspect the repository schema before adding fields;
- reuse current naming conventions;
- do not add per-pet renderer branches;
- prefer inheritance and overrides;
- keep data-driven behavior;
- preserve existing Fire Fox compatibility;
- implement new rig archetypes only when anatomy truly requires them;
- add one flagship species at a time;
- validate animation playback before creating more variants;
- do not mass-produce production PNGs until the rig for that species is validated.

This document is a design specification, not an instruction to generate final production art immediately.
