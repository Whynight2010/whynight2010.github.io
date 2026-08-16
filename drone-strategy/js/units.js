// ============================================================
// units.js — 玩家单位管理、单位显示、单位弹窗（第3个加载）
// ============================================================

// --- 获取单位图标 ---
function getUnitIcon(type) {
    const icons = {
        'scout': '侦',
        'attack': '打',
        'strike': '击',
        'strike_assault': '强',
        'swarm': '蜂'
    };
    return icons[type] || '单';
}

// --- 获取单位简称 ---
function getUnitShortName(fullName) {
    const parts = fullName.split('-');
    if (parts.length === 2) {
        const typePart = parts[0].slice(0, 2);
        return typePart + parts[1];
    }
    return fullName.slice(0, 4);
}

// --- 获取敌方图标 ---
function getEnemyIcon(type) {
    const icons = {
        'aa_short': '近',
        'aa_long': '远',
        'radar': '雷',
        'enemy_uav': '敌',
        'command': '指'
    };
    return icons[type] || '敌';
}

// --- 更新单位显示 ---
function updateUnitDisplay(unit) {
    const el = document.querySelector(`.unit.friendly[data-id="${unit.id}"]`) ||
               document.querySelector(`.unit.friendly[style*="left: ${Math.round(unit.x)}px"]`);
    if (el) {
        el.style.left = unit.x + 'px';
        el.style.top = unit.y + 'px';
        el.className = `unit friendly ${unit.type} ${getStatusClass(unit.status)}`;
    }
    updateUnitsList();
}

// --- 生成我方单位 ---
function spawnUnits() {
    const view = document.getElementById('satellite-view');

    document.querySelectorAll('.unit.friendly').forEach(el => el.remove());

    mockUnits.forEach(unit => {
        const el = document.createElement('div');
        el.className = `unit friendly ${unit.type} ${getStatusClass(unit.status)}`;
        el.style.left = unit.x + 'px';
        el.style.top = unit.y + 'px';
        el.textContent = getUnitIcon(unit.type);
        el.title = unit.name;
        el.setAttribute('data-id', unit.id);
        el.onclick = (e) => {
            e.stopPropagation();  // 阻止事件冒泡到地图
            openUnitModal(unit);
        };

        view.appendChild(el);
    });
}

// --- 更新单位列表 ---
function updateUnitsList() {
    const list = document.getElementById('units-list');

    // 过滤掉已加入常规编组的单位（不可独立控制）
    var independentUnits = mockUnits.filter(function(unit) {
        return !isUnitInFormation(unit);
    });

    var html = independentUnits.map(function(unit) {
        return '<div class="unit-item" data-unit-id="' + unit.id + '" onclick="handleUnitClick(event, ' + unit.id + ')">' +
            '<div class="unit-header">' +
                '<span class="unit-name">' + unit.name + '</span>' +
                '<span class="unit-status ' + unit.status + '">' + getStatusText(unit.status) + '</span>' +
            '</div>' +
            '<div class="unit-stats">' +
                '<span>生命 ' + unit.health + '/' + unit.maxHealth + '</span>' +
                '<span>弹药 ' + unit.ammo + '/' + unit.maxAmmo + '</span>' +
            '</div>' +
        '</div>';
    }).join('');

    // 追加常规编组条目
    if (formations.length > 0) {
        html += '<div style="border-top: 1px solid #1e3a5f; margin: 8px 0; padding-top: 4px;"></div>';
        html += formations.map(function(fg) {
            var totalHealth = 0, maxTotalHealth = 0;
            fg.units.forEach(function(u) {
                totalHealth += u.health;
                maxTotalHealth += u.maxHealth;
            });
            var cmdText = fg.command === 'idle' ? '待命' : (fg.command === 'attack' ? '攻击中' : (fg.command === 'move' ? '转移中' : '召回中'));
            return '<div class="unit-item formation-item" data-formation-id="' + fg.id + '" onclick="openFormationModalById(\'' + fg.id + '\')">' +
                '<div class="unit-header">' +
                    '<span class="unit-name">编组 ' + fg.name + '</span>' +
                    '<span class="unit-status deployed">' + cmdText + '</span>' +
                '</div>' +
                '<div class="unit-stats">' +
                    '<span>生命 ' + totalHealth + '/' + maxTotalHealth + '</span>' +
                    '<span>单位 ' + fg.units.length + '架 | 长机:' + getUnitShortName(fg.leadUnit.name) + '</span>' +
                '</div>' +
            '</div>';
        }).join('');
    }

    list.innerHTML = html;
}

// --- 单位点击处理 ---
function handleUnitClick(e, unitId) {
    // 强制阻止事件冒泡和默认行为
    if (e) {
        e.stopPropagation();
        e.preventDefault();
        e.cancelBubble = true;
        e.returnValue = false;
    }

    console.log('handleUnitClick called for unit:', unitId);

    const unit = mockUnits.find(u => u.id === unitId);
    if (unit) {
        console.log('Opening modal for unit:', unit.name);
        openUnitModal(unit);
    } else {
        console.log('Unit not found:', unitId);
    }
}

// --- 获取可用指令 ---
function getAvailableActions(unit) {
    // 已在编组中的单位不可独立操作
    if (isUnitInFormation(unit)) {
        return [];  // 编组内单位仅通过编组指令控制
    }

    // 所有单位都可以执行的基础指令
    const actions = ['deploy', 'group', 'recall'];

    if (unit.type === 'scout') {
        // 侦察机：部署、侦察、转移、编组、召回
        actions.push('scout', 'move');
    } else if (unit.type === 'attack') {
        // 察打一体：部署、侦察、攻击、防守、转移、编组、召回
        actions.push('scout', 'attack', 'defend', 'move');
    } else if (unit.type === 'strike' || unit.type === 'strike_assault') {
        // 攻击/强击无人机：部署、攻击、转移、编组、召回
        actions.push('attack', 'move');
    } else if (unit.type === 'swarm') {
        // 蜂巢发射车（可移动地面单位）：部署、发射蜂群、转移、编组、召回
        // 本身无攻击能力，通过发射小型无人机作战
        if (unit.status !== 'ready') {
            actions.push('move');
        }
        if (unit.ammo > 0) {
            actions.push('launch');
        }
    }

    return actions;
}

