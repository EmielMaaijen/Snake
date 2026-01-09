document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTEN ---
    const gameContainer = document.querySelector('.game-container');
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const overlays = document.querySelectorAll('.game-overlay');
    const scoreElement = document.getElementById('score');
    
    // Schermen
    const startScreen = document.getElementById('startScreen');
    const instructionsScreen = document.getElementById('instructionsScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const registrationScreen = document.getElementById('registrationScreen');
    
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
    
    // SNELHEID
    let currentSpeed = 80; 

    // POWER-UP (Alleen voor de pulse timer)
    let isPoweredUp = false;
    let powerUpTimer = 0;
    const POWERUP_DURATION = 15; 

    // AFBEELDINGEN
    const foodImage = new Image();
    foodImage.src = 'food.png';
    foodImage.onerror = () => console.log("food.png niet gevonden!");

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
        const availableHeight = window.innerHeight * 0.90;
        canvas.height = Math.floor(availableHeight / tileCountY) * tileCountY;
        canvas.width = canvas.height; 
        
        gridSizeX = canvas.width / tileCountX;
        gridSizeY = canvas.height / tileCountY;

        createGridPatternMap();

        const canvasTopOffset = canvas.offsetTop;
        const canvasLeftOffset = canvas.offsetLeft;
        overlays.forEach(overlay => {
            overlay.style.top = `${canvasTopOffset}px`;
            overlay.style.left = `${canvasLeftOffset}px`;
            overlay.style.width = `${canvas.width}px`;
            overlay.style.height = `${canvas.height}px`;
        });
        
        let startPos = findSafeSpot();
        if (!startPos) startPos = { x: 1, y: 1 };
        
        // RESET
        snake = [startPos];
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
        
        // Schermen resetten
        gameOverScreen.classList.add('hidden');
        instructionsScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
        
        draw();
    }
    
    // --- MAP LOGICA ---
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

    function findSafeSpot(spotsToAvoid = []) {
        for (let y = 0; y < tileCountY; y++) {
            for (let x = 0; x < tileCountX; x++) {
                const tile = gameMap[y][x];
                if (tile.u || tile.d || tile.l || tile.r) {
                    if (!spotsToAvoid.some(spot => spot.x === x && spot.y === y)) {
                        return { x, y };
                    }
                }
            }
        }
        return null;
    }

    // --- GAME START ---
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
            const finalTimerElement = document.getElementById('finalTimer'); // Zorg dat dit ID in je HTML staat
            if (finalTimerElement) finalTimerElement.textContent = formatTime(elapsedTime);
            
            gameOverScreen.classList.remove('hidden');
            return;
        }
        draw();
    }
    
    // --- UPDATE ---
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
        
        let canMoveDesired = false;
        if (desiredDirection.y === -1 && currentTile.u) canMoveDesired = true;
        else if (desiredDirection.y === 1 && currentTile.d) canMoveDesired = true;
        else if (desiredDirection.x === -1 && currentTile.l) canMoveDesired = true;
        else if (desiredDirection.x === 1 && currentTile.r) canMoveDesired = true;
        
        if (canMoveDesired) {
            currentDirection.x = desiredDirection.x;
            currentDirection.y = desiredDirection.y;
        }

        const nextHead = { x: head.x + currentDirection.x, y: head.y + currentDirection.y };
        const nextTile = gameMap[nextHead.y]?.[nextHead.x];
        
        if (!nextTile) { isGameOver = true; return; }
        if (currentDirection.y === -1 && !nextTile.d) { isGameOver = true; return; }
        if (currentDirection.y === 1 && !nextTile.u) { isGameOver = true; return; }
        if (currentDirection.x === -1 && !nextTile.r) { isGameOver = true; return; }
        if (currentDirection.x === 1 && !nextTile.l) { isGameOver = true; return; }
        
        for (let i = 0; i < snake.length; i++) { 
            if (nextHead.x === snake[i].x && nextHead.y === snake[i].y) { 
                isGameOver = true; return; 
            } 
        }
        
        snake.unshift(nextHead);

        let eatenIndex = -1;
        for (let i = 0; i < foods.length; i++) {
            if (nextHead.x === foods[i].x && nextHead.y === foods[i].y) {
                eatenIndex = i;
                break;
            }
        }

        if (eatenIndex !== -1) {
            foods.splice(eatenIndex, 1);
            score++;
            scoreElement.textContent = score;
            
            // Activeer de flits
            isPoweredUp = true;
            powerUpTimer = POWERUP_DURATION;

            if (score > 5) {
                const newSpeed = Math.max(20, 80 - (score - 5));
                if (newSpeed !== currentSpeed) {
                    currentSpeed = newSpeed;
                    clearInterval(gameInterval);
                    gameInterval = setInterval(gameLoop, currentSpeed);
                }
            }

            const targetFoodCount = (score >= 3) ? 5 : 1;
            let attempts = 0;
            while (foods.length < targetFoodCount && attempts < 10) {
                const newF = generateFood();
                if (newF) foods.push(newF);
                attempts++;
            }

        } else {
            snake.pop();
        }
    }

    // --- DRAW (AANGEPAST) ---
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Reset effecten
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        // 1. KLEUR & GLOED BEPALEN
        let snakeColor;
        
        if (score >= 20) {
            // RAGE MODE: Fel Rood + Maximale Gloed
            snakeColor = 'rgb(255, 0, 0)'; 
            ctx.shadowBlur = 25;
            ctx.shadowColor = 'red';
        } 
        else if (isPoweredUp) {
            // EAT MODE: Fel Oranje + Flits
            snakeColor = 'rgb(255, 165, 0)'; 
            
            // Pulse effect
            const time = Date.now() / 50; 
            const pulseIntensity = 20 + Math.sin(time) * 10;
            ctx.shadowBlur = pulseIntensity;
            ctx.shadowColor = 'orange';
        } 
        else {
            // STANDAARD MODE: Gewoon Groen (Geen verloop, geen gloed)
            snakeColor = '#4CAF50'; 
            ctx.shadowBlur = 0;
        }
        
        // 2. TEKENEN
        if (snake && snake.length > 0) {
            ctx.beginPath();
            ctx.moveTo(snake[0].x * gridSizeX + gridSizeX / 2, snake[0].y * gridSizeY + gridSizeY / 2);
            for (let i = 1; i < snake.length; i++) {
                ctx.lineTo(snake[i].x * gridSizeX + gridSizeX / 2, snake[i].y * gridSizeY + gridSizeY / 2);
            }
            const snakeWidth = Math.max(5, Math.min(gridSizeX, gridSizeY) - 5);
            ctx.strokeStyle = snakeColor;
            ctx.lineWidth = snakeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
            
            const head = snake[0];
            const headCenterX = head.x * gridSizeX + gridSizeX / 2;
            const headCenterY = head.y * gridSizeY + gridSizeY / 2;
            const headRadius = snakeWidth / 2;
            
            ctx.fillStyle = snakeColor;
            ctx.beginPath();
            ctx.arc(headCenterX, headCenterY, headRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // Gloed uitzetten voor details
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';

            let eyeOffsetX = 0, eyeOffsetY = 0;
            const eyeOffsetAmount = 5;
            if (currentDirection.x === 1) eyeOffsetX = eyeOffsetAmount;
            if (currentDirection.x === -1) eyeOffsetX = -eyeOffsetAmount;
            if (currentDirection.y === 1) eyeOffsetY = eyeOffsetAmount;
            if (currentDirection.y === -1) eyeOffsetY = -eyeOffsetAmount;
            
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(headCenterX + eyeOffsetX, headCenterY + eyeOffsetY - 4, 4, 0, Math.PI * 2);
            ctx.arc(headCenterX + eyeOffsetX, headCenterY + eyeOffsetY + 4, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(headCenterX + eyeOffsetX, headCenterY + eyeOffsetY - 4, 2, 0, Math.PI * 2);
            ctx.arc(headCenterX + eyeOffsetX, headCenterY + eyeOffsetY + 4, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        const foodSizeFactor = 2; 
        const foodWidth = gridSizeX * foodSizeFactor;
        const foodHeight = gridSizeY * foodSizeFactor;
        const offsetX = (foodWidth - gridSizeX) / 2;
        const offsetY = (foodHeight - gridSizeY) / 2;

        foods.forEach(f => {
            ctx.drawImage(
                foodImage, 
                f.x * gridSizeX - offsetX, 
                f.y * gridSizeY - offsetY, 
                foodWidth, 
                foodHeight
            );
        });
    }
    
    // --- UTILS ---
    function generateFood() {
        const safeSpots = [];
        for (let y = 0; y < tileCountY; y++) {
            for (let x = 0; x < tileCountX; x++) {
                const tile = gameMap[y][x];
                if (tile.u || tile.d || tile.l || tile.r) {
                    const onSnake = snake.some(seg => seg.x === x && seg.y === y);
                    const onOtherFood = foods.some(f => f.x === x && f.y === y);
                    if (!onSnake && !onOtherFood) {
                        safeSpots.push({x, y});
                    }
                }
            }
        }
        if (safeSpots.length > 0) {
            return safeSpots[Math.floor(Math.random() * safeSpots.length)];
        }
        return null;
    }

    function formatTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    // --- EVENT LISTENERS ---
    showInstructionsButton.addEventListener('click', () => {
        startScreen.classList.add('hidden');
        instructionsScreen.classList.remove('hidden');
    });

    startGameButton.addEventListener('click', startGame);
    
    restartButton.addEventListener('click', setupCanvasAndGame);

    goToRegisterButton.addEventListener('click', () => {
        gameOverScreen.classList.add('hidden');
        registrationScreen.classList.remove('hidden');
        playerNameInput.value = '';
        playerEmailInput.value = '';
    });

    cancelRegisterButton.addEventListener('click', () => {
        registrationScreen.classList.add('hidden');
        gameOverScreen.classList.remove('hidden');
    });

    submitScoreButton.addEventListener('click', () => {
        const name = playerNameInput.value;
        const email = playerEmailInput.value;
        if(name && email) {
            alert(`Bedankt ${name}! Je score van ${score} is geregistreerd.`);
            setupCanvasAndGame();
        } else {
            alert("Vul alsjeblieft beide velden in.");
        }
    });

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



