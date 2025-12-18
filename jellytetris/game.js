const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const holdCanvas = document.getElementById('hold-canvas');
const holdCtx = holdCanvas.getContext('2d');
const reflectionCanvas = document.getElementById('reflection-canvas');
const reflectionCtx = reflectionCanvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const levelBar = document.getElementById('level-bar');
const highScoreElement = document.getElementById('high-score');
const volumeSlider = document.getElementById('volume-slider');
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const pauseOverlay = document.getElementById('pause-overlay');
const comboPopup = document.getElementById('combo-popup');
const levelUpOverlay = document.getElementById('level-up-overlay');
const comboMultiplierElement = document.getElementById('combo-multiplier');
const floatingTextsContainer = document.getElementById('floating-texts');

const ROWS = 20;
const COLS = 10;
const BLOCK_SIZE = 30;
const CANVAS_PADDING = 20;
const BLOCK_RADIUS = 10;

canvas.width = COLS * BLOCK_SIZE + CANVAS_PADDING * 2;
canvas.height = ROWS * BLOCK_SIZE + CANVAS_PADDING * 2;
reflectionCanvas.width = canvas.width;
reflectionCanvas.height = canvas.height;

const COLORS = {
    I: '#00ffff',
    J: '#0077ff',
    L: '#ffaa00',
    O: '#ffff00',
    S: '#00ff00',
    T: '#aa00ff',
    Z: '#ff0055',
    W: '#ffffff'
};

