// --- 加载依赖 ---
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// --- 读取源码 ---
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'js', 'ui.js'), 'utf8');

// --- 检查 HTML 面板 ---
assert.ok(!html.includes('id="interWavePanel"'), 'inter-wave countdown should not create a duplicate DOM panel');
assert.ok(!html.includes('id="interWaveCountdown"'), 'inter-wave countdown should be rendered only on the canvas overlay');

// --- 检查 CSS 样式 ---
assert.ok(!css.includes('.inter-wave-overlay'), 'duplicate inter-wave DOM overlay styles should be removed');
assert.ok(!css.includes('.inter-wave-card'), 'duplicate inter-wave DOM card styles should be removed');
assert.ok(css.includes('.tutorial-guide.light'), 'tutorial should support a lighter theme');

// --- 检查 UI 助手 ---
assert.ok(ui.includes('showInterWaveCountdown'), 'UI should expose the inter-wave countdown helper');
assert.ok(!ui.includes('renderInterWaveCountdown'), 'inter-wave DOM render helper should be removed');
assert.ok(!ui.includes('hideInterWaveCountdown'), 'inter-wave DOM hide helper should be removed');
assert.ok(ui.includes('部署期：现在可以补充或调整装备'), 'canvas overlay should keep the deployment pause guidance');
assert.ok(ui.includes('下一波：'), 'canvas overlay should keep the next-wave label');

// --- 输出结果 ---
console.log('interwave guide regressions passed');
