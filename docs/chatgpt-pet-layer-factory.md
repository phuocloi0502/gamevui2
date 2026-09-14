# ChatGPT Web Pet Layer Factory

> Khi người dùng yêu cầu tạo một pet, hãy đọc file này trước khi tạo ảnh.

Tài liệu này dành cho ChatGPT Web có quyền đọc repository. Mục tiêu là biến một câu ngắn thành toàn bộ bộ PNG production layers, không bắt người dùng paste lại prompt dài.

## Thứ tự source of truth

Đọc và ưu tiên theo thứ tự:

1. Chỉ dẫn trực tiếp mới nhất của người dùng.
2. `docs/chatgpt-pet-layer-factory.md` này.
3. Pet Catalog: `docs/pets-catalog.md`.
4. Executable recipe: `packages/asset-core/src/petCatalog.ts`.
5. Manifest, rig và reference của lineage liên quan nếu đã tồn tại.

Nếu catalog Markdown và code runtime mâu thuẫn, `packages/asset-core/src/petCatalog.ts` là nguồn thực thi cuối cùng cho slot, filename, required/optional, runtimeSize và rig. Reference đã approved của đúng lineage ưu tiên hơn mô tả art direction generic.

Không yêu cầu người dùng nhắc lại workflow hoặc thông tin đã có trong repo.

## Short command contract

Tự parse tên species, element và level từ câu ngắn bằng tiếng Việt hoặc tiếng Anh. Ví dụ `Tạo pet Sói hệ Lửa Level 1` được resolve thành:

```text
species = wolf
element = fire
evolutionLevel = 1
lineageId = fire-wolf
stageId = fire-wolf-level-1
```

Alias thường gặp:

| Người dùng nói | ID |
|---|---|
| cáo / fox | `fox` |
| sói / wolf | `wolf` |
| thỏ / bunny | `bunny` |
| rùa / turtle | `turtle` |
| rồng / dragon | `dragon` |
| cú / owl | `owl` |
| golem | `golem` |
| slime | `slime` |
| rắn / serpent | `serpent` |
| diều hâu / hawk | `hawk` |
| lửa / fire | `fire` |
| nước / water | `water` |
| gió / wind | `wind` |
| ánh sáng / light | `light` |
| bóng tối / shadow | `shadow` |

Sau khi parse, đọc species section trong Pet Catalog và executable recipe. Không hỏi lại role, range, skill, silhouette, rig, view, filename hoặc layer đã có default. Chỉ hỏi nếu thiếu một quyết định thực sự làm thay đổi mạnh identity và repo không có default. Nếu đủ dữ liệu, bắt đầu production ngay.

## Workflow bắt buộc

```text
DESIGN SPEC
    ↓
PRODUCTION LAYERS
    ↓
manifest / rig
    ↓
Asset Studio / Phaser ghép
    ↓
preview / master
    ↓
approval
```

Không tạo master/full pet trước rồi crop, tách hoặc reconstruct. Concept/full artwork đã tồn tại chỉ là reference. Production PNG phải được thiết kế như bộ phận hoàn chỉnh ngay từ đầu. `preview.png` và `master.png` là output ghép từ layers, không phải source.

## Execution contract cho Image Generation

Một yêu cầu tạo pet nghĩa là tạo toàn bộ package artwork của đúng evolution stage:

- A. character layers: anatomy, appendage, head/blink và shadow theo recipe;
- B. pet visual VFX: các layer luôn gắn với model như `effect-back`, `effect-front`, `particles`;
- C. combat VFX: `attack-cast`, `attack-trail`, `projectile`, `impact` hoặc special semantic đúng combat identity của species.

- mỗi layer là một PNG độc lập;
- mỗi image-generation hoặc edit operation chỉ tạo đúng một layer;
- thực hiện tuần tự cho đến khi đủ package;
- không contact sheet, sprite sheet hoặc nhiều layer trong một ảnh;
- không dừng sau layer đầu và không yêu cầu người dùng nói “tiếp”;
- không tạo ZIP, README, JSON hoặc code trừ khi người dùng yêu cầu riêng.

