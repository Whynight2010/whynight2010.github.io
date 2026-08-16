// ======================== 视觉特效模块 ========================
// 管理所有粒子特效、爆炸、尾焰、浮动文本、屏幕震动

// hexToRgba 已迁移至 utils.js

const EffectModule = {
    // 答辩讲法：EffectModule 只负责视觉效果，比如爆炸、命中闪光、弹道线和浮动文字，不决定胜负。
    particles: [],
    floatingTexts: [],
    explosions: [],
    trails: [],

    // 添加爆炸效果
    addExplosion(x, y, color, size) {
        // 答辩讲法：拦截成功或突防时会调用这里，用粒子和冲击波做视觉反馈。
        const count = Math.min(Math.floor(size * 2), 12);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * size * 1.5 + 1;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: Math.random() * 0.02 + 0.01,
                size: Math.random() * 3 + 1,
                color: Math.random() > 0.3 ? color : '#ffffff',
                type: 'spark'
            });
        }
        this.explosions.push({
            x, y,
            radius: 0,
            maxRadius: size * 8,
            life: 1,
            color: color
        });
        CONFIG.screenShake = Math.min(CONFIG.screenShake + size * 0.3, 8);
    },

    // 添加尾焰/拖尾
    addTrail(x, y, color) {
        this.particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            life: 1,
            decay: 0.04,
            size: Math.random() * 2 + 0.5,
            color: color,
            type: 'trail'
        });
    },

    // 添加弹道线
    addTracer(x1, y1, x2, y2, color) {
        this.trails.push({
            x1, y1, x2, y2,
            color: color,
            life: 1,
            decay: 0.03
        });
    },

    // 添加浮动文字
    addFloatingText(x, y, text, color) {
        this.floatingTexts.push({
            x, y,
            text: text,
            color: color,
            life: 1,
            decay: 0.015,
            vy: -1.5
        });
    },

    // 添加雷达扫描噪点
    addNoise(x, y) {
        this.particles.push({
            x, y,
            vx: 0, vy: 0,
            life: 1,
            decay: 0.02,
            size: Math.random() * 1.5 + 0.5,
            color: '#00e5ff',
            type: 'noise'
        });
    },

    // 添加命中闪烁光晕
    addHitFlash(x, y) {
        this.explosions.push({
            x, y,
            radius: 0,
            maxRadius: 25,
            life: 1,
            color: '#ffffff',
            flash: true
        });
    },

    // 更新并绘制所有特效
    updateAndDraw(ctx) {
        // 答辩讲法：每帧更新粒子寿命，寿命归零就删除，避免特效越来越多导致卡顿。
        // 粒子上限：超过 120 个时提前结束旧粒子
        if (this.particles.length > 120) {
            const excess = this.particles.length - 120;
            this.particles.splice(0, excess);
        }
        // 应用屏幕震动
        let shakeX = 0, shakeY = 0;
        if (CONFIG.screenShake > 0) {
            shakeX = (Math.random() - 0.5) * CONFIG.screenShake;
            shakeY = (Math.random() - 0.5) * CONFIG.screenShake;
            CONFIG.screenShake *= 0.9;
            if (CONFIG.screenShake < 0.1) CONFIG.screenShake = 0;
        }

        ctx.save();
        ctx.translate(shakeX, shakeY);

        // 绘制弹道线
        for (let i = this.trails.length - 1; i >= 0; i--) {
            const t = this.trails[i];
            const rgba = hexToRgba(t.color, t.life);
            const rgbaDim = hexToRgba(t.color, t.life * 0.4);

            ctx.beginPath();
            ctx.moveTo(t.x1, t.y1);
            ctx.lineTo(t.x2, t.y2);
            ctx.strokeStyle = rgba;
            ctx.lineWidth = 2;
            ctx.stroke();

            // 发光效果
            ctx.shadowColor = t.color;
            

            t.life -= t.decay;
            if (t.life <= 0) this.trails.splice(i, 1);
        }

        // 绘制爆炸冲击波
        for (let i = this.explosions.length - 1; i >= 0; i--) {
            const e = this.explosions[i];
            e.radius += (e.maxRadius - e.radius) * 0.15;

            ctx.beginPath();
            ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);

            if (e.flash) {
                ctx.fillStyle = `rgba(255,255,255,${e.life * 0.5})`;
                ctx.fill();
            }

            const strokeColor = hexToRgba(e.color, e.life * 0.4);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2;
            ctx.stroke();

            e.life -= 0.04;
            if (e.life <= 0) this.explosions.splice(i, 1);
        }

        // 绘制粒子
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.02;
            p.vx *= 0.98;
            p.vy *= 0.98;

            ctx.globalAlpha = p.life;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();

            

            ctx.globalAlpha = 1;
            p.life -= p.decay;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // 绘制浮动文字
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy;

            ctx.globalAlpha = ft.life;
            ctx.font = 'bold 18px "Microsoft Yahei", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.globalAlpha = 1;

            ft.life -= ft.decay;
            if (ft.life <= 0) this.floatingTexts.splice(i, 1);
        }

        ctx.restore();
    },

    clearAll() {
        this.particles = [];
        this.floatingTexts = [];
        this.explosions = [];
        this.trails = [];
    }
};