const SHAPES = {
    I: [[1, 1, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]],
    O: [[1, 1], [1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    T: [[0, 1, 0], [1, 1, 1]],
    Z: [[1, 1, 0], [0, 1, 1]],
    W: [[1]]
};

const WILD_SHAPES = [
    { shape: [[1]], color: '#FF5555' }, // Dot
    { shape: [[1, 1]], color: '#55FF55' }, // 1x2
    { shape: [[1, 1], [1, 1]], color: '#5555FF' }, // 2x2 Square
    { shape: [[1, 1, 1]], color: '#FFFF55' }, // 1x3
    { shape: [[1, 0], [1, 1]], color: '#FF55FF' }, // L-small
    { shape: [[0, 1], [1, 1]], color: '#55FFFF' }, // J-small
    { shape: [[1, 1, 1], [0, 1, 0]], color: '#FFAA55' }, // T
    { shape: [[1, 1, 0], [0, 1, 1]], color: '#AAFF55' }, // Z
    { shape: [[1, 1, 1, 1]], color: '#55AAFF' }, // I
    { shape: [[1, 1], [1, 0], [1, 0]], color: '#AA55FF' }, // L-long
    { shape: [[1, 1, 1], [1, 0, 1]], color: '#FF55AA' }, // U-shape
    { shape: [[1, 1, 1], [1, 1, 1]], color: '#55FFAA' }, // 3x3 Block
    { shape: [[1, 1, 1], [0, 0, 1], [0, 0, 1]], color: '#AA55AA' }, // L-giant
    { shape: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], color: '#55AAAA' }, // 3x3
    { shape: [[1, 0, 1], [1, 1, 1], [1, 0, 1]], color: '#AAAA55' }, // H-shape
    { shape: [[0, 1, 0], [1, 1, 1], [0, 1, 0]], color: '#FFFFFF' }, // Plus
    { shape: [[1, 1, 0], [1, 1, 0], [0, 0, 0]], color: '#FFCC00' }, // 2x2 corner
    { shape: [[1, 0, 0], [1, 1, 1], [0, 0, 1]], color: '#00FFCC' }, // S-giant
    { shape: [[1, 1, 1, 1, 1]], color: '#CC00FF' }, // 1x5
    { shape: [[1, 1], [1, 1], [1, 1]], color: '#FF6600' } // 3x2
];

class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.isMusicPlaying = false;
        this.musicTimeout = null;
        this.notes = [
            ['E4', 2], ['B3', 1], ['C4', 1], ['D4', 2], ['C4', 1], ['B3', 1],
            ['A3', 2], ['A3', 1], ['C4', 1], ['E4', 2], ['D4', 1], ['C4', 1],
            ['B3', 3], ['C4', 1], ['D4', 2], ['E4', 2],
            ['C4', 2], ['A3', 2], ['A3', 2], [null, 2],
            ['D4', 3], ['F4', 1], ['A4', 2], ['G4', 1], ['F4', 1],
            ['E4', 3], ['C4', 1], ['E4', 2], ['D4', 1], ['C4', 1],
            ['B3', 2], ['B3', 1], ['C4', 1], ['D4', 2], ['E4', 2],
            ['C4', 2], ['A3', 2], ['A3', 2], [null, 2]
        ];
        this.frequencies = {
            'A3': 220.00, 'B3': 246.94, 'C4': 261.63, 'D4': 293.66,
            'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00
        };
        this.currentNoteIndex = 0;
        this.tempo = 150;
    }

    init() {
        if (this.ctx) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.updateVolume();
        this.startMusic();
    }

    updateVolume() {
        if (this.masterGain) this.masterGain.gain.value = volumeSlider.value / 100;
    }

    startMusic() {
        if (this.isMusicPlaying) return;
        this.isMusicPlaying = true;
        this.playNextNote();
    }

    playNextNote() {
        if (!this.isMusicPlaying || !this.ctx) return;
        if (isPaused) {
            this.musicTimeout = setTimeout(() => this.playNextNote(), 100);
            return;
        }
        const [note, duration] = this.notes[this.currentNoteIndex];
        const currentTempo = this.tempo - (level - 1) * 5;
        if (note) this.playTone(this.frequencies[note], 'triangle', (duration * currentTempo) / 1000, 0.05);
        this.currentNoteIndex = (this.currentNoteIndex + 1) % this.notes.length;
        this.musicTimeout = setTimeout(() => this.playNextNote(), duration * currentTempo);
    }

    playTone(freq, type, duration, volume = 0.1, pan = 0) {
        if (!this.ctx || this.ctx.state === 'suspended') return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const panner = this.ctx.createStereoPanner();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        panner.pan.setValueAtTime(pan, this.ctx.currentTime);
        gain.gain.setValueAtTime(volume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(panner);
        panner.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playMove(x) {
        const pan = (x / COLS) * 2 - 1;
        this.playTone(150, 'sine', 0.05, 0.1, pan);
    }
    playRotate() { this.playTone(450, 'triangle', 0.15, 0.15); }
    playDrop() { this.playTone(60, 'sine', 0.2, 0.3); }
    playHardDrop() { this.playTone(40, 'sine', 0.4, 0.5); this.playTone(80, 'square', 0.1, 0.2); }
    playClear(count) {
        const baseFreq = 400 + count * 100;
        this.playTone(baseFreq, 'square', 0.3, 0.2);
        this.playTone(baseFreq * 1.5, 'sine', 0.3, 0.1);
    }
    playLevelUp() {
        const notes = [440, 554, 659, 880];
        notes.forEach((f, i) => {
            setTimeout(() => this.playTone(f, 'triangle', 0.4, 0.15), i * 100);
        });
    }
    playHold() { this.playTone(800, 'sine', 0.1, 0.1); }
    playLock() { this.playTone(200, 'sine', 0.05, 0.2); }
    playGameOver() { this.playTone(100, 'sawtooth', 1.5, 0.4); }
}

const audio = new AudioManager();
volumeSlider.addEventListener('input', () => audio.updateVolume());

let board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
let visualBoard = Array.from({ length: ROWS }, (_, y) =>
    Array(COLS).fill(null).map(() => ({ renderY: y * BLOCK_SIZE, squishY: 1, wobbleOffset: Math.random() * Math.PI * 2 }))
);

let score = 0;
let displayedScore = 0;
let highScore = localStorage.getItem('jellyHighScore') || 0;
highScoreElement.innerText = highScore;
let level = 1;
let linesClearedTotal = 0;
let isPaused = false;
let gameStarted = false;
let gameOver = false;
let currentPiece = null;
let nextPieceType = getRandomType();
let heldPieceType = null;
let canHold = true;
let particles = [];
let jellyTime = 0;
let comboCount = 0;
let maxCombo = 0;
let shakeAmount = 0;
let lastTime = 0;
let dropCounter = 0;
let lockDelayCounter = 0;
const LOCK_DELAY_MAX = 500;

class Particle {
    constructor(x, y, color, vx, vy) {
        this.x = x; this.y = y; this.color = color;
        this.vx = vx || (Math.random() - 0.5) * 10;
        this.vy = vy || (Math.random() - 0.5) * 10;
        this.life = 1.0;
        this.decay = 0.02 + Math.random() * 0.02;
        this.size = 3 + Math.random() * 4;
    }
    update() { this.x += this.vx; this.y += this.vy; this.vy += 0.2; this.life -= this.decay; }
    draw(context) {
        context.globalAlpha = this.life;
        context.fillStyle = this.color;
        context.beginPath();
        context.roundRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size, 2);
        context.fill();
        context.globalAlpha = 1.0;
    }
}

