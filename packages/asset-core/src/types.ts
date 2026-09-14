export interface Layer {
  id: string;
  src: string;
  parent?: string;
  x: number;
  y: number;
  originX: number;
  originY: number;
  z: number;
  scale?: number;
  angle?: number;
  alpha?: number;
  visible?: boolean;
  tint?: number;
  closedSrc?: string;
  sheet?: { width: number; height: number; count: number; fps: number };
}
export type State = 'idle' | 'walk' | 'attack' | 'hurt';
export type EvolutionLevel = 1 | 2 | 3;
export interface Track { target: string; property: 'x'|'y'|'angle'|'scaleX'|'scaleY'|'alpha'; values: number[] }
export interface Clip { duration: number; loop: boolean; tracks: Track[]; event?: { at: number; name: string } }
export interface Rig {
  id: string;
  canvas: { width: number; height: number };
  idle: { duration: number; bob: number };
  clips?: Record<State, Clip>;
}
/** Optional visual asset bindings for one evolution stage's attack lifecycle. */
export interface CombatAttackVfx {
  cast?: string;
  trail?: string;
  projectile?: string;
  impact?: string;
  /** Recipe-defined visual semantic such as meteor, vortex, cage or beam. */
  [semantic: string]: string | undefined;
}
export type CombatVfxTrigger = 'attack-start' | 'attack-release' | 'after-primary';
export type CombatVfxAnchor = 'pet' | 'target';
export type CombatVfxEase = 'Linear' | 'Sine.easeInOut' | 'Quad.easeOut' | 'Back.easeOut';
export interface CombatVfxPresentation {
  enabled: boolean;
  trigger: CombatVfxTrigger;
  startAnchor: CombatVfxAnchor;
  endAnchor: CombatVfxAnchor;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  originX: number;
  originY: number;
  startScale: number;
  endScale: number;
  startAngle: number;
  endAngle: number;
  startAlpha: number;
  endAlpha: number;
  depth: number;
  delay: number;
  duration: number;
  ease: CombatVfxEase;
  mirror: boolean;
}
export interface PetEffects {
  color?: number;
  /** Visual bindings only. Damage, collision and target reactions belong to gameplay. */
  attack?: CombatAttackVfx;
  attackPresentation?: Record<string, Partial<CombatVfxPresentation>>;
  /** Legacy manifest binding. Resolved as attack.projectile. */
  projectile?: string;
}
export interface PetDefinition {
  id: string;
  lineageId: string;
  evolutionLevel: EvolutionLevel;
  name: string;
  kind: 'pet';
  species?: string;
  archetype?: string;
  extends: string;
  status: 'planned' | 'production' | 'ready';
  element: string;
  reference: string;
  preview?: { x: number; y: number; scale: number };
  layers: Layer[];
  effects?: PetEffects;
  overrides?: { idle?: Partial<Rig['idle']>; clips?: Partial<Record<State, Clip>> };
}
