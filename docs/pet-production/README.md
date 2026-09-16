# Pet production specs

Production contracts theo từng species. Mỗi file khóa sheet cố định, layer rules và combat VFX theo `packages/asset-core/src/petCatalog.ts`.

| Species | Spec | Sheet | Skill |
|---|---|---|---|
| Fox | [fox-production-spec.md](./fox-production-spec.md) | 4×4 / 16 ô | Element Tail Bolt |
| Wolf | [wolf-production-spec.md](./wolf-production-spec.md) | 4×4 / 16 ô | Fang Rush |
| Bunny | [bunny-production-spec.md](./bunny-production-spec.md) | 3×4 / 12 ô | Burst Ram |
| Turtle | [turtle-production-spec.md](./turtle-production-spec.md) | 3×4 / 12 ô | Element Cage |
| Golem | [golem-production-spec.md](./golem-production-spec.md) | 4×4 / 14 ô (+2 trống cấm) | Core Quake |
| Dragon | [dragon-production-spec.md](./dragon-production-spec.md) | 3×4 / 12 ô | Element Meteor |
| Owl | [owl-production-spec.md](./owl-production-spec.md) | 3×4 / 12 ô | Element Orb |
| Hawk | [hawk-production-spec.md](./hawk-production-spec.md) | 3×4 / 12 ô | Cyclone Dive |
| Slime | [slime-production-spec.md](./slime-production-spec.md) | 2×4 / 8 ô | Element Pulse |
| Serpent | [serpent-production-spec.md](./serpent-production-spec.md) | 3×4 / 12 ô | Element Lance |

## Luật chung

1. Recipe TypeScript thắng Markdown khi conflict filename / required / z / transform.
2. Spec thắng factory guide về **thứ tự ô, cấm text/grid, occupancy, không nhét `assembly-ref` vào sheet cố định**.
3. View mặc định: 3/4 facing right, chibi fantasy.
4. `head` không chứa mắt; `eyes-open` / `eyes-closed` là hai layer riêng.
5. `assembly-ref` nếu cần thì **file riêng**, không nằm trong lưới crop cố định.
6. Không redesign species / không đổi skill identity giữa Level 1→2→3.
