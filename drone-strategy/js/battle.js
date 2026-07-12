// ============================================================
// battle.js — 战斗循环、日志、进度、启停控制（第6个加载）
// ============================================================

const GAME_TICK_MS = 500;  // 原 gameSpeed=2 等效频率

// 游戏循环启动函数
function startGameLoop() {
    if (gameInterval) {
        clearInterval(gameInterval);
    }
    gameInterval = setInterval(() => {
        gameTime += 1;
        updateGame();
    }, GAME_TICK_MS);
}

function updateGame() {
    updateUnitsList();
    updateEnemyList();
    updateBattleLog();
    updateProgress();
    simulateEnemyAI();
    updateUnitPatrol();
    updateDroneSquads();
    updateFormations();
    updateClouds();
    updateEnemyDisplay();
    checkGameEnd();
}

// --- 对局结束判定 ---
function checkGameEnd() {
    if (!gameRunning) return;

    // 胜利条件：指挥中心被摧毁
    var cmd = mockEnemyUnits.find(function(e) { return e.type === 'command'; });
    if (cmd && cmd.health <= 0) {
        showGameOver(true);
        return;
    }

    // 失败条件1：我方单位全灭
    var allDead = mockUnits.every(function(u) { return u.health <= 0; });
    if (allDead) {
        showGameOver(false);
        return;
    }

    // 失败条件2：超时（10分钟 = 600秒，每tick 0.5秒 = 1200 ticks）
    if (gameTime >= 1200) {
        showGameOver(false);
        return;
    }
}

function showGameOver(win) {
    gameRunning = false;
    if (gameInterval) {
        clearInterval(gameInterval);
        gameInterval = null;
    }

    var overlay = document.getElementById('gameOverOverlay');
    var title = document.getElementById('gameOverTitle');
    var sub = document.getElementById('gameOverSub');

    if (win) {
        title.textContent = '任务完成';
        title.className = 'win';
        sub.textContent = '敌方指挥中心已被摧毁';
    } else {
        title.textContent = '任务失败，再接再厉';
        title.className = 'lose';
        sub.textContent = '总结教训，调整战术再次挑战';
    }

    overlay.classList.add('show');
}

function restartBattle() {
    var overlay = document.getElementById('gameOverOverlay');
    overlay.classList.remove('show');
    startBattle();
}

function goToHomeFromBattle() {
    var overlay = document.getElementById('gameOverOverlay');
    overlay.classList.remove('show');
    gameRunning = false;
    if (gameInterval) {
        clearInterval(gameInterval);
        gameInterval = null;
    }
    showPage('page-home');
}

function toggleGroupView() {
    showFormationManager();
}

// --- 战斗日志 ---

function addBattleLog(message) {
    const log = document.getElementById('battle-log');
    const time = formatTime(gameTime);
    log.innerHTML += `[${time}] ${message}<br>`;
    log.scrollTop = log.scrollHeight;
}

function updateBattleLog() {
    if (gameTime % 30 === 0 && gameTime > 0) {
        const randomEvents = ['侦察范围更新', '单位状态检查', '敌方动向监测', '战术分析中'];
        addBattleLog(randomEvents[Math.floor(Math.random() * randomEvents.length)]);
    }
}

// --- 任务进度 ---

function updateProgress() {
    const hiddenEnemies = mockEnemyUnits.filter(e => e.hidden);
    const totalHiddenEnemies = hiddenEnemies.length;
    const discoveredHiddenEnemies = hiddenEnemies.filter(e => e.visible).length;
    const destroyedHiddenEnemies = hiddenEnemies.filter(e => e.health <= 0).length;
    const commandCenterDestroyed = mockEnemyUnits.find(e => e.type === 'command' && e.health <= 0);

    let progress = 0;
    if (totalHiddenEnemies > 0) {
        if (discoveredHiddenEnemies > 0) {
            progress = (discoveredHiddenEnemies / totalHiddenEnemies) * 30;
        }
        if (destroyedHiddenEnemies > 0) {
            progress += (destroyedHiddenEnemies / totalHiddenEnemies) * 60;
        }
    }
    if (commandCenterDestroyed) {
        progress = 100;
    }

    progress = Math.min(progress, 100);
    document.getElementById('mission-progress').style.width = progress + '%';
    document.getElementById('mission-progress-text').textContent = Math.floor(progress) + '%';
}

