import Phaser from 'phaser';
import './style.css';
import type { Clip, Layer, PetDefinition, Rig, State } from '../../../packages/asset-core/src/types';
import { resolvePet } from '../../../packages/asset-core/src/resolve';
import { PET_ARCHETYPES, PET_ELEMENTS, archetypeFor, speciesTemplate } from '../../../packages/asset-core/src/petCatalog';
import { PetView } from '../../../packages/pet-runtime/src/PetView';

const stateLabels: Record<State, string> = { idle: 'Đứng yên', walk: 'Di chuyển', attack: 'Tấn công', hurt: 'Trúng đòn' };
const propertyLabels: Record<string, string> = {
  x: 'Dịch ngang · pixel', y: 'Dịch dọc · pixel', angle: 'Góc xoay · độ', scaleX: 'Co giãn ngang · hệ số', scaleY: 'Co giãn dọc · hệ số', alpha: 'Độ trong suốt · 0 đến 1',
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
  <footer>ARTWORK → RIG → PREVIEW<br>Phaser 3 / TypeScript</footer></aside>
  <main><header><div><p class="label">WORKSPACE / PETS</p><h1>Pet workshop</h1><p class="muted">Một bộ khung chung. Mỗi pet một cá tính.</p></div><span class="badge">LOCAL STUDIO</span></header>
  <section class="layout"><div class="studio-panel"><div class="toolbar"><select id="pet-select" aria-label="Chọn pet"></select><div class="toolbar-actions"><button id="new-pet">+ Tạo pet từ layer</button><span>ART REFERENCE</span></div></div><section id="creator" class="creator" hidden><div class="creator-heading"><div><p class="label">PET LAYER IMPORT</p><h2>Tạo cấp tiến hóa từ bộ PNG</h2><p class="muted">Chọn species, element và level để lấy đúng rig cùng thông số khởi đầu. Ảnh gốc được giữ trong assets/inbox.</p></div><button id="close-creator" aria-label="Đóng">×</button></div><div class="creator-fields"><label>Species<select id="creator-species"></select></label><label>Element<select id="creator-element"></select></label><label>Tiến hóa<select id="creator-level"><option value="1">Level 1</option><option value="2">Level 2</option><option value="3">Level 3</option></select></label><label>Tên hiển thị<input id="creator-name" type="text"></label><label>Stage ID<input id="creator-id" type="text" readonly></label></div><p id="template-status" class="template-status"></p><div id="upload-slots" class="upload-slots"></div><div class="creator-footer"><button id="create-pet">Tạo cấp tiến hóa</button><span id="create-status"></span></div></section><div class="preview-grid"><div id="stage"></div><div id="controls-slot"></div></div><p id="caption" class="muted"></p></div>
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
  const level = Number(creatorLevel.value);
  const lineageId = `${element.id}-${template.id}`;
  creatorId.value = `${lineageId}-level-${level}`;
  creatorName.value = `${element.name} ${template.name} · Level ${level}`;
  const group = archetypeFor(template.archetype)!;
  document.querySelector('#template-status')!.textContent = template.validated
    ? `${group.name} · ${template.rig} · template đã được kiểm chứng`
    : `${group.name} · ${template.rig} · thông số khởi đầu, cần chỉnh và kiểm chứng bằng pet flagship`;
  const slots = document.querySelector('#upload-slots')!;
  slots.replaceChildren();
  for (const slot of template.slots) {
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
document.querySelector('#new-pet')!.addEventListener('click', () => { creator.hidden = false; updateCreator(); creator.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
document.querySelector('#close-creator')!.addEventListener('click', () => { creator.hidden = true; });

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

document.querySelector('#create-pet')!.addEventListener('click', async () => {
  const status = document.querySelector('#create-status')!;
  const button = document.querySelector<HTMLButtonElement>('#create-pet')!;
  const template = speciesTemplate(creatorSpecies.value)!;
  const element = PET_ELEMENTS.find(item => item.id === creatorElement.value)!;
  const evolutionLevel = Number(creatorLevel.value) as 1 | 2 | 3;
  const lineageId = `${element.id}-${template.id}`;
  const inputs = [...document.querySelectorAll<HTMLInputElement>('#upload-slots input[type=file]')];
  const selected = new Map(inputs.map(input => [input.dataset.slot!, input.files?.[0]]));
  const missing = template.slots.filter(slot => !slot.optional && !selected.get(slot.id));
  if (missing.length) { status.textContent = `Thiếu: ${missing.map(slot => slot.label).join(', ')}`; return; }
  const invalid = [...selected.values()].filter((file): file is File => !!file).find(file => file.type !== 'image/png' && !file.name.toLowerCase().endsWith('.png'));
  if (invalid) { status.textContent = `${invalid.name} không phải PNG`; return; }
  button.disabled = true; status.textContent = 'Đang lưu ảnh và tạo manifest…';
  try {
    const layers: Layer[] = [];
    const uploads: Array<{ file: string; folder: 'layers' | 'effects'; sourceDataUrl: string; runtimeDataUrl: string }> = [];
    let projectile: string | undefined;
    for (const slot of template.slots) {
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
      if (slot.projectile) projectile = src;
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
      ...(projectile ? { effects: { projectile, color: element.color } } : {}),
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
function show(id: string) {
  const pet = pets.find(pet => pet.id === id)!;
  const manifest = manifests[id];
  const species = pet.species ?? pet.lineageId.split('-').at(-1) ?? '';
  const group = archetypeFor(pet.archetype ?? speciesTemplate(species)?.archetype ?? 'quadruped');
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
    title.textContent = layer.id;
    const visibility = document.createElement('label');
    visibility.className = 'visibility-toggle';
    const visible = document.createElement('input');
    visible.type = 'checkbox'; visible.checked = true;
    visible.addEventListener('change', () => view?.setLayerVisible(layer.id, visible.checked));
    visibility.append(visible, ' Hiển thị');
    const heading = document.createElement('div');
    heading.className = 'layer-heading'; heading.append(title, visibility);
    row.append(heading,
      numberInput('Vị trí X', layer.x, value => { layer.x = value; view?.setLayerTransform(layer.id, 'x', value); scheduleSave(pet); }),
      numberInput('Vị trí Y', layer.y, value => { layer.y = value; view?.setLayerTransform(layer.id, 'y', value); scheduleSave(pet); }),
      numberInput('Tỷ lệ', layer.scale ?? 1, value => { layer.scale = value; view?.setLayerTransform(layer.id, 'scale', value); scheduleSave(pet); }),
      numberInput('Điểm neo X', layer.originX, value => { layer.originX = value; view?.setLayerOrigin(layer.id, 'originX', value); scheduleSave(pet); }),
      numberInput('Điểm neo Y', layer.originY, value => { layer.originY = value; view?.setLayerOrigin(layer.id, 'originY', value); scheduleSave(pet); }),
      numberInput('Thứ tự Z', layer.z, value => { layer.z = value; view?.setLayerZ(layer.id, value); scheduleSave(pet); }),
    );
    layerEditor.append(row);
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
    details.append(settings);
    clip.tracks.forEach((track, trackIndex) => {
      const row = document.createElement('div');
      row.className = 'track-row';
      const text = document.createElement('span');
      text.innerHTML = `<b>${track.target}</b><small>${propertyLabels[track.property] ?? track.property}</small>`;
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
      row.append(text, keyframes); details.append(row);
    });
    animationEditor.append(details);
  }
  transform.append(transformFields, layerEditor, animationEditor);
  class Preview extends Phaser.Scene {
    preload() {
      if (!pet.layers.length) this.load.image('reference', pet.reference);
      for (const layer of pet.layers) {
        if(layer.sheet)this.load.spritesheet(layer.src,layer.src,{frameWidth:layer.sheet.width,frameHeight:layer.sheet.height});
        else this.load.image(layer.src, layer.src);
        if(layer.closedSrc)this.load.image(layer.closedSrc,layer.closedSrc);
      }
      if(pet.effects)this.load.image(pet.effects.projectile,pet.effects.projectile);
    }
    create() {
      if (pet.layers.length) {
        this.add.line(400,447,-290,0,290,0,0x5a6476,.25);
        view=new PetView(this, preview.x, preview.y, pet);
        view.setScale(preview.scale);
        view.on('marker',()=>{
          if(!pet.effects||!view)return;
          const direction=Math.sign(view.scaleX);
          const projectile=this.add.image(view.x+100*view.scaleX,view.y-160*view.scaleY,pet.effects.projectile).setScale(.55*view.scaleY).setAngle(direction*90);
          this.tweens.add({targets:projectile,x:projectile.x+direction*230,alpha:0,duration:600,onComplete:()=>projectile.destroy()});
        });
        this.events.on('update',()=>{if(view)document.querySelector('#playing')!.textContent=stateLabels[view.state];});
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
