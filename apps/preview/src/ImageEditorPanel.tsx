import { useMemo, useState } from 'react';
import { slotsForEvolution, speciesTemplate, type UploadSlot } from '../../../packages/asset-core/src/petCatalog';
import type { PetDefinition } from '../../../packages/asset-core/src/types';
import { combatVfxPresentation } from '../../../packages/asset-core/src/resolve';
import { addPetImages, replacePetImages } from './api';
import { isPng, readFile } from './files';
import { combatVfxLabel, groupByPetPart, layerLabel, selectedPetKey } from './labels';
import type { ResolvedPet } from './studioTypes';

type ReplacementAsset = {
  key: string;
  kind: 'layer' | 'combat';
  id: string;
  label: string;
  currentSrc: string;
  destSrc: string;
  shared: boolean;
};

function recipeSlots(pet: ResolvedPet) {
  const template = speciesTemplate(pet.species ?? pet.lineageId.split('-').at(-1) ?? '');
  return template ? slotsForEvolution(template, pet.evolutionLevel) : [];
}

function sourceUses(pet: ResolvedPet) {
  const counts = new Map<string, number>();
  const bump = (src?: string) => {
    if (!src) return;
    counts.set(src, (counts.get(src) ?? 0) + 1);
  };
  for (const layer of pet.layers) bump(layer.src);
  bump(pet.effects?.projectile);
  for (const src of Object.values(pet.effects?.attack ?? {})) bump(src);
  return counts;
}

function canonicalSrc(pet: ResolvedPet, slot: UploadSlot | undefined, id: string, folder: 'layers' | 'effects') {
  const file = slot?.file ?? `${id}.png`;
  const destFolder = slot?.folder ?? folder;
  return `/assets/pets/${pet.lineageId}/level-${pet.evolutionLevel}/${destFolder}/${file}`;
}

function replacementAssetsFor(pet: ResolvedPet): ReplacementAsset[] {
  const slots = recipeSlots(pet);
  const layersById = new Map(pet.layers.map(layer => [layer.id, layer]));
  const slotByLayerId = new Map<string, UploadSlot>();
  for (const slot of slots) {
    for (const instance of slot.instances ?? []) slotByLayerId.set(instance.id, slot);
  }
  const uses = sourceUses(pet);
  const items: ReplacementAsset[] = [];
  const seenLayers = new Set<string>();

  const pushLayer = (layerId: string) => {
    const layer = layersById.get(layerId);
    if (!layer || seenLayers.has(layer.id)) return;
    seenLayers.add(layer.id);
    const slot = slotByLayerId.get(layer.id);
    const shared = (uses.get(layer.src) ?? 0) > 1;
    const destSrc = shared ? canonicalSrc(pet, slot, layer.id, 'layers') : layer.src;
    items.push({
      key: `layer:${layer.id}`,
      kind: 'layer',
      id: layer.id,
      label: slot?.label ?? layerLabel(layer.id),
      currentSrc: layer.src,
      destSrc,
      shared,
    });
  };

  for (const slot of slots) {
    for (const instance of slot.instances ?? []) pushLayer(instance.id);
  }
  for (const layer of [...pet.layers].sort((a, b) => a.z - b.z)) pushLayer(layer.id);

  for (const [semantic, src] of Object.entries(pet.effects?.attack ?? {})) {
    if (!src) continue;
    const slot = slots.find(item => item.combatVfx === semantic);
    const shared = (uses.get(src) ?? 0) > 1;
    items.push({
      key: `combat:${semantic}`,
      kind: 'combat',
      id: semantic,
      label: slot?.label ?? combatVfxLabel(semantic),
      currentSrc: src,
      destSrc: shared ? canonicalSrc(pet, slot, semantic, 'effects') : src,
      shared,
    });
  }
  return items;
}

