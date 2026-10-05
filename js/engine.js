/**
 * Conway's Soldiers Game Engine
 * Manages game state on an infinite 2D integer grid (Z x Z).
 */

class ConwayEngine {
    constructor() {
        this.soldiers = new Map(); // key "x,y" => {x, y}
        this.lineY = 0; // Dividing line is between lineY and lineY + 1
        this.moveHistory = [];
        this.redoHistory = [];
        this.moveCount = 0;
        this.peakLevel = 0;
        this.initialState = null;

        // Load default preset
        this.loadPreset('halfplane');
    }

    _key(x, y) {
        return `${x},${y}`;
    }

    hasSoldier(x, y) {
        return this.soldiers.has(this._key(x, y));
    }

    getSoldier(x, y) {
        return this.soldiers.get(this._key(x, y));
    }

    get soldiersCount() {
        return this.soldiers.size;
    }

    getHighestRow() {
        if (this.soldiers.size === 0) return 0;
        let max = -Infinity;
        for (const s of this.soldiers.values()) {
            if (s.y > max) max = s.y;
        }
        return max;
    }

    getCurrentLevel() {
        const highest = this.getHighestRow();
        return Math.max(0, highest - this.lineY);
    }

    getValidJumpsFor(x, y) {
        if (!this.hasSoldier(x, y)) return [];

        const jumps = [];
        const directions = [
            { dx: 0, dy: 1, name: 'north' },
            { dx: 0, dy: -1, name: 'south' },
            { dx: 1, dy: 0, name: 'east' },
            { dx: -1, dy: 0, name: 'west' }
        ];

        for (const dir of directions) {
            const overX = x + dir.dx;
            const overY = y + dir.dy;
            const toX = x + dir.dx * 2;
            const toY = y + dir.dy * 2;

            if (this.hasSoldier(overX, overY) && !this.hasSoldier(toX, toY)) {
                jumps.push({
                    from: { x, y },
                    over: { x: overX, y: overY },
                    to: { x: toX, y: toY },
                    direction: dir.name
                });
            }
        }
        return jumps;
    }

    getAllValidJumps() {
        const allJumps = [];
        for (const s of this.soldiers.values()) {
            const jumps = this.getValidJumpsFor(s.x, s.y);
            if (jumps.length > 0) {
                allJumps.push(...jumps);
            }
        }
        return allJumps;
    }

    executeJump(jump) {
        const { from, over, to } = jump;

        if (!this.hasSoldier(from.x, from.y) ||
            !this.hasSoldier(over.x, over.y) ||
            this.hasSoldier(to.x, to.y)) {
            return { success: false, reason: 'Invalid jump' };
        }

        this.soldiers.delete(this._key(from.x, from.y));
        this.soldiers.delete(this._key(over.x, over.y));
        this.soldiers.set(this._key(to.x, to.y), { x: to.x, y: to.y });

        this.moveCount++;
        this.moveHistory.push({
            type: 'jump',
            from: { ...from },
            over: { ...over },
            to: { ...to }
        });
        this.redoHistory = [];

        const currentLevel = this.getCurrentLevel();
        let isNewRecord = false;
        if (currentLevel > this.peakLevel) {
            this.peakLevel = currentLevel;
            isNewRecord = true;
        }

        return {
            success: true,
            level: currentLevel,
            isNewRecord,
            jump
        };
    }

    addSoldier(x, y, recordHistory = true) {
        const key = this._key(x, y);
        if (this.soldiers.has(key)) return false;

        this.soldiers.set(key, { x, y });
        if (recordHistory) {
            this.moveHistory.push({
                type: 'add',
                cell: { x, y }
            });
            this.redoHistory = [];
        }

        const lvl = this.getCurrentLevel();
        if (lvl > this.peakLevel) this.peakLevel = lvl;
        return true;
    }

    removeSoldier(x, y, recordHistory = true) {
        const key = this._key(x, y);
        if (!this.soldiers.has(key)) return false;

        this.soldiers.delete(key);
        if (recordHistory) {
            this.moveHistory.push({
                type: 'remove',
                cell: { x, y }
            });
            this.redoHistory = [];
        }
        return true;
    }

