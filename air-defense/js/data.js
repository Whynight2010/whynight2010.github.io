// ======================== 全局数据配置（增强版 v2） ========================

const CONFIG = {
    centerX: 450,
    centerY: 300,
    protectRadius: 60,
    showRange: true,
    radarAngle: 0,
    radarSpeed: 0.008,
    particleCount: 30,
    demoMode: false,
    simmering: false,
    threatLevel: 0,
    screenShake: 0,
    comboCount: 0,
    maxCombo: 0,
    score: 0,
    // 分项评分
    scoreDetail: {
        kills: 0,
        comboBonus: 0,
        defenseRate: 0,
        timeBonus: 0,
        noBreakBonus: 0
    },
    // 难度等级
    difficulty: 1,
    // 击毁统计（含蜂群子分类）
    killStats: {
        cruise: 0,
        fighter: 0,
        drone: 0,
        ballistic: 0,
        stealth: 0,
        swarm: 0
    },
    // 雷达协同加成
   radarBoost: 0,
   mapLevel: 1,
    // 【新增】波次间部署阶段控制
    interWavePhase: false,
    interWaveTimer: 0,
    interWaveDuration: 600, // 10秒 = 600帧（60fps）
    nextWaveLabel: '',
    // 【新增】防御薄弱点分析数据
    defenseWeakSpots: { top: 0, right: 0, bottom: 0, left: 0 },
    breakthroughAngles: [],
    lastBreakthroughPos: null,
    // 【新增】战线分析
    engagementZones: []
};

// 防空装备完整数据
const EQUIP_DATA = {
    gun: {
        name: '近防炮',
        color: '#FF8A3D',
        glowColor: '#FF8A3D80',
        type: 'gun',
        icon: '🔫',
        models: [
            { id: 'gun_1130', name: '1130型近防炮', range: 80, damage: 1, fireRate: 8, fireCooldown: 15, cost: 30, desc: '11管30毫米转管炮，射速约11000发/分钟，末端拦截能力极强。' },
            { id: 'gun_ld2000', name: '陆盾-2000', range: 70, damage: 0.8, fireRate: 6, fireCooldown: 20, cost: 25, desc: '陆基机动近防系统，可快速部署，拦截巡航导弹与低空目标。' }
        ]
    },
    missile: {
        name: '防空导弹',
        color: '#79E6C5',
        glowColor: '#79E6C580',
        type: 'missile',
        icon: '🚀',
        models: [
            { id: 'missile_hq9b', name: '红旗-9B', range: 200, damage: 3, fireRate: 1, fireCooldown: 60, cost: 60, desc: '远程区域防空主力，最大射程超200公里，单发命中率高。' },
            { id: 'missile_hq16b', name: '红旗-16B', range: 120, damage: 2, fireRate: 2, fireCooldown: 40, cost: 45, desc: '中程防空主力，反应速度快，擅长拦截低空突防目标。' }
        ]
    },
    radar: {
        name: '预警雷达',
        color: '#7BE7FF',
        glowColor: '#7BE7FF80',
        type: 'radar',
        icon: '📡',
        models: [
            { id: 'radar_jy27', name: 'JY-27远程雷达', range: 280, damage: 0, fireRate: 0, fireCooldown: 0, cost: 40, desc: '米波三坐标远程预警雷达，探测距离远，具备反隐身能力。' },
            { id: 'radar_fc', name: '火控照射雷达', range: 150, damage: 0, fireRate: 0, fireCooldown: 0, cost: 30, desc: '高精度火控跟踪雷达，可引导导弹精准打击目标。' }
        ]
    }
};

// 空袭目标参数（增强：新增无人机蜂群）
const ENEMY_TYPES = {
    cruise:    { name: '巡航导弹',   icon: '🚀', speed: 1.5,  hp: 1,   color: '#ff4444', size: 5,  score: 10,  trailColor: '#ff4444', stealth: false, category: '精确打击',     threat: '中等', counter: '近防炮/中程导弹' },
    fighter:   { name: '低空战机',   icon: '✈️', speed: 2.2,  hp: 2,   color: '#ff8800', size: 7,  score: 20,  trailColor: '#ff8800', stealth: false, category: '空中打击',     threat: '较高', counter: '远程防空导弹' },
    drone:     { name: '侦察无人机', icon: '🛸', speed: 0.8,  hp: 0.5, color: '#ffaa00', size: 4,  score: 5,   trailColor: '#ffaa00', stealth: false, category: '侦察袭扰',     threat: '较低', counter: '近防炮' },
    ballistic: { name: '弹道导弹',   icon: '💥', speed: 3.5,  hp: 3,   color: '#ff0055', size: 6,  score: 30,  trailColor: '#ff0055', stealth: false, category: '战略打击',     threat: '极高', counter: '红旗-9B远程导弹' },
    stealth:   { name: '隐身战机',   icon: '🦅', speed: 2.5,  hp: 2.5, color: '#8866ff', size: 7,  score: 35,  trailColor: '#8866ff', stealth: true,  category: '隐身突防',     threat: '极高', counter: 'JY-27雷达+导弹组合' },
    swarm:     { name: '无人机蜂群', icon: '🐝', speed: 1.2,  hp: 0.3, color: '#ff6699', size: 3,  score: 8,   trailColor: '#ff669980', stealth: false, category: '饱和蜂群',     threat: '集群', counter: '近防炮密集火力', swarm: true }
};

