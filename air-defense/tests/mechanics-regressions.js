const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

function readJs(file) {
    return fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8');
}

function loadDataSandbox() {
    const sandbox = { console };
    const source = readJs('data.js') + `
        ({
            CONFIG,
            EQUIP_DATA,
            ENEMY_TYPES,
            TERRAIN_ZONES,
            getTerrainAt,
            canDeployAt,
            getTerrainCombatModifiers,
            generateDefenseSites,
            setDefenseMode,
            getDefenseSites,
            generateWavePlan,
            getWaves,
            EnemyBrain,
            BattleLog
        });
    `;
    return vm.runInNewContext(source, sandbox);
}

function loadGameSandbox() {
    const sandbox = {
        console,
        setTimeout(fn) {
            fn();
            return 1;
        },
        clearTimeout() {},
        Date,
        Math,
        document: {
            getElementById() {
                return { textContent: '', style: {}, classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {} };
            },
            querySelectorAll() { return []; },
            addEventListener() {}
        },
        window: { addEventListener() {} },
        localStorage: (() => {
            const store = new Map();
            return {
                getItem(key) { return store.has(key) ? store.get(key) : null; },
                setItem(key, value) { store.set(key, String(value)); },
                removeItem(key) { store.delete(key); }
            };
        })(),
        Utils: { debounce(fn) { return fn; }, hexToRgba() { return 'rgba(0,0,0,0)'; } },
        MapModule: { canvas: { width: 900, height: 600, getBoundingClientRect() { return { left: 0, top: 0, width: 900, height: 600 }; } } },
        EffectModule: { addFloatingText() {}, addExplosion() {}, addHitFlash() {}, addTracer() {}, particles: [], clearAll() {} },
        Game: { isRunning: false, enemiesKilled: 0, enemiesBreakthrough: 0 }
    };
    const source = [
        readJs('data.js'),
        readJs('equipment.js'),
        readJs('enemy.js'),
        readJs('combat.js'),
        readJs('ui.js'),
        `
        ({
            CONFIG,
            EQUIP_DATA,
            ENEMY_TYPES,
            TERRAIN_ZONES,
            getTerrainAt,
            canDeployAt,
            getTerrainCombatModifiers,
            generateDefenseSites,
            setDefenseMode,
            getDefenseSites,
            generateWavePlan,
            getWaves,
            EnemyBrain,
            BattleLog,
            EquipModule,
            EnemyModule,
            CombatModule,
            UIModule,
            Game
        });
        `
    ].join('\n');
    return vm.runInNewContext(source, sandbox);
}

const data = loadDataSandbox();

const equipmentModelCount = Object.values(data.EQUIP_DATA)
    .reduce((sum, group) => sum + (group.models || []).length, 0);
assert.ok(equipmentModelCount >= 8, 'expanded equipment catalog should contain at least eight models');
assert.ok(data.EQUIP_DATA.ew, 'electronic warfare equipment category should exist');

const enemyKeys = Object.keys(data.ENEMY_TYPES);
assert.ok(enemyKeys.length >= 10, 'expanded enemy catalog should contain at least ten target types');
for (const key of enemyKeys) {
    const enemy = data.ENEMY_TYPES[key];
    assert.ok(enemy.altitude, `${key} should define altitude band`);
    assert.notStrictEqual(enemy.signature, undefined, `${key} should define radar/visual signature`);
    assert.notStrictEqual(enemy.maneuver, undefined, `${key} should define maneuver value`);
    assert.notStrictEqual(enemy.jamResist, undefined, `${key} should define jamming resistance`);
}

assert.ok(Array.isArray(data.TERRAIN_ZONES) && data.TERRAIN_ZONES.length >= 4, 'terrain zones should be configured');
const mountain = data.TERRAIN_ZONES.find(zone => zone.kind === 'mountain');
assert.ok(mountain, 'mountain terrain should exist');
assert.strictEqual(data.canDeployAt(mountain.x + 5, mountain.y + 5, 'gun').ok, false, 'mountain should block gun deployment');
assert.strictEqual(data.canDeployAt(mountain.x + 5, mountain.y + 5, 'radar').ok, true, 'mountain should allow radar deployment');

const planA = data.generateWavePlan({ waveIndex: 5, breaches: [1], killStats: { drone: 8 }, seed: 11 });
const planB = data.generateWavePlan({ waveIndex: 5, breaches: [3], killStats: { ballistic: 5 }, seed: 29 });
assert.notDeepStrictEqual(planA.enemies, planB.enemies, 'adaptive wave generation should vary by context and seed');

