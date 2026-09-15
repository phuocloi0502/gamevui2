# Game Asset Production Guide

## Repo hiện tại

- Mục đích: sản xuất asset và frontend preview, chạy Docker tại cổng 3333.
- Đọc `README.md` và `docs/asset-workflow.md` để biết layout thực tế.
- Nếu yêu cầu là tạo artwork cho một pet mới bằng ChatGPT Web, bắt buộc đọc `docs/chatgpt-pet-layer-factory.md` trước khi tạo bất kỳ ảnh nào; sau đó đọc `docs/pets-catalog.md` và `packages/asset-core/src/petCatalog.ts` để resolve species recipe.
- Contract thực thi: `packages/asset-core/src/types.ts`; ưu tiên contract này hơn ví dụ JSON bên dưới.
- Rig dùng chung: `assets/rigs/`; mỗi lineage có ba cấp tiến hóa và pet kế thừa rig bằng `extends` trong `assets/pets/<lineage-id>/level-<n>/asset.json`.
- `fox-quadruped` là rig mặc định cho Fox sản xuất mới; Fire Fox Level 1 và các pet legacy giữ rig/manifest hiện tại, không migrate ngầm.
- ID cấp tiến hóa dùng `<lineage-id>-level-<n>` và manifest bắt buộc có `lineageId`, `evolutionLevel` (1, 2 hoặc 3). Hiện có: Fire Fox Level 1, Water Fox Level 2, Wind Fox Level 1 và Shadow Fox Level 2.
- PNG production: `public/assets/`; reference Fire Fox: `public/references/fire-fox/concept-board.png`.
- Fire Fox Level 1 đã có PNG alpha và 4 clip puppet dùng chung; đọc `assets/pets/fire-fox/level-1/PRODUCTION.md` trước khi chỉnh sửa. Tai còn gắn đầu; vòng lửa biến dạng từ một ảnh.
- Người dùng đã cho phép xử lý PNG bằng code để tách nền/chuẩn hóa sau ImageGen. Giữ bản gốc tại `assets/pets/fire-fox/level-1/source/` và tái xuất bằng script.

## Phân công ChatGPT web và Codex

Đây là quy ước bắt buộc của dự án:

- ChatGPT web chịu trách nhiệm tạo hoặc chỉnh sửa artwork raster bằng Image Generation: **một layer sheet** chứa mọi character layer, Pet Visual VFX, Combat VFX của đúng evolution stage, và ô cuối `assembly-ref` (pet đã lắp để đối chiếu ghép), theo factory guide, catalog và executable recipe. Khi người dùng chỉ yêu cầu artwork, ChatGPT Web không chỉnh code.
- Codex chịu trách nhiệm architecture, manifest, rig, renderer, Asset Studio, animation, validation, integration, tách ô layer sheet, tách nền/chuẩn hóa PNG bằng code; preview/master được ghép từ production layers.
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
ChatGPT web tạo 1 layer sheet
        ↓ download PNG
assets/inbox/<lineage-id>/level-<n>/layer-sheet.png
        ↓ Codex tách ô, kiểm tra và xử lý
public/assets/<kind>/<lineage-id>/level-<n>/
        ↓ manifest + Phaser preview
