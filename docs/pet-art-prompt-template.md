# Pet production prompt template — GameVui Asset Studio

Đây là companion template chuyên cho Fox. Trước khi dùng, phải đọc `docs/chatgpt-pet-layer-factory.md`; species semantics nằm ở `docs/pets-catalog.md`, còn slot/filename/required/optional/runtimeSize cuối cùng do `packages/asset-core/src/petCatalog.ts` quyết định.

## Workflow bắt buộc

```text
specification → một layer sheet (ô tách biệt) → Codex tách PNG → asset.json + rig → Phaser preview/master → duyệt
```

ImageGen chỉ xuất một PNG chứa mọi slot. Production layer sau khi tách vẫn là source of truth cho Phaser. Không bắt đầu bằng full/master artwork đã lắp rồi crop anatomy. `master.png`/`preview.png` chỉ được export từ bộ production layers sau khi tích hợp.

Concept/full-art cũ chỉ được dùng làm reference cho identity, silhouette và art direction. Mỗi ô trên sheet phải được vẽ như một artwork hoàn chỉnh, bao gồm cả phần sẽ bị layer khác che.

Chỉ yêu cầu layer riêng khi cần z-order, tween/rotation, animation hoặc visibility/state riêng. Không over-split lông, tai, mặt hay effect nếu renderer không cần điều khiển chúng riêng.

## Thông tin cần điền

```text
PET_ID: <element-species, lowercase-kebab-case>
EVOLUTION_LEVEL: <1 | 2 | 3>
PET_NAME: <display name>
SPECIES: <species trong docs/pets-catalog.md>
ELEMENT: <fire | water | wind | light | shadow>
RARITY: <do người dùng chỉ định>
ROLE: <species role>
RANGE: <species attack range>
MAIN_SKILL: <species main skill>
SILHOUETTE: <species silhouette>
PARTS: <species-specific parts>
ELEMENT_BEHAVIOR: <element behavior>
PRODUCTION_LAYERS: <danh sách layer cần thiết>
```

Level 1 gọn và tiết chế; Level 2 phát triển anatomy accent/element; Level 3 có silhouette và VFX mạnh nhất nhưng vẫn cùng lineage, cute/chibi và dễ đọc. Không biến evolution thành species khác.

## Contract PNG dùng chung

- ImageGen tạo đúng một PNG layer sheet cho cả evolution stage.
- Sheet là lưới ô tách biệt; không lắp full pet, không master, không preview.
- Nền trong suốt thật; nếu công cụ không hỗ trợ, dùng cyan phẳng tuyệt đối `#00FFFF`, không checkerboard giả, gradient hay cyan reflection.
- Mỗi ô chỉ chứa đúng một slot; không lẫn body part, ground shadow hoặc effect của slot khác.
- Cho phép caption filename nhỏ dưới ô, không đè artwork. Không logo, watermark, UI hay frame cảnh.
- Không crop silhouette, fur, glow, smoke hoặc particle thuộc chính slot.
- Safe padding đủ trong từng ô cho filtering và chuyển động.
- Mỗi anatomy cell phải hoàn chỉnh cả vùng thấy được và vùng sẽ bị che; khớp nối cần đủ hình để rotate/tween không hở.
- Mọi ô phải nhất quán về camera 3/4, hướng nhìn, tỷ lệ, palette, ánh sáng, rendering và ground pose.
- Không tạo animation frame, sprite sheet chuyển động, GIF, video, code, JSON, ZIP, `master.png` hoặc `preview.png`.
- Không phát minh slot ngoài executable recipe. Có thể tự chọn optional slot được recipe hỗ trợ; bỏ ô đó nếu không dùng, không vẽ placeholder.

## Fox production contract

Fox giữ low quadruped body, oversized chibi head, large triangular ears, short legs và tail lớn; role agile elemental caster, range medium, skill `Element Tail Bolt`.

Fox bình thường dùng các file sau:

```text
layers/shadow.png          # optional
effects/effect-back.png    # optional
layers/tail.png
layers/rear-far.png
layers/rear-near.png
layers/body.png
layers/front-far.png
layers/front-near.png
layers/head.png
layers/eyes-open.png       # đôi mắt mở, layer con của head
layers/eyes-closed.png     # đôi mắt nhắm, layer blink độc lập
effects/effect-front.png   # optional; chỉ là visual layer trước pet
effects/particles.png      # optional
effects/attack-cast.png    # optional; Combat VFX lúc chuẩn bị đánh
effects/projectile.png     # optional; chỉ khi species recipe là ranged projectile
effects/impact.png         # optional; Combat VFX độc lập tại mục tiêu
```

