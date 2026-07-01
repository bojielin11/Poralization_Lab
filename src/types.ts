// ============================================================
// Type definitions for the Optical Polarization Simulation
// ============================================================

export type OpticalElementType = 'laser' | 'polarizer' | 'analyzer' | 'waveplate' | 'prism' | 'sample' | 'detector';

export type WaveplateType = 'qwp' | 'hwp' | 'fwp'; // quarter, half, full

export interface OpticalElement {
  id: string;
  type: OpticalElementType;
  label: string;
  position: number;        // Normalized position along optical bench (0..1)
  angle: number;            // Rotation angle in degrees
  phaseRetardation?: number; // For wave plates (π/2, π, 2π)
  waveplateType?: WaveplateType; // 'qwp' | 'hwp' | 'fwp'
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

export interface DataGroup {
  id: string;
  label: string;
  color: string;
  dataPoints: DataPoint[];
  visible: boolean;
  waveplateType?: WaveplateType;
  polarizerAngle?: number;
  waveplateAngle?: number;
}

export type ExperimentMode = 'free' | 'guided';

export type GuidedExperiment = 'malus-law' | 'linear-polarization' | 'waveplate' | 'photoelastic' | null;

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
  phaseDiff: number;
  intensity: number;
}

// ============================================================
// Photoelastic experiment types
// ============================================================
export interface ForcePoint {
  id: number;
  x: number;        // normalized 0..1
  y: number;        // normalized 0..1
  magnitude: number; // 0.5 .. 10
}

export interface MaterialConfig {
  key: string;
  name: string;
  coefficient: number; // stress-optical coefficient C (Pa⁻¹)
}
