// --- 加载依赖 ---
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// --- 读取源码 ---
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'js', 'ui.js'), 'utf8');

// --- 检查 HTML ---
assert.ok(html.includes('id="tutorialGuide"'), 'tutorial guide dialog should exist in the page');
assert.ok(html.includes('id="btnCloseTutorial"'), 'tutorial guide should provide a close/start button');
assert.ok(html.includes('id="btnOpenTutorial"'), 'a persistent help button should exist after closing the guide');
assert.ok(html.includes('欢迎来到城市防空模拟推演'), 'tutorial guide should welcome new users');
assert.ok(html.includes('选择装备') && html.includes('部署阵地') && html.includes('开始推演'), 'tutorial guide should explain the core play loop');
assert.ok(html.includes('多要地模式下'), 'tutorial guide should mention multi-site defense');

// --- 检查 CSS ---
assert.ok(css.includes('.tutorial-guide'), 'tutorial guide should have dedicated modal styling');
assert.ok(css.includes('.tutorial-help-button'), 'tutorial help button should have dedicated styling');
assert.ok(css.includes('@media (max-width: 900px)'), 'tutorial styles should include responsive behavior');

// --- 检查 UI ---
assert.ok(ui.includes('initTutorialGuide()'), 'UI init should bind tutorial guide controls');
assert.ok(ui.includes('showTutorialGuide()'), 'UI module should expose a show tutorial helper');
assert.ok(ui.includes('hideTutorialGuide()'), 'UI module should expose a hide tutorial helper');

// --- 输出结果 ---
console.log('tutorial guide regressions passed');
