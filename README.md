# GameVui Asset Studio

Repo sản xuất asset 2D và frontend preview; stack Phaser 3 + TypeScript + Vite.

Artwork được tạo ở ChatGPT web. Codex chỉ xử lý PNG đã nhận, code và preview. Đặt ảnh mới vào `assets/inbox/<lineage-id>/level-<n>/`, sau đó yêu cầu Codex tích hợp. Xem `docs/workflow-chatgpt-web-assets.md`.

Nếu ChatGPT web được kết nối GitHub, nó có thể đọc contract và asset đã commit để làm reference. PNG mới vẫn đi qua `assets/inbox/` trước khi Codex chuẩn hóa và đưa vào app.

```text
apps/preview/src/          UI và scene xem asset
packages/asset-core/src/  Contract và resolve kế thừa dữ liệu
packages/pet-runtime/src/ Renderer PetView dùng chung
assets/rigs/              Bộ khung và animation defaults
assets/pets/<lineage>/level-<n>/  Manifest riêng từng cấp tiến hóa
public/assets/           PNG production được phục vụ nguyên bản
public/references/       Reference đã lưu bền vững
docs/                    Quy trình sản xuất
```

Chạy `docker compose up -d --build`, mở http://localhost:3333.
Kiểm tra build: `docker compose exec preview npm run build`.
Dừng: `docker compose down`. Sau khi đổi dependency: `docker compose run --rm preview npm ci` rồi khởi động lại.

Frontend tự tìm `assets/pets/*/level-*/asset.json`, không cần thêm route hoặc viết class mới cho từng pet. Mỗi lineage có tối đa ba cấp `level-1`, `level-2`, `level-3`. Fire Fox Level 1 kế thừa `pet-base` qua trường `extends`; override chỉ chứa khác biệt của nó.

Asset Studio có form **Tạo pet từ layer**. Chọn một trong 10 species và element,
chọn Level 1/2/3 rồi upload các PNG trong suốt theo recipe hiển thị. Hệ thống giữ bản gốc trong
`assets/inbox/<lineage>/level-<n>/`, tạo runtime files + manifest và dùng rig thuộc một trong
6 nhóm: quadruped, hopper, tank, winged, blob hoặc serpent. Sau khi tạo có thể
chỉnh X/Y/scale/origin/z của từng layer và tự lưu vào `asset.json`.
Pet đã có cũng có thể dùng **Thay ảnh pet** để đổi một hoặc nhiều PNG đang được manifest tham chiếu.
Studio giữ ảnh upload mới và bản runtime trước đó theo revision trong
`assets/inbox/<lineage>/level-<n>/replacements/`, đồng thời chuẩn hóa ảnh mới về đúng kích thước
production hiện tại trước khi cập nhật `public/assets/`.

Fire Fox Level 1 đã có PNG alpha và 4 clip: idle, walk, attack, hurt. Preview có điều khiển clip, pause, scale, flip, tốc độ, nền và visibility từng layer. Đọc `assets/pets/fire-fox/level-1/PRODUCTION.md` để biết bản gốc, prompt và giới hạn của từng clip. Chạy `node scripts/test-core.mjs` để kiểm tra kế thừa và loop.

Đọc `AGENTS.md` và `docs/asset-workflow.md` trước khi tạo asset.
