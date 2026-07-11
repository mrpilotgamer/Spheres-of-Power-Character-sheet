// Vite's import.meta.glob eagerly imports every JSON file in this folder.
// To add a new sphere (or flesh out a stub), just add/edit a file in
// src/data/spheres/ - it will show up automatically, no code changes needed.
const modules = import.meta.glob('../data/spheres/*.json', { eager: true });

export const spheres = Object.values(modules)
  .map((mod) => mod.default || mod)
  .sort((a, b) => a.name.localeCompare(b.name));

export const spheresById = Object.fromEntries(spheres.map((s) => [s.id, s]));

export function allTalentsForSphere(sphere) {
  return [
    ...(sphere.talents || []),
    ...(sphere.blastShapes || []),
    ...(sphere.blastTypes || []),
    ...(sphere.cureTalents || []),
    ...(sphere.vitalityTalents || []),
    ...(sphere.transformationTalents || []),
    ...(sphere.bodyTalents || [])
  ];
}
