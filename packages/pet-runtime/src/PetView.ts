import Phaser from 'phaser';
import { resolvePet } from '../../asset-core/src/resolve';
import type { State } from '../../asset-core/src/types';

/** Shared layered rig. No pet IDs or fire-specific branches. */
export class PetView extends Phaser.GameObjects.Container {
  state: State = 'idle';
  paused = false;
  speed = 1;
  private elapsed = 0;
  private lifetime = 0;
  private fired = false;
  private nodes = new Map<string, Phaser.GameObjects.Container>();
  private images = new Map<string, Phaser.GameObjects.Sprite>();
  private bases = new Map<string, {x:number;y:number;scale:number}>();
  private nextBlink = 2800;
  private blendFrom = new Map<string, number[]>();
  private blendTime = 200;
  private updateBound: (_time:number, delta:number)=>void;
  constructor(scene: Phaser.Scene, x: number, y: number, readonly pet: ReturnType<typeof resolvePet>) {
    super(scene,x,y);
    for (const layer of [...pet.layers].sort((a,b)=>a.z-b.z)) {
      const node=scene.add.container(layer.x,layer.y).setScale(layer.scale ?? 1);
      const sprite=scene.add.sprite(0,0,layer.src).setOrigin(layer.originX,layer.originY);
      if(layer.tint) sprite.setTint(layer.tint);
      node.add(sprite);
      (layer.parent ? this.nodes.get(layer.parent)! : this).add(node);
      this.nodes.set(layer.id,node); this.images.set(layer.id,sprite);
      this.bases.set(layer.id,{x:layer.x,y:layer.y,scale:layer.scale??1});
    }
    scene.add.existing(this);
    this.updateBound=(_time,delta)=>this.tick(delta);
    scene.events.on('update',this.updateBound);
    this.once('destroy',()=>scene.events.off('update',this.updateBound));
  }
  play(state:State) {
    this.blendFrom.clear();
    for(const [id,n] of this.nodes) this.blendFrom.set(id,[n.x,n.y,n.angle,n.scaleX,n.scaleY,n.alpha]);
    this.blendTime=0; this.state=state; this.elapsed=0; this.fired=false; this.tick(0);
  }
  setLayerVisible(id:string,visible:boolean) { this.nodes.get(id)?.setVisible(visible); }
  setLayerTransform(id:string, property:'x'|'y'|'scale', value:number) {
    const node = this.nodes.get(id);
    const base = this.bases.get(id);
    if (!node || !base || !Number.isFinite(value)) return;
    if (property === 'scale') {
      node.setScale(value);
      this.bases.set(id, { ...base, scale: value });
    } else {
      node[property] = value;
      this.bases.set(id, { ...base, [property]: value });
    }
  }
  private tick(delta:number) {
    if(this.paused) return;
    this.elapsed+=Math.min(delta,60)*this.speed; this.lifetime+=Math.min(delta,60)*this.speed;
    let clip=this.pet.rig.clips?.[this.state];
    if(!clip) return;
    if(clip.event && !this.fired && this.elapsed>=clip.event.at) { this.fired=true; this.emit('marker',clip.event.name); }
    if(!clip.loop && this.elapsed>=clip.duration) { this.play('idle'); return; }
    const t=(this.elapsed%clip.duration)/clip.duration;
    for(const [id,node] of this.nodes) {
      const b=this.bases.get(id)!;
      node.setPosition(b.x,b.y).setScale(b.scale).setAngle(0).setAlpha(1);
    }
    for(const track of clip.tracks) {
      const node=this.nodes.get(track.target); if(!node) continue;
      const f=t*(track.values.length-1), i=Math.min(Math.floor(f),track.values.length-2);
      const smooth=(1-Math.cos((f-i)*Math.PI))/2;
      const value=Phaser.Math.Linear(track.values[i],track.values[i+1],smooth);
      const base=this.bases.get(track.target)!;
      if(track.property==='x'||track.property==='y') node[track.property]=base[track.property]+value;
      else if(track.property==='scaleX'||track.property==='scaleY') node[track.property]=base.scale*value;
      else node[track.property]=value;
    }
    this.blendTime+=delta*this.speed;
    if(this.blendTime<180){
      const k=(1-Math.cos(Math.PI*this.blendTime/180))/2;
      for(const [id,n] of this.nodes){const b=this.blendFrom.get(id);if(!b)continue;
        n.setPosition(Phaser.Math.Linear(b[0],n.x,k),Phaser.Math.Linear(b[1],n.y,k));
        n.setAngle(Phaser.Math.Linear(b[2],n.angle,k));
        n.setScale(Phaser.Math.Linear(b[3],n.scaleX,k),Phaser.Math.Linear(b[4],n.scaleY,k));
      }
    }
    const blink=this.lifetime>=this.nextBlink;
    if(this.lifetime>this.nextBlink+140) this.nextBlink=this.lifetime+2600+Math.random()*1600;
    for(const layer of this.pet.layers) {
      const sprite=this.images.get(layer.id)!;
      if(layer.closedSrc) {
        const textureKey=blink ? layer.closedSrc:layer.src;
        if(sprite.texture.key!==textureKey) {
          // Keep the rendered size stable when swapping open/closed textures.
          // This prevents a blink asset with different source bounds from
          // making the head visibly pop larger or smaller.
          const width=sprite.displayWidth, height=sprite.displayHeight;
          sprite.setTexture(textureKey).setDisplaySize(width,height);
        }
      }
      if(layer.sheet) sprite.setFrame(Math.floor(this.lifetime/1000*layer.sheet.fps)%layer.sheet.count);
      if(this.state==='hurt') sprite.setTint(0xff9b83);
      else sprite.setTint(layer.tint??0xffffff);
    }
  }
}
