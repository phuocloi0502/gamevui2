# SPEC SẢN XUẤT ASSET — FOX

> Status: Production contract chuẩn hóa sheet cho mọi lineage Fox (`*-fox`, Level 1/2/3).
>
> Bổ sung mức “sheet cố định” ngang Bunny/Turtle. Camera chân và recipe đã validated trong factory/catalog.
> **Không** migrate Fire Fox Level 1 legacy (`pet-base`, `leg.png` dùng lại) sang contract này nếu chưa được yêu cầu.

## Thứ tự source of truth

1. Chỉ dẫn người dùng.
2. Approved lineage reference (Fire Fox concept ưu tiên art direction).
3. Spec này (sheet + occupancy).
4. `docs/chatgpt-pet-layer-factory.md` + `docs/pet-art-prompt-template.md`
5. `docs/pets-catalog.md` §5.1 Fox
6. `packages/asset-core/src/petCatalog.ts` (`id: 'fox'`)
7. `assets/rigs/fox-quadruped.json` (production mới)

---

## 1. Identity

| Trường | Giá trị |
|---|---|
| Species | `fox` |
| Rig (mới) | `fox-quadruped` |
| Role | Agile elemental caster |
| Range | Medium |
| Skill | **Element Tail Bolt** |
| Combat VFX | `attack-cast` + `projectile` + `impact` (+ `splash` Level 2) |
| View | 3/4 facing right |

### Silhouette

Low quadruped; đầu chibi lớn; tai tam giác lớn; chân ngắn; **đuôi rất lớn** (ID mạnh nhất). Không đọc thành Wolf.

### Evolution

L1 gọn → L2 mạnh hơn (+ splash optional) → L3 multi-tail optional theo recipe. Không đổi species.

---

## 2. Runtime contract (Level 1/2 base)

| Slot | File | z | Notes |
|---|---|---:|---|
| `effect-back` | `effects/effect-back.png` | 1 | Optional recipe; **bắt buộc sheet L1 package** |
| `tail` | `layers/tail.png` | 2 | |
| `rear-far` / `rear-near` / `front-far` / `front-near` | `layers/*.png` | 3–7 | **Bốn PNG độc lập** |
| `body` | `layers/body.png` | 5 | Không đùi |
| `head` | `layers/head.png` | 8 | Không mắt; tai gắn đầu OK nếu recipe không tách ear |
| `eyes-open` / `eyes-closed` | `layers/eyes-*.png` | 8.1+ | Parent head |
| `effect-front` | `effects/effect-front.png` | 9 | Visual; **không** phải projectile |
| `particles` | `effects/particles.png` | 10 | |
| `attack-cast` / `projectile` / `impact` | `effects/*.png` | — | Tail Bolt |

Level 3: tail đơn **hoặc** multi-tail optional theo `evolutionSlots` — sheet riêng / ô thay thế theo recipe, không phá crop L1/L2 nếu không cần.

---

## 3. Production sheet — 4×4, đúng 16 slot (Level 1/2)

```text
  1 effect-back   2 tail          3 rear-far      4 rear-near
  5 body          6 front-far     7 front-near    8 head
  9 eyes-open    10 eyes-closed  11 effect-front 12 particles
 13 attack-cast  14 projectile   15 impact       16 (reserved empty)
```

Ô 16 trống trong suốt. `assembly-ref` = file riêng.

Level 2 thêm `splash`: tạo **sheet phụ** hoặc file `effects/splash.png` riêng sau khi sheet 16 đã đạt — không nhét vào ô 16.

### Luật sheet

Không text/grid; transparent/cyan; subject 45–55% / VFX 40–50%; không overlap; không full→crop.

### Camera chân (bắt buộc — giữ factory)

- `front-near`: lớn, gần thẳng đứng, hơi trước/phải
- `front-far`: hẹp, lùi vào/sau
- `rear-near`: đùi lớn, hock rõ, chéo trước/phải
- `rear-far`: đùi hẹp, overlap thân
- Không mirror near/far; cùng ground plane; body không chứa đùi

---

## 4. Combat VFX

- `attack-cast`: tích năng quanh đuôi
- `projectile`: đạn bay tail→target (**bắt buộc cho ranged Fox**)
- `impact`: hit tại target, reusable
- `effect-front` ≠ projectile

## 5. Cấm

- `leg.png` dùng lại bốn chân (contract mới)
- Redesign thành Wolf
- Text/grid; VFX tràn ô
- Closed-head / `closedSrc`
- Migrate ngầm Fire Fox L1 legacy

## 6. Bàn giao

```text
assets/inbox/<element>-fox/level-<n>/layer-sheet.png
→ asset.json extends fox-quadruped
```
