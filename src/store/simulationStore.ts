import { create } from 'zustand';
import type { OpticalElement, DataPoint, GuidedExperiment, GuidedStep } from '../types';
import { malusIntensity, degToRad } from '../physics/core';

// ============================================================
// Guided experiment step definitions
// ============================================================

export const GUIDED_STEPS: Record<string, GuidedStep[]> = {
  'malus-law': [
    { id: 1, title: '观察初始状态', instruction: '你已放置好激光器（水平偏振）、起偏器（0°）和检偏器（0°）。此时 θ = 0°，根据马吕斯定律 I = I₀ cos²(0°) = I₀，光强最大。', targetAngle: 0 },
    { id: 2, title: '旋转检偏器到 30°', instruction: '调整检偏器角度到 30°。观察光路中光束亮度的变化，记录当前光强读数。', targetAngle: 30 },
    { id: 3, title: '旋转检偏器到 45°', instruction: '调整检偏器角度到 45°。此时 cos²(45°) = 0.5，光强应降为最大光强的一半。', targetAngle: 45 },
    { id: 4, title: '旋转检偏器到 60°', instruction: '调整检偏器角度到 60°。cos²(60°) = 0.25，光强继续降低。', targetAngle: 60 },
    { id: 5, title: '寻找消光位置', instruction: '旋转检偏器到 90°，此时 θ = 90°，cos²(90°) = 0，光强降为零。这就是"消光"现象——线偏振光完全被检偏器阻挡。', targetAngle: 90 },
    { id: 6, title: '采集完整数据', instruction: '将检偏器从 0° 旋转到 180°，每隔 10° 记录一次光强值。观察数据点与 cos²θ 理论曲线的吻合程度。点击下方"自动采集"按钮可以快速获得完整数据集。', targetAngle: undefined },
    { id: 7, title: '分析拟合结果', instruction: '查看底部面板的马吕斯定律曲线和误差统计。MAE（平均绝对误差）和 RMSE（均方根误差）越小，说明实验结果与理论越吻合。R² 接近 1 表示拟合优度很好。', targetAngle: undefined },
  ],
  'linear-polarization': [
    { id: 1, title: '认识自然光与偏振光', instruction: '自然光（如阳光、灯光）的电场振动方向在各个方向上均匀分布，没有特定的偏振方向。激光器发出的已经是线偏振光。', targetAngle: 0 },
    { id: 2, title: '起偏器的作用', instruction: '起偏器（偏振片）只允许特定方向的电场分量通过。当自然光通过起偏器后，出射光变为线偏振光，光强减半（I = I₀/2）。', targetAngle: undefined },
    { id: 3, title: '旋转检偏器观察', instruction: '旋转检偏器（0°~180°），观察透射光强的周期性变化。当检偏器透振方向与入射偏振方向平行时（θ=0°），光强最大；垂直时（θ=90°），完全消光。', targetAngle: undefined },
    { id: 4, title: '验证马吕斯定律', instruction: '在不同角度处记录光强，验证 I = I₀ cos²θ 的关系。这是线偏振光的基本特征。', targetAngle: undefined },
  ],
  'waveplate': [
    { id: 1, title: '添加四分之一波片', instruction: '在起偏器和检偏器之间插入四分之一波片（QWP）。QWP 在快轴和慢轴之间引入 π/2（90°）的相位延迟。', targetAngle: undefined },
    { id: 2, title: '调整波片角度', instruction: '将 QWP 快轴旋转到与入射偏振方向成 45°。此时出射光变为圆偏振光——电场矢量端点轨迹为圆。', targetAngle: 45 },
    { id: 3, title: '观察偏振椭圆', instruction: '调整 QWP 角度到其他值（如 30°），出射光变为椭圆偏振光。开启"显示偏振椭圆"开关，观察主画布中的椭圆形态变化。', targetAngle: 30 },
    { id: 4, title: '半波片实验', instruction: '将 QWP 替换为半波片（HWP，相位延迟 π）。HWP 会旋转线偏振光的偏振方向，旋转角度为 2 倍快轴与入射偏振方向的夹角。', targetAngle: undefined },
  ],
  'photoelastic': [
    { id: 1, title: '认识光弹效应', instruction: '光弹效应（应力双折射）：透明材料在应力作用下，折射率发生变化，产生双折射现象。Δn = C · (σ₁ − σ₂)，其中 C 为应力光学系数。', targetAngle: undefined },
    { id: 2, title: '正交偏振片观测', instruction: '将样品置于正交偏振片（起偏器⊥检偏器）之间。无应力时视场全暗；施加应力后，出现明暗相间的干涉条纹。', targetAngle: 90 },
    { id: 3, title: '观察应力条纹', instruction: '调整应力大小，观察干涉条纹的分布变化。应力越大，条纹越密。条纹颜色与相位差 δ = 2π·Δn·d/λ 相关。', targetAngle: undefined },
    { id: 4, title: '分析应力分布', instruction: '在白光照射下，不同波长在不同相位差处相长/相消，产生彩色干涉图案（Michel-Lévy 色标）。根据颜色可以推算应力大小。', targetAngle: undefined },
  ],
};

