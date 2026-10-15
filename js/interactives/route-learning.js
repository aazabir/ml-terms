/* রিইনফোর্সমেন্ট লার্নিং : কোন পথে যাবেন? দুটি পথের আসল গড় সময় লুকানো, চেষ্টা করে শিখতে হয়। */
(function () {
  'use strict';

  var ROUTES = [
    { name: 'পথ ক', mean: 38 },
    { name: 'পথ খ', mean: 32 }
  ];
  var SD = 9;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function normal(rng) {
    var u = 1 - rng(), v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /* বিশুদ্ধ সিমুলেশন, ব্রাউজার ছাড়াই যাচাই করা যায় */
  function createSim(seed) {
    var rng = mulberry32(seed);
    var s = { day: 0, total: 0, last: null, n: [0, 0], sum: [0, 0] };
    function mean(i) { return s.n[i] ? s.sum[i] / s.n[i] : null; }
    function go(i) {
      var t = Math.max(10, Math.round(ROUTES[i].mean + SD * normal(rng)));
      s.day++; s.total += t; s.n[i]++; s.sum[i] += t; s.last = { route: i, minutes: t };
      return t;
    }
    function pick(eps) {
      if (s.n[0] === 0) return 0;
      if (s.n[1] === 0) return 1;
      if (rng() < eps) return rng() < 0.5 ? 0 : 1;
      return mean(0) <= mean(1) ? 0 : 1;
    }
    return { state: s, mean: mean, go: go, pick: pick };
  }

  var api = { createSim: createSim, ROUTES: ROUTES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window === 'undefined') return;

  (window.Interactives = window.Interactives || {})['route-learning'] = function (box) {
    var ML = window.ML, h = ML.h, bn = ML.bn;
    var sim = createSim((Math.random() * 4294967296) >>> 0);
    var reveal = false;

    var title = h('p', { class: 'i-title' }, ['মিরপুর থেকে মতিঝিল, কোন পথে যাবেন?']);
    var intro = h('p', {}, ['প্রতিদিন একটি পথ বেছে নিন। কোন পথে গড়ে কত সময় লাগে, তা আপনি জানেন না, আর রোজের সময়ও কমবেশি হয়। দেখুন কয়েকদিনে কোন পথকে ভালো মনে হয়।']);
    var btnA = h('button', { type: 'button', class: 'btn', onclick: function () { sim.go(0); update(); } }, ['পথ ক দিয়ে যাই']);
    var btnB = h('button', { type: 'button', class: 'btn', onclick: function () { sim.go(1); update(); } }, ['পথ খ দিয়ে যাই']);

    var slider = h('input', { type: 'range', id: 'eps', min: '0', max: '100', step: '5', value: '20' });
    var out = h('output', { for: 'eps' });
    slider.addEventListener('input', function () { out.textContent = bn(slider.value) + '%'; });
    out.textContent = bn(slider.value) + '%';
    var auto = h('button', { type: 'button', class: 'btn', onclick: function () {
      for (var i = 0; i < 10; i++) sim.go(sim.pick(Number(slider.value) / 100));
      update();
    } }, ['এজেন্টকে ১০ দিন চালাতে দিন']);
    var revealBtn = h('button', { type: 'button', class: 'btn', 'aria-pressed': 'false', onclick: function () {
      reveal = !reveal; revealBtn.setAttribute('aria-pressed', String(reveal)); update();
    } }, ['আসল গড় দেখান']);
    var resetBtn = h('button', { type: 'button', class: 'btn', onclick: function () {
      sim = createSim((Math.random() * 4294967296) >>> 0); update();
    } }, ['নতুন করে শুরু']);

    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 420 140');
    svg.setAttribute('role', 'img');
    var status = h('div', { class: 'i-status', 'aria-live': 'polite' });

    box.appendChild(title);
    box.appendChild(intro);
    box.appendChild(h('div', { class: 'i-row' }, [btnA, btnB]));
    box.appendChild(h('div', { class: 'i-slider' }, [
      h('label', { for: 'eps' }, ['এজেন্টের নতুন পথ চেষ্টা করার সম্ভাবনা (এক্সপ্লোরেশন)']), slider, out
    ]));
    box.appendChild(h('div', { class: 'i-row' }, [auto, revealBtn, resetBtn]));
    box.appendChild(h('div', { class: 'svg-wrap' }, [svg]));
    box.appendChild(status);

    function el(tag, attrs, text) {
      var e = document.createElementNS(svgNS, tag);
      Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
      if (text !== undefined) e.textContent = text;
      return e;
    }

    function update() {
      var s = sim.state;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var x0 = 72, w = 300, maxM = 60;
      var best = null;
      if (s.n[0] && s.n[1]) best = sim.mean(0) <= sim.mean(1) ? 0 : 1;
      var label = 'গড় সময়ের বার চার্ট। ';
      ROUTES.forEach(function (r, i) {
        var y = 12 + i * 58;
        var m = sim.mean(i);
        svg.appendChild(el('text', { x: 0, y: y + 18, 'font-size': 18, 'font-weight': 600 }, r.name));
        svg.appendChild(el('rect', { x: x0, y: y, width: w, height: 26, fill: 'none', stroke: 'currentColor', 'stroke-width': 1, 'stroke-dasharray': '4 3', style: 'color:var(--fg)' }));
        if (m !== null) {
          svg.appendChild(el('rect', { x: x0, y: y, width: (m / maxM) * w, height: 26, style: 'fill:var(--fg)', opacity: best === i ? 1 : 0.45 }));
          var tx = el('text', { x: x0 + 6, y: y + 18, 'font-size': 17, 'font-weight': 700, style: 'fill:var(--bg)' }, bn(m.toFixed(1)) + ' মিনিট');
          svg.appendChild(tx);
          label += r.name + ' ' + m.toFixed(1) + ' মিনিট। ';
        } else {
          svg.appendChild(el('text', { x: x0 + 6, y: y + 18, 'font-size': 16 }, 'এখনো যাননি'));
        }
        if (reveal) {
          var tx2 = (r.mean / maxM) * w;
          svg.appendChild(el('line', { x1: x0 + tx2, x2: x0 + tx2, y1: y - 5, y2: y + 31, 'stroke-width': 3, style: 'stroke:var(--fg)' }));
          svg.appendChild(el('text', { x: x0 + tx2 - 4, y: y + 44, 'font-size': 14, 'text-anchor': 'end' }, 'আসল গড় ' + bn(r.mean)));
        }
      });
      svg.setAttribute('aria-label', label);

      var lines = [];
      if (s.day === 0) lines.push('এখনো কোনো দিন শুরু হয়নি।');
      else {
        lines.push('মোট ' + bn(s.day) + ' দিনে রাস্তায় কেটেছে ' + bn(s.total) + ' মিনিট। শেষ দিন ' + ROUTES[s.last.route].name + ' দিয়ে গিয়ে লেগেছে ' + bn(s.last.minutes) + ' মিনিট।');
        lines.push('পথ ক-এ গেছেন ' + bn(s.n[0]) + ' দিন, পথ খ-এ ' + bn(s.n[1]) + ' দিন।');
        if (best !== null) lines.push('এখন পর্যন্ত আপনার হিসাবে সেরা ' + ROUTES[best].name + '।');
        if (s.day >= 6 && (s.n[0] < 2 || s.n[1] < 2)) lines.push('একটি পথ খুব কম চেষ্টা করেছেন, তাই হিসাবটা ভুল হতে পারে।');
      }
      status.textContent = '';
      lines.forEach(function (l) { status.appendChild(h('div', {}, [l])); });
    }
    update();
  };
})();
