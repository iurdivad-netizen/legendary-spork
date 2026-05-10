/* parts-market.js — replaces the Transfer Market with a Car Parts Market */
(function () {
  'use strict';

  // ── Catalogue ────────────────────────────────────────────────────────────
  var PARTS = [
    // ENGINE
    { id: 'eng-stock',  name: 'Stock Engine',           cat: 'ENGINE',       quality: 30, emoji: '&#9881;',  price: 500,   sell: 300   },
    { id: 'eng-sport',  name: 'Sport Engine',           cat: 'ENGINE',       quality: 55, emoji: '&#9881;',  price: 2500,  sell: 1500  },
    { id: 'eng-turbo',  name: 'Turbocharged Engine',    cat: 'ENGINE',       quality: 72, emoji: '&#9881;',  price: 7000,  sell: 4200  },
    { id: 'eng-v8',     name: 'V8 Engine Swap',         cat: 'ENGINE',       quality: 86, emoji: '&#9881;',  price: 15000, sell: 9000  },
    { id: 'eng-race',   name: 'Race-Spec Engine',       cat: 'ENGINE',       quality: 98, emoji: '&#9881;',  price: 30000, sell: 18000 },
    // TIRES
    { id: 'tir-std',    name: 'Standard Tires',         cat: 'TIRES',        quality: 30, emoji: 'O',        price: 200,   sell: 120   },
    { id: 'tir-sport',  name: 'Sport Tires',            cat: 'TIRES',        quality: 55, emoji: 'O',        price: 500,   sell: 300   },
    { id: 'tir-slick',  name: 'Slick Tires',            cat: 'TIRES',        quality: 72, emoji: 'O',        price: 1000,  sell: 600   },
    { id: 'tir-race',   name: 'Racing Slicks',          cat: 'TIRES',        quality: 90, emoji: 'O',        price: 2200,  sell: 1320  },
    // SUSPENSION
    { id: 'sus-stock',  name: 'Stock Suspension',       cat: 'SUSPENSION',   quality: 30, emoji: '~',        price: 350,   sell: 210   },
    { id: 'sus-sport',  name: 'Sport Suspension',       cat: 'SUSPENSION',   quality: 58, emoji: '~',        price: 1400,  sell: 840   },
    { id: 'sus-coil',   name: 'Coilover Kit',           cat: 'SUSPENSION',   quality: 76, emoji: '~',        price: 3200,  sell: 1920  },
    { id: 'sus-race',   name: 'Race Suspension',        cat: 'SUSPENSION',   quality: 93, emoji: '~',        price: 7500,  sell: 4500  },
    // BRAKES
    { id: 'brk-stock',  name: 'Stock Brakes',           cat: 'BRAKES',       quality: 30, emoji: '[B]',      price: 200,   sell: 120   },
    { id: 'brk-sport',  name: 'Sport Brake Kit',        cat: 'BRAKES',       quality: 58, emoji: '[B]',      price: 700,   sell: 420   },
    { id: 'brk-brembo', name: 'Brembo Brakes',          cat: 'BRAKES',       quality: 78, emoji: '[B]',      price: 2500,  sell: 1500  },
    { id: 'brk-carbon', name: 'Carbon Ceramic Brakes',  cat: 'BRAKES',       quality: 96, emoji: '[B]',      price: 9000,  sell: 5400  },
    // BOOST
    { id: 'bst-turbo',  name: 'Turbo Kit',              cat: 'BOOST',        quality: 62, emoji: '>>',       price: 4000,  sell: 2400  },
    { id: 'bst-twin',   name: 'Twin Turbo Kit',         cat: 'BOOST',        quality: 80, emoji: '>>',       price: 9500,  sell: 5700  },
    { id: 'bst-super',  name: 'Supercharger',           cat: 'BOOST',        quality: 87, emoji: '>>',       price: 12000, sell: 7200  },
    { id: 'bst-nos',    name: 'Nitrous System',         cat: 'BOOST',        quality: 68, emoji: '>>',       price: 1800,  sell: 1080  },
    // AERO
    { id: 'aer-hood',   name: 'Carbon Fibre Hood',      cat: 'AERO',         quality: 45, emoji: '^',        price: 900,   sell: 540   },
    { id: 'aer-split',  name: 'Front Splitter',         cat: 'AERO',         quality: 55, emoji: '^',        price: 750,   sell: 450   },
    { id: 'aer-wing',   name: 'Rear Wing',              cat: 'AERO',         quality: 65, emoji: '^',        price: 1200,  sell: 720   },
    { id: 'aer-full',   name: 'Full Aero Kit',          cat: 'AERO',         quality: 82, emoji: '^',        price: 5000,  sell: 3000  },
    // TRANSMISSION
    { id: 'trn-stock',  name: 'Stock Gearbox',          cat: 'TRANSMISSION', quality: 30, emoji: '[T]',      price: 400,   sell: 240   },
    { id: 'trn-sport',  name: 'Sport Gearbox',          cat: 'TRANSMISSION', quality: 62, emoji: '[T]',      price: 2200,  sell: 1320  },
    { id: 'trn-seq',    name: 'Sequential Gearbox',     cat: 'TRANSMISSION', quality: 88, emoji: '[T]',      price: 10000, sell: 6000  }
  ];

  var CATEGORIES = ['ENGINE','TIRES','SUSPENSION','BRAKES','BOOST','AERO','TRANSMISSION'];

  var _catFilter = '';

  // ── Helpers ──────────────────────────────────────────────────────────────
  function team()  { return MTSM_ENGINE.getCurrentHumanTeam(); }
  function owned() { var t = team(); if (!t.carParts) t.carParts = []; return t.carParts; }

  function notify(msg, err) {
    if (window.MTSM_UI && MTSM_UI.showNotification) { MTSM_UI.showNotification(msg, err); return; }
    if (window.showNotification)                     { showNotification(msg, err); return; }
    console.log((err ? '[ERR] ' : '') + msg);
  }

  function rerender() {
    if (window.MTSM_UI && MTSM_UI.renderGame) { MTSM_UI.renderGame('transfers'); return; }
    if (window.renderGame)                     { renderGame('transfers'); }
  }

  // ── HTML builder ─────────────────────────────────────────────────────────
  function buildHTML() {
    var t     = team();
    var own   = owned();
    var list  = _catFilter ? PARTS.filter(function(p) { return p.cat === _catFilter; }) : PARTS;

    var garageRows = own.length === 0
      ? '<tr><td colspan="4" style="text-align:center;color:var(--color-text-muted);padding:12px;">Garage is empty — buy some parts below!</td></tr>'
      : own.map(function(p, i) {
          return '<tr>' +
            '<td><span style="color:var(--color-accent);font-family:var(--font-display);font-size:9px">' + p.cat + '</span></td>' +
            '<td>' + p.name + '</td>' +
            '<td class="num">' + p.quality + '<span style="color:var(--color-text-muted)">/100</span></td>' +
            '<td><button class="btn btn-small btn-danger" onclick="MTSM_PARTS.sell(' + i + ')">Sell &pound;' + p.sell.toLocaleString() + '</button></td>' +
            '</tr>';
        }).join('');

    var shopRows = list.map(function(p) {
      var isOwned    = own.some(function(o) { return o.id === p.id; });
      var canAfford  = t.balance >= p.price;
      var btnLabel   = isOwned ? 'Owned' : 'Buy';
      var btnDisable = (isOwned || !canAfford) ? ' disabled style="opacity:0.4;cursor:not-allowed"' : '';
      var btnOnclick = (!isOwned && canAfford) ? ' onclick="MTSM_PARTS.buy(\'' + p.id + '\')"' : '';
      var ownedBadge = isOwned ? ' <span class="scouted-badge">OWNED</span>' : '';

      // Quality colour: green 70+, yellow 50-69, red below 50
      var qColor = p.quality >= 70 ? 'var(--color-primary)' : p.quality >= 50 ? 'var(--color-accent)' : 'var(--color-danger)';

      return '<tr>' +
        '<td><span style="color:var(--color-accent);font-family:var(--font-display);font-size:9px">' + p.cat + '</span></td>' +
        '<td>' + p.name + ownedBadge + '</td>' +
        '<td class="num"><span style="color:' + qColor + '">' + p.quality + '</span><span style="color:var(--color-text-muted)">/100</span></td>' +
        '<td class="num">&pound;' + p.price.toLocaleString() + '</td>' +
        '<td><button class="btn btn-small"' + btnDisable + btnOnclick + '>' + btnLabel + '</button></td>' +
        '</tr>';
    }).join('');

    var catOptions = CATEGORIES.map(function(c) {
      return '<option value="' + c + '"' + (_catFilter === c ? ' selected' : '') + '>' + c + '</option>';
    }).join('');

    return (
      '<div class="panel-header">&#128295; PARTS MARKET &mdash; ' + PARTS.length + ' parts available</div>' +

      '<div style="margin-bottom:8px;font-family:var(--font-display);font-size:10px;color:var(--color-accent);">YOUR GARAGE (SELL)</div>' +
      '<div style="overflow-x:auto;margin-bottom:16px;">' +
        '<table class="data-table">' +
          '<thead><tr><th>Type</th><th>Part</th><th>Quality</th><th></th></tr></thead>' +
          '<tbody>' + garageRows + '</tbody>' +
        '</table>' +
      '</div>' +

      '<div style="margin-bottom:8px;font-family:var(--font-display);font-size:10px;color:var(--color-accent);">SHOP (BUY)</div>' +
      '<div class="transfer-filters">' +
        '<select onchange="MTSM_PARTS.filter(this.value)">' +
          '<option value="">All Categories</option>' + catOptions +
        '</select>' +
        '<span style="font-family:var(--font-display);font-size:9px;color:var(--color-text-muted)">' +
          '&#128176; Balance: &pound;' + t.balance.toLocaleString() +
        '</span>' +
      '</div>' +
      '<div style="overflow-x:auto;">' +
        '<table class="data-table">' +
          '<thead><tr><th>Type</th><th>Part</th><th>Quality</th><th>Price</th><th></th></tr></thead>' +
          '<tbody>' + shopRows + '</tbody>' +
        '</table>' +
      '</div>'
    );
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  function buy(id) {
    var part = null;
    for (var i = 0; i < PARTS.length; i++) { if (PARTS[i].id === id) { part = PARTS[i]; break; } }
    if (!part) return;
    var t   = team();
    var own = owned();
    for (var j = 0; j < own.length; j++) { if (own[j].id === id) { notify('You already own this part!', true); return; } }
    if (t.balance < part.price) { notify('Not enough funds!', true); return; }
    t.balance -= part.price;
    own.push({ id: part.id, name: part.name, cat: part.cat, quality: part.quality, sell: part.sell });
    notify(part.name + ' purchased for £' + part.price.toLocaleString() + '!');
    rerender();
  }

  function sell(idx) {
    var own  = owned();
    var part = own[idx];
    if (!part) return;
    team().balance += part.sell;
    own.splice(idx, 1);
    notify(part.name + ' sold for £' + part.sell.toLocaleString() + '!');
    rerender();
  }

  function filter(cat) {
    _catFilter = cat;
    rerender();
  }

  window.MTSM_PARTS = { buy: buy, sell: sell, filter: filter };

  // ── Install override ──────────────────────────────────────────────────────
  function install() {
    if (window.MTSM_UI && typeof MTSM_UI.renderTransfers === 'function') {
      MTSM_UI.renderTransfers = buildHTML;

      // Rename any nav button that says "Transfer" → "Parts"
      document.querySelectorAll('button, a, [data-tab], .tab, .nav-item').forEach(function(el) {
        if (/transfer/i.test(el.textContent)) {
          el.textContent = el.textContent.replace(/transfers?/gi, function(m) {
            return m[0] === m[0].toUpperCase() ? 'Parts' : 'parts';
          });
        }
      });
    } else {
      setTimeout(install, 300);
    }
  }

  // Run after all other scripts have initialised
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(install, 800); });
  } else {
    setTimeout(install, 800);
  }
})();
