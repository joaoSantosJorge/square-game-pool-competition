// --- Dark/Light Mode Toggle Logic ---
const modeToggleBtn = document.getElementById('toggle-mode-btn');
const body = document.body;

// Load mode from localStorage or default to dark
function setMode(mode) {
    if (mode === 'light') {
        body.classList.add('light-mode');
        localStorage.setItem('flappy-mode', 'light');
        modeToggleBtn.textContent = 'Switch to Dark Mode';
    } else {
        body.classList.remove('light-mode');
        localStorage.setItem('flappy-mode', 'dark');
        modeToggleBtn.textContent = 'Switch to Light Mode';
    }
}

function toggleMode() {
    if (body.classList.contains('light-mode')) {
        setMode('dark');
    } else {
        setMode('light');
    }
}

if (modeToggleBtn) {
    modeToggleBtn.addEventListener('click', toggleMode);
    // On load, set mode from storage
    const savedMode = localStorage.getItem('flappy-mode');
    setMode(savedMode === 'light' ? 'light' : 'dark');
}
// Square Game Logic
// This file will contain the main game mechanics using HTML5 Canvas

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Disable image smoothing for pixel art
ctx.imageSmoothingEnabled = false;

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
let highestScore = 0;
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
            // Update highest score if current score is higher
            if (score > highestScore) {
                highestScore = score;
                updateScore();
            }
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
    const isLightMode = body.classList.contains('light-mode');
    
    // Background
    ctx.fillStyle = isLightMode ? '#fff' : '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Pipes
    ctx.fillStyle = isLightMode ? '#000' : '#fff';
    for (let pipe of pipes) {
        ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
        ctx.fillRect(pipe.x, pipe.bottomY, pipeWidth, canvas.height - pipe.bottomY);
    }

    // Bird
    ctx.fillStyle = isLightMode ? '#000' : '#fff';
    ctx.fillRect(bird.x, bird.y, bird.width, bird.height);

    // Score
    ctx.fillStyle = isLightMode ? '#000' : '#fff';
    ctx.font = "24px 'Courier New', Courier, monospace";
    ctx.fillText('Score: ' + score, 10, 30);
}

// Update score display
function updateScore() {
    document.getElementById('score').textContent = highestScore;
}

// Show game over popup
function showGameOverPopup() {
    const modal = document.getElementById('game-over-modal');
    const finalScoreDisplay = document.getElementById('final-score-display');
    const highestScoreDisplay = document.getElementById('highest-score-display');
    const triesDisplay = document.getElementById('tries-remaining-display');
    const playAgainBtn = document.getElementById('play-again-btn');
    const copyLinkBtn = document.getElementById('copy-share-link');
    const shareTwitterBtn = document.getElementById('share-twitter');
    const linkCopiedMsg = document.getElementById('share-link-copied');
    
    // Update displays
    finalScoreDisplay.textContent = score;
    highestScoreDisplay.textContent = highestScore;
    
    // Show tries remaining
    if (typeof triesRemaining !== 'undefined') {
        if (triesRemaining > 0) {
            triesDisplay.textContent = `Tries Remaining: ${triesRemaining}`;
            triesDisplay.style.color = 'var(--fg)';
        } else {
            triesDisplay.textContent = '❌ No tries remaining - Pay to play more!';
            triesDisplay.style.color = '#ff6b6b';
        }
    } else {
        triesDisplay.style.display = 'none';
    }
    
    // Generate share link
    const shareUrl = window.location.origin + '/game.html';
    const shareText = `Just scored ${highestScore} in Square Game! 🎮\n\nCompete for real USDC prizes 💰\nBeat my score and climb the leaderboard! 🏆\n\nThink you can do better? 👇`;
    
    // Copy link button
    copyLinkBtn.onclick = () => {
        navigator.clipboard.writeText(shareUrl).then(() => {
            linkCopiedMsg.style.display = 'block';
            setTimeout(() => linkCopiedMsg.style.display = 'none', 3000);
        }).catch(() => {
            // Fallback for older browsers
            const input = document.createElement('input');
            input.value = shareUrl;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            linkCopiedMsg.style.display = 'block';
            setTimeout(() => linkCopiedMsg.style.display = 'none', 3000);
        });
    };
    
    // Twitter/X share button
    shareTwitterBtn.onclick = () => {
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(twitterUrl, '_blank', 'width=550,height=420');
    };
    
    // Function to close modal
    const closeModal = () => {
        modal.style.display = 'none';
        // Reset game state to allow interactions with page
        gameOver = false;
        gameRunning = false;
    };
    
    // Play again button
    playAgainBtn.onclick = async () => {
        closeModal();

        // Check if user can play
        if (typeof triesRemaining !== 'undefined' && triesRemaining <= 0) {
            // Automatically trigger payment
            if (typeof payToPlay === 'function') {
                await payToPlay();
            } else {
                alert('You have no tries remaining. Please pay 0.02 USDC for 10 more tries!');
            }
            return;
        }
        if (typeof hasPaid !== 'undefined' && !hasPaid) {
            // Automatically trigger payment
            if (typeof payToPlay === 'function') {
                await payToPlay();
            } else {
                alert('Please pay 0.02 USDC to play the game!');
            }
            return;
        }

        resetGame();
        gameRunning = true;
        gameLoop();
    };
    
    // Close modal on background click
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeModal();
        }
    };
    
    // Show modal
    modal.style.display = 'flex';
}

// Show game over
function showGameOver() {
    // Decrement tries
    if (typeof triesRemaining !== 'undefined') {
        triesRemaining--;
        if (typeof updateTriesDisplay === 'function') {
            updateTriesDisplay();
        }
        if (triesRemaining <= 0) {
            hasPaid = false;
        }
    }
    
    // Draw game over on canvas (background)
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = "36px 'Courier New', Courier, monospace";
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2);
    ctx.textAlign = 'left';
    
    // Show the popup modal only when tries remaining = 0
    if (typeof triesRemaining !== 'undefined' && triesRemaining === 0) {
        showGameOverPopup();
    }

    // Submit score to leaderboard if connected
    if (typeof userAccount !== 'undefined' && userAccount && score > 0) {
        submitScore(userAccount, score).then(() => {
            // Refresh leaderboard after successful submission
            if (typeof getLeaderboard === 'function') {
                getLeaderboard();
            }
        }).catch(error => {
            console.error('Failed to submit score:', error);
        });
    } else {
        console.log('Score not submitted - wallet not connected or score is 0');
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
    // Check if user has paid and has tries remaining
    if (typeof triesRemaining !== 'undefined' && triesRemaining <= 0) {
        alert('You have no tries remaining. Please pay 0.02 USDC for 10 more tries!');
        return;
    }
    if (typeof hasPaid !== 'undefined' && !hasPaid) {
        alert('Please pay 0.02 USDC to play the game!');
        return;
    }
    
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
    // If modal is open, don't process canvas clicks
    const modal = document.getElementById('game-over-modal');
    if (modal && modal.style.display === 'flex') {
        return;
    }
    
    if (gameOver) {
        // Check if user has paid and has tries remaining before allowing restart
        if (typeof triesRemaining !== 'undefined' && triesRemaining <= 0) {
            alert('You have no tries remaining. Please pay 0.02 USDC for 10 more tries!');
            return;
        }
        if (typeof hasPaid !== 'undefined' && !hasPaid) {
            alert('Please pay 0.02 USDC to play the game!');
            return;
        }
        
        resetGame();
        gameRunning = true;
        gameLoop();
    } else if (gameRunning) {
        bird.velocity = bird.jump;
    }
});