// ============================================================
// enemy.js — 敌方AI、敌方移动/攻击/显示（第4个加载）
// ============================================================

// 我方基地 (60,330) 60×60，安全缓冲区 50
var BASE_SAFE_X1 = 10, BASE_SAFE_Y1 = 280;
var BASE_SAFE_X2 = 170, BASE_SAFE_Y2 = 440;

function isInsideBaseSafeZone(x, y) {
    return x >= BASE_SAFE_X1 && x <= BASE_SAFE_X2 &&
           y >= BASE_SAFE_Y1 && y <= BASE_SAFE_Y2;
}

function simulateEnemyAI() {
    mockEnemyUnits.forEach(enemy => {
        if (enemy.health <= 0) return;

        if (enemy.type === 'enemy_uav' && enemy.speed > 0) {
            // 敌方无人机主动攻击被任何敌方单位侦察到的我方无人机
            const playerTarget = findPlayerUnitInRange(enemy);
            if (playerTarget) {
                enemy.targetX = playerTarget.x;
                enemy.targetY = playerTarget.y;
                var targetName = playerTarget.name || playerTarget.id || '未知单位';
                addBattleLog(enemy.name + ' 发现我方 ' + targetName + '，主动追击');

                // 检查是否进入攻击范围，是则发动攻击
                const dx = playerTarget.x - enemy.x;
                const dy = playerTarget.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < enemy.attackRange) {
                    enemy.lastAttack = Date.now();
                    const damage = calculateDamage(enemy, playerTarget);
                    playerTarget.health -= damage;
                    addBattleLog(enemy.name + ' 攻击 ' + targetName + '，造成 ' + damage + ' 点伤害');
                    if (playerTarget.health <= 0) {
                        playerTarget.health = 0;
                        playerTarget.status = 'damaged';
                        addBattleLog(targetName + ' 被摧毁');
                    }
                    // 根据目标类型更新显示
                    if (playerTarget.id && playerTarget.squadId) {
                        updateDroneDisplay(playerTarget);
                    } else {
                        updateUnitsList();
                        updateUnitDisplay(playerTarget);
                    }
                }
            } else {
                const dx = enemy.targetX - enemy.x;
                const dy = enemy.targetY - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 5 || !enemy.targetX) {
                    setRandomTarget(enemy);
                }
            }
            // 持续移动敌方无人机
            moveEnemyUnit(enemy);
        } else if (enemy.speed > 0) {
            moveEnemyUnit(enemy);
        }

        if (!enemy.hidden) {
            const inCloud = isPointInCloud(enemy.x, enemy.y);
            const inMountain = isPointInMountain(enemy.x, enemy.y);

            if (inCloud || inMountain) {
                // 进入云层/山地后暂时不可见，但已发现的单位保留在列表中
                if (enemy.discovered && enemy.visible) {
                    enemy.visible = false;
                    updateEnemyList();  // 立即更新列表显示"信号丢失"
                } else {
                    enemy.visible = false;
                }
            } else {
                if (!enemy.visible) {
                    enemy.visible = true;
                    markEnemyDiscovered(enemy);
                }
            }
        }

        const playerUnits = mockUnits.filter(u => u.status !== 'ready' && u.health > 0);
        // 同时收集蜂巢小型无人机作为潜在目标
        const allDrones = [];
        droneSquads.forEach(function(squad) {
            squad.drones.forEach(function(drone) {
                if (drone.health > 0) allDrones.push(drone);
            });
        });
        playerUnits.forEach(player => {
            if (isUnitDetectedByEnemy(player, enemy)) {
                if (!enemy.visible && player.scoutRadius > 0) {
                    enemy.visible = true;
                    markEnemyDiscovered(enemy);
                    addBattleLog('发现敌方 ' + enemy.name);
                    updateEnemyDisplay();
                }

                if (enemy.attackRange > 0) {
                    const dx = enemy.x - player.x;
                    const dy = enemy.y - player.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < enemy.attackRange) {
                        executeEnemyAttack(enemy, player);
                    }
                }
            }
        });

        // 敌方单位也攻击蜂巢小型无人机
        allDrones.forEach(function(drone) {
            if (drone.health <= 0) return;
            const dx = enemy.x - drone.x;
            const dy = enemy.y - drone.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            var effectiveRange = enemy.scoutRange;
            if (isPointInMountain(drone.x, drone.y)) effectiveRange *= 0.3;
            if (isPointInJamming(drone.x, drone.y)) effectiveRange *= 0.7;

            if (distance < effectiveRange || distance < enemy.attackRange) {
                // 敌方发现了蜂群无人机
                if (enemy.attackRange > 0 && distance < enemy.attackRange) {
                    var now = Date.now();
                    if (now - enemy.lastAttack >= enemy.attackCooldown) {
                        enemy.lastAttack = now;
                        var damage = calculateDamage(enemy, { x: drone.x, y: drone.y, type: 'mini_drone' });
                        drone.health -= damage;
                        addBattleLog(enemy.name + ' 攻击蜂群无人机 ' + drone.id + '，造成 ' + damage + ' 点伤害');
                        if (drone.health <= 0) {
                            drone.health = 0;
                            addBattleLog('蜂群无人机 ' + drone.id + ' 被摧毁');
                            updateDroneDisplay(drone);
                        }
                    }
                }
            }
        });
    });
}