function getRandomType() {
    const types = Object.keys(SHAPES).filter(t => t !== 'W');
    if (Math.random() < 0.1) return 'W';
    return types[Math.floor(Math.random() * types.length)];
}

function createPiece(type) {
    const startX = Math.floor(COLS / 2) - Math.floor(SHAPES[type][0].length / 2);
    const piece = {
        type: type,
        shape: type === 'W' ? WILD_SHAPES[0].shape : SHAPES[type],
        color: type === 'W' ? WILD_SHAPES[0].color : COLORS[type],
        x: startX,
        y: 0,
        renderX: startX * BLOCK_SIZE,
        renderY: -BLOCK_SIZE, // Start closer to the board
        squishX: 1,
        squishY: 1,
        isFalling: false,
        fallVelocity: 0,
        wildIndex: 0,
        blockVisuals: [],
        lockTimer: 0,
        isHardDropping: false,
        velocity: 0
    };

    piece.shape.forEach((row, py) => {
        row.forEach((value, px) => {
            if (value) {
                piece.blockVisuals.push({
                    localX: px, localY: py,
                    renderX: px * BLOCK_SIZE, renderY: py * BLOCK_SIZE,
                    targetX: px * BLOCK_SIZE, targetY: py * BLOCK_SIZE
                });
            }
        });
    });
    return piece;
}

function drawBlock(context, x, y, color, size = BLOCK_SIZE, isCurrent = false, p = null, isGhost = false, visualData = null, boardX = 0, boardY = 0) {
    context.save();
    let drawX = x + CANVAS_PADDING;
    let drawY = y + CANVAS_PADDING;
    let drawW = size;
    let drawH = size;

    if (isCurrent && p) {
        const wobble = Math.sin(jellyTime * 15 + (drawX + drawY) * 0.05) * 1.5;
        drawW *= p.squishX;
        drawH *= p.squishY;
        drawX += (size - drawW) / 2;
        drawY += (size - drawH) / 2 + wobble;
    } else if (visualData) {
        drawY = visualData.renderY + CANVAS_PADDING;
        drawH *= visualData.squishY;
        drawY += (size - drawH) / 2;
    }

    if (isGhost) {
        context.globalAlpha = 0.15;
        context.strokeStyle = color;
        context.lineWidth = 2;
        context.strokeRect(drawX + 2, drawY + 2, drawW - 4, drawH - 4);
        context.restore();
        return;
    }

    // ROUNDED SEMI-TRANSPARENT STYLE
    context.globalAlpha = 0.85; // Semi-transparent
    const radius = 6;

    // 1. Main Face (Rounded)
    context.fillStyle = color;
    context.beginPath();
    context.roundRect(drawX, drawY, drawW, drawH, radius);
    context.fill();

    // 2. Geometric Depth (Rounded edges)
    const depth = 4;
    context.fillStyle = 'rgba(0, 0, 0, 0.2)';
    context.beginPath();
    context.roundRect(drawX + depth, drawY + depth, drawW, drawH, radius);
    context.fill();

    // 3. Highlight (Rounded)
    context.fillStyle = 'rgba(255, 255, 255, 0.15)';
    context.beginPath();
    context.roundRect(drawX + 2, drawY + 2, drawW - 4, drawH / 2, radius);
    context.fill();

    context.globalAlpha = 1.0;
    context.restore();
}

function drawPreview(ctx, type, canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!type) return;
    const shape = type === 'W' ? WILD_SHAPES[0].shape : SHAPES[type];
    const color = type === 'W' ? WILD_SHAPES[0].color : COLORS[type];
    const size = 20;
    const offsetX = (canvas.width - shape[0].length * size) / 2;
    const offsetY = (canvas.height - shape.length * size) / 2;
    shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) drawBlock(ctx, offsetX + x * size - CANVAS_PADDING, offsetY + y * size - CANVAS_PADDING, color, size);
        });
    });
}

