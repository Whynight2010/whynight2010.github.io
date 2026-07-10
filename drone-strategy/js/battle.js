// ============================================================
// battle.js — 战斗循环、日志、进度、启停控制（第6个加载）
// ============================================================

// 第一个 startBattle（会被第二个覆盖，保留以维持原行为一致）
function startBattle() {
    gameInterval = setInterval(() => {
        gameTime += 1;
        updateGame();
    }, 1000 / gameSpeed);
}

// 游戏循环启动函数
function startGameLoop() {
    if (gameInterval) {
        clearInterval(gameInterval);
    }
    gameInterval = setInterval(() => {
        gameTime += 1;
        updateGame();
    }, 1000 / gameSpeed);
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
}

function togglePause() {
    if (!gameRunning && gameTime === 0) {
        addBattleLog('请先点击"开始作战"按钮启动战斗');
        return;
    }

    gameRunning = !gameRunning;
    const btn = document.getElementById('btn-pause');
    if (gameRunning) {
        btn.textContent = '暂停';
        startGameLoop();
    } else {
        btn.textContent = '继续';
        clearInterval(gameInterval);
    }
}

function setSpeed(speed) {
    gameSpeed = speed;
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`speed-${speed}`).classList.add('active');
    if (gameRunning) {
        clearInterval(gameInterval);
        startGameLoop();
    }
}

function retreatAll() {
    addBattleLog('执行全局撤退指令');
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

    if (gameInterval) {
        clearInterval(gameInterval);
        gameInterval = null;
    }

    mockUnits.forEach(unit => {
        unit.health = unit.maxHealth;
        unit.ammo = unit.maxAmmo;
        // 开局自动部署到基地前端，无需手动逐架部署
        unit.status = 'deployed';
        var baseX = 90, baseY = 390;
        unit.x = baseX + 35 + (unit.id * 8) + Math.random() * 15;
        unit.y = baseY - 20 - Math.random() * 20;
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