// 敌机详细百科数据（用于敌人信息面板）
const ENEMY_ENCYCLOPEDIA = {
    cruise: {
        description: '低空超低空飞行的精确打击武器，利用地形遮蔽躲避雷达探测。飞行高度极低（50-100米），雷达反射截面积小。',
        tactics: '通常以2-3枚为一组从不同方向同时突击，压缩防御方反应时间。',
        weakness: '飞行速度相对较慢（亚音速），被近防炮锁定后难以规避。',
        realRef: '参考：战斧巡航导弹、长剑-10'
    },
    fighter: {
        description: '携带空对地武器的高速作战飞机，可在防区外发射精确制导弹药后撤离。机动性强，具备一定隐身或电子战能力。',
        tactics: '利用速度优势高速突入，在防区外投放弹药后脱离。',
        weakness: '进入近防炮射程后生存率大幅下降，远程导弹是最佳拦截手段。',
        realRef: '参考：F-16、歼-16 多用途战斗机'
    },
    drone: {
        description: '低成本小型无人机，用于侦察和骚扰。体积小、速度慢但数量多，大量消耗防御资源。',
        tactics: '分散接近，消耗防御方弹药和注意力，为后续主力攻击创造条件。',
        weakness: '飞行速度慢、机动性差，易被近防炮拦截。',
        realRef: '参考：Shahed-136 自杀式无人机'
    },
    ballistic: {
        description: '以高抛弹道飞行的中近程弹道导弹，末端速度极快（可达5+马赫），拦截窗口极短。',
        tactics: '高弹道飞行导致预警时间短，末端高速俯冲增加拦截难度。',
        weakness: '弹道相对固定可预测，远程雷达提前预警可争取拦截时间。',
        realRef: '参考：伊斯坎德尔、东风系列战术导弹'
    },
    stealth: {
        description: '采用隐身外形设计和吸波材料的第五代战斗机，雷达反射截面积极小，常规雷达难以远距离发现。',
        tactics: '利用隐身优势逼近至近距离再发射武器，压缩防御方反应窗口。',
        weakness: '米波雷达（如JY-27）对其有一定探测能力，进入近程后隐身效果减弱。',
        realRef: '参考：F-22、歼-20 隐身战斗机'
    },
    swarm: {
        description: '由数十架小型无人机组成的攻击蜂群，通过数量优势实施饱和攻击。单机成本低、可消耗。',
        tactics: '集群同时从不同方向逼近，通过数量压垮防御系统的火力通道限制。',
        weakness: '单机生存力极低，近防炮的高射速密集弹幕是对抗蜂群的最有效手段。',
        realRef: '参考：无人机蜂群作战概念，如"小精灵"项目'
    }
};

// 敌机波次定义（10波渐进难度）
const WAVES = [
    { enemies: [{ type: 'drone', count: 2 }], delay: 80,  label: '侦察无人机接近',           difficulty: 1 },
    { enemies: [{ type: 'cruise', count: 3 }], delay: 100, label: '巡航导弹突袭',             difficulty: 1 },
    { enemies: [{ type: 'fighter', count: 2 }], delay: 120, label: '低空战机编队来袭',        difficulty: 2 },
    { enemies: [{ type: 'cruise', count: 3 }, { type: 'drone', count: 3 }], delay: 140, label: '混合攻击波次', difficulty: 2 },
    { enemies: [{ type: 'ballistic', count: 1 }, { type: 'fighter', count: 2 }], delay: 150, label: '高强度联合打击', difficulty: 3 },
    { enemies: [{ type: 'swarm', count: 8 }, { type: 'drone', count: 2 }], delay: 160, label: '无人机蜂群来袭', difficulty: 3 },
    { enemies: [{ type: 'stealth', count: 1 }, { type: 'fighter', count: 2 }], delay: 180, label: '隐身战机介入', difficulty: 4 },
    { enemies: [{ type: 'ballistic', count: 2 }, { type: 'stealth', count: 1 }], delay: 200, label: '弹道+隐身双重威胁', difficulty: 4 },
    { enemies: [{ type: 'swarm', count: 12 }, { type: 'fighter', count: 3 }, { type: 'drone', count: 4 }], delay: 220, label: '全面饱和攻击', difficulty: 5 },
    { enemies: [{ type: 'ballistic', count: 2 }, { type: 'stealth', count: 2 }, { type: 'swarm', count: 6 }], delay: 240, label: '终极联合打击', difficulty: 5 }
];


// 评分星级标准
const SCORE_RANKS = [
    { min: 0,    stars: 0, title: '防线失守',    desc: '城市要地遭受重创，防空体系未形成有效闭环。请重新规划装备部署。' },
    { min: 30,   stars: 1, title: '初级防空',    desc: '拦住了部分来袭目标，但防御边缘仍有明显漏洞。建议扩大预警雷达覆盖范围。' },
    { min: 60,   stars: 2, title: '基础防空',    desc: '具备基础防空能力，可应对常规打击。还需优化装备之间的交叉覆盖。' },
    { min: 85,   stars: 3, title: '稳定防御',    desc: '防空体系较为完善，拦截率高。注意近防炮与防空导弹的衔接。' },
    { min: 95,   stars: 4, title: '钢铁屏障',    desc: '近乎完整的要地防护！分层拦截严密，雷达预警及时，装备协同精准。' },
    { min: 100,  stars: 5, title: '绝对防御',    desc: '满分！零突防的完美战绩，城市要地在整轮空袭中保持稳定。' }
];

// 难度系数（影响总分倍率）
const DIFFICULTY_MULTIPLIER = { 1: 1.0, 2: 1.2, 3: 1.5, 4: 1.8, 5: 2.0 };










