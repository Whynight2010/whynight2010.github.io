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
    updateBattleStats();
    simulateEnemyAI();
    updateUnitPatrol();
    updateDroneSquads();
    updateFormations();
    updateClouds();
    updateEnemyDisplay();
    checkBattleOutcome();
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

    if (gameRunning && !battleResolved) {
        activeBattleEvents.push({ time: time, event: message });
        if (activeBattleEvents.length > 18) {
            activeBattleEvents = activeBattleEvents.slice(activeBattleEvents.length - 18);
        }
    }
}

function updateBattleLog() {
    if (gameTime % 30 === 0 && gameTime > 0) {
        const randomEvents = ['侦察范围更新', '单位状态检查', '敌方动向监测', '战术分析中'];
        addBattleLog(randomEvents[Math.floor(Math.random() * randomEvents.length)]);
    }
}

function updateBattleStats() {
    var lossEl = document.getElementById('friendly-loss');
    var foundEl = document.getElementById('enemy-found');
    var baseEl = document.getElementById('base-health');
    if (lossEl) {
        lossEl.textContent = getCurrentFriendlyLoss() + '/' + getFriendlyUnits().length;
    }
    if (foundEl) {
        var discoveredCount = mockEnemyUnits.filter(function(enemy) { return enemy.discovered; }).length;
        foundEl.textContent = discoveredCount + '/' + mockEnemyUnits.length;
    }
    if (baseEl) {
        baseEl.textContent = Math.max(0, Math.round(baseHealth)) + '%';
    }
}

function checkBattleOutcome() {
    if (!gameRunning || battleResolved) return;

    var commandCenter = mockEnemyUnits.find(function(enemy) { return enemy.type === 'command'; });
    var allFriendlyLost = getFriendlyUnits().every(function(unit) { return unit.health <= 0; });

    if (commandCenter && commandCenter.health <= 0) {
        finalizeBattle('win', '成功摧毁敌方指挥中心，任务完成');
        return;
    }

    if (baseHealth <= 0) {
        finalizeBattle('lose', '我方基地被摧毁，任务失败');
        return;
    }

    if (allFriendlyLost) {
        finalizeBattle('lose', '我方可作战空中单位全部损毁，任务失败');
        return;
    }

    if (gameTime >= BATTLE_TIME_LIMIT) {
        finalizeBattle('lose', '超出任务时限，任务失败');
    }
}

function finalizeBattle(result, summary) {
    battleResolved = true;
    gameRunning = false;
    if (gameInterval) {
        clearInterval(gameInterval);
        gameInterval = null;
    }

    addBattleLog(summary);
    persistBattleReport(result, summary);
    updateBattleStats();
    loadReports();
}

function persistBattleReport(result, summary) {
    var completion = Math.min(100, Math.round((parseFloat(document.getElementById('mission-progress').style.width) || 0)));
    var lossRate = Math.round((getCurrentFriendlyLoss() / getFriendlyUnits().length) * 100);
    var baseScore = result === 'win' ? 82 : 52;
    var score = Math.max(20, Math.min(100, baseScore + Math.round(baseHealth / 8) - Math.round(lossRate / 5) - Math.round(gameTime / 45)));

    var strengths = [];
    var weaknesses = [];
    var suggestions = [];

    if (result === 'win') {
        strengths.push('完成主要任务目标，形成有效打击闭环');
    }
    if (baseHealth >= 70) {
        strengths.push('基地防护较为稳固，后方安全保持较好');
    } else {
        weaknesses.push('基地承压较大，后方防护存在薄弱环节');
    }
    if (lossRate <= 25) {
        strengths.push('我方战损控制较好，兵力运用较为稳健');
    } else {
        weaknesses.push('我方战损偏高，部分单位突入过深或补给节奏不足');
    }
    if (completion < 100) {
        weaknesses.push('任务推进不够完整，关键目标处理节奏偏慢');
    }
    if (!strengths.length) strengths.push('形成了基础侦察—机动—打击流程');
    if (!weaknesses.length) weaknesses.push('局部指挥与节奏控制仍有继续优化空间');

    suggestions.push('优先压制雷达与远程防空节点，再组织主力突击');
    suggestions.push('利用编组保持长机与僚机协同，减少单机冒进');
    if (baseHealth < 60) suggestions.push('增加基地周边巡护与拦截力量，避免后方被持续消耗');
    if (lossRate > 40) suggestions.push('加强召回补给时机控制，避免多架单位同时脱离战场');

    var report = {
        id: mockBattles.length ? Math.max.apply(null, mockBattles.map(function(item) { return item.id; })) + 1 : 1,
        mission: '摧毁敌方指挥中心',
        result: result,
        completion: completion,
        lossRate: lossRate,
        score: score,
        time: getBattleTimestamp(),
        duration: formatTime(gameTime),
        timeline: activeBattleEvents.slice(-8),
        analysis: {
            strengths: strengths,
            weaknesses: weaknesses,
            suggestions: suggestions
        },
        summary: summary
    };

    mockBattles.unshift(report);
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
    battleResolved = false;
    gameTime = 0;
    baseHealth = 100;
    activeBattleEvents = [];

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
        unit.attackTargetUnitId = null;
        unit.attackTargetMode = 'point';
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
    attackTargetUnits = [];
    attackSelectionMode = 'point';
    enemyTargetTooltipUnit = null;
    enemyUavResupplyQueue = [];
    enemyUavActiveResupplyId = null;
    friendlyResupplyQueue = [];
    friendlyActiveResupplyId = null;
    hideAttackTargetModePanel();
    hideEnemyTargetTooltip();

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
        mockEnemyUnits[i].moveLoopStarted = false;
        mockEnemyUnits[i].lastEnemyMove = null;
    }

    document.querySelectorAll('.unit').forEach(el => el.remove());
    document.querySelectorAll('.terrain').forEach(el => el.remove());
    document.querySelectorAll('.cloud').forEach(el => el.remove());
    document.querySelectorAll('.electronic-jamming').forEach(el => el.remove());

    document.getElementById('battle-log').innerHTML = '';
    document.getElementById('mission-progress').style.width = '0%';
    document.getElementById('mission-progress-text').textContent = '0%';
    updateBattleStats();

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
