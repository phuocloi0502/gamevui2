import Phaser from 'phaser';
import './style.css';
import type { Clip, CombatVfxAnchor, CombatVfxEase, CombatVfxPresentation, CombatVfxTrigger, Layer, PetDefinition, Rig, State } from '../../../packages/asset-core/src/types';
import { combatVfxPresentation, resolvePet } from '../../../packages/asset-core/src/resolve';
import { PET_ARCHETYPES, PET_ELEMENTS, archetypeFor, slotsForEvolution, speciesTemplate } from '../../../packages/asset-core/src/petCatalog';
import type { UploadSlot } from '../../../packages/asset-core/src/petCatalog';
import { PetView } from '../../../packages/pet-runtime/src/PetView';

const stateLabels: Record<State, string> = { idle: 'Đứng yên', walk: 'Di chuyển', attack: 'Tấn công', hurt: 'Trúng đòn' };
const propertyLabels: Record<string, string> = {
  x: 'Dịch ngang · pixel', y: 'Dịch dọc · pixel', angle: 'Góc xoay · độ', scaleX: 'Co giãn ngang · hệ số', scaleY: 'Co giãn dọc · hệ số', alpha: 'Độ trong suốt · 0 đến 1',
};
const layerLabels: Record<string, string> = {
  shadow: 'Bóng dưới chân',
  'effect-back': 'Hiệu ứng phía sau',
  tail: 'Đuôi',
  'tail-left-outer': 'Đuôi trái ngoài',
  'tail-left-inner': 'Đuôi trái trong',
  'tail-center': 'Đuôi giữa',
  'tail-right-inner': 'Đuôi phải trong',
  'tail-right-outer': 'Đuôi phải ngoài',
  'tail-back': 'Đuôi phía sau',
  'tail-front': 'Đuôi phía trước',
  'rear-far': 'Chân sau · phía đuôi · xa người xem',
  'rear-near': 'Chân sau · phía đuôi · gần người xem',
  body: 'Thân',
  'front-far': 'Chân trước · phía đầu · xa người xem',
  'front-near': 'Chân trước · phía đầu · gần người xem',
  head: 'Đầu',
  'effect-front': 'Hiệu ứng phía trước',
  'element-effect': 'Hiệu ứng nguyên tố',
  flame: 'Ngọn lửa',
  water: 'Hiệu ứng nước',
  wind: 'Hiệu ứng gió',
  particles: 'Hạt hiệu ứng',
};
const layerLabel = (id: string) => layerLabels[id] ?? id;
const combatVfxLabels: Record<string, string> = {
  cast: 'Combat VFX · tích năng',
  trail: 'Combat VFX · vệt tấn công',
  projectile: 'Combat VFX · đạn bay',
  impact: 'Combat VFX · va chạm',
  meteor: 'Combat VFX · thiên thạch',
  vortex: 'Combat VFX · lốc xoáy',
  'ground-wave': 'Combat VFX · sóng chấn động',
  cage: 'Combat VFX · lồng khống chế',
  pulse: 'Combat VFX · vòng xung kích',
  beam: 'Combat VFX · tia xuyên',
};
const combatVfxLabel = (semantic: string) => combatVfxLabels[semantic] ?? `Combat VFX · ${semantic}`;
const combatTriggerLabels: Record<CombatVfxTrigger, string> = {
  'attack-start': 'Bắt đầu tấn công',
  'attack-release': 'Thời điểm tung đòn',
  'after-primary': 'Sau hiệu ứng chính',
};
function keyframeLabel(index: number, count: number) {
  const percent = Math.round(index / Math.max(1, count - 1) * 100);
  if (index === 0) return 'Đầu · 0%';
  if (index === count - 1) return 'Cuối · 100%';
  if (percent === 50) return 'Giữa · 50%';
  return `${percent}%`;
}

