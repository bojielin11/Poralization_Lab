import { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSimulationStore } from '../store/simulationStore';
import { malusIntensity, degToRad, angleBetween } from '../physics/core';

function useSimulationResults() {
  const elements = useSimulationStore(s => s.elements);
  const analyzer = elements.find(el => el.type === 'analyzer');
  const polarizer = elements.find(el => el.type === 'polarizer');
  const analyzerAngle = analyzer?.angle ?? 0;
  const polarizerAngle = polarizer?.angle ?? 0;
  const theta = angleBetween(polarizerAngle, analyzerAngle);
  return { intensity: malusIntensity(1.0, theta), analyzerAngle, polarizerAngle, theta };
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
    for (let i = 0; i < sorted.length - 1; i++) {
      const el = sorted[i];
      const next = sorted[i + 1];
      if (el.type === 'polarizer') { currentPolAngle = el.angle; currentIntensity = 1.0; }
      else if (el.type === 'analyzer') { currentIntensity = malusIntensity(1.0, angleBetween(currentPolAngle, el.angle)); }
      segments.push({ x1: el.position * W, y1: benchY, x2: next.position * W, y2: benchY, intensity: currentIntensity });
    }
    return segments;
  }, [elements]);

  const polarizerElements = elements.filter(el => el.type === 'polarizer' || el.type === 'analyzer');

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className="flex items-center gap-2 min-h-[42px] px-4 border-b border-lab-border flex-shrink-0"
        style={{ background: 'rgba(20, 28, 35, 0.7)' }}
      >
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-lab-text-muted">光路示意</span>
        <span className="text-2xs text-lab-text-muted ml-2">拖拽元件调整位置</span>
        <div className="flex-1" />
        <span className="text-2xs text-lab-text-muted">透射光强</span>
        <span className="text-sm font-bold font-mono text-lab-accent-hover">{intensity.toFixed(3)}</span>
        <span className="text-2xs text-lab-text-muted font-mono">I / I₀</span>
        <div className="w-24 h-1.5 rounded-full bg-lab-bg-inset border border-lab-border overflow-hidden ml-2">
          <motion.div className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #46cdd9, #ffb74d)' }}
            animate={{ width: `${intensity * 100}%` }} transition={{ duration: 0.2 }}
          />
        </div>
        <span className="text-2xs font-mono text-lab-text-muted ml-2 w-10 text-right">{(intensity * 100).toFixed(0)}%</span>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden relative"
        style={{ backgroundSize: '24px 24px', backgroundColor: '#0a0e12',
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)'
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          style={{ cursor: draggingId ? 'grabbing' : undefined }}
        >
          <defs>
            <style>{'.elem-g:hover .del-btn{opacity:1!important} .elem-g{cursor:grab} .elem-g:active{cursor:grabbing}'}</style>
            <filter id="laser-blur"><feGaussianBlur stdDeviation="4" /></filter>
            <filter id="beam-glow"><feGaussianBlur stdDeviation="8" /></filter>
            <filter id="selected-glow"><feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#ffb74d" floodOpacity="0.5" /></filter>
            <radialGradient id="laser-glow">
              <stop offset="0%" stopColor="#fff6d6" /><stop offset="50%" stopColor="#ffd451" /><stop offset="100%" stopColor="rgba(255,212,81,0.15)" />
            </radialGradient>
            {polarizerElements.map(el => {
              const ex = el.position * W;
              return (
                <g key={el.id}>
                  <linearGradient id={`pol-grad-${el.id}`}>
                    <stop offset="0%" stopColor="rgba(154,167,178,0.42)" />
                    <stop offset="100%" stopColor="rgba(96,112,124,0.22)" />
                  </linearGradient>
                  <clipPath id={`pol-clip-${el.id}`}>
                    <circle cx={ex} cy={benchY} r={23} />
                  </clipPath>
                </g>
              );
            })}
          </defs>

          {/* Optical axis */}
          <line x1={W * 0.04} y1={benchY} x2={W * 0.96} y2={benchY}
            stroke="rgba(255,255,255,0.06)" strokeWidth={1} strokeDasharray="4 6" />

          {/* Beam segments */}
          {beamSegments.map((seg, i) => (
            <g key={i}>
              <line x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
                stroke={`rgba(255,212,81,${seg.intensity * 0.10})`} strokeWidth={14} strokeLinecap="round" />
              <line x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
                stroke={`rgba(255,212,81,${seg.intensity * 0.28})`} strokeWidth={6} strokeLinecap="round" />
              <line x1={seg.x1} y1={seg.y1} x2={seg.x2} y2={seg.y2}
                stroke={`rgba(255,212,81,${Math.min(1, seg.intensity * 0.85 + 0.1)})`} strokeWidth={2.2} />
            </g>
          ))}

          {/* Elements */}
          {elements.map(el => {
            const x = el.position * W;
            const y = benchY;
            const isSelected = el.id === selectedElementId;
            const R = 24;

            return (
              <g key={el.id} className="elem-g"
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

                {el.type === 'detector' && <DetectorVis x={x} y={y} intensity={intensity} />}

                {showEfield && (el.type === 'polarizer' || el.type === 'analyzer') && (
                  <EfieldIndicator x={x} y={y} angle={el.angle}
                    intensity={el.type === 'analyzer' ? intensity : 1.0} isAnalyzer={el.type === 'analyzer'} />
                )}

                <LabelPill x={x} y={y} el={el} />

                {/* Delete button */}
                <g className="del-btn" opacity={0}
                  onClick={(e: any) => { e.stopPropagation(); removeElement(el.id); }}
                  style={{ cursor: 'pointer' }}
                >
                  <circle cx={x + R + 12} cy={y - R - 6} r={9} fill="#ff6f6120" stroke="#ff6f61" strokeWidth={1.2} />
                  <line x1={x + R + 7} y1={y - R - 11} x2={x + R + 17} y2={y - R - 1} stroke="#ff6f61" strokeWidth={1.5} strokeLinecap="round" />
                  <line x1={x + R + 17} y1={y - R - 11} x2={x + R + 7} y2={y - R - 1} stroke="#ff6f61" strokeWidth={1.5} strokeLinecap="round" />
                  <title>删除元件</title>
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
          stroke="rgba(255,212,81,0.30)" strokeWidth={1.2} strokeLinecap="round" />;
      })}
      <circle cx={x} cy={y} r={r} fill="url(#laser-glow)" filter="url(#laser-blur)" />
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
  const accentColor = isAnalyzer ? '#7ee0e8' : '#9fb1b8';

  return (
    <g filter={isSelected ? 'url(#selected-glow)' : undefined}>
      <circle cx={x} cy={y} r={r + 4} fill="#2a3640" stroke="#41525e" strokeWidth={1.2} />
      {isSelected && <circle cx={x} cy={y} r={r + 6} fill="none" stroke="#ffb74d" strokeWidth={2} strokeDasharray="3 3" opacity={0.8} />}
      <circle cx={x} cy={y} r={r} fill={`url(#pol-grad-${el.id})`} />
      <g clipPath={`url(#pol-clip-${el.id})`}>
        {Array.from({ length: Math.floor(r * 2 / 3.2) }, (_, i) => {
          const t = -r + i * 3.2;
          return <line key={i} x1={x + ndx * t - dx * r} y1={y + ndy * t - dy * r}
            x2={x + ndx * t + dx * r} y2={y + ndy * t + dy * r}
            stroke="rgba(200,214,224,0.20)" strokeWidth={0.7} />;
        })}
      </g>
      <line x1={x - dx * (r - 3)} y1={y - dy * (r - 3)} x2={x + dx * (r - 3)} y2={y + dy * (r - 3)}
        stroke={accentColor} strokeWidth={isAnalyzer ? 2.8 : 2.2} strokeLinecap="round"
        style={{ filter: isAnalyzer ? 'drop-shadow(0 0 5px rgba(70,205,217,0.6))' : undefined }} />
      <circle cx={x} cy={y} r={2.2} fill="#0c1217" />
      {isAnalyzer && [0, 45, 90, 135, 180].map(a => {
        const ta = degToRad(a);
        return <text key={a} x={x + Math.cos(ta) * (r + 8)} y={y - Math.sin(ta) * (r + 8)}
          textAnchor="middle" dominantBaseline="central"
          fill={a === el.angle ? '#ffb74d' : '#6c7d85'}
          fontSize={9} fontWeight={a === el.angle ? 700 : 500}
          fontFamily="JetBrains Mono, Consolas, monospace">{a}°</text>;
      })}
    </g>
  );
}

function WavePlateVis({ x, y, r, el }: { x: number; y: number; r: number; el: { angle: number; waveplateType?: string } }) {
  const ang = degToRad(el.angle);
  const dx = Math.cos(ang); const dy = -Math.sin(ang);
  const wType = el.waveplateType || 'qwp';
  const color = wType === 'hwp' ? '#4ade80' : wType === 'fwp' ? '#60a5fa' : '#fbbf52';
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

function DetectorVis({ x, y, intensity }: { x: number; y: number; intensity: number }) {
  const w = 8; const hh = 28;
  const brightness = Math.max(0.1, intensity);
  return (
    <g>
      <rect x={x - w / 2} y={y - hh} width={w} height={hh * 2} rx={3} fill="#1a232b" stroke="#41525e" strokeWidth={1.3} />
      <ellipse cx={x} cy={y} rx={w / 2 - 1} ry={hh - 4}
        fill={`rgba(255,212,81,${brightness * 0.9})`}
        style={{ filter: `blur(${(1 - brightness) * 3}px)`, transition: 'fill 0.3s ease, filter 0.3s ease' }} />
      <line x1={x} y1={y + hh} x2={x} y2={y + hh + 8} stroke="#33424c" strokeWidth={1.3} />
      <line x1={x - 6} y1={y + hh + 8} x2={x + 6} y2={y + hh + 8} stroke="#33424c" strokeWidth={1.3} />
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
  const color = isAnalyzer ? '#ffb74d' : '#7ee0e8';
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
  const textColor = isAnalyzer ? '#ffb74d' : el.type === 'waveplate' ? (el.waveplateType === 'hwp' ? '#4ade80' : '#fbbf52') : '#7ee0e8';
  return (
    <g>
      <rect x={x - 45} y={top} width={90} height={showAngle ? 38 : 22} rx={6}
        fill="rgba(10,16,20,0.92)" stroke="#243240" strokeWidth={1} />
      {lines.map((line, i) => (
        <text key={i} x={x} y={top + (showAngle ? 12 : 14) + i * 13} textAnchor="middle" dominantBaseline="central"
          fill={showAngle && i === 0 ? textColor : '#eaf2f5'} fontSize={10} fontWeight={600}
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
      <ellipse cx={x} cy={y} rx={a} ry={1} fill="none" stroke="#46cdd9" strokeWidth={1.5} strokeDasharray="4 2" opacity={0.7} />
      <text x={x + a + 10} y={y - 5} fill="#7ee0e8" fontSize={10} fontWeight={600}
        fontFamily="JetBrains Mono, monospace">{intensity.toFixed(2)} I₀</text>
    </g>
  );
}
