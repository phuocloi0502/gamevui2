# SPEC SẢN XUẤT ASSET — OWL

> Status: Production contract cho mọi lineage Owl (`*-owl`, Level 1/2/3).
>
> Sheet 12 ô, Element Orb. **Phải** phân biệt Hawk: Owl = tròn/compact; Hawk = dài/aerodynamic.

## Source of truth

1. User → 2. Reference → 3. Spec → 4. Factory → 5. Catalog §5.5 → 6. `petCatalog.ts` (`owl`) → 7. `winged-base.json`

---

## 1. Identity

| Trường | Giá trị |
|---|---|
| Species | `owl` |
| Rig | `winged-base` |
| Role | Long-range elemental shooter |
| Range | Far |
| Skill | **Element Orb** |
| Combat VFX | `attack-cast` + `projectile` + `impact` |
| View | 3/4 facing right |

### Silhouette

Thân rất tròn; mắt lớn (qua eye layers); **face disc** mạnh; cánh quạt rộng; móng nhỏ; đuôi lông ngắn. Không hawk dài, không dragon sừng.

---

## 2. Runtime

| Slot | File | z |
|---|---|---:|
| `back-wing` | `layers/back-wing.png` | 1 |
| `tail-feathers` | `layers/tail-feathers.png` | 2 |
| `body` | `layers/body.png` | 3 |
| `talons` | `layers/talons.png` | 4 |
| `front-wing` | `layers/front-wing.png` | 5 |
| `head` | `layers/head.png` | 6 | face disc, **không mắt** |
| `eyes-open` / `eyes-closed` | `layers/eyes-*.png` | 6.1+ |
| `forehead-rune` | `layers/forehead-rune.png` | 7 | Optional→**bắt buộc sheet**; parent head |
| `attack-cast` / `projectile` / `impact` | `effects/*.png` | — |

---

## 3. Sheet — 3×4 / 12 ô

```text
  1 back-wing      2 tail-feathers  3 body
  4 talons         5 front-wing     6 head
  7 eyes-open      8 eyes-closed    9 forehead-rune
 10 attack-cast   11 projectile    12 impact
```

Luật sheet chung (no text/grid; 45–55% / 40–50%; no overlap; assembly-ref riêng).

---

## 4. Luật layer

- **head:** face disc tròn; không mắt; chỗ rune trán.
- **eyes-*:** mắt owl lớn; cùng canvas; overlay chính xác.
- **wings:** back nhỏ/lùi; front lớn; không mirror cứng.
- **talons:** móng nhỏ, một ô.
- **tail-feathers:** quạt ngắn; không đuôi rồng.
- **forehead-rune:** chỉ rune/glow trán.
- **attack-cast:** charge orb gần mỏ/ngực.
- **projectile:** **orb bay** (không meteor, không beam, không vortex).
- **impact:** orb hit; reusable.

## 5. Cấm / bàn giao

Cấm silhouette Hawk; cấm meteor/vortex thay orb; cấm head có mắt.

```text
assets/inbox/<element>-owl/level-<n>/layer-sheet.png → extends winged-base
```
