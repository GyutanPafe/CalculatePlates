/* ============================================================
   Barbell Plate Calculator — app.js
   プレート計算ロジックのみに整理されたバージョン
   ============================================================ */

'use strict';

// ─────────────────────────────────────────
// 1. CONSTANTS & DATA
// ─────────────────────────────────────────
const PLATE_PATTERNS = {
  A: [20, 15, 10, 5, 2.5, 1.25],
  B: [25, 20, 15, 10, 5, 2.5, 1.25],
};

const PLATE_CSS_CLASS = {
  25:   'plate-25',
  20:   'plate-20',
  15:   'plate-15',
  10:   'plate-10',
  5:    'plate-5',
  2.5:  'plate-2_5',
  1.25: 'plate-1_25',
};

const PLATE_COLORS = {
  25:   '#d946ef',
  20:   '#ef4444',
  15:   '#f97316',
  10:   '#3b82f6',
  5:    '#22c55e',
  2.5:  '#eab308',
  1.25: '#94a3b8',
};

// ─────────────────────────────────────────
// 2. STATE
// ─────────────────────────────────────────
let state = {
  shaftWeight: 20,
  platePattern: 'A',
};

// ─────────────────────────────────────────
// 3. UTILITY / CONTROLS
// ─────────────────────────────────────────
function adjustValue(inputId, delta) {
  const el = document.getElementById(inputId);
  const val = parseFloat(el.value) || 0;
  const min = parseFloat(el.min) || 0;
  const max = parseFloat(el.max) || 9999;
  el.value = Math.min(max, Math.max(min, val + delta));
  el.dispatchEvent(new Event('input'));
}

