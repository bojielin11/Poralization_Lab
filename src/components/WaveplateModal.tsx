import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Layers } from 'lucide-react';
import type { WaveplateType } from '../types';

const WAVEPLATE_OPTIONS: { type: WaveplateType; label: string; desc: string; phase: number; phaseLabel: string }[] = [
  { type: 'qwp', label: '四分之一波片', desc: 'λ/4 — 产生椭圆/圆偏振光', phase: Math.PI / 2, phaseLabel: 'π/2 (90°)' },
  { type: 'hwp', label: '半波片', desc: 'λ/2 — 旋转偏振方向', phase: Math.PI, phaseLabel: 'π (180°)' },
  { type: 'fwp', label: '全波片', desc: 'λ — 偏振态不变，相位延迟 2π', phase: 2 * Math.PI, phaseLabel: '2π (360°)' },
];

interface Props {
  onConfirm: (type: WaveplateType, angle: number, phaseRetardation: number) => void;
  onCancel: () => void;
}

export function WaveplateModal({ onConfirm, onCancel }: Props) {
  const [selected, setSelected] = useState<WaveplateType>('qwp');
  const [angle, setAngle] = useState(0);

  const option = WAVEPLATE_OPTIONS.find(o => o.type === selected)!;

  const handleConfirm = () => {
    onConfirm(selected, angle, option.phase);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      style={{ background: 'rgba(4, 8, 11, 0.70)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 8 }}
        className="w-full max-w-[420px] rounded-xl overflow-hidden shadow-lab-glow"
        style={{ background: '#10171d', border: '1px solid #3a4d59' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-lab-border"
          style={{ background: 'rgba(20, 28, 35, 0.6)' }}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg border border-lab-accent/30"
            style={{ background: 'radial-gradient(circle at 35% 30%, rgba(70,205,217,0.20), rgba(70,205,217,0.05))', color: '#46cdd9' }}
          >
            <Layers size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-lab-text-primary">添加波片</h3>
            <p className="text-2xs text-lab-text-muted">选择波片类型并设置初始参数</p>
          </div>
          <button onClick={onCancel} className="ml-auto w-7 h-7 rounded-full flex items-center justify-center
            bg-lab-bg-tertiary border border-lab-border text-lab-text-muted hover:text-lab-text-primary hover:bg-lab-bg-hover transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Waveplate type selector */}
          <div>
            <label className="block text-xs font-semibold text-lab-text-secondary mb-2">波片类型</label>
            <div className="space-y-2">
              {WAVEPLATE_OPTIONS.map(opt => (
                <button key={opt.type}
                  onClick={() => setSelected(opt.type)}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-lg border transition-all
                    ${selected === opt.type
                      ? 'border-lab-accent bg-lab-accent-dim/40'
                      : 'border-lab-border hover:border-lab-border-light bg-lab-bg-inset/50'
                    }`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
                    ${selected === opt.type ? 'border-lab-accent' : 'border-lab-border'}`}
                  >
                    {selected === opt.type && <div className="w-2 h-2 rounded-full bg-lab-accent" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-lab-text-primary">{opt.label}</div>
                    <div className="text-2xs text-lab-text-muted">{opt.desc}</div>
                  </div>
                  <span className="text-2xs font-mono text-lab-accent-hover px-2 py-0.5 rounded bg-lab-accent-dim border border-lab-accent/20 flex-shrink-0">
                    δ = {opt.phaseLabel}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Initial angle */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-lab-text-secondary">初始角度（快轴方向）</label>
              <span className="text-sm font-bold font-mono text-lab-accent-hover bg-lab-accent-dim px-2 py-0.5 rounded">
                {angle}°
              </span>
            </div>
            <input type="range" min={0} max={180} value={angle}
              onChange={e => setAngle(Number(e.target.value))}
              style={{ '--range-fill': `${(angle / 180) * 100}%` } as React.CSSProperties}
            />
            <div className="flex gap-1.5 mt-2">
              {[0, 15, 30, 45, 60, 75, 90].map(a => (
                <button key={a} onClick={() => setAngle(a)}
                  className={`flex-1 py-1 text-2xs rounded border font-mono transition-colors
                    ${angle === a
                      ? 'border-lab-amber text-lab-amber bg-lab-amber-dim'
                      : 'border-lab-border text-lab-text-muted hover:border-lab-border-light'
                    }`}
                >{a}°</button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-3.5 border-t border-lab-border"
          style={{ background: 'rgba(8, 13, 17, 0.5)' }}
        >
          <button onClick={onCancel} className="lab-btn flex-1">取消</button>
          <button onClick={handleConfirm} className="lab-btn lab-btn-primary flex-1">
            添加{option.label}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
