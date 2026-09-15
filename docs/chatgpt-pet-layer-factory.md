# ChatGPT Web Pet Layer Factory

> Khi người dùng yêu cầu tạo một pet, hãy đọc file này trước khi tạo ảnh.

Tài liệu này dành cho ChatGPT Web có quyền đọc repository. Mục tiêu là biến một câu ngắn thành toàn bộ production artwork package của pet, không bắt người dùng paste lại prompt dài.

## Thứ tự source of truth

Đọc và ưu tiên theo thứ tự:

1. Chỉ dẫn trực tiếp mới nhất của người dùng.
2. Approved lineage/reference do người dùng cung cấp.
3. `docs/chatgpt-pet-layer-factory.md` này.
4. Pet Catalog: `docs/pets-catalog.md`.
5. Executable recipe: `packages/asset-core/src/petCatalog.ts`.
6. Rig, manifest và reference liên quan để lấy technical context.

Nếu slot, filename, required/optional hoặc runtimeSize trong Markdown mâu thuẫn với code, `packages/asset-core/src/petCatalog.ts` là nguồn thực thi cuối cùng. Nếu art identity mâu thuẫn, approved user reference thắng mô tả generic trong catalog, trừ khi người dùng yêu cầu redesign.

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

## Production artwork package

Một request tạo pet nghĩa là tạo **toàn bộ production artwork package của đúng evolution stage**, không chỉ tạo hình pet hoặc một layer đầu tiên. Package gồm ba nhóm; danh sách chính xác vẫn do executable recipe quyết định.

### A. Character layers

Các PNG anatomy/state theo recipe, ví dụ:

- `body`, `head`, `eyes-open`, `eyes-closed`;
- `rear-far`, `rear-near`, `front-far`, `front-near` với quadruped;
- `tail` hoặc các tail group ở evolution đặc biệt;
- wing, ear, horn, mane, jaw, shell và anatomy riêng của species khi recipe có slot;
- `shadow` khi recipe yêu cầu hoặc cho phép.

### B. Pet Visual VFX

Các layer visual luôn gắn hoặc presentation quanh pet, ví dụ:

- `effect-back`;
- `effect-front`;
- `particles`;
- aura, mane glow hoặc element effect nếu executable recipe có slot.

Pet Visual VFX thuộc model composition. `effect-front` không phải projectile và không được tự động dùng thay Combat VFX.

### C. Combat VFX

Các visual asset theo combat identity và evolution stage:

- `attack-cast`;
- `attack-trail`;
- `projectile` chỉ khi recipe là ranged và có slot;
- `impact` độc lập;
- special travel/AoE asset như `meteor`, `ground-wave`, `vortex`, `cage`, `beam`, `slash` hoặc `bite-flash` chỉ khi executable recipe khai báo.

Nếu recipe đã quy định Combat VFX, người dùng không cần nhắc riêng “tạo impact”, “tạo trail” hoặc “tạo projectile”. ChatGPT phải tự hoàn thành toàn bộ set phù hợp, nhưng không tự phát minh runtime slot mới.

## Execution contract cho Image Generation

- mỗi production asset — character layer, Pet Visual VFX hoặc Combat VFX — là một PNG độc lập;
- mỗi image-generation hoặc edit operation chỉ tạo đúng một PNG asset;
- thực hiện tuần tự cho đến khi đủ package;
- không contact sheet, sprite sheet hoặc nhiều layer trong một ảnh;
- không dừng sau layer đầu và không yêu cầu người dùng nói “tiếp”;
- không tạo ZIP, README, JSON hoặc code trừ khi người dùng yêu cầu riêng.

Ưu tiên thứ tự generation để giữ identity: `head → eyes-open → eyes-closed → body → limbs → tail/appendages → species details → pet visual VFX → combat VFX → particles → shadow`. Thứ tự này không phải z-order.

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

## Head, eye layers và blink

Với recipe production mới có `head.png`, `eyes-open.png` và `eyes-closed.png`:

- `head.png` là canonical head nhưng **không chứa mắt mở hoặc mắt nhắm**;
- `eyes-open.png` chỉ chứa đôi mắt mở trên canvas trong suốt;
- tạo `eyes-closed.png` bằng edit/reference từ `eyes-open.png`, chỉ đổi trạng thái mắt;
- hai file mắt phải giữ nguyên canvas, kích thước, vị trí pixel, style, lighting và alignment;
- cả hai phải overlay chính xác lên `head.png`, không chứa lại đầu, tai, mõm, lông hoặc decoration;
- không tạo closed-head asset.

Runtime tạo hai layer thật `eyes-open` và `eyes-closed`, cả hai gắn vào `head`. Manifest lần lượt đánh dấu chúng bằng `blink: "open"` và `blink: "closed"`; runtime chỉ luân phiên visibility, không đổi texture và không dùng `closedSrc`.

## Near/far và Fox quadruped

Fox bắt buộc giữ cùng một pose tổng thể **3/4 side view, facing right** ở mọi production layer. `front-*` là chân phía đầu/ngực, `rear-*` là chân phía bụng sau/đuôi; `*-near` thuộc camera-facing side, còn `*-far` thuộc far side và phải thể hiện foreshortening, overlap cùng chiều sâu phối cảnh rõ ràng.