Trong danh sách này, `effect-back`, `effect-front`, `particles` là Pet Visual VFX gắn với model. `attack-cast`, `projectile`, `impact` là Combat VFX của đúng evolution stage; chúng xuất hiện theo attack lifecycle và không tham gia z-order thường trực của pet.

Bốn chân là bốn artwork khác nhau trong cùng pose **3/4 side view facing right**. Tuyệt đối không tạo một `leg.png` để reuse, không mirror near/far và không dùng cùng silhouette cho cả bốn chân. Mỗi chân phải có đúng phối cảnh xa/gần và trước/sau, đồng thời chứa phần chân trên/đùi hoàn chỉnh để giấu dưới body; `body.png` không chứa đùi trước hoặc đùi sau.

Pivot dự kiến khi tích hợp:

- `rear-far`, `rear-near`, `front-far`, `front-near`: gần khớp nối trên của chân với body;
- `tail` và từng tail group: tại gốc đuôi;
- `head`: gần cổ;
- effect/particles: tại attachment tự nhiên của effect.

`head.png` không chứa mắt. `eyes-open.png` và `eyes-closed.png` chỉ chứa đôi mắt, phải có cùng canvas, kích thước, vị trí pixel, ánh sáng và pivot; chỉ trạng thái mắt thay đổi. Hai file mắt phải overlay chính xác lên head. Tai mặc định nằm trong head, trừ khi thật sự cần animation riêng.

Z-order mặc định từ sau ra trước:

```text
shadow
effect-back
tail hoặc tail groups
rear-far
rear-near
body
front-far
front-near
head
effect-front
particles
```

Optional layer không có trong thiết kế thì bỏ hẳn, không tạo PNG rỗng.

Không dùng `effect-front.png` làm projectile. Combat VFX phải theo đúng species recipe và bind riêng qua `effects.attack`; projectile chỉ tồn tại với skill ranged có file `projectile.png`, còn `impact.png` là asset độc lập.

### Multi-tail / evolution đặc biệt

Evolution đặc biệt được thay `tail.png` bằng số lượng tail layer cần thiết, ví dụ:

```text
layers/tail-left-outer.png
layers/tail-left-inner.png
layers/tail-center.png
layers/tail-right-inner.png
layers/tail-right-outer.png
```

Mỗi tail là artwork độc lập, hoàn chỉnh, có gốc đuôi rõ để đặt pivot và có ID kebab-case tương ứng trong manifest. Không gộp thành một texture nhiều đuôi nếu các đuôi cần z-order hoặc animation riêng. Không bắt buộc số lượng cụ thể và không đặt tên theo enum “nine-tail”.

## Prompt production cho Fox mới

