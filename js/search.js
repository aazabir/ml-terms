/* সার্চ। ইনডেক্স তৈরি হয় লেখা হয়েছে এমন সব টার্মের JSON থেকে, তাই নতুন টার্ম যোগ হলেই বাড়ে। */
(function () {
  'use strict';
  var input = document.getElementById('search-input');
  var list = document.getElementById('search-results');
  if (!input || !list || !window.ML) return;

  var index = null, loading = null;

  function norm(s) { return String(s || '').toLowerCase().normalize('NFC'); }

  function build() {
    if (index) return Promise.resolve(index);
    if (!loading) {
      loading = ML.loadAllTerms().then(function (flat) {
        index = flat.map(function (x) {
          return {
            chapter: x.chapter, term: x.term,
            bn: norm(x.term.bn), en: norm(x.term.en), simple: norm(x.term.simple + ' ' + (x.term.simpleEn || ''))
          };
        });
        return index;
      });
    }
    return loading;
  }

  function score(e, q) {
    var s = 0;
    if (e.bn.indexOf(q) === 0 || e.en.indexOf(q) === 0) s = 100;
    else if (e.bn.indexOf(q) >= 0 || e.en.indexOf(q) >= 0) s = 60;
    else if (e.simple.indexOf(q) >= 0) s = 20;
    return s;
  }

  function close() { list.hidden = true; list.textContent = ''; }

  function render(q) {
    var query = norm(q).trim();
    if (query.length < 2) { close(); return; }
    build().then(function (idx) {
      if (norm(input.value).trim() !== query) return; // পুরোনো উত্তর বাদ
      var hits = idx.map(function (e) { return { e: e, s: score(e, query) }; })
        .filter(function (x) { return x.s > 0; })
        .sort(function (a, b) { return b.s - a.s; })
        .slice(0, 8);
      list.textContent = '';
      if (!hits.length) {
        list.appendChild(ML.h('li', { class: 'r-none' }, ['কোনো ফলাফল পাওয়া যায়নি']));
      }
      hits.forEach(function (x) {
        var c = x.e.chapter, t = x.e.term;
        list.appendChild(ML.h('li', {}, [
          ML.h('a', { href: ML.termUrl(c, t) }, [
            ML.h('span', { class: 'r-name' }, [ML.termTitle(t)]),
            ML.h('span', { class: 'r-where' }, ['পর্ব ' + ML.bn(Number(c.id)) + ' · ' + c.title])
          ])
        ]));
      });
      list.hidden = false;
    }).catch(function () {
      list.textContent = '';
      list.appendChild(ML.h('li', { class: 'r-none' }, ['সার্চ ইনডেক্স লোড করা যায়নি']));
      list.hidden = false;
    });
  }

  input.addEventListener('input', function () { render(input.value); });
  input.addEventListener('focus', function () { build().catch(function () {}); });
  input.addEventListener('keydown', function (ev) {
    var links = list.querySelectorAll('a');
    if (ev.key === 'ArrowDown' && links.length) { ev.preventDefault(); links[0].focus(); }
    else if (ev.key === 'Escape') { close(); }
  });
  list.addEventListener('keydown', function (ev) {
    var links = Array.prototype.slice.call(list.querySelectorAll('a'));
    var i = links.indexOf(document.activeElement);
    if (ev.key === 'ArrowDown') { ev.preventDefault(); if (i < links.length - 1) links[i + 1].focus(); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); if (i > 0) links[i - 1].focus(); else input.focus(); }
    else if (ev.key === 'Escape') { close(); input.focus(); }
  });
  document.addEventListener('click', function (ev) {
    if (!ev.target.closest || !ev.target.closest('.search')) close();
  });
})();