Contract hình học của từng chân:

- `front-near`: chân trước phía gần camera, đầy đủ từ vai/phần chân trên tới bàn chân; lớn, rõ và có visual weight cao hơn `front-far`; trục chân gần thẳng đứng nhưng hơi hướng về trước/phải; bàn chân cho thấy rõ mặt trên và mặt trước.
- `front-far`: chân trước ở far side, hẹp và nhỏ hơn `front-near`; vị trí thị giác lùi vào trong và sau thân, ít lộ mặt ngoài của phần vai/đùi trước; có foreshortening và bàn chân nhỏ hơn theo perspective.
- `rear-near`: chân sau phía gần camera, có đùi sau lớn, hock/knee curve rõ; trục chân nghiêng chéo về trước/phải; bàn chân lớn và đọc được khối 3D.
- `rear-far`: chân sau ở far side, đùi hẹp hơn và có cảm giác bị thân overlap/che một phần do perspective; trục chân lùi về sau và vào trong; bàn chân nhỏ hơn `rear-near`.

Quy tắc bắt buộc cho cả bộ chân Fox:

- near và far là hai artwork phối cảnh khác nhau, **không mirror đơn giản** và không dùng chung silhouette;
- cả bốn chân dùng cùng anatomy, style, palette, material, lighting và mức độ chi tiết của đúng pet đó;
- mỗi PNG chân chứa đầy đủ phần chân trên/đùi tương ứng tới khớp với thân, kể cả vùng dự kiến bị che; `body.png` không chứa đùi trước hoặc đùi sau;
- near luôn có visual weight lớn hơn far; depth phải đọc được ngay cả khi xem riêng từng PNG;
- bốn bàn chân phải ráp xuống cùng một ground plane;
- không tạo chân nhìn frontal, side-profile 90°, hoặc bốn chân cùng một góc/cùng silhouette;
- họa tiết nguyên tố phải bám theo surface và anatomy riêng của từng chân, không dùng glow/ornament để đổi silhouette;
- prompt của từng operation phải gọi rõ `camera-facing side` hoặc `far side`, đồng thời mô tả `foreshortening`, `overlap` và `depth` tương ứng; không chỉ ghi tên file.

Fox production mới bắt buộc có bốn artwork độc lập:

```text
rear-far.png
rear-near.png
front-far.png
front-near.png
```

Chân trước và sau phải khác anatomy; near/far phải thể hiện perspective ngay trong từng PNG. Không duplicate cùng một chân bốn lần và không dùng `leg.png` chung.

## Required, optional và recommended

- `required`: luôn tạo.
- `optional`: chỉ tồn tại khi design cần; không tạo PNG rỗng.
- `recommended-for-this-design`: optional nhưng ChatGPT có thể tự chọn tạo nếu giúp species/element rõ hơn mà không cần hỏi.

Không tự phát minh anatomy, Combat VFX semantic hoặc filename ngoài executable recipe. Với Fire Wolf, `mane.png` là pet layer optional đáng cân nhắc; Fang Rush dùng `attack-cast.png`, `attack-trail.png`, `impact.png` và không có projectile mặc định.

## Executable recipe index

Đọc `packages/asset-core/src/petCatalog.ts` trước mỗi lần sản xuất để xác nhận recipe mới nhất. Danh sách dưới đây là routing summary:

| Species | Archetype / rig | Required character PNG | Optional character / pet visual VFX | Optional Combat VFX recipe |
|---|---|---|---|---|
| Fox | quadruped / `fox-quadruped` | `tail`, `rear-far`, `rear-near`, `body`, `front-far`, `front-near`, `head`, `eyes-open`, `eyes-closed` | `shadow`, `effect-back`, `effect-front`, `particles`; Level 3 tail slots | Element Tail Bolt: `attack-cast`, `projectile`, `impact` |
| Wolf | quadruped / `quadruped-base` | `tail`, `rear-far`, `front-far`, `body`, `rear-near`, `front-near`, `head`, `eyes-open`, `eyes-closed` | `shadow`, `mane`, `jaw` | Fang Rush: `attack-cast`, `attack-trail`, `impact`; không projectile mặc định |
| Bunny | hopper / `hopper-base` | `rear-ear`, `body`, `hind-leg`, `front-paw`, `head`, `eyes-open`, `eyes-closed`, `front-ear`, `tail` | `shadow` | Burst Ram: `attack-trail`, `impact` |
| Turtle | tank / `tank-base` | `rear-feet`, `body`, `shell`, `front-feet`, `head`, `eyes-open`, `eyes-closed` | `shadow`, `shell-runes` | Element Cage: `attack-cast`, `cage`, `impact` |
| Golem | tank / `tank-base` | `rear-arm`, `rear-leg`, `torso`, `core`, `front-leg`, `front-arm`, `head`, `eyes-open`, `eyes-closed` | `shadow`, `rock-fragments` | Core Quake: `attack-cast`, `ground-wave`, `impact` |
| Dragon | winged / `winged-base` | `back-wing`, `tail`, `body`, `legs`, `front-wing`, `head`, `eyes-open`, `eyes-closed` | `shadow`, `horns`, `element-aura` | Element Meteor: `attack-cast`, `meteor`, `impact` |
| Owl | winged / `winged-base` | `back-wing`, `tail-feathers`, `body`, `talons`, `front-wing`, `head`, `eyes-open`, `eyes-closed` | `shadow`, `forehead-rune` | Element Orb: `attack-cast`, `projectile`, `impact` |
| Hawk | winged / `winged-base` | `rear-wing`, `tail-fan`, `body`, `talons`, `front-wing`, `head`, `eyes-open`, `eyes-closed` | `shadow`, `crest` | Cyclone Dive: `attack-trail`, `vortex`, `impact` |
| Slime | blob / `blob-base` | `blob`, `face` | `shadow`, `inner-core`, `front-gloss`, `top-effect` | Element Pulse: `attack-cast`, `pulse`, `impact` |
| Serpent | serpent / `serpent-base` | `tail`, `body-lower`, `body-upper`, `head`, `eyes-open`, `eyes-closed` | `shadow`, `jaw`, `crest` | Element Lance: `attack-cast`, `beam`, `impact` |

