// ============================================================
// data.js — 全局状态、常量、模拟数据（第1个加载）
// ============================================================

// --- 游戏状态变量 ---
let gameRunning = false;
let gameSpeed = 2;
let gameTime = 0;
let gameInterval = null;
let baseHealth = 100;
let battleResolved = false;
let activeBattleEvents = [];
const BATTLE_TIME_LIMIT = 10 * 60;

// --- 地图常量 ---
const MAP_WIDTH = 600;
const MAP_HEIGHT = 400;

// 禁区定义
const FORBIDDEN_ZONES = [
    { x: 60, y: 360, width: 60, height: 60 }      // 我方基地
];

// --- 单位操作弹窗状态 ---
let selectedUnit = null;

// --- 目标选择状态 ---
let attackTargetUnits = [];  // 使用数组支持并行指令
let scoutTargetUnits = [];    // 使用数组支持并行指令
let launchTargetUnit = null;  // 正在选择发射目标的蜂巢发射车
let launchDroneCount = 0;     // 本次发射的无人机数量
let attackSelectionMode = 'point';
let enemyTargetTooltipUnit = null;

// --- 蜂巢无人机编组全局状态 ---
let droneSquads = [];         // 所有已发射的无人机编组
let droneSquadIdCounter = 0;  // 编组ID计数器
let selectedSquad = null;     // 当前选中的无人机编组（用于编组指令）
let enemyUavResupplyQueue = [];
let enemyUavActiveResupplyId = null;
let friendlyResupplyQueue = [];
let friendlyActiveResupplyId = null;

// --- 常规无人机编组全局状态 ---
let formations = [];            // 所有常规无人机编组
let formationIdCounter = 0;     // 编组ID计数器
let selectedFormation = null;   // 当前选中的常规编组
let formationCmdPending = null; // {formation, command} 等待地图点击目标

// 长机等级排序（数字越小级别越高，强击预留给未来）
const TIER_RANK = { 'strike_assault': 1, 'attack': 2, 'strike': 3, 'scout': 4 };

function getUnitTier(unit) {
    return TIER_RANK[unit.type] || 99;
}

function isUnitInFormation(unit) {
    for (var i = 0; i < formations.length; i++) {
        for (var j = 0; j < formations[i].units.length; j++) {
            if (formations[i].units[j].id === unit.id) return true;
        }
    }
    return false;
}

// --- 计数器 ---
let scoutCounter = 0;
let moveCounter = 0;

// --- 工具函数 ---
function getStatusText(status) {
    const statusMap = {
        'ready': '待命',
        'deployed': '部署',
        'mission': '任务中',
        'attack': '攻击中',
        'scout': '侦察中',
        'move': '转移中',
        'recall': '召回中',
        'launch': '发射中',
        'damaged': '损毁'
    };
    return statusMap[status] || status;
}

function getStatusClass(status) {
    switch(status) {
        case 'deployed': return 'deployed';
        case 'scout': return 'scouting';
        case 'attack': return 'attacking';
        case 'move': return 'moving';
        case 'recall': return 'recalling';
        case 'launch': return 'attacking';
        case 'ready': return '';
        default: return '';
    }
}

