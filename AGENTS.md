# Game Asset Production Guide

## Repo hiện tại

- Mục đích: sản xuất asset và frontend preview, chạy Docker tại cổng 3333.
- Đọc `README.md` và `docs/asset-workflow.md` để biết layout thực tế.
- Contract thực thi: `packages/asset-core/src/types.ts`; ưu tiên contract này hơn ví dụ JSON bên dưới.
- Rig dùng chung: `assets/rigs/`; mỗi lineage có ba cấp tiến hóa và pet kế thừa rig bằng `extends` trong `assets/pets/<lineage-id>/level-<n>/asset.json`.
- ID cấp tiến hóa dùng `<lineage-id>-level-<n>` và manifest bắt buộc có `lineageId`, `evolutionLevel` (1, 2 hoặc 3). Hiện có: Fire Fox Level 1, Water Fox Level 2, Wind Fox Level 1 và Shadow Fox Level 2.
- PNG production: `public/assets/`; reference Fire Fox: `public/references/fire-fox/concept-board.png`.
- Fire Fox Level 1 đã có PNG alpha và 4 clip puppet dùng chung; đọc `assets/pets/fire-fox/level-1/PRODUCTION.md` trước khi chỉnh sửa. Tai còn gắn đầu; vòng lửa biến dạng từ một ảnh.
- Người dùng đã cho phép xử lý PNG bằng code để tách nền/chuẩn hóa sau ImageGen. Giữ bản gốc tại `assets/pets/fire-fox/level-1/source/` và tái xuất bằng script.

## Phân công ChatGPT web và Codex

Đây là quy ước bắt buộc của dự án:

- ChatGPT web chịu trách nhiệm tạo hoặc chỉnh sửa artwork raster bằng Image Generation.
- Codex chịu trách nhiệm code, cấu trúc asset, tách nền/chuẩn hóa PNG bằng code, manifest, Phaser renderer, animation, preview, validation và Docker.
- Codex không tự gọi ImageGen cho dự án này. Khi thiếu artwork, hãy viết prompt production-ready và hướng dẫn đặt file vào `assets/inbox/`, rồi tiếp tục xử lý các phần code có thể làm độc lập.
- Nếu ChatGPT web đọc được repo qua GitHub, đó chỉ là nguồn tham khảo cho prompt và contract. Không giả định ChatGPT web có thể commit/push PNG; kết nối GitHub chuẩn là read-only.
- Không dùng ảnh placeholder để giả vờ là production asset.
- Giữ file gốc người dùng đưa vào `assets/inbox/` hoặc `assets/<kind>/<id>/source/`; không ghi đè file gốc.

### Giới hạn công việc Codex để tiết kiệm quota

Với mỗi lượt tích hợp asset hoặc chỉnh UI, Codex mặc định chỉ làm các việc sau:

- kiểm tra kích thước và alpha tự động;
- sửa manifest và code cần thiết;
- không chạy test/build;
- không tự mở preview, chụp screenshot hoặc nghiệm thu bằng mắt.

Người dùng tự kiểm tra trực quan bằng UI Asset Studio. Chỉ chạy test/build hoặc mở preview khi người dùng yêu cầu rõ ràng trong lượt hiện tại. Gom các chỉnh sửa trong cùng yêu cầu thành một lượt xử lý.

Quy trình chuyển giao:

```text
ChatGPT web tạo ảnh
        ↓ download PNG
assets/inbox/<lineage-id>/level-<n>/
        ↓ Codex kiểm tra và xử lý
public/assets/<kind>/<lineage-id>/level-<n>/
        ↓ manifest + Phaser preview
Asset Studio tại localhost:3333
```

Chi tiết nằm trong `docs/workflow-chatgpt-web-assets.md`. Khi người dùng nói “tạo asset”, trước hết xác định họ đang muốn prompt cho ChatGPT web hay muốn Codex xử lý/integrate một file đã có.

## Mục đích

File này là bộ nhớ làm việc lâu dài cho Codex khi tạo hoặc tích hợp asset cho dự án game này.

Khi yêu cầu liên quan đến hình ảnh, model 2D, animation hoặc hiệu ứng, hãy đọc file này trước khi hành động. Chỉ dẫn trực tiếp mới nhất của người dùng luôn ưu tiên hơn các mặc định trong file.

Mục tiêu của hệ thống là:

> Tạo asset gốc, đồng nhất về art direction, tách thành PNG trong suốt khi có ích, rồi dùng Phaser 3 + TypeScript để ghép layer và tạo animation chủ yếu bằng code.

Asset bao gồm nhưng không giới hạn:

- pet;
- nhân vật người chơi, NPC và quái;
- boss;
- item, trang bị và vật phẩm gacha;
- cây cối, đá, công trình, props và environment;
- projectile, skill effect, aura và VFX;
- icon và hình minh họa phục vụ gameplay.

## Ý đồ sáng tạo hiện tại

