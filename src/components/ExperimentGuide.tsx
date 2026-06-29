import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, BookOpen } from 'lucide-react';
import { useSimulationStore, GUIDED_STEPS } from '../store/simulationStore';

export function ExperimentGuide() {
  const guidedExperiment = useSimulationStore(s => s.guidedExperiment);
  const guidedStep = useSimulationStore(s => s.guidedStep);
  const advanceGuidedStep = useSimulationStore(s => s.advanceGuidedStep);
  const previousGuidedStep = useSimulationStore(s => s.previousGuidedStep);
  const setGuidedExperiment = useSimulationStore(s => s.setGuidedExperiment);
  const setMode = useSimulationStore(s => s.setMode);

  if (!guidedExperiment) return null;

  const steps = GUIDED_STEPS[guidedExperiment] || [];
  const currentStep = steps[guidedStep];

  if (!currentStep) return null;

  const experimentNames: Record<string, string> = {
    'malus-law': '马吕斯定律验证',
    'linear-polarization': '线偏振的产生与检验',
    'waveplate': '波片与偏振态转换',
  };

  return (
    <div className="border-b border-lab-border flex-shrink-0"
      style={{ background: 'linear-gradient(180deg, rgba(20, 28, 35, 0.95), rgba(16, 23, 29, 0.95))' }}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 h-[38px]">
        <BookOpen size={14} className="text-lab-accent" />
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-lab-text-muted">实验指导</span>
        <span className="text-2xs font-mono text-lab-accent px-2 py-0.5 rounded-full bg-lab-accent-dim border border-lab-accent/20">
          {experimentNames[guidedExperiment] || guidedExperiment}
        </span>

        {/* Experiment switcher */}
        <select
          value={guidedExperiment}
          onChange={e => setGuidedExperiment(e.target.value as any)}
          className="!w-auto !py-1 !px-2 !text-2xs !bg-lab-bg-inset ml-auto"
        >
          <option value="malus-law">马吕斯定律</option>
          <option value="linear-polarization">线偏振</option>
          <option value="waveplate">波片实验</option>
        </select>

        <button
          onClick={() => setMode('free')}
          className="text-2xs text-lab-text-muted hover:text-lab-text-secondary transition-colors"
        >
          退出指导模式
        </button>
      </div>

      {/* Step progress bar */}
      <div className="flex items-center gap-0.5 px-4 pb-2">
        {steps.map((step, i) => (
          <div key={step.id} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`w-full h-1 rounded-full transition-colors duration-300 ${
                i < guidedStep ? 'bg-lab-accent' :
                i === guidedStep ? 'bg-lab-amber' :
                'bg-lab-bg-hover'
              }`}
            />
            <span className={`text-[9px] font-mono transition-colors ${
              i <= guidedStep ? 'text-lab-text-secondary' : 'text-lab-text-muted'
            }`}>
              {i + 1}
            </span>
          </div>
        ))}
      </div>

      {/* Current step card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.2 }}
          className="px-4 pb-3"
        >
          <div className="flex items-start gap-3 p-3 rounded-lg"
            style={{
              background: 'linear-gradient(135deg, rgba(255,183,77,0.08), rgba(70,205,217,0.04))',
              border: '1px solid rgba(255,183,77,0.15)',
            }}
          >
            {/* Step number badge */}
            <div className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 mt-0.5"
              style={{
                background: 'linear-gradient(135deg, rgba(255,183,77,0.25), rgba(255,183,77,0.08))',
                border: '1px solid rgba(255,183,77,0.35)',
              }}
            >
              <span className="text-sm font-bold text-lab-amber">{currentStep.id}</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-semibold text-lab-text-primary">{currentStep.title}</h4>
                {currentStep.targetAngle !== undefined && (
                  <span className="text-2xs font-mono text-lab-amber px-2 py-0.5 rounded-full bg-lab-amber-dim border border-lab-amber/20">
                    目标: {currentStep.targetAngle}°
                  </span>
                )}
              </div>
              <p className="text-sm text-lab-text-secondary leading-relaxed">{currentStep.instruction}</p>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={previousGuidedStep}
                disabled={guidedStep === 0}
                className="lab-btn lab-btn-sm !px-2"
                title="上一步"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={advanceGuidedStep}
                disabled={guidedStep >= steps.length - 1}
                className={`lab-btn lab-btn-sm !px-2 ${guidedStep >= steps.length - 1 ? '' : 'lab-btn-primary'}`}
                title={guidedStep >= steps.length - 1 ? '已完成所有步骤' : '下一步'}
              >
                {guidedStep >= steps.length - 1 ? (
                  <CheckCircle2 size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </button>
            </div>
          </div>

          {/* Completion status */}
          {guidedStep >= steps.length - 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-lab-success/10 border border-lab-success/20 text-lab-success text-xs"
            >
              <CheckCircle2 size={14} />
              <span>实验指导已完成！你可以切换到"自由探索模式"继续实验，或更换实验内容。</span>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
