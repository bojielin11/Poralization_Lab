import { motion } from 'framer-motion';
import { Zap, Aperture, ScanEye, Layers, Circle, Triangle, Gauge, Plus } from 'lucide-react';
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
  { type: 'polarizer', label: '线偏振片', description: '透振方向可选', icon: <Aperture size={18} />, color: '#9aa7b2' },
  { type: 'analyzer', label: '检偏器', description: '可旋转检测偏振方向', icon: <ScanEye size={18} />, color: '#46cdd9' },
  { type: 'half-wave-plate', label: '半波片 λ/2', description: '相位延迟 π', icon: <Layers size={18} />, color: '#4ade80' },
  { type: 'quarter-wave-plate', label: '四分之一波片 λ/4', description: '相位延迟 π/2', icon: <Circle size={18} />, color: '#fbbf52' },
  { type: 'prism', label: '三棱镜', description: '分光、折射', icon: <Triangle size={18} />, color: '#ff6f61' },
  { type: 'detector', label: '光强探测器', description: '测量透射光强', icon: <Gauge size={18} />, color: '#7ee0e8' },
];

export function ComponentLibrary() {
  const addElement = useSimulationStore(s => s.addElement);
  const elements = useSimulationStore(s => s.elements);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 min-h-[42px] px-4 border-b border-lab-border"
        style={{ background: 'rgba(20, 28, 35, 0.7)' }}
      >
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-lab-text-muted">光学元件库</span>
        <span className="ml-auto text-2xs font-mono text-lab-text-muted px-2 py-0.5 border border-lab-border rounded-full">
          点击卡片添加到光路
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {OPTICAL_COMPONENTS.map((comp, i) => {
          const count = elements.filter(el => el.type === comp.type).length;
          return (
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
              <div className="flex items-center justify-center w-10 h-10 rounded-[10px] border flex-shrink-0"
                style={{
                  background: `linear-gradient(160deg, ${comp.color}22, ${comp.color}05)`,
                  borderColor: `${comp.color}44`,
                  color: comp.color,
                  boxShadow: `inset 0 0 10px ${comp.color}15`,
                }}
              >
                {comp.icon}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-lab-text-primary">{comp.label}</div>
                <div className="text-2xs text-lab-text-muted truncate">{comp.description}</div>
              </div>

              {/* Add button — always visible */}
              <div className="flex items-center gap-1 px-2 py-1 rounded text-2xs font-semibold flex-shrink-0 transition-all duration-150"
                style={{
                  background: `${comp.color}15`,
                  border: `1px solid ${comp.color}30`,
                  color: comp.color,
                }}
              >
                <Plus size={10} />
                添加
              </div>

              {/* Count badge if already on bench */}
              {count > 0 && (
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: comp.color, color: '#0a0e12' }}
                >
                  {count}
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
