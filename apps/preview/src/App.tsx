import { useMemo, useRef, useState } from 'react';
import { PET_ARCHETYPES, PET_ELEMENTS, archetypeFor, speciesTemplate, slotsForEvolution } from '../../../packages/asset-core/src/petCatalog';
import type { PetDefinition, Rig, State } from '../../../packages/asset-core/src/types';
import { resolvePet } from '../../../packages/asset-core/src/resolve';
import { PetView } from '../../../packages/pet-runtime/src/PetView';
import { saveManifest } from './api';
import { CreatorPanel } from './CreatorPanel';
import { ImageEditorPanel } from './ImageEditorPanel';
import { LibraryTree } from './LibraryTree';
import { PhaserStage } from './PhaserStage';
import { StudioEditors } from './StudioEditors';
import { libraryPath, petsInFolder } from './library';
import { selectedPetKey, stateLabels } from './labels';

export function App({ petDefinitions, rigs }: { petDefinitions: PetDefinition[]; rigs: Record<string, Rig> }) {
  const pets = useMemo(() => petDefinitions.map(pet => resolvePet(pet, rigs)), [petDefinitions, rigs]);
  const manifests = useMemo(() => Object.fromEntries(petDefinitions.map(pet => [pet.id, pet])), [petDefinitions]);
  const [selectedId, setSelectedId] = useState(() => {
    const remembered = sessionStorage.getItem(selectedPetKey);
    return pets.find(pet => pet.id === remembered)?.id ?? pets[0]?.id ?? '';
  });
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [imageEditorOpen, setImageEditorOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [background, setBackground] = useState('#141820');
  const [saveStatus, setSaveStatus] = useState('');
  const [remountKey, setRemountKey] = useState(0);
  const [, setTick] = useState(0);
  const viewRef = useRef<PetView | undefined>(undefined);
  const playingRef = useRef<HTMLSpanElement>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const pet = pets.find(item => item.id === selectedId) ?? pets[0];
  const manifest = pet ? manifests[pet.id] : undefined;
  const species = pet?.species ?? pet?.lineageId.split('-').at(-1) ?? '';
  const group = pet ? archetypeFor(pet.archetype ?? speciesTemplate(species)?.archetype ?? 'quadruped') : undefined;
  const canEditImages = canManageImages(pet);

  function scheduleSave() {
    if (!pet) return;
    setSaveStatus('Đang chờ lưu…');
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        await saveManifest(pet.id, manifests[pet.id]);
        setSaveStatus('Đã tự lưu vào asset.json');
      } catch (error) {
        setSaveStatus(`Chưa lưu được: ${error instanceof Error ? error.message : 'API không khả dụng'}`);
      }
    }, 400);
  }

  function selectPet(id: string) {
    sessionStorage.setItem(selectedPetKey, id);
    setSelectedId(id);
    setPaused(false);
    setZoom(1);
    setSpeed(1);
    setRemountKey(key => key + 1);
    if (!canManageImages(pets.find(item => item.id === id))) setImageEditorOpen(false);
  }

  function onView(view: PetView | undefined) {
    viewRef.current = view;
    if (view) {
      view.paused = paused;
      view.speed = speed;
      const scale = zoom;
      view.setScale(Math.sign(view.scaleX || 1) * scale, scale);
    }
    setTick(value => value + 1);
  }

  const path = pet ? libraryPath(pet) : undefined;
  const selectGroups = PET_ELEMENTS.flatMap(element => [1, 2, 3].flatMap(level => PET_ARCHETYPES.map(groupItem => {
    const groupPets = petsInFolder(pets, element.id, level as 1 | 2 | 3, groupItem.id)
      .sort((a, b) => a.lineageId.localeCompare(b.lineageId));
    return { element, level, group: groupItem, pets: groupPets };
  }))).filter(item => item.pets.length);

  return (
    <>
      <aside>
        <a className="brand" href="/">✦ <span>GameVui<small>ASSET STUDIO</small></span></a>
        <p className="label">THƯ VIỆN</p>
        <LibraryTree pets={pets} selectedId={pet?.id ?? ''} onSelect={selectPet} />
        <footer>LAYERS → RIG → PREVIEW<br />React / Phaser 3 / TypeScript</footer>
      </aside>
      <main>
        <header>
          <div>
            <p className="label">WORKSPACE / {path ? `PETS / ${path.elementName.toUpperCase()} / LEVEL ${path.level}` : 'PETS'}</p>
            <h1>Pet workshop</h1>
            <p className="muted">{path ? `${path.archetypeName} · ${path.speciesName}` : 'Một bộ khung chung. Mỗi pet một cá tính.'}</p>
          </div>
          <span className="badge">LOCAL STUDIO</span>
        </header>
        <section className="layout">
          <div className="studio-panel">
            <div className="toolbar">
              <select className="library-select" aria-label="Chọn pet" value={pet?.id ?? ''} onChange={event => selectPet(event.target.value)}>
                {selectGroups.map(({ element, level, group: groupItem, pets: groupPets }) => (
                  <optgroup key={`${element.id}-${level}-${groupItem.id}`} label={`${element.name} / Level ${level} / ${groupItem.name}`}>
                    {groupPets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </optgroup>
                ))}
              </select>
              <div className="toolbar-actions">
                <button type="button" disabled={!canEditImages} onClick={() => { setImageEditorOpen(true); setCreatorOpen(false); }}>Quản lý ảnh pet</button>
                <button type="button" onClick={() => { setCreatorOpen(true); setImageEditorOpen(false); }}>+ Tạo pet từ layer</button>
                <span>{pet?.layers.length ? 'LIVE RIG / PNG + MOTION' : 'ART REFERENCE'}</span>
              </div>
            </div>
            {creatorOpen && <CreatorPanel onClose={() => setCreatorOpen(false)} />}
            {imageEditorOpen && pet && manifest && <ImageEditorPanel pet={pet} manifest={manifest} onClose={() => setImageEditorOpen(false)} />}
            {pet && manifest && (
              <div className="preview-grid">
                <PhaserStage pet={pet} remountKey={remountKey} background={background} playingRef={playingRef} onView={onView} />
                <div id="controls-slot">
                  <div className="controls">
                    <div className="clips">
                      {(['idle', 'walk', 'attack', 'hurt'] as State[]).map(state => (
                        <button key={state} type="button" onClick={() => viewRef.current?.play(state)}>{stateLabels[state]}</button>
                      ))}
                    </div>
                    <div className="options">
                      <button type="button" onClick={() => {
                        const view = viewRef.current;
                        if (!view) return;
                        view.paused = !view.paused;
                        setPaused(view.paused);
                      }}>{paused ? 'Tiếp tục' : 'Tạm dừng'}</button>
                      <button type="button" onClick={() => { if (viewRef.current) viewRef.current.scaleX *= -1; }}>Lật hướng</button>
                      <label>Zoom <input type="range" min="0.4" max="1.8" step="0.1" value={zoom} onChange={event => {
                        const value = Number(event.target.value);
                        setZoom(value);
                        const view = viewRef.current;
                        if (view) view.setScale(Math.sign(view.scaleX) * value, value);
                      }} /></label>
                      <label>Tốc độ <select value={speed} onChange={event => {
                        const value = Number(event.target.value);
                        setSpeed(value);
                        if (viewRef.current) viewRef.current.speed = value;
                      }}>
                        <option value="0.5">0.5×</option>
                        <option value="1">1×</option>
                        <option value="2">2×</option>
                      </select></label>
                      <label>Nền <select value={background} onChange={event => setBackground(event.target.value)}>
                        <option value="#141820">Tối</option>
                        <option value="#eee5d7">Sáng</option>
                        <option value="#475b65">Xanh xám</option>
                      </select></label>
                      <span ref={playingRef}>Đứng yên</span>
                    </div>
                    <StudioEditors
                      pet={pet}
                      manifest={manifest}
                      view={viewRef.current}
                      onSave={() => { scheduleSave(); setTick(value => value + 1); }}
                      onRebuild={() => setRemountKey(key => key + 1)}
                      onPlay={state => viewRef.current?.play(state)}
                    />
                    <p className="save-status" aria-live="polite">{saveStatus}</p>
                  </div>
                </div>
              </div>
            )}
            <p className="muted">
              {pet?.layers.length ? 'Preview layer ghép bằng renderer dùng chung.' : 'Bảng ảnh tham khảo gốc • Chưa phải pet đã tách nền hoặc rig hoàn chỉnh.'}
            </p>
          </div>
          {pet && (
            <article>
              <p className="label">ASSET INSPECTOR</p>
              <h2>{pet.name}</h2>
              <dl>
                Lineage: {pet.lineageId} · Tiến hóa: Level {pet.evolutionLevel} · Species: {species || 'chưa khai báo'} · Element: {pet.element} · Nhóm: {group?.name ?? 'Legacy'} · Layers: {pet.layers.length}
              </dl>
              <hr />
              <p className="label">KẾ THỪA</p>
              <p className="chain"><span>{group?.name ?? 'Legacy'} ({pet.extends})</span> → <strong>{pet.name}</strong></p>
              <p className="muted">Canvas và animation lấy từ rig nhóm. Ảnh layer và thông số lắp ghép nằm trong manifest của pet.</p>
              <hr />
              <p className="label">TIẾN ĐỘ</p>
              <p id="status">
                {pet.layers.length
                  ? `PNG alpha • ${pet.layers.length} layer instances • 4 animation states • ${pet.element} effect`
                  : 'Đã lưu concept. PNG layer và animation production chưa được tạo.'}
              </p>
            </article>
          )}
        </section>
      </main>
    </>
  );
}

function canManageImages(pet: ReturnType<typeof resolvePet> | undefined) {
  if (!pet) return false;
  const template = speciesTemplate(pet.species ?? pet.lineageId.split('-').at(-1) ?? '');
  const layerIds = new Set(pet.layers.map(layer => layer.id));
  const additions = template ? slotsForEvolution(template, pet.evolutionLevel).some(slot => {
    if (slot.combatVfx) return !pet.effects?.attack?.[slot.combatVfx];
    return !!slot.instances?.length && slot.instances.every(instance => !layerIds.has(instance.id));
  }) : false;
  return pet.layers.length > 0 || Object.values(pet.effects?.attack ?? {}).some(Boolean) || additions;
}
