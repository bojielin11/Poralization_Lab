import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { SlidersHorizontal, Gauge, Eye, EyeOff } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';
import { malusIntensity, angleBetween } from '../physics/core';
import type { OpticalElement } from '../types';

// ============================================================
// Angle Dial — circular degree gauge for rotating elements
// ============================================================
function AngleDial({ angle, onChange, label }: { angle: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="lab-control-group space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-lab-text-secondary">{label}</span>
        <span className="text-sm font-bold font-mono text-lab-accent-hover bg-lab-accent-dim px-2 py-0.5 rounded">
          {angle}°
        </span>
      </div>

      {/* Circular dial visualization */}
      <div className="flex items-center justify-center">
        <svg width="160" height="160" viewBox="-80 -80 160 160" className="overflow-visible">
          {/* Outer ring */}
          <circle cx={0} cy={0} r={70} fill="none" stroke="#243240" strokeWidth={2} />
          <circle cx={0} cy={0} r={65} fill="none" stroke="#18222b" strokeWidth={8} />

          {/* Tick marks every 15° */}
          {Array.from({ length: 24 }, (_, i) => {
            const a = (i * 15 * Math.PI) / 180;
            const inner = i % 6 === 0 ? 54 : 58;
            const thickness = i % 6 === 0 ? 2 : 1;
            const isMajor = i % 6 === 0;
            return (
              <line key={i}
                x1={Math.cos(a) * inner} y1={-Math.sin(a) * inner}
                x2={Math.cos(a) * 65} y2={-Math.sin(a) * 65}
                stroke={isMajor ? '#4a6072' : '#3a4d59'} strokeWidth={thickness}
              />
            );
          })}

          {/* Major tick labels */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
            <text key={a}
              x={Math.cos(a * Math.PI / 180) * 47}
              y={-Math.sin(a * Math.PI / 180) * 47 + 4}
              textAnchor="middle" fill="#6c7d85" fontSize={10} fontWeight={600}
              fontFamily="JetBrains Mono, monospace"
              transform={`rotate(${a}, ${Math.cos(a * Math.PI / 180) * 47}, ${-Math.sin(a * Math.PI / 180) * 47})`}
            >{a}°</text>
          ))}

          {/* Angle indicator line */}
          <motion.line
            x1={0} y1={0}
            x2={0} y2={-58}
            animate={{ rotate: angle }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{ originX: '0px', originY: '0px' }}
            stroke="#ffb74d" strokeWidth={2.5} strokeLinecap="round"
          />

          {/* Center dot */}
          <circle cx={0} cy={0} r={4} fill="#ffb74d" />
          <circle cx={0} cy={0} r={2} fill="#0a0e12" />

          {/* Current angle text in center */}
          <text x={0} y={24} textAnchor="middle" fill="#ffb74d" fontSize={18} fontWeight={700}
            fontFamily="JetBrains Mono, monospace"
          >{angle}°</text>
        </svg>
      </div>

      {/* Slider control */}
      <input
        type="range"
        min={0} max={180} value={angle}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
        style={{ '--range-fill': `${(angle / 180) * 100}%` } as React.CSSProperties}
      />

      {/* Quick angle presets */}
      <div className="flex gap-1.5 flex-wrap">
        {[0, 15, 30, 45, 60, 75, 90].map(a => (
          <button key={a}
            onClick={() => onChange(a)}
            className={`px-2 py-0.5 text-2xs rounded border font-mono transition-colors
              ${angle === a
                ? 'border-lab-amber text-lab-amber bg-lab-amber-dim'
                : 'border-lab-border text-lab-text-muted hover:border-lab-border-light hover:text-lab-text-secondary'
              }`}
          >
            {a}°
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// ParameterPanel — main right panel
// ============================================================
export function ParameterPanel() {
  const elements = useSimulationStore(s => s.elements);
  const selectedElementId = useSimulationStore(s => s.selectedElementId);
  const selectElement = useSimulationStore(s => s.selectElement);
  const updateElement = useSimulationStore(s => s.updateElement);
  const removeElement = useSimulationStore(s => s.removeElement);

  // Display toggles
  const showEfield = useSimulationStore(s => s.showEfieldVectors);
  const showEllipse = useSimulationStore(s => s.showPolarizationEllipse);
  const setShowEfield = useSimulationStore(s => s.setShowEfield);
  const setShowEllipse = useSimulationStore(s => s.setShowEllipse);

  const selected = elements.find(el => el.id === selectedElementId) ?? elements[0] ?? null;

  // Compute derived values for analyzers
  const polarizer = elements.find(el => el.type === 'polarizer');
  const analyzer = elements.find(el => el.type === 'analyzer');
  const intensity = analyzer && polarizer
    ? malusIntensity(1.0, angleBetween(polarizer.angle, analyzer.angle))
    : 1.0;

  const handleAngleChange = useCallback((id: string, angle: number) => {
    updateElement(id, { angle });
  }, [updateElement]);

  const handleNumberChange = useCallback((id: string, field: string, value: number) => {
    updateElement(id, { [field]: value });
  }, [updateElement]);

  if (!selected) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 min-h-[42px] px-4 border-b border-lab-border"
          style={{ background: 'rgba(20, 28, 35, 0.7)' }}
        >
          <SlidersHorizontal size={14} className="text-lab-accent-hover" />
          <span className="text-xs font-semibold uppercase tracking-[0.1em] text-lab-text-muted">参数面板</span>
        </div>
        <div className="lab-empty flex-1">
          <Gauge size={32} className="opacity-30 mb-3" />
          <span>选择光路中的一个元件<br/>以查看和调整参数</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 min-h-[42px] px-4 border-b border-lab-border"
        style={{ background: 'rgba(20, 28, 35, 0.7)' }}
      >
        <SlidersHorizontal size={14} className="text-lab-accent-hover" />
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-lab-text-muted">参数面板</span>
        <span className="ml-auto text-2xs font-mono text-lab-amber px-2 py-0.5 border border-lab-amber/20 rounded-full bg-lab-amber/10">
          {selected.label.split('\n')[0]}
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Element selector row */}
        <div className="flex gap-1.5 flex-wrap">
          {elements.map(el => (
            <button key={el.id}
              onClick={() => selectElement(el.id)}
              className={`px-2.5 py-1 text-2xs rounded-full border font-mono transition-all
                ${el.id === selectedElementId
                  ? 'border-lab-amber text-lab-amber bg-lab-amber-dim'
                  : 'border-lab-border text-lab-text-muted hover:border-lab-border-light'
                }`}
            >
              {el.label.split('\n')[0]}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-lab-border" />

        {/* Type-specific parameters */}
        {(selected.type === 'analyzer' || selected.type === 'polarizer' || selected.type === 'waveplate') && (
          <AngleDial
            label={selected.type === 'analyzer' ? '检偏器角度' : selected.type === 'polarizer' ? '起偏器角度' : '快轴角度'}
            angle={selected.angle}
            onChange={v => handleAngleChange(selected.id, v)}
          />
        )}

        {/* Position slider */}
        <div className="lab-control-group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-lab-text-secondary">光路位置</span>
            <span className="text-sm font-mono text-lab-accent-hover">{(selected.position * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min={5} max={95} value={Math.round(selected.position * 100)}
            onChange={e => updateElement(selected.id, { position: Number(e.target.value) / 100 })}
            style={{ '--range-fill': `${selected.position * 100}%` } as React.CSSProperties}
          />
        </div>

        {/* Transmittance */}
        {selected.type !== 'laser' && selected.type !== 'detector' && (
          <div className="lab-control-group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-lab-text-secondary">透射率</span>
              <span className="text-sm font-mono text-lab-accent-hover">
                {((selected.transmittance ?? 1) * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min={0} max={100} value={(selected.transmittance ?? 1) * 100}
              onChange={e => updateElement(selected.id, { transmittance: Number(e.target.value) / 100 })}
              style={{ '--range-fill': `${(selected.transmittance ?? 1) * 100}%` } as React.CSSProperties}
            />
          </div>
        )}

        {/* Phase retardation for wave plates */}
        {selected.type === 'waveplate' && (
          <div className="lab-control-group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-lab-text-secondary">相位延迟 δ</span>
              <span className="text-sm font-mono text-lab-accent-hover">
                {selected.waveplateType === 'hwp' ? 'π rad' : selected.waveplateType === 'fwp' ? '2π rad' : 'π/2 rad'}
              </span>
            </div>
            <div className="text-2xs text-lab-text-muted leading-relaxed">
              {selected.waveplateType === 'hwp'
                ? '半波片 λ/2 — 引入 π（180°）相位延迟，可旋转线偏振光偏振方向，旋转角度 = 2 × 快轴夹角。'
                : selected.waveplateType === 'fwp'
                ? '全波片 λ — 引入 2π（360°）相位延迟，出射光偏振态与入射光相同。'
                : '四分之一波片 λ/4 — 引入 π/2（90°）相位延迟。线偏振光以 45° 入射时产生圆偏振光。'
              }
            </div>
          </div>
        )}

        {/* Prism parameters */}
        {selected.type === 'prism' && (
          <>
            <div className="lab-control-group">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-lab-text-secondary">折射率 n</span>
              </div>
              <input type="number" min={1.0} max={3.0} step={0.01} value={selected.refractiveIndex ?? 1.5}
                onChange={e => handleNumberChange(selected.id, 'refractiveIndex', Number(e.target.value))}
                className="mt-2"
              />
            </div>
            <div className="lab-control-group">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-lab-text-secondary">入射角</span>
                <span className="text-sm font-mono text-lab-accent-hover">{selected.incidentAngle ?? 45}°</span>
              </div>
              <input type="range" min={0} max={89} value={selected.incidentAngle ?? 45}
                onChange={e => handleNumberChange(selected.id, 'incidentAngle', Number(e.target.value))}
                style={{ '--range-fill': `${((selected.incidentAngle ?? 45) / 89) * 100}%` } as React.CSSProperties}
              />
            </div>
          </>
        )}

        {/* Intensity meter — always visible */}
        {analyzer && (
          <div className="lab-meter">
            <div className="lab-meter-label">当前透射光强</div>
            <div className="lab-meter-value">{intensity.toFixed(3)}</div>
            <div className="lab-meter-unit">I / I₀</div>
          </div>
        )}

        {/* Live formula display */}
        {analyzer && polarizer && (
          <div className="lab-formula">
            I = I₀ · cos²({angleBetween(polarizer.angle, analyzer.angle)}°)
            <br />
            <span className="text-sm font-bold" style={{ color: '#ffb74d' }}>
              = {malusIntensity(1.0, angleBetween(polarizer.angle, analyzer.angle)).toFixed(3)} I₀
            </span>
          </div>
        )}

        {/* Display toggles */}
        <div className="pt-1">
          <span className="text-2xs font-semibold uppercase tracking-[0.1em] text-lab-text-muted px-1">可视化选项</span>
          <div className="mt-2 space-y-1.5">
            <ToggleRow icon={showEfield ? <Eye size={14} /> : <EyeOff size={14} />} label="电场矢量" active={showEfield} onChange={setShowEfield} />
            <ToggleRow icon={showEllipse ? <Eye size={14} /> : <EyeOff size={14} />} label="偏振椭圆" active={showEllipse} onChange={setShowEllipse} />
          </div>
        </div>

        {/* Remove element — always visible */}
        <button
          onClick={() => removeElement(selected.id)}
          className="w-full py-2 text-sm text-lab-danger border border-lab-danger/30 rounded-lg
            hover:bg-lab-danger/10 transition-colors"
        >
          移除此元件
        </button>
      </div>
    </div>
  );
}

// --- Toggle row ---
function ToggleRow({ icon, label, active, onChange }: {
  icon: React.ReactNode; label: string; active: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!active)}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all
        ${active
          ? 'bg-lab-accent-dim/60 border border-lab-accent/30 text-lab-accent-hover'
          : 'bg-black/20 border border-transparent text-lab-text-secondary hover:text-lab-text-primary'
        }`}
    >
      <div className={`${active ? 'text-lab-accent' : 'text-lab-text-muted'}`}>{icon}</div>
      <span>{label}</span>
      <div className={`ml-auto w-8 h-4 rounded-full transition-colors ${active ? 'bg-lab-accent' : 'bg-lab-bg-hover'}`}>
        <motion.div
          className="w-3 h-3 rounded-full bg-white mt-0.5 shadow-sm"
          animate={{ x: active ? 16 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>
    </button>
  );
}
