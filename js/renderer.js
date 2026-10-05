/**
 * Conway's Soldiers - Infinite Canvas Renderer
 * High-performance viewport culling for infinite field, Retina rendering,
 * glowing indicators, jump arcs and smooth camera controls.
 */

class ConwayRenderer {
    constructor(canvas, engine) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.engine = engine;

        // Camera state (grid units)
        this.camX = 0;
        this.camY = -1;
        this.targetCamX = 0;
        this.targetCamY = -1;
        this.isPanning = false;

        // Zoom state (pixels per cell)
        this.cellSize = 48;
        this.targetCellSize = 48;
        this.minCellSize = 16;
        this.maxCellSize = 120;

        // Selection & Interaction state
        this.selectedSoldier = null; // { x, y }
        this.validJumps = []; // array of valid jump objects
        this.hoveredCell = null; // { x, y }
        this.hoveredJump = null;
        this.draggedSoldier = null; // { x, y, currentX, currentY }

        // Animations
        this.activeAnimations = [];
        this.pulseTime = 0;

        this.dpr = window.devicePixelRatio || 1;
        this.resize();
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        this.dpr = window.devicePixelRatio || 1;

        this.canvas.width = Math.round(this.width * this.dpr);
        this.canvas.height = Math.round(this.height * this.dpr);
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    gridToScreen(gx, gy) {
        const sx = this.width / 2 + (gx - this.camX) * this.cellSize;
        const sy = this.height / 2 - (gy - this.camY) * this.cellSize;
        return { x: sx, y: sy };
    }

    screenToGrid(sx, sy) {
        const gx = Math.round(this.camX + (sx - this.width / 2) / this.cellSize);
        const gy = Math.round(this.camY - (sy - this.height / 2) / this.cellSize);
        return { x: gx, y: gy };
    }

    recenter(smooth = true) {
        const box = this.engine.getBoundingBox();
        const midX = (box.minX + box.maxX) / 2;
        const midY = (box.minY + box.maxY) / 2;

        if (smooth) {
            this.targetCamX = midX;
            this.targetCamY = midY;
        } else {
            this.camX = midX;
            this.camY = midY;
            this.targetCamX = midX;
            this.targetCamY = midY;
        }
    }

    zoom(delta, pivotX = this.width / 2, pivotY = this.height / 2) {
        const prevGrid = this.screenToGrid(pivotX, pivotY);

        const zoomFactor = delta > 0 ? 1.15 : 0.87;
        const newSize = Math.max(this.minCellSize, Math.min(this.maxCellSize, this.cellSize * zoomFactor));

        this.cellSize = newSize;
        this.targetCellSize = newSize;

        this.camX = prevGrid.x - (pivotX - this.width / 2) / this.cellSize;
        this.camY = prevGrid.y + (pivotY - this.height / 2) / this.cellSize;
        this.targetCamX = this.camX;
        this.targetCamY = this.camY;
    }

    pan(dx, dy) {
        this.camX -= dx / this.cellSize;
        this.camY += dy / this.cellSize;
        this.targetCamX = this.camX;
        this.targetCamY = this.camY;
    }

    setSelectedSoldier(cell) {
        if (cell && this.engine.hasSoldier(cell.x, cell.y)) {
            this.selectedSoldier = { x: cell.x, y: cell.y };
            this.validJumps = this.engine.getValidJumpsFor(cell.x, cell.y);
        } else {
            this.selectedSoldier = null;
            this.validJumps = [];
            this.hoveredJump = null;
        }
    }

    updateHover(screenX, screenY) {
        const grid = this.screenToGrid(screenX, screenY);
        this.hoveredCell = grid;

        if (this.selectedSoldier && this.validJumps.length > 0) {
            this.hoveredJump = this.validJumps.find(j => j.to.x === grid.x && j.to.y === grid.y) || null;
        } else {
            this.hoveredJump = null;
        }
    }

    addJumpAnimation(jump, onComplete) {
        this.activeAnimations.push({
            type: 'jump',
            jump,
            startTime: performance.now(),
            duration: 140,
            onComplete
        });
    }

    updateAnimations(now) {
        this.camX += (this.targetCamX - this.camX) * 0.15;
        this.camY += (this.targetCamY - this.camY) * 0.15;

        for (let i = this.activeAnimations.length - 1; i >= 0; i--) {
            const anim = this.activeAnimations[i];
            const elapsed = now - anim.startTime;
            anim.progress = Math.min(1, elapsed / anim.duration);

            if (anim.progress >= 1) {
                if (anim.onComplete) anim.onComplete();
                this.activeAnimations.splice(i, 1);
            }
        }
        this.pulseTime = now * 0.003;
    }

