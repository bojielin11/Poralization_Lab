import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Save, Download, HelpCircle, ChevronDown, BookOpen, Compass, ArrowLeft
} from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';

const EXPERIMENT_NAMES: Record<string, string> = {
  'exp-linear': '线偏振的产生与检验',
  'exp-malus': '马吕斯定律验证',
  'exp-waveplate': '波片与偏振态转换',
  'exp-photoelastic': '光弹效应观测',
};

export function Navbar() {
  const activeExperiment = useSimulationStore(s => s.activeExperiment);
  const mode = useSimulationStore(s => s.mode);
  const setMode = useSimulationStore(s => s.setMode);
  const setActiveExperiment = useSimulationStore(s => s.setActiveExperiment);
  const resetAll = useSimulationStore(s => s.resetAll);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleExport = () => {
    const store = useSimulationStore.getState();
    if (store.dataPoints.length === 0) return;
    let csv = 'θ(°),I/I₀(实测),I/I₀(理论),偏差\n';
    for (const p of store.dataPoints) {
      csv += `${p.angle},${p.intensity.toFixed(3)},${p.theory.toFixed(3)},${(p.intensity - p.theory).toFixed(4)}\n`;
    }
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `偏振实验数据_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBackHome = () => {
    setActiveExperiment(null);
    resetAll();
  };

  return (
    <nav className="h-[54px] flex items-center gap-4 px-6 flex-shrink-0 z-[100]"
      style={{
        background: 'rgba(14, 20, 26, 0.82)',
        borderBottom: '1px solid #243240',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-[9px] border border-lab-accent/45 text-lab-accent"
          style={{
            background: 'radial-gradient(circle at 35% 30%, rgba(70,205,217,0.30), rgba(70,205,217,0.06))',
            boxShadow: '0 0 18px rgba(70,205,217,0.22), inset 0 0 10px rgba(70,205,217,0.10)',
          }}
        >
          <Zap size={18} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[10px] font-semibold tracking-[1.4px] text-lab-accent-hover/80 uppercase">大学物理 · 光学实验</span>
          <span className="text-base font-bold text-lab-text-primary tracking-[-0.01em]">偏振光虚拟实验系统</span>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-lab-border" />

      {/* Back to home */}
      {activeExperiment && (
        <button onClick={handleBackHome} className="lab-btn lab-btn-sm gap-1.5">
          <ArrowLeft size={14} />
          <span>返回首页</span>
        </button>
      )}

      {/* Current experiment name */}
      {activeExperiment && (
        <>
          <div className="w-px h-6 bg-lab-border" />
          <span className="text-sm text-lab-text-secondary font-medium">
            当前实验：<strong className="text-lab-text-primary font-semibold">{EXPERIMENT_NAMES[activeExperiment] || activeExperiment}</strong>
          </span>
        </>
      )}

      {/* Mode switcher — only in experiment */}
      {activeExperiment && (
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lab-btn lab-btn-sm gap-2 text-lab-text-secondary"
          >
            {mode === 'free' ? <Compass size={14} /> : <BookOpen size={14} />}
            <span>{mode === 'free' ? '自由探索' : '实验指导'}</span>
            <ChevronDown size={12} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full mt-2 left-0 w-52 bg-lab-bg-secondary border border-lab-border rounded-lab-lg shadow-lab-glow overflow-hidden z-50"
              >
                <button
                  onClick={() => { setMode('free'); setMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors hover:bg-lab-bg-hover ${mode === 'free' ? 'text-lab-accent bg-lab-accent-dim/50' : 'text-lab-text-secondary'}`}
                >
                  <Compass size={15} />
                  <div>
                    <div className="font-semibold">自由探索模式</div>
                    <div className="text-2xs text-lab-text-muted">自由添加元件、调整参数</div>
                  </div>
                </button>
                <button
                  onClick={() => { setMode('guided'); setMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors hover:bg-lab-bg-hover ${mode === 'guided' ? 'text-lab-accent bg-lab-accent-dim/50' : 'text-lab-text-secondary'}`}
                >
                  <BookOpen size={15} />
                  <div>
                    <div className="font-semibold">实验指导模式</div>
                    <div className="text-2xs text-lab-text-muted">按步骤完成实验操作</div>
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="flex-1" />

      {/* Actions — only in experiment */}
      {activeExperiment && (
        <div className="flex items-center gap-2">
          <button onClick={resetAll} className="lab-btn lab-btn-sm">
            <Save size={14} />
            <span>保存</span>
          </button>
          <button onClick={handleExport} className="lab-btn lab-btn-sm">
            <Download size={14} />
            <span>导出数据</span>
          </button>
          <button className="lab-btn lab-btn-sm">
            <HelpCircle size={14} />
            <span>帮助</span>
          </button>
        </div>
      )}
    </nav>
  );
}
