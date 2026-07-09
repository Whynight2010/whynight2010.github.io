// ======================== 防空态势场景模块 ========================
// OceanX inspired：保留沉浸式深色视觉，语义回归防空雷达、拦截轨迹、城市要地

const MapModule = {
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
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const cx = CONFIG.centerX;
        const cy = CONFIG.centerY;
        const pr = CONFIG.protectRadius;

        // 防空态势背景
        const bgGrad = ctx.createRadialGradient(cx, cy - 110, 20, cx, cy, 560);
        bgGrad.addColorStop(0, '#0f2c43');
        bgGrad.addColorStop(0.42, '#071827');
        bgGrad.addColorStop(1, '#02060c');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // 远处海面光斑
        const sheen = ctx.createLinearGradient(0, 0, w, h);
        sheen.addColorStop(0, 'rgba(123, 231, 255, 0.035)');
        sheen.addColorStop(0.45, 'rgba(255, 255, 255, 0.015)');
        sheen.addColorStop(1, 'rgba(255, 138, 61, 0.025)');
        ctx.fillStyle = sheen;
        ctx.fillRect(0, 0, w, h);

        this.drawAirspaceContours(ctx, w, h);
        this.drawInterceptCorridor(ctx, w, h);

        // 空域坐标网格 - 更稀疏、更轻
        this.gridOffset = (this.gridOffset + 0.12) % 48;
        ctx.strokeStyle = 'rgba(123, 231, 255, 0.045)';
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
            ctx.strokeStyle = `rgba(123, 231, 255, ${0.035 + Math.sin(this.time * 0.018 + r * 0.01) * 0.018})`;
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
            ctx.strokeStyle = 'rgba(168, 199, 216, 0.13)';
            ctx.lineWidth = 0.5;
            ctx.stroke();

            if (a % 60 === 0) {
                ctx.fillStyle = 'rgba(168, 199, 216, 0.20)';
                ctx.font = '9px Consolas, monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(a + '°', cx + Math.cos(rad) * 305, cy + Math.sin(rad) * 305);
            }
        }

        // 城市要地与防空阵位标注
        const markers = [
            { label: 'COMMAND CENTER', x: cx, y: cy, color: '#7BE7FF' },
            { label: 'AIR BASE', x: 350, y: 200, color: '#7BE7FF' },
            { label: 'PORT FACILITY', x: 560, y: 380, color: '#7BE7FF' },
            { label: 'POWER PLANT', x: 320, y: 400, color: '#7BE7FF' },
            { label: 'COMMS TOWER', x: 580, y: 200, color: '#7BE7FF' },
        ];
        markers.forEach(m => {
            const pulse = Math.sin(this.time * 0.035 + m.x * 0.01) * 0.35 + 0.65;
            ctx.beginPath();
            ctx.arc(m.x, m.y, 2.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(123, 231, 255, ${0.35 * pulse})`;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(m.x, m.y, 7, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(123, 231, 255, ${0.10 * pulse})`;
            ctx.stroke();
            ctx.fillStyle = 'rgba(244, 251, 255, 0.18)';
            ctx.font = '8px Consolas, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(m.label, m.x, m.y - 12);
        });

        // 城市要地保护区 - 呼吸发光效果
        const breathe = Math.sin(this.time * 0.03) * 0.2 + 0.8;
        const pulseAlpha = 0.3 * breathe;

        const glowGrad = ctx.createRadialGradient(cx, cy, pr * 0.4, cx, cy, pr * 1.95);
        glowGrad.addColorStop(0, `rgba(123, 231, 255, ${pulseAlpha * 0.36})`);
        glowGrad.addColorStop(0.52, `rgba(123, 231, 255, ${pulseAlpha * 0.10})`);
        glowGrad.addColorStop(1, 'rgba(123, 231, 255, 0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, pr * 1.95, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, pr, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(123, 231, 255, ${0.64 * breathe})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, pr + 4, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 138, 61, ${0.20 * breathe})`;
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, pr - 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(123, 231, 255, ${0.05 * breathe})`;
        ctx.fill();

        // 中心要地
        ctx.fillStyle = `rgba(244, 251, 255, ${0.70 * breathe})`;
        ctx.font = 'bold 18px Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('◉', cx, cy - 8);
        ctx.font = 'bold 10px Consolas, monospace';
        ctx.fillStyle = `rgba(123, 231, 255, ${0.58 * breathe})`;
        ctx.fillText('要地', cx, cy + 13);

        // 双要地模式第二个要地
        if (CONFIG.mapLevel === 2 && typeof MAP_CONFIG !== 'undefined' && MAP_CONFIG[2]) {
            var c2 = MAP_CONFIG[2].centers[1];
            var pr2 = MAP_CONFIG[2].protectRadius;
            ctx.save();
            ctx.globalAlpha = 0.66;
            ctx.beginPath();
            ctx.arc(c2.x, c2.y, pr2, 0, Math.PI * 2);
            ctx.strokeStyle = '#7BE7FF';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.font = '10px Consolas, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#7BE7FF';
            ctx.fillText('RELAY', c2.x, c2.y);
            ctx.restore();
        }

        // 雷达扫描线 - 旋转
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(CONFIG.radarAngle);

        const scanGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 350);
        scanGrad.addColorStop(0, 'rgba(123, 231, 255, 0.16)');
        scanGrad.addColorStop(0.78, 'rgba(123, 231, 255, 0.045)');
        scanGrad.addColorStop(1, 'rgba(123, 231, 255, 0)');
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 350, -0.18, 0.18);
        ctx.closePath();
        ctx.fillStyle = scanGrad;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(350, 0);
        ctx.strokeStyle = 'rgba(123, 231, 255, 0.42)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.shadowColor = '#7BE7FF';
        ctx.shadowBlur = 18;
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.arc(350, 0, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#FF8A3D';
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

    drawAirspaceContours(ctx, w, h) {
        ctx.save();
        ctx.globalAlpha = 0.42;
        for (let i = 0; i < 9; i++) {
            const y = 80 + i * 54 + Math.sin(this.time * 0.008 + i) * 4;
            ctx.beginPath();
            ctx.moveTo(-40, y);
            for (let x = -40; x <= w + 40; x += 60) {
                const wave = Math.sin(x * 0.018 + i * 1.7 + this.time * 0.006) * (10 + i * 0.8);
                ctx.lineTo(x, y + wave);
            }
            ctx.strokeStyle = i % 2 === 0 ? 'rgba(244, 251, 255, 0.035)' : 'rgba(123, 231, 255, 0.035)';
            ctx.lineWidth = 0.8;
            ctx.stroke();
        }
        ctx.restore();
    },

    drawInterceptCorridor(ctx, w, h) {
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
        ctx.strokeStyle = 'rgba(244, 251, 255, 0.18)';
        ctx.lineWidth = 2.2;
        ctx.shadowColor = '#7BE7FF';
        ctx.shadowBlur = 18;
        ctx.stroke();

        ctx.setLineDash([4, 18]);
        ctx.lineDashOffset = offset * 1.4;
        ctx.beginPath();
        ctx.moveTo(72, h - 88);
        ctx.bezierCurveTo(230, h - 198, 325, h - 430, 498, 282);
        ctx.bezierCurveTo(620, 180, 710, 200, 820, 118);
        ctx.strokeStyle = 'rgba(123, 231, 255, 0.16)';
        ctx.lineWidth = 4;
        ctx.stroke();

        // 拦截机/任务点，作为防空拦截轨迹隐喻
        const interceptorX = 500 + Math.sin(this.time * 0.018) * 3;
        const interceptorY = 276 + Math.cos(this.time * 0.018) * 3;
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
        ctx.translate(interceptorX, interceptorY);
        ctx.rotate(-0.58);
        ctx.fillStyle = 'rgba(244, 251, 255, 0.78)';
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(-9, -6);
        ctx.lineTo(-5, 0);
        ctx.lineTo(-9, 6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255, 138, 61, 0.90)';
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
            ctx.fillStyle = `rgba(123, 231, 255, ${p.alpha * flicker})`;
            ctx.fill();
        });
    },

    clear() {
        this.drawBase();
    }
};