function spawnPiece(type = null) {
    currentPiece = createPiece(type || nextPieceType);
    if (!type) nextPieceType = getRandomType();
    canHold = true;
    drawPreview(nextCtx, nextPieceType, nextCanvas);
    if (collide()) {
        gameOver = true;
        audio.playGameOver();
        document.getElementById('game-over').classList.add('visible');
        document.getElementById('final-score').innerText = `Score: ${score}`;
        document.getElementById('final-lines').innerText = `Lines: ${linesClearedTotal}`;
        document.getElementById('final-combo').innerText = `Max Combo: ${maxCombo}`;
    }
}

function holdPiece() {
    if (!canHold) return;
    audio.playHold();
    const currentType = currentPiece.type;
    if (heldPieceType === null) {
        heldPieceType = currentType;
        spawnPiece();
    } else {
        const toSpawn = heldPieceType;
        heldPieceType = currentType;
        spawnPiece(toSpawn);
    }
    canHold = false;
    drawPreview(holdCtx, heldPieceType, holdCanvas);
}

function createSplash(piece) {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const splashX = (piece.x + x) * BLOCK_SIZE + CANVAS_PADDING + BLOCK_SIZE / 2;
                const splashY = (piece.y + y) * BLOCK_SIZE + CANVAS_PADDING + BLOCK_SIZE;
                for (let i = 0; i < 8; i++) {
                    particles.push(new Particle(
                        splashX,
                        splashY,
                        piece.color,
                        (Math.random() - 0.5) * 6,
                        -Math.random() * 4 - 2
                    ));
                }
            }
        });
    });
}

function hardDrop() {
    if (!currentPiece || isPaused || currentPiece.isHardDropping || currentPiece.isLocked) return;

    // Calculate final logical Y
    let finalY = currentPiece.y;
    while (!collide(0, finalY - currentPiece.y + 1)) {
        finalY++;
    }

    // Apply score and move
    score += (finalY - currentPiece.y) * 2;
    currentPiece.y = finalY;
    currentPiece.renderY = finalY * BLOCK_SIZE;

    // Effects
    audio.playHardDrop();
    createSplash(currentPiece);
    shakeAmount = 5;

    // Lock and merge immediately
    currentPiece.isLocked = true;
    mergePiece(currentPiece);
    clearLines();

    currentPiece = null;
    setTimeout(spawnPiece, 50);
}

