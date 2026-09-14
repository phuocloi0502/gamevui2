# Pet prompt template — GameVui Asset Studio

Đây là khung để Codex điền prompt cho từng pet dựa trên `docs/pets-catalog.md`. Không gửi nguyên file này sang ChatGPT web.

Workflow có đúng hai giai đoạn:

```text
Giai đoạn 1: full preview PNG → người dùng duyệt / yêu cầu sửa
Giai đoạn 2: chỉ sau APPROVED → tạo các ảnh PNG layer độc lập
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

Không biến cấp tiến hóa thành species khác. Mỗi level có một bộ PNG riêng và không ghi đè artwork của level khác.

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

## Giai đoạn 2 — prompt tạo ảnh layer sau khi full preview đã APPROVED

Prompt này được gửi riêng sau khi người dùng đã duyệt cả hai PNG. Đính kèm lại chính xác `<PET_ID>-preview-open.png` và `<PET_ID>-preview-closed.png` đã duyệt.

```text
ĐÂY LÀ CÔNG ĐOẠN TẠO ẢNH LAYER SAU KHI ARTWORK ĐÃ ĐƯỢC DUYỆT.

Ảnh reference:
- `<PET_ID>-preview-open.png` là artwork mở mắt đã APPROVED.
- `<PET_ID>-preview-closed.png` là artwork nhắm mắt đã APPROVED.

MỤC TIÊU:
- Dùng hai artwork APPROVED làm chuẩn nhận diện và art direction.
- Tạo mới từng bộ phận thành ảnh PNG độc lập để Codex ghép trong Phaser.
- Đây là tác vụ Image Generation/image editing có kiểm soát, không phải thao tác crop ảnh cơ học.
- Không tạo ZIP, thư mục package, README, JSON hoặc code.

ĐƯỢC PHÉP TẠO MỚI VÀ RECONSTRUCT:
- Chủ động vẽ lại từng bộ phận như một artwork layer hoàn chỉnh dựa trên thiết kế APPROVED.
- Vẽ đầy đủ cả vùng đang thấy và vùng bị các bộ phận khác che khuất.
- Được làm sạch biên, sửa vùng giao nhau, bổ sung lông/texture/ánh sáng hợp lý và điều chỉnh nhẹ hình học ở phần bị che để layer hoạt động độc lập.
- Được suy luận chi tiết không nhìn thấy khi cần, miễn là tự nhiên, đúng anatomy, cùng art style và khi ghép lại vẫn tái hiện đúng pet APPROVED.
- Không cần giữ nguyên từng pixel của preview. Ưu tiên layer sạch, hoàn chỉnh và dùng tốt cho animation hơn việc crop chính xác từng pixel.
- Vùng nhìn thấy rõ trong preview vẫn là chuẩn chính cho identity, màu sắc, chất liệu, hình dáng và lighting.
- `body.png`, `leg.png` và `tail.png` phải là bộ phận hoàn chỉnh, không phải mảnh crop bị thiếu.
- `head-closed.png` dùng ảnh nhắm mắt APPROVED làm chuẩn, khớp canvas/alignment với `head.png` và chỉ khác trạng thái mắt.
- `elemental-effect.png` được phép tái tạo sạch, đầy đủ và cân đối theo ngôn ngữ VFX trong preview.

GIỚI HẠN SÁNG TẠO:
- Không đổi species, evolution level, identity, khuôn mặt, silhouette tổng thể, tỷ lệ, hướng nhìn, palette chính hoặc combat identity.
- Không thêm anatomy, phụ kiện, pattern, spell hoặc dấu hiệu nhận diện mới không có cơ sở từ artwork APPROVED.
- Không tạo full preview mới, biến thể mới, pose mới hoặc góc nhìn mới.
- Không tạo animation frame, sprite sheet, GIF, video, code hoặc manifest JSON.

DANH SÁCH ẢNH PHẢI TẠO:
- `body.png`
- `head.png`
- `head-closed.png`
- `tail.png`
- `leg.png`
- `shadow.png`
- `elemental-effect.png`

QUY TẮC ẢNH:
- Mỗi output là một PNG riêng và chỉ chứa đúng bộ phận của slot đó.
- Bộ phận phải hoàn chỉnh cả phần nhìn thấy và phần được reconstruct, đủ để xoay/tween không lộ khoảng trống.
- Không crop tai, đuôi, glow, smoke hoặc particle thuộc chính slot đó.
- Không chứa text, watermark, UI, frame, bộ phận khác, shadow hoặc effect ngoài slot.
- `head.png` và `head-closed.png` phải cùng canvas, kích thước, alignment, silhouette và lighting.
- `leg.png` là một texture chân hoàn chỉnh có thể reuse khi species cho phép.
- `shadow.png` chỉ chứa ground shadow.
- `elemental-effect.png` chỉ chứa effect, không chứa body, head, tail hoặc ground shadow.
- Nền trong suốt thật nếu hỗ trợ; nếu không, dùng cyan phẳng tuyệt đối `#00FFFF`, không gradient và không phản chiếu cyan lên artwork.

KHÔNG TẠO `asset.json`:
- Codex sẽ tạo manifest theo `packages/asset-core/src/types.ts`.
- Không tự đoán schema hoặc thêm field không có trong contract.

SAU KHI TẠO ĐỦ ẢNH:
- Kiểm tra có đúng bảy PNG và mọi ảnh mở được.
- Trả từng PNG riêng với đúng tên file; không đóng ZIP.
- Không tạo thêm file ngoài danh sách.
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

Sau khi người dùng tải các PNG:

```text
assets/inbox/<PET_ID>/level-<EVOLUTION_LEVEL>/
```

Codex sẽ kiểm tra alpha/kích thước/crop/halo, chuẩn hóa PNG sang `public/assets/pets/<PET_ID>/level-<EVOLUTION_LEVEL>/`, tạo `assets/pets/<PET_ID>/level-<EVOLUTION_LEVEL>/asset.json`, chọn rig phù hợp, preview và validation. Không đổi `status` thành `ready` trước khi kiểm tra trực tiếp.
