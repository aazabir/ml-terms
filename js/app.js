/* সাধারণ সহায়ক ফাংশন, হেডার, হোমপেজ, পর্ব ও টার্মের পাতা */
(function () {
  'use strict';

  var DIG = '০১২৩৪৫৬৭৮৯';
  function bn(n) { return String(n).replace(/\d/g, function (d) { return DIG.charAt(d); }); }

  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) {
      if (c === null || c === undefined) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* বাদ */ } }
  };

  /* ডেটা লোড (ক্যাশ সহ) */
  var cache = {};
  function getJSON(path) {
    if (!cache[path]) {
      cache[path] = fetch(path).then(function (r) {
        if (!r.ok) throw new Error(path + ' পাওয়া যায়নি (' + r.status + ')');
        return r.json();
      });
    }
    return cache[path];
  }
  function loadBook() { return getJSON('./data/chapters.json'); }
  function loadChapter(id) { return getJSON('./data/ch-' + id + '.json'); }
  /* লেখা হয়েছে এমন সব টার্ম, বইয়ের ক্রমে */
  function loadAllTerms() {
    return loadBook().then(function (book) {
      var list = book.chapters.filter(function (c) { return c.written > 0; });
      return Promise.all(list.map(function (c) {
        return loadChapter(c.id).then(function (terms) {
          return terms.map(function (t, i) { return { chapter: c, term: t, index: i }; });
        });
      }));
    }).then(function (arrs) { return [].concat.apply([], arrs); });
  }

  function termText(t) {
    var parts = [t.simple || ''];
    (t.body || []).forEach(function (b) { parts.push(typeof b === 'string' ? b : (b && b.h) || ''); });
    if (t.table) {
      parts.push((t.table.headers || []).join(' '));
      (t.table.rows || []).forEach(function (r) { parts.push(r.join(' ')); });
    }
    return parts.join(' ');
  }
  function wordCount(t) { return termText(t).split(/\s+/).filter(Boolean).length; }
  var WPM = 150;
  function minutes(words) { return Math.max(1, Math.ceil(words / WPM)); }

  function chapterTitle(c) { return c.en ? c.title + ' (' + c.en + ')' : c.title; }
  function termTitle(t) { return t.bn + ' (' + t.en + ')'; }
  function termUrl(c, t) { return './chapter.html?c=' + c.id + '&t=' + encodeURIComponent(t.id); }

  window.ML = {
    bn: bn, h: h, store: store, getJSON: getJSON,
    loadBook: loadBook, loadChapter: loadChapter, loadAllTerms: loadAllTerms,
    wordCount: wordCount, minutes: minutes, chapterTitle: chapterTitle,
    termTitle: termTitle, termUrl: termUrl
  };

  /* হেডার */
  function buildHeader() {
    var host = document.getElementById('site-header');
    if (!host) return;
    var minus = h('button', { type: 'button', 'aria-label': 'লেখা ছোট করুন', onclick: function () { MLTheme.fontStep(-1); } }, ['A−']);
    var plus = h('button', { type: 'button', 'aria-label': 'লেখা বড় করুন', onclick: function () { MLTheme.fontStep(1); } }, ['A+']);
    var themeBtn = h('button', { type: 'button', onclick: function () { MLTheme.toggle(); } });
    function syncTheme() {
      var dark = MLTheme.current() === 'dark';
      themeBtn.textContent = dark ? 'লাইট মোড' : 'ডার্ক মোড';
      themeBtn.setAttribute('aria-label', dark ? 'লাইট মোডে যান' : 'ডার্ক মোডে যান');
    }
    function syncSize() {
      var s = MLTheme.sizeState();
      minus.disabled = s.index <= s.min;
      plus.disabled = s.index >= s.max;
      minus.style.opacity = minus.disabled ? '0.4' : '';
      plus.style.opacity = plus.disabled ? '0.4' : '';
    }
    document.addEventListener('mlthemechange', syncTheme);
    document.addEventListener('mlfontchange', syncSize);
    syncTheme(); syncSize();

    var input = h('input', {
      type: 'search', id: 'search-input', autocomplete: 'off', spellcheck: 'false',
      placeholder: 'টার্ম খুঁজুন (বাংলা বা ইংরেজি)', 'aria-controls': 'search-results'
    });
    host.appendChild(h('div', { class: 'header-inner' }, [
      h('div', { class: 'header-top' }, [
        h('a', { class: 'brand', href: './index.html' }, ['মেশিন লার্নিং, সহজ ভাষায়']),
        h('div', { class: 'tools', role: 'group', 'aria-label': 'দেখার সেটিং' }, [minus, plus, themeBtn])
      ]),
      h('div', { class: 'search', role: 'search' }, [
        h('label', { class: 'sr-only', for: 'search-input' }, ['টার্ম খুঁজুন']),
        input,
        h('ul', { class: 'results', id: 'search-results', hidden: true })
      ])
    ]));
    var f = document.getElementById('site-footer');
    if (f) f.textContent = 'সহজ করার জন্য এখানে কিছু সংজ্ঞা ইচ্ছে করেই সরল রাখা হয়েছে। আনুষ্ঠানিক সংজ্ঞা বা গবেষণার কাজে স্ট্যান্ডার্ড পাঠ্যবই দেখুন।';
  }

  function showError(msg) {
    var main = document.getElementById('main');
    main.textContent = '';
    main.appendChild(h('h1', { class: 'term-title' }, ['পাতাটি খোলা গেল না']));
    main.appendChild(h('p', {}, [msg]));
    main.appendChild(h('p', {}, [h('a', { href: './index.html' }, ['সূচিপত্রে ফিরে যান'])]));
  }

  /* হোমপেজ */
  function renderHome() {
    var main = document.getElementById('main');
    loadBook().then(function (book) {
      return Promise.all(book.chapters.map(function (c) {
        return c.written > 0 ? loadChapter(c.id) : Promise.resolve([]);
      })).then(function (all) { return { book: book, all: all }; });
    }).then(function (res) {
      var b = res.book.book;
      document.title = b.title;
      main.textContent = '';
      main.appendChild(h('h1', { class: 'book-title' }, [b.title]));
      main.appendChild(h('p', { class: 'subtitle' }, [b.subtitle]));
      b.intro.forEach(function (p) { main.appendChild(h('p', {}, [p])); });
      main.appendChild(h('aside', { class: 'note', 'aria-labelledby': 'note-h' },
        [h('h2', { id: 'note-h' }, [b.noteTitle])].concat(b.note.map(function (p) { return h('p', {}, [p]); }))));
      main.appendChild(h('h2', { class: 'section' }, ['সূচিপত্র']));

      var ol = h('ol', { class: 'toc' });
      res.book.chapters.forEach(function (c, i) {
        var terms = res.all[i];
        var words = terms.reduce(function (s, t) { return s + wordCount(t); }, 0);
        var soon = c.written === 0;
        var meta = bn(c.total) + 'টি টার্ম';
        if (soon) meta += ' · শীঘ্রই আসছে';
        else {
          if (c.written < c.total) meta += ' · ' + bn(c.written) + 'টি লেখা হয়েছে';
          meta += ' · আনুমানিক ' + bn(minutes(words)) + ' মিনিট';
        }
        var title = soon
          ? h('span', {}, [chapterTitle(c)])
          : h('a', { href: './chapter.html?c=' + c.id }, [chapterTitle(c)]);
        var info = h('div', {}, [
          h('div', { class: 'toc-title' }, [title]),
          h('div', { class: 'toc-meta' }, [meta]),
          h('div', { class: 'bar', role: 'img', 'aria-label': bn(c.written) + ' / ' + bn(c.total) + ' টার্ম লেখা হয়েছে' },
            [h('span', { style: 'width:' + Math.round(100 * c.written / c.total) + '%' })])
        ]);
        if (!soon && c.quiz) {
          var actions = h('div', { class: 'toc-actions' }, [
            h('a', { class: 'btn-link', href: './quiz.html?c=' + c.id }, ['কুইজ দিন'])
          ]);
          var best = readBest(c.id);
          if (best) actions.appendChild(h('span', {}, ['সর্বোচ্চ স্কোর ' + bn(best.best) + '/' + bn(best.total)]));
          info.appendChild(actions);
        }
        var li = h('li', { class: 'toc-item' + (soon ? ' soon' : ''), 'aria-disabled': soon ? 'true' : null }, [
          h('div', { class: 'toc-no', 'aria-hidden': 'true' }, [bn(Number(c.id))]), info
        ]);
        ol.appendChild(li);
      });
      main.appendChild(ol);
    }).catch(function (e) { showError(e.message); });
  }

  function readBest(id) {
    var raw = store.get('mlbook:quiz:' + id);
    if (!raw) return null;
    try {
      var o = JSON.parse(raw);
      if (o && typeof o.best === 'number' && typeof o.total === 'number') return o;
    } catch (e) { /* নষ্ট ডেটা বাদ */ }
    return null;
  }

  /* পর্ব ও টার্মের পাতা */
  function renderChapterPage() {
    var main = document.getElementById('main');
    var params = new URLSearchParams(location.search);
    var cid = params.get('c');
    var tid = params.get('t');
    if (!/^\d{2}$/.test(cid || '')) { showError('পর্বের নম্বর ঠিক নেই।'); return; }
    Promise.all([loadBook(), loadAllTerms()]).then(function (res) {
      var book = res[0], flat = res[1];
      var ch = book.chapters.filter(function (c) { return c.id === cid; })[0];
      if (!ch) { showError('এই নম্বরের কোনো পর্ব নেই।'); return; }
      if (ch.written === 0) { showError('এই পর্বের টার্ম এখনো লেখা হয়নি। শীঘ্রই আসছে।'); return; }
      if (tid) renderTerm(main, book, ch, flat, tid); else renderChapterIndex(main, ch, flat);
    }).catch(function (e) { showError(e.message); });
  }

  function crumbs(ch, last) {
    var items = [h('a', { href: './index.html' }, ['সূচিপত্র']), ' › '];
    if (last) items.push(h('a', { href: './chapter.html?c=' + ch.id }, ['পর্ব ' + bn(Number(ch.id)) + ' ' + ch.title]));
    else items.push('পর্ব ' + bn(Number(ch.id)) + ' ' + ch.title);
    return h('nav', { class: 'crumbs', 'aria-label': 'পথনির্দেশ' }, items);
  }

  function renderChapterIndex(main, ch, flat) {
    var mine = flat.filter(function (x) { return x.chapter.id === ch.id; });
    document.title = 'পর্ব ' + bn(Number(ch.id)) + ' ' + ch.title + ' · মেশিন লার্নিং, সহজ ভাষায়';
    main.textContent = '';
    main.appendChild(crumbs(ch, false));
    main.appendChild(h('h1', { class: 'term-title' }, ['পর্ব ' + bn(Number(ch.id)) + ' ' + chapterTitle(ch)]));
    var ul = h('ul', { class: 'term-list' });
    mine.forEach(function (x, i) {
      ul.appendChild(h('li', {}, [h('a', { href: termUrl(ch, x.term) }, [
        bn(i + 1) + '. ' + x.term.bn + ' ', h('span', { class: 'en' }, ['(' + x.term.en + ')'])
      ])]));
    });
    for (var j = mine.length; j < ch.total; j++) {
      ul.appendChild(h('li', { class: 'pending' }, [bn(j + 1) + '. শীঘ্রই আসছে']));
    }
    main.appendChild(ul);
    if (ch.quiz) main.appendChild(h('p', {}, [h('a', { class: 'btn-link', href: './quiz.html?c=' + ch.id }, ['এই পর্বের কুইজ দিন'])]));
  }

  function renderTerm(main, book, ch, flat, tid) {
    var pos = -1;
    flat.forEach(function (x, i) { if (x.chapter.id === ch.id && x.term.id === tid) pos = i; });
    if (pos < 0) { showError('এই টার্ম খুঁজে পাওয়া গেল না।'); return; }
    var cur = flat[pos], t = cur.term;
    document.title = termTitle(t) + ' · মেশিন লার্নিং, সহজ ভাষায়';
    main.textContent = '';
    main.appendChild(crumbs(ch, true));
    main.appendChild(h('p', { class: 'term-no' }, ['টার্ম ' + bn(cur.index + 1) + ' / ' + bn(ch.total)]));
    main.appendChild(h('h1', { class: 'term-title' }, [termTitle(t)]));
    main.appendChild(h('p', { class: 'definition' }, [t.simple]));

    var body = h('div', { class: 'term-body' });
    var tableAt = typeof t.tableAfter === 'number' ? t.tableAfter : 1;
    var paraCount = 0;
    function putTable() { if (t.table) body.appendChild(buildTable(t.table)); }
    if (t.table && tableAt === 0) putTable();
    (t.body || []).forEach(function (b) {
      if (typeof b === 'string') {
        body.appendChild(h('p', {}, [b]));
        paraCount++;
        if (t.table && paraCount === tableAt) putTable();
      } else if (b && b.h) {
        body.appendChild(h('h3', {}, [b.h]));
      }
    });
    if (t.table && tableAt > paraCount) putTable();
    main.appendChild(body);

    if (t.interactive) mountInteractive(main, t.interactive);

    var prev = flat[pos - 1], next = flat[pos + 1];
    main.appendChild(h('nav', { class: 'term-nav', 'aria-label': 'আগের ও পরের টার্ম' }, [
      prev ? h('a', { class: 'prev', href: termUrl(prev.chapter, prev.term), rel: 'prev' }, [h('span', { class: 'dir' }, ['← আগের টার্ম']), prev.term.bn])
           : h('span', { class: 'none prev' }, ['এটিই প্রথম টার্ম']),
      next ? h('a', { class: 'next', href: termUrl(next.chapter, next.term), rel: 'next' }, [h('span', { class: 'dir' }, ['পরের টার্ম →']), next.term.bn])
           : h('span', { class: 'none next' }, ['পরের টার্ম শীঘ্রই আসছে'])
    ]));
  }

  function buildTable(tb) {
    var thead = h('thead', {}, [h('tr', {}, (tb.headers || []).map(function (x) { return h('th', { scope: 'col' }, [x]); }))]);
    var tbody = h('tbody', {}, (tb.rows || []).map(function (r) {
      return h('tr', {}, r.map(function (c) { return h('td', {}, [c]); }));
    }));
    var attrs = {};
    var table = h('table', attrs, [tb.caption ? h('caption', {}, [tb.caption]) : null, thead, tbody]);
    return h('div', { class: 'scroll', role: 'region', tabindex: '0', 'aria-label': tb.caption || 'টেবিল' }, [table]);
  }

  function mountInteractive(main, name) {
    if (!/^[a-z0-9-]+$/.test(name)) return;
    var box = h('section', { class: 'interactive', 'aria-label': 'নিজে করে দেখুন' });
    main.insertBefore(box, main.querySelector('.term-nav'));
    var s = document.createElement('script');
    s.src = './js/interactives/' + name + '.js';
    s.onload = function () {
      var f = window.Interactives && window.Interactives[name];
      if (typeof f === 'function') f(box); else box.remove();
    };
    s.onerror = function () { box.remove(); };
    document.body.appendChild(s);
  }

  /* চালু */
  buildHeader();
  var page = document.body.getAttribute('data-page');
  if (page === 'home') renderHome();
  else if (page === 'chapter') renderChapterPage();
})();
