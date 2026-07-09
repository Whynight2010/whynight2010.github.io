// ============================================================
// movement.js — 移动、寻路、巡逻、目标选择（第5个加载）
// ============================================================

// --- 通用移动 ---

function moveToTarget(unit, targetX, targetY, actionType) {
    const startX = unit.x;
    const startY = unit.y;
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const duration = 2000;
    const startTime = Date.now();

    let abortMovement = false;

    function move() {
        if (abortMovement) {
            unit.status = 'deployed';
            updateUnitDisplay(unit);
            return;
        }

        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        unit.x = startX + dx * progress;
        unit.y = startY + dy * progress;

        if (actionType === 'scout') {
            const detectedEnemy = checkScoutDetection(unit);
            if (detectedEnemy) {
                addBattleLog('⚠️ ' + unit.name + ' 发现未标记敌方单位！立即后撤！');
                abortMovement = true;
                retreatFromEnemy(unit, detectedEnemy);
                return;
            }

            if (willEnterEnemyRange(unit, targetX, targetY)) {
                addBattleLog('⚠️ ' + unit.name + ' 检测到前方有敌方火力范围，改变路线！');
                const safePos = findSafePosition(unit);
                if (safePos) {
                    abortMovement = true;
                    moveToTarget(unit, safePos.x, safePos.y, 'scout');
                    return;
                }
            }
        }

        updateUnitDisplay(unit);

        if (progress < 1) {
            requestAnimationFrame(move);
        } else {
            if (actionType === 'attack' && unit.ammo > 0) {
                unit.ammo--;
                addBattleLog(unit.name + ' 发射弹药！');
                attackTarget(unit);
            }
            unit.status = 'deployed';
            updateUnitDisplay(unit);
        }
    }

    requestAnimationFrame(move);
}

// --- 侦察检测 ---

function checkScoutDetection(unit) {
    const activeEnemies = mockEnemyUnits.filter(e => e.health > 0);

    for (const enemy of activeEnemies) {
        if (!enemy.visible) {
            const dx = enemy.x - unit.x;
            const dy = enemy.y - unit.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            let canDetect = distance < unit.scoutRadius;

            if (canDetect) {
                if (unit.type === 'scout') {
                    enemy.visible = true;
                    markEnemyDiscovered(enemy);
                    addBattleLog('🔍 ' + unit.name + ' 发现敌方 ' + enemy.name + '！');
                    updateEnemyDisplay();
                    return enemy;
                } else {
                    const inCloud = isPointInCloud(enemy.x, enemy.y);
                    const inMountain = isPointInMountain(enemy.x, enemy.y);

                    if (!inCloud && !inMountain) {
                        enemy.visible = true;
                        markEnemyDiscovered(enemy);
                        addBattleLog('🔍 ' + unit.name + ' 发现敌方 ' + enemy.name + '！');
                        updateEnemyDisplay();
                        return enemy;
                    }
                }
            }
        }
    }
    return null;
}

function willEnterEnemyRange(unit, targetX, targetY) {
    const visibleEnemies = mockEnemyUnits.filter(e => e.visible && e.health > 0 && e.attackRange > 0);

    for (const enemy of visibleEnemies) {
        const closestDist = pointToLineDistance(unit.x, unit.y, targetX, targetY, enemy.x, enemy.y);

        if (closestDist < enemy.attackRange) {
            return true;
        }
    }
    return false;
}

function pointToLineDistance(x1, y1, x2, y2, px, py) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

// --- 安全位置 ---

function findSafePosition(unit) {
    const safeDist = 200;
    const attempts = 10;

    for (let i = 0; i < attempts; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = safeDist;
        const safeX = unit.x + Math.cos(angle) * dist;
        const safeY = unit.y + Math.sin(angle) * dist;

        if (safeX > 50 && safeX < 600 && safeY > 30 && safeY < 300) {
            let isSafe = true;
            const visibleEnemies = mockEnemyUnits.filter(e => e.visible && e.health > 0 && e.attackRange > 0);

            for (const enemy of visibleEnemies) {
                const dx = enemy.x - safeX;
                const dy = enemy.y - safeY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < enemy.attackRange + 50) {
                    isSafe = false;
                    break;
                }
            }

            if (isSafe) {
                return { x: safeX, y: safeY };
            }
        }
    }

    return { x: unit.x - 100, y: unit.y };
}

function findSafePositionDP(unit) {
    const safePositions = [];
    const angles = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, 5*Math.PI/4, 3*Math.PI/2, 7*Math.PI/4];
    const distances = [50, 100, 150, 200];

    const visibleEnemies = mockEnemyUnits.filter(e => e.visible && e.health > 0 && e.attackRange > 0);

    for (const angle of angles) {
        for (const dist of distances) {
            const x = unit.x + Math.cos(angle) * dist;
            const y = unit.y + Math.sin(angle) * dist;

            if (x < 50 || x > 550 || y < 30 || y > 350) continue;

            let isSafe = true;
            for (const enemy of visibleEnemies) {
                const dx = enemy.x - x;
                const dy = enemy.y - y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < enemy.attackRange + 20) {
                    isSafe = false;
                    break;
                }
            }

            if (isSafe) {
                safePositions.push({ x, y, dist });
            }
        }
    }

    if (safePositions.length === 0) {
        return null;
    }

    // 选择距离最近的安全位置
    safePositions.sort((a, b) => a.dist - b.dist);
    return safePositions[0];
}

function retreatFromEnemy(unit, enemy) {
    const dx = unit.x - enemy.x;
    const dy = unit.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const retreatDist = enemy.attackRange + 100;
    const retreatX = enemy.x + (dx / distance) * retreatDist;
    const retreatY = enemy.y + (dy / distance) * retreatDist;

    const safeX = Math.max(50, Math.min(600, retreatX));
    const safeY = Math.max(30, Math.min(300, retreatY));

    unit.status = 'deployed';
    moveToTarget(unit, safeX, safeY, 'move');
}

// --- DP寻路算法 ---

function calculateDPPath(startX, startY, targetX, targetY, avoidPoint = null) {
    const path = [];
    path.push({ x: startX, y: startY });

    const visibleEnemies = mockEnemyUnits.filter(e => e.visible && e.health > 0 && e.attackRange > 0);

    // 获取已知敌方无人机的位置和攻击范围
    const enemyZones = visibleEnemies
        .filter(e => e.type === 'enemy_uav')
        .map(e => ({
            x: e.x,
            y: e.y,
            radius: e.attackRange + 30  // 安全缓冲区
        }));

    if (enemyZones.length === 0) {
        // 没有敌方无人机，直接前往目标
        path.push({ x: targetX, y: targetY });
        return path;
    }

    // 检查直线是否穿过敌方攻击范围
    const directPathSafe = isPathSafe(startX, startY, targetX, targetY, enemyZones);
    if (directPathSafe) {
        path.push({ x: targetX, y: targetY });
        return path;
    }

    // 需要绕路，使用DP算法计算最优路径
    const waypoints = generateWaypoints(startX, startY, targetX, targetY, enemyZones);
    const optimalPath = findOptimalPath(startX, startY, targetX, targetY, waypoints, enemyZones);

    path.push(...optimalPath);
    return path;
}

function isPathSafe(x1, y1, x2, y2, enemyZones) {
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = x1 + (x2 - x1) * t;
        const py = y1 + (y2 - y1) * t;

        for (const zone of enemyZones) {
            const dx = px - zone.x;
            const dy = py - zone.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < zone.radius) {
                return false;
            }
        }
    }
    return true;
}

function generateWaypoints(startX, startY, targetX, targetY, enemyZones) {
    const waypoints = [];

    // 在起点和终点之间生成中间点
    const midX = (startX + targetX) / 2;
    const midY = (startY + targetY) / 2;

    // 生成上下两个绕行点
    const offsetDist = 100;

    // 计算主要方向
    const dx = targetX - startX;
    const dy = targetY - startY;
    const angle = Math.atan2(dy, dx);

    // 上绕行点
    const upAngle = angle - Math.PI / 2;
    waypoints.push({
        x: midX + Math.cos(upAngle) * offsetDist,
        y: midY + Math.sin(upAngle) * offsetDist
    });

    // 下绕行点
    const downAngle = angle + Math.PI / 2;
    waypoints.push({
        x: midX + Math.cos(downAngle) * offsetDist,
        y: midY + Math.sin(downAngle) * offsetDist
    });

    // 边界点
    waypoints.push({ x: startX + 50, y: startY });
    waypoints.push({ x: startX, y: startY + 50 });
    waypoints.push({ x: targetX - 50, y: targetY });
    waypoints.push({ x: targetX, y: targetY - 50 });

    // 过滤掉不安全的点
    return waypoints.filter(wp => {
        return wp.x >= 50 && wp.x <= 550 && wp.y >= 30 && wp.y <= 350;
    });
}

