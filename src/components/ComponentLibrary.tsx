import { motion } from 'framer-motion';
import {
  Zap, Aperture, ScanEye, Layers, Circle, Triangle, Gauge
} from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';
import type { OpticalElementType } from '../types';

const OPTICAL_COMPONENTS: {
  type: OpticalElementType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  { type: 'laser', label: '激光器', description: '632.8nm 线偏振光源', icon: <Zap size={18} />, color: '#ffd451' },
  { type: 'polarizer', label: '线偏振片', description: '只允许特定方向电场通过', icon: <Aperture size={18} />, color: '#9aa7b2' },
  { type: 'analyzer', label: '检偏器', description: '可旋转，检测偏振方向', icon: <ScanEye size={18} />, color: '#46cdd9' },
  { type: 'half-wave-plate', label: '半波片 λ/2', description: '相位延迟 π，旋转偏振方向', icon: <Layers size={18} />, color: '#4ade80' },
  { type: 'quarter-wave-plate', label: '四分之一波片 λ/4', description: '相位延迟 π/2，产生椭圆偏振', icon: <Circle size={18} />, color: '#fbbf52' },
  { type: 'prism', label: '三棱镜', description: '分光、改变光路方向', icon: <Triangle size={18} />, color: '#ff6f61' },
  { type: 'detector', label: '光强探测器', description: '测量透射光强 I/I₀', icon: <Gauge size={18} />, color: '#7ee0e8' },
];

export function ComponentLibrary() {
  const { addElement } = useSimulationStore();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 min-h-[42px] px-4 border-b border-lab-border"
        style={{ background: 'rgba(20, 28, 35, 0.7)' }}
      >
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-lab-text-muted">光学元件库</span>
        <span className="ml-auto text-2xs font-mono text-lab-text-muted px-2 py-0.5 border border-lab-border rounded-full">
          {OPTICAL_COMPONENTS.length} 种元件
        </span>
      </div>

      {/* Component list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {OPTICAL_COMPONENTS.map((comp, i) => (
          <motion.button
            key={comp.type}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => addElement(comp.type)}
            whileHover={{ scale: 1.02, x: 2 }}
            whileTap={{ scale: 0.98 }}
            className="w-full text-left flex items-center gap-3 p-3 rounded-lab-lg border transition-all duration-150 group"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0)), #10171d',
              borderColor: '#243240',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = comp.color)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#243240')}
          >
            {/* Icon */}
            <div className="flex items-center justify-center w-10 h-10 rounded-[10px] border flex-shrink-0 transition-all duration-150"
              style={{
                background: `linear-gradient(160deg, ${comp.color}22, ${comp.color}05)`,
                borderColor: `${comp.color}44`,
                color: comp.color,
                boxShadow: `inset 0 0 10px ${comp.color}15`,
              }}
            >
              {comp.icon}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-lab-text-primary">{comp.label}</div>
              <div className="text-2xs text-lab-text-muted truncate">{comp.description}</div>
            </div>

            {/* Add indicator */}
            <div className="w-5 h-5 rounded-full border border-lab-border flex items-center justify-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ borderColor: comp.color }}
            >
              <span className="text-xs font-bold" style={{ color: comp.color }}>+</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
