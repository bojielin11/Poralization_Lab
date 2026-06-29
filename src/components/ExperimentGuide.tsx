import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle2, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { useSimulationStore, GUIDED_STEPS } from '../store/simulationStore';

const EXPERIMENT_NAMES: Record<string, string> = {
  'malus-law': '马吕斯定律验证',
  'linear-polarization': '线偏振的产生与检验',
  'waveplate': '波片与偏振态转换',
  'photoelastic': '光弹效应观测',
};

export function ExperimentGuide() {
  const guidedExperiment = useSimulationStore(s => s.guidedExperiment);
  const guidedStep = useSimulationStore(s => s.guidedStep);
  const advanceGuidedStep = useSimulationStore(s => s.advanceGuidedStep);
  const previousGuidedStep = useSimulationStore(s => s.previousGuidedStep);
  const setMode = useSimulationStore(s => s.setMode);
  const [expanded, setExpanded] = useState(true);

  if (!guidedExperiment) return null;

  const steps = GUIDED_STEPS[guidedExperiment] || [];
  const currentStep = steps[guidedStep];
  if (!currentStep) return null;

  const expName = EXPERIMENT_NAMES[guidedExperiment] || guidedExperiment;
  const done = guidedStep >= steps.length - 1;

  return (
    <>
      {/* Floating thin bar — always visible, doesn't take space */}
      <div className="absolute top-0 left-0 right-0 z-20">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-2 px-3 h-[32px] border-b border-lab-amber/30"
          style={{ background: 'rgba(16, 23, 29, 0.95)', backdropFilter: 'blur(8px)' }}
        >
          <BookOpen size={13} className="text-lab-amber" />
          <span className="text-[11px] font-semibold text-lab-amber/90">
            {expName} · 步骤 {guidedStep + 1}/{steps.length}
          </span>
          <span className="text-[10px] text-lab-text-muted truncate flex-1 text-left ml-1">
            {currentStep.title}
          </span>
          {/* Mini progress dots */}
          <div className="flex gap-[2px]">
            {steps.map((_, i) => (
              <div key={i} className={`w-[10px] h-[3px] rounded-full ${
                i < guidedStep ? 'bg-lab-accent' : i === guidedStep ? 'bg-lab-amber' : 'bg-lab-bg-hover'
              }`} />
            ))}
          </div>
          <div className="flex items-center gap-1 ml-2">
            <button onClick={(e) => { e.stopPropagation(); previousGuidedStep(); }}
              disabled={guidedStep === 0}
              className="w-5 h-5 rounded flex items-center justify-center text-lab-text-muted hover:text-lab-text-primary disabled:opacity-30"
            ><ChevronLeft size={12} /></button>
            <button onClick={(e) => { e.stopPropagation(); advanceGuidedStep(); }}
              disabled={done}
              className={`w-5 h-5 rounded flex items-center justify-center ${done ? 'text-lab-text-muted opacity-30' : 'text-lab-amber hover:text-lab-amber'}`}
            >{done ? <CheckCircle2 size={12} /> : <ChevronRight size={12} />}</button>
            <span className="text-[10px] text-lab-text-muted ml-1">
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </span>
          </div>
          <button onClick={(e) => { e.stopPropagation(); setMode('free'); }}
            className="text-[10px] text-lab-text-muted hover:text-lab-text-secondary ml-2"
          >退出</button>
        </button>
      </div>

      {/* Expanded step detail overlay */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute top-[32px] left-0 right-0 z-20 overflow-hidden border-b border-lab-amber/20"
            style={{ background: 'rgba(14, 20, 26, 0.97)', backdropFilter: 'blur(12px)' }}
          >
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-3 px-4 py-3"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 mt-0.5"
                style={{ background: 'linear-gradient(135deg, rgba(255,183,77,0.25), rgba(255,183,77,0.08))', border: '1px solid rgba(255,183,77,0.35)' }}
              >
                <span className="text-sm font-bold text-lab-amber">{currentStep.id}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-lab-text-primary">{currentStep.title}</h4>
                  {currentStep.targetAngle !== undefined && (
                    <span className="text-[10px] font-mono text-lab-amber px-2 py-0.5 rounded-full bg-lab-amber-dim border border-lab-amber/20">
                      目标角度: {currentStep.targetAngle}°
                    </span>
                  )}
                </div>
                <p className="text-sm text-lab-text-secondary leading-relaxed">{currentStep.instruction}</p>
              </div>
            </motion.div>

            {done && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-2 mx-4 mb-3 px-3 py-2 rounded-lg bg-lab-success/10 border border-lab-success/20 text-lab-success text-xs"
              >
                <CheckCircle2 size={14} />
                <span>实验指导已完成！你可以切换到"自由探索模式"继续自由实验。</span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
