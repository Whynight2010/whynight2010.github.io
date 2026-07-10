// ======================== 主入口（增强版） ========================
// 增强：战后评分、雷达协同、难度系数

const Game = {
    isRunning: false,
    enemiesKilled: 0,
    enemiesBreakthrough: 0,

    init() {
        MapModule.init('gameCanvas');
        EquipModule.init();
        EnemyModule.init();
        CombatModule.init();
        UIModule.init();
        this.loop();
    },

    loop() {
        const ctx = MapModule.ctx;
        if (!ctx) { requestAnimationFrame(() => Game.loop()); return; }

        MapModule.drawBase();

        // 绘制装备（含预览）
        EquipModule.draw(ctx);

        const simSteps = Math.max(1, Math.floor(CONFIG.simulationSpeed || 1));

        // 波次间暂停也需要更新倒计时
        if (Game.isRunning || CONFIG.interWavePhase) {
            for (let i = 0; i < simSteps; i++) {
                EnemyModule.update();
                if (Game.isRunning) CombatModule.tick();
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
    Game.init();
    setTimeout(() => {
        const cx = CONFIG.centerX, cy = CONFIG.centerY;
        EffectModule.addFloatingText(cx, cy - 80, '🛡 城市防空系统就绪', '#00e5ff');
    }, 500);
    setTimeout(() => {
        const cx = CONFIG.centerX, cy = CONFIG.centerY;
        EffectModule.addFloatingText(cx, cy - 50, '按 1/2/3 选择装备 → 点击部署 → 空格开始推演', '#8899bb');
    }, 2000);
};
