// --- 加载依赖 ---
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

// --- 存储工具 ---
function createStorage() {
    const store = new Map();
    return {
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
            store.set(key, String(value));
        },
        removeItem(key) {
            store.delete(key);
        }
    };
}

// --- 加载 UI 模块 ---
function loadUiModule() {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'ui.js'), 'utf8');
    const sandbox = {
        console,
        localStorage: createStorage(),
        document: {
            getElementById() { return null; },
            querySelectorAll() { return []; },
            addEventListener() {}
        },
        window: { addEventListener() {} },
        Utils: { debounce(fn) { return fn; } },
        MapModule: {},
        EquipModule: { list: [] },
        EnemyModule: {},
        Game: {},
        CONFIG: {},
        getWaves() { return []; },
        SCORE_RANKS: [],
        DIFFICULTY_MULTIPLIER: {},
        ENEMY_TYPES: {},
        ENEMY_ENCYCLOPEDIA: {},
        EQUIP_DATA: {},
        EffectModule: {}
    };
    const UIModule = vm.runInNewContext(source + '\nUIModule;', sandbox);
    return { UIModule, storage: sandbox.localStorage };
}

// --- 战报夹具 ---
function makeReport(id, score) {
    return {
        id,
        createdAt: '2026-08-08T00:00:00.000Z',
        title: '第' + id + '次战报',
        rank: { title: '稳定防御', desc: '测试报告' },
        stars: '★★★☆☆',
        score,
        rate: 80,
        totals: { total: 10, kill: 8, breakthrough: 2 },
        equipment: { total: 5, byType: { radar: 1, missile: 2, gun: 2 }, models: [] },
        enemy: { killStats: {}, waves: [] },
        scoreDetail: {},
        analysis: {}
    };
}

// --- 加载模块 ---
const { UIModule } = loadUiModule();

// --- 接口检查 ---
assert.strictEqual(typeof UIModule.saveReport, 'function', 'UIModule.saveReport should exist');
assert.strictEqual(typeof UIModule.loadReports, 'function', 'UIModule.loadReports should exist');
assert.strictEqual(typeof UIModule.clearReports, 'function', 'UIModule.clearReports should exist');

// --- 保存战报 ---
UIModule.clearReports();
UIModule.saveReport(makeReport('old', 100));
UIModule.saveReport(makeReport('new', 200));

// --- 读取顺序 ---
let reports = UIModule.loadReports();
assert.strictEqual(reports.length, 2, 'two reports should be saved');
assert.strictEqual(reports[0].id, 'new', 'newest report should appear first');
assert.strictEqual(reports[1].id, 'old', 'older report should appear second');

// --- 存档上限 ---
for (let i = 0; i < 14; i++) {
    UIModule.saveReport(makeReport('cap-' + i, i));
}

reports = UIModule.loadReports();
assert.strictEqual(reports.length, 12, 'archive should keep only the latest 12 reports');
assert.strictEqual(reports[0].id, 'cap-13', 'latest capped report should be first');

// --- 清空存档 ---
UIModule.clearReports();
assert.strictEqual(UIModule.loadReports().length, 0, 'clearReports should empty the archive');

// --- 输出结果 ---
console.log('report archive regressions passed');
