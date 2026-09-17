import { useState } from 'react';
import type { AttackMeta, AttackPattern, Clip, ClipEvent, CombatVfxAnchor, CombatVfxEase, CombatVfxPresentation, CombatVfxTrigger, Layer, PetDefinition, State } from '../../../packages/asset-core/src/types';
import { combatVfxPresentation } from '../../../packages/asset-core/src/resolve';
import { PetView } from '../../../packages/pet-runtime/src/PetView';
import { CheckboxField, NumberField, SelectField, TintField } from './fields';
import { attackPatternLabels, combatAnchorLabels, combatTriggerLabels, combatVfxLabel, groupPetLayers, keyframeLabel, layerLabel, propertyLabels, stateLabels } from './labels';
import type { ResolvedPet } from './studioTypes';

const NUDGE_STEPS = [0.1, 1, 10, 100] as const;

export function StudioEditors({ pet, pets, manifest, view, onSave, onRebuild, onPreviewScaleChange, onPlay }: {
  pet: ResolvedPet;
  pets: ResolvedPet[];
  manifest: PetDefinition;
  view: PetView | undefined;
  onSave: () => void;
  onRebuild: () => void;
  onPreviewScaleChange: (scale: number) => void;
  onPlay: (state: State) => void;
}) {
  const [nudgeStep, setNudgeStep] = useState<(typeof NUDGE_STEPS)[number]>(1);
  const preview = manifest.preview ?? { x: 420, y: 440, scale: 1 };
  manifest.preview = preview;
  const combatEntries = Object.entries(pet.effects?.attack ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === 'string');

  const commitClip = (state: State, next: Clip, rebuild = false) => {
    manifest.overrides ??= {};
    manifest.overrides.clips ??= {};
    manifest.overrides.clips[state] = next;
    if (pet.rig.clips) pet.rig.clips[state] = next;
    if (rebuild) onRebuild();
    else if (view?.state === state) view.play(state);
    onSave();
  };

  const removeLayer = (layerId: string) => {
    const removed = collectDescendantIds(pet.layers, layerId);
    const names = pet.layers.filter(layer => removed.has(layer.id)).map(layer => `${layerLabel(layer.id)} (${layer.id})`);
    if (!names.length) return;
    if (removed.size >= pet.layers.length) {
      window.alert('Không xóa hết layer. Pet cần còn ít nhất một layer.');
      return;
    }
    const extra = names.length > 1 ? `\nCũng sẽ xóa layer con: ${names.slice(1).join(', ')}.` : '';
    if (!window.confirm(`Xóa ${names[0]} khỏi pet này?${extra}\nẢnh PNG gốc vẫn giữ trong inbox/public.`)) return;
    const remaining = pet.layers.filter(layer => !removed.has(layer.id));
    pet.layers.splice(0, pet.layers.length, ...remaining);
    if (manifest.layers !== pet.layers) {
      manifest.layers.splice(0, manifest.layers.length, ...remaining);
    }
    const nextReference = remaining.find(layer => layer.id === 'body')?.src ?? remaining[0]?.src;
    if (nextReference) {
      manifest.reference = nextReference;
      pet.reference = nextReference;
    }
    stripClipTracks(manifest, pet, removed);
    onRebuild();
    onSave();
  };

  return (
    <div id="transform-editor" className="transform-editor">
      <div className="nudge-step">
        <label>
          <span>Bước chỉnh</span>
          <select value={nudgeStep} aria-label="Bước chỉnh thông số" onChange={event => setNudgeStep(Number(event.target.value) as (typeof NUDGE_STEPS)[number])}>
            {NUDGE_STEPS.map(step => <option key={step} value={step}>{step}</option>)}
          </select>
        </label>
      </div>
      <CopyPetSettings
        pet={pet}
        pets={pets}
        manifest={manifest}
        onSave={onSave}
        onRebuild={onRebuild}
        onPreviewScaleChange={onPreviewScaleChange}
      />
      <p className="label">VỊ TRÍ TOÀN PET</p>
      <p className="editor-help">X/Y đặt pet trong khung xem. Tỷ lệ thay đổi kích thước toàn bộ pet. Mũi tên ô số nhảy theo bước đã chọn.</p>
      <div className="transform-fields">
        <NumberField label="Vị trí X" step={nudgeStep} value={preview.x} onChange={value => { preview.x = value; view?.setPosition(value, preview.y); onSave(); }} />
        <NumberField label="Vị trí Y" step={nudgeStep} value={preview.y} onChange={value => { preview.y = value; view?.setPosition(preview.x, value); onSave(); }} />
        <NumberField label="Tỷ lệ" step={nudgeStep} value={preview.scale} onChange={value => {
          preview.scale = value;
          const direction = view ? Math.sign(view.scaleX) || 1 : 1;
          view?.setScale(direction * value, value);
          onPreviewScaleChange(value);
          onSave();
        }} />
      </div>

      <div className="layer-editor">
        <p className="label">CHỈNH TỪNG LAYER</p>
        <p className="editor-help">Bật/tắt để kiểm tra từng phần. Neo X/Y là khớp xoay trong ảnh (0–1). Z nhỏ nằm sau, Z lớn nằm trước. Xóa layer (ví dụ đuôi không dùng) sẽ lưu vào asset.json; ảnh gốc không bị xóa.</p>
        {groupPetLayers(pet.layers).map(group => (
          <details key={group.id} className="layer-group" open>
            <summary>
              <span><b>{group.label}</b></span>
              <span>{group.layers.length} layer</span>
            </summary>
            {group.layers.map(layer => (
              <LayerRow key={layer.id} layer={layer} step={nudgeStep} view={view} onSave={onSave} onRemove={() => removeLayer(layer.id)} />
            ))}
          </details>
        ))}
      </div>

      <div className="combat-editor">
        <p className="label">CHỈNH COMBAT VFX</p>
        <p className="editor-help">Pattern quyết định preview: đơn, splash (vòng quanh mục tiêu), volley (nhiều đạn), chain hoặc AoE. Neo gồm Pet, Mục tiêu và Tâm AoE. X tự lật theo hướng pet khi bật “Lật theo hướng”.</p>
        <AttackMetaEditor pet={pet} manifest={manifest} step={nudgeStep} onSave={onSave} />
        {!combatEntries.length && <p className="editor-empty">Pet này chưa khai báo Combat VFX.</p>}
        {combatEntries.map(([semantic]) => (
          <CombatVfxEditor key={semantic} semantic={semantic} pet={pet} manifest={manifest} step={nudgeStep} onSave={onSave} onPlay={() => onPlay('attack')} />
        ))}
      </div>

      <div className="animation-editor">
        <p className="label">CHỈNH 3 CHUYỂN ĐỘNG</p>
        <p className="editor-help">Mỗi ô là một thời điểm trong animation: Đầu → Giữa → Cuối. X/Y là pixel lệch khỏi vị trí gốc, góc tính bằng độ, scale 1 là kích thước gốc. Chỉnh từng ô sẽ cập nhật preview và chỉ lưu cho pet này.</p>
        {(['idle', 'walk', 'attack'] as State[]).map(state => {
          const clip = pet.rig.clips?.[state];
          if (!clip) return null;
          return (
            <details key={state} className="clip-editor">
              <summary>
                <span><b>{stateLabels[state]}</b><small>{state}</small></span>
                <span>{clip.tracks.length} track · {clip.duration} ms</span>
              </summary>
              <div className="clip-settings">
                <NumberField label="Thời lượng (ms)" step={nudgeStep} value={clip.duration} onChange={value => { if (value > 0) commitClip(state, { ...pet.rig.clips![state], duration: value }); }} />
                <label>
                  <input type="checkbox" checked={clip.loop} onChange={event => commitClip(state, { ...pet.rig.clips![state], loop: event.target.checked })} /> Lặp liên tục
                </label>
                <ClipMarkersEditor state={state} clip={clip} step={nudgeStep} commitClip={commitClip} />
                <button type="button" onClick={() => onPlay(state)}>Chạy thử</button>
                {pet.layers.length > 0 && (
                  <button type="button" onClick={() => {
                    const current = pet.rig.clips![state];
                    commitClip(state, { ...current, tracks: [...current.tracks, { target: pet.layers[0].id, property: 'angle', values: [0, 0, 0] }] }, true);
                  }}>+ Thêm chuyển động layer</button>
                )}
              </div>
              {clip.tracks.map((track, trackIndex) => {
                const targetOptions = pet.layers.map(layer => ({ value: layer.id, label: `${layerLabel(layer.id)} (${layer.id})` }));
                if (!targetOptions.some(option => option.value === track.target)) {
                  targetOptions.unshift({ value: track.target, label: `${track.target} · chưa có layer` });
                }
                const propertyOptions: Array<{ value: Clip['tracks'][number]['property']; label: string }> = (
                  ['x', 'y', 'angle', 'scaleX', 'scaleY', 'alpha'] as const
                ).map(value => ({ value, label: propertyLabels[value] ?? value }));
                return (
                  <div key={`${state}-${trackIndex}-${track.target}-${track.property}`} className="track-row">
                    <div className="track-meta">
                      <SelectField label="Layer đích" value={track.target} options={targetOptions} onChange={value => {
                        const current = pet.rig.clips![state];
                        commitClip(state, { ...current, tracks: current.tracks.map((item, index) => index === trackIndex ? { ...item, target: value } : item) }, true);
                      }} />
                      <SelectField label="Thuộc tính" value={track.property} options={propertyOptions} onChange={value => {
                        const current = pet.rig.clips![state];
                        commitClip(state, { ...current, tracks: current.tracks.map((item, index) => index === trackIndex ? { ...item, property: value } : item) }, true);
                      }} />
                      <div className="track-actions">
                        <button type="button" onClick={() => {
                          const current = pet.rig.clips![state];
                          const tracks = [...current.tracks];
                          tracks.splice(trackIndex + 1, 0, { ...current.tracks[trackIndex], values: [...current.tracks[trackIndex].values] });
                          commitClip(state, { ...current, tracks }, true);
                        }}>Nhân bản</button>
                        <button type="button" onClick={() => {
                          const current = pet.rig.clips![state];
                          commitClip(state, { ...current, tracks: current.tracks.filter((_, index) => index !== trackIndex) }, true);
                        }}>Xóa track</button>
                      </div>
                    </div>
                    <div className="keyframe-fields">
                      {track.values.map((value, valueIndex) => (
                        <label key={valueIndex}>
                          <span>{keyframeLabel(valueIndex, track.values.length)}</span>
                          <input
                            type="number"
                            step={nudgeStep}
                            value={value}
                            aria-label={`${track.target} ${track.property} tại ${keyframeLabel(valueIndex, track.values.length)}`}
                            onChange={event => {
                              const nextValue = Number(event.target.value);
                              if (!Number.isFinite(nextValue)) return;
                              const current = pet.rig.clips![state];
                              const tracks = current.tracks.map((item, index) => {
                                if (index !== trackIndex) return { ...item, values: [...item.values] };
                                const values = [...item.values]; values[valueIndex] = nextValue;
                                return { ...item, values };
                              });
                              commitClip(state, { ...current, tracks });
                            }}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </details>
          );
        })}
      </div>
    </div>
  );
}

const REQUIRED_LAYER_PRESENTATION_FIELDS = ['x', 'y', 'originX', 'originY', 'z'] as const;
const OPTIONAL_LAYER_PRESENTATION_FIELDS = ['scale', 'angle', 'alpha', 'visible', 'tint'] as const;

function CopyPetSettings({ pet, pets, manifest, onSave, onRebuild, onPreviewScaleChange }: {
  pet: ResolvedPet;
  pets: ResolvedPet[];
  manifest: PetDefinition;
  onSave: () => void;
  onRebuild: () => void;
  onPreviewScaleChange: (scale: number) => void;
}) {
  const [sourceId, setSourceId] = useState('');
  const [copyPreview, setCopyPreview] = useState(true);
  const [copyLayers, setCopyLayers] = useState(true);
  const [copyAnimations, setCopyAnimations] = useState(true);
  const [copyCombat, setCopyCombat] = useState(true);
  const source = pets.find(item => item.id === sourceId && item.id !== pet.id);
  const choices = pets
    .filter(item => item.id !== pet.id)
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  const targetLayerIds = new Set(pet.layers.map(layer => layer.id));
  const targetLayers = new Map(pet.layers.map(layer => [layer.id, layer]));
  const matchingLayerCount = source?.layers.filter(layer => {
    const target = targetLayers.get(layer.id);
    return target && target.parent === layer.parent;
  }).length ?? 0;
  const targetCombatIds = new Set(Object.keys(pet.effects?.attack ?? {}));
  const matchingCombatCount = source
    ? Object.keys(source.effects?.attack ?? {}).filter(semantic => targetCombatIds.has(semantic)).length
    : 0;
  const selectedCount = [copyPreview, copyLayers, copyAnimations, copyCombat].filter(Boolean).length;

  const apply = () => {
    if (!source || !selectedCount) return;
    const summary = [
      copyPreview ? 'vị trí/scale toàn pet' : '',
      copyLayers ? `${matchingLayerCount} layer trùng ID` : '',
      copyAnimations ? '3 chuyển động (chỉ giữ target layer tương thích)' : '',
      copyCombat ? `${matchingCombatCount} Combat VFX trùng loại và pattern đòn` : '',
    ].filter(Boolean).join(', ');
    if (!window.confirm(`Lấy thông số từ “${source.name}” và ghi đè ${summary} của “${pet.name}”?\nẢnh, đường dẫn asset, ID, level và rig hiện tại được giữ nguyên.`)) return;

    if (copyPreview) {
      const nextPreview = structuredClone(source.preview ?? { x: 420, y: 440, scale: 1 });
      manifest.preview = nextPreview;
      pet.preview = nextPreview;
      onPreviewScaleChange(nextPreview.scale);
    }

    if (copyLayers) {
      const sourceLayers = new Map(source.layers.map(layer => [layer.id, layer]));
      for (const layer of pet.layers) {
        const sourceLayer = sourceLayers.get(layer.id);
        if (!sourceLayer || sourceLayer.parent !== layer.parent) continue;
        for (const field of REQUIRED_LAYER_PRESENTATION_FIELDS) {
          Object.assign(layer, { [field]: sourceLayer[field] });
        }
        for (const field of OPTIONAL_LAYER_PRESENTATION_FIELDS) {
          if (sourceLayer[field] !== undefined) Object.assign(layer, { [field]: sourceLayer[field] });
          else delete layer[field];
        }
      }
    }

    if (copyAnimations) {
      manifest.overrides ??= {};
      manifest.overrides.clips ??= {};
      pet.rig.clips ??= {} as NonNullable<typeof pet.rig.clips>;
      for (const state of ['idle', 'walk', 'attack'] as State[]) {
        const sourceClip = source.rig.clips?.[state];
        if (!sourceClip) continue;
        const nextClip: Clip = {
          ...structuredClone(sourceClip),
          tracks: structuredClone(sourceClip.tracks.filter(track => targetLayerIds.has(track.target))),
        };
        manifest.overrides.clips[state] = nextClip;
        pet.rig.clips[state] = nextClip;
      }
    }

    if (copyCombat) {
      manifest.effects ??= {};
      pet.effects ??= {};
      manifest.effects.attackPresentation ??= {};
      pet.effects.attackPresentation ??= {};
      for (const semantic of targetCombatIds) {
        if (!source.effects?.attack?.[semantic]) continue;
        const nextPresentation = combatVfxPresentation(semantic, source.effects.attackPresentation?.[semantic]);
        manifest.effects.attackPresentation[semantic] = structuredClone(nextPresentation);
        pet.effects.attackPresentation[semantic] = structuredClone(nextPresentation);
      }
      const nextAttackMeta = structuredClone(source.effects?.attackMeta ?? { pattern: 'single' as const });
      manifest.effects.attackMeta = nextAttackMeta;
      pet.effects.attackMeta = structuredClone(nextAttackMeta);
    }

    onRebuild();
    onSave();
  };

  return (
    <details className="copy-settings">
      <summary>
        <span><b>LẤY THÔNG SỐ TỪ PET KHÁC</b></span>
        <span>Giữ nguyên ảnh pet hiện tại</span>
      </summary>
      <div className="copy-settings-body">
        <p className="editor-help">Chỉ sao chép thông số tương thích. Layer được ghép khi trùng ID và cùng parent; PNG, đường dẫn ảnh, danh tính, level và rig không thay đổi.</p>
        <label className="copy-source">
          <span>Pet nguồn</span>
          <select value={sourceId} onChange={event => setSourceId(event.target.value)}>
            <option value="">Chọn pet để lấy thông số…</option>
            {choices.map(item => (
              <option key={item.id} value={item.id}>{item.name} · {item.id}</option>
            ))}
          </select>
        </label>
        {source && (
          <p className="copy-compatibility">
            Tương thích: {matchingLayerCount}/{pet.layers.length} layer hiện tại · {matchingCombatCount}/{targetCombatIds.size} loại Combat VFX hiện tại
          </p>
        )}
        <div className="copy-options">
          <label><input type="checkbox" checked={copyPreview} onChange={event => setCopyPreview(event.target.checked)} /> Vị trí/scale toàn pet</label>
          <label><input type="checkbox" checked={copyLayers} onChange={event => setCopyLayers(event.target.checked)} /> Transform layer trùng ID</label>
          <label><input type="checkbox" checked={copyAnimations} onChange={event => setCopyAnimations(event.target.checked)} /> 3 chuyển động</label>
          <label><input type="checkbox" checked={copyCombat} onChange={event => setCopyCombat(event.target.checked)} /> Combat VFX và pattern đòn</label>
        </div>
        <button type="button" disabled={!source || !selectedCount} onClick={apply}>Áp thông số cho pet đang sửa</button>
      </div>
    </details>
  );
}

function collectDescendantIds(layers: Layer[], rootId: string) {
  const ids = new Set([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const layer of layers) {
      if (layer.parent && ids.has(layer.parent) && !ids.has(layer.id)) {
        ids.add(layer.id);
        grew = true;
      }
    }
  }
  return ids;
}

function stripClipTracks(manifest: PetDefinition, pet: ResolvedPet, ids: Set<string>) {
  const filterClip = (clip: Clip): Clip => ({ ...clip, tracks: clip.tracks.filter(track => !ids.has(track.target)) });
  const overrides = manifest.overrides?.clips;
  if (overrides) {
    for (const state of Object.keys(overrides) as State[]) {
      const clip = overrides[state];
      if (!clip) continue;
      overrides[state] = filterClip(clip);
    }
  }
  if (!pet.rig.clips) return;
  for (const state of Object.keys(pet.rig.clips) as State[]) {
    const clip = pet.rig.clips[state];
    if (!clip) continue;
    pet.rig.clips[state] = overrides?.[state] ?? filterClip(clip);
  }
}

function LayerRow({ layer, step, view, onSave, onRemove }: {
  layer: Layer;
  step: number;
  view: PetView | undefined;
  onSave: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="layer-row">
      <div className="layer-heading">
        <span className="layer-name">{layerLabel(layer.id)} ({layer.id})</span>
        <div className="layer-heading-actions">
          <label className="visibility-toggle">
            <input type="checkbox" checked={layer.visible !== false} onChange={event => {
              layer.visible = event.target.checked;
              view?.setLayerVisible(layer.id, event.target.checked);
              onSave();
            }} /> Hiển thị
          </label>
          <button type="button" className="layer-delete" onClick={onRemove}>Xóa</button>
        </div>
      </div>
      <NumberField label="Vị trí X" step={step} value={layer.x} onChange={value => { layer.x = value; view?.setLayerTransform(layer.id, 'x', value); onSave(); }} />
      <NumberField label="Vị trí Y" step={step} value={layer.y} onChange={value => { layer.y = value; view?.setLayerTransform(layer.id, 'y', value); onSave(); }} />
      <NumberField label="Tỷ lệ" step={step} value={layer.scale ?? 1} onChange={value => { layer.scale = value; view?.setLayerTransform(layer.id, 'scale', value); onSave(); }} />
      <NumberField label="Góc xoay" step={step} value={layer.angle ?? 0} onChange={value => { layer.angle = value; view?.setLayerTransform(layer.id, 'angle', value); onSave(); }} />
      <NumberField label="Độ trong suốt" step={step} value={layer.alpha ?? 1} onChange={value => { layer.alpha = value; view?.setLayerTransform(layer.id, 'alpha', value); onSave(); }} />
      <NumberField label="Điểm neo X" step={step} value={layer.originX} onChange={value => { layer.originX = value; view?.setLayerOrigin(layer.id, 'originX', value); onSave(); }} />
      <NumberField label="Điểm neo Y" step={step} value={layer.originY} onChange={value => { layer.originY = value; view?.setLayerOrigin(layer.id, 'originY', value); onSave(); }} />
      <NumberField label="Thứ tự Z" step={step} value={layer.z} onChange={value => { layer.z = value; view?.setLayerZ(layer.id, value); onSave(); }} />
      <TintField value={layer.tint} onChange={value => { layer.tint = value; view?.setLayerTint(layer.id, value); onSave(); }} />
    </div>
  );
}

function CombatVfxEditor({ semantic, pet, manifest, step, onSave, onPlay }: {
  semantic: string;
  pet: ResolvedPet;
  manifest: PetDefinition;
  step: number;
  onSave: () => void;
  onPlay: () => void;
}) {
  const config = combatVfxPresentation(semantic, pet.effects?.attackPresentation?.[semantic]);
  const commit = (next: CombatVfxPresentation) => {
    manifest.effects ??= {};
    manifest.effects.attackPresentation ??= {};
    manifest.effects.attackPresentation[semantic] = { ...next };
    pet.effects ??= {};
    pet.effects.attackPresentation ??= {};
    pet.effects.attackPresentation[semantic] = { ...next };
    onSave();
  };
  const triggerOptions: Array<{ value: CombatVfxTrigger; label: string }> = [
    { value: 'attack-start', label: combatTriggerLabels['attack-start'] },
    { value: 'attack-release', label: combatTriggerLabels['attack-release'] },
    { value: 'after-primary', label: combatTriggerLabels['after-primary'] },
    { value: 'after-impact', label: combatTriggerLabels['after-impact'] },
  ];
  const anchorOptions: Array<{ value: CombatVfxAnchor; label: string }> = [
    { value: 'pet', label: combatAnchorLabels.pet },
    { value: 'target', label: combatAnchorLabels.target },
    { value: 'aoe-center', label: combatAnchorLabels['aoe-center'] },
  ];
  const easeOptions: Array<{ value: CombatVfxEase; label: string }> = [
    { value: 'Linear', label: 'Đều' },
    { value: 'Sine.easeInOut', label: 'Mềm đầu và cuối' },
    { value: 'Quad.easeOut', label: 'Nhanh rồi chậm' },
    { value: 'Back.easeOut', label: 'Vượt nhẹ rồi về' },
  ];
  return (
    <details className="vfx-editor">
      <summary>
        <span><b>{combatVfxLabel(semantic)}</b><small>{semantic}</small></span>
        <span>{combatTriggerLabels[config.trigger]}</span>
      </summary>
      <div className="vfx-settings">
        <CheckboxField label="Bật hiệu ứng" value={config.enabled} onChange={value => commit({ ...config, enabled: value })} />
        <SelectField label="Kích hoạt" value={config.trigger} options={triggerOptions} onChange={value => commit({ ...config, trigger: value })} />
        <NumberField label="Trễ (ms)" step={step} value={config.delay} onChange={value => commit({ ...config, delay: Math.max(0, value) })} />
        <NumberField label="Thời lượng (ms)" step={step} value={config.duration} onChange={value => commit({ ...config, duration: Math.max(0, value) })} />
        <NumberField label="Thứ tự Z" step={step} value={config.depth} onChange={value => commit({ ...config, depth: value })} />
        <SelectField label="Nội suy" value={config.ease} options={easeOptions} onChange={value => commit({ ...config, ease: value })} />
        <CheckboxField label="Lật theo hướng pet" value={config.mirror} onChange={value => commit({ ...config, mirror: value })} />
      </div>
      <fieldset>
        <legend>Khung đầu</legend>
        <SelectField label="Neo" value={config.startAnchor} options={anchorOptions} onChange={value => commit({ ...config, startAnchor: value })} />
        <NumberField label="Vị trí X" step={step} value={config.startX} onChange={value => commit({ ...config, startX: value })} />
        <NumberField label="Vị trí Y" step={step} value={config.startY} onChange={value => commit({ ...config, startY: value })} />
        <NumberField label="Tỷ lệ" step={step} value={config.startScale} onChange={value => commit({ ...config, startScale: value })} />
        <NumberField label="Góc xoay" step={step} value={config.startAngle} onChange={value => commit({ ...config, startAngle: value })} />
        <NumberField label="Độ trong suốt" step={step} value={config.startAlpha} onChange={value => commit({ ...config, startAlpha: value })} />
      </fieldset>
      <fieldset>
        <legend>Khung cuối</legend>
        <SelectField label="Neo" value={config.endAnchor} options={anchorOptions} onChange={value => commit({ ...config, endAnchor: value })} />
        <NumberField label="Vị trí X" step={step} value={config.endX} onChange={value => commit({ ...config, endX: value })} />
        <NumberField label="Vị trí Y" step={step} value={config.endY} onChange={value => commit({ ...config, endY: value })} />
        <NumberField label="Tỷ lệ" step={step} value={config.endScale} onChange={value => commit({ ...config, endScale: value })} />
        <NumberField label="Góc xoay" step={step} value={config.endAngle} onChange={value => commit({ ...config, endAngle: value })} />
        <NumberField label="Độ trong suốt" step={step} value={config.endAlpha} onChange={value => commit({ ...config, endAlpha: value })} />
      </fieldset>
      <fieldset>
        <legend>Điểm neo ảnh</legend>
        <NumberField label="Điểm neo X" step={step} value={config.originX} onChange={value => commit({ ...config, originX: value })} />
        <NumberField label="Điểm neo Y" step={step} value={config.originY} onChange={value => commit({ ...config, originY: value })} />
      </fieldset>
      <button type="button" onClick={onPlay}>Chạy thử toàn bộ đòn</button>
    </details>
  );
}

function AttackMetaEditor({ pet, manifest, step, onSave }: {
  pet: ResolvedPet;
  manifest: PetDefinition;
  step: number;
  onSave: () => void;
}) {
  const meta = pet.effects?.attackMeta ?? { pattern: 'single' as const };
  const commit = (next: AttackMeta) => {
    manifest.effects ??= {};
    manifest.effects.attackMeta = next;
    pet.effects ??= {};
    pet.effects.attackMeta = next;
    onSave();
  };
  const patternOptions: Array<{ value: AttackPattern; label: string }> = (
    ['single', 'splash', 'chain', 'volley', 'aoe'] as AttackPattern[]
  ).map(value => ({ value, label: attackPatternLabels[value] }));
  return (
    <div className="attack-meta-editor">
      <SelectField label="Pattern đòn" value={meta.pattern} options={patternOptions} onChange={value => {
        if (value === 'splash') commit({ pattern: 'splash', radius: meta.radius ?? 65 });
        else if (value === 'aoe') commit({ pattern: 'aoe', radius: meta.radius ?? 100 });
        else if (value === 'chain') commit({ pattern: 'chain', chainCount: meta.chainCount ?? 2 });
        else if (value === 'volley') commit({ pattern: 'volley', volleyCount: meta.volleyCount ?? 3, volleySpread: meta.volleySpread ?? 30 });
        else commit({ pattern: 'single' });
      }} />
      {(meta.pattern === 'splash' || meta.pattern === 'aoe') && (
        <NumberField label="Bán kính splash / AoE" step={step} value={meta.radius ?? 65} onChange={value => commit({ ...meta, radius: Math.max(0, value) })} />
      )}
      {meta.pattern === 'chain' && (
        <NumberField label="Số lần nảy thêm" step={step} value={meta.chainCount ?? 2} onChange={value => commit({ ...meta, chainCount: Math.max(0, Math.round(value)) })} />
      )}
      {meta.pattern === 'volley' && (
        <>
          <NumberField label="Số đạn volley" step={step} value={meta.volleyCount ?? 3} onChange={value => commit({ ...meta, volleyCount: Math.max(1, Math.round(value)) })} />
          <NumberField label="Góc spread (độ)" step={step} value={meta.volleySpread ?? 30} onChange={value => commit({ ...meta, volleySpread: Math.max(0, value) })} />
        </>
      )}
    </div>
  );
}

function ClipMarkersEditor({ state, clip, step, commitClip }: {
  state: State;
  clip: Clip;
  step: number;
  commitClip: (state: State, next: Clip, rebuild?: boolean) => void;
}) {
  const markers: ClipEvent[] = clip.events?.length ? clip.events : (clip.event ? [clip.event] : []);
  const write = (nextMarkers: ClipEvent[]) => {
    const sorted = [...nextMarkers].sort((a, b) => a.at - b.at);
    if (!sorted.length) commitClip(state, { ...clip, event: undefined, events: undefined });
    else if (sorted.length === 1) commitClip(state, { ...clip, event: sorted[0], events: undefined });
    else commitClip(state, { ...clip, event: undefined, events: sorted });
  };
  return (
    <div className="clip-markers">
      {markers.map((marker, index) => (
          <div key={index} className="clip-marker-row">
          <NumberField label={markers.length > 1 ? `Mốc ${index + 1} (ms)` : 'Thời điểm phát effect (ms)'} step={step} value={marker.at} onChange={value => {
            write(markers.map((item, i) => i === index ? { ...item, at: Math.max(0, value) } : item));
          }} />
          {markers.length > 1 && (
            <button type="button" onClick={() => write(markers.filter((_, i) => i !== index))}>Xóa mốc</button>
          )}
        </div>
      ))}
      <button type="button" onClick={() => {
        const last = markers.at(-1);
        write([...markers, { at: Math.max(0, (last?.at ?? 400) + 250), name: last?.name ?? 'attack-release' }]);
      }}>+ Thêm mốc tung đòn</button>
    </div>
  );
}