// --- 打开单位弹窗 ---
function openUnitModal(unit) {
    selectedUnit = unit;
    selectedSquad = null;
    document.getElementById('modal-unit-name').textContent = unit.name;
    document.getElementById('modal-health').textContent = unit.health + '/' + unit.maxHealth;
    // 蜂巢发射车显示剩余无人机数量，其他单位显示弹药
    if (unit.type === 'swarm') {
        document.getElementById('modal-ammo').textContent = '蜂群: ' + unit.ammo + '/' + unit.maxAmmo + ' 架';
    } else {
        document.getElementById('modal-ammo').textContent = unit.ammo + '/' + unit.maxAmmo;
    }
    document.getElementById('modal-position').textContent = '(' + Math.round(unit.x) + ', ' + Math.round(unit.y) + ')';
    document.getElementById('modal-status').textContent = getStatusText(unit.status);

    // 根据单位类型动态生成可用指令按钮
    const actionsContainer = document.getElementById('modal-actions');
    actionsContainer.innerHTML = '';

    const availableActions = getAvailableActions(unit);

    const actionDefs = [
        { action: 'deploy', text: '部署/出动', cls: 'primary' },
        { action: 'scout', text: '侦察任务', cls: 'secondary' },
        { action: 'attack', text: '攻击任务', cls: 'secondary' },
        { action: 'escort', text: '陪护护航', cls: 'secondary' },
        { action: 'defend', text: '防守部署', cls: 'secondary' },
        { action: 'move', text: '转移机动', cls: 'secondary' },
        { action: 'launch', text: '发射蜂群', cls: 'primary' },
        { action: 'group', text: '编组管理', cls: 'secondary' },
        { action: 'recall', text: '召回待命', cls: 'secondary' }
    ];

    actionDefs.forEach(function(def) {
        if (availableActions.indexOf(def.action) !== -1) {
            var btn = document.createElement('button');
            btn.className = 'action-btn ' + def.cls;
            btn.textContent = def.text;
            btn.onclick = function() { executeUnitAction(def.action); };
            actionsContainer.appendChild(btn);
        }
    });

    document.getElementById('unit-modal').classList.add('active');
}

// --- 关闭单位弹窗 ---
function closeUnitModal() {
    document.getElementById('unit-modal').classList.remove('active');
    selectedUnit = null;
    selectedSquad = null;
    selectedFormation = null;
}

// --- 蜂巢发射车：发射数量选择 ---
function showLaunchCountSelector(unit) {
    const actionsContainer = document.getElementById('modal-actions');
    actionsContainer.innerHTML = '';

    const maxLaunch = Math.min(6, unit.ammo);

    var title = document.createElement('div');
    title.style.cssText = 'grid-column: 1 / -1; color: #64ffda; text-align: center; margin-bottom: 5px; font-size: 13px;';
    title.textContent = '选择发射数量（剩余 ' + unit.ammo + ' 架）：';
    actionsContainer.appendChild(title);

    for (var i = 1; i <= maxLaunch; i++) {
        var btn = document.createElement('button');
        btn.className = 'action-btn primary';
        btn.textContent = i + ' 架';
        (function(count) {
            btn.onclick = function() {
                closeUnitModal();
                launchDroneCount = count;
                launchTargetUnit = unit;
                addBattleLog(unit.name + ' 准备发射 ' + count + ' 架无人机，请点击地图选择发射方向...');
                var satelliteView = document.getElementById('satellite-view');
                satelliteView.style.cursor = 'crosshair';
            };
        })(i);
        actionsContainer.appendChild(btn);
    }

    // 取消按钮
    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'action-btn secondary';
    cancelBtn.textContent = '取消';
    cancelBtn.style.gridColumn = '1 / -1';
    cancelBtn.onclick = function() {
        openUnitModal(unit); // 重新打开原弹窗
    };
    actionsContainer.appendChild(cancelBtn);
}

// --- 蜂巢发射车：地图点击选择移动位置 ---
function enterSwarmMoveSelection(unit) {
    launchTargetUnit = unit;  // 复用 launchTargetUnit 标记移动选择
    launchDroneCount = -1;    // -1 表示移动模式
    var satelliteView = document.getElementById('satellite-view');
    satelliteView.style.cursor = 'crosshair';
}

