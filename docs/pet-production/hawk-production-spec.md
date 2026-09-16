# SPEC SẢN XUẤT ASSET — HAWK

> Status: Production contract cho mọi lineage Hawk (`*-hawk`, Level 1/2/3).
>
> Sheet 12 ô, Cyclone Dive. **Phải** phân biệt Owl: Hawk = dài, aerodynamic; Owl = tròn.

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
| `body` | `layers/body.png` | 3 |
| `talons` | `layers/talons.png` | 4 |
| `front-wing` | `layers/front-wing.png` | 5 |
| `head` | `layers/head.png` | 6 | không mắt; không crest |
| `eyes-open` / `eyes-closed` | `layers/eyes-*.png` | 6.1+ |
| `crest` | `layers/crest.png` | 7 | Optional→**bắt buộc sheet**; parent head |
| `attack-trail` / `vortex` / `impact` | `effects/*.png` | — |

Lưu ý filename cánh: Hawk dùng `rear-wing` (không `back-wing` như Owl/Dragon).

---

## 3. Sheet — 3×4 / 12 ô

```text
  1 rear-wing     2 tail-fan      3 body
  4 talons        5 front-wing    6 head
  7 eyes-open     8 eyes-closed   9 crest
 10 attack-trail 11 vortex       12 impact
```

Luật sheet chung. Không `assembly-ref` trên lưới.

---

## 4. Luật layer

- **rear-wing / front-wing:** dài, aerodynamic; front nặng hơn; không mirror cứng.
- **tail-fan:** quạt đuôi; không lông owl ngắn tròn.
- **body:** dài hơn Owl; không đầu/cánh.
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
