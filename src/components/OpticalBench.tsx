import { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSimulationStore, waveplateIntensity } from '../store/simulationStore';
import { malusIntensity, degToRad, angleBetween } from '../physics/core';

function useSimulationResults() {
  const elements = useSimulationStore(s => s.elements);
  const analyzer = elements.find(el => el.type === 'analyzer');
  const polarizer = elements.find(el => el.type === 'polarizer');
  const waveplate = elements.find(el => el.type === 'waveplate');
  const analyzerAngle = analyzer?.angle ?? 0;
  const polarizerAngle = polarizer?.angle ?? 0;
  const theta = angleBetween(polarizerAngle, analyzerAngle);

  let intensity: number;
  if (analyzer && polarizer) {
    if (waveplate) {
      intensity = waveplateIntensity(polarizerAngle, waveplate.angle, waveplate.phaseRetardation ?? Math.PI / 2, analyzerAngle);
    } else {
      intensity = malusIntensity(1.0, theta);
    }
  } else {
    intensity = 1.0;
  }

  return { intensity, analyzerAngle, polarizerAngle, theta };
}

export function OpticalBench() {
  const svgRef = useRef<SVGSVGElement>(null);
  const elements = useSimulationStore(s => s.elements);
  const selectedElementId = useSimulationStore(s => s.selectedElementId);
  const selectElement = useSimulationStore(s => s.selectElement);
  const removeElement = useSimulationStore(s => s.removeElement);
  const updateElement = useSimulationStore(s => s.updateElement);
  const showEfield = useSimulationStore(s => s.showEfieldVectors);
  const showEllipse = useSimulationStore(s => s.showPolarizationEllipse);
  const { intensity, analyzerAngle } = useSimulationResults();

  const W = 900; const H = 420;
  const benchY = H * 0.55;

  // --- Drag state ---
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStartX = useRef(0);
  const dragStartPos = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent, elId: string, currentPos: number) => {
    // Don't drag if clicking delete button area
    if ((e.target as SVGElement).closest('.del-btn')) return;
    e.stopPropagation();
    setDraggingId(elId);
    dragStartX.current = e.clientX;
    dragStartPos.current = currentPos;
    selectElement(elId);
  }, [selectElement]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingId || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragStartX.current) / rect.width;
    const newPos = Math.max(0.03, Math.min(0.95, dragStartPos.current + dx));
    updateElement(draggingId, { position: Math.round(newPos * 1000) / 1000 });
  }, [draggingId, updateElement]);

  const handleMouseUp = useCallback(() => {
    setDraggingId(null);
  }, []);

  useEffect(() => {
    if (!draggingId) return;
    const handleUp = () => setDraggingId(null);
    window.addEventListener('mouseup', handleUp);
    return () => window.removeEventListener('mouseup', handleUp);
  }, [draggingId]);

  const beamSegments = useMemo(() => {
    const sorted = [...elements].sort((a, b) => a.position - b.position);
    const segments: { x1: number; y1: number; x2: number; y2: number; intensity: number }[] = [];
    let currentIntensity = 1.0;
    let currentPolAngle = 0;
    let currentWpAngle = 0;
    let currentWpDelta = 0;
    let hasWaveplate = false;
    for (let i = 0; i < sorted.length - 1; i++) {
      const el = sorted[i];
      const next = sorted[i + 1];
      if (el.type === 'polarizer') {
        currentPolAngle = el.angle;
        currentIntensity = 1.0;
        hasWaveplate = false;
      } else if (el.type === 'waveplate') {
        currentWpAngle = el.angle;
        currentWpDelta = el.phaseRetardation ?? Math.PI / 2;
        hasWaveplate = true;
      } else if (el.type === 'analyzer') {
        if (hasWaveplate) {
          currentIntensity = waveplateIntensity(currentPolAngle, currentWpAngle, currentWpDelta, el.angle);
        } else {
          currentIntensity = malusIntensity(1.0, angleBetween(currentPolAngle, el.angle));
        }
      }
      segments.push({ x1: el.position * W, y1: benchY, x2: next.position * W, y2: benchY, intensity: currentIntensity });
    }
    return segments;
  }, [elements]);

  const polarizerElements = elements.filter(el => el.type === 'polarizer' || el.type === 'analyzer');

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className="flex items-center gap-2 min-h-[42px] px-4 border-b border-lab-border flex-shrink-0"
        style={{ background: '#eee9dd' }}
      >
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-lab-text-muted">光路示意</span>
        <span className="text-2xs text-lab-text-muted ml-2">拖拽元件调整位置</span>
        <div className="flex-1" />
        <span className="text-2xs text-lab-text-muted">透射光强</span>
        <span className="text-sm font-bold font-mono text-lab-accent-hover">{intensity.toFixed(3)}</span>
        <span className="text-2xs text-lab-text-muted font-mono">I / I₀</span>
        <div className="w-24 h-1.5 rounded-full bg-lab-bg-inset border border-lab-border overflow-hidden ml-2">
          <motion.div className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #c0613f, #d97757)' }}
            animate={{ width: `${intensity * 100}%` }} transition={{ duration: 0.2 }}
          />
        </div>
        <span className="text-2xs font-mono text-lab-text-muted ml-2 w-10 text-right">{(intensity * 100).toFixed(0)}%</span>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden relative"
        style={{ backgroundSize: '24px 24px', backgroundColor: '#fbf9f3',
          backgroundImage: 'linear-gradient(rgba(20,20,19,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(20,20,19,0.05) 1px, transparent 1px)',
          boxShadow: 'inset 0 0 0 1px #ded8ca, inset 0 2px 10px rgba(20,20,19,0.05)'
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          style={{ cursor: draggingId ? 'grabbing' : undefined }}
        >
          <defs>
            <style>{'.elem-g{cursor:grab}.elem-g:active{cursor:grabbing}.del-btn{opacity:0;transition:opacity .15s ease}.elem-g:hover .del-btn,.elem-g.is-sel .del-btn{opacity:1}'}</style>
            <filter id="laser-blur"><feGaussianBlur stdDeviation="4" /></filter>
            <filter id="beam-glow"><feGaussianBlur stdDeviation="8" /></filter>
            <filter id="selected-glow"><feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#d97757" floodOpacity="0.28" /></filter>
            <radialGradient id="laser-glow">
              <stop offset="0%" stopColor="#fbeae3" /><stop offset="50%" stopColor="#d6452f" /><stop offset="100%" stopColor="rgba(214,69,47,0.15)" />
            </radialGradient>
            {polarizerElements.map(el => {
              const ex = el.position * W;
              return (
                <g key={el.id}>
                  <linearGradient id={`pol-grad-${el.id}`}>
                    <stop offset="0%" stopColor="rgba(141,151,163,0.30)" />
                    <stop offset="100%" stopColor="rgba(141,151,163,0.12)" />
                  </linearGradient>
                  <clipPath id={`pol-clip-${el.id}`}>
                    <circle cx={ex} cy={benchY} r={23} />
                  </clipPath>
                </g>
              );
            })}
          </defs>

          {/* Optical axis baseline + ruler ticks */}
          <line x1={W * 0.04} y1={benchY} x2={W * 0.96} y2={benchY}
            stroke="rgba(20,20,19,0.18)" strokeWidth={1} />
          {Array.from({ length: 19 }, (_, i) => {
            const tx = W * (0.05 + i * 0.05);
            const major = i % 2 === 0;
            return <line key={i} x1={tx} y1={benchY} x2={tx} y2={benchY + (major ? 6 : 3)}
              stroke="rgba(20,20,19,0.16)" strokeWidth={1} />;
          })}

          {/* Beam segments */}
          {beamSegments.map((seg, i) => (
            <g key={i}>
              <line x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
                stroke={`rgba(214,69,47,${seg.intensity * 0.10})`} strokeWidth={14} strokeLinecap="round" />
              <line x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
                stroke={`rgba(214,69,47,${seg.intensity * 0.28})`} strokeWidth={6} strokeLinecap="round" />
              <line x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
                stroke={`rgba(214,69,47,${Math.min(1, seg.intensity * 0.85 + 0.1)})`} strokeWidth={2.2} />
            </g>
          ))}

          {/* Elements */}
          {elements.map(el => {
            const x = el.position * W;
            const y = benchY;
            const isSelected = el.id === selectedElementId;
            const R = 24;

            return (
              <g key={el.id} className={`elem-g${isSelected ? ' is-sel' : ''}`}
                onMouseDown={(e) => handleMouseDown(e, el.id, el.position)}
                style={{ cursor: draggingId === el.id ? 'grabbing' : 'grab' }}
              >
                {el.type === 'laser' && <LaserVis x={x} y={y} r={14} />}

                {(el.type === 'polarizer' || el.type === 'analyzer') && (
                  <PolarizerVis el={el} x={x} y={y} r={R} isSelected={isSelected} />
                )}

                {el.type === 'waveplate' && (
                  <WavePlateVis x={x} y={y} r={R * 0.85} el={el} />
                )}

                {el.type === 'sample' && <SampleVis x={x} y={y} r={R * 0.9} />}
                {el.type === 'detector' && <DetectorVis x={x} y={y} intensity={intensity} />}

                {showEfield && (el.type === 'polarizer' || el.type === 'analyzer') && (
                  <EfieldIndicator x={x} y={y} angle={el.angle}
                    intensity={el.type === 'analyzer' ? intensity : 1.0} isAnalyzer={el.type === 'analyzer'} />
                )}

                <LabelPill x={x} y={y} el={el} />

                {/* Delete button — large × on label pill, always clickable */}
                <g className="del-btn" onClick={(e: any) => { e.stopPropagation(); removeElement(el.id); }}
                  style={{ cursor: 'pointer' }}
                >
                  <circle cx={x + 35} cy={y + 48} r={12} fill="rgba(176,74,58,0.12)" stroke="#b04a3a" strokeWidth={1.8} />
                  <line x1={x + 30} y1={y + 43} x2={x + 40} y2={y + 53} stroke="#b04a3a" strokeWidth={2.2} strokeLinecap="round" />
                  <line x1={x + 40} y1={y + 43} x2={x + 30} y2={y + 53} stroke="#b04a3a" strokeWidth={2.2} strokeLinecap="round" />
                  <title>点击删除</title>
                </g>
              </g>
            );
          })}

          {showEllipse && (
            <PolarizationEllipseViz x={W * 0.78} y={benchY} analyzerAngle={analyzerAngle} intensity={intensity} />
          )}
        </svg>
      </div>
    </div>
  );
}

