# Workflow tạo ảnh bằng ChatGPT web, code bằng Codex

Khi yêu cầu là tạo trọn bộ artwork cho một pet mới, ChatGPT Web phải đọc `docs/chatgpt-pet-layer-factory.md` trước; file đó là hướng dẫn production chi tiết, còn tài liệu này mô tả luồng bàn giao giữa ChatGPT Web và Codex.

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

Workflow chuẩn hiện tại:

```text
DESIGN SPEC → ONE LAYER SHEET → CODEX TÁCH Ô → MANIFEST/RIG → PHASER/ASSET STUDIO COMPOSITION → PREVIEW/MASTER → APPROVAL
```

Không dùng `master/full artwork đã lắp → tách/crop layer` cho pet production mới. Preview/master chỉ là kết quả ghép để duyệt.

1. Trong ChatGPT web, mở repo GitHub đã kết nối nếu cần đọc contract; dùng prompt layer sheet ở chế độ tạo ảnh.
2. Chốt specification và yêu cầu **một PNG** chứa mọi production slot: mỗi ô một bộ phận isolated, nền trong suốt nếu có thể; caption filename dưới ô. Mỗi anatomy cell phải vẽ đủ vùng sẽ bị che.
3. Tải `layer-sheet.png` xuống máy.
4. Đặt ảnh vào `assets/inbox/<lineage-id>/level-<n>/layer-sheet.png`.
5. Nhắn cho Codex: `Xử lý Fire Fox Level 1 trong assets/inbox/fire-fox/level-1 và tích hợp vào preview.`
6. Codex tách từng ô, kiểm tra mode RGBA, alpha, kích thước, crop, naming, anchors và độ khớp với manifest; sau đó copy kết quả đã chuẩn hóa sang `public/assets/`.
7. Codex cập nhật config/animation và để renderer ghép preview; không tạo lại artwork bằng ImageGen. `master.png`/`preview.png` chỉ được export sau bước ghép này.

## Gói bàn giao cho Codex

Đối với pet production mới, không dùng file này làm danh sách slot hoặc prompt recipe. Đọc `docs/chatgpt-pet-layer-factory.md`, sau đó lấy species semantics từ `docs/pets-catalog.md` và lấy filename/required/optional/runtimeSize cuối cùng từ `packages/asset-core/src/petCatalog.ts`.

Gói bàn giao của mỗi evolution stage là **một layer sheet** gồm character layers, Pet Visual VFX và Combat VFX được recipe hỗ trợ. Một image-generation operation tạo đúng một PNG đó; sau khi Codex tách, production layers mới là source of truth runtime. Combat VFX có thể dùng cùng filename giữa các level vì stage folder xác định version.

Pet Visual VFX luôn gắn với model hoặc presentation/idle. Combat VFX xuất hiện theo attack lifecycle và có thể gồm cast, trail, projectile, impact hoặc special travel/AoE asset. Không giả định mọi species có projectile, không dùng `effect-front` làm projectile và không gộp impact vào target-specific artwork.

Nếu ChatGPT web không tạo được alpha thật và xuất nền caro, vẫn tải file vào inbox. Codex được phép dùng code để chroma-key nền phẳng, crop, padding, kiểm tra alpha và tạo output mới; giữ file gốc để có thể xử lý lại.

## Cách giảm quota

- Chốt một design spec chung và tạo **một** layer sheet cho cả package.
- Dùng chỉnh sửa có mục tiêu trên đúng ô thay vì tạo lại từng file layer.
- Để Phaser ghép preview và tạo chuyển động từ các PNG đã tách.
- Dùng sprite sheet chỉ cho effect thật sự biến dạng như lửa, khói và vụ nổ.
- Không yêu cầu ChatGPT web tạo hàng chục frame gần giống nhau nếu tween/layer có thể xử lý.
- Chỉ đưa vào ChatGPT web những reference cần thiết; giữ prompt và output trong thư mục source của repo.

## Vai trò của Codex sau khi nhận file

Codex có thể và nên thực hiện:

- tách ô từ layer sheet thành từng PNG slot;
- tách nền, chuẩn hóa alpha và padding;
- resize, crop và kiểm tra edge halo;
- tạo atlas/sprite sheet từ file đã có;
- tạo manifest và schema;
- viết renderer Phaser dùng chung;
- thêm clip idle, walk, attack, hurt, sleep;
- thêm preview, layer toggles, speed controls và validation;
- chạy build/test/Docker.

Codex không tạo hình raster mới cho dự án này; artwork được sản xuất hoặc chỉnh sửa bằng ChatGPT Web theo Pet Layer Factory.
