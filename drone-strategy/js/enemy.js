// ============================================================
// enemy.js - 敌方AI、移动、攻击、列表显示
// ============================================================

// --- 敌方AI主循环 ---
function simulateEnemyAI() {
    mockEnemyUnits.forEach(function(enemy) {
        if (enemy.health <= 0) return;

        if (enemy.type === 'enemy_uav' && enemy.speed > 0) {
            if (enemy.ammo <= 0) {
                updateEnemyUavResupply(enemy);
            } else {
                var playerTarget = findPlayerUnitInRange(enemy);
                if (playerTarget) {
                    enemy.targetX = playerTarget.x;
                    enemy.targetY = playerTarget.y;
                    var targetName = playerTarget.name || playerTarget.id || '未知单位';
                    addBattleLog(enemy.name + ' 发现我方 ' + targetName + '，主动追击');

                    var dx = playerTarget.x - enemy.x;
                    var dy = playerTarget.y - enemy.y;
                    var distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < enemy.attackRange) {
                        fireEnemyShot(enemy, playerTarget);
                    }
                } else {
                    var roamDx = enemy.targetX - enemy.x;
                    var roamDy = enemy.targetY - enemy.y;
                    var roamDist = Math.sqrt(roamDx * roamDx + roamDy * roamDy);
                    if (roamDist < 5 || !enemy.targetX) {
                        setRandomTarget(enemy);
                    }
                }
            }
            moveEnemyUnit(enemy);
        } else if (enemy.speed > 0) {
            moveEnemyUnit(enemy);
        }

        if (!enemy.hidden) {
            var inCloud = isPointInCloud(enemy.x, enemy.y);
            var inMountain = isPointInMountain(enemy.x, enemy.y);

            if (inCloud || inMountain) {
                if (enemy.discovered && enemy.visible) {
                    enemy.visible = false;
                    updateEnemyList();
                } else {
                    enemy.visible = false;
                }
            } else if (!enemy.visible) {
                enemy.visible = true;
                markEnemyDiscovered(enemy);
            }
        }

        var playerUnits = mockUnits.filter(function(u) {
            return u.status !== 'ready' && u.health > 0;
        });

        var allDrones = [];
        droneSquads.forEach(function(squad) {
            squad.drones.forEach(function(drone) {
                if (drone.health > 0) allDrones.push(drone);
            });
        });

        playerUnits.forEach(function(player) {
            if (isUnitDetectedByEnemy(player, enemy)) {
                if (!enemy.visible && player.scoutRadius > 0) {
                    enemy.visible = true;
                    markEnemyDiscovered(enemy);
                    addBattleLog('发现敌方 ' + enemy.name);
                    updateEnemyDisplay();
                }

                if (enemy.attackRange > 0 && canEnemyFire(enemy)) {
                    var dx = enemy.x - player.x;
                    var dy = enemy.y - player.y;
                    var distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < enemy.attackRange) {
                        executeEnemyAttack(enemy, player);
                    }
                }
            }
        });

        allDrones.forEach(function(drone) {
            if (drone.health <= 0) return;

            var dx = enemy.x - drone.x;
            var dy = enemy.y - drone.y;
            var distance = Math.sqrt(dx * dx + dy * dy);
            var effectiveRange = enemy.scoutRange;

            if (isPointInMountain(drone.x, drone.y)) effectiveRange *= 0.3;
            if (isPointInJamming(drone.x, drone.y)) effectiveRange *= 0.7;

            if (distance < effectiveRange || distance < enemy.attackRange) {
                if (enemy.attackRange > 0 && distance < enemy.attackRange && canEnemyFire(enemy)) {
                    var now = Date.now();
                    if (now - enemy.lastAttack >= enemy.attackCooldown) {
                        fireEnemyShot(enemy, drone);
                    }
                }
            }
        });
    });
}

// --- 敌方无人机补给 ---
function updateEnemyUavResupply(enemy) {
    if (enemy.resupplyX === null || enemy.resupplyY === null) {
        enemy.resupplyX = enemy.x;
        enemy.resupplyY = enemy.y;
    }

    if (enemyUavResupplyQueue.indexOf(enemy.id) === -1) {
        enemyUavResupplyQueue.push(enemy.id);
    }

    if (enemyUavActiveResupplyId !== null && enemyUavActiveResupplyId !== enemy.id) {
        enemy.resupplyState = 'waiting';
        enemy.targetX = enemy.resupplyX;
        enemy.targetY = enemy.resupplyY;
        return;
    }

    enemyUavActiveResupplyId = enemy.id;
    enemy.resupplyState = 'returning';
    enemy.targetX = enemy.resupplyX;
    enemy.targetY = enemy.resupplyY;

    var dx = enemy.targetX - enemy.x;
    var dy = enemy.targetY - enemy.y;
    var distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < 8) {
        enemy.ammo = enemy.maxAmmo || 4;
        enemy.resupplyState = 'ready';
        enemyUavResupplyQueue = enemyUavResupplyQueue.filter(function(id) {
            return id !== enemy.id;
        });
        enemyUavActiveResupplyId = null;
        addBattleLog(enemy.name + ' 完成交替补给，弹药恢复至 ' + enemy.ammo + ' 枚');
    }
}