Ưu tiên thứ tự generation để giữ identity: `head → head-closed → body → limbs → tail/appendages → species details → pet visual VFX → combat VFX → particles → shadow`. Thứ tự này không phải z-order.

Trước lần tạo đầu tiên, lập một internal design specification và giữ nguyên xuyên suốt:

- species và evolution level;
- body/head proportions;
- ear, muzzle và face identity;
- anatomy, fur/material và decorative vocabulary;
- palette và element language;
- lighting direction, outline/rendering style;
- camera/view angle và facing direction;
- VFX vocabulary.

Khi công cụ hỗ trợ reference image, dùng các layer đã tạo trước làm visual/style reference cho layer tiếp theo. Không redesign pet ở mỗi call.

## Art direction mặc định

- 2D fantasy pet, cute/chibi;
- painterly/soft rendering và gradient mềm;
- silhouette rõ ở gameplay size;
- lighting có hướng rõ ràng;
- VFX đẹp nhưng không che anatomy hoặc thông tin gameplay;
- chất lượng và thế giới hình ảnh nhất quán với pet đã approved;
- mặc định góc nhìn 3/4, quay sang phải, trừ reference/lineage/species rule cụ thể.

## Element design language

Đây là default; reference approved của lineage luôn ưu tiên hơn.

- `fire`: đỏ/cam/vàng kim, ember, flame, heated glow; không biến toàn bộ fur thành một khối lửa nếu species không yêu cầu.
- `water`: cyan/xanh lam, liquid arcs, droplets, bubbles, soft aquatic glow.
- `wind`: mint/teal/trắng, curved air streaks, feather/light vortex, leaves khi phù hợp.
- `light`: ivory/trắng/vàng kim, radiant glow, halo/celestial accents, luminous particles thanh thoát.
- `shadow`: tím đậm/indigo/đen, smoky shadow và spectral glow tinh tế; không làm silhouette khó đọc.

Element thay palette, material, ornament nhỏ và VFX; không biến anatomy thành species khác.

## Evolution contract

- Level 1: trẻ, đơn giản, silhouette sạch, ít ornament, elemental effect vừa phải.
- Level 2: trưởng thành hơn, anatomy accent và element rõ hơn, vẫn nhận ra lineage Level 1.
- Level 3: final evolution, silhouette/VFX mạnh hơn và có thể thêm layer nếu executable recipe cho phép, nhưng vẫn giữ identity lineage.

Mỗi level là một package riêng. Không ghi đè hoặc tái sử dụng sai artwork của level khác.

## Artwork contract cho từng PNG

- Chỉ chứa đúng layer đó; transparent background thật khi công cụ hỗ trợ.
- Không chữ, label, watermark, UI, frame, background hoặc fake checkerboard.
- Không chứa shadow/effect/body part thuộc slot khác.
- Không crop anatomy, fur, glow hoặc particle của chính slot; có safe padding trong suốt.
- Anatomy phải hoàn chỉnh cả vùng sẽ bị layer khác che.
- Body có đủ vùng dưới head/chân/tail; leg có đủ phần trên tới joint; tail có đủ gốc; head có đủ vùng cổ/lông nối.
- Mục tiêu là layer rotate/tween độc lập mà không lộ khoảng trống.
- Không stretch để ép runtimeSize. Ưu tiên anatomy đúng và aspect ratio; Codex/Asset Studio normalize source về runtime target.

Output phải dùng đúng filename trong executable recipe. Không đổi `front-near.png` thành tên tự đặt.

## Head và blink

Nếu recipe có `head.png` và `head-closed.png`:

- `head.png` là canonical head;
- tạo `head-closed.png` bằng edit/reference từ canonical head;
- giữ nguyên canvas, silhouette, geometry, ears, muzzle, mouth, fur, decoration, lighting, position và scale;
- chỉ đổi mắt mở thành mắt nhắm;
- không generate một thiết kế đầu mới cho blink.

## Near/far và quadruped

Trong góc nhìn 3/4:

- `front-*`: chân phía đầu/ngực;
- `rear-*`: chân phía bụng sau/đuôi;
- `*-near`: phía gần người xem, thường rõ/lớn/sáng hơn;
- `*-far`: phía xa người xem, chịu perspective và có thể tối/nhỏ hơn nhẹ.

