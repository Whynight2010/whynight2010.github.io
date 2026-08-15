// hexToRgba 已迁移至 utils.js

// ======================== 防空装备模块 ========================
const EquipModule = {
    // 答辩讲法：EquipModule 管“我方装备”，包括选择型号、部署位置、拖动调整、删除装备和绘制射程圈。
    list: [],
    selectedModel: null,
    mouseX: 0, // 画布原始像素X
    mouseY: 0, // 画布原始像素Y
    screenX: 0,
    screenY: 0,
    canvasScaleX: 1,
    canvasScaleY: 1,
    isOnCanvas: false,
    isDragging: false,
    dragIndex: -1,
    dragOffsetX: 0,
    dragOffsetY: 0,
    deployAnimations: [], // 部署特效
    hoveredEquip: -1,

    // 实时更新画布缩放比例
    // 答辩讲法：浏览器里 canvas 可能被 CSS 缩放，所以鼠标坐标要换算成真实画布坐标，否则部署会偏。
    updateCanvasScale() {
        const canvas = MapModule.canvas;
        const rect = canvas.getBoundingClientRect();
        this.canvasScaleX = canvas.width / rect.width;
        this.canvasScaleY = canvas.height / rect.height;
    },

    init() {
        // 答辩讲法：这里绑定鼠标事件。左键部署，右键删除，拖动调整位置。
        const canvas = MapModule.canvas;
        if (!canvas) return;

        // 窗口缩放同步更新比例
        window.addEventListener('resize', () => this.updateCanvasScale());
        this.updateCanvasScale();

        // 鼠标按下：拖拽判定
        canvas.addEventListener('mousedown', (e) => {
            if (Game.isRunning && !CONFIG.demoMode) return;
            this.updateCanvasScale();
            this.screenX = e.clientX;
            this.screenY = e.clientY;
            // 核心：屏幕坐标 → 画布原始绘图坐标
            const rawX = (e.clientX - canvas.getBoundingClientRect().left) * this.canvasScaleX;
            const rawY = (e.clientY - canvas.getBoundingClientRect().top) * this.canvasScaleY;

            for (let i = this.list.length - 1; i >= 0; i--) {
                const item = this.list[i];
                if (Math.hypot(rawX - item.x, rawY - item.y) < 15) {
                    this.isDragging = true;
                    this.dragIndex = i;
                   this.dragOffsetX = rawX - item.x;
                   this.dragOffsetY = rawY - item.y;
                   this.cancelSelect();
                   return;
                }
            }
        });

        // 鼠标移动：预览坐标同步 + 拖拽更新
        canvas.addEventListener('mousemove', (e) => {
            this.updateCanvasScale();
            this.screenX = e.clientX;
            this.screenY = e.clientY;
            const rect = canvas.getBoundingClientRect();
            // 统一换算原始画布坐标
            this.mouseX = (e.clientX - rect.left) * this.canvasScaleX;
            this.mouseY = (e.clientY - rect.top) * this.canvasScaleY;
            this.isOnCanvas = true;

            // 更新悬停装备索引
            this.hoveredEquip = -1;
            for (let i = this.list.length - 1; i >= 0; i--) {
                const item = this.list[i];
                if (Math.hypot(this.mouseX - item.x, this.mouseY - item.y) < 15) {
                    this.hoveredEquip = i;
                    break;
                }
            }

            // 拖拽装备坐标更新
            if (this.isDragging && this.dragIndex >= 0) {
                const item = this.list[this.dragIndex];
                let newX = this.mouseX - this.dragOffsetX;
                let newY = this.mouseY - this.dragOffsetY;
                const canvasW = MapModule.canvas.width;
                const canvasH = MapModule.canvas.height;
                // 画布边界限制
                newX = Math.max(15, Math.min(canvasW - 15, newX));
                newY = Math.max(15, Math.min(canvasH - 15, newY));
                // 禁止拖入保护区
                const sites = typeof getDefenseSites === 'function' ? getDefenseSites() : [{ x: CONFIG.centerX, y: CONFIG.centerY, protectRadius: CONFIG.protectRadius }];
                const blockedByCity = sites.some(site => Math.hypot(newX - site.x, newY - site.y) < (site.protectRadius || CONFIG.protectRadius));
                const terrainCheck = typeof canDeployAt === 'function' ? canDeployAt(newX, newY, item.type) : { ok: true };
                if (!blockedByCity && terrainCheck.ok) {
                    item.x = newX;
                    item.y = newY;
                }
            }
        });

       // 鼠标松开：结束拖拽
       canvas.addEventListener('mouseup', () => {
           this.isDragging = false;
           this.dragIndex = -1;
       });

        // 鼠标离开画布：清空状态
        canvas.addEventListener('mouseleave', () => {
            this.isOnCanvas = false;
           this.isDragging = false;
           this.dragIndex = -1;
           this.hoveredEquip = -1;
        });

        // 左键点击：放置装备（使用换算后的原始坐标）
        canvas.addEventListener('click', (e) => {
            if (this.isDragging || Game.isRunning || !this.selectedModel || !this.isOnCanvas) return;
            this.updateCanvasScale();
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * this.canvasScaleX;
            const y = (e.clientY - rect.top) * this.canvasScaleY;
            this.addEquip(x, y);
        });

        // 右键点击：删除装备（换算坐标判定）
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (Game.isRunning) return;
            this.updateCanvasScale();
            const rect = canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) * this.canvasScaleX;
            const y = (e.clientY - rect.top) * this.canvasScaleY;
            this.removeEquipAt(x, y);
        });

        // 页面空白点击取消选中
        document.addEventListener('click', (e) => {
            const isInEquipPanel = e.target.closest('.left-panel');
            const isInModelPanel = e.target.closest('.model-panel');
            const isInCanvas = e.target.closest('.canvas-box');
            if (!isInEquipPanel && !isInModelPanel && !isInCanvas) {
                this.cancelSelect();
            }
        });
    },

    // 取消部署选中状态
    cancelSelect() {
        this.selectedModel = null;
        document.querySelectorAll('.equip-item').forEach(el => el.classList.remove('selected'));
        document.querySelectorAll('.model-item').forEach(el => el.classList.remove('selected'));
        const panel = document.getElementById('modelPanel');
        if(panel) panel.classList.remove('active');
    },

    // 新增装备，传入坐标为画布原始绘图像素（已缩放换算）
    // 答辩讲法：addEquip 会做三个检查：不能放进保护区、不能和其他装备重叠、不能超出地图边界。
    addEquip(x, y) {
        const model = this.selectedModel;
        if (!model || !model.type || !EQUIP_DATA[model.type]) return;

        const typeData = EQUIP_DATA[model.type];
        const canvasW = MapModule.canvas.width;
        const canvasH = MapModule.canvas.height;

        // 保护区拦截
        const sites = typeof getDefenseSites === 'function' ? getDefenseSites() : [{ x: CONFIG.centerX, y: CONFIG.centerY, protectRadius: CONFIG.protectRadius }];
        if (sites.some(site => Math.hypot(x - site.x, y - site.y) < (site.protectRadius || CONFIG.protectRadius))) return;
        const terrainCheck = typeof canDeployAt === 'function' ? canDeployAt(x, y, model.type) : { ok: true };
        if (!terrainCheck.ok) {
            if (typeof EffectModule !== 'undefined') {
                EffectModule.addFloatingText(x, y - 18, terrainCheck.reason, '#FF8A3D');
            }
            return;
        }
        // 装备重叠拦截
        for (let item of this.list) {
            if (Math.hypot(x - item.x, y - item.y) < 28) return;
        }
       // 画布边界拦截
       if (x < 15 || x > canvasW - 15 || y < 15 || y > canvasH - 15) return;


       this.list.push({
           type: model.type,
           modelId: model.id,
           name: model.name,
           x: x, y: y,
           range: model.range,
           damage: model.damage,
           fireRate: model.fireRate,
           fireCooldown: model.fireCooldown || 30,
           accuracy: model.accuracy || 0,
           ammo: model.ammo === undefined ? Infinity : model.ammo,
           suppression: model.suppression || 0,
           lure: model.lure || 0,
           detection: model.detection || 0,
           lowAltitude: model.lowAltitude || 0,
           antiStealth: model.antiStealth || 0,
           color: typeData.color,
           state: 'idle',
           cooldown: 0,
           target: null,
           deployScale: 0,
           pulsePhase: Math.random() * Math.PI * 2
       });

        // 部署波纹动画
        this.deployAnimations.push({
            x, y,
            radius: 0,
            maxRadius: 40,
            life: 1,
            color: typeData.color
        });

        // 部署粒子特效
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            EffectModule.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: 0.025,
                size: Math.random() * 2 + 1,
                color: typeData.color,
                type: 'deploy'
            });
        }
    },

    // 右键删除指定坐标装备
    // 答辩讲法：删除时按鼠标点附近 20 像素查找装备，找到就移除并播放一个小爆炸效果。
   removeEquipAt(x, y) {
       for (let i = this.list.length - 1; i >= 0; i--) {
           const item = this.list[i];
           if (Math.hypot(x - item.x, y - item.y) < 20) {
               EffectModule.addExplosion(item.x, item.y, item.color, 2);
               this.list.splice(i, 1);
               break;
           }
       }
   },

    // 清空全部装备
    clearAll() {
        this.list = [];
        this.cancelSelect();
    },

    // 统一绘制入口
    // 答辩讲法：draw 负责把装备、射程圈、部署预览都画出来；真正开火逻辑在 combat.js。
    draw(ctx) {
        const now = Date.now();

        // 1. 绘制部署波纹动画
        for (let i = this.deployAnimations.length - 1; i >= 0; i--) {
            const da = this.deployAnimations[i];
            da.radius += (da.maxRadius - da.radius) * 0.1;
            ctx.beginPath();
            ctx.arc(da.x, da.y, da.radius, 0, Math.PI * 2);
            ctx.strokeStyle = hexToRgba(da.color, da.life * 0.6);
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(da.x, da.y, da.radius * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = hexToRgba(da.color, da.life * 0.1);
            ctx.fill();
            da.life -= 0.025;
            if (da.life <= 0) this.deployAnimations.splice(i, 1);
        }

        // 2. 绘制已部署装备
        for (let i = 0; i < this.list.length; i++) {
            const item = this.list[i];
            const isHover = this.hoveredEquip === i && !this.isDragging;
            const isDrag = this.isDragging && i === this.dragIndex;

            // 射程圈绘制
            if (CONFIG.showRange) {
                ctx.beginPath();
                ctx.arc(item.x, item.y, item.range, 0, Math.PI * 2);
                ctx.strokeStyle = item.color + '25';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.fillStyle = item.color + '06';
                ctx.fill();

                // 战斗中射程圈呼吸光效
                if (Game.isRunning) {
                    const pulse = Math.sin(now * 0.003 + item.pulsePhase) * 0.3 + 0.7;
                    ctx.beginPath();
                    ctx.arc(item.x, item.y, item.range, 0, Math.PI * 2);
                    ctx.strokeStyle = hexToRgba(item.color, 0.08 * pulse);
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }
            }

            // 拖拽白色虚线高亮框
            if (isDrag) {
                ctx.beginPath();
                ctx.arc(item.x, item.y, 18, 0, Math.PI * 2);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 4]);
                ctx.stroke();
                ctx.setLineDash([]);
            }

            // 鼠标悬停白色细圈
            if (isHover) {
                ctx.beginPath();
                ctx.arc(item.x, item.y, 14, 0, Math.PI * 2);
                ctx.strokeStyle = '#ffffff80';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            // 开火发光底色
            if (item.state === 'firing') {
                const fireGlow = Math.random() * 0.3 + 0.7;
                ctx.beginPath();
                ctx.arc(item.x, item.y, 14, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,100,${fireGlow * 0.3})`;
                ctx.fill();
            }

            // 绘制装备本体图标
            this.drawIcon(ctx, item.type, item.x, item.y, item.color, isHover, item.state === 'firing');
        }

        // 3. 绘制鼠标跟随预览图标（this.mouseX/mouseY 已经是原始画布坐标，和装备点位完全对齐）
        if (this.selectedModel && this.isOnCanvas && !Game.isRunning && !this.isDragging) {
            const typeData = EQUIP_DATA[this.selectedModel.type];
            if (!typeData) return;

            // 预览射程虚线圈
            if (CONFIG.showRange) {
                ctx.beginPath();
                ctx.arc(this.mouseX, this.mouseY, this.selectedModel.range, 0, Math.PI * 2);
                ctx.strokeStyle = typeData.color + '80';
                ctx.setLineDash([5, 5]);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = typeData.color + '15';
                ctx.fill();
            }

            // 光标十字准星
            ctx.strokeStyle = typeData.color + '60';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(this.mouseX - 6, this.mouseY);
            ctx.lineTo(this.mouseX + 6, this.mouseY);
            ctx.moveTo(this.mouseX, this.mouseY - 6);
            ctx.lineTo(this.mouseX, this.mouseY + 6);
            ctx.stroke();

            // 半透明预览图标（坐标完全贴合鼠标换算后的画布坐标，无偏移）
            ctx.globalAlpha = 0.7;
            this.drawIcon(ctx, this.selectedModel.type, this.mouseX, this.mouseY, typeData.color, false, false);
            ctx.globalAlpha = 1;
        }
    },

    // 装备图标绘制：x/y严格为几何中心点，无内部偏移
    // 答辩讲法：这里是纯视觉绘制，近防炮、导弹、雷达用不同图形区分，便于展示时看懂。
    drawIcon(ctx, type, x, y, color, isHover, isFiring) {
        ctx.save();
        ctx.shadowColor = isFiring ? '#ffff00' : color;
        ctx.shadowBlur = isFiring ? 20 : (isHover ? 12 : 5);

        if (type === 'gun') {
            // 近防炮
            ctx.beginPath();
            ctx.arc(x, y, 7, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = '#ffffffcc';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff40';
            ctx.fill();
            ctx.strokeStyle = '#ffffffcc';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - 6, y); ctx.lineTo(x + 6, y);
            ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(x - 6, y, 1.5, 0, Math.PI * 2);
            ctx.arc(x + 6, y, 1.5, 0, Math.PI * 2);
            ctx.arc(x, y - 6, 1.5, 0, Math.PI * 2);
            ctx.arc(x, y + 6, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffaa';
            ctx.fill();

        } else if (type === 'missile') {
            // 防空导弹
            ctx.translate(x, y);
            ctx.rotate(-Math.PI / 4);
            ctx.fillStyle = color;
            ctx.fillRect(-2, -9, 4, 18);
            ctx.beginPath();
            ctx.arc(0, -9, 3, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = '#ffffffcc';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#ffffff60';
            ctx.beginPath();
            ctx.moveTo(-4, 7);
            ctx.lineTo(-7, 11);
            ctx.lineTo(-2, 7);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(4, 7);
            ctx.lineTo(7, 11);
            ctx.lineTo(2, 7);
            ctx.fill();
            ctx.fillStyle = '#ffffff80';
            ctx.fillRect(-1, -4, 2, 8);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(-2, -9, 4, 18);
            ctx.resetTransform();

        } else if (type === 'radar') {
            // 预警雷达
            ctx.translate(x, y);
            ctx.beginPath();
            ctx.arc(0, 6, 4, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, 2, 8, -Math.PI * 0.7, Math.PI * 0.7);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(0, -5, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff80';
            ctx.fill();
            ctx.strokeStyle = '#ffffff40';
            ctx.lineWidth = 0.5;
            for (let a = -2; a <= 2; a += 1) {
                ctx.beginPath();
                ctx.moveTo(0, -5);
                ctx.lineTo(Math.sin(a * 0.3) * 8 + a * 0.5, 2 + Math.cos(a * 0.3) * 4);
                ctx.stroke();
            }
            ctx.resetTransform();
        } else if (type === 'ew') {
            ctx.translate(x, y);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 7, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-8, 0);
            ctx.lineTo(8, 0);
            ctx.moveTo(0, -8);
            ctx.lineTo(0, 8);
            ctx.strokeStyle = '#ffffff99';
            ctx.lineWidth = 1;
            ctx.stroke();
            for (let r = 11; r <= 17; r += 3) {
                ctx.beginPath();
                ctx.arc(0, 0, r, -0.8, 0.8);
                ctx.strokeStyle = hexToRgba(color, 0.35);
                ctx.stroke();
            }
            ctx.resetTransform();
        }

        ctx.shadowBlur = 0;
        ctx.restore();
    }
};






