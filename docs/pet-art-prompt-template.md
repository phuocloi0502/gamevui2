# Prompt template tạo pet 2D cho GameVui Asset Studio

> Quy trình bắt buộc: tạo **một PNG đầy đủ để duyệt trước**. Chỉ khi người dùng xác nhận artwork đã đạt mới tạo `pet.zip` gồm các layer/effect để Codex tích hợp. Thay các phần trong dấu `<...>` trước khi gửi prompt sang ChatGPT web.

## 1. Dữ liệu lấy từ Pets Catalog

Đọc `docs/pets-catalog.md` trước khi điền prompt. Catalog là specification/concept guidance, không phải file để tạo production PNG trực tiếp.

```text
PET_ID: <element-species, lowercase-kebab-case>
PET_NAME: <tên hiển thị>
SPECIES: <fox / bunny / turtle / dragon / owl / wolf / golem / slime / serpent / hawk>
ELEMENT: <fire / water / wind / light / shadow>
RARITY: <common / rare / epic / legendary>
VIEW: 3/4 facing right
PALETTE: <màu chính, màu phụ, highlight>
SIGNATURE_EFFECT: <element-tail-effect / aura / bolt / ...>
```

Quy tắc catalog phải giữ trong mọi prompt:

- ID dùng dạng `<element>-<species>`, viết lower-case kebab-case.
- Mỗi species có năm biến thể Fire, Water, Wind, Light, Shadow.
- Cùng một species phải giữ nguyên silhouette/anatomy nhận diện.
- Element chỉ được thay palette, material, particle, aura, projectile/skill VFX và một ít timing/behavior.
- Không biến một species thành anatomy khác chỉ vì element.
- Với Fox: giữ low quadruped body, oversized chibi head, large triangular ears, short legs và very large curved tail.
- Fox là agile elemental caster, tầm đánh medium, skill chính là `Element Tail Bolt`.
- Các pet khác phải theo species section tương ứng trong catalog và dùng rig archetype phù hợp; không ép mọi species vào Fox rig.

## 2. Prompt giai đoạn A — chỉ tạo PNG đầy đủ để duyệt

Gửi prompt này trước. Ở giai đoạn này **không tạo layer, không tạo sprite sheet và không tạo zip**.

```text
Tạo một artwork PNG đầy đủ cho pet game 2D fantasy production-ready.

Thông tin asset:
- Pet ID: <PET_ID>
- Tên: <PET_NAME>
- Species: <SPECIES>
- Element: <ELEMENT>
- Rarity: <RARITY>
- Góc nhìn: <VIEW>
- Palette: <PALETTE>
- Signature effect: <SIGNATURE_EFFECT>

Catalog constraints:
- Giữ đúng anatomy và silhouette nhận diện của species <SPECIES> theo Pets Catalog.
- Nếu là Fox, bắt buộc giữ low quadruped body, đầu chibi lớn, tai tam giác lớn, chân ngắn và đuôi cong rất lớn.
- Giữ cùng tỷ lệ, ground pose, hướng nhìn và cảm giác gameplay với Fire Fox, Water Fox và Wind Fox hiện có.
- Element <ELEMENT> chỉ thay đổi palette, chất liệu, ánh sáng, particle, aura, projectile và behavior nhỏ; không thay đổi species anatomy.
- Không sao chép nhân vật, khuôn mặt, pattern, pose nhận diện hoặc chi tiết thiết kế từ reference. Chỉ tham khảo art direction, tỷ lệ và chất lượng hoàn thiện.

Art direction:
- Cute/chibi fantasy, painterly mềm, gradient giàu chiều sâu, silhouette rõ và chất lượng premium.
- Pet <RARITY> được thể hiện bằng chất liệu, ánh sáng, độ tinh tế và <SIGNATURE_EFFECT>; không nhồi chi tiết gây rối silhouette.
- Ánh sáng, độ dày viền, saturation và độ hoàn thiện phải cùng một thế giới với các pet hiện có.
- <PALETTE> phải tương phản đủ để pet vẫn đọc rõ ở kích thước gameplay nhỏ.
- <SIGNATURE_EFFECT> phải dễ nhận diện, không che mặt, mắt hoặc thông tin gameplay.

Output duyệt artwork:
- Chỉ xuất một PNG hoàn chỉnh duy nhất, gồm toàn bộ pet và effect đặc trưng.
- Canvas vuông khuyến nghị 1254×1254 px hoặc lớn hơn; đây là master preview source, không phải runtime contract bắt buộc.
- Subject ở giữa canvas, chừa safe padding rộng quanh tai, đuôi, glow, khói và particle.
- Không crop bất kỳ bộ phận nào.
- Không chữ, label, logo, watermark, UI, frame hoặc background cảnh.
- Không thêm ground shadow nếu shadow sẽ được tách thành layer riêng ở giai đoạn B.
- Nền trong suốt thật nếu hỗ trợ; nếu không, dùng cyan phẳng tuyệt đối #00FFFF để Codex chroma-key bằng code.
- Không dùng checkerboard giả transparency và không để cyan/halo nền dính vào subject.
- Tên file: <PET_ID>-preview.png

Đây chỉ là bản để người dùng xem và duyệt. Chưa tạo layer độc lập, chưa tạo animation frame và chưa tạo pet.zip.
```

