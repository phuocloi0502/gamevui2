# Pet prompt template — GameVui Asset Studio

Đây là khung để Codex điền prompt cho từng pet dựa trên `docs/pets-catalog.md`. Không gửi nguyên file này sang ChatGPT web.

Workflow có đúng hai giai đoạn:

```text
Giai đoạn 1: full preview PNG → người dùng duyệt / yêu cầu sửa
Giai đoạn 2: chỉ sau APPROVED → tạo layer PNG + đóng <pet-id>.zip
```

Catalog có 50 lineage theo dạng `<element>-<species>` với 10 species và 5 element. Mỗi lineage có ba cấp tiến hóa; stage ID là `<element>-<species>-level-<1|2|3>`. Cùng một species phải giữ nguyên silhouette; element chỉ thay palette, material, particle, aura, projectile/VFX và behavior nhỏ. Không tạo renderer riêng cho từng pet.

## Thông tin Codex phải lấy từ catalog

```text
PET_ID: <element-species, lowercase-kebab-case>
EVOLUTION_LEVEL: <1 / 2 / 3>
PET_NAME: <display name>
SPECIES: <species section trong docs/pets-catalog.md>
ELEMENT: <fire / water / wind / light / shadow>
RARITY: <do người dùng chỉ định; catalog không tự định nghĩa rarity>
ROLE: <species role trong catalog>
RANGE: <species attack range trong catalog>
MAIN_SKILL: <species main skill trong catalog>
SILHOUETTE: <species silhouette trong catalog>
PARTS: <species-specific parts trong catalog>
ELEMENT_BEHAVIOR: <element behavior trong catalog>
```

Tiến hóa phải đọc rõ nhưng vẫn cùng một lineage:

- Level 1: hình thể nhỏ/gọn, chi tiết và VFX tiết chế;
- Level 2: anatomy accents phát triển hơn, element rõ hơn;
- Level 3: silhouette và VFX mạnh nhất nhưng vẫn cute/chibi và dễ đọc.

Không biến cấp tiến hóa thành species khác. Mỗi level được package thành bộ PNG
riêng và không ghi đè artwork của level khác.

Với Fox, phải giữ: low quadruped body, oversized chibi head, large triangular ears, short legs, very large curved tail; role agile elemental caster; range medium; skill `Element Tail Bolt`.

## Giai đoạn 1 — prompt tạo full preview mở mắt và nhắm mắt

Mục tiêu là tạo **đúng hai PNG tổng thể** để duyệt: một bản mở mắt như artwork chính và một bản nhắm mắt để làm chuẩn cho `head-closed.png` ở giai đoạn package. Hai ảnh phải là cùng một pet, cùng một thiết kế và cùng một bố cục; bản thứ hai chỉ thay đổi trạng thái mắt.

```text
Tạo đúng HAI ảnh PNG tổng thể cho pet game 2D fantasy sau đây. Đây là hai bản preview để người dùng duyệt, chưa phải yêu cầu tạo package.

ẢNH 1 — BẢN CHÍNH MỞ MẮT:
- Pet ở trạng thái idle/ground pose chuẩn, mắt mở rõ ràng.
- Tên file: <PET_ID>-preview-open.png.

ẢNH 2 — BẢN ĐỒNG BỘ NHẮM MẮT:
- Sao chép chính xác thiết kế, canvas, vị trí, scale, silhouette, lighting, palette, shadow và effect của ẢNH 1.
- Chỉ thay đôi mắt thành trạng thái nhắm tự nhiên, dễ đọc; không đổi biểu cảm, hình dạng đầu, lông mặt hoặc bất kỳ bộ phận nào khác.
- Tên file: <PET_ID>-preview-closed.png.

Không tạo thêm ảnh thứ ba, biến thể, góc nhìn khác hoặc pose khác.

PET_ID: <PET_ID>
EVOLUTION_LEVEL: <EVOLUTION_LEVEL>
Tên: <PET_NAME>
Species: <SPECIES>
Element: <ELEMENT>
Rarity: <RARITY>
Role: <ROLE>
Attack range: <RANGE>
Main skill: <MAIN_SKILL>

BẮT BUỘC TUÂN THỦ SPECIES CATALOG:
- Giữ nguyên silhouette/anatomy nhận diện của <SPECIES>: <SILHOUETTE>.
- Element <ELEMENT> chỉ thay palette, material, particle, aura, projectile/VFX và behavior nhỏ.
- Không biến pet thành species khác, không đổi anatomy để làm effect nổi bật.
- Species-specific parts phải gồm: <PARTS>.
- Element behavior phải theo catalog: <ELEMENT_BEHAVIOR>.

ART DIRECTION:
- Cùng thế giới cute/chibi fantasy với Fire Fox, Water Fox và Wind Fox.
- Rendering painterly mềm, gradient giàu chiều sâu, silhouette rõ ở kích thước gameplay nhỏ.
- Pet <RARITY> được thể hiện bằng chất liệu, ánh sáng, tỷ lệ tinh tế và VFX; không nhồi chi tiết làm rối silhouette.
- Reference chỉ dùng cho art direction, tỷ lệ và ground pose; không sao chép khuôn mặt, pattern, pose hoặc thiết kế nhận diện.

OUTPUT:
- Chỉ xuất đúng hai PNG đầy đủ ở trên, mỗi ảnh gồm pet hoàn chỉnh và effect đặc trưng.
- Canvas vuông khuyến nghị 1254×1254 px hoặc lớn hơn để giữ chi tiết.
- Hai ảnh phải có cùng canvas và cùng vị trí pixel của subject; subject ở giữa, safe padding rộng quanh mọi bộ phận, glow, khói và particle.
- Không crop tai, đuôi, vũ khí, glow hoặc particle.
- Không chữ, label, logo, watermark, UI, frame, background cảnh hoặc shadow dính vào pet.
- Nền trong suốt thật nếu hỗ trợ; nếu không, nền cyan phẳng tuyệt đối #00FFFF.
- Không checkerboard giả transparency, không cyan halo và không cyan phản chiếu lên subject.
- Nền trong suốt/nền cyan phải giống hệt nhau giữa hai ảnh.
- Tên file bắt buộc: `<PET_ID>-preview-open.png` và `<PET_ID>-preview-closed.png`.

DỪNG SAU KHI TẠO ĐỦ HAI PNG NÀY. Không tạo layer, không tạo ZIP, không tạo animation frame và không tạo asset.json.
```