function findOptimalPath(startX, startY, targetX, targetY, waypoints, enemyZones) {
    let bestPath = [];
    let minCost = Infinity;

    // 选项1：直接前往目标（优先尝试，以到达为第一目标）
    const directPathSafe = isPathSafe(startX, startY, targetX, targetY, enemyZones);
    if (directPathSafe) {
        // 直接路径安全，优先选择
        return [{ x: targetX, y: targetY }];
    }

    // 直接路径不安全，计算代价并尝试其他路径
    const directCost = calculatePathCost(startX, startY, targetX, targetY, enemyZones);
    if (directCost < minCost) {
        minCost = directCost;
        bestPath = [{ x: targetX, y: targetY }];
    }

    // 选项2：通过每个中间点绕行
    for (const wp of waypoints) {
        const path1Safe = isPathSafe(startX, startY, wp.x, wp.y, enemyZones);
        const path2Safe = isPathSafe(wp.x, wp.y, targetX, targetY, enemyZones);

        if (path1Safe && path2Safe) {
            const cost = calculatePathCost(startX, startY, wp.x, wp.y, enemyZones) +
                         calculatePathCost(wp.x, wp.y, targetX, targetY, enemyZones);

            if (cost < minCost * 0.8) {  // 绕行路径需要明显更优才选择
                minCost = cost;
                bestPath = [{ x: wp.x, y: wp.y }, { x: targetX, targetY }];
            }
        }
    }

    // 如果找到安全绕行路径，优先使用
    if (bestPath.length > 1) {
        return bestPath;
    }

    // 如果没有找到安全路径但必须到达目标，尝试只绕过最危险的区域
    if (bestPath.length === 1) {
        // 找到一个最近的敌方无人机并绕行
        const nearestEnemy = enemyZones.reduce((nearest, zone) => {
            const dist = Math.sqrt(Math.pow(zone.x - startX, 2) + Math.pow(zone.y - startY, 2));
            return dist < nearest.dist ? { ...zone, dist } : nearest;
        }, { dist: Infinity });

        if (nearestEnemy.dist < Infinity) {
            const escapeAngle = Math.atan2(startY - nearestEnemy.y, startX - nearestEnemy.x);
            const escapeDist = nearestEnemy.radius + 50;
            const escapeX = nearestEnemy.x + Math.cos(escapeAngle) * escapeDist;
            const escapeY = nearestEnemy.y + Math.sin(escapeAngle) * escapeDist;

            if (escapeX >= 50 && escapeX <= 550 && escapeY >= 30 && escapeY <= 350) {
                bestPath = [
                    { x: Math.max(50, Math.min(550, escapeX)), y: Math.max(30, Math.min(350, escapeY)) },
                    { x: targetX, y: targetY }
                ];
            }
        }
    }

    return bestPath;
}

function calculatePathCost(x1, y1, x2, y2, enemyZones) {
    // 基础代价：路径长度
    const dx = x2 - x1;
    const dy = y2 - y1;
    let baseCost = Math.sqrt(dx * dx + dy * dy);

    // 风险代价：路径经过敌方区域的次数和深度
    let riskCost = 0;
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = x1 + dx * t;
        const py = y1 + dy * t;

        for (const zone of enemyZones) {
            const ex = px - zone.x;
            const ey = py - zone.y;
            const dist = Math.sqrt(ex * ex + ey * ey);
            if (dist < zone.radius) {
                riskCost += (zone.radius - dist) * 2;
            }
        }
    }

    return baseCost + riskCost;
}

// --- 侦察任务 ---

function getRandomScoutPosition(unit) {
    scoutCounter++;
    const positions = [
        { x: 250, y: 100 },
        { x: 300, y: 150 },
        { x: 350, y: 120 },
        { x: 400, y: 180 },
        { x: 280, y: 200 },
        { x: 320, y: 160 },
        { x: 380, y: 140 },
        { x: 450, y: 170 }
    ];
    const baseIndex = (unit.id + scoutCounter) % positions.length;
    const basePos = positions[baseIndex];
    const offsetX = (Math.random() - 0.5) * 40;
    const offsetY = (Math.random() - 0.5) * 40;
    return {
        x: Math.max(100, Math.min(500, basePos.x + offsetX)),
        y: Math.max(50, Math.min(250, basePos.y + offsetY))
    };
}

function moveToScoutTarget(unit) {
    const startX = unit.x;
    const startY = unit.y;
    const targetX = unit.scoutTargetX;
    const targetY = unit.scoutTargetY;

    unit.status = 'scout';
    unit.isMovingToScout = true;
    updateUnitDisplay(unit);

    // 使用最优路径算法计算最优路径
    const path = calculateOptimalPath(unit.x, unit.y, targetX, targetY);
    addBattleLog(unit.name + ' 计算最优侦察路径，共 ' + path.length + ' 个路径点');

    let currentPathIndex = 0;

    function moveAlongPath() {
        if (currentPathIndex >= path.length - 1) {
            // 到达最终目标
            unit.isMovingToScout = false;
            unit.x = targetX;
            unit.y = targetY;
            addBattleLog(unit.name + ' 到达侦察目标点，开始执行侦察任务！');
            executeScoutMission(unit);
            updateUnitDisplay(unit);
            return;
        }

        const nextPoint = path[currentPathIndex + 1];
        const dx = nextPoint.x - unit.x;
        const dy = nextPoint.y - unit.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const moveSpeed = unit.speed || 2;
        const stepDistance = Math.min(moveSpeed, distance);

        unit.x += (dx / distance) * stepDistance;
        unit.y += (dy / distance) * stepDistance;

        // 侦察检测
        const detectedEnemy = checkScoutDetection(unit);
        if (detectedEnemy) {
            addBattleLog('⚠️ ' + unit.name + ' 发现未标记敌方单位！立即后撤！');
            unit.isMovingToScout = false;
            retreatFromEnemy(unit, detectedEnemy);
            return;
        }

        // 检查是否需要绕路
        const visibleEnemies = mockEnemyUnits.filter(e => e.visible && e.health > 0 && e.attackRange > 0);
        let needsReroute = false;
        for (const enemy of visibleEnemies) {
            const ex = enemy.x - unit.x;
            const ey = enemy.y - unit.y;
            const dist = Math.sqrt(ex * ex + ey * ey);
            if (dist < enemy.attackRange + 20) {
                needsReroute = true;
                break;
            }
        }

        if (needsReroute) {
            const safePos = findSafePositionDP(unit);
            if (safePos) {
                addBattleLog('⚠️ ' + unit.name + ' 检测到敌方火力范围，重新计算路径！');
                unit.isMovingToScout = false;
                const newPath = calculateOptimalPath(unit.x, unit.y, targetX, targetY);
                if (newPath.length > 0) {
                    path.length = 0;
                    path.push(...newPath);
                    currentPathIndex = 0;
                }
            }
        }

        updateUnitDisplay(unit);

        if (Math.abs(unit.x - nextPoint.x) < 2 && Math.abs(unit.y - nextPoint.y) < 2) {
            currentPathIndex++;
        }

        requestAnimationFrame(moveAlongPath);
    }

    requestAnimationFrame(moveAlongPath);
}

function executeScoutMission(unit) {
    // 到达侦察点后，执行侦察检测
    const detectedEnemy = checkScoutDetection(unit);
    if (detectedEnemy) {
        addBattleLog('🔍 ' + unit.name + ' 在目标点发现敌方 ' + detectedEnemy.name + '！');
    } else {
        addBattleLog(unit.name + ' 在目标区域未发现敌方单位');
    }
    unit.status = 'deployed';
    updateUnitDisplay(unit);
}

// --- 攻击任务 ---

function getRandomMovePosition(unit) {
    moveCounter++;
    const positions = [
        { x: 200, y: 150 },
        { x: 250, y: 180 },
        { x: 180, y: 220 },
        { x: 220, y: 120 },
        { x: 160, y: 160 },
        { x: 240, y: 200 },
        { x: 190, y: 140 },
        { x: 210, y: 190 }
    ];
    const baseIndex = (unit.id + moveCounter) % positions.length;
    const basePos = positions[baseIndex];
    const offsetX = (Math.random() - 0.5) * 30;
    const offsetY = (Math.random() - 0.5) * 30;
    return {
        x: Math.max(100, Math.min(300, basePos.x + offsetX)),
        y: Math.max(50, Math.min(250, basePos.y + offsetY))
    };
}

function attackTarget(unit) {
    const targets = mockEnemyUnits.filter(e => e.visible && e.health > 0);
    if (targets.length > 0) {
        const target = targets[0];
        target.health -= 40;
        addBattleLog(unit.name + ' 攻击 ' + target.name + '，造成40点伤害！');

        if (target.health <= 0) {
            target.health = 0;
            addBattleLog('💥 ' + target.name + ' 被摧毁！');
            updateEnemyDisplay();
        }
    }
}

function moveToAttackTarget(unit) {
    const startX = unit.x;
    const startY = unit.y;
    const targetX = unit.attackTargetX;
    const targetY = unit.attackTargetY;

    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const duration = (distance / unit.maxSpeed) * 200;
    const startTime = Date.now();

    unit.status = 'attack';
    unit.isMovingToAttack = true;
    updateUnitDisplay(unit);

    function move() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        unit.x = startX + dx * progress;
        unit.y = startY + dy * progress;

        updateUnitDisplay(unit);

        if (progress < 1) {
            requestAnimationFrame(move);
        } else {
            unit.isMovingToAttack = false;
            addBattleLog(unit.name + ' 到达攻击目标点，开始搜索敌方目标！');
            autoAttackAtLocation(unit);
        }
    }

    requestAnimationFrame(move);
}

