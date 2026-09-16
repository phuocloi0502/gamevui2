# SPEC SẢN XUẤT ASSET — SLIME

> Status: Production contract cho mọi lineage Slime (`*-slime`, Level 1/2/3).
>
> Sheet 2×4 / 8 ô, Element Pulse. Giữ `blob-base`. **Không** thêm chân/tay.

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

Một khối blob thấp/tròn; mắt lớn (qua `face`); **không** chân tay bình thường; cùng outer profile qua 5 element.

---

## 2. Runtime

| Slot | File | Parent / z | Notes |
|---|---|---|---|
| `blob` | `layers/blob.png` | z 1 | Required |
| `inner-core` | `layers/inner-core.png` | parent `blob` | Optional→**sheet** |
| `face` | `layers/face.png` | parent `blob` | Required — mắt/miệng |
| `front-gloss` | `layers/front-gloss.png` | parent `blob` | Optional→**sheet** |
| `top-effect` | `effects/top-effect.png` | z 5 | Optional→**sheet** |
| `attack-cast` / `pulse` / `impact` | `effects/*.png` | combat | |

Slime **không** dùng `head` + `eyes-open/closed` recipe. Mặt nằm ở `face.png`.

---

## 3. Sheet — 2×4 / 8 ô

```text
  1 blob          2 inner-core    3 face          4 front-gloss
  5 top-effect    6 attack-cast   7 pulse         8 impact
```

Lưới nhỏ cố định vì anatomy ít. Không text/grid; transparent/cyan; subject 45–55% / VFX 40–50%; không overlap; `assembly-ref` file riêng.

---

## 4. Luật layer

- **blob:** khối ngoài đầy đủ; không vẽ face chi tiết (face ô riêng); không chân.
- **inner-core:** lõi trong transparent; khớp tâm blob.
- **face:** mắt + miệng (+ biểu cảm); overlay đúng mặt blob; không vẽ lại cả blob đặc.
- **front-gloss:** highlight bóng nước/jelly phía trước.
- **top-effect:** crown/aura trên đỉnh (flame, droplet, swirl…) — pet visual, không phải pulse combat.
- **attack-cast:** nén năng lượng trước bung.
- **pulse:** vòng xung 360° / ring — **không** projectile.
- **impact:** hit/pulse chạm; reusable.

## 5. Cấm / bàn giao

Cấm chân tay; cấm `projectile`; cấm đổi thành species khác; cấm full blob rồi crop face kém khớp.

```text
assets/inbox/<element>-slime/level-<n>/layer-sheet.png → extends blob-base
```
