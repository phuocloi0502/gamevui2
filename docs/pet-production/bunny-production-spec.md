# SPEC SẢN XUẤT ASSET — BUNNY

> Status: Production contract cho mọi lineage Bunny (`*-bunny`, Level 1/2/3).
>
> Spec này khóa artwork package, sheet 12 ô, perspective và reuse limb.
> Nó **không** redesign Bunny, **không** đổi skill Burst Ram, **không** đổi `hopper-base` clips, **không** tách bốn chân độc lập.

## Thứ tự source of truth

1. Chỉ dẫn trực tiếp mới nhất của người dùng.
2. Approved concept/reference của đúng lineage.
3. Spec này.
4. `docs/chatgpt-pet-layer-factory.md`
5. `docs/pets-catalog.md` §5.2 Bunny
6. Executable recipe: `packages/asset-core/src/petCatalog.ts` (`id: 'bunny'`)
7. Rig: `assets/rigs/hopper-base.json`

Nếu filename / required / optional / instance id / z / transform mâu thuẫn với TypeScript, **recipe thắng**. Nếu art identity mâu thuẫn, approved reference thắng mô tả generic. Spec này thắng factory guide khi nói về **thứ tự ô, cấm text/grid, occupancy, và không nhét `assembly-ref` vào sheet 12 ô**.

---

## 1. Identity khóa cứng

| Trường | Giá trị cố định |
|---|---|
| Species | `bunny` |
| Archetype / rig | `hopper` / `hopper-base` |
| Role | Fast melee / ram |
| Range | Near |
| Main skill | **Burst Ram** |
| Combat VFX | `attack-trail` + `impact` only |
| Projectile | **Cấm.** Không ô `projectile`, không bind `effects.attack.projectile`, không dùng `effect-front` thay đạn. |
| View | 3/4 side view, **facing right** |
| Art direction | Chibi fantasy, painterly/soft, silhouette đọc được ở gameplay size |
| Canvas rig | 512×512 baseline; PNG upload giữ nguyên pixel/padding |

### Silhouette bắt buộc (mọi element, mọi level)

- đầu lớn, tròn, chiếm phần lớn chiều cao
- tai rất dài (hai tai tách layer)
- thân nhỏ/gọn, compact hopper
- chân sau lớn (đùi hopper)
- chân trước nhỏ (paw)
- đuôi rất nhỏ (pompom)
- không biến thành cáo, sói, kangaroo người, hay thú đứng thẳng

Tỷ lệ gợi ý khi nhìn assembled (không phải kích thước file):

```text
đầu ≈ 1.0
thân ≈ 0.45–0.55 bề ngang đầu
tai ≈ 1.1–1.4 chiều cao đầu
đùi sau ≈ 0.7–0.9 chiều cao thân
paw trước ≈ 0.35–0.5 chiều cao đùi sau
đuôi ≈ chấm tròn, nhỏ hơn paw
```

### Lineage và evolution

Cùng một con thỏ trưởng thành dần. Cấm đổi species giữa Level 1 → 2 → 3.

| Level | Hình | Burst Ram VFX |
|---|---|---|
| 1 | Nhỏ, tai/đùi đơn giản, ít ornament, element vừa | Trail/impact nhỏ, sạch, ít particle |
| 2 | Trưởng thành hơn, tai/đùi/element rõ hơn, vẫn nhận ra L1 | Trail dài/đậm hơn, impact giàu năng lượng hơn |
| 3 | Final, silhouette mạnh nhất, ornament/VFX giàu nhất, vẫn chibi hopper | Trail/impact mạnh nhất; **không** đổi thành ranged bolt |

Element chỉ đổi palette, material, glow tai/paw và ngôn ngữ VFX. Không đổi anatomy.

| Element | Palette | Trail / impact language |
|---|---|---|
| Fire | cam / đỏ / vàng kim | vệt ember, ram gây tia lửa |
| Water | cyan / xanh / trắng | vệt splash, giọt nước |
| Wind | mint / trắng | vệt ribbon, dash dài |
| Light | ivory / vàng kim | streak sáng, burst halo |
| Shadow | indigo / tím / đen | after-image, khói mỏng |

