// ============================================================
// Week 3 Side Quest: Dixit-themed Fighting Game
// ============================================================

const STATE_START = "start";
const STATE_FIGHT = "fight";
const STATE_WIN   = "win";

let gameState = STATE_START;
let winner = null;

let punchSounds = [];
let winSound;
let bgMusic;

let stars = [];

class Fighter {
  constructor(x, y, colour, controls, label) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.speed = 0.5;
    this.maxSpeed = 4;
    this.friction = 0.78;
    this.r = 28;
    this.colour = colour;
    this.label = label;
    this.blobT = random(100);
    this.controls = controls;
    this.maxHealth = 3;
    this.health = 3;
    this.isAttacking = false;
    this.attackTimer = 0;
    this.attackDuration = 18;
    this.attackCooldown = 0;
    this.punchReach = 55;
    this.punchDir = 1;
    this.isBlocking = false;
    this.hitFlash = 0;
    this.hitLanded = false;
  }

  update() {
    if (gameState !== STATE_FIGHT) return;
    this.handleInput();
    this.applyPhysics();
    if (this.isAttacking) {
      this.attackTimer--;
      if (this.attackTimer <= 0) {
        this.isAttacking = false;
        this.hitLanded = false;
        this.attackCooldown = 20;
      }
    }
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.hitFlash > 0) this.hitFlash--;
  }

  handleInput() {
    if (keyIsDown(this.controls.left))  this.vx -= this.speed;
    if (keyIsDown(this.controls.right)) this.vx += this.speed;
    this.vx = constrain(this.vx, -this.maxSpeed, this.maxSpeed);
    if (!keyIsDown(this.controls.left) && !keyIsDown(this.controls.right)) {
      this.vx *= this.friction;
    }
    this.isBlocking = keyIsDown(this.controls.block);
  }

  applyPhysics() {
    this.x += this.vx;
    this.x = constrain(this.x, this.r, width - this.r);
  }

  startAttack(targetX) {
    if (this.isAttacking || this.attackCooldown > 0) return;
    this.isAttacking = true;
    this.attackTimer = this.attackDuration;
    this.hitLanded = false;
    this.punchDir = targetX > this.x ? 1 : -1;
    let randomPunch = punchSounds[floor(random(punchSounds.length))];
    randomPunch.play();
  }

  getPunchX() {
    return this.x + this.punchDir * this.punchReach;
  }

  takeHit() {
    if (this.isBlocking) return;
    this.health--;
    this.hitFlash = 12;
    if (this.health <= 0) {
      this.health = 0;
      endGame(this.label === "P1" ? "P2" : "P1");
    }
  }

  draw() {
    push();
    if (this.isBlocking) {
      noFill();
      stroke(255, 220, 180, 150);
      strokeWeight(3);
      ellipse(this.x, this.y, (this.r + 16) * 2, (this.r + 16) * 2);
    }
    if (this.isAttacking) {
      fill(this.hitFlash > 0 ? color(255) : this.colour);
      noStroke();
      ellipse(this.getPunchX(), this.y, 20, 20);
    }
    fill(this.hitFlash > 0 ? color(255) : this.colour);
    noStroke();
    beginShape();
    let numPoints = 48;
    for (let i = 0; i < numPoints; i++) {
      let angle = (TWO_PI / numPoints) * i;
      let noiseVal = noise(cos(angle) * 0.8 + this.blobT, sin(angle) * 0.8 + this.blobT);
      let r = this.r + map(noiseVal, 0, 1, -7, 7);
      vertex(this.x + cos(angle) * r, this.y + sin(angle) * r);
    }
    endShape(CLOSE);
    fill(255, 240, 220);
    ellipse(this.x - 9, this.y - 7, 8, 8);
    ellipse(this.x + 9, this.y - 7, 8, 8);
    fill(60, 30, 80);
    ellipse(this.x - 9, this.y - 7, 4, 4);
    ellipse(this.x + 9, this.y - 7, 4, 4);
    pop();
    this.blobT += 0.015;
  }
}

let fighter1, fighter2;
let groundY;

function preload() {
  for (let i = 1; i <= 9; i++) {
    punchSounds.push(loadSound("assets/sounds/punch_" + i + ".wav"));
  }
  winSound = loadSound("assets/sounds/win.wav");
  bgMusic  = loadSound("assets/sounds/background.mp3");
}

function setup() {
  createCanvas(800, 450);
  groundY = height - 80;
  for (let i = 0; i < 120; i++) {
    stars.push({
      x: random(width),
      y: random(groundY),
      size: random(1, 3.5),
      brightness: random(150, 255),
      twinkleOffset: random(TWO_PI)
    });
  }
  setupFighters();
}

function setupFighters() {
  fighter1 = new Fighter(
    200, groundY - 28,
    color(255, 150, 180),
    { left: 65, right: 68, attack: 70, block: 71 },
    "P1"
  );
  fighter2 = new Fighter(
    600, groundY - 28,
    color(150, 180, 255),
    { left: LEFT_ARROW, right: RIGHT_ARROW, attack: 75, block: 76 },
    "P2"
  );
}

function draw() {
  background(30, 15, 55);
  if (gameState === STATE_START) {
    drawStars();
    drawStartScreen();
  } else if (gameState === STATE_FIGHT) {
    drawStars();
    drawArena();
    updateAndDrawFighters();
    checkHits();
    drawHealthBars();
    drawFightHUD();
  } else if (gameState === STATE_WIN) {
    drawStars();
    drawArena();
    fighter1.draw();
    fighter2.draw();
    drawWinScreen();
  }
}

