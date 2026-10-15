/* আউটলায়ার : একজনের আয় বদলালে গড় আর মধ্যমা কীভাবে বদলায় */
(function () {
  'use strict';

  var BASE = [30, 32, 35, 38, 40]; // হাজার টাকা
  var MIN = 30, MAX = 2000, STEP = 10;

  function mean(a) { return a.reduce(function (s, x) { return s + x; }, 0) / a.length; }
  function median(a) {
    var b = a.slice().sort(function (x, y) { return x - y; });
    var m = b.length >> 1;
    return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2;
  }
  function compute(x) {
    var all = BASE.concat([x]);
    return { all: all, mean: mean(all), median: median(all) };
  }

  var api = { compute: compute, BASE: BASE, mean: mean, median: median };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window === 'undefined') return;

  (window.Interactives = window.Interactives || {})['outlier-mean'] = function (box) {
    var ML = window.ML, h = ML.h, bn = ML.bn;
    function num(x) { return bn((Math.round(x * 10) / 10).toString()); }

    var slider = h('input', { type: 'range', id: 'ol-x', min: String(MIN), max: String(MAX), step: String(STEP), value: '40' });
    var out = h('output', { for: 'ol-x' });
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 420 156');
    svg.setAttribute('role', 'img');
    var status = h('div', { class: 'i-status', 'aria-live': 'polite' });

    box.appendChild(h('p', { class: 'i-title' }, ['ছয় বন্ধুর আয়, একজন বদলে গেলে']));
    box.appendChild(h('p', {}, ['পাঁচজনের মাসিক আয় ৩০, ৩২, ৩৫, ৩৮ ও ৪০ হাজার টাকা। ছয় নম্বর বন্ধুর আয় স্লাইডারে বদলান। দেখুন গড় আর মধ্যমা কে কতটা নড়ে।']));
    box.appendChild(h('div', { class: 'i-slider' }, [
      h('label', { for: 'ol-x' }, ['ছয় নম্বর বন্ধুর মাসিক আয় (হাজার টাকা)']), slider, out
    ]));
    box.appendChild(h('div', { class: 'svg-wrap' }, [svg]));
    box.appendChild(status);

    function el(tag, attrs, text) {
      var e = document.createElementNS(svgNS, tag);
      Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
      if (text !== undefined) e.textContent = text;
      return e;
    }
    function update() {
      var x = Number(slider.value), r = compute(x);
      out.textContent = bn(x);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var x0 = 20, w = 380, sc = function (v) { return x0 + (v / MAX) * w; };
      var axisY = 78;
      svg.appendChild(el('line', { x1: x0, x2: x0 + w, y1: axisY, y2: axisY, 'stroke-width': 2, style: 'stroke:var(--fg)' }));
      [0, 500, 1000, 1500, 2000].forEach(function (t) {
        svg.appendChild(el('line', { x1: sc(t), x2: sc(t), y1: axisY, y2: axisY + 6, 'stroke-width': 1, style: 'stroke:var(--fg)' }));
        svg.appendChild(el('text', { x: sc(t), y: axisY + 24, 'font-size': 17, 'text-anchor': t === 0 ? 'start' : (t === MAX ? 'end' : 'middle') }, bn(t)));
      });
      r.all.forEach(function (v, i) {
        var isLast = i === r.all.length - 1;
        svg.appendChild(el('circle', { cx: sc(v), cy: axisY - 12, r: 7, 'stroke-width': 2, style: 'stroke:var(--fg);fill:' + (isLast ? 'var(--bg)' : 'var(--fg)') }));
      });
      var mx = sc(r.mean), dx = sc(r.median);
      // গড় : ভরাট ত্রিভুজ ওপরে
      svg.appendChild(el('polygon', { points: mx + ',' + (axisY - 30) + ' ' + (mx - 8) + ',' + (axisY - 46) + ' ' + (mx + 8) + ',' + (axisY - 46), style: 'fill:var(--fg)' }));
      svg.appendChild(el('text', { x: Math.min(Math.max(mx, 40), 380), y: axisY - 52, 'font-size': 17, 'font-weight': 700, 'text-anchor': 'middle' }, 'গড় ' + num(r.mean)));
      // মধ্যমা : ফাঁকা হীরা নিচে
      svg.appendChild(el('polygon', { points: dx + ',' + (axisY + 34) + ' ' + (dx - 8) + ',' + (axisY + 44) + ' ' + dx + ',' + (axisY + 54) + ' ' + (dx + 8) + ',' + (axisY + 44), fill: 'none', 'stroke-width': 2, style: 'stroke:var(--fg)' }));
      svg.appendChild(el('text', { x: Math.min(Math.max(dx, 55), 365), y: axisY + 74, 'font-size': 17, 'font-weight': 700, 'text-anchor': 'middle' }, 'মধ্যমা ' + num(r.median)));
      svg.setAttribute('aria-label', 'গড় ' + num(r.mean) + ' হাজার, মধ্যমা ' + num(r.median) + ' হাজার টাকা');
      status.textContent = 'ছয়জনের গড় আয় ' + num(r.mean) + ' হাজার টাকা, আর মধ্যমা ' + num(r.median) + ' হাজার টাকা। '
        + (x >= 200 ? 'গড়টি এখন কারও আয়ের কাছাকাছি নয়, অথচ মধ্যমা প্রায় আগের জায়গাতেই আছে।' : 'ছয় নম্বর বন্ধুর আয় বাড়িয়ে দেখুন।');
    }
    slider.addEventListener('input', update);
    update();
  };
})();
