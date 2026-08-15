// ======================== 全局数据配置（机制增强版） ========================

const CONFIG = {
    centerX: 450,
    centerY: 300,
    protectRadius: 60,
    showRange: true,
    radarAngle: 0,
    radarSpeed: 0.008,
    simulationSpeed: 1,
    particleCount: 30,
    demoMode: false,
    simmering: false,
    threatLevel: 0,
    screenShake: 0,
    comboCount: 0,
    maxCombo: 0,
    score: 0,
    logicFrame: 0,
    scoreDetail: {
        kills: 0,
        comboBonus: 0,
        defenseRate: 0,
        timeBonus: 0,
        noBreakBonus: 0
    },
    difficulty: 1,
    killStats: {
        microDrone: 0,
        drone: 0,
        loitering: 0,
        cruise: 0,
        lowObservableCruise: 0,
        fighter: 0,
        jammer: 0,
        decoy: 0,
        ballistic: 0,
        hypersonic: 0,
        stealth: 0,
        swarm: 0
    },
    radarBoost: 0,
    mapLevel: 1,
    defenseMode: 1,
    defenseSites: [],
    cityThreatMemory: {},
    interWavePhase: false,
    interWaveTimer: 0,
    interWaveDuration: 600,
    nextWaveLabel: '',
    defenseWeakSpots: { top: 0, right: 0, bottom: 0, left: 0 },
    breakthroughAngles: [],
    lastBreakthroughPos: null,
    engagementZones: [],
    battleLogMax: 80
};

const SOURCE_NOTES = [
    'NATO IAMD: layered sensors, command/control and weapon systems.',
    'NASAMS: networked medium-range air defence using distributed sensors and launchers.',
    'Skynex/35mm: short-range cannon layer for rockets, drones and low-altitude targets.',
    'PAC-3/THAAD style: high-value anti-missile layer with long cooldown and high hit power.'
];