---

## 2. Runtime contract hiện tại — giữ nguyên

Recipe Bunny tạo **một PNG** cho `hind-leg` và **một PNG** cho `front-paw`. Runtime nhân bản:

| Upload slot | File | Runtime layer id | z (recipe) | Ghi chú |
|---|---|---|---:|---|
| `shadow` | `layers/shadow.png` | `shadow` | 0 | Optional trong recipe; **bắt buộc trên production sheet** |
| `rear-ear` | `layers/rear-ear.png` | `rear-ear` | 1 | Tai far-side |
| `body` | `layers/body.png` | `body` | 2 | |
| `hind-leg` | `layers/hind-leg.png` | `hind-leg-far`, `hind-leg-near` | 3 / 5 | **Cùng một PNG** |
| `front-paw` | `layers/front-paw.png` | `front-paw-far`, `front-paw-near` | 4 / 7 | **Cùng một PNG** |
| `head` | `layers/head.png` | `head` | 6 | Không chứa mắt, không chứa tai |
| `eyes-open` | `layers/eyes-open.png` | `eyes-open` parent `head` | 6.1 | `blink: "open"` |
| `eyes-closed` | `layers/eyes-closed.png` | `eyes-closed` parent `head` | 6.11 | `blink: "closed"` |
| `front-ear` | `layers/front-ear.png` | `front-ear` | 8 | Tai camera-facing |
| `tail` | `layers/tail.png` | `tail` | 9 | Pompom |
| `attack-trail` | `effects/attack-trail.png` | Combat `trail` | — | Burst Ram |
| `impact` | `effects/impact.png` | Combat `impact` | — | Burst Ram |

`hopper-base` đang tween: `body`, `front-ear`, `rear-ear`, `head`, `hind-leg-near`. Không tween `hind-leg-far` / paws / tail / shadow. **Không** tách `hind-leg-near/far` hay `front-paw-near/far` thành bốn artwork chỉ vì Fox làm vậy.

Pivot (origin trong PNG):

- tai: gần gốc tai gắn đầu (`originX` 0.5, `originY` ~0.9)
- hind-leg: gần khớp đùi–thân (`originY` ~0.25)
- front-paw: gần khớp vai/ngực (`originY` ~0.2)
- head: gần cổ (`originY` ~0.78)
- tail: gốc pompom (`origin` ~0.7, 0.7)
- shadow: tâm/ellipse sát đất

---

## 3. Production sheet — 3×4, đúng 12 slot

**Một** PNG `layer-sheet.png` cho đúng một evolution stage.

```text
cột →
  1 shadow        2 rear-ear      3 body
  4 hind-leg      5 front-paw     6 head
  7 eyes-open     8 eyes-closed   9 front-ear
 10 tail         11 attack-trail 12 impact
```

Đọc trái → phải, trên → dưới. **Thứ tự này là crop map cố định** cho mọi Bunny sau này. Codex tách ô theo index 1–12, không theo z-order, không theo thứ tự factory “head trước”.

### Vì sao 12 ô này, thứ tự này

- Đúng package catalog + Burst Ram, cộng `shadow` (Turtle/Fox concept cũng vẽ bóng riêng).
- Hàng 1–3 là character back-to-front đủ để crop; hàng 4 là đuôi + melee VFX.
- `hind-leg` / `front-paw` mỗi thứ **một ô** vì runtime reuse.
- Không thêm `assembly-ref` vào lưới: ô thứ 13 sẽ phá crop 3×4 và dễ bị nhầm thành layer. Nếu cần ảnh lắp để đối chiếu, xuất **file thứ hai** `assembly-ref.png`, không nằm trên sheet 12 ô.
- Không thêm `attack-cast` / `projectile` / `effect-front`. Recipe melee không có.

### Luật sheet (thắt hơn factory generic)

Bắt buộc:

