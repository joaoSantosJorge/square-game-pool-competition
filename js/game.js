// Flappy Bird Game Logic
// This file will contain the main game mechanics using HTML5 Canvas

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Game variables
let bird = {
    x: 50,
    y: 300,
    width: 20,
    height: 20,
    velocity: 0,
    gravity: 0.6,
    jump: -12
};

let pipes = [];
let score = 0;
let gameRunning = false;
let gameOver = false;

const pipeWidth = 50;
const pipeGap = 150;
const pipeSpeed = 2;

// Generate a new pipe
function generatePipe() {
    const topHeight = Math.random() * (canvas.height - pipeGap - 100) + 50;
    const bottomY = topHeight + pipeGap;
    pipes.push({
        x: canvas.width,
        topHeight: topHeight,
        bottomY: bottomY
    });
}

// Game loop
function gameLoop() {
    if (!gameRunning) return;

    // Update bird
    bird.velocity += bird.gravity;
    bird.y += bird.velocity;

    // Generate pipes
    if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width - 200) {
        generatePipe();
    }

    // Update pipes
    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x -= pipeSpeed;

        // Check if bird passed the pipe
        if (!pipes[i].passed && bird.x > pipes[i].x + pipeWidth) {
            pipes[i].passed = true;
            score++;
            updateScore();
        }

        // Remove off-screen pipes
        if (pipes[i].x + pipeWidth < 0) {
            pipes.splice(i, 1);
        }
    }

    // Check collisions
    if (checkCollision()) {
        gameOver = true;
        gameRunning = false;
        showGameOver();
        return;
    }

    // Draw everything
    draw();

    requestAnimationFrame(gameLoop);
}

// Check collision
function checkCollision() {
    // Ground and ceiling
    if (bird.y + bird.height > canvas.height || bird.y < 0) {
        return true;
    }

    // Pipes
    for (let pipe of pipes) {
        if (bird.x + bird.width > pipe.x && bird.x < pipe.x + pipeWidth) {
            if (bird.y < pipe.topHeight || bird.y + bird.height > pipe.bottomY) {
                return true;
            }
        }
    }

    return false;
}

// Draw everything
function draw() {
    // Background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB'); // Sky blue
    gradient.addColorStop(1, '#98FB98'); // Light green
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Pipes
    ctx.fillStyle = '#228B22';
    for (let pipe of pipes) {
        ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
        ctx.fillRect(pipe.x, pipe.bottomY, pipeWidth, canvas.height - pipe.bottomY);
    }

    // Bird
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(bird.x, bird.y, bird.width, bird.height);

    // Score
    ctx.fillStyle = '#000';
    ctx.font = '24px Arial';
    ctx.fillText('Score: ' + score, 10, 30);
}

// Update score display
function updateScore() {
    document.getElementById('score').textContent = 'Score: ' + score;
}

// Show game over
function showGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 50);
    ctx.font = '24px Arial';
    ctx.fillText('Final Score: ' + score, canvas.width / 2, canvas.height / 2);
    ctx.fillText('Click to Restart', canvas.width / 2, canvas.height / 2 + 50);
    ctx.textAlign = 'left';

    // Submit score to leaderboard if connected
    if (typeof userAccount !== 'undefined' && userAccount && score > 0) {
        submitScore(userAccount, score);
    }
}

// Reset game
function resetGame() {
    bird.y = 300;
    bird.velocity = 0;
    pipes = [];
    score = 0;
    gameOver = false;
    updateScore();
}

// Start game
document.getElementById('start-btn').addEventListener('click', () => {
    if (gameOver) {
        resetGame();
    }
    gameRunning = true;
    gameLoop();
});

// Jump on space or click
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (gameRunning) {
            bird.velocity = bird.jump;
        }
    }
});

canvas.addEventListener('click', () => {
    if (gameOver) {
        resetGame();
        gameRunning = true;
        gameLoop();
    } else if (gameRunning) {
        bird.velocity = bird.jump;
    }
});