function autoAttackAtLocation(unit) {
    if (unit.ammo <= 0) {
        addBattleLog(unit.name + ' 弹药耗尽，返回待命状态！');
        unit.status = 'deployed';
        updateUnitDisplay(unit);
        return;
    }

    const enemiesNearTarget = mockEnemyUnits.filter(e => {
        if (!e.visible || e.health <= 0) return false;
        if (!e.attackRange && e.attackRange !== 0) return false;

        const dx = e.x - unit.attackTargetX;
        const dy = e.y - unit.attackTargetY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        return distance <= e.attackRange + 50;
    });

    if (enemiesNearTarget.length > 0) {
        const target = findBestAttackTarget(unit, enemiesNearTarget);
        if (target) {
            unit.ammo--;
            addBattleLog(unit.name + ' 发现目标 ' + target.name + '，发射弹药！');

            const damage = calculatePlayerDamage(unit, target);
            target.health -= damage;
            addBattleLog(unit.name + ' 攻击 ' + target.name + '，造成 ' + damage + ' 点伤害！');

            if (target.health <= 0) {
                target.health = 0;
                addBattleLog('💥 ' + target.name + ' 被摧毁！');
                updateEnemyDisplay();
            }

            if (unit.ammo > 0) {
                setTimeout(() => autoAttackAtLocation(unit), 1500);
            } else {
                addBattleLog(unit.name + ' 弹药耗尽，返回待命状态！');
                unit.status = 'deployed';
                updateUnitDisplay(unit);
            }
        }
    } else {
        addBattleLog(unit.name + ' 在目标区域未发现敌方单位，返回待命状态！');
        unit.status = 'deployed';
        updateUnitDisplay(unit);
    }
}

function findBestAttackTarget(unit, enemies) {
    let bestTarget = null;
    let highestPriority = -1;

    enemies.forEach(enemy => {
        const dx = enemy.x - unit.attackTargetX;
        const dy = enemy.y - unit.attackTargetY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let priority = 0;

        if (enemy.type === 'command') priority += 50;
        else if (enemy.type === 'radar') priority += 30;
        else if (enemy.type === 'aa_long') priority += 25;
        else if (enemy.type === 'aa_short') priority += 20;
        else if (enemy.type === 'enemy_uav') priority += 15;

        priority -= distance / 5;

        if (priority > highestPriority) {
            highestPriority = priority;
            bestTarget = enemy;
        }
    });

    return bestTarget;
}

function calculatePlayerDamage(attacker, target) {
    const baseDamage = attacker.type === 'attack' ? 40 :
                      attacker.type === 'strike' ? 80 :
                      attacker.type === 'swarm' ? 10 : 20;

    const dx = attacker.x - target.x;
    const dy = attacker.y - target.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const effectiveRange = attacker.attackRange || 30;
    const distanceFactor = Math.max(0.3, 1 - distance / effectiveRange);
    const randomFactor = 0.8 + Math.random() * 0.4;

    return Math.floor(baseDamage * distanceFactor * randomFactor);
}

// --- 巡逻系统 ---

function updateUnitPatrol() {
    // 部署后的单位保持阵位，不再自动游荡巡逻
    // 巡逻行为仅由显式指令触发（侦察、攻击、防守、转移等）
}

function continueUnitPatrol(unit) {
    // 正在召回的单元不执行巡逻
    if (unit.isRecalling) return;

    if (!unit.movingToPatrol) {
        if (unit.status === 'deployed' && unit.speed > 0) {
            unit.movingToPatrol = true;
            unit.lastPatrolMove = Date.now();
            setNewPatrolTarget(unit);
        } else {
            return;
        }
    }

    const now = Date.now();
    const elapsed = (now - unit.lastPatrolMove) / 1000;
    unit.lastPatrolMove = now;

    const dx = unit.currentPatrolTargetX - unit.x;
    const dy = unit.currentPatrolTargetY - unit.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 3) {
        const moveDistance = unit.speed * elapsed * gameSpeed;

        // 检测前方是否有敌方无人机攻击范围威胁
        const threatInfo = getThreatInfo(unit, dx, dy, distance, moveDistance);

        if (threatInfo.hasThreat) {
            // 检测到威胁，朝安全方向移动
            const safeAngle = threatInfo.safeAngle;
            const newTargetX = unit.x + Math.cos(safeAngle) * moveDistance * 2;
            const newTargetY = unit.y + Math.sin(safeAngle) * moveDistance * 2;

            unit.x = Math.max(50, Math.min(550, newTargetX));
            unit.y = Math.max(30, Math.min(350, newTargetY));
            updateUnitDisplay(unit);

            requestAnimationFrame(() => continueUnitPatrol(unit));
        } else {
            // 无威胁，正常向目标移动
            let moveX = unit.x + (dx / distance) * moveDistance;
            let moveY = unit.y + (dy / distance) * moveDistance;

            unit.x = moveX;
            unit.y = moveY;
            updateUnitDisplay(unit);

            requestAnimationFrame(() => continueUnitPatrol(unit));
        }
    } else {
        setNewPatrolTarget(unit);
        requestAnimationFrame(() => continueUnitPatrol(unit));
    }
}

function getThreatInfo(unit, dx, dy, distance, moveDistance) {
    const enemyDrones = mockEnemyUnits.filter(e => e.type === 'enemy_uav' && e.health > 0 && e.visible);
    const safeDistance = 60;

    let hasThreat = false;
    let bestSafeAngle = 0;
    let minThreat = Infinity;

    const angles = [];
    const baseAngle = Math.atan2(dy, dx);

    for (let i = -4; i <= 4; i++) {
        angles.push(baseAngle + (i * Math.PI / 8));
    }

    let bestAngle = baseAngle;

    for (const angle of angles) {
        const testX = unit.x + Math.cos(angle) * moveDistance * 3;
        const testY = unit.y + Math.sin(angle) * moveDistance * 3;

        let threatLevel = 0;
        for (const drone of enemyDrones) {
            const tdx = drone.x - testX;
            const tdy = drone.y - testY;
            const dist = Math.sqrt(tdx * tdx + tdy * tdy);

            if (dist < safeDistance) {
                threatLevel += (safeDistance - dist);
            }
        }

        if (threatLevel < minThreat) {
            minThreat = threatLevel;
            bestAngle = angle;
        }
    }

    if (minThreat > 0) {
        hasThreat = true;
        bestSafeAngle = bestAngle;
    }

    return { hasThreat, safeAngle: bestSafeAngle };
}

function setNewPatrolTarget(unit) {
    const enemyDrones = mockEnemyUnits.filter(e => e.type === 'enemy_uav' && e.health > 0 && e.visible);
    const safeDistance = 80;

    const candidates = [];
    const baseX = unit.patrolTargetX;
    const baseY = unit.patrolTargetY;

    for (let i = 0; i < 12; i++) {
        const angle = (i * Math.PI * 2) / 12;
        const dist = 30 + Math.random() * 40;
        const candidateX = baseX + Math.cos(angle) * dist;
        const candidateY = baseY + Math.sin(angle) * dist;

        const boundedX = Math.max(50, Math.min(550, candidateX));
        const boundedY = Math.max(30, Math.min(350, candidateY));

        let safetyScore = 0;
        for (const drone of enemyDrones) {
            const dx = drone.x - boundedX;
            const dy = drone.y - boundedY;
            const distToDrone = Math.sqrt(dx * dx + dy * dy);
            safetyScore += Math.max(0, distToDrone - drone.attackRange);
        }

        candidates.push({ x: boundedX, y: boundedY, safetyScore });
    }

    candidates.sort((a, b) => b.safetyScore - a.safetyScore);

    const topCandidates = candidates.slice(0, 3);
    const chosen = topCandidates[Math.floor(Math.random() * topCandidates.length)];

    moveUnitPatrol(unit, chosen.x, chosen.y);
}

function willEnterEnemyDroneAttackRange(x, y) {
    const enemyDrones = mockEnemyUnits.filter(e => e.type === 'enemy_uav' && e.health > 0 && e.visible);

    for (const drone of enemyDrones) {
        const dx = drone.x - x;
        const dy = drone.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < drone.attackRange + 30) {
            return true;
        }
    }
    return false;
}

function shouldAvoidEnemyDrone(x, y) {
    const enemyDrones = mockEnemyUnits.filter(e => e.type === 'enemy_uav' && e.health > 0 && e.visible);

    for (const drone of enemyDrones) {
        const dx = drone.x - x;
        const dy = drone.y - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < drone.attackRange + 20) {
            return true;
        }
    }
    return false;
}

function findSafePatrolPosition(unit) {
    const safeDist = 100;
    const attempts = 8;

    for (let i = 0; i < attempts; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = safeDist * (0.5 + Math.random() * 0.5);
        const safeX = unit.patrolTargetX + Math.cos(angle) * dist;
        const safeY = unit.patrolTargetY + Math.sin(angle) * dist;

        if (safeX > 50 && safeX < 550 && safeY > 30 && safeY < 350) {
            if (!willEnterEnemyDroneAttackRange(safeX, safeY)) {
                return { x: safeX, y: safeY };
            }
        }
    }

    return { x: unit.patrolTargetX, y: unit.patrolTargetY };
}

function moveUnitPatrol(unit, targetX, targetY) {
    unit.currentPatrolTargetX = targetX;
    unit.currentPatrolTargetY = targetY;
    unit.movingToPatrol = true;
}

// --- 最优路径计算（目标导向，平衡风险与速度，禁止回头/徘徊）---

