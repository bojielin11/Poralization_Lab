import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ChevronUp, ChevronDown } from 'lucide-react';
import { usePhotoelasticStore } from '../store/photoelasticStore';
import { getSpectrumLUT, computeLegendColor, MATERIALS } from '../physics/photoelastic';

// ============================================================
// Michel-Lévy color bar (live, based on current polarizer config)
// ============================================================
function MichelLevyColorBar() {
  const wavelength = usePhotoelasticStore(s => s.wavelength);
  const polarizerAngle = usePhotoelasticStore(s => s.polarizerAngle);
  const analyzerAngle = usePhotoelasticStore(s => s.analyzerAngle);

  const bars = useMemo(() => {
    const lut = getSpectrumLUT(wavelength);
    const count = 80;
    const maxRet = 3000;
    return Array.from({ length: count }, (_, i) => {
      const ret = (i / (count - 1)) * maxRet;
      const color = computeLegendColor(lut, ret, polarizerAngle, analyzerAngle);
      return `rgb(${color.r},${color.g},${color.b})`;
    });
  }, [wavelength, polarizerAngle, analyzerAngle]);

  return (
    <div className="p-3 rounded-lg bg-lab-bg-inset border border-lab-border/30">
      <div className="text-xs font-semibold text-lab-accent mb-2">
        Michel-Lévy 干涉色标（光程差 Γ）
      </div>
      <div className="flex h-7 rounded overflow-hidden border border-lab-border/50">
        {bars.map((color, i) => (
          <div key={i} className="flex-1 h-full" style={{ backgroundColor: color }} />
        ))}
      </div>
      <div className="flex justify-between text-[9px] text-lab-text-muted mt-1 font-mono">
        <span>0</span><span>750</span><span>1500</span><span>2250</span><span>3000 nm</span>
      </div>
      <div className="flex justify-between text-[9px] text-lab-text-muted mt-0.5">
        <span>0 级</span><span>1 级</span><span>2 级</span><span>3 级</span>
      </div>
    </div>
  );
}

// ============================================================
// Current parameter summary
// ============================================================
function ParameterSummary() {
  const materialKey = usePhotoelasticStore(s => s.materialKey);
  const thickness = usePhotoelasticStore(s => s.thickness);
  const wavelength = usePhotoelasticStore(s => s.wavelength);
  const polarizerAngle = usePhotoelasticStore(s => s.polarizerAngle);
  const analyzerAngle = usePhotoelasticStore(s => s.analyzerAngle);
  const forces = usePhotoelasticStore(s => s.forces);

  const material = MATERIALS[materialKey];
  const isCrossed = polarizerAngle === 0 && analyzerAngle === 90;
  const isParallel = polarizerAngle === 0 && analyzerAngle === 0;
  const configLabel = isCrossed ? '正交暗场'
    : isParallel ? '平行明场'
    : `P=${polarizerAngle}° A=${analyzerAngle}°`;

  const coeff = material?.coefficient ?? 1e-10;
  const coeffExp = Math.floor(Math.log10(coeff));
  const coeffMant = coeff / Math.pow(10, coeffExp);
  const superscripts: Record<string, string> = {
    '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³',
    '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  };
  const expStr = String(coeffExp).split('').map(ch => superscripts[ch] || ch).join('');

  return (
    <div className="p-3 rounded-lg bg-lab-bg-inset border border-lab-border/30 space-y-2">
      <div className="text-xs font-semibold text-lab-accent">当前参数</div>

      <div className="flex flex-wrap gap-1.5">
        <span className="lab-chip">
          材料 <strong className="text-lab-accent-hover ml-1">{material?.name ?? materialKey}</strong>
        </span>
        <span className="lab-chip">
          C <strong className="text-lab-accent-hover ml-1">{coeffMant.toFixed(1)}×10{expStr}</strong>
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className="lab-chip">d <strong className="ml-1">{thickness} mm</strong></span>
        <span className="lab-chip">λ <strong className="ml-1">{wavelength} nm</strong></span>
        <span className="lab-chip"
          style={isCrossed ? { borderColor: '#d97757', color: '#d97757' } : isParallel ? { borderColor: '#4da6a6', color: '#4da6a6' } : {}}
        >
          {configLabel}
        </span>
      </div>

      {forces.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {forces.map((f, i) => (
            <span key={f.id} className="lab-chip text-lab-text-muted">
              F{i + 1}<strong className="ml-1">({(f.x * 100).toFixed(0)}%,{(f.y * 100).toFixed(0)}%) = {f.magnitude.toFixed(1)}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Formula card
// ============================================================
function FormulaCard() {
  return (
    <div className="p-3 rounded-lg bg-lab-bg-inset border border-lab-border/30 space-y-2">
      <div className="text-xs font-semibold text-lab-accent">应力-光学定律</div>
      <div className="text-sm text-lab-text-primary leading-relaxed">
        <div className="font-mono text-lab-accent-hover">Δn = C · (σ₁ − σ₂)</div>
        <div className="text-2xs text-lab-text-muted mt-0.5">
          折射率差 = 应力光学系数 × 主应力差
        </div>
      </div>
      <div className="text-sm text-lab-text-primary leading-relaxed">
        <div className="font-mono text-lab-accent-hover">δ = 2π · Δn · d / λ</div>
        <div className="text-2xs text-lab-text-muted mt-0.5">
          相位差 = 2π × 折射率差 × 厚度 / 波长
        </div>
      </div>
      <div className="text-sm text-lab-text-primary leading-relaxed">
        <div className="font-mono text-lab-accent-hover">I ∝ sin²(δ/2) · sin²(2φ)</div>
        <div className="text-2xs text-lab-text-muted mt-0.5">
          正交偏振暗场强度（φ 为主应力方向与偏振方向的夹角）
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PhotoelasticDataPanel — bottom panel
// ============================================================
export function PhotoelasticDataPanel() {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="flex-shrink-0 border-t border-lab-border"
      style={{ background: '#f2efe7' }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 h-[36px] border-b border-lab-border hover:bg-lab-bg-hover/30 transition-colors"
      >
        <Activity size={14} className="text-lab-accent" />
        <span className="text-xs font-semibold uppercase tracking-[0.06em] text-lab-text-muted">
          光弹效应 · 应力分析与色标
        </span>
        <div className="flex-1" />
        <span className="text-2xs text-lab-text-muted mr-2">干涉色标 & 公式</span>
        {expanded ? <ChevronUp size={16} className="text-lab-text-muted" /> : <ChevronDown size={16} className="text-lab-text-muted" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-4 flex gap-4">
              {/* Left: color bar (wider) */}
              <div className="flex-1 min-w-0">
                <MichelLevyColorBar />
              </div>

              {/* Middle: formulas */}
              <div className="flex-1 min-w-0">
                <FormulaCard />
              </div>

              {/* Right: current params */}
              <div className="w-[280px] flex-shrink-0">
                <ParameterSummary />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
