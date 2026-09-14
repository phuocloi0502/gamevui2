import Phaser from 'phaser';
import './style.css';
import type { PetDefinition, Rig, State } from '../../../packages/asset-core/src/types';
import { resolvePet } from '../../../packages/asset-core/src/resolve';
import { PetView } from '../../../packages/pet-runtime/src/PetView';

const petFiles = import.meta.glob<PetDefinition>('../../../assets/pets/*/asset.json', { eager: true, import: 'default' });
const rigFiles = import.meta.glob<Rig>('../../../assets/rigs/*.json', { eager: true, import: 'default' });
const rigs = Object.fromEntries(Object.values(rigFiles).map(rig => [rig.id, rig]));
const pets = Object.values(petFiles).map(pet => resolvePet(pet, rigs));
const manifests = Object.fromEntries(Object.values(petFiles).map(pet => [pet.id, pet]));
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <aside><a class="brand" href="/">✦ <span>GameVui<small>ASSET STUDIO</small></span></a>
  <p class="label">THƯ VIỆN</p><div class="selected">Pets <span>${pets.length}</span></div>
  <p class="muted">Characters · Items · Environment · VFX<br>Các nhóm sẽ xuất hiện khi có asset.</p>
  <footer>ARTWORK → RIG → PREVIEW<br>Phaser 3 / TypeScript</footer></aside>
  <main><header><div><p class="label">WORKSPACE / PETS</p><h1>Pet workshop</h1><p class="muted">Một bộ khung chung. Mỗi pet một cá tính.</p></div><span class="badge">LOCAL STUDIO</span></header>
  <section class="layout"><div class="studio-panel"><div class="toolbar"><select id="pet-select" aria-label="Chọn pet"></select><span>ART REFERENCE</span></div><div class="preview-grid"><div id="stage"></div><div id="controls-slot"></div></div><p id="caption" class="muted"></p></div>
  <article><p class="label">ASSET INSPECTOR</p><h2 id="name"></h2><dl id="details"></dl><hr><p class="label">KẾ THỪA</p><p class="chain">Pet Base → <strong id="child"></strong></p><p class="muted">Canvas và idle lấy từ rig chung. Element, layer và thông số riêng nằm trong manifest của pet.</p><hr><p class="label">TIẾN ĐỘ</p><p id="status"></p></article></section></main>`;
const select = document.querySelector<HTMLSelectElement>('#pet-select')!;
for (const pet of pets) select.add(new Option(pet.name, pet.id));
let game: Phaser.Game | undefined;
let view: PetView | undefined;
const controls=document.createElement('div'); controls.className='controls';
controls.innerHTML=`<div class="clips">${['idle','walk','attack','hurt'].map(s=>`<button data-state="${s}">${s}</button>`).join('')}</div><div class="options"><button id="pause">Tạm dừng</button><button id="flip">Lật hướng</button><label>Zoom <input id="zoom" type="range" min="0.4" max="1.8" step="0.1" value="1"></label><label>Tốc độ <select id="speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label><label>Nền <select id="background"><option value="#141820">Tối</option><option value="#eee5d7">Sáng</option><option value="#475b65">Xanh xám</option></select></label><span id="playing">idle</span></div><div id="transform-editor"></div><div id="layer-controls"></div><p id="save-status" class="save-status" aria-live="polite"></p>`;
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
  document.querySelector('#name')!.textContent = pet.name;
  document.querySelector('#child')!.textContent = pet.name;
  document.querySelector('#details')!.textContent = `Element: ${pet.element} · Rig: ${pet.extends} · Layers: ${pet.layers.length}`;
  document.querySelector('#status')!.textContent = pet.layers.length ? `Trạng thái: ${pet.status}` : 'Đã lưu concept. PNG layer và animation production chưa được tạo.';
  document.querySelector('#caption')!.textContent = pet.layers.length ? 'Preview layer ghép bằng renderer dùng chung.' : 'Bảng ảnh tham khảo gốc • Chưa phải pet đã tách nền hoặc rig hoàn chỉnh.';
  view=undefined; game?.destroy(true);
  document.querySelector('.toolbar span')!.textContent='LIVE RIG / PNG + MOTION';
  document.querySelector('#status')!.textContent=`PNG alpha • ${pet.layers.length} layer instances • 4 animation states • ${pet.element} effect`;
  const transform = document.querySelector('#transform-editor')!;
  transform.innerHTML = '<p class="label">PET TRANSFORM</p>';
  const transformFields = document.createElement('div');
  transformFields.className = 'transform-fields';
  const preview = manifest.preview ?? { x: 420, y: 440, scale: 1 };
  manifest.preview = preview;
  transformFields.append(
    numberInput('X', preview.x, value => { preview.x = value; view?.setPosition(value, preview.y); scheduleSave(pet); }),
    numberInput('Y', preview.y, value => { preview.y = value; view?.setPosition(preview.x, value); scheduleSave(pet); }),
    numberInput('Scale', preview.scale, value => { preview.scale = value; const direction = view ? Math.sign(view.scaleX) || 1 : 1; view?.setScale(direction * value, value); scheduleSave(pet); }),
  );
  const layerEditor = document.createElement('div');
  layerEditor.className = 'layer-editor';
  layerEditor.innerHTML = '<p class="label">LAYER TRANSFORMS</p>';
  for (const layer of pet.layers) {
    const row = document.createElement('div');
    row.className = 'layer-row';
    const title = document.createElement('span');
    title.textContent = layer.id;
    row.append(title,
      numberInput('X', layer.x, value => { layer.x = value; view?.setLayerTransform(layer.id, 'x', value); scheduleSave(pet); }),
      numberInput('Y', layer.y, value => { layer.y = value; view?.setLayerTransform(layer.id, 'y', value); scheduleSave(pet); }),
      numberInput('S', layer.scale ?? 1, value => { layer.scale = value; view?.setLayerTransform(layer.id, 'scale', value); scheduleSave(pet); }),
    );
    layerEditor.append(row);
  }
  transform.append(transformFields, layerEditor);
  const layers=document.querySelector('#layer-controls')!; layers.replaceChildren();
  for(const layer of pet.layers){const label=document.createElement('label');const check=document.createElement('input');check.type='checkbox';check.checked=true;check.addEventListener('change',()=>view?.setLayerVisible(layer.id,check.checked));label.append(check,layer.id);layers.append(label);}
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
        this.events.on('update',()=>{if(view)document.querySelector('#playing')!.textContent=view.state;});
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
select.addEventListener('change', () => show(select.value));
if (pets.length) show(pets[0].id);