const bundledPetFiles = import.meta.glob<PetDefinition>('../../../assets/pets/*/level-*/asset.json', { eager: true, import: 'default' });
const rigFiles = import.meta.glob<Rig>('../../../assets/rigs/*.json', { eager: true, import: 'default' });
const rigs = Object.fromEntries(Object.values(rigFiles).map(rig => [rig.id, rig]));
let petDefinitions = Object.values(bundledPetFiles);
try {
  const response = await fetch('/__asset-studio/pet-manifests', { cache: 'no-store' });
  if (response.ok) petDefinitions = await response.json() as PetDefinition[];
} catch {
  // Production/static preview has no local manifest API; bundled JSON remains the fallback.
}
const pets = petDefinitions.map(pet => resolvePet(pet, rigs));
const manifests = Object.fromEntries(petDefinitions.map(pet => [pet.id, pet]));
const selectedPetKey = 'asset-studio:selected-pet';
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <aside><a class="brand" href="/">✦ <span>GameVui<small>ASSET STUDIO</small></span></a>
  <p class="label">THƯ VIỆN</p><div class="selected">Pets <span>${pets.length}</span></div>
  <p class="muted">Characters · Items · Environment · VFX<br>Các nhóm sẽ xuất hiện khi có asset.</p>
  <footer>LAYERS → RIG → PREVIEW<br>Phaser 3 / TypeScript</footer></aside>
  <main><header><div><p class="label">WORKSPACE / PETS</p><h1>Pet workshop</h1><p class="muted">Một bộ khung chung. Mỗi pet một cá tính.</p></div><span class="badge">LOCAL STUDIO</span></header>
  <section class="layout"><div class="studio-panel"><div class="toolbar"><select id="pet-select" aria-label="Chọn pet"></select><div class="toolbar-actions"><button id="edit-pet-images">Quản lý ảnh pet</button><button id="new-pet">+ Tạo pet từ layer</button><span>ART REFERENCE</span></div></div><section id="creator" class="creator" hidden><div class="creator-heading"><div><p class="label">PET LAYER IMPORT</p><h2>Tạo cấp tiến hóa từ bộ PNG</h2><p class="muted">Chọn species, element và level để lấy đúng rig cùng thông số khởi đầu. Ảnh gốc được giữ trong assets/inbox.</p></div><button id="close-creator" aria-label="Đóng">×</button></div><div class="creator-fields"><label>Species<select id="creator-species"></select></label><label>Element<select id="creator-element"></select></label><label>Tiến hóa<select id="creator-level"><option value="1">Level 1</option><option value="2">Level 2</option><option value="3">Level 3</option></select></label><label>Tên hiển thị<input id="creator-name" type="text"></label><label>Stage ID<input id="creator-id" type="text" readonly></label></div><p id="template-status" class="template-status"></p><div id="upload-slots" class="upload-slots"></div><div class="creator-footer"><button id="create-pet">Tạo cấp tiến hóa</button><span id="create-status"></span></div></section><section id="image-editor" class="creator image-editor" hidden><div class="creator-heading"><div><p class="label">QUẢN LÝ PNG</p><h2>Ảnh của pet đang chọn</h2><p class="muted">Thay ảnh hiện có hoặc bổ sung optional layer/VFX còn thiếu theo đúng recipe. Source upload và runtime cũ được giữ trong assets/inbox.</p></div><button id="close-image-editor" aria-label="Đóng">×</button></div><h3>Thay ảnh hiện có</h3><div id="image-replacement-slots" class="upload-slots"></div><div class="creator-footer"><button id="replace-pet-images">Lưu ảnh thay thế</button><span id="replace-status" aria-live="polite"></span></div><div id="image-addition" class="image-addition"><h3>Thêm asset còn thiếu</h3><p class="editor-help">Chỉ hiện các slot được executable recipe hỗ trợ nhưng pet chưa khai báo.</p><div id="image-addition-slots" class="upload-slots"></div><div class="creator-footer"><button id="add-pet-images">Thêm vào pet</button><span id="add-status" aria-live="polite"></span></div></div></section><div class="preview-grid"><div id="stage"></div><div id="controls-slot"></div></div><p id="caption" class="muted"></p></div>
  <article><p class="label">ASSET INSPECTOR</p><h2 id="name"></h2><dl id="details"></dl><hr><p class="label">KẾ THỪA</p><p class="chain"><span id="rig-parent"></span> → <strong id="child"></strong></p><p class="muted">Canvas và animation lấy từ rig nhóm. Ảnh layer và thông số lắp ghép nằm trong manifest của pet.</p><hr><p class="label">TIẾN ĐỘ</p><p id="status"></p></article></section></main>`;
const select = document.querySelector<HTMLSelectElement>('#pet-select')!;
for (const group of PET_ARCHETYPES) {
  for (const level of [1, 2, 3]) {
    const groupPets = pets.filter(pet => {
      const species = pet.species ?? pet.lineageId.split('-').at(-1);
      return (pet.archetype ?? speciesTemplate(species ?? '')?.archetype) === group.id && pet.evolutionLevel === level;
    });
    if (!groupPets.length) continue;
    const options = document.createElement('optgroup');
    options.label = `${group.name} · Level ${level}`;
    for (const pet of groupPets.sort((a, b) => a.lineageId.localeCompare(b.lineageId))) options.append(new Option(pet.name, pet.id));
    select.append(options);
  }
}

const creator = document.querySelector<HTMLElement>('#creator')!;
const creatorSpecies = document.querySelector<HTMLSelectElement>('#creator-species')!;
const creatorElement = document.querySelector<HTMLSelectElement>('#creator-element')!;
const creatorLevel = document.querySelector<HTMLSelectElement>('#creator-level')!;
const creatorName = document.querySelector<HTMLInputElement>('#creator-name')!;
const creatorId = document.querySelector<HTMLInputElement>('#creator-id')!;
for (const group of PET_ARCHETYPES) {
  const options = document.createElement('optgroup');
  options.label = `${group.name}${group.validated ? '' : ' · chưa kiểm chứng'}`;
  for (const speciesId of group.species) {
    const template = speciesTemplate(speciesId)!;
    options.append(new Option(template.name, template.id));
  }
  creatorSpecies.append(options);
}
for (const element of PET_ELEMENTS) creatorElement.add(new Option(element.name, element.id));

function updateCreator() {
  const template = speciesTemplate(creatorSpecies.value)!;
  const element = PET_ELEMENTS.find(item => item.id === creatorElement.value)!;
  const level = Number(creatorLevel.value) as 1 | 2 | 3;
  const templateSlots = slotsForEvolution(template, level);
  const lineageId = `${element.id}-${template.id}`;
  creatorId.value = `${lineageId}-level-${level}`;
  creatorName.value = `${element.name} ${template.name} · Level ${level}`;
  const group = archetypeFor(template.archetype)!;
  document.querySelector('#template-status')!.textContent = template.validated
    ? `${group.name} · ${template.rig} · template đã được kiểm chứng`
    : `${group.name} · ${template.rig} · thông số khởi đầu, cần chỉnh và kiểm chứng bằng pet flagship`;
  const slots = document.querySelector('#upload-slots')!;
  slots.replaceChildren();
  for (const slot of templateSlots) {
    const label = document.createElement('label');
    label.className = 'upload-slot';
    label.innerHTML = `<span>${slot.label}${slot.optional ? ' <small>tùy chọn</small>' : ' <b>bắt buộc</b>'}</span><code>${slot.folder}/${slot.file}</code>`;
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/png'; input.dataset.slot = slot.id; input.required = !slot.optional;
    label.append(input); slots.append(label);
  }
}
creatorSpecies.addEventListener('change', updateCreator);
creatorElement.addEventListener('change', updateCreator);
creatorLevel.addEventListener('change', updateCreator);
document.querySelector('#new-pet')!.addEventListener('click', () => { creator.hidden = false; imageEditor.hidden = true; updateCreator(); creator.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
document.querySelector('#close-creator')!.addEventListener('click', () => { creator.hidden = true; });

const imageEditor = document.querySelector<HTMLElement>('#image-editor')!;
document.querySelector('#edit-pet-images')!.addEventListener('click', () => {
  imageEditor.hidden = false;
  creator.hidden = true;
  imageEditor.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
document.querySelector('#close-image-editor')!.addEventListener('click', () => { imageEditor.hidden = true; });

function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^;]*;base64,/, 'data:image/png;base64,'));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function runtimeFile(file: File, size?: { width: number; height: number }) {
  if (!size) return readFile(file);
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = size.width; canvas.height = size.height;
  const context = canvas.getContext('2d')!;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.clearRect(0, 0, size.width, size.height);
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  return canvas.toDataURL('image/png');
}

async function imageSize(src: string) {
  const response = await fetch(`${src}?asset-studio-size=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Không đọc được ảnh hiện tại: ${src}`);
  const bitmap = await createImageBitmap(await response.blob());
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return size;
}

type ReplacementAsset = { src: string; labels: string[] };
let replacementAssets: ReplacementAsset[] = [];
let additionSlots: UploadSlot[] = [];
function renderImageEditor(pet: ReturnType<typeof resolvePet>) {
  const bySource = new Map<string, Set<string>>();
  const add = (src: string | undefined, label: string) => {
    if (!src) return;
    const labels = bySource.get(src) ?? new Set<string>();
    labels.add(label); bySource.set(src, labels);
  };
  for (const layer of pet.layers) {
    add(layer.src, layer.id);
    add(layer.closedSrc, `${layer.id} · blink`);
  }
  for (const [semantic, src] of Object.entries(pet.effects?.attack ?? {})) add(src, combatVfxLabel(semantic));
  replacementAssets = [...bySource].map(([src, labels]) => ({ src, labels: [...labels] }));
  const slots = document.querySelector('#image-replacement-slots')!;
  slots.replaceChildren();
  for (const [index, asset] of replacementAssets.entries()) {
    const label = document.createElement('label');
    label.className = 'upload-slot replacement-slot';
    const fileName = asset.src.split('/').at(-1) ?? asset.src;
    label.innerHTML = `<span>${asset.labels.join(', ')}</span><code>${fileName}</code><small>${asset.src}</small>`;
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/png'; input.dataset.replacementIndex = String(index);
    label.append(input); slots.append(label);
  }
  const button = document.querySelector<HTMLButtonElement>('#edit-pet-images')!;
  const template = speciesTemplate(pet.species ?? pet.lineageId.split('-').at(-1) ?? '');
  const layerIds = new Set(pet.layers.map(layer => layer.id));
  additionSlots = template ? slotsForEvolution(template, pet.evolutionLevel).filter(slot => {
    if (slot.closedFor) return !pet.layers.find(layer => layer.id === slot.closedFor)?.closedSrc;
    if (slot.combatVfx) return !pet.effects?.attack?.[slot.combatVfx];
    return !!slot.instances?.length && slot.instances.every(instance => !layerIds.has(instance.id));
  }) : [];
  const additionRoot = document.querySelector<HTMLElement>('#image-addition')!;
  const additionList = document.querySelector('#image-addition-slots')!;
  additionList.replaceChildren();
  for (const slot of additionSlots) {
    const label = document.createElement('label'); label.className = 'upload-slot';
    label.innerHTML = `<span>${slot.label} <small>${slot.optional ? 'tùy chọn' : 'bắt buộc còn thiếu'}</small></span><code>${slot.folder}/${slot.file}</code>`;
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/png'; input.dataset.additionSlot = slot.id;
    label.append(input); additionList.append(label);
  }
  additionRoot.hidden = additionSlots.length === 0;
  button.disabled = replacementAssets.length === 0 && additionSlots.length === 0;
  if (button.disabled) imageEditor.hidden = true;
  document.querySelector('#replace-status')!.textContent = '';
  document.querySelector('#add-status')!.textContent = '';
}

document.querySelector('#replace-pet-images')!.addEventListener('click', async () => {
  const status = document.querySelector('#replace-status')!;
  const button = document.querySelector<HTMLButtonElement>('#replace-pet-images')!;
  const pet = pets.find(item => item.id === select.value);
  if (!pet) return;
  const inputs = [...document.querySelectorAll<HTMLInputElement>('#image-replacement-slots input[type=file]')];
  const chosen = inputs.flatMap(input => {
    const file = input.files?.[0];
    const asset = replacementAssets[Number(input.dataset.replacementIndex)];
    return file && asset ? [{ file, asset }] : [];
  });
  if (!chosen.length) { status.textContent = 'Hãy chọn ít nhất một ảnh PNG cần thay.'; return; }
  const invalid = chosen.find(({ file }) => file.type !== 'image/png' && !file.name.toLowerCase().endsWith('.png'));
  if (invalid) { status.textContent = `${invalid.file.name} không phải PNG`; return; }
  button.disabled = true; status.textContent = 'Đang kiểm tra kích thước và lưu revision…';
  try {
    const uploads = [];
    for (const { file, asset } of chosen) {
      const size = await imageSize(asset.src);
      uploads.push({ src: asset.src, sourceDataUrl: await readFile(file), runtimeDataUrl: await runtimeFile(file, size) });
    }
    const response = await fetch('/__asset-studio/replace-pet-images', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: pet.id, uploads }),
    });
    if (!response.ok) throw new Error(await response.text());
    const result = await response.json() as { revision: string };
    status.textContent = `Đã thay ${uploads.length} ảnh · revision ${result.revision}. Đang tải lại preview…`;
    sessionStorage.setItem(selectedPetKey, pet.id);
    window.location.reload();
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Không thể thay ảnh';
    button.disabled = false;
  }
});

document.querySelector('#add-pet-images')!.addEventListener('click', async () => {
  const status = document.querySelector('#add-status')!;
  const button = document.querySelector<HTMLButtonElement>('#add-pet-images')!;
  const current = manifests[select.value];
  if (!current) return;
  const inputs = [...document.querySelectorAll<HTMLInputElement>('#image-addition-slots input[type=file]')];
  const chosen = inputs.flatMap(input => {
    const file = input.files?.[0];
    const slot = additionSlots.find(candidate => candidate.id === input.dataset.additionSlot);
    return file && slot ? [{ file, slot }] : [];
  });
  if (!chosen.length) { status.textContent = 'Hãy chọn ít nhất một PNG cần thêm.'; return; }
  const invalid = chosen.find(({ file }) => file.type !== 'image/png' && !file.name.toLowerCase().endsWith('.png'));
  if (invalid) { status.textContent = `${invalid.file.name} không phải PNG`; return; }
  button.disabled = true; status.textContent = 'Đang thêm asset và cập nhật manifest…';
  try {
    const manifest = structuredClone(current) as PetDefinition;
    const uploads: Array<{ file: string; folder: 'layers' | 'effects'; sourceDataUrl: string; runtimeDataUrl: string }> = [];
    for (const { file, slot } of chosen) {
      const src = `/assets/pets/${manifest.lineageId}/level-${manifest.evolutionLevel}/${slot.folder}/${slot.file}`;
      uploads.push({ file: slot.file, folder: slot.folder, sourceDataUrl: await readFile(file), runtimeDataUrl: await runtimeFile(file, slot.runtimeSize) });
      if (slot.closedFor) {
        const target = manifest.layers.find(layer => layer.id === slot.closedFor);
        if (target) target.closedSrc = src;
      } else if (slot.combatVfx) {
        manifest.effects ??= {};
        manifest.effects.attack ??= {};
        manifest.effects.attack[slot.combatVfx] = src;
        manifest.effects.attackPresentation ??= {};
        manifest.effects.attackPresentation[slot.combatVfx] = combatVfxPresentation(slot.combatVfx);
      } else {
        for (const instance of slot.instances ?? []) manifest.layers.push({ ...instance, src });
      }
    }
    manifest.layers.sort((a, b) => a.z - b.z);
    const response = await fetch('/__asset-studio/add-pet-images', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: manifest.id, manifest, uploads }),
    });
    if (!response.ok) throw new Error(await response.text());
    status.textContent = `Đã thêm ${uploads.length} asset. Đang tải lại Studio…`;
    sessionStorage.setItem(selectedPetKey, manifest.id); window.location.reload();
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Không thể thêm asset';
    button.disabled = false;
  }
});

document.querySelector('#create-pet')!.addEventListener('click', async () => {
  const status = document.querySelector('#create-status')!;
  const button = document.querySelector<HTMLButtonElement>('#create-pet')!;
  const template = speciesTemplate(creatorSpecies.value)!;
  const element = PET_ELEMENTS.find(item => item.id === creatorElement.value)!;
  const evolutionLevel = Number(creatorLevel.value) as 1 | 2 | 3;
  const templateSlots = slotsForEvolution(template, evolutionLevel);
  const lineageId = `${element.id}-${template.id}`;
  const inputs = [...document.querySelectorAll<HTMLInputElement>('#upload-slots input[type=file]')];
  const selected = new Map(inputs.map(input => [input.dataset.slot!, input.files?.[0]]));
  const missing = templateSlots.filter(slot => !slot.optional && !selected.get(slot.id));
  if (missing.length) { status.textContent = `Thiếu: ${missing.map(slot => slot.label).join(', ')}`; return; }
  const invalid = [...selected.values()].filter((file): file is File => !!file).find(file => file.type !== 'image/png' && !file.name.toLowerCase().endsWith('.png'));
  if (invalid) { status.textContent = `${invalid.name} không phải PNG`; return; }
  button.disabled = true; status.textContent = 'Đang lưu ảnh và tạo manifest…';
  try {
    const layers: Layer[] = [];
    const uploads: Array<{ file: string; folder: 'layers' | 'effects'; sourceDataUrl: string; runtimeDataUrl: string }> = [];
    const attack: Record<string, string> = {};
    const attackPresentation: Record<string, CombatVfxPresentation> = {};
    for (const slot of templateSlots) {
      const file = selected.get(slot.id);
      if (!file) continue;
      const src = `/assets/pets/${lineageId}/level-${evolutionLevel}/${slot.folder}/${slot.file}`;
      uploads.push({ file: slot.file, folder: slot.folder, sourceDataUrl: await readFile(file), runtimeDataUrl: await runtimeFile(file, slot.runtimeSize) });
      if (slot.closedFor) {
        const target = layers.find(item => item.id === slot.closedFor);
        if (target) target.closedSrc = src;
      } else {
        for (const instance of slot.instances ?? []) layers.push({ ...instance, src });
      }
      if (slot.combatVfx) {
        attack[slot.combatVfx] = src;
        attackPresentation[slot.combatVfx] = combatVfxPresentation(slot.combatVfx);
      }
    }
    layers.sort((a, b) => a.z - b.z);
    const manifest: PetDefinition = {
      id: creatorId.value,
      lineageId, evolutionLevel,
      name: creatorName.value.trim() || `${element.name} ${template.name} · Level ${evolutionLevel}`,
      kind: 'pet', species: template.id, archetype: template.archetype, extends: template.rig,
      status: 'production', element: element.id,
      reference: layers.find(item => item.id === 'body')?.src ?? layers[0].src,
      layers, preview: { x: 420, y: 440, scale: 1 },
      ...(Object.keys(attack).length ? { effects: { color: element.color, attack, attackPresentation } } : {}),
    };
    const response = await fetch('/__asset-studio/create-pet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: manifest.id, manifest, uploads }) });
    if (!response.ok) throw new Error(await response.text());
    status.textContent = 'Đã tạo pet. Đang tải lại catalog…';
    sessionStorage.setItem(selectedPetKey, manifest.id);
    window.location.reload();
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Không thể tạo pet';
    button.disabled = false;
  }
});
updateCreator();
let game: Phaser.Game | undefined;
let view: PetView | undefined;
const controls=document.createElement('div'); controls.className='controls';
controls.innerHTML=`<div class="clips">${(['idle','walk','attack','hurt'] as State[]).map(s=>`<button data-state="${s}">${stateLabels[s]}</button>`).join('')}</div><div class="options"><button id="pause">Tạm dừng</button><button id="flip">Lật hướng</button><label>Zoom <input id="zoom" type="range" min="0.4" max="1.8" step="0.1" value="1"></label><label>Tốc độ <select id="speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label><label>Nền <select id="background"><option value="#141820">Tối</option><option value="#eee5d7">Sáng</option><option value="#475b65">Xanh xám</option></select></label><span id="playing">Đứng yên</span></div><div id="transform-editor"></div><p id="save-status" class="save-status" aria-live="polite"></p>`;
document.querySelector('#controls-slot')!.append(controls);
controls.addEventListener('click',e=>{
 const b=(e.target as HTMLElement).closest<HTMLButtonElement>('button'); if(!b||!view)return;
 if(b.dataset.state) view.play(b.dataset.state as State);
 if(b.id==='pause'){view.paused=!view.paused; b.textContent=view.paused?'Tiếp tục':'Tạm dừng';}
 if(b.id==='flip')view.scaleX*=-1;
});
document.querySelector('#zoom')!.addEventListener('input',e=>{if(view){const s=Number((e.target as HTMLInputElement).value);view.setScale(Math.sign(view.scaleX)*s,s);}});
document.querySelector('#speed')!.addEventListener('change',e=>{if(view)view.speed=Number((e.target as HTMLSelectElement).value);});
document.querySelector('#background')!.addEventListener('change',e=>game?.scene.getScenes(true)[0]?.cameras.main.setBackgroundColor((e.target as HTMLSelectElement).value));
let saveTimer: number | undefined;
function scheduleSave(pet: ReturnType<typeof resolvePet>) {
  const status = document.querySelector('#save-status')!;
  status.textContent = 'Đang chờ lưu…';
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(async () => {
    const manifest = manifests[pet.id];
    try {
      const response = await fetch('/__asset-studio/save-manifest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pet.id, manifest }),
      });
      if (!response.ok) throw new Error(await response.text());
      status.textContent = 'Đã tự lưu vào asset.json';
    } catch (error) {
      status.textContent = `Chưa lưu được: ${error instanceof Error ? error.message : 'API không khả dụng'}`;
    }
  }, 400);
}
function numberInput(label: string, value: number, onChange: (value: number) => void) {
  const wrapper = document.createElement('label');
  wrapper.className = 'number-field';
  wrapper.innerHTML = `<span>${label}</span><input type="number" step="0.01" value="${value}">`;
  const input = wrapper.querySelector('input')!;
  input.addEventListener('input', () => {
    const next = Number(input.value);
    if (Number.isFinite(next)) onChange(next);
  });
  return wrapper;
}
function selectInput<T extends string>(label: string, value: T, options: Array<{ value: T; label: string }>, onChange: (value: T) => void) {
  const wrapper = document.createElement('label');
  wrapper.className = 'select-field';
  const caption = document.createElement('span'); caption.textContent = label;
  const select = document.createElement('select');
  for (const option of options) select.add(new Option(option.label, option.value, false, option.value === value));
  select.addEventListener('change', () => onChange(select.value as T));
  wrapper.append(caption, select);
  return wrapper;
}
function checkboxInput(label: string, value: boolean, onChange: (value: boolean) => void) {
  const wrapper = document.createElement('label');
  wrapper.className = 'checkbox-field';
  const input = document.createElement('input'); input.type = 'checkbox'; input.checked = value;
  input.addEventListener('change', () => onChange(input.checked));
  wrapper.append(input, ` ${label}`);
  return wrapper;
}
function tintInput(value: number | undefined, onChange: (value: number | undefined) => void) {
  const wrapper = document.createElement('label'); wrapper.className = 'tint-field';
  const enabled = document.createElement('input'); enabled.type = 'checkbox'; enabled.checked = value !== undefined;
  const color = document.createElement('input'); color.type = 'color'; color.value = `#${(value ?? 0xffffff).toString(16).padStart(6, '0').slice(-6)}`; color.disabled = !enabled.checked;
  enabled.addEventListener('change', () => { color.disabled = !enabled.checked; onChange(enabled.checked ? Number.parseInt(color.value.slice(1), 16) : undefined); });
  color.addEventListener('input', () => onChange(Number.parseInt(color.value.slice(1), 16)));
  wrapper.append(enabled, document.createTextNode(' Màu phủ'), color);
  return wrapper;
}
function show(id: string) {
  const pet = pets.find(pet => pet.id === id)!;
  const manifest = manifests[id];
  const species = pet.species ?? pet.lineageId.split('-').at(-1) ?? '';
  const group = archetypeFor(pet.archetype ?? speciesTemplate(species)?.archetype ?? 'quadruped');
  renderImageEditor(pet);
  document.querySelector('#name')!.textContent = pet.name;
  document.querySelector('#child')!.textContent = pet.name;
  document.querySelector('#rig-parent')!.textContent = `${group?.name ?? 'Legacy'} (${pet.extends})`;
  document.querySelector('#details')!.textContent = `Lineage: ${pet.lineageId} · Tiến hóa: Level ${pet.evolutionLevel} · Species: ${species || 'chưa khai báo'} · Element: ${pet.element} · Nhóm: ${group?.name ?? 'Legacy'} · Layers: ${pet.layers.length}`;
  document.querySelector('#status')!.textContent = pet.layers.length ? `Trạng thái: ${pet.status}` : 'Đã lưu concept. PNG layer và animation production chưa được tạo.';
  document.querySelector('#caption')!.textContent = pet.layers.length ? 'Preview layer ghép bằng renderer dùng chung.' : 'Bảng ảnh tham khảo gốc • Chưa phải pet đã tách nền hoặc rig hoàn chỉnh.';
  view=undefined; game?.destroy(true);
  document.querySelector('.toolbar span')!.textContent='LIVE RIG / PNG + MOTION';
  document.querySelector('#status')!.textContent=`PNG alpha • ${pet.layers.length} layer instances • 4 animation states • ${pet.element} effect`;
  const transform = document.querySelector('#transform-editor')!;
  transform.innerHTML = '<p class="label">VỊ TRÍ TOÀN PET</p><p class="editor-help">X/Y đặt pet trong khung xem. Tỷ lệ thay đổi kích thước toàn bộ pet.</p>';
  const transformFields = document.createElement('div');
  transformFields.className = 'transform-fields';
  const preview = manifest.preview ?? { x: 420, y: 440, scale: 1 };
  manifest.preview = preview;
  transformFields.append(
    numberInput('Vị trí X', preview.x, value => { preview.x = value; view?.setPosition(value, preview.y); scheduleSave(pet); }),
    numberInput('Vị trí Y', preview.y, value => { preview.y = value; view?.setPosition(preview.x, value); scheduleSave(pet); }),
    numberInput('Tỷ lệ', preview.scale, value => { preview.scale = value; const direction = view ? Math.sign(view.scaleX) || 1 : 1; view?.setScale(direction * value, value); scheduleSave(pet); }),
  );
  const layerEditor = document.createElement('div');
  layerEditor.className = 'layer-editor';
  layerEditor.innerHTML = '<p class="label">CHỈNH TỪNG LAYER</p><p class="editor-help">Bật/tắt để kiểm tra từng phần. Neo X/Y là khớp xoay trong ảnh (0–1). Z nhỏ nằm sau, Z lớn nằm trước.</p>';
  for (const layer of pet.layers) {
    const row = document.createElement('div');
    row.className = 'layer-row';
    const title = document.createElement('span');
    title.className = 'layer-name';
    title.textContent = `${layerLabel(layer.id)} (${layer.id})`;
    const visibility = document.createElement('label');
    visibility.className = 'visibility-toggle';
    const visible = document.createElement('input');
    visible.type = 'checkbox'; visible.checked = layer.visible !== false;
    visible.addEventListener('change', () => { layer.visible = visible.checked; view?.setLayerVisible(layer.id, visible.checked); scheduleSave(pet); });
    visibility.append(visible, ' Hiển thị');
    const heading = document.createElement('div');
    heading.className = 'layer-heading'; heading.append(title, visibility);
    row.append(heading,
      numberInput('Vị trí X', layer.x, value => { layer.x = value; view?.setLayerTransform(layer.id, 'x', value); scheduleSave(pet); }),
      numberInput('Vị trí Y', layer.y, value => { layer.y = value; view?.setLayerTransform(layer.id, 'y', value); scheduleSave(pet); }),
      numberInput('Tỷ lệ', layer.scale ?? 1, value => { layer.scale = value; view?.setLayerTransform(layer.id, 'scale', value); scheduleSave(pet); }),
      numberInput('Góc xoay', layer.angle ?? 0, value => { layer.angle = value; view?.setLayerTransform(layer.id, 'angle', value); scheduleSave(pet); }),
      numberInput('Độ trong suốt', layer.alpha ?? 1, value => { layer.alpha = value; view?.setLayerTransform(layer.id, 'alpha', value); scheduleSave(pet); }),
      numberInput('Điểm neo X', layer.originX, value => { layer.originX = value; view?.setLayerOrigin(layer.id, 'originX', value); scheduleSave(pet); }),
      numberInput('Điểm neo Y', layer.originY, value => { layer.originY = value; view?.setLayerOrigin(layer.id, 'originY', value); scheduleSave(pet); }),
      numberInput('Thứ tự Z', layer.z, value => { layer.z = value; view?.setLayerZ(layer.id, value); scheduleSave(pet); }),
      tintInput(layer.tint, value => { layer.tint = value; view?.setLayerTint(layer.id, value); scheduleSave(pet); }),
    );
    layerEditor.append(row);
  }
  const combatEditor = document.createElement('div');
  combatEditor.className = 'combat-editor';
  combatEditor.innerHTML = '<p class="label">CHỈNH COMBAT VFX</p><p class="editor-help">Mọi thông số được lưu theo pet và level trong asset.json. Điểm đầu/cuối dùng neo Pet hoặc Mục tiêu; X tự lật theo hướng pet khi bật “Lật theo hướng”.</p>';
  const combatEntries = Object.entries(pet.effects?.attack ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === 'string');
  if (!combatEntries.length) combatEditor.append(Object.assign(document.createElement('p'), { className: 'editor-empty', textContent: 'Pet này chưa khai báo Combat VFX.' }));
  for (const [semantic] of combatEntries) {
    let config = combatVfxPresentation(semantic, pet.effects?.attackPresentation?.[semantic]);
    const details = document.createElement('details');
    details.className = 'vfx-editor';
    const summary = document.createElement('summary');
    const triggerSummary = document.createElement('span'); triggerSummary.textContent = combatTriggerLabels[config.trigger];
    summary.innerHTML = `<span><b>${combatVfxLabel(semantic)}</b><small>${semantic}</small></span>`;
    summary.append(triggerSummary); details.append(summary);
    const commit = (next: CombatVfxPresentation) => {
      config = next;
      triggerSummary.textContent = combatTriggerLabels[next.trigger];
      manifest.effects ??= {};
      manifest.effects.attackPresentation ??= {};
      manifest.effects.attackPresentation[semantic] = { ...next };
      pet.effects ??= {};
      pet.effects.attackPresentation ??= {};
      pet.effects.attackPresentation[semantic] = { ...next };
      scheduleSave(pet);
    };
    const settings = document.createElement('div'); settings.className = 'vfx-settings';
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
    settings.append(
      checkboxInput('Bật hiệu ứng', config.enabled, value => commit({ ...config, enabled: value })),
      selectInput('Kích hoạt', config.trigger, triggerOptions, value => commit({ ...config, trigger: value })),
      numberInput('Trễ (ms)', config.delay, value => commit({ ...config, delay: Math.max(0, value) })),
      numberInput('Thời lượng (ms)', config.duration, value => commit({ ...config, duration: Math.max(0, value) })),
      numberInput('Thứ tự Z', config.depth, value => commit({ ...config, depth: value })),
      selectInput('Nội suy', config.ease, easeOptions, value => commit({ ...config, ease: value })),
      checkboxInput('Lật theo hướng pet', config.mirror, value => commit({ ...config, mirror: value })),
    );
    const start = document.createElement('fieldset'); start.innerHTML = '<legend>Khung đầu</legend>';
    start.append(
      selectInput('Neo', config.startAnchor, anchorOptions, value => commit({ ...config, startAnchor: value })),
      numberInput('Vị trí X', config.startX, value => commit({ ...config, startX: value })),
      numberInput('Vị trí Y', config.startY, value => commit({ ...config, startY: value })),
      numberInput('Tỷ lệ', config.startScale, value => commit({ ...config, startScale: value })),
      numberInput('Góc xoay', config.startAngle, value => commit({ ...config, startAngle: value })),
      numberInput('Độ trong suốt', config.startAlpha, value => commit({ ...config, startAlpha: value })),
    );
    const end = document.createElement('fieldset'); end.innerHTML = '<legend>Khung cuối</legend>';
    end.append(
      selectInput('Neo', config.endAnchor, anchorOptions, value => commit({ ...config, endAnchor: value })),
      numberInput('Vị trí X', config.endX, value => commit({ ...config, endX: value })),
      numberInput('Vị trí Y', config.endY, value => commit({ ...config, endY: value })),
      numberInput('Tỷ lệ', config.endScale, value => commit({ ...config, endScale: value })),
      numberInput('Góc xoay', config.endAngle, value => commit({ ...config, endAngle: value })),
      numberInput('Độ trong suốt', config.endAlpha, value => commit({ ...config, endAlpha: value })),
    );
    const common = document.createElement('fieldset'); common.innerHTML = '<legend>Điểm neo ảnh</legend>';
    common.append(
      numberInput('Điểm neo X', config.originX, value => commit({ ...config, originX: value })),
      numberInput('Điểm neo Y', config.originY, value => commit({ ...config, originY: value })),
    );
    const play = document.createElement('button'); play.type = 'button'; play.textContent = 'Chạy thử toàn bộ đòn';
    play.addEventListener('click', () => view?.play('attack'));
    details.append(settings, start, end, common, play);
    combatEditor.append(details);
  }
  const animationEditor = document.createElement('div');
  animationEditor.className = 'animation-editor';
  animationEditor.innerHTML = '<p class="label">CHỈNH 4 CHUYỂN ĐỘNG</p><p class="editor-help">Mỗi ô là một thời điểm trong animation: Đầu → Giữa → Cuối. X/Y là pixel lệch khỏi vị trí gốc, góc tính bằng độ, scale 1 là kích thước gốc. Chỉnh từng ô sẽ cập nhật preview và chỉ lưu cho pet này.</p>';
  const commitClip = (state: State, next: Clip) => {
    manifest.overrides ??= {};
    manifest.overrides.clips ??= {};
    manifest.overrides.clips[state] = next;
    if (pet.rig.clips) pet.rig.clips[state] = next;
    if (view?.state === state) view.play(state);
    scheduleSave(pet);
  };
  for (const state of ['idle', 'walk', 'attack', 'hurt'] as State[]) {
    const clip = pet.rig.clips?.[state];
    if (!clip) continue;
    const details = document.createElement('details');
    details.className = 'clip-editor';
    const summary = document.createElement('summary');
    summary.innerHTML = `<span><b>${stateLabels[state]}</b><small>${state}</small></span><span>${clip.tracks.length} track · ${clip.duration} ms</span>`;
    details.append(summary);
    const settings = document.createElement('div');
    settings.className = 'clip-settings';
    settings.append(numberInput('Thời lượng (ms)', clip.duration, value => {
      if (value <= 0) return;
      commitClip(state, { ...pet.rig.clips![state], duration: value });
    }));
    const loopLabel = document.createElement('label');
    const loop = document.createElement('input');
    loop.type = 'checkbox'; loop.checked = clip.loop;
    loop.addEventListener('change', () => commitClip(state, { ...pet.rig.clips![state], loop: loop.checked }));
    loopLabel.append(loop, ' Lặp liên tục'); settings.append(loopLabel);
    if (clip.event) settings.append(numberInput('Thời điểm phát effect (ms)', clip.event.at, value => {
      commitClip(state, { ...pet.rig.clips![state], event: { ...pet.rig.clips![state].event!, at: Math.max(0, value) } });
    }));
    const play = document.createElement('button');
    play.dataset.state = state; play.textContent = 'Chạy thử'; settings.append(play);
    if (pet.layers.length) {
      const addTrack = document.createElement('button');
      addTrack.type = 'button'; addTrack.textContent = '+ Thêm chuyển động layer';
      addTrack.addEventListener('click', () => {
        const current = pet.rig.clips![state];
        commitClip(state, { ...current, tracks: [...current.tracks, { target: pet.layers[0].id, property: 'angle', values: [0, 0, 0] }] });
        show(pet.id);
      });
      settings.append(addTrack);
    }
    details.append(settings);
    clip.tracks.forEach((track, trackIndex) => {
      const row = document.createElement('div');
      row.className = 'track-row';
      const meta = document.createElement('div');
      meta.className = 'track-meta';
      const targetOptions = pet.layers.map(layer => ({ value: layer.id, label: `${layerLabel(layer.id)} (${layer.id})` }));
      if (!targetOptions.some(option => option.value === track.target)) targetOptions.unshift({ value: track.target, label: `${track.target} · chưa có layer` });
      const propertyOptions: Array<{ value: Clip['tracks'][number]['property']; label: string }> = [
        'x', 'y', 'angle', 'scaleX', 'scaleY', 'alpha',
      ].map(value => ({ value: value as Clip['tracks'][number]['property'], label: propertyLabels[value] ?? value }));
      meta.append(
        selectInput('Layer đích', track.target, targetOptions, value => {
          const current = pet.rig.clips![state];
          const tracks = current.tracks.map((item, index) => index === trackIndex ? { ...item, target: value } : item);
          commitClip(state, { ...current, tracks }); show(pet.id);
        }),
        selectInput('Thuộc tính', track.property, propertyOptions, value => {
          const current = pet.rig.clips![state];
          const tracks = current.tracks.map((item, index) => index === trackIndex ? { ...item, property: value } : item);
          commitClip(state, { ...current, tracks }); show(pet.id);
        }),
      );
      const actions = document.createElement('div'); actions.className = 'track-actions';
      const duplicate = document.createElement('button'); duplicate.type = 'button'; duplicate.textContent = 'Nhân bản';
      duplicate.addEventListener('click', () => {
        const current = pet.rig.clips![state];
        const tracks = [...current.tracks]; tracks.splice(trackIndex + 1, 0, { ...current.tracks[trackIndex], values: [...current.tracks[trackIndex].values] });
        commitClip(state, { ...current, tracks }); show(pet.id);
      });
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Xóa track';
      remove.addEventListener('click', () => {
        const current = pet.rig.clips![state];
        commitClip(state, { ...current, tracks: current.tracks.filter((_, index) => index !== trackIndex) }); show(pet.id);
      });
      actions.append(duplicate, remove); meta.append(actions);
      const keyframes = document.createElement('div');
      keyframes.className = 'keyframe-fields';
      track.values.forEach((value, valueIndex) => {
        const field = document.createElement('label');
        const caption = document.createElement('span');
        caption.textContent = keyframeLabel(valueIndex, track.values.length);
        const input = document.createElement('input');
        input.type = 'number'; input.step = track.property === 'angle' || track.property === 'x' || track.property === 'y' ? '1' : '0.01'; input.value = String(value);
        input.setAttribute('aria-label', `${track.target} ${track.property} tại ${caption.textContent}`);
        input.addEventListener('input', () => {
          const nextValue = Number(input.value);
          if (!Number.isFinite(nextValue)) return;
          const current = pet.rig.clips![state];
          const tracks = current.tracks.map((item, index) => {
            if (index !== trackIndex) return { ...item, values: [...item.values] };
            const values = [...item.values]; values[valueIndex] = nextValue;
            return { ...item, values };
          });
          commitClip(state, { ...current, tracks });
        });
        field.append(caption, input); keyframes.append(field);
      });
      row.append(meta, keyframes); details.append(row);
    });
    animationEditor.append(details);
  }
  transform.append(transformFields, layerEditor, combatEditor, animationEditor);
  class Preview extends Phaser.Scene {
    preload() {
      if (!pet.layers.length) this.load.image('reference', pet.reference);
      for (const layer of pet.layers) {
        if(layer.sheet)this.load.spritesheet(layer.src,layer.src,{frameWidth:layer.sheet.width,frameHeight:layer.sheet.height});
        else this.load.image(layer.src, layer.src);
        if(layer.closedSrc)this.load.image(layer.closedSrc,layer.closedSrc);
      }
      for (const src of Object.values(pet.effects?.attack ?? {})) if (src) this.load.image(src, src);
    }
    create() {
      if (pet.layers.length) {
        this.add.line(400,447,-290,0,290,0,0x5a6476,.25);
        view=new PetView(this, preview.x, preview.y, pet);
        view.setScale(preview.scale);
        const attack = pet.effects?.attack;
        const combatEntries = Object.entries(attack ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === 'string');
        const point = (anchor: CombatVfxAnchor, x: number, y: number, mirror: boolean) => {
          if (!view) return { x, y };
          const direction = Math.sign(view.scaleX) || 1;
          const scaleX = Math.abs(view.scaleX), scaleY = Math.abs(view.scaleY);
          const baseX = anchor === 'pet' ? view.x : view.x + direction * 330 * scaleX;
          const baseY = anchor === 'pet' ? view.y : view.y - 95 * scaleY;
          return { x: baseX + x * scaleX * (mirror ? direction : 1), y: baseY + y * scaleY };
        };
        const targetGuide = this.add.container().setDepth(100).setVisible(combatEntries.length > 0);
        targetGuide.add([
          this.add.circle(0, 0, 17, 0x91b8c7, .08).setStrokeStyle(1, 0x91b8c7, .45),
          this.add.text(0, 24, 'MỤC TIÊU', { color: '#91a9b5', fontFamily: 'sans-serif', fontSize: '8px' }).setOrigin(.5, 0),
        ]);
        const spawnCombatVfx = (semantic: string, src: string) => {
          const config = combatVfxPresentation(semantic, pet.effects?.attackPresentation?.[semantic]);
          if (!config.enabled) return 0;
          this.time.delayedCall(Math.max(0, config.delay), () => {
            if (!view) return;
            const direction = config.mirror ? Math.sign(view.scaleX) || 1 : 1;
            const start = point(config.startAnchor, config.startX, config.startY, config.mirror);
            const end = point(config.endAnchor, config.endX, config.endY, config.mirror);
            const rootScale = Math.abs(view.scaleY);
            const image = this.add.image(start.x, start.y, src)
              .setOrigin(config.originX, config.originY)
              .setScale(config.startScale * rootScale)
              .setAngle(config.startAngle * direction)
              .setAlpha(config.startAlpha)
              .setDepth(config.depth);
            this.tweens.add({
              targets: image, x: end.x, y: end.y,
              scaleX: config.endScale * rootScale, scaleY: config.endScale * rootScale,
              angle: config.endAngle * direction, alpha: config.endAlpha,
              duration: Math.max(0, config.duration),
              ease: config.ease,
              onComplete: () => image.destroy(),
            });
          });
          return Math.max(0, config.delay) + Math.max(0, config.duration);
        };
        const playTrigger = (trigger: CombatVfxTrigger) => combatEntries
          .filter(([semantic]) => {
            const config = combatVfxPresentation(semantic, pet.effects?.attackPresentation?.[semantic]);
            return config.enabled && config.trigger === trigger;
          })
          .map(([semantic, src]) => spawnCombatVfx(semantic, src));
        view.on('state-start',(state: State)=>{
          if(state === 'attack') playTrigger('attack-start');
        });
        view.on('marker',()=>{
          const durations = playTrigger('attack-release');
          this.time.delayedCall(Math.max(0, ...durations), () => playTrigger('after-primary'));
        });
        this.events.on('update',()=>{
          if(!view)return;
          document.querySelector('#playing')!.textContent=stateLabels[view.state];
          const target=point('target',0,0,true); targetGuide.setPosition(target.x,target.y);
        });
      }
      else {
        const ref = this.add.image(400, 275, 'reference');
        ref.setScale(Math.min(780 / ref.width, 520 / ref.height));
      }
    }
  }
  game = new Phaser.Game({ type: Phaser.AUTO, parent: 'stage', backgroundColor: '#141820',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 800, height: 550 }, scene: Preview });
}
select.addEventListener('change', () => {
  sessionStorage.setItem(selectedPetKey, select.value);
  show(select.value);
});
if (pets.length) {
  const remembered = sessionStorage.getItem(selectedPetKey);
  const initial = pets.find(pet => pet.id === remembered) ?? pets[0];
  select.value = initial.id;
  show(initial.id);
}
