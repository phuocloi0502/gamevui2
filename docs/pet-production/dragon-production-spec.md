# SPEC SẢN XUẤT ASSET — DRAGON

> Status: Production contract cho mọi lineage Dragon (`*-dragon`, Level 1/2/3).
>
> Sheet 4×4 / 13 ô artwork (+3 ô trống cấm), Element Meteor. **Không** đổi thành Hawk/Owl. Giữ `winged-base`.

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
| `leg-far` | `layers/leg-far.png` | 2.5 | Chân xa người xem; sau thân |
| `body` | `layers/body.png` | 3 | |
| `leg-near` | `layers/leg-near.png` | 4 | Chân gần người xem; trước thân |
| `front-wing` | `layers/front-wing.png` | 5 | Near / trước |
| `head` | `layers/head.png` | 6 | Không mắt; không sừng nếu tách horns |
| `eyes-open` / `eyes-closed` | `layers/eyes-*.png` | 6.1+ | Parent head |
| `horns` | `layers/horns.png` | 7 | Optional recipe; **bắt buộc sheet**; parent head |
| `attack-cast` / `meteor` / `impact` | `effects/*.png` | — | |

Dragon có hai chân nhỏ và dùng hai artwork độc lập: near/far không mirror hoặc dùng chung texture. Wings near/far cũng là hai artwork, không mirror cứng.

---

## 3. Sheet — 4×4 / 13 ô artwork (+3 ô trống cấm)

```text
  1 back-wing     2 tail          3 leg-far       4 body
  5 leg-near      6 front-wing    7 head          8 eyes-open
  9 eyes-closed  10 horns        11 attack-cast  12 meteor
 13 impact       14 (trống)      15 (trống)      16 (trống)
```

Luật sheet: không text/grid; transparent/cyan; 45–55% / VFX 40–50%; không overlap; ô 14–16 để trống trong suốt; `assembly-ref` file riêng.

---

## 4. Luật layer

- **back-wing / front-wing:** membrane + xương cánh; front lớn hơn; gốc gần thân; đủ vùng che.
- **body:** chỉ thân, bụng và ngực; không đầu, cánh, đuôi, chân, bàn chân, đùi hoặc hai khối haunch phía sau. Body phải có bề mặt hoàn chỉnh phía sau `leg-far`/`leg-near`; toàn bộ đùi nằm trong hai PNG chân.
- **leg-far:** một chân nhỏ ở phía xa người xem, hẹp/nhỏ hơn và có foreshortening; phần gốc đầy đủ để thân che; không mirror từ chân near.
- **leg-near:** một chân nhỏ ở phía gần người xem, lớn/rõ hơn; phần gốc đầy đủ để che dưới thân; không mirror từ chân far.
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