    render(now = performance.now()) {
        this.updateAnimations(now);

        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        const halfW = (this.width / 2) / this.cellSize;
        const halfH = (this.height / 2) / this.cellSize;
        const minX = Math.floor(this.camX - halfW) - 1;
        const maxX = Math.ceil(this.camX + halfW) + 1;
        const minY = Math.floor(this.camY - halfH) - 1;
        const maxY = Math.ceil(this.camY + halfH) + 1;

        // 1. Background zones
        this.drawBackgroundZones(minX, maxX, minY, maxY);

        // 2. Infinite Grid lines
        this.drawGrid(minX, maxX, minY, maxY);

        // 3. Dividing Line & Level Banners
        this.drawDividingLineAndLevels(minX, maxX);

        // 4. Hover cell outline
        if (this.hoveredCell) {
            this.drawHoverCell(this.hoveredCell);
        }

        // 5. Jump Target Highlights & Preview
        this.drawJumpTargets();

        // 6. Soldiers (infinite viewport retrieval)
        this.drawSoldiers(minX, maxX, minY, maxY);

        // 7. Active Jump Animations
        this.drawJumpAnimations();

        // 8. Coordinates HUD Badge
        this.drawCoordinatesHUD();
    }

    drawBackgroundZones(minX, maxX, minY, maxY) {
        const ctx = this.ctx;
        const lineY = this.engine.lineY;

        const northBottom = this.gridToScreen(0, lineY + 0.5).y;
        if (northBottom > 0) {
            ctx.fillStyle = '#0b1329';
            ctx.fillRect(0, 0, this.width, Math.min(this.height, northBottom));
        }

        if (northBottom < this.height) {
            ctx.fillStyle = '#090d16';
            ctx.fillRect(0, Math.max(0, northBottom), this.width, this.height - northBottom);
        }
    }

    drawGrid(minX, maxX, minY, maxY) {
        const ctx = this.ctx;
        ctx.save();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;

        for (let x = minX; x <= maxX; x++) {
            const sx = this.gridToScreen(x, 0).x;
            ctx.beginPath();
            ctx.moveTo(sx, 0);
            ctx.lineTo(sx, this.height);
            ctx.stroke();
        }

        for (let y = minY; y <= maxY; y++) {
            const sy = this.gridToScreen(0, y).y;
            ctx.beginPath();
            ctx.moveTo(0, sy);
            ctx.lineTo(this.width, sy);
            ctx.stroke();
        }

        const centerSx = this.gridToScreen(0, 0).x;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(centerSx, 0);
        ctx.lineTo(centerSx, this.height);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.restore();
    }

    drawDividingLineAndLevels(minX, maxX) {
        const ctx = this.ctx;
        const lineY = this.engine.lineY;
        const screenLineY = this.gridToScreen(0, lineY + 0.5).y;

        ctx.save();

        if (screenLineY >= -20 && screenLineY <= this.height + 20) {
            ctx.shadowColor = 'rgba(245, 158, 11, 0.7)';
            ctx.shadowBlur = 12;
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(0, screenLineY);
            ctx.lineTo(this.width, screenLineY);
            ctx.stroke();

            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#fef08a';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, screenLineY);
            ctx.lineTo(this.width, screenLineY);
            ctx.stroke();

            ctx.fillStyle = '#f59e0b';
            ctx.font = '600 11px system-ui, -apple-system, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('⚡ STARTING LINE (y = 0)', 18, screenLineY - 8);
        }

        for (let lvl = 1; lvl <= 6; lvl++) {
            const gy = lineY + lvl;
            const sy = this.gridToScreen(0, gy).y;
            if (sy < -30 || sy > this.height + 30) continue;

            const isBarrier = lvl === 5;
            const isBeyond = lvl > 5;

            ctx.lineWidth = isBarrier ? 2 : 1;
            ctx.strokeStyle = isBarrier 
                ? 'rgba(244, 63, 94, 0.45)' 
                : 'rgba(56, 189, 248, 0.15)';
            if (isBarrier) {
                ctx.setLineDash([6, 6]);
            } else {
                ctx.setLineDash([2, 4]);
            }
            ctx.beginPath();
            ctx.moveTo(0, sy);
            ctx.lineTo(this.width, sy);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.font = isBarrier ? 'bold 11px system-ui, sans-serif' : '500 11px system-ui, sans-serif';
            ctx.textAlign = 'right';

            if (isBarrier) {
                ctx.fillStyle = '#f43f5e';
                ctx.fillText(`⛔ LEVEL ${lvl} (CONWAY BARRIER - IMPOSSIBLE)`, this.width - 20, sy - 6);
            } else if (isBeyond) {
                ctx.fillStyle = '#94a3b8';
                ctx.fillText(`LEVEL +${lvl}`, this.width - 20, sy - 6);
            } else {
                ctx.fillStyle = '#38bdf8';
                ctx.fillText(`LEVEL +${lvl}`, this.width - 20, sy - 6);
            }
        }

        ctx.restore();
    }

