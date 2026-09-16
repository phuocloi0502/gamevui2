# SPEC SẢN XUẤT ASSET — TURTLE

> Status: Production contract cho mọi lineage Turtle (`*-turtle`, Level 1/2/3).
>
> Khóa artwork package, sheet 12 ô, anatomy tank và Element Cage.
> **Không** redesign Turtle, **không** đổi skill, **không** đổi `tank-base` nếu không cần thiết.

## Thứ tự source of truth

1. Chỉ dẫn trực tiếp mới nhất của người dùng.
2. Approved concept/reference của đúng lineage.
3. Spec này.
4. `docs/chatgpt-pet-layer-factory.md`
5. `docs/pets-catalog.md` §5.3 Turtle
6. Executable recipe: `packages/asset-core/src/petCatalog.ts` (`id: 'turtle'`)
7. Rig: `assets/rigs/tank-base.json`

Nếu filename / required / optional / z / transform mâu thuẫn với TypeScript, **recipe thắng**. Spec này thắng factory guide về thứ tự ô, cấm text/grid, occupancy, và không nhét `assembly-ref` vào sheet 12 ô.

---

## 1. Identity khóa cứng

| Trường | Giá trị cố định |
|---|---|
| Species | `turtle` |
| Archetype / rig | `tank` / `tank-base` |
| Role | Tank / control |
| Range | Near + area control |
| Main skill | **Element Cage** |
| Combat VFX | `attack-cast` + `cage` + `impact` |
| Projectile | **Cấm.** Không `projectile`. |
| View | 3/4 side view, **facing right** |
| Art direction | Chibi fantasy, painterly/soft, silhouette đọc được ở gameplay size |

### Silhouette bắt buộc

- thân rất thấp, ngang
- mai rộng chiếm phần lớn silhouette
- đầu nhỏ, cổ ngắn
- chân ngắn, dày
- không biến thành golem, rùa người, hay pet cao chân

Tỷ lệ gợi ý (assembled):

```text
mai ≈ 1.0 bề ngang tham chiếu
thân dưới ≈ 0.55–0.7 bề ngang mai
đầu ≈ 0.35–0.45 chiều cao mai
chân ≈ ngắn, cùng ground plane
```

### Evolution

| Level | Hình | Element Cage VFX |
|---|---|---|
| 1 | Mai/chân đơn giản, ít rune, cast/cage nhỏ | Nhỏ, sạch |
| 2 | Mai rõ element hơn, rune mạnh hơn | Cage dày/đậm hơn |
| 3 | Final tank silhouette, VFX giàu nhất, vẫn chibi turtle | Cage mạnh nhất; **không** đổi thành meteor/orb |

| Element | Palette | Cage language |
|---|---|---|
| Fire | basalt / lava cracks | magma cage |
| Water | jade / cyan | water / bubble prison |
| Wind | pale stone / mint | wind barrier |
| Light | ivory-gold | crystal / radiant cage |
| Shadow | obsidian / violet | void prison |

---

## 2. Runtime contract — giữ nguyên

| Upload slot | File | Runtime id | z | Ghi chú |
|---|---|---|---:|---|
| `shadow` | `layers/shadow.png` | `shadow` | 0 | Optional recipe; **bắt buộc trên sheet** |
| `rear-feet` | `layers/rear-feet.png` | `rear-feet` | 1 | **Một PNG** = cặp chân sau |
| `body` | `layers/body.png` | `body` | 2 | Thân dưới / bụng |
| `shell` | `layers/shell.png` | `shell` | 3 | Mai |
| `front-feet` | `layers/front-feet.png` | `front-feet` | 4 | **Một PNG** = cặp chân trước |
| `head` | `layers/head.png` | `head` | 5 | Không mắt |
| `eyes-open` / `eyes-closed` | `layers/eyes-*.png` | parent `head` | 5.1 / 5.11 | Blink riêng |
| `shell-runes` | `layers/shell-runes.png` | parent `shell` | 6 | Optional recipe; **bắt buộc trên sheet** |
| `attack-cast` | `effects/attack-cast.png` | Combat `cast` | — | Tích năng trên mai |
| `cage` | `effects/cage.png` | Combat `cage` | — | Lồng tại target |
| `impact` | `effects/impact.png` | Combat `impact` | — | Khóa / hit |