// ===== Drawing Components =====

function LaserVis({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <line key={i} x1={x + Math.cos(a) * (r + 3)} y1={y + Math.sin(a) * (r + 3)}
          x2={x + Math.cos(a) * (r + 10)} y2={y + Math.sin(a) * (r + 10)}
          stroke="rgba(214,69,47,0.32)" strokeWidth={1.2} strokeLinecap="round" />;
      })}
      <motion.circle cx={x} cy={y} r={r} fill="url(#laser-glow)" filter="url(#laser-blur)"
        animate={{ opacity: [0.75, 1, 0.75] }} transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }} />
      <circle cx={x} cy={y} r={r - 1} fill="url(#laser-glow)" />
    </g>
  );
}

function PolarizerVis({ el, x, y, r, isSelected }: {
  el: { id: string; angle: number; type: string }; x: number; y: number; r: number; isSelected: boolean;
}) {
  const ang = degToRad(el.angle);
  const dx = Math.cos(ang); const dy = -Math.sin(ang);
  const ndx = -dy; const ndy = dx;
  const isAnalyzer = el.type === 'analyzer';
  const accentColor = isAnalyzer ? '#d97757' : '#8d97a3';

  return (
    <g filter={isSelected ? 'url(#selected-glow)' : undefined}>
      <circle cx={x} cy={y} r={r + 4} fill="#f2efe7" stroke="#c9c2b1" strokeWidth={1.2} />
      {isSelected && <circle cx={x} cy={y} r={r + 6} fill="none" stroke="#d97757" strokeWidth={2} strokeDasharray="3 3" opacity={0.8} />}
      <circle cx={x} cy={y} r={r} fill={`url(#pol-grad-${el.id})`} />
      <g clipPath={`url(#pol-clip-${el.id})`}>
        {Array.from({ length: Math.floor(r * 2 / 3.2) }, (_, i) => {
          const t = -r + i * 3.2;
          return <line key={i} x1={x + ndx * t - dx * r} y1={y + ndy * t - dy * r}
            x2={x + ndx * t + dx * r} y2={y + ndy * t + dy * r}
            stroke="rgba(141,151,163,0.24)" strokeWidth={0.7} />;
        })}
      </g>
      <line x1={x - dx * (r - 3)} y1={y - dy * (r - 3)} x2={x + dx * (r - 3)} y2={y + dy * (r - 3)}
        stroke={accentColor} strokeWidth={isAnalyzer ? 2.8 : 2.2} strokeLinecap="round"
        style={{ filter: isAnalyzer ? 'drop-shadow(0 0 4px rgba(217,119,87,0.45))' : undefined }} />
      <circle cx={x} cy={y} r={2.2} fill="#5f5c55" />
    </g>
  );
}

