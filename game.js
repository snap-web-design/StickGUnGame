
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const healthDisplay = document.getElementById("health");
const killsDisplay = document.getElementById("kills");
const enemiesDisplay = document.getElementById("enemies");

const overlay = document.getElementById("gameOverlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const startButton = document.getElementById("startButton");

const moveArea = document.getElementById("moveJoystick");
const aimArea = document.getElementById("aimJoystick");
const moveKnob = document.getElementById("moveKnob");
const aimKnob = document.getElementById("aimKnob");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const BULLET_SPEED = 550;
const SHOOT_DELAY = 180;
const MAX_ENEMIES = 12;
const JOYSTICK_RANGE = 42;

let running = false;
let animationId = null;

let player;
let enemies = [];
let bullets = [];

let keys = {};
let mouse = { x: WIDTH / 2, y: HEIGHT / 2 };
let mouseDown = false;

let kills = 0;
let health = 100;

let lastShot = 0;
let lastSpawn = 0;
let lastTime = 0;

// JOYSTICK DATA

const moveStick = {
    active: false,
    pointerId: null,
    x: 0,
    y: 0
};

const aimStick = {
    active: false,
    pointerId: null,
    x: 0,
    y: 0
};


// CREATE PLAYER

function createPlayer() {
    return {
        x: WIDTH / 2,
        y: HEIGHT / 2,
        size: 18,
        speed: 270,
        angle: 0,
        damageCooldown: 0
    };
}


// CREATE ENEMY

function createEnemy() {

    let x, y;

    const side = Math.floor(Math.random() * 4);

    if (side === 0) {
        x = Math.random() * WIDTH;
        y = 10;
    } else if (side === 1) {
        x = WIDTH - 10;
        y = Math.random() * HEIGHT;
    } else if (side === 2) {
        x = Math.random() * WIDTH;
        y = HEIGHT - 10;
    } else {
        x = 10;
        y = Math.random() * HEIGHT;
    }

    return {
        x,
        y,
        speed: 65 + Math.random() * 35,
        size: 18,
        hitFlash: 0,
        damageCooldown: 0
    };
}


// DRAW ARENA

function drawArena() {

    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = "#191919";
    ctx.lineWidth = 1;

    for (let x = 0; x <= WIDTH; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, HEIGHT);
        ctx.stroke();
    }

    for (let y = 0; y <= HEIGHT; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WIDTH, y);
        ctx.stroke();
    }

    ctx.strokeStyle = "#555";
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, WIDTH - 4, HEIGHT - 4);
}


// DRAW SQUARE STICKMAN

function drawStickman(x, y, angle, isPlayer, flash = 0) {

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.fillStyle = flash > 0
        ? "#ffffff"
        : isPlayer ? "#ffffff" : "#888888";

    // Head
    ctx.fillRect(-7, -19, 14, 14);

    // Body
    ctx.fillRect(-6, -3, 12, 17);

    // Arms
    ctx.fillRect(-15, -1, 9, 6);
    ctx.fillRect(6, -1, 9, 6);

    // Legs
    ctx.fillRect(-7, 14, 6, 12);
    ctx.fillRect(1, 14, 6, 12);

    // Red player gun
    if (isPlayer) {

        ctx.fillStyle = "#ff2929";

        // Barrel
        ctx.fillRect(3, -5, 30, 5);

        // Handle
        ctx.fillRect(9, 0, 6, 9);

        // Muzzle
        ctx.fillStyle = "#ff5555";
        ctx.fillRect(29, -6, 5, 7);
    }

    ctx.restore();
}


// DRAW ENEMIES

function drawEnemies() {

    enemies.forEach(enemy => {

        const angle = Math.atan2(
            player.y - enemy.y,
            player.x - enemy.x
        );

        drawStickman(
            enemy.x,
            enemy.y,
            angle,
            false,
            enemy.hitFlash
        );

    });
}


// DRAW BULLETS

function drawBullets() {

    bullets.forEach(bullet => {

        ctx.fillStyle = "rgba(22, 140, 255, 0.2)";
        ctx.fillRect(bullet.x - 8, bullet.y - 8, 16, 16);

        ctx.fillStyle = "#168cff";
        ctx.fillRect(bullet.x - 4, bullet.y - 4, 8, 8);

    });

}


// MOVE PLAYER

