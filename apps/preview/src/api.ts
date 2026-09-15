import type { PetDefinition } from '../../../packages/asset-core/src/types';

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<Record<string, unknown>>;
}

export function saveManifest(id: string, manifest: PetDefinition) {
  return postJson('/__asset-studio/save-manifest', { id, manifest });
}

export function createPet(id: string, manifest: PetDefinition, uploads: unknown[]) {
  return postJson('/__asset-studio/create-pet', { id, manifest, uploads });
}

export function replacePetImages(id: string, uploads: unknown[]) {
  return postJson('/__asset-studio/replace-pet-images', { id, uploads }) as Promise<{ revision: string }>;
}

export function addPetImages(id: string, manifest: PetDefinition, uploads: unknown[]) {
  return postJson('/__asset-studio/add-pet-images', { id, manifest, uploads });
}
