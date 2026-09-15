# Quy trình và hợp đồng asset

## Phạm vi

Repo này sản xuất asset và frontend để kiểm tra chúng. Mục tiêu 100 pet dựa trên rig và clip tái sử dụng, không tạo renderer riêng cho từng pet. Nguồn type chuẩn là `packages/asset-core/src/types.ts`; ví dụ JSON trong tài liệu chỉ minh họa.

Đối với artwork production của pet mới bằng ChatGPT Web, dùng `docs/chatgpt-pet-layer-factory.md` làm hướng dẫn chi tiết; file này chỉ mô tả workflow tích hợp và runtime contract.

## Nguyên tắc layer-first

Với pet cần animation, ImageGen xuất một layer sheet các bộ phận isolated:

```text
layer sheet → Codex tách production layers → asset.json + rig → Phaser ghép → preview/master để duyệt
```

Không dùng `master artwork đã lắp → crop/tách layer → reconstruct vùng bị che` làm workflow production chuẩn cho pet mới. Mỗi ô trên sheet phải được tạo như một artwork hoàn chỉnh ngay từ đầu, gồm cả phần sẽ bị layer khác che, để có thể rotate/tween mà không lộ khoảng trống.

`master.png` và `preview.png` là kết quả kiểm chứng được render từ production layers. Chúng không phải source để cắt layer. Một concept hoặc full-art có thể dùng làm art-direction reference, nhưng không được coi là nguồn production để crop.

Chỉ tách một layer khi nó cần ít nhất một trong các khả năng sau:

- z-order riêng;
- tween/rotation riêng;
- animation riêng;
- visibility hoặc state riêng.

Không over-split anatomy nếu renderer không cần điều khiển phần đó độc lập.

## Kế thừa và composition

Manifest chọn rig qua `extends` và khai báo anatomy/effect bằng `layers`. Renderer dùng `Layer.id: string`, không có enum anatomy và không biết ID pet cụ thể. Layer optional được phép vắng mặt; track của rig trỏ tới target không tồn tại sẽ không làm pet lỗi.

Phiên bản hiện tại resolve một cấp rig → pet. `pet-base` được giữ cho Fire Fox và các pet legacy. Fox sản xuất mới dùng `fox-quadruped`; các species bốn chân khác vẫn có thể dùng `quadruped-base`.

## Tọa độ và pivot

Canvas mặc định 512×512 là baseline, không ép kích thước artwork nguồn. `x`/`y` của layer là pixel tương đối với parent; root đặt tại ground point trên sân preview. `originX`/`originY` chuẩn hóa 0..1 và phải đặt tại khớp chuyển động trong chính PNG:

- bốn chân: pivot gần khớp nối chân với body;
- tail hoặc từng tail độc lập: pivot tại gốc đuôi;
- head: pivot gần cổ;
- effect/particles: pivot theo attachment có ý nghĩa với chuyển động.

Layer không có `parent` thuộc root. `z` tăng dần từ sau ra trước; parent phải xuất hiện trước child khi sort theo `z`. Trong một parent, `z` điều khiển thứ tự anh em và toàn bộ nhóm con đi theo transform của parent.

## Fox production contract

Fox bình thường dùng thứ tự sau; các layer ghi optional có thể bỏ:

| Z gợi ý | Layer ID | Yêu cầu |
|---:|---|---|
| 1 | `effect-back` | optional |
| 2 | `tail` | mặc định bắt buộc |
| 3 | `rear-far` | artwork chân độc lập |
| 4 | `rear-near` | artwork chân độc lập |
| 5 | `body` | bắt buộc |
| 6 | `front-far` | artwork chân độc lập |
| 7 | `front-near` | artwork chân độc lập |
| 8 | `head` | bắt buộc; không chứa mắt |
| 8.1 | `eyes-open` | bắt buộc; parent `head`, `blink: "open"` |
| 8.11 | `eyes-closed` | bắt buộc; parent `head`, `blink: "closed"` |
| 9 | `effect-front` | optional |
| 10 | `particles` | optional |

Pet visual VFX như `effect-back`, `effect-front`, `particles` là layer của model. Combat VFX là asset optional riêng theo từng evolution stage và bind qua `effects.attack`, gồm `cast`, `trail`, `projectile`, `impact` hoặc special semantic do species recipe khai báo. Chúng không phải layer render thường xuyên và không được suy ra từ `effect-front`. `effects.projectile` chỉ được giữ để đọc manifest legacy.

Combat VFX giữ cùng skill identity qua Level 1/2/3 nhưng tăng dần độ mạnh hình ảnh; stage folder đã xác định version nên có thể dùng cùng filename như `impact.png`. `impact` thuộc attacker/skill và dùng chung với mọi target phù hợp; reaction/status của target không nằm trong pet artwork package.

Asset Studio lưu phần tinh chỉnh Combat VFX trong `effects.attackPresentation`, keyed bằng cùng semantic ID với `effects.attack`. Mỗi entry có thể bật/tắt và chỉnh trigger (`attack-start`, `attack-release`, `after-primary`), delay, duration/easing, start/end anchor (`pet` hoặc `target`), X/Y, scale, angle, alpha, image origin, depth và mirror theo hướng pet. UI **Quản lý ảnh pet** cho phép thay PNG đã bind hoặc thêm slot optional/VFX còn thiếu trong executable recipe. Đây là presentation data của evolution stage, không phải damage/collision gameplay.

