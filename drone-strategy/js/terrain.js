// ============================================================
// terrain.js — 地形、云层、电子干扰系统（第2个加载）
// ============================================================

// --- 云层数据 ---
const clouds = [];
let cloudUpdateInterval = null;

// --- 地形数据 ---
let terrainData = { mountains: [], hills: [] };

// 判断位置是否安全可放
function isPositionSafe(x, y, width, height, existingTerrains = []) {
    for (const zone of FORBIDDEN_ZONES) {
        if (x < zone.x + zone.width + 50 &&
            x + width > zone.x - 50 &&
            y < zone.y + zone.height + 50 &&
            y + height > zone.y - 50) {
            return false;
        }
    }

    for (const terrain of existingTerrains) {
        if (x < terrain.x + terrain.width &&
            x + width > terrain.x &&
            y < terrain.y + terrain.height &&
            y + height > terrain.y) {
            return false;
        }
    }
    return true;
}

// 生成山地与丘陵
function generateTerrain() {
    const view = document.getElementById('satellite-view');

    // 重置地形数据
    terrainData.mountains = [];
    terrainData.hills = [];

    const mountains = [];
    const hills = [];

    const mountainCount = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < mountainCount; i++) {
        let attempts = 0;
        let pos = null;
        while (attempts < 20 && !pos) {
            const x = Math.random() * (MAP_WIDTH - 100);
            const y = Math.random() * (MAP_HEIGHT - 70);
            const width = 60 + Math.random() * 40;
            const height = 40 + Math.random() * 30;

            if (isPositionSafe(x, y, width, height, mountains)) {
                pos = { x, y, width, height, altitude: 1200 + Math.floor(Math.random() * 400) };
            }
            attempts++;
        }
        if (pos) mountains.push(pos);
    }

    // 保存到全局地形数据
    terrainData.mountains = [...mountains];
    terrainData.hills = [...hills];

    const hillCount = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < hillCount; i++) {
        let attempts = 0;
        let pos = null;
        while (attempts < 20 && !pos) {
            const x = Math.random() * (MAP_WIDTH - 120);
            const y = Math.random() * (MAP_HEIGHT - 70);
            const width = 80 + Math.random() * 40;
            const height = 40 + Math.random() * 30;

            if (isPositionSafe(x, y, width, height, hills)) {
                pos = { x, y, width, height };
            }
            attempts++;
        }
        if (pos) hills.push(pos);
    }

    // 更新全局地形数据
    terrainData.hills = [...hills];

    hills.forEach(hill => {
        const el = document.createElement('div');
        el.className = 'terrain hill';
        el.style.left = hill.x + 'px';
        el.style.top = hill.y + 'px';
        el.style.width = hill.width + 'px';
        el.style.height = hill.height + 'px';
        view.appendChild(el);
    });

    mountains.forEach(mountain => {
        const el = document.createElement('div');
        el.className = 'terrain mountain';
        el.style.left = mountain.x + 'px';
        el.style.top = mountain.y + 'px';
        el.style.width = mountain.width + 'px';
        el.style.height = mountain.height + 'px';
        el.style.borderRadius = '30% 70% 70% 30% / 30% 30% 70% 70%';

        const label = document.createElement('div');
        label.className = 'terrain-label';
        label.textContent = mountain.altitude + 'm';
        label.style.left = '5px';
        label.style.top = '5px';
        el.appendChild(label);

        view.appendChild(el);
    });

    addTerrainLegend(view);
}

// 添加地形图例
function addTerrainLegend(view) {
    const existingLegend = view.querySelector('.terrain-legend');
    if (existingLegend) existingLegend.remove();

    const legend = document.createElement('div');
    legend.className = 'terrain-legend';
    legend.innerHTML = `
        <h4>地形图例</h4>
        <div class="legend-item"><div class="legend-color mountain"></div><span class="legend-text">山地</span></div>
        <div class="legend-item"><div class="legend-color hill"></div><span class="legend-text">丘陵</span></div>
        <div class="legend-item"><div class="legend-color cloud"></div><span class="legend-text">云层</span></div>
        <div class="legend-item"><div class="legend-color jamming"></div><span class="legend-text">电子干扰</span></div>
        <div class="legend-item"><div class="legend-color base"></div><span class="legend-text">我方基地</span></div>
    `;
    view.appendChild(legend);
}

