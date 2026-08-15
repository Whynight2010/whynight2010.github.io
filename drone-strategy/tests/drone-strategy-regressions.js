const assert = require('assert');
const fs = require('fs');
const path = require('path');

function read(relPath) {
  return fs.readFileSync(path.join(__dirname, '..', relPath), 'utf8');
}

const data = read('js/data.js');
const units = read('js/units.js');
const movement = read('js/movement.js');
const html = read('index.html');
const interactionSource = units + '\n' + movement;

const enemyUavDefs = (data.match(/makeUnit\([^)]*'enemy_uav'[^)]*\)/g) || []).length;
assert.strictEqual(enemyUavDefs, 2, 'expected two enemy UAV definitions');
assert.match(data, /enemy_uav[\s\S]*ammo:\s*4/, 'enemy UAVs should carry 4 rounds');
assert.match(data, /enemy_uav[\s\S]*attackDamage:\s*40/, 'enemy UAV shots should deal 40 damage');
assert.match(data, /type:\s*'strike'[\s\S]*ammo:\s*4[\s\S]*maxAmmo:\s*4/, 'friendly strike drones should carry 4 rounds');
assert.match(data, /case 'move': return 'moving';/, 'move status should be visible on units');
assert.match(data, /case 'recall': return 'recalling';/, 'recall status should be visible on units');
assert.match(html, /敌方察打一体无人机×2[\s\S]*<td>40<\/td>[\s\S]*<td>4枚<\/td>/, 'rules page should show two enemy UAVs with 40 damage and 4 rounds');
assert.match(movement, /const BATTLE_MAX_X = 590;/, 'battle units should be able to reach the right side');
assert.match(movement, /const BATTLE_MAX_Y = 390;/, 'battle units should use the full vertical battle map');
assert.match(units, /document\.createDocumentFragment\(\)/, 'swarm launch should batch DOM insertion');

assert.match(html, /attack-target-mode/i, 'attack UI should expose target mode controls');
assert.match(units, /enemy-hover-panel|enemy-target-tooltip/i, 'enemy hover tooltip wiring should exist');
assert.match(interactionSource, /handleEnemyTargetClick|enterEnemyTargetSelection/i, 'enemy unit click selection should exist');
assert.match(units, /getSwarmDroneIcon|mini-drone-icon/, 'swarm icon rendering should exist');
assert.match(movement, /respectPlayerOrder|commandLock|orderConstraint/i, 'swarm auto-grouping should obey player orders');

console.log('drone-strategy regression checks passed');
