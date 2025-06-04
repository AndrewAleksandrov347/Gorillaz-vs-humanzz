const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreDisplay = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');
const messageBox = document.getElementById('messageBox');

canvas.width = 800;
canvas.height = 450;

let score = 0;
let lives = 3;
let gameOver = false;
let gamePaused = false;
const PIXEL_SCALE = 4;

const gorilla = {
    x: 50,
    y: canvas.height / 2 - (30 * PIXEL_SCALE) / 2,
    width: 10 * PIXEL_SCALE,
    height: 15 * PIXEL_SCALE,
    bodyColor: '#3A3A3A',
    headColor: '#505050',
    armColor: '#454545',
    speed: 9,
    grabReach: 20 * PIXEL_SCALE,
    heldHuman: null,
    throwCooldown: 0,
    maxThrowCooldown: 35
};

const humans = [];
const humanProto = {
    width: 5 * PIXEL_SCALE,
    height: 10 * PIXEL_SCALE,
    bodyColor: '#D2691E',
    headColor: '#FFC0CB',
    initialSpeed: 0.9,
    maxSpeed: 3.0,
    speedIncrement: 0.08,
    throwSpeedX: 7,
    throwSpeedY: -4.5
};
let initialHumanSpawnInterval = 200;
let humanSpawnInterval = initialHumanSpawnInterval;
let minHumanSpawnInterval = 60;
let humanSpawnTimer = 0;
let maxHumansOnScreen = 6;

const keys = {
    ArrowUp: false,
    ArrowDown: false,
    Space: false,
    SpaceReleased: true
};

window.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowUp') keys.ArrowUp = true;
    if (e.code === 'ArrowDown') keys.ArrowDown = true;
    if (e.code === 'Space') {
        if (keys.SpaceReleased) {
            keys.Space = true;
            keys.SpaceReleased = false;
        } else {
            keys.Space = false;
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowUp') keys.ArrowUp = false;
    if (e.code === 'ArrowDown') keys.ArrowDown = false;
    if (e.code === 'Space') {
        keys.Space = false;
        keys.SpaceReleased = true;
    }
});

restartButton.addEventListener('click', resetGame);

function showMessage(text, duration = 2000) {
    messageBox.textContent = text;
    messageBox.style.display = 'block';
    setTimeout(() => {
        messageBox.style.display = 'none';
    }, duration);
}

function drawPixelRect(x, y, w, h, color, scale = PIXEL_SCALE) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * scale, h * scale);
}

function drawBackground() {
    ctx.fillStyle = '#5C4033';
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height - 50);
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(1, '#ADD8E6');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height - 50);
}

function drawGorilla() {
    const gx = gorilla.x;
    const gy = gorilla.y;
    const scale = PIXEL_SCALE / 2;

    drawPixelRect(gx, gy + 3 * scale, 10, 12, gorilla.bodyColor, scale);
    drawPixelRect(gx + 2 * scale, gy, 6, 4, gorilla.headColor, scale);
    drawPixelRect(gx + 1 * scale, gy + 13 * scale, 3, 4, gorilla.bodyColor, scale);
    drawPixelRect(gx + 6 * scale, gy + 13 * scale, 3, 4, gorilla.bodyColor, scale);

    if (!gorilla.heldHuman) {
        drawPixelRect(gx + 10 * scale, gy + 4 * scale, 5, 2, gorilla.armColor, scale);
        drawPixelRect(gx - 3 * scale, gy + 4 * scale, 5, 2, gorilla.armColor, scale);
    } else {
        drawPixelRect(gx + 9 * scale, gy + 5 * scale, 3, 3, gorilla.armColor, scale);
        drawPixelRect(gx - 0 * scale, gy + 5 * scale, 3, 3, gorilla.armColor, scale);
    }
}

function drawHuman(human) {
    const hx = human.x;
    const hy = human.y;
    const scale = PIXEL_SCALE / 2.5;

    drawPixelRect(hx, hy + 2 * scale, 5, 8, human.bodyColor, scale);
    drawPixelRect(hx + 1 * scale, hy, 3, 3, human.headColor, scale);
    drawPixelRect(hx + 0.5 * scale, hy + 9 * scale, 1.5, 2, human.bodyColor, scale);
    drawPixelRect(hx + 3 * scale, hy + 9 * scale, 1.5, 2, human.bodyColor, scale);

    if (human.isGrabbed) {
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(human.x -1, human.y -1, human.width + 2, human.height + 2);
    }
}

function drawUI() {
    scoreDisplay.textContent = `Score: ${score}`;
    livesDisplay.textContent = `Lives: ${lives}`;
}