// 生成随机云层
function generateClouds() {
    const view = document.getElementById('satellite-view');
    clouds.length = 0;

    const cloudCount = 4 + Math.floor(Math.random() * 5);
    for (let i = 0; i < cloudCount; i++) {
        let attempts = 0;
        let cloud = null;

        while (attempts < 20 && !cloud) {
            const x = 50 + Math.random() * (MAP_WIDTH - 200);
            const y = 30 + Math.random() * (MAP_HEIGHT - 150);
            const width = 50 + Math.random() * 50;
            const height = 50 + Math.random() * 50;

            if (isPositionSafe(x, y, width, height, clouds)) {
                cloud = {
                    x, y, width, height,
                    speedX: (Math.random() - 0.5) * 0.5,
                    speedY: (Math.random() - 0.5) * 0.3
                };
            }
            attempts++;
        }

        if (cloud) {
            clouds.push(cloud);

            const el = document.createElement('div');
            el.className = 'cloud';
            el.id = 'cloud-' + i;
            el.style.left = cloud.x + 'px';
            el.style.top = cloud.y + 'px';
            el.style.width = cloud.width + 'px';
            el.style.height = cloud.height + 'px';
            view.appendChild(el);
        }
    }

    if (cloudUpdateInterval) {
        clearInterval(cloudUpdateInterval);
    }
    cloudUpdateInterval = setInterval(() => {
        if (gameRunning) {
            updateClouds();
            updateElectronicJamming();
        }
    }, 15000);
}

// 更新云层漂移
function updateClouds() {
    clouds.forEach((cloud, i) => {
        cloud.x += cloud.speedX;
        cloud.y += cloud.speedY;

        if (cloud.x < 50) cloud.speedX = Math.abs(cloud.speedX);
        if (cloud.x > 500) cloud.speedX = -Math.abs(cloud.speedX);
        if (cloud.y < 30) cloud.speedY = Math.abs(cloud.speedY);
        if (cloud.y > 220) cloud.speedY = -Math.abs(cloud.speedY);

        const el = document.getElementById('cloud-' + i);
        if (el) {
            el.style.left = cloud.x + 'px';
            el.style.top = cloud.y + 'px';
        }
    });
}

// 判断坐标是否在云内
function isPointInCloud(x, y) {
    for (const cloud of clouds) {
        const centerX = cloud.x + cloud.width / 2;
        const centerY = cloud.y + cloud.height / 2;
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < cloud.width / 2) {
            return true;
        }
    }
    return false;
}

// 判断坐标是否在山地
function isPointInMountain(x, y) {
    for (const mountain of terrainData.mountains) {
        if (x >= mountain.x && x <= mountain.x + mountain.width &&
            y >= mountain.y && y <= mountain.y + mountain.height) {
            return mountain;
        }
    }
    return null;
}

// 判断单位是否受地形掩护
function isUnitInTerrainCover(unit, terrainType) {
    if (terrainType === 'mountain') {
        const mountain = isPointInMountain(unit.x, unit.y);
        return mountain !== null;
    }
    return false;
}

// 更新电子干扰区域
function updateElectronicJamming() {
    const view = document.getElementById('satellite-view');
    document.querySelectorAll('.electronic-jamming').forEach(el => el.remove());

    const radarStations = mockEnemyUnits.filter(e => e.type === 'radar' && e.health > 0);

    radarStations.forEach((radar, i) => {
        const el = document.createElement('div');
        el.className = 'electronic-jamming';
        el.id = 'jamming-' + i;
        el.style.left = (radar.x - 100) + 'px';
        el.style.top = (radar.y - 100) + 'px';
        el.style.width = '200px';
        el.style.height = '200px';
        view.appendChild(el);
    });
}

// 判断坐标是否被干扰
function isPointInJamming(x, y) {
    const radarStations = mockEnemyUnits.filter(e => e.type === 'radar' && e.health > 0);

    for (const radar of radarStations) {
        const dx = x - radar.x;
        const dy = y - radar.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 100) {
            return true;
        }
    }
    return false;
}
