import { useMemo, useState } from 'react';
import { slotsForEvolution, speciesTemplate } from '../../../packages/asset-core/src/petCatalog';
import type { PetDefinition } from '../../../packages/asset-core/src/types';
import { combatVfxPresentation } from '../../../packages/asset-core/src/resolve';
import { addPetImages, replacePetImages } from './api';
import { isPng, readFile, runtimeFile, imageSize } from './files';
import { combatVfxLabel, selectedPetKey } from './labels';
import type { ResolvedPet } from './studioTypes';

type ReplacementAsset = { src: string; labels: string[] };

export function ImageEditorPanel({ pet, manifest, onClose }: { pet: ResolvedPet; manifest: PetDefinition; onClose: () => void }) {
  const [replaceFiles, setReplaceFiles] = useState<Record<number, File | undefined>>({});
  const [addFiles, setAddFiles] = useState<Record<string, File | undefined>>({});
  const [replaceStatus, setReplaceStatus] = useState('');
  const [addStatus, setAddStatus] = useState('');
  const [replaceBusy, setReplaceBusy] = useState(false);
  const [addBusy, setAddBusy] = useState(false);

  const replacementAssets = useMemo(() => {
    const bySource = new Map<string, Set<string>>();
    const add = (src: string | undefined, label: string) => {
      if (!src) return;
      const labels = bySource.get(src) ?? new Set<string>();
      labels.add(label); bySource.set(src, labels);
    };
    for (const layer of pet.layers) add(layer.src, layer.id);
    for (const [semantic, src] of Object.entries(pet.effects?.attack ?? {})) add(src, combatVfxLabel(semantic));
    return [...bySource].map(([src, labels]) => ({ src, labels: [...labels] })) as ReplacementAsset[];
  }, [pet]);

  const additionSlots = useMemo(() => {
    const template = speciesTemplate(pet.species ?? pet.lineageId.split('-').at(-1) ?? '');
    const layerIds = new Set(pet.layers.map(layer => layer.id));
    return template ? slotsForEvolution(template, pet.evolutionLevel).filter(slot => {
      if (slot.combatVfx) return !pet.effects?.attack?.[slot.combatVfx];
      return !!slot.instances?.length && slot.instances.every(instance => !layerIds.has(instance.id));
    }) : [];
  }, [pet]);

  async function onReplace() {
    const chosen = replacementAssets.flatMap((asset, index) => {
      const file = replaceFiles[index];
      return file ? [{ file, asset }] : [];
    });
    if (!chosen.length) { setReplaceStatus('Hãy chọn ít nhất một ảnh PNG cần thay.'); return; }
    const invalid = chosen.find(({ file }) => !isPng(file));
    if (invalid) { setReplaceStatus(`${invalid.file.name} không phải PNG`); return; }
    setReplaceBusy(true);
    setReplaceStatus('Đang kiểm tra kích thước và lưu revision…');
    try {
      const uploads = [];
      for (const { file, asset } of chosen) {
        const size = await imageSize(asset.src);
        uploads.push({ src: asset.src, sourceDataUrl: await readFile(file), runtimeDataUrl: await runtimeFile(file, size) });
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
      const uploads: Array<{ file: string; folder: 'layers' | 'effects'; sourceDataUrl: string; runtimeDataUrl: string }> = [];
      for (const { file, slot } of chosen) {
        const src = `/assets/pets/${next.lineageId}/level-${next.evolutionLevel}/${slot.folder}/${slot.file}`;
        uploads.push({ file: slot.file, folder: slot.folder, sourceDataUrl: await readFile(file), runtimeDataUrl: await runtimeFile(file, slot.runtimeSize) });
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
          <p className="muted">Thay ảnh hiện có hoặc bổ sung optional layer/VFX còn thiếu theo đúng recipe. Source upload và runtime cũ được giữ trong assets/inbox.</p>
        </div>
        <button type="button" aria-label="Đóng" onClick={onClose}>×</button>
      </div>
      <h3>Thay ảnh hiện có</h3>
      <div className="upload-slots">
        {replacementAssets.map((asset, index) => {
          const fileName = asset.src.split('/').at(-1) ?? asset.src;
          return (
            <label key={asset.src} className="upload-slot replacement-slot">
              <span>{asset.labels.join(', ')}</span>
              <code>{fileName}</code>
              <small>{asset.src}</small>
              <input type="file" accept="image/png" onChange={event => setReplaceFiles(current => ({ ...current, [index]: event.target.files?.[0] }))} />
            </label>
          );
        })}
      </div>
      <div className="creator-footer">
        <button type="button" disabled={replaceBusy} onClick={onReplace}>Lưu ảnh thay thế</button>
        <span id="replace-status" aria-live="polite">{replaceStatus}</span>
      </div>
      {additionSlots.length > 0 && (
        <div className="image-addition">
          <h3>Thêm asset còn thiếu</h3>
          <p className="editor-help">Chỉ hiện các slot được executable recipe hỗ trợ nhưng pet chưa khai báo.</p>
          <div className="upload-slots">
            {additionSlots.map(slot => (
              <label key={slot.id} className="upload-slot">
                <span>{slot.label} <small>{slot.optional ? 'tùy chọn' : 'bắt buộc còn thiếu'}</small></span>
                <code>{slot.folder}/{slot.file}</code>
                <input type="file" accept="image/png" onChange={event => setAddFiles(current => ({ ...current, [slot.id]: event.target.files?.[0] }))} />
              </label>
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
