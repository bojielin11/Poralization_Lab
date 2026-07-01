import { motion } from 'framer-motion';
import { ArrowRight, FlaskConical, Ruler, Waves, Eye } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';
import { PolarizationHeroAnimation } from './PolarizationHeroAnimation';

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
    icon: <FlaskConical size={28} className="animate-icon-beaker" />,
    accentColor: '#d97757',
  },
  {
    id: 'exp-malus',
    number: '02',
    title: '马吕斯定律验证',
    subtitle: '定量验证',
    description: '通过旋转检偏器采集 I-θ 数据，验证 I = I₀·cos²θ 定量关系。绘制马吕斯定律曲线，计算 MAE、RMSE、R² 拟合优度，进行完整的误差分析。',
    question: '透射光强与角度满足怎样的定量关系？',
    tags: ['马吕斯定律', 'cos²θ', '数据采集', '曲线拟合', '误差分析'],
    icon: <Ruler size={28} className="animate-icon-ruler" />,
    accentColor: '#d97757',
  },
  {
    id: 'exp-waveplate',
    number: '03',
    title: '波片与偏振态转换',
    subtitle: '偏振态分析',
    description: '引入四分之一波片和半波片，观察线偏振光经过波片后偏振态的变化——线偏振→椭圆偏振→圆偏振。使用极坐标图分析光强分布特征，理解相位延迟的概念。',
    question: '波片如何改变光的偏振态？',
    tags: ['波片', '偏振态', '椭圆偏振', '圆偏振', '相位延迟'],
    icon: <Waves size={28} className="animate-icon-waves" />,
    accentColor: '#d97757',
  },
  {
    id: 'exp-photoelastic',
    number: '04',
    title: '光弹效应观测',
    subtitle: '应力双折射',
    description: '观察透明材料在应力作用下的双折射现象。通过正交偏振片观察干涉条纹和彩色图案，理解应力-光学定律：Δn = C·(σ₁ − σ₂)，分析应力分布。',
    question: '应力如何影响材料的折射率？',
    tags: ['光弹效应', '应力双折射', '干涉条纹', 'Michel-Levy色标'],
    icon: <Eye size={28} className="animate-icon-eye" />,
    accentColor: '#d97757',
  },
];

export function HomePage() {
  const setActiveExperiment = useSimulationStore(s => s.setActiveExperiment);

  const renderCard = (exp: ExperimentCard, idx: number) => (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + idx * 0.08, duration: 0.4 }}
      whileHover={{ y: -4, borderColor: exp.accentColor }}
      whileTap={{ scale: 0.98 }}
      onClick={() => setActiveExperiment(exp.id)}
      className="text-left flex flex-col relative min-h-[190px] p-7 rounded-[14px] border transition-all duration-200 group"
      style={{
        background: 'linear-gradient(180deg, #fbfaf6 0%, #f2efe7 100%)',
        borderColor: '#ded8ca',
        boxShadow: '0 1px 2px rgba(20,20,19,0.04), 0 2px 8px rgba(20,20,19,0.05)',
      }}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[14px]"
        style={{
          background: `linear-gradient(90deg, ${exp.accentColor}, ${exp.accentColor}55)`,
          opacity: 0.9,
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
        <div className={`flex items-center justify-center w-[52px] h-[52px] border blob-icon-container blob-icon-container-${idx + 1}`}
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

      {/* Footer */}
      <div className="flex items-center justify-end mt-5 relative z-10">
        <span className="text-lab-text-muted text-lg transition-all duration-200 group-hover:text-lab-accent group-hover:translate-x-1">
          <ArrowRight size={18} />
        </span>
      </div>
    </motion.button>
  );

  return (
    <div className="h-full w-full overflow-y-auto"
      style={{
        background: `
          radial-gradient(900px 460px at 50% -8%, rgba(217,119,87,0.06), transparent 60%),
          #faf9f5
        `
      }}
    >
      <div className="max-w-[1120px] mx-auto px-6 py-14 flex flex-col items-center">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h1 className="font-serif" style={{
            fontSize: '46px',
            fontWeight: 600,
            letterSpacing: '-0.015em',
            lineHeight: 1.12,
            color: '#141413',
            marginBottom: '12px',
          }}>
            偏振光虚拟实验系统
          </h1>
        </motion.div>

        {/* 时钟式布局：SVG 居中，4 卡分列 10/2/4/8 点钟
            左列：实验1(上) / 实验3(下)；右列：实验2(上) / 实验4(下) */}
        <div className="flex flex-col lg:flex-row lg:items-stretch gap-7 w-full">
          {/* 左列 — 1 (10点) / 3 (8点) */}
          <div className="lg:flex-1 flex flex-col gap-7 lg:justify-between order-2 lg:order-1">
            {renderCard(EXPERIMENTS[0], 0)}
            {renderCard(EXPERIMENTS[2], 2)}
          </div>

          {/* 中央 SVG 主视觉 */}
          <div className="flex justify-center items-center shrink-0 order-1 lg:order-2">
            <PolarizationHeroAnimation size={360} />
          </div>

          {/* 右列 — 2 (2点) / 4 (4点) */}
          <div className="lg:flex-1 flex flex-col gap-7 lg:justify-between order-3">
            {renderCard(EXPERIMENTS[1], 1)}
            {renderCard(EXPERIMENTS[3], 3)}
          </div>
        </div>
      </div>
    </div>
  );
}
