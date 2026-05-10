// ─── MTSM_UI ─────────────────────────────────────────────────────────────────
var MTSM_UI = (function () {
  'use strict';

  var _tab       = 'dashboard';
  var _mktCat    = '';
  var _notifTimer = null;

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function $(id)   { return document.getElementById(id); }
  function app()   { return $('app'); }
  function state() { return MTSM_ENGINE.getState(); }

  function qBar(quality) {
    var pct   = quality;
    var cls   = quality >= 65 ? '' : quality >= 40 ? ' mid' : ' low';
    return '<span class="q-bar">' +
      '<span class="q-bar-track"><span class="q-bar-fill' + cls + '" style="width:' + pct + '%"></span></span>' +
      '<span class="q-bar-num">' + quality + '</span>' +
      '</span>';
  }

  function fmtMoney(n) { return '£' + n.toLocaleString(); }

  function posOrdinal(n) {
    var s = ['th','st','nd','rd'], v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  // ── Notification ─────────────────────────────────────────────────────────────
  function showNotification(msg, isError) {
    var el = $('notification');
    if (!el) return;
    el.textContent = msg;
    el.className   = 'visible' + (isError ? ' error' : '');
    if (_notifTimer) clearTimeout(_notifTimer);
    _notifTimer = setTimeout(function () {
      el.className = '';
    }, isError ? 4000 : 3000);
  }

  // ── Modal ────────────────────────────────────────────────────────────────────
  function showModal(title, bodyHtml, footerHtml) {
    $('modal-title').innerHTML  = title;
    $('modal-body').innerHTML   = bodyHtml;
    $('modal-footer').innerHTML = footerHtml || '<button onclick="MTSM_UI.closeModal()">Close</button>';
    $('modal-overlay').className = 'visible';
  }

  function closeModal() { $('modal-overlay').className = ''; }

  // ── Main render dispatcher ───────────────────────────────────────────────────
  function render(tab) {
    if (tab) _tab = tab;
    var s = state();
    if (!s) { renderMenu(); return; }

    var html = '<div class="nav">' +
      navTab('dashboard', '&#128200; Dashboard') +
      navTab('garage',    '&#128295; Garage') +
      navTab('market',    '&#128722; Market') +
      navTab('race',      '&#127937; Race') +
      navTab('standings', '&#127942; Standings') +
      navTab('history',   '&#128196; History') +
    '</div>';

    switch (_tab) {
      case 'garage':    html += renderGarage();    break;
      case 'market':    html += renderMarket();    break;
      case 'race':      html += renderRace();      break;
      case 'standings': html += renderStandings(); break;
      case 'history':   html += renderHistory();   break;
      default:          html += renderDashboard(); break;
    }

    app().innerHTML = html;
  }

  function navTab(id, label) {
    return '<button class="nav-tab' + (_tab === id ? ' active' : '') +
      '" onclick="MTSM_UI.render(\'' + id + '\')">' + label + '</button>';
  }

  // ── Menu ─────────────────────────────────────────────────────────────────────
  function renderMenu() {
    var hasSave = MTSM_ENGINE.hasSave();
    app().innerHTML =
      '<div class="menu-screen">' +
        '<div class="game-title">MOTOR TEAM<br>SPORTS MANAGER</div>' +
        '<div class="game-subtitle">Build. Race. Dominate.</div>' +
        '<div class="menu-btns">' +
          '<button class="btn-lg" onclick="MTSM_UI.renderNewGame()">&#9654; New Game</button>' +
          (hasSave ? '<button class="btn-lg btn-accent" onclick="MTSM_UI.continueGame()">&#9654; Continue</button>' : '') +
        '</div>' +
        '<div style="margin-top:48px;font-size:14px;color:var(--muted)">37 Car Parts &bull; 10 Circuits &bull; 11 Rivals</div>' +
      '</div>';
  }

  function renderNewGame() {
    app().innerHTML =
      '<div class="panel">' +
        '<div class="panel-header">&#10010; New Game</div>' +
        '<div class="form-row">' +
          '<label>Team Name</label>' +
          '<input type="text" id="team-name" value="Team Apex" maxlength="24">' +
        '</div>' +
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
          '<button onclick="MTSM_UI.startGame()">&#9654; Start Season</button>' +
          '<button onclick="MTSM_UI.renderMenu()" style="border-color:var(--muted);color:var(--muted)">&#8592; Back</button>' +
        '</div>' +
      '</div>';
  }

  function diffCard(id, label, descHtml, sel) {
    return '<div class="diff-card' + (sel ? ' sel' : '') + '" id="dc-' + id + '" onclick="MTSM_UI.selectDiff(\'' + id + '\')">' +
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
    var name = ($('team-name').value || '').trim() || 'Team Apex';
    var diff = $('difficulty').value || 'normal';
    MTSM_ENGINE.newGame(name, diff);
    _tab = 'dashboard';
    render();
  }

  function continueGame() {
    if (MTSM_ENGINE.loadGame()) {
      _tab = 'dashboard';
      render();
    }
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────────
  function renderDashboard() {
    var s   = state();
    var ovr = MTSM_ENGINE.playerRating();
    var nextRace = s.raceIdx < s.schedule.length ? s.schedule[s.raceIdx] : null;
    var standings = MTSM_ENGINE.getStandings();
    var playerRank = standings.findIndex(function (x) { return x.isPlayer; }) + 1;

    var kpis =
      '<div class="dash-grid">' +
        kpi(fmtMoney(s.balance), 'Balance') +
        kpi(ovr + ' / 99', 'Car Rating') +
        kpi(posOrdinal(playerRank), 'Championship') +
        kpi(s.playerPoints + ' pts', 'Points') +
        kpi('Season ' + s.season, 'Season') +
        kpi(s.raceIdx + ' / ' + s.schedule.length, 'Races Done') +
      '</div>';

    var nextRaceHtml = '';
    if (nextRace) {
      var trk = nextRace.track;
      var trkRating = MTSM_ENGINE.playerRating(trk);
      nextRaceHtml =
        '<div class="track-card">' +
          '<div class="section-label">Next Race — Round ' + nextRace.round + '</div>' +
          '<div class="track-name">' + trk.name + '</div>' +
          '<div class="track-type-badge track-type-' + trk.type + '">' + trk.type.toUpperCase() + '</div>' +
          '<div style="font-size:16px;color:var(--muted);margin-bottom:10px">' + trk.desc + '</div>' +
          '<div style="font-size:16px">Your car rating at this track: <span style="color:var(--primary);font-family:var(--font-head);font-size:14px">' + trkRating + '</span></div>' +
          '<div style="margin-top:12px">' +
            '<button onclick="MTSM_UI.render(\'race\')" class="btn-accent">&#127937; Go to Race &rarr;</button>' +
          '</div>' +
        '</div>';
    } else {
      nextRaceHtml =
        '<div class="track-card">' +
          '<div class="section-label">Season ' + (s.season - 1) + ' Complete</div>' +
          '<div style="font-size:17px;margin-bottom:10px">Season ' + s.season + ' has started! Race 1 of 10 is waiting.</div>' +
          '<button onclick="MTSM_UI.render(\'race\')" class="btn-accent">&#127937; Race Now &rarr;</button>' +
        '</div>';
    }

    var news = s.news.slice(0, 5).map(function (n) {
      return '<div class="news-item">' + n.msg + '</div>';
    }).join('');

    return '<div class="panel"><div class="panel-header">&#128200; Dashboard — ' + s.teamName + '</div>' + kpis + '</div>' +
           nextRaceHtml +
           '<div class="panel"><div class="section-label">Recent News</div>' + (news || '<div class="muted">No news yet.</div>') + '</div>';
  }

  function kpi(val, label) {
    return '<div class="kpi-box">' +
      '<div class="kpi-val">' + val + '</div>' +
      '<div class="kpi-label">' + label + '</div>' +
    '</div>';
  }

  // ── Garage ────────────────────────────────────────────────────────────────────
  function renderGarage() {
    var s   = state();
    var ovr = MTSM_ENGINE.playerRating();

    var slots = SLOTS.map(function (slot) {
      var part = MTSM_ENGINE.installedPart(slot);
      var garageParts = s.garage.filter(function (g) { return g.slot === slot; });

      var swapOptions = garageParts.map(function (g) {
        var p = MTSM_ENGINE.getPartById(g.id);
        return '<option value="' + g.id + '">' + p.name + ' (' + p.quality + ')</option>';
      }).join('');

      var swapHtml = garageParts.length > 0
        ? '<select id="swap-' + slot + '">' +
            '<option value="">-- Select to install --</option>' +
            swapOptions +
          '</select>' +
          ' <button class="btn-sm" onclick="MTSM_UI.doInstall(\'' + slot + '\')">Install</button>'
        : '<span class="muted" style="font-size:15px">No spares — buy from Market</span>';

      return '<div class="slot-card">' +
        '<div class="slot-card-header">' +
          '<span class="slot-name">' + SLOT_LABELS[slot] + '</span>' +
          qBar(part ? part.quality : 0) +
        '</div>' +
        '<div class="part-name">' + (part ? part.name : 'None') + '</div>' +
        '<div class="part-desc">' + (part ? part.desc : '') + '</div>' +
        '<div style="margin-top:8px">' + swapHtml + '</div>' +
      '</div>';
    }).join('');

    var spares = s.garage.length === 0
      ? '<div class="muted" style="padding:10px 0">Garage is empty. Buy parts from the Market.</div>'
      : s.garage.map(function (g) {
          var p = MTSM_ENGINE.getPartById(g.id);
          return '<tr>' +
            '<td><span class="muted">' + SLOT_LABELS[g.slot] + '</span></td>' +
            '<td>' + p.name + '</td>' +
            '<td>' + qBar(p.quality) + '</td>' +
            '<td class="num">' + fmtMoney(p.sell) + '</td>' +
            '<td><button class="btn-sm btn-danger" onclick="MTSM_UI.doSellGarage(\'' + g.id + '\')">Sell</button></td>' +
          '</tr>';
        }).join('');

    var sparesTable = s.garage.length > 0
      ? '<div style="overflow-x:auto"><table class="data-table">' +
          '<thead><tr><th>Slot</th><th>Part</th><th>Quality</th><th>Sell</th><th></th></tr></thead>' +
          '<tbody>' + spares + '</tbody>' +
        '</table></div>'
      : spares;

    return '<div class="panel">' +
        '<div class="panel-header">&#128295; Garage</div>' +
        '<div style="text-align:center;margin-bottom:16px">' +
          '<div class="rating-ring">' +
            '<div class="rating-ring-val">' + ovr + '</div>' +
            '<div class="rating-ring-lbl">OVERALL</div>' +
          '</div>' +
          '<div class="muted" style="font-size:15px">Overall car rating</div>' +
        '</div>' +
        '<div class="section-label">Installed Parts</div>' +
        slots +
      '</div>' +
      '<div class="panel">' +
        '<div class="section-label">Spare Parts in Garage</div>' +
        sparesTable +
      '</div>';
  }

  function doInstall(slot) {
    var sel = $('swap-' + slot);
    if (!sel || !sel.value) { showNotification('Select a part to install.', true); return; }
    var res = MTSM_ENGINE.installPart(sel.value);
    showNotification(res.msg, !res.success);
    if (res.success) render();
  }

  function doSellGarage(partId) {
    var part = MTSM_ENGINE.getPartById(partId);
    showModal(
      'Sell Part',
      'Sell <strong>' + part.name + '</strong> for <strong>' + fmtMoney(part.sell) + '</strong>?',
      '<button class="btn-danger" onclick="MTSM_UI._confirmSellGarage(\'' + partId + '\')">Sell</button>' +
      '<button onclick="MTSM_UI.closeModal()" style="border-color:var(--muted);color:var(--muted)">Cancel</button>'
    );
  }

  function _confirmSellGarage(partId) {
    closeModal();
    var res = MTSM_ENGINE.sellGaragePart(partId);
    showNotification(res.msg, !res.success);
    if (res.success) render();
  }

  // ── Parts Market ───────────────────────────────────────────────────────────────
  function renderMarket() {
    var s = state();

    var catFilter =
      '<div class="flex flex-wrap gap-2 mb-4">' +
        catBtn('', 'All') +
        SLOTS.map(function (sl) { return catBtn(sl, SLOT_LABELS[sl]); }).join('') +
      '</div>';

    var parts = [];
    SLOTS.forEach(function (slot) {
      if (_mktCat && _mktCat !== slot) return;
      PARTS_CATALOGUE[slot].forEach(function (p) { parts.push(Object.assign({}, p, { slot: slot })); });
    });

    var rows = parts.map(function (p) {
      var isInstalled = state().installedParts[p.slot] === p.id;
      var inGarage    = state().garage.some(function (g) { return g.id === p.id; });
      var owned       = isInstalled || inGarage;
      var canAfford   = !owned && state().balance >= p.price;
      var isStarter   = p.price === 0;

      var badge = isInstalled ? '<span class="badge badge-green">INSTALLED</span>'
                : inGarage   ? '<span class="badge badge-blue">IN GARAGE</span>'
                : '';

      var buyBtn = isStarter
        ? '<span class="muted" style="font-size:14px">Starter</span>'
        : owned
          ? '<span class="badge badge-muted">OWNED</span>'
          : '<button class="btn-sm' + (!canAfford ? ' btn-danger' : '') +
            '" onclick="MTSM_UI.doBuy(\'' + p.id + '\')"' +
            (!canAfford ? ' title="Need ' + fmtMoney(p.price) + '"' : '') + '>' +
            'Buy ' + fmtMoney(p.price) + '</button>';

      return '<tr' + (isInstalled ? ' class="player-row"' : '') + '>' +
        '<td><span class="muted">' + SLOT_LABELS[p.slot] + '</span></td>' +
        '<td>' + p.name + ' ' + badge + '<br><span class="muted" style="font-size:14px">' + p.desc + '</span></td>' +
        '<td>' + qBar(p.quality) + '</td>' +
        '<td class="num muted" style="font-size:15px">' + (p.sell > 0 ? fmtMoney(p.sell) : '—') + '</td>' +
        '<td>' + buyBtn + '</td>' +
      '</tr>';
    }).join('');

    return '<div class="panel">' +
      '<div class="panel-header">&#128722; Parts Market</div>' +
      '<div style="margin-bottom:8px;font-family:var(--font-head);font-size:8px;color:var(--muted)">' +
        'Balance: <span style="color:var(--primary)">' + fmtMoney(s.balance) + '</span>' +
      '</div>' +
      catFilter +
      '<div style="overflow-x:auto">' +
        '<table class="data-table">' +
          '<thead><tr><th>Slot</th><th>Part</th><th>Quality</th><th>Resale</th><th></th></tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>' +
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

    // If there's a pending result to show, display it
    if (s.pendingResult) {
      return renderRaceResult(s.pendingResult);
    }

    if (s.raceIdx >= s.schedule.length) {
      return '<div class="panel"><div class="panel-header">&#127937; Race</div>' +
        '<div style="text-align:center;padding:30px 0">' +
          '<div class="section-label">Season ' + (s.season - 1) + ' Complete</div>' +
          '<div style="font-size:17px;margin-bottom:16px">All races finished. Season ' + s.season + ' has begun.</div>' +
          '<button onclick="MTSM_UI.render(\'standings\')">View Final Standings</button>' +
        '</div></div>';
    }

    var race = s.schedule[s.raceIdx];
    var trk  = race.track;
    var trkRating = MTSM_ENGINE.playerRating(trk);
    var standings = MTSM_ENGINE.getStandings();
    var leader = standings[0];
    var playerRank = standings.findIndex(function (x) { return x.isPlayer; }) + 1;

    // Bias breakdown bars
    var biasRows = SLOTS.map(function (slot) {
      var bias = trk.bias[slot] || 1.0;
      var part = MTSM_ENGINE.installedPart(slot);
      var q    = part ? part.quality : 0;
      var imp  = bias >= 1.2 ? '<span class="badge badge-red">KEY</span>' : bias >= 1.0 ? '' : '<span class="badge badge-muted">MINOR</span>';
      return '<tr>' +
        '<td>' + SLOT_LABELS[slot] + '</td>' +
        '<td>' + qBar(q) + '</td>' +
        '<td>' + imp + '</td>' +
      '</tr>';
    }).join('');

    return '<div class="panel">' +
      '<div class="panel-header">&#127937; Race — Round ' + race.round + ' of ' + s.schedule.length + '</div>' +
      '<div class="track-card">' +
        '<div class="track-name">' + trk.name + '</div>' +
        '<div class="track-type-badge track-type-' + trk.type + '">' + trk.type.toUpperCase() + '</div>' +
        '<div style="font-size:16px;color:var(--muted);margin:8px 0">' + trk.desc + '</div>' +
      '</div>' +

      '<div class="dash-grid mb-3">' +
        kpi(trkRating + ' / 99', 'Your Rating') +
        kpi(posOrdinal(playerRank), 'Championship') +
        kpi(fmtMoney(PRIZE_MONEY[0]), 'P1 Prize') +
        kpi(s.playerPoints + ' pts', 'Your Points') +
      '</div>' +

      '<div class="section-label">Part Performance at this Track</div>' +
      '<div style="overflow-x:auto;margin-bottom:16px">' +
        '<table class="data-table">' +
          '<thead><tr><th>Part</th><th>Quality</th><th>Impact</th></tr></thead>' +
          '<tbody>' + biasRows + '</tbody>' +
        '</table>' +
      '</div>' +

      '<div style="text-align:center">' +
        '<button class="btn-lg btn-accent" onclick="MTSM_UI.doRace()">&#9654; Start Race!</button>' +
        '<div class="muted mt-3" style="font-size:15px">12-car grid &bull; Random variance applies &bull; 5% DNF chance</div>' +
      '</div>' +
    '</div>';
  }

  function renderRaceResult(result) {
    var pos    = result.position;
    var isDNF  = result.dnf;
    var posClass = isDNF ? 'dnf' : pos === 1 ? 'p1' : pos <= 3 ? 'top' : 'low';
    var posLabel = isDNF ? 'DNF' : posOrdinal(pos);

    var gridRows = result.fullGrid.map(function (c) {
      var rowCls = c.isPlayer ? 'player-row' : c.pos === 1 ? 'p1' : c.dnf ? 'dnf-row' : '';
      return '<tr class="' + rowCls + '">' +
        '<td class="num">' + c.pos + '</td>' +
        '<td>' + (c.isPlayer ? '&#9654; ' : '') + c.name + (c.dnf ? ' <span class="badge badge-red">DNF</span>' : '') + '</td>' +
      '</tr>';
    }).join('');

    return '<div class="panel">' +
      '<div class="panel-header">&#127937; Race Result</div>' +
      '<div class="result-pos ' + posClass + '">' + posLabel + '</div>' +
      '<div style="text-align:center;margin-bottom:16px">' +
        (isDNF
          ? '<div class="danger" style="font-size:18px">Mechanical failure — no points or prize money earned.</div>'
          : '<div style="font-size:18px">' +
              'Prize: <strong style="color:var(--primary)">' + fmtMoney(result.prize) + '</strong> &bull; ' +
              'Points: <strong style="color:var(--accent)">' + result.points + '</strong>' +
            '</div>'
        ) +
      '</div>' +

      '<div class="section-label">Race Classification</div>' +
      '<div style="overflow-x:auto;margin-bottom:16px">' +
        '<table class="data-table">' +
          '<thead><tr><th>Pos</th><th>Driver</th></tr></thead>' +
          '<tbody>' + gridRows + '</tbody>' +
        '</table>' +
      '</div>' +

      '<div class="btn-group" style="justify-content:center">' +
        '<button class="btn-accent" onclick="MTSM_UI.dismissResult()">Continue &rarr;</button>' +
      '</div>' +
    '</div>';
  }

  function doRace() {
    var res = MTSM_ENGINE.simulateRace();
    if (!res.success) { showNotification(res.msg, true); return; }
    render('race');
  }

  function dismissResult() {
    state().pendingResult = null;
    MTSM_ENGINE.saveGame();
    render('race');
  }

  // ── Standings ─────────────────────────────────────────────────────────────────
  function renderStandings() {
    var s = state();
    var list = MTSM_ENGINE.getStandings();

    var rows = list.map(function (entry, i) {
      var pos    = i + 1;
      var rowCls = entry.isPlayer ? 'player-row' : pos === 1 ? 'p1' : '';
      return '<tr class="' + rowCls + '">' +
        '<td class="num">' + pos + '</td>' +
        '<td>' + (entry.isPlayer ? '&#9654; ' : '') + entry.name + '</td>' +
        '<td class="num accent">' + entry.points + '</td>' +
        '<td class="num">' + entry.wins + '</td>' +
      '</tr>';
    }).join('');

    var racesLeft = s.schedule.length - s.raceIdx;

    return '<div class="panel">' +
      '<div class="panel-header">&#127942; Championship Standings — Season ' + s.season + '</div>' +
      '<div class="muted mb-3" style="font-size:15px">' + racesLeft + ' race(s) remaining</div>' +
      '<div style="overflow-x:auto">' +
        '<table class="data-table">' +
          '<thead><tr><th>Pos</th><th>Driver</th><th>Points</th><th>Wins</th></tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>' +
    '</div>';
  }

  // ── History ───────────────────────────────────────────────────────────────────
  function renderHistory() {
    var s = state();

    if (s.raceHistory.length === 0) {
      return '<div class="panel">' +
        '<div class="panel-header">&#128196; Race History</div>' +
        '<div class="muted" style="padding:20px 0">No races completed yet.</div>' +
      '</div>';
    }

    var rows = s.raceHistory.slice().reverse().map(function (h) {
      var posClass = h.dnf ? 'danger' : h.position === 1 ? 'accent' : h.position <= 3 ? 'primary' : '';
      return '<tr' + (h.position === 1 ? ' class="p1"' : '') + '>' +
        '<td class="muted">S' + h.season + ' R' + h.round + '</td>' +
        '<td>' + h.track + '</td>' +
        '<td class="num ' + posClass + '">' + (h.dnf ? 'DNF' : posOrdinal(h.position)) + '</td>' +
        '<td class="num">' + (h.dnf ? '—' : fmtMoney(h.prize)) + '</td>' +
        '<td class="num accent">' + (h.dnf ? '—' : h.points + ' pts') + '</td>' +
      '</tr>';
    }).join('');

    var totalPrize = s.raceHistory.reduce(function (a, h) { return a + h.prize; }, 0);
    var wins       = s.raceHistory.filter(function (h) { return h.position === 1; }).length;
    var podiums    = s.raceHistory.filter(function (h) { return h.position <= 3 && !h.dnf; }).length;

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
      ? '<div class="panel">' +
          '<div class="section-label">Season History</div>' +
          '<div style="overflow-x:auto">' +
            '<table class="data-table">' +
              '<thead><tr><th>Season</th><th>Rank</th><th>Points</th><th>Wins</th><th>Champion</th></tr></thead>' +
              '<tbody>' + seasonRows + '</tbody>' +
            '</table>' +
          '</div>' +
        '</div>'
      : '';

    return '<div class="panel">' +
      '<div class="panel-header">&#128196; Race History</div>' +
      '<div class="dash-grid mb-3">' +
        kpi(wins,              'Wins') +
        kpi(podiums,           'Podiums') +
        kpi(s.raceHistory.length, 'Races') +
        kpi(fmtMoney(totalPrize), 'Total Earned') +
      '</div>' +
      '<div style="overflow-x:auto">' +
        '<table class="data-table">' +
          '<thead><tr><th>Race</th><th>Circuit</th><th>Pos</th><th>Prize</th><th>Pts</th></tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>' +
    '</div>' + seasonPanel;
  }

  // ── Public ────────────────────────────────────────────────────────────────────
  return {
    render:           render,
    renderMenu:       renderMenu,
    renderNewGame:    renderNewGame,
    startGame:        startGame,
    continueGame:     continueGame,
    selectDiff:       selectDiff,
    setMarketCat:     setMarketCat,
    doBuy:            doBuy,
    doInstall:        doInstall,
    doSellGarage:     doSellGarage,
    _confirmSellGarage: _confirmSellGarage,
    doRace:           doRace,
    dismissResult:    dismissResult,
    showNotification: showNotification,
    showModal:        showModal,
    closeModal:       closeModal
  };
})();
