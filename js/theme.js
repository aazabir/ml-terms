/* থিম ও ফন্ট সাইজ। <head>-এ লোড হয়, যাতে পাতা আঁকার আগেই সেটিং বসে যায়। */
(function () {
  'use strict';
  var root = document.documentElement;
  var SIZES = [87.5, 100, 112.5, 125, 137.5, 150];
  var DEFAULT_SIZE = 1;

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ব্যবহারযোগ্য না হলে চুপচাপ বাদ */ } }

  var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function systemTheme() { return mq && mq.matches ? 'dark' : 'light'; }
  function current() { return root.getAttribute('data-theme') || systemTheme(); }
  function apply(theme) {
    root.setAttribute('data-theme', theme);
    document.dispatchEvent(new CustomEvent('mlthemechange', { detail: theme }));
  }
  function toggle() {
    var next = current() === 'dark' ? 'light' : 'dark';
    set('mlbook:theme', next);
    apply(next);
  }

  var saved = get('mlbook:theme');
  root.setAttribute('data-theme', saved === 'dark' || saved === 'light' ? saved : systemTheme());
  if (mq && mq.addEventListener) {
    mq.addEventListener('change', function () {
      var s = get('mlbook:theme');
      if (s !== 'dark' && s !== 'light') apply(systemTheme());
    });
  }

  var sizeIdx = parseInt(get('mlbook:fontsize'), 10);
  if (!(sizeIdx >= 0 && sizeIdx < SIZES.length)) sizeIdx = DEFAULT_SIZE;
  function applySize() { root.style.fontSize = SIZES[sizeIdx] + '%'; }
  applySize();
  function fontStep(d) {
    var n = Math.max(0, Math.min(SIZES.length - 1, sizeIdx + d));
    if (n === sizeIdx) return;
    sizeIdx = n;
    set('mlbook:fontsize', String(sizeIdx));
    applySize();
    document.dispatchEvent(new CustomEvent('mlfontchange', { detail: sizeIdx }));
  }
  function sizeState() { return { index: sizeIdx, min: 0, max: SIZES.length - 1 }; }

  window.MLTheme = { toggle: toggle, current: current, fontStep: fontStep, sizeState: sizeState };
})();
