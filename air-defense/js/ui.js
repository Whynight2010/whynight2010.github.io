// ======================== UI交互模块（增强版 v2） ========================
// 新增：敌人情报面板、波次间倒计时、战后量化分析

const UIModule = {
    // 答辩讲法：UIModule 管所有界面交互，包括按钮、选项卡、装备型号选择、倍速、统计面板和战后复盘弹窗。
    waveAlertTimer: 0,
    waveAlertText: '',
    waveDifficulty: 1,
    waveNum: 1,
    waveTotal: 1,
    comboFlashTimer: 0,
    interWaveActive: false,
    interWaveSeconds: 10,
    interWaveTimer: 0,
    interWaveWaveNum: 0,
    interWaveWaveTotal: 0,
    interWaveNextLabel: '',
    reportStorageKey: 'airDefenseBattleReports.v1',

    init() {
        // 答辩讲法：UI 初始化时，把页面上的按钮和键盘快捷键都绑定到对应功能。
        this.initTab();
        this.initSubTabs();
        this.initBackHome();
        this.initReportArchive();
        this.initEquipSelect();
        this.initButtons();
        this.initDefenseModeTabs();
        this.initRangeToggle();
        this.initClosePanel();
        this.initTutorialGuide();
        this.initCanvasTooltip();
        this.initKeyboard();
        this.initCanvasResize();
        this.initEnemyInfoPanel();
        this.initTerrainInfoPanel();
        this.renderBattleLog();
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
            window.location.href = '../index.html#grow';
        });
    },

    // 【新增】敌人信息面板渲染
    initEnemyInfoPanel() {
        const container = document.getElementById('enemyInfoList');
        if (!container) return;
        let html = '';
        const types = Object.keys(ENEMY_TYPES);
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
            html += '<div class="enemy-info-row"><span>高度</span><span>' + data.altitude + '</span></div>';
            html += '<div class="enemy-info-row"><span>信号特征</span><span>' + data.signature + '</span></div>';
            html += '<div class="enemy-info-row"><span>机动</span><span>' + data.maneuver + '</span></div>';
            html += '<div class="enemy-info-row"><span>抗干扰</span><span>' + data.jamResist + '</span></div>';
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

    initTerrainInfoPanel() {
        const container = document.getElementById('terrainInfoList');
        if (!container || typeof TERRAIN_ZONES === 'undefined') return;
        container.innerHTML = TERRAIN_ZONES.map(zone => {
            const allow = (zone.allow || []).map(type => this.getEquipmentTypeName(type)).join(' / ');
            return '<div class="terrain-info-card terrain-' + this.escapeHtml(zone.kind) + '">'
                + '<div class="terrain-info-head"><strong>' + this.escapeHtml(zone.name) + '</strong><span>' + this.escapeHtml(zone.kind) + '</span></div>'
                + '<div class="terrain-info-row"><span>允许部署</span><em>' + this.escapeHtml(allow) + '</em></div>'
                + '<div class="terrain-info-row"><span>低空探测</span><em>x' + zone.lowAltitude.toFixed(2) + '</em></div>'
                + '<div class="terrain-info-row"><span>速度影响</span><em>x' + zone.speed.toFixed(2) + '</em></div>'
                + '<p>' + this.escapeHtml(zone.desc) + '</p>'
                + '</div>';
        }).join('');
    },

    // 键盘快捷键
    initKeyboard() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            switch (e.key.toLowerCase()) {
                case '1': document.querySelector('.equip-item[data-type="gun"]')?.click(); break;
                case '2': document.querySelector('.equip-item[data-type="missile"]')?.click(); break;
                case '3': document.querySelector('.equip-item[data-type="radar"]')?.click(); break;
                case '4': document.querySelector('.equip-item[data-type="ew"]')?.click(); break;
                case 'escape': EquipModule.cancelSelect(); break;
                case 'r': if (e.ctrlKey) { e.preventDefault(); document.getElementById('btnReset').click(); } break;
                case ' ': e.preventDefault(); document.getElementById('btnStart').click(); break;
                case 'v': this.toggleSimulationSpeed(); break;
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

    initReportArchive() {
        const listBox = document.getElementById('reportArchiveList');
        const contentBox = document.getElementById('reportArchiveContent');
        if (!listBox || !contentBox) return;

        const clearBtn = document.getElementById('btnClearReports');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearReports();
                this.renderReportArchive();
            });
        }
        this.renderReportArchive();
    },

    loadReports() {
        if (typeof localStorage === 'undefined') return [];
        try {
            const raw = localStorage.getItem(this.reportStorageKey);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            console.warn('战报档案读取失败', err);
            return [];
        }
    },

    saveReport(report) {
        if (typeof localStorage === 'undefined' || !report) return [];
        const reports = this.loadReports();
        const next = [report].concat(reports.filter(item => item.id !== report.id)).slice(0, 12);
        try {
            localStorage.setItem(this.reportStorageKey, JSON.stringify(next));
        } catch (err) {
            console.warn('战报档案保存失败', err);
        }
        return next;
    },

    clearReports() {
        if (typeof localStorage === 'undefined') return;
        try {
            localStorage.removeItem(this.reportStorageKey);
        } catch (err) {
            console.warn('战报档案清空失败', err);
        }
    },

    buildBattleReportData(data) {
        const equipmentModels = EquipModule.list.map(item => ({
            type: item.type,
            modelId: item.modelId || '',
            name: item.name || EQUIP_DATA[item.type]?.name || item.type,
            x: Math.round(item.x || 0),
            y: Math.round(item.y || 0),
            range: item.range || 0,
            damage: item.damage || 0
        }));
        const byType = equipmentModels.reduce((acc, item) => {
            acc[item.type] = (acc[item.type] || 0) + 1;
            return acc;
        }, { radar: 0, missile: 0, gun: 0, ew: 0 });

        const waveSnapshot = getWaves().map((wave, index) => ({
            index: index + 1,
            label: wave.label,
            difficulty: wave.difficulty,
            enemies: (wave.enemies || []).map(enemy => ({
                type: enemy.type,
                name: ENEMY_TYPES[enemy.type]?.name || enemy.type,
                count: enemy.count
            }))
        }));

        const id = 'report-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
        const createdAt = new Date().toISOString();
        const rate = data.rate || 0;
        return {
            id,
            createdAt,
            title: '城市要地防空复盘 ' + this.formatReportTime(createdAt),
            rank: data.rank,
            stars: data.stars,
            score: data.finalScore,
            rate,
            difficulty: data.difficultyMult,
            elapsedSeconds: Math.round(data.elapsed || 0),
            totals: {
                total: data.total,
                kill: data.kill,
                breakthrough: data.brk
            },
            equipment: {
                total: equipmentModels.length,
                byType,
                models: equipmentModels,
                radarBoost: CONFIG.radarBoost || 0
            },
            enemy: {
                killStats: Object.assign({}, CONFIG.killStats || {}),
                waveProgress: {
                    current: EnemyModule.waveIndex || 0,
                    total: getWaves().length
                },
                waves: waveSnapshot
            },
            scoreDetail: {
                kills: CONFIG.scoreDetail.kills || 0,
                comboBonus: CONFIG.scoreDetail.comboBonus || 0,
                defenseRate: data.defenseRateBonus,
                timeBonus: data.timeBonus,
                noBreakBonus: data.noBreakBonus,
                maxCombo: CONFIG.maxCombo || 0
            },
            analysis: {
                weakSpot: data.weakSpotAnalysis,
                equipment: data.equipAdvice,
                density: data.densityAdvice,
                unitEfficiency: data.overallRate,
                actionTip: data.actionTip || ''
            },
            terrain: typeof TERRAIN_ZONES !== 'undefined' ? TERRAIN_ZONES.map(zone => ({
                id: zone.id,
                name: zone.name,
                kind: zone.kind,
                allow: zone.allow || [],
                lowAltitude: zone.lowAltitude,
                speed: zone.speed
            })) : [],
            defense: {
                mode: CONFIG.defenseMode || 1,
                sites: typeof getDefenseSites === 'function' ? getDefenseSites().map(site => ({
                    id: site.id,
                    name: site.name,
                    x: site.x,
                    y: site.y,
                    value: site.value,
                    protectRadius: site.protectRadius
                })) : []
            },
            logs: typeof BattleLog !== 'undefined' ? BattleLog.snapshot(40) : []
        };
    },

    renderReportArchive(selectedId) {
        const listBox = document.getElementById('reportArchiveList');
        const contentBox = document.getElementById('reportArchiveContent');
        const countBox = document.getElementById('reportArchiveCount');
        if (!listBox || !contentBox) return;

        const reports = this.loadReports();
        if (countBox) countBox.textContent = reports.length + ' 份归档';
        if (reports.length === 0) {
            listBox.innerHTML = '<div class="archive-empty-small">完成一次全波次推演后，系统会自动生成战报。</div>';
            contentBox.innerHTML = this.renderReportEmptyState();
            return;
        }

        const selected = reports.find(item => item.id === selectedId) || reports[0];
        listBox.innerHTML = reports.map(report => this.renderReportListItem(report, selected.id)).join('');
        listBox.querySelectorAll('.report-archive-item').forEach(item => {
            item.addEventListener('click', () => this.renderReportArchive(item.dataset.id));
        });
        contentBox.innerHTML = this.renderReportDetail(selected);
    },

    renderReportListItem(report, selectedId) {
        const active = report.id === selectedId ? ' active' : '';
        return '<button type="button" class="report-archive-item' + active + '" data-id="' + this.escapeHtml(report.id) + '">'
            + '<span class="archive-item-time">' + this.formatReportTime(report.createdAt) + '</span>'
            + '<strong>' + this.escapeHtml(report.rank?.title || '未评级') + '</strong>'
            + '<span class="archive-item-meta">评分 ' + (report.score || 0) + ' · 拦截率 ' + (report.rate || 0) + '% · 装备 ' + (report.equipment?.total || 0) + '</span>'
            + '</button>';
    },

    renderReportEmptyState() {
        return '<div class="archive-empty-state">'
            + '<div class="archive-eyebrow">MISSION DEBRIEF ARCHIVE</div>'
            + '<div class="science-title">战报档案</div>'
            + '<p>这里将保存每一次完整推演后的复盘记录，包括装备部署、敌方进攻、防守效果和战后分析。先回到防空推演完成一轮作战，档案会自动生成。</p>'
            + '</div>';
    },

    renderReportDetail(report) {
        const enemyRows = Object.entries(report.enemy?.killStats || {}).map(([type, count]) => {
            const name = ENEMY_TYPES[type]?.name || type;
            return '<div class="archive-chip"><span>' + this.escapeHtml(name) + '</span><strong>' + count + '</strong></div>';
        }).join('');
        const modelRows = (report.equipment?.models || []).map(model => {
            return '<div class="archive-model-row"><span>' + this.escapeHtml(model.name) + '</span><em>' + this.getEquipmentTypeName(model.type) + ' · ' + model.range + '</em></div>';
        }).join('');
        const waves = (report.enemy?.waves || []).map(wave => {
            const desc = wave.enemies.map(enemy => enemy.name + '×' + enemy.count).join(' / ');
            return '<div class="archive-wave-row"><span>' + wave.index + '. ' + this.escapeHtml(wave.label) + '</span><em>' + this.escapeHtml(desc) + '</em></div>';
        }).join('');
        const logRows = (report.logs || []).map(log => {
            return '<div class="operation-log-line">' + this.escapeHtml(this.renderOperationLogLine(log)) + '</div>';
        }).join('');
        const logCount = (report.logs || []).length;
        const defenseContent = '<div class="archive-chip-grid">'
            + '<div class="archive-chip"><span>预警雷达</span><strong>' + (report.equipment?.byType?.radar || 0) + '</strong></div>'
            + '<div class="archive-chip"><span>防空导弹</span><strong>' + (report.equipment?.byType?.missile || 0) + '</strong></div>'
            + '<div class="archive-chip"><span>近防火力</span><strong>' + (report.equipment?.byType?.gun || 0) + '</strong></div>'
            + '<div class="archive-chip"><span>电子对抗</span><strong>' + (report.equipment?.byType?.ew || 0) + '</strong></div>'
            + '<div class="archive-chip"><span>最大连击</span><strong>' + (report.scoreDetail?.maxCombo || 0) + '</strong></div>'
            + '</div><div class="archive-model-list">' + modelRows + '</div>';
        const enemyContent = '<div class="archive-chip-grid">' + enemyRows + '</div><div class="archive-wave-list">' + waves + '</div>';
        const scoreContent = '<div class="archive-score-list">'
            + '<div><span>拦截得分</span><strong>' + (report.scoreDetail?.kills || 0) + '</strong></div>'
            + '<div><span>连击奖励</span><strong>' + (report.scoreDetail?.comboBonus || 0) + '</strong></div>'
            + '<div><span>防御率加分</span><strong>+' + (report.scoreDetail?.defenseRate || 0) + '</strong></div>'
            + '<div><span>时间奖励</span><strong>+' + (report.scoreDetail?.timeBonus || 0) + '</strong></div>'
            + '<div><span>无突防奖励</span><strong>+' + (report.scoreDetail?.noBreakBonus || 0) + '</strong></div>'
            + '</div>';
        const analysisContent = '<div class="archive-analysis">'
            + '<p><b>防御评估：</b>' + (report.analysis?.weakSpot || '') + '</p>'
            + '<p><b>装备效能：</b><br>' + (report.analysis?.equipment || '') + '</p>'
            + '<p><b>火力密度：</b>' + (report.analysis?.density || '') + '</p>'
            + '<p><b>单位装备效率：</b>每件装备平均击毁 ' + (report.analysis?.unitEfficiency || 0) + ' 个目标</p>'
            + (report.analysis?.actionTip ? '<p class="action-tip">' + report.analysis.actionTip + '</p>' : '')
            + '</div>';
        const logContent = '<div class="archive-log-list">' + (logRows || '<div class="archive-empty-small">本局没有日志记录。</div>') + '</div>';

        return '<div class="archive-report-detail">'
            + '<div class="archive-eyebrow">MISSION DEBRIEF ARCHIVE</div>'
            + '<div class="science-title">' + this.escapeHtml(report.rank?.title || '战后复盘') + '</div>'
            + '<div class="archive-report-subtitle">' + this.escapeHtml(report.title || '') + ' · ' + this.escapeHtml(report.stars || '') + '</div>'
            + '<div class="archive-hero-grid">'
            + '<div><span>最终评分</span><strong>' + (report.score || 0) + '</strong></div>'
            + '<div><span>拦截成功率</span><strong>' + (report.rate || 0) + '%</strong></div>'
            + '<div><span>击毁 / 突防</span><strong>' + (report.totals?.kill || 0) + ' / ' + (report.totals?.breakthrough || 0) + '</strong></div>'
            + '<div><span>部署装备</span><strong>' + (report.equipment?.total || 0) + '</strong></div>'
            + '<div><span>防守要地</span><strong>' + (report.defense?.sites?.length || report.defense?.mode || 1) + '</strong></div>'
            + '</div>'
            + this.renderArchiveCollapse('我方防守情况', '装备 ' + (report.equipment?.total || 0) + ' 件', defenseContent, true)
            + this.renderArchiveCollapse('敌方进攻情况', '波次 ' + (report.enemy?.waves?.length || 0) + ' / 击毁类型 ' + Object.keys(report.enemy?.killStats || {}).length, enemyContent, false)
            + this.renderArchiveCollapse('得分明细', '最终评分 ' + (report.score || 0), scoreContent, false)
            + this.renderArchiveCollapse('重要战后分析', '拦截率 ' + (report.rate || 0) + '%', analysisContent, false)
            + this.renderArchiveCollapse('作战日志', logCount + ' 条记录', logContent, false, ' archive-log-collapse')
            + '</div>';
    },

    renderArchiveCollapse(title, meta, content, open, extraClass) {
        return '<div class="archive-section">'
            + '<details class="archive-collapse' + (extraClass || '') + '"' + (open ? ' open' : '') + '>'
            + '<summary><span>' + this.escapeHtml(title) + '</span><em>' + this.escapeHtml(meta || '') + '</em></summary>'
            + '<div class="archive-collapse-body">' + content + '</div>'
            + '</details>'
            + '</div>';
    },

    getEquipmentTypeName(type) {
        if (type === 'radar') return '预警雷达';
        if (type === 'missile') return '防空导弹';
        if (type === 'gun') return '近防炮';
        if (type === 'ew') return '电子对抗';
        return type || '装备';
    },

    formatReportTime(value) {
        const date = value ? new Date(value) : new Date();
        if (Number.isNaN(date.getTime())) return '未知时间';
        const pad = n => String(n).padStart(2, '0');
        return (date.getMonth() + 1) + '/' + date.getDate() + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
    },

    formatLogClock(frame) {
        const total = Math.max(0, Math.floor((frame || 0) / 60));
        const min = String(Math.floor(total / 60)).padStart(2, '0');
        const sec = String(total % 60).padStart(2, '0');
        return min + ':' + sec;
    },

    renderOperationLogLine(log) {
        const meta = log?.meta || {};
        const prefix = '[' + this.formatLogClock(log?.frame || 0) + ']';
        const wave = meta.waveNumber ? '第' + meta.waveNumber + '波 ' : '';
        const unit = meta.unitName || '';
        const action = meta.action || log?.message || '';
        if (unit && action) return prefix + ' ' + wave + unit + ' ' + action;
        return prefix + ' ' + wave + (log?.message || '');
    },

    escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
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
                            accuracy: model.accuracy || 0,
                            ammo: model.ammo === undefined ? Infinity : model.ammo,
                            suppression: model.suppression || 0,
                            lure: model.lure || 0,
                            detection: model.detection || 0,
                            lowAltitude: model.lowAltitude || 0,
                            antiStealth: model.antiStealth || 0,
                            cost: model.cost || 30,
                            desc: model.desc
                        };
                        setTimeout(() => { modelPanel.classList.remove('active'); }, 600);
                        EffectModule.addFloatingText(CONFIG.centerX, CONFIG.centerY - 60, '点击航图布设 ' + model.name, '#B8DADD');
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

    initTutorialGuide() {
        const guide = document.getElementById('tutorialGuide');
        const openBtn = document.getElementById('btnOpenTutorial');
        const closeBtn = document.getElementById('btnCloseTutorial');
        const startBtn = document.getElementById('btnStartTutorial');
        if (!guide || !openBtn || !closeBtn || !startBtn) return;

        const open = () => this.showTutorialGuide();
        const close = () => this.hideTutorialGuide();

        openBtn.addEventListener('click', open);
        closeBtn.addEventListener('click', close);
        startBtn.addEventListener('click', () => {
            this.hideTutorialGuide();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !guide.classList.contains('is-hidden')) {
                this.hideTutorialGuide();
            }
        });
        this.showTutorialGuide();
    },

    initButtons() {
        // 答辩讲法：这里是左侧“指挥控制”按钮的核心逻辑。
        document.getElementById('btnSelectMode').addEventListener('click', () => { EquipModule.cancelSelect(); });

        const speedBtn = document.getElementById('btnSpeed');
        if (speedBtn) {
            speedBtn.addEventListener('click', () => this.toggleSimulationSpeed());
            this.updateSpeedButton();
        }

        document.getElementById('btnReset').addEventListener('click', () => {
            if (Game.isRunning) return;
            EquipModule.clearAll();
            EnemyModule.clearAll();
            CombatModule.clearAll();
            EffectModule.clearAll();
            this.updateData(0, 0, 0);
            CONFIG.comboCount = 0; CONFIG.maxCombo = 0;
            CONFIG.score = 0; CONFIG.scoreDetail = { kills: 0, comboBonus: 0, defenseRate: 0, timeBonus: 0, noBreakBonus: 0 };
            CONFIG.killStats = Object.keys(ENEMY_TYPES).reduce((acc, key) => {
                acc[key] = 0;
                return acc;
            }, {});
            CONFIG.difficulty = 1; CONFIG.radarBoost = 0;
            CONFIG.interWavePhase = false; CONFIG.interWaveTimer = 0;
           CONFIG.lastBreakthroughPos = null;
           Game.enemiesKilled = 0; Game.enemiesBreakthrough = 0;
            if (typeof BattleLog !== 'undefined') BattleLog.reset();
            this.renderBattleLog();
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
                EffectModule.addFloatingText(CONFIG.centerX, CONFIG.centerY - 60, '⚡ 防空系统启动', '#B8DADD');
                CONFIG.threatLevel = 0;
                this.hideBattleReport();
            } else {
                EffectModule.addFloatingText(CONFIG.centerX, CONFIG.centerY - 60, '⏸ 推演暂停', '#A8C7D8');
            }
        });

    },

    initDefenseModeTabs() {
        const group = document.getElementById('defenseModeTabs');
        if (!group) return;
        const tabs = group.querySelectorAll('.mode-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                if (Game.isRunning || CONFIG.interWavePhase) {
                    EffectModule.addFloatingText(CONFIG.centerX, CONFIG.centerY - 70, '推演中无法切换防守模式', '#BA7454');
                    return;
                }
                const count = Number(tab.getAttribute('data-city-count')) || 1;
                tabs.forEach(item => item.classList.remove('active'));
                tab.classList.add('active');
                if (typeof setDefenseMode === 'function') {
                    setDefenseMode(count, Date.now());
                }
                EquipModule.clearAll();
                EnemyModule.clearAll();
                CombatModule.clearAll();
                EffectModule.clearAll();
                this.updateData(0, 0, 0);
                Game.enemiesKilled = 0;
                Game.enemiesBreakthrough = 0;
                CONFIG.score = 0;
                CONFIG.threatLevel = 0;
                if (typeof BattleLog !== 'undefined') {
                    BattleLog.reset();
                    BattleLog.add('system', count + '城市要地防守模式已启用', {
                        waveNumber: 0,
                        unitName: '指挥系统',
                        action: count + '城市要地防守模式已启用'
                    });
                }
                this.renderBattleLog();
                EffectModule.addFloatingText(CONFIG.centerX, CONFIG.centerY - 72, count + '城市防守模式', '#B8DADD');
            });
        });
    },

    toggleSimulationSpeed() {
        // 答辩讲法：展示时间有限，所以加了 1倍/5倍切换。真正的加速在 main.js 主循环里实现。
        CONFIG.simulationSpeed = (CONFIG.simulationSpeed || 1) === 1 ? 5 : 1;
        this.updateSpeedButton();
        const label = CONFIG.simulationSpeed === 5 ? '5倍速推演' : '正常速度';
        EffectModule.addFloatingText(CONFIG.centerX, CONFIG.centerY - 90, label, '#BA7454');
    },

    updateSpeedButton() {
        const speedBtn = document.getElementById('btnSpeed');
        if (!speedBtn) return;
        const isFast = (CONFIG.simulationSpeed || 1) === 5;
        speedBtn.textContent = isFast ? '⏩ 倍速：5x' : '⏩ 倍速：1x';
        speedBtn.classList.toggle('active', isFast);
        speedBtn.setAttribute('aria-pressed', isFast ? 'true' : 'false');
    },

    showTutorialGuide() {
        const guide = document.getElementById('tutorialGuide');
        if (!guide) return;
        guide.classList.remove('is-hidden');
    },

    hideTutorialGuide() {
        const guide = document.getElementById('tutorialGuide');
        if (!guide) return;
        guide.classList.add('is-hidden');
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
        const rect = tooltip.getBoundingClientRect ? tooltip.getBoundingClientRect() : { width: 228, height: 160 };
        const pos = this.getTooltipPosition(e, rect, window);
        tooltip.style.left = pos.left + 'px';
        tooltip.style.top = pos.top + 'px';
    },
    getTooltipPosition(e, tipSize, viewport) {
        const margin = 8;
        const gap = 15;
        const width = tipSize?.width || 228;
        const height = tipSize?.height || 160;
        const vw = viewport?.innerWidth || 1024;
        const vh = viewport?.innerHeight || 768;
        let left = e.clientX + gap;
        let top = e.clientY + gap;
        if (left + width + margin > vw) {
            left = e.clientX - width - gap;
        }
        if (top + height + margin > vh) {
            top = e.clientY - height - gap;
        }
        return {
            left: Math.max(margin, Math.min(left, vw - width - margin)),
            top: Math.max(margin, Math.min(top, vh - height - margin))
        };
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
        this.interWaveWaveNum = waveNum || 0;
        this.interWaveWaveTotal = total || 0;
        this.interWaveNextLabel = nextLabel || '下一波';
    },

   updateData(total, kill, breakNum) {
        // 答辩讲法：右侧战场统计面板每帧更新，显示来袭、拦截、突防和拦截率。
        const totalEl = document.getElementById('dataTotal');
        const killEl = document.getElementById('dataKill');
        const breakEl = document.getElementById('dataBreak');
        if (totalEl) totalEl.textContent = total;
        if (killEl) killEl.textContent = kill;
        if (breakEl) breakEl.textContent = breakNum;
        const realTotal = kill + breakNum;
        let rate = realTotal === 0 ? 0 : Math.round((kill / realTotal) * 100);
        const rateEl = document.getElementById('dataRate');
        if (rateEl) {
            rateEl.textContent = rate + '%';
            if (rate >= 80) rateEl.style.color = '#79E6C5';
            else if (rate >= 50) rateEl.style.color = '#FF8A3D';
            else rateEl.style.color = '#FF5C5C';
        }
        const scoreEl = document.getElementById('dataScore');
        if (scoreEl) scoreEl.textContent = CONFIG.score || 0;
    },

    // 【增强】战后复盘 + 量化分析
    showBattleReport() {
        // 答辩讲法：所有波次结束后会进入这里，计算最终评分、拦截率、装备配置建议和薄弱方向。
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

        // 武器效能分析：根据部署的雷达、导弹、近防炮数量，给出体系是否完整的文字建议。
        const radars = EquipModule.list.filter(e => e.type === 'radar').length;
        const missiles = EquipModule.list.filter(e => e.type === 'missile').length;
        const guns = EquipModule.list.filter(e => e.type === 'gun').length;
        const ews = EquipModule.list.filter(e => e.type === 'ew').length;

        let equipAdvice = '';
        if (radars === 0) equipAdvice += '▪ 未部署预警雷达，防空体系效能下降约30%。<br>';
        if (missiles === 0 && guns > 0) equipAdvice += '▪ 仅有近防炮，缺乏远程拦截能力，弹道导弹和隐身目标将难以应对。<br>';
        if (guns === 0 && missiles > 0) equipAdvice += '▪ 仅有导弹，缺乏末端防御，漏网目标可能直接突防。<br>';
        if (ews > 0) equipAdvice += '✅ 电子对抗节点可压制低抗干扰目标，减轻蜂群和巡飞弹压力。<br>';
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
                html += '<div class="analysis-bar-track"><div class="analysis-bar-fill" style="width:' + pct + '%;background:' + (barColors[type] || '#B8DADD') + '"></div></div></div>';
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
        let actionTip = '';
        if (brk > 0 && totalEquips >= 5) {
            actionTip = '💡 虽然有装备覆盖，但仍有突防。检查近防炮是否部署在保护区内侧关键位置。';
            html += '<p class="action-tip">' + actionTip + '</p>';
        }
        html += '</div>';

        const reportLogs = typeof BattleLog !== 'undefined' ? BattleLog.snapshot(14) : [];
        if (reportLogs.length > 0) {
            html += '<div class="report-divider"></div><div class="report-detail"><div class="detail-title">关键战斗日志</div>';
            reportLogs.forEach(log => {
                html += '<div class="operation-log-line">' + this.escapeHtml(this.renderOperationLogLine(log)) + '</div>';
            });
            html += '</div>';
        }

        html += '</div></div>';

        const existing = document.getElementById('battleReport');
        if (existing) existing.remove();
        const container = document.getElementById('combat');
        if (container) container.insertAdjacentHTML('beforeend', html);

        const reportData = this.buildBattleReportData({
            finalScore,
            rate,
            rank,
            stars,
            kill,
            brk,
            total,
            difficultyMult,
            elapsed,
            timeBonus,
            noBreakBonus,
            defenseRateBonus,
            weakSpotAnalysis,
            equipAdvice,
            densityAdvice,
            overallRate,
            actionTip
        });
        this.saveReport(reportData);
        this.renderReportArchive(reportData.id);

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

    renderBattleLog() {
        const box = document.getElementById('battleLogList');
        if (!box) return;
        const logs = typeof BattleLog !== 'undefined' ? BattleLog.snapshot(14) : [];
        if (logs.length === 0) {
            box.innerHTML = '<div class="operation-log-empty">推演开始后，系统会记录波次、目标入场、拦截和突防。</div>';
            return;
        }
        box.innerHTML = '<div class="operation-log-box">'
            + logs.map(log => '<div class="operation-log-line log-' + this.escapeHtml(log.type) + '">' + this.escapeHtml(this.renderOperationLogLine(log)) + '</div>').join('')
            + '</div>';
    },

    // 顶层叠加绘制
    drawOverlay(ctx) {
        // 答辩讲法：这里负责画波次提示、倒计时、连击、雷达协同和高危威胁提示，不改变核心战斗逻辑。
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;

        // 波次间倒计时
        if (CONFIG.interWavePhase) {
            const sec = Math.ceil((CONFIG.interWaveDuration - CONFIG.interWaveTimer) / 60);
            const alpha = 0.8;
            ctx.save();
            ctx.globalAlpha = alpha;

            // 半透明背景
            ctx.fillStyle = 'rgba(23, 31, 40, 0.52)';
            ctx.fillRect(w / 2 - 118, h / 2 - 74, 236, 148);

            ctx.fillStyle = 'rgba(186, 116, 84, 0.82)';
            ctx.font = 'bold 48px "Microsoft Yahei", sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(186, 116, 84, 0.24)';
            ctx.shadowBlur = 8;
            ctx.fillText(sec, w / 2, h / 2);

            ctx.fillStyle = 'rgba(190, 224, 226, 0.78)';
            ctx.font = '14px "Microsoft Yahei", sans-serif';
            ctx.shadowBlur = 0;
            ctx.fillText('下一波：' + CONFIG.nextWaveLabel, w / 2, h / 2 + 30);

            ctx.fillStyle = 'rgba(150, 178, 184, 0.68)';
            ctx.font = '12px "Microsoft Yahei", sans-serif';
            ctx.fillText('部署期：现在可以补充或调整装备', w / 2, h / 2 + 52);
            ctx.globalAlpha = 1;
            ctx.restore();
        }

        // 波次警告
        if (this.waveAlertTimer > 0) {
            const alpha = this.waveAlertTimer > 100 ? 1 : this.waveAlertTimer / 100;
            const y = h / 2 - 80;
            ctx.save();
            ctx.globalAlpha = alpha;
            const wColor = CONFIG.difficulty >= 4 ? 'rgba(210, 104, 96, 0.84)' : 'rgba(186, 116, 84, 0.82)';
            ctx.fillStyle = wColor;
            ctx.font = 'bold 22px "Microsoft Yahei", sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = wColor;
            ctx.shadowBlur = 8;
            ctx.fillText(this.waveAlertText, w / 2, y);
            ctx.fillStyle = 'rgba(190, 224, 226, 0.72)';
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
            ctx.fillStyle = 'rgba(186, 116, 84, 0.78)'; ctx.font = 'bold 14px "Microsoft Yahei", sans-serif';
            ctx.textAlign = 'left'; ctx.shadowColor = 'rgba(186, 116, 84, 0.22)'; ctx.shadowBlur = 5;
            ctx.fillText('连击 x' + CONFIG.comboCount, 10, 30);
            ctx.shadowBlur = 0; ctx.globalAlpha = 1; ctx.restore();
        }

        // 雷达协同
        if (CONFIG.radarBoost > 0 && Game.isRunning) {
            ctx.save();
            ctx.fillStyle = 'rgba(184, 218, 221, 0.50)';
            ctx.font = '11px "Microsoft Yahei", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('雷达协同 +' + Math.round(CONFIG.radarBoost * 100) + '%', 10, 50);
            ctx.restore();
        }

        // 部署模式指引
        if (!Game.isRunning && !CONFIG.interWavePhase) {
            ctx.save();
            ctx.fillStyle = 'rgba(190, 224, 226, 0.54)';
            ctx.font = '12px "Microsoft Yahei", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('左键部署 | 右键删除 | 拖动移动 | 快捷键 1/2/3/4 | 空格开始', w / 2, h - 12);
            ctx.restore();
        }

        if (CONFIG.demoMode && Game.isRunning) {
            ctx.save();
            ctx.fillStyle = 'rgba(190, 224, 226, 0.28)';
            ctx.font = 'bold 12px "Microsoft Yahei", sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText('自动防御', w - 10, h - 10);
            ctx.restore();
        }

        // 威胁等级警告
        if (CONFIG.threatLevel > 0.6) {
            const alpha = Math.sin(Date.now() * 0.005) * 0.3 + 0.5;
            ctx.save();
            ctx.fillStyle = 'rgba(210, 104, 96, ' + (alpha * 0.78) + ')';
            ctx.font = 'bold 18px "Microsoft Yahei", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('高危威胁', w / 2, 50);
            ctx.restore();
        }
    }
};










