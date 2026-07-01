// ============================================================
// Photoelastic Experiment Store
// Manages force points, material, optical parameters
// ============================================================

import { create } from 'zustand';
import type { ForcePoint } from '../types';

interface PhotoelasticState {
  // Force points
  forces: ForcePoint[];
  nextForceId: number;
  selectedForceId: number | null;

  // Material & optical parameters
  materialKey: string;
  wavelength: number;       // 380–780 nm, spectrum center
  thickness: number;        // 1–10 mm
  polarizerAngle: number;   // 0–180°
  analyzerAngle: number;    // 0–180°

  // Actions
  addForce: (x: number, y: number) => void;
  removeForce: (id: number) => void;
  moveForce: (id: number, x: number, y: number) => void;
  setForceMagnitude: (id: number, magnitude: number) => void;
  selectForce: (id: number | null) => void;
  setMaterial: (key: string) => void;
  setWavelength: (w: number) => void;
  setThickness: (t: number) => void;
  setPolarizerAngle: (a: number) => void;
  setAnalyzerAngle: (a: number) => void;
  setCrossedPolarizers: () => void;
  setParallelPolarizers: () => void;
  resetAll: () => void;
  clearForces: () => void;
}

function makeForce(id: number, x: number, y: number, magnitude = 5): ForcePoint {
  return { id, x, y, magnitude };
}

function createDefaultState() {
  return {
    forces: [makeForce(1, 0.5, 0.5)],
    nextForceId: 2,
    selectedForceId: 1 as number | null,
    materialKey: 'pmma',
    wavelength: 550,
    thickness: 5,
    polarizerAngle: 0,
    analyzerAngle: 90,
  };
}

export const usePhotoelasticStore = create<PhotoelasticState>((set, get) => ({
  ...createDefaultState(),

  addForce: (x, y) => {
    const state = get();
    if (state.forces.length >= 3) {
      // Max 3 forces: move the selected force instead
      const target = state.forces.find(f => f.id === state.selectedForceId) || state.forces[0];
      set({
        forces: state.forces.map(f =>
          f.id === target.id ? { ...f, x, y } : f
        ),
        selectedForceId: target.id,
      });
      return;
    }
    const force = makeForce(state.nextForceId, x, y);
    set({
      forces: [...state.forces, force],
      nextForceId: state.nextForceId + 1,
      selectedForceId: force.id,
    });
  },

  removeForce: (id) => {
    const state = get();
    const newForces = state.forces.filter(f => f.id !== id);
    set({
      forces: newForces,
      selectedForceId: newForces.length > 0 ? newForces[0].id : null,
    });
  },

  moveForce: (id, x, y) => {
    set(state => ({
      forces: state.forces.map(f =>
        f.id === id ? { ...f, x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) } : f
      ),
    }));
  },

  setForceMagnitude: (id, magnitude) => {
    set(state => ({
      forces: state.forces.map(f =>
        f.id === id ? { ...f, magnitude: Math.max(0.5, Math.min(10, magnitude)) } : f
      ),
    }));
  },

  selectForce: (id) => set({ selectedForceId: id }),

  setMaterial: (key) => set({ materialKey: key }),

  setWavelength: (w) => set({ wavelength: Math.max(380, Math.min(780, w)) }),

  setThickness: (t) => set({ thickness: Math.max(1, Math.min(10, t)) }),

  setPolarizerAngle: (a) => set({ polarizerAngle: a }),

  setAnalyzerAngle: (a) => set({ analyzerAngle: a }),

  setCrossedPolarizers: () => set({ polarizerAngle: 0, analyzerAngle: 90 }),

  setParallelPolarizers: () => set({ polarizerAngle: 0, analyzerAngle: 0 }),

  resetAll: () => set(createDefaultState()),

  clearForces: () => set({
    forces: [],
    selectedForceId: null,
    nextForceId: 1,
  }),
}));
