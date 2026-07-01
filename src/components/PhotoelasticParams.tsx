import { useCallback } from 'react';
import { SlidersHorizontal, X, RotateCcw } from 'lucide-react';
import { usePhotoelasticStore } from '../store/photoelasticStore';
import { MATERIALS } from '../physics/photoelastic';

// ============================================================
// Angle Dial — circular gauge (adapted from ParameterPanel)
// ============================================================
function AngleDial({ angle, onChange, label, accentColor = '#d97757' }: {
  angle: number;
  onChange: (v: number) => void;
  label: string;
  accentColor?: string;
}) {
  const rad = (angle * Math.PI) / 180;
  return (
    <div className="lab-control-group space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-lab-text-secondary">{label}</span>
        <span className="text-sm font-bold font-mono text-lab-accent-hover bg-lab-accent-dim px-2 py-0.5 rounded">
          {angle}°
        </span>
      </div>

      {/* Circular dial */}
      <div className="flex items-center justify-center">
        <svg width="140" height="140" viewBox="-70 -70 140 140" className="overflow-visible">
          <circle cx={0} cy={0} r={60} fill="none" stroke="#ded8ca" strokeWidth={1.5} />
          <circle cx={0} cy={0} r={56} fill="none" stroke="#f2efe7" strokeWidth={7} />

          {/* Tick marks */}
          {Array.from({ length: 72 }, (_, i) => {
            const a = (i * 5 * Math.PI) / 180;
            let inner: number, thick: number, color: string;
            if (i % 9 === 0) { inner = 45; thick = 1.2; color = '#b3aa97'; }
            else if (i % 3 === 0) { inner = 48; thick = 0.7; color = '#c9c2b1'; }
            else { inner = 50; thick = 0.4; color = '#d4cdba'; }
            return (
              <line key={i}
                x1={Math.cos(a) * inner} y1={-Math.sin(a) * inner}
                x2={Math.cos(a) * 56} y2={-Math.sin(a) * 56}
                stroke={color} strokeWidth={thick}
              />
            );
          })}

          {/* Major labels */}
          {[0, 45, 90, 135, 180].map(a => (
            <text key={a}
              x={Math.cos(a * Math.PI / 180) * 40}
              y={-Math.sin(a * Math.PI / 180) * 40 + 4}
              textAnchor="middle" fill="#8a867c" fontSize={9} fontWeight={600}
              fontFamily="JetBrains Mono, monospace"
            >{a}°</text>
          ))}

          {/* Indicator line */}
          <line x1={0} y1={0}
            x2={48 * Math.sin(rad)} y2={-48 * Math.cos(rad)}
            stroke={accentColor} strokeWidth={2.2} strokeLinecap="round"
          />
          <circle cx={0} cy={0} r={3.5} fill={accentColor} />
          <circle cx={0} cy={0} r={1.8} fill="#faf9f5" />

          <text x={0} y={21} textAnchor="middle" fill="#141413" fontSize={16} fontWeight={700}
            fontFamily="JetBrains Mono, monospace">{angle}°</text>
        </svg>
      </div>

      {/* Slider */}
      <input type="range" min={0} max={180} value={angle}
        onChange={e => onChange(Number(e.target.value))}
        style={{ '--range-fill': `${(angle / 180) * 100}%` } as React.CSSProperties}
      />

      {/* Quick presets */}
      <div className="flex gap-1 flex-wrap">
        {[0, 45, 90, 135, 180].map(a => (
          <button key={a}
            onClick={() => onChange(a)}
            className={`px-2 py-0.5 text-2xs rounded border font-mono transition-colors
              ${angle === a
                ? 'border-lab-amber text-lab-amber bg-lab-amber-dim'
                : 'border-lab-border text-lab-text-muted hover:border-lab-border-light hover:text-lab-text-secondary'
              }`}
          >{a}°</button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Material selector
// ============================================================
function MaterialSelector() {
  const materialKey = usePhotoelasticStore(s => s.materialKey);
  const setMaterial = usePhotoelasticStore(s => s.setMaterial);

  const current = MATERIALS[materialKey];
  const coeff = current?.coefficient ?? 1e-10;

  const formatCoeff = (c: number) => {
    const exp = Math.floor(Math.log10(c));
    const mantissa = c / Math.pow(10, exp);
    const superscripts: Record<string, string> = {
      '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³',
      '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    };
    const expStr = String(exp).split('').map(ch => superscripts[ch] || ch).join('');
    return `C = ${mantissa.toFixed(1)}×10${expStr} Pa⁻¹`;
  };

  return (
    <div className="lab-control-group space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-lab-text-secondary">材料预设</span>
      </div>
      <select
        value={materialKey}
        onChange={e => setMaterial(e.target.value)}
        aria-label="选择透明材料"
      >
        {Object.entries(MATERIALS).map(([key, mat]) => (
          <option key={key} value={key}>{mat.name}</option>
        ))}
      </select>
      <div className="text-2xs text-lab-text-muted font-mono">{formatCoeff(coeff)}</div>
    </div>
  );
}

// ============================================================
// Force controls
// ============================================================
function ForceControls() {
  const forces = usePhotoelasticStore(s => s.forces);
  const selectedForceId = usePhotoelasticStore(s => s.selectedForceId);
  const setForceMagnitude = usePhotoelasticStore(s => s.setForceMagnitude);
  const removeForce = usePhotoelasticStore(s => s.removeForce);
  const selectForce = usePhotoelasticStore(s => s.selectForce);
  const clearForces = usePhotoelasticStore(s => s.clearForces);

  return (
    <div className="lab-control-group space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-lab-text-secondary">
          施力点 ({forces.length}/3)
        </span>
        {forces.length > 0 && (
          <button
            onClick={clearForces}
            className="text-2xs text-lab-text-muted hover:text-lab-danger transition-colors"
          >
            清除全部
          </button>
        )}
      </div>

      {forces.length === 0 && (
        <div className="text-2xs text-lab-text-muted py-2 text-center">
          在应力条纹图上点击添加力点
        </div>
      )}

      {forces.map((force, idx) => {
        const isSelected = force.id === selectedForceId;
        return (
          <div key={force.id}
            onClick={() => selectForce(force.id)}
            className={`p-2 rounded border transition-colors cursor-pointer
              ${isSelected
                ? 'border-lab-accent bg-lab-accent-dim/30'
                : 'border-lab-border hover:border-lab-border-light bg-lab-bg-inset'
              }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs font-bold font-mono ${isSelected ? 'text-lab-accent' : 'text-lab-text-secondary'}`}>
                F{idx + 1} = {force.magnitude.toFixed(1)}
              </span>
              <button
                onClick={e => { e.stopPropagation(); removeForce(force.id); }}
                className="w-5 h-5 rounded flex items-center justify-center hover:bg-lab-danger/10 transition-colors"
                title="移除此力点"
              >
                <X size={11} className="text-lab-text-muted hover:text-lab-danger" />
              </button>
            </div>
            <input
              type="range"
              min={0.5} max={10} step={0.5}
              value={force.magnitude}
              onClick={e => e.stopPropagation()}
              onChange={e => {
                e.stopPropagation();
                setForceMagnitude(force.id, Number(e.target.value));
              }}
              style={{ '--range-fill': `${((force.magnitude - 0.5) / 9.5) * 100}%` } as React.CSSProperties}
            />
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// PhotoelasticParams — main right panel
// ============================================================
export function PhotoelasticParams() {
  const wavelength = usePhotoelasticStore(s => s.wavelength);
  const thickness = usePhotoelasticStore(s => s.thickness);
  const polarizerAngle = usePhotoelasticStore(s => s.polarizerAngle);
  const analyzerAngle = usePhotoelasticStore(s => s.analyzerAngle);
  const setWavelength = usePhotoelasticStore(s => s.setWavelength);
  const setThickness = usePhotoelasticStore(s => s.setThickness);
  const setPolarizerAngle = usePhotoelasticStore(s => s.setPolarizerAngle);
  const setAnalyzerAngle = usePhotoelasticStore(s => s.setAnalyzerAngle);
  const setCrossedPolarizers = usePhotoelasticStore(s => s.setCrossedPolarizers);
  const setParallelPolarizers = usePhotoelasticStore(s => s.setParallelPolarizers);
  const resetAll = usePhotoelasticStore(s => s.resetAll);

  const setWl = useCallback((v: number) => setWavelength(v), [setWavelength]);
  const setTh = useCallback((v: number) => setThickness(v), [setThickness]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 min-h-[42px] px-4 border-b border-lab-border flex-shrink-0"
        style={{ background: '#eee9dd' }}
      >
        <SlidersHorizontal size={14} className="text-lab-text-muted" />
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-lab-text-muted">光弹参数</span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Material */}
        <MaterialSelector />

        {/* Force points */}
        <ForceControls />

        <div className="h-px bg-lab-border" />

        {/* Wavelength */}
        <div className="lab-control-group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-lab-text-secondary">光源波长</span>
            <span className="text-sm font-mono text-lab-text-secondary">{wavelength} nm</span>
          </div>
          <input type="range" min={380} max={780} step={5} value={wavelength}
            onChange={e => setWl(Number(e.target.value))}
            style={{ '--range-fill': `${((wavelength - 380) / 400) * 100}%` } as React.CSSProperties}
          />
          <div className="text-2xs text-lab-text-muted mt-1">
            白光光谱中心偏置（δ = 2π·Δn·d/λ）
          </div>
        </div>

        {/* Thickness */}
        <div className="lab-control-group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-lab-text-secondary">材料厚度</span>
            <span className="text-sm font-mono text-lab-text-secondary">{thickness} mm</span>
          </div>
          <input type="range" min={1} max={10} step={1} value={thickness}
            onChange={e => setTh(Number(e.target.value))}
            style={{ '--range-fill': `${((thickness - 1) / 9) * 100}%` } as React.CSSProperties}
          />
        </div>

        <div className="h-px bg-lab-border" />

        {/* Polarizer angle */}
        <AngleDial
          label="起偏器角度"
          angle={polarizerAngle}
          onChange={setPolarizerAngle}
          accentColor="#8d97a3"
        />

        {/* Analyzer angle */}
        <AngleDial
          label="检偏器角度"
          angle={analyzerAngle}
          onChange={setAnalyzerAngle}
          accentColor="#d97757"
        />

        {/* Quick presets */}
        <div className="lab-control-group space-y-2">
          <span className="text-sm font-medium text-lab-text-secondary">偏振配置</span>
          <div className="flex gap-2">
            <button
              onClick={setCrossedPolarizers}
              className={`flex-1 py-2 text-2xs rounded-lg border font-mono transition-all
                ${polarizerAngle === 0 && analyzerAngle === 90
                  ? 'border-lab-amber text-lab-amber bg-lab-amber-dim'
                  : 'border-lab-border text-lab-text-muted hover:border-lab-border-light hover:text-lab-text-secondary'
                }`}
            >
              正交 暗场<br />
              <span className="text-lab-text-muted">P=0° ⊥ A=90°</span>
            </button>
            <button
              onClick={setParallelPolarizers}
              className={`flex-1 py-2 text-2xs rounded-lg border font-mono transition-all
                ${polarizerAngle === 0 && analyzerAngle === 0
                  ? 'border-lab-amber text-lab-amber bg-lab-amber-dim'
                  : 'border-lab-border text-lab-text-muted hover:border-lab-border-light hover:text-lab-text-secondary'
                }`}
            >
              平行 明场<br />
              <span className="text-lab-text-muted">P=0° ∥ A=0°</span>
            </button>
          </div>
        </div>

        {/* Reset */}
        <button onClick={resetAll}
          className="w-full py-2 text-sm border rounded-lg flex items-center justify-center gap-1.5
            border-lab-border hover:border-lab-accent/40 text-lab-text-secondary
            hover:text-lab-accent-hover hover:bg-lab-accent-dim/30 transition-colors"
        >
          <RotateCcw size={13} />
          重置全部参数
        </button>
      </div>
    </div>
  );
}