- không text, không filename, không số ô, không watermark
- không vẽ đường grid, frame, tick, checkerboard
- nền **trong suốt thật**; nếu tool không làm được thì cyan phẳng `#00FFFF`, không gradient, không phản cyan lên subject
- mỗi ô một artwork độc lập; **cấm overlap** sang ô bên cạnh
- glow, lông, particle, trail **không được chạm** biên ô / ô kề
- safe padding lớn: subject chỉ chiếm **45–55%** diện tích ô character; Combat VFX **40–50%**
- ưu tiên crop sạch hơn việc lấp đầy canvas
- không vẽ full Bunny rồi crop ra layer
- mỗi layer là asset độc lập nhưng cùng một character: cùng camera 3/4 facing right, cùng tỷ lệ, lighting, outline, palette, ground plane
- không sprite sheet animation, không hàng frame, không ZIP/JSON trong ảnh

`assembly-ref` (nếu tạo file riêng): rest pose, `eyes-open`, không Combat VFX, cùng camera/tỷ lệ; **không** dùng để crop layer.

---

## 4. Luật từng layer

Mọi anatomy cell phải vẽ **đủ phần sẽ bị layer khác che** (khớp, gốc tai, gốc đuôi, mặt trong đùi). Cấm mặt cắt phẳng, nội tạng, “lỗ gắn”.

### 1. `shadow.png`

- Ellipse mềm, sát ground plane, hơi oval theo thân 3/4 facing right.
- Không vẽ chân, tai, pet. Không drop-shadow cứng dưới từng bộ phận khác.
- Không animate; chỉ contact blob.

### 2. `rear-ear.png` — tai far-side

- Tai **sau / xa camera**, hơi nhỏ và hẹp hơn `front-ear`.
- Gốc tai ở **dưới ô** (pivot), ngọn vươn lên-sau / hơi vào trong đầu.
- Foreshortening: mỏng hơn, bị cảm giác nằm sau khối đầu; **không** mirror `front-ear`.
- Không mắt, không đầu, không tai kia. Gốc tai vẽ đủ để giấu dưới/sau crown.
- Cấm tai frontal phẳng, tai profile 90°, hai tai cùng silhouette.

### 3. `body.png`

- Chỉ thân hopper compact, bụng và ngực; ngực hơi về **phải** (facing right).
- **Không** đầu, tai, mắt, chân, paw, đùi sau, khối hông có silhouette như đùi, đuôi, bóng hoặc effect.
- Có “nắp” lông đầy đủ chỗ cổ, khớp đùi, khớp paw, gốc đuôi để layer khác cắm vào khi xoay.
- Toàn bộ đùi sau nằm trong `hind-leg.png`; body phục hồi bề mặt thân phía sau chân, không chứa đùi hay paw.

### 4. `hind-leg.png` — source dùng lại near/far

Vẽ **một** chân sau kiểu **camera-facing / near**: đùi lớn, hock rõ, bàn đáp đất cùng plane với pet facing right.

- Đủ từ khớp hông đến bàn; phần trên đầy để giấu dưới body.
- Tư thế hopper nghỉ/chụm, sẵn sàng bật; không chân người, không chân cáo dài.
- Runtime: `hind-leg-near` scale lớn hơn, `hind-leg-far` cùng PNG scale nhỏ hơn + lệch x. **Không** vẽ chân far riêng trên sheet.
- Cấm frontal, side-profile 90°, elemental blob làm méo silhouette đùi.

### 5. `front-paw.png` — source dùng lại near/far

Vẽ **một** paw trước near, nhỏ, ngắn, 3/4 facing right.

- Đủ từ khớp ngực/vai đến bàn nhỏ.
- Nhẹ về trước/phải; không đùi hopper, không tay người.
- Runtime reuse cho `front-paw-near` / `front-paw-far` giống hind-leg.
- Cấm bốn chân Fox, cấm vẽ cả hai paw trên một ô.

### 6. `head.png`

- Đầu chibi lớn, 3/4 nhìn **phải**.
- **Không mắt** (không tròng, không mí khép, không highlight mắt).
- **Không tai** (tai là `rear-ear` / `front-ear`).
- Có má, mũi nhỏ, miệng, lông crown/má đủ chỗ gắn tai và overlay mắt.
- Cổ/nối thân vẽ đủ. Cấm closed-head, cấm `closedSrc`.