## Giai đoạn 2 — prompt package sau khi full preview đã APPROVED

Prompt này được gửi riêng sau khi người dùng đã duyệt cả hai PNG. Đính kèm lại chính xác `<PET_ID>-preview-open.png` và `<PET_ID>-preview-closed.png` đã duyệt.

```text
ĐÂY LÀ CÔNG ĐOẠN PACKAGE SAU KHI ARTWORK ĐÃ ĐƯỢC DUYỆT.

File reference duy nhất:
- `<PET_ID>-preview-open.png` là artwork mở mắt đã APPROVED.
- `<PET_ID>-preview-closed.png` là artwork nhắm mắt đã APPROVED.

MỤC TIÊU DUY NHẤT:
- Dùng artwork APPROVED làm nguồn hình ảnh duy nhất.
- Tách các bộ phận thành PNG độc lập để Codex ghép trong Phaser.
- Đóng đúng một file ZIP tên <PET_ID>.zip.

NGHIÊM CẤM:
- Không thiết kế lại pet.
- Không tạo concept mới hoặc biến thể mới.
- Không thay đổi identity, khuôn mặt, silhouette, anatomy, palette, lighting, tỷ lệ, hướng nhìn hoặc ground pose.
- Không tạo lại full artwork khác với hai file reference đã APPROVED.
- Không tạo animation frame, sprite sheet, GIF, video, code, manifest JSON hoặc file ngoài cấu trúc bên dưới.
- Không tự thêm layer vì thấy “đẹp hơn”. Chỉ tạo đúng slot được yêu cầu.
- Không tạo artwork độc lập ngoài các layer được yêu cầu.

ĐƯỢC PHÉP RECONSTRUCT TỐI THIỂU:
- Được phép vẽ bù/reconstruct tối thiểu các vùng bị che hoặc không nhìn thấy trong artwork APPROVED khi cần để tạo `body.png`, `head-closed.png`, `leg.png`, `tail.png` và `elemental-effect.png`.
- Reconstruction chỉ được suy ra trực tiếp từ artwork APPROVED và dùng để hoàn thiện phần bị thiếu khi layer được tách ra; không được thêm ý tưởng thiết kế mới.
- Giữ tuyệt đối identity, anatomy, silhouette, tỷ lệ, hướng nhìn, palette, material, lighting, texture language, ground pose và mức độ chi tiết của artwork APPROVED.
- Không mở rộng reconstruction ra vùng đang nhìn thấy rõ; không sửa phần đúng chỉ để làm đẹp hơn.
- Với `head-closed.png`, chỉ reconstruct phần mí/mắt nhắm tối thiểu; toàn bộ head, tai, lông mặt, lighting và alignment phải khớp `head.png`.
- Với `body.png`, chỉ vẽ bù phần thân bị head/tail/chân che; không thay đổi hình dáng thân nhìn thấy trong preview.
- Với `leg.png`, chỉ vẽ bù phần chân bị body che để có một leg hoàn chỉnh có thể reuse; giữ đúng hướng, độ dài, lông, màu và lighting của chân trong preview.
- Với `tail.png`, chỉ vẽ bù phần đuôi bị body che nếu cần; không đổi đường cong, độ lớn hoặc silhouette đuôi.
- Với `elemental-effect.png`, chỉ hoàn thiện effect đã có trong preview; không thêm spell, particle, aura hoặc hình dạng effect mới.
- Nếu phải đoán một vùng lớn hoặc không thể reconstruct mà vẫn khớp artwork, dừng layer đó và báo rõ, không tự sáng tạo.

NẾU KHÔNG THỂ TÁCH MỘT LAYER MÀ VẪN GIỮ ĐÚNG ARTWORK ĐÃ APPROVED:
- Không tự sáng tạo phần thay thế.
- Giữ layer ở trạng thái chưa hoàn thành và báo rõ layer nào không thể tách sạch.

CẤU TRÚC ZIP BẮT BUỘC:

<PET_ID>/
  README.md
  preview.png
  source/
    source-artwork.png
    source-artwork-closed.png
  layers/
    <slot-1>.png
    <slot-2>.png
    ...
  effects/
    <element-effect>.png

QUY TẮC FILE:
- `preview.png` phải là bản copy nguyên vẹn của `<PET_ID>-preview-open.png` đã APPROVED.
- `source/source-artwork.png` là bản gốc mở mắt chất lượng cao dùng để tách; giữ nguyên, không ghi đè.
- `source/source-artwork-closed.png` là bản gốc nhắm mắt chất lượng cao dùng riêng cho `head-closed.png`; giữ nguyên, không ghi đè.
- Mỗi layer chỉ chứa đúng bộ phận của slot đó, có alpha sạch và đủ phần bị che để xoay/tween không lộ khoảng trống; phần vẽ bù chỉ ở mức tối thiểu cần thiết.
- Không crop tai, đuôi, vũ khí, glow, smoke hoặc particle.
- Không chứa background, checkerboard, text, watermark, UI, shadow hoặc effect ngoài slot được yêu cầu.
- `head-closed.png` phải cùng canvas, alignment, silhouette và lighting với `head.png`; chỉ đổi mắt sang nhắm.
- `leg.png` là một texture leg dùng lại khi species cho phép reuse.
- Effect chỉ chứa effect, không chứa body, head, tail hoặc shadow.

KHÔNG TẠO `asset.json`:
- Codex sẽ tạo manifest theo `packages/asset-core/src/types.ts`.
- Không tự đoán schema hoặc thêm field không có trong contract.

SAU KHI TẠO ĐỦ FILE:
- Kiểm tra ZIP có đúng tên, đúng thư mục, đúng số file và mọi PNG mở được.
- Không xuất thêm ảnh rời ngoài ZIP.
- Chỉ trả về file `<PET_ID>.zip` và một ghi chú ngắn về các file đã có.
```

