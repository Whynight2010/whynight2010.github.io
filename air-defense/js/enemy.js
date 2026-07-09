// ======================== 空袭目标模块（增强版 v2） ========================
// 增强：自适应学习路径、薄弱点分析、波次间10秒部署期、无人机蜂群行为

const EnemyModule = {
    list: [],
    waveIndex: 0,
    waveTimer: 0,
    totalSpawned: 0,
    waveActive: false,
    gameStartTime: 0,
    killedCache: 0,
    // 【新增】波次间标记
    waveComplete: false,
    waveEnemyRemaining: 0,
    // 【新增】薄弱点学习数据
    lastClosestSector: null,
    breachedSectors: [],

    init() {
        this.list = [];
        this.waveIndex = 0;
        this.waveTimer = 0;
        this.totalSpawned = 0;
        this.waveActive = false;
        this.gameStartTime = 0;
        this.waveComplete = false;
        this.waveEnemyRemaining = 0;
        this.lastClosestSector = null;
        this.breachedSectors = [];
        this._justSpawnedNextWave = false;
    },

    // 生成单个敌人（增强：支持蜂群分散生成、自适应路径策略）
    spawnEnemy(type, targetX, targetY, options) {
        options = options || {};
        const cx = targetX !== undefined ? targetX : CONFIG.centerX;
        const cy = targetY !== undefined ? targetY : CONFIG.centerY;
        const w = MapModule.canvas.width;
        const h = MapModule.canvas.height;
        const margin = 30;

        // 自适应方向选择：优先从薄弱方位进攻
        let side;
        if (options.forceSide !== undefined) {
            side = options.forceSide;
        } else if (this.breachedSectors.length > 0 && Math.random() < 0.55) {
            // 55%概率从曾经突防成功的方位进攻
            side = this.breachedSectors[Math.floor(Math.random() * this.breachedSectors.length)];
        } else if (this.lastClosestSector !== null && Math.random() < 0.35) {
            // 35%概率从上次最接近目标的方位进攻
            side = this.lastClosestSector;
        } else {
            side = Math.floor(Math.random() * 4);
        }

        let x, y;
        switch (side) {
            case 0: x = margin + Math.random() * (w - margin * 2); y = -margin; break;
            case 1: x = w + margin; y = margin + Math.random() * (h - margin * 2); break;
            case 2: x = margin + Math.random() * (w - margin * 2); y = h + margin; break;
            case 3: x = -margin; y = margin + Math.random() * (h - margin * 2); break;
        }

        const enemyType = ENEMY_TYPES[type] || ENEMY_TYPES.cruise;
        const dx = cx - x;
        const dy = cy - y;
        const dist = Math.hypot(dx, dy);

        // 路径策略（多样化）
        const pathRoll = Math.random();
        const learningFactor = Math.min(this.breachedSectors.length * 0.1, 0.4);
        let pathType;

        if (type === 'swarm') {
            // 蜂群特有：随机分散+迂回
            const r = Math.random();
            if (r < 0.3) pathType = 'swarm-direct';
            else if (r < 0.6) pathType = 'swarm-weave';
            else if (r < 0.85) pathType = 'swarm-spiral';
            else pathType = 'swarm-split';
        } else if (type === 'ballistic') {
            // 弹道导弹路径更直接
            pathType = Math.random() < 0.7 ? 'direct' : 'weave';
        } else if (type === 'stealth') {
            // 隐身目标更狡猾
            pathType = Math.random() < 0.5 ? 'evasive' : 'flanker';
        } else {
            // 通用：随难度和学习因子调整
            if (pathRoll < 0.25 - learningFactor) pathType = 'direct';
            else if (pathRoll < 0.45) pathType = 'weave';
            else if (pathRoll < 0.65) pathType = 'spiral';
            else if (pathRoll < 0.82) pathType = 'evasive';
            else pathType = 'flanker';
        }

        // 蜂群额外分散参数
        const isSwarm = enemyType.swarm === true;
        const swarmOffset = isSwarm ? {
            x: (Math.random() - 0.5) * 60,
            y: (Math.random() - 0.5) * 60
        } : { x: 0, y: 0 };

        this.list.push({
            x, y,
            targetX: cx + swarmOffset.x,
            targetY: cy + swarmOffset.y,
            finalTargetX: cx,
            finalTargetY: cy,
            vx: (dx / dist) * enemyType.speed,
            vy: (dy / dist) * enemyType.speed,
            type: type,
            hp: enemyType.hp,
            maxHp: enemyType.hp,
            speed: enemyType.speed,
            color: enemyType.color,
            size: enemyType.size,
            score: enemyType.score,
            trailColor: enemyType.trailColor,
            stealth: enemyType.stealth || false,
            stealthDetected: false,
            isSwarm: isSwarm,
            pathType: pathType,
            weavePhase: Math.random() * Math.PI * 2,
            weaveAmp: Math.random() * 20 + 5,
            spiralRadius: Math.random() * 40 + 20,
            spiralPhase: Math.random() * Math.PI * 2,
            flankAngle: Math.random() * Math.PI * 0.6 - Math.PI * 0.3,
            flankProgress: 0,
            distTraveled: 0,
            alive: true,
            reachedTarget: false,
            trail: [],
            side: side
        });

        return this.list[this.list.length - 1];
    },

    // 启动波次
    startWaves() {
        this.waveIndex = 0;
        this.waveTimer = 0;
        this.totalSpawned = 0;
        this.waveActive = true;
        this.waveComplete = false;
        this.list = [];
        this.gameStartTime = Date.now();
        this.lastClosestSector = null;
        this.breachedSectors = [];
        CONFIG.difficulty = 1;
        CONFIG.interWavePhase = false;
    },

    update() {
        // 【重要】波次间部署阶段：必须放在 isRunning 检查之前
        if (CONFIG.interWavePhase) {
            CONFIG.interWaveTimer++;
            if (CONFIG.interWaveTimer >= CONFIG.interWaveDuration) {
                // 10秒到，自动开始下一波
                CONFIG.interWavePhase = false;
                CONFIG.interWaveTimer = 0;
                Game.isRunning = true;
                this._spawnNextWave();
            }
            return;
        }

        // 波次管理
        if (this.waveActive && this.waveIndex < WAVES.length) {
            const wave = WAVES[this.waveIndex];
            this.waveTimer++;

            if (this.waveTimer === 1) {
                UIModule.showWaveAlert(wave.label, wave.difficulty, this.waveIndex + 1, WAVES.length);
                CONFIG.difficulty = wave.difficulty;
                this.waveComplete = false;
            }

            if (this.waveTimer >= wave.delay && this.list.length === 0) {
                this._spawnWaveEnemies(wave);
                this.waveIndex++;
                this.waveTimer = 0;
            }
        } else if (this.waveActive && this.waveIndex >= WAVES.length && this.list.length === 0 && !this.waveComplete) {
            // 最终波次完成
            this.waveComplete = true;
            this.waveActive = false;
            CONFIG.demoMode = false;
            Game.isRunning = false;
            document.getElementById('btnStart').textContent = '▶ 开始推演';
            UIModule.showBattleReport();
        }

        // 检查当前波次是否已清空，触发波次间暂停
        if (this._justSpawnedNextWave && this.list.length > 0) {
            this._justSpawnedNextWave = false;
        }
        if (this.waveActive && this.waveIndex > 0 && this.waveIndex < WAVES.length && this.list.length === 0 && !CONFIG.interWavePhase && !this.waveComplete && !this._justSpawnedNextWave) {
            this._triggerInterWave();
        }

        const cx = CONFIG.centerX;
        const cy = CONFIG.centerY;
        const w = MapModule.canvas.width;
        const h = MapModule.canvas.height;

        // 分析薄弱点：追踪最接近目标的敌人方位
        let closestDist = Infinity;
        for (const e of this.list) {
            if (!e.alive) continue;
            const d = Math.hypot(e.x - cx, e.y - cy);
            if (d < closestDist) {
                closestDist = d;
                const angle = Math.atan2(e.y - cy, e.x - cx);
                const deg = ((angle * 180 / Math.PI) + 360) % 360;
                if (deg < 45 || deg >= 315) this.lastClosestSector = 1;      // 右
                else if (deg >= 45 && deg < 135) this.lastClosestSector = 2; // 下
                else if (deg >= 135 && deg < 225) this.lastClosestSector = 3; // 左
                else this.lastClosestSector = 0;                              // 上
            }
        }

        // 更新雷达对隐身目标的探测
        const radars = EquipModule.list.filter(e => e.type === 'radar');
        for (const e of this.list) {
            if (!e.alive) continue;
            if (e.stealth && !e.stealthDetected) {
                for (const r of radars) {
                    const d = Math.hypot(e.x - r.x, e.y - r.y);
                    if (r.modelId === 'radar_jy27' && d < r.range * 0.5) { e.stealthDetected = true; break; }
                    if (r.modelId === 'radar_fc' && d < r.range * 0.25) { e.stealthDetected = true; break; }
                }
            }
        }

        // 更新敌人位置
        CONFIG.threatLevel = 0;
        for (let i = this.list.length - 1; i >= 0; i--) {
            const e = this.list[i];
            if (!e.alive) continue;

            this._updateEnemyPath(e);

            e.x += e.vx;
            e.y += e.vy;
            e.distTraveled += e.speed;

            // 尾迹
            if (Math.floor(e.distTraveled) % 3 === 0) {
                e.trail.push({ x: e.x, y: e.y, life: 1 });
                if (e.trail.length > 20) e.trail.shift();
            }

            // 到达目标判定
            const distToCenter = Math.hypot(e.x - e.finalTargetX || cx, e.y - e.finalTargetY || cy);
            if (distToCenter < CONFIG.protectRadius && !e.reachedTarget) {
                e.reachedTarget = true;
                // 记录突防方位
                const angle = Math.atan2(e.y - cy, e.x - cx);
                const deg = ((angle * 180 / Math.PI) + 360) % 360;
                let sector;
                if (deg < 45 || deg >= 315) sector = 1;
                else if (deg >= 45 && deg < 135) sector = 2;
                else if (deg >= 135 && deg < 225) sector = 3;
                else sector = 0;
                if (!this.breachedSectors.includes(sector)) {
                    this.breachedSectors.push(sector);
                }
                CONFIG.lastBreakthroughPos = { x: e.x, y: e.y };

                EffectModule.addExplosion(e.x, e.y, '#ff0000', 3);
                EffectModule.addFloatingText(e.x, e.y - 20, '⚠ 突防！', '#ff4444');
                UIModule.onEnemyBreakthrough();
            }

            // 超出画布移除
            if (e.x < -100 || e.x > w + 100 || e.y < -100 || e.y > h + 100) {
                e.alive = false;
                this.list.splice(i, 1);
                // 分析：敌人从哪个方向消失（防御成功的方位）
                continue;
            }

            // 威胁等级
            const threatDist = Math.hypot(e.x - cx, e.y - cy);
            if (threatDist < 250) {
                CONFIG.threatLevel = Math.max(CONFIG.threatLevel, (1 - threatDist / 250));
            }
        }

        // 更新数据面板
        UIModule.updateData(
            this.totalSpawned,
            Game.enemiesKilled || 0,
            Game.enemiesBreakthrough || 0
        );
    },

    // 【新增】内部：触发波次间暂停
    _triggerInterWave() {
        CONFIG.interWavePhase = true;
        CONFIG.interWaveTimer = 0;
        Game.isRunning = false;
        const nextWave = WAVES[this.waveIndex];
        CONFIG.nextWaveLabel = nextWave ? nextWave.label : '下一波';
        UIModule.showInterWaveCountdown(this.waveIndex + 1, WAVES.length, CONFIG.nextWaveLabel);
    },

    // 【新增】内部：生成波次敌人
    _spawnWaveEnemies(wave) {
        // 统计本波敌人总数，用于学习型分配
        let totalEnemies = 0;
        wave.enemies.forEach(e => totalEnemies += e.count);

        let globalIdx = 0;
        wave.enemies.forEach(e => {
            for (let i = 0; i < e.count; i++) {
                const idx = globalIdx++;
                setTimeout(() => {
                    if (Game.isRunning || CONFIG.interWavePhase) {
                        // 自适应：部分敌人从薄弱方向进攻
                        const opts = {};
                        if (idx < Math.ceil(totalEnemies * 0.4) && this.breachedSectors.length > 0) {
                            opts.forceSide = this.breachedSectors[idx % this.breachedSectors.length];
                        }
                        this.spawnEnemy(e.type, undefined, undefined, opts);
                        this.totalSpawned++;
                    }
                }, idx * 600);
            }
        });
    },

    // 【新增】内部：生成下一波
    _spawnNextWave() {
        if (this.waveIndex < WAVES.length) {
            this.waveTimer = 0;
            // 立即生成
            this._spawnWaveEnemies(WAVES[this.waveIndex]);
            this.waveIndex++;
            this.waveTimer = 0;
            this._justSpawnedNextWave = true;
        }
    },

    // 【增强】更新单敌路径（新增多种路径类型）
    _updateEnemyPath(e) {
        const cx = e.finalTargetX || CONFIG.centerX;
        const cy = e.finalTargetY || CONFIG.centerY;
        const dx = cx - e.x;
        const dy = cy - e.y;
        const dist = Math.hypot(dx, dy);

        switch (e.pathType) {
            case 'direct':
                if (dist > 5) {
                    e.vx = (dx / dist) * e.speed;
                    e.vy = (dy / dist) * e.speed;
                }
                break;

            case 'weave':
                e.weavePhase += 0.03;
                if (dist > 5) {
                    e.vx = (dx / dist) * e.speed + Math.cos(e.weavePhase) * e.weaveAmp * 0.02;
                    e.vy = (dy / dist) * e.speed + Math.sin(e.weavePhase) * 0.2;
                }
                break;

            case 'spiral':
                e.spiralPhase += 0.02;
                const spiralR = e.spiralRadius * (1 - dist / 500);
                if (dist > 5) {
                    e.vx = (dx / dist) * e.speed + Math.cos(e.spiralPhase) * spiralR * 0.015;
                    e.vy = (dy / dist) * e.speed + Math.sin(e.spiralPhase) * spiralR * 0.015;
                }
                break;

            case 'evasive':
                e.weavePhase += 0.04;
                if (dist > 5) {
                    const evadeAmp = 0.5;
                    e.vx = (dx / dist) * e.speed + Math.cos(e.weavePhase) * evadeAmp;
                    e.vy = (dy / dist) * e.speed + Math.sin(e.weavePhase * 1.7) * evadeAmp;
                }
                break;

            // 【新增】侧翼包抄
            case 'flanker':
                e.flankProgress += 0.008;
                const flankAngle = e.flankAngle * (1 - e.flankProgress);
                const baseAngle = Math.atan2(dy, dx);
                const angle = baseAngle + flankAngle;
                e.vx = Math.cos(angle) * e.speed;
                e.vy = Math.sin(angle) * e.speed;
                break;

            // 【新增】蜂群直飞+小偏移
            case 'swarm-direct':
                if (dist > 5) {
                    const wobble = Math.sin(e.weavePhase) * 0.15;
                    e.weavePhase += 0.05;
                    e.vx = (dx / dist) * e.speed + wobble;
                    e.vy = (dy / dist) * e.speed + Math.cos(e.weavePhase) * 0.15;
                }
                break;

            // 【新增】蜂群迂回
            case 'swarm-weave':
                e.weavePhase += 0.04;
                if (dist > 5) {
                    e.vx = (dx / dist) * e.speed + Math.cos(e.weavePhase) * 0.4;
                    e.vy = (dy / dist) * e.speed + Math.sin(e.weavePhase * 1.3) * 0.4;
                }
                break;

            // 【新增】蜂群螺旋接近
            case 'swarm-spiral':
                e.spiralPhase += 0.03;
                const sr = 25 * (1 - dist / 400);
                if (dist > 5) {
                    e.vx = (dx / dist) * e.speed + Math.cos(e.spiralPhase) * sr * 0.02;
                    e.vy = (dy / dist) * e.speed + Math.sin(e.spiralPhase) * sr * 0.02;
                }
                break;

            // 【新增】蜂群分流（中途改变目标偏移）
            case 'swarm-split':
                e.flankProgress += 0.01;
                const splitAngle = e.flankAngle * Math.sin(e.flankProgress * 3);
                if (dist > 5) {
                    e.vx = (dx / dist) * e.speed + Math.cos(splitAngle) * 0.5;
                    e.vy = (dy / dist) * e.speed + Math.sin(splitAngle) * 0.5;
                }
                // 超出一定距离后回归直接路径
                if (e.flankProgress > 0.4) {
                    e.pathType = 'swarm-direct';
                }
                break;
        }

        // 隐式向目标中心收敛
        if (dist > 200 && e.pathType !== 'flanker') {
            const pullStrength = 0.02;
            e.vx += (dx / dist) * e.speed * pullStrength;
            e.vy += (dy / dist) * e.speed * pullStrength;
        }
    },

    draw(ctx) {
        for (let i = 0; i < this.list.length; i++) {
            const e = this.list[i];
            if (!e.alive) continue;

            const stealthAlpha = (e.stealth && !e.stealthDetected) ? 0.15 : 1;
            if (e.stealth && !e.stealthDetected) ctx.globalAlpha = 0.15;
            if (e.isSwarm) ctx.globalAlpha = Math.min(ctx.globalAlpha, 0.85);

            // 尾迹
            for (let j = 0; j < e.trail.length; j++) {
                const t = e.trail[j];
                const alpha = (j / e.trail.length) * 0.4 * stealthAlpha;
                ctx.beginPath();
                ctx.arc(t.x, t.y, e.size * 0.5 * (j / e.trail.length), 0, Math.PI * 2);
                ctx.fillStyle = Utils.hexToRgba(e.trailColor, alpha * 0.6);
                ctx.fill();
            }

            ctx.save();
            ctx.shadowColor = e.color;
            ctx.shadowBlur = e.isSwarm ? 6 : 15 * stealthAlpha;

            const angle = Math.atan2(e.vy, e.vx);

            if (e.isSwarm) {
                // 蜂群 - 小菱形
                ctx.save();
                ctx.translate(e.x, e.y);
                ctx.rotate(angle);
                ctx.fillStyle = e.color;
                ctx.beginPath();
                ctx.moveTo(e.size + 1, 0);
                ctx.lineTo(0, -e.size);
                ctx.lineTo(-e.size - 1, 0);
                ctx.lineTo(0, e.size);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#ffffff30';
                ctx.lineWidth = 0.5;
                ctx.stroke();
                ctx.restore();
            } else if (e.type === 'cruise') {
                ctx.save();
                ctx.translate(e.x, e.y);
                ctx.rotate(angle);
                ctx.fillStyle = e.color;
                ctx.beginPath();
                ctx.ellipse(0, 0, e.size + 2, e.size * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ff660080';
                ctx.beginPath();
                ctx.moveTo(-e.size - 3, -2);
                ctx.lineTo(-e.size - 6, 0);
                ctx.lineTo(-e.size - 3, 2);
                ctx.fill();
                ctx.restore();
            } else if (e.type === 'fighter') {
                ctx.save();
                ctx.translate(e.x, e.y);
                ctx.rotate(angle);
                ctx.fillStyle = e.color;
                ctx.beginPath();
                ctx.moveTo(e.size + 3, 0);
                ctx.lineTo(-e.size, -e.size * 0.7);
                ctx.lineTo(-e.size * 0.5, 0);
                ctx.lineTo(-e.size, e.size * 0.7);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else if (e.type === 'ballistic') {
                ctx.save();
                ctx.translate(e.x, e.y);
                ctx.rotate(angle);
                ctx.fillStyle = e.color;
                ctx.beginPath();
                ctx.moveTo(e.size + 3, 0);
                ctx.lineTo(0, -e.size * 0.6);
                ctx.lineTo(-e.size * 0.5, 0);
                ctx.lineTo(0, e.size * 0.6);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else if (e.type === 'stealth') {
                ctx.save();
                ctx.translate(e.x, e.y);
                ctx.rotate(angle);
                ctx.fillStyle = e.color;
                ctx.beginPath();
                ctx.moveTo(e.size + 4, 0);
                ctx.lineTo(-e.size * 0.8, -e.size * 0.6);
                ctx.lineTo(-e.size * 1.5, 0);
                ctx.lineTo(-e.size * 0.8, e.size * 0.6);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#ffffff40';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.restore();
            } else {
                ctx.beginPath();
                ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
                ctx.fillStyle = e.color;
                ctx.fill();
                ctx.strokeStyle = e.color + '80';
                ctx.lineWidth = 1;
                const rot = Date.now() * 0.01;
                for (let r = 0; r < 4; r++) {
                    const ra = rot + r * Math.PI / 2;
                    ctx.beginPath();
                    ctx.moveTo(e.x, e.y);
                    ctx.lineTo(e.x + Math.cos(ra) * e.size * 2, e.y + Math.sin(ra) * e.size * 2);
                    ctx.stroke();
                }
            }

            ctx.shadowBlur = 0;
            ctx.restore();

            if (e.stealth && !e.stealthDetected) {
                ctx.fillStyle = '#ffffff30';
                ctx.font = '10px "Microsoft Yahei", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('?', e.x, e.y - e.size - 8);
            }

            // 血条
            if (e.maxHp > 0.5 && !e.isSwarm) {
                const hpW = e.size * 3;
                const hpH = 2;
                const hpX = e.x - hpW / 2;
                const hpY = e.y - e.size - 6;
                ctx.fillStyle = '#ff000060';
                ctx.fillRect(hpX, hpY, hpW, hpH);
                ctx.fillStyle = '#00ff00';
                ctx.fillRect(hpX, hpY, hpW * (e.hp / e.maxHp), hpH);
            } else if (e.isSwarm && e.maxHp > 0.1) {
                const hpW = e.size * 2;
                ctx.fillStyle = '#ff000060';
                ctx.fillRect(e.x - hpW / 2, e.y - e.size - 3, hpW, 1);
                ctx.fillStyle = '#00ff00';
                ctx.fillRect(e.x - hpW / 2, e.y - e.size - 3, hpW * (e.hp / e.maxHp), 1);
            }

            ctx.globalAlpha = 1;
        }
    },

    clearAll() {
        this.list = [];
        this.waveIndex = 0;
        this.waveTimer = 0;
        this.totalSpawned = 0;
        this.waveActive = false;
        this.waveComplete = false;
        this.breachedSectors = [];
        this.lastClosestSector = null;
        this._justSpawnedNextWave = false;
        CONFIG.lastBreakthroughPos = null;
        CONFIG.interWavePhase = false;
        CONFIG.interWaveTimer = 0;
    },

    getNearestInRange(x, y, range) {
        let nearest = null;
        let minDist = range;
        for (const e of this.list) {
            if (!e.alive) continue;
            if (e.stealth && !e.stealthDetected) continue;
            const d = Math.hypot(e.x - x, e.y - y);
            if (d < minDist) { minDist = d; nearest = e; }
        }
        return nearest;
    },

    damageEnemy(enemy, damage) {
        enemy.hp -= damage;
        EffectModule.addHitFlash(enemy.x, enemy.y);
        if (enemy.hp <= 0) {
            const baseScore = enemy.score;
            const difficultyMult = DIFFICULTY_MULTIPLIER[CONFIG.difficulty] || 1;
            const finalScore = Math.floor(baseScore * difficultyMult);

            CONFIG.comboCount++;
            if (CONFIG.comboCount > CONFIG.maxCombo) CONFIG.maxCombo = CONFIG.comboCount;

            const comboBonus = CONFIG.comboCount >= 3 ? Math.floor(CONFIG.comboCount * 5 * difficultyMult) : 0;
            CONFIG.score = (CONFIG.score || 0) + finalScore + comboBonus;
            CONFIG.scoreDetail.kills += finalScore;
            CONFIG.scoreDetail.comboBonus += comboBonus;
            Game.enemiesKilled = (Game.enemiesKilled || 0) + 1;

            const typeKey = enemy.type;
            if (CONFIG.killStats[typeKey] !== undefined) CONFIG.killStats[typeKey]++;

            if (enemy.isSwarm) {
                EffectModule.addExplosion(enemy.x, enemy.y, enemy.color, enemy.size + 1);
            } else {
                EffectModule.addExplosion(enemy.x, enemy.y, enemy.color, enemy.size + 2);
            }
            if (comboBonus > 0) {
                EffectModule.addFloatingText(enemy.x, enemy.y - 35, '🔥 连击 x' + CONFIG.comboCount + '!', '#ffcc00');
            }
            EffectModule.addFloatingText(enemy.x, enemy.y - 15, '+' + finalScore, '#00ff88');

            enemy.alive = false;
            const idx = this.list.indexOf(enemy);
            if (idx >= 0) this.list.splice(idx, 1);
            return true;
        }
        return false;
    }
};






