import { useRef, useEffect, useCallback, useState } from 'react';
import { usePhotoelasticStore } from '../store/photoelasticStore';
import {
  getSpectrumLUT,
  computeStressField,
  computePixelColor,
  computeLegendColor,
  MATERIALS,
} from '../physics/photoelastic';

// Canvas internal resolution (computation grid)
const CANVAS_RES = 500;
// Pixel size of the legend bar area
const LEGEND_HEIGHT = 56;

export function PhotoelasticCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const needsRender = useRef(true);

  // State subscriptions
  const forces = usePhotoelasticStore(s => s.forces);
  const materialKey = usePhotoelasticStore(s => s.materialKey);
  const wavelength = usePhotoelasticStore(s => s.wavelength);
  const thickness = usePhotoelasticStore(s => s.thickness);
  const polarizerAngle = usePhotoelasticStore(s => s.polarizerAngle);
  const analyzerAngle = usePhotoelasticStore(s => s.analyzerAngle);
  const addForce = usePhotoelasticStore(s => s.addForce);
  const removeForce = usePhotoelasticStore(s => s.removeForce);
  const moveForce = usePhotoelasticStore(s => s.moveForce);
  const selectForce = usePhotoelasticStore(s => s.selectForce);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ id: number | null; startX: number; startY: number }>({
    id: null, startX: 0, startY: 0,
  });

  // Probe state — computed on hover (not dragging)
  const [probe, setProbe] = useState<{
    screenX: number; screenY: number;
    sigmaDiff: number; retardationNm: number; phi: number;
    colorR: number; colorG: number; colorB: number;
  } | null>(null);
  const probeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mark dirty on any param change
  useEffect(() => {
    needsRender.current = true;
  }, [forces, materialKey, wavelength, thickness, polarizerAngle, analyzerAngle]);

  // ---- Canvas rendering ----
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set internal resolution
    canvas.width = CANVAS_RES;
    canvas.height = CANVAS_RES;
    const fieldHeight = CANVAS_RES - LEGEND_HEIGHT;

    const lut = getSpectrumLUT(wavelength);
    const coeff = MATERIALS[materialKey]?.coefficient ?? 1e-10;
    const currentForces = usePhotoelasticStore.getState().forces;
    const currentPol = usePhotoelasticStore.getState().polarizerAngle;
    const currentAna = usePhotoelasticStore.getState().analyzerAngle;
    const currentThickness = usePhotoelasticStore.getState().thickness;
    const currentSelected = usePhotoelasticStore.getState().selectedForceId;

    // Render stress pattern pixels
    const imageData = ctx.createImageData(CANVAS_RES, fieldHeight);
    const data = imageData.data;

    for (let py = 0; py < fieldHeight; py++) {
      const y = (py + 0.5) / fieldHeight;
      for (let px = 0; px < CANVAS_RES; px++) {
        const x = (px + 0.5) / CANVAS_RES;
        const stress = computeStressField(currentForces, x, y);
        const color = computePixelColor(
          lut, stress.sigmaDiff, stress.phi,
          coeff, currentThickness, currentPol, currentAna
        );
        const idx = (py * CANVAS_RES + px) * 4;
        data[idx] = color.r;
        data[idx + 1] = color.g;
        data[idx + 2] = color.b;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);

    // Draw real force markers only (skip image forces)
    const realForces = currentForces.filter(f => !f.isImage);
    drawForceMarkers(ctx, realForces, currentSelected, fieldHeight);

    // Draw legend bar
    drawLegend(ctx, lut, currentPol, currentAna, fieldHeight);
  }, [wavelength, materialKey]);

  // Keep renderCanvas in a ref so rAF loop always calls latest version
  const renderCanvasRef = useRef(renderCanvas);
  renderCanvasRef.current = renderCanvas;

  // Render loop — runs once on mount
  useEffect(() => {
    const render = () => {
      if (needsRender.current) {
        renderCanvasRef.current();
        needsRender.current = false;
      }
      animRef.current = requestAnimationFrame(render);
    };
    animRef.current = requestAnimationFrame(render);
    return () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // ---- Force markers ----
  function drawForceMarkers(
    ctx: CanvasRenderingContext2D,
    currentForces: typeof forces,
    selected: number | null,
    fh: number
  ) {
    const accent = '#d97757';
    const text = '#141413';
    const muted = '#8a867c';

    for (const force of currentForces) {
      const fx = force.x * CANVAS_RES;
      const fy = force.y * fh;
      const isSelected = force.id === selected;

      ctx.save();
      // Outer ring
      ctx.strokeStyle = isSelected ? accent : text;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.beginPath();
      ctx.arc(fx, fy, isSelected ? 9 : 7, 0, Math.PI * 2);
      ctx.stroke();
      // Inner dot
      ctx.fillStyle = isSelected ? accent : text;
      ctx.beginPath();
      ctx.arc(fx, fy, 3, 0, Math.PI * 2);
      ctx.fill();
      // Label
      ctx.font = '600 12px "JetBrains Mono", Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = isSelected ? accent : muted;
      ctx.fillText(`F${force.id}`, fx, Math.max(14, fy - 14));
      // Magnitude below
      ctx.font = '500 10px "JetBrains Mono", Consolas, monospace';
      ctx.fillText(`${force.magnitude.toFixed(1)}`, fx, Math.min(fh - 4, fy + 22));
      ctx.restore();
    }
  }

  // ---- Legend bar ----
  function drawLegend(
    ctx: CanvasRenderingContext2D,
    lut: ReturnType<typeof getSpectrumLUT>,
    pol: number,
    ana: number,
    fh: number
  ) {
    const y = fh;
    const barX = 12;
    const barW = CANVAS_RES - 24;
    const barH = 12;
    const barY = y + 22;

    // Background
    ctx.fillStyle = '#f2efe7';
    ctx.fillRect(0, y, CANVAS_RES, LEGEND_HEIGHT);
    ctx.strokeStyle = '#ded8ca';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_RES, y);
    ctx.stroke();

    // Color bar
    const maxRet = 5500;
    for (let px = 0; px < barW; px++) {
      const ret = (px / (barW - 1)) * maxRet;
      const color = computeLegendColor(lut, ret, pol, ana);
      ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
      ctx.fillRect(barX + px, barY, 1, barH);
    }

    ctx.strokeStyle = '#c9c2b1';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // Labels with order markers
    ctx.fillStyle = '#8a867c';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Michel-Lévy 光程差 Γ / nm', barX, y + 14);
    ctx.fillText('0', barX, y + 47);
    ctx.textAlign = 'center';
    const orderMarkers = [
      { nm: 550, label: '1 级' },
      { nm: 1100, label: '2 级' },
      { nm: 1650, label: '3 级' },
      { nm: 2200, label: '4 级' },
    ];
    for (const m of orderMarkers) {
      const mx = barX + (m.nm / maxRet) * barW;
      ctx.strokeStyle = '#141413';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(mx, barY - 2);
      ctx.lineTo(mx, barY + barH + 2);
      ctx.stroke();
      ctx.fillStyle = '#8a867c';
      ctx.fillText(m.label, mx, y + 47);
    }
    // Final label
    ctx.textAlign = 'right';
    ctx.fillText('5500', CANVAS_RES - 12, y + 47);
  }

  // ---- Coordinate conversion ----
  const canvasToNorm = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_RES / rect.width;
    const scaleY = CANVAS_RES / rect.height;
    const px = (clientX - rect.left) * scaleX;
    const py = (clientY - rect.top) * scaleY;
    const fh = CANVAS_RES - LEGEND_HEIGHT;
    if (px < 0 || px > CANVAS_RES || py < 0 || py > fh) return null;
    return { x: px / CANVAS_RES, y: py / fh, canvasX: px, canvasY: py };
  }, []);

  // ---- Find nearest force ----
  const findNearest = useCallback((normX: number, normY: number) => {
    const currentForces = usePhotoelasticStore.getState().forces;
    let best: { force: typeof currentForces[0]; distPx: number } | null = null;
    for (const f of currentForces) {
      const dx = (f.x - normX) * CANVAS_RES;
      const dy = (f.y - normY) * (CANVAS_RES - LEGEND_HEIGHT);
      const distPx = Math.hypot(dx, dy);
      if (!best || distPx < best.distPx) best = { force: f, distPx };
    }
    return best;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Update probe on hover (throttled)
    if (dragRef.current.id === null) {
      if (probeTimer.current) clearTimeout(probeTimer.current);
      probeTimer.current = setTimeout(() => {
        const pt = canvasToNorm(e.clientX, e.clientY);
        if (!pt) { setProbe(null); return; }
        const currentForces = usePhotoelasticStore.getState().forces;
        const currentCoeff = MATERIALS[usePhotoelasticStore.getState().materialKey]?.coefficient ?? 1e-10;
        const currentThickness = usePhotoelasticStore.getState().thickness;
        const currentPol = usePhotoelasticStore.getState().polarizerAngle;
        const currentAna = usePhotoelasticStore.getState().analyzerAngle;
        const currentWl = usePhotoelasticStore.getState().wavelength;
        const lut = getSpectrumLUT(currentWl);
        const stress = computeStressField(currentForces, pt.x, pt.y);
        const thicknessM = currentThickness * 1e-3;
        const retNm = currentCoeff * stress.sigmaDiff * thicknessM * 1e9;
        const color = computePixelColor(lut, stress.sigmaDiff, stress.phi, currentCoeff, currentThickness, currentPol, currentAna);
        setProbe({
          screenX: e.clientX, screenY: e.clientY,
          sigmaDiff: stress.sigmaDiff,
          retardationNm: retNm,
          phi: stress.phi * 180 / Math.PI,
          colorR: color.r, colorG: color.g, colorB: color.b,
        });
      }, 60);
      return;
    }
    // Dragging
    const pt = canvasToNorm(e.clientX, e.clientY);
    if (!pt) return;
    moveForce(dragRef.current.id, pt.x, pt.y);
    needsRender.current = true;
  }, [canvasToNorm, moveForce]);

  const handleMouseDownProbe = useCallback((e: React.MouseEvent) => {
    setProbe(null); // clear probe on click
    const pt = canvasToNorm(e.clientX, e.clientY);
    if (!pt) return;
    const nearest = findNearest(pt.x, pt.y);
    if (nearest && nearest.distPx <= 18) {
      dragRef.current = { id: nearest.force.id, startX: pt.x, startY: pt.y };
      setIsDragging(true);
      selectForce(nearest.force.id);
    }
  }, [canvasToNorm, findNearest, selectForce]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (dragRef.current.id !== null) {
      dragRef.current = { id: null, startX: 0, startY: 0 };
      setIsDragging(false);
      return;
    }
    // Click (no drag)
    const pt = canvasToNorm(e.clientX, e.clientY);
    if (!pt) return;
    const nearest = findNearest(pt.x, pt.y);
    if (nearest && nearest.distPx <= 15) {
      selectForce(nearest.force.id);
    } else {
      addForce(pt.x, pt.y);
    }
    needsRender.current = true;
  }, [canvasToNorm, findNearest, selectForce, addForce]);

  const handleMouseLeave = useCallback(() => {
    setProbe(null);
    if (dragRef.current.id !== null) {
      dragRef.current = { id: null, startX: 0, startY: 0 };
      setIsDragging(false);
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const pt = canvasToNorm(e.clientX, e.clientY);
    if (!pt) return;
    const nearest = findNearest(pt.x, pt.y);
    if (nearest && nearest.distPx <= 20) {
      removeForce(nearest.force.id);
      needsRender.current = true;
    }
  }, [canvasToNorm, findNearest, removeForce]);

  return (
    <div className="flex items-center justify-center h-full w-full p-4 relative"
      style={{ background: '#faf9f5' }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDownProbe}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        className="rounded-lg border border-lab-border max-w-full max-h-full"
        style={{
          cursor: isDragging ? 'grabbing' : 'crosshair',
          boxShadow: '0 1px 3px rgba(20,20,19,0.06), 0 4px 14px rgba(20,20,19,0.08)',
          aspectRatio: '1 / 1',
          objectFit: 'contain',
        }}
        aria-label="光弹应力条纹图 — 点击添加力点，拖拽移动，右键删除"
      />

      {/* Probe tooltip — floating stress readout */}
      {probe && (
        <div
          className="fixed z-[200] pointer-events-none p-2.5 rounded-lg border border-lab-border/60 text-xs leading-relaxed font-mono"
          style={{
            left: probe.screenX + 16,
            top: probe.screenY - 10,
            background: '#faf9f5',
            boxShadow: '0 1px 4px rgba(20,20,19,0.08), 0 2px 8px rgba(20,20,19,0.06)',
            color: '#141413',
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3.5 h-3.5 rounded-sm border border-lab-border/40"
              style={{ backgroundColor: `rgb(${probe.colorR},${probe.colorG},${probe.colorB})` }}
            />
            <span className="text-lab-text-secondary">探针读数</span>
          </div>
          <div className="space-y-0.5 text-[11px]">
            <div>σ₁−σ₂ <span className="text-lab-accent-hover ml-1">
              {probe.sigmaDiff < 1e3
                ? probe.sigmaDiff.toFixed(1) + ' Pa'
                : (probe.sigmaDiff / 1e3).toFixed(2) + ' kPa'}
            </span></div>
            <div>Γ <span className="text-lab-accent-hover ml-1">{probe.retardationNm.toFixed(0)} nm</span></div>
            <div>φ <span className="text-lab-text-muted ml-1">{probe.phi.toFixed(1)}°</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