// ─────────────────────────────────────────
// 4. PLATE CALCULATOR LOGIC
// ─────────────────────────────────────────
function selectShaft(val, btn) {
  document.querySelectorAll('#shaftToggle .toggle-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const customInput = document.getElementById('shaftCustomInput');
  if (val === 'custom') {
    customInput.style.display = 'block';
    const cv = parseFloat(document.getElementById('shaftCustomVal').value);
    state.shaftWeight = isNaN(cv) ? 20 : cv;
  } else {
    customInput.style.display = 'none';
    state.shaftWeight = val;
  }
  calcPlates();
}

function selectPattern(pat, btn) {
  document.querySelectorAll('[id^="pat"]').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.platePattern = pat;
  calcPlates();
}

function solvePlates(targetOneSide, availablePlates) {
  let remaining = Math.round(targetOneSide * 100);
  const result  = [];

  for (const plate of availablePlates) {
    const plateInt = Math.round(plate * 100);
    if (remaining <= 0) break;
    if (plateInt > remaining) continue;
    const count = Math.floor(remaining / plateInt);
    if (count > 0) {
      result.push({ weight: plate, count });
      remaining -= count * plateInt;
    }
  }

  const solved = remaining < 2;
  return { result, remaining: remaining / 100, solved };
}

function calcPlates() {
  const targetInput = document.getElementById('plateTarget');
  const target      = parseFloat(targetInput.value) || 0;

  const shaftBtn = document.querySelector('#shaftToggle .toggle-btn.active');
  let shaft = state.shaftWeight;
  if (shaftBtn && shaftBtn.id === 'shaftCustom') {
    shaft = parseFloat(document.getElementById('shaftCustomVal').value) || 20;
    state.shaftWeight = shaft;
  }

  const pattern   = PLATE_PATTERNS[state.platePattern];
  const sideWeight = (target - shaft) / 2;

  document.getElementById('plateSideWeight').textContent =
    sideWeight > 0 ? `片側 ${sideWeight.toFixed(2).replace(/\.?0+$/, '')} kg` : '';

  if (target <= shaft) {
    renderBarbellNoPlates(shaft);
    document.getElementById('plateList').innerHTML =
      `<p class="plate-no-solution">シャフトのみ（${shaft}kg）</p>`;
    document.getElementById('plateTotalCheck').textContent = `${shaft} kg`;
    return;
  }

  if (sideWeight < 0) {
    renderBarbellNoPlates(shaft);
    document.getElementById('plateList').innerHTML =
      '<p class="plate-no-solution">目標重量がシャフト重量より軽いです</p>';
    document.getElementById('plateTotalCheck').textContent = '—';
    return;
  }

  const { result, remaining, solved } = solvePlates(sideWeight, pattern);
  renderBarbellVisual(result);

  if (!solved && remaining > 0.02) {
    const shortfall = remaining * 2;
    document.getElementById('plateList').innerHTML = `
      <p class="plate-no-solution">
        ⚠️ 完全に達成できません。<br>
        残り ${shortfall.toFixed(2)} kg が割り当て不可
      </p>
    `;
  } else {
    const listEl = document.getElementById('plateList');
    if (result.length === 0) {
      listEl.innerHTML = '<p class="plate-no-solution">プレートなし</p>';
    } else {
      listEl.innerHTML = result.map(p => `
        <div class="plate-chip">
          <span class="plate-chip-dot" style="background:${PLATE_COLORS[p.weight]};"></span>
          <span>${p.weight}kg × ${p.count}枚</span>
        </div>
      `).join('');
    }
  }

  const totalPlateWeight = result.reduce((s, p) => s + p.weight * p.count * 2, 0);
  const totalWeight      = shaft + totalPlateWeight;
  document.getElementById('plateTotalCheck').textContent =
    `${totalWeight.toFixed(2).replace(/\.?0+$/, '')} kg` +
    (Math.abs(totalWeight - target) > 0.02 ? ` ⚠️ (目標 ${target}kg と差あり)` : ' ✅');
}

function renderBarbellVisual(plateResult) {
  const container = document.getElementById('barbellVisual');
  const platesHTML = () => {
    return plateResult.flatMap(p => {
      return Array.from({ length: p.count }, () =>
        `<div class="plate-visual ${PLATE_CSS_CLASS[p.weight] || 'plate-5'}" aria-label="${p.weight}kg">`+
        (p.weight >= 10 ? `<span>${p.weight}</span>` : '') +
        `</div>`
      );
    }).join('');
  };

  container.innerHTML = `
    <div class="plates-side left" aria-label="左側プレート">
      ${platesHTML()}
    </div>
    <div class="barbell-shaft" aria-label="シャフト"></div>
    <div class="plates-side right" aria-label="右側プレート">
      ${platesHTML()}
    </div>
  `;
}

function renderBarbellNoPlates(shaft) {
  const container = document.getElementById('barbellVisual');
  container.innerHTML = `
    <div class="barbell-shaft" aria-label="シャフト ${shaft}kg"></div>
  `;
}

// ─────────────────────────────────────────
// 5. INITIALIZATION
// ─────────────────────────────────────────
function init() {
  calcPlates();
  setupHoldButtons();
}

function setupHoldButtons() {
  let holdTimer, holdInterval;

  const startHold = (btn, action) => {
    holdTimer = setTimeout(() => {
      holdInterval = setInterval(action, 120);
    }, 450);
  };

  const stopHold = () => {
    clearTimeout(holdTimer);
    clearInterval(holdInterval);
  };

  document.querySelectorAll('.num-btn').forEach(btn => {
    btn.addEventListener('pointerdown', (e) => {
      const clickFn = btn.getAttribute('onclick');
      if (!clickFn) return;
      
      const match = clickFn.match(/adjustValue\('(\w+)',\s*([-\d.]+)\)/);
      if (match) {
        startHold(btn, () => adjustValue(match[1], parseFloat(match[2])));
      }
    });
    btn.addEventListener('pointerup',    stopHold);
    btn.addEventListener('pointerleave', stopHold);
    btn.addEventListener('pointercancel',stopHold);
  });
}

document.addEventListener('DOMContentLoaded', init);
