import { PET_ARCHETYPES, PET_ELEMENTS, archetypeFor, speciesTemplate } from '../../../packages/asset-core/src/petCatalog';
import type { PetArchetypeId, PetElement, PetSpeciesId } from '../../../packages/asset-core/src/petCatalog';
import type { EvolutionLevel } from '../../../packages/asset-core/src/types';
import type { ResolvedPet } from './studioTypes';

export const ASSET_KINDS = [
  { id: 'pets', name: 'Pets' },
  { id: 'monsters', name: 'Quái' },
  { id: 'bots', name: 'Bot' },
] as const;

export type AssetKindId = (typeof ASSET_KINDS)[number]['id'];

export function petSpeciesId(pet: ResolvedPet): string {
  return pet.species ?? pet.lineageId.split('-').at(-1) ?? '';
}

export function petArchetypeId(pet: ResolvedPet): PetArchetypeId {
  return (pet.archetype ?? speciesTemplate(petSpeciesId(pet))?.archetype ?? 'quadruped') as PetArchetypeId;
}

export function libraryPath(pet: ResolvedPet) {
  const speciesId = petSpeciesId(pet);
  const archetypeId = petArchetypeId(pet);
  const element = PET_ELEMENTS.find(item => item.id === pet.element);
  const group = archetypeFor(archetypeId);
  const template = speciesTemplate(speciesId);
  return {
    kind: 'pets' as const,
    elementId: pet.element as PetElement,
    elementName: element?.name ?? pet.element,
    level: pet.evolutionLevel,
    archetypeId,
    archetypeName: group?.name ?? archetypeId,
    speciesId,
    speciesName: template?.name ?? speciesId,
  };
}

export function petsInFolder(pets: ResolvedPet[], elementId: PetElement, level?: EvolutionLevel, archetypeId?: PetArchetypeId) {
  return pets.filter(pet => {
    if (pet.element !== elementId) return false;
    if (level !== undefined && pet.evolutionLevel !== level) return false;
    if (archetypeId !== undefined && petArchetypeId(pet) !== archetypeId) return false;
    return true;
  });
}

export function speciesInArchetype(archetypeId: PetArchetypeId): PetSpeciesId[] {
  return [...(PET_ARCHETYPES.find(item => item.id === archetypeId)?.species ?? [])];
}
