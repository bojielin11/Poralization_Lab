// ============================================================
// Photoelastic Physics Engine
// Boussinesq stress field + Michel-Lévy spectral integration
// ============================================================

import type { ForcePoint } from '../types';

// --- Constants ---
const STRESS_SCALE = 1.4e4;
const LUT_MAX_NM = 16000;
const LUT_STEP_NM = 5;
const LAMBDA_MIN = 380;
const LAMBDA_MAX = 780;
const LAMBDA_STEP = 5;

export const MATERIALS: Record<string, { name: string; coefficient: number }> = {
  pmma:  { name: '亚克力（PMMA）',   coefficient: 1.0e-10 },
  pc:    { name: '聚碳酸酯（PC）',    coefficient: 7.0e-11 },
  glass: { name: '玻璃',              coefficient: 2.5e-12 },
  epoxy: { name: '环氧树脂',          coefficient: 5.0e-11 },
};

// ============================================================
// Wavelength to RGB (0..1 normalized)
// ============================================================
function wlToRGB(wavelength: number): { r: number; g: number; b: number } {
  let r: number, g: number, b: number;
  if (wavelength >= 380 && wavelength < 440) {
    r = -(wavelength - 440) / 60; g = 0; b = 1;
  } else if (wavelength >= 440 && wavelength < 490) {
    r = 0; g = (wavelength - 440) / 50; b = 1;
  } else if (wavelength >= 490 && wavelength < 510) {
    r = 0; g = 1; b = -(wavelength - 510) / 20;
  } else if (wavelength >= 510 && wavelength < 580) {
    r = (wavelength - 510) / 70; g = 1; b = 0;
  } else if (wavelength >= 580 && wavelength < 645) {
    r = 1; g = -(wavelength - 645) / 65; b = 0;
  } else if (wavelength >= 645 && wavelength <= 780) {
    r = 1; g = 0; b = 0;
  } else {
    return { r: 0, g: 0, b: 0 };
  }
  let factor: number;
  if (wavelength >= 380 && wavelength < 420) factor = 0.3 + 0.7 * (wavelength - 380) / 40;
  else if (wavelength >= 420 && wavelength <= 700) factor = 1;
  else if (wavelength > 700 && wavelength <= 780) factor = 0.3 + 0.7 * (780 - wavelength) / 80;
  else factor = 0;
  return {
    r: Math.max(0, Math.min(1, r * factor)),
    g: Math.max(0, Math.min(1, g * factor)),
    b: Math.max(0, Math.min(1, b * factor)),
  };
}

// ============================================================
// Spectrum Lookup Table
// Precomputes RGB cos components for retardation 0..LUT_MAX_NM
// ============================================================
export interface SpectrumLUT {
  base: { r: number; g: number; b: number };
  cosR: Float32Array;
  cosG: Float32Array;
  cosB: Float32Array;
}

let cachedLUT: SpectrumLUT | null = null;
let cachedWavelength: number = -1;

export function getSpectrumLUT(centerWavelength: number): SpectrumLUT {
  if (cachedLUT && cachedWavelength === centerWavelength) return cachedLUT;

  const samples: { wavelength: number; r: number; g: number; b: number }[] = [];
  const base = { r: 0, g: 0, b: 0 };

  for (let wl = LAMBDA_MIN; wl <= LAMBDA_MAX; wl += LAMBDA_STEP) {
    const rgb = wlToRGB(wl);
    const distance = (wl - centerWavelength) / 115;
    const sourceWeight = 0.2 + 0.8 * Math.exp(-0.5 * distance * distance);
    const sample = {
      wavelength: wl,
      r: rgb.r * sourceWeight,
      g: rgb.g * sourceWeight,
      b: rgb.b * sourceWeight,
    };
    samples.push(sample);
    base.r += sample.r;
    base.g += sample.g;
    base.b += sample.b;
  }

  const length = Math.floor(LUT_MAX_NM / LUT_STEP_NM) + 1;
  const cosR = new Float32Array(length);
  const cosG = new Float32Array(length);
  const cosB = new Float32Array(length);

  for (let i = 0; i < length; i++) {
    const retardationNm = i * LUT_STEP_NM;
    let r = 0, g = 0, b = 0;
    for (const sample of samples) {
      const cosDelta = Math.cos(2 * Math.PI * retardationNm / sample.wavelength);
      r += sample.r * cosDelta;
      g += sample.g * cosDelta;
      b += sample.b * cosDelta;
    }
    cosR[i] = r;
    cosG[i] = g;
    cosB[i] = b;
  }

  cachedLUT = { base, cosR, cosG, cosB };
  cachedWavelength = centerWavelength;
  return cachedLUT;
}

// ============================================================
// Sample the cosine LUT at a given retardation (linear interp)
// ============================================================
function sampleCosLUT(lut: SpectrumLUT, retardationNm: number): { r: number; g: number; b: number } {
  const position = Math.max(0, Math.min(LUT_MAX_NM, retardationNm)) / LUT_STEP_NM;
  const low = Math.floor(position);
  const high = Math.min(low + 1, lut.cosR.length - 1);
  const mix = position - low;
  return {
    r: lut.cosR[low] + (lut.cosR[high] - lut.cosR[low]) * mix,
    g: lut.cosG[low] + (lut.cosG[high] - lut.cosG[low]) * mix,
    b: lut.cosB[low] + (lut.cosB[high] - lut.cosB[low]) * mix,
  };
}

