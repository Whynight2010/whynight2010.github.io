// ======================== 主入口（增强版） ========================
// 增强：战后评分、雷达协同、难度系数

const Game = {
    isRunning: false,
    enemiesKilled: 0,
    enemiesBreakthrough: 0,

    init() {
        // 答辩讲法：init 是项目启动顺序，先初始化地图，再初始化装备、敌人、战斗、UI，最后进入循环。
        MapModule.init('gameCanvas');
        EquipModule.init();
        EnemyModule.init();
        CombatModule.init();
        UIModule.init();
        this.loop();
    },

    loop() {
        // 答辩讲法：loop 是整个模拟的“心跳”，浏览器每一帧都会执行一次。
        // 一帧里先画底图，再更新战斗逻辑，最后画敌人、弹道、爆炸特效和 UI 提示。
        const ctx = MapModule.ctx;
        if (!ctx) { requestAnimationFrame(() => Game.loop()); return; }

        MapModule.drawBase();

        // 绘制装备（含预览）
        EquipModule.draw(ctx);

        const simSteps = Math.max(1, Math.floor(CONFIG.simulationSpeed || 1));

        // 倍速原理：5倍速不是把画面硬加速，而是在一帧里多跑几次“敌人移动+拦截计算”。
        // 这样展示时能更快打完整轮，同时画面刷新仍然稳定。
        if (CONFIG.interWavePhase) {
            EnemyModule.updateInterWaveCountdown();
        } else if (Game.isRunning) {
            for (let i = 0; i < simSteps; i++) {
                EnemyModule.update();
                if (CONFIG.interWavePhase || !Game.isRunning) break;
                CombatModule.tick();
            }
        }

        // 绘制敌人
        EnemyModule.draw(ctx);

        // 绘制弹道
        CombatModule.draw(ctx);

        // 绘制特效
        EffectModule.updateAndDraw(ctx);

        // UI叠加层
        UIModule.drawOverlay(ctx);

        // 更新分数
        if (Game.isRunning) {
            Game.enemiesKilled = Game.enemiesKilled || 0;
            document.getElementById('dataTotal').textContent = EnemyModule.totalSpawned;
            document.getElementById('dataKill').textContent = Game.enemiesKilled;
        }

        requestAnimationFrame(() => Game.loop());
    }
};

window.onload = function() {
    // 页面加载完成后启动游戏，并给出两条浮动提示，方便观众知道怎么操作。
    Game.init();
    setTimeout(() => {
        const cx = CONFIG.centerX, cy = CONFIG.centerY;
        EffectModule.addFloatingText(cx, cy - 80, '🛡 城市防空系统就绪', '#B8DADD');
    }, 500);
    setTimeout(() => {
        const cx = CONFIG.centerX, cy = CONFIG.centerY;
        EffectModule.addFloatingText(cx, cy - 50, '按 1/2/3 选择装备 → 点击部署 → 空格开始推演', '#94B2B8');
    }, 2000);
};
