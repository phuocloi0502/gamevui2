import { useEffect, useState } from 'react';
import { PET_ARCHETYPES, PET_ELEMENTS, speciesTemplate } from '../../../packages/asset-core/src/petCatalog';
import { ASSET_KINDS, libraryPath, petArchetypeId, petSpeciesId, petsInFolder, speciesInArchetype } from './library';
import type { ResolvedPet } from './studioTypes';

export function LibraryTree({ pets, selectedId, onSelect }: {
  pets: ResolvedPet[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const selected = pets.find(pet => pet.id === selectedId);
  const selectedPath = selected ? libraryPath(selected) : undefined;
  const [open, setOpen] = useState<Set<string>>(() => new Set(pathKeys(selectedPath)));

  useEffect(() => {
    if (!selectedPath) return;
    setOpen(current => {
      const next = new Set(current);
      for (const key of pathKeys(selectedPath)) next.add(key);
      return next;
    });
  }, [selectedId, selectedPath?.elementId, selectedPath?.level, selectedPath?.archetypeId, selectedPath?.speciesId]);

  function toggle(key: string) {
    setOpen(current => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  return (
    <nav className="library-tree" aria-label="Thư viện asset">
      {ASSET_KINDS.map(kind => {
        const kindKey = kind.id;
        const kindOpen = open.has(kindKey);
        const count = kind.id === 'pets' ? pets.length : 0;
        return (
          <div key={kind.id} className="tree-node">
            <FolderRow label={kind.name} count={count} depth={0} open={kindOpen} onToggle={() => toggle(kindKey)} />
            {kindOpen && kind.id !== 'pets' && <p className="tree-empty">Chưa có asset. Sẽ thêm sau.</p>}
            {kindOpen && kind.id === 'pets' && PET_ELEMENTS.map(element => {
              const elementKey = `${kindKey}/${element.id}`;
              const elementPets = petsInFolder(pets, element.id);
              const elementOpen = open.has(elementKey);
              return (
                <div key={element.id} className="tree-node">
                  <FolderRow label={`Hệ ${element.name}`} count={elementPets.length} depth={1} open={elementOpen} onToggle={() => toggle(elementKey)} />
                  {elementOpen && ([1, 2, 3] as const).map(level => {
                    const levelKey = `${elementKey}/${level}`;
                    const levelPets = petsInFolder(pets, element.id, level);
                    const levelOpen = open.has(levelKey);
                    return (
                      <div key={level} className="tree-node">
                        <FolderRow label={`Level ${level}`} count={levelPets.length} depth={2} open={levelOpen} onToggle={() => toggle(levelKey)} />
                        {levelOpen && PET_ARCHETYPES.map(group => {
                          const groupKey = `${levelKey}/${group.id}`;
                          const groupPets = petsInFolder(pets, element.id, level, group.id);
                          const groupOpen = open.has(groupKey);
                          const unknown = levelPets.filter(pet => !speciesTemplate(petSpeciesId(pet)) && petArchetypeId(pet) === group.id);
                          return (
                            <div key={group.id} className="tree-node">
                              <FolderRow
                                label={group.name}
                                count={groupPets.length}
                                depth={3}
                                open={groupOpen}
                                muted={!group.validated}
                                onToggle={() => toggle(groupKey)}
                              />
                              {groupOpen && (
                                <>
                                  {speciesInArchetype(group.id).map(speciesId => {
                                    const template = speciesTemplate(speciesId)!;
                                    const pet = groupPets.find(item => petSpeciesId(item) === speciesId);
                                    const active = pet?.id === selectedId;
                                    return pet ? (
                                      <button
                                        key={speciesId}
                                        type="button"
                                        className={`tree-leaf${active ? ' is-active' : ''}`}
                                        style={{ paddingLeft: 52 }}
                                        onClick={() => onSelect(pet.id)}
                                      >
                                        <span>{template.name}</span>
                                        <small>{pet.name}</small>
                                      </button>
                                    ) : (
                                      <span key={speciesId} className="tree-leaf is-empty" style={{ paddingLeft: 52 }}>
                                        <span>{template.name}</span>
                                        <small>chưa có</small>
                                      </span>
                                    );
                                  })}
                                  {unknown.map(pet => (
                                    <button
                                      key={pet.id}
                                      type="button"
                                      className={`tree-leaf${pet.id === selectedId ? ' is-active' : ''}`}
                                      style={{ paddingLeft: 52 }}
                                      onClick={() => onSelect(pet.id)}
                                    >
                                      <span>{pet.name}</span>
                                      <small>không có trong catalog</small>
                                    </button>
                                  ))}
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}

function FolderRow({ label, count, depth, open, muted, onToggle }: {
  label: string;
  count: number;
  depth: number;
  open: boolean;
  muted?: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" className={`tree-folder${open ? ' is-open' : ''}${muted ? ' is-muted' : ''}`} style={{ paddingLeft: 8 + depth * 12 }} onClick={onToggle}>
      <span className="tree-chevron" aria-hidden>{open ? '▾' : '▸'}</span>
      <span className="tree-folder-name">{label}</span>
      <span className="tree-count">{count}</span>
    </button>
  );
}

function pathKeys(path: ReturnType<typeof libraryPath> | undefined) {
  if (!path) return ['pets'];
  return [
    path.kind,
    `${path.kind}/${path.elementId}`,
    `${path.kind}/${path.elementId}/${path.level}`,
    `${path.kind}/${path.elementId}/${path.level}/${path.archetypeId}`,
  ];
}