function WavePlateVis({ x, y, r, el }: { x: number; y: number; r: number; el: { angle: number; waveplateType?: string } }) {
  const ang = degToRad(el.angle);
  const dx = Math.cos(ang); const dy = -Math.sin(ang);
  const wType = el.waveplateType || 'qwp';
  const color = wType === 'hwp' ? '#5e8c5e' : wType === 'fwp' ? '#6f8197' : '#c08a3e';
  return (
    <g>
      <rect x={x - r} y={y - r * 1.5} width={r * 2} height={r * 3} rx={8}
        fill={`${color}14`} stroke={color} strokeWidth={1.5} strokeOpacity={0.7} />
      <rect x={x - r + 4} y={y - r * 1.5 + 4} width={r * 2 - 8} height={r * 3 - 8} rx={4}
        fill="none" stroke={`${color}30`} strokeWidth={0.6} strokeDasharray="4 4" />
      <line x1={x - dx * r} y1={y - dy * r} x2={x + dx * r} y2={y + dy * r}
        stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.9} strokeDasharray="5 3" />
      <line x1={x + dy * r} y1={y - dx * r} x2={x - dy * r} y2={y + dx * r}
        stroke={color} strokeWidth={1} strokeLinecap="round" opacity={0.3} strokeDasharray="3 4" />
      <text x={x + dx * (r + 8)} y={y + dy * (r + 8)} fill={color} fontSize={9} fontWeight={700}
        fontFamily="JetBrains Mono, monospace" textAnchor="middle" dominantBaseline="central">F</text>
      <text x={x - dy * (r + 8)} y={y + dx * (r + 8)} fill={color} fontSize={9} fontWeight={500}
        fontFamily="JetBrains Mono, monospace" textAnchor="middle" dominantBaseline="central" opacity={0.5}>S</text>
    </g>
  );
}