assert.strictEqual(typeof data.generateDefenseSites, 'function', 'defense site generator should exist');
const threeSites = data.generateDefenseSites(3, 31, 900, 600);
assert.strictEqual(threeSites.length, 3, 'three-city mode should generate three sites');
for (let i = 0; i < threeSites.length; i++) {
    for (let j = i + 1; j < threeSites.length; j++) {
        assert.ok(Math.hypot(threeSites[i].x - threeSites[j].x, threeSites[i].y - threeSites[j].y) >= 170, 'generated city sites should not cluster together');
    }
}
data.setDefenseMode(3, 31);
assert.strictEqual(data.CONFIG.defenseMode, 3, 'setDefenseMode should store selected city count');
assert.strictEqual(data.getDefenseSites().length, 3, 'getDefenseSites should return active cities');
assert.strictEqual(data.CONFIG.centerX, data.getDefenseSites()[0].x, 'primary center should follow first generated city');

assert.strictEqual(typeof data.EnemyBrain.chooseAttackPlan, 'function', 'enemy brain should choose attack plans');
const brainPlan = data.EnemyBrain.chooseAttackPlan({
    waveIndex: 6,
    sites: [
        { id: 'city-a', x: 180, y: 180, value: 1.2 },
        { id: 'city-b', x: 720, y: 420, value: 1.0 }
    ],
    equipment: [
        { type: 'radar', x: 180, y: 120, range: 250 },
        { type: 'missile', x: 190, y: 200, range: 170 },
        { type: 'gun', x: 170, y: 230, range: 90 }
    ],
    breachesByCity: { 'city-b': 2 },
    killStats: { cruise: 6 },
    seed: 44
});
assert.ok(brainPlan.assignments.length > 0, 'enemy brain should produce attack assignments');
assert.ok(brainPlan.assignments.some(item => item.targetId === 'city-b'), 'enemy brain should favor the weaker or previously breached city');
assert.ok(brainPlan.assignments.some(item => item.role === 'main') && brainPlan.assignments.some(item => item.role === 'feint'), 'enemy brain should mix main effort and feints');

const threeCityPlan = data.EnemyBrain.chooseAttackPlan({
    waveIndex: 4,
    sites: [
        { id: 'city-a', x: 180, y: 180, value: 1.2 },
        { id: 'city-b', x: 720, y: 180, value: 1.0 },
        { id: 'city-c', x: 470, y: 440, value: 0.95 }
    ],
    equipment: [],
    breachesByCity: {},
    killStats: {},
    seed: 91
});
const assignedCityIds = new Set(threeCityPlan.assignments.map(item => item.targetId));
assert.deepStrictEqual(
    [...assignedCityIds].sort(),
    ['city-a', 'city-b', 'city-c'],
    'three-city attack plans should assign enemies to every protected site'
);

const game = loadGameSandbox();
assert.strictEqual(typeof game.BattleLog.add, 'function', 'BattleLog.add should exist');
game.BattleLog.reset();
for (let i = 0; i < 80; i++) game.BattleLog.add('test', 'entry ' + i, { index: i });
assert.ok(game.BattleLog.entries.length <= game.BattleLog.maxEntries, 'battle log should cap stored entries');
assert.strictEqual(game.BattleLog.entries[game.BattleLog.entries.length - 1].message, 'entry 79', 'battle log should keep newest entries');

const opLine = game.UIModule.renderOperationLogLine({
    frame: 61,
    type: 'spawn',
    message: '预警雷达-1 已录入战场情报',
    meta: { waveNumber: 2, unitName: '预警雷达-1', action: '已录入战场情报' }
});
assert.strictEqual(opLine, '[00:01] 第2波 预警雷达-1 已录入战场情报', 'operation log line should use timestamp, wave number and readable event text');

const oneX = game.CONFIG.interWaveDuration;
game.CONFIG.simulationSpeed = 5;
game.CONFIG.interWavePhase = true;
game.CONFIG.interWaveTimer = 0;
game.EnemyModule.updateInterWaveCountdown();
assert.strictEqual(game.CONFIG.interWaveTimer, 1, 'inter-wave timer should advance once per visual frame at 5x');
assert.strictEqual(oneX, game.CONFIG.interWaveDuration, 'inter-wave duration should stay stable');

assert.strictEqual(typeof game.UIModule.getTooltipPosition, 'function', 'tooltip boundary helper should exist');
const flipped = game.UIModule.getTooltipPosition({ clientX: 320, clientY: 730 }, { width: 260, height: 180 }, { innerWidth: 500, innerHeight: 820 });
assert.ok(flipped.top < 730, 'tooltip should open upward when it would overflow the bottom edge');
assert.ok(flipped.left <= 500 - 260 - 8, 'tooltip should stay inside right viewport edge');

