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
| `body` | `layers/body.png` | 2 | Một layer hoàn chỉnh gồm cổ, thân chữ S và phần cuộn dưới |
| `head` | `layers/head.png` | 3 | Không mắt; không jaw/crest |
| `eyes-open` / `eyes-closed` | `layers/eyes-*.png` | 3.1+ | Parent head |
| `jaw` | `layers/jaw.png` | 4 | Optional→**sheet**; parent head |
| `crest` | `layers/crest.png` | 5 | Optional→**sheet**; parent head |
| `attack-cast` / `beam` / `impact` | `effects/*.png` | — | |

`jaw` được `serpent-base` attack tween — nên có trên sheet dù recipe optional.

---

## 3. Sheet — 3×4 / 12 ô

```text
  1 shadow        2 tail          3 body
  4 head          5 eyes-open     6 eyes-closed
  7 jaw           8 crest         9 attack-cast
 10 beam         11 impact       12 assembly-ref
```

Ô `assembly-ref` chỉ dùng để đối chiếu lắp ghép, không đưa vào runtime layers.

---

## 4. Luật layer

- **tail / body:** hai đoạn nối được; mỗi ô đủ vùng khớp bị che; không chân; cùng S-curve facing right.
- **body:** một artwork liên tục chứa toàn bộ cổ, thân chữ S và phần thân dưới cuộn; không chứa tail, head, jaw, crest, mắt hoặc effect.
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