function michelLevyColor(phase: number): string {
  // Simplified Michel-Lévy interference color mapping
  // phase in radians, normalized to 0..~12π (multiple orders)
  const delta = ((phase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const dNorm = delta / (2 * Math.PI);
  // Map to approximate interference colors
  const r = Math.sin(dNorm * Math.PI * 3) * 0.5 + 0.5;
  const g = Math.sin((dNorm + 0.33) * Math.PI * 3) * 0.5 + 0.5;
  const b = Math.sin((dNorm + 0.67) * Math.PI * 3) * 0.5 + 0.5;
  const brightness = 0.8;
  return `rgb(${Math.round(r * brightness * 255)},${Math.round(g * brightness * 255)},${Math.round(b * brightness * 255)})`;
}

function SampleVis({ x, y, r }: { x: number; y: number; r: number }) {
  const stressForce = useSimulationStore(s => s.stressForce);

  // Generate colored interference rings based on stress
  const rings = useMemo(() => {
    const count = 30;
    const result = [];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const radius = t * r * 1.1;
      const phase = t * stressForce * 20 + stressForce * 0.5;
      result.push({ radius, color: michelLevyColor(phase), width: r * 1.1 / count + 0.3 });
    }
    return result;
  }, [stressForce, r]);

  return (
    <g>
      <rect x={x - r} y={y - r * 1.4} width={r * 2} height={r * 2.8} rx={7}
        fill="#e8e6dc" stroke="#c9c2b1" strokeWidth={1.5} />
      <defs>
        <clipPath id={`sclip-${x.toFixed(0)}`}>
          <rect x={x - r + 1} y={y - r * 1.4 + 1} width={r * 2 - 2} height={r * 2.8 - 2} rx={6} />
        </clipPath>
      </defs>
      {/* Colored interference rings */}
      <g clipPath={`url(#sclip-${x.toFixed(0)})`}>
        <rect x={x - r} y={y - r * 1.4} width={r * 2} height={r * 2.8} fill="#e8e6dc" />
        {rings.map((ring, i) => (
          <ellipse key={i} cx={x} cy={y} rx={r * 0.5} ry={ring.radius}
            fill="none" stroke={ring.color} strokeWidth={ring.width} strokeOpacity={0.9} />
        ))}
      </g>
      {/* Force arrows */}
      <line x1={x} y1={y - r * 1.4 - 8} x2={x} y2={y - r * 1.4 - 1} stroke="#c0613f" strokeWidth={2} />
      <polygon points={`${x-4},${y-r*1.4-3} ${x+4},${y-r*1.4-3} ${x},${y-r*1.4+2}`} fill="#c0613f" />
      <line x1={x} y1={y + r * 1.4 + 8} x2={x} y2={y + r * 1.4 + 1} stroke="#c0613f" strokeWidth={2} />
      <polygon points={`${x-4},${y+r*1.4+3} ${x+4},${y+r*1.4+3} ${x},${y+r*1.4-2}`} fill="#c0613f" />
      <text x={x} y={y - r * 1.4 - 12} fill="#c0613f" fontSize={9} fontWeight={600} textAnchor="middle" fontFamily="JetBrains Mono">F</text>
      <text x={x} y={y + r * 1.4 + 21} fill="#c0613f" fontSize={9} fontWeight={600} textAnchor="middle" fontFamily="JetBrains Mono">F</text>
    </g>
  );
}

function DetectorVis({ x, y, intensity }: { x: number; y: number; intensity: number }) {
  const w = 8; const hh = 28;
  const brightness = Math.max(0.1, intensity);
  return (
    <g>
      <rect x={x - w / 2} y={y - hh} width={w} height={hh * 2} rx={3} fill="#e8e6dc" stroke="#c9c2b1" strokeWidth={1.3} />
      <ellipse cx={x} cy={y} rx={w / 2 - 1} ry={hh - 4}
        fill={`rgba(214,69,47,${brightness * 0.9})`}
        style={{ filter: `blur(${(1 - brightness) * 3}px)`, transition: 'fill 0.3s ease, filter 0.3s ease' }} />
      <line x1={x} y1={y + hh} x2={x} y2={y + hh + 8} stroke="#8a867c" strokeWidth={1.3} />
      <line x1={x - 6} y1={y + hh + 8} x2={x + 6} y2={y + hh + 8} stroke="#8a867c" strokeWidth={1.3} />
    </g>
  );
}

function EfieldIndicator({ x, y, angle, intensity, isAnalyzer }: {
  x: number; y: number; angle: number; intensity: number; isAnalyzer: boolean;
}) {
  const ang = degToRad(angle);
  const len = 32;
  const dx = Math.cos(ang); const dy = -Math.sin(ang);
  const a = Math.max(0.15, intensity);
  const color = isAnalyzer ? '#c0613f' : '#8d97a3';
  return (
    <g>
      <line x1={x - dx * len} y1={y - dy * len} x2={x + dx * len} y2={y + dy * len}
        stroke={color} strokeWidth={2.2} strokeLinecap="round" opacity={0.95 * a + 0.05} />
      {[1, -1].map(sign => {
        const ex = x + sign * dx * len; const ey = y + sign * dy * len;
        const dirA = sign > 0 ? ang : ang + Math.PI;
        return <g key={sign}>
          <line x1={ex} y1={ey} x2={ex - Math.cos(dirA - Math.PI / 6) * 6} y2={ey + Math.sin(dirA - Math.PI / 6) * 6}
            stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.9 * a + 0.05} />
          <line x1={ex} y1={ey} x2={ex - Math.cos(dirA + Math.PI / 6) * 6} y2={ey + Math.sin(dirA + Math.PI / 6) * 6}
            stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.9 * a + 0.05} />
        </g>;
      })}
    </g>
  );
}