Fox và Wolf production mới bắt buộc có bốn artwork độc lập:

```text
rear-far.png
rear-near.png
front-far.png
front-near.png
```

Chân trước và sau phải khác anatomy; near/far phải thể hiện perspective. Không duplicate cùng một chân bốn lần và không dùng `leg.png` chung.

## Required, optional và recommended

- `required`: luôn tạo.
- `optional`: chỉ tồn tại khi design cần; không tạo PNG rỗng.
- `recommended-for-this-design`: optional nhưng ChatGPT có thể tự chọn tạo nếu giúp species/element rõ hơn mà không cần hỏi.

Không tự phát minh anatomy, Combat VFX semantic hoặc filename ngoài executable recipe. Với Fire Wolf, `mane.png` là pet layer optional đáng cân nhắc; Fang Rush dùng `attack-cast.png`, `attack-trail.png`, `impact.png` và không có projectile mặc định.

## Executable recipe index

Đọc `packages/asset-core/src/petCatalog.ts` trước mỗi lần sản xuất để xác nhận recipe mới nhất. Danh sách dưới đây là routing summary:

| Species | Archetype / rig | Required character PNG | Optional character / pet visual VFX | Optional Combat VFX recipe |
|---|---|---|---|---|
| Fox | quadruped / `fox-quadruped` | `tail`, `rear-far`, `rear-near`, `body`, `front-far`, `front-near`, `head` | `shadow`, `effect-back`, `head-closed`, `effect-front`, `particles`; Level 3 tail slots | Element Tail Bolt: `attack-cast`, `projectile`, `impact` |
| Wolf | quadruped / `quadruped-base` | `tail`, `rear-far`, `front-far`, `body`, `rear-near`, `front-near`, `head` | `shadow`, `mane`, `head-closed`, `jaw` | Fang Rush: `attack-cast`, `attack-trail`, `impact`; không projectile mặc định |
| Bunny | hopper / `hopper-base` | `rear-ear`, `body`, `hind-leg`, `front-paw`, `head`, `front-ear`, `tail` | `shadow`, `head-closed` | Burst Ram: `attack-trail`, `impact` |
| Turtle | tank / `tank-base` | `rear-feet`, `body`, `shell`, `front-feet`, `head` | `shadow`, `head-closed`, `shell-runes` | Element Cage: `attack-cast`, `cage`, `impact` |
| Golem | tank / `tank-base` | `rear-arm`, `rear-leg`, `torso`, `core`, `front-leg`, `front-arm`, `head` | `shadow`, `rock-fragments` | Core Quake: `attack-cast`, `ground-wave`, `impact` |
| Dragon | winged / `winged-base` | `back-wing`, `tail`, `body`, `legs`, `front-wing`, `head` | `shadow`, `head-closed`, `horns`, `element-aura` | Element Meteor: `attack-cast`, `meteor`, `impact` |
| Owl | winged / `winged-base` | `back-wing`, `tail-feathers`, `body`, `talons`, `front-wing`, `head` | `shadow`, `head-closed`, `forehead-rune` | Element Orb: `attack-cast`, `projectile`, `impact` |
| Hawk | winged / `winged-base` | `rear-wing`, `tail-fan`, `body`, `talons`, `front-wing`, `head` | `shadow`, `head-closed`, `crest` | Cyclone Dive: `attack-trail`, `vortex`, `impact` |
| Slime | blob / `blob-base` | `blob`, `face` | `shadow`, `inner-core`, `front-gloss`, `top-effect` | Element Pulse: `attack-cast`, `pulse`, `impact` |
| Serpent | serpent / `serpent-base` | `tail`, `body-lower`, `body-upper`, `head` | `shadow`, `head-closed`, `jaw`, `crest` | Element Lance: `attack-cast`, `beam`, `impact` |

Tên trong bảng không có `.png` để dễ đọc; output thực tế luôn thêm `.png` và dùng folder `layers/` hoặc `effects/` đúng như `petCatalog.ts`. Một slot có thể tạo nhiều runtime instances ở species cho phép; không tự suy diễn điều đó cho Fox/Wolf.

