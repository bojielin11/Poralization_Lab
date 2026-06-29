// ============================================================
// Type definitions for the Optical Polarization Simulation
// ============================================================

export type OpticalElementType = 'laser' | 'polarizer' | 'analyzer' | 'half-wave-plate' | 'quarter-wave-plate' | 'prism' | 'detector';

export interface OpticalElement {
  id: string;
  type: OpticalElementType;
  label: string;
  position: number;     // Normalized position along the optical bench (0..1)
  angle: number;         // Rotation angle in degrees
  phaseRetardation?: number; // For wave plates (π for HWP, π/2 for QWP)
  refractiveIndex?: number;  // For prism
  incidentAngle?: number;    // For prism
  transmittance?: number;    // 0..1
  locked?: boolean;
}

export interface DataPoint {
  angle: number;
  intensity: number;
  theory: number;
}

export type ExperimentMode = 'free' | 'guided';

export type GuidedExperiment = 'malus-law' | 'linear-polarization' | 'waveplate' | null;

export interface GuidedStep {
  id: number;
  title: string;
  instruction: string;
  targetAngle?: number;
  action?: string;
}

export interface StokesVector {
  s0: number;
  s1: number;
  s2: number;
  s3: number;
}

export interface JonesVector {
  Ex: { re: number; im: number };
  Ey: { re: number; im: number };
}

export interface PolarizationState {
  Ex: number;
  Ey: number;
  phaseDiff: number;  // radians
  intensity: number;
}
