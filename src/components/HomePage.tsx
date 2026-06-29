import { motion } from 'framer-motion';
import { ArrowRight, FlaskConical, Ruler, Waves, Eye } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';

interface ExperimentCard {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  description: string;
  question: string;
  tags: string[];
  icon: React.ReactNode;
  accentColor: string;
}

const EXPERIMENTS: ExperimentCard[] = [
  {
    id: 'exp-linear',
    number: '01',
    title: '线偏振的产生与检验',
    subtitle: '认识偏振光',
    description: '观察自然光通过起偏器形成线偏振光的过程，理解偏振片的选择性透射原理，通过旋转检偏器观察透射光强的变化规律，认识消光现象。',
    question: '线偏振光是如何产生和检测的？',
    tags: ['线偏振', '起偏器', '检偏器', '消光', '电场矢量'],
    icon: <FlaskConical size={28} />,
    accentColor: '#46cdd9',
  },
  {
    id: 'exp-malus',
    number: '02',
    title: '马吕斯定律验证',
    subtitle: '定量验证',
    description: '通过旋转检偏器采集 I-θ 数据，验证 I = I₀·cos²θ 定量关系。绘制马吕斯定律曲线，计算 MAE、RMSE、R² 拟合优度，进行完整的误差分析。',
    question: '透射光强与角度满足怎样的定量关系？',
    tags: ['马吕斯定律', 'cos²θ', '数据采集', '曲线拟合', '误差分析'],
    icon: <Ruler size={28} />,
    accentColor: '#ffb74d',
  },
  {
    id: 'exp-waveplate',
    number: '03',
    title: '波片与偏振态转换',
    subtitle: '偏振态分析',
    description: '引入四分之一波片和半波片，观察线偏振光经过波片后偏振态的变化——线偏振→椭圆偏振→圆偏振。使用极坐标图分析光强分布特征，理解相位延迟的概念。',
    question: '波片如何改变光的偏振态？',
    tags: ['波片', '偏振态', '椭圆偏振', '圆偏振', '相位延迟'],
    icon: <Waves size={28} />,
    accentColor: '#4ade80',
  },
  {
    id: 'exp-photoelastic',
    number: '04',
    title: '光弹效应观测',
    subtitle: '应力双折射',
    description: '观察透明材料在应力作用下的双折射现象。通过正交偏振片观察干涉条纹和彩色图案，理解应力-光学定律：Δn = C·(σ₁ − σ₂)，分析应力分布。',
    question: '应力如何影响材料的折射率？',
    tags: ['光弹效应', '应力双折射', '干涉条纹', 'Michel-Levy色标'],
    icon: <Eye size={28} />,
    accentColor: '#fbbf52',
  },
];

export function HomePage() {
  const setActiveExperiment = useSimulationStore(s => s.setActiveExperiment);

  return (
    <div className="h-full w-full overflow-y-auto"
      style={{
        background: `
          radial-gradient(1200px 620px at 78% -8%, rgba(70,205,217,0.07), transparent 60%),
          radial-gradient(900px 520px at 8% 108%, rgba(255,212,81,0.045), transparent 60%),
          linear-gradient(180deg, #0c141a 0%, #0a0e12 46%, #070a0d 100%)
        `
      }}
    >
      <div className="max-w-[880px] mx-auto px-6 py-14 flex flex-col items-center">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-5 rounded-full border text-2xs font-bold uppercase tracking-[0.1em]"
            style={{
              borderColor: 'rgba(70,205,217,0.30)',
              color: '#7ee0e8',
              background: 'rgba(70,205,217,0.08)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-lab-accent" style={{ boxShadow: '0 0 8px #46cdd9' }} />
            大学物理 · 偏振光虚拟实验
          </div>

          <h1 style={{
            fontSize: '44px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
            background: 'linear-gradient(180deg, #ffffff, #b9cdd4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '12px',
          }}>
            偏振光虚拟实验系统
          </h1>

          <p style={{ color: '#9fb1b8', fontSize: '16px', maxWidth: '620px', lineHeight: 1.7 }}>
            在线完成四个偏振光学实验：从基础概念到实际应用，涵盖线偏振、马吕斯定律、偏振态分析和光弹效应。
          </p>

          <div className="flex justify-center gap-7 mt-6 text-2xs" style={{ color: '#6c7d85' }}>
            <span>共 <b style={{ color: '#9fb1b8', fontWeight: 600 }}>4</b> 个实验</span>
            <span>从基础概念到实际应用</span>
            <span>线偏振 · 马吕斯定律 · 偏振态 · 光弹效应</span>
          </div>
        </motion.div>

        {/* Experiment cards grid */}
        <div className="grid grid-cols-2 gap-5 w-full max-[640px]:grid-cols-1">
          {EXPERIMENTS.map((exp, i) => (
            <motion.button
              key={exp.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
              whileHover={{ y: -4, borderColor: exp.accentColor }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveExperiment(exp.id)}
              className="text-left flex flex-col relative min-h-[280px] p-7 rounded-[14px] border transition-all duration-200 group"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0)), #10171d',
                borderColor: '#243240',
                boxShadow: '0 1px 2px rgba(0,0,0,0.30), 0 2px 6px rgba(0,0,0,0.20)',
              }}
            >
              {/* Top accent line */}
              <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[14px]"
                style={{
                  background: `linear-gradient(90deg, ${exp.accentColor}, #46cdd9, #4ade80)`,
                  opacity: 0.85,
                }}
              />

              {/* Hover glow */}
              <div className="absolute inset-0 rounded-[14px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                style={{
                  background: `radial-gradient(420px 180px at 80% 0%, ${exp.accentColor}18, transparent 70%)`,
                }}
              />

              {/* Header row */}
              <div className="flex items-start justify-between mb-5 relative z-10">
                <span className="text-2xs font-bold uppercase tracking-[1.4px]" style={{ color: exp.accentColor }}>
                  实验 {exp.number}
                </span>
                <div className="flex items-center justify-center w-[52px] h-[52px] rounded-[13px] border"
                  style={{
                    background: `linear-gradient(160deg, ${exp.accentColor}29, ${exp.accentColor}05)`,
                    borderColor: `${exp.accentColor}47`,
                    color: exp.accentColor,
                    boxShadow: `inset 0 0 14px ${exp.accentColor}1a`,
                  }}
                >
                  {exp.icon}
                </div>
              </div>

              {/* Title & subtitle */}
              <h3 className="text-lg font-bold text-lab-text-primary mb-1 relative z-10">{exp.title}</h3>
              <p className="text-xs font-semibold uppercase tracking-[0.06em] mb-3" style={{ color: exp.accentColor }}>
                {exp.subtitle}
              </p>

              {/* Description */}
              <p className="text-sm text-lab-text-secondary leading-relaxed flex-1 relative z-10">
                {exp.description}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between mt-5 relative z-10">
                <span className="inline-flex items-center px-2.5 py-1 text-2xs font-semibold rounded-full border"
                  style={{
                    color: exp.accentColor,
                    background: `${exp.accentColor}14`,
                    borderColor: `${exp.accentColor}42`,
                  }}
                >
                  {exp.question}
                </span>
                <span className="text-lab-text-muted text-lg transition-all duration-200 group-hover:text-lab-accent group-hover:translate-x-1">
                  <ArrowRight size={18} />
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