RuntimeSize cố định hiện chỉ được khai báo rõ cho Fox baseline: `shadow 320×64`, `tail 228×220`, mỗi chân `70×123`, `body 308×225`, `head/head-closed 302×318`. Các slot không có runtimeSize phải giữ aspect/padding chất lượng cao; không tự stretch.

Z-order do `Layer.z` trong executable recipe quyết định, từ số nhỏ ở sau tới số lớn ở trước. Generation order không thay đổi z-order. Combat VFX không phải layer thường trực và không tham gia z-order của pet.

## Combat VFX contract

Mỗi level sở hữu Combat VFX riêng trong chính stage package. Level 1/2/3 có thể cùng dùng filename như `impact.png`, vì đường dẫn đã được scope bởi `level-<n>`. Giữ cùng skill identity qua ba level: Level 1 nhỏ/sạch, Level 2 rõ và giàu năng lượng hơn, Level 3 mạnh nhất nhưng không đổi thành skill khác.

Manifest mới bind file theo semantic trong `effects.attack`: `cast`, `trail`, `projectile`, `impact`, hoặc special key có trong recipe như `meteor`, `vortex`, `ground-wave`, `cage`, `pulse`, `beam`. Tất cả optional. Không tạo projectile cho recipe melee, không dùng `effect-front` thay projectile và không bake impact chung với projectile. Impact thuộc attacker/skill và phải dùng được với mọi target.

```json
{
  "effects": {
    "color": 16751144,
    "attack": {
      "cast": "/assets/pets/light-fox/level-3/effects/attack-cast.png",
      "projectile": "/assets/pets/light-fox/level-3/effects/projectile.png",
      "impact": "/assets/pets/light-fox/level-3/effects/impact.png"
    }
  }
}
```

`color` là metadata optional. Không thêm key với file rỗng hoặc không tồn tại. Special semantic cũng là string key trong `attack`, không cần enum hoặc nhánh theo pet ID.

Rig template phát marker generic `attack-release` tại thời điểm tung đòn; consumer chọn projectile, trail hoặc special binding từ manifest. `pet-base` và manifest cũ có thể vẫn phát marker tên `projectile` để giữ backward compatibility.

Mỗi Combat VFX là một PNG trong suốt riêng, một image-generation operation cho một asset, cùng element/style với pet và đọc rõ ở gameplay size. Không contact sheet. ChatGPT Web tạo artwork; Codex/Asset Studio tạo binding manifest, preview và cho phép thay từng file độc lập.

## Multi-tail / special evolution

Fox Level 1/2 dùng `tail.png`. Fox Level 3 có thể dùng `tail.png` đơn hoặc các slot optional:

```text
tail-left-outer.png
tail-left-inner.png
tail-center.png
tail-right-inner.png
tail-right-outer.png
```

Chỉ dùng tên có trong recipe. Mỗi tail là artwork hoàn chỉnh với gốc/pivot rõ. Animation có thể override target bằng đúng layer ID; renderer không biết số lượng tail.

## Ví dụ chat mới

User:

> Tạo pet Sói hệ Lửa Level 1 theo repo.

Expected behavior:

1. Đọc file này, Pet Catalog, `petCatalog.ts`, `quadruped-base` và reference Wolf/Fire liên quan nếu có.
2. Resolve `wolf`, `fire`, Level 1; lập design spec Fire Wolf Level 1.
3. Chọn toàn bộ required slots, optional phù hợp như `mane`, và Combat VFX của Fang Rush: `attack-cast`, `attack-trail`, `impact`; không tạo projectile.
4. Tạo từng PNG riêng, một operation cho một layer, dùng layer trước làm reference.
5. Tiếp tục tự động đến khi đủ package; không contact sheet và không yêu cầu user nói “tiếp”.
6. Không tạo `asset.json`, không chỉnh code và không tạo preview/master.
7. Người dùng tải PNG vào **Tạo pet từ layer** của Asset Studio.
8. Sau khi Phaser ghép preview, nếu một layer chưa đạt, người dùng yêu cầu sửa đúng layer rồi dùng **Thay ảnh pet**.
