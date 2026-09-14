# GameVui Asset Studio

Repo sản xuất asset 2D và frontend preview; stack Phaser 3 + TypeScript + Vite.

```text
apps/preview/src/          UI và scene xem asset
packages/asset-core/src/  Contract và resolve kế thừa dữ liệu
packages/pet-runtime/src/ Renderer PetView dùng chung
assets/rigs/              Bộ khung và animation defaults
assets/pets/<id>/         Manifest riêng từng pet
public/assets/           PNG production được phục vụ nguyên bản
public/references/       Reference đã lưu bền vững
docs/                    Quy trình sản xuất
```

Chạy `docker compose up -d --build`, mở http://localhost:3333.
Kiểm tra build: `docker compose exec preview npm run build`.
Dừng: `docker compose down`. Sau khi đổi dependency: `docker compose run --rm preview npm ci` rồi khởi động lại.

Frontend tự tìm `assets/pets/*/asset.json`, không cần thêm route hoặc viết class mới cho từng pet. Fire Fox kế thừa `pet-base` qua trường `extends`; override chỉ chứa khác biệt của nó.

Fire Fox v1 đã có PNG alpha và 5 clip: idle, walk, attack, hurt, sleep. Preview có điều khiển clip, pause, scale, flip, tốc độ, nền và visibility từng layer. Đọc `assets/pets/fire-fox/PRODUCTION.md` để biết bản gốc, prompt và giới hạn của từng clip. Chạy `node scripts/test-core.mjs` để kiểm tra kế thừa và loop.

Đọc `AGENTS.md` và `docs/asset-workflow.md` trước khi tạo asset.
