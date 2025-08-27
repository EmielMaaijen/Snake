document.addEventListener('DOMContentLoaded', () => {
    // DOM Elementen
    const gameContainer = document.querySelector('.game-container');
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const overlays = document.querySelectorAll('.game-overlay');
    const scoreElement = document.getElementById('score');
    const startScreen = document.getElementById('startScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const finalScoreElement = document.getElementById('finalScore');
    const startButton = document.getElementById('startButton');
    const restartButton = document.getElementById('restartButton');
    const timerElement = document.getElementById('timer'); // Timer element

    // Spelinstellingen
    const gridSize = 30;
    let tileCountX, tileCountY;
    const gameSpeed = 100;

    // Power-up variabelen
    let isPoweredUp = false;
    let powerUpTimer = 0;
    const POWERUP_DURATION = 80;

    // Food afbeelding
    const foodImage = new Image();
    foodImage.src = 'food.png';

    // Spelvariabelen
    let snake, food, score, direction, gameInterval, isGameOver;
    
    // --- NIEUW: Timer variabelen ---
    let gameTimerInterval;
    let elapsedTime = 0;

    foodImage.onload = () => {
        setupCanvasAndGame();
    };
    foodImage.onerror = () => {
        alert("Food-afbeelding niet gevonden! Controleer de bestandsnaam in script.js.");
    };

    function setupCanvasAndGame() {
        const availableHeight = window.innerHeight * 0.90;
        const aspectRatio = 4 / 3;
        const numTilesY = Math.floor(availableHeight / gridSize);
        canvas.height = Math.max(10, numTilesY) * gridSize;
        canvas.width = Math.floor((canvas.height * aspectRatio) / gridSize) * gridSize;

        tileCountX = canvas.width / gridSize;
        tileCountY = canvas.height / gridSize;

        const canvasTopOffset = canvas.offsetTop;
        const canvasLeftOffset = canvas.offsetLeft;

        overlays.forEach(overlay => {
            overlay.style.top = `${canvasTopOffset}px`;
            overlay.style.left = `${canvasLeftOffset}px`;
            overlay.style.width = `${canvas.width}px`;
            overlay.style.height = `${canvas.height}px`;
        });
        
        snake = [{ x: Math.floor(tileCountX / 2), y: Math.floor(tileCountY / 2) }];
        food = generateFood();
        score = 0;
        direction = { x: 0, y: 0 };
        isGameOver = false;
        
        scoreElement.textContent = score;
        finalScoreElement.textContent = score;
        
        // Reset timer
        clearInterval(gameTimerInterval);
        elapsedTime = 0;
        timerElement.textContent = formatTime(elapsedTime);
        
        gameOverScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
        draw();
    }
    
    function startGame() {
        startScreen.classList.add('hidden');
        clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, gameSpeed);

        // --- NIEUW: Start de timer ---
        clearInterval(gameTimerInterval); // Zorg dat er geen oude timers lopen
        gameTimerInterval = setInterval(() => {
            elapsedTime++;
            timerElement.textContent = formatTime(elapsedTime);
        }, 1000); // Update elke seconde
    }
    
    function gameLoop() {
        update();
        if (isGameOver) {
            clearInterval(gameInterval);
            clearInterval(gameTimerInterval); // --- NIEUW: Stop de timer ---
            finalScoreElement.textContent = score;
            gameOverScreen.classList.remove('hidden');
            return;
        }
        draw();
    }
    
    // --- NIEUW: Hulpfunctie om tijd te formatteren (MM:SS) ---
    function formatTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        
        const paddedMinutes = String(minutes).padStart(2, '0');
        const paddedSeconds = String(seconds).padStart(2, '0');
        
        return `${paddedMinutes}:${paddedSeconds}`;
    }

    // --- De rest van je functies (update, draw, etc.) blijft ongewijzigd ---

    function update() {
        if (isPoweredUp) {
            powerUpTimer--;
            if (powerUpTimer <= 0) isPoweredUp = false;
        }
        const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
        if (head.x < 0 || head.x >= tileCountX || head.y < 0 || head.y >= tileCountY) { isGameOver = true; return; }
        for (let i = 1; i < snake.length; i++) { if (head.x === snake[i].x && head.y === snake[i].y) { isGameOver = true; return; } }
        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
            score++;
            scoreElement.textContent = score;
            food = generateFood();
            isPoweredUp = true;
            powerUpTimer = POWERUP_DURATION;
        } else {
            snake.pop();
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let snakeColor = '#34AB43';
        if (isPoweredUp) {
            const ratio = Math.min(score / 50, 1);
            const greenValue = 165 - (165 * ratio);
            snakeColor = `rgb(255, ${Math.floor(greenValue)}, 0)`;
        }
        if (snake.length > 0) {
            ctx.beginPath();
            ctx.moveTo(snake[0].x * gridSize + gridSize / 2, snake[0].y * gridSize + gridSize / 2);
            for (let i = 1; i < snake.length; i++) {
                ctx.lineTo(snake[i].x * gridSize + gridSize / 2, snake[i].y * gridSize + gridSize / 2);
            }
            ctx.strokeStyle = snakeColor;
            const snakeWidth = 20;
            ctx.lineWidth = snakeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();

            const head = snake[0];
            const headCenterX = head.x * gridSize + gridSize / 2;
            const headCenterY = head.y * gridSize + gridSize / 2;
            const headRadius = snakeWidth / 2;
            
            ctx.fillStyle = snakeColor;
            ctx.beginPath();
            ctx.arc(headCenterX, headCenterY, headRadius, 0, Math.PI * 2);
            ctx.fill();

            let eyeOffsetX = 0;
            let eyeOffsetY = 0;
            const eyeOffsetAmount = 5;

            if (direction.x === 1) eyeOffsetX = eyeOffsetAmount;
            if (direction.x === -1) eyeOffsetX = -eyeOffsetAmount;
            if (direction.y === 1) eyeOffsetY = eyeOffsetAmount;
            if (direction.y === -1) eyeOffsetY = -eyeOffsetAmount;

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
        ctx.drawImage(foodImage, food.x * gridSize, food.y * gridSize, gridSize, gridSize);
    }
    
    function generateFood() {
        let newFood;
        do {
            newFood = {
                x: Math.floor(Math.random() * tileCountX),
                y: Math.floor(Math.random() * tileCountY)
            };
        } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
        return newFood;
    }

    window.addEventListener('keydown', e => {
        if (direction.x === 0 && direction.y === 0 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) { startGame(); }
        switch (e.key) {
            case 'ArrowUp': if (direction.y === 0) direction = { x: 0, y: -1 }; break;
            case 'ArrowDown': if (direction.y === 0) direction = { x: 0, y: 1 }; break;
            case 'ArrowLeft': if (direction.x === 0) direction = { x: -1, y: 0 }; break;
            case 'ArrowRight': if (direction.x === 0) direction = { x: 1, y: 0 }; break;
        }
    });
    
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', setupCanvasAndGame);
    window.addEventListener('resize', setupCanvasAndGame);
});