const EQUIP_DATA = {
    gun: {
        name: '近程火力',
        color: '#FF8A3D',
        glowColor: '#FF8A3D80',
        type: 'gun',
        icon: '⊙',
        models: [
            { id: 'gun_1130', name: '1130型近防炮', range: 82, damage: 1, fireRate: 8, fireCooldown: 14, accuracy: 0.72, ammo: 420, cost: 30, tags: ['末端', '高射速'], desc: '末端高速火力，适合补漏巡航导弹、小型无人机和蜂群目标。' },
            { id: 'gun_ld2000', name: '陆盾-2000', range: 76, damage: 0.85, fireRate: 6, fireCooldown: 18, accuracy: 0.70, ammo: 360, cost: 25, tags: ['机动', '近程'], desc: '机动近防系统，部署灵活，适合保护城区边缘通道。' },
            { id: 'gun_skynex35', name: '35mm智能弹炮位', range: 95, damage: 1.1, fireRate: 7, fireCooldown: 16, accuracy: 0.76, ammo: 300, cost: 38, tags: ['反无人机', '空爆弹'], desc: '参考现代35mm近程防空炮概念，擅长打击小型无人机和巡飞弹。' }
        ]
    },
    missile: {
        name: '防空导弹',
        color: '#79E6C5',
        glowColor: '#79E6C580',
        type: 'missile',
        icon: '△',
        models: [
            { id: 'missile_hq9b', name: '红旗-9B区域防空', range: 210, damage: 3.2, fireRate: 1, fireCooldown: 62, accuracy: 0.86, ammo: 18, cost: 65, tags: ['远程', '区域防空'], desc: '远程区域防空主力，适合优先拦截高价值高速目标。' },
            { id: 'missile_hq16b', name: '红旗-16B中程防空', range: 135, damage: 2.1, fireRate: 2, fireCooldown: 38, accuracy: 0.82, ammo: 28, cost: 48, tags: ['中程', '低空'], desc: '中程防空主力，反应速度快，适合低空突防目标。' },
            { id: 'missile_nasams', name: 'NASAMS分布式发射单元', range: 155, damage: 2, fireRate: 2, fireCooldown: 34, accuracy: 0.80, ammo: 32, cost: 52, tags: ['组网', '中程'], desc: '参考NASAMS分布式防空思路，依赖雷达协同后效能更好。' },
            { id: 'missile_irist_slm', name: 'IRIS-T SLM中程拦截', range: 165, damage: 2.4, fireRate: 2, fireCooldown: 42, accuracy: 0.84, ammo: 24, cost: 55, tags: ['中程', '高机动'], desc: '中程高机动拦截层，对巡航导弹和战机稳定。' },
            { id: 'missile_pac3_mse', name: 'PAC-3 MSE反导阵地', range: 190, damage: 4.2, fireRate: 1, fireCooldown: 88, accuracy: 0.88, ammo: 10, cost: 78, tags: ['反导', '高价值'], desc: '高价值反导层，冷却长、弹药少，但对弹道目标杀伤强。' },
            { id: 'missile_vshorad', name: '便携式近程防空组', range: 72, damage: 1.2, fireRate: 2, fireCooldown: 24, accuracy: 0.68, ammo: 40, cost: 22, tags: ['低空', '廉价'], desc: '低成本近程防空小组，适合补足城市缝隙。' }
        ]
    },
    radar: {
        name: '探测感知',
        color: '#7BE7FF',
        glowColor: '#7BE7FF80',
        type: 'radar',
        icon: '◈',
        models: [
            { id: 'radar_jy27', name: 'JY-27远程预警雷达', range: 290, damage: 0, fireRate: 0, fireCooldown: 0, detection: 1.25, lowAltitude: 0.82, antiStealth: 0.42, cost: 42, tags: ['远程', '反隐身'], desc: '远程预警节点，提升全局发现距离，并对隐身目标有额外探测收益。' },
            { id: 'radar_fc', name: '火控照射雷达', range: 158, damage: 0, fireRate: 0, fireCooldown: 0, detection: 1.08, lowAltitude: 0.75, antiStealth: 0.22, cost: 32, tags: ['火控', '命中率'], desc: '高精度火控跟踪雷达，提高邻近导弹和近防炮命中率。' },
            { id: 'radar_low_alt', name: '低空补盲雷达', range: 185, damage: 0, fireRate: 0, fireCooldown: 0, detection: 1.00, lowAltitude: 1.12, antiStealth: 0.12, cost: 36, tags: ['低空', '补盲'], desc: '专门弥补低空目标和地形遮蔽造成的发现盲区。' },
            { id: 'radar_passive', name: '被动侦收站', range: 170, damage: 0, fireRate: 0, fireCooldown: 0, detection: 0.88, lowAltitude: 0.72, antiStealth: 0.34, cost: 34, tags: ['被动', '抗干扰'], desc: '不主动辐射的侦收节点，对干扰和隐蔽目标提供辅助线索。' }
        ]
    },
    ew: {
        name: '电子对抗',
        color: '#C8F06A',
        glowColor: '#C8F06A80',
        type: 'ew',
        icon: '◇',
        models: [
            { id: 'ew_jammer', name: '短程电子压制站', range: 105, damage: 0.25, fireRate: 0, fireCooldown: 16, accuracy: 0.92, suppression: 0.26, ammo: Infinity, cost: 44, tags: ['压制', '反蜂群'], desc: '削弱低抗干扰目标速度和机动，能让火力层更从容接战。' },
            { id: 'ew_decoy', name: '诱饵信标阵列', range: 90, damage: 0, fireRate: 0, fireCooldown: 0, lure: 0.32, ammo: Infinity, cost: 26, tags: ['诱偏', '保护要地'], desc: '诱导部分低智能目标偏离要地中心，降低瞬时突防压力。' }
        ]
    }
};