// ============================================================
// State interface
// ============================================================

interface SimulationState {
  // Optical elements on the bench
  elements: OpticalElement[];
  selectedElementId: string | null;
  nextElementId: number;

  // Source
  sourceIntensity: number;
  sourceWavelength: number;

  // Display toggles
  showEfieldVectors: boolean;
  showPolarizationEllipse: boolean;
  showIntensityCurve: boolean;
  showJonesMatrix: boolean;
  showStokesParams: boolean;

  // Routing
  activeExperiment: string | null;

  // Mode
  mode: 'free' | 'guided';
  guidedExperiment: GuidedExperiment;
  guidedStep: number;
  bottomPanelOpen: boolean;

  // Data collection
  dataPoints: DataPoint[];
  noiseLevel: number;

  // Computed
  beamColor: string;

  // --- Actions ---
  setActiveExperiment: (id: string | null) => void;
  addElement: (type: OpticalElement['type'], extra?: Partial<OpticalElement>) => void;
  removeElement: (id: string) => void;
  updateElement: (id: string, updates: Partial<OpticalElement>) => void;
  selectElement: (id: string | null) => void;
  setMode: (mode: 'free' | 'guided') => void;
  setGuidedExperiment: (exp: GuidedExperiment) => void;
  setGuidedStep: (step: number) => void;
  advanceGuidedStep: () => void;
  previousGuidedStep: () => void;
  toggleBottomPanel: () => void;
  setShowEfield: (v: boolean) => void;
  setShowEllipse: (v: boolean) => void;
  setShowIntensityCurve: (v: boolean) => void;
  setShowJones: (v: boolean) => void;
  setShowStokes: (v: boolean) => void;
  setNoiseLevel: (v: number) => void;
  recordDataPoint: () => void;
  clearDataPoints: () => void;
  autoCollect: () => void;
  resetAll: () => void;
}

// ============================================================
// Per-experiment default element configurations
// ============================================================

const EXPERIMENT_DEFAULTS: Record<string, OpticalElement[]> = {
  'exp-linear': [
    { id: 'el-1', type: 'laser', label: '激光器\n632.8nm', position: 0.08, angle: 0 },
    { id: 'el-2', type: 'polarizer', label: '起偏器 P', position: 0.26, angle: 0 },
    { id: 'el-3', type: 'analyzer', label: '检偏器 A', position: 0.60, angle: 45 },
    { id: 'el-4', type: 'detector', label: '光强探测器', position: 0.86, angle: 0 },
  ],
  'exp-malus': [
    { id: 'el-1', type: 'laser', label: '激光器\n632.8nm', position: 0.08, angle: 0 },
    { id: 'el-2', type: 'polarizer', label: '起偏器 P', position: 0.26, angle: 0 },
    { id: 'el-3', type: 'analyzer', label: '检偏器 A', position: 0.60, angle: 0 },
    { id: 'el-4', type: 'detector', label: '光强探测器', position: 0.86, angle: 0 },
  ],
  'exp-waveplate': [
    { id: 'el-1', type: 'laser', label: '激光器\n632.8nm', position: 0.06, angle: 0 },
    { id: 'el-2', type: 'polarizer', label: '起偏器 P', position: 0.22, angle: 0 },
    { id: 'el-3', type: 'waveplate', label: 'λ/4 波片', position: 0.42, angle: 45, phaseRetardation: Math.PI / 2, waveplateType: 'qwp' },
    { id: 'el-4', type: 'analyzer', label: '检偏器 A', position: 0.66, angle: 0 },
    { id: 'el-5', type: 'detector', label: '光强探测器', position: 0.88, angle: 0 },
  ],
  'exp-photoelastic': [
    { id: 'el-1', type: 'laser', label: '激光器\n白光', position: 0.06, angle: 0 },
    { id: 'el-2', type: 'polarizer', label: '起偏器 P', position: 0.22, angle: 0 },
    { id: 'el-3', type: 'sample', label: '应力样品', position: 0.42, angle: 0 },
    { id: 'el-4', type: 'analyzer', label: '检偏器 A', position: 0.66, angle: 90 },
    { id: 'el-5', type: 'detector', label: '光强探测器', position: 0.88, angle: 0 },
  ],
};