    toggleSoldier(x, y) {
        if (this.hasSoldier(x, y)) {
            this.removeSoldier(x, y);
            return 'removed';
        } else {
            this.addSoldier(x, y);
            return 'added';
        }
    }

    undo() {
        if (this.moveHistory.length === 0) return null;

        const action = this.moveHistory.pop();
        if (action.type === 'jump') {
            this.soldiers.delete(this._key(action.to.x, action.to.y));
            this.soldiers.set(this._key(action.from.x, action.from.y), { ...action.from });
            this.soldiers.set(this._key(action.over.x, action.over.y), { ...action.over });
            this.moveCount = Math.max(0, this.moveCount - 1);
        } else if (action.type === 'add') {
            this.soldiers.delete(this._key(action.cell.x, action.cell.y));
        } else if (action.type === 'remove') {
            this.soldiers.set(this._key(action.cell.x, action.cell.y), { ...action.cell });
        } else if (action.type === 'batch') {
            for (const c of action.added) {
                this.soldiers.delete(this._key(c.x, c.y));
            }
            for (const c of action.removed) {
                this.soldiers.set(this._key(c.x, c.y), { ...c });
            }
            this.moveCount = action.prevMoveCount;
            this.peakLevel = action.prevPeakLevel;
        }

        this.redoHistory.push(action);
        return action;
    }

    redo() {
        if (this.redoHistory.length === 0) return null;

        const action = this.redoHistory.pop();
        if (action.type === 'jump') {
            this.soldiers.delete(this._key(action.from.x, action.from.y));
            this.soldiers.delete(this._key(action.over.x, action.over.y));
            this.soldiers.set(this._key(action.to.x, action.to.y), { ...action.to });
            this.moveCount++;
            const lvl = this.getCurrentLevel();
            if (lvl > this.peakLevel) this.peakLevel = lvl;
        } else if (action.type === 'add') {
            this.soldiers.set(this._key(action.cell.x, action.cell.y), { ...action.cell });
        } else if (action.type === 'remove') {
            this.soldiers.delete(this._key(action.cell.x, action.cell.y));
        } else if (action.type === 'batch') {
            for (const c of action.removed) {
                this.soldiers.delete(this._key(c.x, c.y));
            }
            for (const c of action.added) {
                this.soldiers.set(this._key(c.x, c.y), { ...c });
            }
            this.moveCount = action.newMoveCount;
            this.peakLevel = action.newPeakLevel;
        }

        this.moveHistory.push(action);
        return action;
    }

    clear() {
        const removed = Array.from(this.soldiers.values());
        this.moveHistory.push({
            type: 'batch',
            added: [],
            removed,
            prevMoveCount: this.moveCount,
            prevPeakLevel: this.peakLevel,
            newMoveCount: 0,
            newPeakLevel: 0
        });
        this.redoHistory = [];
        this.soldiers.clear();
        this.moveCount = 0;
        this.peakLevel = 0;
    }

    reset() {
        if (this.initialState) {
            this.soldiers.clear();
            for (const s of this.initialState.soldiers) {
                this.soldiers.set(this._key(s.x, s.y), { ...s });
            }
            this.lineY = this.initialState.lineY;
            this.moveHistory = [];
            this.redoHistory = [];
            this.moveCount = 0;
            this.peakLevel = this.getCurrentLevel();
        } else {
            this.loadPreset('halfplane');
        }
    }

    setInitialStateSnapshot() {
        this.initialState = {
            lineY: this.lineY,
            soldiers: Array.from(this.soldiers.values()).map(s => ({ ...s }))
        };
    }