function getActionText(action) {
    const actionMap = {
        'deploy': '部署/出动',
        'scout': '侦察任务',
        'attack': '攻击任务',
        'escort': '陪护护航',
        'defend': '防守部署',
        'move': '转移机动',
        'launch': '发射蜂群',
        'group': '编组管理',
        'recall': '召回待命'
    };
    return actionMap[action] || action;
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// --- 玩家单位数据 ---
const mockUnits = [
    { id: 1, name: '侦察无人机-1', type: 'scout', health: 80, maxHealth: 80, ammo: 0, maxAmmo: 0, x: 60, y: 360, status: 'ready', scoutRadius: 50, speed: 3, maxSpeed: 5, patrolTargetX: 100, patrolTargetY: 360, lastPatrolUpdate: 0 },
    { id: 2, name: '察打一体-1', type: 'attack', health: 150, maxHealth: 150, ammo: 4, maxAmmo: 4, x: 70, y: 370, status: 'ready', scoutRadius: 30, speed: 2, maxSpeed: 4, patrolTargetX: 100, patrolTargetY: 370, lastPatrolUpdate: 0, attackRange: 30 },
    { id: 3, name: '攻击无人机-1', type: 'strike', health: 120, maxHealth: 120, ammo: 4, maxAmmo: 4, x: 80, y: 360, status: 'ready', scoutRadius: 10, speed: 3, maxSpeed: 6, patrolTargetX: 100, patrolTargetY: 360, lastPatrolUpdate: 0, attackRange: 30 },
    { id: 4, name: '攻击无人机-2', type: 'strike', health: 120, maxHealth: 120, ammo: 4, maxAmmo: 4, x: 70, y: 380, status: 'ready', scoutRadius: 10, speed: 3, maxSpeed: 6, patrolTargetX: 100, patrolTargetY: 380, lastPatrolUpdate: 0, attackRange: 30 },
    { id: 5, name: '强击无人机-1', type: 'strike_assault', health: 170, maxHealth: 170, ammo: 5, maxAmmo: 5, x: 75, y: 350, status: 'ready', scoutRadius: 12, speed: 3, maxSpeed: 5, patrolTargetX: 105, patrolTargetY: 350, lastPatrolUpdate: 0, attackRange: 36 },
    { id: 6, name: '蜂巢发射车-1', type: 'swarm', health: 200, maxHealth: 200, ammo: 12, maxAmmo: 12, x: 60, y: 370, status: 'ready', scoutRadius: 0, speed: 3, maxSpeed: 3, patrolTargetX: 60, patrolTargetY: 370, lastPatrolUpdate: 0, attackRange: 0, maxRange: 150, launchedSquads: [] }
];

// --- 敌军单位属性模板（位置由generateEnemyUnits动态计算）---
const enemyUnitStats = {
    'command':  { health: 500, attackRange: 20,  scoutRange: 0,   speed: 0, attackCooldown: 0,    hidden: true },
    'aa_short': { health: 180, attackRange: 20,  scoutRange: 50,  speed: 0, attackCooldown: 2000, hidden: false },
    'aa_long':  { health: 250, attackRange: 150, scoutRange: 100, speed: 0, attackCooldown: 4000, hidden: false },
    'radar':    { health: 120, attackRange: 0,   scoutRange: 150, speed: 0, attackCooldown: 0,    hidden: false },
    'enemy_uav':{ health: 130, attackRange: 30,  scoutRange: 40,  speed: 5, attackCooldown: 3000, hidden: false, ammo: 4, maxAmmo: 4, attackDamage: 40 }
};

// 根据指挥中心位置智能部署所有敌军（纵深防御体系）
function generateEnemyUnits() {
    // ========== 1. 指挥中心随机位置：X 300~600, Y 0~300 ==========
    const cmdX = 300 + Math.random() * 300;
    const cmdY = Math.random() * 300;

    // 防御系统向左下方展开（正对我方基地(90,390)，即西南方向）
    const ourBaseX = 90, ourBaseY = 390;
    const threatAngle = Math.atan2(ourBaseY - cmdY, ourBaseX - cmdX);

    // 辅助函数
    function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

    function deployAt(angle, distance) {
        return {
            x: clamp(cmdX + Math.cos(angle) * distance, 50, 570),
            y: clamp(cmdY + Math.sin(angle) * distance, 30, 370)
        };
    }

    function deployJitter(angle, distance, jitterA, jitterD) {
        const a = angle + (Math.random() - 0.5) * 2 * jitterA;
        const d = distance + (Math.random() - 0.5) * 2 * jitterD;
        return deployAt(a, d);
    }

    // ========== 2. 纵深防御部署 ==========

    // 第1层：预警雷达 — 最前出，最大化侦察覆盖（面向威胁方向）
    const radarPos = deployJitter(threatAngle, 150, Math.PI / 10, 30);

    // 第2层：远程防空 — 雷达与指挥中心之间，构成外圈防空伞
    const aaLongPos = deployJitter(threatAngle, 95, Math.PI / 8, 25);

    // 第3层：敌方无人机 — 机动巡逻，填补防御间隙
    const uavAngle = threatAngle + (Math.random() - 0.5) * Math.PI / 2;
    const uavPos = deployJitter(uavAngle, 75, Math.PI / 6, 35);

    // 第4层：近程防空 ×2 — 指挥中心两翼贴身护卫
    const flankDist = 45 + Math.random() * 15;
    const flankJitter = Math.PI / 12;
    const aaShort1Pos = deployJitter(threatAngle + Math.PI / 2, flankDist, flankJitter, 10);
    const aaShort2Pos = deployJitter(threatAngle - Math.PI / 2, flankDist, flankJitter, 10);

    // ========== 3. 构建单位对象 ==========
    function makeUnit(id, name, type, pos, overrides) {
        const stats = enemyUnitStats[type];
        const hidden = overrides && overrides.hidden !== undefined ? overrides.hidden : stats.hidden;
        return {
            id: id, name: name, type: type,
            health: stats.health, maxHealth: stats.health,
            x: pos.x, y: pos.y,
            status: 'active',
            visible: false,
            hidden: hidden,
            discovered: false,  // 是否已被玩家探明（一旦发现永久记录）
            lastSeenX: null,    // 最后目击坐标
            lastSeenY: null,
            lastSeenTime: 0,    // 最后目击游戏时间
            attackRange: stats.attackRange,
            scoutRange: stats.scoutRange,
            speed: stats.speed,
            targetX: type === 'enemy_uav' ? pos.x + (Math.random() - 0.5) * 100 : undefined,
            targetY: type === 'enemy_uav' ? pos.y + (Math.random() - 0.5) * 80 : undefined,
            lastAttack: 0,
            attackCooldown: stats.attackCooldown,
            ammo: overrides && overrides.ammo !== undefined ? overrides.ammo : (stats.ammo || 0),
            maxAmmo: overrides && overrides.maxAmmo !== undefined ? overrides.maxAmmo : (stats.maxAmmo || 0),
            attackDamage: overrides && overrides.attackDamage !== undefined ? overrides.attackDamage : (stats.attackDamage || 0),
            resupplyX: overrides && overrides.resupplyX !== undefined ? overrides.resupplyX : null,
            resupplyY: overrides && overrides.resupplyY !== undefined ? overrides.resupplyY : null,
            resupplyState: type === 'enemy_uav' ? 'ready' : null
        };
    }

    return [
        makeUnit(106, '指挥中心',   'command',   { x: cmdX, y: cmdY }, { hidden: true }),
        makeUnit(104, '预警雷达-1', 'radar',     radarPos),
        makeUnit(103, '远程防空-1', 'aa_long',   aaLongPos),
        makeUnit(105, '敌方无人机-1','enemy_uav', uavPos, {
            ammo: 4,
            maxAmmo: 4,
            attackDamage: 40,
            resupplyX: clamp(cmdX - 35, 50, 570),
            resupplyY: clamp(cmdY + 35, 30, 370)
        }),
        makeUnit(101, '近程防空-1', 'aa_short',  aaShort1Pos, { hidden: false }),
        makeUnit(102, '敌方无人机-2', 'enemy_uav', aaShort2Pos, {
            hidden: true,
            ammo: 4,
            maxAmmo: 4,
            attackDamage: 40,
            resupplyX: clamp(cmdX + 45, 50, 570),
            resupplyY: clamp(cmdY + 20, 30, 370)
        })
    ];
}

const mockEnemyUnits = generateEnemyUnits();

// --- 战报历史数据 ---
const mockBattles = [
    { id: 1, mission: '摧毁敌方指挥中心', result: 'win', completion: 100, lossRate: 20, score: 92, time: '2024-01-15 14:30', duration: '8:45', timeline: [
        { time: '0:30', event: '侦察无人机-1部署完成' },
        { time: '2:15', event: '发现敌方防空系统2座' },
        { time: '4:30', event: '攻击无人机编队发起打击' },
        { time: '6:20', event: '摧毁敌方防空网络' },
        { time: '8:45', event: '成功摧毁敌方指挥中心' }
    ], analysis: { strengths: ['侦察前置探明防空部署', '编组协同打击效果良好', '战术运用灵活'], weaknesses: ['初期侦察范围不足', '部分单位走位过于激进'], suggestions: ['建议扩大初始侦察范围', '注意保护侦察无人机安全'] }},
    { id: 2, mission: '区域侦察任务', result: 'win', completion: 100, lossRate: 0, score: 88, time: '2024-01-14 10:20', duration: '5:30', timeline: [], analysis: { strengths: [], weaknesses: [], suggestions: [] }},
    { id: 3, mission: '保护我方基地', result: 'lose', completion: 60, lossRate: 60, score: 45, time: '2024-01-13 16:45', duration: '10:00', timeline: [], analysis: { strengths: [], weaknesses: [], suggestions: [] }}
];

function getFriendlyUnits() {
    return mockUnits.filter(function(unit) {
        return unit.type !== 'swarm';
    });
}

function getCurrentFriendlyLoss() {
    return getFriendlyUnits().filter(function(unit) {
        return unit.health <= 0;
    }).length;
}

function getBattleTimestamp() {
    var now = new Date();
    var date = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    var time = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    return date + ' ' + time;
}