`rear-far`, `rear-near`, `front-far`, `front-near` phải trỏ tới bốn PNG production khác nhau. Không dùng một `leg.png` chung cho bốn instance trong contract Fox mới.

Bốn chân Fox dùng cùng pose `3/4 side view facing right` nhưng khác phối cảnh: near lớn/rõ và có visual weight cao hơn far; front/rear có anatomy tương ứng; near/far không được mirror hoặc dùng cùng silhouette. Mỗi layer chân chứa đầy đủ phần chân trên/đùi tới khớp, còn `body` không chứa đùi. Bàn chân phải cùng ground plane; prompt layer sheet phải nêu rõ camera-facing/far side, foreshortening, overlap và depth cho từng ô chân. Mô tả chi tiết bắt buộc nằm trong `docs/chatgpt-pet-layer-factory.md`.

Không tạo closed-head asset. `head.png` là artwork đầu cố định không chứa mắt. `eyes-open` và `eyes-closed` là hai layer độc lập cùng gắn vào `head`; chúng lần lượt khai báo `blink: "open"` và `blink: "closed"`. Hai PNG mắt chỉ chứa đôi mắt, có cùng canvas, kích thước, alignment, origin và vùng trong suốt; renderer luân phiên visibility của hai layer khi blink. Contract mới không dùng `closedSrc`.

### Evolution nhiều đuôi

Level 1/2 dùng `tail` bình thường. Ở Level 3, Asset Studio cho phép chọn `tail` đơn hoặc khai báo các layer optional `tail-left-outer`, `tail-left-inner`, `tail-center`, `tail-right-inner`, `tail-right-outer`. Mỗi layer có `id`, `src`, transform, pivot và `z` riêng như mọi layer khác.

Animation editor có thể thêm, nhân bản, xóa track và đổi target sang bất kỳ `Layer.id` đang có. Multi-tail vì thế chỉ cần các string ID trong manifest/clip override; renderer không biết hoặc giới hạn số đuôi.

Renderer không biết khái niệm “9 tails”. Clip override của pet target trực tiếp các ID string thực tế. Nếu không có layer `tail`, track `tail` mặc định trong rig được bỏ qua; manifest chỉ cần override/thêm các track cho tail ID cần chuyển động. Không thêm enum hoặc nhánh renderer cho từng số lượng đuôi.

## Thêm pet mới

1. Lập asset specification: silhouette, palette, canvas, production layers, pivot, z-order, animation và output.
2. Tạo một layer sheet rồi để Codex tách vào `assets/inbox/<lineage-id>/level-<n>/layers/` hoặc `effects/`. Không tạo chúng bằng cách cắt master đã lắp.
3. Kiểm tra alpha, padding, kích thước và phần anatomy bị che của từng layer.
4. Tạo `assets/pets/<lineage-id>/level-<n>/asset.json`; đường dẫn runtime bắt đầu `/assets/pets/<lineage-id>/level-<n>/`.
5. Chuẩn hóa/copy PNG sang `public/assets/pets/<lineage-id>/level-<n>/` mà không ghi đè source trong inbox.
6. Phaser dựng preview từ manifest. Sau khi ghép đúng mới export `master.png`/`preview.png` làm bằng chứng kiểm chứng.
7. Kiểm tra animation ở kích thước gameplay, loop, blink, flip, transform và layer visibility. Chỉ đổi status thành `ready` sau khi kiểm tra.

## Backward compatibility

Fire Fox Level 1 giữ nguyên `extends: "pet-base"`, manifest, texture dùng chung cho bốn chân và pipeline tái xuất hiện tại. Không migrate asset cũ chỉ để khớp contract mới. Các pet cũ dùng `pet-base` hoặc `quadruped-base` tiếp tục được renderer xử lý như trước.

## Quality gate

Một pet production mới chỉ hoàn tất khi:

- production layers (sau khi tách sheet) có alpha sạch;
- mọi phần cần chuyển động có vùng bị che được vẽ đầy đủ;
- không crop, watermark, background hoặc effect lẫn sai layer;
- layer ghép thành preview đúng silhouette đã duyệt;
- bốn chân Fox là bốn artwork riêng;
- pivot/attachment không nhảy khi tween;
- `eyes-open` và `eyes-closed` overlay ổn định trên `head` không chứa mắt;
- animation loop không giật;
- tên file, manifest, parent, z-order và target ID hợp lệ;
- preview/master được tạo từ production layers, không được dùng ngược làm source.

## Fire Fox legacy

Reference chính: `public/references/fire-fox/concept-board.png`. Fire Fox Level 1 là asset legacy đã có clip puppet và master ghép từ layer. Xem `assets/pets/fire-fox/level-1/PRODUCTION.md` cho pipeline tái xuất riêng; giới hạn của asset này không phải contract cho Fox mới.