// --- 敌方开火射击 ---
function fireEnemyShot(enemy, target) {
    if (enemy.type === 'enemy_uav' && enemy.ammo <= 0) {
        updateEnemyUavResupply(enemy);
        return false;
    }

    var ourBaseX = 90, ourBaseY = 390;
    if (target && !target.name && Math.abs(target.x - ourBaseX) < 30 && Math.abs(target.y - ourBaseY) < 30) {
        return false;
    }

    enemy.lastAttack = Date.now();
    if (enemy.ammo !== undefined && enemy.ammo > 0) {
        enemy.ammo--;
    }

    var damage = calculateDamage(enemy, target);
    var targetName = target.name || target.id || '未知单位';
    target.health -= damage;
    addBattleLog(enemy.name + ' 攻击 ' + targetName + '，造成 ' + damage + ' 点伤害');

    if (target.health <= 0) {
        target.health = 0;
        target.status = 'damaged';
        addBattleLog(targetName + ' 被摧毁');
    }

    if (target.squadId && !target.name) {
        updateDroneDisplay(target);
    } else {
        updateUnitsList();
        if (target.squadId) {
            updateDroneDisplay(target);
        } else {
            updateUnitDisplay(target);
        }
    }

    if (enemy.type === 'enemy_uav' && enemy.ammo <= 0) {
        updateEnemyUavResupply(enemy);
    }

    return true;
}

// --- 判定可否开火 ---
function canEnemyFire(enemy) {
    return enemy.type !== 'enemy_uav' || enemy.ammo > 0;
}

// --- 寻找射程内目标 ---
function findPlayerUnitInRange(enemy) {
    var playerUnits = mockUnits.filter(function(u) {
        return u.status !== 'ready' && u.health > 0;
    });

    var closestTarget = null;
    var closestDist = Infinity;

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

// --- 判定单位被侦测 ---
function isUnitDetectedByEnemy(player, enemy) {
    var dx = enemy.x - player.x;
    var dy = enemy.y - player.y;
    var distance = Math.sqrt(dx * dx + dy * dy);

    var effectiveRange = enemy.scoutRange;
    if (isPointInMountain(player.x, player.y)) {
        effectiveRange = effectiveRange * 0.3;
    }
    if (isPointInJamming(player.x, player.y)) {
        effectiveRange = effectiveRange * 0.7;
    }

    return distance < effectiveRange;
}

// --- 敌方移动入口 ---
function moveEnemyUnit(enemy) {
    if (!enemy.targetX || !enemy.targetY) {
        setRandomTarget(enemy);
    }

    if (enemy.type === 'enemy_uav' && enemy.health > 0 && !enemy.moveLoopStarted) {
        enemy.moveLoopStarted = true;
        requestAnimationFrame(function() {
            continueEnemyMove(enemy);
        });
    }
}

// --- 敌方持续移动 ---
function continueEnemyMove(enemy) {
    if (enemy.health <= 0) return;

    if (!enemy.lastEnemyMove) {
        enemy.lastEnemyMove = Date.now();
    }

    var now = Date.now();
    var elapsed = (now - enemy.lastEnemyMove) / 1000;
    enemy.lastEnemyMove = now;

    if (!enemy.targetX || !enemy.targetY) {
        setRandomTarget(enemy);
        requestAnimationFrame(function() {
            continueEnemyMove(enemy);
        });
        return;
    }

    var dx = enemy.targetX - enemy.x;
    var dy = enemy.targetY - enemy.y;
    var distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 5) {
        setRandomTarget(enemy);
    } else {
        var moveDistance = enemy.speed * elapsed * gameSpeed;
        enemy.x += (dx / distance) * moveDistance;
        enemy.y += (dy / distance) * moveDistance;
    }

    if (!enemy.hidden) {
        updateEnemyDisplay();
    }

    requestAnimationFrame(function() {
        continueEnemyMove(enemy);
    });
}

