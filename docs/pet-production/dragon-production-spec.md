# SPEC SẢN XUẤT ASSET — DRAGON

> Status: Production contract cho mọi lineage Dragon (`*-dragon`, Level 1/2/3).
>
> Sheet 12 ô, Element Meteor. **Không** đổi thành Hawk/Owl. Giữ `winged-base`.

## Source of truth

1. User → 2. Approved reference → 3. Spec → 4. Factory → 5. Catalog §5.4 → 6. `petCatalog.ts` (`dragon`) → 7. `winged-base.json`

---

## 1. Identity

| Trường | Giá trị |
|---|---|
| Species | `dragon` |
| Rig | `winged-base` |
| Role | Long-range aerial caster |
| Range | Far |
| Skill | **Element Meteor** |
| Combat VFX | `attack-cast` + `meteor` + `impact` |
| View | 3/4 facing right (hover/flight pose ổn định) |

### Silhouette

Đầu rồng oversized; mõm ngắn; thân chibi compact; **hai cánh lớn**; đuôi dài; hai chân nhỏ; sừng đọc được. Không owl-tròn, không hawk-dài thruster.

### Evolution / element

L1 cánh/đuôi đơn giản → L2 ornament rõ → L3 mạnh nhất. Meteor: lava / ice comet / air spear / celestial star / dark fragment.

---

## 2. Runtime

| Slot | File | z | Notes |
|---|---|---:|---|
| `back-wing` | `layers/back-wing.png` | 1 | Far / sau |
| `tail` | `layers/tail.png` | 2 | |
| `body` | `layers/body.png` | 3 | |
| `legs` | `layers/legs.png` | 4 | **Một PNG** cặp chân nhỏ |
| `front-wing` | `layers/front-wing.png` | 5 | Near / trước |
| `head` | `layers/head.png` | 6 | Không mắt; không sừng nếu tách horns |
| `eyes-open` / `eyes-closed` | `layers/eyes-*.png` | 6.1+ | Parent head |
| `horns` | `layers/horns.png` | 7 | Optional recipe; **bắt buộc sheet**; parent head |
| `attack-cast` / `meteor` / `impact` | `effects/*.png` | — | |

Không tách bốn chân. Wings near/far là hai artwork, không mirror cứng.

---

## 3. Sheet — 3×4 / 12 ô

```text
  1 back-wing     2 tail          3 body
  4 legs          5 front-wing    6 head
  7 eyes-open     8 eyes-closed   9 horns
 10 attack-cast  11 meteor       12 impact
```

Luật sheet: không text/grid; transparent/cyan; 45–55% / VFX 40–50%; không overlap; `assembly-ref` file riêng.

---

## 4. Luật layer

- **back-wing / front-wing:** membrane + xương cánh; front lớn hơn; gốc gần thân; đủ vùng che.
- **body:** thân + ngực; không đầu/cánh/đuôi/chân.
- **legs:** hai chân nhỏ trong một ô; không người.
- **tail:** dài, gốc rõ; không cánh.
- **head:** không mắt; chỗ gắn horns.
- **horns:** chỉ sừng; khớp đỉnh đầu.
- **attack-cast:** tích năng miệng/họng.
- **meteor:** thiên thạch / comet **từ trên xuống** — không orb ngang kiểu Owl, không beam Serpent.
- **impact:** nổ khi meteor chạm; reusable.

## 5. Cấm / bàn giao

Cấm projectile ngang thay meteor; cấm redesign thành bird; cấm head có mắt.

```text
assets/inbox/<element>-dragon/level-<n>/layer-sheet.png → extends winged-base
```