function findPlayerUnitInRange(enemy) {
    // 查找被任何敌方单位侦察到的我方单位（包括蜂巢小型无人机）
    const playerUnits = mockUnits.filter(function(u) { return u.status !== 'ready' && u.health > 0; });

    var closestTarget = null;
    var closestDist = Infinity;

    // 检查常规玩家单位
    for (var pi = 0; pi < playerUnits.length; pi++) {
        var player = playerUnits[pi];
        for (var ei = 0; ei < mockEnemyUnits.length; ei++) {
            var detector = mockEnemyUnits[ei];
            if (detector.health <= 0 || detector.scoutRange <= 0) continue;

            var dx = detector.x - player.x;
            var dy = detector.y - player.y;
            var distanceToDetector = Math.sqrt(dx * dx + dy * dy);

            if (distanceToDetector < detector.scoutRange && distanceToDetector < closestDist) {
                closestDist = distanceToDetector;
                closestTarget = player;
                break;
            }
        }
    }

    // 检查蜂巢小型无人机（更近的目标优先）
    droneSquads.forEach(function(squad) {
        squad.drones.forEach(function(drone) {
            if (drone.health <= 0) return;
            for (var ei2 = 0; ei2 < mockEnemyUnits.length; ei2++) {
                var detector2 = mockEnemyUnits[ei2];
                if (detector2.health <= 0 || detector2.scoutRange <= 0) continue;

                var dx2 = detector2.x - drone.x;
                var dy2 = detector2.y - drone.y;
                var dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

                if (dist2 < detector2.scoutRange && dist2 < closestDist) {
                    closestDist = dist2;
                    closestTarget = drone;
                    break;
                }
            }
        });
    });

    return closestTarget;
}

function isUnitDetectedByEnemy(player, enemy) {
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    let effectiveRange = enemy.scoutRange;

    if (isPointInMountain(player.x, player.y)) {
        effectiveRange = effectiveRange * 0.3;
    }

    if (isPointInJamming(player.x, player.y)) {
        effectiveRange = effectiveRange * 0.7;
    }

    return distance < effectiveRange;
}

function moveEnemyUnit(enemy) {
    if (enemy.targetX == null || enemy.targetY == null) {
        setRandomTarget(enemy);
    }

    // 启动持续移动循环（由 continueEnemyMove 处理所有移动）
    if (enemy.type === 'enemy_uav' && enemy.health > 0 && !enemy.moveLoopStarted) {
        enemy.moveLoopStarted = true;
        requestAnimationFrame(() => continueEnemyMove(enemy));
    }
}