Sau khi nhận ảnh, người dùng sẽ phản hồi một trong hai dạng:

```text
APPROVED: tạo pet.zip theo prompt giai đoạn B.
```

hoặc:

```text
REVISE: <mô tả chính xác phần cần sửa>; giữ nguyên mọi phần còn lại.
```

## 3. Prompt giai đoạn B — tạo pet.zip sau khi đã duyệt

Chỉ gửi prompt này sau khi PNG giai đoạn A đã được người dùng xác nhận `APPROVED`.

```text
Dùng chính xác artwork <PET_ID>-preview.png đã được APPROVED làm master reference. Không thiết kế lại, không đổi identity, silhouette, palette, lighting, tỷ lệ hoặc vị trí tương đối của pet.

Tạo một package ZIP tên <PET_ID>.zip để Codex tích hợp vào GameVui Asset Studio.

Package phải có cấu trúc:

<PET_ID>/
  README.md
  preview.png
  source/source-artwork.png
  layers/body.png
  layers/head.png
  layers/head-closed.png
  layers/tail.png
  layers/leg.png
  layers/shadow.png
  effects/elemental-effect.png

Quy tắc:
- `preview.png` là bản đầy đủ đã APPROVED, giữ nguyên artwork giai đoạn A.
- `source/source-artwork.png` là file gốc chất lượng cao, không ghi đè và không resize phá chất lượng.
- Chỉ tạo các layer phù hợp với anatomy của species. Không tạo layer rỗng hoặc nhồi nhiều bộ phận không cần điều khiển độc lập.
- Với Fox, dùng các slot body, head, head-closed, tail, một leg dùng lại cho bốn instance, shadow và tail elemental effect.
- `head-closed.png` phải cùng canvas, alignment, silhouette và lighting với `head.png`; chỉ đổi hai mắt sang trạng thái nhắm.
- Body/head phải vẽ đủ phần bị che để có thể dịch, xoay hoặc tween mà không lộ khoảng trống.
- Tail phải là một đuôi hoàn chỉnh; effect chỉ chứa effect, không chứa pet, tail hoặc shadow.
- Mỗi layer có alpha sạch, không text, watermark, UI, background, checkerboard hoặc halo cyan.
- Không crop tai, đuôi, glow, khói hoặc particle.
- Không tạo hàng loạt animation frame gần giống nhau nếu animation có thể do Phaser tween/procedural code xử lý.
- Nếu effect biến dạng mạnh như lửa, khói, nước, aura hoặc projectile, chỉ tạo effect master sạch; Codex sẽ quyết định sprite sheet/code animation.
- Không cần tự tạo `asset.json`; Codex sẽ tạo manifest theo contract thật của repo. Nếu kèm metadata, chỉ coi đó là ghi chú tham khảo, không phải source of truth.

Output toàn bộ PNG với cùng identity và composition của preview đã APPROVED. Không thêm asset ngoài danh sách nếu chưa được yêu cầu.
```