    fillHalfPlane(minX = -20, maxX = 20, minY = -10, maxY = 0) {
        this.soldiers.clear();
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                this.soldiers.set(this._key(x, y), { x, y });
            }
        }
        this.lineY = 0;
        this.moveHistory = [];
        this.redoHistory = [];
        this.moveCount = 0;
        this.peakLevel = 0;
        this.setInitialStateSnapshot();
    }

    loadPreset(presetName) {
        this.soldiers.clear();
        this.lineY = 0;
        this.moveHistory = [];
        this.redoHistory = [];
        this.moveCount = 0;
        this.peakLevel = 0;

        switch (presetName) {
            case 'halfplane':
                // Dense half-plane 33 columns wide x 8 rows deep
                for (let y = -7; y <= 0; y++) {
                    for (let x = -16; x <= 16; x++) {
                        this.soldiers.set(this._key(x, y), { x, y });
                    }
                }
                break;

            case 'level1':
                // Minimal 2 soldiers to reach level 1 (y = 1)
                this.soldiers.set(this._key(0, 0), { x: 0, y: 0 });
                this.soldiers.set(this._key(0, -1), { x: 0, y: -1 });
                break;

            case 'level2':
                // Minimal 4 soldiers to reach level 2 (y = 2)
                this.soldiers.set(this._key(0, 0), { x: 0, y: 0 });
                this.soldiers.set(this._key(0, -1), { x: 0, y: -1 });
                this.soldiers.set(this._key(-1, 0), { x: -1, y: 0 });
                this.soldiers.set(this._key(-2, 0), { x: -2, y: 0 });
                break;

            case 'level3':
                // Minimal 8 soldiers to reach level 3 (y = 3)
                // Row 0: x from -2 to +2
                for (let x = -2; x <= 2; x++) {
                    this.soldiers.set(this._key(x, 0), { x, y: 0 });
                }
                // Col 0: y from -1 to -3
                this.soldiers.set(this._key(0, -1), { x: 0, y: -1 });
                this.soldiers.set(this._key(0, -2), { x: 0, y: -2 });
                this.soldiers.set(this._key(0, -3), { x: 0, y: -3 });
                break;

            case 'level4':
                // Conway's famous 20-soldier configuration for Level 4
                // Centers column 0 at target
                // Target is at (0, 4)
                const conf4 = [
                    // Col -3: ( -3, 0 )
                    { x: -3, y: 0 },
                    // Col -2: ( -2, 0 ), ( -2, -2 )
                    { x: -2, y: 0 }, { x: -2, y: -2 },
                    // Col -1: ( -1, 0 ), ( -1, -1 ), ( -1, -2 )
                    { x: -1, y: 0 }, { x: -1, y: -1 }, { x: -1, y: -2 },
                    // Col 0: ( 0, 0 ), ( 0, -1 ), ( 0, -2 ), ( 0, -3 )
                    { x: 0, y: 0 }, { x: 0, y: -1 }, { x: 0, y: -2 }, { x: 0, y: -3 },
                    // Col 1: ( 1, 0 ), ( 1, -1 ), ( 1, -2 ), ( 1, -3 )
                    { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 1, y: -2 }, { x: 1, y: -3 },
                    // Col 2: ( 2, 0 ), ( 2, -1 ), ( 2, -2 )
                    { x: 2, y: 0 }, { x: 2, y: -1 }, { x: 2, y: -2 },
                    // Col 3: ( 3, 0 ), ( 3, -1 ), ( 3, -2 )
                    { x: 3, y: 0 }, { x: 3, y: -1 }, { x: 3, y: -2 }
                ];
                for (const pos of conf4) {
                    this.soldiers.set(this._key(pos.x, pos.y), { ...pos });
                }
                break;

            case 'empty':
                // Blank canvas for user creation
                break;
        }

        this.setInitialStateSnapshot();
        return this.soldiersCount;
    }

    getBoundingBox() {
        if (this.soldiers.size === 0) {
            return { minX: -5, maxX: 5, minY: -5, maxY: 5 };
        }
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        for (const s of this.soldiers.values()) {
            if (s.x < minX) minX = s.x;
            if (s.x > maxX) maxX = s.x;
            if (s.y < minY) minY = s.y;
            if (s.y > maxY) maxY = s.y;
        }
        return { minX, maxX, minY, maxY };
    }
}

window.ConwayEngine = ConwayEngine;
