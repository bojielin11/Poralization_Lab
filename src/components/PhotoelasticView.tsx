import { BookOpen, MousePointerClick, MousePointer2, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { usePhotoelasticStore } from '../store/photoelasticStore';
import { PhotoelasticCanvas } from './PhotoelasticCanvas';
import { PhotoelasticParams } from './PhotoelasticParams';

// ============================================================
// Knowledge panel (left sidebar)
// ============================================================
function KnowledgePanel() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 min-h-[40px] px-4 border-b border-lab-border flex-shrink-0"
        style={{ background: '#eee9dd' }}
      >
        <BookOpen size={14} className="text-lab-accent" />
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-lab-text-muted">实验原理</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Principle */}
        <div>
          <h4 className="text-xs font-bold text-lab-text-primary mb-1.5">光弹效应</h4>
          <p className="text-2xs text-lab-text-secondary leading-relaxed">
            透明材料受力后产生各向异性双折射——两个主应力方向的折射率不同。
            正交偏振片将不可见的应力差异转变为彩色干涉条纹（等差线），
            条纹颜色对应 Michel-Lévy 干涉色序。
          </p>
        </div>

        {/* Formula */}
        <div className="rounded-lg p-3 border border-lab-border/40"
          style={{ background: 'rgba(217,119,87,0.04)' }}
        >
          <div className="text-2xs font-bold text-lab-accent mb-1.5 font-mono">
            Δn = C·(σ₁−σ₂)
          </div>
          <div className="text-2xs font-bold text-lab-accent mb-1.5 font-mono">
            δ = 2π·Δn·d / λ
          </div>
          <div className="text-2xs text-lab-text-muted leading-relaxed">
            C 为应力光学系数，d 为材料厚度，λ 为波长
          </div>
        </div>

        {/* Interference */}
        <div>
          <h4 className="text-xs font-bold text-lab-text-primary mb-1.5">干涉成像</h4>
          <p className="text-2xs text-lab-text-secondary leading-relaxed">
            光源 → 起偏器 → 受力样品 → 检偏器 → 观测。
            暗场设置下，光强 I ∝ sin²(δ/2)·sin²(2φ)，
            主应力差相同的点形成同色等差线。
          </p>
        </div>

        {/* Operation hints */}
        <div>
          <h4 className="text-xs font-bold text-lab-text-primary mb-2">操作提示</h4>
          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <MousePointerClick size={13} className="text-lab-accent mt-0.5 flex-shrink-0" />
              <span className="text-2xs text-lab-text-secondary leading-relaxed">
                点击条纹图的空白处添加力点（最多 3 个）
              </span>
            </div>
            <div className="flex items-start gap-2">
              <MousePointer2 size={13} className="text-lab-accent mt-0.5 flex-shrink-0" />
              <span className="text-2xs text-lab-text-secondary leading-relaxed">
                拖拽力点改变施力位置
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Trash2 size={13} className="text-lab-accent mt-0.5 flex-shrink-0" />
              <span className="text-2xs text-lab-text-secondary leading-relaxed">
                右键力点删除；点击已有力点选中
              </span>
            </div>
          </div>
        </div>

        {/* Engineering context */}
        <div>
          <h4 className="text-xs font-bold text-lab-text-primary mb-1.5">工程应用</h4>
          <p className="text-2xs text-lab-text-secondary leading-relaxed">
            光弹法广泛用于分析桥梁构件、机械零件、光学元件内部的应力分布，
            是实验力学与材料科学中重要的无损检测手段。
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PhotoelasticView — main layout
// ============================================================
export function PhotoelasticView() {
  // Reset photoelastic state to defaults on mount
  useEffect(() => {
    usePhotoelasticStore.getState().resetAll();
  }, []);

  return (
    <div className="flex-1 flex overflow-hidden min-h-0">
      {/* Left: knowledge panel */}
      <aside className="w-[240px] flex-shrink-0 border-r border-lab-border hidden lg:flex flex-col">
        <KnowledgePanel />
      </aside>

      {/* Center: stress canvas */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <PhotoelasticCanvas />
      </main>

      {/* Right: parameter panel */}
      <aside className="w-[320px] flex-shrink-0 border-l border-lab-border hidden xl:flex flex-col">
        <PhotoelasticParams />
      </aside>
    </div>
  );
}
