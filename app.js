/* ═══════════════════════════════════════════════
   PUZZLE PLAY DESKTOP — App Engine
   ═══════════════════════════════════════════════ */

(() => {
    'use strict';

    // ── State ────────────────────────────────────
    const state = {
        gridSize: 4,
        selectedImage: null,
        selectedImageData: null,
        pieces: [],
        dragging: null,
        dragOffset: { x: 0, y: 0 },
        timer: null,
        seconds: 0,
        moveCount: 0,
        solved: false,
        gallery: JSON.parse(localStorage.getItem('puzzleGallery') || '[]'),
        history: JSON.parse(localStorage.getItem('puzzleHistory') || '[]'),
    };

    // ── DOM Refs ─────────────────────────────────
    const $ = id => document.getElementById(id);
    const screens = {
        menu: $('menu-screen'),
        gallery: $('gallery-screen'),
        history: $('history-screen'),
        game: $('game-screen'),
    };

    const sizeSlider = $('size-slider');
    const sizeDisplay = $('size-display');
    const imageGrid = $('image-grid');
    const startBtn = $('start-btn');
    const backBtn = $('back-btn');
    const shuffleBtn = $('shuffle-btn');
    const previewBtn = $('preview-btn');
    const timerEl = $('timer');
    const movesEl = $('moves');
    const canvas = $('puzzle-canvas');
    const ctx = canvas.getContext('2d');
    const winOverlay = $('win-overlay');
    const confettiCanvas = $('confetti-canvas');
    const confettiCtx = confettiCanvas.getContext('2d');
    const previewOverlay = $('preview-overlay');
    const previewImage = $('preview-image');
    const referenceImage = $('reference-image');
    const galleryGrid = $('gallery-grid');
    const galleryEmpty = $('gallery-empty');
    const historyBody = $('history-body');
    const historyTableWrap = $('history-table-wrap');
    const historyEmpty = $('history-empty');

    // ═══════════════════════════════════════════════
    //  PROCEDURAL IMAGES
    // ═══════════════════════════════════════════════

    const SCENES = [
        { name: 'Sunset', draw: drawSunset },
        { name: 'Ocean', draw: drawOcean },
        { name: 'Mountains', draw: drawMountains },
        { name: 'Abstract', draw: drawAbstract },
        { name: 'Forest', draw: drawForest },
        { name: 'Geometric', draw: drawGeometric },
    ];

    function drawSunset(ctx, w, h) {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#1a0533'); g.addColorStop(0.3, '#6b2fa0');
        g.addColorStop(0.5, '#e8515d'); g.addColorStop(0.7, '#f4a742');
        g.addColorStop(1, '#fcdb6d');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ffdd57';
        ctx.beginPath(); ctx.arc(w * 0.5, h * 0.55, w * 0.12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        for (let i = 0; i < 5; i++) {
            const y = h * 0.7 + i * 12;
            ctx.fillRect(0, y, w, 6 + i * 3);
        }
    }

    function drawOcean(ctx, w, h) {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#0a1628'); g.addColorStop(0.4, '#1a3a5c');
        g.addColorStop(0.6, '#2980b9'); g.addColorStop(1, '#1abc9c');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            const y = h * 0.45 + i * 25;
            for (let x = 0; x < w; x += 5) {
                ctx.lineTo(x, y + Math.sin(x * 0.03 + i) * 10);
            }
            ctx.stroke();
        }
    }

    function drawMountains(ctx, w, h) {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#0f0c29'); g.addColorStop(0.5, '#302b63'); g.addColorStop(1, '#24243e');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        const colors = ['#4a3f6b', '#5c4f8a', '#6d5faa'];
        const peaks = [[0.15, 0.35], [0.45, 0.3], [0.75, 0.38], [0.3, 0.42], [0.6, 0.4]];
        colors.forEach((c, ci) => {
            ctx.fillStyle = c;
            ctx.beginPath(); ctx.moveTo(0, h);
            peaks.forEach(([px, py]) => {
                const offY = ci * 40;
                ctx.lineTo(px * w, py * h + offY);
            });
            ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
        });
    }

    function drawAbstract(ctx, w, h) {
        ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, w, h);
        const hues = [280, 200, 330, 160, 30];
        for (let i = 0; i < 12; i++) {
            const hue = hues[i % hues.length];
            ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.15)`;
            const r = 40 + Math.random() * 100;
            ctx.beginPath();
            ctx.arc(Math.random() * w, Math.random() * h, r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawForest(ctx, w, h) {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#0a1a0a'); g.addColorStop(1, '#1a3a1a');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 15; i++) {
            const x = Math.random() * w;
            const th = 60 + Math.random() * 100;
            const tw = 20 + Math.random() * 30;
            const shade = 30 + Math.random() * 40;
            ctx.fillStyle = `hsl(130, 40%, ${shade}%)`;
            ctx.beginPath();
            ctx.moveTo(x, h); ctx.lineTo(x - tw, h);
            ctx.lineTo(x - tw / 2, h - th); ctx.closePath(); ctx.fill();
        }
    }

    function drawGeometric(ctx, w, h) {
        ctx.fillStyle = '#0f0f23'; ctx.fillRect(0, 0, w, h);
        const colors = ['#8b5cf6', '#06b6d4', '#ec4899', '#f97316', '#22c55e'];
        for (let i = 0; i < 20; i++) {
            ctx.save();
            ctx.translate(Math.random() * w, Math.random() * h);
            ctx.rotate(Math.random() * Math.PI);
            ctx.fillStyle = colors[i % colors.length] + '30';
            ctx.strokeStyle = colors[i % colors.length] + '50';
            ctx.lineWidth = 1.5;
            const s = 20 + Math.random() * 60;
            if (i % 3 === 0) {
                ctx.fillRect(-s / 2, -s / 2, s, s);
                ctx.strokeRect(-s / 2, -s / 2, s, s);
            } else if (i % 3 === 1) {
                ctx.beginPath(); ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
                ctx.fill(); ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.moveTo(0, -s / 2);
                ctx.lineTo(s / 2, s / 2);
                ctx.lineTo(-s / 2, s / 2);
                ctx.closePath(); ctx.fill(); ctx.stroke();
            }
            ctx.restore();
        }
    }

    function generateSceneImage(drawFn, size = 400) {
        const c = document.createElement('canvas');
        c.width = c.height = size;
        drawFn(c.getContext('2d'), size, size);
        return c;
    }

    // ═══════════════════════════════════════════════
    //  NAVIGATION
    // ═══════════════════════════════════════════════

    function showScreen(screenId) {
        Object.values(screens).forEach(s => s.classList.remove('active'));
        const target = screens[screenId] || document.getElementById(screenId);
        if (target) target.classList.add('active');

        document.querySelectorAll('.nav-item').forEach(n => {
            n.classList.toggle('active', n.dataset.screen === screenId ||
                n.dataset.screen === screenId + '-screen');
        });

        if (screenId === 'gallery' || screenId === 'gallery-screen') renderGallery();
        if (screenId === 'history' || screenId === 'history-screen') renderHistory();
    }

    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.screen;
            showScreen(id);
        });
    });

    // ═══════════════════════════════════════════════
    //  MENU — IMAGE SELECTION
    // ═══════════════════════════════════════════════

    function renderImageGrid() {
        imageGrid.innerHTML = '';
        SCENES.forEach((scene, i) => {
            const div = document.createElement('div');
            div.className = 'image-option' + (i === 0 ? ' selected' : '');
            const c = generateSceneImage(scene.draw, 200);
            div.appendChild(c);
            div.addEventListener('click', () => {
                document.querySelectorAll('.image-option').forEach(o => o.classList.remove('selected'));
                div.classList.add('selected');
                state.selectedImage = { type: 'scene', index: i };
                state.selectedImageData = null;
            });
            imageGrid.appendChild(div);
            if (i === 0) state.selectedImage = { type: 'scene', index: 0 };
        });
    }

    // Size slider
    sizeSlider.addEventListener('input', () => {
        state.gridSize = parseInt(sizeSlider.value);
        sizeDisplay.textContent = `${state.gridSize} × ${state.gridSize}`;
    });

    // Image upload
    $('image-upload').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            state.selectedImageData = ev.target.result;
            state.selectedImage = { type: 'upload' };
            // Add to gallery
            if (!state.gallery.includes(ev.target.result)) {
                state.gallery.push(ev.target.result);
                localStorage.setItem('puzzleGallery', JSON.stringify(state.gallery));
            }
            // Show selected visual
            document.querySelectorAll('.image-option').forEach(o => o.classList.remove('selected'));
            // Show filename
            const filenameEl = $('upload-filename');
            const filenameText = $('filename-text');
            if (filenameEl && filenameText) {
                filenameText.textContent = file.name;
                filenameEl.style.display = 'flex';
            }
        };
        reader.readAsDataURL(file);
    });

    // Start button
    startBtn.addEventListener('click', startGame);

    // ═══════════════════════════════════════════════
    //  GALLERY
    // ═══════════════════════════════════════════════

    function renderGallery() {
        galleryGrid.innerHTML = '';
        if (state.gallery.length === 0) {
            galleryEmpty.classList.add('visible');
            historyTableWrap && (historyTableWrap.style.display = 'none');
            return;
        }
        galleryEmpty.classList.remove('visible');

        state.gallery.forEach((dataUrl, i) => {
            const div = document.createElement('div');
            div.className = 'gallery-item';
            const img = document.createElement('img');
            img.src = dataUrl;
            img.alt = 'Saved image';
            div.appendChild(img);

            // Delete button
            const delBtn = document.createElement('button');
            delBtn.className = 'delete-btn';
            delBtn.textContent = '✕';
            delBtn.title = 'Delete image';
            delBtn.addEventListener('click', e => {
                e.stopPropagation();
                state.gallery.splice(i, 1);
                localStorage.setItem('puzzleGallery', JSON.stringify(state.gallery));
                renderGallery();
            });
            div.appendChild(delBtn);

            // Click to use as puzzle
            div.addEventListener('click', () => {
                state.selectedImageData = dataUrl;
                state.selectedImage = { type: 'upload' };
                showScreen('menu');
                document.querySelectorAll('.image-option').forEach(o => o.classList.remove('selected'));
            });

            galleryGrid.appendChild(div);
        });
    }

    $('gallery-upload').addEventListener('change', e => {
        Array.from(e.target.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = ev => {
                if (!state.gallery.includes(ev.target.result)) {
                    state.gallery.push(ev.target.result);
                    localStorage.setItem('puzzleGallery', JSON.stringify(state.gallery));
                    renderGallery();
                }
            };
            reader.readAsDataURL(file);
        });
    });

    // ═══════════════════════════════════════════════
    //  HISTORY
    // ═══════════════════════════════════════════════

    function renderHistory() {
        historyBody.innerHTML = '';

        if (state.history.length === 0) {
            historyEmpty.classList.add('visible');
            historyTableWrap.style.display = 'none';
            return;
        }

        historyEmpty.classList.remove('visible');
        historyTableWrap.style.display = '';

        state.history.forEach((entry, i) => {
            const tr = document.createElement('tr');

            // Thumbnail
            const tdThumb = document.createElement('td');
            if (entry.thumbnail) {
                const img = document.createElement('img');
                img.src = entry.thumbnail;
                img.className = 'history-thumb';
                img.alt = 'Puzzle thumbnail';
                tdThumb.appendChild(img);
            } else {
                tdThumb.textContent = '—';
            }
            tr.appendChild(tdThumb);

            // Size
            const tdSize = document.createElement('td');
            tdSize.textContent = entry.size || '—';
            tr.appendChild(tdSize);

            // Time
            const tdTime = document.createElement('td');
            tdTime.textContent = entry.time || '—';
            tr.appendChild(tdTime);

            // Moves
            const tdMoves = document.createElement('td');
            tdMoves.textContent = entry.moves || '—';
            tr.appendChild(tdMoves);

            // Date
            const tdDate = document.createElement('td');
            tdDate.textContent = entry.date || '—';
            tr.appendChild(tdDate);

            // Delete
            const tdDel = document.createElement('td');
            const delBtn = document.createElement('button');
            delBtn.className = 'history-delete-btn';
            delBtn.textContent = '✕';
            delBtn.title = 'Delete entry';
            delBtn.addEventListener('click', () => {
                state.history.splice(i, 1);
                localStorage.setItem('puzzleHistory', JSON.stringify(state.history));
                renderHistory();
            });
            tdDel.appendChild(delBtn);
            tr.appendChild(tdDel);

            historyBody.appendChild(tr);
        });
    }

    $('clear-history-btn').addEventListener('click', () => {
        if (!confirm('Clear all history?')) return;
        state.history = [];
        localStorage.setItem('puzzleHistory', JSON.stringify(state.history));
        renderHistory();
    });

    // ═══════════════════════════════════════════════
    //  GAME ENGINE
    // ═══════════════════════════════════════════════

    function startGame() {
        const size = state.gridSize;
        state.moveCount = 0;
        state.seconds = 0;
        state.solved = false;
        movesEl.textContent = '0';
        timerEl.textContent = '0:00';
        clearInterval(state.timer);

        // Update side info
        $('info-grid').textContent = `${size}×${size}`;
        $('info-pieces').textContent = size * size;
        $('info-placed').textContent = `0 / ${size * size}`;

        loadImage(img => {
            showScreen('game');
            setupPuzzle(img, size);
            startTimer();
        });
    }

    function loadImage(callback) {
        if (state.selectedImage?.type === 'upload' && state.selectedImageData) {
            const img = new Image();
            img.onload = () => callback(img);
            img.src = state.selectedImageData;
        } else {
            const idx = state.selectedImage?.index ?? 0;
            const c = generateSceneImage(SCENES[idx].draw, 600);
            const img = new Image();
            img.onload = () => callback(img);
            img.src = c.toDataURL();
        }
    }

    function setupPuzzle(img, size) {
        // Resize canvas to fit game area
        const area = $('game-area');
        const areaW = area.clientWidth - 20;
        const areaH = area.clientHeight - 20;
        const puzzleSize = Math.min(areaW, areaH, 700);
        canvas.width = puzzleSize;
        canvas.height = puzzleSize;

        // Set reference image
        referenceImage.src = img.src;
        previewImage.src = img.src;

        const pieceW = puzzleSize / size;
        const pieceH = puzzleSize / size;

        // Create pieces
        state.pieces = [];
        for (let row = 0; row < size; row++) {
            for (let col = 0; col < size; col++) {
                state.pieces.push({
                    id: row * size + col,
                    correctRow: row,
                    correctCol: col,
                    currentRow: row,
                    currentCol: col,
                    x: col * pieceW,
                    y: row * pieceH,
                    w: pieceW,
                    h: pieceH,
                    placed: false,
                });
            }
        }

        // Store image ref
        state.puzzleImage = img;
        state.puzzleSize = puzzleSize;

        shufflePieces();
        drawPuzzle();
    }

    function shufflePieces() {
        const size = state.gridSize;
        const positions = [];
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                positions.push({ row: r, col: c });
            }
        }
        // Fisher-Yates shuffle
        for (let i = positions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
        }

        state.pieces.forEach((piece, i) => {
            piece.currentRow = positions[i].row;
            piece.currentCol = positions[i].col;
            piece.x = positions[i].col * piece.w;
            piece.y = positions[i].row * piece.h;
            piece.placed = (piece.currentRow === piece.correctRow && piece.currentCol === piece.correctCol);
        });

        state.moveCount = 0;
        movesEl.textContent = '0';
        updatePlacedCount();
        drawPuzzle();
    }

    function drawPuzzle() {
        const size = state.gridSize;
        const ps = state.puzzleSize;
        ctx.clearRect(0, 0, ps, ps);

        // Draw grid background
        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        ctx.fillRect(0, 0, ps, ps);

        // Draw grid lines
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        const cellW = ps / size;
        const cellH = ps / size;
        for (let i = 1; i < size; i++) {
            ctx.beginPath();
            ctx.moveTo(i * cellW, 0); ctx.lineTo(i * cellW, ps);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i * cellH); ctx.lineTo(ps, i * cellH);
            ctx.stroke();
        }

        // Draw pieces (non-dragging first)
        state.pieces.forEach(piece => {
            if (state.dragging === piece) return;
            drawPiece(piece);
        });

        // Draw dragging piece on top
        if (state.dragging) {
            drawPiece(state.dragging, true);
        }
    }

    function drawPiece(piece, isDragging = false) {
        const img = state.puzzleImage;
        const imgW = img.width / state.gridSize;
        const imgH = img.height / state.gridSize;

        ctx.save();
        if (isDragging) {
            ctx.shadowColor = 'rgba(139, 92, 246, 0.5)';
            ctx.shadowBlur = 20;
            ctx.globalAlpha = 0.9;
        }

        // Clip and draw pure squares
        ctx.beginPath();
        ctx.rect(piece.x + 1, piece.y + 1, piece.w - 2, piece.h - 2);
        ctx.clip();

        ctx.drawImage(
            img,
            piece.correctCol * imgW, piece.correctRow * imgH, imgW, imgH,
            piece.x, piece.y, piece.w, piece.h
        );

        ctx.restore();

        // Square Border
        ctx.strokeStyle = piece.placed
            ? 'rgba(34, 197, 94, 0.8)' // made slightly more opaque as well
            : isDragging
                ? 'rgba(139, 92, 246, 0.6)'
                : 'rgba(255,255,255,0.1)';

        // Thicker border for placed pieces
        ctx.lineWidth = piece.placed ? 2.5 : (isDragging ? 2 : 1);

        // When using thicker lines, we might need a little inset so it doesn't get clipped as much
        const inset = (ctx.lineWidth / 2);
        ctx.strokeRect(piece.x + inset, piece.y + inset, piece.w - (inset * 2), piece.h - (inset * 2));
    }

    function updatePlacedCount() {
        const placed = state.pieces.filter(p => p.placed).length;
        const total = state.pieces.length;
        $('info-placed').textContent = `${placed} / ${total}`;
    }

    // ═══════════════════════════════════════════════
    //  MOUSE DRAG & DROP
    // ═══════════════════════════════════════════════

    canvas.addEventListener('mousedown', e => {
        if (state.solved) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;

        // Find piece under mouse (top-most = last in array)
        for (let i = state.pieces.length - 1; i >= 0; i--) {
            const p = state.pieces[i];
            if (mx >= p.x && mx <= p.x + p.w && my >= p.y && my <= p.y + p.h) {
                state.dragging = p;
                state.dragOffset = { x: mx - p.x, y: my - p.y };
                // Move to end of array (draw on top)
                state.pieces.splice(i, 1);
                state.pieces.push(p);
                drawPuzzle();
                break;
            }
        }
    });

    canvas.addEventListener('mousemove', e => {
        if (!state.dragging) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;

        state.dragging.x = mx - state.dragOffset.x;
        state.dragging.y = my - state.dragOffset.y;
        drawPuzzle();
    });

    canvas.addEventListener('mouseup', () => {
        if (!state.dragging) return;
        const piece = state.dragging;
        const cellW = state.puzzleSize / state.gridSize;
        const cellH = state.puzzleSize / state.gridSize;

        // Find nearest grid cell
        const targetCol = Math.round(piece.x / cellW);
        const targetRow = Math.round(piece.y / cellH);
        const clampCol = Math.max(0, Math.min(state.gridSize - 1, targetCol));
        const clampRow = Math.max(0, Math.min(state.gridSize - 1, targetRow));

        // Find piece currently at target position
        const occupant = state.pieces.find(
            p => p !== piece && p.currentRow === clampRow && p.currentCol === clampCol
        );

        if (occupant) {
            // Swap positions
            occupant.currentRow = piece.currentRow;
            occupant.currentCol = piece.currentCol;
            occupant.x = piece.currentCol * cellW;
            occupant.y = piece.currentRow * cellH;
            occupant.placed = (occupant.currentRow === occupant.correctRow &&
                occupant.currentCol === occupant.correctCol);
        }

        piece.currentRow = clampRow;
        piece.currentCol = clampCol;
        piece.x = clampCol * cellW;
        piece.y = clampRow * cellH;
        piece.placed = (piece.currentRow === piece.correctRow &&
            piece.currentCol === piece.correctCol);

        state.dragging = null;
        state.moveCount++;
        movesEl.textContent = state.moveCount;
        updatePlacedCount();
        drawPuzzle();
        checkWin();
    });

    canvas.addEventListener('mouseleave', () => {
        if (state.dragging) {
            // Snap back
            const piece = state.dragging;
            const cellW = state.puzzleSize / state.gridSize;
            const cellH = state.puzzleSize / state.gridSize;
            piece.x = piece.currentCol * cellW;
            piece.y = piece.currentRow * cellH;
            state.dragging = null;
            drawPuzzle();
        }
    });

    // ═══════════════════════════════════════════════
    //  TIMER
    // ═══════════════════════════════════════════════

    function startTimer() {
        clearInterval(state.timer);
        state.seconds = 0;
        state.timer = setInterval(() => {
            state.seconds++;
            const m = Math.floor(state.seconds / 60);
            const s = state.seconds % 60;
            timerEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
        }, 1000);
    }

    function formatTime(secs) {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    // ═══════════════════════════════════════════════
    //  WIN CHECK
    // ═══════════════════════════════════════════════

    function checkWin() {
        if (state.pieces.every(p => p.placed)) {
            state.solved = true;
            clearInterval(state.timer);

            const timeStr = formatTime(state.seconds);
            $('win-time').textContent = timeStr;
            $('win-moves').textContent = state.moveCount;

            // Save to history
            let thumbnail = '';
            try {
                const tc = document.createElement('canvas');
                tc.width = tc.height = 80;
                const tctx = tc.getContext('2d');
                tctx.drawImage(state.puzzleImage, 0, 0, 80, 80);
                thumbnail = tc.toDataURL('image/jpeg', 0.5);
            } catch (e) { }

            state.history.unshift({
                size: `${state.gridSize}×${state.gridSize}`,
                time: timeStr,
                moves: state.moveCount,
                date: new Date().toLocaleDateString(),
                thumbnail,
            });
            localStorage.setItem('puzzleHistory', JSON.stringify(state.history));

            // Show win modal
            setTimeout(() => {
                winOverlay.classList.add('active');
                startConfetti();
            }, 300);
        }
    }

    // ═══════════════════════════════════════════════
    //  CONFETTI
    // ═══════════════════════════════════════════════

    function startConfetti() {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
        const particles = [];
        const colors = ['#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#22c55e', '#eab308'];

        for (let i = 0; i < 120; i++) {
            particles.push({
                x: Math.random() * confettiCanvas.width,
                y: -20 - Math.random() * 200,
                w: 6 + Math.random() * 6,
                h: 8 + Math.random() * 8,
                color: colors[Math.floor(Math.random() * colors.length)],
                vx: (Math.random() - 0.5) * 4,
                vy: 2 + Math.random() * 4,
                rot: Math.random() * 360,
                rotV: (Math.random() - 0.5) * 10,
            });
        }

        let frames = 0;
        function animate() {
            confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.rot += p.rotV;
                p.vy += 0.05;
                confettiCtx.save();
                confettiCtx.translate(p.x, p.y);
                confettiCtx.rotate(p.rot * Math.PI / 180);
                confettiCtx.fillStyle = p.color;
                confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                confettiCtx.restore();
            });
            frames++;
            if (frames < 200) requestAnimationFrame(animate);
        }
        animate();
    }

    // ═══════════════════════════════════════════════
    //  GAME CONTROLS
    // ═══════════════════════════════════════════════

    backBtn.addEventListener('click', () => {
        clearInterval(state.timer);
        showScreen('menu');
    });

    shuffleBtn.addEventListener('click', () => {
        if (!state.solved) shufflePieces();
    });

    previewBtn.addEventListener('click', () => {
        previewOverlay.style.display = 'flex';
    });

    previewOverlay.addEventListener('click', () => {
        previewOverlay.style.display = 'none';
    });

    $('play-again-btn').addEventListener('click', () => {
        winOverlay.classList.remove('active');
        startGame();
    });

    $('menu-btn').addEventListener('click', () => {
        winOverlay.classList.remove('active');
        showScreen('menu');
    });

    // ═══════════════════════════════════════════════
    //  KEYBOARD SHORTCUTS
    // ═══════════════════════════════════════════════

    document.addEventListener('keydown', e => {
        const gameActive = screens.game.classList.contains('active');

        if (e.key === 'Escape') {
            if (previewOverlay.style.display === 'flex') {
                previewOverlay.style.display = 'none';
            } else if (winOverlay.classList.contains('active')) {
                winOverlay.classList.remove('active');
                showScreen('menu');
            } else if (gameActive) {
                clearInterval(state.timer);
                showScreen('menu');
            }
        }

        if (gameActive && !state.solved) {
            if (e.key === 'r' || e.key === 'R') {
                shufflePieces();
            }
            if (e.key === 'p' || e.key === 'P') {
                if (previewOverlay.style.display === 'flex') {
                    previewOverlay.style.display = 'none';
                } else {
                    previewOverlay.style.display = 'flex';
                }
            }
        }
    });

    // ═══════════════════════════════════════════════
    //  WINDOW RESIZE
    // ═══════════════════════════════════════════════

    window.addEventListener('resize', () => {
        if (screens.game.classList.contains('active') && state.puzzleImage) {
            const area = $('game-area');
            const areaW = area.clientWidth - 20;
            const areaH = area.clientHeight - 20;
            const newSize = Math.min(areaW, areaH, 700);

            if (Math.abs(newSize - state.puzzleSize) > 10) {
                const ratio = newSize / state.puzzleSize;
                canvas.width = newSize;
                canvas.height = newSize;
                state.puzzleSize = newSize;

                state.pieces.forEach(p => {
                    p.w *= ratio;
                    p.h *= ratio;
                    p.x = p.currentCol * p.w;
                    p.y = p.currentRow * p.h;
                });

                drawPuzzle();
            }
        }
    });

    // ═══════════════════════════════════════════════
    //  INIT
    // ═══════════════════════════════════════════════

    renderImageGrid();
    showScreen('menu');

})();
