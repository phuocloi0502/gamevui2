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
  /** Indices of already-fired events. -1 = singular legacy clip.event. */
  private firedEvents = new Set<number>();
  private nodes = new Map<string, Phaser.GameObjects.Container>();
  private images = new Map<string, Phaser.GameObjects.Sprite>();
  private bases = new Map<string, {x:number;y:number;scale:number;angle:number;alpha:number}>();
  private nextBlink = 2800;
  private blendFrom = new Map<string, number[]>();
  private blendTime = 200;
  private updateBound: (_time:number, delta:number)=>void;
  constructor(scene: Phaser.Scene, x: number, y: number, readonly pet: ReturnType<typeof resolvePet>) {
    super(scene,x,y);
    for (const layer of [...pet.layers].sort((a,b)=>a.z-b.z)) {
      const node=scene.add.container(layer.x,layer.y).setScale(layer.scale ?? 1).setAngle(layer.angle ?? 0).setAlpha(layer.alpha ?? 1).setVisible(layer.visible !== false && layer.blink !== 'closed').setDepth(layer.z);
      const sprite=scene.add.sprite(0,0,layer.src).setOrigin(layer.originX,layer.originY);
      if(layer.tint!==undefined) sprite.setTint(layer.tint);
      node.add(sprite);
      (layer.parent ? this.nodes.get(layer.parent)! : this).add(node);
      this.nodes.set(layer.id,node); this.images.set(layer.id,sprite);
      this.bases.set(layer.id,{x:layer.x,y:layer.y,scale:layer.scale??1,angle:layer.angle??0,alpha:layer.alpha??1});
    }
    scene.add.existing(this);
    this.updateBound=(_time,delta)=>this.tick(delta);
    scene.events.on('update',this.updateBound);
    this.once('destroy',()=>scene.events.off('update',this.updateBound));
  }
  play(state:State) {
    this.blendFrom.clear();
    for(const [id,n] of this.nodes) this.blendFrom.set(id,[n.x,n.y,n.angle,n.scaleX,n.scaleY,n.alpha]);
    this.blendTime=0; this.state=state; this.elapsed=0; this.firedEvents.clear(); this.tick(0); this.emit('state-start',state);
  }
  setLayerVisible(id:string,visible:boolean) { this.nodes.get(id)?.setVisible(visible); }
  setLayerTint(id:string,tint?:number) {
    const sprite=this.images.get(id); if(!sprite)return;
    if(tint===undefined)sprite.clearTint(); else sprite.setTint(tint);
  }
  setLayerOrigin(id:string, property:'originX'|'originY', value:number) {
    const sprite = this.images.get(id);
    if (!sprite || !Number.isFinite(value)) return;
    if (property === 'originX') sprite.setOrigin(value, sprite.originY);
    else sprite.setOrigin(sprite.originX, value);
  }
  setLayerZ(id:string, value:number) {
    const node = this.nodes.get(id);
    if (!node || !Number.isFinite(value)) return;
    node.setDepth(value);
    node.parentContainer?.sort('depth');
  }
  setLayerTransform(id:string, property:'x'|'y'|'scale'|'angle'|'alpha', value:number) {
    const node = this.nodes.get(id);
    const base = this.bases.get(id);
    if (!node || !base || !Number.isFinite(value)) return;
    if (property === 'scale') {
      node.setScale(value);
      this.bases.set(id, { ...base, scale: value });
    } else if (property === 'angle' || property === 'alpha') {
      node[property] = value;
      this.bases.set(id, { ...base, [property]: value });
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
    const markers = clip.events?.length ? clip.events : (clip.event ? [clip.event] : []);
    for(let i=0;i<markers.length;i++) {
      if(!this.firedEvents.has(i) && this.elapsed>=markers[i].at) {
        this.firedEvents.add(i);
        this.emit('marker', markers[i].name, i, markers.length);
      }
    }
    if(!clip.loop && this.elapsed>=clip.duration) { this.play('idle'); return; }
    const t=(this.elapsed%clip.duration)/clip.duration;
    for(const [id,node] of this.nodes) {
      const b=this.bases.get(id)!;
      node.setPosition(b.x,b.y).setScale(b.scale).setAngle(b.angle).setAlpha(b.alpha);
    }
    for(const track of clip.tracks) {
      const node=this.nodes.get(track.target); if(!node) continue;
      const f=t*(track.values.length-1), i=Math.min(Math.floor(f),track.values.length-2);
      const smooth=(1-Math.cos((f-i)*Math.PI))/2;
      const value=Phaser.Math.Linear(track.values[i],track.values[i+1],smooth);
      const base=this.bases.get(track.target)!;
      if(track.property==='x'||track.property==='y') node[track.property]=base[track.property]+value;
      else if(track.property==='scaleX'||track.property==='scaleY') node[track.property]=base.scale*value;
      else if(track.property==='angle') node.angle=base.angle+value;
      else if(track.property==='alpha') node.alpha=base.alpha*value;
    }
    this.blendTime+=delta*this.speed;
    if(this.blendTime<180){
      const k=(1-Math.cos(Math.PI*this.blendTime/180))/2;
      for(const [id,n] of this.nodes){const b=this.blendFrom.get(id);if(!b)continue;
        n.setPosition(Phaser.Math.Linear(b[0],n.x,k),Phaser.Math.Linear(b[1],n.y,k));
        n.setAngle(Phaser.Math.Linear(b[2],n.angle,k));
        n.setScale(Phaser.Math.Linear(b[3],n.scaleX,k),Phaser.Math.Linear(b[4],n.scaleY,k));
        n.setAlpha(Phaser.Math.Linear(b[5],n.alpha,k));
      }
    }
    const blink=this.lifetime>=this.nextBlink;
    if(this.lifetime>this.nextBlink+140) this.nextBlink=this.lifetime+2600+Math.random()*1600;
    for(const layer of this.pet.layers) {
      const sprite=this.images.get(layer.id)!;
      if(layer.blink) this.nodes.get(layer.id)?.setVisible(layer.visible!==false && layer.blink===(blink?'closed':'open'));
      if(layer.sheet) sprite.setFrame(Math.floor(this.lifetime/1000*layer.sheet.fps)%layer.sheet.count);
      sprite.setTint(layer.tint??0xffffff);
    }
  }
}