**Không** tách bốn chân kiểu Fox. `rear-feet` / `front-feet` mỗi cái là một artwork cặp.

Pivot gợi ý: feet gần khớp thân (`originY` ~0.2); shell ~0.6; head gần cổ; shadow sát đất.

---

## 3. Production sheet — 3×4, đúng 12 slot

```text
  1 shadow        2 rear-feet     3 body
  4 shell         5 front-feet    6 head
  7 eyes-open     8 eyes-closed   9 shell-runes
 10 attack-cast  11 cage         12 impact
```

Crop map cố định. `assembly-ref` nếu cần → file riêng.

### Luật sheet

- không text / label / grid / watermark / checkerboard
- nền transparent thật (hoặc cyan `#00FFFF` phẳng)
- mỗi ô độc lập; cấm overlap / glow tràn ô kề
- character subject **45–55%** ô; Combat VFX **40–50%**
- không full turtle rồi crop; mỗi layer vẽ độc lập nhưng cùng character
- không sprite-sheet animation

---

## 4. Luật từng layer

### 1. `shadow.png`
Ellipse mềm sát đất, oval theo thân 3/4; không vẽ pet.

### 2. `rear-feet.png`
Hai chân sau trong **một ô**, 3/4 facing right. Chân near lớn hơn chân far trong cùng artwork (không mirror cứng). Không mai, không đầu. Phần trên đủ giấu dưới body/shell.

### 3. `body.png`
Chỉ thân dưới / bụng / ngực mềm bên trong mai. **Không** mai, đầu, chân, bàn chân, đùi, khối hông có silhouette như chân, bóng hoặc effect. Có bề mặt thân hoàn chỉnh phía sau các chân và chỗ khớp nối chân/cổ.

### 4. `shell.png`
Mai rộng, khối chính của silhouette. Không đầu, chân, rune overlay (rune là ô riêng). Đủ mép dưới để overlap body.

### 5. `front-feet.png`
Hai chân trước trong một ô; near lớn hơn far. Không mai/đầu.

### 6. `head.png`
Đầu nhỏ 3/4 phải. **Không mắt, không mai.** Cổ đủ để nối body.

### 7–8. `eyes-open.png` / `eyes-closed.png`
Chỉ mắt; cùng canvas/alignment; overlay đúng hốc mắt trên head.

### 9. `shell-runes.png`
Ornament/glow rune **khớp** silhouette mai; transparent quanh rune. Parent `shell`. Không vẽ lại cả mai đặc.

### 10. `attack-cast.png`
Tích năng trên/around mai: pulse, crack glow, ring. Không cage đầy đủ, không impact, không pet.

### 11. `cage.png`
Lồng/prison nguyên tố **tròn hoặc bán cầu**, dùng tại target. Không trail, không pet, không projectile bay.

### 12. `impact.png`
Burst khóa/hit tại target. Một impact dùng mọi target. Không `fire-turtle-hit-<target>`.

---

## 5. Cấm tuyệt đối

- Đổi Turtle thành Golem / species khác qua evolution
- Tách `rear-feet` / `front-feet` thành bốn chân Fox
- `projectile.png`
- `head` có mắt; một layer mắt gộp open+closed
- Text/grid trên sheet; VFX tràn ô
- Full-body → crop layer
- Đổi `tank-base` track chỉ để khớp artwork

---

## 6. Checklist

- [ ] Sheet 3×4 đúng 12 ô / đúng thứ tự
- [ ] `rear-feet` / `front-feet` mỗi file một cặp
- [ ] `shell-runes` parent `shell`; eyes parent `head`
- [ ] Manifest không có `effects.attack.projectile`
- [ ] Có `cast` + `cage` + `impact`
- [ ] Silhouette: mai lớn, thân thấp, đầu nhỏ, chân ngắn
- [ ] L1→L3 cùng lineage

## 7. Bàn giao

```text
assets/inbox/<element>-turtle/level-<n>/layer-sheet.png
→ public/assets/pets/<element>-turtle/level-<n>/layers|effects/
→ assets/pets/<element>-turtle/level-<n>/asset.json  extends tank-base
```
