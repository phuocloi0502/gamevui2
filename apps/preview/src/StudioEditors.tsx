import type { Clip, CombatVfxAnchor, CombatVfxEase, CombatVfxPresentation, CombatVfxTrigger, PetDefinition, State } from '../../../packages/asset-core/src/types';
import { combatVfxPresentation } from '../../../packages/asset-core/src/resolve';
import { PetView } from '../../../packages/pet-runtime/src/PetView';
import { CheckboxField, NumberField, SelectField, TintField } from './fields';
import { combatTriggerLabels, combatVfxLabel, keyframeLabel, layerLabel, propertyLabels, stateLabels } from './labels';
import type { ResolvedPet } from './studioTypes';

export function StudioEditors({ pet, manifest, view, onSave, onRebuild, onPlay }: {
  pet: ResolvedPet;
  manifest: PetDefinition;
  view: PetView | undefined;
  onSave: () => void;
  onRebuild: () => void;
  onPlay: (state: State) => void;
}) {
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

  return (
    <div id="transform-editor" className="transform-editor">
      <p className="label">VỊ TRÍ TOÀN PET</p>
      <p className="editor-help">X/Y đặt pet trong khung xem. Tỷ lệ thay đổi kích thước toàn bộ pet.</p>
      <div className="transform-fields">
        <NumberField label="Vị trí X" value={preview.x} onChange={value => { preview.x = value; view?.setPosition(value, preview.y); onSave(); }} />
        <NumberField label="Vị trí Y" value={preview.y} onChange={value => { preview.y = value; view?.setPosition(preview.x, value); onSave(); }} />
        <NumberField label="Tỷ lệ" value={preview.scale} onChange={value => {
          preview.scale = value;
          const direction = view ? Math.sign(view.scaleX) || 1 : 1;
          view?.setScale(direction * value, value);
          onSave();
        }} />
      </div>

      <div className="layer-editor">
        <p className="label">CHỈNH TỪNG LAYER</p>
        <p className="editor-help">Bật/tắt để kiểm tra từng phần. Neo X/Y là khớp xoay trong ảnh (0–1). Z nhỏ nằm sau, Z lớn nằm trước.</p>
        {pet.layers.map(layer => (
          <div key={layer.id} className="layer-row">
            <div className="layer-heading">
              <span className="layer-name">{layerLabel(layer.id)} ({layer.id})</span>
              <label className="visibility-toggle">
                <input type="checkbox" checked={layer.visible !== false} onChange={event => {
                  layer.visible = event.target.checked;
                  view?.setLayerVisible(layer.id, event.target.checked);
                  onSave();
                }} /> Hiển thị
              </label>
            </div>
            <NumberField label="Vị trí X" value={layer.x} onChange={value => { layer.x = value; view?.setLayerTransform(layer.id, 'x', value); onSave(); }} />
            <NumberField label="Vị trí Y" value={layer.y} onChange={value => { layer.y = value; view?.setLayerTransform(layer.id, 'y', value); onSave(); }} />
            <NumberField label="Tỷ lệ" value={layer.scale ?? 1} onChange={value => { layer.scale = value; view?.setLayerTransform(layer.id, 'scale', value); onSave(); }} />
            <NumberField label="Góc xoay" value={layer.angle ?? 0} onChange={value => { layer.angle = value; view?.setLayerTransform(layer.id, 'angle', value); onSave(); }} />
            <NumberField label="Độ trong suốt" value={layer.alpha ?? 1} onChange={value => { layer.alpha = value; view?.setLayerTransform(layer.id, 'alpha', value); onSave(); }} />
            <NumberField label="Điểm neo X" value={layer.originX} onChange={value => { layer.originX = value; view?.setLayerOrigin(layer.id, 'originX', value); onSave(); }} />
            <NumberField label="Điểm neo Y" value={layer.originY} onChange={value => { layer.originY = value; view?.setLayerOrigin(layer.id, 'originY', value); onSave(); }} />
            <NumberField label="Thứ tự Z" value={layer.z} onChange={value => { layer.z = value; view?.setLayerZ(layer.id, value); onSave(); }} />
            <TintField value={layer.tint} onChange={value => { layer.tint = value; view?.setLayerTint(layer.id, value); onSave(); }} />
          </div>
        ))}
      </div>

      <div className="combat-editor">
        <p className="label">CHỈNH COMBAT VFX</p>
        <p className="editor-help">Mọi thông số được lưu theo pet và level trong asset.json. Điểm đầu/cuối dùng neo Pet hoặc Mục tiêu; X tự lật theo hướng pet khi bật “Lật theo hướng”.</p>
        {!combatEntries.length && <p className="editor-empty">Pet này chưa khai báo Combat VFX.</p>}
        {combatEntries.map(([semantic]) => (
          <CombatVfxEditor key={semantic} semantic={semantic} pet={pet} manifest={manifest} onSave={onSave} onPlay={() => onPlay('attack')} />
        ))}
      </div>

      <div className="animation-editor">
        <p className="label">CHỈNH 4 CHUYỂN ĐỘNG</p>
        <p className="editor-help">Mỗi ô là một thời điểm trong animation: Đầu → Giữa → Cuối. X/Y là pixel lệch khỏi vị trí gốc, góc tính bằng độ, scale 1 là kích thước gốc. Chỉnh từng ô sẽ cập nhật preview và chỉ lưu cho pet này.</p>
        {(['idle', 'walk', 'attack', 'hurt'] as State[]).map(state => {
          const clip = pet.rig.clips?.[state];
          if (!clip) return null;
          return (
            <details key={state} className="clip-editor">
              <summary>
                <span><b>{stateLabels[state]}</b><small>{state}</small></span>
                <span>{clip.tracks.length} track · {clip.duration} ms</span>
              </summary>
              <div className="clip-settings">
                <NumberField label="Thời lượng (ms)" value={clip.duration} onChange={value => { if (value > 0) commitClip(state, { ...pet.rig.clips![state], duration: value }); }} />
                <label>
                  <input type="checkbox" checked={clip.loop} onChange={event => commitClip(state, { ...pet.rig.clips![state], loop: event.target.checked })} /> Lặp liên tục
                </label>
                {clip.event && (
                  <NumberField label="Thời điểm phát effect (ms)" value={clip.event.at} onChange={value => {
                    commitClip(state, { ...pet.rig.clips![state], event: { ...pet.rig.clips![state].event!, at: Math.max(0, value) } });
                  }} />
                )}
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
                            step={track.property === 'angle' || track.property === 'x' || track.property === 'y' ? '1' : '0.01'}
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

function CombatVfxEditor({ semantic, pet, manifest, onSave, onPlay }: {
  semantic: string;
  pet: ResolvedPet;
  manifest: PetDefinition;
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
  ];
  const anchorOptions: Array<{ value: CombatVfxAnchor; label: string }> = [
    { value: 'pet', label: 'Pet' }, { value: 'target', label: 'Mục tiêu' },
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
        <NumberField label="Trễ (ms)" value={config.delay} onChange={value => commit({ ...config, delay: Math.max(0, value) })} />
        <NumberField label="Thời lượng (ms)" value={config.duration} onChange={value => commit({ ...config, duration: Math.max(0, value) })} />
        <NumberField label="Thứ tự Z" value={config.depth} onChange={value => commit({ ...config, depth: value })} />
        <SelectField label="Nội suy" value={config.ease} options={easeOptions} onChange={value => commit({ ...config, ease: value })} />
        <CheckboxField label="Lật theo hướng pet" value={config.mirror} onChange={value => commit({ ...config, mirror: value })} />
      </div>
      <fieldset>
        <legend>Khung đầu</legend>
        <SelectField label="Neo" value={config.startAnchor} options={anchorOptions} onChange={value => commit({ ...config, startAnchor: value })} />
        <NumberField label="Vị trí X" value={config.startX} onChange={value => commit({ ...config, startX: value })} />
        <NumberField label="Vị trí Y" value={config.startY} onChange={value => commit({ ...config, startY: value })} />
        <NumberField label="Tỷ lệ" value={config.startScale} onChange={value => commit({ ...config, startScale: value })} />
        <NumberField label="Góc xoay" value={config.startAngle} onChange={value => commit({ ...config, startAngle: value })} />
        <NumberField label="Độ trong suốt" value={config.startAlpha} onChange={value => commit({ ...config, startAlpha: value })} />
      </fieldset>
      <fieldset>
        <legend>Khung cuối</legend>
        <SelectField label="Neo" value={config.endAnchor} options={anchorOptions} onChange={value => commit({ ...config, endAnchor: value })} />
        <NumberField label="Vị trí X" value={config.endX} onChange={value => commit({ ...config, endX: value })} />
        <NumberField label="Vị trí Y" value={config.endY} onChange={value => commit({ ...config, endY: value })} />
        <NumberField label="Tỷ lệ" value={config.endScale} onChange={value => commit({ ...config, endScale: value })} />
        <NumberField label="Góc xoay" value={config.endAngle} onChange={value => commit({ ...config, endAngle: value })} />
        <NumberField label="Độ trong suốt" value={config.endAlpha} onChange={value => commit({ ...config, endAlpha: value })} />
      </fieldset>
      <fieldset>
        <legend>Điểm neo ảnh</legend>
        <NumberField label="Điểm neo X" value={config.originX} onChange={value => commit({ ...config, originX: value })} />
        <NumberField label="Điểm neo Y" value={config.originY} onChange={value => commit({ ...config, originY: value })} />
      </fieldset>
      <button type="button" onClick={onPlay}>Chạy thử toàn bộ đòn</button>
    </details>
  );
}
