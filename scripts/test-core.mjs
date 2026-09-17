import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
const result=await build({entryPoints:['packages/asset-core/src/resolve.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {resolvePet}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const pet=JSON.parse(readFileSync('assets/pets/fire-fox/level-1/asset.json'));
const rig=JSON.parse(readFileSync('assets/rigs/pet-base.json'));
const registry=Object.fromEntries(readdirSync('assets/rigs').filter(file=>file.endsWith('.json')).map(file=>{
 const candidate=JSON.parse(readFileSync(`assets/rigs/${file}`));
 return [candidate.id,candidate];
}));
const resolved=resolvePet(pet,registry);
assert.equal(resolved.rig.clips.walk.loop,true);
assert.equal(resolved.rig.clips.attack.event.name,'projectile');
assert.equal(resolved.effects.attack.projectile,pet.effects.projectile,'legacy projectile must resolve to attack.projectile');
assert.throws(()=>resolvePet({...pet,extends:'missing'},registry),/Unknown rig/);
assert.throws(()=>resolvePet({...pet,layers:[pet.layers[0],pet.layers[0]]},registry),/Duplicate/);
assert.throws(()=>resolvePet({...pet,layers:[{...pet.layers[0],parent:'missing'}]},registry),/Parent/);
const changed=resolvePet({...pet,overrides:{clips:{idle:{...rig.clips.idle,duration:999}}}},registry);
assert.equal(changed.rig.clips.idle.duration,999);
assert.equal(rig.clips.idle.duration,1800);
assert.equal(resolvePet({...pet,id:'another-pet',layers:[]},registry).rig.id,'pet-base');
for(const clip of Object.values(rig.clips))for(const t of clip.tracks){
 assert.ok(t.values.every(Number.isFinite));
 if(clip.loop)assert.equal(t.values[0],t.values.at(-1),`${t.target}: loop seam`);
}
for (const [file, level] of [['fire-fox', 1], ['water-fox', 2], ['wind-fox', 1], ['shadow-fox', 2]]) {
 const definition=JSON.parse(readFileSync(`assets/pets/${file}/level-${level}/asset.json`));
 const candidate=resolvePet(definition,registry);
 const layerIds=new Set(candidate.layers.map(layer=>layer.id));
 for(const clip of Object.values(candidate.rig.clips))for(const track of clip.tracks){
  if(clip.loop)assert.equal(track.values[0],track.values.at(-1),`${file}/${track.target}: loop seam`);
 }
 for(const clip of Object.values(definition.overrides?.clips ?? {}))for(const track of clip.tracks){
  assert.ok(layerIds.has(track.target),`${file}: missing override target ${track.target}`);
 }
}
const foxRig=registry['fox-quadruped'];
assert.ok(foxRig,'fox-quadruped rig is registered');
assert.equal(foxRig.clips.attack.event.name,'attack-release','new rig marker must describe timing, not projectile transport');
for(const rigId of ['quadruped-base','hopper-base','tank-base','winged-base','blob-base','serpent-base']) {
 assert.equal(registry[rigId].clips.attack.event.name,'attack-release',`${rigId}: generic attack marker`);
}
const foxTargets=new Set(Object.values(foxRig.clips).flatMap(clip=>clip.tracks.map(track=>track.target)));
for(const target of ['body','head','tail','rear-far','rear-near','front-far','front-near']) assert.ok(foxTargets.has(target),`fox rig target: ${target}`);

const multiTailIds=['tail-left-outer','tail-left-inner','tail-center','tail-right-inner','tail-right-outer'];
const syntheticMultiTail={...pet,id:'test-fox-level-3',lineageId:'test-fox',evolutionLevel:3,extends:'fox-quadruped',layers:[
 {id:'body',src:'/body.png',x:0,y:0,originX:.5,originY:.5,z:5},
 {id:'head',src:'/head.png',x:0,y:0,originX:.5,originY:.88,z:8},
 ...multiTailIds.map((id,index)=>({id,src:`/${id}.png`,x:0,y:0,originX:.85,originY:.85,z:index})),
],overrides:{clips:{idle:{duration:1800,loop:true,tracks:multiTailIds.map(id=>({target:id,property:'angle',values:[-4,4,-4]}))}}}};
const resolvedMultiTail=resolvePet(syntheticMultiTail,registry);
assert.deepEqual(resolvedMultiTail.rig.clips.idle.tracks.map(track=>track.target),multiTailIds);

const ranged=resolvePet({...pet,effects:{color:123,attack:{cast:'/cast.png',projectile:'/projectile.png',impact:'/impact.png'}}},registry);
assert.equal(ranged.effects.attack.projectile,'/projectile.png');
assert.equal(ranged.effects.attack.impact,'/impact.png');
const melee=resolvePet({...pet,effects:{attack:{cast:'/cast.png',trail:'/trail.png',impact:'/impact.png'}}},registry);
assert.equal(melee.effects.attack.projectile,undefined);
assert.equal(melee.effects.attack.trail,'/trail.png');
assert.equal(melee.effects.attack.impact,'/impact.png');
for (const semantic of ['cast','trail','projectile','impact']) {
 const visual=resolvePet({...pet,effects:{attack:{[semantic]:`/${semantic}.png`}}},registry);
 assert.deepEqual(visual.effects.attack,{[semantic]:`/${semantic}.png`},`${semantic} must work as an independent optional binding`);
}

const catalogBuild=await build({entryPoints:['packages/asset-core/src/petCatalog.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {speciesTemplate}=await import('data:text/javascript;base64,'+Buffer.from(catalogBuild.outputFiles[0].text).toString('base64'));
const foxTemplate=speciesTemplate('fox');
assert.equal(foxTemplate.rig,'fox-quadruped');
for(const semantic of ['cast','projectile','impact']) assert.ok(foxTemplate.slots.some(slot=>slot.combatVfx===semantic),`Fox recipe: ${semantic}`);
assert.ok(!foxTemplate.slots.some(slot=>slot.combatVfx==='trail'),'Fox ranged recipe must not require melee trail');
const foxEyesOpen=foxTemplate.slots.find(slot=>slot.id==='eyes-open');
const foxEyesClosed=foxTemplate.slots.find(slot=>slot.id==='eyes-closed');
assert.equal(foxEyesOpen.instances[0].id,'eyes-open','open eyes must be an independent layer');
assert.equal(foxEyesOpen.instances[0].parent,'head','open eyes must follow head transforms');
assert.equal(foxEyesOpen.instances[0].blink,'open','open eyes must own the open blink state');
assert.equal(foxEyesClosed.instances[0].id,'eyes-closed','closed eyes must be an independent layer');
assert.equal(foxEyesClosed.instances[0].parent,'head','closed eyes must follow head transforms');
assert.equal(foxEyesClosed.instances[0].blink,'closed','closed eyes must own the closed blink state');
for(const templateId of ['fox','wolf','bunny','turtle','golem','dragon','owl','hawk','serpent']) {
 const template=speciesTemplate(templateId);
 assert.ok(template.slots.some(slot=>slot.id==='eyes-open'),`${templateId}: eyes-open recipe`);
 assert.ok(template.slots.some(slot=>slot.id==='eyes-closed'),`${templateId}: eyes-closed recipe`);
}
const slimeTemplate=speciesTemplate('slime');
const slimeFace=slimeTemplate.slots.find(slot=>slot.id==='face');
const slimeEyesOpen=slimeTemplate.slots.find(slot=>slot.id==='eyes-open');
const slimeEyesClosed=slimeTemplate.slots.find(slot=>slot.id==='eyes-closed');
assert.ok(slimeFace,'Slime face must remain an independent always-visible layer');
assert.equal(slimeEyesOpen.instances[0].parent,'blob','Slime open eyes must follow blob transforms');
assert.equal(slimeEyesOpen.instances[0].blink,'open','Slime open eyes must own the open blink state');
assert.equal(slimeEyesClosed.instances[0].parent,'blob','Slime closed eyes must follow blob transforms');
assert.equal(slimeEyesClosed.instances[0].blink,'closed','Slime closed eyes must own the closed blink state');
for(const id of ['rear-far','rear-near','front-far','front-near']) {
 const slot=foxTemplate.slots.find(candidate=>candidate.id===id);
 assert.equal(slot.file,`${id}.png`,`${id} must use independent production artwork`);
}
assert.ok(!foxTemplate.slots.some(slot=>slot.file==='leg.png'),'new Fox template must not reuse leg.png');
const wolfTemplate=speciesTemplate('wolf');
assert.ok(wolfTemplate.slots.some(slot=>slot.combatVfx==='trail'),'Wolf recipe must expose melee trail');
assert.ok(wolfTemplate.slots.some(slot=>slot.combatVfx==='impact'),'Wolf recipe must expose independent impact');
assert.ok(!wolfTemplate.slots.some(slot=>slot.combatVfx==='projectile'),'Wolf melee recipe must not require projectile');
const dragonTemplate=speciesTemplate('dragon');
for(const id of ['leg-far','leg-near']) {
 const slot=dragonTemplate.slots.find(candidate=>candidate.id===id);
 assert.equal(slot.file,`${id}.png`,`${id} must use independent Dragon artwork`);
}
assert.ok(!dragonTemplate.slots.some(slot=>slot.file==='legs.png'),'Dragon template must not reuse combined legs.png');
console.log('PASS: inheritance, legacy effects, generic ranged/melee Combat VFX, rig targets, dynamic multi-tail IDs, independent Fox/Dragon legs, optional anatomy, loop seams');