// --- 蜂巢无人机编组：生成 ---
function spawnDroneSquad(launcher, count, targetX, targetY) {
    droneSquadIdCounter++;
    var squadId = 'squad_' + droneSquadIdCounter;
    var drones = [];

    var baseAngle = Math.atan2(targetY - launcher.y, targetX - launcher.x);
    var spawnDist = 15;

    for (var i = 0; i < count; i++) {
        var angleOffset = (i - (count - 1) / 2) * (Math.PI / 14);
        var angle = baseAngle + angleOffset;
        var drone = {
            id: 'drone_' + droneSquadIdCounter + '_' + (i + 1),
            squadId: squadId,
            x: launcher.x + Math.cos(angle) * spawnDist,
            y: launcher.y + Math.sin(angle) * spawnDist,
            health: 15,
            maxHealth: 15,
            attackPower: 30,
            attackRange: 25,
            speed: 5,
            targetX: null,
            targetY: null,
            status: 'idle',
            lastAttack: 0,
            attackCooldown: 2000
        };
        drones.push(drone);
    }

    var squad = {
        id: squadId,
        launcherId: launcher.id,
        drones: drones,
        command: 'move',
        targetX: targetX,
        targetY: targetY,
        maxRange: 300,
        originX: launcher.x,
        originY: launcher.y,
        isRecalling: false
    };

    droneSquads.push(squad);
    launcher.ammo -= count;
    if (!launcher.launchedSquads) launcher.launchedSquads = [];
    launcher.launchedSquads.push(squadId);

    // 生成DOM元素
    spawnDroneElements(squad);

    addBattleLog(launcher.name + ' 发射 ' + count + ' 架无人机（编组 ' + squadId + '），航向：(' + Math.round(targetX) + ', ' + Math.round(targetY) + ')');
    addBattleLog('编组 ' + squadId + ' 作战半径300单位，将自动搜索并攻击范围内敌方目标');

    // 下一帧再启动机动，避免发射瞬间的 DOM / 布局峰值叠加
    requestAnimationFrame(function() {
        setSquadMoveCommand(squad, targetX, targetY);
    });
}

// --- 蜂巢无人机编组：DOM元素生成 ---
function spawnDroneElements(squad) {
    var view = document.getElementById('satellite-view');
    var fragment = document.createDocumentFragment();

    squad.drones.forEach(function(drone) {
        var el = document.createElement('div');
        el.className = 'unit mini-drone';
        el.style.left = drone.x + 'px';
        el.style.top = drone.y + 'px';
        el.innerHTML = '<span class="mini-drone-icon">◉</span>';
        el.title = '蜂群无人机 ' + drone.id + '（' + squad.id + '）';
        el.setAttribute('data-drone-id', drone.id);
        el.setAttribute('data-squad-id', squad.id);
        el.onclick = function(e) {
            e.stopPropagation();
            openSquadModal(squad);
        };

        fragment.appendChild(el);
    });

    view.appendChild(fragment);
}

// --- 蜂巢无人机编组：DOM位置更新 ---
function updateDroneDisplay(drone) {
    var el = document.querySelector('.unit.mini-drone[data-drone-id="' + drone.id + '"]');
    if (el) {
        el.style.left = drone.x + 'px';
        el.style.top = drone.y + 'px';
        if (drone.health <= 0) {
            el.style.opacity = '0.3';
            el.style.pointerEvents = 'none';
        } else {
            el.style.opacity = '1';
            el.style.pointerEvents = 'auto';
        }
    }
}

// --- 蜂巢无人机编组：清除DOM ---
function removeSquadElements(squad) {
    squad.drones.forEach(function(drone) {
        var el = document.querySelector('.unit.mini-drone[data-drone-id="' + drone.id + '"]');
        if (el) el.remove();
    });
}

// --- 蜂巢无人机编组：操作弹窗 ---
function openSquadModal(squad) {
    selectedSquad = squad;
    selectedUnit = null;
    document.getElementById('modal-unit-name').textContent = '蜂群编组 ' + squad.id;
    var aliveDrones = squad.drones.filter(function(d) { return d.health > 0; });
    document.getElementById('modal-health').textContent = aliveDrones.length + '/' + squad.drones.length + ' 架存活';

    var totalPower = aliveDrones.reduce(function(s, d) { return s + d.attackPower; }, 0);
    document.getElementById('modal-ammo').textContent = '总攻击力: ' + totalPower + '（每架30）';

    var cx = 0, cy = 0;
    if (aliveDrones.length > 0) {
        cx = aliveDrones.reduce(function(s, d) { return s + d.x; }, 0) / aliveDrones.length;
        cy = aliveDrones.reduce(function(s, d) { return s + d.y; }, 0) / aliveDrones.length;
    }
    document.getElementById('modal-position').textContent = '(' + Math.round(cx) + ', ' + Math.round(cy) + ')';

    var statusText = squad.command === 'idle' ? '待命' : (squad.command === 'attack' ? '攻击中' : (squad.command === 'move' ? '转移中' : '召回中'));
    var launcher = mockUnits.find(function(u) { return u.id === squad.launcherId; });
    if (launcher) {
        var distToLauncher = Math.sqrt(Math.pow(cx - launcher.x, 2) + Math.pow(cy - launcher.y, 2));
        statusText += ' | 距发射车: ' + Math.round(distToLauncher) + '/' + squad.maxRange;
    }
    document.getElementById('modal-status').textContent = statusText;

    // 生成编组指令按钮
    var actionsContainer = document.getElementById('modal-actions');
    actionsContainer.innerHTML = '';

    // 攻击指令
    var attackBtn = document.createElement('button');
    attackBtn.className = 'action-btn secondary';
    attackBtn.textContent = '攻击任务';
    attackBtn.onclick = function() {
        closeUnitModal();
        addBattleLog('蜂群编组 ' + squad.id + ' 进入目标选择模式，请点击地图选择攻击目标...');
        enterSquadAttackSelection(squad);
    };
    actionsContainer.appendChild(attackBtn);

    // 转移指令
    var moveBtn = document.createElement('button');
    moveBtn.className = 'action-btn secondary';
    moveBtn.textContent = '转移机动';
    moveBtn.onclick = function() {
        closeUnitModal();
        addBattleLog('蜂群编组 ' + squad.id + ' 进入目标选择模式，请点击地图选择转移目标...');
        enterSquadMoveSelection(squad);
    };
    actionsContainer.appendChild(moveBtn);

    // 召回指令
    var recallBtn = document.createElement('button');
    recallBtn.className = 'action-btn secondary';
    recallBtn.textContent = '召回发射车';
    recallBtn.onclick = function() {
        closeUnitModal();
        addBattleLog('蜂群编组 ' + squad.id + ' 收到召回指令，正在返回发射车...');
        setSquadRecallCommand(squad);
    };
    actionsContainer.appendChild(recallBtn);

    document.getElementById('unit-modal').classList.add('active');
}

