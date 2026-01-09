document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const overlays = document.querySelectorAll('.game-overlay');
    const scoreElement = document.getElementById('score');
    const startScreen = document.getElementById('startScreen');
    const instructionsScreen = document.getElementById('instructionsScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const finalScoreElement = document.getElementById('finalScore');
    const timerElement = document.getElementById('timer');

    const showInstructionsButton = document.getElementById('showInstructionsButton');
    const startGameButton = document.getElementById('startGameButton');
    const restartButton = document.getElementById('restartButton');

    // --- SPEL INSTELLINGEN ---
    let gridSizeX, gridSizeY;
    const tileCountX = 36, tileCountY = 36;
    const INITIAL_SPEED = 80;
    let currentSpeed = INITIAL_SPEED; 

    let isPoweredUp = false, powerUpTimer = 0;
    const POWERUP_DURATION = 25; // Iets langer gezet voor een mooi effect (paar seconden)

    const foodImage = new Image();
    foodImage.src = 'food.png';

    let snake, foods = [], score, gameInterval, isGameOver, gameMap = [];
    let currentDirection = { x: 0, y: 0 }, desiredDirection = { x: 0, y: 0 };
    let gameTimerInterval, elapsedTime = 0;

    function setupCanvasAndGame() {
        const availableHeight = window.innerHeight * 0.80;
        const size = Math.floor(availableHeight / tileCountY) * tileCountY;
        canvas.height = size;
        canvas.width = size; 
        
        gridSizeX = canvas.width / tileCountX;
        gridSizeY = canvas.height / tileCountY;

        createGridPatternMap();

        overlays.forEach(overlay => {
            overlay.style.width = `${canvas.width}px`;
            overlay.style.height = `${canvas.height}px`;
        });
        
        let startPos = findSafeSpot() || { x: 1, y: 1 };
        snake = [startPos];
        currentSpeed = INITIAL_SPEED;
        foods = [];
        const initialFood = generateFood();
        if (initialFood) foods.push(initialFood);
        
        score = 0;
        isGameOver = false;
        isPoweredUp = false;
        currentDirection = { x: 0, y: 0 };
        desiredDirection = { x: 0, y: 0 };
        
        scoreElement.textContent = score;
        clearInterval(gameTimerInterval);
        clearInterval(gameInterval);
        gameInterval = null;
        elapsedTime = 0;
        if(timerElement) timerElement.textContent = "00:00";
        
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
                    gameMap[y][x] = {
                        u: (y > 1 && isRail(x, y - 1)) ? 1 : 0,
                        d: (y < tileCountY - 2 && isRail(x, y + 1)) ? 1 : 0,
                        l: (x > 1 && isRail(x - 1, y)) ? 1 : 0,
                        r: (x < tileCountX - 2 && isRail(x + 1, y)) ? 1 : 0
                    };
                } else {
                    gameMap[y][x] = { u: 0, d: 0, l: 0, r: 0 };
                }
            }
        }
    }

    function findSafeSpot() {
        for (let y = 5; y < tileCountY; y++) {
            for (let x = 5; x < tileCountX; x++) {
                if (gameMap[y][x].u || gameMap[y][x].d) return { x, y };
            }
        }
        return null;
    }

    function startGame() {
        if (gameInterval) return;
        instructionsScreen.classList.add('hidden');
        startScreen.classList.add('hidden');
        
        gameInterval = setInterval(gameLoop, currentSpeed);
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
            finalScoreElement.textContent = score;
            document.getElementById('finalTimer').textContent = formatTime(elapsedTime);
            gameOverScreen.classList.remove('hidden');
            return;
        }
        draw();
    }
    
    function update() {
        const head = snake[0];
        const currentTile = gameMap[head.y][head.x];
        
        if (desiredDirection.y === -1 && currentTile.u) currentDirection = { x: 0, y: -1 };
        else if (desiredDirection.y === 1 && currentTile.d) currentDirection = { x: 0, y: 1 };
        else if (desiredDirection.x === -1 && currentTile.l) currentDirection = { x: -1, y: 0 };
        else if (desiredDirection.x === 1 && currentTile.r) currentDirection = { x: 1, y: 0 };

        if (currentDirection.x === 0 && currentDirection.y === 0) return;

        // Timer voor de power-up (en dus de kleur) aftellen
        if (isPoweredUp) {
            powerUpTimer--;
            if (powerUpTimer <= 0) isPoweredUp = false;
        }

        const nextHead = { x: head.x + currentDirection.x, y: head.y + currentDirection.y };
        const nextTile = gameMap[nextHead.y]?.[nextHead.x];
        
        if (!nextTile || (currentDirection.y === -1 && !nextTile.d) || (currentDirection.y === 1 && !nextTile.u) || (currentDirection.x === -1 && !nextTile.r) || (currentDirection.x === 1 && !nextTile.l)) {
            isGameOver = true; return;
        }
        
        if (snake.some(seg => seg.x === nextHead.x && seg.y === nextHead.y)) {
            isGameOver = true; return;
        }
        
        snake.unshift(nextHead);

        let eatenIndex = foods.findIndex(f => f.x === nextHead.x && f.y === nextHead.y);

        if (eatenIndex !== -1) {
            foods.splice(eatenIndex, 1);
            score++;
            scoreElement.textContent = score;
            
            // Activeer tijdelijke kleur/powerup
            isPoweredUp = true;
            powerUpTimer = POWERUP_DURATION;

            // Snelheid verhogen (stappen van 3ms)
            currentSpeed = Math.max(30, INITIAL_SPEED - (score * 3));
            clearInterval(gameInterval);
            gameInterval = setInterval(gameLoop, currentSpeed);

            while (foods.length < (score >= 3 ? 5 : 1)) {
                const newF = generateFood();
                if (newF) foods.push(newF); else break;
            }
        } else {
            snake.pop();
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let snakeColor = '#4CAF50'; // Standaard groen
        
        if (isPoweredUp) {
            if (score >= 20) {
                // Rood als score 20+ is EN je net gegeten hebt
                snakeColor = 'rgb(255, 0, 0)'; 
                ctx.shadowBlur = 20;
                ctx.shadowColor = 'red';
            } else {
                // Oranje als score < 20 is EN je net gegeten hebt
                snakeColor = 'orange';
                ctx.shadowBlur = 15;
                ctx.shadowColor = 'orange';
            }
        }

        if (snake.length > 0) {
            ctx.beginPath();
            ctx.moveTo(snake[0].x * gridSizeX + gridSizeX / 2, snake[0].y * gridSizeY + gridSizeY / 2);
            for (let i = 1; i < snake.length; i++) {
                ctx.lineTo(snake[i].x * gridSizeX + gridSizeX / 2, snake[i].y * gridSizeY + gridSizeY / 2);
            }
            ctx.strokeStyle = snakeColor;
            ctx.lineWidth = gridSizeX - 4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
            ctx.shadowBlur = 0; 
        }

        foods.forEach(f => {
            ctx.drawImage(foodImage, f.x * gridSizeX, f.y * gridSizeY, gridSizeX * 2, gridSizeY * 2);
        });
    }

    function generateFood() {
        const safeSpots = [];
        for (let y = 1; y < tileCountY - 1; y++) {
            for (let x = 1; x < tileCountX - 1; x++) {
                if ((gameMap[y][x].u || gameMap[y][x].d || gameMap[y][x].l || gameMap[y][x].r) && 
                    !snake.some(s => s.x === x && s.y === y)) safeSpots.push({x, y});
            }
        }
        return safeSpots[Math.floor(Math.random() * safeSpots.length)];
    }

    function formatTime(s) {
        return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
    }

    showInstructionsButton.onclick = () => { startScreen.classList.add('hidden'); instructionsScreen.classList.remove('hidden'); };
    startGameButton.onclick = startGame;
    restartButton.onclick = setupCanvasAndGame;

    window.onkeydown = e => {
        if (isGameOver) return;
        if (!gameInterval && !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
        if (!gameInterval) startGame();
        switch (e.key) {
            case 'ArrowUp': if (currentDirection.y !== 1) desiredDirection = { x: 0, y: -1 }; break;
            case 'ArrowDown': if (currentDirection.y !== -1) desiredDirection = { x: 0, y: 1 }; break;
            case 'ArrowLeft': if (currentDirection.x !== 1) desiredDirection = { x: -1, y: 0 }; break;
            case 'ArrowRight': if (currentDirection.x !== -1) desiredDirection = { x: 1, y: 0 }; break;
        }
    };

    setupCanvasAndGame();
});