function startGame() {
  gameState = STATE_FIGHT;
  winner = null;
  setupFighters();
  if (!bgMusic.isPlaying()) bgMusic.loop();
}

function endGame(winnerLabel) {
  gameState = STATE_WIN;
  winner = winnerLabel;
  bgMusic.stop();
  winSound.play();
}

function drawStars() {
  noStroke();
  for (let s of stars) {
    let twinkle = map(sin(frameCount * 0.05 + s.twinkleOffset), -1, 1, 100, s.brightness);
    fill(255, 240, 200, twinkle);
    ellipse(s.x, s.y, s.size, s.size);
  }
}

function drawStartScreen() {
  noStroke();
  fill(255, 240, 180, 35);
  ellipse(width / 2, height / 2 - 155, 180, 180);
  fill(255, 240, 180, 18);
  ellipse(width / 2, height / 2 - 155, 260, 260);

  textAlign(CENTER);
  textStyle(BOLD);
  textSize(54);
  fill(255, 220, 240);
  text("DIXIT DUEL", width / 2, height / 2 - 50);

  textStyle(NORMAL);
  textSize(16);
  fill(200, 180, 220);
  text("A tale of two dreamers — 3 hits to win", width / 2, height / 2 - 8);

  textSize(13);
  fill(255, 150, 180);
  text("P1: A/D move   F attack   G block", width / 2, height / 2 + 38);
  fill(150, 180, 255);
  text("P2: Arrows move   K attack   L block", width / 2, height / 2 + 62);

  let alpha = map(sin(frameCount * 0.06), -1, 1, 120, 255);
  fill(255, 240, 200, alpha);
  textSize(16);
  text("✦ Press ENTER to begin the story ✦", width / 2, height / 2 + 118);
}

function drawWinScreen() {
  fill(30, 15, 55, 185);
  rect(0, 0, width, height);

  let winColour = winner === "P1" ? color(255, 150, 180) : color(150, 180, 255);
  noStroke();
  fill(red(winColour), green(winColour), blue(winColour), 30);
  ellipse(width / 2, height / 2, 420, 210);

  textAlign(CENTER);
  textStyle(BOLD);
  textSize(56);
  fill(winColour);
  text(winner + " WINS!", width / 2, height / 2 - 20);

  textStyle(NORMAL);
  textSize(16);
  fill(200, 180, 220);
  text("The story has been told...", width / 2, height / 2 + 25);

  let alpha = map(sin(frameCount * 0.06), -1, 1, 120, 255);
  fill(255, 240, 200, alpha);
  textSize(15);
  text("✦ Press ENTER to tell another ✦", width / 2, height / 2 + 70);
}

function drawArena() {
  noStroke();
  fill(55, 25, 85);
  rect(0, groundY, width, height - groundY);

  stroke(180, 140, 220, 80);
  strokeWeight(2);
  line(0, groundY, width, groundY);
  noStroke();

  for (let x = 60; x < width; x += 110) {
    fill(220, 180, 255, 50 + 35 * sin(frameCount * 0.04 + x));
    ellipse(x, groundY + 22, 6, 6);
  }
}

function updateAndDrawFighters() {
  fighter1.update();
  fighter2.update();
  fighter1.draw();
  fighter2.draw();
}

function checkHits() {
  if (fighter1.isAttacking && !fighter1.hitLanded) {
    let fistX = fighter1.getPunchX();
    if (abs(fistX - fighter2.x) < fighter2.r + 10) {
      fighter2.takeHit();
      fighter1.hitLanded = true;
    }
  }
  if (fighter2.isAttacking && !fighter2.hitLanded) {
    let fistX = fighter2.getPunchX();
    if (abs(fistX - fighter1.x) < fighter1.r + 10) {
      fighter1.takeHit();
      fighter2.hitLanded = true;
    }
  }
}

function drawHealthBars() {
  let barW = 200, barH = 18, barY = 45, padding = 30;

  let p1W = map(fighter1.health, 0, fighter1.maxHealth, 0, barW);
  fill(40, 20, 65);
  rect(padding, barY, barW, barH, 4);
  fill(255, 150, 180);
  rect(padding, barY, p1W, barH, 4);

  let p2W = map(fighter2.health, 0, fighter2.maxHealth, 0, barW);
  fill(40, 20, 65);
  rect(width - padding - barW, barY, barW, barH, 4);
  fill(150, 180, 255);
  rect(width - padding - p2W, barY, p2W, barH, 4);

  noStroke();
  textSize(13);
  fill(255, 200, 220);
  textAlign(LEFT);
  text("P1", padding, barY - 5);
  textAlign(RIGHT);
  fill(180, 200, 255);
  text("P2", width - padding, barY - 5);
  textAlign(CENTER);
  fill(200, 170, 230);
  textSize(14);
  text("✦ VS ✦", width / 2, barY + 13);
}

function drawFightHUD() {
  noStroke();
  fill(160, 130, 190, 180);
  textSize(12);
  textAlign(LEFT);
  text("A/D move   F attack   G block", 16, height - 12);
  textAlign(RIGHT);
  text("Arrows move   K attack   L block", width - 16, height - 12);
}

function keyPressed() {
  if (keyCode === ENTER) {
    if (gameState === STATE_START || gameState === STATE_WIN) startGame();
  }
  if (keyCode === 70 && gameState === STATE_FIGHT) fighter1.startAttack(fighter2.x);
  if (keyCode === 75 && gameState === STATE_FIGHT) fighter2.startAttack(fighter1.x);
}