# Quy trình và hợp đồng asset

## Phạm vi

Repo này chủ yếu tạo asset và FE để kiểm tra chúng. Fire Fox là pet mẫu đầu tiên. Mục tiêu 100 pet dựa trên tái sử dụng rig và clip, không tạo 100 renderer.

## Kế thừa

`pet-base` chứa canvas và idle mặc định. Manifest kế thừa qua `extends`, thêm anatomy và effect riêng. Khi cần anatomy khác đáng kể, thêm rig phù hợp như flying hoặc blob vào registry thay vì sửa renderer cho một id pet. Phiên bản đầu chỉ resolve một cấp rig → pet.

Nguồn type chuẩn: `packages/asset-core/src/types.ts`. JSON trong AGENTS.md chỉ là ý tưởng cũ, không dùng làm schema thực thi.

## Tọa độ phiên bản đầu

Canvas mặc định 512×512 là đề xuất khởi đầu, chưa phải kích thước art được duyệt. x/y của layer tính bằng pixel tương đối với parent; root đặt tại ground point trên sân preview. originX/Y chuẩn hóa 0..1, đặt ở khớp xoay trong PNG. Layer không có parent thuộc root; z tăng dần, parent phải có z nhỏ hơn child. Trong từng parent, z điều khiển thứ tự anh em; toàn bộ nhóm con kế thừa thứ tự của parent.

## Thêm pet

1. Tạo `assets/pets/<lineage-id>/level-<n>/asset.json` từ species template, với `evolutionLevel` là 1, 2 hoặc 3.
2. Lưu master và layer tại `public/assets/pets/<lineage-id>/level-<n>/`; đường dẫn src bắt đầu `/assets/pets/<lineage-id>/level-<n>/`.
3. Điền layers với anchor, parent, z; khai báo riêng effect khi renderer hỗ trợ clip đó.
4. Preview tự nhận manifest sau reload. Kiểm tra ghép layer, biên alpha, kích thước gameplay và loop.
5. Chỉ đổi status thành ready sau kiểm tra. Không coi concept board là sprite sheet hợp lệ.

## Fire Fox

Reference chính: `public/references/fire-fox/concept-board.png`. Board có body đã chứa đầu/tai và hình head cũng có tai/mắt; không thể cắt các ô rồi ghép chồng trực tiếp. Cần tạo các layer sạch, đồng nhất và vẽ đủ phần bị che. Giữ phong cách mềm, lông kem, cam vàng và đuôi lửa của artwork chính.

Fire Fox Level 1 hiện có các clip puppet idle/walk/attack/hurt/sleep và master được ghép từ layer. Xem `assets/pets/fire-fox/level-1/PRODUCTION.md` để biết giới hạn, quy trình tái xuất và prompt. Cần kiểm chứng pet thứ hai trước khi sản xuất hàng loạt. Override clip qua `overrides.clips`; effect projectile riêng nằm trong manifest. Parent scale được kế thừa bởi con.