- Tạo thiết kế mới; không sao chép nguyên nhân vật hoặc asset từ reference.
- Reference video được dùng chủ yếu để hiểu pose, tỷ lệ, nhịp chuyển động và cảm giác animation.
- Fire Fox đã được người dùng chọn làm mẫu thẩm mỹ đầu tiên: cute/chibi, fantasy, silhouette rõ, màu ấm và có effect lửa sống động.
- Hình Fire Fox concept có rendering mềm và giàu gradient hơn video cartoon viền đậm. Khi hai reference xung đột, mặc định dùng concept Fire Fox làm art direction và video làm motion reference, trừ khi người dùng chọn khác.
- Mọi asset thuộc cùng một game phải có cảm giác cùng thế giới: tỷ lệ, ánh sáng, độ chi tiết, độ dày viền, saturation và chất lượng effect cần nhất quán.

## Nguyên tắc kiến trúc

Không triển khai model bằng một cây kế thừa cứng bắt mọi đối tượng có cùng bộ phận. Dùng composition và data-driven configuration.

Ví dụ, một pet có thể gồm `body`, `head`, `ears`, `eyes`, `tail` và `effect`; slime có thể chỉ có `blob`, `eyes`; ghost có thể có `body`, `eyes`, `aura`.

Điểm chung là contract:

- định danh và loại asset;
- canvas, kích thước hiển thị và scale;
- origin, anchor và ground point;
- danh sách layer tùy chọn và thứ tự render;
- animation states/capabilities;
- hitbox hoặc interaction bounds nếu cần;
- shadow và effect attachment points;
- metadata dùng bởi gameplay.

Phaser xem một model đã ghép là một `Container` hoặc game object cấp cao duy nhất. Di chuyển, scale, flip và visibility ở cấp root phải tác động toàn bộ model.

## Chọn phương pháp animation

Ưu tiên layered PNG + code animation khi chuyển động có thể biểu diễn bằng position, rotation, scale, alpha, tint hoặc thay texture đơn giản.

Dùng sprite sheet cho:

- lửa, khói, sét, nước, aura và projectile có biến dạng hình học;
- animation vẽ tay mà tween không tái tạo được;
- attack hoặc reaction đặc biệt cần silhouette thay đổi mạnh.

Có thể dùng hybrid: body/head/tail chạy tween, mắt đổi texture để blink, effect chạy sprite sheet.

Không yêu cầu AI tạo hàng loạt frame gần giống nhau nếu độ nhất quán không đáng tin cậy. Ưu tiên tạo một master design sạch, tách layer có chủ đích và để Phaser sinh chuyển động. Nếu cần sprite sheet, kiểm tra từng frame về hình dáng, palette, ánh sáng, scale và anchor trước khi dùng.

## Quy trình cho một asset mới

### 1. Xác định brief

Trước khi tạo, xác định đủ các thông tin có ảnh hưởng trực tiếp:

- loại asset và vai trò gameplay;
- art direction hoặc reference được ưu tiên;
- góc nhìn và hướng quay;
- kích thước hiển thị dự kiến;
- animation bắt buộc;
- bộ phận/effect cần chuyển động độc lập;
- biến thể màu, skin hoặc element;
- định dạng đầu ra và nơi tích hợp.

Nếu thiếu chi tiết không làm thay đổi đáng kể thiết kế, dùng mặc định trong file này và tiếp tục. Chỉ hỏi lại khi lựa chọn có thể tạo ra kết quả khác hẳn ý người dùng.

### 2. Lập Asset Specification

Trước asset production quy mô lớn, ghi rõ:

- silhouette và tỷ lệ;
- palette;
- canvas và safe padding;
- layer manifest;
- anchors/attachment points;
- animation list và timing;
- file outputs;
- tiêu chí nghiệm thu.

Với một dòng asset mới, hoàn thiện một flagship asset trước rồi kiểm chứng bằng asset thứ hai có anatomy khác. Không sản xuất hàng loạt khi renderer và animation contract chưa được chứng minh.

### 3. Tạo master artwork

- Nền trong suốt nếu asset sẽ được đưa vào game.
- Không để chữ, nhãn, UI, watermark hoặc background dính vào PNG production.
- Không crop tai, đuôi, vũ khí, glow hoặc particle.
- Ánh sáng và bóng đổ phải theo cùng quy ước của game.
- Nếu shadow cần điều khiển độc lập, xuất shadow thành layer riêng.
- Giữ master artwork hoàn chỉnh để làm chuẩn đối chiếu khi tách layer.

### 4. Tách layer

Chỉ tách các phần thực sự cần điều khiển độc lập. Mỗi layer phải:

- có alpha sạch, không viền nền hoặc halo bẩn;
- khớp chính xác với master khi đặt tại anchor mặc định;
- có canvas hoặc metadata đủ để ghép lại không đoán vị trí;
- chứa phần hình bị che cần thiết để tránh lộ khoảng trống khi xoay/di chuyển;
- không chứa shadow/effect ngoài ý muốn.

Các slot phổ biến, đều là tùy chọn:

```text
shadow
back_effect
back_appendage
body
rear_limb
front_limb
head
ears_or_horns
face
eyes
equipment
front_appendage
front_effect
```