## 4. Kích thước runtime tham chiếu

Các kích thước dưới đây là baseline đã dùng cho Fox runtime trong repo, không phải quy tắc ép mọi species khác anatomy phải dùng y hệt.

| Slot Fox | Runtime PNG | Yêu cầu |
|---|---:|---|
| `master.png` / `preview.png` | 600×600 | Bản ghép idle trong Asset Studio |
| `body.png` | 308×225 | Chỉ body/chest; không đầu, đuôi, chân |
| `head.png` | 302×318 | Head + cả hai tai + face |
| `head-closed.png` | 302×318 | Overlay chính xác với head mở |
| `tail.png` | 228×220 | Một đuôi hoàn chỉnh |
| `leg.png` | 70×123 | Một leg texture dùng cho bốn instance |
| `shadow.png` | 320×64 | Ellipse shadow riêng |
| `elemental-effect.png` | 101×163 | Effect tĩnh/projectile tham chiếu |

Quy tắc source:

- Master source khuyến nghị 1254×1254 hoặc lớn hơn để đủ chi tiết khi tách.
- Source từng layer có thể có kích thước khác nhau; không ép source Fire Fox/Wind Fox phải đồng nhất.
- Codex chuẩn hóa output runtime và đặt layer bằng `x`, `y`, `originX`, `originY`, `z`, `parent`, `scale` theo manifest.
- Fox variants phải giữ cùng silhouette và các anchor species: `root`, `ground`, `head-root`, `mouth`, `tail-root`, `tail-tip`, `projectile-origin`.

## 5. Prompt layer riêng khi cần sửa một layer

```text
Chỉnh duy nhất layer <SLOT> của <PET_NAME> dựa trên artwork đã APPROVED.

Giữ nguyên canvas, vị trí, tỷ lệ, silhouette, identity, hướng nhìn, palette, lighting và toàn bộ phần không được yêu cầu chỉnh. Không thiết kế lại pet.

Layer <SLOT> phải:
- khớp chính xác với master preview đã APPROVED;
- giữ đủ phần bị che cần thiết cho tween/rotation;
- không crop tai, đuôi, glow, particle;
- không chứa background, text, watermark, UI, checkerboard hoặc halo bẩn;
- nếu là `head-closed`, chỉ thay mắt và phải overlay chính xác với `head.png`;
- nếu là effect, chỉ chứa effect, không chứa pet/body/tail/shadow.

Xuất lại đúng PNG production cho layer <SLOT>. Không thay đổi các layer khác.
```

## 6. Handoff sau khi tải ZIP

Đặt file tải xuống vào:

```text
assets/inbox/<PET_ID>/<PET_ID>.zip
```

Không giải nén đè lên source cũ. Codex sẽ kiểm tra package, giữ source bất biến, chuẩn hóa PNG sang `public/assets/pets/<PET_ID>/`, tạo `assets/pets/<PET_ID>/asset.json`, kế thừa rig phù hợp, chạy validation/build và mở preview để nghiệm thu.

Contract thực thi là `packages/asset-core/src/types.ts`. `docs/pets-catalog.md` là specification về species/element; `assets/pets/fire-fox/asset.json` là reference manifest thực tế cho Fox. Không dùng JSON ví dụ cũ trong AGENTS.md làm schema API.

## Checklist trước khi gửi

