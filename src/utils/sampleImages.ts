/**
 * Generates photorealistic architectural and civil engineering photos
 * with realistic textures, lighting, perspective, and depth.
 */

export function createConstructionDemoImage(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 900;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Natural tropical sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 500);
  skyGrad.addColorStop(0, '#1d4ed8');
  skyGrad.addColorStop(0.35, '#3b82f6');
  skyGrad.addColorStop(0.7, '#60a5fa');
  skyGrad.addColorStop(1, '#93c5fd');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 1200, 500);

  // Photorealistic clouds with depth
  const drawCloud = (cx: number, cy: number, scale: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    const grad = ctx.createRadialGradient(0, 0, 20, 0, 0, 140);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    grad.addColorStop(0.5, 'rgba(240, 245, 255, 0.6)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 90, 0, Math.PI * 2);
    ctx.arc(-60, 20, 70, 0, Math.PI * 2);
    ctx.arc(70, 15, 80, 0, Math.PI * 2);
    ctx.arc(-20, -40, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  drawCloud(320, 140, 1.2);
  drawCloud(780, 110, 0.9);
  drawCloud(1050, 180, 1.4);

  // 2. Lush canopy tree branches on the left (matches reference photo framing)
  const drawTreeBranch = () => {
    ctx.save();
    for (let i = 0; i < 45; i++) {
      const tx = 20 + Math.random() * 140;
      const ty = 40 + Math.random() * 450;
      const r = 25 + Math.random() * 35;
      const leafGrad = ctx.createRadialGradient(tx, ty, 5, tx, ty, r);
      leafGrad.addColorStop(0, '#15803d');
      leafGrad.addColorStop(0.7, '#166534');
      leafGrad.addColorStop(1, '#14532d');
      ctx.fillStyle = leafGrad;
      ctx.beginPath();
      ctx.arc(tx, ty, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };
  drawTreeBranch();

  // 3. Multi-story school building facade (Warm cream and white concrete with perspective)
  // Base building envelope with perspective angling
  ctx.save();
  const bldgGrad = ctx.createLinearGradient(120, 120, 1200, 900);
  bldgGrad.addColorStop(0, '#fef9c3'); // soft cream/yellow tint
  bldgGrad.addColorStop(0.4, '#fef08a');
  bldgGrad.addColorStop(1, '#fde047');
  ctx.fillStyle = bldgGrad;

  ctx.beginPath();
  ctx.moveTo(120, 360);
  ctx.lineTo(550, 20);
  ctx.lineTo(1200, 60);
  ctx.lineTo(1200, 900);
  ctx.lineTo(100, 900);
  ctx.closePath();
  ctx.fill();

  // White plaster facade panels
  ctx.fillStyle = '#f8fafc';
  for (let floor = 0; floor < 4; floor++) {
    const yTop = 220 + floor * 155;
    const yHeight = 110;
    ctx.fillRect(150, yTop, 1050, yHeight);

    // Deep recessed corridor behind the railings (dark interior)
    ctx.fillStyle = '#334155';
    ctx.fillRect(180, yTop + 20, 1020, 80);

    // Ceiling lights in corridors
    ctx.fillStyle = '#fef08a';
    for (let light = 0; light < 5; light++) {
      ctx.fillRect(260 + light * 180, yTop + 24, 40, 6);
    }

    // Concrete balcony parapet
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(160, yTop + 75, 1040, 35);

    // Green protective railings (DepEd standard emerald-green)
    ctx.fillStyle = '#15803d';
    ctx.fillRect(160, yTop + 25, 1040, 6); // top handrail
    for (let b = 0; b < 65; b++) {
      ctx.fillRect(175 + b * 16, yTop + 30, 4, 46);
    }

    // Floor edge shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.fillRect(150, yTop + yHeight, 1050, 12);
  }

  // 4. Vertical structural columns (prominent feature of the school building)
  const columnPositions = [180, 360, 540, 720, 900, 1080];
  columnPositions.forEach((cx) => {
    // Column body with warm yellow plaster
    const colGrad = ctx.createLinearGradient(cx, 0, cx + 45, 0);
    colGrad.addColorStop(0, '#fef08a');
    colGrad.addColorStop(0.6, '#fde047');
    colGrad.addColorStop(1, '#eab308');
    ctx.fillStyle = colGrad;
    ctx.fillRect(cx, 160, 46, 740);

    // Right-edge depth shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.fillRect(cx + 46, 160, 14, 740);
  });

  // 5. Ground level detail
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 860, 1200, 40);

  ctx.restore();
  return canvas.toDataURL('image/jpeg', 0.94);
}

export function createRoadInspectionDemoImage(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 900;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, 460);
  skyGrad.addColorStop(0, '#0369a1');
  skyGrad.addColorStop(0.6, '#38bdf8');
  skyGrad.addColorStop(1, '#bae6fd');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, 1200, 460);

  // Distant mountain ranges with aerial haze
  ctx.fillStyle = '#64748b';
  ctx.beginPath();
  ctx.moveTo(0, 460);
  ctx.lineTo(200, 340);
  ctx.lineTo(480, 410);
  ctx.lineTo(760, 310);
  ctx.lineTo(1050, 390);
  ctx.lineTo(1200, 460);
  ctx.fill();

  ctx.fillStyle = '#475569';
  ctx.beginPath();
  ctx.moveTo(0, 460);
  ctx.lineTo(340, 380);
  ctx.lineTo(600, 430);
  ctx.lineTo(920, 360);
  ctx.lineTo(1200, 460);
  ctx.fill();

  // Highway perspective
  const roadGrad = ctx.createLinearGradient(0, 460, 0, 900);
  roadGrad.addColorStop(0, '#475569');
  roadGrad.addColorStop(1, '#1e293b');
  ctx.fillStyle = roadGrad;
  ctx.beginPath();
  ctx.moveTo(560, 460);
  ctx.lineTo(640, 460);
  ctx.lineTo(1160, 900);
  ctx.lineTo(40, 900);
  ctx.fill();

  // Road shoulders
  ctx.fillStyle = '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(555, 460);
  ctx.lineTo(560, 460);
  ctx.lineTo(40, 900);
  ctx.lineTo(10, 900);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(640, 460);
  ctx.lineTo(645, 460);
  ctx.lineTo(1190, 900);
  ctx.lineTo(1160, 900);
  ctx.fill();

  // Yellow central dividing double lines
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(596, 460);
  ctx.lineTo(570, 900);
  ctx.moveTo(604, 460);
  ctx.lineTo(630, 900);
  ctx.stroke();

  // Grass verges with foliage
  ctx.fillStyle = '#15803d';
  ctx.beginPath();
  ctx.moveTo(0, 460);
  ctx.lineTo(555, 460);
  ctx.lineTo(10, 900);
  ctx.lineTo(0, 900);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(645, 460);
  ctx.lineTo(1200, 460);
  ctx.lineTo(1200, 900);
  ctx.lineTo(1190, 900);
  ctx.fill();

  return canvas.toDataURL('image/jpeg', 0.94);
}