// --- 蜂巢无人机编组：攻击目标选择 ---
function enterSquadAttackSelection(squad) {
    selectedSquad = squad;
    launchTargetUnit = null;
    launchDroneCount = 0;
    squad._pendingCommand = 'attack';
    var satelliteView = document.getElementById('satellite-view');
    satelliteView.style.cursor = 'crosshair';
}

// --- 蜂巢无人机编组：转移目标选择 ---
function enterSquadMoveSelection(squad) {
    selectedSquad = squad;
    launchTargetUnit = null;
    launchDroneCount = 0;
    squad._pendingCommand = 'move';
    var satelliteView = document.getElementById('satellite-view');
    satelliteView.style.cursor = 'crosshair';
}

// ============================================================
// 常规无人机编组：创建、解散、操作
// ============================================================

// 统一的编组管理页面（常规编组 + 蜂巢编组）
function showFormationManager() {
    var modal = document.getElementById('unit-modal');
    document.getElementById('modal-unit-name').textContent = '编组管理';
    document.getElementById('modal-health').textContent = '';
    document.getElementById('modal-ammo').textContent = '';
    document.getElementById('modal-position').textContent = '';
    document.getElementById('modal-status').textContent = '管理常规编组与蜂巢编组';

    var actionsContainer = document.getElementById('modal-actions');
    actionsContainer.innerHTML = '';

    // ========== 区域一：常规无人机编组 ==========
    var section1 = document.createElement('div');
    section1.style.cssText = 'grid-column: 1 / -1; border-bottom: 1px solid #1e3a5f; padding-bottom: 10px; margin-bottom: 8px;';
    section1.innerHTML = '<div style="color: #ffd93d; font-weight: bold; margin-bottom: 8px;">常规无人机编组</div>';

    // 可用单位选择区域
    var availableUnits = mockUnits.filter(function(u) {
        return u.status !== 'ready' && u.health > 0 && u.type !== 'swarm' && !isUnitInFormation(u);
    });

    if (availableUnits.length === 0) {
        section1.innerHTML += '<div style="color: #8892b0; font-size: 11px; margin-bottom: 8px;">暂无可编组的单位（需先部署且未加入其他编组）</div>';
    } else {
        section1.innerHTML += '<div style="color: #ccd6f6; font-size: 11px; margin-bottom: 6px;">可选单位（勾选1-3架创建编组）：</div>';

        // 创建复选框容器
        var checkContainer = document.createElement('div');
        checkContainer.id = 'formation-check-container';
        checkContainer.style.cssText = 'max-height: 120px; overflow-y: auto; margin-bottom: 8px;';

        availableUnits.forEach(function(u) {
            var label = document.createElement('label');
            label.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 4px 0; cursor: pointer; color: #ccd6f6; font-size: 12px;';
            label.innerHTML = '<input type="checkbox" class="formation-check" value="' + u.id +
                '" style="accent-color: #ffd93d;" onchange="limitFormationChecks()"> ' +
                getUnitIcon(u.type) + ' ' + u.name +
                ' <span style="color: #8892b0; font-size: 10px;">(' + getStatusText(u.status) + ')</span>';
            checkContainer.appendChild(label);
        });
        section1.appendChild(checkContainer);

        // 创建编组按钮
        var createBtn = document.createElement('button');
        createBtn.className = 'action-btn primary';
        createBtn.textContent = '创建编组';
        createBtn.style.gridColumn = '1 / -1';
        createBtn.onclick = function() {
            var checks = document.querySelectorAll('.formation-check:checked');
            var unitIds = [];
            checks.forEach(function(cb) { unitIds.push(parseInt(cb.value)); });
            if (unitIds.length < 1 || unitIds.length > 3) {
                addBattleLog('请选择1-3架单位创建编组');
                return;
            }
            createFormation(unitIds);
            showFormationManager(); // 刷新页面
        };
        section1.appendChild(createBtn);
    }

    // 已有常规编组列表
    if (formations.length > 0) {
        section1.innerHTML += '<div style="color: #ccd6f6; font-size: 11px; margin: 10px 0 6px;">已有常规编组：</div>';
        formations.forEach(function(fg) {
            var fgDiv = document.createElement('div');
            fgDiv.style.cssText = 'background: rgba(255, 217, 61, 0.08); border: 1px solid rgba(255, 217, 61, 0.2); border-radius: 6px; padding: 8px; margin-bottom: 6px;';
            var alive = fg.units.filter(function(u) { return u.health > 0; }).length;
            var totalHp = fg.units.reduce(function(s, u) { return s + u.health; }, 0);
            var maxHp = fg.units.reduce(function(s, u) { return s + u.maxHealth; }, 0);
            fgDiv.innerHTML = '<div style="display: flex; justify-content: space-between; align-items: center;">' +
                '<span style="color: #ffd93d; font-weight: bold; font-size: 12px;">' + fg.name + '</span>' +
                '<span style="color: #8892b0; font-size: 10px;">' + alive + '/' + fg.units.length + '架 | 生命 ' + totalHp + '/' + maxHp + '</span>' +
                '</div>' +
                '<div style="color: #8892b0; font-size: 10px; margin-top: 2px;">长机: ' + fg.leadUnit.name + ' | 僚机: ' + fg.wingmen.map(function(w) { return getUnitShortName(w.name); }).join(', ') + '</div>' +
                '<div style="margin-top: 6px; display: flex; gap: 6px;">' +
                    '<button class="action-btn secondary" style="font-size: 11px; padding: 4px 10px;" onclick="event.stopPropagation(); openFormationModalById(\'' + fg.id + '\')">操作</button>' +
                    '<button class="action-btn secondary" style="font-size: 11px; padding: 4px 10px; color: #ff6b6b; border-color: #ff6b6b;" onclick="event.stopPropagation(); disbandFormation(\'' + fg.id + '\'); showFormationManager();">× 解散</button>' +
                '</div>';
            section1.appendChild(fgDiv);
        });
    }

    actionsContainer.appendChild(section1);

    // ========== 区域二：蜂巢无人机编组 ==========
    var section2 = document.createElement('div');
    section2.style.cssText = 'grid-column: 1 / -1; padding-top: 4px;';
    section2.innerHTML = '<div style="color: #ff8c00; font-weight: bold; margin-bottom: 8px;">蜂巢无人机编组</div>';

    if (droneSquads.length === 0) {
        section2.innerHTML += '<div style="color: #8892b0; font-size: 11px; text-align: center; padding: 12px;">暂无蜂巢编组<br>使用蜂巢发射车发射无人机</div>';
    } else {
        droneSquads.forEach(function(squad) {
            var aliveDrones = squad.drones.filter(function(d) { return d.health > 0; });
            var launcher = mockUnits.find(function(u) { return u.id === squad.launcherId; });
            var cmdText = squad.command === 'idle' ? '待命' : (squad.command === 'attack' ? '攻击中' : (squad.command === 'move' ? '转移中' : '召回中'));

            var sqDiv = document.createElement('div');
            sqDiv.style.cssText = 'background: rgba(255, 140, 0, 0.08); border: 1px solid rgba(255, 140, 0, 0.2); border-radius: 6px; padding: 8px; margin-bottom: 6px;';
            sqDiv.innerHTML = '<div style="display: flex; justify-content: space-between; align-items: center;">' +
                '<span style="color: #ffa500; font-weight: bold; font-size: 12px;">蜂群 ' + squad.id + '</span>' +
                '<span style="color: #8892b0; font-size: 10px;">' + aliveDrones.length + '/' + squad.drones.length + '架 | ' + cmdText + '</span>' +
                '</div>' +
                '<div style="color: #8892b0; font-size: 10px; margin-top: 2px;">发射车: ' + (launcher ? launcher.name : '已损毁') +
                ' | 总攻击力: ' + (aliveDrones.length * 30) + '</div>' +
                '<div style="margin-top: 6px;">' +
                    '<button class="action-btn secondary" style="font-size: 11px; padding: 4px 10px;" onclick="event.stopPropagation(); openSquadModalById(\'' + squad.id + '\')">操作</button>' +
                '</div>';
            section2.appendChild(sqDiv);
        });
    }

    actionsContainer.appendChild(section2);

    // 关闭按钮
    var closeBtn = document.createElement('button');
    closeBtn.className = 'action-btn secondary';
    closeBtn.textContent = '关闭';
    closeBtn.style.gridColumn = '1 / -1';
    closeBtn.style.marginTop = '8px';
    closeBtn.onclick = function() { closeUnitModal(); };
    actionsContainer.appendChild(closeBtn);

    modal.classList.add('active');
}