function showFloatingText(text, x, y) {
    const el = document.createElement('div');
    el.className = 'floating-score';
    el.innerText = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    floatingTextsContainer.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

function clearLines(isCombo = false) {
    let linesCleared = 0;
    const linesToClear = [];
    for (let y = ROWS - 1; y >= 0; y--) {
        if (board[y].every(value => value !== 0)) {
            linesToClear.push(y);
            linesCleared++;
        }
    }

    if (linesCleared > 0) {
        comboCount++;
        maxCombo = Math.max(maxCombo, comboCount);
        comboMultiplierElement.innerText = `x${comboCount}`;

        const lineScore = [0, 100, 300, 500, 800][linesCleared] * comboCount * level;
        score += lineScore;
        showFloatingText(`+${lineScore}`, canvas.width / 2, linesToClear[0] * BLOCK_SIZE);

        linesToClear.forEach((y, lineIdx) => {
            for (let x = 0; x < COLS; x++) {
                const color = board[y][x];
                setTimeout(() => {
                    particles.push(new Particle(x * BLOCK_SIZE + CANVAS_PADDING, y * BLOCK_SIZE + CANVAS_PADDING, color));
                    board[y][x] = 0;
                }, x * 30 + lineIdx * 50);
            }
        });

        setTimeout(() => {
            linesToClear.sort((a, b) => a - b).forEach(y => {
                board.splice(y, 1);
                board.unshift(Array(COLS).fill(0));
                visualBoard.splice(y, 1);
                visualBoard.unshift(Array(COLS).fill(null).map(() => ({ renderY: -BLOCK_SIZE, squishY: 1, wobbleOffset: Math.random() * Math.PI * 2 })));
            });
            linesClearedTotal += linesCleared;

            if (linesClearedTotal >= level * 10) {
                level++;
                levelElement.innerText = level;
                audio.playLevelUp();
                levelUpOverlay.classList.add('active');
                setTimeout(() => levelUpOverlay.classList.remove('active'), 2000);
                document.getElementById('bg-grid').style.filter = `hue-rotate(${level * 45}deg)`;
            }
            levelBar.style.width = `${(linesClearedTotal % 10) * 10}%`;
            audio.playClear(linesCleared);
            shakeAmount = linesCleared === 4 ? 20 : 10;

            // Perfect Clear check
            if (board.every(row => row.every(cell => cell === 0))) {
                score += 5000 * level;
                showFloatingText("PERFECT CLEAR! +5000", canvas.width / 2, canvas.height / 2);
            }
            applyGravity();
        }, COLS * 30 + 100);
    } else {
        comboCount = 0;
        comboMultiplierElement.innerText = `x1`;
    }
}

function applyGravity() {
    let changed = false;
    for (let y = ROWS - 2; y >= 0; y--) {
        for (let x = 0; x < COLS; x++) {
            if (board[y][x] && !board[y + 1][x]) {
                board[y + 1][x] = board[y][x];
                board[y][x] = 0;
                visualBoard[y + 1][x].renderY = visualBoard[y][x].renderY;
                changed = true;
            }
        }
    }
    if (changed) setTimeout(() => { applyGravity(); clearLines(true); }, 100);
}

function collide(offsetX = 0, offsetY = 0, newShape = null) {
    const shape = newShape || currentPiece.shape;
    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                const newX = currentPiece.x + x + offsetX;
                const newY = currentPiece.y + y + offsetY;
                if (newX < 0 || newX >= COLS || newY >= ROWS || (newY >= 0 && board[newY][newX])) return true;
            }
        }
    }
    return false;
}

function merge() {
    if (!currentPiece) return;
    mergePiece(currentPiece);
}

function mergePiece(piece) {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const boardY = piece.y + y;
                if (boardY >= 0) {
                    board[boardY][piece.x + x] = piece.color;
                    // Sync visual board immediately to avoid stutter
                    visualBoard[boardY][piece.x + x].renderY = boardY * BLOCK_SIZE;
                    visualBoard[boardY][piece.x + x].squishY = 0.8; // Add a little impact squish
                }
            }
        });
    });
    audio.playLock();
}

function draw() {
    ctx.save();
    if (shakeAmount > 0) {
        ctx.translate((Math.random() - 0.5) * shakeAmount, (Math.random() - 0.5) * shakeAmount);
        shakeAmount *= 0.9;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Ghost
    if (currentPiece) {
        let ghostY = currentPiece.y;
        while (!collide(0, ghostY - currentPiece.y + 1)) ghostY++;
        currentPiece.shape.forEach((row, py) => {
            row.forEach((value, px) => {
                if (value) drawBlock(ctx, (currentPiece.x + px) * BLOCK_SIZE, (ghostY + py) * BLOCK_SIZE, currentPiece.color, BLOCK_SIZE, false, null, true);
            });
        });
    }

    // Board
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) drawBlock(ctx, x * BLOCK_SIZE, y * BLOCK_SIZE, value, BLOCK_SIZE, false, null, false, visualBoard[y][x]);
        });
    });

    // Current Piece
    if (currentPiece) {
        ctx.globalAlpha = 1;
        currentPiece.blockVisuals.forEach(bv => {
            drawBlock(ctx, currentPiece.renderX + bv.renderX, currentPiece.renderY + bv.renderY, currentPiece.color, BLOCK_SIZE, true, currentPiece);
        });
    }

    particles.forEach((p, i) => {
        p.update(); p.draw(ctx);
        if (p.life <= 0) particles.splice(i, 1);
    });
    ctx.restore();

    reflectionCtx.clearRect(0, 0, reflectionCanvas.width, reflectionCanvas.height);
    reflectionCtx.drawImage(canvas, 0, 0);
}