function calculateOptimalPath(startX, startY, targetX, targetY) {
    const path = [{ x: startX, y: startY }];

    // 收集所有可见敌方威胁区域
    const threats = mockEnemyUnits
        .filter(function(e) { return e.visible && e.health > 0 && e.attackRange > 0; })
        .map(function(e) { return { x: e.x, y: e.y, radius: e.attackRange + 25 }; });

    // 无威胁时直接直线前往目标（最快路径）
    if (threats.length === 0) {
        path.push({ x: targetX, y: targetY });
        return path;
    }

    // 检查直线路径是否安全
    if (isPathSafe(startX, startY, targetX, targetY, threats)) {
        path.push({ x: targetX, y: targetY });
        return path;
    }

    // 直线不安全，寻找绕行路径——以到达目标为核心目标
    var directAngle = Math.atan2(targetY - startY, targetX - startX);
    var directDist = Math.sqrt(Math.pow(targetX - startX, 2) + Math.pow(targetY - startY, 2));

    var candidates = [];
    // 多角度、多距离生成候选绕行点
    var angles = [-Math.PI / 2, -Math.PI / 3, -Math.PI / 4, -Math.PI / 6, Math.PI / 6, Math.PI / 4, Math.PI / 3, Math.PI / 2];
    var detourDists = [50, 80, 120];

    for (var ai = 0; ai < angles.length; ai++) {
        for (var di = 0; di < detourDists.length; di++) {
            var angleOffset = angles[ai];
            var detourDist = detourDists[di];
            var midAngle = directAngle + angleOffset;
            // 绕行点沿目标方向前进一段距离，再偏移——确保始终朝目标推进
            var midX = startX + Math.cos(midAngle) * (directDist * 0.4 + detourDist * 0.3);
            var midY = startY + Math.sin(midAngle) * (directDist * 0.4 + detourDist * 0.3);

            // 边界裁剪
            var clampedX = Math.max(50, Math.min(550, midX));
            var clampedY = Math.max(30, Math.min(350, midY));

            // 禁止回头：绕行点必须比起点更接近目标
            var distToTarget = Math.sqrt(Math.pow(clampedX - targetX, 2) + Math.pow(clampedY - targetY, 2));
            if (distToTarget >= directDist) continue;

            // 检查两段路径安全性
            if (isPathSafe(startX, startY, clampedX, clampedY, threats) &&
                isPathSafe(clampedX, clampedY, targetX, targetY, threats)) {

                var seg1Dist = Math.sqrt(Math.pow(clampedX - startX, 2) + Math.pow(clampedY - startY, 2));
                var totalDist = seg1Dist + distToTarget;
                // 风险代价
                var risk = calculatePathRisk(startX, startY, clampedX, clampedY, threats) +
                           calculatePathRisk(clampedX, clampedY, targetX, targetY, threats);

                // 综合评分：速度（距离） + 风险（权重2倍，平衡风险与速度）
                candidates.push({
                    waypoint: { x: clampedX, y: clampedY },
                    totalDist: totalDist,
                    risk: risk,
                    score: totalDist + risk * 2
                });
            }
        }
    }

    // 按评分排序（分数越低越优）
    candidates.sort(function(a, b) { return a.score - b.score; });

    if (candidates.length > 0) {
        var best = candidates[0];
        path.push(best.waypoint);
        path.push({ x: targetX, y: targetY });
    } else {
        // 无完全安全路径，选择风险最小的准直线路径
        path.push({ x: targetX, y: targetY });
    }

    return path;
}

function calculatePathRisk(x1, y1, x2, y2, threats) {
    var risk = 0;
    var steps = 10;
    for (var i = 0; i <= steps; i++) {
        var t = i / steps;
        var px = x1 + (x2 - x1) * t;
        var py = y1 + (y2 - y1) * t;
        for (var j = 0; j < threats.length; j++) {
            var threat = threats[j];
            var dx = px - threat.x;
            var dy = py - threat.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < threat.radius) {
                risk += (threat.radius - dist);
            }
        }
    }
    return risk;
}

// --- 召回移动（最优路径返回基地）---

function moveToBase(unit, baseX, baseY) {
    unit.recallTargetX = baseX;
    unit.recallTargetY = baseY;

    // 使用最优路径算法计算返回基地的路径
    var path = calculateOptimalPath(unit.x, unit.y, baseX, baseY);
    var pathIndex = 0;

    function followPath() {
        if (!unit.isRecalling || unit.health <= 0) return;

        if (pathIndex >= path.length) {
            // 到达基地，触发到达处理
            arriveAtBase(unit, baseX, baseY);
            return;
        }

        var waypoint = path[pathIndex];
        var dx = waypoint.x - unit.x;
        var dy = waypoint.y - unit.y;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 3) {
            pathIndex++;
            requestAnimationFrame(followPath);
            return;
        }

        var speed = unit.maxSpeed || 3;
        var step = Math.min(speed, dist);
        unit.x += (dx / dist) * step;
        unit.y += (dy / dist) * step;

        updateUnitDisplay(unit);
        requestAnimationFrame(followPath);
    }

    requestAnimationFrame(followPath);
}

function arriveAtBase(unit, baseX, baseY) {
    unit.isRecalling = false;
    unit.x = baseX;
    unit.y = baseY;
    unit.status = 'ready';
    var healthRestored = unit.maxHealth - unit.health;
    var ammoRestored = 0;
    unit.health = unit.maxHealth;

    // 蜂巢发射车：补充无人机时考虑已发射未回收的数量
    if (unit.type === 'swarm') {
        var dronesInField = 0;
        droneSquads.forEach(function(squad) {
            if (squad.launcherId === unit.id) {
                squad.drones.forEach(function(drone) {
                    if (drone.health > 0) dronesInField++;
                });
            }
        });
        var effectiveMax = unit.maxAmmo - dronesInField;
        var targetAmmo = Math.max(unit.ammo, Math.min(unit.maxAmmo, effectiveMax + unit.ammo));
        ammoRestored = targetAmmo - unit.ammo;
        unit.ammo = targetAmmo;
    } else {
        ammoRestored = unit.maxAmmo - unit.ammo;
        unit.ammo = unit.maxAmmo;
    }

    addBattleLog(unit.name + ' 已返回基地！');
    if (healthRestored > 0 || ammoRestored > 0) {
        var ammoLabel = unit.type === 'swarm' ? ' 架蜂群' : '';
        addBattleLog('基地为 ' + unit.name + ' 补充：生命 +' + healthRestored + '，弹药 +' + ammoRestored + ammoLabel);
    }
    updateUnitDisplay(unit);
}

// --- 目标选择（地图点击处理）---

function enterAttackTargetSelection(unit) {
    attackTargetUnits.push(unit);
    addBattleLog('⚠️ 正在选择 ' + unit.name + ' 的攻击目标，点击地图指定位置...');

    const satelliteView = document.getElementById('satellite-view');
    satelliteView.style.cursor = 'crosshair';
}

function enterScoutTargetSelection(unit) {
    scoutTargetUnits.push(unit);
    addBattleLog('⚠️ 正在选择 ' + unit.name + ' 的侦察目标，点击地图指定位置...');

    const satelliteView = document.getElementById('satellite-view');
    satelliteView.style.cursor = 'crosshair';
}

function handleMapClickForAttack(e) {
    // 如果点击的是单位元素或侧栏区域，不处理地图点击
    if (e.target.classList.contains('unit') ||
        e.target.closest('.unit') ||
        e.target.closest('.battle-info')) {
        return;
    }

    const satelliteView = document.getElementById('satellite-view');
    const rect = satelliteView.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // 处理蜂巢发射车移动目标选择（launchDroneCount === -1 表示移动模式）
    if (launchTargetUnit && launchDroneCount === -1) {
        satelliteView.style.cursor = 'default';
        var swarmUnit = launchTargetUnit;
        var baseX = 90, baseY = 390;
        var distFromBase = Math.sqrt(Math.pow(clickX - baseX, 2) + Math.pow(clickY - baseY, 2));
        if (distFromBase > swarmUnit.maxRange) {
            addBattleLog(swarmUnit.name + ' 目标超出活动范围（基地' + swarmUnit.maxRange + '单位），已自动裁剪至边界');
            var angle = Math.atan2(clickY - baseY, clickX - baseX);
            var clampedX = baseX + Math.cos(angle) * swarmUnit.maxRange;
            var clampedY = baseY + Math.sin(angle) * swarmUnit.maxRange;
            swarmUnit.status = 'move';
            moveToTarget(swarmUnit, clampedX, clampedY, 'move');
            addBattleLog(swarmUnit.name + ' 执行转移机动至 (' + Math.round(clampedX) + ', ' + Math.round(clampedY) + ')');
        } else {
            swarmUnit.status = 'move';
            moveToTarget(swarmUnit, clickX, clickY, 'move');
            addBattleLog(swarmUnit.name + ' 执行转移机动至 (' + Math.round(clickX) + ', ' + Math.round(clickY) + ')');
        }
        launchTargetUnit = null;
        launchDroneCount = 0;
        return;
    }

    // 处理蜂巢发射车：发射目标选择
    if (launchTargetUnit && launchDroneCount > 0) {
        satelliteView.style.cursor = 'default';
        spawnDroneSquad(launchTargetUnit, launchDroneCount, clickX, clickY);
        launchTargetUnit = null;
        launchDroneCount = 0;
        updateUnitsList();
        return;
    }

    // 处理蜂群编组指令选择
    if (selectedSquad && selectedSquad._pendingCommand) {
        satelliteView.style.cursor = 'default';
        var cmd = selectedSquad._pendingCommand;
        delete selectedSquad._pendingCommand;

        if (cmd === 'attack') {
            addBattleLog('蜂群编组 ' + selectedSquad.id + ' 收到攻击指令，前往目标点 (' + Math.round(clickX) + ', ' + Math.round(clickY) + ')');
            setSquadAttackCommand(selectedSquad, clickX, clickY);
        } else if (cmd === 'move') {
            addBattleLog('蜂群编组 ' + selectedSquad.id + ' 收到转移指令，前往目标点 (' + Math.round(clickX) + ', ' + Math.round(clickY) + ')');
            setSquadMoveCommand(selectedSquad, clickX, clickY);
        }
        selectedSquad = null;
        return;
    }

    // 处理常规编组指令选择（攻击/机动）
    if (formationCmdPending) {
        satelliteView.style.cursor = 'default';
        var fg = formationCmdPending.formation;
        var fgCmd = formationCmdPending.command;
        formationCmdPending = null;

        if (fgCmd === 'attack') {
            // 检测点击位置附近是否有可见敌方单位
            var clickedEnemy = null;
            for (var ei = 0; ei < mockEnemyUnits.length; ei++) {
                var enemy = mockEnemyUnits[ei];
                if (!enemy.visible || enemy.health <= 0) continue;
                var edx = clickX - enemy.x;
                var edy = clickY - enemy.y;
                if (Math.sqrt(edx * edx + edy * edy) < 30) {
                    clickedEnemy = enemy;
                    break;
                }
            }

            if (clickedEnemy) {
                addBattleLog(fg.name + ' 收到攻击指令，目标: ' + clickedEnemy.name + '！编队集火攻击！');
            } else {
                addBattleLog(fg.name + ' 收到攻击指令，前往目标点 (' + Math.round(clickX) + ', ' + Math.round(clickY) + ')');
            }
            setFormationAttackCommand(fg, clickX, clickY, clickedEnemy);
        } else if (fgCmd === 'move') {
            addBattleLog(fg.name + ' 收到转移指令，前往目标点 (' + Math.round(clickX) + ', ' + Math.round(clickY) + ')');
            setFormationMoveCommand(fg, clickX, clickY);
        }
        return;
    }

    // 处理侦察目标选择（支持多个单位并行）
    if (scoutTargetUnits.length > 0) {
        satelliteView.style.cursor = 'default';

        scoutTargetUnits.forEach(unit => {
            addBattleLog(unit.name + ' 收到侦察指令，前往目标点 (' + Math.round(clickX) + ', ' + Math.round(clickY) + ')');
            unit.scoutTargetX = clickX;
            unit.scoutTargetY = clickY;
            moveToScoutTarget(unit);
        });
        scoutTargetUnits = [];
        return;
    }

    // 处理攻击目标选择（支持多个单位并行）
    if (attackTargetUnits.length > 0) {
        satelliteView.style.cursor = 'default';

        attackTargetUnits.forEach(unit => {
            addBattleLog(unit.name + ' 收到攻击指令，前往目标点 (' + Math.round(clickX) + ', ' + Math.round(clickY) + ')');
            unit.attackTargetX = clickX;
            unit.attackTargetY = clickY;
            moveToAttackTarget(unit);
        });
        attackTargetUnits = [];
        return;
    }
}

