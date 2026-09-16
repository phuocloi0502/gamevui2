# SPEC SẢN XUẤT ASSET — GOLEM

> Status: Production contract cho mọi lineage Golem (`*-golem`, Level 1/2/3).
>
> Sheet 4×4 (14 subject + 2 trống), Core Quake. **Không** đổi thành Turtle. **Không** đổi `tank-base` nếu không cần.

## Source of truth

1. Chỉ dẫn người dùng → 2. Approved reference → 3. Spec này → 4. Factory → 5. Catalog §5.7 → 6. `petCatalog.ts` (`golem`) → 7. `tank-base.json`

---

## 1. Identity

| Trường | Giá trị |
|---|---|
| Species | `golem` |
| Rig | `tank-base` |
| Role | Heavy bruiser |
| Range | Near + AoE |
| Skill | **Core Quake** |
| Combat VFX | `attack-cast` + `ground-wave` + `impact` |
| Projectile | **Cấm** |
| View | 3/4 facing right |

### Silhouette

Vai cực rộng; tay/nắm đấm oversized; đầu nhỏ; thân compact; chân ngắn nặng; **lõi element** đọc rõ. Không mai rùa, không người đá cao.

### Evolution / element

L1 khối đơn giản → L2 lõi/crack rõ → L3 mạnh nhất. Fire lava / Water coral-ice / Wind floating stone / Light crystal / Shadow obsidian.

---

## 2. Runtime contract

| Slot | File | Runtime | z |
|---|---|---|---:|
| `shadow` | `layers/shadow.png` | `shadow` | 0 |
| `rear-arm` | `layers/rear-arm.png` | `rear-arm` | 1 |
| `rear-leg` | `layers/rear-leg.png` | `rear-leg` | 2 |
| `torso` | `layers/torso.png` | `torso` | 3 |
| `core` | `layers/core.png` | parent `torso` | 4 |
| `front-leg` | `layers/front-leg.png` | `front-leg` | 5 |
| `front-arm` | `layers/front-arm.png` | `front-arm` | 6 |
| `head` | `layers/head.png` | `head` | 7 |
| `eyes-open` / `eyes-closed` | `layers/eyes-*.png` | parent `head` | 7.1+ |
| `rock-fragments` | `effects/rock-fragments.png` | `rock-fragments` | 8 |
| `attack-cast` / `ground-wave` / `impact` | `effects/*.png` | combat | — |

`shadow` + `rock-fragments`: optional recipe, **bắt buộc trên sheet**. Tay/chân là artwork **độc lập** (không reuse một arm cho rear/front).

Pivot: arm gần vai; leg gần hông; core giữa ngực; head gần cổ.

---

## 3. Sheet — 4×4 (16 ô)

```text
  1 shadow        2 rear-arm      3 rear-leg      4 torso
  5 core          6 front-leg     7 front-arm     8 head
  9 eyes-open    10 eyes-closed  11 rock-fragments 12 attack-cast
 13 ground-wave  14 impact       15 (empty)      16 (empty)
```

Ô 15–16 trống trong suốt. Không `assembly-ref` trên sheet.

Luật sheet chung: không text/grid; transparent/cyan; subject 45–55% / VFX 40–50%; không overlap; không full→crop.

---

## 4. Luật layer

- **torso:** thân/vai; không đầu, tay, chân, core overlay đặc.
- **core:** chỉ lõi glow; khớp giữa ngực; parent torso.
- **rear-arm / front-arm:** 3/4; rear nhỏ hơn / lùi; front lớn, nắm rõ; đủ khớp vai.
- **rear-leg / front-leg:** ngắn nặng; cùng ground plane; đủ khớp hông.
- **head:** nhỏ, không mắt.
- **rock-fragments:** đá bay quanh thân; không thay ground-wave.
- **attack-cast:** tích năng ở lõi.
- **ground-wave:** sóng/radial trên mặt đất tại impact zone — **không** projectile bay.
- **impact:** burst chạm đất / hit; reusable.

## 5. Cấm / checklist

Cấm projectile; cấm mai rùa; cấm một PNG arm dùng hai tay; cấm redesign species.

- [ ] 14 subject + 2 empty; core parent torso; eyes parent head
- [ ] Có cast + ground-wave + impact; không projectile
- [ ] Silhouette vai rộng / đầu nhỏ / lõi rõ

```text
assets/inbox/<element>-golem/level-<n>/layer-sheet.png → extends tank-base
```