// 限制复选框最多选3个
function limitFormationChecks() {
    var checks = document.querySelectorAll('.formation-check:checked');
    if (checks.length > 3) {
        checks[checks.length - 1].checked = false;
        addBattleLog('单次最多选择3架单位创建编组');
    }
}

// 创建常规编组
function createFormation(unitIds) {
    if (unitIds.length < 1 || unitIds.length > 3) {
        addBattleLog('编组需包含1-3架单位');
        return;
    }

    var selectedUnits = [];
    for (var i = 0; i < unitIds.length; i++) {
        var unit = mockUnits.find(function(u) { return u.id === unitIds[i]; });
        if (!unit) {
            addBattleLog('未找到单位 ID=' + unitIds[i]);
            return;
        }
        if (unit.status === 'ready') {
            addBattleLog(unit.name + ' 尚未部署，无法编组');
            return;
        }
        if (unit.type === 'swarm') {
            addBattleLog('蜂巢发射车不能加入常规编组');
            return;
        }
        if (isUnitInFormation(unit)) {
            addBattleLog(unit.name + ' 已在其他编组中');
            return;
        }
        selectedUnits.push(unit);
    }

    // 按等级排序，最高等级为长机
    selectedUnits.sort(function(a, b) { return getUnitTier(a) - getUnitTier(b); });

    formationIdCounter++;
    var fg = {
        id: 'fg_' + formationIdCounter,
        name: '编组-' + formationIdCounter,
        units: selectedUnits,
        leadUnit: selectedUnits[0],           // 等级最高
        wingmen: selectedUnits.slice(1),       // 其余为僚机
        command: 'idle',
        targetX: null,
        targetY: null,
        isRecalling: false,
        formationSpacing: 25
    };

    formations.push(fg);
    updateUnitsList();
    addBattleLog(fg.name + ' 创建成功，长机: ' + fg.leadUnit.name + '，僚机: ' + (fg.wingmen.length > 0 ? fg.wingmen.map(function(w) { return w.name; }).join('、') : '无') + '（共' + fg.units.length + '架）');
}