// ============================================================
// 蜂巢无人机编组：移动 & 自动攻击系统
// ============================================================

// 编组移动指令
function setSquadMoveCommand(squad, targetX, targetY) {
    squad.command = 'move';
    squad.targetX = targetX;
    squad.targetY = targetY;
    squad.isRecalling = false;

    // 展开编队：每架无人机分配编队位置
    assignSquadFormation(squad, targetX, targetY);
}

// 编组攻击指令（移动到目标区域并自动搜索攻击）
function setSquadAttackCommand(squad, targetX, targetY) {
    squad.command = 'attack';
    squad.targetX = targetX;
    squad.targetY = targetY;
    squad.isRecalling = false;

    assignSquadFormation(squad, targetX, targetY);
}

// 编组召回指令
function setSquadRecallCommand(squad) {
    squad.command = 'recall';
    squad.isRecalling = true;

    var launcher = mockUnits.find(function(u) { return u.id === squad.launcherId; });
    if (!launcher || launcher.health <= 0) {
        addBattleLog('蜂群编组 ' + squad.id + ' 发射车已损毁，无法召回！');
        squad.command = 'idle';
        squad.isRecalling = false;
        return;
    }

    squad.targetX = launcher.x;
    squad.targetY = launcher.y;
    assignSquadFormation(squad, launcher.x, launcher.y);
}

// 为编队中每架无人机分配编队位置（扇形展开）
function assignSquadFormation(squad, centerX, centerY) {
    var aliveDrones = squad.drones.filter(function(d) { return d.health > 0; });
    var count = aliveDrones.length;
    if (count === 0) return;

    var baseAngle = 0;
    if (count > 1) {
        // 多人编队：扇形展开
        var spreadAngle = Math.min(Math.PI / 2, (count - 1) * (Math.PI / 10));
        baseAngle = Math.atan2(centerY - aliveDrones[0].y, centerX - aliveDrones[0].x);
        if (Math.abs(centerX - aliveDrones[0].x) < 1 && Math.abs(centerY - aliveDrones[0].y) < 1) {
            baseAngle = Math.PI / 4; // 默认方向
        }
    }

    for (var i = 0; i < count; i++) {
        var angleOffset = 0;
        var dist = 0;
        if (count === 1) {
            dist = 0;
        } else {
            angleOffset = (i - (count - 1) / 2) * (Math.PI / 10);
            dist = 8 + Math.random() * 5;
        }
        var angle = baseAngle + angleOffset;
        aliveDrones[i].targetX = centerX + Math.cos(angle) * dist;
        aliveDrones[i].targetY = centerY + Math.sin(angle) * dist;
        aliveDrones[i].status = 'moving';
    }
}

// 每帧更新所有无人机编组（由battle.js的updateGame调用）
function updateDroneSquads() {
    for (var si = droneSquads.length - 1; si >= 0; si--) {
        var squad = droneSquads[si];
        var allDead = true;

        for (var di = 0; di < squad.drones.length; di++) {
            var drone = squad.drones[di];
            if (drone.health <= 0) {
                updateDroneDisplay(drone);
                continue;
            }
            allDead = false;

            // 检查是否超出作战半径
            checkDroneRangeLimit(drone, squad);

            // 自动攻击：搜索范围内敌方目标
            droneAutoAttack(drone, squad);

            // 移动无人机
            updateDroneMovement(drone, squad);
        }

        if (allDead) {
            addBattleLog('蜂群编组 ' + squad.id + ' 全部损毁！');
            removeSquadElements(squad);
            droneSquads.splice(si, 1);
        }
    }
}

// 检查无人机是否超出作战半径
function checkDroneRangeLimit(drone, squad) {
    var launcher = mockUnits.find(function(u) { return u.id === squad.launcherId; });
    if (!launcher) return;

    var dx = drone.x - launcher.x;
    var dy = drone.y - launcher.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > squad.maxRange) {
        // 超出范围，拉回到边界
        var angle = Math.atan2(dy, dx);
        drone.targetX = launcher.x + Math.cos(angle) * (squad.maxRange - 10);
        drone.targetY = launcher.y + Math.sin(angle) * (squad.maxRange - 10);
        drone.status = 'moving';
    }
}

// 无人机移动逻辑
function updateDroneMovement(drone, squad) {
    if (drone.status !== 'moving' || !drone.targetX || !drone.targetY) return;

    var dx = drone.targetX - drone.x;
    var dy = drone.targetY - drone.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2) {
        drone.status = 'idle';
        drone.x = drone.targetX;
        drone.y = drone.targetY;
        updateDroneDisplay(drone);

        // 检查整个编队是否到达目标
        checkSquadArrival(squad);
        return;
    }

    // 使用最优路径计算（简化版：检测直接路径安全性）
    var threats = mockEnemyUnits.filter(function(e) {
        return e.visible && e.health > 0 && e.attackRange > 0;
    }).map(function(e) {
        return { x: e.x, y: e.y, radius: e.attackRange + 10 };
    });

    var moveSpeed = drone.speed;
    var step = Math.min(moveSpeed, dist);

    if (threats.length > 0 && !isPathSafe(drone.x, drone.y, drone.targetX, drone.targetY, threats)) {
        // 路径有威胁，尝试绕行
        var safeAngle = findSafeDroneAngle(drone, drone.targetX, drone.targetY, threats);
        drone.x += Math.cos(safeAngle) * step * 0.7;
        drone.y += Math.sin(safeAngle) * step * 0.7;
    } else {
        drone.x += (dx / dist) * step;
        drone.y += (dy / dist) * step;
    }

    // 边界裁剪
    drone.x = Math.max(10, Math.min(590, drone.x));
    drone.y = Math.max(10, Math.min(390, drone.y));

    updateDroneDisplay(drone);
}

// 无人机安全绕行角度搜索
function findSafeDroneAngle(drone, targetX, targetY, threats) {
    var directAngle = Math.atan2(targetY - drone.y, targetX - drone.x);
    var bestAngle = directAngle;
    var minRisk = Infinity;

    for (var a = -3; a <= 3; a++) {
        var angle = directAngle + a * (Math.PI / 6);
        var testX = drone.x + Math.cos(angle) * drone.speed * 3;
        var testY = drone.y + Math.sin(angle) * drone.speed * 3;

        var risk = 0;
        for (var t = 0; t < threats.length; t++) {
            var dx = testX - threats[t].x;
            var dy = testY - threats[t].y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < threats[t].radius) {
                risk += (threats[t].radius - dist);
            }
        }

        // 偏向指向目标的角度
        var anglePenalty = Math.abs(a) * 5;

        if (risk + anglePenalty < minRisk) {
            minRisk = risk + anglePenalty;
            bestAngle = angle;
        }
    }

    return bestAngle;
}

// 检查编队是否到达目标
function checkSquadArrival(squad) {
    var allIdle = squad.drones.filter(function(d) { return d.health > 0; }).every(function(d) {
        return d.status === 'idle';
    });

    if (!allIdle) return;

    if (squad.isRecalling) {
        // 召回到达发射车
        handleSquadRecallArrival(squad);
    } else if (squad.command === 'attack') {
        // 到达攻击位置，搜索目标
        addBattleLog('蜂群编组 ' + squad.id + ' 到达攻击位置，搜索敌方目标...');
        searchAndAttackTargets(squad);
    } else if (squad.command === 'move') {
        addBattleLog('蜂群编组 ' + squad.id + ' 到达转移位置');
        squad.command = 'idle';
    }
}

