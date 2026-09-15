import { useState } from 'react';
import { speciesTemplate } from '../../../packages/asset-core/src/petCatalog';
import { ASSET_KINDS, petSpeciesId } from './library';
import type { ResolvedPet } from './studioTypes';

export function LibraryTree({ pets, selectedId, onSelect }: {
  pets: ResolvedPet[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [openKinds, setOpenKinds] = useState<Set<string>>(() => new Set(['pets']));

  function toggleKind(id: string) {
    setOpenKinds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // One representative per species (preserve insertion order by first encountered)
  const speciesMap = new Map<string, ResolvedPet>();
  for (const pet of pets) {
    const sid = petSpeciesId(pet);
    if (!speciesMap.has(sid)) speciesMap.set(sid, pet);
  }
  const speciesList = [...speciesMap.entries()];

  const selectedSpecies = selectedId ? petSpeciesId(pets.find(p => p.id === selectedId) ?? pets[0]) : '';

  return (
    <nav className="library-tree" aria-label="Thư viện asset">
      {ASSET_KINDS.map(kind => {
        const kindOpen = openKinds.has(kind.id);
        const count = kind.id === 'pets' ? speciesList.length : 0;

        return (
          <div key={kind.id} className="tree-node">
            <button
              type="button"
              className={`tree-folder${kindOpen ? ' is-open' : ''}`}
              style={{ paddingLeft: 8 }}
              onClick={() => toggleKind(kind.id)}
            >
              <span className="tree-chevron" aria-hidden>{kindOpen ? '▾' : '▸'}</span>
              <span className="tree-folder-name">{kind.name}</span>
              <span className="tree-count">{count}</span>
            </button>

            {kindOpen && kind.id !== 'pets' && (
              <p className="tree-empty">Chưa có asset. Sẽ thêm sau.</p>
            )}

            {kindOpen && kind.id === 'pets' && speciesList.map(([sid, rep]) => {
              const displayName = speciesTemplate(sid)?.name ?? sid.charAt(0).toUpperCase() + sid.slice(1);
              const isActive = selectedSpecies === sid;
              return (
                <button
                  key={sid}
                  type="button"
                  className={`tree-leaf${isActive ? ' is-active' : ''}`}
                  style={{ paddingLeft: 20 }}
                  onClick={() => {
                    const currentPet = pets.find(p => p.id === selectedId);
                    const preferLevel = currentPet?.evolutionLevel;
                    const target =
                      pets.find(p => petSpeciesId(p) === sid && p.evolutionLevel === preferLevel) ??
                      pets.find(p => p.lineageId === rep.lineageId);
                    if (target) onSelect(target.id);
                  }}
                >
                  <span>{displayName}</span>
                </button>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
