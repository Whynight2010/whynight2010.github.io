// ======================== UI交互模块（增强版 v2） ========================
// 新增：敌人情报面板、波次间倒计时、战后量化分析

const UIModule = {
    waveAlertTimer: 0,
    waveAlertText: '',
    waveDifficulty: 1,
    waveNum: 1,
    waveTotal: 1,
    comboFlashTimer: 0,
    interWaveActive: false,
    interWaveSeconds: 10,
    interWaveTimer: 0,

    init() {
        this.initTab();
        this.initSubTabs();
        this.initBackHome();
        this.initScienceNav();
        this.initEquipSelect();
        this.initButtons();
        this.initRangeToggle();
        this.initClosePanel();
        this.initCanvasTooltip();
        this.initKeyboard();
        this.initCanvasResize();
        this.initEnemyInfoPanel();
    },

    // 【新增】右侧面板子选项卡
    initSubTabs() {
        const subBtns = document.querySelectorAll('.sub-tab-btn');
        const subContents = document.querySelectorAll('.sub-tab-content');
        subBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                subBtns.forEach(b => b.classList.remove('active'));
                subContents.forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                const targetId = 'subtab-' + btn.getAttribute('data-subtab');
                const target = document.getElementById(targetId);
                if (target) target.classList.add('active');
            });
        });
    },

    initBackHome() {
        const btn = document.getElementById('btnBackHome');
        if (!btn) return;
        btn.addEventListener('click', () => {
            window.location.href = '../index.html';
        });
    },

    // 【新增】敌人信息面板渲染
    initEnemyInfoPanel() {
        const container = document.getElementById('enemyInfoList');
        if (!container) return;
        let html = '';
        const types = ['cruise', 'fighter', 'drone', 'ballistic', 'stealth', 'swarm'];
        types.forEach(type => {
            const data = ENEMY_TYPES[type];
            const enc = ENEMY_ENCYCLOPEDIA[type];
            const stealthTag = data.stealth ? ' <span class="stealth-tag">隐身</span>' : '';
            const swarmTag = data.swarm ? ' <span class="swarm-tag">蜂群</span>' : '';
            html += '<div class="enemy-info-card" data-type="' + type + '">';
            html += '<div class="enemy-info-header">';
            html += '<span class="enemy-info-icon">' + data.icon + '</span>';
            html += '<span class="enemy-info-name">' + data.name + stealthTag + swarmTag + '</span>';
            html += '<span class="enemy-info-category">' + data.category + '</span>';
            html += '</div>';
            html += '<div class="enemy-info-detail">';
            html += '<div class="enemy-info-row"><span>血量</span><span>' + data.hp + '</span></div>';
            html += '<div class="enemy-info-row"><span>速度</span><span>' + data.speed + '</span></div>';
            html += '<div class="enemy-info-row"><span>威胁等级</span><span>' + data.threat + '</span></div>';
            html += '<div class="enemy-info-row"><span>分数</span><span>' + data.score + '</span></div>';
            html += '<div class="enemy-info-row"><span>克制装备</span><span>' + data.counter + '</span></div>';
            html += '<div class="enemy-info-desc">' + enc.description + '</div>';
            html += '</div></div>';
        });
        container.innerHTML = html;

        // 点击展开/收起
        container.querySelectorAll('.enemy-info-card').forEach(card => {
            card.addEventListener('click', () => {
                const was = card.classList.contains('expanded');
                container.querySelectorAll('.enemy-info-card').forEach(c => c.classList.remove('expanded'));
                if (!was) card.classList.add('expanded');
            });
        });
    },

    // 键盘快捷键
    initKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            switch (e.key.toLowerCase()) {
                case '1': document.querySelector('.equip-item[data-type="gun"]')?.click(); break;
                case '2': document.querySelector('.equip-item[data-type="missile"]')?.click(); break;
                case '3': document.querySelector('.equip-item[data-type="radar"]')?.click(); break;
                case 'escape': EquipModule.cancelSelect(); break;
                case 'r': if (e.ctrlKey) { e.preventDefault(); document.getElementById('btnReset').click(); } break;
                case ' ': e.preventDefault(); document.getElementById('btnStart').click(); break;
                case 'f': if (e.ctrlKey) { e.preventDefault(); document.getElementById('btnAuto2').click(); } break;
                case 'g': document.getElementById('toggleRange').click(); break;
            }
        });
    },

    initCanvasResize() {
        const canvas = MapModule.canvas;
        if (!canvas) return;
        const container = canvas.parentElement;
        if (!container) return;

        const applyCanvasSize = () => {
            const maxW = Math.max(260, container.clientWidth - 40);
            const maxH = Math.max(180, container.clientHeight - 40);
            const ratio = 900 / 600;
            let w, h;
            if (maxW / maxH > ratio) { h = maxH; w = h * ratio; }
            else { w = maxW; h = w / ratio; }
            canvas.style.width = Math.max(260, Math.floor(w)) + 'px';
            canvas.style.height = Math.max(180, Math.floor(h)) + 'px';
            EquipModule.updateCanvasScale();
        };
        const scheduleCanvasResize = () => requestAnimationFrame(applyCanvasSize);
        this.resizeCanvas = scheduleCanvasResize;
        window.addEventListener('resize', Utils.debounce(scheduleCanvasResize, 120));
        window.addEventListener('orientationchange', scheduleCanvasResize);
        if ('ResizeObserver' in window) {
            new ResizeObserver(scheduleCanvasResize).observe(container);
        }
        scheduleCanvasResize();
    },

    initTab() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(btn.getAttribute('data-tab')).classList.add('active');
                requestAnimationFrame(() => UIModule.resizeCanvas && UIModule.resizeCanvas());
            });
        });
    },

    initScienceNav() {
        const navBox = document.getElementById('scienceNavList');
        const contentBox = document.getElementById('scienceContent');
        if (!navBox || !contentBox) return;
        SCIENCE_DATA.forEach((item, index) => {
            const navItem = document.createElement('div');
            navItem.className = 'science-nav-item' + (index === 0 ? ' active' : '');
            navItem.textContent = item.name;
            navItem.dataset.id = item.id;
            navItem.addEventListener('click', () => {
                document.querySelectorAll('.science-nav-item').forEach(el => el.classList.remove('active'));
                navItem.classList.add('active');
                this.renderScienceContent(item, contentBox);
            });
            navBox.appendChild(navItem);
        });
        this.renderScienceContent(SCIENCE_DATA[0], contentBox);
    },

    renderScienceContent(data, container) {
        let html = '<div class="archive-eyebrow">01 / 防空档案 · 装备笔记</div>';
        html += '<div class="science-title">' + data.name + '</div>';
        if (data.image) {
            html += '<div class="science-image-box"><img src="assets/images/' + data.image + '" alt="' + data.name + '" onerror="this.onerror=null;this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\';"><div class="image-placeholder"><span>图片资源：' + data.image + '<br>请将对应配图放入 assets/images 文件夹</span></div></div>';
        }
        html += '<div class="science-summary">' + data.summary + '</div>';
        if (data.models && data.models.length) {
            html += '<div class="science-section"><h4>代表型号</h4>';
            data.models.forEach(model => {
                html += '<div class="model-card"><div class="model-name">' + model.name + '</div><div class="model-desc">' + model.desc + '</div></div>';
            });
            html += '</div>';
        }
        if (data.sections) {
            data.sections.forEach(section => {
                html += '<div class="science-section"><h4>' + section.title + '</h4><p>' + section.content + '</p></div>';
            });
        }
        if (data.params && data.params.length) {
            html += '<div class="science-section"><h4>技术参数</h4><div class="science-params">';
            data.params.forEach(param => {
                html += '<div class="param-card"><div class="label">' + param.label + '</div><div class="value">' + param.value + '</div></div>';
            });
            html += '</div></div>';
        }
        container.innerHTML = html;
    },

    initEquipSelect() {
        const equipItems = document.querySelectorAll('.equip-item');
        const modelPanel = document.getElementById('modelPanel');
        const modelList = document.getElementById('modelList');
        equipItems.forEach(item => {
            item.addEventListener('click', () => {
                if (Game.isRunning) return;
                equipItems.forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                const type = item.getAttribute('data-type');
                const typeData = EQUIP_DATA[type];
                if (!typeData) return;
                modelList.innerHTML = '';
                typeData.models.forEach(model => {
                    const modelItem = document.createElement('div');
                    modelItem.className = 'model-item';
                    modelItem.textContent = model.name;
                    modelItem.addEventListener('mouseenter', (e) => { this.showTooltip(e, model, typeData); });
                    modelItem.addEventListener('mousemove', (e) => { this.moveTooltip(e); });
                    modelItem.addEventListener('mouseleave', () => { this.hideTooltip(); });
                    modelItem.addEventListener('click', (e) => {
                        e.stopPropagation();
                        document.querySelectorAll('.model-item').forEach(el => el.classList.remove('selected'));
                        modelItem.classList.add('selected');
                        EquipModule.selectedModel = {
                            id: model.id, name: model.name, type: type,
                            range: model.range, damage: model.damage,
                            fireRate: model.fireRate, fireCooldown: model.fireCooldown || 30,
                            cost: model.cost || 30,
                            desc: model.desc
                        };
                        setTimeout(() => { modelPanel.classList.remove('active'); }, 600);
                        EffectModule.addFloatingText(CONFIG.centerX, CONFIG.centerY - 60, '点击航图布设 ' + model.name, '#7BE7FF');
                    });
                    modelList.appendChild(modelItem);
                });
                modelPanel.classList.add('active');
            });
        });
    },

    initClosePanel() {
        const closeBtn = document.getElementById('closeModelPanel');
        const modelPanel = document.getElementById('modelPanel');
        if (!closeBtn || !modelPanel) return;
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            modelPanel.classList.remove('active');
        });
    },

    initButtons() {
        document.getElementById('btnSelectMode').addEventListener('click', () => { EquipModule.cancelSelect(); });

        document.getElementById('btnReset').addEventListener('click', () => {
            if (Game.isRunning) return;
            EquipModule.clearAll();
            EnemyModule.clearAll();
            CombatModule.clearAll();
            EffectModule.clearAll();
            this.updateData(0, 0, 0);
            CONFIG.comboCount = 0; CONFIG.maxCombo = 0;
            CONFIG.score = 0; CONFIG.scoreDetail = { kills: 0, comboBonus: 0, defenseRate: 0, timeBonus: 0, noBreakBonus: 0 };
            CONFIG.killStats = { cruise: 0, fighter: 0, drone: 0, ballistic: 0, stealth: 0, swarm: 0 };
            CONFIG.difficulty = 1; CONFIG.radarBoost = 0;
            CONFIG.interWavePhase = false; CONFIG.interWaveTimer = 0;
           CONFIG.lastBreakthroughPos = null;
           Game.enemiesKilled = 0; Game.enemiesBreakthrough = 0;
            this.hideBattleReport();
        });

        document.getElementById('btnStart').addEventListener('click', () => {
            if (EquipModule.list.length === 0) {
                const btn = document.getElementById('btnStart');
                btn.classList.add('btn-shake');
                setTimeout(() => btn.classList.remove('btn-shake'), 500);
                EffectModule.addFloatingText(CONFIG.centerX, CONFIG.centerY - 40, '⚠ 请先部署防空装备', '#FF5C5C');
                return;
            }
            Game.isRunning = !Game.isRunning;
            document.getElementById('btnStart').textContent = Game.isRunning ? '⏸ 暂停推演' : '▶ 开始推演';
            if (Game.isRunning) {
                EnemyModule.startWaves();
                EffectModule.addFloatingText(CONFIG.centerX, CONFIG.centerY - 60, '⚡ 防空系统启动', '#7BE7FF');
                CONFIG.threatLevel = 0;
                this.hideBattleReport();
            } else {
                EffectModule.addFloatingText(CONFIG.centerX, CONFIG.centerY - 60, '⏸ 推演暂停', '#A8C7D8');
            }
        });


// 【增强】定义 4 套一键部署方案
        const DEPLOY_PLANS = {
            basic: {
                name: '基础防御型',
                desc: '4件标配装备，覆盖基本防御需求',
                items: [
                    { type: 'radar',   modelId: 'radar_jy27',    xOff: 0,    yOff: -130 },
                    { type: 'missile', modelId: 'missile_hq9b',  xOff: -130, yOff: -40 },
                    { type: 'gun',     modelId: 'gun_1130',      xOff: -70,  yOff: 90 },
                    { type: 'gun',     modelId: 'gun_ld2000',    xOff: 70,   yOff: 90 }
                ]
            },
            balanced: {
                name: '均衡防御型',
                desc: '5件装备均衡配置，雷达-导弹-近防炮完整防御链',
                items: [
                    { type: 'radar',   modelId: 'radar_jy27',    xOff: 0,    yOff: -130 },
                    { type: 'missile', modelId: 'missile_hq9b',  xOff: -130, yOff: -40 },
                    { type: 'missile', modelId: 'missile_hq16b', xOff: 130,  yOff: -40 },
                    { type: 'gun',     modelId: 'gun_1130',      xOff: -80,  yOff: 90 },
                    { type: 'gun',     modelId: 'gun_ld2000',    xOff: 80,   yOff: 90 }
                ]
            },
            antistealth: {
                name: '强化反隐身型',
                desc: '双雷达+双导弹，专克隐身战机与弹道导弹',
                items: [
                    { type: 'radar',   modelId: 'radar_jy27',    xOff: -60,  yOff: -120 },
                    { type: 'radar',   modelId: 'radar_fc',      xOff: 60,   yOff: -120 },
                    { type: 'missile', modelId: 'missile_hq9b',  xOff: -140, yOff: -30 },
                    { type: 'missile', modelId: 'missile_hq16b', xOff: 140,  yOff: -30 },
                    { type: 'gun',     modelId: 'gun_1130',      xOff: 0,    yOff: 90 }
                ]
            },
            firepower: {
                name: '密集火力型',
                desc: '3座近防炮+导弹，弹幕覆盖应对蜂群饱和攻击',
                items: [
                    { type: 'radar',   modelId: 'radar_jy27',    xOff: 0,    yOff: -130 },
                    { type: 'missile', modelId: 'missile_hq16b', xOff: 0,    yOff: -40 },
                    { type: 'gun',     modelId: 'gun_1130',      xOff: -90,  yOff: 80 },
                    { type: 'gun',     modelId: 'gun_1130',      xOff: 0,    yOff: 95 },
                    { type: 'gun',     modelId: 'gun_ld2000',    xOff: 90,   yOff: 80 }
                ]
            }
        };

        // 通用部署函数
        const executeDemoPlan = (planKey) => {
            if (Game.isRunning) return;
            EquipModule.clearAll();
            const cx = CONFIG.centerX, cy = CONFIG.centerY;
            const plan = DEPLOY_PLANS[planKey];
            if (!plan) return;
            
           const findModel = (type, modelId) => {
               const models = EQUIP_DATA[type]?.models || [];
               return models.find(m => m.id === modelId) || models[0];
           };
           

           plan.items.forEach((p, idx) => {
                setTimeout(() => {
                    const model = findModel(p.type, p.modelId);
                    const td = EQUIP_DATA[p.type];
                    EquipModule.list.push({
                        type: p.type, modelId: p.modelId, name: model.name,
                        x: cx + p.xOff, y: cy + p.yOff,
                       range: model.range, damage: model.damage,
                       fireRate: model.fireRate, fireCooldown: model.fireCooldown || 30,
                       color: td.color, state: 'idle', cooldown: 0, target: null,
                        deployScale: 0, pulsePhase: Math.random() * Math.PI * 2
                    });
                    EquipModule.deployAnimations.push({ x: cx + p.xOff, y: cy + p.yOff, radius: 0, maxRadius: 40, life: 1, color: td.color });
                }, idx * 250);
            });

            setTimeout(() => {
                Game.isRunning = true;
                document.getElementById('btnStart').textContent = '⏸ 暂停推演';
                EnemyModule.startWaves();
                CONFIG.demoMode = true;
                EffectModule.addFloatingText(cx, cy - 80, '◉ [' + plan.name + '] 阵型部署完成', '#79E6C5');
            }, plan.items.length * 250 + 400);
        };

        // 绑定 4 个方案按钮
        const planKeys = ['basic', 'balanced', 'antistealth', 'firepower'];
        planKeys.forEach((key, idx) => {
            const btn = document.getElementById('btnAuto' + (idx + 1));
            if (btn) {
                btn.addEventListener('click', () => executeDemoPlan(key));
            }
        });

    },

    initRangeToggle() {
        const toggle = document.getElementById('toggleRange');
        if (toggle) toggle.addEventListener('change', () => { CONFIG.showRange = toggle.checked; });
    },

    initCanvasTooltip() {
        const canvas = MapModule.canvas;
        const tip = document.getElementById('equipTooltip');
        if (!canvas || !tip) return;
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * (canvas.width / rect.width);
            const y = (e.clientY - rect.top) * (canvas.height / rect.height);
            let found = false;
            for (let i = EquipModule.list.length - 1; i >= 0; i--) {
                const item = EquipModule.list[i];
                if (Math.hypot(x - item.x, y - item.y) < 15) {
                    tip.innerHTML = '<div class="tip-title">' + item.name + '</div><div class="tip-row"><span>射程范围</span><span>' + item.range + '</span></div><div class="tip-row"><span>效能</span><span>' + item.damage + '</span></div><div class="tip-desc">右键删除 | 拖动移动 | 按 Esc 取消部署</div>';
                    tip.classList.add('show');
                    tip.style.left = (e.clientX + 15) + 'px';
                    tip.style.top = (e.clientY + 15) + 'px';
                    found = true; break;
                }
            }
            if (!found) tip.classList.remove('show');
        });
    },

    showTooltip(e, model, typeData) {
        const tooltip = document.getElementById('equipTooltip');
        if (!tooltip) return;
        tooltip.innerHTML = '<div class="tip-title">' + model.name + '</div><div class="tip-row"><span>装备类型</span><span>' + typeData.name + '</span></div><div class="tip-row"><span>射程范围</span><span>' + model.range + ' 单位</span></div><div class="tip-row"><span>效能</span><span>' + (model.damage > 0 ? model.damage : '探测支援') + '</span></div><div class="tip-desc">' + model.desc + '</div>';
        tooltip.classList.add('show');
        this.moveTooltip(e);
    },
    moveTooltip(e) {
        const tooltip = document.getElementById('equipTooltip');
        if (!tooltip) return;
        tooltip.style.left = (e.clientX + 15) + 'px';
        tooltip.style.top = (e.clientY + 15) + 'px';
    },
    hideTooltip() {
        const tooltip = document.getElementById('equipTooltip');
        if (!tooltip) return;
        tooltip.classList.remove('show');
    },

    showWaveAlert(text, difficulty, waveNum, waveTotal) {
        this.waveAlertText = text;
        this.waveDifficulty = difficulty || 1;
        this.waveNum = waveNum || 1;
        this.waveTotal = waveTotal || getWaves().length;
        this.waveAlertTimer = 120;
    },

    onEnemyBreakthrough() {
        Game.enemiesBreakthrough = (Game.enemiesBreakthrough || 0) + 1;
        CONFIG.comboCount = 0;
        this.comboFlashTimer = 30;
    },

    // 【新增】波次间倒计时显示
    showInterWaveCountdown(waveNum, total, nextLabel) {
        this.interWaveActive = true;
        this.interWaveSeconds = 10;
        this.interWaveTimer = 0;
   },

   updateData(total, kill, breakNum) {
        document.getElementById('dataTotal').textContent = total;
        document.getElementById('dataKill').textContent = kill;
        document.getElementById('dataBreak').textContent = breakNum;
        const realTotal = kill + breakNum;
        let rate = realTotal === 0 ? 0 : Math.round((kill / realTotal) * 100);
        const rateEl = document.getElementById('dataRate');
        rateEl.textContent = rate + '%';
        if (rate >= 80) rateEl.style.color = '#79E6C5';
        else if (rate >= 50) rateEl.style.color = '#FF8A3D';
        else rateEl.style.color = '#FF5C5C';
        document.getElementById('dataScore').textContent = CONFIG.score || 0;
    },

    // 【增强】战后复盘 + 量化分析
    showBattleReport() {
        const kill = Game.enemiesKilled || 0;
        const brk = Game.enemiesBreakthrough || 0;
        const total = kill + brk;
        const rate = total === 0 ? 0 : Math.round((kill / total) * 100);
        const difficultyMult = DIFFICULTY_MULTIPLIER[CONFIG.difficulty] || 1;

        const elapsed = (Date.now() - EnemyModule.gameStartTime) / 1000;
        const timeBonus = elapsed < 120 ? Math.floor((120 - elapsed) * 0.5 * difficultyMult) : 0;
        CONFIG.scoreDetail.timeBonus = timeBonus;

        const noBreakBonus = brk === 0 && kill > 0 ? Math.floor(100 * difficultyMult) : 0;
        CONFIG.scoreDetail.noBreakBonus = noBreakBonus;

        const defenseRateBonus = Math.floor(rate * 0.5 * difficultyMult);
        CONFIG.scoreDetail.defenseRate = defenseRateBonus;

        const finalScore = CONFIG.score + timeBonus + noBreakBonus + defenseRateBonus;
        CONFIG.score = finalScore;

        // 星级
        let rank = SCORE_RANKS[0];
        for (let i = SCORE_RANKS.length - 1; i >= 0; i--) {
            if (rate >= SCORE_RANKS[i].min) { rank = SCORE_RANKS[i]; break; }
        }
        if (brk === 0 && kill >= 10) rank = SCORE_RANKS[SCORE_RANKS.length - 1];

        const stars = '⭐'.repeat(rank.stars) + '☆'.repeat(5 - rank.stars);

        // 击杀分类统计
        const killTypes = CONFIG.killStats || {};
        const totalKills = Object.values(killTypes).reduce((a, b) => a + b, 0);
        Object.entries(killTypes).sort((a, b) => b[1] - a[1])[0];

        // 防御薄弱点分析
        let weakSpotAnalysis = '';
        if (brk === 0) {
            weakSpotAnalysis = '✅ 防线保持完整，所有来袭方向均被有效压制。';
        } else if (EnemyModule.breachedSectors.length > 0) {
            const sectorNames = ['北', '东', '南', '西'];
            const sectors = EnemyModule.breachedSectors.map(s => sectorNames[s]).join('、');
            weakSpotAnalysis = '⚠ 防线薄弱方位：<b>' + sectors + '</b>。建议在这些方向补充近防炮或防空导弹。';
        }

        // 武器效能分析
        const radars = EquipModule.list.filter(e => e.type === 'radar').length;
        const missiles = EquipModule.list.filter(e => e.type === 'missile').length;
        const guns = EquipModule.list.filter(e => e.type === 'gun').length;

        let equipAdvice = '';
        if (radars === 0) equipAdvice += '▪ 未部署预警雷达，防空体系效能下降约30%。<br>';
        if (missiles === 0 && guns > 0) equipAdvice += '▪ 仅有近防炮，缺乏远程拦截能力，弹道导弹和隐身目标将难以应对。<br>';
        if (guns === 0 && missiles > 0) equipAdvice += '▪ 仅有导弹，缺乏末端防御，漏网目标可能直接突防。<br>';
        if (radars > 0 && missiles > 0 && guns > 0) equipAdvice += '✅ 装备配置合理，雷达-导弹-近防炮形成完整防御链。<br>';

        // 防御密度分析
        let densityAdvice = '';
        const totalEquips = EquipModule.list.length;
        if (totalEquips < 3) densityAdvice = '⚠ 装备数量不足，建议至少部署5件装备形成交叉火力。';
        else if (totalEquips < 5) densityAdvice = '💡 装备数量适中，可增加1-2件装备提升火力密度。';
        else densityAdvice = '✅ 装备密度充足，火力覆盖良好。';

        // 构建报告
        let html = '<div class="battle-report-overlay" id="battleReport"><div class="battle-report">';
        html += '<div class="report-close" onclick="UIModule.hideBattleReport()">×</div>';
        html += '<div class="report-title">战后复盘</div>';
        html += '<div class="report-rank">' + stars + '</div>';
        html += '<div class="report-rank-title">' + rank.title + '</div>';
        html += '<div class="report-rank-desc">' + rank.desc + '</div>';

        // 核心数据
        html += '<div class="report-divider"></div>';
        html += '<div class="report-stats">';
        html += '<div class="stat-row"><span>最终评分</span><span class="stat-val gold">' + finalScore + '</span></div>';
        html += '<div class="stat-row"><span>难度系数</span><span>x' + difficultyMult.toFixed(1) + '</span></div>';
        html += '<div class="stat-row"><span>拦截成功率</span><span class="stat-val">' + rate + '%</span></div>';
        html += '<div class="stat-row"><span>击毁 / 突防</span><span>' + kill + ' / <span class="' + (brk > 0 ? 'stat-val red' : '') + '">' + brk + '</span></span></div>';
        html += '<div class="stat-row"><span>最大连击</span><span>' + CONFIG.maxCombo + '</span></div>';
        html += '<div class="stat-row"><span>到达波次</span><span>' + EnemyModule.waveIndex + ' / ' + getWaves().length + '</span></div>';
        html += '</div>';

        // 得分明细
        html += '<div class="report-divider"></div><div class="report-detail"><div class="detail-title">得分明细</div>';
        html += '<div class="stat-row"><span>拦截得分</span><span>' + CONFIG.scoreDetail.kills + '</span></div>';
        html += '<div class="stat-row"><span>连击奖励</span><span>' + CONFIG.scoreDetail.comboBonus + '</span></div>';
        html += '<div class="stat-row"><span>防御率加分</span><span>+' + defenseRateBonus + '</span></div>';
        html += '<div class="stat-row"><span>时间奖励</span><span>+' + timeBonus + '</span></div>';
        html += '<div class="stat-row"><span>无突防奖励</span><span>+' + noBreakBonus + '</span></div>';
        html += '</div>';

        // 击杀分类图表
        html += '<div class="report-divider"></div><div class="report-detail"><div class="detail-title">目标分类统计</div>';
        const barColors = { cruise: '#FF5C5C', fighter: '#FF8A3D', drone: '#FFD08A', ballistic: '#FF4F8A', stealth: '#A58BFF', swarm: '#FF8AB2' };
        const icons = { cruise: '🚀', fighter: '✈️', drone: '🛸', ballistic: '◆', stealth: '◒', swarm: '✺' };
        for (const [type, count] of Object.entries(CONFIG.killStats)) {
            if (count >= 0) {
                const name = ENEMY_TYPES[type]?.name || type;
                const pct = totalKills > 0 ? Math.round((count / totalKills) * 100) : 0;
                html += '<div class="analysis-bar-wrap"><div class="analysis-bar-label"><span>' + (icons[type] || '') + ' ' + name + '</span><span>' + count + ' (' + pct + '%)</span></div>';
                html += '<div class="analysis-bar-track"><div class="analysis-bar-fill" style="width:' + pct + '%;background:' + (barColors[type] || '#7BE7FF') + '"></div></div></div>';
            }
        }
        html += '</div>';

        // 量化分析
        html += '<div class="report-divider"></div><div class="detail-title">战后分析</div>';
        html += '<div class="analysis-summary">';
        html += '<p><b>防御评估：</b>' + weakSpotAnalysis + '</p>';
        html += '<p><b>装备效能：</b><br>' + equipAdvice + '</p>';
        html += '<p><b>火力密度：</b>' + densityAdvice + '</p>';
        const overallRate = totalEquips > 0 && kill > 0 ? Math.round(kill / totalEquips * 10) / 10 : 0;
        html += '<p><b>单位装备效率：</b>每件装备平均击毁' + overallRate + ' 个目标</p>';
        if (brk > 0 && totalEquips >= 5) {
            html += '<p class="action-tip">💡 虽然有装备覆盖，但仍有突防。检查近防炮是否部署在保护区内侧关键位置。</p>';
        }
        html += '</div>';

        if (CONFIG.mapLevel === 1 && rate >= 85 && kill >= 5) {
            html += '<div class="report-divider"></div>';
            html += '<div class="unlock-map-wrap">';
            html += '<button id="btnUnlockMap">解锁双要地协防模式</button>';
            html += '<div class="unlock-map-note">更大的地图 · 两个城市要地 · 多区域防守</div>';
            html += '</div>';
        }

        html += '</div></div>';

        const existing = document.getElementById('battleReport');
        if (existing) existing.remove();
        const container = document.getElementById('combat');
        if (container) container.insertAdjacentHTML('beforeend', html);

        document.getElementById('dataScore').textContent = finalScore;
        document.getElementById('dataTotal').textContent = kill + brk;
        document.getElementById('dataKill').textContent = kill;
        document.getElementById('dataBreak').textContent = brk;
        document.getElementById('dataRate').textContent = rate + '%';
    },

    hideBattleReport() {
        const el = document.getElementById('battleReport');
        if (el) el.remove();
    },

    // 顶层叠加绘制
    drawOverlay(ctx) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;

        // 波次间倒计时
        if (CONFIG.interWavePhase) {
            const sec = Math.ceil((CONFIG.interWaveDuration - CONFIG.interWaveTimer) / 60);
            const alpha = 0.8;
            ctx.save();
            ctx.globalAlpha = alpha;

            // 半透明背景
            ctx.fillStyle = 'rgba(2, 7, 13, 0.58)';
            ctx.fillRect(w / 2 - 118, h / 2 - 74, 236, 148);

            ctx.fillStyle = '#FF8A3D';
            ctx.font = 'bold 48px "Microsoft Yahei", sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#FF8A3D';
            ctx.shadowBlur = 20;
            ctx.fillText(sec, w / 2, h / 2);

            ctx.fillStyle = '#c0d4f0';
            ctx.font = '14px "Microsoft Yahei", sans-serif';
            ctx.shadowBlur = 0;
            ctx.fillText('下一波：' + CONFIG.nextWaveLabel, w / 2, h / 2 + 30);

            ctx.fillStyle = '#6b7a90';
            ctx.font = '12px "Microsoft Yahei", sans-serif';
            ctx.fillText('利用间隙调整防空部署...', w / 2, h / 2 + 52);
            ctx.globalAlpha = 1;
            ctx.restore();
        }

        // 波次警告
        if (this.waveAlertTimer > 0) {
            const alpha = this.waveAlertTimer > 100 ? 1 : this.waveAlertTimer / 100;
            const y = h / 2 - 80;
            ctx.save();
            ctx.globalAlpha = alpha;
            const wColor = CONFIG.difficulty >= 4 ? '#FF5C5C' : '#FF8A3D';
            ctx.fillStyle = wColor;
            ctx.font = 'bold 22px "Microsoft Yahei", sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = wColor;
            ctx.shadowBlur = 20;
            ctx.fillText(this.waveAlertText, w / 2, y);
            ctx.fillStyle = '#A8C7D8';
            ctx.font = '13px "Microsoft Yahei", sans-serif';
            ctx.shadowBlur = 0;
            ctx.fillText('第 ' + this.waveNum + ' / ' + this.waveTotal + ' 波', w / 2, y + 26);
            ctx.globalAlpha = 1;
            ctx.restore();
            this.waveAlertTimer--;
        }

        // 连击
        if (CONFIG.comboCount >= 3) {
            const pulse = Math.sin(Date.now() * 0.01) * 0.2 + 0.8;
            ctx.save(); ctx.globalAlpha = pulse;
            ctx.fillStyle = '#FF8A3D'; ctx.font = 'bold 14px "Microsoft Yahei", sans-serif';
            ctx.textAlign = 'left'; ctx.shadowColor = '#FF8A3D'; ctx.shadowBlur = 10;
            ctx.fillText('连击 x' + CONFIG.comboCount, 10, 30);
            ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.restore();
        }

        // 雷达协同
        if (CONFIG.radarBoost > 0 && Game.isRunning) {
            ctx.save();
            ctx.fillStyle = Utils.hexToRgba('#7BE7FF', 0.48);
            ctx.font = '11px "Microsoft Yahei", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('雷达协同 +' + Math.round(CONFIG.radarBoost * 100) + '%', 10, 50);
            ctx.restore();
        }

        // 部署模式指引
        if (!Game.isRunning && !CONFIG.interWavePhase) {
            ctx.save();
            ctx.fillStyle = 'rgba(123, 231, 255, 0.56)';
            ctx.font = '12px "Microsoft Yahei", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('左键部署 | 右键删除 | 拖动移动 | 快捷键 1/2/3 | 空格开始', w / 2, h - 12);
            ctx.restore();
        }

        if (CONFIG.demoMode && Game.isRunning) {
            ctx.save();
            ctx.fillStyle = 'rgba(123, 231, 255, 0.22)';
            ctx.font = 'bold 12px "Microsoft Yahei", sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText('自动防御', w - 10, h - 10);
            ctx.restore();
        }

        // 威胁等级警告
        if (CONFIG.threatLevel > 0.6) {
            const alpha = Math.sin(Date.now() * 0.005) * 0.3 + 0.5;
            ctx.save();
            ctx.fillStyle = 'rgba(255, 92, 92, ' + alpha + ')';
            ctx.font = 'bold 18px "Microsoft Yahei", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('高危威胁', w / 2, 50);
            ctx.restore();
        }
    }
};