// 无人机自动搜索攻击
function droneAutoAttack(drone, squad) {
    var now = Date.now();
    if (now - drone.lastAttack < drone.attackCooldown) return;

    var enemies = mockEnemyUnits.filter(function(e) {
        return e.visible && e.health > 0;
    });

    var bestTarget = findBestDroneTarget(drone, enemies);
    if (!bestTarget) return;

    // 执行攻击
    drone.lastAttack = now;
    var damage = drone.attackPower;
    bestTarget.health -= damage;

    addBattleLog('蜂群无人机 ' + drone.id + ' 攻击 ' + bestTarget.name + '，造成 ' + damage + ' 点伤害！');

    if (bestTarget.health <= 0) {
        bestTarget.health = 0;
        addBattleLog('💥 ' + bestTarget.name + ' 被蜂群无人机摧毁！');
        updateEnemyDisplay();
    }
}

// 为无人机寻找最佳攻击目标
function findBestDroneTarget(drone, enemies) {
    var bestTarget = null;
    var highestPriority = -1;

    for (var i = 0; i < enemies.length; i++) {
        var enemy = enemies[i];
        var dx = drone.x - enemy.x;
        var dy = drone.y - enemy.y;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > drone.attackRange) continue;

        var priority = 0;
        if (enemy.type === 'command') priority += 50;
        else if (enemy.type === 'radar') priority += 35;
        else if (enemy.type === 'aa_long') priority += 30;
        else if (enemy.type === 'aa_short') priority += 25;
        else if (enemy.type === 'enemy_uav') priority += 20;
        else priority += 10;

        // 优先攻击残血目标
        var healthPercent = enemy.health / enemy.maxHealth;
        priority += (1 - healthPercent) * 15;

        // 距离惩罚
        priority -= dist / 3;

        if (priority > highestPriority) {
            highestPriority = priority;
            bestTarget = enemy;
        }
    }

    return bestTarget;
}

// 编队到达攻击位置后搜索并攻击
function searchAndAttackTargets(squad) {
    var aliveDrones = squad.drones.filter(function(d) { return d.health > 0; });
    if (aliveDrones.length === 0) return;

    // 找到编队中心附近的所有敌方目标
    var cx = squad.targetX;
    var cy = squad.targetY;
    var searchRadius = 80;

    var enemies = mockEnemyUnits.filter(function(e) {
        if (!e.visible || e.health <= 0) return false;
        var dx = e.x - cx;
        var dy = e.y - cy;
        return Math.sqrt(dx * dx + dy * dy) < searchRadius;
    });

    if (enemies.length === 0) {
        // 搜索范围内无目标，保持攻击状态并扩大搜索
        squad.command = 'attack';
        // 在攻击点周围散开巡逻
        assignScatterFormation(squad, cx, cy, 40);
        addBattleLog('蜂群编组 ' + squad.id + ' 攻击位置未发现目标，散开搜索中...');
    } else {
        // 分配无人机攻击不同目标（最优分配）
        addBattleLog('蜂群编组 ' + squad.id + ' 发现 ' + enemies.length + ' 个敌方目标，自动分配攻击！');
        assignDronesToTargets(aliveDrones, enemies);
    }
}

// 编队散开巡逻编队
function assignScatterFormation(squad, cx, cy, radius) {
    var aliveDrones = squad.drones.filter(function(d) { return d.health > 0; });
    var count = aliveDrones.length;
    if (count === 0) return;

    for (var i = 0; i < count; i++) {
        var angle = (i / count) * Math.PI * 2;
        aliveDrones[i].targetX = cx + Math.cos(angle) * radius;
        aliveDrones[i].targetY = cy + Math.sin(angle) * radius;
        aliveDrones[i].status = 'moving';
    }
}

// 最优分配无人机攻击目标
function assignDronesToTargets(drones, enemies) {
    // 按优先级排序目标
    var targetList = enemies.map(function(e) {
        var priority = 0;
        if (e.type === 'command') priority = 100;
        else if (e.type === 'radar') priority = 80;
        else if (e.type === 'aa_long') priority = 70;
        else if (e.type === 'aa_short') priority = 60;
        else if (e.type === 'enemy_uav') priority = 50;
        priority += (1 - e.health / e.maxHealth) * 20; // 残血优先
        return { enemy: e, priority: priority };
    });
    targetList.sort(function(a, b) { return b.priority - a.priority; });

    // 高优先级目标分配更多无人机
    var dronesPerTarget = [];
    var remaining = drones.length;
    for (var t = 0; t < targetList.length && remaining > 0; t++) {
        var allocated = t === 0 ? Math.min(3, remaining) : Math.min(2, remaining);
        dronesPerTarget.push({ enemy: targetList[t].enemy, count: allocated, drones: [] });
        remaining -= allocated;
    }

    // 分配具体无人机
    var droneIdx = 0;
    for (var dt = 0; dt < dronesPerTarget.length; dt++) {
        for (var d = 0; d < dronesPerTarget[dt].count && droneIdx < drones.length; d++) {
            dronesPerTarget[dt].drones.push(drones[droneIdx]);
            droneIdx++;
        }
    }

    // 设置每架无人机的攻击目标位置
    for (var ad = 0; ad < dronesPerTarget.length; ad++) {
        var group = dronesPerTarget[ad];
        var enemy = group.enemy;
        for (var gd = 0; gd < group.drones.length; gd++) {
            var drone = group.drones[gd];
            // 围绕目标展开
            var angleOffset = (gd - (group.drones.length - 1) / 2) * (Math.PI / 6);
            var surroundDist = drone.attackRange * 0.7;
            drone.targetX = enemy.x + Math.cos(angleOffset) * surroundDist;
            drone.targetY = enemy.y + Math.sin(angleOffset) * surroundDist;
            drone.status = 'moving';
        }
    }
}

// 召回到达发射车后回收无人机
function handleSquadRecallArrival(squad) {
    var launcher = mockUnits.find(function(u) { return u.id === squad.launcherId; });
    if (!launcher || launcher.health <= 0) {
        addBattleLog('蜂群编组 ' + squad.id + ' 发射车已损毁，编组原地待命！');
        squad.command = 'idle';
        squad.isRecalling = false;
        return;
    }

    var aliveCount = squad.drones.filter(function(d) { return d.health > 0; }).length;
    launcher.ammo += aliveCount;
    if (launcher.ammo > launcher.maxAmmo) launcher.ammo = launcher.maxAmmo;

    addBattleLog('蜂群编组 ' + squad.id + ' 已返回发射车，回收 ' + aliveCount + ' 架无人机（发射车剩余: ' + launcher.ammo + ' 架）');

    // 清除编组
    removeSquadElements(squad);
    var idx = droneSquads.indexOf(squad);
    if (idx >= 0) droneSquads.splice(idx, 1);
    updateUnitsList();
}

// ============================================================
// 常规无人机编组：移动、攻击、召回逻辑
// ============================================================

// 编组机动指令：长机引领，僚机V形跟随并保护长机
function setFormationMoveCommand(formation, targetX, targetY) {
    formation.command = 'move';
    formation.targetX = targetX;
    formation.targetY = targetY;
    formation.isRecalling = false;

    // 长机目标：直接飞向目标点
    formation.leadUnit.status = 'move';
    formation.leadUnit.isMovingToAttack = false;
    formation.leadUnit.isRecalling = false;

    // 僚机标记为移动
    formation.wingmen.forEach(function(w) {
        w.status = 'move';
        w.isRecalling = false;
    });

    // 计算初始编队位置
    updateFormationPositions(formation);

    addBattleLog('🔗 ' + formation.name + ' 长机 ' + formation.leadUnit.name + ' 引领编队，僚机V形跟随');
}

// 编组攻击指令（primaryTarget 为可选的具体敌方目标）
function setFormationAttackCommand(formation, targetX, targetY, primaryTarget) {
    formation.command = 'attack';
    formation.targetX = targetX;
    formation.targetY = targetY;
    formation.isRecalling = false;
    formation._primaryTarget = primaryTarget || null;  // 优先集火目标
    formation._scatterSet = false;                     // 重置散开标记

    formation.leadUnit.status = 'attack';
    formation.leadUnit.isMovingToAttack = true;
    formation.leadUnit.isRecalling = false;

    formation.wingmen.forEach(function(w) {
        w.status = 'attack';
        w.isRecalling = false;
    });

    // 计算编队位置（扇形展开朝向目标）
    updateFormationPositions(formation);

    if (primaryTarget) {
        addBattleLog('🔗 ' + formation.name + ' 编队锁定目标 ' + primaryTarget.name + '，全编队向目标进发！');
    } else {
        addBattleLog('🔗 ' + formation.name + ' 编队向攻击位置进发，AI将在到达后自动分配目标');
    }
}

// 编队逐次召回指令
function setFormationRecallCommand(formation) {
    formation.command = 'recall';
    formation.isRecalling = true;
    formation._recallQueue = [];     // 返航队列（长机优先）
    formation._recallDeparted = [];  // 已出发返航的单位
    formation._recallTimer = 0;      // 返航间隔计时器

    // 按等级排序：长机最先返航
    var sorted = formation.units.filter(function(u) { return u.health > 0; });
    sorted.sort(function(a, b) { return getUnitTier(a) - getUnitTier(b); });
    formation._recallQueue = sorted;

    addBattleLog('🔗 ' + formation.name + ' 执行逐次返航，长机 ' + formation.leadUnit.name + ' 率先返航...');

    // 立即派出第一架（长机）
    dispatchNextRecallUnit(formation);
}

