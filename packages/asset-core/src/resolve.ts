import type { CombatAttackVfx, CombatVfxPresentation, PetDefinition, PetEffects, Rig } from './types';

export function combatVfxPresentation(semantic: string, override?: Partial<CombatVfxPresentation>): CombatVfxPresentation {
  const base: CombatVfxPresentation = semantic === 'cast' ? {
    enabled: true, trigger: 'attack-start', startAnchor: 'pet', endAnchor: 'pet',
    startX: 75, startY: -135, endX: 75, endY: -135,
    originX: .5, originY: .5, startScale: .5, endScale: .58,
    startAngle: 0, endAngle: 0, startAlpha: .9, endAlpha: 0,
    depth: 20, delay: 0, duration: 450, ease: 'Sine.easeInOut', mirror: true,
  } : semantic === 'projectile' ? {
    enabled: true, trigger: 'attack-release', startAnchor: 'pet', endAnchor: 'target',
    startX: 100, startY: -150, endX: 0, endY: 0,
    originX: .5, originY: .5, startScale: .55, endScale: .55,
    startAngle: 90, endAngle: 90, startAlpha: 1, endAlpha: .2,
    depth: 20, delay: 0, duration: 600, ease: 'Linear', mirror: true,
  } : semantic === 'trail' ? {
    enabled: true, trigger: 'attack-release', startAnchor: 'pet', endAnchor: 'target',
    startX: 100, startY: -150, endX: 0, endY: 0,
    originX: .5, originY: .5, startScale: .7, endScale: .7,
    startAngle: 0, endAngle: 0, startAlpha: 1, endAlpha: 0,
    depth: 20, delay: 0, duration: 360, ease: 'Quad.easeOut', mirror: true,
  } : semantic === 'impact' ? {
    enabled: true, trigger: 'after-primary', startAnchor: 'target', endAnchor: 'target',
    startX: 0, startY: 0, endX: 0, endY: 0,
    originX: .5, originY: .5, startScale: .65, endScale: .78,
    startAngle: 0, endAngle: 0, startAlpha: .95, endAlpha: 0,
    depth: 21, delay: 0, duration: 420, ease: 'Quad.easeOut', mirror: true,
  } : {
    enabled: true, trigger: 'attack-release', startAnchor: 'target', endAnchor: 'target',
    startX: 0, startY: 0, endX: 0, endY: 0,
    originX: .5, originY: .5, startScale: .7, endScale: .78,
    startAngle: 0, endAngle: 0, startAlpha: .95, endAlpha: 0,
    depth: 20, delay: 0, duration: 520, ease: 'Quad.easeOut', mirror: true,
  };
  return { ...base, ...override };
}

export function resolvePetEffects(effects?: PetEffects): PetEffects | undefined {
  if (!effects) return undefined;
  const attack: CombatAttackVfx = { ...effects.attack };
  if (!attack.projectile && effects.projectile) attack.projectile = effects.projectile;
  return {
    ...(effects.color !== undefined ? { color: effects.color } : {}),
    ...(Object.keys(attack).length ? { attack } : {}),
    ...(effects.attackPresentation ? { attackPresentation: effects.attackPresentation } : {}),
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
