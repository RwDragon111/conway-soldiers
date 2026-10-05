/**
 * Conway's Soldiers - Main Application Controller
 * Handles inputs, gestures, shortcuts, modals, translations and animations.
 */

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const engine = new ConwayEngine();
    const renderer = new ConwayRenderer(canvas, engine);

    // Interaction State
    let mode = 'play'; // 'play' | 'edit'
    let editBrush = 'toggle'; // 'toggle' | 'add' | 'remove'
    let isMouseDown = false;
    let isDraggingBoard = false;
    let startMouseX = 0;
    let startMouseY = 0;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let dragDistance = 0;
    let spacePressed = false;

    // Touch gesture state
    let initialPinchDistance = null;
    let touchStartGrid = null;

    // Translations (Russian default, English toggle)
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
            presetHalfplane: "Полная армия (Полуплоскость)",
            presetLevel1: "Уровень 1 (2 солдата)",
            presetLevel2: "Уровень 2 (4 солдата)",
            presetLevel3: "Уровень 3 (8 солдат)",
            presetLevel4: "Уровень 4 (20 солдат Конвея)",
            presetEmpty: "Пустое поле (Песочница)",
            close: "Закрыть",
            rulesTitle: "Правила и Математическая Теорема",
            rulesContent: `
                <p><strong>Солдаты Конвея</strong> (Армия Конвея, 1961 г.) — знаменитая математическая головоломка Джона Хортона Конвея на бесконечной клетчатой доске.</p>
                <h4>Правила прыжков:</h4>
                <ul>
                    <li>Доска разделена горизонтальной <strong>стартовой линией</strong> (y = 0).</li>
                    <li>Изначально все солдаты находятся за линией (y &le; 0).</li>
                    <li>Солдат может перепрыгнуть через соседнего солдата по горизонтали или вертикали на свободную клетку. Перепрыгнутый солдат удаляется с доски.</li>
                    <li><strong>Цель:</strong> продвинуть солдата как можно выше за линию (y &ge; 1).</li>
                </ul>
                <h4>Теорема Конвея о недостижимости 5-го уровня:</h4>
                <p>Джон Конвей доказал, что за <strong>любое конечное число ходов</strong> невозможно продвинуть солдата на 5-й ряд выше линии (y = 5)!</p>
                <p>Доказательство использует золотое сечение &phi; = (&radic;5 - 1)/2 &asymp; 0.618. Если присвоить каждой клетке вес &phi;<sup>d</sup> (где d — манхэттенское расстояние до цели), то суммарный вес конфигурации при любых ходах не возрастает. Для цели на 5-м уровне суммарный вес всей бесконечной нижней полуплоскости равен ровно 1, в то время как вес одной лишь целевой клетки уже равен 1 (&phi;<sup>0</sup> = 1). Поскольку любая конечная армия имеет вес строго меньше 1, достичь уровня 5 конечным числом ходов невозможно!</p>
                <h4>Управление:</h4>
                <ul>
                    <li><strong>Перемещение поля:</strong> Зажмите мышь на пустом месте (или среднюю кнопку/пробел) и двигайте.</li>
                    <li><strong>Масштаб:</strong> Колёсико мыши или жесты щипка на тачпаде/экране.</li>
                    <li><strong>Прыжок:</strong> Кликните на солдата, затем на подсвеченную клетку приземления.</li>
                    <li><strong>Горячие клавиши:</strong> <code>Ctrl+Z</code> (отмена), <code>Ctrl+Y</code> (повтор), <code>Space</code> (панорама), <code>R</code> (сброс), <code>E</code> (редактор).</li>
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
            presetHalfplane: "Full Army (Half-plane)",
            presetLevel1: "Level 1 Challenge (2 soldiers)",
            presetLevel2: "Level 2 Challenge (4 soldiers)",
            presetLevel3: "Level 3 Challenge (8 soldiers)",
            presetLevel4: "Level 4 Challenge (20 soldiers)",
            presetEmpty: "Blank Canvas (Sandbox)",
            close: "Close",
            rulesTitle: "Rules & Mathematical Theorem",
            rulesContent: `
                <p><strong>Conway's Soldiers</strong> (or checker-jumping problem, 1961) is a celebrated mathematical game devised by John Horton Conway on an infinite grid.</p>
                <h4>Move Mechanics:</h4>
                <ul>
                    <li>The board is divided by a horizontal <strong>starting line</strong> (y = 0).</li>
                    <li>All soldiers initially stand behind the line (y &le; 0).</li>
                    <li>A soldier jumps horizontally or vertically over an orthogonally adjacent soldier into an empty space immediately beyond. The jumped soldier is removed.</li>
                    <li><strong>Goal:</strong> Advance a soldier as far above the line (y &ge; 1) as possible.</li>
                </ul>
                <h4>Conway's Impossibility Theorem:</h4>
                <p>Conway proved that no soldier can reach row 5 (Level 5) in any finite number of moves, regardless of the army configuration!</p>
                <p>The proof assigns each cell a weight &phi;<sup>d</sup> where &phi; = (&radic;5 - 1)/2 &asymp; 0.61803... is the golden ratio and d is the Manhattan distance to the target. Every jump preserves or decreases the total weight. The infinite sum of weights over the entire half-plane for row 5 equals 1, but any finite set of soldiers has weight strictly less than 1. Hence, row 5 is unreachable!</p>
                <h4>Controls:</h4>
                <ul>
                    <li><strong>Pan:</strong> Click and drag on empty space (or middle click / Space + drag).</li>
                    <li><strong>Zoom:</strong> Mouse wheel or pinch gesture.</li>
                    <li><strong>Jump:</strong> Click a soldier to select, then click the highlighted target square.</li>
                    <li><strong>Shortcuts:</strong> <code>Ctrl+Z</code> (undo), <code>Ctrl+Y</code> (redo), <code>Space</code> (pan), <code>R</code> (reset), <code>E</code> (edit mode).</li>
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

        // Presets list
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
        document.getElementById('stat-soldiers').textContent = engine.soldiersCount;

        const currentLvl = engine.getCurrentLevel();
        const peakLvl = engine.peakLevel;
        const recordElem = document.getElementById('stat-record');

        if (peakLvl > 0) {
            recordElem.textContent = `+${peakLvl}`;
            recordElem.className = peakLvl >= 4 ? 'stat-value record-badge-gold' : 'stat-value record-badge-cyan';
        } else {
            recordElem.textContent = '0';
            recordElem.className = 'stat-value';
        }

        // Undo / Redo button state
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
    // User Interaction & Canvas Events
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

        // Middle mouse or Space+Click triggers pan immediately
        if (e.button === 1 || spacePressed) {
            isDraggingBoard = true;
            canvas.style.cursor = 'grabbing';
            return;
        }

        const grid = renderer.screenToGrid(startMouseX, startMouseY);

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
            if (spacePressed || e.buttons === 4 || dragDistance > 8) {
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
        // 1. Check if clicking on an active jump target
        if (renderer.selectedSoldier && renderer.validJumps.length > 0) {
            const jump = renderer.validJumps.find(j => j.to.x === grid.x && j.to.y === grid.y);
            if (jump) {
                executeJump(jump);
                return;
            }
        }

        // 2. Check if clicking on a soldier
        if (engine.hasSoldier(grid.x, grid.y)) {
            if (renderer.selectedSoldier && renderer.selectedSoldier.x === grid.x && renderer.selectedSoldier.y === grid.y) {
                // Deselect
                renderer.setSelectedSoldier(null);
                window.soundFx.playDeselect();
            } else {
                // Select soldier
                renderer.setSelectedSoldier(grid);
                window.soundFx.playSelect();
            }
        } else {
            // Clicked empty space: deselect
            if (renderer.selectedSoldier) {
                renderer.setSelectedSoldier(null);
                window.soundFx.playDeselect();
            }
        }
    }

    function executeJump(jump) {
        window.soundFx.playJump();
        renderer.setSelectedSoldier(null);

        // Perform animation then engine update
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

    // Touch Support (Single touch pan/tap, Two-finger pinch zoom)
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

            if (dragDistance > 10) {
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
            if (Math.abs(dist - initialPinchDistance) > 12) {
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

    // Zoom buttons
    document.getElementById('btn-zoom-in').addEventListener('click', () => renderer.zoom(1));
    document.getElementById('btn-zoom-out').addEventListener('click', () => renderer.zoom(-1));

    // Sound toggle
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

    // Language Toggle
    document.getElementById('btn-lang-toggle').addEventListener('click', () => {
        updateLanguage(currentLang === 'ru' ? 'en' : 'ru');
    });

    // Modals
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

    // Preset selections
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

    // Window Resize
    window.addEventListener('resize', () => {
        renderer.resize();
    });

    // Main Render Loop
    function frame(now) {
        renderer.render(now);
        requestAnimationFrame(frame);
    }

    // Initialize Language & View
    updateLanguage('ru');
    renderer.recenter(false);
    requestAnimationFrame(frame);
});
