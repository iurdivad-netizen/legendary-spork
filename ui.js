// ─── MTSM_UI ─────────────────────────────────────────────────────────────────
var MTSM_UI = (function () {
  'use strict';

  var _view        = 'hub';
  var _mktCat      = '';
  var _leaguePage  = 0;
  var _tutorialStep = 0;
  var _notifTimer  = null;
  var _startKeyHandler = null;

  var LEAGUE_PAGE_SIZE = 10;

  var TUTORIAL_STEPS = [
    { title: 'WELCOME, RACER!',      msg: 'Your team is ready to compete. You start with stock parts and limited funds. Time to upgrade!' },
    { title: 'VISIT THE PRO SHOP',   msg: 'Buy better parts to raise your car rating. Higher rating = better race results!' },
    { title: 'INSTALL IN GARAGE',    msg: 'After buying a part, head to GARAGE to install it. Swap builds between races.' },
    { title: 'HIT THE TRACK!',       msg: 'Click RACE to see the next circuit, check part biases, then start the race. Good luck!' }
  ];

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function $(id)   { return document.getElementById(id); }
  function app()   { return $('app'); }
  function state() { return MTSM_ENGINE.getState(); }

  function qBar(quality) {
    var pct = quality;
    var cls = quality >= 65 ? '' : quality >= 40 ? ' mid' : ' low';
    return '<span class="q-bar">' +
      '<span class="q-bar-track"><span class="q-bar-fill' + cls + '" style="width:' + pct + '%"></span></span>' +
      '<span class="q-bar-num">' + quality + '</span>' +
    '</span>';
  }

  function wearBar(wear) {
    var ws  = MTSM_ENGINE.getWearStatus(wear);
    return '<span class="wear-bar">' +
      '<span class="wear-bar-track"><span class="wear-bar-fill ' + ws.cls + '" style="width:' + wear + '%"></span></span>' +
      '<span class="wear-label ' + ws.cls + '">' + ws.label + '</span>' +
    '</span>';
  }

  function fmtMoney(n) { return '£' + n.toLocaleString(); }

  function posOrdinal(n) {
    var s = ['th','st','nd','rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  function calcCarStats() {
    var s = state();
    function eq(slot) { return MTSM_ENGINE.getEffectiveQuality(s.installedParts[slot]); }
    var eng = eq('engine'), tir = eq('tires'), sus = eq('suspension');
    var brk = eq('brakes'), bst = eq('boost'), aer = eq('aero'), trn = eq('transmission');
    return {
      speed:        Math.min(9.9, (eng * 0.45 + bst * 0.45 + aer * 0.10) / 10),
      acceleration: Math.min(9.9, (eng * 0.35 + trn * 0.40 + bst * 0.25) / 10),
      handling:     Math.min(9.9, (sus * 0.45 + tir * 0.45 + aer * 0.10) / 10),
      braking:      Math.min(9.9, (brk * 0.85 + tir * 0.15) / 10),
      grip:         Math.min(9.9, (tir * 0.55 + aer * 0.30 + sus * 0.15) / 10),
      topSpeed:     Math.min(9.9, (eng * 0.40 + bst * 0.40 + aer * 0.20) / 10)
    };
  }

  function statBar(label, val) {
    var pct = (val / 9.9) * 100;
    return '<div class="car-stat-row">' +
      '<span class="car-stat-label">' + label + '</span>' +
      '<div class="car-stat-track"><div class="car-stat-fill" style="width:' + pct + '%"></div></div>' +
      '<span class="car-stat-val">' + val.toFixed(1) + '</span>' +
    '</div>';
  }

  // ── Notification ─────────────────────────────────────────────────────────────
  function showNotification(msg, isError) {
    var el = $('notification');
    if (!el) return;
    el.textContent = msg;
    el.className   = 'visible' + (isError ? ' error' : '');
    if (_notifTimer) clearTimeout(_notifTimer);
    _notifTimer = setTimeout(function () { el.className = ''; }, isError ? 4000 : 3000);
  }

  // ── Modal ────────────────────────────────────────────────────────────────────
  function showModal(title, bodyHtml, footerHtml, type) {
    var box = $('modal-box');
    box.className = type === 'danger' ? 'modal-danger' : type === 'warn' ? 'modal-warn' : '';
    $('modal-title').innerHTML  = title;
    $('modal-body').innerHTML   = bodyHtml;
    $('modal-footer').innerHTML = footerHtml || '<button onclick="MTSM_UI.closeModal()">Close</button>';
    $('modal-overlay').className = 'visible';
  }

  function closeModal() { $('modal-overlay').className = ''; }

  // ── SVG Assets ───────────────────────────────────────────────────────────────
  function carSVG(small) {
    var cls = small ? 'style="width:180px"' : 'class="hub-car-svg"';
    return '<svg ' + cls + ' viewBox="0 0 210 90" xmlns="http://www.w3.org/2000/svg">' +
      '<ellipse cx="105" cy="84" rx="80" ry="7" fill="rgba(0,0,0,0.4)"/>' +
      '<rect x="18" y="42" width="174" height="28" fill="#5588cc" rx="4"/>' +
      '<polygon points="58,42 70,18 148,18 158,42" fill="#4477aa"/>' +
      '<polygon points="73,40 80,22 118,22 118,40" fill="#aadeff" opacity="0.85"/>' +
      '<polygon points="123,40 123,22 145,22 152,40" fill="#aadeff" opacity="0.85"/>' +
      '<rect x="76" y="44" width="58" height="22" fill="white"/>' +
      '<text x="105" y="61" font-family="monospace" font-size="15" font-weight="bold" text-anchor="middle" fill="#111">1</text>' +
      '<rect x="0"   y="58" width="22" height="6"  fill="#cc2020" rx="2"/>' +
      '<rect x="188" y="54" width="8"  height="10" fill="#cc2020"/>' +
      '<rect x="172" y="28" width="24" height="5"  fill="#cc2020" rx="2"/>' +
      '<rect x="180" y="33" width="5"  height="14" fill="#aa1a1a"/>' +
      '<circle cx="56"  cy="73" r="14" fill="#111"/>' +
      '<circle cx="56"  cy="73" r="8"  fill="#333"/>' +
      '<circle cx="56"  cy="73" r="3"  fill="#555"/>' +
      '<circle cx="158" cy="73" r="14" fill="#111"/>' +
      '<circle cx="158" cy="73" r="8"  fill="#333"/>' +
      '<circle cx="158" cy="73" r="3"  fill="#555"/>' +
      '<rect x="192" y="48" width="9" height="8" fill="#ffe860" rx="1"/>' +
      '<rect x="9"   y="48" width="9" height="8" fill="#ff2020" rx="1"/>' +
      '<rect x="18"  y="60" width="174" height="3" fill="#3366aa" opacity="0.7"/>' +
    '</svg>';
  }

  function helmetSVG() {
    return '<svg class="hub-helmet-svg" viewBox="0 0 50 52" xmlns="http://www.w3.org/2000/svg">' +
      '<ellipse cx="25" cy="28" rx="20" ry="19" fill="#ddd"/>' +
      '<ellipse cx="25" cy="17" rx="20" ry="13" fill="#ddd"/>' +
      '<rect x="9" y="26" width="32" height="11" fill="#222" rx="2"/>' +
      '<rect x="11" y="28" width="28" height="7" fill="#88ccff" opacity="0.85" rx="1"/>' +
      '<rect x="20" y="15" width="16" height="5" fill="#cc2020" rx="2"/>' +
    '</svg>';
  }

  // ── Background scene (shared between hub and sub-screens) ─────────────────────
  function cloudHTML() {
    var clouds = [
      { left: '8%',  top: '4%', width: '65px' },
      { left: '20%', top: '2%', width: '50px' },
      { left: '62%', top: '3%', width: '72px' },
      { left: '78%', top: '6%', width: '55px' },
      { left: '45%', top: '8%', width: '44px' },
    ];
    return clouds.map(function (c) {
      return '<div class="hub-cloud" style="left:' + c.left + ';top:' + c.top + ';width:' + c.width + '"></div>';
    }).join('');
  }

  function sceneBackground() {
    return '<div class="game-bg-mountains"></div>' +
      '<div class="game-bg-trees-l"></div>' +
      '<div class="game-bg-trees-r"></div>' +
      '<div class="game-bg-track-area"></div>' +
      cloudHTML();
  }

  function wrapInScene(html) {
    return '<div class="game-bg-scene">' +
      sceneBackground() +
      '<div class="game-panel-overlay">' + html + '</div>' +
    '</div>';
  }

  // ── Hub World ─────────────────────────────────────────────────────────────────
  function renderHub() {
    var s          = state();
    var standings  = MTSM_ENGINE.getStandings();
    var playerRank = standings.findIndex(function (x) { return x.isPlayer; }) + 1;
    var tier       = MTSM_ENGINE.getLeagueTier();
    var racesLeft  = s.schedule.length - s.raceIdx;

    var statsBar =
      '<div class="hub-stats-bar">' +
        '<div class="hsb-item">RANK: <span class="hsb-val">' + (racesLeft > 0 ? '#' + posOrdinal(playerRank) : 'DONE') + '</span></div>' +
        '<div class="hsb-item"># <span class="hsb-val">' + s.teamName.toUpperCase() + '</span></div>' +
        '<div class="hsb-item">DRIVER: <span class="hsb-val">' + s.driverName.toUpperCase() + '</span></div>' +
        '<div class="hsb-item">BALANCE: <span class="hsb-val">' + fmtMoney(s.balance) + '</span></div>' +
        '<div class="hsb-item">LEAGUE: <span class="hsb-val">' + tier.name + '</span></div>' +
        '<div class="hsb-item">CAR: <span class="hsb-val">' + s.carName.toUpperCase() + '</span></div>' +
      '</div>';

    var center =
      '<div class="hub-center">' +
        '<div class="hub-race-banner" onclick="MTSM_UI.render(\'race\')">' +
          '<span class="hub-flag">&#127937;</span>' +
          '<span class="hub-race-banner-text">RACE</span>' +
          '<span class="hub-flag">&#127937;</span>' +
        '</div>' +
        '<div class="hub-car-label">' + s.carName.toUpperCase() + '</div>' +
        carSVG(false) +
      '</div>';

    var worldRank =
      '<div class="hub-world-rank">' +
        '<div class="hub-trophy">&#127942;</div>' +
        '<div class="hub-rank-label">WORLD RANK</div>' +
        '<div class="hub-rank-num">#' + playerRank + '</div>' +
      '</div>';

    var driverInfo =
      '<div class="hub-driver-info">' +
        '<div class="hub-driver-label">DRIVER</div>' +
        '<div class="hub-driver-name">' + s.driverName.substring(0, 8).toUpperCase() + '</div>' +
        helmetSVG() +
      '</div>';

    var corners =
      '<div class="hub-corner hub-top-left">' +
        '<button class="hub-nav-btn" onclick="MTSM_UI.render(\'market\')">' +
          '<div class="hub-nav-icon">&#127978;</div>PRO SHOP' +
        '</button>' +
      '</div>' +
      '<div class="hub-corner hub-top-right">' +
        '<button class="hub-nav-btn" onclick="MTSM_UI.render(\'garage\')">' +
          '<div class="hub-nav-icon">&#128295;</div>GARAGE' +
        '</button>' +
      '</div>' +
      '<div class="hub-corner hub-bot-left">' +
        '<button class="hub-nav-btn" onclick="MTSM_UI.render(\'stats\')">' +
          '<div class="hub-nav-icon">&#128200;</div>STAFF STAT' +
        '</button>' +
      '</div>' +
      '<div class="hub-corner hub-bot-right">' +
        '<button class="hub-nav-btn" onclick="MTSM_UI.render(\'league\')">' +
          '<div class="hub-nav-icon">&#127942;</div>LEAGUE' +
        '</button>' +
      '</div>';

    var eventOverlay = '';
    if (s.pendingEvent) {
      eventOverlay =
        '<div class="hub-event-overlay">' +
          '<div class="hub-event-card">' +
            '<div style="font-size:28px;margin-bottom:8px">&#128256;</div>' +
            '<div class="hub-event-name">' + s.pendingEvent.name + '</div>' +
            '<div class="hub-event-msg">' + s.pendingEvent.msg + '</div>' +
            '<button class="btn-accent" onclick="MTSM_UI.acceptEvent()">ACCEPT</button>' +
          '</div>' +
        '</div>';
    }

    var tutorialOverlay = '';
    if (!s.tutorialDone) {
      var step   = TUTORIAL_STEPS[_tutorialStep] || TUTORIAL_STEPS[0];
      var isLast = _tutorialStep >= TUTORIAL_STEPS.length - 1;
      tutorialOverlay =
        '<div class="hub-tutorial-overlay">' +
          '<div class="hub-tutorial-card">' +
            '<div class="hub-tutorial-step">STEP ' + (_tutorialStep + 1) + ' / ' + TUTORIAL_STEPS.length + '</div>' +
            '<div class="hub-tutorial-title">' + step.title + '</div>' +
            '<div class="hub-tutorial-msg">' + step.msg + '</div>' +
            (isLast
              ? '<button onclick="MTSM_UI.tutorialDone()">LET\'S RACE! &#9654;</button>'
              : '<button onclick="MTSM_UI.tutorialNext()">NEXT &#9654;</button>'
            ) +
          '</div>' +
        '</div>';
    }

    var scene =
      '<div class="hub-scene">' +
        '<div class="hub-mountains"></div>' +
        '<div class="hub-trees-left"></div>' +
        '<div class="hub-trees-right"></div>' +
        cloudHTML() +
        '<div class="hub-track-area"></div>' +
        '<div class="hub-platform"></div>' +
        corners + center + worldRank + driverInfo +
        eventOverlay + tutorialOverlay +
      '</div>';

    app().className = 'hub-active';
    app().innerHTML = '<div class="hub-wrap">' + statsBar + scene + '</div>';
  }

  // ── Main render dispatcher ────────────────────────────────────────────────────
  function render(view) {
    if (view) _view = view;
    var s = state();
    if (!s) { renderMenu(); return; }

    if (_view === 'hub') { renderHub(); return; }

    app().className = '';

    var content;
    switch (_view) {
      case 'garage':  content = renderGarage();  break;
      case 'market':  content = renderMarket();  break;
      case 'race':    content = renderRace();    break;
      case 'league':  content = renderLeague();  break;
      case 'stats':   content = renderStats();   break;
      default:        content = renderGarage();  break;
    }

    app().innerHTML = wrapInScene(content);
  }

  function backBtn() {
    return '<button class="btn-back" onclick="MTSM_UI.render(\'hub\')">&#8592; BACK</button>';
  }

  // ── Tutorial ─────────────────────────────────────────────────────────────────
  function tutorialNext() { _tutorialStep++; renderHub(); }

  function tutorialDone() {
    state().tutorialDone = true;
    MTSM_ENGINE.saveGame();
    renderHub();
  }

  // ── Event handling ────────────────────────────────────────────────────────────
  function acceptEvent() {
    var evt = state().pendingEvent;
    if (!evt) { render('hub'); return; }
    MTSM_ENGINE.applyEvent(evt);
    showNotification('Event applied: ' + evt.name, false);
    render('hub');
  }

  // ── Menu ─────────────────────────────────────────────────────────────────────
  function renderMenu() {
    app().className = '';
    var hasSave = MTSM_ENGINE.hasSave();
    app().innerHTML = wrapInScene(
      '<div class="menu-screen">' +
        '<div class="game-title">MOTOR TEAM<br>SPORTS MANAGER</div>' +
        '<div class="game-subtitle">Build. Race. Dominate.</div>' +
        '<div class="menu-btns">' +
          '<button class="btn-lg" onclick="MTSM_UI.renderNewGame()">&#9654; New Game</button>' +
          (hasSave ? '<button class="btn-lg btn-accent" onclick="MTSM_UI.continueGame()">&#9654; Continue</button>' : '') +
          (hasSave ? '<button class="btn-lg btn-danger" onclick="MTSM_UI.confirmDelete()">&#128465; Delete Save</button>' : '') +
        '</div>' +
        '<div class="menu-footer-info">39 Parts &bull; 10 Circuits &bull; 11 Rivals &bull; Random Events</div>' +
      '</div>'
    );
  }

  function confirmDelete() {
    showModal(
      'Delete Save?',
      'This will permanently erase your career progress. Are you sure?',
      '<button class="btn-danger" onclick="MTSM_UI._doDelete()">Delete</button>' +
      '<button onclick="MTSM_UI.closeModal()" style="border-color:var(--muted);color:var(--muted)">Cancel</button>',
      'danger'
    );
  }

  function _doDelete() {
    closeModal();
    MTSM_ENGINE.deleteSave();
    renderMenu();
    showNotification('Save deleted.', false);
  }

  function renderNewGame() {
    app().innerHTML = wrapInScene(
      '<div class="sub-screen"><div class="panel">' +
        '<div class="panel-header">&#10010; New Career</div>' +
        '<div class="form-row"><label>Team Name</label><input type="text" id="team-name" value="Team Apex" maxlength="24"></div>' +
        '<div class="form-row"><label>Driver Name</label><input type="text" id="driver-name" value="Apex" maxlength="16"></div>' +
        '<div class="form-row"><label>Car Name</label><input type="text" id="car-name" value="XX-Z" maxlength="12"></div>' +
        '<div class="form-row">' +
          '<label>Difficulty</label>' +
          '<div class="diff-cards">' +
            diffCard('easy',   'Easy',   '£25,000 start<br>Slower rivals') +
            diffCard('normal', 'Normal', '£12,000 start<br>Balanced challenge', true) +
            diffCard('hard',   'Hard',   '£5,000 start<br>Tough competition') +
          '</div>' +
          '<input type="hidden" id="difficulty" value="normal">' +
        '</div>' +
        '<div class="btn-group">' +
          '<button onclick="MTSM_UI.startGame()">&#9654; Start Season 1</button>' +
          '<button onclick="MTSM_UI.renderMenu()" style="border-color:var(--muted);color:var(--muted)">&#8592; Back</button>' +
        '</div>' +
      '</div></div>'
    );
  }

  function diffCard(id, label, descHtml, sel) {
    return '<div class="diff-card' + (sel ? ' sel' : '') + '" id="dc-' + id +
      '" onclick="MTSM_UI.selectDiff(\'' + id + '\')">' +
      '<div class="diff-card-name">' + label + '</div>' +
      '<div class="diff-card-desc">' + descHtml + '</div>' +
    '</div>';
  }

  function selectDiff(id) {
    ['easy','normal','hard'].forEach(function (d) {
      var el = $('dc-' + d);
      if (el) el.className = 'diff-card' + (d === id ? ' sel' : '');
    });
    $('difficulty').value = id;
  }

  function startGame() {
    var name   = ($('team-name').value   || '').trim() || 'Team Apex';
    var driver = ($('driver-name').value || '').trim() || name;
    var car    = ($('car-name').value    || '').trim() || 'XX-Z';
    var diff   = $('difficulty').value || 'normal';
    MTSM_ENGINE.newGame(name, diff, driver, car);
    _view = 'hub'; _tutorialStep = 0;
    render('hub');
  }

  function continueGame() {
    if (MTSM_ENGINE.loadGame()) { _view = 'hub'; render('hub'); }
  }

  // ── Garage ────────────────────────────────────────────────────────────────────
  function renderGarage() {
    var s   = state();
    var ovr = MTSM_ENGINE.playerRating();

    var slots = SLOTS.map(function (slot) {
      var part   = MTSM_ENGINE.installedPart(slot);
      var partId = s.installedParts[slot];
      var wear   = MTSM_ENGINE.getWear(partId);
      var ws     = MTSM_ENGINE.getWearStatus(wear);
      var effQ   = MTSM_ENGINE.getEffectiveQuality(partId);
      var warnCls = ws.cls === 'critical' ? ' slot-critical' : ws.cls === 'low' ? ' slot-warn' : '';
      var maintCost = part ? Math.max(200, Math.ceil(part.quality * 55 * (1 - wear / 100))) : 0;
      var canMaint  = wear < 95 && s.balance >= maintCost;

      var garageParts = s.garage.filter(function (g) { return g.slot === slot; });
      var swapOptions = garageParts.map(function (g) {
        var p = MTSM_ENGINE.getPartById(g.id);
        return '<option value="' + g.id + '">' + p.name + ' (' + p.quality + ')</option>';
      }).join('');

      var swapHtml = garageParts.length > 0
        ? '<select id="swap-' + slot + '"><option value="">-- Select to install --</option>' + swapOptions + '</select>' +
          ' <button class="btn-sm" onclick="MTSM_UI.doInstall(\'' + slot + '\')">Install</button>'
        : '<span class="muted" style="font-size:15px">No spares — visit Pro Shop</span>';

      return '<div class="slot-card' + warnCls + '">' +
        '<div class="slot-card-header">' +
          '<span class="slot-name">' + SLOT_LABELS[slot] + '</span>' +
          '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
            qBar(effQ) + (wear < 100 ? wearBar(wear) : '') +
          '</div>' +
        '</div>' +
        '<div class="part-name">' + (part ? part.name : 'None') + '</div>' +
        '<div class="part-desc">' + (part ? part.desc : '') + '</div>' +
        (wear < 95 && part
          ? '<div style="margin-top:6px"><button class="btn-sm' + (!canMaint ? ' btn-danger' : ' btn-accent') +
            '" onclick="MTSM_UI.doMaintain(\'' + partId + '\')">&#9881; Overhaul ' + fmtMoney(maintCost) + '</button></div>'
          : '') +
        '<div style="margin-top:8px">' + swapHtml + '</div>' +
      '</div>';
    }).join('');

    var spares = s.garage.length === 0
      ? '<div class="muted" style="padding:10px 0">Garage is empty. Buy parts from Pro Shop.</div>'
      : s.garage.map(function (g) {
          var p    = MTSM_ENGINE.getPartById(g.id);
          var wear = MTSM_ENGINE.getWear(g.id);
          return '<tr><td><span class="muted">' + SLOT_LABELS[g.slot] + '</span></td>' +
            '<td>' + p.name + '</td><td>' + qBar(p.quality) + '</td>' +
            '<td>' + wearBar(wear) + '</td>' +
            '<td class="num">' + fmtMoney(p.sell) + '</td>' +
            '<td><button class="btn-sm btn-danger" onclick="MTSM_UI.doSellGarage(\'' + g.id + '\')">Sell</button></td></tr>';
        }).join('');

    var sparesTable = s.garage.length > 0
      ? '<div style="overflow-x:auto"><table class="data-table">' +
          '<thead><tr><th>Slot</th><th>Part</th><th>Quality</th><th>Condition</th><th>Sell</th><th></th></tr></thead>' +
          '<tbody>' + spares + '</tbody></table></div>'
      : spares;

    var presetsHtml = s.garagePresets.map(function (preset, idx) {
      return '<div class="preset-card">' +
        '<div class="preset-name">' + preset.name + '</div>' +
        '<div class="preset-status">' + (preset.parts ? 'Saved setup' : 'Empty') + '</div>' +
        '<div class="btn-group" style="justify-content:center">' +
          '<button class="btn-sm" onclick="MTSM_UI.doSavePreset(' + idx + ')">Save</button>' +
          (preset.parts ? '<button class="btn-sm btn-accent" onclick="MTSM_UI.doLoadPreset(' + idx + ')">Load</button>' : '') +
        '</div></div>';
    }).join('');

    return '<div class="sub-screen">' +
      '<div class="sub-screen-header">' + backBtn() +
        '<span class="sub-screen-title">&#128295; GARAGE</span>' +
      '</div>' +
      '<div class="panel">' +
        '<div style="text-align:center;margin-bottom:16px">' +
          '<div class="rating-ring"><div class="rating-ring-val">' + ovr + '</div><div class="rating-ring-lbl">OVERALL</div></div>' +
          '<div class="muted" style="font-size:15px">Car rating (wear-adjusted)</div>' +
        '</div>' +
        '<div class="section-label">Installed Parts</div>' + slots +
      '</div>' +
      '<div class="panel"><div class="section-label">Setup Presets</div><div class="preset-grid">' + presetsHtml + '</div></div>' +
      '<div class="panel"><div class="section-label">Spare Parts</div>' + sparesTable + '</div>' +
    '</div>';
  }

  function doInstall(slot) {
    var sel = $('swap-' + slot);
    if (!sel || !sel.value) { showNotification('Select a part to install.', true); return; }
    var res = MTSM_ENGINE.installPart(sel.value);
    showNotification(res.msg, !res.success);
    if (res.success) render();
  }

  function doMaintain(partId) {
    var res = MTSM_ENGINE.maintainPart(partId);
    showNotification(res.msg, !res.success);
    if (res.success) render();
  }

  function doSellGarage(partId) {
    var part = MTSM_ENGINE.getPartById(partId);
    showModal('Sell Part',
      'Sell <strong>' + part.name + '</strong> for <strong>' + fmtMoney(part.sell) + '</strong>?',
      '<button class="btn-danger" onclick="MTSM_UI._confirmSellGarage(\'' + partId + '\')">Sell</button>' +
      '<button onclick="MTSM_UI.closeModal()" style="border-color:var(--muted);color:var(--muted)">Cancel</button>',
      'warn'
    );
  }

  function _confirmSellGarage(partId) {
    closeModal();
    var res = MTSM_ENGINE.sellGaragePart(partId);
    showNotification(res.msg, !res.success);
    if (res.success) render();
  }

  function doSavePreset(idx) {
    var name = 'Setup ' + ['A','B','C'][idx];
    showModal('Save Setup', 'Save current installed setup to <strong>' + name + '</strong>?',
      '<button onclick="MTSM_UI._confirmSavePreset(' + idx + ')">Save</button>' +
      '<button onclick="MTSM_UI.closeModal()" style="border-color:var(--muted);color:var(--muted)">Cancel</button>'
    );
  }

  function _confirmSavePreset(idx) {
    closeModal();
    var res = MTSM_ENGINE.savePreset(idx);
    showNotification(res.msg, !res.success);
    if (res.success) render();
  }

  function doLoadPreset(idx) {
    var preset = state().garagePresets[idx];
    showModal('Load Setup', 'Load <strong>' + preset.name + '</strong>? Your current setup will be uninstalled.',
      '<button class="btn-accent" onclick="MTSM_UI._confirmLoadPreset(' + idx + ')">Load</button>' +
      '<button onclick="MTSM_UI.closeModal()" style="border-color:var(--muted);color:var(--muted)">Cancel</button>'
    );
  }

  function _confirmLoadPreset(idx) {
    closeModal();
    var res = MTSM_ENGINE.loadPreset(idx);
    showNotification(res.msg, !res.success);
    if (res.success) render();
  }

  // ── Pro Shop ──────────────────────────────────────────────────────────────────
  var SLOT_ICONS_EMOJI = {
    engine: '&#9881;', tires: '&#9711;', suspension: '&#128070;',
    brakes: '&#9632;', boost: '&#128163;', aero: '&#9654;', transmission: '&#128260;'
  };

  function renderMarket() {
    var s    = state();
    var cs   = calcCarStats();

    var discountBanner = (s.eventDiscount > 0)
      ? '<div class="discount-active">&#128722; ' + Math.round(s.eventDiscount * 100) + '% DISCOUNT ACTIVE!</div>'
      : '';

    // Left panel: car preview + stats
    var carPanel =
      '<div class="shop-car-panel">' +
        '<div class="shop-car-name-box">' + s.carName.toUpperCase() + '</div>' +
        '<div class="shop-car-img" style="margin:10px 0">' + carSVG(true) + '</div>' +
        '<div class="shop-stats-title">CAR STATS</div>' +
        statBar('SPEED',        cs.speed) +
        statBar('ACCELERATION', cs.acceleration) +
        statBar('HANDLING',     cs.handling) +
        statBar('BRAKING',      cs.braking) +
        statBar('GRIP',         cs.grip) +
        statBar('TOP SPEED',    cs.topSpeed) +
        '<div class="shop-legend">' +
          '<div class="shop-legend-item"><div class="shop-legend-dot" style="background:var(--primary)"></div>INSTALLED</div>' +
          '<div class="shop-legend-item"><div class="shop-legend-dot" style="background:var(--info)"></div>AVAILABLE</div>' +
        '</div>' +
      '</div>';

    // Right panel: parts table
    var parts = [];
    SLOTS.forEach(function (slot) {
      if (_mktCat && _mktCat !== slot) return;
      PARTS_CATALOGUE[slot].forEach(function (p) { parts.push(Object.assign({}, p, { slot: slot })); });
    });

    var rows = parts.map(function (p) {
      var isInstalled = s.installedParts[p.slot] === p.id;
      var inGarage    = s.garage.some(function (g) { return g.id === p.id; });
      var owned       = isInstalled || inGarage;
      var discount    = s.eventDiscount || 0;
      var price       = Math.round(p.price * (1 - discount));
      var canAfford   = !owned && s.balance >= price;
      var isStarter   = p.price === 0;

      var rowCls = isInstalled ? ' shop-installed' : (owned ? ' shop-owned' : '');

      var priceCell = isStarter ? '<span class="muted">Starter</span>'
        : owned ? (isInstalled ? '<span class="badge badge-green">INSTALLED</span>' : '<span class="badge badge-blue">OWNED</span>')
        : (discount > 0
            ? '<span style="text-decoration:line-through;color:var(--muted);font-size:13px">' + fmtMoney(p.price) + '</span> <span style="color:var(--accent)">' + fmtMoney(price) + '</span>'
            : fmtMoney(price));

      var actionCell = isStarter ? '—'
        : owned ? '—'
        : '<button class="shop-buy-btn' + (!canAfford ? ' cant-afford' : '') +
          '" onclick="MTSM_UI.doBuy(\'' + p.id + '\')"' +
          (!canAfford ? ' title="Need ' + fmtMoney(price) + '"' : '') + '>BUY</button>';

      return '<tr class="' + rowCls + '">' +
        '<td><span class="shop-cat-icon">' + SLOT_ICONS_EMOJI[p.slot] + '</span>' +
          '<span class="shop-cat-label">' + SLOT_LABELS[p.slot].toUpperCase() + '</span></td>' +
        '<td>' + p.name + '</td>' +
        '<td class="shop-part-desc">' + p.desc + '</td>' +
        '<td>' + priceCell + '</td>' +
        '<td>' + actionCell + '</td>' +
      '</tr>';
    }).join('');

    var catFilterBtns =
      '<div style="padding:8px 12px;border-bottom:1px solid rgba(58,138,74,0.2);display:flex;flex-wrap:wrap;gap:6px">' +
        catBtn('', 'All') +
        SLOTS.map(function (sl) { return catBtn(sl, SLOT_LABELS[sl]); }).join('') +
      '</div>';

    var partsPanel =
      '<div class="shop-parts-panel">' +
        catFilterBtns +
        '<table class="shop-parts-table">' +
          '<thead><tr><th>CATEGORY</th><th>PART</th><th>DESCRIPTION</th><th>PRICE</th><th>ACTION</th></tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
        '<div class="shop-tip-bar">&#8505; Buy parts to improve your car\'s performance on the track!</div>' +
      '</div>';

    return '<div class="shop-outer">' +
      '<div class="shop-header-bar">' +
        backBtn() +
        '<div class="shop-header-title">' +
          '<div class="shop-title-main">&#127978; PRO SHOP</div>' +
          '<div class="shop-title-sub">UPGRADE YOUR RIDE</div>' +
        '</div>' +
        '<div class="shop-balance-box">' +
          '<span class="shop-balance-label">BALANCE:</span>' +
          '<span class="shop-balance-val">' + fmtMoney(s.balance) + '</span>' +
          '<span class="shop-balance-icon">&#128181;</span>' +
        '</div>' +
      '</div>' +
      discountBanner +
      '<div class="shop-body">' + carPanel + partsPanel + '</div>' +
    '</div>';
  }

  function catBtn(id, label) {
    var active = _mktCat === id;
    return '<button class="btn-sm' + (active ? ' btn-accent' : '') +
      '" onclick="MTSM_UI.setMarketCat(\'' + id + '\')">' + label + '</button>';
  }

  function setMarketCat(cat) { _mktCat = cat; render('market'); }

  function doBuy(partId) {
    var res = MTSM_ENGINE.buyPart(partId);
    showNotification(res.msg, !res.success);
    if (res.success) render();
  }

  // ── Race ──────────────────────────────────────────────────────────────────────
  function renderRace() {
    var s = state();

    if (s.pendingResult) return renderRaceResult(s.pendingResult);

    if (s.raceIdx >= s.schedule.length) {
      return '<div class="sub-screen">' +
        '<div class="sub-screen-header">' + backBtn() + '<span class="sub-screen-title">&#127937; RACE</span></div>' +
        '<div class="panel" style="text-align:center;padding:30px 0">' +
          '<div class="section-label">Season ' + (s.season - 1) + ' Complete</div>' +
          '<div style="font-size:17px;margin-bottom:16px">Season ' + s.season + ' has begun. Race 1 is waiting.</div>' +
          '<button onclick="MTSM_UI.render(\'league\')">View Final Standings</button>' +
        '</div></div>';
    }

    var race      = s.schedule[s.raceIdx];
    var trk       = race.track;
    var trkRating = MTSM_ENGINE.playerRating(trk);
    var standings = MTSM_ENGINE.getStandings();
    var playerRank = standings.findIndex(function (x) { return x.isPlayer; }) + 1;

    var wearWarnings = SLOTS.map(function (slot) {
      return MTSM_ENGINE.getWear(s.installedParts[slot]) < 15 ? SLOT_LABELS[slot] : null;
    }).filter(Boolean);

    var wearAlert = wearWarnings.length > 0
      ? '<div class="wear-alert">' +
          '<span class="badge badge-red">WARNING</span> Critical wear on: ' + wearWarnings.join(', ') +
          '. DNF risk elevated — overhaul in Garage first.' +
        '</div>'
      : '';

    var biasRows = SLOTS.map(function (slot) {
      var bias = trk.bias[slot] || 1.0;
      var q    = MTSM_ENGINE.getEffectiveQuality(s.installedParts[slot]);
      var wear = MTSM_ENGINE.getWear(s.installedParts[slot]);
      var imp  = bias >= 1.2 ? '<span class="badge badge-red">KEY</span>'
               : bias < 1.0  ? '<span class="badge badge-muted">MINOR</span>' : '';
      return '<tr><td>' + SLOT_LABELS[slot] + '</td><td>' + qBar(q) + '</td>' +
        '<td>' + (wear < 35 ? wearBar(wear) : '') + '</td><td>' + imp + '</td></tr>';
    }).join('');

    return '<div class="sub-screen">' +
      '<div class="sub-screen-header">' + backBtn() +
        '<span class="sub-screen-title">&#127937; RACE — R' + race.round + '/' + s.schedule.length + '</span>' +
      '</div>' +
      '<div class="track-card">' +
        '<div class="track-name">' + trk.name + '</div>' +
        '<div class="track-type-badge track-type-' + trk.type + '">' + trk.type.toUpperCase() + '</div>' +
        '<div style="font-size:16px;color:var(--muted);margin:8px 0">' + trk.desc + '</div>' +
      '</div>' +
      wearAlert +
      '<div class="dash-grid mb-3">' +
        kpi(trkRating + '/99', 'Your Rating') + kpi(posOrdinal(playerRank), 'Championship') +
        kpi(fmtMoney(PRIZE_MONEY[0]), 'P1 Prize') + kpi(s.playerPoints + ' pts', 'Your Points') +
      '</div>' +
      '<div class="panel">' +
        '<div class="section-label">Part Performance at ' + trk.name + '</div>' +
        '<div style="overflow-x:auto;margin-bottom:16px">' +
          '<table class="data-table"><thead><tr><th>Part</th><th>Quality</th><th>Condition</th><th>Impact</th></tr></thead>' +
          '<tbody>' + biasRows + '</tbody></table>' +
        '</div>' +
        '<div style="text-align:center">' +
          '<button class="btn-lg btn-accent" onclick="MTSM_UI.doRace()">&#9654; Start Race!</button>' +
          '<div class="muted mt-3" style="font-size:15px">12-car grid &bull; Variance ±8 &bull; Wear affects DNF chance</div>' +
        '</div>' +
      '</div></div>';
  }

  function renderRaceResult(result) {
    var pos      = result.position;
    var isDNF    = result.dnf;
    var posClass = isDNF ? 'dnf' : pos === 1 ? 'p1' : pos <= 3 ? 'top' : 'low';
    var posLabel = isDNF ? 'DNF' : posOrdinal(pos);

    var gridRows = result.fullGrid.map(function (c) {
      var rowCls = c.isPlayer ? 'player-row' : c.pos === 1 ? 'p1' : c.dnf ? 'dnf-row' : '';
      return '<tr class="' + rowCls + '"><td class="num">' + c.pos + '</td>' +
        '<td>' + (c.isPlayer ? '&#9654; ' : '') + c.name +
          (c.dnf ? ' <span class="badge badge-red">DNF</span>' : '') + '</td></tr>';
    }).join('');

    return '<div class="sub-screen">' +
      '<div class="sub-screen-header">' + backBtn() + '<span class="sub-screen-title">&#127937; RACE RESULT</span></div>' +
      '<div class="panel">' +
        '<div class="result-pos ' + posClass + '">' + posLabel + '</div>' +
        '<div style="text-align:center;margin-bottom:16px">' +
          (isDNF
            ? '<div class="danger" style="font-size:18px">Mechanical failure — no points or prize money earned.</div>'
            : '<div style="font-size:18px">Prize: <strong style="color:var(--primary)">' + fmtMoney(result.prize) +
              '</strong> &bull; Points: <strong style="color:var(--accent)">' + result.points + '</strong></div>'
          ) +
        '</div>' +
        '<div class="section-label">Race Classification</div>' +
        '<div style="overflow-x:auto;margin-bottom:16px">' +
          '<table class="data-table"><thead><tr><th>Pos</th><th>Driver</th></tr></thead>' +
          '<tbody>' + gridRows + '</tbody></table>' +
        '</div>' +
        '<div class="btn-group" style="justify-content:center">' +
          '<button class="btn-accent" onclick="MTSM_UI.dismissResult()">Continue &rarr;</button>' +
        '</div>' +
      '</div></div>';
  }

  function doRace() {
    var res = MTSM_ENGINE.simulateRace();
    if (!res.success) { showNotification(res.msg, true); return; }
    render('race');
  }

  function dismissResult() {
    state().pendingResult = null;
    MTSM_ENGINE.saveGame();
    MTSM_ENGINE.triggerRandomEvent();
    render('hub');
  }

  // ── League ────────────────────────────────────────────────────────────────────
  function renderLeague() {
    var s         = state();
    var list      = MTSM_ENGINE.getStandings();
    var racesLeft = s.schedule.length - s.raceIdx;
    var tier      = MTSM_ENGINE.getLeagueTier();

    var totalPages = Math.max(1, Math.ceil(list.length / LEAGUE_PAGE_SIZE));
    if (_leaguePage >= totalPages) _leaguePage = totalPages - 1;

    var pageStart = _leaguePage * LEAGUE_PAGE_SIZE;
    var pageItems = list.slice(pageStart, pageStart + LEAGUE_PAGE_SIZE);

    var rows = pageItems.map(function (entry, i) {
      var pos    = pageStart + i + 1;
      var isP1   = pos === 1;
      var isP3   = pos === 3;
      var rowCls = entry.isPlayer ? 'lg-player' : isP1 ? 'lg-p1' : isP3 ? 'lg-p3' : '';
      return '<tr class="' + rowCls + '">' +
        '<td class="num-col">' + pos + '</td>' +
        '<td>' + (entry.isPlayer ? '&#9654; ' : '') + entry.name + '</td>' +
        '<td>' + entry.carName + '</td>' +
        '<td class="num-col">' + entry.wins + '</td>' +
        '<td class="num-col">' + entry.points + '</td>' +
      '</tr>';
    }).join('');

    var pagination =
      '<div class="page-nav">' +
        '<button class="page-nav-btn" onclick="MTSM_UI.leaguePage(-1)"' +
          (_leaguePage === 0 ? ' disabled' : '') + '>&#9664;</button>' +
        '<span class="page-nav-info">' + (_leaguePage + 1) + ' / ' + totalPages + '</span>' +
        '<button class="page-nav-btn" onclick="MTSM_UI.leaguePage(1)"' +
          (_leaguePage >= totalPages - 1 ? ' disabled' : '') + '>&#9654;</button>' +
      '</div>';

    return '<div>' +
      '<div class="league-header-bar">' +
        backBtn() +
        '<div class="league-title-wrap">' +
          '<div class="league-title-box">' +
            '<span class="league-trophy">&#127942;</span>' +
            '<span class="league-title-text">' + tier.name + ' LEAGUE</span>' +
            '<span class="league-trophy">&#127942;</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="league-table-wrap">' +
        '<table class="league-table">' +
          '<thead><tr>' +
            '<th class="num-col">POS</th><th>DRIVER</th><th>CAR</th>' +
            '<th class="num-col">WINS</th><th class="num-col">POINTS</th>' +
          '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>' +
      '<div class="league-footer">' +
        '<span class="league-tagline">COMPETE. WIN. BECOME ICONIC.</span>' +
        pagination +
      '</div>' +
    '</div>';
  }

  function leaguePage(delta) {
    var list  = MTSM_ENGINE.getStandings();
    var total = Math.max(1, Math.ceil(list.length / LEAGUE_PAGE_SIZE));
    _leaguePage = Math.max(0, Math.min(total - 1, _leaguePage + delta));
    render('league');
  }

  // ── Staff Stat ─────────────────────────────────────────────────────────────────
  function renderStats() {
    var s = state();

    if (s.raceHistory.length === 0) {
      return '<div class="sub-screen">' +
        '<div class="sub-screen-header">' + backBtn() + '<span class="sub-screen-title">&#128200; STAFF STAT</span></div>' +
        '<div class="panel"><div class="muted" style="padding:20px 0">No races completed yet.</div></div>' +
      '</div>';
    }

    var wins    = s.raceHistory.filter(function (h) { return h.position === 1 && !h.dnf; }).length;
    var podiums = s.raceHistory.filter(function (h) { return h.position <= 3 && !h.dnf; }).length;
    var dnfs    = s.raceHistory.filter(function (h) { return h.dnf; }).length;
    var total   = s.raceHistory.length;
    var nonDNF    = total - dnfs;
    var avgPosStr = nonDNF > 0
      ? (s.raceHistory.filter(function (h) { return !h.dnf; })
           .reduce(function (a, h) { return a + h.position; }, 0) / nonDNF).toFixed(1)
      : '—';
    var totalPrize = s.raceHistory.reduce(function (a, h) { return a + h.prize; }, 0);
    var winRate    = Math.round((wins / total) * 100);
    var podiumRate = Math.round((podiums / total) * 100);
    var dnfRate    = Math.round((dnfs / total) * 100);

    var analyticsHtml =
      '<div class="panel">' +
        '<div class="section-label">Career Analytics</div>' +
        '<div class="dash-grid mb-3" style="grid-template-columns:repeat(4,1fr)">' +
          kpi(wins, 'Wins') + kpi(podiums, 'Podiums') +
          kpi(total, 'Races') + kpi(fmtMoney(totalPrize), 'Earned') +
        '</div>' +
        '<div class="stat-bar-wrap">' +
          '<div class="stat-bar-label">WIN RATE <span class="stat-bar-val">' + winRate + '%</span></div>' +
          '<div class="stat-bar-track"><div class="stat-bar-fill" style="width:' + winRate + '%"></div></div>' +
        '</div>' +
        '<div class="stat-bar-wrap">' +
          '<div class="stat-bar-label">PODIUM RATE <span class="stat-bar-val">' + podiumRate + '%</span></div>' +
          '<div class="stat-bar-track"><div class="stat-bar-fill accent" style="width:' + podiumRate + '%"></div></div>' +
        '</div>' +
        '<div class="stat-bar-wrap">' +
          '<div class="stat-bar-label">DNF RATE <span class="stat-bar-val">' + dnfRate + '%</span></div>' +
          '<div class="stat-bar-track"><div class="stat-bar-fill" style="width:' + dnfRate + '%;background:var(--danger)"></div></div>' +
        '</div>' +
        '<div style="margin-top:10px;font-size:16px;color:var(--muted)">Avg finish (excl DNF): <span style="color:var(--text)">' + avgPosStr + '</span></div>' +
      '</div>';

    var raceRows = s.raceHistory.slice().reverse().map(function (h) {
      var posClass = h.dnf ? 'danger' : h.position === 1 ? 'accent' : h.position <= 3 ? 'primary' : '';
      return '<tr' + (h.position === 1 ? ' class="p1"' : '') + '>' +
        '<td class="muted">S' + h.season + ' R' + h.round + '</td>' +
        '<td>' + h.track + '</td>' +
        '<td class="num ' + posClass + '">' + (h.dnf ? 'DNF' : posOrdinal(h.position)) + '</td>' +
        '<td class="num">' + (h.dnf ? '—' : fmtMoney(h.prize)) + '</td>' +
        '<td class="num accent">' + (h.dnf ? '—' : h.points + ' pts') + '</td>' +
      '</tr>';
    }).join('');

    var seasonRows = (s.seasonHistory || []).map(function (sh) {
      return '<tr' + (sh.rank === 1 ? ' class="p1"' : '') + '>' +
        '<td>Season ' + sh.season + '</td>' +
        '<td class="num">' + posOrdinal(sh.rank) + '</td>' +
        '<td class="num accent">' + sh.points + '</td>' +
        '<td class="num">' + sh.wins + '</td>' +
        '<td>' + (sh.rank === 1 ? '<span class="badge badge-yellow">CHAMPION</span>' : sh.champion) + '</td>' +
      '</tr>';
    }).join('');

    var seasonPanel = seasonRows
      ? '<div class="panel"><div class="section-label">Season History</div><div style="overflow-x:auto">' +
          '<table class="data-table"><thead><tr><th>Season</th><th>Rank</th><th>Points</th><th>Wins</th><th>Champion</th></tr></thead>' +
          '<tbody>' + seasonRows + '</tbody></table></div></div>'
      : '';

    return '<div class="sub-screen">' +
      '<div class="sub-screen-header">' + backBtn() + '<span class="sub-screen-title">&#128200; STAFF STAT</span></div>' +
      analyticsHtml +
      '<div class="panel"><div class="section-label">Race Log</div><div style="overflow-x:auto">' +
        '<table class="data-table"><thead><tr><th>Race</th><th>Circuit</th><th>Pos</th><th>Prize</th><th>Pts</th></tr></thead>' +
        '<tbody>' + raceRows + '</tbody></table></div></div>' +
      seasonPanel +
    '</div>';
  }

  // ── Start Screen ──────────────────────────────────────────────────────────────
  function renderStartScreen() {
    app().className = 'start-active';
    app().innerHTML =
      '<div class="start-screen" id="start-screen-div">' +
        '<div class="game-bg-mountains"></div>' +
        '<div class="game-bg-trees-l"></div>' +
        '<div class="game-bg-trees-r"></div>' +
        '<div class="game-bg-track-area"></div>' +
        cloudHTML() +
        '<div class="start-car-wrap">' + carSVG(false) + '</div>' +
        '<div class="start-title-block">' +
          '<div class="start-game-title">MOTOR TEAM<br>SPORTS MANAGER</div>' +
          '<div class="start-subtitle">Build. Race. Dominate.</div>' +
        '</div>' +
        '<div class="start-press-key">— PRESS ANY KEY TO START —</div>' +
        '<div class="start-version">v1.0</div>' +
      '</div>';

    if (_startKeyHandler) document.removeEventListener('keydown', _startKeyHandler);
    _startKeyHandler = function () { _startScreenProceed(); };
    document.addEventListener('keydown', _startKeyHandler);
    $('start-screen-div').addEventListener('click', function () { _startScreenProceed(); });
  }

  function _startScreenProceed() {
    if (_startKeyHandler) {
      document.removeEventListener('keydown', _startKeyHandler);
      _startKeyHandler = null;
    }
    app().className = '';
    if (MTSM_ENGINE.loadGame()) {
      render('hub');
    } else {
      renderMenu();
    }
  }

  // ── Shared ────────────────────────────────────────────────────────────────────
  function kpi(val, label) {
    return '<div class="kpi-box">' +
      '<div class="kpi-val">' + val + '</div>' +
      '<div class="kpi-label">' + label + '</div>' +
    '</div>';
  }

  // ── Public ────────────────────────────────────────────────────────────────────
  return {
    render:              render,
    renderStartScreen:   renderStartScreen,
    _startScreenProceed: _startScreenProceed,
    renderMenu:          renderMenu,
    renderNewGame:       renderNewGame,
    startGame:           startGame,
    continueGame:        continueGame,
    selectDiff:          selectDiff,
    confirmDelete:       confirmDelete,
    _doDelete:           _doDelete,
    setMarketCat:        setMarketCat,
    doBuy:               doBuy,
    doInstall:           doInstall,
    doMaintain:          doMaintain,
    doSellGarage:        doSellGarage,
    _confirmSellGarage:  _confirmSellGarage,
    doSavePreset:        doSavePreset,
    _confirmSavePreset:  _confirmSavePreset,
    doLoadPreset:        doLoadPreset,
    _confirmLoadPreset:  _confirmLoadPreset,
    doRace:              doRace,
    dismissResult:       dismissResult,
    tutorialNext:        tutorialNext,
    tutorialDone:        tutorialDone,
    acceptEvent:         acceptEvent,
    leaguePage:          leaguePage,
    showNotification:    showNotification,
    showModal:           showModal,
    closeModal:          closeModal
  };
})();
