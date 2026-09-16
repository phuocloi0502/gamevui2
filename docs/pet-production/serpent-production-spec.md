# SPEC SẢN XUẤT ASSET — SERPENT

> Status: Production contract cho mọi lineage Serpent (`*-serpent`, Level 1/2/3).
>
> Sheet 12 ô, Element Lance. Giữ `serpent-base`. **Không** thêm chân.

## Source of truth

1. User → 2. Reference → 3. Spec → 4. Factory → 5. Catalog §5.9 → 6. `petCatalog.ts` (`serpent`) → 7. `serpent-base.json`

---

## 1. Identity

| Trường | Giá trị |
|---|---|
| Species | `serpent` |
| Rig | `serpent-base` |
| Role | Line-attack ranged |
| Range | Medium / Far |
| Skill | **Element Lance** |
| Combat VFX | `attack-cast` + `beam` + `impact` |
| View | 3/4 facing right |

### Silhouette

Đầu oversized; cổ cong; thân chữ S; thân dưới cuộn; đuôi dài; **không chân**. Phân biệt Dragon (có cánh/chân).

---

## 2. Runtime

| Slot | File | z | Notes |
|---|---|---:|---|
| `shadow` | `layers/shadow.png` | 0 | Optional→**sheet** |
| `tail` | `layers/tail.png` | 1 | |
| `body-lower` | `layers/body-lower.png` | 2 | Cuộn / thân dưới |
| `body-upper` | `layers/body-upper.png` | 3 | Cổ / thân trên |
| `head` | `layers/head.png` | 4 | Không mắt; không jaw/crest |
| `eyes-open` / `eyes-closed` | `layers/eyes-*.png` | 4.1+ | Parent head |
| `jaw` | `layers/jaw.png` | 5 | Optional→**sheet**; parent head |
| `crest` | `layers/crest.png` | 6 | Optional→**sheet**; parent head |
| `attack-cast` / `beam` / `impact` | `effects/*.png` | — | |

`jaw` được `serpent-base` attack tween — nên có trên sheet dù recipe optional.

---

## 3. Sheet — 3×4 / 12 ô

```text
  1 shadow        2 tail          3 body-lower
  4 body-upper    5 head          6 eyes-open
  7 eyes-closed   8 jaw           9 crest
 10 attack-cast  11 beam         12 impact
```

Luật sheet chung. `assembly-ref` file riêng.

---

## 4. Luật layer

- **tail / body-lower / body-upper:** ba đoạn nối được; mỗi ô đủ khớp che; không chân; cùng S-curve facing right.
- **head:** oversized; không mắt; chỗ jaw/crest.
- **jaw:** hàm dưới; đủ pivot để há miệng.
- **crest:** mào/fin đầu; không vẽ lại cả đầu.
- **eyes-*:** chỉ mắt; cùng canvas.
- **attack-cast:** tích năng miệng.
- **beam:** **tia thẳng** xuyên — không orb, không meteor, không vortex.
- **impact:** đầu tia / hit; reusable.

## 5. Cấm / bàn giao

Cấm chân/cánh; cấm projectile orb thay beam; cấm redesign thành dragon.

```text
assets/inbox/<element>-serpent/level-<n>/layer-sheet.png → extends serpent-base
```
