/**
 * Conway's Soldiers Game Engine
 * Manages game state on an infinite 2D integer grid (Z x Z).
 * Supports true infinite half-plane (infinite supply of soldiers) and finite puzzle presets.
 */

class ConwayEngine {
    constructor() {
        this.isInfiniteArmy = true;
        this.lineY = 0; // Dividing line is between lineY and lineY + 1

        // State for Infinite Army Mode:
        // By default, every cell with y <= lineY has a soldier.
        // modified cells are stored in removedKeys and addedSoldiers.
        this.removedKeys = new Set(); // cells <= lineY that were jumped/removed
        this.addedSoldiers = new Map(); // cells > lineY (or re-added <= lineY) that have soldiers

        // State for Finite Preset Mode:
        this.soldiers = new Map(); // "x,y" => {x, y}

        this.moveHistory = [];
        this.redoHistory = [];
        this.moveCount = 0;
        this.peakLevel = 0;
        this.initialState = null;

        this.loadPreset('halfplane');
    }

    _key(x, y) {
        return `${x},${y}`;
    }

    hasSoldier(x, y) {
        const key = this._key(x, y);
        if (this.isInfiniteArmy) {
            if (y <= this.lineY) {
                return !this.removedKeys.has(key);
            } else {
                return this.addedSoldiers.has(key);
            }
        } else {
            return this.soldiers.has(key);
        }
    }

    get soldiersCountDisplay() {
        if (this.isInfiniteArmy) {
            return '∞';
        }
        return this.soldiers.size.toString();
    }

    get soldiersCount() {
        if (this.isInfiniteArmy) {
            return Infinity;
        }
        return this.soldiers.size;
    }

    getHighestRow() {
        if (this.isInfiniteArmy) {
            if (this.addedSoldiers.size === 0) return this.lineY;
            let max = this.lineY;
            for (const s of this.addedSoldiers.values()) {
                if (s.y > max) max = s.y;
            }
            return max;
        } else {
            if (this.soldiers.size === 0) return 0;
            let max = -Infinity;
            for (const s of this.soldiers.values()) {
                if (s.y > max) max = s.y;
            }
            return max;
        }
    }

    getCurrentLevel() {
        const highest = this.getHighestRow();
        return Math.max(0, highest - this.lineY);
    }

    getVisibleSoldiers(minX, maxX, minY, maxY) {
        const list = [];
        if (this.isInfiniteArmy) {
            const startY = Math.max(minY, -1000000);
            const endY = Math.min(maxY, this.lineY);

            for (let y = startY; y <= endY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    if (!this.removedKeys.has(this._key(x, y))) {
                        list.push({ x, y });
                    }
                }
            }

            for (const s of this.addedSoldiers.values()) {
                if (s.x >= minX && s.x <= maxX && s.y >= minY && s.y <= maxY) {
                    list.push(s);
                }
            }
        } else {
            for (const s of this.soldiers.values()) {
                if (s.x >= minX && s.x <= maxX && s.y >= minY && s.y <= maxY) {
                    list.push(s);
                }
            }
        }
        return list;
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

    getPossibleJumpsTo(toX, toY) {
        if (this.hasSoldier(toX, toY)) return [];

        const incoming = [];
        const directions = [
            { dx: 0, dy: 1 },
            { dx: 0, dy: -1 },
            { dx: 1, dy: 0 },
            { dx: -1, dy: 0 }
        ];

        for (const dir of directions) {
            const overX = toX + dir.dx;
            const overY = toY + dir.dy;
            const fromX = toX + dir.dx * 2;
            const fromY = toY + dir.dy * 2;

            if (this.hasSoldier(fromX, fromY) && this.hasSoldier(overX, overY)) {
                incoming.push({
                    from: { x: fromX, y: fromY },
                    over: { x: overX, y: overY },
                    to: { x: toX, y: toY }
                });
            }
        }
        return incoming;
    }

    _removeAt(x, y) {
        const key = this._key(x, y);
        if (this.isInfiniteArmy) {
            if (y <= this.lineY) {
                this.removedKeys.add(key);
            } else {
                this.addedSoldiers.delete(key);
            }
        } else {
            this.soldiers.delete(key);
        }
    }

    _addAt(x, y) {
        const key = this._key(x, y);
        if (this.isInfiniteArmy) {
            if (y <= this.lineY) {
                this.removedKeys.delete(key);
            } else {
                this.addedSoldiers.set(key, { x, y });
            }
        } else {
            this.soldiers.set(key, { x, y });
        }
    }