function movePlayer(delta) {

    let dx = 0;
    let dy = 0;

    // Keyboard movement
    if (keys["w"] || keys["arrowup"]) dy -= 1;
    if (keys["s"] || keys["arrowdown"]) dy += 1;
    if (keys["a"] || keys["arrowleft"]) dx -= 1;
    if (keys["d"] || keys["arrowright"]) dx += 1;

    // Mobile joystick movement
    dx += moveStick.x;
    dy += moveStick.y;

    const length = Math.hypot(dx, dy);

    if (length > 1) {
        dx /= length;
        dy /= length;
    }

    player.x += dx * player.speed * delta;
    player.y += dy * player.speed * delta;

    // Arena boundaries
    player.x = Math.max(30, Math.min(WIDTH - 30, player.x));
    player.y = Math.max(30, Math.min(HEIGHT - 30, player.y));

    // Mobile aiming
    if (aimStick.active) {

        const aimLength = Math.hypot(
            aimStick.x,
            aimStick.y
        );

        if (aimLength > 0.15) {
            player.angle = Math.atan2(
                aimStick.y,
                aimStick.x
            );
        }

    } else {

        // PC mouse aiming
        player.angle = Math.atan2(
            mouse.y - player.y,
            mouse.x - player.x
        );

    }

}


// SHOOT

function shoot(time) {

    const shooting = mouseDown || aimStick.active;

    if (!shooting) return;

    if (time - lastShot < SHOOT_DELAY) return;

    lastShot = time;

    const angle = player.angle;

    bullets.push({
        x: player.x + Math.cos(angle) * 35,
        y: player.y + Math.sin(angle) * 35,
        vx: Math.cos(angle) * BULLET_SPEED,
        vy: Math.sin(angle) * BULLET_SPEED,
        life: 1.5
    });

}


// UPDATE BULLETS

function updateBullets(delta) {

    bullets.forEach(bullet => {

        bullet.x += bullet.vx * delta;
        bullet.y += bullet.vy * delta;

        bullet.life -= delta;

    });

    bullets = bullets.filter(bullet =>
        bullet.life > 0 &&
        bullet.x > 0 &&
        bullet.x < WIDTH &&
        bullet.y > 0 &&
        bullet.y < HEIGHT
    );

}


// ENEMY AI

function updateEnemies(delta) {

    enemies.forEach(enemy => {

        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;

        const distance = Math.hypot(dx, dy);

        if (distance > 0) {

            enemy.x += dx / distance * enemy.speed * delta;
            enemy.y += dy / distance * enemy.speed * delta;

        }

        enemy.damageCooldown = Math.max(
            0,
            enemy.damageCooldown - delta
        );

        // Enemy touches player
        if (distance < 29 && player.damageCooldown <= 0) {

            health -= 10;
            player.damageCooldown = 0.5;

            healthDisplay.textContent = health;

            if (health <= 0) {
                gameOver();
                return;
            }

        }

    });

    player.damageCooldown = Math.max(
        0,
        player.damageCooldown - delta
    );

}


// BULLET COLLISIONS

function checkBulletHits() {

    bullets = bullets.filter(bullet => {

        for (let i = enemies.length - 1; i >= 0; i--) {

            const enemy = enemies[i];

            const distance = Math.hypot(
                bullet.x - enemy.x,
                bullet.y - enemy.y
            );

            if (distance < 21) {

                enemies.splice(i, 1);

                kills++;
                killsDisplay.textContent = kills;

                return false;
            }

        }

        return true;

    });

}


// SPAWN ENEMIES

function spawnEnemies(time) {

    if (
        time - lastSpawn > 1500 &&
        enemies.length < MAX_ENEMIES
    ) {

        enemies.push(createEnemy());
        lastSpawn = time;

    }

    enemiesDisplay.textContent = enemies.length;

}


// UPDATE GAME

function update(delta, time) {

    movePlayer(delta);

    shoot(time);

    updateBullets(delta);

    updateEnemies(delta);

    if (!running) return;

    checkBulletHits();

    spawnEnemies(time);

}


// DRAW GAME

function draw() {

    drawArena();

    drawBullets();

    drawEnemies();

    drawStickman(
        player.x,
        player.y,
        player.angle,
        true
    );

}


// MAIN GAME LOOP

function gameLoop(time) {

    if (!running) return;

    const delta = Math.min(
        (time - lastTime) / 1000,
        0.04
    );

    lastTime = time;

    update(delta, time);

    draw();

    if (running) {
        animationId = requestAnimationFrame(gameLoop);
    }

}


// RESET JOYSTICKS

function resetJoystick(stick, knob) {

    stick.active = false;
    stick.pointerId = null;
    stick.x = 0;
    stick.y = 0;

    knob.style.transform = "translate(0px, 0px)";

}