## Slot và kích thước runtime baseline cho Fox

Các kích thước này lấy từ Fire Fox/Wind Fox runtime hiện tại. Species khác anatomy không được ép dùng Fox layout.

| Slot | Runtime PNG | Nội dung |
|---|---:|---|
| `master.png` / `preview.png` | 600×600 | Bản ghép preview trong Asset Studio |
| `body.png` | 308×225 | Body/chest, không head/tail/legs |
| `head.png` | 302×318 | Head + hai tai + face |
| `head-closed.png` | 302×318 | Overlay chính xác với head mở |
| `tail.png` | 228×220 | Một large curved tail hoàn chỉnh |
| `leg.png` | 70×123 | Một leg texture reuse cho bốn instance |
| `shadow.png` | 320×64 | Ground shadow riêng |
| `elemental-effect.png` | 101×163 | Tail effect/projectile tĩnh tham chiếu |

Fox slots:

```text
shadow
tail
element-tail-effect
rear-leg-far
front-leg-far
body
rear-leg-near
front-leg-near
head
head-closed
```

Fox anchors cần bảo toàn khi tách:

```text
root
ground
head-root
mouth
tail-root
tail-tip
projectile-origin
```

## Handoff cho Codex

Sau khi người dùng tải ZIP:

```text
assets/inbox/<PET_ID>/level-<EVOLUTION_LEVEL>/<PET_ID>-level-<EVOLUTION_LEVEL>.zip
```

Codex sẽ kiểm tra alpha/kích thước/crop/halo, chuẩn hóa PNG sang `public/assets/pets/<PET_ID>/level-<EVOLUTION_LEVEL>/`, tạo `assets/pets/<PET_ID>/level-<EVOLUTION_LEVEL>/asset.json`, chọn rig phù hợp, preview và validation. Không đổi `status` thành `ready` trước khi kiểm tra trực tiếp.
