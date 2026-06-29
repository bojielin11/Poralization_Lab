// ============================================================
// Core Physics Engine — Polarization Optics
// ============================================================

/** Degrees to radians */
export const degToRad = (deg: number): number => (deg * Math.PI) / 180;

/** Radians to degrees */
export const radToDeg = (rad: number): number => (rad * 180) / Math.PI;

/** Normalize angle to [0, 360) */
export const normalizeAngle = (deg: number): number => ((deg % 360) + 360) % 360;

/** Minimum angle between two directions [0, 90] */
export const angleBetween = (a: number, b: number): number => {
  let diff = Math.abs(a - b) % 180;
  if (diff > 90) diff = 180 - diff;
  return diff;
};

/**
 * Malus's Law: I = I₀ · cos²(θ)
 * @param I0 — incident intensity
 * @param thetaDeg — angle between polarization direction and analyzer axis (degrees)
 */
export const malusIntensity = (I0: number, thetaDeg: number): number => {
  const rad = degToRad(thetaDeg);
  return I0 * Math.cos(rad) * Math.cos(rad);
};

/**
 * Intensity after a polarizer given incident polarization angle
 */
export const intensityAfterPolarizer = (
  I0: number,
  polAngle: number,
  filterAngle: number
): number => {
  const theta = angleBetween(polAngle, filterAngle);
  return malusIntensity(I0, theta);
};

/**
 * Natural (unpolarized) light through a polarizer: I = I₀/2
 */
export const naturalToLinear = (I0: number): number => I0 * 0.5;

/**
 * Wave plate phase retardation
 * @param deltaN — birefringence (n_e - n_o)
 * @param d — thickness (m)
 * @param lambda — wavelength (m)
 * @returns phase difference δ (radians)
 */
export const phaseRetardation = (deltaN: number, d: number, lambda: number): number =>
  (2 * Math.PI * deltaN * d) / lambda;

/**
 * Jones matrix for a linear polarizer at angle θ
 *   J = [  cos²θ      sinθ·cosθ  ]
 *       [ sinθ·cosθ     sin²θ    ]
 */
export const polarizerJones = (thetaRad: number): number[][] => {
  const c = Math.cos(thetaRad);
  const s = Math.sin(thetaRad);
  return [
    [c * c, s * c],
    [s * c, s * s],
  ];
};

/**
 * Jones matrix for a wave plate with fast axis at angle φ and retardation δ
 *   J = R(-φ) · [ e^{-iδ/2},   0      ] · R(φ)
 *                [    0,     e^{+iδ/2} ]
 */
export const waveplateJones = (phiRad: number, deltaRad: number): Complex[][] => {
  const c = Math.cos(phiRad);
  const s = Math.sin(phiRad);
  const cosD2 = Math.cos(deltaRad / 2);
  const sinD2 = Math.sin(deltaRad / 2);
  return [
    [
      { re: cosD2, im: -sinD2 * Math.cos(2 * phiRad) },
      { re: 0, im: -sinD2 * Math.sin(2 * phiRad) },
    ],
    [
      { re: 0, im: -sinD2 * Math.sin(2 * phiRad) },
      { re: cosD2, im: sinD2 * Math.cos(2 * phiRad) },
    ],
  ];
};

/**
 * Multiply 2x2 Jones matrix with a Jones vector
 */
export const applyJones = (
  J: [number, number][],
  E: [number, number]
): [number, number] => {
  const [Exr, Exi] = [E[0], E[1]];
  const [[J00, J01], [J10, J11]] = J;
  return [
    J00 * Exr + J01 * Exi,
    J10 * Exr + J11 * Exi,
  ];
};

/**
 * Simple Jones vector multiplication (2x2 complex × 2 complex) using real-valued representation.
 * Each complex number is [real, imag].
 */
export interface Complex {
  re: number;
  im: number;
}

export const cmult = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});

export const cadd = (a: Complex, b: Complex): Complex => ({
  re: a.re + b.re,
  im: a.im + b.im,
});

export const cexp = (theta: number): Complex => ({
  re: Math.cos(theta),
  im: Math.sin(theta),
});