function LabelPill({ x, y, el }: { x: number; y: number; el: { label: string; angle: number; type: string; waveplateType?: string } }) {
  const lines = el.label.split('\n');
  const showAngle = el.type === 'analyzer' || el.type === 'polarizer' || el.type === 'waveplate';
  const top = y + 38;
  const isAnalyzer = el.type === 'analyzer';
  const textColor = isAnalyzer ? '#c0613f' : el.type === 'waveplate' ? (el.waveplateType === 'hwp' ? '#5e8c5e' : '#c08a3e') : '#6f8197';
  return (
    <g>
      <rect x={x - 45} y={top} width={90} height={showAngle ? 38 : 22} rx={6}
        fill="rgba(255,255,255,0.94)" stroke="#ded8ca" strokeWidth={1} />
      {lines.map((line, i) => (
        <text key={i} x={x} y={top + (showAngle ? 12 : 14) + i * 13} textAnchor="middle" dominantBaseline="central"
          fill="#141413" fontSize={10} fontWeight={600}
          fontFamily="system-ui, Segoe UI, sans-serif">{line}</text>
      ))}
      {showAngle && (
        <text x={x} y={top + 28} textAnchor="middle" dominantBaseline="central"
          fill={textColor} fontSize={11} fontWeight={700} fontFamily="JetBrains Mono, Consolas, monospace">{el.angle}°</text>
      )}
    </g>
  );
}

function PolarizationEllipseViz({ x, y, analyzerAngle, intensity }: {
  x: number; y: number; analyzerAngle: number; intensity: number;
}) {
  const a = 28 * Math.sqrt(intensity);
  return (
    <g transform={`rotate(${analyzerAngle}, ${x}, ${y})`}>
      <ellipse cx={x} cy={y} rx={a} ry={1} fill="none" stroke="#d97757" strokeWidth={1.5} strokeDasharray="4 2" opacity={0.7} />
      <text x={x + a + 10} y={y - 5} fill="#c0613f" fontSize={10} fontWeight={600}
        fontFamily="JetBrains Mono, monospace">{intensity.toFixed(2)} I₀</text>
    </g>
  );
}
