/**
 * Conway's Soldiers - Main Application Controller
 * High-responsiveness click-to-move (no holding required),
 * smart jumps, gesture handling and infinite field controls.
 */

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const engine = new ConwayEngine();
    const renderer = new ConwayRenderer(canvas, engine);

    // Interaction State
    let mode = 'play'; // 'play' | 'edit'
    let editBrush = 'toggle';
    let isMouseDown = false;
    let isDraggingBoard = false;
    let isPieceInteraction = false;
    let startMouseX = 0;
    let startMouseY = 0;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let dragDistance = 0;
    let spacePressed = false;

    // Touch gesture state
    let initialPinchDistance = null;

    // Prevent default context menu so holding right click / long tap never blocks game
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
                    <li><strong>Управление в 1 клик:</strong> просто нажмите на солдата (появятся зеленые точки приземления) и нажмите на точку. Зажимать ничего не нужно!</li>
                    <li><strong>Цель:</strong> продвинуть хотя бы одного солдата как можно выше за черту (на уровни +1, +2, +3, +4...).</li>
                </ul>
                <h4>Теорема Конвея о недостижимости 5-го уровня:</h4>
                <p>Джон Конвей математически доказал, что за <strong>любое конечное число ходов</strong> невозможно продвинуть солдата на 5-й ряд (y = 5)!</p>
                <p>Доказательство строится на инварианте с золотым сечением &phi; = (&radic;5 - 1)/2 &asymp; 0.618. Суммарный вес всей бесконечной нижней полуплоскости для цели на 5-м ряду равен 1. Так как любая конечная последовательность ходов задействует лишь конечное подмножество солдат со строгим весом &lt; 1, достичь 5-го уровня невозможно!</p>
                <h4>Управление:</h4>
                <ul>
                    <li><strong>Прыжок:</strong> Клик по шару &rarr; клик по зеленой цели. Либо клик по пустой клетке, куда возможен прыжок!</li>
                    <li><strong>Перемещение поля:</strong> Перетаскивайте пустое поле мышью или пальцем.</li>
                    <li><strong>Масштаб:</strong> Колёсико мыши или жест щипка.</li>
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
                    <li><strong>1-Click Moves:</strong> Click a soldier to see green landing targets, then click the target. No holding down needed!</li>
                    <li><strong>Goal:</strong> Advance a soldier as far north (Level +1, +2, +3, +4...) as possible.</li>
                </ul>
                <h4>Conway's Impossibility Theorem:</h4>
                <p>Conway proved that row 5 (Level 5) cannot be reached in any finite number of moves!</p>
                <p>Weights based on the golden ratio &phi; = (&radic;5 - 1)/2 show that the entire half-plane has total weight 1 towards row 5, but any finite army has weight strictly less than 1. Since valid jumps never increase total weight, reaching row 5 is impossible!</p>
                <h4>Controls:</h4>
                <ul>
                    <li><strong>Jump:</strong> Click soldier &rarr; click green target. Or click an empty square where a unique jump is available!</li>
                    <li><strong>Pan:</strong> Click and drag empty space or one finger touch.</li>
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
    // User Interaction & Pointer Events
    // ----------------------------------------------------

    function handlePointerDown(e) {
        const rect = canvas.getBoundingClientRect();
        startMouseX = e.clientX - rect.left;
        startMouseY = e.clientY - rect.top;
        lastMouseX = startMouseX;
        lastMouseY = startMouseY;
        isMouseDown = true;
        isDraggingBoard = false;
        dragDistance = 0;

        const grid = renderer.screenToGrid(startMouseX, startMouseY);

        // Check if pointer is on a soldier or an active jump target
        const isSoldier = engine.hasSoldier(grid.x, grid.y);
        const isJumpTarget = renderer.selectedSoldier && renderer.validJumps.some(j => j.to.x === grid.x && j.to.y === grid.y);

        isPieceInteraction = (isSoldier || isJumpTarget) && !spacePressed && e.button !== 1;

        if (spacePressed || e.button === 1) {
            isDraggingBoard = true;
            canvas.style.cursor = 'grabbing';
            return;
        }

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
        }
    }

    function handlePointerMove(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;

        const dx = clientX - lastMouseX;
        const dy = clientY - lastMouseY;
        dragDistance += Math.hypot(dx, dy);

        lastMouseX = clientX;
        lastMouseY = clientY;

        if (isMouseDown) {
            // Drag board if middle click, space pressed, or if not clicking on a piece and moved > 6px
            const panThreshold = isPieceInteraction ? 32 : 6;

            if (spacePressed || e.buttons === 4 || dragDistance > panThreshold) {
                isDraggingBoard = true;
                renderer.pan(dx, dy);
                canvas.style.cursor = 'grabbing';
                return;
            }

            if (mode === 'edit' && dragDistance > 8) {
                const grid = renderer.screenToGrid(clientX, clientY);
                if (editBrush === 'add') {
                    if (engine.addSoldier(grid.x, grid.y)) window.soundFx.playAdd();
                } else if (editBrush === 'remove') {
                    if (engine.removeSoldier(grid.x, grid.y)) window.soundFx.playRemove();
                }
                updateStatsHUD();
            }
        }

        renderer.updateHover(clientX, clientY);
    }

    function handlePointerUp(e) {
        if (!isMouseDown) return;
        isMouseDown = false;
        canvas.style.cursor = spacePressed ? 'grab' : 'default';

        if (isDraggingBoard) {
            isDraggingBoard = false;
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;
        const grid = renderer.screenToGrid(clientX, clientY);

        if (mode === 'play') {
            handlePlayClick(grid);
        }
    }

    function handlePlayClick(grid) {
        // 1. If clicking on an active jump target for selected soldier:
        if (renderer.selectedSoldier && renderer.validJumps.length > 0) {
            const jump = renderer.validJumps.find(j => j.to.x === grid.x && j.to.y === grid.y);
            if (jump) {
                executeJump(jump);
                return;
            }
        }

        // 2. If clicking on a soldier:
        if (engine.hasSoldier(grid.x, grid.y)) {
            if (renderer.selectedSoldier && renderer.selectedSoldier.x === grid.x && renderer.selectedSoldier.y === grid.y) {
                // Clicking selected soldier deselects
                renderer.setSelectedSoldier(null);
                window.soundFx.playDeselect();
            } else {
                // Select soldier
                renderer.setSelectedSoldier(grid);
                window.soundFx.playSelect();
            }
            return;
        }

        // 3. Smart Jump: If clicking an empty cell that has a UNIQUE possible jump into it:
        const possibleJumps = engine.getPossibleJumpsTo(grid.x, grid.y);
        if (possibleJumps.length === 1) {
            // Instant 1-click jump!
            executeJump(possibleJumps[0]);
            return;
        }

        // 4. Clicked elsewhere: deselect
        if (renderer.selectedSoldier) {
            renderer.setSelectedSoldier(null);
            window.soundFx.playDeselect();
        }
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

    // Wheel Zoom
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const delta = e.deltaY < 0 ? 1 : -1;
        renderer.zoom(delta, px, py);
    }, { passive: false });

    // Touch Support (Single tap to select/jump, drag empty space to pan, pinch zoom)
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            const t = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            startMouseX = t.clientX - rect.left;
            startMouseY = t.clientY - rect.top;
            lastMouseX = startMouseX;
            lastMouseY = startMouseY;
            isMouseDown = true;
            isDraggingBoard = false;
            dragDistance = 0;
            initialPinchDistance = null;

            const grid = renderer.screenToGrid(startMouseX, startMouseY);
            const isSoldier = engine.hasSoldier(grid.x, grid.y);
            const isJumpTarget = renderer.selectedSoldier && renderer.validJumps.some(j => j.to.x === grid.x && j.to.y === grid.y);
            isPieceInteraction = isSoldier || isJumpTarget;
        } else if (e.touches.length === 2) {
            isMouseDown = false;
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            initialPinchDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
        const rect = canvas.getBoundingClientRect();
        if (e.touches.length === 1 && isMouseDown) {
            const t = e.touches[0];
            const clientX = t.clientX - rect.left;
            const clientY = t.clientY - rect.top;
            const dx = clientX - lastMouseX;
            const dy = clientY - lastMouseY;
            dragDistance += Math.hypot(dx, dy);

            const panThreshold = isPieceInteraction ? 24 : 8;
            if (dragDistance > panThreshold) {
                isDraggingBoard = true;
                renderer.pan(dx, dy);
            }
            lastMouseX = clientX;
            lastMouseY = clientY;
            renderer.updateHover(clientX, clientY);
        } else if (e.touches.length === 2 && initialPinchDistance) {
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            const midX = ((t1.clientX + t2.clientX) / 2) - rect.left;
            const midY = ((t1.clientY + t2.clientY) / 2) - rect.top;

            const delta = dist > initialPinchDistance ? 1 : -1;
            if (Math.abs(dist - initialPinchDistance) > 10) {
                renderer.zoom(delta, midX, midY);
                initialPinchDistance = dist;
            }
        }
    }, { passive: true });

    canvas.addEventListener('touchend', (e) => {
        if (isMouseDown && !isDraggingBoard && e.changedTouches.length > 0) {
            const t = e.changedTouches[0];
            const rect = canvas.getBoundingClientRect();
            const clientX = t.clientX - rect.left;
            const clientY = t.clientY - rect.top;
            const grid = renderer.screenToGrid(clientX, clientY);
            if (mode === 'play') {
                handlePlayClick(grid);
            } else {
                engine.toggleSoldier(grid.x, grid.y);
                updateStatsHUD();
            }
        }
        isMouseDown = false;
        isDraggingBoard = false;
        initialPinchDistance = null;
    });

    canvas.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);

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