// 持续移动敌方无人机（基于时间驱动）
function continueEnemyMove(enemy) {
    if (enemy.health <= 0) return;

    if (!enemy.lastEnemyMove) {
        enemy.lastEnemyMove = Date.now();
    }

    const now = Date.now();
    const elapsed = (now - enemy.lastEnemyMove) / 1000;
    enemy.lastEnemyMove = now;

    if (enemy.targetX == null || enemy.targetY == null) {
        setRandomTarget(enemy);
        requestAnimationFrame(() => continueEnemyMove(enemy));
        return;
    }

    const dx = enemy.targetX - enemy.x;
    const dy = enemy.targetY - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 5) {
        setRandomTarget(enemy);
    } else {
        // 基于时间的移动：speed 是像素/秒
        const moveDistance = enemy.speed * elapsed;
        var nextX = enemy.x + (dx / distance) * moveDistance;
        var nextY = enemy.y + (dy / distance) * moveDistance;

        // 我方未下达指令前，敌方无人机不得进入基地安全区
        if (!friendlyCommandIssued && isInsideBaseSafeZone(nextX, nextY)) {
            setRandomTarget(enemy);
        } else {
            enemy.x = nextX;
            enemy.y = nextY;
        }
    }

    if (!enemy.hidden) {
        updateEnemyDisplay();
    }

    // 继续移动（敌方无人机持续巡航）
    requestAnimationFrame(() => continueEnemyMove(enemy));
}

function setRandomTarget(enemy) {
    const baseX = enemy.x;
    const baseY = enemy.y;

    if (enemy.type === 'enemy_uav') {
        // 提高隐藏范围偏好，70%概率偏向隐藏区域
        let preferHiddenArea = Math.random() > 0.3;

        if (preferHiddenArea) {
            const nearbyCloud = findNearbyCloud(enemy.x, enemy.y);
            if (nearbyCloud) {
                enemy.targetX = nearbyCloud.x + nearbyCloud.width / 2 + (Math.random() - 0.5) * 60;
                enemy.targetY = nearbyCloud.y + nearbyCloud.height / 2 + (Math.random() - 0.5) * 40;
                enemy.targetX = Math.max(200, Math.min(550, enemy.targetX));
                enemy.targetY = Math.max(50, Math.min(250, enemy.targetY));
                return;
            }

            const nearbyHill = findNearbyHill(enemy.x, enemy.y);
            if (nearbyHill) {
                enemy.targetX = nearbyHill.x + nearbyHill.width / 2 + (Math.random() - 0.5) * 80;
                enemy.targetY = nearbyHill.y + nearbyHill.height / 2 + (Math.random() - 0.5) * 60;
                enemy.targetX = Math.max(200, Math.min(550, enemy.targetX));
                enemy.targetY = Math.max(50, Math.min(250, enemy.targetY));
                return;
            }
        }
    }

    enemy.targetX = Math.max(200, Math.min(550, baseX + (Math.random() - 0.5) * 200));
    enemy.targetY = Math.max(50, Math.min(250, baseY + (Math.random() - 0.5) * 150));
}

function findNearbyCloud(x, y) {
    let closestCloud = null;
    let minDistance = 150;

    for (const cloud of clouds) {
        const centerX = cloud.x + cloud.width / 2;
        const centerY = cloud.y + cloud.height / 2;
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < minDistance) {
            minDistance = distance;
            closestCloud = cloud;
        }
    }

    return closestCloud;
}

function findNearbyHill(x, y) {
    for (const hill of terrainData.hills) {
        const centerX = hill.x + hill.width / 2;
        const centerY = hill.y + hill.height / 2;
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 100) {
            return hill;
        }
    }
    return null;
}