export function ImageEditorPanel({ pet, manifest, onClose }: { pet: ResolvedPet; manifest: PetDefinition; onClose: () => void }) {
  const [replaceFiles, setReplaceFiles] = useState<Record<string, File | undefined>>({});
  const [addFiles, setAddFiles] = useState<Record<string, File | undefined>>({});
  const [replaceStatus, setReplaceStatus] = useState('');
  const [addStatus, setAddStatus] = useState('');
  const [replaceBusy, setReplaceBusy] = useState(false);
  const [addBusy, setAddBusy] = useState(false);

  const replacementAssets = useMemo(() => replacementAssetsFor(pet), [pet]);
  const additionSlots = useMemo(() => {
    const layerIds = new Set(pet.layers.map(layer => layer.id));
    return recipeSlots(pet).filter(slot => {
      if (slot.combatVfx) return !pet.effects?.attack?.[slot.combatVfx];
      return !!slot.instances?.length && slot.instances.every(instance => !layerIds.has(instance.id));
    });
  }, [pet]);

  async function onReplace() {
    const chosen = replacementAssets.flatMap(asset => {
      const file = replaceFiles[asset.key];
      return file ? [{ file, asset }] : [];
    });
    if (!chosen.length) { setReplaceStatus('Hãy chọn ít nhất một ảnh PNG cần thay.'); return; }
    const invalid = chosen.find(({ file }) => !isPng(file));
    if (invalid) { setReplaceStatus(`${invalid.file.name} không phải PNG`); return; }
    setReplaceBusy(true);
    setReplaceStatus('Đang giữ nguyên PNG và lưu revision…');
    try {
      const uploads = [];
      for (const { file, asset } of chosen) {
        uploads.push({
          kind: asset.kind,
          id: asset.id,
          src: asset.currentSrc,
          destSrc: asset.destSrc,
          sourceDataUrl: await readFile(file),
        });
      }
      const result = await replacePetImages(pet.id, uploads);
      setReplaceStatus(`Đã thay ${uploads.length} ảnh · revision ${result.revision}. Đang tải lại preview…`);
      sessionStorage.setItem(selectedPetKey, pet.id);
      window.location.reload();
    } catch (error) {
      setReplaceStatus(error instanceof Error ? error.message : 'Không thể thay ảnh');
      setReplaceBusy(false);
    }
  }

  async function onAdd() {
    const chosen = additionSlots.flatMap(slot => {
      const file = addFiles[slot.id];
      return file ? [{ file, slot }] : [];
    });
    if (!chosen.length) { setAddStatus('Hãy chọn ít nhất một PNG cần thêm.'); return; }
    const invalid = chosen.find(({ file }) => !isPng(file));
    if (invalid) { setAddStatus(`${invalid.file.name} không phải PNG`); return; }
    setAddBusy(true);
    setAddStatus('Đang thêm asset và cập nhật manifest…');
    try {
      const next = structuredClone(manifest) as PetDefinition;
      const uploads: Array<{ file: string; folder: 'layers' | 'effects'; sourceDataUrl: string }> = [];
      for (const { file, slot } of chosen) {
        const src = `/assets/pets/${next.lineageId}/level-${next.evolutionLevel}/${slot.folder}/${slot.file}`;
        uploads.push({ file: slot.file, folder: slot.folder, sourceDataUrl: await readFile(file) });
        if (slot.combatVfx) {
          next.effects ??= {};
          next.effects.attack ??= {};
          next.effects.attack[slot.combatVfx] = src;
          next.effects.attackPresentation ??= {};
          next.effects.attackPresentation[slot.combatVfx] = combatVfxPresentation(slot.combatVfx);
        } else {
          for (const instance of slot.instances ?? []) next.layers.push({ ...instance, src });
        }
      }
      next.layers.sort((a, b) => a.z - b.z);
      await addPetImages(next.id, next, uploads);
      setAddStatus(`Đã thêm ${uploads.length} asset. Đang tải lại Studio…`);
      sessionStorage.setItem(selectedPetKey, next.id);
      window.location.reload();
    } catch (error) {
      setAddStatus(error instanceof Error ? error.message : 'Không thể thêm asset');
      setAddBusy(false);
    }
  }

  return (
    <section className="creator image-editor">
      <div className="creator-heading">
        <div>
          <p className="label">QUẢN LÝ PNG</p>
          <h2>Ảnh của pet đang chọn</h2>
          <p className="muted">Mỗi layer/recipe slot là một PNG riêng. Ảnh thay thế giữ nguyên kích thước, alpha, transparent padding và artwork offset; source upload được giữ trong assets/inbox.</p>
        </div>
        <button type="button" aria-label="Đóng" onClick={onClose}>×</button>
      </div>
      <h3>Thay ảnh hiện có</h3>
      <p className="editor-help">Ảnh được gom theo chân, thân–đuôi, đầu và hiệu ứng. Pet cũ đang dùng chung một file cho nhiều chân hoặc mắt sẽ được tách sang layers/id.png khi bạn thay ảnh đó.</p>
      <div className="upload-groups">
        {groupByPetPart(replacementAssets, asset => asset.id, asset => asset.kind === 'combat').map(group => (
          <details key={group.id} className="layer-group" open>
            <summary>
              <span><b>{group.label}</b></span>
              <span>{group.items.length} ảnh</span>
            </summary>
            <div className="upload-slots">
              {group.items.map(asset => {
                const currentName = asset.currentSrc.split('/').at(-1) ?? asset.currentSrc;
                const destPath = asset.destSrc.replace(`/assets/pets/${pet.lineageId}/level-${pet.evolutionLevel}/`, '');
                return (
                  <label key={asset.key} className="upload-slot replacement-slot">
                    <span>{asset.label}</span>
                    <code>{destPath}</code>
                    <small>
                      {asset.shared
                        ? `Đang dùng chung ${currentName}. Lưu sẽ tách thành ${destPath}.`
                        : asset.currentSrc}
                    </small>
                    <input type="file" accept="image/png" onChange={event => setReplaceFiles(current => ({ ...current, [asset.key]: event.target.files?.[0] }))} />
                  </label>
                );
              })}
            </div>
          </details>
        ))}
      </div>
      <div className="creator-footer">
        <button type="button" disabled={replaceBusy} onClick={onReplace}>Lưu ảnh thay thế</button>
        <span id="replace-status" aria-live="polite">{replaceStatus}</span>
      </div>
      {additionSlots.length > 0 && (
        <div className="image-addition">
          <h3>Thêm asset còn thiếu</h3>
          <p className="editor-help">Slot recipe chưa có trên pet này, gồm mắt mở/nhắm nếu pet cũ chưa tách khỏi đầu.</p>
          <div className="upload-groups">
            {groupByPetPart(additionSlots, slot => slot.instances?.[0]?.id ?? slot.id, slot => !!slot.combatVfx).map(group => (
              <details key={group.id} className="layer-group" open>
                <summary>
                  <span><b>{group.label}</b></span>
                  <span>{group.items.length} ảnh</span>
                </summary>
                <div className="upload-slots">
                  {group.items.map(slot => (
                    <label key={slot.id} className="upload-slot">
                      <span>{slot.label} <small>{slot.optional ? 'tùy chọn' : 'bắt buộc còn thiếu'}</small></span>
                      <code>{slot.folder}/{slot.file}</code>
                      <input type="file" accept="image/png" onChange={event => setAddFiles(current => ({ ...current, [slot.id]: event.target.files?.[0] }))} />
                    </label>
                  ))}
                </div>
              </details>
            ))}
          </div>
          <div className="creator-footer">
            <button type="button" disabled={addBusy} onClick={onAdd}>Thêm vào pet</button>
            <span id="add-status" aria-live="polite">{addStatus}</span>
          </div>
        </div>
      )}
    </section>
  );
}