const earlyInterval = game.EnemyModule.getSpawnIntervalForWave(0, 1);
const lateInterval = game.EnemyModule.getSpawnIntervalForWave(8, 1);
const fastLateInterval = game.EnemyModule.getSpawnIntervalForWave(8, 5);
assert.ok(earlyInterval > lateInterval, 'later waves should use shorter attack intervals');
assert.ok(lateInterval > fastLateInterval, 'simulation speed should still shorten spawn spacing inside a wave');

game.EnemyModule.list = [];
game.EnemyModule.pendingSpawns = 0;
game.EnemyModule.waveActive = true;
game.EnemyModule.waveIndex = 1;
game.EnemyModule.waveTimer = 9999;
game.EnemyModule.waveComplete = false;
game.EnemyModule._justSpawnedNextWave = false;
game.CONFIG.interWavePhase = false;
game.CONFIG.interWaveTimer = 0;
game.Game.isRunning = true;
game.EnemyModule.update();
assert.strictEqual(game.CONFIG.interWavePhase, true, 'clearing a wave should enter the 10-second deployment pause before spawning the next wave');
assert.strictEqual(game.EnemyModule.list.length, 0, 'next wave should not spawn until the deployment pause finishes');
game.CONFIG.interWavePhase = false;
game.CONFIG.interWaveTimer = 0;
game.EnemyModule.waveActive = false;
game.EnemyModule.list = [];
game.EnemyModule.pendingSpawns = 0;

game.EquipModule.list = [];
const flanker = {
    x: 0,
    y: 300,
    finalTargetX: game.CONFIG.centerX,
    finalTargetY: game.CONFIG.centerY,
    vx: 0,
    vy: 0,
    type: 'loitering',
    speed: 1.08,
    maneuver: 0.35,
    jamResist: 0.25,
    pathType: 'flanker',
    weavePhase: 0,
    spiralRadius: 40,
    spiralPhase: 0,
    flankAngle: Math.PI * 0.3,
    flankProgress: 0,
    alive: true
};
let flankerReachedTarget = false;
for (let frame = 0; frame < 900; frame++) {
    game.EnemyModule._updateEnemyPath(flanker);
    flanker.x += flanker.vx;
    flanker.y += flanker.vy;
    if (Math.hypot(flanker.x - game.CONFIG.centerX, flanker.y - game.CONFIG.centerY) < game.CONFIG.protectRadius) {
        flankerReachedTarget = true;
        break;
    }
}
assert.strictEqual(flankerReachedTarget, true, 'flanker enemies should eventually converge on the target instead of orbiting forever');

game.EnemyModule.list = [{
    x: game.CONFIG.centerX,
    y: game.CONFIG.centerY,
    finalTargetX: game.CONFIG.centerX,
    finalTargetY: game.CONFIG.centerY,
    vx: 0,
    vy: 0,
    type: 'cruise',
    hp: 1,
    maxHp: 1,
    speed: 1,
    color: '#f00',
    size: 5,
    score: 10,
    trailColor: '#f00',
    alive: true,
    reachedTarget: false,
    trail: [],
    side: 0
}];
game.CONFIG.interWavePhase = false;
game.CONFIG.interWaveTimer = 0;
game.EnemyModule.waveActive = true;
game.EnemyModule.waveIndex = 1;
game.EnemyModule.pendingSpawns = 0;
game.CONFIG.threatLevel = 0.9;
game.EnemyModule.update();
assert.strictEqual(game.Game.enemiesBreakthrough, 1, 'breached target should be counted once');
assert.strictEqual(game.EnemyModule.list.length, 0, 'breached target should be removed from active enemy list');
assert.strictEqual(game.CONFIG.threatLevel, 0, 'threat warning should clear after breached target is removed');

const report = game.UIModule.buildBattleReportData({
    finalScore: 88,
    rate: 80,
    rank: { title: '稳定防御', desc: '测试' },
    stars: '★★★☆☆',
    kill: 8,
    brk: 2,
    total: 10,
    difficultyMult: 1,
    elapsed: 70,
    timeBonus: 0,
    noBreakBonus: 0,
    defenseRateBonus: 40,
    weakSpotAnalysis: '测试',
    equipAdvice: '测试',
    densityAdvice: '测试',
    overallRate: 1,
    actionTip: ''
});
assert.ok(Array.isArray(report.logs), 'battle report should include battle logs');
assert.ok(report.logs.length > 0, 'battle report should archive battle log entries');
const detailHtml = game.UIModule.renderReportDetail(report);
assert.ok(detailHtml.includes('<details class="archive-collapse archive-log-collapse"'), 'archived battle logs should be inside a collapsible details block');
assert.ok(detailHtml.includes('[00:'), 'archived battle logs should render timestamped operation lines');
assert.ok((detailHtml.match(/<details class="archive-collapse/g) || []).length >= 5, 'long archive report sections should be collapsible');

console.log('mechanics regressions passed');