Tên trong bảng không có `.png` để dễ đọc; output thực tế luôn thêm `.png` và dùng folder `layers/` hoặc `effects/` đúng như `petCatalog.ts`. Một slot có thể tạo nhiều runtime instances ở species cho phép; không tự suy diễn điều đó cho Fox/Wolf.

RuntimeSize cố định hiện chỉ được khai báo rõ cho Fox baseline: `shadow 320×64`, mỗi layer đuôi đơn hoặc multi-tail `228×220`, mỗi chân `70×123`, `body 308×225`, `head/eyes-open/eyes-closed 302×318`. Các slot không có runtimeSize phải giữ aspect/padding chất lượng cao; không tự stretch.

Z-order do `Layer.z` trong executable recipe quyết định, từ số nhỏ ở sau tới số lớn ở trước. Generation order không thay đổi z-order. Combat VFX không phải layer thường trực và không tham gia z-order của pet.

## Combat VFX contract

Mỗi level sở hữu Combat VFX riêng trong chính stage package. Level 1/2/3 có thể cùng dùng filename như `impact.png`, vì đường dẫn đã được scope bởi `level-<n>`. Giữ cùng skill identity qua ba level:

- Level 1: effect nhỏ, sạch, ít particle, power vừa phải.
- Level 2: cast/trail/impact rõ và giàu năng lượng hơn.
- Level 3: mạnh nhất, có thể có secondary ring/burst nếu recipe hỗ trợ, nhưng không đổi thành skill khác.

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

Mỗi Combat VFX được sản xuất giống production layer: một PNG trong suốt riêng và một image-generation operation cho đúng một asset. Không contact sheet, không sprite sheet, không ghép nhiều effect vào một ảnh nếu recipe tách chúng. Mỗi effect phải cùng style, palette, element và evolution với pet, có safe padding và đọc rõ ở gameplay size. ChatGPT Web tạo artwork; Codex/Asset Studio tạo binding manifest, preview và cho phép thay từng file độc lập.

Sau khi upload, Asset Studio có thể thêm các optional slot còn thiếu, thay từng PNG, bật/tắt và chỉnh toàn bộ presentation của từng Combat VFX rồi lưu vào manifest của stage; ChatGPT Web không cần tạo code hoặc nhúng timing/position vào artwork.

Với layer đặc biệt như multi-tail, người dùng nhân bản/thêm animation track trong Studio rồi chọn layer đích bằng string ID. Artwork contract không cần yêu cầu renderer biết số lượng đuôi.

`impact` là effect của attacker/skill, spawn tại target/impact point khi hit được xác nhận. Không tạo asset target-specific như `fire-wolf-hit-slime.png` hoặc `fire-wolf-hit-golem.png`; một Fire Wolf impact phải dùng được với mọi target phù hợp. Hurt animation, flash, knockback và death thuộc target/runtime gameplay.

Burn, slow, poison, drain và radiant mark chỉ là future shared/global status VFX concept. Pet Layer Factory không tạo status asset riêng cho từng pet, trừ khi executable recipe sau này yêu cầu.

### Ví dụ ranged và melee

Fox là ranged theo recipe hiện tại:

```text
attack-cast → projectile → impact
```

Wolf là melee theo recipe hiện tại:

```text
attack-cast → attack-trail → impact
```

Wolf không tạo projectile mặc định vì executable recipe không có slot đó. Cả hai chuỗi đều optional theo từng binding; thiếu một asset không buộc phải tạo placeholder hoặc dùng asset khác thay thế.

Asset Studio hiện mô phỏng lifecycle này để duyệt visual: cast ở lúc bắt đầu, projectile/trail/special tại attack marker và impact sau effect chính. Schema đã chuẩn bị `impact` cho consumer gameplay, nhưng repo hiện chưa triển khai combat hit-confirm/damage system đầy đủ; không suy diễn preview thành gameplay collision.

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