// 解散常规编组
function disbandFormation(formationId) {
    var idx = -1;
    for (var i = 0; i < formations.length; i++) {
        if (formations[i].id === formationId) { idx = i; break; }
    }
    if (idx < 0) {
        addBattleLog('未找到该编组');
        return;
    }

    var fg = formations[idx];
    formations.splice(idx, 1);

    // 清除编组对各单位的移动/攻击状态
    fg.units.forEach(function(u) {
        u.isRecalling = false;
        u.isMovingToAttack = false;
        if (u.status === 'move' || u.status === 'attack' || u.status === 'recall') {
            u.status = 'deployed';
        }
    });

    addBattleLog(fg.name + ' 已解散，' + fg.units.length + ' 架单位恢复独立操作');
    if (selectedFormation && selectedFormation.id === formationId) {
        selectedFormation = null;
        formationCmdPending = null;
    }
    updateUnitsList();
}

// 通过ID打开常规编组操作弹窗
function openFormationModalById(formationId) {
    var fg = null;
    for (var i = 0; i < formations.length; i++) {
        if (formations[i].id === formationId) { fg = formations[i]; break; }
    }
    if (fg) {
        openFormationModal(fg);
    }
}

// 通过ID打开蜂巢编组操作弹窗
function openSquadModalById(squadId) {
    var squad = null;
    for (var i = 0; i < droneSquads.length; i++) {
        if (droneSquads[i].id === squadId) { squad = droneSquads[i]; break; }
    }
    if (squad) {
        closeUnitModal();
        openSquadModal(squad);
    }
}

// 常规编组操作弹窗
function openFormationModal(formation) {
    selectedFormation = formation;
    selectedUnit = null;
    selectedSquad = null;

    document.getElementById('modal-unit-name').textContent = formation.name;
    var totalHp = formation.units.reduce(function(s, u) { return s + u.health; }, 0);
    var maxHp = formation.units.reduce(function(s, u) { return s + u.maxHealth; }, 0);
    var totalAmmo = formation.units.reduce(function(s, u) { return s + u.ammo; }, 0);
    var maxAmmo = formation.units.reduce(function(s, u) { return s + u.maxAmmo; }, 0);
    document.getElementById('modal-health').textContent = totalHp + '/' + maxHp + '（' + formation.units.length + '架）';
    document.getElementById('modal-ammo').textContent = totalAmmo + '/' + maxAmmo + ' 发';

    var cx = 0, cy = 0;
    formation.units.forEach(function(u) { cx += u.x; cy += u.y; });
    cx = Math.round(cx / formation.units.length);
    cy = Math.round(cy / formation.units.length);
    document.getElementById('modal-position').textContent = '(' + cx + ', ' + cy + ')';

    var cmdText = formation.command === 'idle' ? '待命' : (formation.command === 'attack' ? '攻击中' : (formation.command === 'move' ? '转移中' : '召回中'));
    document.getElementById('modal-status').textContent = '长机: ' + formation.leadUnit.name + ' | 僚机: ' + (formation.wingmen.length > 0 ? formation.wingmen.map(function(w) { return getUnitShortName(w.name); }).join(', ') : '无') + ' | ' + cmdText;

    var actionsContainer = document.getElementById('modal-actions');
    actionsContainer.innerHTML = '';

    // 攻击指令
    var attackBtn = document.createElement('button');
    attackBtn.className = 'action-btn secondary';
    attackBtn.textContent = '攻击任务';
    attackBtn.onclick = function() { executeFormationAction('attack'); };
    actionsContainer.appendChild(attackBtn);

    // 机动指令
    var moveBtn = document.createElement('button');
    moveBtn.className = 'action-btn secondary';
    moveBtn.textContent = '转移机动';
    moveBtn.onclick = function() { executeFormationAction('move'); };
    actionsContainer.appendChild(moveBtn);

    // 召回指令
    var recallBtn = document.createElement('button');
    recallBtn.className = 'action-btn secondary';
    recallBtn.textContent = '召回待命';
    recallBtn.onclick = function() { executeFormationAction('recall'); };
    actionsContainer.appendChild(recallBtn);

    // 解散指令
    var disbandBtn = document.createElement('button');
    disbandBtn.className = 'action-btn secondary';
    disbandBtn.textContent = '× 解散编组';
    disbandBtn.style.color = '#ff6b6b';
    disbandBtn.style.borderColor = '#ff6b6b';
    disbandBtn.onclick = function() {
        closeUnitModal();
        disbandFormation(formation.id);
    };
    actionsContainer.appendChild(disbandBtn);

    document.getElementById('unit-modal').classList.add('active');
}

// 执行常规编组指令
function executeFormationAction(action) {
    if (!selectedFormation) return;

    // 先保存引用——closeUnitModal()会置null
    var fg = selectedFormation;

    switch(action) {
        case 'attack':
            // 仿照单个单位攻击的校验逻辑
            if (fg.units.every(function(u) { return u.health <= 0; })) {
                addBattleLog(fg.name + ' 所有单位已损毁，无法执行攻击任务');
                return;
            }
            // 检查是否有单位已部署（非ready状态）
            var allReady = fg.units.filter(function(u) { return u.health > 0; }).every(function(u) {
                return u.status === 'ready';
            });
            if (allReady) {
                addBattleLog(fg.name + ' 所有单位均在基地待命，请先部署');
                return;
            }
            // 检查是否所有可攻击单位都没有弹药
            var attackers = fg.units.filter(function(u) {
                return u.health > 0 && u.status !== 'ready' && u.type !== 'scout';
            });
            if (attackers.length > 0 && attackers.every(function(u) { return u.ammo <= 0; })) {
                addBattleLog(fg.name + ' 所有攻击单位弹药均已耗尽');
                return;
            }
            // 检查是否只有侦察机
            var nonScouts = fg.units.filter(function(u) {
                return u.health > 0 && u.status !== 'ready' && u.type !== 'scout';
            });
            if (nonScouts.length === 0) {
                addBattleLog(fg.name + ' 侦察机无法执行攻击任务');
                return;
            }
            closeUnitModal();
            formationCmdPending = { formation: fg, command: 'attack' };
            addBattleLog(fg.name + ' 进入目标选择模式，请点击地图选择攻击目标...');
            document.getElementById('satellite-view').style.cursor = 'crosshair';
            break;

        case 'move':
            if (fg.units.every(function(u) { return u.health <= 0; })) {
                addBattleLog(fg.name + ' 所有单位已损毁，无法执行转移');
                return;
            }
            var allAtBase = fg.units.filter(function(u) { return u.health > 0; }).every(function(u) {
                return u.status === 'ready';
            });
            if (allAtBase) {
                addBattleLog(fg.name + ' 所有单位均在基地待命，请先部署');
                return;
            }
            closeUnitModal();
            formationCmdPending = { formation: fg, command: 'move' };
            addBattleLog(fg.name + ' 进入目标选择模式，请点击地图选择转移目标...');
            document.getElementById('satellite-view').style.cursor = 'crosshair';
            break;

        case 'recall':
            closeUnitModal();
            setFormationRecallCommand(fg);
            break;

        default:
            addBattleLog('未知编组指令: ' + action);
    }
}

