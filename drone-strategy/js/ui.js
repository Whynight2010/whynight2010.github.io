// ============================================================
// ui.js — 页面导航、规则说明、帮助弹窗、战报分析（第7个加载）
// ============================================================

// --- 页面切换 ---

function goBack() {
    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.location.href = '../index.html';
    }
}

function showPage(pageId) {
    console.log('showPage called with:', pageId);
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    const pageEl = document.getElementById(pageId);
    const navEl = document.getElementById('nav-' + pageId.replace('page-', ''));
    console.log('pageEl:', pageEl);
    console.log('navEl:', navEl);
    if (pageEl) {
        pageEl.classList.add('active');
        console.log('Added active to pageEl');
    }
    if (navEl) {
        navEl.classList.add('active');
        console.log('Added active to navEl');
    }
    console.log('Active pages:', document.querySelectorAll('.page.active').length);
}

function setupNavigation() {
    document.getElementById('nav-home').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('page-home');
    });
    document.getElementById('nav-rules').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('page-rules');
    });
    document.getElementById('nav-battle').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('page-battle');
        setTimeout(() => {
            document.getElementById('preparation-overlay').style.display = 'flex';
            gameRunning = false;
            gameTime = 0;
            clearInterval(gameInterval);
            gameInterval = null;
        }, 100);
    });
    document.getElementById('nav-report').addEventListener('click', (e) => {
        e.preventDefault();
        showPage('page-report');
    });

    const satelliteView = document.getElementById('satellite-view');
    if (satelliteView) {
        satelliteView.addEventListener('click', handleMapClickForAttack);
    }
}

// 页面加载时执行导航设置
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupNavigation);
} else {
    setupNavigation();
}

// --- 规则页面切换 ---

function showRule(index) {
    document.querySelectorAll('.rules-sidebar li').forEach((li, i) => {
        li.classList.toggle('active', i === index);
    });
    document.querySelectorAll('[id^="rule-content-"]').forEach((div, i) => {
        div.style.display = i === index ? 'block' : 'none';
    });
}

// --- 帮助弹窗 ---

function toggleHelp() {
    document.getElementById('help-modal').classList.toggle('active');
}

// --- 战报分析 ---

function loadReports() {
    const container = document.getElementById('report-items');
    container.innerHTML = mockBattles.map(battle => `
        <div class="report-item" onclick="showReport(${battle.id})">
            <div class="report-header">
                <span class="mission-name">${battle.mission}</span>
                <span class="result ${battle.result}">${battle.result === 'win' ? '胜利' : '失败'}</span>
            </div>
            <div class="stats">
                <span>完成度: ${battle.completion}%</span>
                <span>战损: ${battle.lossRate}%</span>
                <span>评分: ${battle.score}</span>
            </div>
            <div class="stats">
                <span>${battle.time}</span>
                <span>时长: ${battle.duration}</span>
            </div>
        </div>
    `).join('');
}

function showReport(id) {
    const battle = mockBattles.find(b => b.id === id);
    if (!battle) return;

    const detail = document.getElementById('report-detail');
    detail.innerHTML = `
        <h2>${battle.mission}</h2>
        <div class="summary">
            <div class="summary-card"><div class="summary-value">${battle.result === 'win' ? '胜利' : '失败'}</div><div class="summary-label">对局结果</div></div>
            <div class="summary-card"><div class="summary-value">${battle.completion}%</div><div class="summary-label">任务完成度</div></div>
            <div class="summary-card"><div class="summary-value">${battle.lossRate}%</div><div class="summary-label">我方战损率</div></div>
            <div class="summary-card"><div class="summary-value">${battle.score}</div><div class="summary-label">综合评分</div></div>
        </div>
        <h3>作战时间线</h3>
        <div class="timeline">
            ${battle.timeline.map(item => `
                <div class="timeline-item">
                    <div class="time">${item.time}</div>
                    <div class="event">${item.event}</div>
                </div>
            `).join('')}
        </div>
        <div class="analysis-section">
            <h4>优势总结</h4>
            ${battle.analysis.strengths.map(p => `<div class="point">${p}</div>`).join('')}
        </div>
        <div class="analysis-section">
            <h4>问题指出</h4>
            ${battle.analysis.weaknesses.map(p => `<div class="point">${p}</div>`).join('')}
        </div>
        <div class="analysis-section">
            <h4>优化建议</h4>
            ${battle.analysis.suggestions.map(p => `<div class="point">${p}</div>`).join('')}
        </div>
    `;
}