// 派出下一架返航单位
function dispatchNextRecallUnit(formation) {
    if (formation._recallQueue.length === 0) {
        // 全部已派出，检查是否全部到达
        var allArrived = formation._recallDeparted.every(function(u) {
            return !u.isRecalling || u.status === 'ready';
        });
        if (allArrived || formation._recallDeparted.length === 0) {
            formation.command = 'idle';
            formation.isRecalling = false;
            formation._scatterSet = false;
            addBattleLog('🔗 ' + formation.name + ' 全部单位已返航！');
            updateUnitsList();
        }
        return;
    }

    var unit = formation._recallQueue.shift();

    // 跳过已损毁的单位
    if (unit.health <= 0) {
        addBattleLog('💀 ' + unit.name + ' 已损毁，跳过返航');
        dispatchNextRecallUnit(formation);
        return;
    }

    var baseX = 70 + unit.id * 6;
    var baseY = 370;

    unit.status = 'recall';
    unit.isRecalling = true;
    formation._recallDeparted.push(unit);

    addBattleLog('🏠 ' + unit.name + ' 开始返航...');
    moveToBase(unit, baseX, baseY);
}

// 更新编队各单位的编队位置（V形编队）
function updateFormationPositions(formation) {
    var lead = formation.leadUnit;
    if (!lead || lead.health <= 0) return;

    var targetX = formation.targetX || lead.x;
    var targetY = formation.targetY || lead.y;

    // 计算行进方向
    var dx = targetX - lead.x;
    var dy = targetY - lead.y;
    var angle = Math.atan2(dy, dx);

    var spacing = formation.formationSpacing || 25;

    formation.wingmen.forEach(function(w, index) {
        if (w.health <= 0) return;
        // V形编队：左右交替展开在长机后方
        var side = (index % 2 === 0) ? 1 : -1;
        var offsetIndex = Math.ceil((index + 1) / 2);
        var sideAngle = angle + (Math.PI / 2 + Math.PI / 6) * side;
        var backDist = offsetIndex * spacing * 1.2;

        w._formationTargetX = lead.x + Math.cos(sideAngle) * spacing * offsetIndex - Math.cos(angle) * backDist;
        w._formationTargetY = lead.y + Math.sin(sideAngle) * spacing * offsetIndex - Math.sin(angle) * backDist;
    });
}

// 每帧更新所有常规编组
function updateFormations() {
    for (var fi = formations.length - 1; fi >= 0; fi--) {
        var fg = formations[fi];

        // 检查编组是否全灭
        var allDead = fg.units.every(function(u) { return u.health <= 0; });
        if (allDead) {
            addBattleLog('💀 ' + fg.name + ' 全部单位已损毁，编组解散！');
            if (selectedFormation && selectedFormation.id === fg.id) {
                selectedFormation = null;
                formationCmdPending = null;
            }
            formations.splice(fi, 1);
            updateUnitsList();
            continue;
        }

        // 长机损毁时自动继任
        if (fg.leadUnit.health <= 0 && !fg._leadDead) {
            fg._leadDead = true;
            var survivors = fg.units.filter(function(u) { return u.health > 0; });
            if (survivors.length > 0) {
                survivors.sort(function(a, b) { return getUnitTier(a) - getUnitTier(b); });
                fg.leadUnit = survivors[0];
                fg.wingmen = survivors.slice(1);
                addBattleLog('⚠ ' + fg.name + ' 长机损毁！' + fg.leadUnit.name + ' 继任长机');
            }
        } else if (fg.leadUnit.health > 0) {
            fg._leadDead = false;
        }

        // 根据编组指令执行逻辑
        if (fg.command === 'move' || fg.command === 'attack') {
            updateFormationMovement(fg);

            // 攻击指令到达后自动索敌
            if (fg.command === 'attack') {
                formationAutoAttack(fg);
            }
        } else if (fg.command === 'recall') {
            updateFormationRecall(fg);
        }

        // 更新各单位DOM显示
        fg.units.forEach(function(u) {
            updateUnitDisplay(u);
        });
    }
}

// 编组移动步进
function updateFormationMovement(formation) {
    var lead = formation.leadUnit;
    if (!lead || lead.health <= 0) return;

    // 有优先目标时动态追踪目标位置
    var targetX, targetY;
    if (formation._primaryTarget && formation._primaryTarget.health > 0) {
        targetX = formation._primaryTarget.x;
        targetY = formation._primaryTarget.y;
        // 同步更新编组目标位置
        formation.targetX = targetX;
        formation.targetY = targetY;
    } else {
        targetX = formation.targetX;
        targetY = formation.targetY;
    }
    if (!targetX || !targetY) return;

    // 长机向目标移动
    var dx = targetX - lead.x;
    var dy = targetY - lead.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var speed = lead.maxSpeed || 4;

    if (dist < 3) {
        // 到达目标
        if (formation.command === 'move') {
            addBattleLog('🔗 ' + formation.name + ' 到达转移目标');
            formation.command = 'idle';
            formation.units.forEach(function(u) {
                if (u.health > 0 && u.status === 'move') u.status = 'deployed';
            });
            updateUnitsList();
            return;
        }
        // 攻击模式到达后保持位置，由formationAutoAttack处理
        lead.x = targetX;
        lead.y = targetY;
    } else {
        // 使用最优路径
        var threats = mockEnemyUnits.filter(function(e) {
            return e.visible && e.health > 0 && e.attackRange > 0;
        }).map(function(e) {
            return { x: e.x, y: e.y, radius: e.attackRange + 10 };
        });

        var path = calculateOptimalPath(lead.x, lead.y, targetX, targetY);
        var step = Math.min(speed, dist);
        var waypoint = path.length > 1 ? path[1] : { x: targetX, y: targetY };
        var wdx = waypoint.x - lead.x;
        var wdy = waypoint.y - lead.y;
        var wdist = Math.sqrt(wdx * wdx + wdy * wdy);

        if (wdist > 0) {
            lead.x += (wdx / wdist) * step;
            lead.y += (wdy / wdist) * step;
        }
    }

    // 边界裁剪
    lead.x = Math.max(50, Math.min(550, lead.x));
    lead.y = Math.max(30, Math.min(350, lead.y));

    // 更新僚机编队位置
    updateFormationPositions(formation);

    // 僚机移向编队位置 + 自动保护长机
    formation.wingmen.forEach(function(w) {
        if (w.health <= 0) return;
        if (!w._formationTargetX || !w._formationTargetY) return;

        var wdx = w._formationTargetX - w.x;
        var wdy = w._formationTargetY - w.y;
        var wdist = Math.sqrt(wdx * wdx + wdy * wdy);
        var wspeed = w.maxSpeed || 4;

        if (wdist > 1) {
            w.x += (wdx / wdist) * Math.min(wspeed, wdist);
            w.y += (wdy / wdist) * Math.min(wspeed, wdist);
        }

        w.x = Math.max(50, Math.min(550, w.x));
        w.y = Math.max(30, Math.min(350, w.y));

        // 僚机保护长机：攻击进入长机附近威胁范围的敌方单位
        wingmanProtectLead(w, lead);
    });
}

// 僚机保护长机：自动攻击靠近长机的敌方目标
function wingmanProtectLead(wingman, lead) {
    if (wingman.ammo <= 0) return;
    var now = Date.now();
    if (now - wingman._lastProtectAttack < 2500) return;
    wingman._lastProtectAttack = wingman._lastProtectAttack || 0;
    if (now - wingman._lastProtectAttack < 2500) return;

    // 搜索靠近长机的敌方单位
    var enemies = mockEnemyUnits.filter(function(e) {
        return e.visible && e.health > 0;
    });

    var bestTarget = null;
    var bestScore = -1;

    for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        var dxLead = lead.x - e.x;
        var dyLead = lead.y - e.y;
        var distToLead = Math.sqrt(dxLead * dxLead + dyLead * dyLead);

        var dxWing = wingman.x - e.x;
        var dyWing = wingman.y - e.y;
        var distToWing = Math.sqrt(dxWing * dxWing + dyWing * dyWing);

        // 优先攻击靠近长机的威胁，且僚机在攻击范围内
        var attackRange = wingman.attackRange || 30;
        if (distToWing > attackRange) continue;

        var score = (100 - distToLead) + (attackRange - distToWing) * 2;
        if (score > bestScore) {
            bestScore = score;
            bestTarget = e;
        }
    }

    if (bestTarget) {
        wingman._lastProtectAttack = now;
        wingman.ammo--;
        var damage = calculatePlayerDamage(wingman, bestTarget);
        bestTarget.health -= damage;

        addBattleLog('🛡️ 僚机 ' + getUnitShortName(wingman.name) + ' 保护长机，攻击 ' + bestTarget.name + ' 造成 ' + damage + ' 伤害！');

        if (bestTarget.health <= 0) {
            bestTarget.health = 0;
            addBattleLog('💥 ' + bestTarget.name + ' 被编队僚机摧毁！');
            updateEnemyDisplay();
        }
    }
}