const ENEMY_TYPES = {
    microDrone: { name: '微型低慢无人机', icon: '·', speed: 0.72, hp: 0.35, color: '#FFD08A', size: 3, score: 5, trailColor: '#FFD08A', stealth: false, category: '低慢小', threat: '低', counter: '35mm炮/电子压制', altitude: 'low', signature: 0.34, maneuver: 0.28, jamResist: 0.16, armor: 0, terrainProfile: 'urban', waveWeight: 1.4 },
    drone: { name: '侦察无人机', icon: '◌', speed: 0.88, hp: 0.55, color: '#ffaa00', size: 4, score: 6, trailColor: '#ffaa00', stealth: false, category: '侦察袭扰', threat: '较低', counter: '近程火力', altitude: 'low', signature: 0.48, maneuver: 0.22, jamResist: 0.2, armor: 0, terrainProfile: 'urban', waveWeight: 1.2 },
    loitering: { name: '巡飞弹', icon: '◆', speed: 1.08, hp: 0.7, color: '#FFB36A', size: 4, score: 9, trailColor: '#FFB36A', stealth: false, category: '游荡弹药', threat: '中等', counter: '近防炮/低空雷达', altitude: 'low', signature: 0.42, maneuver: 0.35, jamResist: 0.25, armor: 0.05, terrainProfile: 'terrainFollow', waveWeight: 1.1 },
    cruise: { name: '巡航导弹', icon: '→', speed: 1.55, hp: 1, color: '#ff4444', size: 5, score: 12, trailColor: '#ff4444', stealth: false, category: '精确打击', threat: '中等', counter: '中程导弹/末端火力', altitude: 'low', signature: 0.58, maneuver: 0.30, jamResist: 0.38, armor: 0.1, terrainProfile: 'terrainFollow', waveWeight: 1.0 },
    lowObservableCruise: { name: '低可探测巡航弹', icon: '⇢', speed: 1.42, hp: 1.15, color: '#FF6D8A', size: 5, score: 18, trailColor: '#FF6D8A', stealth: true, category: '低空隐蔽突防', threat: '较高', counter: '低空雷达+中程导弹', altitude: 'low', signature: 0.26, maneuver: 0.42, jamResist: 0.44, armor: 0.12, terrainProfile: 'terrainFollow', waveWeight: 0.72 },
    fighter: { name: '低空战机', icon: '△', speed: 2.18, hp: 2, color: '#ff8800', size: 7, score: 22, trailColor: '#ff8800', stealth: false, category: '空中打击', threat: '较高', counter: '远程/中程导弹', altitude: 'medium', signature: 0.82, maneuver: 0.68, jamResist: 0.52, armor: 0.2, terrainProfile: 'evasive', waveWeight: 0.78 },
    jammer: { name: '电子干扰护航机', icon: ')))', speed: 1.78, hp: 1.8, color: '#C8F06A', size: 6, score: 20, trailColor: '#C8F06A', stealth: false, category: '电子压制', threat: '较高', counter: '被动侦收/导弹', altitude: 'medium', signature: 0.72, maneuver: 0.42, jamResist: 0.74, armor: 0.12, terrainProfile: 'support', waveWeight: 0.55, jammer: true },
    decoy: { name: '诱饵弹', icon: '○', speed: 1.32, hp: 0.45, color: '#A8C7D8', size: 4, score: 4, trailColor: '#A8C7D8', stealth: false, category: '消耗诱骗', threat: '低', counter: '目标识别/近防', altitude: 'medium', signature: 1.15, maneuver: 0.18, jamResist: 0.1, armor: 0, terrainProfile: 'direct', waveWeight: 1.3, decoy: true },
    ballistic: { name: '弹道导弹', icon: '◆', speed: 3.35, hp: 3.1, color: '#ff0055', size: 6, score: 34, trailColor: '#ff0055', stealth: false, category: '高空高速', threat: '极高', counter: '远程反导阵地', altitude: 'high', signature: 0.92, maneuver: 0.12, jamResist: 0.88, armor: 0.28, terrainProfile: 'ballistic', waveWeight: 0.45 },
    hypersonic: { name: '高超声速滑翔目标', icon: '◇', speed: 3.05, hp: 2.8, color: '#FF4F8A', size: 6, score: 42, trailColor: '#FF4F8A', stealth: false, category: '高速机动', threat: '极高', counter: '远程雷达+反导', altitude: 'high', signature: 0.62, maneuver: 0.82, jamResist: 0.9, armor: 0.25, terrainProfile: 'glide', waveWeight: 0.30 },
    stealth: { name: '隐身战机', icon: '◒', speed: 2.42, hp: 2.5, color: '#8866ff', size: 7, score: 36, trailColor: '#8866ff', stealth: true, category: '隐身突防', threat: '极高', counter: '反隐身雷达+远程导弹', altitude: 'medium', signature: 0.18, maneuver: 0.76, jamResist: 0.62, armor: 0.18, terrainProfile: 'evasive', waveWeight: 0.42 },
    swarm: { name: '无人机蜂群', icon: '✺', speed: 1.18, hp: 0.32, color: '#ff6699', size: 3, score: 8, trailColor: '#ff669980', stealth: false, category: '饱和蜂群', threat: '集群', counter: '近程火力/电子压制', altitude: 'low', signature: 0.30, maneuver: 0.50, jamResist: 0.18, armor: 0, terrainProfile: 'swarm', waveWeight: 1.0, swarm: true }
};

