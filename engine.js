// ─── MTSM_ENGINE ─────────────────────────────────────────────────────────────
const MTSM_ENGINE = (function () {
  'use strict';

  const SAVE_KEY = 'mtsm_car_save';
  const RACES_PER_SEASON = 10;

  const STARTER_PARTS = {
    engine: 'eng-1', tires: 'tir-1', suspension: 'sus-1',
    brakes: 'brk-1', boost: 'bst-0', aero: 'aer-0', transmission: 'trn-1'
  };

  let state = null;

  // ── Part lookup ─────────────────────────────────────────────────────────────
  function getPartById(id) {
    for (const slot of SLOTS) {
      const p = PARTS_CATALOGUE[slot].find(function (p) { return p.id === id; });
      if (p) return Object.assign({}, p, { slot: slot });
    }
    return null;
  }

  function installedPart(slot) {
    return getPartById(state.installedParts[slot]);
  }

  // ── Wear system ─────────────────────────────────────────────────────────────
  function getWear(partId) {
    if (!state.partWear || state.partWear[partId] === undefined) return 100;
    return state.partWear[partId];
  }

  function getEffectiveQuality(partId) {
    var part = getPartById(partId);
    if (!part) return 0;
    var wear = getWear(partId);
    if (wear < 15) return Math.round(part.quality * 0.70);
    if (wear < 35) return Math.round(part.quality * 0.85);
    return part.quality;
  }

  function getWearStatus(wear) {
    if (wear >= 70) return { label: 'Good',     cls: 'good'     };
    if (wear >= 40) return { label: 'Worn',     cls: 'mid'      };
    if (wear >= 15) return { label: 'Poor',     cls: 'low'      };
    return               { label: 'Critical', cls: 'critical' };
  }

  function maintainPart(partId) {
    var part = getPartById(partId);
    if (!part) return { success: false, msg: 'Part not found.' };
    var wear = getWear(partId);
    if (wear >= 95) return { success: false, msg: 'Part is already in peak condition.' };
    var cost = Math.max(200, Math.ceil(part.quality * 55 * (1 - wear / 100)));
    if (state.balance < cost)
      return { success: false, msg: 'Not enough funds. Need £' + cost.toLocaleString() + '.' };
    state.balance -= cost;
    if (!state.partWear) state.partWear = {};
    state.partWear[partId] = 100;
    saveGame();
    return { success: true, msg: part.name + ' overhauled for £' + cost.toLocaleString() + '.' };
  }

  // ── Performance calculation ─────────────────────────────────────────────────
  function calcRating(installedMap, track) {
    var total = 0, weightSum = 0;
    SLOTS.forEach(function (slot) {
      var q    = getEffectiveQuality(installedMap[slot]);
      var bias = track ? (track.bias[slot] || 1.0) : 1.0;
      total     += q * bias;
      weightSum += bias;
    });
    return Math.round(total / weightSum);
  }

  function playerRating(track) {
    return calcRating(state.installedParts, track);
  }

  // ── League tier ─────────────────────────────────────────────────────────────
  function getLeagueTier() {
    var champs = state.totalChampionships || 0;
    var tier = LEAGUE_TIERS[0];
    for (var i = 0; i < LEAGUE_TIERS.length; i++) {
      if (champs >= LEAGUE_TIERS[i].minWins) tier = LEAGUE_TIERS[i];
    }
    return tier;
  }

  // ── Season / schedule ───────────────────────────────────────────────────────
  function buildSchedule() {
    var shuffled = TRACKS.slice().sort(function () { return Math.random() - 0.5; });
    return shuffled.slice(0, RACES_PER_SEASON).map(function (track, i) {
      return { round: i + 1, track: track, completed: false, result: null };
    });
  }

  function initRivals(diffMult) {
    return RIVAL_DRIVERS.map(function (rd) {
      return {
        name:    rd.name,
        rating:  Math.round(rd.initRating * diffMult),
        points:  0,
        wins:    0,
        balance: 10000
      };
    });
  }

  // ── News ────────────────────────────────────────────────────────────────────
  function pushNews(msg) {
    state.news.unshift({ msg: msg, race: state.raceIdx });
    if (state.news.length > 40) state.news.length = 40;
  }

  // ── Random Events ───────────────────────────────────────────────────────────
  function triggerRandomEvent() {
    if (Math.random() > 0.30) return;
    var evt = pick(RANDOM_EVENTS);
    state.pendingEvent = evt;
    saveGame();
  }

  function applyEvent(evt) {
    if (!evt) return;
    switch (evt.type) {
      case 'money':
        state.balance += evt.value;
        pushNews('EVENT: ' + evt.name + ' — +£' + evt.value.toLocaleString() + ' received!');
        break;
      case 'fine':
        state.balance = Math.max(0, state.balance - evt.value);
        pushNews('EVENT: ' + evt.name + ' — £' + evt.value.toLocaleString() + ' fine paid.');
        break;
      case 'race_bonus':
        state.eventRaceBonus = (state.eventRaceBonus || 0) + evt.value;
        pushNews('EVENT: ' + evt.name + ' — +' + evt.value + ' bonus score next race!');
        break;
      case 'discount':
        state.eventDiscount = evt.value;
        pushNews('EVENT: ' + evt.name + ' — ' + Math.round(evt.value * 100) + '% parts discount active!');
        break;
      case 'rival_debuff': {
        var rivalIdx = randInt(0, state.rivals.length - 1);
        state.rivals[rivalIdx].rating = Math.max(10, state.rivals[rivalIdx].rating - evt.value);
        pushNews('EVENT: ' + evt.name + ' — ' + state.rivals[rivalIdx].name + ' is weakened this race!');
        break;
      }
      case 'prize_mult':
        state.eventPrizeMult = evt.value;
        pushNews('EVENT: ' + evt.name + ' — ' + Math.round((evt.value - 1) * 100) + '% prize bonus active!');
        break;
      case 'prize_bonus':
        state.eventPrizeBonus = (state.eventPrizeBonus || 0) + evt.value;
        pushNews('EVENT: ' + evt.name + ' — +£' + evt.value.toLocaleString() + ' prize bonus added!');
        break;
      case 'free_upgrade': {
        var slot = pick(SLOTS);
        var catalogue = PARTS_CATALOGUE[slot];
        var curIdx = catalogue.findIndex(function (p) { return p.id === state.installedParts[slot]; });
        var nextIdx = curIdx + 1;
        if (nextIdx < catalogue.length) {
          var nextPart = catalogue[nextIdx];
          var alreadyHave = state.garage.some(function (g) { return g.id === nextPart.id; }) ||
                            state.installedParts[slot] === nextPart.id;
          if (!alreadyHave) {
            state.garage.push({ id: nextPart.id, slot: slot });
            if (!state.partWear) state.partWear = {};
            state.partWear[nextPart.id] = 100;
            pushNews('EVENT: ' + evt.name + ' — ' + nextPart.name + ' added to garage!');
          } else {
            state.balance += 3000;
            pushNews('EVENT: ' + evt.name + ' — Already owned upgrade, received £3,000 instead!');
          }
        } else {
          state.balance += 3000;
          pushNews('EVENT: ' + evt.name + ' — Already at max spec! Received £3,000 instead!');
        }
        break;
      }
    }
    state.pendingEvent = null;
    saveGame();
  }

  // ── New Game ────────────────────────────────────────────────────────────────
  function newGame(teamName, difficulty, driverName, carName) {
    var cfg = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.normal;
    state = {
      teamName:           teamName,
      driverName:         driverName || teamName,
      carName:            carName    || 'XX-Z',
      difficulty:         difficulty,
      season:             1,
      raceIdx:            0,
      balance:            cfg.startBalance,
      installedParts:     Object.assign({}, STARTER_PARTS),
      partWear:           {},
      garage:             [],
      garagePresets:      [
        { name: 'Setup A', parts: null },
        { name: 'Setup B', parts: null },
        { name: 'Setup C', parts: null }
      ],
      playerPoints:       0,
      playerWins:         0,
      totalChampionships: 0,
      rivals:             initRivals(cfg.rivalMult),
      schedule:           buildSchedule(),
      raceHistory:        [],
      seasonHistory:      [],
      news:               [],
      pendingResult:      null,
      pendingEvent:       null,
      eventRaceBonus:     0,
      eventPrizeMult:     1,
      eventPrizeBonus:    0,
      eventDiscount:      0,
      tutorialDone:       false
    };
    pushNews('Welcome, ' + teamName + '! Season 1 is underway. Visit the Pro Shop to upgrade your car.');
    saveGame();
    return state;
  }

  // ── Save / Load ─────────────────────────────────────────────────────────────
  function saveGame() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function loadGame() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        state = JSON.parse(raw);
        // Migrate older saves
        if (!state.partWear)           state.partWear = {};
        if (!state.garagePresets)      state.garagePresets = [
          { name: 'Setup A', parts: null },
          { name: 'Setup B', parts: null },
          { name: 'Setup C', parts: null }
        ];
        if (!state.driverName)         state.driverName = state.teamName;
        if (!state.carName)            state.carName = 'XX-Z';
        if (!state.totalChampionships) state.totalChampionships = 0;
        if (!state.pendingEvent)       state.pendingEvent = null;
        if (state.eventRaceBonus  === undefined) state.eventRaceBonus  = 0;
        if (state.eventPrizeMult  === undefined) state.eventPrizeMult  = 1;
        if (state.eventPrizeBonus === undefined) state.eventPrizeBonus = 0;
        if (state.eventDiscount   === undefined) state.eventDiscount   = 0;
        if (state.tutorialDone    === undefined) state.tutorialDone    = true;
        return true;
      }
    } catch (e) {}
    return false;
  }

  function deleteSave() {
    localStorage.removeItem(SAVE_KEY);
    state = null;
  }

  function hasSave() {
    return !!localStorage.getItem(SAVE_KEY);
  }

  // ── Parts: Buy ──────────────────────────────────────────────────────────────
  function buyPart(partId) {
    var part = getPartById(partId);
    if (!part) return { success: false, msg: 'Part not found.' };
    if (part.price === 0) return { success: false, msg: "That part can't be bought." };

    var alreadyInstalled = state.installedParts[part.slot] === partId;
    var inGarage = state.garage.some(function (g) { return g.id === partId; });
    if (alreadyInstalled || inGarage) return { success: false, msg: 'You already own this part.' };

    var discount = state.eventDiscount || 0;
    var price    = Math.round(part.price * (1 - discount));
    if (state.balance < price)
      return { success: false, msg: 'Not enough funds. Need £' + price.toLocaleString() + '.' };

    state.balance -= price;
    state.garage.push({ id: partId, slot: part.slot });
    if (!state.partWear) state.partWear = {};
    state.partWear[partId] = 100;
    saveGame();
    var msg = part.name + ' purchased! Go to Garage to install it.';
    if (discount > 0) msg += ' (Saved £' + (part.price - price).toLocaleString() + '!)';
    return { success: true, msg: msg };
  }

  // ── Parts: Install ──────────────────────────────────────────────────────────
  function installPart(partId) {
    var part = getPartById(partId);
    if (!part) return { success: false, msg: 'Part not found.' };
    if (state.installedParts[part.slot] === partId)
      return { success: false, msg: 'Already installed.' };

    var garageIdx = state.garage.findIndex(function (g) { return g.id === partId; });
    if (garageIdx === -1)
      return { success: false, msg: 'Part not in your garage. Buy it first.' };

    var currentId   = state.installedParts[part.slot];
    var currentPart = getPartById(currentId);
    if (currentPart && currentPart.sell > 0) {
      state.garage.push({ id: currentId, slot: currentPart.slot });
    }
    state.garage.splice(garageIdx, 1);
    state.installedParts[part.slot] = partId;
    saveGame();
    return { success: true, msg: part.name + ' installed successfully!' };
  }

  // ── Parts: Sell from Garage ─────────────────────────────────────────────────
  function sellGaragePart(partId) {
    var part = getPartById(partId);
    if (!part) return { success: false, msg: 'Part not found.' };
    if (part.sell === 0) return { success: false, msg: "Starter parts can't be sold." };

    var garageIdx = state.garage.findIndex(function (g) { return g.id === partId; });
    if (garageIdx === -1) return { success: false, msg: 'Part not in garage.' };

    state.garage.splice(garageIdx, 1);
    state.balance += part.sell;
    saveGame();
    return { success: true, msg: part.name + ' sold for £' + part.sell.toLocaleString() + '.' };
  }

  // ── Garage Presets ──────────────────────────────────────────────────────────
  function savePreset(idx, name) {
    if (idx < 0 || idx > 2) return { success: false, msg: 'Invalid preset slot.' };
    state.garagePresets[idx] = {
      name:  name || ('Setup ' + ['A', 'B', 'C'][idx]),
      parts: Object.assign({}, state.installedParts)
    };
    saveGame();
    return { success: true, msg: 'Setup saved to ' + state.garagePresets[idx].name + '.' };
  }

  function loadPreset(idx) {
    if (idx < 0 || idx > 2) return { success: false, msg: 'Invalid preset slot.' };
    var preset = state.garagePresets[idx];
    if (!preset || !preset.parts) return { success: false, msg: 'No setup saved in this slot.' };

    var missing = [];
    SLOTS.forEach(function (slot) {
      var partId = preset.parts[slot];
      var owned  = state.installedParts[slot] === partId ||
                   state.garage.some(function (g) { return g.id === partId; });
      if (!owned) {
        var p = getPartById(partId);
        missing.push(p ? p.name : partId);
      }
    });
    if (missing.length > 0)
      return { success: false, msg: 'Missing parts: ' + missing.join(', ') };

    SLOTS.forEach(function (slot) {
      var currentId = state.installedParts[slot];
      var newId     = preset.parts[slot];
      if (currentId === newId) return;
      var currentPart = getPartById(currentId);
      if (currentPart && currentPart.sell > 0 &&
          !state.garage.some(function (g) { return g.id === currentId; })) {
        state.garage.push({ id: currentId, slot: slot });
      }
      var newIdx = state.garage.findIndex(function (g) { return g.id === newId; });
      if (newIdx > -1) state.garage.splice(newIdx, 1);
      state.installedParts[slot] = newId;
    });

    saveGame();
    return { success: true, msg: preset.name + ' loaded! Car setup updated.' };
  }

  // ── Race Simulation ─────────────────────────────────────────────────────────
  function simulateRace() {
    if (state.raceIdx >= state.schedule.length)
      return { success: false, msg: 'Season complete.' };

    var race  = state.schedule[state.raceIdx];
    var track = race.track;

    // Wear-based DNF bonus
    var wearDNFBonus = 0;
    SLOTS.forEach(function (slot) {
      if (getWear(state.installedParts[slot]) < 15) wearDNFBonus += 0.08;
    });

    var pRating    = playerRating(track);
    var raceBonus  = state.eventRaceBonus || 0;
    var pMech      = Math.random() < (0.04 + wearDNFBonus);

    var grid = [];
    grid.push({
      name:     state.teamName,
      isPlayer: true,
      rating:   pRating,
      score:    pMech ? -999 : pRating + raceBonus + (Math.random() * 16 - 8),  // ±8 variance
      dnf:      pMech
    });

    state.rivals.forEach(function (rival, idx) {
      var rMech = Math.random() < 0.04;
      grid.push({
        name:      rival.name,
        isPlayer:  false,
        rivalIdx:  idx,
        rating:    rival.rating,
        score:     rMech ? -999 : rival.rating + (Math.random() * 16 - 8),
        dnf:       rMech
      });
    });

    grid.sort(function (a, b) { return b.score - a.score; });

    var playerPos  = grid.findIndex(function (c) { return c.isPlayer; }) + 1;
    var prize      = PRIZE_MONEY[playerPos - 1] || 0;
    var pts        = POINTS_TABLE[playerPos - 1] || 0;
    var playerDNF  = grid.find(function (c) { return c.isPlayer; }).dnf;
    var prizeMult  = state.eventPrizeMult  || 1;
    var prizeBonus = state.eventPrizeBonus || 0;

    if (!playerDNF) {
      prize = Math.round(prize * prizeMult) + prizeBonus;
      state.balance      += prize;
      state.playerPoints += pts;
      if (playerPos === 1) state.playerWins++;
    } else {
      prize = 0; pts = 0; playerPos = grid.length;
    }

    // Degrade installed parts
    if (!state.partWear) state.partWear = {};
    SLOTS.forEach(function (slot) {
      var partId = state.installedParts[slot];
      if (state.partWear[partId] === undefined) state.partWear[partId] = 100;
      state.partWear[partId] = Math.max(0, state.partWear[partId] - randInt(4, 10));
    });

    // Clear event effects
    state.eventRaceBonus  = 0;
    state.eventPrizeMult  = 1;
    state.eventPrizeBonus = 0;
    state.eventDiscount   = 0;

    // Update rivals
    grid.forEach(function (car, pos) {
      if (car.isPlayer || car.dnf) return;
      var rival = state.rivals[car.rivalIdx];
      rival.points  += POINTS_TABLE[pos] || 0;
      rival.balance += PRIZE_MONEY[pos]  || 0;
      if (pos === 0) rival.wins++;
      if (rival.balance > 3000 && Math.random() < 0.4) {
        rival.rating   = Math.min(99, rival.rating + Math.random() * 2.5);
        rival.balance -= 2000;
      }
    });

    race.completed = true;
    race.result    = {
      position:    playerPos,
      prize:       prize,
      points:      pts,
      dnf:         playerDNF,
      playerRating: pRating,
      fullGrid:    grid.map(function (c, i) {
        return { pos: i + 1, name: c.name, isPlayer: c.isPlayer, dnf: c.dnf };
      })
    };

    var newsMsg = 'Race ' + race.round + ' — ' + track.name + ': ';
    newsMsg += playerDNF
      ? 'MECHANICAL FAILURE! Did not finish.'
      : 'Finished P' + playerPos + ', earned £' + prize.toLocaleString() + ' (' + pts + ' pts).';
    pushNews(newsMsg);

    state.raceHistory.push({
      season:   state.season,
      round:    race.round,
      track:    track.name,
      position: playerPos,
      prize:    prize,
      points:   pts,
      dnf:      playerDNF
    });

    state.pendingResult = race.result;
    state.raceIdx++;

    if (state.raceIdx >= state.schedule.length) _endSeason();

    saveGame();
    return { success: true, result: race.result };
  }

  function _endSeason() {
    var standings  = getStandings();
    var playerRank = standings.findIndex(function (s) { return s.isPlayer; }) + 1;
    var champion   = standings[0];

    var msg = 'Season ' + state.season + ' over! ';
    if (playerRank === 1) {
      msg += 'YOU ARE CHAMPION! +£100,000 bonus.';
      state.balance += 100000;
      state.totalChampionships = (state.totalChampionships || 0) + 1;
    } else {
      msg += 'Championship P' + playerRank + '. Champion: ' + champion.name + ' (' + champion.points + ' pts).';
    }
    pushNews(msg);

    state.seasonHistory.push({
      season:   state.season,
      rank:     playerRank,
      points:   state.playerPoints,
      wins:     state.playerWins,
      champion: champion.name
    });

    state.season++;
    state.raceIdx      = 0;
    state.playerPoints = 0;
    state.playerWins   = 0;
    state.schedule     = buildSchedule();

    state.rivals.forEach(function (r) {
      r.points = 0;
      r.wins   = 0;
      r.rating = Math.min(99, r.rating + Math.random() * 4);
    });
  }

  // ── Standings ───────────────────────────────────────────────────────────────
  function getStandings() {
    var list = state.rivals.map(function (r) {
      return { name: r.name, points: r.points, wins: r.wins, rating: Math.round(r.rating), isPlayer: false };
    });
    list.push({
      name: state.teamName, points: state.playerPoints,
      wins: state.playerWins, rating: playerRating(), isPlayer: true
    });
    list.sort(function (a, b) { return b.points - a.points || b.wins - a.wins; });
    return list;
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  return {
    newGame:             newGame,
    loadGame:            loadGame,
    saveGame:            saveGame,
    deleteSave:          deleteSave,
    hasSave:             hasSave,
    getState:            function () { return state; },
    getPartById:         getPartById,
    installedPart:       installedPart,
    playerRating:        playerRating,
    getWear:             getWear,
    getWearStatus:       getWearStatus,
    getEffectiveQuality: getEffectiveQuality,
    getLeagueTier:       getLeagueTier,
    buyPart:             buyPart,
    installPart:         installPart,
    sellGaragePart:      sellGaragePart,
    maintainPart:        maintainPart,
    savePreset:          savePreset,
    loadPreset:          loadPreset,
    simulateRace:        simulateRace,
    getStandings:        getStandings,
    pushNews:            pushNews,
    applyEvent:          applyEvent,
    triggerRandomEvent:  triggerRandomEvent
  };
})();