// ============================================================
// Store
// ============================================================

export const useSimulationStore = create<SimulationState>((set, get) => ({
  elements: EXPERIMENT_DEFAULTS['exp-malus'],
  selectedElementId: 'el-3',
  nextElementId: 5,
  sourceIntensity: 1.0,
  sourceWavelength: 632.8,

  showEfieldVectors: true,
  showPolarizationEllipse: false,
  showIntensityCurve: true,
  showJonesMatrix: false,
  showStokesParams: false,

  activeExperiment: null,

  mode: 'free',
  guidedExperiment: 'malus-law',
  guidedStep: 0,
  bottomPanelOpen: true,

  dataPoints: [],
  noiseLevel: 0,

  beamColor: '#ffd451',

  // --- Actions ---
  setActiveExperiment: (id) => {
    const guideMap: Record<string, GuidedExperiment> = {
      'exp-linear': 'linear-polarization',
      'exp-malus': 'malus-law',
      'exp-waveplate': 'waveplate',
      'exp-photoelastic': 'photoelastic',
    };
    const guidedExp = id ? (guideMap[id] ?? null) : null;
    // Load experiment-specific default elements
    const defaultEls = id ? (EXPERIMENT_DEFAULTS[id] || EXPERIMENT_DEFAULTS['exp-malus']) : EXPERIMENT_DEFAULTS['exp-malus'];
    set({
      activeExperiment: id,
      elements: [...defaultEls.map(el => ({ ...el }))],
      selectedElementId: defaultEls[2]?.id || null,
      nextElementId: Math.max(...defaultEls.map(el => parseInt(el.id.split('-')[1]))) + 1,
      guidedExperiment: guidedExp,
      guidedStep: 0,
      mode: id ? 'guided' : 'free',
      dataPoints: [],
      bottomPanelOpen: true,
    });
  },

  addElement: (type, extra) => {
    const state = get();
    const labels: Record<string, string> = {
      laser: '激光器',
      polarizer: '偏振片',
      analyzer: '检偏器',
      waveplate: '波片',
      prism: '三棱镜',
      sample: '应力样品',
      detector: '光强探测器',
    };
    const id = `el-${state.nextElementId}`;
    const pos = 0.2 + (state.elements.length - 1) * 0.15;
    // Waveplate defaults
    let waveplateType = extra?.waveplateType ?? 'qwp';
    let phaseRet: number | undefined = undefined;
    if (type === 'waveplate') {
      phaseRet = extra?.phaseRetardation ?? Math.PI / 2;
      const wlLabels: Record<string, string> = { qwp: 'λ/4 波片', hwp: 'λ/2 波片', fwp: 'λ 波片' };
      labels.waveplate = wlLabels[waveplateType] || '波片';
    }
    set({
      elements: [...state.elements, {
        id,
        type,
        label: labels[type] || type,
        position: Math.min(0.85, pos),
        angle: extra?.angle ?? 0,
        phaseRetardation: type === 'waveplate' ? phaseRet : undefined,
        waveplateType: type === 'waveplate' ? waveplateType : undefined,
        refractiveIndex: type === 'prism' ? 1.5 : undefined,
        transmittance: 1,
      }],
      nextElementId: state.nextElementId + 1,
      selectedElementId: id,
    });
  },

  removeElement: (id) => {
    const state = get();
    set({
      elements: state.elements.filter(el => el.id !== id),
      selectedElementId: state.selectedElementId === id ? null : state.selectedElementId,
    });
  },

  updateElement: (id, updates) => {
    set(state => ({
      elements: state.elements.map(el =>
        el.id === id ? { ...el, ...updates } : el
      ),
    }));
  },

  selectElement: (id) => set({ selectedElementId: id }),

  setMode: (mode) => set({ mode }),

  setGuidedExperiment: (exp) => set({ guidedExperiment: exp, guidedStep: 0 }),

  setGuidedStep: (step) => set({ guidedStep: step }),

  advanceGuidedStep: () => {
    const { guidedExperiment, guidedStep } = get();
    if (!guidedExperiment) return;
    const steps = GUIDED_STEPS[guidedExperiment] || [];
    if (guidedStep < steps.length - 1) {
      const next = guidedStep + 1;
      set({ guidedStep: next });
      // Auto-set element angle if target specified
      const step = steps[next];
      if (step.targetAngle !== undefined) {
        const analyzer = get().elements.find(el => el.type === 'analyzer');
        if (analyzer) {
          get().updateElement(analyzer.id, { angle: step.targetAngle });
        }
      }
    }
  },

  previousGuidedStep: () => {
    const { guidedStep } = get();
    if (guidedStep > 0) {
      set({ guidedStep: guidedStep - 1 });
    }
  },

  toggleBottomPanel: () => set(s => ({ bottomPanelOpen: !s.bottomPanelOpen })),

  setShowEfield: (v) => set({ showEfieldVectors: v }),
  setShowEllipse: (v) => set({ showPolarizationEllipse: v }),
  setShowIntensityCurve: (v) => set({ showIntensityCurve: v }),
  setShowJones: (v) => set({ showJonesMatrix: v }),
  setShowStokes: (v) => set({ showStokesParams: v }),
  setNoiseLevel: (v) => set({ noiseLevel: v }),

  recordDataPoint: () => {
    const { elements, dataPoints, noiseLevel } = get();
    const analyzer = elements.find(el => el.type === 'analyzer');
    if (!analyzer) return;
    const angle = analyzer.angle;
    const theory = malusIntensity(1.0, angle);
    const totalNoise = Math.sqrt(0.012 * 0.012 + noiseLevel * noiseLevel);
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const noise = totalNoise * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    const measured = Math.max(0, Math.min(1, theory + noise));
    const exists = dataPoints.find(p => Math.abs(p.angle - angle) < 0.5);
    if (!exists) {
      const newPoints = [...dataPoints, { angle, intensity: Math.round(measured * 1000) / 1000, theory: Math.round(theory * 1000) / 1000 }];
      newPoints.sort((a, b) => a.angle - b.angle);
      set({ dataPoints: newPoints });
    }
  },

  clearDataPoints: () => set({ dataPoints: [] }),

  autoCollect: () => {
    const { elements, noiseLevel } = get();
    const analyzer = elements.find(el => el.type === 'analyzer');
    if (!analyzer) return;
    set({ dataPoints: [] });
    // Collect all angles 0..180 step 5
    const angles = Array.from({ length: 37 }, (_, i) => i * 5);
    const points: DataPoint[] = angles.map(a => {
      const theory = malusIntensity(1.0, a);
      const totalNoise = Math.sqrt(0.012 * 0.012 + noiseLevel * noiseLevel);
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      const noise = totalNoise * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      const measured = Math.max(0, Math.min(1, theory + noise));
      return { angle: a, intensity: Math.round(measured * 1000) / 1000, theory: Math.round(theory * 1000) / 1000 };
    });
    set({ dataPoints: points });
  },

  resetAll: () => {
    const state = get();
    const defaults = EXPERIMENT_DEFAULTS[state.activeExperiment || 'exp-malus'] || EXPERIMENT_DEFAULTS['exp-malus'];
    set({
      elements: defaults.map(el => ({ ...el })),
      selectedElementId: defaults[2]?.id || null,
      dataPoints: [],
      noiseLevel: 0,
      bottomPanelOpen: true,
    });
  },
}));