const ENEMY_ENCYCLOPEDIA = {
    microDrone: { description: '低空慢速小目标，单体威胁小但容易钻入雷达盲区。', tactics: '贴近城区纹理接近，常与诱饵和巡飞弹混编。', weakness: '抗干扰能力弱，被电子压制后很容易被近程火力清理。', realRef: '参考：小型四旋翼/低慢小目标' },
    drone: { description: '用于侦察和消耗火力的小型无人机。', tactics: '分散接近并记录防御薄弱方向。', weakness: '速度慢，近防炮和电子压制都有效。', realRef: '参考：常见战术无人机' },
    loitering: { description: '具备游荡和末端俯冲能力的小型弹药。', tactics: '绕开火力密集区，寻找地形遮蔽后的突入窗口。', weakness: '低空补盲雷达能提前发现。', realRef: '参考：巡飞弹/自杀式无人机' },
    cruise: { description: '低空飞行的精确打击武器，常利用地形降低探测距离。', tactics: '多方向、低高度进入，压缩反应时间。', weakness: '速度相对可控，被中程导弹或末端火力锁定后生存率低。', realRef: '参考：战斧、长剑-10 类巡航导弹' },
    lowObservableCruise: { description: '更低可探测特征的巡航导弹，发现距离更短。', tactics: '贴地形绕行并避开强雷达覆盖。', weakness: '低空雷达与火控雷达组合能显著改善发现。', realRef: '参考：低可探测巡航导弹概念' },
    fighter: { description: '携带空对地弹药的高速战机。', tactics: '高速穿插，在防区边缘释放压力。', weakness: '中远程防空导弹是主要克制手段。', realRef: '参考：多用途战斗机' },
    jammer: { description: '为攻击编队提供电子干扰，降低雷达与导弹效率。', tactics: '伴随高价值目标接近，制造探测延迟。', weakness: '被动侦收站和远程导弹可优先压制。', realRef: '参考：电子战护航飞机' },
    decoy: { description: '用于消耗弹药和吸引火力的诱饵目标。', tactics: '提高编队雷达回波密度，让火力分配更困难。', weakness: '血量低，低价值，合理目标优先级可降低消耗。', realRef: '参考：空射诱饵/假目标' },
    ballistic: { description: '高空高速弹道目标，末端拦截窗口短。', tactics: '高速度压迫反应链路。', weakness: '反导阵地和远程预警可提供关键拦截窗口。', realRef: '参考：战术弹道导弹' },
    hypersonic: { description: '高速且具备横向机动的滑翔目标。', tactics: '末段机动规避，考验体系预警和火力冗余。', weakness: '高价值反导层和多雷达协同能提高拦截机会。', realRef: '参考：高超声速滑翔目标概念' },
    stealth: { description: '低可探测飞机，常规雷达远距离发现概率低。', tactics: '从探测薄弱方向逼近并规避强雷达区。', weakness: '反隐身雷达和被动侦收可缩短盲区。', realRef: '参考：第五代隐身飞机' },
    swarm: { description: '大量小型无人机形成饱和攻击。', tactics: '分裂、绕行、挤压火力通道。', weakness: '电子压制和高射速近防炮效果最好。', realRef: '参考：无人机蜂群作战概念' }
};

const TERRAIN_ZONES = [
    { id: 'mountain-nw', name: '西北山地雷达高点', kind: 'mountain', x: 122, y: 95, radius: 76, detection: 1.18, lowAltitude: 0.72, speed: 0.94, avoid: 0.35, allow: ['radar', 'ew'], desc: '雷达视界更好，但不适合部署重型火力。' },
    { id: 'urban-core', name: '中心城区建筑群', kind: 'urban', x: 450, y: 300, radius: 136, detection: 0.84, lowAltitude: 0.62, speed: 0.88, avoid: 0.12, allow: ['gun', 'ew'], desc: '建筑遮蔽低空目标，限制大型导弹阵地。' },
    { id: 'coast-east', name: '东部海岸开阔带', kind: 'coast', x: 742, y: 338, radius: 94, detection: 1.06, lowAltitude: 1.02, speed: 1.05, avoid: -0.08, allow: ['gun', 'missile', 'radar', 'ew'], desc: '视野开阔，适合布置远中程火力。' },
    { id: 'industrial-sw', name: '西南工业设施区', kind: 'industrial', x: 262, y: 454, radius: 84, detection: 0.92, lowAltitude: 0.76, speed: 0.96, avoid: 0.18, allow: ['gun', 'missile', 'ew'], desc: '电磁杂波较多，雷达效率略降。' },
    { id: 'river-corridor', name: '南北河谷通道', kind: 'corridor', x: 570, y: 182, radius: 62, detection: 0.96, lowAltitude: 1.10, speed: 1.12, avoid: -0.18, allow: ['gun', 'missile', 'radar', 'ew'], desc: '低空目标易沿通道加速突入。' }
];