Asset Studio tại localhost:3333
```

Chi tiết nằm trong `docs/workflow-chatgpt-web-assets.md`. Khi người dùng nói “tạo asset”, trước hết xác định họ đang muốn prompt cho ChatGPT web hay muốn Codex xử lý/integrate một file đã có.

## Mục đích

File này là bộ nhớ làm việc lâu dài cho Codex khi tạo hoặc tích hợp asset cho dự án game này.

Khi yêu cầu liên quan đến hình ảnh, model 2D, animation hoặc hiệu ứng, hãy đọc file này trước khi hành động. Chỉ dẫn trực tiếp mới nhất của người dùng luôn ưu tiên hơn các mặc định trong file.

Mục tiêu của hệ thống là:

> Tạo các production layer gốc, đồng nhất về art direction và trong suốt, rồi dùng Phaser 3 + TypeScript để ghép preview/master và tạo animation chủ yếu bằng code.

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

Có thể dùng hybrid: body/head/tail chạy tween, hai layer `eyes-open`/`eyes-closed` luân phiên visibility để blink, effect chạy sprite sheet.

Không yêu cầu AI tạo hàng loạt frame gần giống nhau nếu độ nhất quán không đáng tin cậy. Với pet cần animation, ImageGen tạo một layer sheet các bộ phận isolated; Phaser ghép preview rồi sinh chuyển động. Không dùng master artwork đã lắp để crop/tách và reconstruct layer làm workflow chuẩn cho pet mới. Nếu cần sprite sheet animation, kiểm tra từng frame về hình dáng, palette, ánh sáng, scale và anchor trước khi dùng.

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

### 3. Tạo production layers

Với pet cần animation, production layers là source of truth sau khi Codex tách từ layer sheet. ImageGen không xuất từng file layer và không dùng quy trình `master artwork đã lắp → crop/tách → reconstruct`. Mỗi ô trên sheet phải:

- có alpha sạch, không viền nền hoặc halo bẩn;
- khớp đúng thiết kế chung khi renderer ghép tại anchor mặc định;
- có canvas hoặc metadata đủ để ghép lại không đoán vị trí;
- là artwork hoàn chỉnh, gồm cả phần sẽ bị layer khác che, để tránh lộ khoảng trống khi xoay/di chuyển;
- không chứa shadow/effect ngoài ý muốn.

Chỉ tách phần cần z-order, tween/rotation, animation hoặc visibility/state riêng. Không over-split nếu không có lợi ích animation.

Các slot phổ biến, đều là tùy chọn:

```text
shadow
effect-back
tail_or_appendage
body
independent_limbs
head
ears_or_horns
face
eyes
equipment
effect-front
particles
```

Tên slot mô tả vai trò render, không bắt buộc tên anatomy cụ thể.

Fox sản xuất mới mặc định dùng `shadow`, `effect-back`, `tail`, `rear-far`, `rear-near`, `body`, `front-far`, `front-near`, `head`, `eyes-open`, `eyes-closed`, `effect-front`, `particles`; effect/particles/shadow là optional. `head.png` không chứa mắt. `eyes-open` và `eyes-closed` là hai layer thật, cùng parent `head`, cùng canvas/alignment và lần lượt khai báo `blink: "open"`/`blink: "closed"`. Bốn chân là bốn artwork riêng, không dùng một `leg.png` chung. Level 1/2 dùng `tail` bình thường; Level 3 có thể chọn `tail` đơn hoặc các ID string optional như `tail-left-outer` và `tail-center`. Manifest và clip target trực tiếp các ID đó, renderer không được hard-code số lượng đuôi.

Khi prompt layer sheet Fox, bắt buộc khóa pose `3/4 side view facing right` và mô tả riêng camera-facing/far side, foreshortening, overlap, depth cho từng ô chân. `front-near` lớn/rõ, gần thẳng đứng và hơi hướng trước/phải; `front-far` hẹp/nhỏ, lùi vào trong/sau thân. `rear-near` có đùi sau lớn, hock/knee curve rõ và nghiêng chéo trước/phải; `rear-far` có đùi hẹp, lùi sau/vào trong và bị thân overlap theo perspective. Near/far không mirror, near có visual weight lớn hơn, bốn bàn chân cùng ground plane, mỗi layer chân chứa phần chân trên/đùi còn `body` không chứa đùi. Cấm frontal leg, side-profile 90°, bốn silhouette giống nhau và elemental pattern làm đổi silhouette chân.

Không tạo closed-head asset, không dùng `closedSrc`, và không gộp hai trạng thái mắt vào một layer. Manifest production phải khai báo riêng layer `eyes-open` và `eyes-closed`.

Pet visual VFX (`effect-back`, `effect-front`, `particles`) là layer luôn gắn với model. Combat VFX là binding optional, riêng theo từng evolution stage trong `effects.attack`: `cast`, `trail`, `projectile`, `impact` và semantic special do recipe quy định. Không dùng `effect-front` làm projectile, không bắt species melee có projectile và không gộp impact vào projectile. `effects.projectile` chỉ là field legacy được resolver đọc thành `effects.attack.projectile`; không dùng field legacy cho manifest mới.

Asset Studio là nguồn chỉnh presentation sau khi artwork được upload. Layer lưu transform/visibility trong `layers`; từng Combat VFX lưu enabled, trigger, timing, start/end anchor và transform trong `effects.attackPresentation`. UI **Quản lý ảnh pet** có thể thay PNG hiện có và thêm slot optional/VFX còn thiếu do executable recipe khai báo. Không hard-code lại các thông số presentation riêng của pet trong renderer.

Animation editor phải cho phép thêm, nhân bản, xóa track và chọn target từ `Layer.id` hiện có. Đây là đường UI chuẩn để gắn chuyển động riêng cho optional/multi-tail layer; không sửa rig dùng chung chỉ để thêm target của một evolution.

Pivot chân đặt gần khớp nối với body, tail tại gốc đuôi và head gần cổ.

### 4. Ghép preview/master

Sau khi có production layers và manifest, Phaser/renderer ghép model để duyệt. `master.png`/`preview.png` là kết quả kiểm chứng cuối cùng được render từ production layers, không phải source để cắt layer.

### 5. Tạo config

Config là nguồn dữ liệu để renderer dựng model. Không duy trì schema minh họa song song: đọc contract thật tại `packages/asset-core/src/types.ts`, executable species recipe tại `packages/asset-core/src/petCatalog.ts` và manifest hiện có trong `assets/pets/<lineage-id>/level-<n>/asset.json`.

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
        layers/
          <slot>.png
        effects/
          <effect-name>.png
        animations/
          <clip-name>.png
        asset.json
        # master.png / preview.png chỉ thêm sau khi render từ layers để kiểm chứng
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