function update(time = performance.now()) {
    if (!gameStarted || gameOver) return;
    const deltaTime = Math.min(time - lastTime, 100); // Cap deltaTime to prevent huge jumps
    lastTime = time;

    if (!isPaused) {
        jellyTime += deltaTime * 0.001;
        displayedScore += (score - displayedScore) * 0.1;
        scoreElement.innerText = Math.floor(displayedScore);

        visualBoard.forEach((row, y) => row.forEach((v, x) => {
            const targetY = y * BLOCK_SIZE;
            v.renderY += (targetY - v.renderY) * 0.2;
            v.squishY += (1 - v.squishY) * 0.2;
        }));

        if (currentPiece) {
            currentPiece.renderX += (currentPiece.x * BLOCK_SIZE - currentPiece.renderX) * 0.3;
            // Normal smooth movement
            const targetY = currentPiece.y * BLOCK_SIZE;
            currentPiece.renderY += (targetY - currentPiece.renderY) * 0.3;

            currentPiece.squishX += (1 - currentPiece.squishX) * 0.2;
            currentPiece.squishY += (1 - currentPiece.squishY) * 0.2;
            currentPiece.blockVisuals.forEach(bv => {
                bv.renderX += (bv.targetX - bv.renderX) * 0.2;
                bv.renderY += (bv.targetY - bv.renderY) * 0.2;
            });

            if (collide(0, 1)) {
                currentPiece.lockTimer += deltaTime;
                if (currentPiece.lockTimer >= LOCK_DELAY_MAX) {
                    merge(); clearLines(); spawnPiece();
                }
            } else {
                currentPiece.lockTimer = 0;
                dropCounter += deltaTime;
                if (dropCounter > Math.max(50, 800 - (level - 1) * 80)) {
                    currentPiece.y++;
                    dropCounter = 0;
                }
            }
        }
    }
    draw();
    requestAnimationFrame(update);
}

startButton.addEventListener('click', () => {
    audio.init();
    gameStarted = true;
    startScreen.classList.remove('visible');
    lastTime = performance.now();
    spawnPiece();
    requestAnimationFrame(update);
});

document.addEventListener('keydown', e => {
    if (!gameStarted || gameOver) return;
    if (e.key.toLowerCase() === 'p') { isPaused = !isPaused; pauseOverlay.classList.toggle('visible', isPaused); return; }
    if (isPaused || !currentPiece || currentPiece.isHardDropping || currentPiece.isLocked) return;

    if (e.key === 'ArrowLeft' && !collide(-1, 0)) { currentPiece.x--; currentPiece.squishX = 1.2; audio.playMove(currentPiece.x); }
    if (e.key === 'ArrowRight' && !collide(1, 0)) { currentPiece.x++; currentPiece.squishX = 1.2; audio.playMove(currentPiece.x); }
    if (e.key === 'ArrowDown' && !collide(0, 1)) { currentPiece.y++; score++; }
    if (e.key === ' ' && !currentPiece.isHardDropping) { e.preventDefault(); hardDrop(); }
    if (e.key.toLowerCase() === 'c') holdPiece();
    if (e.key === 'ArrowUp') {
        let newShape;
        if (currentPiece.type === 'W') {
            currentPiece.wildIndex = (currentPiece.wildIndex + 1) % WILD_SHAPES.length;
            newShape = WILD_SHAPES[currentPiece.wildIndex].shape;
            currentPiece.color = WILD_SHAPES[currentPiece.wildIndex].color;
        } else {
            newShape = currentPiece.shape[0].map((_, i) => currentPiece.shape.map(row => row[i]).reverse());
        }

        if (!collide(0, 0, newShape)) {
            currentPiece.shape = newShape;
            audio.playRotate();

            // Re-generate block visuals for the new shape
            currentPiece.blockVisuals = [];
            currentPiece.shape.forEach((row, py) => row.forEach((val, px) => {
                if (val) {
                    currentPiece.blockVisuals.push({
                        localX: px, localY: py,
                        renderX: px * BLOCK_SIZE, renderY: py * BLOCK_SIZE,
                        targetX: px * BLOCK_SIZE, targetY: py * BLOCK_SIZE
                    });
                }
            }));
        } else if (currentPiece.type === 'W') {
            // If wildcard rotation collides, revert index
            currentPiece.wildIndex = (currentPiece.wildIndex - 1 + WILD_SHAPES.length) % WILD_SHAPES.length;
        }
    }
});
