# SPEC SẢN XUẤT ASSET — WOLF

> Status: Production contract cho mọi lineage Wolf (`*-wolf`, Level 1/2/3).
>
> Khóa sheet 16 ô, bốn chân độc lập, Fang Rush melee.
> **Không** biến Wolf thành Fox. **Không** thêm projectile mặc định.

## Thứ tự source of truth

1. Chỉ dẫn người dùng mới nhất.
2. Approved lineage reference.
3. Spec này.
4. `docs/chatgpt-pet-layer-factory.md`
5. `docs/pets-catalog.md` §5.6 Wolf
6. `packages/asset-core/src/petCatalog.ts` (`id: 'wolf'`)
7. `assets/rigs/quadruped-base.json`

Recipe TypeScript thắng conflict kỹ thuật. Spec thắng factory về thứ tự ô / cấm text-grid / occupancy / không nhét `assembly-ref` vào sheet.

---

## 1. Identity khóa cứng

| Trường | Giá trị |
|---|---|
| Species | `wolf` |
| Rig | `quadruped-base` |
| Role | Aggressive melee |
| Range | Near |
| Skill | **Fang Rush** |
| Combat VFX | `attack-cast` + `attack-trail` + `impact` |
| Projectile | **Cấm mặc định** |
| View | 3/4 facing right |

### Silhouette — phân biệt Fox

- thân **dài hơn** Fox
- mõm hẹp hơn; tai nhỏ hơn Fox
- vai mạnh; chân khỏe
- đuôi dày nhưng **không** oversized như Fox
- mane đọc được
- **không** đọc thành “cáo khác màu”

### Evolution / element

L1 gọn → L2 rõ mane/vai → L3 mạnh nhất, vẫn wolf. Element chỉ đổi palette/VFX (ember mane, icy, swept wind, ivory, violet).

---

## 2. Runtime contract

| Slot | File | Runtime | z | Notes |
|---|---|---:|---:|---|
| `shadow` | `layers/shadow.png` | `shadow` | 0 | Optional recipe; **bắt buộc sheet** |
| `tail` | `layers/tail.png` | `tail` | 1 | |
| `rear-far` | `layers/rear-far.png` | `rear-far` | 2 | Far rear — artwork riêng |
| `front-far` | `layers/front-far.png` | `front-far` | 3 | Far front — artwork riêng |
| `body` | `layers/body.png` | `body` | 4 | Thân dài; **không** chứa đùi |
| `mane` | `layers/mane.png` | `mane` | 5 | Optional recipe; **bắt buộc sheet** |
| `rear-near` | `layers/rear-near.png` | `rear-near` | 6 | Near rear |
| `front-near` | `layers/front-near.png` | `front-near` | 7 | Near front |
| `head` | `layers/head.png` | `head` | 8 | Không mắt; không jaw |
| `eyes-open` / `eyes-closed` | `layers/eyes-*.png` | parent `head` | 8.1 / 8.11 | |
| `jaw` | `layers/jaw.png` | parent `head` | 9 | Optional recipe; **bắt buộc sheet** |
| `attack-cast` | `effects/attack-cast.png` | `cast` | — | Tích năng nanh |
| `attack-trail` | `effects/attack-trail.png` | `trail` | — | Vệt lao/cắn |
| `impact` | `effects/impact.png` | `impact` | — | Bite hit |

**Bốn chân là bốn PNG độc lập.** Near/far **không mirror**. Giống Fox camera contract: near nặng hơn far; front/rear anatomy khác; cùng ground plane; mỗi chân đủ phần trên/đùi; body không chứa đùi.

---

## 3. Production sheet — 4×4, đúng 16 slot

```text
  1 shadow      2 tail         3 rear-far      4 front-far
  5 body        6 mane         7 rear-near     8 front-near
  9 head       10 eyes-open   11 eyes-closed  12 jaw
 13 attack-cast 14 attack-trail 15 impact     16 (reserved empty — để trống trong suốt, không artwork)
```

Ô 16 **cấm** vẽ subject; giữ transparent để crop map 4×4 ổn định. Không nhét `assembly-ref` vào ô 16.

### Luật sheet

Không text/grid; transparent hoặc cyan `#00FFFF`; subject 45–55% / VFX 40–50%; không overlap ô; không full-body crop; cùng camera/tỷ lệ/palette.

---

## 4. Luật layer (rút gọn bắt buộc)

- **Chân:** bốn ô perspective riêng — `front-near` lớn/rõ hơi trước-phải; `front-far` hẹp/lùi; `rear-near` đùi lớn hock rõ; `rear-far` hẹp, overlap thân. Cấm frontal / 90° profile / cùng silhouette.
- **body:** chỉ thân dài, bụng và ngực; không đầu, mane, đuôi, chân, bàn chân, đùi trước hoặc đùi sau. Toàn bộ phần chân trên/đùi thuộc bốn PNG chân.
- **mane:** khối bờm quanh cổ/vai; không vẽ lại cả đầu.
- **head:** không mắt, không jaw; mõm wolf hẹp.
- **jaw:** hàm dưới; parent head; đủ khớp để tween cắn.
- **eyes-*:** chỉ mắt, cùng canvas.
- **tail:** dày vừa, gốc rõ; không đuôi Fox oversized.
- **attack-cast:** glow nanh / charge gần miệng; không trail dài.
- **attack-trail:** vệt lao ngang hướng phải; không projectile orb.
- **impact:** burst cắn tại target; reusable mọi target.

---

## 5. Cấm

- Redesign thành Fox
- Reuse một `leg.png` cho bốn chân
- Projectile mặc định
- Text/grid; VFX tràn ô; full→crop
- Đổi `quadruped-base` chỉ vì artwork

## 6. Checklist / bàn giao

- [ ] 16 ô; ô 16 trống; bốn chân khác nhau
- [ ] Không `effects.attack.projectile`
- [ ] Mane + jaw có trên sheet; eyes blink đúng
- [ ] Silhouette dài hơn / mõm hẹp hơn Fox

```text
assets/inbox/<element>-wolf/level-<n>/layer-sheet.png
→ …/asset.json extends quadruped-base
```