    drawHoverCell(cell) {
        const ctx = this.ctx;
        const pos = this.gridToScreen(cell.x, cell.y);
        const radius = this.cellSize * 0.46;

        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(pos.x - radius, pos.y - radius, radius * 2, radius * 2);
        ctx.restore();
    }

    drawJumpTargets() {
        if (!this.selectedSoldier || this.validJumps.length === 0) return;

        const ctx = this.ctx;
        const pulse = Math.sin(this.pulseTime * 5) * 0.2 + 0.8;

        for (const jump of this.validJumps) {
            const pos = this.gridToScreen(jump.to.x, jump.to.y);
            const isHovered = this.hoveredJump && this.hoveredJump.to.x === jump.to.x && this.hoveredJump.to.y === jump.to.y;

            ctx.save();

            ctx.fillStyle = isHovered 
                ? 'rgba(34, 197, 94, 0.35)' 
                : 'rgba(56, 189, 248, 0.18)';
            const r = this.cellSize * 0.44;
            ctx.beginPath();
            ctx.roundRect(pos.x - r, pos.y - r, r * 2, r * 2, 8);
            ctx.fill();

            ctx.strokeStyle = isHovered ? '#22c55e' : `rgba(56, 189, 248, ${0.75 * pulse})`;
            ctx.lineWidth = isHovered ? 2.5 : 1.8;
            ctx.stroke();

            ctx.fillStyle = isHovered ? '#22c55e' : '#38bdf8';
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, (isHovered ? 7 : 5) * pulse, 0, Math.PI * 2);
            ctx.fill();

            if (isHovered) {
                this.drawJumpTrajectory(jump);
            }

            ctx.restore();
        }
    }

    drawJumpTrajectory(jump) {
        const ctx = this.ctx;
        const fromPos = this.gridToScreen(jump.from.x, jump.from.y);
        const overPos = this.gridToScreen(jump.over.x, jump.over.y);
        const toPos = this.gridToScreen(jump.to.x, jump.to.y);

        ctx.save();

        ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(overPos.x, overPos.y, this.cellSize * 0.38, 0, Math.PI * 2);
        ctx.stroke();

        const xSize = this.cellSize * 0.18;
        ctx.beginPath();
        ctx.moveTo(overPos.x - xSize, overPos.y - xSize);
        ctx.lineTo(overPos.x + xSize, overPos.y + xSize);
        ctx.moveTo(overPos.x + xSize, overPos.y - xSize);
        ctx.lineTo(overPos.x - xSize, overPos.y + xSize);
        ctx.stroke();

        ctx.shadowColor = 'rgba(34, 197, 94, 0.6)';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);

        ctx.beginPath();
        ctx.moveTo(fromPos.x, fromPos.y);
        const midX = (fromPos.x + toPos.x) / 2;
        const midY = (fromPos.y + toPos.y) / 2;
        const perpX = -(toPos.y - fromPos.y) * 0.2;
        const perpY = (toPos.x - fromPos.x) * 0.2;
        ctx.quadraticCurveTo(midX + perpX, midY + perpY, toPos.x, toPos.y);
        ctx.stroke();

        ctx.restore();
    }

    drawSoldiers(minX, maxX, minY, maxY) {
        const ctx = this.ctx;
        const pulse = Math.sin(this.pulseTime * 6) * 0.15 + 0.85;

        // Retrieve all visible soldiers in the viewport (supports infinite half-plane!)
        const visibleSoldiers = this.engine.getVisibleSoldiers(minX, maxX, minY, maxY);

        for (const s of visibleSoldiers) {
            const isSelected = this.selectedSoldier && this.selectedSoldier.x === s.x && this.selectedSoldier.y === s.y;
            const canMove = this.engine.getValidJumpsFor(s.x, s.y).length > 0;
            const pos = this.gridToScreen(s.x, s.y);
            const radius = this.cellSize * 0.36;

            ctx.save();

            ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 4;

            const grad = ctx.createRadialGradient(
                pos.x - radius * 0.3, pos.y - radius * 0.35, radius * 0.1,
                pos.x, pos.y, radius
            );

            if (isSelected) {
                grad.addColorStop(0, '#fbcfe8');
                grad.addColorStop(0.3, '#f43f5e');
                grad.addColorStop(1, '#9f1239');
            } else if (s.y > this.engine.lineY) {
                grad.addColorStop(0, '#fef08a');
                grad.addColorStop(0.3, '#f59e0b');
                grad.addColorStop(1, '#b45309');
            } else if (canMove) {
                // Movable soldier has a brighter, energized cyan glow
                grad.addColorStop(0, '#e0f2fe');
                grad.addColorStop(0.3, '#38bdf8');
                grad.addColorStop(1, '#0284c7');
            } else {
                // Blocked soldier is slightly dimmer
                grad.addColorStop(0, '#94a3b8');
                grad.addColorStop(0.3, '#475569');
                grad.addColorStop(1, '#1e293b');
            }

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 0;

            if (isSelected) {
                ctx.shadowColor = 'rgba(244, 63, 94, 0.9)';
                ctx.shadowBlur = 14;
                ctx.strokeStyle = '#f43f5e';
                ctx.lineWidth = 3 * pulse;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, radius + 4 * pulse, 0, Math.PI * 2);
                ctx.stroke();
            } else if (canMove) {
                // Subtle glowing ring around movable soldiers
                ctx.strokeStyle = `rgba(56, 189, 248, ${0.5 * pulse + 0.3})`;
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, radius + 2, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            ctx.restore();
        }

        // Draw dragged piece if user is dragging with finger or mouse
        this.drawDraggedPiece();
    }

    drawDraggedPiece() {
        if (!this.draggedPiece) return;
        const ctx = this.ctx;
        const { currentScreenX, currentScreenY } = this.draggedPiece;
        const radius = this.cellSize * 0.4;

        ctx.save();
        ctx.shadowColor = 'rgba(56, 189, 248, 0.8)';
        ctx.shadowBlur = 20;

        const grad = ctx.createRadialGradient(
            currentScreenX - radius * 0.3, currentScreenY - radius * 0.35, radius * 0.1,
            currentScreenX, currentScreenY, radius
        );
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.3, '#38bdf8');
        grad.addColorStop(1, '#0284c7');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(currentScreenX, currentScreenY, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }

    drawJumpAnimations() {
        const ctx = this.ctx;
        for (const anim of this.activeAnimations) {
            if (anim.type === 'jump') {
                const { from, to } = anim.jump;
                const fromPos = this.gridToScreen(from.x, from.y);
                const toPos = this.gridToScreen(to.x, to.y);

                const t = anim.progress;
                const curX = fromPos.x + (toPos.x - fromPos.x) * t;
                const curY = fromPos.y + (toPos.y - fromPos.y) * t - Math.sin(t * Math.PI) * this.cellSize * 0.8;

                const radius = this.cellSize * 0.38;

                ctx.save();
                ctx.shadowColor = 'rgba(34, 197, 94, 0.8)';
                ctx.shadowBlur = 16;

                const grad = ctx.createRadialGradient(curX - radius * 0.3, curY - radius * 0.3, 2, curX, curY, radius);
                grad.addColorStop(0, '#bbf7d0');
                grad.addColorStop(0.4, '#22c55e');
                grad.addColorStop(1, '#15803d');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(curX, curY, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
    }

    drawCoordinatesHUD() {
        const ctx = this.ctx;
        if (!this.hoveredCell) return;

        ctx.save();
        const text = `X: ${this.hoveredCell.x}  Y: ${this.hoveredCell.y} ${this.hoveredCell.y > this.engine.lineY ? `(+${this.hoveredCell.y - this.engine.lineY})` : ''}`;
        ctx.font = '500 11px system-ui, -apple-system, sans-serif';
        const w = ctx.measureText(text).width + 18;

        const x = 16;
        const y = this.height - 20;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, y - 18, w, 24, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'left';
        ctx.fillText(text, x + 9, y - 2);
        ctx.restore();
    }
}

window.ConwayRenderer = ConwayRenderer;
