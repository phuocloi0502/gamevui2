import { useMemo, useRef, useState } from 'react';
import { PET_ELEMENTS, archetypeFor, speciesTemplate, slotsForEvolution } from '../../../packages/asset-core/src/petCatalog';
import type { EvolutionLevel, PetDefinition, Rig, State } from '../../../packages/asset-core/src/types';
import { resolvePet } from '../../../packages/asset-core/src/resolve';
import { PetView } from '../../../packages/pet-runtime/src/PetView';
import { saveManifest } from './api';
import { CreatorPanel } from './CreatorPanel';
import { ImageEditorPanel } from './ImageEditorPanel';
import { LibraryTree } from './LibraryTree';
import { PhaserStage } from './PhaserStage';
import { StudioEditors } from './StudioEditors';
import { libraryPath, petAtLevel, petSpeciesId } from './library';
import { attackPatternLabels, selectedPetKey, stateLabels } from './labels';

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
  const [zoom, setZoom] = useState(() => pets.find(item => item.id === selectedId)?.preview?.scale ?? 1);
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
    const nextPet = pets.find(item => item.id === id);
    sessionStorage.setItem(selectedPetKey, id);
    setSelectedId(id);
    setPaused(false);
    setZoom(nextPet?.preview?.scale ?? 1);
    setSpeed(1);
    setRemountKey(key => key + 1);
    if (!canManageImages(nextPet)) setImageEditorOpen(false);
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

  function selectElement(elementId: string) {
    if (!pet) return;
    const species = petSpeciesId(pet);
    const level = pet.evolutionLevel;
    const target =
      pets.find(p => petSpeciesId(p) === species && p.element === elementId && p.evolutionLevel === level) ??
      pets.find(p => petSpeciesId(p) === species && p.element === elementId) ??
      pets.find(p => p.element === elementId);
    if (target) selectPet(target.id);
  }

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
          <div className="workspace-title">
            <p className="label">WORKSPACE / {path ? `PETS / ${path.elementName.toUpperCase()} / LEVEL ${path.level}` : 'PETS'}</p>
            <h1>Pet workshop</h1>
            {path && <p className="muted">{path.archetypeName} · {path.speciesName}</p>}
          </div>
          <span className="badge">LOCAL</span>
        </header>
        <section className="layout">
          <div className="studio-panel">
            <div className="toolbar">
              <div className="toolbar-actions">
                <div className="toolbar-cluster">
                  <button type="button" disabled={!canEditImages} onClick={() => { setImageEditorOpen(true); setCreatorOpen(false); }}>Quản lý ảnh pet</button>
                </div>
                <button type="button" onClick={() => { setCreatorOpen(true); setImageEditorOpen(false); }}>+ Tạo pet từ layer</button>
                <span>{pet?.layers.length ? 'LIVE RIG / PNG + MOTION' : 'ART REFERENCE'}</span>
              </div>
            </div>
            <div className="element-nav" aria-label="Chọn hệ và cấp tiến hóa">
              <span className="element-nav-label">Hệ</span>
              {PET_ELEMENTS.map(element => (
                <button
                  key={element.id}
                  type="button"
                  className={`element-tab element-tab--${element.id}${pet?.element === element.id ? ' is-active' : ''}`}
                  onClick={() => selectElement(element.id)}
                >
                  {element.name}
                </button>
              ))}
              <span className="element-nav-divider" aria-hidden />
              <span className="element-nav-label">Level</span>
              {pet && ([1, 2, 3] as EvolutionLevel[]).map(level => {
                const target = petAtLevel(pets, pet, level);
                return (
                  <button
                    key={level}
                    type="button"
                    className={`element-tab level-tab${pet.evolutionLevel === level ? ' is-active' : ''}`}
                    disabled={!target}
                    onClick={() => { if (target && target.id !== pet.id) selectPet(target.id); }}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
            {creatorOpen && <CreatorPanel onClose={() => setCreatorOpen(false)} />}
            {imageEditorOpen && pet && manifest && <ImageEditorPanel pet={pet} manifest={manifest} onClose={() => setImageEditorOpen(false)} />}
            {pet && manifest && (
              <div className="preview-grid">
                <PhaserStage pet={pet} remountKey={remountKey} background={background} playingRef={playingRef} onView={onView} />
                <div id="controls-slot">
                  <div className="controls">
                    <div className="clips">
                      {(['idle', 'walk', 'attack'] as State[]).map(state => (
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
                      pets={pets}
                      manifest={manifest}
                      view={viewRef.current}
                      onSave={() => { scheduleSave(); setTick(value => value + 1); }}
                      onRebuild={() => setRemountKey(key => key + 1)}
                      onPreviewScaleChange={setZoom}
                      onPlay={state => viewRef.current?.play(state)}
                    />
                    <p className="save-status" aria-live="polite">{saveStatus}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          {pet && (
            <article className="asset-inspector">
              <span className="label">ASSET</span>
              <strong>{pet.name}</strong>
              <span className="muted">{pet.lineageId} · Lv{pet.evolutionLevel} · {species || '—'} · {pet.element} · {group?.name ?? 'Legacy'} · {attackPatternLabels[pet.effects?.attackMeta?.pattern ?? 'single']} · {pet.layers.length} layer · {pet.extends}</span>
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
