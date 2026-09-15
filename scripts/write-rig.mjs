// Shared motion profiles; missing anatomy channels are optional.
import { writeFileSync } from 'node:fs';
const t=(target,property,values)=>({target,property,values});
const legs=['rear-far','front-far','rear-near','front-near'];
const clips={
 idle:{duration:1800,loop:true,tracks:[t('body','scaleY',[1,1.025,1]),t('head','y',[0,-2,0]),t('head','angle',[0,-1,0]),t('tail','angle',[-4,4,-4])]},
 walk:{duration:650,loop:true,tracks:[t('body','y',[0,-4,0,-4,0]),t('head','y',[0,-5,0,-5,0]),t('tail','angle',[-7,7,-7]),...legs.map((id,i)=>t(id,'angle',i%2?[18,-18,18]:[-18,18,-18])),...legs.map((id,i)=>t(id,'y',i%2?[0,-7,0]:[-7,0,-7]))]},
 attack:{duration:900,loop:false,event:{at:400,name:'projectile'},tracks:[t('head','x',[0,-10,15,4,0]),t('head','angle',[0,-9,7,2,0]),t('body','scaleX',[1,.94,1.06,1,1]),t('tail','angle',[0,15,-12,0,0])]}
};
writeFileSync('assets/rigs/pet-base.json',JSON.stringify({id:'pet-base',canvas:{width:512,height:512},idle:{duration:1800,bob:2},clips},null,2)+'\n');
const root='/assets/pets/fire-fox/level-1/';
const layer=(id,src,x,y,originX,originY,z,scale,extra={})=>({id,src:root+src+'.png',x,y,originX,originY,z,scale,...extra});
const pet={id:'fire-fox-level-1',lineageId:'fire-fox',evolutionLevel:1,name:'Fire Fox · Level 1',kind:'pet',species:'fox',archetype:'quadruped',extends:'pet-base',status:'production',element:'fire',reference:'/references/fire-fox/concept-board.png',effects:{projectile:root+'fire.png',color:16751144},layers:[
 layer('tail','tail',-65,-105,.85,.85,1,.75),
 layer('rear-far','leg',-53,-79,.5,.15,3,.72,{tint:13415840}),
 layer('front-far','leg',59,-81,.5,.15,4,.74,{tint:13415840}),
 layer('body','body',0,-117,.5,.5,5,.68),
 layer('rear-near','leg',-74,-87,.5,.15,6,.84),
 layer('front-near','leg',28,-90,.5,.15,7,.86),
 layer('head','head',39,-151,.5,.88,8,.78),
 layer('eyes-open','eyes-open',0,0,.5,.88,8.1,1,{parent:'head',blink:'open'}),
 layer('eyes-closed','eyes-closed',0,0,.5,.88,8.11,1,{parent:'head',blink:'closed'})
]};
writeFileSync('assets/pets/fire-fox/level-1/asset.json',JSON.stringify(pet,null,2)+'\n');
