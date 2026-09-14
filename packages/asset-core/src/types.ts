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
  effects?: { projectile: string; color: number };
  overrides?: { idle?: Partial<Rig['idle']>; clips?: Partial<Record<State, Clip>> };
}