Tên slot mô tả vai trò render, không bắt buộc tên anatomy cụ thể.

### 5. Tạo config

Config là nguồn dữ liệu để renderer dựng model. Một cấu trúc khởi đầu:

```json
{
  "id": "fire_fox",
  "kind": "pet",
  "canvas": { "width": 256, "height": 256 },
  "displayScale": 1,
  "origin": { "x": 0.5, "y": 1 },
  "ground": { "x": 0.5, "y": 0.88 },
  "layers": [
    { "slot": "shadow", "texture": "fire_fox/shadow", "z": 0 },
    { "slot": "body", "texture": "fire_fox/body", "z": 10 },
    { "slot": "head", "texture": "fire_fox/head", "z": 20 },
    {
      "slot": "tail_effect",
      "texture": "fire_fox/tail_fire",
      "z": 30,
      "attachTo": "tail_tip"
    }
  ],
  "animations": {
    "idle": "pet_idle_soft",
    "walk": "pet_walk_quadruped",
    "attack": "fire_fox_attack",
    "hurt": "pet_hurt_soft"
  },
  "capabilities": ["blink", "tail_sway", "fire_effect"]
}
```

Đây là schema định hướng, không phải API cố định. Khi codebase đã có type/schema thật, cập nhật file này để trỏ về nguồn chuẩn và không duy trì hai schema mâu thuẫn.

### 6. Tích hợp và kiểm tra trong Phaser

Khi người dùng yêu cầu tích hợp:

- preload texture/atlas;
- dựng layer theo config và z-order;
- áp anchor/attachment point;
- chạy animation ở animation controller dùng chung;
- kiểm tra scale, flip, movement và cleanup;
- kiểm tra chất lượng ở kích thước hiển thị thật, không chỉ ở ảnh phóng lớn;
- kiểm tra hiệu năng khi có nhiều model cùng xuất hiện.

Không thay đổi gameplay hoặc kiến trúc ngoài phạm vi asset/animation nếu người dùng chưa yêu cầu.

## Animation contract đề xuất

Các state cơ bản tùy loại model:

- `idle`: gần như luôn cần;
- `move` hoặc `walk`/`fly`/`swim`: khi model di chuyển;
- `attack` hoặc `cast`: khi có hành động chiến đấu;
- `hurt`: phản hồi trúng đòn;
- `defeat`/`death`: với enemy hoặc character;
- `spawn`/`despawn`: summon, VFX hoặc vật thể sinh ra tạm thời;
- `interact`: props/NPC khi có tương tác.

Animation controller cần hỗ trợ:

- clip dùng chung theo archetype;
- override theo từng model;
- nhiều channel chạy đồng thời;
- loop, one-shot, transition và interrupt priority;
- event marker để đồng bộ damage, projectile, sound và particle;
- random phase/variation nhỏ để nhiều model không chuyển động đồng bộ máy móc.

Với Fire Fox, video reference chỉ chứng minh rõ `idle`: một vòng khoảng 1 giây, chuyển động tổng thể nhẹ, effect lửa ở đuôi thay đổi độc lập. Blink, walk, attack và hurt cần được thiết kế bổ sung, không suy diễn là đã có trong video.

## Quy ước file

Ưu tiên cấu trúc:

```text
assets/
  <kind>/
    <lineage-id>/
      level-<n>/
        master.png
        layers/
          <slot>.png
        effects/
          <effect-name>.png
        animations/
          <clip-name>.png
        asset.json
```

Quy ước:

- tên thư mục, file và id dùng lowercase kebab-case hoặc convention sẵn có của codebase;
- không trộn hai convention trong cùng dự án;
- texture key phải ổn định và không phụ thuộc đường dẫn tạm;
- sprite sheet phải có metadata frame size/FPS/loop;
- giữ source chất lượng cao khi output game được resize hoặc đóng atlas.

## Quality gate

Một asset chỉ được coi là hoàn tất khi:

- đúng brief và không sao chép reference;
- đọc được silhouette ở kích thước gameplay;
- đúng art direction của dòng asset;
- PNG production có transparency sạch;
- không crop, không watermark, không background thừa;
- layer ghép lại khớp master;
- anchor và attachment points không bị nhảy giữa state/frame;
- animation loop không giật ở điểm nối;
- effect không che mặt hoặc thông tin gameplay quan trọng;
- tên file và config hợp lệ;
- đã sẵn sàng để người dùng preview trong Phaser; Codex chỉ tự nghiệm thu khi được yêu cầu rõ ràng.

## Cách báo cáo kết quả

Khi hoàn thành một tác vụ asset, nêu ngắn gọn:

- asset nào đã tạo hoặc sửa;
- art/motion decisions quan trọng;
- file đầu ra;
- animation/config đã có;
- điều gì đã được kiểm tra;
- hạn chế còn lại hoặc bước tiếp theo thực sự cần thiết.

Không tuyên bố sprite sheet, layer transparency hoặc animation đã đạt nếu chưa kiểm tra trực tiếp.
