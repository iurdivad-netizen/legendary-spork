// ─── MTSM_ENGINE ─────────────────────────────────────────────────────────────
const MTSM_ENGINE = (function () {
  'use strict';

  const SAVE_KEY = 'mtsm_car_save';
  const RACES_PER_SEASON = 10;

  // Default starter parts (one per slot — all stock/free)
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

  // ── Performance calculation ─────────────────────────────────────────────────
  function calcRating(installedMap, track) {
    var total = 0, weightSum = 0;
    SLOTS.forEach(function (slot) {
      var part = getPartById(installedMap[slot]);
      var q    = part ? part.quality : 10;
      var bias = track ? (track.bias[slot] || 1.0) : 1.0;
      total     += q * bias;
      weightSum += bias;
    });
    return Math.round(total / weightSum);
  }

  function playerRating(track) {
    return calcRating(state.installedParts, track);
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

  // ── New Game ────────────────────────────────────────────────────────────────
  function newGame(teamName, difficulty) {
    var cfg = DIFFICULTY_SETTINGS[difficulty] || DIFFICULTY_SETTINGS.normal;
    state = {
      teamName:      teamName,
      difficulty:    difficulty,
      season:        1,
      raceIdx:       0,
      balance:       cfg.startBalance,
      installedParts: Object.assign({}, STARTER_PARTS),
      garage:        [],        // { id, slot }
      playerPoints:  0,
      playerWins:    0,
      rivals:        initRivals(cfg.rivalMult),
      schedule:      buildSchedule(),
      raceHistory:   [],
      seasonHistory: [],
      news:          [],
      pendingResult: null       // last race result, cleared after viewing
    };
    pushNews('Welcome, ' + teamName + '! Season 1 is underway. Visit the Parts Market to upgrade your car.');
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
      if (raw) { state = JSON.parse(raw); return true; }
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

    if (state.balance < part.price)
      return { success: false, msg: 'Not enough funds. Need £' + part.price.toLocaleString() + '.' };

    state.balance -= part.price;
    state.garage.push({ id: partId, slot: part.slot });
    saveGame();
    return { success: true, msg: part.name + ' purchased! Go to Garage to install it.' };
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

    // Move currently-installed non-starter part to garage
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
    if (garageIdx === -1)
      return { success: false, msg: 'Part not in garage.' };

    state.garage.splice(garageIdx, 1);
    state.balance += part.sell;
    saveGame();
    return { success: true, msg: part.name + ' sold for £' + part.sell.toLocaleString() + '.' };
  }

  // ── Race Simulation ─────────────────────────────────────────────────────────
  function simulateRace() {
    if (state.raceIdx >= state.schedule.length)
      return { success: false, msg: 'Season complete.' };

    var race  = state.schedule[state.raceIdx];
    var track = race.track;

    // Build grid: player + rivals
    var grid = [];

    // Player entry
    var pRating = playerRating(track);
    var pMech   = Math.random() < 0.05;  // 5% mechanical failure
    grid.push({
      name:     state.teamName,
      isPlayer: true,
      rating:   pRating,
      score:    pMech ? -999 : pRating + (Math.random() * 24 - 12),
      dnf:      pMech
    });

    // Rival entries
    state.rivals.forEach(function (rival, idx) {
      var rMech = Math.random() < 0.04;
      grid.push({
        name:      rival.name,
        isPlayer:  false,
        rivalIdx:  idx,
        rating:    rival.rating,
        score:     rMech ? -999 : rival.rating + (Math.random() * 24 - 12),
        dnf:       rMech
      });
    });

    // Sort by score descending (DNF at the back)
    grid.sort(function (a, b) { return b.score - a.score; });

    var playerPos = grid.findIndex(function (c) { return c.isPlayer; }) + 1;
    var prize     = state.pendingResult ? 0 : (PRIZE_MONEY[playerPos - 1] || 0);
    var pts       = POINTS_TABLE[playerPos - 1] || 0;
    var playerDNF = grid.find(function (c) { return c.isPlayer; }).dnf;

    if (!playerDNF) {
      state.balance      += prize;
      state.playerPoints += pts;
      if (playerPos === 1) state.playerWins++;
    } else {
      prize = 0; pts = 0; playerPos = grid.length;
    }

    // Update rivals
    grid.forEach(function (car, pos) {
      if (car.isPlayer || car.dnf) return;
      var rival = state.rivals[car.rivalIdx];
      rival.points  += POINTS_TABLE[pos] || 0;
      rival.balance += PRIZE_MONEY[pos]  || 0;
      if (pos === 0) rival.wins++;
      // Rivals spend prize money on upgrades (bump rating)
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
    if (playerDNF) {
      newsMsg += 'MECHANICAL FAILURE! Did not finish.';
    } else {
      newsMsg += 'Finished P' + playerPos + ', earned £' + prize.toLocaleString() + ' (' + pts + ' pts).';
    }
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

    // End of season?
    if (state.raceIdx >= state.schedule.length) {
      _endSeason();
    }

    saveGame();
    return { success: true, result: race.result };
  }

  function _endSeason() {
    var standings = getStandings();
    var playerRank = standings.findIndex(function (s) { return s.isPlayer; }) + 1;
    var champion   = standings[0];

    var msg = 'Season ' + state.season + ' over! ';
    if (playerRank === 1) {
      msg += 'YOU ARE CHAMPION! +£100,000 bonus.';
      state.balance += 100000;
    } else {
      msg += 'Championship finish: P' + playerRank + '. Champion: ' + champion.name + ' (' + champion.points + ' pts).';
    }
    pushNews(msg);

    state.seasonHistory.push({
      season:     state.season,
      rank:       playerRank,
      points:     state.playerPoints,
      wins:       state.playerWins,
      champion:   champion.name
    });

    state.season++;
    state.raceIdx      = 0;
    state.playerPoints = 0;
    state.playerWins   = 0;
    state.schedule     = buildSchedule();

    // Rivals improve season-over-season
    state.rivals.forEach(function (r) {
      r.points  = 0;
      r.wins    = 0;
      r.rating  = Math.min(99, r.rating + Math.random() * 4);
    });
  }

  // ── Standings ───────────────────────────────────────────────────────────────
  function getStandings() {
    var list = state.rivals.map(function (r) {
      return { name: r.name, points: r.points, wins: r.wins, isPlayer: false };
    });
    list.push({ name: state.teamName, points: state.playerPoints, wins: state.playerWins, isPlayer: true });
    list.sort(function (a, b) { return b.points - a.points || b.wins - a.wins; });
    return list;
  }

  // ── Public API ───────────────────────────────────────────────────────────────
  return {
    newGame:        newGame,
    loadGame:       loadGame,
    saveGame:       saveGame,
    deleteSave:     deleteSave,
    hasSave:        hasSave,
    getState:       function () { return state; },
    getPartById:    getPartById,
    installedPart:  installedPart,
    playerRating:   playerRating,
    buyPart:        buyPart,
    installPart:    installPart,
    sellGaragePart: sellGaragePart,
    simulateRace:   simulateRace,
    getStandings:   getStandings,
    pushNews:       pushNews
  };
})();
