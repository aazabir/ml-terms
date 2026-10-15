/* কুইজ ইঞ্জিন। ?c=01 দেখে data/quiz-01.json লোড করে। */
(function () {
  'use strict';
  if (document.body.getAttribute('data-page') !== 'quiz' || !window.ML) return;

  var main = document.getElementById('main');
  var h = ML.h, bn = ML.bn;
  var LETTERS = ['ক', 'খ', 'গ', 'ঘ'];

  var cid = new URLSearchParams(location.search).get('c');
  if (!/^\d{2}$/.test(cid || '')) return fail('পর্বের নম্বর ঠিক নেই।');

  Promise.all([ML.loadBook(), ML.getJSON('./data/quiz-' + cid + '.json').catch(function () { return null; })])
    .then(function (res) {
      var ch = res[0].chapters.filter(function (c) { return c.id === cid; })[0];
      if (!ch) return fail('এই নম্বরের কোনো পর্ব নেই।');
      var qs = res[1];
      document.title = 'পর্ব ' + bn(Number(cid)) + ' এর কুইজ · মেশিন লার্নিং, সহজ ভাষায়';
      if (!Array.isArray(qs) || !qs.length) {
        main.textContent = '';
        main.appendChild(h('h1', { class: 'term-title' }, ['পর্ব ' + bn(Number(cid)) + ' এর কুইজ']));
        main.appendChild(h('p', {}, ['এই পর্বের কুইজ এখনো তৈরি হয়নি। শীঘ্রই আসছে।']));
        main.appendChild(h('p', {}, [h('a', { href: './index.html' }, ['সূচিপত্রে ফিরে যান'])]));
        return;
      }
      qs = qs.filter(valid);
      start(ch, qs);
    }).catch(function (e) { fail(e.message); });

  function valid(q) {
    return q && typeof q.q === 'string' && Array.isArray(q.options) && q.options.length === 4 &&
      Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length;
  }
  function fail(msg) {
    main.textContent = '';
    main.appendChild(h('p', {}, [msg]));
    main.appendChild(h('p', {}, [h('a', { href: './index.html' }, ['সূচিপত্রে ফিরে যান'])]));
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function bestKey() { return 'mlbook:quiz:' + cid; }
  function readBest() {
    try { var o = JSON.parse(ML.store.get(bestKey())); if (o && typeof o.best === 'number') return o; } catch (e) { /* বাদ */ }
    return null;
  }
  function saveBest(score, total) {
    var b = readBest();
    if (!b || b.total !== total || score > b.best) ML.store.set(bestKey(), JSON.stringify({ best: score, total: total }));
  }

  function start(ch, bank) {
    var shuffleOn = true;
    function intro() {
      main.textContent = '';
      var best = readBest();
      var cb = h('input', { type: 'checkbox', id: 'shuf' });
      cb.checked = shuffleOn;
      cb.addEventListener('change', function () { shuffleOn = cb.checked; });
      main.appendChild(h('nav', { class: 'crumbs', 'aria-label': 'পথনির্দেশ' }, [
        h('a', { href: './index.html' }, ['সূচিপত্র']), ' › ', 'কুইজ'
      ]));
      main.appendChild(h('h1', { class: 'term-title' }, ['পর্ব ' + bn(Number(ch.id)) + ' এর কুইজ']));
      main.appendChild(h('p', { class: 'quiz-meta' }, [ch.title]));
      main.appendChild(h('div', { class: 'quiz-start' }, [
        h('p', {}, ['মোট ' + bn(bank.length) + 'টি প্রশ্ন। একটি একটি করে প্রশ্ন আসবে, উত্তর দিলেই সঙ্গে সঙ্গে জানতে পারবেন ঠিক হলো কি না।']),
        best ? h('p', {}, ['আপনার সর্বোচ্চ স্কোর ' + bn(best.best) + '/' + bn(best.total)]) : null,
        h('label', { for: 'shuf' }, [cb, 'প্রশ্ন ও অপশনের ক্রম এলোমেলো করুন']),
        h('div', { class: 'quiz-actions' }, [h('button', { type: 'button', onclick: function () { run(); } }, ['কুইজ শুরু করুন'])])
      ]));
    }

    function run() {
      var order = bank.map(function (q, i) { return i; });
      if (shuffleOn) order = shuffle(order);
      var items = order.map(function (i) {
        var q = bank[i];
        var idx = q.options.map(function (o, k) { return k; });
        if (shuffleOn) idx = shuffle(idx);
        return { q: q, idx: idx, correctPos: idx.indexOf(q.answer) };
      });
      var n = 0, score = 0, wrongs = [];

      function show() {
        var it = items[n];
        main.textContent = '';
        main.appendChild(h('div', { class: 'progress' }, [
          h('span', {}, ['প্রশ্ন ' + bn(n + 1) + ' / ' + bn(items.length)]),
          h('span', {}, ['সঠিক ' + bn(score) + 'টি'])
        ]));
        main.appendChild(h('p', { class: 'q-text', id: 'qtext', tabindex: '-1' }, [it.q.q]));
        var ul = h('ul', { class: 'options', 'aria-labelledby': 'qtext' });
        var btns = [];
        var fb = h('div', { 'aria-live': 'polite' });
        it.idx.forEach(function (orig, pos) {
          var mark = h('span', { class: 'mark', 'aria-hidden': 'true' });
          var b = h('button', { type: 'button', class: 'opt' }, [
            h('span', { 'aria-hidden': 'true' }, [LETTERS[pos] + '.']),
            h('span', { class: 'otext' }, [it.q.options[orig]]),
            mark
          ]);
          b._mark = mark;
          b.addEventListener('click', function () { answer(pos); });
          btns.push(b);
          ul.appendChild(h('li', {}, [b]));
        });
        main.appendChild(ul);
        main.appendChild(fb);

        function answer(pos) {
          var ok = pos === it.correctPos;
          btns.forEach(function (b, k) {
            b.disabled = true;
            if (k === it.correctPos) { b.classList.add('correct'); b._mark.textContent = 'সঠিক'; }
            else if (k === pos) { b.classList.add('wrong'); b._mark.textContent = 'ভুল'; }
            else b.classList.add('dim');
          });
          if (ok) score++; else wrongs.push({ it: it, chosen: pos });
          fb.appendChild(h('div', { class: 'feedback' + (ok ? '' : ' bad') }, [
            h('p', { class: 'verdict' }, [ok ? 'সঠিক উত্তর।' : 'উত্তরটি ঠিক হয়নি।']),
            h('p', { style: 'margin:0' }, [it.q.explain || ''])
          ]));
          var last = n === items.length - 1;
          var nb = h('button', { type: 'button', onclick: function () { if (last) finish(); else { n++; show(); } } },
            [last ? 'ফলাফল দেখুন' : 'পরের প্রশ্ন']);
          fb.appendChild(h('div', { class: 'quiz-actions' }, [nb]));
          nb.focus();
        }
        document.getElementById('qtext').focus({ preventScroll: false });
      }

      function finish() {
        saveBest(score, items.length);
        var best = readBest();
        main.textContent = '';
        main.appendChild(h('h1', { class: 'term-title' }, ['ফলাফল']));
        var box = h('div', { class: 'quiz-end' }, [
          h('p', { class: 'score' }, [bn(score) + ' / ' + bn(items.length)]),
          best ? h('p', { class: 'quiz-meta' }, ['সর্বোচ্চ স্কোর ' + bn(best.best) + '/' + bn(best.total)]) : null,
          h('div', { class: 'quiz-actions' }, [
            h('button', { type: 'button', onclick: function () { run(); } }, ['আবার চেষ্টা করুন']),
            h('a', { class: 'btn-link', href: './index.html' }, ['সূচিপত্রে ফিরুন'])
          ])
        ]);
        main.appendChild(box);
        if (wrongs.length) {
          main.appendChild(h('h2', { class: 'section' }, ['যে প্রশ্নগুলো ভুল হয়েছে']));
          var ol = h('ol', { class: 'wrong-list' });
          wrongs.forEach(function (w) {
            var q = w.it.q;
            ol.appendChild(h('li', {}, [
              h('div', {}, [q.q]),
              h('div', {}, ['আপনার উত্তর ', h('span', { class: 'yours' }, [q.options[w.it.idx[w.chosen]]])]),
              h('div', {}, ['সঠিক উত্তর ', h('span', { class: 'right' }, [q.options[q.answer]])]),
              h('div', { class: 'quiz-meta' }, [q.explain || ''])
            ]));
          });
          main.appendChild(ol);
        } else {
          main.appendChild(h('p', {}, ['সবগুলো উত্তর ঠিক হয়েছে।']));
        }
        window.scrollTo(0, 0);
      }
      show();
    }
    intro();
  }
})();