### 7–8. `eyes-open.png` / `eyes-closed.png`

- Chỉ đôi mắt; cùng canvas, alignment, scale, lighting với nhau.
- Overlay khớp lên `head` (hốc mắt 3/4: mắt gần lớn hơn mắt xa).
- Open: hai mắt mở, cùng element/lineage.
- Closed: mí khép / cười nhẹ, **cùng vị trí**.
- Không vẽ lại đầu, tai, mũi, má. Không gộp hai trạng thái một layer.

### 9. `front-ear.png` — tai camera-facing

- Tai **trước / gần camera**, dài, visual weight lớn hơn `rear-ear`.
- Gốc dưới (pivot), ngọn lên-trước hoặc hơi phải; không che hết mặt nếu glow.
- Không mirror rear-ear. Không đầu, không mắt, không tai kia.

### 10. `tail.png`

- Pompom nhỏ; gốc về phía thân/trái, không đuôi cáo.
- Đủ gốc để giấu dưới/sau hông. Không thân, không chân.

### 11. `attack-trail.png` — Burst Ram

- Vệt lao **ngang**, hướng phải: dash / after-image / ribbon element.
- **Không** hình thỏ, không orb bay, không beam ranged, không impact nổ tại chỗ.
- Occupancy 40–50% ô; glow không tràn ô kề.
- Bind `effects.attack.trail`. Marker rig: `attack-release`.

### 12. `impact.png`

- Burst va chạm ram tại target: nổ/vòng/ember đúng element.
- Không trail dài, không projectile, không pet, không `fire-bunny-hit-<target>`.
- Một impact dùng được mọi target. Bind `effects.attack.impact`.

---

## 5. Cấm tuyệt đối

- Redesign Bunny giữa các ô / giữa các level thành species khác
- Full-body master → crop layer
- Text, label, grid trên sheet 12 ô
- Tách 4 chân `rear-far` / `rear-near` / `front-far` / `front-near` kiểu Fox
- `projectile.png`, `attack-cast.png`, `effect-front` làm đạn
- `head` có mắt hoặc tai
- Một layer mắt chứa cả mở và nhắm
- Mirror tai near/far; mirror không thay perspective
- Overlap ô; VFX chạm ô bên
- Subject chiếm gần hết ô (phá crop)
- Đổi `hopper-base` track/target chỉ để khớp artwork

---

## 6. Checklist nghiệm thu (Codex / Studio)

- [ ] Sheet đúng 3×4, đúng 12 subject, đúng thứ tự mục 3
- [ ] PNG RGBA hoặc cyan phẳng; không caro
- [ ] Tách thành `layers/*.png` và `effects/attack-trail.png`, `effects/impact.png`
- [ ] `hind-leg.png` bind cả `hind-leg-far` và `hind-leg-near`
- [ ] `front-paw.png` bind cả `front-paw-far` và `front-paw-near`
- [ ] `eyes-*` cùng canvas, parent `head`, blink đúng
- [ ] Manifest **không** có `effects.attack.projectile`
- [ ] Idle: tai `front-ear` / `rear-ear` đối pha; walk hop dùng `hind-leg-near`; attack squash + `attack-release` → trail rồi impact
- [ ] Silhouette đọc được: đầu lớn, tai dài, thân gọn, đùi to, paw nhỏ, đuôi chấm
- [ ] Level 2/3 vẫn là cùng lineage, chỉ già hơn / VFX mạnh hơn

---

## 7. Bàn giao

```text
docs/pet-production/bunny-production-spec.md   ← file này
assets/inbox/<element>-bunny/level-<n>/layer-sheet.png
[+ assembly-ref.png tùy chọn, file riêng]

Codex tách 12 ô →
  public/assets/pets/<element>-bunny/level-<n>/layers/
  public/assets/pets/<element>-bunny/level-<n>/effects/
  assets/pets/<element>-bunny/level-<n>/asset.json  extends hopper-base
```

ChatGPT Web: một ImageGen = một sheet 12 ô. Không xuất từng layer. Không sửa rig. Sau khi Codex gắn manifest, chỉnh X/Y/scale/origin trên Asset Studio.
