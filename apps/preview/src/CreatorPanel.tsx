import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { PET_ARCHETYPES, PET_ELEMENTS, archetypeFor, slotsForEvolution, speciesTemplate, type PetElement, type PetSpeciesId } from '../../../packages/asset-core/src/petCatalog';
import type { CombatVfxPresentation, Layer, PetDefinition } from '../../../packages/asset-core/src/types';
import { combatVfxPresentation, defaultAttackMeta } from '../../../packages/asset-core/src/resolve';
import { createPet } from './api';
import { isPng, readFile, runtimeFile } from './files';
import { groupByPetPart, selectedPetKey } from './labels';

export function CreatorPanel({ onClose }: { onClose: () => void }) {
  const [species, setSpecies] = useState(speciesTemplate(PET_ARCHETYPES[0].species[0])!.id);
  const [elementId, setElementId] = useState(PET_ELEMENTS[0].id);
  const [level, setLevel] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState(`${PET_ELEMENTS[0].name} ${speciesTemplate(PET_ARCHETYPES[0].species[0])!.name} · Level 1`);
  const [files, setFiles] = useState<Record<string, File | undefined>>({});
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const template = speciesTemplate(species)!;
  const element = PET_ELEMENTS.find(item => item.id === elementId)!;
  const templateSlots = useMemo(() => slotsForEvolution(template, level), [template, level]);
  const lineageId = `${element.id}-${template.id}`;
  const stageId = `${lineageId}-level-${level}`;
  const group = archetypeFor(template.archetype)!;

  useEffect(() => {
    setName(`${element.name} ${template.name} · Level ${level}`);
  }, [element, template, level]);

  async function onCreate() {
    const selected = new Map(templateSlots.map(slot => [slot.id, files[slot.id]]));
    const missing = templateSlots.filter(slot => !slot.optional && !selected.get(slot.id));
    if (missing.length) { setStatus(`Thiếu: ${missing.map(slot => slot.label).join(', ')}`); return; }
    const invalid = [...selected.values()].filter((file): file is File => !!file).find(file => !isPng(file));
    if (invalid) { setStatus(`${invalid.name} không phải PNG`); return; }
    setBusy(true);
    setStatus('Đang lưu ảnh và tạo manifest…');
    try {
      const layers: Layer[] = [];
      const uploads: Array<{ file: string; folder: 'layers' | 'effects'; sourceDataUrl: string; runtimeDataUrl: string }> = [];
      const attack: Record<string, string> = {};
      const attackPresentation: Record<string, CombatVfxPresentation> = {};
      for (const slot of templateSlots) {
        const file = selected.get(slot.id);
        if (!file) continue;
        const src = `/assets/pets/${lineageId}/level-${level}/${slot.folder}/${slot.file}`;
        uploads.push({ file: slot.file, folder: slot.folder, sourceDataUrl: await readFile(file), runtimeDataUrl: await runtimeFile(file, slot.runtimeSize) });
        for (const instance of slot.instances ?? []) layers.push({ ...instance, src });
        if (slot.combatVfx) {
          attack[slot.combatVfx] = src;
          attackPresentation[slot.combatVfx] = combatVfxPresentation(slot.combatVfx);
        }
      }
      layers.sort((a, b) => a.z - b.z);
      const manifest: PetDefinition = {
        id: stageId,
        lineageId, evolutionLevel: level,
        name: name.trim() || `${element.name} ${template.name} · Level ${level}`,
        kind: 'pet', species: template.id, archetype: template.archetype, extends: template.rig,
        status: 'production', element: element.id,
        reference: layers.find(item => item.id === 'body')?.src ?? layers[0].src,
        layers, preview: { x: 420, y: 440, scale: 1 },
        ...(Object.keys(attack).length ? { effects: { color: element.color, attack, attackPresentation, attackMeta: defaultAttackMeta(level) } } : {}),
      };
      await createPet(manifest.id, manifest, uploads);
      setStatus('Đã tạo pet. Đang tải lại catalog…');
      sessionStorage.setItem(selectedPetKey, manifest.id);
      window.location.reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Không thể tạo pet');
      setBusy(false);
    }
  }

  function onSpecies(event: FormEvent<HTMLSelectElement>) {
    setSpecies(event.currentTarget.value as PetSpeciesId);
    setFiles({});
  }

  return (
    <section className="creator">
      <div className="creator-heading">
        <div>
          <p className="label">PET LAYER IMPORT</p>
          <h2>Tạo cấp tiến hóa từ bộ PNG</h2>
          <p className="muted">Chọn species, element và level để lấy đúng rig cùng thông số khởi đầu. Ảnh gốc được giữ trong assets/inbox.</p>
        </div>
        <button type="button" id="close-creator" aria-label="Đóng" onClick={onClose}>×</button>
      </div>
      <div className="creator-fields">
        <label>Species
          <select value={species} onChange={onSpecies}>
            {PET_ARCHETYPES.map(groupItem => (
              <optgroup key={groupItem.id} label={`${groupItem.name}${groupItem.validated ? '' : ' · chưa kiểm chứng'}`}>
                {groupItem.species.map(speciesId => {
                  const item = speciesTemplate(speciesId)!;
                  return <option key={item.id} value={item.id}>{item.name}</option>;
                })}
              </optgroup>
            ))}
          </select>
        </label>
        <label>Element
          <select value={elementId} onChange={event => { setElementId(event.target.value as PetElement); setFiles({}); }}>
            {PET_ELEMENTS.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label>Tiến hóa
          <select value={level} onChange={event => { setLevel(Number(event.target.value) as 1 | 2 | 3); setFiles({}); }}>
            <option value="1">Level 1</option>
            <option value="2">Level 2</option>
            <option value="3">Level 3</option>
          </select>
        </label>
        <label>Tên hiển thị
          <input type="text" value={name} onChange={event => setName(event.target.value)} />
        </label>
        <label>Stage ID
          <input type="text" value={stageId} readOnly />
        </label>
      </div>
      <p className="template-status">
        {template.validated
          ? `${group.name} · ${template.rig} · template đã được kiểm chứng`
          : `${group.name} · ${template.rig} · thông số khởi đầu, cần chỉnh và kiểm chứng bằng pet flagship`}
      </p>
      <div className="upload-groups">
        {groupByPetPart(templateSlots, slot => slot.instances?.[0]?.id ?? slot.id, slot => !!slot.combatVfx).map(group => (
          <details key={group.id} className="layer-group" open>
            <summary>
              <span><b>{group.label}</b></span>
              <span>{group.items.length} ảnh</span>
            </summary>
            <div className="upload-slots">
              {group.items.map(slot => (
                <label key={slot.id} className="upload-slot">
                  <span>{slot.label} {slot.optional ? <small>tùy chọn</small> : <b>bắt buộc</b>}</span>
                  <code>{slot.folder}/{slot.file}</code>
                  <input type="file" accept="image/png" required={!slot.optional} onChange={event => setFiles(current => ({ ...current, [slot.id]: event.target.files?.[0] }))} />
                </label>
              ))}
            </div>
          </details>
        ))}
      </div>
      <div className="creator-footer">
        <button type="button" disabled={busy} onClick={onCreate}>Tạo cấp tiến hóa</button>
        <span id="create-status">{status}</span>
      </div>
    </section>
  );
}