// --- 随机目标设置 ---
function setRandomTarget(enemy) {
    var baseX = enemy.x;
    var baseY = enemy.y;

    if (enemy.type === 'enemy_uav') {
        var preferHiddenArea = Math.random() > 0.3;

        if (preferHiddenArea) {
            var nearbyCloud = findNearbyCloud(enemy.x, enemy.y);
            if (nearbyCloud) {
                enemy.targetX = nearbyCloud.x + nearbyCloud.width / 2 + (Math.random() - 0.5) * 60;
                enemy.targetY = nearbyCloud.y + nearbyCloud.height / 2 + (Math.random() - 0.5) * 40;
                enemy.targetX = Math.max(200, Math.min(550, enemy.targetX));
                enemy.targetY = Math.max(50, Math.min(250, enemy.targetY));
                return;
            }

            var nearbyHill = findNearbyHill(enemy.x, enemy.y);
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

// --- 寻找附近云层 ---
function findNearbyCloud(x, y) {
    var closestCloud = null;
    var minDistance = 150;

    for (var i = 0; i < clouds.length; i++) {
        var cloud = clouds[i];
        var centerX = cloud.x + cloud.width / 2;
        var centerY = cloud.y + cloud.height / 2;
        var dx = x - centerX;
        var dy = y - centerY;
        var distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < minDistance) {
            minDistance = distance;
            closestCloud = cloud;
        }
    }

    return closestCloud;
}

// --- 寻找附近山丘 ---
function findNearbyHill(x, y) {
    for (var i = 0; i < terrainData.hills.length; i++) {
        var hill = terrainData.hills[i];
        var centerX = hill.x + hill.width / 2;
        var centerY = hill.y + hill.height / 2;
        var dx = x - centerX;
        var dy = y - centerY;
        var distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 100) {
            return hill;
        }
    }
    return null;
}

// --- 执行敌方攻击 ---
function executeEnemyAttack(enemy, target) {
    var now = Date.now();
    if (now - enemy.lastAttack < enemy.attackCooldown) {
        return;
    }

    var targetsInRange = mockUnits.filter(function(u) {
        return u.status !== 'ready' && u.health > 0;
    });
    droneSquads.forEach(function(squad) {
        squad.drones.forEach(function(drone) {
            if (drone.health > 0) targetsInRange.push(drone);
        });
    });

    var bestTarget = findBestTarget(enemy, targetsInRange);
    if (bestTarget) {
        fireEnemyShot(enemy, bestTarget);
    }
}

// --- 择优目标选择 ---
function findBestTarget(enemy, targets) {
    var bestTarget = null;
    var highestPriority = -1;

    targets.forEach(function(target) {
        var dx = enemy.x - target.x;
        var dy = enemy.y - target.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > enemy.attackRange) return;

        var priority = 0;
        if (target.squadId && !target.name) {
            priority += 15;
        } else {
            if (target.type === 'scout') priority += 30;
            if (target.type === 'attack') priority += 18;
            if (target.type === 'strike') priority += 24;
            if (target.type === 'strike_assault') priority += 32;
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

// --- 伤害数值计算 ---
function calculateDamage(attacker, target) {
    if (attacker.type === 'enemy_uav') {
        return attacker.attackDamage || 40;
    }

    var baseDamage = attacker.type === 'aa_short' ? 25 :
        attacker.type === 'aa_long' ? 70 : 10;

    var dx = attacker.x - target.x;
    var dy = attacker.y - target.y;
    var distance = Math.sqrt(dx * dx + dy * dy);
    var effectiveRange = attacker.attackRange || 30;
    var distanceFactor = Math.max(0.3, 1 - distance / effectiveRange);
    var randomFactor = 0.8 + Math.random() * 0.4;

    if (target.type === 'mini_drone' || (target.squadId && !target.name)) {
        return Math.floor(baseDamage * distanceFactor * randomFactor * 0.5);
    }

    return Math.floor(baseDamage * distanceFactor * randomFactor);
}

// --- 敌方类型文本 ---
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

// --- 标记发现敌方 ---
function markEnemyDiscovered(enemy) {
    if (!enemy.discovered) {
        enemy.discovered = true;
        addBattleLog(enemy.name + ' 已录入战场情报');
    }
    enemy.lastSeenX = enemy.x;
    enemy.lastSeenY = enemy.y;
    enemy.lastSeenTime = gameTime;
    updateEnemyList();
}

// --- 敌方列表更新 ---
function updateEnemyList() {
    var list = document.getElementById('enemy-list');
    var countLabel = document.getElementById('enemy-count-label');
    if (!list || !countLabel) return;

    var discovered = mockEnemyUnits.filter(function(e) {
        return e.discovered;
    });

    countLabel.textContent = discovered.length + ' 单位';

    if (discovered.length === 0) {
        list.innerHTML = '<div style="padding: 20px; text-align: center; color: #555; font-size: 12px;">暂无发现敌方单位<br>派出侦察无人机探明战场</div>';
        return;
    }

    var ourBaseX = 90, ourBaseY = 390;
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

        var displayX, displayY;
        if (enemy.visible || !enemy.discovered) {
            displayX = Math.round(enemy.x);
            displayY = Math.round(enemy.y);
        } else {
            displayX = enemy.lastSeenX !== null ? Math.round(enemy.lastSeenX) : '?';
            displayY = enemy.lastSeenY !== null ? Math.round(enemy.lastSeenY) : '?';
        }

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
        } else if (enemy.resupplyState === 'returning') {
            statusText = '补给中';
            statusClass = 'scout';
        } else if (enemy.resupplyState === 'waiting') {
            statusText = '等待补给';
            statusClass = 'scout';
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
        if (typeof enemy.ammo === 'number' && typeof enemy.maxAmmo === 'number' && enemy.maxAmmo > 0) {
            attackInfo += ' | 弹药:' + enemy.ammo + '/' + enemy.maxAmmo;
        }

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