function updateGorilla() {
    if (gameOver || gamePaused) return;

    if (keys.ArrowUp && gorilla.y > 0) {
        gorilla.y -= gorilla.speed;
    }
    if (keys.ArrowDown && gorilla.y < canvas.height - gorilla.height - 50) {
        gorilla.y += gorilla.speed;
    }
    if (gorilla.y > canvas.height - gorilla.height - 50) {
        gorilla.y = canvas.height - gorilla.height - 50;
    }
    if (gorilla.y < 0) {
        gorilla.y = 0;
    }

    if (gorilla.throwCooldown > 0) {
        gorilla.throwCooldown--;
    }

    if (keys.Space && gorilla.throwCooldown === 0) {
        if (gorilla.heldHuman) {
            gorilla.heldHuman.isGrabbed = false;
            gorilla.heldHuman.isThrown = true;
            gorilla.heldHuman.velocityY = humanProto.throwSpeedY;
            gorilla.heldHuman.velocityX = humanProto.throwSpeedX;
            gorilla.heldHuman = null;
            score += 10;
            gorilla.throwCooldown = gorilla.maxThrowCooldown;
            showMessage('Human thrown!', 1000);
            updateDifficulty();
        } else {
            const grabZoneX = gorilla.x + gorilla.width;
            const grabZoneY = gorilla.y + gorilla.height / 2 - gorilla.grabReach / 2;
            const grabZoneWidth = gorilla.grabReach;
            const grabZoneHeight = gorilla.grabReach;

            for (let i = 0; i < humans.length; i++) {
                const human = humans[i];
                if (!human.isGrabbed && !human.isThrown) {
                    if (human.x < grabZoneX + grabZoneWidth &&
                        human.x + human.width > grabZoneX &&
                        human.y < grabZoneY + grabZoneHeight &&
                        human.y + human.height > grabZoneY) {
                        gorilla.heldHuman = human;
                        human.isGrabbed = true;
                        showMessage('Human grabbed!', 1000);
                        break;
                    }
                }
            }
        }
        keys.Space = false;
    }

    if (gorilla.heldHuman) {
        gorilla.heldHuman.x = gorilla.x + gorilla.width - gorilla.heldHuman.width / 2;
        gorilla.heldHuman.y = gorilla.y + gorilla.height / 2 - gorilla.heldHuman.height / 2;
    }
}

function spawnHuman() {
    if (humans.length >= maxHumansOnScreen || gameOver || gamePaused) return;

    humanSpawnTimer++;
    if (humanSpawnTimer >= humanSpawnInterval) {
        humanSpawnTimer = 0;
        const currentSpeed = Math.min(humanProto.maxSpeed, humanProto.initialSpeed + (score / 120) * humanProto.speedIncrement);

        const newHuman = {
            x: canvas.width,
            y: Math.random() * (canvas.height - humanProto.height - 50),
            width: humanProto.width,
            height: humanProto.height,
            bodyColor: humanProto.bodyColor,
            headColor: humanProto.headColor,
            speed: currentSpeed,
            isGrabbed: false,
            isThrown: false,
            velocityY: 0,
            velocityX: 0
        };
        if (newHuman.y + newHuman.height > canvas.height - 50) {
            newHuman.y = canvas.height - 50 - newHuman.height;
        }
        if (newHuman.y < 0) {
            newHuman.y = 0;
        }

        humans.push(newHuman);
    }
}

function updateDifficulty() {
    humanSpawnInterval = Math.max(minHumanSpawnInterval, initialHumanSpawnInterval - Math.floor(score / 40) * 5);

    if (score > 50 && maxHumansOnScreen < 7) maxHumansOnScreen = 7;
    if (score > 100 && maxHumansOnScreen < 8) maxHumansOnScreen = 8;
    if (score > 180 && maxHumansOnScreen < 9) maxHumansOnScreen = 9;
}

function updateHumans() {
    if (gameOver || gamePaused) return;

    for (let i = humans.length - 1; i >= 0; i--) {
        const human = humans[i];

        if (human.isGrabbed) continue;

        if (human.isThrown) {
            human.x += human.velocityX;
            human.y += human.velocityY;
            human.velocityY += 0.18;

            if (human.x > canvas.width + human.width || human.y > canvas.height || human.y + human.height < 0) {
                humans.splice(i, 1);
            }
        } else {
            human.x -= human.speed;

            if (human.x + human.width < 0) {
                humans.splice(i, 1);
                lives--;
                showMessage('Human escaped! -1 Life', 1500);
                if (lives <= 0) {
                    triggerGameOver();
                }
            }
        }
    }
}

function triggerGameOver() {
    gameOver = true;
    gamePaused = true;
    finalScoreDisplay.textContent = `Your Score: ${score}`;
    gameOverScreen.style.display = 'flex';
}

function resetGame() {
    score = 0;
    lives = 3;
    gameOver = false;
    gamePaused = false;
    gorilla.y = canvas.height / 2 - gorilla.height / 2;
    gorilla.heldHuman = null;
    gorilla.throwCooldown = 0;
    humans.length = 0;
    humanSpawnInterval = initialHumanSpawnInterval;
    maxHumansOnScreen = 6;
    humanSpawnTimer = 0;
    keys.Space = false;
    keys.SpaceReleased = true;

    gameOverScreen.style.display = 'none';
    messageBox.style.display = 'none';
    gameLoop();
}

function gameLoop() {
    if (gamePaused && gameOver) {
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground();

    updateGorilla();
    spawnHuman();
    updateHumans();

    drawGorilla();
    humans.forEach(drawHuman);
    drawUI();

    if (!gameOver) {
        requestAnimationFrame(gameLoop);
    }
}

showMessage('Get Ready!', 2000);
setTimeout(() => {
    gameLoop();
}, 500);