// --- 执行单位指令 ---
function executeUnitAction(action) {
    if (!selectedUnit) return;

    switch(action) {
        case 'deploy':
            if (selectedUnit.status === 'ready') {
                selectedUnit.status = 'deployed';
                // 部署至基地前端位置（朝向战场方向，而非基地方位内）
                const baseX = 90;
                const baseY = 390;
                selectedUnit.x = baseX + 40 + Math.random() * 40;
                selectedUnit.y = baseY - 30 - Math.random() * 30;
                selectedUnit.patrolTargetX = selectedUnit.x;
                selectedUnit.patrolTargetY = selectedUnit.y;
                selectedUnit.lastPatrolMove = Date.now();
                addBattleLog(selectedUnit.name + ' 已部署至基地前端！');
                updateUnitDisplay(selectedUnit);
            } else {
                addBattleLog(selectedUnit.name + ' 已经部署！');
            }
            break;

        case 'scout':
            if (selectedUnit.status === 'ready') {
                addBattleLog(selectedUnit.name + ' 请先部署！');
            } else {
                addBattleLog(selectedUnit.name + ' 进入目标选择模式，请点击地图选择侦察目标...');
                enterScoutTargetSelection(selectedUnit);
            }
            break;

        case 'attack':
            if (selectedUnit.status === 'ready') {
                addBattleLog(selectedUnit.name + ' 请先部署！');
            } else if (selectedUnit.ammo <= 0) {
                addBattleLog(selectedUnit.name + ' 弹药不足！');
            } else if (selectedUnit.type === 'scout') {
                addBattleLog(selectedUnit.name + ' 侦察机无法执行攻击任务！');
            } else {
                showAttackTargetModeSelector(selectedUnit);
            }
            break;

        case 'move':
            if (selectedUnit.status === 'ready') {
                addBattleLog(selectedUnit.name + ' 请先部署！');
            } else if (selectedUnit.type === 'swarm') {
                // 蜂巢发射车：通过地图点击选择移动目标（限制在基地150范围内）
                addBattleLog(selectedUnit.name + ' 进入目标选择模式，请点击地图选择转移目标（限基地150范围）...');
                enterSwarmMoveSelection(selectedUnit);
            } else {
                selectedUnit.status = 'move';
                addBattleLog(selectedUnit.name + ' 执行转移机动！');
                const moveTarget = getRandomMovePosition(selectedUnit);
                moveToTarget(selectedUnit, moveTarget.x, moveTarget.y, 'move');
            }
            break;

        case 'launch':
            if (selectedUnit.ammo <= 0) {
                addBattleLog(selectedUnit.name + ' 蜂群无人机已耗尽！');
            } else if (selectedUnit.status === 'ready') {
                addBattleLog(selectedUnit.name + ' 请先部署！');
            } else {
                showLaunchCountSelector(selectedUnit);
                return; // 不关闭弹窗，先选择数量
            }
            break;

        case 'recall':
            if (selectedUnit.status === 'ready') {
                addBattleLog(selectedUnit.name + ' 已在基地待命！');
            } else if (selectedUnit.isRecalling) {
                addBattleLog(selectedUnit.name + ' 正在返回基地途中...');
            } else {
                // 使用最优路径机制直线返回基地，不再瞬移
                const baseReturnX = 70 + selectedUnit.id * 6;
                const baseReturnY = 370;
                selectedUnit.status = 'recall';
                selectedUnit.isRecalling = true;
                addBattleLog(selectedUnit.name + ' 收到召回指令，按最优路径返回基地...');
                moveToBase(selectedUnit, baseReturnX, baseReturnY);
            }
            break;

        case 'group':
            showFormationManager();
            return; // 不关闭弹窗，进入编组管理页面

        default:
            addBattleLog(selectedUnit.name + ' 执行: ' + getActionText(action));
            break;
    }

    closeUnitModal();
}

