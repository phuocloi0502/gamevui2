import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const result=await build({entryPoints:['packages/asset-core/src/resolve.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {resolvePet}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const pet=JSON.parse(readFileSync('assets/pets/fire-fox/asset.json'));
const rig=JSON.parse(readFileSync('assets/rigs/pet-base.json'));
const registry={[rig.id]:rig};
const resolved=resolvePet(pet,registry);
assert.equal(resolved.rig.clips.walk.loop,true);
assert.equal(resolved.rig.clips.attack.event.name,'projectile');
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
console.log('PASS: inheritance, overrides, missing/duplicate/parent validation, optional anatomy, loop seams');