const MAP_CONFIG = {
    1: { centers: [{ x: CONFIG.centerX, y: CONFIG.centerY }], protectRadius: CONFIG.protectRadius },
    2: { centers: [{ x: CONFIG.centerX, y: CONFIG.centerY }, { x: 630, y: 230 }], protectRadius: 52 }
};

function seededRandom(seed) {
    let s = Math.max(1, Math.floor(seed || 1)) % 2147483647;
    return function nextRandom() {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

function getTerrainAt(x, y) {
    for (const zone of TERRAIN_ZONES) {
        if (Math.hypot(x - zone.x, y - zone.y) <= zone.radius) return zone;
    }
    return { id: 'open-air', name: '开阔空域', kind: 'open', detection: 1, lowAltitude: 1, speed: 1, avoid: 0, allow: ['gun', 'missile', 'radar', 'ew'], desc: '标准开阔区域，无额外限制。' };
}

function canDeployAt(x, y, equipType) {
    const terrain = getTerrainAt(x, y);
    if (terrain.allow && !terrain.allow.includes(equipType)) {
        return { ok: false, terrain, reason: terrain.name + '不适合部署' + getEquipmentTypeName(equipType) };
    }
    return { ok: true, terrain, reason: '' };
}

function getTerrainCombatModifiers(x, y, enemyType) {
    const terrain = getTerrainAt(x, y);
    const enemy = ENEMY_TYPES[enemyType] || {};
    const low = enemy.altitude === 'low';
    return {
        terrain,
        detection: low ? terrain.lowAltitude : terrain.detection,
        speed: terrain.speed || 1,
        avoid: terrain.avoid || 0
    };
}

function getEquipmentTypeName(type) {
    if (type === 'radar') return '雷达';
    if (type === 'missile') return '导弹阵地';
    if (type === 'gun') return '近程火力';
    if (type === 'ew') return '电子对抗';
    return type || '装备';
}

function generateDefenseSites(count, seed, width, height) {
    const rand = seededRandom(seed || Date.now());
    const w = width || 900;
    const h = height || 600;
    const targetCount = Math.max(1, Math.min(3, Math.floor(count || 1)));
    const minDist = targetCount === 3 ? 170 : 230;
    const marginX = 150;
    const marginY = 120;
    const candidates = [
        { x: 450, y: 300, value: 1.2, name: '主指挥中心' },
        { x: 235, y: 220, value: 1.0, name: '西部能源枢纽' },
        { x: 680, y: 220, value: 1.0, name: '东部通信枢纽' },
        { x: 300, y: 440, value: 0.95, name: '南部工业区' },
        { x: 690, y: 420, value: 0.95, name: '港口保障区' }
    ].map(site => ({
        x: Math.max(marginX, Math.min(w - marginX, site.x + (rand() - 0.5) * 80)),
        y: Math.max(marginY, Math.min(h - marginY, site.y + (rand() - 0.5) * 70)),
        value: site.value,
        name: site.name
    }));
    const sites = [];
    let guard = 0;
    while (sites.length < targetCount && guard < 120) {
        guard++;
        const source = candidates[Math.floor(rand() * candidates.length)] || candidates[0];
        const site = {
            id: 'city-' + (sites.length + 1),
            name: source.name,
            x: Math.round(Math.max(marginX, Math.min(w - marginX, source.x + (rand() - 0.5) * 120))),
            y: Math.round(Math.max(marginY, Math.min(h - marginY, source.y + (rand() - 0.5) * 90))),
            value: source.value,
            protectRadius: targetCount === 1 ? 60 : (targetCount === 2 ? 54 : 48)
        };
        const separated = sites.every(other => Math.hypot(site.x - other.x, site.y - other.y) >= minDist);
        if (separated) sites.push(site);
    }
    while (sites.length < targetCount) {
        const idx = sites.length;
        const fallback = [
            { x: 240, y: 210 },
            { x: 690, y: 235 },
            { x: 470, y: 445 }
        ][idx];
        sites.push({
            id: 'city-' + (idx + 1),
            name: ['主指挥中心', '东部通信枢纽', '南部工业区'][idx],
            x: fallback.x,
            y: fallback.y,
            value: idx === 0 ? 1.2 : 1,
            protectRadius: targetCount === 1 ? 60 : (targetCount === 2 ? 54 : 48)
        });
    }
    return sites;
}

function setDefenseMode(count, seed) {
    const mode = Math.max(1, Math.min(3, Math.floor(count || 1)));
    CONFIG.defenseMode = mode;
    CONFIG.mapLevel = mode;
    CONFIG.defenseSites = generateDefenseSites(mode, seed || Date.now(), 900, 600);
    CONFIG.centerX = CONFIG.defenseSites[0].x;
    CONFIG.centerY = CONFIG.defenseSites[0].y;
    CONFIG.protectRadius = CONFIG.defenseSites[0].protectRadius;
    MAP_CONFIG[mode] = {
        centers: CONFIG.defenseSites.map(site => ({ x: site.x, y: site.y, id: site.id, name: site.name, value: site.value })),
        protectRadius: CONFIG.defenseSites[0].protectRadius
    };
    return CONFIG.defenseSites;
}

function getDefenseSites() {
    if (!CONFIG.defenseSites || CONFIG.defenseSites.length === 0) {
        setDefenseMode(CONFIG.defenseMode || 1, 7);
    }
    return CONFIG.defenseSites;
}

const EnemyBrain = {
    sideNames: ['北', '东', '南', '西'],
    scoreCity(site, equipment, context) {
        const equip = equipment || [];
        let radar = 0;
        let missile = 0;
        let gun = 0;
        let ew = 0;
        equip.forEach(item => {
            const d = Math.hypot((item.x || 0) - site.x, (item.y || 0) - site.y);
            const coverage = Math.max(0, 1 - d / Math.max(item.range || 1, 1));
            if (item.type === 'radar') radar += coverage * 0.9;
            if (item.type === 'missile') missile += coverage * 1.05;
            if (item.type === 'gun') gun += coverage * 0.85;
            if (item.type === 'ew') ew += coverage * 0.7;
        });
        const memory = context?.breachesByCity?.[site.id] || CONFIG.cityThreatMemory?.[site.id] || 0;
        const terrain = getTerrainCombatModifiers(site.x, site.y, 'cruise');
        const defended = radar + missile + gun + ew;
        const weakScore = Math.max(0.15, 2.4 - defended);
        return site.value * 1.4 + weakScore + memory * 0.75 + Math.max(0, 1 - terrain.detection) * 0.45;
    },
    scoreSides(site, equipment, context) {
        const counts = [0, 0, 0, 0];
        (equipment || []).forEach(item => {
            const angle = Math.atan2((item.y || 0) - site.y, (item.x || 0) - site.x);
            const deg = ((angle * 180 / Math.PI) + 360) % 360;
            let sector;
            if (deg < 45 || deg >= 315) sector = 1;
            else if (deg >= 45 && deg < 135) sector = 2;
            else if (deg >= 135 && deg < 225) sector = 3;
            else sector = 0;
            counts[sector] += item.type === 'radar' ? 0.7 : 1;
        });
        return counts.map((coverage, side) => ({
            side,
            score: 1.5 - coverage * 0.28 + ((context?.breachedSectors || []).includes(side) ? 0.65 : 0)
        })).sort((a, b) => b.score - a.score);
    },
    adjustTypeWeights(pool, context) {
        const next = Object.assign({}, pool || {});
        const killStats = context?.killStats || {};
        Object.keys(next).forEach(type => {
            if ((killStats[type] || 0) >= 5) next[type] *= 0.62;
            if ((killStats[type] || 0) === 0) next[type] *= 1.12;
        });
        if ((context?.waveIndex || 0) >= 5) {
            next.decoy = (next.decoy || 0) + 0.45;
            next.jammer = (next.jammer || 0) + 0.32;
            next.lowObservableCruise = (next.lowObservableCruise || 0) + 0.26;
        }
        return next;
    },
    pickWeighted(pool, rand) {
        const entries = Object.entries(pool).filter(([, weight]) => weight > 0);
        const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
        let roll = (rand || Math.random)() * total;
        for (const [type, weight] of entries) {
            roll -= weight;
            if (roll <= 0) return type;
        }
        return entries[0]?.[0] || 'cruise';
    },
    chooseAttackPlan(context) {
        const rand = seededRandom((context?.seed || Date.now()) + (context?.waveIndex || 0) * 1777);
        const sites = (context?.sites && context.sites.length ? context.sites : getDefenseSites()).map(site => Object.assign({}, site));
        const rankedCities = sites
            .map(site => Object.assign(site, { brainScore: this.scoreCity(site, context?.equipment || [], context || {}) }))
            .sort((a, b) => b.brainScore - a.brainScore);
        const blueprint = WAVE_BLUEPRINTS[Math.max(0, Math.min(WAVE_BLUEPRINTS.length - 1, context?.waveIndex || 0))];
        const pool = this.adjustTypeWeights(blueprint.pool, context || {});
        const assignments = [];
        const budget = Math.max(3, blueprint.budget + sites.length * 2 + Math.floor((context?.waveIndex || 0) / 2));
        for (let i = 0; i < budget; i++) {
            const target = i < rankedCities.length
                ? rankedCities[i]
                : (i % 4 === 0 && rankedCities[1] ? rankedCities[1] : (i % 5 === 0 && rankedCities[2] ? rankedCities[2] : rankedCities[0]));
            const sides = this.scoreSides(target, context?.equipment || [], context || {});
            let type = this.pickWeighted(pool, rand);
            const role = target === rankedCities[0] && i % 3 !== 0 ? 'main' : 'feint';
            if (role === 'feint' && rand() < 0.55) type = rand() < 0.5 ? 'decoy' : 'swarm';
            assignments.push({
                type,
                targetId: target.id,
                targetX: target.x,
                targetY: target.y,
                targetName: target.name,
                role,
                forceSide: sides[Math.floor(rand() * Math.min(2, sides.length))]?.side || 0
            });
        }
        return {
            doctrine: sites.length > 1 ? '多轴牵制+主攻择弱' : '单点压力测试',
            primaryTargetId: rankedCities[0]?.id,
            cityScores: rankedCities.map(site => ({ id: site.id, name: site.name, score: Math.round(site.brainScore * 100) / 100 })),
            assignments
        };
    }
};

const WAVE_BLUEPRINTS = [
    { label: '低慢小侦察接触', difficulty: 1, delay: 110, budget: 4, pool: { microDrone: 1.4, drone: 1.0, decoy: 0.4 } },
    { label: '巡飞弹试探突入', difficulty: 1, delay: 125, budget: 5, pool: { loitering: 1.1, drone: 0.8, cruise: 0.5, decoy: 0.5 } },
    { label: '巡航导弹低空齐射', difficulty: 2, delay: 145, budget: 7, pool: { cruise: 1.2, lowObservableCruise: 0.35, drone: 0.5, decoy: 0.6 } },
    { label: '战机与巡飞弹混合攻击', difficulty: 2, delay: 165, budget: 8, pool: { fighter: 0.8, loitering: 1.0, cruise: 0.7, jammer: 0.25 } },
    { label: '电子干扰掩护突防', difficulty: 3, delay: 185, budget: 10, pool: { jammer: 0.7, lowObservableCruise: 0.7, cruise: 0.8, decoy: 0.9, drone: 0.4 } },
    { label: '无人机蜂群压迫', difficulty: 3, delay: 205, budget: 13, pool: { swarm: 1.6, microDrone: 0.9, loitering: 0.7, decoy: 0.7 } },
    { label: '隐身目标介入', difficulty: 4, delay: 225, budget: 12, pool: { stealth: 0.7, fighter: 0.8, lowObservableCruise: 0.8, jammer: 0.45 } },
    { label: '弹道目标与诱饵并进', difficulty: 4, delay: 245, budget: 14, pool: { ballistic: 0.75, decoy: 1.2, cruise: 0.7, fighter: 0.4 } },
    { label: '高超声速滑翔压力', difficulty: 5, delay: 265, budget: 16, pool: { hypersonic: 0.45, ballistic: 0.65, stealth: 0.55, jammer: 0.45, decoy: 1.0 } },
    { label: '多轴饱和联合打击', difficulty: 5, delay: 290, budget: 20, pool: { swarm: 1.3, hypersonic: 0.35, ballistic: 0.55, stealth: 0.5, lowObservableCruise: 0.8, cruise: 0.8, jammer: 0.5 } }
];

let WAVES = WAVE_BLUEPRINTS.map((blueprint, index) => generateWavePlan({ waveIndex: index, seed: 100 + index }));

function generateWavePlan(context) {
    const waveIndex = Math.max(0, Math.min(WAVE_BLUEPRINTS.length - 1, context?.waveIndex || 0));
    const blueprint = WAVE_BLUEPRINTS[waveIndex];
    const rand = seededRandom((context?.seed || Date.now()) + waveIndex * 997);
    const killStats = context?.killStats || {};
    const breaches = context?.breaches || [];
    const pool = Object.assign({}, blueprint.pool);

    Object.keys(pool).forEach(type => {
        const killed = killStats[type] || 0;
        if (killed >= 4) pool[type] *= 0.72;
        if (killed === 0 && waveIndex > 2) pool[type] *= 1.16;
    });
    if (breaches.length > 0) {
        pool.lowObservableCruise = (pool.lowObservableCruise || 0) + 0.28;
        pool.loitering = (pool.loitering || 0) + 0.22;
        pool.swarm = (pool.swarm || 0) + 0.18;
    }

    const budget = blueprint.budget + Math.floor(rand() * 3) + Math.floor(waveIndex / 3);
    const counts = {};
    for (let i = 0; i < budget; i++) {
        const entries = Object.entries(pool).filter(([, weight]) => weight > 0);
        const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
        let roll = rand() * total;
        let selected = entries[0][0];
        for (const [type, weight] of entries) {
            roll -= weight;
            if (roll <= 0) { selected = type; break; }
        }
        counts[selected] = (counts[selected] || 0) + 1;
    }

    return {
        enemies: Object.entries(counts).map(([type, count]) => ({ type, count })),
        delay: blueprint.delay,
        label: blueprint.label,
        difficulty: blueprint.difficulty,
        seed: context?.seed || 0
    };
}

function rebuildWaves(context) {
    WAVES = WAVE_BLUEPRINTS.map((blueprint, index) => generateWavePlan(Object.assign({}, context || {}, {
        waveIndex: index,
        seed: (context?.seed || Date.now()) + index * 131
    })));
    return WAVES;
}

function getWaves() {
    return WAVES;
}

const BattleLog = {
    entries: [],
    maxEntries: CONFIG.battleLogMax,
    reset() {
        this.entries = [];
        CONFIG.logicFrame = 0;
    },
    add(type, message, meta) {
        const entry = {
            frame: CONFIG.logicFrame || 0,
            time: new Date().toISOString(),
            type: type || 'system',
            message: message || '',
            meta: meta || {}
        };
        this.entries.push(entry);
        if (this.entries.length > this.maxEntries) {
            this.entries.splice(0, this.entries.length - this.maxEntries);
        }
        if (typeof UIModule !== 'undefined' && UIModule.renderBattleLog) {
            UIModule.renderBattleLog();
        }
        return entry;
    },
    snapshot(limit) {
        const count = limit || this.maxEntries;
        return this.entries.slice(-count).map(entry => Object.assign({}, entry, { meta: Object.assign({}, entry.meta || {}) }));
    }
};

const DIFFICULTY_MULTIPLIER = { 1: 1.0, 2: 1.2, 3: 1.5, 4: 1.8, 5: 2.0 };

const SCORE_RANKS = [
    { min: 0, stars: 0, title: '防线失守', desc: '城市要地遭受重创，防空体系未形成有效闭环。请重新规划装备部署。' },
    { min: 30, stars: 1, title: '初级防空', desc: '拦住了部分来袭目标，但防御边缘仍有明显漏洞。建议扩大预警雷达覆盖范围。' },
    { min: 60, stars: 2, title: '基础防空', desc: '具备基础防空能力，可应对常规打击。还需优化装备之间的交叉覆盖。' },
    { min: 85, stars: 3, title: '稳定防御', desc: '防空体系较为完善，拦截率高。注意近防炮、电子压制与防空导弹的衔接。' },
    { min: 95, stars: 4, title: '钢铁屏障', desc: '近乎完整的要地防护！分层拦截严密，雷达预警及时，装备协同精准。' },
    { min: 100, stars: 5, title: '绝对防御', desc: '满分！零突防的完美战绩，城市要地在整轮空袭中保持稳定。' }
];