- [ ] `PET_ID` đúng dạng `<element>-<species>` và lower-case kebab-case.
- [ ] Đã đọc phần species và element tương ứng trong `docs/pets-catalog.md`.
- [ ] Giai đoạn A chỉ có một PNG đầy đủ để duyệt.
- [ ] Đã duyệt artwork trước khi yêu cầu ZIP.
- [ ] Giai đoạn B giữ nguyên master đã duyệt, không redesign.
- [ ] Layer Fox dùng đúng anatomy và kích thước runtime tham chiếu.
- [ ] Các species khác dùng rig/anatomy theo catalog, không ép vào Fox rig.
- [ ] Có `head-closed` nếu pet có blink.
- [ ] Effect độc lập, sạch và không che gameplay information.
- [ ] Không tạo animation frame hàng loạt nếu Phaser có thể tween/procedural animate.

## 7. Ví dụ điền sẵn — Shadow Fox preview

Dùng prompt dưới đây cho **giai đoạn A** nếu muốn tạo Shadow Fox. Chỉ gửi prompt giai đoạn B sau khi đã duyệt PNG này.

```text
Tạo một artwork PNG đầy đủ cho pet game 2D fantasy production-ready.

Pet ID: shadow-fox
Tên: Shadow Fox
Species: Fox
Element: Shadow
Rarity: Rare
Góc nhìn: 3/4 facing right

Đây là một biến thể Fox thuộc hệ Shadow trong cùng game với Fire Fox, Water Fox và Wind Fox. Giữ nguyên silhouette nhận diện của Fox: low quadruped body, oversized chibi head, large triangular ears, short legs và very large curved tail. Đuôi là dấu hiệu species quan trọng nhất.

Shadow Fox là agile elemental caster, tầm đánh medium. Skill chính là Shadow Tail Bolt: cáo tích tụ năng lượng quanh đuôi rồi bắn shadow bolt. Element Shadow thể hiện qua palette dark purple, indigo và blue-black; effect gồm smoke, wisps, dark particles và void haze; gameplay fantasy là drain/weaken.

Art direction:
- Cute/chibi fantasy nhưng premium, thanh lịch, huyền bí và đẹp hơn pet thường.
- Lông obsidian mềm với gradient tím than, indigo và xanh đen; viền rim light tím bạc để silhouette vẫn rõ trên nền tối.
- Mắt lớn màu amethyst hoặc ruby tím đậm, có highlight tinh tế.
- Có một phù hiệu nguyên bản hình trăng khuyết hoặc tinh thể void nhỏ trên trán; không sao chép biểu tượng từ reference.
- Thêm vài chi tiết trang sức bạc đen/amethyst thật tinh tế, không làm rối silhouette.
- Đuôi lớn, cong rõ, có khói bóng tối và wisps bay quanh chóp đuôi; dark particles và void haze phải sạch, dễ tách thành effect.
- Giữ thân và chân đủ rõ, không làm đầu quá nặng hoặc biến cáo thành mèo/sói/rồng.
- Dùng Fire Fox concept làm chuẩn rendering painterly mềm, gradient và độ hoàn thiện. Dùng Water Fox/Wind Fox chỉ tham khảo tỷ lệ, ground pose và cảm giác cùng thế giới. Không sao chép character, face, pattern, pose hoặc chi tiết nhận diện.

Output duyệt artwork:
- Chỉ xuất một PNG hoàn chỉnh duy nhất gồm toàn bộ Shadow Fox và shadow tail effect.
- Canvas vuông khuyến nghị 1254×1254 px hoặc lớn hơn; đây là master preview source, không phải runtime contract bắt buộc.
- Subject ở giữa, safe padding rộng quanh tai, đuôi, smoke, glow và particles; không crop bất kỳ phần nào.
- Không có chữ, logo, watermark, UI, frame, background cảnh hoặc ground shadow dính vào pet.
- Nền trong suốt thật nếu hỗ trợ; nếu không, dùng cyan phẳng tuyệt đối #00FFFF để Codex tách nền bằng code.
- Không checkerboard, không cyan halo và không để cyan phản chiếu lên lông/effect.
- Tên file: shadow-fox-preview.png

Đây chỉ là bản PNG để xem và duyệt. Chưa tạo layer, chưa tạo animation frame và chưa tạo shadow-fox.zip.
```
