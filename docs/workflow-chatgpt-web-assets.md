# Workflow tạo ảnh bằng ChatGPT web, code bằng Codex

## Quy tắc

ChatGPT web là nơi tạo và chỉnh sửa ảnh. Codex không dùng quota tạo ảnh cho repo này; Codex chỉ làm phần kỹ thuật sau khi PNG đã có trong workspace.

Theo OpenAI Docs, giới hạn tạo ảnh của ChatGPT là nhóm giới hạn riêng với giới hạn Codex. Tuy nhiên ChatGPT web không tự truy cập thư mục local của dự án, nên cần bước tải file về máy.

## Khi repo đã kết nối GitHub

ChatGPT web có thể đọc nội dung repo được cấp quyền để xem `AGENTS.md`, manifest, code renderer, asset reference và các PNG đã commit. Điều này giúp prompt bám đúng contract của dự án.

Kết nối GitHub chuẩn trong ChatGPT là quyền đọc repository. Nó không tự tạo file, commit hoặc push PNG mới vào repo. Vì vậy vẫn dùng một trong hai đường sau:

```text
ChatGPT web tạo PNG → tải xuống → assets/inbox/ → Codex xử lý và commit/push
```

hoặc:

```text
ChatGPT web tạo PNG → tải xuống → bạn đặt vào assets/inbox/ → Codex xử lý
```

Sau khi Codex commit/push, ChatGPT web có thể đọc phiên bản PNG và code mới từ GitHub ở lần làm việc sau. Repo trên GitHub là nguồn tham khảo đồng bộ; `assets/inbox/` vẫn là điểm nhận asset chưa xử lý trên máy local.

Nếu workspace của bạn có một connector hoặc agent GitHub được cấp quyền ghi riêng, hãy coi đó là workflow khác và kiểm tra quyền trước khi dùng. Không giả định kết nối GitHub đọc-only có thể ghi file.

## Các bước chuẩn

1. Trong ChatGPT web, mở repo GitHub đã kết nối nếu cần đọc contract; dùng prompt asset ở chế độ tạo ảnh hoặc chỉnh sửa ảnh.
2. Yêu cầu ảnh production rõ ràng: PNG, nền trong suốt nếu có thể; không chữ, watermark, UI hoặc background.
3. Tải ảnh xuống máy.
4. Đặt ảnh vào `assets/inbox/<asset-id>/`. Ví dụ:

```text
assets/inbox/fire-fox/
  master.png
  body.png
  head.png
  tail.png
  fire.png
```

5. Nhắn cho Codex: `Xử lý asset trong assets/inbox/fire-fox và tích hợp vào preview.`
6. Codex sẽ kiểm tra mode RGBA, alpha, kích thước, crop, naming, anchors và độ khớp với manifest; sau đó copy kết quả đã chuẩn hóa sang `public/assets/`.
7. Codex cập nhật config, renderer, animation và preview; không tạo lại artwork bằng ImageGen.

## Prompt template cho ChatGPT web

```text
Tạo một asset game 2D production-ready cho <game/kind>.

Asset: <tên và bộ phận>
Reference: <ảnh tham khảo đính kèm, chỉ dùng cho style/shape; không sao chép nhân vật>
Góc nhìn: <front / side / 3/4>
Style: <art direction của game>
Canvas: <kích thước>
Output: PNG, isolated subject, clean alpha/transparent background nếu công cụ hỗ trợ.
Giữ: <palette, silhouette, anatomy, lighting>
Không có: text, label, watermark, UI, background, shadow nếu shadow là layer riêng.
Mục đích: layer dùng trong Phaser; giữ đủ phần bị che để có thể xoay/tween mà không lộ khoảng trống.
Tên file đề xuất: <asset-id>/<slot>.png
```

## Prompt cho các lần chỉnh sửa

Luôn nói rõ điều gì phải giữ nguyên:

```text
Chỉnh đúng phần <X>.
Giữ nguyên canvas, vị trí, tỷ lệ, silhouette, palette, ánh sáng và các phần <Y>.
Không thay đổi các phần khác.
Xuất lại PNG cùng kích thước để có thể overlay trực tiếp trong animation.
```

## Gói bàn giao cho Codex

Một asset tốt nên có master và các layer độc lập. Với pet, ưu tiên các slot:

```text
master.png
body.png
head.png
eyes-open.png
eyes-closed.png
ears.png       # chỉ tách nếu cần chuyển động riêng
tail.png
effect.png
shadow.png
```

Nếu ChatGPT web không tạo được alpha thật và xuất nền caro, vẫn tải file vào inbox. Codex được phép dùng code để chroma-key nền phẳng, crop, padding, kiểm tra alpha và tạo output mới; giữ file gốc để có thể xử lý lại.

## Cách giảm quota

- Gộp yêu cầu concept và các biến thể tĩnh vào một lần tạo khi chúng có cùng subject.
- Dùng chỉnh sửa có mục tiêu nhỏ thay vì tạo lại toàn bộ asset.
- Tạo một master chuẩn, sau đó để Codex tạo chuyển động bằng Phaser.
- Dùng sprite sheet chỉ cho effect thật sự biến dạng như lửa, khói và vụ nổ.
- Không yêu cầu ChatGPT web tạo hàng chục frame gần giống nhau nếu tween/layer có thể xử lý.
- Chỉ đưa vào ChatGPT web những reference cần thiết; giữ prompt và output trong thư mục source của repo.

## Vai trò của Codex sau khi nhận file

Codex có thể và nên thực hiện:

- tách nền, chuẩn hóa alpha và padding;
- resize, crop và kiểm tra edge halo;
- tạo atlas/sprite sheet từ file đã có;
- tạo manifest và schema;
- viết renderer Phaser dùng chung;
- thêm clip idle, walk, attack, hurt, sleep;
- thêm preview, layer toggles, speed controls và validation;
- chạy build/test/Docker.

Codex không nên tự tạo hình raster mới nếu người dùng chưa đưa file hoặc prompt rõ ràng để dùng một công cụ tạo ảnh ở ChatGPT web.
