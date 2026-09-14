import type { CombatAttackVfx, PetDefinition, PetEffects, Rig } from './types';

export function resolvePetEffects(effects?: PetEffects): PetEffects | undefined {
  if (!effects) return undefined;
  const attack: CombatAttackVfx = { ...effects.attack };
  if (!attack.projectile && effects.projectile) attack.projectile = effects.projectile;
  return {
    ...(effects.color !== undefined ? { color: effects.color } : {}),
    ...(Object.keys(attack).length ? { attack } : {}),
  };
}

export function resolvePet(pet: PetDefinition, rigs: Record<string, Rig>) {
  const rig = rigs[pet.extends];
  if (!rig) throw new Error(`Unknown rig: ${pet.extends}`);
  const ids = new Set<string>();
  for (const layer of [...pet.layers].sort((a, b) => a.z - b.z)) {
    if (ids.has(layer.id)) throw new Error(`Duplicate layer: ${layer.id}`);
    if (layer.parent && !ids.has(layer.parent)) throw new Error(`Parent must precede child: ${layer.id}`);
    ids.add(layer.id);
  }
  const clips = rig.clips ? { ...rig.clips, ...pet.overrides?.clips } : undefined;
  if(clips) for(const clip of Object.values(clips)) {
    if(clip.duration<=0)throw new Error('Clip duration must be positive');
    for(const track of clip.tracks)if(track.values.length<2||track.values.some(v=>!Number.isFinite(v)))throw new Error('Invalid track');
  }
  return { ...pet, effects: resolvePetEffects(pet.effects), rig: { ...rig, clips, idle: { ...rig.idle, ...pet.overrides?.idle } } };
}
