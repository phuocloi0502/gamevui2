# Quy trình và hợp đồng asset

## Phạm vi

Repo này sản xuất asset và frontend để kiểm tra chúng. Mục tiêu 100 pet dựa trên rig và clip tái sử dụng, không tạo renderer riêng cho từng pet. Nguồn type chuẩn là `packages/asset-core/src/types.ts`; ví dụ JSON trong tài liệu chỉ minh họa.

## Nguyên tắc layer-first

Với pet cần animation, production bắt đầu từ các artwork layer độc lập:

```text
production layers → asset.json + rig → Phaser ghép → preview/master để duyệt
```

Không dùng `master artwork → crop/tách layer → reconstruct vùng bị che` làm workflow production chuẩn cho pet mới. Mỗi production layer phải được tạo như một artwork hoàn chỉnh ngay từ đầu, gồm cả phần sẽ bị layer khác che, để có thể rotate/tween mà không lộ khoảng trống.

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
| 0 | `shadow` | optional |
| 1 | `effect-back` | optional |
| 2 | `tail` | mặc định bắt buộc |
| 3 | `rear-far` | artwork chân độc lập |
| 4 | `rear-near` | artwork chân độc lập |
| 5 | `body` | bắt buộc |
| 6 | `front-far` | artwork chân độc lập |
| 7 | `front-near` | artwork chân độc lập |
| 8 | `head` | bắt buộc; có thể khai báo `closedSrc` |
| 9 | `effect-front` | optional |
| 10 | `particles` | optional |

`rear-far`, `rear-near`, `front-far`, `front-near` phải trỏ tới bốn PNG production khác nhau. Không dùng một `leg.png` chung cho bốn instance trong contract Fox mới.

`closedSrc` là biến thể nhắm mắt của chính layer `head`; ảnh mở/nhắm phải có cùng canvas, alignment, silhouette và pivot. Không cần tạo layer mắt riêng nếu chỉ cần blink.

### Evolution nhiều đuôi

Evolution đặc biệt có thể thay `tail` bằng số lượng layer tùy ý, ví dụ `tail-left-outer`, `tail-left-inner`, `tail-center`, `tail-right-inner`, `tail-right-outer`. Mỗi layer có `id`, `src`, transform, pivot và `z` riêng như mọi layer khác.

Renderer không biết khái niệm “9 tails”. Clip override của pet target trực tiếp các ID string thực tế. Nếu không có layer `tail`, track `tail` mặc định trong rig được bỏ qua; manifest chỉ cần override/thêm các track cho tail ID cần chuyển động. Không thêm enum hoặc nhánh renderer cho từng số lượng đuôi.

## Thêm pet mới

1. Lập asset specification: silhouette, palette, canvas, production layers, pivot, z-order, animation và output.
2. Tạo từng production PNG độc lập trong `assets/inbox/<lineage-id>/level-<n>/layers/` hoặc `effects/`. Không tạo chúng bằng cách cắt master.
3. Kiểm tra alpha, padding, kích thước và phần anatomy bị che của từng layer.
4. Tạo `assets/pets/<lineage-id>/level-<n>/asset.json`; đường dẫn runtime bắt đầu `/assets/pets/<lineage-id>/level-<n>/`.
5. Chuẩn hóa/copy PNG sang `public/assets/pets/<lineage-id>/level-<n>/` mà không ghi đè source trong inbox.
6. Phaser dựng preview từ manifest. Sau khi ghép đúng mới export `master.png`/`preview.png` làm bằng chứng kiểm chứng.
7. Kiểm tra animation ở kích thước gameplay, loop, blink, flip, transform và layer visibility. Chỉ đổi status thành `ready` sau khi kiểm tra.

## Backward compatibility

Fire Fox Level 1 giữ nguyên `extends: "pet-base"`, manifest, texture dùng chung cho bốn chân và pipeline tái xuất hiện tại. Không migrate asset cũ chỉ để khớp contract mới. Các pet cũ dùng `pet-base` hoặc `quadruped-base` tiếp tục được renderer xử lý như trước.

## Quality gate

Một pet production mới chỉ hoàn tất khi:

- production layers được tạo độc lập và có alpha sạch;
- mọi phần cần chuyển động có vùng bị che được vẽ đầy đủ;
- không crop, watermark, background hoặc effect lẫn sai layer;
- layer ghép thành preview đúng silhouette đã duyệt;
- bốn chân Fox là bốn artwork riêng;
- pivot/attachment không nhảy khi tween;
- `head` và `closedSrc` overlay ổn định;
- animation loop không giật;
- tên file, manifest, parent, z-order và target ID hợp lệ;
- preview/master được tạo từ production layers, không được dùng ngược làm source.

## Fire Fox legacy

Reference chính: `public/references/fire-fox/concept-board.png`. Fire Fox Level 1 là asset legacy đã có clip puppet và master ghép từ layer. Xem `assets/pets/fire-fox/level-1/PRODUCTION.md` cho pipeline tái xuất riêng; giới hạn của asset này không phải contract cho Fox mới.