    executeJump(jump) {
        const { from, over, to } = jump;

        if (!this.hasSoldier(from.x, from.y) ||
            !this.hasSoldier(over.x, over.y) ||
            this.hasSoldier(to.x, to.y)) {
            return { success: false, reason: 'Invalid jump' };
        }

        this._removeAt(from.x, from.y);
        this._removeAt(over.x, over.y);
        this._addAt(to.x, to.y);

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
        if (this.hasSoldier(x, y)) return false;

        this._addAt(x, y);
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
        if (!this.hasSoldier(x, y)) return false;

        this._removeAt(x, y);
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
            this._removeAt(action.to.x, action.to.y);
            this._addAt(action.from.x, action.from.y);
            this._addAt(action.over.x, action.over.y);
            this.moveCount = Math.max(0, this.moveCount - 1);
        } else if (action.type === 'add') {
            this._removeAt(action.cell.x, action.cell.y);
        } else if (action.type === 'remove') {
            this._addAt(action.cell.x, action.cell.y);
        }

        this.redoHistory.push(action);
        return action;
    }

    redo() {
        if (this.redoHistory.length === 0) return null;

        const action = this.redoHistory.pop();
        if (action.type === 'jump') {
            this._removeAt(action.from.x, action.from.y);
            this._removeAt(action.over.x, action.over.y);
            this._addAt(action.to.x, action.to.y);
            this.moveCount++;
            const lvl = this.getCurrentLevel();
            if (lvl > this.peakLevel) this.peakLevel = lvl;
        } else if (action.type === 'add') {
            this._addAt(action.cell.x, action.cell.y);
        } else if (action.type === 'remove') {
            this._removeAt(action.cell.x, action.cell.y);
        }

        this.moveHistory.push(action);
        return action;
    }

    clear() {
        this.isInfiniteArmy = false;
        this.soldiers.clear();
        this.removedKeys.clear();
        this.addedSoldiers.clear();
        this.moveHistory = [];
        this.redoHistory = [];
        this.moveCount = 0;
        this.peakLevel = 0;
    }

    reset() {
        if (this.currentPreset) {
            this.loadPreset(this.currentPreset);
        } else {
            this.loadPreset('halfplane');
        }
    }

    loadPreset(presetName) {
        this.currentPreset = presetName;
        this.lineY = 0;
        this.moveHistory = [];
        this.redoHistory = [];
        this.moveCount = 0;
        this.peakLevel = 0;
        this.soldiers.clear();
        this.removedKeys.clear();
        this.addedSoldiers.clear();

        if (presetName === 'halfplane') {
            // TRUE INFINITE HALF-PLANE:
            // Every cell <= lineY is occupied infinitely across all x and y
            this.isInfiniteArmy = true;
            return;
        }

        // Finite presets:
        this.isInfiniteArmy = false;

        switch (presetName) {
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
                for (let x = -2; x <= 2; x++) {
                    this.soldiers.set(this._key(x, 0), { x, y: 0 });
                }
                this.soldiers.set(this._key(0, -1), { x: 0, y: -1 });
                this.soldiers.set(this._key(0, -2), { x: 0, y: -2 });
                this.soldiers.set(this._key(0, -3), { x: 0, y: -3 });
                break;

            case 'level4':
                // Conway's famous 20-soldier configuration for Level 4
                const conf4 = [
                    { x: -3, y: 0 },
                    { x: -2, y: 0 }, { x: -2, y: -2 },
                    { x: -1, y: 0 }, { x: -1, y: -1 }, { x: -1, y: -2 },
                    { x: 0, y: 0 }, { x: 0, y: -1 }, { x: 0, y: -2 }, { x: 0, y: -3 },
                    { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 1, y: -2 }, { x: 1, y: -3 },
                    { x: 2, y: 0 }, { x: 2, y: -1 }, { x: 2, y: -2 },
                    { x: 3, y: 0 }, { x: 3, y: -1 }, { x: 3, y: -2 }
                ];
                for (const pos of conf4) {
                    this.soldiers.set(this._key(pos.x, pos.y), { ...pos });
                }
                break;

            case 'empty':
                break;
        }
    }

    getBoundingBox() {
        if (this.isInfiniteArmy) {
            // Focus around (0, 0) and any advanced soldiers
            let minY = -4, maxY = 2, minX = -6, maxX = 6;
            for (const s of this.addedSoldiers.values()) {
                if (s.x < minX) minX = s.x - 2;
                if (s.x > maxX) maxX = s.x + 2;
                if (s.y > maxY) maxY = s.y + 2;
            }
            return { minX, maxX, minY, maxY };
        } else {
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
}

window.ConwayEngine = ConwayEngine;
