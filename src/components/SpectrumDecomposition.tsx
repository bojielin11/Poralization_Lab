import { useMemo, useState } from 'react';
import { usePhotoelasticStore } from '../store/photoelasticStore';
import { getSpectrumLUT, computeLegendColor, wlToSRGB } from '../physics/photoelastic';

// ── Component ──────────────────────────────────────────────────
export function SpectrumDecomposition() {
  const wavelength = usePhotoelasticStore(s => s.wavelength);
  const polarizerAngle = usePhotoelasticStore(s => s.polarizerAngle);
  const analyzerAngle = usePhotoelasticStore(s => s.analyzerAngle);
  const [probeRet, setProbeRet] = useState(550);

  const bars = useMemo(() => {
    const count = 80;
    return Array.from({ length: count }, (_, i) => {
      const wl = 380 + (i / (count - 1)) * 400;
      const c = wlToSRGB(wl);
      return `rgb(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)})`;
    });
  }, []);

  // Precompute interference curve for the current probe retardation
  const interferenceCurve = useMemo(() => {
    const count = 80;
    return Array.from({ length: count }, (_, i) => {
      const wl = 380 + (i / (count - 1)) * 400;
      const delta = 2 * Math.PI * probeRet / wl;
      const I = Math.sin(delta / 2) ** 2;  // crossed polarizers dark-field
      return { wl, I };
    });
  }, [probeRet]);

  // Compute the resulting color at the probe retardation
  const lut = useMemo(() => getSpectrumLUT(wavelength), [wavelength]);
  const resultColor = useMemo(() => {
    const c = computeLegendColor(lut, probeRet, polarizerAngle, analyzerAngle);
    return `rgb(${c.r},${c.g},${c.b})`;
  }, [lut, probeRet, polarizerAngle, analyzerAngle]);

  // Interference order
  const order = probeRet / 550; // approximate order (reference: 550nm green)

  // For SVG plot: find max I for scaling
  const maxI = Math.max(...interferenceCurve.map(d => d.I), 0.01);

  return (
    <div className="p-3 rounded-lg bg-lab-bg-inset border border-lab-border/30 space-y-3">
      {/* Title */}
      <div className="text-xs font-semibold text-lab-accent">
        光谱分解 — Michel-Lévy 干涉色成因
      </div>

      {/* Visible spectrum + interference — shared axis alignment */}
      <div>
        <div className="text-2xs text-lab-text-muted mb-1">可见光谱 (380–780 nm) · 干涉调制 I(λ)</div>

        {/* Spectrum bar */}
        <div className="flex h-4 rounded-sm overflow-hidden border border-lab-border/40">
          {bars.map((color, i) => (
            <div key={i} className="flex-1 h-full" style={{ backgroundColor: color }} />
          ))}
        </div>

        {/* Interference plot — same x-range (380-780) */}
        <svg width="100%" height="56" viewBox="380 0 400 56" preserveAspectRatio="none"
          className="border-b border-l border-r border-lab-border/30"
          style={{ background: '#faf9f5' }}
        >
          {/* Interference curve I(λ) = sin²(π·Γ/λ) */}
          <polyline
            fill="none"
            stroke="#d97757"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            points={interferenceCurve.map(d =>
              `${d.wl},${6 + (1 - d.I / maxI) * 44}`
            ).join(' ')}
          />

          {/* Zero line */}
          <line x1={380} y1={50} x2={780} y2={50} stroke="#ded8ca" strokeWidth={0.5} />

          {/* Y label */}
          <text x={384} y={14} fill="#b3aa97" fontSize={7} fontFamily="monospace">I∝sin²(δ/2)</text>
        </svg>

        {/* Shared x-axis labels */}
        <div className="flex justify-between text-[9px] text-lab-text-muted mt-0.5 font-mono">
          <span>380</span><span>480</span><span>580</span><span>680</span><span>780 nm</span>
        </div>
      </div>

      {/* Probe controls */}
      <div>
        <div className="flex items-center justify-between">
          <span className="text-2xs text-lab-text-muted">
            光程差 Γ = <strong className="text-lab-text-primary">{probeRet}</strong> nm
          </span>
          <span className="text-2xs text-lab-text-muted">
            级次 ≈ <strong className="text-lab-text-primary">{order.toFixed(1)}</strong>
          </span>
        </div>

      {/* Slider for probe retardation */}
      <div>
        <input
          type="range"
          min={0} max={3500} step={25}
          value={probeRet}
          onChange={e => setProbeRet(Number(e.target.value))}
          style={{ '--range-fill': `${(probeRet / 3500) * 100}%` } as React.CSSProperties}
        />
        <div className="text-2xs text-lab-text-muted mt-1">
          拖动滑块改变探针光程差，观察不同波长的干涉强度变化
        </div>
      </div>

        {/* Resulting color preview */}
        <div className="flex items-center gap-2">
          <span className="text-2xs text-lab-text-muted">合成颜色</span>
          <div className="w-8 h-8 rounded border border-lab-border/50"
            style={{ backgroundColor: resultColor }}
          />
          <span className="text-2xs text-lab-text-muted font-mono">{resultColor}</span>
        </div>
      </div>
    </div>
  );
}