function executeEnemyAttack(enemy, target) {
    const now = Date.now();
    if (now - enemy.lastAttack < enemy.attackCooldown) {
        return;
    }

    // 收集所有常规玩家单位和蜂巢小型无人机
    const targetsInRange = mockUnits.filter(u => u.status !== 'ready' && u.health > 0);
    droneSquads.forEach(function(squad) {
        squad.drones.forEach(function(drone) {
            if (drone.health > 0) targetsInRange.push(drone);
        });
    });

    const bestTarget = findBestTarget(enemy, targetsInRange);

    if (bestTarget) {
        enemy.lastAttack = now;
        const damage = calculateDamage(enemy, bestTarget);
        const targetName = bestTarget.name || bestTarget.id || '未知单位';
        bestTarget.health -= damage;
        addBattleLog(enemy.name + ' 攻击 ' + targetName + '，造成 ' + damage + ' 点伤害');

        if (bestTarget.health <= 0) {
            bestTarget.health = 0;
            bestTarget.status = 'damaged';
            addBattleLog(targetName + ' 被摧毁');
            if (bestTarget.squadId && !bestTarget.name) {
                updateDroneDisplay(bestTarget);
            } else {
                updateUnitsList();
                updateUnitDisplay(bestTarget);
            }
        } else {
            updateUnitsList();
        }
    }
}

function findBestTarget(enemy, targets) {
    let bestTarget = null;
    let highestPriority = -1;

    targets.forEach(target => {
        const dx = enemy.x - target.x;
        const dy = enemy.y - target.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > enemy.attackRange) return;

        let priority = 0;
        // 蜂巢小型无人机
        if (target.squadId && !target.name) {
            priority += 15; // 小型无人机优先级中等（数量多但个体威胁小）
        } else {
            if (target.type === 'scout') priority += 30;
            if (target.type === 'attack') priority += 20;
            if (target.type === 'strike') priority += 25;
            if (target.type === 'swarm') priority += 10;
        }

        priority -= distance / 10;

        if (priority > highestPriority) {
            highestPriority = priority;
            bestTarget = target;
        }
    });

    return bestTarget;
}

function calculateDamage(attacker, target) {
    const baseDamage = attacker.type === 'aa_short' ? 25 :
                      attacker.type === 'aa_long' ? 70 :
                      attacker.type === 'enemy_uav' ? 35 : 10;

    const dx = attacker.x - target.x;
    const dy = attacker.y - target.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const effectiveRange = attacker.attackRange || 30;
    const distanceFactor = Math.max(0.3, 1 - distance / effectiveRange);
    const randomFactor = 0.8 + Math.random() * 0.4;

    // 对蜂群小型无人机伤害减半（体积小难命中）
    if (target.squadId && !target.name) {
        return Math.floor(baseDamage * distanceFactor * randomFactor * 0.5);
    }

    return Math.floor(baseDamage * distanceFactor * randomFactor);
}

// --- 已发现敌方单位列表 ---

function getEnemyTypeText(type) {
    var map = {
        'command': '指挥中心',
        'aa_short': '近程防空',
        'aa_long': '远程防空',
        'radar': '预警雷达',
        'enemy_uav': '敌方无人机'
    };
    return map[type] || type;
}

// 标记敌方单位已被玩家探明（一旦发现，永久记录）
function markEnemyDiscovered(enemy) {
    if (!enemy.discovered) {
        enemy.discovered = true;
        addBattleLog(enemy.name + ' 已录入战场情报');
    }
    // 更新最后目击信息
    enemy.lastSeenX = enemy.x;
    enemy.lastSeenY = enemy.y;
    enemy.lastSeenTime = gameTime;
    updateEnemyList();  // 立即刷新列表
}

