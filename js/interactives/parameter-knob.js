/* প্যারামিটার : ফলন = k × জমি। স্লাইডারে k বদলে গড় ভুল দেখা যায়। ডেটা ফিচার টার্মের কৃষকদের সঙ্গে মেলানো। */
(function () {
  'use strict';

  var FARMERS = [
    { name: 'ক', land: 3, actual: 60 },
    { name: 'খ', land: 5, actual: 105 },
    { name: 'গ', land: 2, actual: 38 },
    { name: 'ঘ', land: 4, actual: 82 }
  ];
  var MIN = 10, MAX = 30, STEP = 0.5;

  function evaluate(k) {
    var rows = FARMERS.map(function (f) {
      var guess = k * f.land;
      return { name: f.name, land: f.land, actual: f.actual, guess: guess, err: Math.abs(f.actual - guess) };
    });
    var mae = rows.reduce(function (s, r) { return s + r.err; }, 0) / rows.length;
    return { rows: rows, mae: mae };
  }
  function bestK() {
    var best = MIN, bm = Infinity;
    for (var k = MIN; k <= MAX + 1e-9; k += STEP) {
      var m = evaluate(k).mae;
      if (m < bm - 1e-12) { bm = m; best = k; }
    }
    return { k: best, mae: bm };
  }

  var api = { evaluate: evaluate, bestK: bestK, FARMERS: FARMERS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window === 'undefined') return;

  (window.Interactives = window.Interactives || {})['parameter-knob'] = function (box) {
    var ML = window.ML, h = ML.h, bn = ML.bn;
    var best = bestK();
    function f1(x) { return bn((Math.round(x * 100) / 100).toString()); }

    var slider = h('input', { type: 'range', id: 'pk', min: String(MIN), max: String(MAX), step: String(STEP), value: '15' });
    var out = h('output', { for: 'pk' });
    var tbody = h('tbody');
    var table = h('table', {}, [
      h('thead', {}, [h('tr', {}, ['কৃষক ও জমি', 'আসল ফলন', 'আন্দাজ', 'ভুল'].map(function (x) { return h('th', { scope: 'col' }, [x]); }))]),
      tbody
    ]);
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 420 72');
    svg.setAttribute('role', 'img');
    var status = h('div', { class: 'i-status', 'aria-live': 'polite' });

    box.appendChild(h('p', { class: 'i-title' }, ['প্যারামিটারের সংখ্যাটা নিজে খুঁজে দেখুন']));
    box.appendChild(h('p', {}, ['মডেল ফলন বের করে প্যারামিটারকে জমির বিঘা দিয়ে গুণ করে। স্লাইডার সরিয়ে দেখুন, কোন মানে চার কৃষকের আসল ফলন আর আন্দাজ সবচেয়ে কাছাকাছি আসে। টেবিলের সব মান মণে।']));
    box.appendChild(h('div', { class: 'i-slider' }, [
      h('label', { for: 'pk' }, ['প্যারামিটার (প্রতি বিঘায় কত মণ ধরছেন)']), slider, out
    ]));
    box.appendChild(h('div', { class: 'scroll', role: 'region', tabindex: '0', 'aria-label': 'আসল ফলন ও আন্দাজের টেবিল, সব মান মণে' }, [table]));
    box.appendChild(h('div', { class: 'svg-wrap' }, [svg]));
    box.appendChild(status);

    function el(tag, attrs, text) {
      var e = document.createElementNS(svgNS, tag);
      Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
      if (text !== undefined) e.textContent = text;
      return e;
    }

    function update() {
      var k = Number(slider.value);
      var r = evaluate(k);
      out.textContent = f1(k);
      tbody.textContent = '';
      r.rows.forEach(function (x) {
        tbody.appendChild(h('tr', {}, [x.name + ' (' + bn(x.land) + ' বিঘা)', bn(x.actual), f1(x.guess), f1(x.err)].map(function (c) { return h('td', {}, [c]); })));
      });
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var w = 300, x0 = 100, maxErr = 35;
      svg.appendChild(el('text', { x: 0, y: 24, 'font-size': 18, 'font-weight': 600 }, 'গড় ভুল'));
      svg.appendChild(el('rect', { x: x0, y: 6, width: w, height: 26, fill: 'none', 'stroke-width': 1, 'stroke-dasharray': '4 3', style: 'stroke:var(--fg)' }));
      var bw = Math.min(w, (r.mae / maxErr) * w);
      svg.appendChild(el('rect', { x: x0, y: 6, width: Math.max(bw, 1), height: 26, style: 'fill:var(--fg)' }));
      svg.appendChild(el('text', { x: x0, y: 60, 'font-size': 17 }, f1(r.mae) + ' মণ'));
      svg.setAttribute('aria-label', 'গড় ভুল ' + f1(r.mae) + ' মণ');
      var atBest = Math.abs(k - best.k) < 1e-9;
      status.textContent = atBest
        ? 'এই মানে গড় ভুল সবচেয়ে কম। ট্রেনিংয়ে কম্পিউটারও এভাবে মান খোঁজে, তবে স্লাইডার নেড়ে নয়, হিসাব কষে।'
        : (r.mae > best.mae ? 'গড় ভুল ' + f1(r.mae) + ' মণ। আরও কমানো যায় কি না দেখুন।' : '');
    }
    slider.addEventListener('input', update);
    update();
  };
})();
