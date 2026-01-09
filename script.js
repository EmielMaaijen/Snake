document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTEN ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const overlays = document.querySelectorAll('.game-overlay');
    const scoreElement = document.getElementById('score');
    
    // Schermen
    const startScreen = document.getElementById('startScreen');
    const instructionsScreen = document.getElementById('instructionsScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    
    const finalScoreElement = document.getElementById('finalScore');
    const timerElement = document.getElementById('timer');

    // Knoppen
    const showInstructionsButton = document.getElementById('showInstructionsButton');
    const startGameButton = document.getElementById('startGameButton');
    const restartButton = document.getElementById('restartButton');

    // --- SPEL INSTELLINGEN ---
    let gridSizeX, gridSizeY;
    const tileCountX = 36;
    const tileCountY = 36;
    
    let currentSpeed = 80; 

    // POWER-UP (Alleen voor de pulse timer)
    let isPoweredUp = false;
    let powerUpTimer = 0;
    const POWERUP_DURATION = 15; 

    // AFBEELDINGEN
    const foodImage = new Image();
    foodImage.src = 'food.png';

    // VARIABELEN
    let snake;
    let foods = []; 
    let score;
    let gameInterval;
    let isGameOver;
    let gameMap = [];
    let currentDirection = { x: 0, y: 0 };
    let desiredDirection = { x: 0, y: 0 };
    let gameTimerInterval, elapsedTime = 0;

    // --- SETUP FUNCTIE ---
    function setupCanvasAndGame() {
        const availableHeight = window.innerHeight * 0.85;
        canvas.height = Math.floor(availableHeight / tileCountY) * tileCountY;
        canvas.width = canvas.height; 
        
        gridSizeX = canvas.width / tileCountX;
        gridSizeY = canvas.height / tileCountY;

        createGridPatternMap();

        // Positioneer overlays exact over canvas
        setTimeout(() => {
            overlays.forEach(overlay => {
                overlay.style.top = `${canvas.offsetTop}px`;
                overlay.style.left = `${canvas.offsetLeft}px`;
                overlay.style.width = `${canvas.width}px`;
                overlay.style.height = `${canvas.height}px`;
            });
        }, 50);
        
        let startPos = findSafeSpot();
        snake = [startPos || { x: 1, y: 1 }];
        currentSpeed = 80;
        foods = [];
        const initialFood = generateFood();
        if (initialFood) foods.push(initialFood);
        
        score = 0;
        isGameOver = false;
        isPoweredUp = false;
        currentDirection = { x: 0, y: 0 };
        desiredDirection = { x: 0, y: 0 };
        
        scoreElement.textContent = score;
        if (finalScoreElement) finalScoreElement.textContent = score;

        clearInterval(gameTimerInterval);
        clearInterval(gameInterval);
        gameInterval = null;
        elapsedTime = 0;
        if(timerElement) timerElement.textContent = formatTime(elapsedTime);
        
        gameOverScreen.classList.add('hidden');
        instructionsScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
        
        draw();
    }
    
    function createGridPatternMap() {
        gameMap = [];
        const isRail = (x, y) => ((x - 1) % 3 === 0) || ((y - 1) % 3 === 0);

        for (let y = 0; y < tileCountY; y++) {
            gameMap[y] = [];
            for (let x = 0; x < tileCountX; x++) {
                const isBorder = (x === 0 || x === tileCountX - 1 || y === 0 || y === tileCountY - 1);
                if (isRail(x, y) && !isBorder) {
                    let exits = { u: 0, d: 0, l: 0, r: 0 };
                    if (y > 0 && isRail(x, y - 1) && !(y - 1 === 0)) exits.u = 1;
                    if (y < tileCountY - 1 && isRail(x, y + 1) && !(y + 1 === tileCountY - 1)) exits.d = 1;
                    if (x > 0 && isRail(x - 1, y) && !(x - 1 === 0)) exits.l = 1;
                    if (x < tileCountX - 1 && isRail(x + 1, y) && !(x + 1 === tileCountX - 1)) exits.r = 1;
                    gameMap[y][x] = exits;
                } else {
                    gameMap[y][x] = { u: 0, d: 0, l: 0, r: 0 };
                }
            }
        }
    }

    function findSafeSpot() {
        for (let y = 1; y < tileCountY; y++) {
            for (let x = 1; x < tileCountX; x++) {
                if (gameMap[y][x].u || gameMap[y][x].d) return { x, y };
            }
        }
        return null;
    }

    function startGame() {
        if (gameInterval) return;
        instructionsScreen.classList.add('hidden');
        gameInterval = setInterval(gameLoop, currentSpeed);
        clearInterval(gameTimerInterval);
        gameTimerInterval = setInterval(() => {
            elapsedTime++;
            if(timerElement) timerElement.textContent = formatTime(elapsedTime);
        }, 1000);
    }
    
    function gameLoop() {
        update();
        if (isGameOver) {
            clearInterval(gameInterval);
            clearInterval(gameTimerInterval);
            if (finalScoreElement) finalScoreElement.textContent = score;
            const finalTimerElement = document.getElementById('finalTimer');
            if (finalTimerElement) finalTimerElement.textContent = formatTime(elapsedTime);
            gameOverScreen.classList.remove('hidden');
            return;
        }
        draw();
    }
    
    function update() {
        if (currentDirection.x === 0 && currentDirection.y === 0) {
            if (desiredDirection.x !== 0 || desiredDirection.y !== 0) {
                 const head = snake[0];
                 const startTile = gameMap[head.y][head.x];
                 if ((desiredDirection.y === -1 && startTile.u) || (desiredDirection.y === 1 && startTile.d) || (desiredDirection.x === -1 && startTile.l) || (desiredDirection.x === 1 && startTile.r)) {
                    currentDirection = desiredDirection;
                 }
            }
            if (currentDirection.x === 0 && currentDirection.y === 0) return;
        }

        if (isPoweredUp) {
            powerUpTimer--;
            if (powerUpTimer <= 0) isPoweredUp = false;
        }

        const head = snake[0];
        const currentTile = gameMap[head.y][head.x];
        
        if ((desiredDirection.y === -1 && currentTile.u) || (desiredDirection.y === 1 && currentTile.d) || (desiredDirection.x === -1 && currentTile.l) || (desiredDirection.x === 1 && currentTile.r)) {
            currentDirection = desiredDirection;
        }

        const nextHead = { x: head.x + currentDirection.x, y: head.y + currentDirection.y };
        const nextTile = gameMap[nextHead.y]?.[nextHead.x];
        
        if (!nextTile || 
            (currentDirection.y === -1 && !nextTile.d) || 
            (currentDirection.y === 1 && !nextTile.u) || 
            (currentDirection.x === -1 && !nextTile.r) || 
            (currentDirection.x === 1 && !nextTile.l)) { 
            isGameOver = true; return; 
        }
        
        if (snake.some(seg => seg.x === nextHead.x && seg.y === nextHead.y)) { isGameOver = true; return; }
        
        snake.unshift(nextHead);

        let eatenIndex = foods.findIndex(f => f.x === nextHead.x && f.y === nextHead.y);

        if (eatenIndex !== -1) {
            foods.splice(eatenIndex, 1);
            score++;
            scoreElement.textContent = score;
            isPoweredUp = true;
            powerUpTimer = POWERUP_DURATION;

            if (score > 5) {
                currentSpeed = Math.max(20, 80 - (score - 5));
                clearInterval(gameInterval);
                gameInterval = setInterval(gameLoop, currentSpeed);
            }

            const targetFoodCount = (score >= 3) ? 5 : 1;
            while (foods.length < targetFoodCount) {
                const newF = generateFood();
                if (newF) foods.push(newF);
                else break;
            }
        } else {
            snake.pop();
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let snakeColor = (score >= 30) ? 'red' : (isPoweredUp ? 'orange' : '#4CAF50');
        
        if (isPoweredUp || score >= 30) {
            ctx.shadowBlur = (score >= 30) ? 25 : 15;
            ctx.shadowColor = (score >= 30) ? 'red' : 'orange';
        }

        if (snake && snake.length > 0) {
            ctx.beginPath();
            ctx.moveTo(snake[0].x * gridSizeX + gridSizeX/2, snake[0].y * gridSizeY + gridSizeY/2);
            for (let i = 1; i < snake.length; i++) {
                ctx.lineTo(snake[i].x * gridSizeX + gridSizeX/2, snake[i].y * gridSizeY + gridSizeY/2);
            }
            ctx.strokeStyle = snakeColor;
            ctx.lineWidth = Math.min(gridSizeX, gridSizeY) - 5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
            
            ctx.shadowBlur = 0;
            const head = snake[0];
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(head.x * gridSizeX + gridSizeX/2, head.y * gridSizeY + gridSizeY/2, 4, 0, Math.PI*2);
            ctx.fill();
        }

        const foodSize = gridSizeX * 1.5;
        foods.forEach(f => {
            ctx.drawImage(foodImage, f.x * gridSizeX - (foodSize-gridSizeX)/2, f.y * gridSizeY - (foodSize-gridSizeY)/2, foodSize, foodSize);
        });
    }
    
    function generateFood() {
        const safeSpots = [];
        for (let y = 0; y < tileCountY; y++) {
            for (let x = 0; x < tileCountX; x++) {
                if ((gameMap[y][x].u || gameMap[y][x].l) && !snake.some(s => s.x === x && s.y === y)) {
                    safeSpots.push({x, y});
                }
            }
        }
        return safeSpots[Math.floor(Math.random() * safeSpots.length)];
    }

    function formatTime(totalSeconds) {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // --- EVENT LISTENERS ---
    showInstructionsButton.addEventListener('click', () => {
        startScreen.classList.add('hidden');
        instructionsScreen.classList.remove('hidden');
    });

    startGameButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', setupCanvasAndGame);

    window.addEventListener('resize', setupCanvasAndGame);

    window.addEventListener('keydown', e => {
        if (isGameOver) return;
        if (!gameInterval && instructionsScreen.classList.contains('hidden') && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            startGame();
        }
        switch (e.key) {
            case 'ArrowUp': if (currentDirection.y !== 1) desiredDirection = { x: 0, y: -1 }; break;
            case 'ArrowDown': if (currentDirection.y !== -1) desiredDirection = { x: 0, y: 1 }; break;
            case 'ArrowLeft': if (currentDirection.x !== 1) desiredDirection = { x: -1, y: 0 }; break;
            case 'ArrowRight': if (currentDirection.x !== -1) desiredDirection = { x: 1, y: 0 }; break;
        }
    });

    setupCanvasAndGame();
});
