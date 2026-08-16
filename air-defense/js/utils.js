// ======================== 公共工具模块 ========================
// 提供全局通用的工具函数，消除各模块间代码重复

const Utils = {
    hexToRgba(hex, alpha) {
        const h = hex.replace('#', '');
        let r, g, b, a;
        if (h.length === 8) {
            r = parseInt(h.substring(0, 2), 16);
            g = parseInt(h.substring(2, 4), 16);
            b = parseInt(h.substring(4, 6), 16);
            a = parseInt(h.substring(6, 8), 16) / 255;
        } else {
            r = parseInt(h.substring(0, 2), 16);
            g = parseInt(h.substring(2, 4), 16);
            b = parseInt(h.substring(4, 6), 16);
            a = alpha !== undefined ? alpha : 1;
        }
        a = Math.max(0, Math.min(1, a));
        return `rgba(${r},${g},${b},${a})`;
    },

    dist(x1, y1, x2, y2) {
        return Math.hypot(x2 - x1, y2 - y1);
    },

    clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    },

    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    toRad(deg) {
        return deg * Math.PI / 180;
    },

    randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    getCanvasPos(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    },

    formatPercent(value) {
        return Math.round(value * 100) + '%';
    },

    debounce(fn, delay) {
        let timer = null;
        return function(...args) {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    throttle(fn, interval) {
        let last = 0;
        return function(...args) {
            const now = Date.now();
            if (now - last >= interval) {
                last = now;
                fn.apply(this, args);
            }
        };
    }
};

// 兼容旧代码的全局函数
function hexToRgba(hex, alpha) {
    return Utils.hexToRgba(hex, alpha);
}

window.Utils = Utils;
window.hexToRgba = hexToRgba;