// 编队自动攻击
function formationAutoAttack(formation) {
    var primaryTarget = formation._primaryTarget;

    // 如果有优先目标，检查优先目标是否已被摧毁
    if (primaryTarget && primaryTarget.health <= 0) {
        // 优先目标已摧毁，清除标记，转为区域搜索
        addBattleLog('🔗 ' + formation.name + ' 优先目标 ' + primaryTarget.name + ' 已摧毁，转为区域搜索！');
        formation._primaryTarget = null;
        primaryTarget = null;
        formation._scatterSet = false;
    }

    // 到达判定：有优先目标时检查是否进入攻击范围，否则检查是否到达目标位置
    var canEngage = false;
    if (primaryTarget) {
        // 任一单位已进入对优先目标的攻击范围即可接战
        var anyInRange = formation.units.filter(function(u) { return u.health > 0; }).some(function(u) {
            var dx = u.x - primaryTarget.x;
            var dy = u.y - primaryTarget.y;
            var range = u.attackRange || 30;
            return Math.sqrt(dx * dx + dy * dy) < range + 20;
        });
        if (anyInRange) {
            canEngage = true;
        }
    } else {
        // 无优先目标，检查是否到达目标位置
        canEngage = formation.units.filter(function(u) { return u.health > 0; }).every(function(u) {
            var dx = formation.targetX - u.x;
            var dy = formation.targetY - u.y;
            return Math.sqrt(dx * dx + dy * dy) < 60;
        });
    }

    if (!canEngage) return;

    // 搜索范围内的敌方目标
    var cx = primaryTarget ? primaryTarget.x : formation.targetX;
    var cy = primaryTarget ? primaryTarget.y : formation.targetY;
    var searchRadius = primaryTarget ? 60 : 100;

    var enemies;
    if (primaryTarget) {
        // 有优先目标：优先目标必定在列表中，同时搜索附近其他目标
        enemies = [primaryTarget];
        // 追加附近的其他目标
        mockEnemyUnits.forEach(function(e) {
            if (e.visible && e.health > 0 && e !== primaryTarget) {
                var dx = e.x - cx;
                var dy = e.y - cy;
                if (Math.sqrt(dx * dx + dy * dy) < searchRadius) {
                    enemies.push(e);
                }
            }
        });
    } else {
        enemies = mockEnemyUnits.filter(function(e) {
            if (!e.visible || e.health <= 0) return false;
            var dx = e.x - cx;
            var dy = e.y - cy;
            return Math.sqrt(dx * dx + dy * dy) < searchRadius;
        });
    }

    if (enemies.length === 0) {
        // 无目标，散开巡逻搜索
        if (!formation._scatterSet) {
            formation._scatterSet = true;
            formation._lastAttackTime = Date.now();
            addBattleLog('🔗 ' + formation.name + ' 攻击位置未发现目标，编队散开搜索...');
            formation.units.filter(function(u) { return u.health > 0; }).forEach(function(u, i) {
                var angle = (i / Math.max(1, formation.units.length)) * Math.PI * 2;
                u._formationTargetX = cx + Math.cos(angle) * 50;
                u._formationTargetY = cy + Math.sin(angle) * 50;
            });
        }
        return;
    }

    formation._scatterSet = false;

    if (primaryTarget) {
        // 有优先目标时全编队集火
        assignFormationFocusTarget(formation, primaryTarget, enemies);
    } else {
        // AI分配目标：长机打高价值目标，僚机分散攻击
        assignFormationTargets(formation, enemies);
    }

    // 执行攻击
    var now = Date.now();
    formation.units.filter(function(u) { return u.health > 0 && u.ammo > 0; }).forEach(function(u) {
        if (!u._assignedTarget) return;
        if (now - (u._lastFmtAttack || 0) < 2500) return;

        var target = u._assignedTarget;
        if (target.health <= 0) {
            u._assignedTarget = null;
            return;
        }

        var dx = u.x - target.x;
        var dy = u.y - target.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var range = u.attackRange || 30;

        if (dist < range) {
            u._lastFmtAttack = now;
            u.ammo--;
            var damage = calculatePlayerDamage(u, target);
            target.health -= damage;
            addBattleLog('🔗 ' + u.name + ' 攻击 ' + target.name + '，造成 ' + damage + ' 伤害！');

            if (target.health <= 0) {
                target.health = 0;
                addBattleLog('💥 ' + target.name + ' 被编队 ' + formation.name + ' 摧毁！');
                updateEnemyDisplay();
                u._assignedTarget = null;
            }
        }
    });
}

// AI分配编队攻击目标（长机高价值、僚机分散）
function assignFormationTargets(formation, enemies) {
    // 按优先级排序目标
    var targetList = enemies.map(function(e) {
        var priority = 0;
        if (e.type === 'command') priority = 100;
        else if (e.type === 'radar') priority = 80;
        else if (e.type === 'aa_long') priority = 70;
        else if (e.type === 'aa_short') priority = 60;
        else if (e.type === 'enemy_uav') priority = 50;
        priority += (1 - e.health / e.maxHealth) * 20; // 残血优先
        return { enemy: e, priority: priority };
    });
    targetList.sort(function(a, b) { return b.priority - a.priority; });

    var availableUnits = formation.units.filter(function(u) { return u.health > 0 && u.ammo > 0; });
    if (availableUnits.length === 0 || targetList.length === 0) return;

    // 长机分配最高优先级目标
    if (formation.leadUnit.health > 0 && formation.leadUnit.ammo > 0 && targetList.length > 0) {
        formation.leadUnit._assignedTarget = targetList[0].enemy;
        // 标记已分配
        targetList[0].assigned = true;
    }

    // 僚机分配剩余目标（均匀分散）
    var remainingTargets = targetList.filter(function(t) { return !t.assigned; });
    formation.wingmen.forEach(function(w, idx) {
        if (w.health <= 0 || w.ammo <= 0) return;
        if (remainingTargets.length > 0) {
            var ti = idx % remainingTargets.length;
            w._assignedTarget = remainingTargets[ti].enemy;
        } else if (targetList.length > 0) {
            // 所有目标都已被分配，支援长机
            w._assignedTarget = targetList[0].enemy;
        }
    });

    // 让分配了目标的单位靠近其目标
    formation.units.filter(function(u) { return u.health > 0 && u._assignedTarget; }).forEach(function(u) {
        var t = u._assignedTarget;
        if (t && t.health > 0) {
            var angle = Math.atan2(t.y - u.y, t.x - u.x);
            var range = u.attackRange || 30;
            u._formationTargetX = t.x - Math.cos(angle) * range * 0.6;
            u._formationTargetY = t.y - Math.sin(angle) * range * 0.6;
        }
    });
}

// 集火模式：全编队集中攻击优先目标，剩余火力打次要目标
function assignFormationFocusTarget(formation, primaryTarget, allEnemies) {
    var availableUnits = formation.units.filter(function(u) { return u.health > 0 && u.ammo > 0; });
    if (availableUnits.length === 0) return;

    // 所有有攻击力的单位集火优先目标
    availableUnits.forEach(function(u) {
        u._assignedTarget = primaryTarget;
    });

    // 长机和部分僚机可同时攻击次要目标（如果弹药充足、优先目标血量低）
    if (primaryTarget.health < primaryTarget.maxHealth * 0.4 && allEnemies.length > 1) {
        var secondaryEnemies = allEnemies.filter(function(e) { return e !== primaryTarget && e.health > 0; });
        if (secondaryEnemies.length > 0 && formation.wingmen.length >= 2) {
            // 分配1-2架僚机处理次要目标
            var secondaryCount = Math.min(2, secondaryEnemies.length);
            for (var i = 0; i < secondaryCount && i < formation.wingmen.length; i++) {
                if (formation.wingmen[i].health > 0 && formation.wingmen[i].ammo > 0) {
                    formation.wingmen[i]._assignedTarget = secondaryEnemies[i % secondaryEnemies.length];
                }
            }
        }
    }

    // 单位围绕各自目标展开
    formation.units.filter(function(u) { return u.health > 0 && u._assignedTarget; }).forEach(function(u) {
        var t = u._assignedTarget;
        if (t && t.health > 0) {
            // 围绕目标分散，从不同方向攻击
            var idx = availableUnits.indexOf(u);
            var angleOffset = (idx - (availableUnits.length - 1) / 2) * (Math.PI / 6);
            var angle = Math.atan2(t.y - u.y, t.x - u.x) + angleOffset;
            var range = u.attackRange || 30;
            u._formationTargetX = t.x - Math.cos(angle) * range * 0.5;
            u._formationTargetY = t.y - Math.sin(angle) * range * 0.5;
        }
    });
}

// 更新编队召回（逐次返航）
function updateFormationRecall(formation) {
    if (!formation.isRecalling) return;

    // 计时器：每隔3秒派出一架返航
    formation._recallTimer = (formation._recallTimer || 0) + 1;

    // 检查已出发的单位是否到达基地
    var arrivedCount = 0;
    for (var i = formation._recallDeparted.length - 1; i >= 0; i--) {
        var u = formation._recallDeparted[i];
        if (!u.isRecalling || u.status === 'ready') {
            arrivedCount++;
        }
    }

    // 间隔派出下一架（每3秒，即每3个game tick）
    if (formation._recallQueue.length > 0 && formation._recallTimer >= 3) {
        formation._recallTimer = 0;

        // 检查上一架是否已出发足够久
        var lastDeparted = formation._recallDeparted[formation._recallDeparted.length - 1];
        if (!lastDeparted || !lastDeparted.isRecalling || lastDeparted.status === 'ready') {
            dispatchNextRecallUnit(formation);
        }
    }

    // 全部到达后完成
    if (formation._recallQueue.length === 0 && formation._recallDeparted.length > 0) {
        var allDone = formation._recallDeparted.every(function(u) {
            return !u.isRecalling || u.status === 'ready';
        });
        if (allDone) {
            formation.command = 'idle';
            formation.isRecalling = false;
            formation._scatterSet = false;
            addBattleLog('🔗 ' + formation.name + ' 全部单位已返航！');
            updateUnitsList();
        }
    }
}
