/**
 * Conway's Soldiers - Main Application Controller
 * Ultra-responsive Pointer Events: instant reaction on touch/click (zero holding required),
 * smart jumps, multi-touch pinch-to-zoom, infinite army controls.
 */

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const engine = new ConwayEngine();
    const renderer = new ConwayRenderer(canvas, engine);

    // Interaction State
    let mode = 'play'; // 'play' | 'edit'
    let editBrush = 'toggle';
    let spacePressed = false;

    // Active Pointer Tracking (for unified mouse & multi-touch gestures)
    const activePointers = new Map();
    let initialPinchDistance = null;
    let isPanningBoard = false;
    let pointerDownPiece = null; // { x, y, startX, startY, hasMoved }

    // Prevent default context menu (long press on mobile or right click)
    window.addEventListener('contextmenu', e => {
        if (e.target === canvas) e.preventDefault();
    });

    let currentLang = 'ru';

    const i18n = {
        ru: {
            title: "Солдаты Конвея",
            subtitle: "Бесконечное поле",
            modePlay: "Игра",
            modeEdit: "Редактор",
            moves: "Ходов:",
            soldiers: "Солдат:",
            maxLevel: "Рекорд:",
            level: "Уровень",
            undo: "Отменить (Ctrl+Z)",
            redo: "Повторить (Ctrl+Y)",
            presets: "Пресеты",
            recenter: "Центрировать",
            reset: "Сброс",
            clear: "Очистить",
            help: "Правила и теория",
            soundOn: "Звук: Вкл",
            soundOff: "Звук: Выкл",
            recordToast: "Новый рекорд! Достигнут Уровень +",
            impossibleNotice: "Уровень 5 математически недостижим!",
            presetHalfplane: "Бесконечная армия (Вся полуплоскость)",
            presetLevel1: "Уровень 1 (2 солдата)",
            presetLevel2: "Уровень 2 (4 солдата)",
            presetLevel3: "Уровень 3 (8 солдат)",
            presetLevel4: "Уровень 4 (20 солдат Конвея)",
            presetEmpty: "Пустое поле (Песочница)",
            close: "Закрыть",
            rulesTitle: "Правила и Математическая Теорема",
            rulesContent: `
                <p><strong>Солдаты Конвея</strong> (Армия Конвея, 1961 г.) — математическая головоломка Джона Хортона Конвея на <strong>бесконечной клетчатой доске</strong>.</p>
                <h4>Правила прыжков:</h4>
                <ul>
                    <li>Доска разделена горизонтальной <strong>стартовой чертой</strong> (y = 0).</li>
                    <li>Вся бесконечная нижняя полуплоскость (y &le; 0) заполнена <strong>бесконечным числом солдат</strong>.</li>
                    <li>Солдат перепрыгивает через соседнего солдата по горизонтали или вертикали на свободную клетку. Перепрыгнутый солдат снимается с доски.</li>
                    <li><strong>Мгновенный ход в 1 касание:</strong> коснитесь шара — сразу появятся зеленые цели. Коснитесь цели — шар мгновенно прыгнет! Зажимать ничего не нужно.</li>
                    <li><strong>Умный ход:</strong> можно просто нажать на пустую клетку перед солдатом, и он сразу туда прыгнет.</li>
                    <li><strong>Цель:</strong> продвинуть хотя бы одного солдата как можно выше за черту (на уровни +1, +2, +3, +4...).</li>
                </ul>
                <h4>Теорема Конвея о недостижимости 5-го уровня:</h4>
                <p>Джон Конвей доказал, что за <strong>любое конечное число ходов</strong> невозможно продвинуть солдата на 5-й ряд (y = 5)!</p>
                <p>Доказательство строится на инварианте с золотым сечением &phi; = (&radic;5 - 1)/2 &asymp; 0.618. Суммарный вес всей бесконечной нижней полуплоскости для цели на 5-м ряду равен 1. Так как любая конечная последовательность ходов имеет строго меньший вес (&lt; 1), достичь 5-го уровня конечным числом ходов математически невозможно!</p>
                <h4>Управление:</h4>
                <ul>
                    <li><strong>Прыжок:</strong> Нажмите на шар &rarr; нажмите на зеленую цель. Либо сразу нажмите на пустую клетку приземления.</li>
                    <li><strong>Перемещение поля:</strong> Двигайте пустое поле пальцем или мышью.</li>
                    <li><strong>Масштаб:</strong> Колёсико мыши или щипок двумя пальцами.</li>
                    <li><strong>Горячие клавиши:</strong> <code>Ctrl+Z</code> (отмена), <code>Ctrl+Y</code> (повтор), <code>R</code> (сброс), <code>E</code> (редактор).</li>
                </ul>
            `
        },
        en: {
            title: "Conway's Soldiers",
            subtitle: "Infinite Grid Edition",
            modePlay: "Play",
            modeEdit: "Edit",
            moves: "Moves:",
            soldiers: "Soldiers:",
            maxLevel: "Record:",
            level: "Level",
            undo: "Undo (Ctrl+Z)",
            redo: "Redo (Ctrl+Y)",
            presets: "Presets",
            recenter: "Recenter",
            reset: "Reset",
            clear: "Clear",
            help: "Rules & Math",
            soundOn: "Sound: On",
            soundOff: "Sound: Off",
            recordToast: "New Record! Reached Level +",
            impossibleNotice: "Level 5 is mathematically impossible!",
            presetHalfplane: "Infinite Army (Entire Half-plane)",
            presetLevel1: "Level 1 Challenge (2 soldiers)",
            presetLevel2: "Level 2 Challenge (4 soldiers)",
            presetLevel3: "Level 3 Challenge (8 soldiers)",
            presetLevel4: "Level 4 Challenge (20 soldiers)",
            presetEmpty: "Blank Canvas (Sandbox)",
            close: "Close",
            rulesTitle: "Rules & Mathematical Theorem",
            rulesContent: `
                <p><strong>Conway's Soldiers</strong> (1961) is John Conway's mathematical puzzle played on an <strong>infinite checkerboard</strong>.</p>
                <h4>Rules:</h4>
                <ul>
                    <li>The board is divided by a <strong>starting line</strong> (y = 0).</li>
                    <li>The entire lower half-plane (y &le; 0) is packed with an <strong>infinite army of soldiers</strong>.</li>
                    <li>A soldier jumps horizontally or vertically over an orthogonally adjacent soldier into an empty space immediately beyond. The jumped soldier is removed.</li>
                    <li><strong>Instant 1-Touch Moves:</strong> Tap a soldier to see green targets, then tap the target. No holding or pressing down required!</li>
                    <li><strong>Smart Move:</strong> Tap an empty landing square to jump directly.</li>
                    <li><strong>Goal:</strong> Advance a soldier as far north (Level +1, +2, +3, +4...) as possible.</li>
                </ul>
                <h4>Conway's Impossibility Theorem:</h4>
                <p>Conway proved that row 5 (Level 5) cannot be reached in any finite number of moves!</p>
                <p>Weights based on the golden ratio &phi; = (&radic;5 - 1)/2 show that the entire half-plane has total weight 1 towards row 5, but any finite army has weight strictly less than 1. Since valid jumps never increase total weight, reaching row 5 is impossible!</p>
                <h4>Controls:</h4>
                <ul>
                    <li><strong>Jump:</strong> Tap soldier &rarr; tap green target. Or tap an empty square directly!</li>
                    <li><strong>Pan:</strong> Drag empty space with finger or mouse.</li>
                    <li><strong>Zoom:</strong> Mouse wheel or pinch gesture.</li>
                    <li><strong>Shortcuts:</strong> <code>Ctrl+Z</code> (undo), <code>Ctrl+Y</code> (redo), <code>R</code> (reset), <code>E</code> (edit mode).</li>
                </ul>
            `
        }
    };

    function updateLanguage(lang) {
        currentLang = lang;
        const dict = i18n[lang];

        document.getElementById('app-title').textContent = dict.title;
        document.getElementById('app-subtitle').textContent = dict.subtitle;
        document.getElementById('lbl-moves').textContent = dict.moves;
        document.getElementById('lbl-soldiers').textContent = dict.soldiers;
        document.getElementById('lbl-record').textContent = dict.maxLevel;

        document.getElementById('btn-play-mode').innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg> ${dict.modePlay}`;
        document.getElementById('btn-edit-mode').innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> ${dict.modeEdit}`;

        document.getElementById('btn-undo').title = dict.undo;
        document.getElementById('btn-redo').title = dict.redo;
        document.getElementById('btn-recenter').title = dict.recenter;
        document.getElementById('btn-presets').innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> ${dict.presets}`;
        document.getElementById('btn-reset').title = dict.reset;
        document.getElementById('btn-clear').title = dict.clear;
        document.getElementById('btn-help').title = dict.help;

        document.getElementById('modal-rules-title').textContent = dict.rulesTitle;
        document.getElementById('modal-rules-body').innerHTML = dict.rulesContent;
        document.getElementById('modal-rules-close').textContent = dict.close;
        document.getElementById('modal-presets-close').textContent = dict.close;

        document.getElementById('preset-halfplane-label').textContent = dict.presetHalfplane;
        document.getElementById('preset-level1-label').textContent = dict.presetLevel1;
        document.getElementById('preset-level2-label').textContent = dict.presetLevel2;
        document.getElementById('preset-level3-label').textContent = dict.presetLevel3;
        document.getElementById('preset-level4-label').textContent = dict.presetLevel4;
        document.getElementById('preset-empty-label').textContent = dict.presetEmpty;

        document.getElementById('btn-lang-toggle').textContent = lang === 'ru' ? 'EN' : 'RU';
        updateStatsHUD();
    }

    function updateStatsHUD() {
        document.getElementById('stat-moves').textContent = engine.moveCount;
        document.getElementById('stat-soldiers').textContent = engine.soldiersCountDisplay;

        const peakLvl = engine.peakLevel;
        const recordElem = document.getElementById('stat-record');

        if (peakLvl > 0) {
            recordElem.textContent = `+${peakLvl}`;
            recordElem.className = peakLvl >= 4 ? 'stat-value record-badge-gold' : 'stat-value record-badge-cyan';
        } else {
            recordElem.textContent = '0';
            recordElem.className = 'stat-value';
        }

        document.getElementById('btn-undo').disabled = engine.moveHistory.length === 0;
        document.getElementById('btn-redo').disabled = engine.redoHistory.length === 0;
    }

    function showToast(msg, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = msg;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-fadeout');
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }

    // ----------------------------------------------------
    // Unified Pointer Events (Zero-latency Touch & Mouse)
    // ----------------------------------------------------

    function onPointerDown(e) {
        try {
            canvas.setPointerCapture(e.pointerId);
        } catch (_) {}

        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;

        activePointers.set(e.pointerId, { x: clientX, y: clientY });

        // Two-finger pinch gesture start
        if (activePointers.size === 2) {
            isPanningBoard = false;
            pointerDownPiece = null;
            renderer.draggedPiece = null;
            const pts = Array.from(activePointers.values());
            initialPinchDistance = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
            return;
        }

        if (activePointers.size > 2) return;

        const grid = renderer.screenToGrid(clientX, clientY);

        if (mode === 'edit') {
            const has = engine.hasSoldier(grid.x, grid.y);
            editBrush = has ? 'remove' : 'add';
            if (editBrush === 'add') {
                engine.addSoldier(grid.x, grid.y);
                window.soundFx.playAdd();
            } else {
                engine.removeSoldier(grid.x, grid.y);
                window.soundFx.playRemove();
            }
            updateStatsHUD();
            return;
        }

        // --- PLAY MODE: 100% INSTANT RESPONSE (0ms delay, zero holding needed) ---

        // 1. If currently a soldier is selected and user tapped its valid target:
        if (renderer.selectedSoldier && renderer.validJumps.length > 0) {
            const jump = renderer.validJumps.find(j => j.to.x === grid.x && j.to.y === grid.y);
            if (jump) {
                executeJump(jump);
                pointerDownPiece = null;
                renderer.draggedPiece = null;
                isPanningBoard = false;
                return;
            }
        }

        // 2. Tapped on a soldier:
        if (engine.hasSoldier(grid.x, grid.y)) {
            const validJumps = engine.getValidJumpsFor(grid.x, grid.y);

            if (validJumps.length > 0) {
                // Soldier has moves: select it immediately!
                if (renderer.selectedSoldier && renderer.selectedSoldier.x === grid.x && renderer.selectedSoldier.y === grid.y) {
                    renderer.setSelectedSoldier(null);
                    window.soundFx.playDeselect();
                } else {
                    renderer.setSelectedSoldier(grid);
                    window.soundFx.playSelect();
                }

                pointerDownPiece = {
                    gridX: grid.x,
                    gridY: grid.y,
                    startX: clientX,
                    startY: clientY,
                    isJumper: true
                };
                isPanningBoard = false;
                return;
            } else {
                // Soldier cannot jump directly (e.g. front-line piece at row 0).
                // Check if a soldier behind it can jump OVER it!
                const jumpers = engine.getJumpersOver(grid.x, grid.y);
                if (jumpers.length >= 1) {
                    // Intuitively execute that jump forward for the player!
                    executeJump(jumpers[0]);
                    pointerDownPiece = null;
                    isPanningBoard = false;
                    return;
                } else {
                    window.soundFx.playDeselect();
                    showToast(currentLang === 'ru' ? 'Этот шар заблокирован. Выберите шар с сияющей подсветкой!' : 'This soldier is blocked. Select a glowing soldier!', 'info');
                    pointerDownPiece = null;
                    isPanningBoard = false;
                    return;
                }
            }
        }

        // 3. Tapped on an empty cell: Smart Jump!
        const incoming = engine.getPossibleJumpsTo(grid.x, grid.y);
        if (incoming.length >= 1) {
            // Instant 1-touch jump into destination!
            executeJump(incoming[0]);
            pointerDownPiece = null;
            isPanningBoard = false;
            return;
        }

        // 4. Clicked empty space: deselect and prepare for board panning
        if (renderer.selectedSoldier) {
            renderer.setSelectedSoldier(null);
            window.soundFx.playDeselect();
        }

        isPanningBoard = true;
        pointerDownPiece = {
            gridX: grid.x,
            gridY: grid.y,
            startX: clientX,
            startY: clientY,
            isJumper: false
        };
    }

    function onPointerMove(e) {
        if (!activePointers.has(e.pointerId)) {
            const rect = canvas.getBoundingClientRect();
            renderer.updateHover(e.clientX - rect.left, e.clientY - rect.top);
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;

        const prevPos = activePointers.get(e.pointerId);
        const dx = clientX - prevPos.x;
        const dy = clientY - prevPos.y;

        activePointers.set(e.pointerId, { x: clientX, y: clientY });

        // Two-finger Pinch Zoom
        if (activePointers.size === 2) {
            const pts = Array.from(activePointers.values());
            const currentDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
            const midX = (pts[0].x + pts[1].x) / 2;
            const midY = (pts[0].y + pts[1].y) / 2;

            if (initialPinchDistance) {
                const delta = currentDist > initialPinchDistance ? 1 : -1;
                if (Math.abs(currentDist - initialPinchDistance) > 10) {
                    renderer.zoom(delta, midX, midY);
                    initialPinchDistance = currentDist;
                }
            }
            return;
        }

        // Single Pointer Move: Edit mode painting
        if (mode === 'edit' && pointerDownPiece) {
            const grid = renderer.screenToGrid(clientX, clientY);
            if (editBrush === 'add') {
                if (engine.addSoldier(grid.x, grid.y)) window.soundFx.playAdd();
            } else {
                if (engine.removeSoldier(grid.x, grid.y)) window.soundFx.playRemove();
            }
            updateStatsHUD();
            return;
        }

        // Single Pointer Move: Dragging piece or panning board
        if (pointerDownPiece && pointerDownPiece.isJumper) {
            const dist = Math.hypot(clientX - pointerDownPiece.startX, clientY - pointerDownPiece.startY);
            if (dist > 10) {
                // User is dragging the soldier token
                renderer.draggedPiece = {
                    from: { x: pointerDownPiece.gridX, y: pointerDownPiece.gridY },
                    currentScreenX: clientX,
                    currentScreenY: clientY
                };
            }
        } else if (isPanningBoard || spacePressed || e.buttons === 4) {
            renderer.pan(dx, dy);
            canvas.style.cursor = 'grabbing';
        }

        renderer.updateHover(clientX, clientY);
    }

    function onPointerUp(e) {
        try {
            canvas.releasePointerCapture(e.pointerId);
        } catch (_) {}

        activePointers.delete(e.pointerId);
        if (activePointers.size < 2) {
            initialPinchDistance = null;
        }

        // If a piece was being dragged, check if dropped on a valid landing target
        if (renderer.draggedPiece) {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.clientX - rect.left;
            const clientY = e.clientY - rect.top;
            const dropGrid = renderer.screenToGrid(clientX, clientY);

            const jump = renderer.validJumps.find(j => j.to.x === dropGrid.x && j.to.y === dropGrid.y);
            renderer.draggedPiece = null;

            if (jump) {
                executeJump(jump);
            }
        }

        isPanningBoard = false;
        pointerDownPiece = null;
        canvas.style.cursor = spacePressed ? 'grab' : 'default';
    }

    function onPointerCancel(e) {
        activePointers.delete(e.pointerId);
        initialPinchDistance = null;
        isPanningBoard = false;
        pointerDownPiece = null;
        renderer.draggedPiece = null;
        canvas.style.cursor = 'default';
    }

    function executeJump(jump) {
        window.soundFx.playJump();
        renderer.setSelectedSoldier(null);

        renderer.addJumpAnimation(jump, () => {
            const result = engine.executeJump(jump);
            if (result.success) {
                if (result.isNewRecord) {
                    window.soundFx.playLevelUp();
                    showToast(`${i18n[currentLang].recordToast} ${result.level}! 🎯`, 'success');
                }
                updateStatsHUD();
            }
        });
    }

    // Attach Unified Pointer Listeners
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);

    // Mouse Wheel Zoom
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const delta = e.deltaY < 0 ? 1 : -1;
        renderer.zoom(delta, px, py);
    }, { passive: false });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.code === 'Space' && !spacePressed) {
            spacePressed = true;
            canvas.style.cursor = 'grab';
        } else if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
            e.preventDefault();
            if (e.shiftKey) {
                handleRedo();
            } else {
                handleUndo();
            }
        } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
            e.preventDefault();
            handleRedo();
        } else if (e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') {
            handleReset();
        } else if (e.key === 'e' || e.key === 'E' || e.key === 'у' || e.key === 'У') {
            setMode(mode === 'play' ? 'edit' : 'play');
        } else if (e.key === 'Escape') {
            renderer.setSelectedSoldier(null);
            closeAllModals();
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            spacePressed = false;
            canvas.style.cursor = 'default';
        }
    });

    // ----------------------------------------------------
    // UI Button Handlers
    // ----------------------------------------------------

    function setMode(newMode) {
        mode = newMode;
        renderer.setSelectedSoldier(null);

        const btnPlay = document.getElementById('btn-play-mode');
        const btnEdit = document.getElementById('btn-edit-mode');

        if (mode === 'play') {
            btnPlay.classList.add('active');
            btnEdit.classList.remove('active');
        } else {
            btnPlay.classList.remove('active');
            btnEdit.classList.add('active');
        }
    }

    function handleUndo() {
        const action = engine.undo();
        if (action) {
            window.soundFx.playUndo();
            renderer.setSelectedSoldier(null);
            updateStatsHUD();
        }
    }

    function handleRedo() {
        const action = engine.redo();
        if (action) {
            window.soundFx.playJump();
            renderer.setSelectedSoldier(null);
            updateStatsHUD();
        }
    }

    function handleReset() {
        engine.reset();
        renderer.setSelectedSoldier(null);
        renderer.recenter(true);
        updateStatsHUD();
    }

    function handleClear() {
        engine.clear();
        renderer.setSelectedSoldier(null);
        updateStatsHUD();
    }

    document.getElementById('btn-play-mode').addEventListener('click', () => setMode('play'));
    document.getElementById('btn-edit-mode').addEventListener('click', () => setMode('edit'));
    document.getElementById('btn-undo').addEventListener('click', handleUndo);
    document.getElementById('btn-redo').addEventListener('click', handleRedo);
    document.getElementById('btn-recenter').addEventListener('click', () => renderer.recenter(true));
    document.getElementById('btn-reset').addEventListener('click', handleReset);
    document.getElementById('btn-clear').addEventListener('click', handleClear);

    document.getElementById('btn-zoom-in').addEventListener('click', () => renderer.zoom(1));
    document.getElementById('btn-zoom-out').addEventListener('click', () => renderer.zoom(-1));

    const btnSound = document.getElementById('btn-sound-toggle');
    function updateSoundBtn() {
        btnSound.innerHTML = window.soundFx.enabled 
            ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`
            : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>`;
        btnSound.title = window.soundFx.enabled ? i18n[currentLang].soundOn : i18n[currentLang].soundOff;
    }
    btnSound.addEventListener('click', () => {
        window.soundFx.toggle();
        updateSoundBtn();
    });
    updateSoundBtn();

    document.getElementById('btn-lang-toggle').addEventListener('click', () => {
        updateLanguage(currentLang === 'ru' ? 'en' : 'ru');
    });

    const modalRules = document.getElementById('modal-rules');
    const modalPresets = document.getElementById('modal-presets');

    function closeAllModals() {
        modalRules.classList.remove('active');
        modalPresets.classList.remove('active');
    }

    document.getElementById('btn-help').addEventListener('click', () => {
        modalRules.classList.add('active');
    });
    document.getElementById('modal-rules-close').addEventListener('click', () => {
        modalRules.classList.remove('active');
    });
    document.getElementById('modal-rules-backdrop').addEventListener('click', () => {
        modalRules.classList.remove('active');
    });

    document.getElementById('btn-presets').addEventListener('click', () => {
        modalPresets.classList.add('active');
    });
    document.getElementById('modal-presets-close').addEventListener('click', () => {
        modalPresets.classList.remove('active');
    });
    document.getElementById('modal-presets-backdrop').addEventListener('click', () => {
        modalPresets.classList.remove('active');
    });

    document.querySelectorAll('.preset-card').forEach(card => {
        card.addEventListener('click', () => {
            const preset = card.getAttribute('data-preset');
            engine.loadPreset(preset);
            renderer.setSelectedSoldier(null);
            renderer.recenter(true);
            updateStatsHUD();
            closeAllModals();
            window.soundFx.playSelect();
        });
    });

    window.addEventListener('resize', () => {
        renderer.resize();
    });

    function frame(now) {
        renderer.render(now);
        requestAnimationFrame(frame);
    }

    updateLanguage('ru');
    renderer.recenter(false);
    requestAnimationFrame(frame);
});