// --- 更新敌方显示 ---
function updateEnemyDisplay() {
    const view = document.getElementById('satellite-view');

    mockEnemyUnits.forEach(unit => {
        if (unit.visible && unit.health > 0) {
            let el = document.querySelector(`.unit.enemy[data-id="${unit.id}"]`);
            if (!el) {
                el = document.createElement('div');
                el.className = 'unit enemy';
                el.dataset.id = unit.id;
                el.textContent = getEnemyIcon(unit.type);
                el.title = unit.name;
                el.addEventListener('mouseenter', function(e) {
                    showEnemyTargetTooltip(unit, e);
                });
                el.addEventListener('mousemove', function(e) {
                    showEnemyTargetTooltip(unit, e);
                });
                el.addEventListener('mouseleave', hideEnemyTargetTooltip);
                el.addEventListener('click', function(e) {
                    handleEnemyTargetClick(unit, e);
                });
                view.appendChild(el);
            }
            el.style.left = unit.x + 'px';
            el.style.top = unit.y + 'px';
            el.classList.toggle('attack-selectable', attackSelectionMode === 'enemy' && attackTargetUnits.length > 0);
            el.classList.toggle('attack-targeted', enemyTargetTooltipUnit && enemyTargetTooltipUnit.id === unit.id);
        } else {
            const el = document.querySelector(`.unit.enemy[data-id="${unit.id}"]`);
            if (el) {
                el.remove();
            }
        }
    });
}

// --- 攻击方式选择 ---
function showAttackTargetModeSelector(unit) {
    closeUnitModal();
    attackTargetUnits = [unit];
    attackSelectionMode = null;

    var panel = document.getElementById('attack-target-mode');
    if (!panel) return;

    panel.innerHTML = [
        '<div class="attack-target-mode-card">',
        '  <div class="attack-target-mode-title">选择攻击方式</div>',
        '  <div class="attack-target-mode-subtitle">' + unit.name + '</div>',
        '  <div class="attack-target-mode-buttons">',
        '    <button class="action-btn primary" onclick="setAttackSelectionMode(\'point\')">目标点位</button>',
        '    <button class="action-btn secondary" onclick="setAttackSelectionMode(\'enemy\')">敌方单位</button>',
        '    <button class="action-btn secondary" onclick="cancelAttackTargetSelection()">取消</button>',
        '  </div>',
        '</div>'
    ].join('');
    panel.classList.add('active');
    panel.hidden = false;
    document.getElementById('satellite-view').style.cursor = 'default';
}

// --- 设置攻击模式 ---
function setAttackSelectionMode(mode) {
    attackSelectionMode = mode;
    hideAttackTargetModePanel();

    var unit = attackTargetUnits[0];
    if (!unit) return;

    document.getElementById('satellite-view').style.cursor = 'crosshair';
    if (mode === 'enemy') {
        addBattleLog(unit.name + ' 已切换为敌方单位攻击模式，请点击敌方单位图标锁定目标');
    } else {
        addBattleLog(unit.name + ' 已切换为目标点位攻击模式，请点击地图指定坐标');
    }
}

// --- 取消攻击选择 ---
function cancelAttackTargetSelection() {
    attackTargetUnits = [];
    attackSelectionMode = 'point';
    hideAttackTargetModePanel();
    document.getElementById('satellite-view').style.cursor = 'default';
    hideEnemyTargetTooltip();
}

// --- 隐藏模式面板 ---
function hideAttackTargetModePanel() {
    var panel = document.getElementById('attack-target-mode');
    if (!panel) return;
    panel.classList.remove('active');
    panel.hidden = true;
    panel.innerHTML = '';
}

// --- 敌方点击处理 ---
function handleEnemyTargetClick(unit, e) {
    if (attackSelectionMode !== 'enemy' || attackTargetUnits.length === 0) return;
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    confirmEnemyAttackTarget(unit);
}

// --- 确认攻击目标 ---
function confirmEnemyAttackTarget(enemy) {
    var selectedUnits = attackTargetUnits.slice();
    if (selectedUnits.length === 0) return;

    hideAttackTargetModePanel();
    document.getElementById('satellite-view').style.cursor = 'default';

    selectedUnits.forEach(function(unit) {
        unit.attackTargetX = enemy.x;
        unit.attackTargetY = enemy.y;
        unit.attackTargetUnitId = enemy.id;
        unit.attackTargetMode = 'enemy';
        addBattleLog(unit.name + ' 锁定敌方单位 ' + enemy.name + '，执行巡航接敌');
        moveToAttackTarget(unit);
    });

    attackTargetUnits = [];
    attackSelectionMode = 'point';
    hideEnemyTargetTooltip();
}

// --- 显示敌方提示 ---
function showEnemyTargetTooltip(unit, e) {
    if (attackSelectionMode !== 'enemy' || attackTargetUnits.length === 0) return;

    enemyTargetTooltipUnit = unit;
    var tip = document.getElementById('enemy-target-tooltip');
    if (!tip) {
        tip = document.createElement('div');
        tip.id = 'enemy-target-tooltip';
        tip.className = 'enemy-target-tooltip';
        document.body.appendChild(tip);
    }

    var ammoText = typeof unit.ammo === 'number' && typeof unit.maxAmmo === 'number'
        ? '<div>弹药 ' + unit.ammo + '/' + unit.maxAmmo + '</div>'
        : '';
    tip.innerHTML = '<div class="tip-title">' + unit.name + '</div>' +
        '<div>类型 ' + getEnemyTypeText(unit.type) + '</div>' +
        '<div>生命 ' + Math.max(0, unit.health) + '/' + unit.maxHealth + '</div>' +
        '<div>射程 ' + unit.attackRange + '</div>' +
        '<div>探测 ' + unit.scoutRange + '</div>' +
        ammoText;

    var x = (e && e.clientX) ? e.clientX : 0;
    var y = (e && e.clientY) ? e.clientY : 0;
    tip.style.left = (x + 14) + 'px';
    tip.style.top = (y + 14) + 'px';
    tip.classList.add('active');
}

// --- 隐藏敌方提示 ---
function hideEnemyTargetTooltip() {
    enemyTargetTooltipUnit = null;
    var tip = document.getElementById('enemy-target-tooltip');
    if (tip) {
        tip.classList.remove('active');
    }
}
