// ======================== 防空态势场景模块 ========================
// OceanX inspired：保留沉浸式深色视觉，语义回归防空雷达、拦截轨迹、城市要地

const MapModule = {
    // 答辩讲法：MapModule 管“背景态势图”，负责画城市要地、雷达扫描圈、方位刻度、网格和拦截走廊。
    ctx: null,
    canvas: null,
    radarParticles: [],
    scanLineAngle: 0,
    gridOffset: 0,
    time: 0,

    init(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // 初始化雷达微尘（背景噪点）
        for (let i = 0; i < CONFIG.particleCount; i++) {
            this.radarParticles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.22,
                vy: (Math.random() - 0.5) * 0.22,
                size: Math.random() * 1.4 + 0.45,
                alpha: Math.random() * 0.32 + 0.08,
                pulse: Math.random() * 0.02 + 0.005
            });
        }
    },

    // 绘制底图 + 防空态势氛围
    drawBase() {
        // 答辩讲法：每一帧先画底图，这样敌人、装备、弹道都是叠在同一张态势图上。
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = CONFIG.centerX;
        const cy = CONFIG.centerY;
        const pr = CONFIG.protectRadius;

        // 防空态势背景
        const bgGrad = ctx.createRadialGradient(cx, cy - 110, 20, cx, cy, 560);
        bgGrad.addColorStop(0, '#263746');
        bgGrad.addColorStop(0.46, '#1E2A35');
        bgGrad.addColorStop(1, '#171F28');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // 远处海面光斑
        const sheen = ctx.createLinearGradient(0, 0, w, h);
        sheen.addColorStop(0, 'rgba(144, 178, 190, 0.030)');
        sheen.addColorStop(0.45, 'rgba(226, 238, 239, 0.012)');
        sheen.addColorStop(1, 'rgba(169, 112, 92, 0.018)');
        ctx.fillStyle = sheen;
        ctx.fillRect(0, 0, w, h);

        this.drawAirspaceContours(ctx, w, h);
        this.drawInterceptCorridor(ctx, w, h);
        this.drawTerrainZones(ctx);

        // 空域坐标网格 - 更稀疏、更轻
        this.gridOffset = (this.gridOffset + 0.12) % 48;
        ctx.strokeStyle = 'rgba(178, 202, 207, 0.040)';
        ctx.lineWidth = 0.5;
        for (let x = -48; x < w + 48; x += 48) {
            ctx.beginPath();
            ctx.moveTo(x + this.gridOffset, 0);
            ctx.lineTo(x + this.gridOffset - 28, h);
            ctx.stroke();
        }
        for (let y = -48; y < h + 48; y += 48) {
            ctx.beginPath();
            ctx.moveTo(0, y + this.gridOffset);
            ctx.lineTo(w, y + this.gridOffset - 16);
            ctx.stroke();
        }

        // 雷达距离环
        const rings = [80, 160, 240, 320];
        rings.forEach((r, index) => {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(170, 197, 202, ${0.024 + Math.sin(this.time * 0.018 + r * 0.01) * 0.010})`;
            ctx.lineWidth = index === 0 ? 0.8 : 0.5;
            ctx.setLineDash([3, 11]);
            ctx.stroke();
            ctx.setLineDash([]);
        });

        // 方位角刻度线
        for (let a = 0; a < 360; a += 30) {
            const rad = a * Math.PI / 180;
            const r1 = 280;
            const r2 = 290;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(rad) * r1, cy + Math.sin(rad) * r1);
            ctx.lineTo(cx + Math.cos(rad) * r2, cy + Math.sin(rad) * r2);
            ctx.strokeStyle = 'rgba(172, 194, 200, 0.09)';
            ctx.lineWidth = 0.5;
            ctx.stroke();

            if (a % 60 === 0) {
                ctx.fillStyle = 'rgba(177, 202, 207, 0.24)';
                ctx.font = '9px "Microsoft YaHei", "PingFang SC", Consolas, monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(a + '°', cx + Math.cos(rad) * 305, cy + Math.sin(rad) * 305);
            }
        }

        // 城市要地与防空阵位标注
        const markers = [
            { label: '指挥中心', x: cx, y: cy, color: '#B8DADD' },
            { label: '空军基地', x: 350, y: 200, color: '#B8DADD' },
            { label: '港口设施', x: 560, y: 380, color: '#B8DADD' },
            { label: '电力设施', x: 320, y: 400, color: '#B8DADD' },
            { label: '通信塔', x: 580, y: 200, color: '#B8DADD' },
        ];
        markers.forEach(m => {
            const pulse = Math.sin(this.time * 0.035 + m.x * 0.01) * 0.35 + 0.65;
            ctx.beginPath();
            ctx.arc(m.x, m.y, 2.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(168, 199, 204, ${0.28 * pulse})`;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(m.x, m.y, 7, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(168, 199, 204, ${0.07 * pulse})`;
            ctx.stroke();
            ctx.fillStyle = 'rgba(190, 219, 222, 0.48)';
            ctx.font = '8px "Microsoft YaHei", "PingFang SC", Consolas, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(m.label, m.x, m.y - 12);
        });

        // 城市要地保护区 - 呼吸发光效果
        const breathe = Math.sin(this.time * 0.03) * 0.2 + 0.8;
        const pulseAlpha = 0.3 * breathe;

        const glowGrad = ctx.createRadialGradient(cx, cy, pr * 0.4, cx, cy, pr * 1.95);
        glowGrad.addColorStop(0, `rgba(158, 190, 197, ${pulseAlpha * 0.24})`);
        glowGrad.addColorStop(0.52, `rgba(158, 190, 197, ${pulseAlpha * 0.070})`);
        glowGrad.addColorStop(1, 'rgba(158, 190, 197, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, pr * 1.95, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, pr, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(174, 207, 211, ${0.46 * breathe})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, pr + 4, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(184, 111, 82, ${0.14 * breathe})`;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, pr - 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(158, 190, 197, ${0.035 * breathe})`;
        ctx.fill();

        // 中心要地
        ctx.fillStyle = `rgba(198, 229, 231, ${0.82 * breathe})`;
        ctx.font = 'bold 18px "Microsoft YaHei", "PingFang SC", Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('◉', cx, cy - 8);
        ctx.font = 'bold 10px "Microsoft YaHei", "PingFang SC", Consolas, monospace';
        ctx.fillStyle = `rgba(184, 218, 221, ${0.70 * breathe})`;
        ctx.fillText('要地', cx, cy + 13);

        // 双要地模式第二个要地
        if (false && CONFIG.mapLevel === 2 && typeof MAP_CONFIG !== 'undefined' && MAP_CONFIG[2]) {
            var c2 = MAP_CONFIG[2].centers[1];
            var pr2 = MAP_CONFIG[2].protectRadius;
            ctx.save();
            ctx.globalAlpha = 0.66;
            ctx.beginPath();
            ctx.arc(c2.x, c2.y, pr2, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(176, 208, 211, 0.58)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.font = '10px "Microsoft YaHei", "PingFang SC", Consolas, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(190, 224, 226, 0.76)';
            ctx.fillText('协防点', c2.x, c2.y);
            ctx.restore();
        }

        this.drawDefenseSites(ctx);

        // 雷达扫描线 - 旋转
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(CONFIG.radarAngle);

        const scanGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 350);
        scanGrad.addColorStop(0, 'rgba(160, 194, 199, 0.070)');
        scanGrad.addColorStop(0.78, 'rgba(160, 194, 199, 0.020)');
        scanGrad.addColorStop(1, 'rgba(160, 194, 199, 0)');
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 350, -0.18, 0.18);
        ctx.closePath();
        ctx.fillStyle = scanGrad;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(350, 0);
        ctx.strokeStyle = 'rgba(174, 207, 211, 0.18)';
        ctx.lineWidth = 1.1;
        ctx.stroke();
        ctx.shadowColor = 'rgba(174, 207, 211, 0.28)';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.arc(350, 0, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(186, 116, 84, 0.68)';
        ctx.fill();

        ctx.restore();

        CONFIG.radarAngle += CONFIG.radarSpeed;
        this.updateRadarParticles(ctx);

        // 威胁等级指示 - 珊瑚色边框闪烁
        if (CONFIG.threatLevel > 0.3) {
            const threatAlpha = Math.sin(this.time * 0.1) * 0.5 + 0.5;
            const borderWidth = CONFIG.threatLevel * 6;
            ctx.strokeStyle = `rgba(255, 92, 92, ${threatAlpha * CONFIG.threatLevel * 0.50})`;
            ctx.lineWidth = borderWidth;
            ctx.strokeRect(0, 0, w, h);
        }

        this.time++;
    },

    drawDefenseSites(ctx) {
        if (typeof getDefenseSites !== 'function') return;
        const sites = getDefenseSites();
        const breathe = Math.sin(this.time * 0.03) * 0.2 + 0.8;
        sites.forEach((site, index) => {
            if (index === 0) return;
            const pr = site.protectRadius || CONFIG.protectRadius;
            ctx.save();
            ctx.globalAlpha = 0.74;
            ctx.beginPath();
            ctx.arc(site.x, site.y, pr * 1.65, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(158, 190, 197, ${0.026 * breathe})`;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(site.x, site.y, pr, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(174, 207, 211, ${0.42 * breathe})`;
            ctx.lineWidth = 1.6;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(site.x, site.y, pr + 4, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(184, 111, 82, ${0.12 * breathe})`;
            ctx.lineWidth = 2.2;
            ctx.stroke();
            ctx.font = 'bold 10px "Microsoft YaHei", "PingFang SC", Consolas, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(190, 224, 226, 0.74)';
            ctx.fillText(site.name || ('协防要地' + (index + 1)), site.x, site.y);
            ctx.restore();
        });
    },

    drawTerrainZones(ctx) {
        if (typeof TERRAIN_ZONES === 'undefined') return;
        const colors = {
            mountain: 'rgba(168, 184, 190, 0.09)',
            urban: 'rgba(174, 116, 92, 0.08)',
            coast: 'rgba(150, 184, 192, 0.075)',
            industrial: 'rgba(166, 177, 128, 0.070)',
            corridor: 'rgba(190, 214, 218, 0.060)'
        };
        TERRAIN_ZONES.forEach(zone => {
            const pulse = Math.sin(this.time * 0.014 + zone.x * 0.01) * 0.18 + 0.82;
            ctx.save();
            ctx.beginPath();
            ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
            ctx.fillStyle = colors[zone.kind] || 'rgba(150, 184, 192, 0.060)';
            ctx.globalAlpha = pulse;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.setLineDash([5, 8]);
            ctx.strokeStyle = 'rgba(190, 214, 218, 0.10)';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(190, 219, 222, 0.46)';
            ctx.font = '9px "Microsoft YaHei", "PingFang SC", Consolas, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(zone.name, zone.x, zone.y - zone.radius - 6);
            ctx.restore();
        });
    },

    drawAirspaceContours(ctx, w, h) {
        ctx.save();
        ctx.globalAlpha = 0.28;
        for (let i = 0; i < 9; i++) {
            const y = 80 + i * 54 + Math.sin(this.time * 0.008 + i) * 4;
            ctx.beginPath();
            ctx.moveTo(-40, y);
            for (let x = -40; x <= w + 40; x += 60) {
                const wave = Math.sin(x * 0.018 + i * 1.7 + this.time * 0.006) * (10 + i * 0.8);
                ctx.lineTo(x, y + wave);
            }
            ctx.strokeStyle = i % 2 === 0 ? 'rgba(190, 214, 218, 0.028)' : 'rgba(150, 184, 192, 0.026)';
            ctx.lineWidth = 0.7;
            ctx.stroke();
        }
        ctx.restore();
    },

    drawInterceptCorridor(ctx, w, h) {
        // 答辩讲法：这里画的是拦截航迹/任务走廊，主要为了增强防空态势展示感。
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const offset = (this.time * 0.9) % 34;
        ctx.setLineDash([18, 16]);
        ctx.lineDashOffset = -offset;
        ctx.beginPath();
        ctx.moveTo(80, h - 110);
        ctx.bezierCurveTo(235, h - 210, 330, h - 470, 520, 260);
        ctx.bezierCurveTo(640, 140, 720, 170, 835, 88);
        ctx.strokeStyle = 'rgba(190, 214, 218, 0.09)';
        ctx.lineWidth = 1.4;
        ctx.shadowColor = 'rgba(174, 207, 211, 0.18)';
        ctx.shadowBlur = 6;
        ctx.stroke();

        ctx.setLineDash([4, 18]);
        ctx.lineDashOffset = offset * 1.4;
        ctx.beginPath();
        ctx.moveTo(72, h - 88);
        ctx.bezierCurveTo(230, h - 198, 325, h - 430, 498, 282);
        ctx.bezierCurveTo(620, 180, 710, 200, 820, 118);
        ctx.strokeStyle = 'rgba(150, 184, 192, 0.075)';
        ctx.lineWidth = 2.6;
        ctx.stroke();

        // 拦截机/任务点，作为防空拦截轨迹隐喻
        const interceptorX = 500 + Math.sin(this.time * 0.018) * 3;
        const interceptorY = 276 + Math.cos(this.time * 0.018) * 3;
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
        ctx.translate(interceptorX, interceptorY);
        ctx.rotate(-0.58);
        ctx.fillStyle = 'rgba(198, 229, 231, 0.64)';
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(-9, -6);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-9, 6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(186, 116, 84, 0.72)';
        ctx.beginPath();
        ctx.arc(14, 0, 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    },

    updateRadarParticles(ctx) {
        const w = this.canvas.width;
        const h = this.canvas.height;

        this.radarParticles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0 || p.x > w) p.vx *= -1;
            if (p.y < 0 || p.y > h) p.vy *= -1;

            const flicker = Math.sin(this.time * p.pulse) * 0.3 + 0.7;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(160, 194, 199, ${p.alpha * flicker * 0.42})`;
            ctx.fill();
        });
    },

    clear() {
        this.drawBase();
    }
};
