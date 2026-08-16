// ======================== 战斗推演模块（增强版 v2） ========================

const CombatModule = {
    projectiles: [],

    init() {
        this.projectiles = [];
    },

    tick() {
        if (!Game.isRunning) return;

        // 计算雷达协同加成：雷达越多，体系越早发现目标，所以这里给射程和命中率加一点加成。
        // 最高限制为 30%，防止雷达堆太多导致游戏失衡。
        const radars = EquipModule.list.filter(e => e.type === 'radar');
        const radarQuality = radars.reduce((sum, radar) => sum + (radar.detection || 0.9), 0);
        CONFIG.radarBoost = Math.min(radarQuality * 0.065, 0.34);

        const equipList = EquipModule.list;

        for (let i = 0; i < equipList.length; i++) {
            const equip = equipList[i];

            // 雷达只提供探测支持，不直接发射弹药；真正拦截由导弹和近防炮完成。
            if (equip.type === 'radar') continue;
            if (equip.ammo !== undefined && equip.ammo <= 0) {
                equip.state = 'empty';
                continue;
            }

            // 冷却递减
            if (equip.cooldown > 0) {
                equip.cooldown--;
                continue;
            }

            // 雷达协同：提升有效射程，体现“看得更早，打得更从容”。
            const effectiveRange = equip.range * (1 + CONFIG.radarBoost);

            // 智能目标选择：不是见谁打谁，而是根据装备类型选择最合适目标。
            const target = this.getBestTarget(equip.x, equip.y, effectiveRange, equip.type);
            if (!target) {
                equip.state = 'idle';
                continue;
            }

            // 开火：生成一枚导弹或一发炮弹，后面在 projectiles 循环里更新飞行轨迹。
            equip.state = 'firing';
            equip.target = target;
            equip.cooldown = equip.fireCooldown || 30;

            const projType = equip.type === 'missile' ? 'missile' : (equip.type === 'ew' ? 'pulse' : 'bullet');
            const baseAccuracy = equip.accuracy || (equip.type === 'missile' ? 0.84 : 0.7);
            const targetTerrain = typeof getTerrainCombatModifiers === 'function' ? getTerrainCombatModifiers(target.x, target.y, target.type) : { detection: 1 };
            const maneuverPenalty = Math.min((target.maneuver || 0) * 0.22, 0.2);
            const terrainPenalty = Math.max(0, 1 - targetTerrain.detection) * 0.18;
            const jamBonus = target.jammed ? target.jammed * 0.18 : 0;
            const accuracy = Math.max(0.18, Math.min(baseAccuracy + CONFIG.radarBoost + jamBonus - maneuverPenalty - terrainPenalty, 0.96));
            if (equip.ammo !== undefined && equip.ammo !== Infinity) equip.ammo--;

            this.projectiles.push({
                startX: equip.x, startY: equip.y,
                x: equip.x, y: equip.y,
                target: target,
                speed: projType === 'missile' ? 4 : 6,
                damage: Math.max(0.05, (equip.damage || 1) * (1 - (target.armor || 0) * 0.55)),
                color: equip.color,
                type: projType,
                life: 1, trail: [],
                accuracy: accuracy,
                targetX: target.x, targetY: target.y,
                distTraveled: 0
            });

            EffectModule.addHitFlash(equip.x, equip.y);
            const a2 = Math.atan2(target.y - equip.y, target.x - equip.x) + Math.PI;
            for (let p = 0; p < 3; p++) {
                EffectModule.particles.push({
                    x: equip.x, y: equip.y,
                    vx: Math.cos(a2) * (2 + Math.random() * 2),
                    vy: Math.sin(a2) * (2 + Math.random() * 2),
                    life: 0.5, decay: 0.05,
                    size: Math.random() * 2 + 1,
                    color: '#ffaa00', type: 'muzzle'
                });
            }
        }

        // 更新弹道：每一帧让弹药向目标靠近，到达目标附近后按 accuracy 做命中判定。
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];

            if (!p.target || !p.target.alive) {
                if (p.target && !p.target.alive) {
                    // 目标已被其他武器击毁
                    EffectModule.addFloatingText(p.x, p.y - 10, '· 目标已毁', '#888888');
                }
                this.projectiles.splice(i, 1);
                CONFIG.comboCount = 0;
                continue;
            }

            const dx = p.target.x - p.x;
            const dy = p.target.y - p.y;
            const dist = Math.hypot(dx, dy);

            if (dist < 8) {
                const hitRoll = Math.random();
                if (hitRoll < p.accuracy) {
                    const destroyed = EnemyModule.damageEnemy(p.target, p.damage);
                    EffectModule.addTracer(p.startX, p.startY, p.x, p.y, p.color);
                    if (destroyed) {
                        EffectModule.addFloatingText(p.x, p.y - 30, '拦截成功！', '#00ffcc');
                        // 蜂群击杀特殊提示
                        if (p.target.isSwarm) {
                            EffectModule.addFloatingText(p.x, p.y - 45, '蜂群-1', '#ff6699');
                        }
                    }
                } else {
                    EffectModule.addHitFlash(p.x, p.y);
                }
                this.projectiles.splice(i, 1);
                continue;
            }

            const speed = p.speed;
            p.x += (dx / dist) * speed;
            p.y += (dy / dist) * speed;

            if (p.distTraveled === undefined) p.distTraveled = 0;
            p.distTraveled += speed;

            if (p.distTraveled > 600) {
                this.projectiles.splice(i, 1);
                CONFIG.comboCount = 0;
            }
        }
    },

    // 智能目标选择：导弹优先威胁大的目标，近防炮优先处理蜂群和近距离目标。
    getBestTarget(x, y, range, equipType) {
        const candidates = [];
            const threatOrder = { hypersonic: 6, ballistic: 5, stealth: 4, jammer: 4, fighter: 3, lowObservableCruise: 3, cruise: 2, loitering: 2, swarm: 1, microDrone: 1, drone: 1, decoy: 0 };

        for (const e of EnemyModule.list) {
            if (!e.alive) continue;
            if (!this.canEngageTarget(e, equipType)) continue;
            const d = Math.hypot(e.x - x, e.y - y);
            if (d < range) {
                const closing = Math.hypot(e.x - CONFIG.centerX, e.y - CONFIG.centerY);
                candidates.push({ enemy: e, dist: d, closing, threat: threatOrder[e.type] || 0, isSwarm: e.isSwarm || false, isDecoy: e.decoy || false });
            }
        }

        if (candidates.length === 0) return null;

        if (equipType === 'missile') {
            candidates.sort((a, b) => b.threat - a.threat || a.closing - b.closing || a.dist - b.dist);
        } else if (equipType === 'ew') {
            candidates.sort((a, b) => (a.enemy.jamResist || 0) - (b.enemy.jamResist || 0) || a.dist - b.dist);
        } else {
            // 近防炮：蜂群和无人机优先，再按距离
            candidates.sort((a, b) => {
                if (a.isSwarm !== b.isSwarm) return b.isSwarm ? 1 : -1;
                if (a.isDecoy !== b.isDecoy) return a.isDecoy ? 1 : -1;
                return a.dist - b.dist;
            });
        }

        return candidates[0].enemy;
    },

    canEngageTarget(enemy, equipType) {
        if (!enemy.stealth) return true;
        if (enemy.stealthDetected) return true;
        if (equipType === 'ew' && enemy.signature > 0.22) return true;
        return false;
    },

    draw(ctx) {
        for (let i = 0; i < this.projectiles.length; i++) {
            const p = this.projectiles[i];

            ctx.save();
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 8;

            if (p.type === 'missile') {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();
                const angle = Math.atan2(p.target.y - p.y, p.target.x - p.x);
                ctx.beginPath();
                ctx.moveTo(p.x - Math.cos(angle) * 3, p.y - Math.sin(angle) * 3);
                ctx.lineTo(p.x - Math.cos(angle) * 6 - Math.sin(angle) * 2, p.y - Math.sin(angle) * 6 + Math.cos(angle) * 2);
                ctx.lineTo(p.x - Math.cos(angle) * 6 + Math.sin(angle) * 2, p.y - Math.sin(angle) * 6 - Math.cos(angle) * 2);
                ctx.fillStyle = '#ff880080';
                ctx.fill();
            } else if (p.type === 'pulse') {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
                ctx.strokeStyle = p.color + '55';
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffaa';
                ctx.fill();
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();
            }

            ctx.shadowBlur = 0;
            ctx.restore();
        }
    },

    clearAll() {
        this.projectiles = [];
    }
};
