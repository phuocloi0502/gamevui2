import { createRoot } from 'react-dom/client';
import './style.css';
import type { PetDefinition, Rig } from '../../../packages/asset-core/src/types';
import { App } from './App';

const bundledPetFiles = import.meta.glob<PetDefinition>('../../../assets/pets/*/level-*/asset.json', { eager: true, import: 'default' });
const rigFiles = import.meta.glob<Rig>('../../../assets/rigs/*.json', { eager: true, import: 'default' });
const rigs = Object.fromEntries(Object.values(rigFiles).map(rig => [rig.id, rig]));
let petDefinitions = Object.values(bundledPetFiles);
try {
  const response = await fetch('/__asset-studio/pet-manifests', { cache: 'no-store' });
  if (response.ok) petDefinitions = await response.json() as PetDefinition[];
} catch {
  // Production/static preview has no local manifest API; bundled JSON remains the fallback.
}

createRoot(document.querySelector('#app')!).render(
  <App petDefinitions={petDefinitions} rigs={rigs} />,
);
