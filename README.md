# GameVui Asset Studio

Repo sản xuất asset 2D và frontend preview; stack React + Phaser 3 + TypeScript + Vite.

Artwork được tạo ở ChatGPT web thành **một layer sheet**. Codex tách ô, xử lý PNG, code và preview. Đặt `layer-sheet.png` vào `assets/inbox/<lineage-id>/level-<n>/`, sau đó yêu cầu Codex tích hợp. Xem `docs/workflow-chatgpt-web-assets.md`.

## Creating pet artwork with ChatGPT Web

Nếu yêu cầu là tạo artwork cho pet mới bằng ChatGPT Web, đọc theo thứ tự:

1. `docs/chatgpt-pet-layer-factory.md` — workflow bắt buộc và contract cho layer sheet.
2. `docs/pets-catalog.md` — species identity, anatomy, role và combat identity.
3. `packages/asset-core/src/petCatalog.ts` — executable recipe cuối cùng cho slot, filename, required/optional và transform khởi đầu.
4. Rig, manifest và approved lineage reference liên quan nếu cần.

Một câu ngắn như “Tạo pet Sói hệ Lửa Level 1 theo repo” phải đủ để ChatGPT Web tự dùng Pet Layer Factory và tạo toàn bộ production artwork package; không yêu cầu người dùng paste lại production prompt dài.

Nếu ChatGPT web được kết nối GitHub, nó có thể đọc contract và asset đã commit để làm reference. PNG mới vẫn đi qua `assets/inbox/` trước khi Codex chuẩn hóa và đưa vào app.

```text
apps/preview/src/          UI React và scene Phaser xem asset
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

Frontend tự tìm `assets/pets/*/level-*/asset.json`, không cần thêm route hoặc viết class mới cho từng pet. Mỗi lineage có tối đa ba cấp `level-1`, `level-2`, `level-3`. Fire Fox Level 1 tiếp tục kế thừa legacy `pet-base`; Fox sản xuất mới dùng `fox-quadruped` và bốn PNG chân độc lập.

Mọi pet recipe có `head` và blink dùng ba layer thật: `head`, `eyes-open` và `eyes-closed`. `head.png` không chứa mắt; hai layer mắt cùng là con của `head` và được runtime luân phiên visibility theo field `blink`. Không dùng closed-head asset hoặc `closedSrc` trong manifest production.

Asset Studio có form **Tạo pet từ layer**. Chọn một trong 10 species và element,
chọn Level 1/2/3 rồi upload các PNG trong suốt theo recipe hiển thị. Hệ thống giữ bản gốc trong
`assets/inbox/<lineage>/level-<n>/`, tạo runtime files + manifest và dùng rig thuộc một trong
6 nhóm: quadruped, hopper, tank, winged, blob hoặc serpent. Template Fox dùng rig chuyên biệt `fox-quadruped`; các layer optional hoặc evolution multi-tail vẫn được mô tả hoàn toàn bằng manifest. Sau khi tạo có thể
chỉnh X/Y/scale/origin/z của từng layer và tự lưu vào `asset.json`.
Pet đã có cũng có thể dùng **Thay ảnh pet** để đổi một hoặc nhiều PNG đang được manifest tham chiếu.
Studio giữ ảnh upload mới và bản runtime trước đó theo revision trong
`assets/inbox/<lineage>/level-<n>/replacements/`. PNG runtime mới được ghi nguyên byte upload vào
`public/assets/`: không resize, crop, căn giữa hoặc nén tự động; dùng transform trong UI để căn layer.

Mục **CHỈNH TỪNG LAYER** lưu cả vị trí, tỷ lệ, góc, alpha, màu phủ, origin, z-order và visibility. Mục **CHỈNH COMBAT VFX** cho phép bật/tắt và lưu presentation riêng cho từng semantic: trigger/delay, thời lượng/easing, neo Pet hoặc Mục tiêu, transform đầu-cuối, origin, depth và hướng lật. **Quản lý ảnh pet** thay PNG hiện có hoặc thêm slot optional/VFX còn thiếu từ executable recipe. Các chỉnh sửa nằm trong manifest của đúng evolution stage, không cần sửa renderer cho từng pet.

Mục **LẤY THÔNG SỐ TỪ PET KHÁC** áp cấu hình của một pet nguồn lên pet đang chỉnh sửa: vị trí/scale toàn pet, transform của các layer trùng ID, animation có target tương thích, cùng presentation/pattern Combat VFX trùng semantic. Chức năng này không sao chép PNG, đường dẫn asset, ID, lineage, level hoặc rig của pet nguồn.

Trong **CHỈNH 4 CHUYỂN ĐỘNG**, có thể thêm, nhân bản, xóa track và đổi `Layer đích` bằng ID. Vì vậy evolution multi-tail có thể nhân track `tail`, rồi trỏ từng bản tới các tail ID riêng mà không sửa rig dùng chung hoặc renderer.

Fire Fox Level 1 đã có PNG alpha và 4 clip: idle, walk, attack, hurt. Preview có điều khiển clip, pause, scale, flip, tốc độ, nền và visibility từng layer. Đọc `assets/pets/fire-fox/level-1/PRODUCTION.md` để biết bản gốc, prompt và giới hạn của từng clip. Chạy `node scripts/test-core.mjs` để kiểm tra kế thừa và loop.

Pet animation mới dùng workflow layer-first: ImageGen tạo một layer sheet, Codex tách PNG, Phaser ghép, rồi mới export `master.png`/`preview.png` để duyệt. Không dùng master đã lắp làm nguồn crop/tách layer. Xem artwork contract tại `docs/chatgpt-pet-layer-factory.md` và integration contract tại `docs/asset-workflow.md`.

Đọc `AGENTS.md` và `docs/asset-workflow.md` trước khi tích hợp asset. Với artwork pet mới trên ChatGPT Web, entry-point luôn là `docs/chatgpt-pet-layer-factory.md`.