// 第二个 startBattle（真正的战斗开始函数）
function startBattle() {
    document.getElementById('preparation-overlay').style.display = 'none';
    gameRunning = true;
    gameTime = 0;
    friendlyCommandIssued = false;

    if (gameInterval) {
        clearInterval(gameInterval);
        gameInterval = null;
    }

    mockUnits.forEach(unit => {
        unit.health = unit.maxHealth;
        unit.ammo = unit.maxAmmo;
        // 开局自动部署，位置在基地内（基地中心 90,360）
        unit.status = 'deployed';
        var baseX = 80, baseY = 350;
        unit.x = baseX + (unit.id * 7) + Math.random() * 8;
        unit.y = baseY + Math.random() * 30;
        unit.patrolTargetX = unit.x;
        unit.patrolTargetY = unit.y;
        unit.lastPatrolUpdate = 0;
        unit.movingToPatrol = false;
        unit.currentPatrolTargetX = null;
        unit.currentPatrolTargetY = null;
        unit.isMovingToAttack = false;
        unit.attackTargetX = null;
        unit.attackTargetY = null;
        unit.isRecalling = false;
        unit.recallTargetX = null;
        unit.recallTargetY = null;
        unit._attackLoopCancelled = false;
        unit._attackLoopTimer = null;
        unit._patrolMissionType = null;
        unit._patrolLoopActive = false;
        if (unit.type === 'swarm') {
            unit.ammo = 12;
            unit.maxAmmo = 12;
            unit.launchedSquads = [];
        }
    });

    // 清除所有蜂巢无人机编组
    droneSquads.forEach(function(squad) {
        removeSquadElements(squad);
    });
    droneSquads = [];
    droneSquadIdCounter = 0;
    selectedSquad = null;
    launchTargetUnit = null;
    launchDroneCount = 0;

    // 清除所有常规无人机编组
    formations = [];
    formationIdCounter = 0;
    selectedFormation = null;
    formationCmdPending = null;

    // 每局重新生成敌军部署（基于模板随机偏移）
    const newEnemies = generateEnemyUnits();
    for (let i = 0; i < mockEnemyUnits.length; i++) {
        Object.assign(mockEnemyUnits[i], newEnemies[i]);
        // 重置发现状态
        mockEnemyUnits[i].discovered = false;
        mockEnemyUnits[i].lastSeenX = null;
        mockEnemyUnits[i].lastSeenY = null;
        mockEnemyUnits[i].lastSeenTime = 0;
    }

    document.querySelectorAll('.unit').forEach(el => el.remove());
    document.querySelectorAll('.terrain').forEach(el => el.remove());
    document.querySelectorAll('.cloud').forEach(el => el.remove());
    document.querySelectorAll('.electronic-jamming').forEach(el => el.remove());

    document.getElementById('battle-log').innerHTML = '';
    document.getElementById('mission-progress').style.width = '0%';
    document.getElementById('mission-progress-text').textContent = '0%';

    updateUnitsList();
    updateEnemyList();
    spawnUnits();
    generateTerrain();
    generateClouds();
    updateEnemyDisplay();
    updateClouds();
    updateElectronicJamming();

    mockEnemyUnits.filter(e => !e.hidden).forEach(enemy => {
        addBattleLog('发现敌方 ' + enemy.name + '（未隐蔽）');
    });

    addBattleLog('战斗开始');
    startGameLoop();
}
