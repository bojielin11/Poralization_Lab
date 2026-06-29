import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronUp, ChevronDown, Activity, CircleDot, Grid3X3, PlayCircle,
  Trash2, BarChart3
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { useSimulationStore } from '../store/simulationStore';
import { malusIntensity, angleBetween } from '../physics/core';

// ============================================================
// Malus Curve Chart — Recharts 3.x compatible
// ============================================================
function MalusCurve() {
  const dataPoints = useSimulationStore(s => s.dataPoints);
  const elements = useSimulationStore(s => s.elements);
  const analyzer = elements.find(el => el.type === 'analyzer');
  const currentAngle = analyzer?.angle ?? 0;

  const chartData = useMemo(() => {
    return Array.from({ length: 181 }, (_, i) => ({
      angle: i,
      theory: Math.round(Math.cos(i * Math.PI / 180) ** 2 * 1000) / 1000,
      measured: dataPoints.find(p => p.angle === i)?.intensity ?? null,
      current: i === currentAngle ? Math.round(Math.cos(i * Math.PI / 180) ** 2 * 1000) / 1000 : null,
    }));
  }, [dataPoints, currentAngle]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="angle" type="number" domain={[0, 180]} allowDecimals={false}
            tickCount={7} stroke="#6c7d85" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
            tickFormatter={(v: number) => `${v}°`}
          />
          <YAxis domain={[0, 1]} tickCount={6}
            stroke="#6c7d85" tick={{ fontSize: 11, fontFamily: 'JetBrains Mono' }}
            tickFormatter={(v: number) => v.toFixed(1)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#10171d', border: '1px solid #243240', borderRadius: 8,
              fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: '#eaf2f5',
            }}
            formatter={(value: any, name: string) => {
              if (value === null) return ['—', name];
              return [Number(value).toFixed(3), name === 'theory' ? 'cos²θ 理论' : name === 'measured' ? '实测 I/I₀' : name];
            }}
            labelFormatter={(l: number) => `θ = ${l}°`}
          />

          {/* Theory curve */}
          <Line dataKey="theory" stroke="#46cdd9" strokeWidth={2} dot={false} name="theory" connectNulls />

          {/* Measured data points as dots on a line */}
          <Line dataKey="measured" stroke="none" name="measured" connectNulls={false}
            dot={{ r: 4, fill: '#ffb74d', fillOpacity: 0.9, stroke: '#4a3520', strokeWidth: 1 }}
          />

          {/* Current angle marker */}
          <Line dataKey="current" stroke="none" name="current" connectNulls={false}
            dot={{ r: 6, fill: '#fff', fillOpacity: 1, stroke: '#fff', strokeWidth: 2 }}
          />

          <ReferenceLine x={90} stroke="rgba(255,255,255,0.08)" strokeDasharray="2 4" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================
// Polar plot
// ============================================================
function PolarPlot() {
  const elements = useSimulationStore(s => s.elements);
  const analyzer = elements.find(el => el.type === 'analyzer');
  const currentAngle = analyzer?.angle ?? 0;

  const polarData = useMemo(() => {
    return Array.from({ length: 361 }, (_, i) => ({
      angle: i,
      r: Math.cos((i - currentAngle) * Math.PI / 180) ** 2,
    }));
  }, [currentAngle]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer>
        <RadarChart data={polarData} cx="50%" cy="50%" outerRadius="80%"
          startAngle={-90} endAngle={270}
        >
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis dataKey="angle" tick={false} />
          <PolarRadiusAxis angle={90} domain={[0, 1]} tick={false} axisLine={false} />
          <Radar dataKey="r" stroke="#46cdd9" strokeWidth={2} fill="#46cdd9" fillOpacity={0.08} dot={false} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================
// Stokes Parameters
// ============================================================
function StokesDisplay() {
  const elements = useSimulationStore(s => s.elements);
  const analyzer = elements.find(el => el.type === 'analyzer');
  const polarizer = elements.find(el => el.type === 'polarizer');
  const theta = polarizer && analyzer ? angleBetween(polarizer.angle, analyzer.angle) : 0;
  const rad = (theta * Math.PI) / 180;
  const I = Math.cos(rad) ** 2;

  const S0 = I;
  const S1 = I * Math.cos(2 * rad);
  const S2 = I * Math.sin(2 * rad);
  const S3 = 0;

  return (
    <div className="flex flex-col gap-3 h-full justify-center px-4">
      <div className="text-xs font-semibold text-lab-text-secondary mb-1">Stokes 参数 (S₀, S₁, S₂, S₃)</div>
      {[
        { label: 'S₀', value: S0, desc: '总光强', color: '#eaf2f5' },
        { label: 'S₁', value: S1, desc: '水平/垂直偏好', color: S1 >= 0 ? '#46cdd9' : '#ff6f61' },
        { label: 'S₂', value: S2, desc: '+45°/-45° 偏好', color: S2 >= 0 ? '#4ade80' : '#ff6f61' },
        { label: 'S₃', value: S3, desc: '圆偏振分量', color: Math.abs(S3) > 0.01 ? '#fbbf52' : '#6c7d85' },
      ].map(p => (
        <div key={p.label} className="flex items-center gap-3">
          <div className="w-7 text-xs font-bold font-mono text-lab-text-primary">{p.label}</div>
          <div className="flex-1 h-2 bg-lab-bg-inset rounded-full overflow-hidden border border-lab-border/50">
            <motion.div
              className="h-full rounded-full"
              animate={{ width: `${Math.abs(p.value) * 100}%` }}
              style={{ backgroundColor: p.color }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="w-14 text-xs font-mono text-right" style={{ color: p.color }}>
            {p.value.toFixed(3)}
          </div>
        </div>
      ))}
      <div className="mt-2 p-2.5 rounded-lg bg-lab-bg-inset border border-lab-border/30">
        <span className="text-2xs text-lab-text-muted">偏振度 DoP = √(S₁²+S₂²+S₃²)/S₀ = </span>
        <span className="text-sm font-mono font-bold text-lab-accent-hover">
          {S0 > 0.001 ? (Math.sqrt(S1 * S1 + S2 * S2 + S3 * S3) / S0).toFixed(3) : 'N/A'}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// Jones Matrix
// ============================================================
function JonesMatrixDisplay() {
  const elements = useSimulationStore(s => s.elements);
  const analyzer = elements.find(el => el.type === 'analyzer');
  const polarizer = elements.find(el => el.type === 'polarizer');
  const thetaDeg = polarizer && analyzer ? angleBetween(polarizer.angle, analyzer.angle) : 0;
  const rad = (thetaDeg * Math.PI) / 180;
  const I = Math.cos(rad) ** 2;
  const Ex = Math.cos(rad) ** 2;
  const Ey = Math.sin(rad) * Math.cos(rad);

  return (
    <div className="flex flex-col gap-4 h-full justify-center px-4">
      <div>
        <div className="text-xs font-semibold text-lab-text-secondary mb-2">Jones 向量（出射光）</div>
        <div className="flex items-center justify-center gap-8 font-mono">
          <div className="text-center">
            <div className="text-lg text-lab-accent-hover font-bold">{Ex.toFixed(3)}</div>
            <div className="text-2xs text-lab-text-muted mt-1">Eₓ</div>
          </div>
          <div className="text-lg text-lab-text-muted">[</div>
          <div className="text-center">
            <div className="text-lg text-lab-accent-hover font-bold">{Ey.toFixed(3)}</div>
            <div className="text-2xs text-lab-text-muted mt-1">E_y</div>
          </div>
          <div className="text-lg text-lab-text-muted">]</div>
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold text-lab-text-secondary mb-2">检偏器 Jones 矩阵 (θ={thetaDeg}°)</div>
        <div className="flex items-center justify-center font-mono text-sm">
          <div className="p-2.5 rounded-lg bg-lab-bg-inset border border-lab-border/30 text-lab-text-secondary leading-relaxed">
            <div>[ cos²θ,  sinθ·cosθ ]</div>
            <div>[ sinθ·cosθ,  sin²θ  ]</div>
          </div>
        </div>
        <div className="mt-1.5 text-2xs text-lab-text-muted text-center">
          I = |E|² = {I.toFixed(3)} I₀
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Error stats
// ============================================================
function ErrorStats() {
  const dataPoints = useSimulationStore(s => s.dataPoints);
  if (dataPoints.length === 0) return null;

  const n = dataPoints.length;
  let sumAbsDev = 0, sumSqDev = 0;
  for (const p of dataPoints) {
    const dev = p.intensity - p.theory;
    sumAbsDev += Math.abs(dev);
    sumSqDev += dev * dev;
  }
  const mae = sumAbsDev / n;
  const rmse = Math.sqrt(sumSqDev / n);
  const ssRes = sumSqDev;
  const meanTheory = dataPoints.reduce((s, p) => s + p.theory, 0) / n;
  const ssTot = dataPoints.reduce((s, p) => s + (p.intensity - meanTheory) ** 2, 0);
  const r2 = ssTot > 1e-10 ? 1 - ssRes / ssTot : 1;

  return (
    <div className="flex flex-wrap gap-2">
      <span className="lab-chip">MAE <strong className="text-lab-warning ml-1">{mae.toFixed(4)}</strong></span>
      <span className="lab-chip">RMSE <strong className="text-lab-warning ml-1">{rmse.toFixed(4)}</strong></span>
      <span className="lab-chip">R² <strong className={r2 > 0.95 ? 'text-lab-success ml-1' : 'text-lab-warning ml-1'}>{r2.toFixed(4)}</strong></span>
      <span className="lab-chip text-lab-text-muted">n = {n}</span>
    </div>
  );
}

// ============================================================
// Main DataPanel
// ============================================================
export function DataPanel() {
  const [activeTab, setActiveTab] = useState<'malus' | 'polar' | 'stokes' | 'jones'>('malus');
  const bottomPanelOpen = useSimulationStore(s => s.bottomPanelOpen);
  const toggleBottomPanel = useSimulationStore(s => s.toggleBottomPanel);
  const recordDataPoint = useSimulationStore(s => s.recordDataPoint);
  const clearDataPoints = useSimulationStore(s => s.clearDataPoints);
  const autoCollect = useSimulationStore(s => s.autoCollect);
  const dataPoints = useSimulationStore(s => s.dataPoints);

  const tabs = [
    { key: 'malus' as const, label: '马吕斯曲线', icon: <Activity size={14} /> },
    { key: 'polar' as const, label: '极坐标图', icon: <CircleDot size={14} /> },
    { key: 'stokes' as const, label: 'Stokes 参数', icon: <Grid3X3 size={14} /> },
    { key: 'jones' as const, label: 'Jones 矩阵', icon: <BarChart3 size={14} /> },
  ];

  return (
    <div className="flex-shrink-0 border-t border-lab-border"
      style={{ background: 'rgba(10, 14, 18, 0.95)' }}
    >
      <button
        onClick={toggleBottomPanel}
        className="w-full flex items-center gap-2 px-4 h-[36px] border-b border-lab-border hover:bg-lab-bg-hover/30 transition-colors"
      >
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-lab-text-muted">
          <Activity size={14} className="text-lab-accent" />
          数据分析面板
        </div>
        <div className="flex-1" />
        <span className="text-2xs text-lab-text-muted mr-2">
          {dataPoints.length > 0 ? `${dataPoints.length} 个数据点` : '暂无数据'}
        </span>
        {bottomPanelOpen ? <ChevronDown size={16} className="text-lab-text-muted" /> : <ChevronUp size={16} className="text-lab-text-muted" />}
      </button>

      <AnimatePresence>
        {bottomPanelOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 280, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="flex h-[280px]">
              <div className="flex-1 min-w-0 p-3">
                <div className="flex items-center gap-1 mb-2">
                  {tabs.map(tab => (
                    <button key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors
                        ${activeTab === tab.key
                          ? 'bg-lab-accent-dim/60 text-lab-accent-hover border border-lab-accent/20'
                          : 'text-lab-text-muted hover:text-lab-text-secondary'
                        }`}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="h-[calc(100%-40px)]">
                  {activeTab === 'malus' && <MalusCurve />}
                  {activeTab === 'polar' && <PolarPlot />}
                  {activeTab === 'stokes' && <StokesDisplay />}
                  {activeTab === 'jones' && <JonesMatrixDisplay />}
                </div>
              </div>

              <div className="w-[260px] flex-shrink-0 border-l border-lab-border p-3 flex flex-col gap-2 overflow-y-auto">
                <div className="flex gap-1.5">
                  <button onClick={recordDataPoint} className="lab-btn lab-btn-primary lab-btn-sm flex-1">
                    <PlayCircle size={12} /> 记录
                  </button>
                  <button onClick={autoCollect} className="lab-btn lab-btn-sm flex-1">
                    <PlayCircle size={12} /> 自动采集
                  </button>
                  <button onClick={clearDataPoints} className="lab-btn lab-btn-sm" title="清空数据">
                    <Trash2 size={12} />
                  </button>
                </div>

                <ErrorStats />

                <div className="flex-1 min-h-0 overflow-y-auto">
                  {dataPoints.length === 0 ? (
                    <div className="lab-empty py-6 text-2xs">点击"记录"或"自动采集"开始收集数据</div>
                  ) : (
                    <table className="lab-table">
                      <thead>
                        <tr>
                          <th>θ°</th>
                          <th>I/I₀</th>
                          <th>cos²θ</th>
                          <th>Δ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dataPoints.map((p, i) => (
                          <tr key={i}>
                            <td>{p.angle}</td>
                            <td>{p.intensity.toFixed(3)}</td>
                            <td>{p.theory.toFixed(3)}</td>
                            <td className={Math.abs(p.intensity - p.theory) > 0.05 ? 'text-lab-warning font-semibold' : 'text-lab-success font-semibold'}>
                              {(p.intensity - p.theory).toFixed(3)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