// JOYSTICK CONTROL SYSTEM

function setupJoystick(area, knob, stick) {

    area.addEventListener("pointerdown", event => {

        if (!running || stick.active) return;

        event.preventDefault();

        stick.active = true;
        stick.pointerId = event.pointerId;

        area.setPointerCapture(event.pointerId);

        updateJoystick(event);

    });

    function updateJoystick(event) {

        if (!stick.active) return;

        const rect = area.getBoundingClientRect();

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        let dx = event.clientX - centerX;
        let dy = event.clientY - centerY;

        const distance = Math.hypot(dx, dy);

        if (distance > JOYSTICK_RANGE) {

            dx = dx / distance * JOYSTICK_RANGE;
            dy = dy / distance * JOYSTICK_RANGE;

        }

        stick.x = dx / JOYSTICK_RANGE;
        stick.y = dy / JOYSTICK_RANGE;

        knob.style.transform =
            `translate(${dx}px, ${dy}px)`;

    }

    area.addEventListener("pointermove", event => {

        if (event.pointerId !== stick.pointerId) return;

        event.preventDefault();
        updateJoystick(event);

    });

    function releaseJoystick(event) {

        if (event.pointerId !== stick.pointerId) return;

        resetJoystick(stick, knob);

    }

    area.addEventListener("pointerup", releaseJoystick);
    area.addEventListener("pointercancel", releaseJoystick);
    area.addEventListener("lostpointercapture", event => {

        if (event.pointerId === stick.pointerId) {
            resetJoystick(stick, knob);
        }

    });

}


// ACTIVATE BOTH JOYSTICKS

setupJoystick(moveArea, moveKnob, moveStick);
setupJoystick(aimArea, aimKnob, aimStick);


// START GAME

function startGame() {

    if (running) return;

    player = createPlayer();

    enemies = [];
    bullets = [];

    kills = 0;
    health = 100;

    lastShot = 0;
    lastSpawn = performance.now();

    mouseDown = false;

    resetJoystick(moveStick, moveKnob);
    resetJoystick(aimStick, aimKnob);

    healthDisplay.textContent = health;
    killsDisplay.textContent = kills;

    // Initial enemies
    for (let i = 0; i < 3; i++) {
        enemies.push(createEnemy());
    }

    enemiesDisplay.textContent = enemies.length;

    running = true;

    overlay.style.display = "none";

    lastTime = performance.now();

    cancelAnimationFrame(animationId);

    animationId = requestAnimationFrame(gameLoop);

}


// GAME OVER

function gameOver() {

    if (!running) return;

    running = false;

    cancelAnimationFrame(animationId);

    mouseDown = false;

    resetJoystick(moveStick, moveKnob);
    resetJoystick(aimStick, aimKnob);

    overlayTitle.textContent = "GAME OVER";

    overlayText.textContent =
        "You eliminated " + kills + " enemies!";

    startButton.textContent = "PLAY AGAIN";

    overlay.style.display = "flex";

}


// PC MOUSE AIMING

canvas.addEventListener("mousemove", event => {

    const rect = canvas.getBoundingClientRect();

    mouse.x = (event.clientX - rect.left) *
        (WIDTH / rect.width);

    mouse.y = (event.clientY - rect.top) *
        (HEIGHT / rect.height);

});


// PC MOUSE SHOOTING

canvas.addEventListener("mousedown", event => {

    if (event.button === 0) {
        mouseDown = true;
    }

});

window.addEventListener("mouseup", () => {
    mouseDown = false;
});

canvas.addEventListener("contextmenu", event => {
    event.preventDefault();
});


// KEYBOARD CONTROLS

window.addEventListener("keydown", event => {

    const key = event.key.toLowerCase();

    keys[key] = true;

    if (
        ["arrowup", "arrowdown", "arrowleft",
         "arrowright", " "].includes(key)
    ) {
        event.preventDefault();
    }

    if (key === " " && !running) {
        startGame();
    }

});

window.addEventListener("keyup", event => {

    keys[event.key.toLowerCase()] = false;

});


// PREVENT STUCK INPUT WHEN SWITCHING APPS

window.addEventListener("blur", () => {

    keys = {};
    mouseDown = false;

    resetJoystick(moveStick, moveKnob);
    resetJoystick(aimStick, aimKnob);

});


// START BUTTON

startButton.addEventListener("click", startGame);


// INITIAL SCREEN

drawArena();