```text
Tạo ĐÚNG MỘT PNG LAYER SHEET chứa tất cả production layers của pet game 2D sau. Không tạo từng file layer riêng. Không tạo full pet đã lắp, master hoặc preview.

PET_ID: <PET_ID>
EVOLUTION_LEVEL: <EVOLUTION_LEVEL>
Tên: <PET_NAME>
Species: Fox
Element: <ELEMENT>
Rarity: <RARITY>
Role: agile elemental caster
Attack range: medium
Main skill: Element Tail Bolt

IDENTITY VÀ ART DIRECTION:
- Cute/chibi fantasy cùng thế giới với các Fox reference đã cung cấp, nhưng là thiết kế gốc.
- Low quadruped body, đầu chibi lớn, tai tam giác lớn, bốn chân ngắn, đuôi lớn; pose cố định 3/4 side view facing right ở mọi ô.
- Rendering painterly mềm, gradient có chiều sâu, silhouette rõ ở kích thước gameplay nhỏ.
- Giữ nhất quán tuyệt đối camera, tỷ lệ, palette, lighting, material và ground pose giữa mọi ô trên cùng một ảnh.
- Element behavior: <ELEMENT_BEHAVIOR>.
- Evolution treatment: <mô tả level nhưng không đổi species>.

LAYOUT SHEET:
- Một ảnh duy nhất, lưới ô đều, khoảng cách rõ giữa các ô, nền trong suốt hoặc cyan #00FFFF.
- Mỗi ô là một bộ phận isolated; không xếp thành con cáo hoàn chỉnh.
- Caption nhỏ dưới mỗi ô đúng filename. Caption không đè artwork.
- Thứ tự ô trái → phải, trên → dưới theo danh sách OUTPUT.

SOURCE-OF-TRUTH:
- Mỗi ô là artwork production hoàn chỉnh, gồm cả phần sẽ bị body/head/tail khác che.
- Không vẽ full pet rồi cắt; không reconstruct sau này.
- Codex sẽ tách từng ô thành PNG runtime.

OUTPUT — mỗi mục một ô:
<liệt kê các file bắt buộc và optional đã chọn từ Fox production contract>

QUY TẮC CHÂN — bốn ô riêng rear-far, rear-near, front-far, front-near:
- Cả bốn cùng anatomy/style/palette/material/lighting của pet, nhưng mỗi chân có góc camera, silhouette và perspective depth riêng.
- front-near.png: camera-facing front leg; đầy đủ từ vai/phần chân trên tới bàn chân; lớn và rõ hơn front-far; gần thẳng đứng nhưng hơi hướng trước/phải; thấy rõ mặt trên + mặt trước bàn chân.
- front-far.png: far-side front leg; hẹp và nhỏ hơn front-near; lùi vào trong/sau thân, ít thấy mặt ngoài phần vai/đùi trước; foreshortening rõ; bàn chân nhỏ hơn do perspective.
- rear-near.png: camera-facing rear leg; đùi sau lớn, hock/knee curve rõ; nghiêng chéo về trước/phải; bàn chân lớn và có khối 3D rõ.
- rear-far.png: far-side rear leg; đùi hẹp hơn và có cảm giác bị thân overlap/che một phần; lùi về sau và vào trong; bàn chân nhỏ hơn rear-near.
- Near có visual weight lớn hơn far; perspective depth phải đọc được khi xem từng ô riêng; bốn bàn chân phải chạm cùng ground plane khi ráp pet.
- Mỗi chân chứa luôn phần chân trên/đùi tới khớp, kể cả vùng bị che; ô body không chứa đùi trước hoặc đùi sau.
- Họa tiết nguyên tố bám theo surface/anatomy của đúng chân, không làm thay đổi silhouette.
- Ghi rõ camera-facing side/far side, foreshortening, overlap và depth cho từng ô chân.
- Không dùng một chân chung, không mirror near/far, không tạo chân frontal, side-profile 90°, hoặc bốn chân cùng silhouette.

QUY TẮC HEAD:
- Ô head.png chứa cấu trúc đầu/mặt và tai nếu tai không được tách riêng, nhưng không chứa mắt.
- Ô eyes-open.png và eyes-closed.png chỉ chứa đôi mắt, overlay chính xác trên head; hai ô chỉ khác trạng thái mắt.

QUY TẮC TAIL:
- Mỗi ô tail là một artwork hoàn chỉnh với gốc đuôi rõ và padding đủ khi xoay.
- Nếu specification dùng multi-tail, mỗi tail ID một ô; không gộp các tail cần animation riêng.

QUY TẮC FILE:
- Chỉ trả về một PNG layer sheet.
- Không chữ ngoài caption filename, không watermark, UI, frame, scenery, checkerboard giả.
- Không JSON, code, ZIP, animation frame, sprite sheet chuyển động, master.png hay preview.png.

Dừng sau một ảnh khi đủ mọi ô trong danh sách.
```

## Baseline runtime cho Fox bình thường

Đây là kích thước khởi đầu của template Asset Studio, không phải yêu cầu ép méo source. Codex có thể điều chỉnh theo anatomy sau khi kiểm tra.

| Slot | Runtime baseline | Pivot/origin gợi ý |
|---|---:|---|
| `shadow` | 320×64 | center |
| `tail` | 228×220 | gốc đuôi, khoảng `0.85, 0.85` |
| mỗi chân | 70×123 | khớp trên, khoảng `0.5, 0.15` |
| `body` | 308×225 | center |
| `head`, `eyes-open`, `eyes-closed` | 302×318 | gần cổ, khoảng `0.5, 0.88` |

Mỗi layer multi-tail dùng runtime canvas 228×220 như tail đơn; effect không có kích thước cứng nên cần canvas đủ padding và transform trong `asset.json`.

## Handoff cho Codex

Đặt file vào:

```text
assets/inbox/<PET_ID>/level-<EVOLUTION_LEVEL>/layer-sheet.png
```

Codex tách từng ô thành `layers/` và `effects/`, kiểm tra alpha/kích thước/crop/halo, giữ source, chuẩn hóa sang `public/assets/pets/`, tạo manifest dùng `fox-quadruped`, ghép preview bằng Phaser và chỉ sau đó mới export `master.png`/`preview.png`. Không đổi status thành `ready` trước validation.
