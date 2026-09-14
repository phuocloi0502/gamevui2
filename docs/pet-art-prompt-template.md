# Pet production prompt template — GameVui Asset Studio

Đây là khung để tạo artwork raster cho pet mới bằng ChatGPT web. Nguồn species/element là `docs/pets-catalog.md`; contract runtime là `packages/asset-core/src/types.ts`.

## Workflow bắt buộc

```text
specification → production layers độc lập → asset.json + rig → Phaser preview/master → duyệt
```

Production layer là source of truth. Không bắt đầu bằng full/master artwork rồi crop, tách hoặc reconstruct để tạo layer. `master.png`/`preview.png` chỉ được export từ bộ production layers sau khi tích hợp; ChatGPT web không tạo chúng trong bước sản xuất PNG.

Concept/full-art cũ chỉ được dùng làm reference cho identity, silhouette và art direction. Mỗi layer phải được tạo mới như một artwork hoàn chỉnh, bao gồm cả phần sẽ bị layer khác che.

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

- Mỗi output là một PNG riêng, chỉ chứa đúng slot được yêu cầu.
- Nền trong suốt thật; nếu công cụ không hỗ trợ, dùng cyan phẳng tuyệt đối `#00FFFF`, không checkerboard giả, gradient hay cyan reflection.
- Không text, label, logo, watermark, UI, frame hoặc background cảnh.
- Không lẫn body part, ground shadow hoặc effect của slot khác.
- Không crop silhouette, fur, glow, smoke hoặc particle thuộc chính slot.
- Safe padding đủ cho filtering và chuyển động.
- Mỗi anatomy layer phải hoàn chỉnh cả vùng thấy được và vùng sẽ bị che; khớp nối cần đủ hình để rotate/tween không hở.
- Các layer phải nhất quán về camera 3/4, hướng nhìn, tỷ lệ, palette, ánh sáng, rendering và ground pose dù được tạo độc lập.
- Không tạo animation frame, sprite sheet, GIF, video, code, JSON, ZIP, `master.png` hoặc `preview.png`.
- Không tự đoán thêm layer. Chỉ tạo danh sách đã chốt trong specification.

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
layers/head-closed.png     # optional blink variant qua closedSrc
effects/effect-front.png   # optional; chỉ là visual layer trước pet
effects/particles.png      # optional
effects/attack-cast.png    # optional; Combat VFX lúc chuẩn bị đánh
effects/projectile.png     # optional; chỉ khi species recipe là ranged projectile
effects/impact.png         # optional; Combat VFX độc lập tại mục tiêu
```

Bốn chân là bốn artwork khác nhau. Tuyệt đối không tạo một `leg.png` để reuse cho cả bốn chân trong Fox production mới. Mỗi chân phải có đúng phối cảnh xa/gần và trước/sau của nó, đồng thời có phần trên hoàn chỉnh để giấu dưới body.

Pivot dự kiến khi tích hợp:

- `rear-far`, `rear-near`, `front-far`, `front-near`: gần khớp nối trên của chân với body;
- `tail` và từng tail group: tại gốc đuôi;
- `head`: gần cổ;
- effect/particles: tại attachment tự nhiên của effect.

`head.png` và `head-closed.png` phải có cùng canvas, kích thước, vị trí pixel, silhouette, ánh sáng và pivot; chỉ trạng thái mắt thay đổi. Tai mặc định nằm trong head, trừ khi thật sự cần animation riêng.

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
Tạo bộ PRODUCTION LAYERS độc lập cho pet game 2D sau. Không tạo full artwork, master hoặc preview trước.

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
- Low quadruped body, đầu chibi lớn, tai tam giác lớn, bốn chân ngắn, đuôi lớn; góc nhìn 3/4 và quay cùng một hướng ở mọi layer.
- Rendering painterly mềm, gradient có chiều sâu, silhouette rõ ở kích thước gameplay nhỏ.
- Giữ nhất quán tuyệt đối camera, tỷ lệ, palette, lighting, material và ground pose giữa mọi PNG.
- Element behavior: <ELEMENT_BEHAVIOR>.
- Evolution treatment: <mô tả level nhưng không đổi species>.

SOURCE-OF-TRUTH:
- Chính các PNG layer là artwork production và là source of truth.
- Tạo từng bộ phận trực tiếp như artwork độc lập; không crop/tách từ full artwork và không dựa vào việc reconstruct sau đó.
- Vẽ đầy đủ cả phần sẽ bị body/head/tail khác che để mỗi layer rotate/tween không lộ khoảng trống.

OUTPUT CHÍNH XÁC:
<liệt kê các file bắt buộc và optional đã chọn từ Fox production contract>

QUY TẮC CHÂN:
- rear-far.png, rear-near.png, front-far.png, front-near.png là bốn artwork chân độc lập.
- Mỗi chân thể hiện đúng vị trí trước/sau và near/far, có phần khớp trên hoàn chỉnh, không chứa body hay chân khác.
- Không tạo leg.png dùng chung.

QUY TẮC HEAD:
- head.png chứa head/face và tai nếu tai không được tách riêng theo specification.
- head-closed.png (nếu yêu cầu) overlay chính xác với head.png và chỉ đổi mắt sang nhắm.

QUY TẮC TAIL:
- Mỗi tail layer là một artwork hoàn chỉnh với gốc đuôi rõ và padding đủ khi xoay.
- Nếu specification dùng multi-tail, tạo đúng từng tail ID đã liệt kê; không tạo thêm tail và không gộp các tail cần animation riêng.

QUY TẮC FILE:
- Mỗi file là một PNG riêng, isolated subject, clean alpha/transparent background.
- Không chữ, watermark, UI, frame, scenery, checkerboard giả hoặc thành phần của slot khác.
- Không crop; giữ safe padding quanh toàn bộ slot.
- Không tạo JSON, code, ZIP, animation frame, sprite sheet, master.png hay preview.png.

Trả từng PNG riêng với đúng tên file và dừng khi đủ danh sách.
```

## Baseline runtime cho Fox bình thường

Đây là kích thước khởi đầu của template Asset Studio, không phải yêu cầu ép méo source. Codex có thể điều chỉnh theo anatomy sau khi kiểm tra.

| Slot | Runtime baseline | Pivot/origin gợi ý |
|---|---:|---|
| `shadow` | 320×64 | center |
| `tail` | 228×220 | gốc đuôi, khoảng `0.85, 0.85` |
| mỗi chân | 70×123 | khớp trên, khoảng `0.5, 0.15` |
| `body` | 308×225 | center |
| `head`, `head-closed` | 302×318 | gần cổ, khoảng `0.5, 0.88` |

Effect và multi-tail không có kích thước cứng; chọn canvas đủ padding và khai báo transform trong `asset.json`.

## Handoff cho Codex

Đặt file vào:

```text
assets/inbox/<PET_ID>/level-<EVOLUTION_LEVEL>/layers/
assets/inbox/<PET_ID>/level-<EVOLUTION_LEVEL>/effects/
```

Codex kiểm tra alpha/kích thước/crop/halo, giữ source, chuẩn hóa sang `public/assets/pets/`, tạo manifest dùng `fox-quadruped`, ghép preview bằng Phaser và chỉ sau đó mới export `master.png`/`preview.png`. Không đổi status thành `ready` trước validation.