function updateEnemyList() {
    var list = document.getElementById('enemy-list');
    var countLabel = document.getElementById('enemy-count-label');
    if (!list || !countLabel) return;

    // 仅显示已被探明的敌方单位（discovered=true），开局隐藏单位不显示
    var discovered = mockEnemyUnits.filter(function(e) {
        return e.discovered;
    });

    countLabel.textContent = discovered.length + ' 单位';

    if (discovered.length === 0) {
        list.innerHTML = '<div style="padding: 20px; text-align: center; color: #555; font-size: 12px;">暂未发现敌方单位<br>派出侦察无人机探明战场</div>';
        return;
    }

    // 我方基地中心坐标（60+30, 330+30）
    var ourBaseX = 90, ourBaseY = 360;

    // 按类型排序：指挥中心 > 雷达 > 远程防空 > 近程防空 > 无人机
    var typeOrder = { 'command': 0, 'radar': 1, 'aa_long': 2, 'aa_short': 3, 'enemy_uav': 4 };

    discovered.sort(function(a, b) {
        var oa = typeOrder[a.type] !== undefined ? typeOrder[a.type] : 99;
        var ob = typeOrder[b.type] !== undefined ? typeOrder[b.type] : 99;
        if (oa !== ob) return oa - ob;
        return a.health - b.health;
    });

    list.innerHTML = discovered.map(function(enemy) {
        var healthPct = enemy.maxHealth > 0 ? enemy.health / enemy.maxHealth : 0;
        var healthClass = healthPct > 0.6 ? 'high' : (healthPct > 0.3 ? 'medium' : 'low');
        var destroyed = enemy.health <= 0;
        var isStale = !destroyed && enemy.discovered && !enemy.visible && enemy.type === 'enemy_uav';
        var itemClass = destroyed ? 'destroyed' : '';
        if (isStale) itemClass += ' stale-intel';
        if (enemy.type === 'command') itemClass += ' command-unit';

        // 坐标使用：当前可见用实时坐标，否则用最后目击坐标
        var displayX, displayY;
        if (enemy.visible || !enemy.discovered) {
            displayX = Math.round(enemy.x);
            displayY = Math.round(enemy.y);
        } else {
            displayX = enemy.lastSeenX !== null ? Math.round(enemy.lastSeenX) : '?';
            displayY = enemy.lastSeenY !== null ? Math.round(enemy.lastSeenY) : '?';
        }

        // 计算距我基地距离
        var dist;
        if (enemy.visible || enemy.lastSeenX !== null) {
            var refX = enemy.visible ? enemy.x : enemy.lastSeenX;
            var refY = enemy.visible ? enemy.y : enemy.lastSeenY;
            var dx = refX - ourBaseX;
            var dy = refY - ourBaseY;
            dist = Math.round(Math.sqrt(dx * dx + dy * dy));
        } else {
            dist = '?';
        }

        var statusText, statusClass;
        if (destroyed) {
            statusText = '已摧毁';
            statusClass = 'damaged';
        } else if (isStale) {
            statusText = '情报过期';
            statusClass = 'scout';
        } else if (!enemy.visible && enemy.discovered) {
            statusText = '信号丢失';
            statusClass = 'scout';
        } else {
            statusText = '活动中';
            statusClass = 'deployed';
        }

        var attackInfo = '';
        if (!destroyed && enemy.attackRange > 0) {
            attackInfo = ' | 射程:' + enemy.attackRange;
        }
        if (!destroyed && enemy.scoutRange > 0) {
            attackInfo += ' | 探测:' + enemy.scoutRange;
        }

        // 敌方无人机隐身时显示最后目击时间
        var staleNote = '';
        if (isStale || (!destroyed && enemy.discovered && !enemy.visible)) {
            var timeSince = enemy.lastSeenTime > 0 ? (gameTime - enemy.lastSeenTime) : '?';
            staleNote = '<div class="enemy-dist stale-note">最后目击: ' + timeSince + '秒前 (' + displayX + ', ' + displayY + ')</div>';
        }

        return '<div class="unit-item ' + itemClass + '" data-enemy-id="' + enemy.id + '">' +
            '<div class="unit-header">' +
                '<span class="unit-name">' + getEnemyTypeText(enemy.type) + '</span>' +
                '<span class="unit-status ' + statusClass + '" style="font-size:10px;">' + statusText + '</span>' +
            '</div>' +
            '<div class="enemy-health-bar">' +
                '<div class="enemy-health-fill ' + healthClass + '" style="width:' + (healthPct * 100) + '%"></div>' +
            '</div>' +
            '<div class="unit-stats">' +
                '<span>生命 ' + Math.max(0, enemy.health) + '/' + enemy.maxHealth + '</span>' +
                '<span>距基地 ' + dist + '</span>' +
            '</div>' +
            '<div class="enemy-dist">坐标: (' + displayX + ', ' + displayY + ')' + attackInfo + '</div>' +
            staleNote +
        '</div>';
    }).join('');
}