/**
 * Compute output Jones vector after passing through a linear polarizer at angle theta
 * Input: [E0x, E0y] (real Jones vector for linear polarized light at 0°)
 */
export const afterPolarizer = (
  Ex0: number,
  Ey0: number,
  polarizerAngleRad: number
): [number, number] => {
  const c = Math.cos(polarizerAngleRad);
  const s = Math.sin(polarizerAngleRad);
  const proj = Ex0 * c + Ey0 * s;
  return [proj * c, proj * s];
};

/**
 * Compute Stokes parameters from Ex, Ey amplitudes and phase difference
 * S₀ = |Ex|² + |Ey|²          (total intensity)
 * S₁ = |Ex|² - |Ey|²          (horizontal vs vertical preference)
 * S₂ = 2·Re(Ex·Ey*)           (diagonal preference)
 * S₃ = 2·Im(Ex·Ey*)           (circular preference)
 */
export const computeStokes = (
  Ex: number,
  Ey: number,
  phaseDiffRad: number
): [number, number, number, number] => {
  const Ex2 = Ex * Ex;
  const Ey2 = Ey * Ey;
  const S0 = Ex2 + Ey2;
  const S1 = Ex2 - Ey2;
  const S2 = 2 * Ex * Ey * Math.cos(phaseDiffRad);
  const S3 = 2 * Ex * Ey * Math.sin(phaseDiffRad);
  return [S0, S1, S2, S3];
};

/**
 * Compute polarization ellipse parameters
 * Returns { psi: rotation angle of major axis, chi: ellipticity angle }
 */
export const polarizationEllipse = (
  Ex: number,
  Ey: number,
  phaseDiffRad: number
): { psi: number; chi: number; a: number; b: number } => {
  const Ex2 = Ex * Ex;
  const Ey2 = Ey * Ey;
  const ExEy = Ex * Ey;
  const cosDelta = Math.cos(phaseDiffRad);

  const psi = 0.5 * Math.atan2(2 * ExEy * cosDelta, Ex2 - Ey2);
  const sin2chi = (2 * ExEy * Math.sin(phaseDiffRad)) / (Ex2 + Ey2);
  const chi = 0.5 * Math.asin(Math.max(-1, Math.min(1, sin2chi)));

  // Semi-major and semi-minor axes (normalized)
  const S0 = Ex2 + Ey2;
  const S1 = Ex2 - Ey2;
  const S2 = 2 * ExEy * cosDelta;
  const S3 = 2 * ExEy * Math.sin(phaseDiffRad);
  const a = Math.sqrt((S0 + Math.sqrt(S1 * S1 + S2 * S2)) / 2);
  const b = Math.sqrt(Math.max(0, (S0 - Math.sqrt(S1 * S1 + S2 * S2)) / 2));

  return { psi, chi, a, b };
};

/**
 * Wavelength to approximate RGB color (visible spectrum mapping)
 */
export const wavelengthToRGB = (wavelength: number): { r: number; g: number; b: number } => {
  let r: number, g: number, b: number;
  if (wavelength >= 380 && wavelength < 440) {
    r = -(wavelength - 440) / (440 - 380);
    g = 0; b = 1;
  } else if (wavelength >= 440 && wavelength < 490) {
    r = 0;
    g = (wavelength - 440) / (490 - 440);
    b = 1;
  } else if (wavelength >= 490 && wavelength < 510) {
    r = 0; g = 1;
    b = -(wavelength - 510) / (510 - 490);
  } else if (wavelength >= 510 && wavelength < 580) {
    r = (wavelength - 510) / (580 - 510);
    g = 1; b = 0;
  } else if (wavelength >= 580 && wavelength < 645) {
    r = 1;
    g = -(wavelength - 645) / (645 - 580);
    b = 0;
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
    r: Math.round(Math.min(255, Math.max(0, r * factor * 255))),
    g: Math.round(Math.min(255, Math.max(0, g * factor * 255))),
    b: Math.round(Math.min(255, Math.max(0, b * factor * 255))),
  };
};

/** Gaussian random (Box-Muller) */
export const gaussianRandom = (mean = 0, stddev = 1): number => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return mean + stddev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};
