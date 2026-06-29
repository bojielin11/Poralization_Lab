import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp, ChevronDown, Activity, PlayCircle, Trash2 } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ScatterChart, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { useSimulationStore } from '../store/simulationStore';
import { malusIntensity, angleBetween } from '../physics/core';

// ============================================================
// Malus I-θ Curve (for 线偏振 + 马吕斯)
// ============================================================
function MalusCurve() {
  const dataPoints = useSimulationStore(s => s.dataPoints);
  const elements = useSimulationStore(s => s.elements);
  const analyzer = elements.find(el => el.type === 'analyzer');
  const currentAngle = analyzer?.angle ?? 0;

  const chartData = useMemo(() => Array.from({ length: 181 }, (_, i) => ({
    angle: i,
    theory: Math.round(Math.cos(i * Math.PI / 180) ** 2 * 1000) / 1000,
    measured: dataPoints.find(p => p.angle === i)?.intensity ?? null,
  })), [dataPoints]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="angle" type="number" domain={[0, 180]} allowDecimals={false} tickCount={7}
            stroke="#6c7d85" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
            tickFormatter={(v: number) => `${v}°`} />
          <YAxis domain={[0, 1]} tickCount={6}
            stroke="#6c7d85" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
            tickFormatter={(v: number) => v.toFixed(1)} />
          <Tooltip contentStyle={{ backgroundColor: '#10171d', border: '1px solid #243240', borderRadius: 8, fontFamily: 'JetBrains Mono', fontSize: 12, color: '#eaf2f5' }}
            formatter={(v: any, n: string) => v === null ? ['—', n] : [Number(v).toFixed(3), n === 'theory' ? 'cos²θ' : '实测']}
            labelFormatter={(l: number) => `θ = ${l}°`} />
          <Line dataKey="theory" stroke="#46cdd9" strokeWidth={2} dot={false} name="theory" />
          <Line dataKey="measured" stroke="none" name="measured" connectNulls={false}
            dot={{ r: 4, fill: '#ffb74d', fillOpacity: 0.9, stroke: '#4a3520', strokeWidth: 1 }} />
          {/* Current angle marker */}
          <ReferenceLine x={currentAngle} stroke="#fff" strokeWidth={1.5} strokeDasharray="4 2" />
          <ReferenceLine x={90} stroke="rgba(255,255,255,0.06)" strokeDasharray="2 4" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================
// Polar Plot — shows data points on polar coordinates
// ============================================================
function PolarPlot() {
  const dataPoints = useSimulationStore(s => s.dataPoints);
  const elements = useSimulationStore(s => s.elements);
  const analyzer = elements.find(el => el.type === 'analyzer');
  const currentAngle = analyzer?.angle ?? 0;

  // Transform data points to polar format
  const polarDataPoints = useMemo(() => {
    if (dataPoints.length === 0) return [];
    return dataPoints.map(p => ({
      angle: p.angle,
      r: p.intensity,
      label: `${p.angle}°`,
    }));
  }, [dataPoints]);

  // Theory curve in polar coords
  const theoryCurve = useMemo(() => Array.from({ length: 361 }, (_, i) => ({
    angle: i,
    r: Math.cos((i - currentAngle) * Math.PI / 180) ** 2,
  })), [currentAngle]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer>
        <RadarChart data={theoryCurve} cx="50%" cy="50%" outerRadius="80%" startAngle={-90} endAngle={270}>
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis dataKey="angle" tick={false} />
          <PolarRadiusAxis angle={90} domain={[0, 1]} tick={false} axisLine={false} />
          {/* Theory curve */}
          <Radar dataKey="r" stroke="#46cdd9" strokeWidth={1.5} fill="#46cdd9" fillOpacity={0.06} dot={false} />
        </RadarChart>
      </ResponsiveContainer>
      {/* Data points overlay */}
      {polarDataPoints.length > 0 && (
        <div className="absolute inset-0 pointer-events-none">
          <svg width="100%" height="100%" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet">
            {polarDataPoints.map((dp, i) => {
              const rad = (dp.angle - 90) * Math.PI / 180;
              const cx = 100 + Math.cos(rad) * dp.r * 80;
              const cy = 100 + Math.sin(rad) * dp.r * 80;
              return <circle key={i} cx={cx} cy={cy} r={3} fill="#ffb74d" stroke="#4a3520" strokeWidth={0.8} />;
            })}
          </svg>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Malus Data Table (线偏振 + 马吕斯)
// ============================================================
function MalusDataTable() {
  const dataPoints = useSimulationStore(s => s.dataPoints);
  if (dataPoints.length === 0) return <div className="lab-empty py-6 text-2xs">旋转检偏器并点击"记录"采集数据</div>;
  const n = dataPoints.length;
  let sumAbsDev = 0, sumSqDev = 0;
  for (const p of dataPoints) { const d = p.intensity - p.theory; sumAbsDev += Math.abs(d); sumSqDev += d * d; }
  const mae = sumAbsDev / n; const rmse = Math.sqrt(sumSqDev / n);
  const meanT = dataPoints.reduce((s, p) => s + p.theory, 0) / n;
  const ssTot = dataPoints.reduce((s, p) => s + (p.intensity - meanT) ** 2, 0);
  const r2 = ssTot > 1e-10 ? 1 - sumSqDev / ssTot : 1;
  return (
    <>
      <div className="flex flex-wrap gap-2 mb-2">
        <span className="lab-chip">MAE <strong className="text-lab-warning ml-1">{mae.toFixed(4)}</strong></span>
        <span className="lab-chip">RMSE <strong className="text-lab-warning ml-1">{rmse.toFixed(4)}</strong></span>
        <span className="lab-chip">R² <strong className={r2 > 0.95 ? 'text-lab-success ml-1' : 'text-lab-warning ml-1'}>{r2.toFixed(4)}</strong></span>
        <span className="lab-chip text-lab-text-muted">n={n}</span>
      </div>
      <table className="lab-table">
        <thead><tr><th>θ°</th><th>I/I₀ 实测</th><th>cos²θ 理论</th><th>Δ</th></tr></thead>
        <tbody>{dataPoints.map((p, i) => {
          const d = Math.abs(p.intensity - p.theory);
          return <tr key={i}><td>{p.angle}</td><td>{p.intensity.toFixed(3)}</td><td>{p.theory.toFixed(3)}</td>
            <td className={d > 0.05 ? 'text-lab-warning font-semibold' : 'text-lab-success font-semibold'}>{d.toFixed(3)}</td></tr>;
        })}</tbody>
      </table>
    </>
  );
}

// ============================================================
// Waveplate Data Table
// ============================================================
function WaveplateDataTable() {
  const dataPoints = useSimulationStore(s => s.dataPoints);
  if (dataPoints.length === 0) return <div className="lab-empty py-6 text-2xs">旋转检偏器记录各角度光强数据</div>;
  const Imax = Math.max(...dataPoints.map(p => p.intensity));
  const Imin = Math.min(...dataPoints.map(p => p.intensity));
  return (
    <>
      <div className="flex flex-wrap gap-2 mb-2">
        <span className="lab-chip">I_max <strong className="text-lab-accent-hover ml-1">{Imax.toFixed(3)}</strong></span>
        <span className="lab-chip">I_min <strong className="text-lab-warning ml-1">{Imin.toFixed(3)}</strong></span>
        <span className="lab-chip text-lab-text-muted">n={dataPoints.length}</span>
      </div>
      <table className="lab-table">
        <thead><tr><th>θ°</th><th>I/I₀</th><th>偏振态判断</th></tr></thead>
        <tbody>{dataPoints.map((p, i) => {
          const r = Imax > 0 ? p.intensity / Imax : 0;
          const state = r > 0.9 ? '线偏振' : r < 0.05 ? '消光' : Math.abs(r - 0.5) < 0.15 ? '近圆偏振' : '椭圆偏振';
          return <tr key={i}><td>{p.angle}</td><td>{p.intensity.toFixed(3)}</td><td className="text-lab-text-secondary">{state}</td></tr>;
        })}</tbody>
      </table>
    </>
  );
}

// ============================================================
// Photoelastic Data Table
// ============================================================
function PhotoelasticDataTable() {
  return (
    <div className="space-y-3">
      <div className="lab-empty py-4 text-2xs text-lab-text-secondary leading-relaxed">
        光弹效应实验：<br/>
        调整应力观察干涉条纹变化<br/>
        记录应力值与对应条纹级次<br/>
        对照 Michel-Lévy 色标分析
      </div>
      <div className="p-3 rounded-lg bg-lab-bg-inset border border-lab-border/30">
        <div className="text-xs font-semibold text-lab-accent mb-1">应力-光学定律</div>
        <div className="text-2xs text-lab-text-muted leading-relaxed">
          Δn = C · (σ₁ − σ₂)<br/>
          δ = 2π · Δn · d / λ<br/>
          暗场：I ∝ sin²(δ/2) · sin²(2φ)
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main DataPanel — experiment-adaptive
// ============================================================
export function DataPanel() {
  const activeExperiment = useSimulationStore(s => s.activeExperiment);
  const bottomPanelOpen = useSimulationStore(s => s.bottomPanelOpen);
  const toggleBottomPanel = useSimulationStore(s => s.toggleBottomPanel);
  const recordDataPoint = useSimulationStore(s => s.recordDataPoint);
  const clearDataPoints = useSimulationStore(s => s.clearDataPoints);
  const autoCollect = useSimulationStore(s => s.autoCollect);
  const dataPoints = useSimulationStore(s => s.dataPoints);

  // Determine which tabs and table to show based on experiment
  const config = useMemo(() => {
    switch (activeExperiment) {
      case 'exp-linear':
        return { tabs: ['malus'] as const, Table: MalusDataTable, title: '线偏振 · I-θ 曲线' };
      case 'exp-malus':
        return { tabs: ['malus'] as const, Table: MalusDataTable, title: '马吕斯定律 · 数据拟合' };
      case 'exp-waveplate':
        return { tabs: ['polar'] as const, Table: WaveplateDataTable, title: '波片 · 偏振态分布' };
      case 'exp-photoelastic':
        return { tabs: [] as const, Table: PhotoelasticDataTable, title: '光弹效应 · 应力分析' };
      default:
        return { tabs: ['malus'] as const, Table: MalusDataTable, title: '数据分析' };
    }
  }, [activeExperiment]);

  const [activeTab, setActiveTab] = useState<string>(config.tabs[0] || '');

  return (
    <div className="flex-shrink-0 border-t border-lab-border"
      style={{ background: 'rgba(10, 14, 18, 0.95)' }}>
      <button onClick={toggleBottomPanel}
        className="w-full flex items-center gap-2 px-4 h-[36px] border-b border-lab-border hover:bg-lab-bg-hover/30 transition-colors">
        <Activity size={14} className="text-lab-accent" />
        <span className="text-xs font-semibold uppercase tracking-[0.06em] text-lab-text-muted">{config.title}</span>
        <div className="flex-1" />
        <span className="text-2xs text-lab-text-muted mr-2">{dataPoints.length > 0 ? `${dataPoints.length} 点` : '暂无数据'}</span>
        {bottomPanelOpen ? <ChevronUp size={16} className="text-lab-text-muted" /> : <ChevronDown size={16} className="text-lab-text-muted" />}
      </button>

      <AnimatePresence>
        {bottomPanelOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 280, opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }} className="overflow-hidden">
            <div className="flex h-[280px]">
              {/* Chart area */}
              <div className="flex-1 min-w-0 p-3">
                {config.tabs.length > 1 && (
                  <div className="flex items-center gap-1 mb-2">
                    {config.tabs.map(tab => (
                      <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${activeTab === tab ? 'bg-lab-accent-dim/60 text-lab-accent-hover border border-lab-accent/20' : 'text-lab-text-muted hover:text-lab-text-secondary'}`}>
                        {tab === 'malus' ? 'I-θ 曲线' : tab === 'polar' ? '极坐标图' : tab}
                      </button>
                    ))}
                  </div>
                )}
                <div className={config.tabs.length > 1 ? 'h-[calc(100%-40px)]' : 'h-full'}>
                  {config.tabs.length === 0 && (
                    <div className="flex items-center justify-center h-full text-lab-text-muted text-sm">
                      本实验无需曲线图表 — 数据请见右侧
                    </div>
                  )}
                  {activeTab === 'malus' && <MalusCurve />}
                  {activeTab === 'polar' && <PolarPlot />}
                </div>
              </div>

              {/* Data sidebar */}
              <div className="w-[260px] flex-shrink-0 border-l border-lab-border p-3 flex flex-col gap-2 overflow-y-auto">
                <div className="flex gap-1.5">
                  <button onClick={recordDataPoint} className="lab-btn lab-btn-primary lab-btn-sm flex-1">
                    <PlayCircle size={12} /> 记录</button>
                  <button onClick={autoCollect} className="lab-btn lab-btn-sm flex-1">
                    <PlayCircle size={12} /> 自动采集</button>
                  <button onClick={clearDataPoints} className="lab-btn lab-btn-sm" title="清空"><Trash2 size={12} /></button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto"><config.Table /></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