// ============================================================
// Tone mapping (gamma)
// ============================================================
function toneMap(value: number): number {
  return Math.round(255 * Math.pow(Math.max(0, Math.min(1, value)), 0.72));
}

// ============================================================
// Boussinesq point-force stress field (superposition)
// Returns { sigmaDiff, phi } where:
//   sigmaDiff = σ₁ − σ₂    (principal stress difference)
//   phi       = principal direction angle
// ============================================================
export function computeStressField(
  forces: ForcePoint[],
  x: number,
  y: number
): { sigmaDiff: number; phi: number } {
  let sigmaX = 0;
  let sigmaY = 0;
  let tauXY = 0;
  const core = 0.012; // prevents 1/r singularity at force point

  for (const force of forces) {
    const dx = x - force.x;
    const dy = y - force.y;
    const radius = Math.sqrt(dx * dx + dy * dy + core * core);
    const nx = dx / radius;
    const ny = dy / radius;
    const cosTheta = Math.abs(ny);
    const angularWeight = 0.18 + 0.82 * cosTheta;
    const magnitude = STRESS_SCALE * force.magnitude * angularWeight / radius;

    sigmaX += magnitude * nx * nx;
    sigmaY += magnitude * ny * ny;
    tauXY += magnitude * nx * ny;
  }

  return {
    sigmaDiff: Math.sqrt((sigmaX - sigmaY) ** 2 + 4 * tauXY * tauXY),
    phi: 0.5 * Math.atan2(2 * tauXY, sigmaX - sigmaY),
  };
}

// ============================================================
// Spectral Jones color computation
// Uses the precomputed LUT + Jones calculus for polarizer/analyzer
// ============================================================
export function computePixelColor(
  lut: SpectrumLUT,
  sigmaDiff: number,
  phi: number,
  coefficient: number,
  thicknessMm: number,
  polarizerAngleDeg: number,
  analyzerAngleDeg: number
): { r: number; g: number; b: number } {
  const thicknessM = thicknessMm * 1e-3;
  const retardationNm = coefficient * sigmaDiff * thicknessM * 1e9;

  const pol = polarizerAngleDeg * Math.PI / 180;
  const ana = analyzerAngleDeg * Math.PI / 180;

  // Jones: I ∝ |cos(α-φ)·cos(β-φ) + sin(α-φ)·sin(β-φ)·e^{iδ}|²
  //      = cos²(α-φ)·cos²(β-φ) + sin²(α-φ)·sin²(β-φ)
  //        + 2·cos(α-φ)·cos(β-φ)·sin(α-φ)·sin(β-φ)·cosδ
  //      = baseFactor + crossFactor · cosδ
  const cosa = Math.cos(ana - phi);
  const cosb = Math.cos(pol - phi);
  const sina = Math.sin(ana - phi);
  const sinb = Math.sin(pol - phi);
  const first = cosa * cosb;
  const second = sina * sinb;
  const baseFactor = first * first + second * second;
  const crossFactor = 2 * first * second;

  const cosColor = sampleCosLUT(lut, retardationNm);

  return {
    r: toneMap(baseFactor + crossFactor * cosColor.r / lut.base.r),
    g: toneMap(baseFactor + crossFactor * cosColor.g / lut.base.g),
    b: toneMap(baseFactor + crossFactor * cosColor.b / lut.base.b),
  };
}

// ============================================================
// Compute color bar sample (for legend display)
// ============================================================
export function computeLegendColor(
  lut: SpectrumLUT,
  retardationNm: number,
  polarizerAngleDeg: number,
  analyzerAngleDeg: number
): { r: number; g: number; b: number } {
  const pol = polarizerAngleDeg * Math.PI / 180;
  const ana = analyzerAngleDeg * Math.PI / 180;
  // Use a reference phi = polarizer + π/4 (diagonal)
  const phi = pol + Math.PI / 4;

  const cosa = Math.cos(ana - phi);
  const cosb = Math.cos(pol - phi);
  const sina = Math.sin(ana - phi);
  const sinb = Math.sin(pol - phi);
  const first = cosa * cosb;
  const second = sina * sinb;
  const baseFactor = first * first + second * second;
  const crossFactor = 2 * first * second;

  const cosColor = sampleCosLUT(lut, retardationNm);

  return {
    r: toneMap(baseFactor + crossFactor * cosColor.r / lut.base.r),
    g: toneMap(baseFactor + crossFactor * cosColor.g / lut.base.g),
    b: toneMap(baseFactor + crossFactor * cosColor.b / lut.base.b),
  };
}

// ============================================================
// Invalidate LUT cache (call when wavelength changes externally)
// ============================================================
export function invalidateLUTCache(): void {
  cachedWavelength = -1;
}
