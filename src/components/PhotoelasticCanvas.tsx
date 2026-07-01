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

    // Draw force markers
    drawForceMarkers(ctx, currentForces, currentSelected, fieldHeight);

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
    const maxRet = 3000;
    for (let px = 0; px < barW; px++) {
      const ret = (px / (barW - 1)) * maxRet;
      const color = computeLegendColor(lut, ret, pol, ana);
      ctx.fillStyle = `rgb(${color.r},${color.g},${color.b})`;
      ctx.fillRect(barX + px, barY, 1, barH);
    }

    ctx.strokeStyle = '#c9c2b1';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // Labels
    ctx.fillStyle = '#8a867c';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Michel-Lévy 光程差 Γ / nm', barX, y + 14);
    ctx.fillText('0', barX, y + 47);
    ctx.textAlign = 'center';
    ctx.fillText('1500', CANVAS_RES / 2, y + 47);
    ctx.textAlign = 'right';
    ctx.fillText('3000', CANVAS_RES - 12, y + 47);
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

  // ---- Mouse handlers ----
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pt = canvasToNorm(e.clientX, e.clientY);
    if (!pt) return;
    const nearest = findNearest(pt.x, pt.y);
    if (nearest && nearest.distPx <= 18) {
      // Start dragging this force
      dragRef.current = { id: nearest.force.id, startX: pt.x, startY: pt.y };
      setIsDragging(true);
      selectForce(nearest.force.id);
    }
  }, [canvasToNorm, findNearest, selectForce]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragRef.current.id === null) return;
    const pt = canvasToNorm(e.clientX, e.clientY);
    if (!pt) return;
    moveForce(dragRef.current.id, pt.x, pt.y);
    needsRender.current = true;
  }, [canvasToNorm, moveForce]);

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
      // Add new force (or move selected if at max)
      addForce(pt.x, pt.y);
    }
    needsRender.current = true;
  }, [canvasToNorm, findNearest, selectForce, addForce]);

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
    <div className="flex items-center justify-center h-full w-full p-4"
      style={{ background: '#faf9f5' }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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
    </div>
  );
}
