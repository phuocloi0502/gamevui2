# SPEC SẢN XUẤT ASSET — SLIME

> Status: Production contract cho mọi lineage Slime (`*-slime`, Level 1/2/3).
>
> Sheet 4×3 / 10 ô artwork (+2 ô trống cấm), Element Pulse. Giữ `blob-base`. **Không** thêm chân/tay.

## Source of truth

1. User → 2. Reference → 3. Spec → 4. Factory → 5. Catalog §5.8 → 6. `petCatalog.ts` (`slime`) → 7. `blob-base.json`

---

## 1. Identity

| Trường | Giá trị |
|---|---|
| Species | `slime` |
| Rig | `blob-base` |
| Role | Melee AoE |
| Range | Near + AoE |
| Skill | **Element Pulse** |
| Combat VFX | `attack-cast` + `pulse` + `impact` |
| Projectile | **Cấm** |
| View | 3/4 facing right (blob hơi nghiêng phải) |

### Silhouette

Một khối blob thấp/tròn; mắt lớn qua hai state riêng; **không** chân tay bình thường; cùng outer profile qua 5 element.

---

## 2. Runtime

| Slot | File | Parent / z | Notes |
|---|---|---|---|
| `blob` | `layers/blob.png` | z 1 | Required |
| `inner-core` | `layers/inner-core.png` | parent `blob` | Optional→**sheet** |
| `face` | `layers/face.png` | parent `blob`, z 3 | Required — chân mày, miệng, má; **không mắt/mí** |
| `eyes-open` | `layers/eyes-open.png` | parent `blob`, blink `open`, z 3.1 | Required — chỉ hai mắt mở |
| `eyes-closed` | `layers/eyes-closed.png` | parent `blob`, blink `closed`, z 3.11 | Required — chỉ hai mí nhắm |
| `front-gloss` | `layers/front-gloss.png` | parent `blob` | Optional→**sheet** |
| `top-effect` | `effects/top-effect.png` | z 5 | Optional→**sheet** |
| `attack-cast` / `pulse` / `impact` | `effects/*.png` | combat | |

Slime không có `head`. `face`, `eyes-open`, `eyes-closed` là ba sibling cùng parent `blob` và cùng transform mặc định. `face` luôn hiện; runtime chỉ luân phiên visibility của hai state mắt để blink không làm miệng hoặc chân mày nhảy.

---

## 3. Sheet — 4×3 / 10 ô artwork (+2 ô trống cấm)

```text
  1 blob          2 inner-core    3 face          4 eyes-open
  5 eyes-closed   6 front-gloss   7 top-effect    8 attack-cast
  9 pulse        10 impact       11 (trống)      12 (trống)
```

Không text/grid; transparent/cyan; subject 45–55%; Combat VFX 30–40% với safe padding lớn; không overlap; ô 11–12 trong suốt hoàn toàn; `assembly-ref` file riêng.

---

## 4. Luật layer

- **blob:** khối ngoài đầy đủ; không vẽ face chi tiết (face ô riêng); không chân.
- **inner-core:** lõi trong transparent; khớp tâm blob.
- **face:** chỉ chân mày + miệng + má/dấu biểu cảm; không mắt, nhãn cầu hoặc mí mắt; overlay đúng mặt blob.
- **eyes-open:** chỉ hai mắt mở; không chân mày/miệng/má; khớp chính xác với `face`.
- **eyes-closed:** chỉ hai mí nhắm; cùng tâm mắt/canvas/alignment với `eyes-open`.
- **front-gloss:** highlight bóng nước/jelly phía trước.
- **top-effect:** crown/aura trên đỉnh (flame, droplet, swirl…) — pet visual, không phải pulse combat.
- **attack-cast:** nén năng lượng trước bung.
- **pulse:** vòng xung 360° / ring — **không** projectile.
- **impact:** hit/pulse chạm; reusable.

## 5. Cấm / bàn giao

Cấm chân tay; cấm `projectile`; cấm đổi thành species khác; cấm bake mắt vào `face`; cấm full blob rồi crop face kém khớp.

```text
assets/inbox/<element>-slime/level-<n>/layer-sheet.png → extends blob-base
```
