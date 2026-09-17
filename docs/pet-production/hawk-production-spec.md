# SPEC SẢN XUẤT ASSET — HAWK

> Status: Production contract cho mọi lineage Hawk (`*-hawk`, Level 1/2/3).
>
> Sheet 4×4 / 13 ô artwork (+3 ô trống cấm), Cyclone Dive. **Phải** phân biệt Owl: Hawk = dài, aerodynamic; Owl = tròn.

## Source of truth

1. User → 2. Reference → 3. Spec → 4. Factory → 5. Catalog §5.10 → 6. `petCatalog.ts` (`hawk`) → 7. `winged-base.json`

---

## 1. Identity

| Trường | Giá trị |
|---|---|
| Species | `hawk` |
| Rig | `winged-base` |
| Role | Aerial controller |
| Range | Medium + AoE |
| Skill | **Cyclone Dive** |
| Combat VFX | `attack-trail` + `vortex` + `impact` |
| Projectile | **Cấm** (không orb ngang) |
| View | 3/4 facing right |

### Silhouette

Cánh rộng nhưng dài; thân aerodynamic; đầu nhỏ sắc; đuôi quạt; móng cụp; **crest** nhọn. Không face-disc owl, không rồng sừng lớn.

---

## 2. Runtime

| Slot | File | z |
|---|---|---:|
| `rear-wing` | `layers/rear-wing.png` | 1 |
| `tail-fan` | `layers/tail-fan.png` | 2 |
| `leg-far` | `layers/leg-far.png` | 2.5 | chân xa, nằm sau body |
| `body` | `layers/body.png` | 3 |
| `leg-near` | `layers/leg-near.png` | 4 | chân gần, nằm trước body |
| `front-wing` | `layers/front-wing.png` | 5 |
| `head` | `layers/head.png` | 6 | không mắt; không crest |
| `eyes-open` / `eyes-closed` | `layers/eyes-*.png` | 6.1+ |
| `crest` | `layers/crest.png` | 7 | Optional→**bắt buộc sheet**; parent head |
| `attack-trail` / `vortex` / `impact` | `effects/*.png` | — |

Lưu ý filename cánh: Hawk dùng `rear-wing` (không `back-wing` như Owl/Dragon).

---

## 3. Sheet — 4×4 / 13 ô artwork

```text
  1 rear-wing     2 tail-fan      3 leg-far       4 body
  5 leg-near      6 front-wing    7 head          8 eyes-open
  9 eyes-closed  10 crest        11 attack-trail 12 vortex
 13 impact       14 EMPTY        15 EMPTY        16 EMPTY
```

Ba ô 14–16 phải trong suốt hoàn toàn. Không đặt `assembly-ref` trong lưới crop cố định.

---

## 4. Luật layer

- **rear-wing / front-wing:** dài, aerodynamic; front nặng hơn; không mirror cứng.
- **tail-fan:** quạt đuôi; không lông owl ngắn tròn.
- **leg-far / leg-near:** hai artwork chân hoàn chỉnh và riêng biệt, mỗi layer đúng một chân từ đùi/điểm gắn tới móng; không mirror cứng. `leg-far` hẹp, nhỏ và lùi vào trong; `leg-near` lớn, rõ và gần camera hơn. Hai chân cùng pose móng cụp nhưng khác perspective.
- **body:** chỉ thân dài, bụng và ngực; không đầu, cánh, tail-fan, chân, bàn chân, đùi hoặc effect. Body có bề mặt hoàn chỉnh phía sau wing/chân.
- **head:** nhỏ sắc; chỗ gắn crest.
- **crest:** mào nhọn; chỉ crest.
- **attack-trail:** vệt bổ nhào / dive streak.
- **vortex:** lốc/tornado element tại vùng target — **không** orb, không meteor.
- **impact:** burst lốc chạm; reusable.

## 5. Cấm / bàn giao

Cấm `projectile` orb; cấm silhouette Owl; cấm `back-wing` filename (dùng `rear-wing`).

```text
assets/inbox/<element>-hawk/level-<n>/layer-sheet.png → extends winged-base
```
