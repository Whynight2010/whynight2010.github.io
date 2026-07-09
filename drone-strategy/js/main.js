// ============================================================
// main.js — 入口、初始化、事件绑定（第8个加载，最后）
// ============================================================

// 快速开战
function startQuickBattle() {
    console.log('startQuickBattle called');
    showPage('page-battle');
    console.log('showPage completed');
    setTimeout(() => {
        console.log('setTimeout callback');
        const prepOverlay = document.getElementById('preparation-overlay');
        console.log('preparation-overlay element:', prepOverlay);
        if (prepOverlay) {
            prepOverlay.style.display = 'flex';
        }
        gameRunning = false;
        gameTime = 0;
        clearInterval(gameInterval);
        gameInterval = null;
        document.getElementById('battle-log').innerHTML = '';
        document.getElementById('mission-progress').style.width = '0%';
        document.getElementById('mission-progress-text').textContent = '0%';
    }, 100);
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    loadReports();
});
