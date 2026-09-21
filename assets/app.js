/* YOYOMAN 第四度空間的歷史 — 共用程式 */
(function () {
  'use strict';

  /* ── 安全的本機儲存 ───────────────── */
  var LS = {
    get: function (k, d) { try { var v = localStorage.getItem('yoyo:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('yoyo:' + k, JSON.stringify(v)); } catch (e) { } }
  };
  window.YOYO_LS = LS;

  /* ── 主題與字級 ───────────────────── */
  var root = document.documentElement;
  var th = LS.get('theme', null);
  if (th) root.setAttribute('data-theme', th);
  var fs = LS.get('fs', 1);
  root.style.setProperty('--fs', fs);

  function toggleTheme() {
    var cur = root.getAttribute('data-theme');
    if (!cur) cur = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    var nxt = cur === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', nxt); LS.set('theme', nxt);
    var b = document.getElementById('themeBtn'); if (b) b.textContent = nxt === 'dark' ? '☾' : '☀';
  }
  function bumpFont(d) {
    fs = Math.min(1.5, Math.max(0.85, Math.round((fs + d) * 100) / 100));
    root.style.setProperty('--fs', fs); LS.set('fs', fs);
  }
  window.YOYO_toggleTheme = toggleTheme;
  window.YOYO_bumpFont = bumpFont;

  document.addEventListener('DOMContentLoaded', function () {
    var b = document.getElementById('themeBtn');
    if (b) {
      var cur = root.getAttribute('data-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      b.textContent = cur === 'dark' ? '☾' : '☀';
      b.addEventListener('click', toggleTheme);
    }
    var p = document.getElementById('fontUp'), m = document.getElementById('fontDown');
    if (p) p.addEventListener('click', function () { bumpFont(0.08); });
    if (m) m.addEventListener('click', function () { bumpFont(-0.08); });

    initTOC(); initTerms(); initQuiz(); initSearch(); initProgress();
  });

  /* ── 側欄目錄 scrollspy ───────────── */
  function initTOC() {
    var links = [].slice.call(document.querySelectorAll('.toc a[href^="#"]'));
    if (!links.length) return;
    var secs = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
    function spy() {
      var y = window.scrollY + 110, best = 0;
      secs.forEach(function (s, i) { if (s.offsetTop <= y) best = i; });
      links.forEach(function (a, i) { a.classList.toggle('on', i === best); });
    }
    window.addEventListener('scroll', spy, { passive: true }); spy();
  }

  /* ── 關鍵詞翻卡 ───────────────────── */
  function initTerms() {
    [].forEach.call(document.querySelectorAll('.term'), function (t) {
      t.addEventListener('click', function () { t.classList.toggle('open'); });
    });
    var all = document.getElementById('termsAll');
    if (all) all.addEventListener('click', function () {
      var ts = document.querySelectorAll('.term');
      var anyClosed = [].some.call(ts, function (t) { return !t.classList.contains('open'); });
      [].forEach.call(ts, function (t) { t.classList.toggle('open', anyClosed); });
      all.textContent = anyClosed ? '全部收合' : '全部展開';
    });
  }

  /* ── 練習題引擎 ───────────────────── */
  var KEY = ['A', 'B', 'C', 'D', 'E', 'F'];
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  var _state = [];
  function mountQuiz() {
    var host = document.getElementById('quiz');
    if (!host || !window.QUIZ) return;
    _state = [];
    renderQuiz(host, window.QUIZ, _state);
    setScore('');
  }
  window.YOYO_mountQuiz = mountQuiz;

  function initQuiz() {
    var host = document.getElementById('quiz');
    if (!host) return;
    if (window.QUIZ) mountQuiz();
    var chk = document.getElementById('qCheck'), rst = document.getElementById('qReset'), shw = document.getElementById('qShow');
    if (chk) chk.addEventListener('click', function () { if (window.QUIZ) gradeAll(host, window.QUIZ, _state); });
    if (rst) rst.addEventListener('click', function () { mountQuiz(); });
    if (shw) shw.addEventListener('click', function () {
      [].forEach.call(host.querySelectorAll('.exp'), function (e) { e.classList.add('show'); });
    });
  }
  function setScore(t) { var s = document.getElementById('qScore'); if (s) s.textContent = t; }

  function renderQuiz(host, qs, state) {
    host.innerHTML = '';
    qs.forEach(function (q, i) {
      var el = document.createElement('div'); el.className = 'q'; el.dataset.i = i;
      var head = '<div class="qh"><span class="qn">' + (i + 1) + '</span><div class="qt">' + esc(q.q) + '</div></div>';
      var body = '';
      if (q.passage) body += '<div class="passage">' + esc(q.passage) + '</div>';

      if (q.t === 'mc') body += optsHTML(q.o, i);
      else if (q.t === 'tf') body += '<div class="opts tfrow">' +
        '<button class="opt" data-v="1" style="flex:1"><span class="k">○</span><span>正確</span></button>' +
        '<button class="opt" data-v="0" style="flex:1"><span class="k">✕</span><span>錯誤</span></button></div>';
      else if (q.t === 'fill') body += '<input class="fillin" type="text" placeholder="在此作答…">';
      else if (q.t === 'order') {
        var sh = shuffle(q.items.map(function (x, k) { return { x: x, k: k }; }));
        state[i] = sh.map(function (o) { return o.k; });
        body += '<div class="orderlist">' + sh.map(function (o, p) {
          return '<div class="oitem" data-k="' + o.k + '"><span class="idx">' + (p + 1) + '</span><span>' + esc(o.x) + '</span>' +
            '<span class="mv"><button data-d="-1" aria-label="上移">▲</button><button data-d="1" aria-label="下移">▼</button></span></div>';
        }).join('') + '</div>';
      }
      else if (q.t === 'match') {
        var rights = shuffle(q.pairs.map(function (p) { return p[1]; }));
        body += '<div class="matchgrid">' + q.pairs.map(function (p, k) {
          return '<div class="mrow" data-k="' + k + '"><span>' + esc(p[0]) + '</span><select><option value="">— 請選擇 —</option>' +
            rights.map(function (r) { return '<option value="' + esc(r) + '">' + esc(r) + '</option>'; }).join('') + '</select></div>';
        }).join('') + '</div>';
      }
      else if (q.t === 'read') {
        body += (q.subs || []).map(function (s, k) {
          return '<div class="subq" data-sub="' + k + '"><div class="qt" style="margin-bottom:9px">(' + (k + 1) + ') ' + esc(s.q) + '</div>' +
            optsHTML(s.o, i + '-' + k) + '<div class="exp"></div></div>';
        }).join('');
      }
      el.innerHTML = head + body + (q.t === 'read' ? '' : '<div class="exp"></div>');
      host.appendChild(el);

      // 互動
      [].forEach.call(el.querySelectorAll('.opts'), function (grp) {
        [].forEach.call(grp.querySelectorAll('.opt'), function (o) {
          o.addEventListener('click', function () {
            [].forEach.call(grp.querySelectorAll('.opt'), function (x) { x.classList.remove('sel'); });
            o.classList.add('sel');
          });
        });
      });
      [].forEach.call(el.querySelectorAll('.oitem .mv button'), function (b) {
        b.addEventListener('click', function () {
          var it = b.closest('.oitem'), list = it.parentNode, d = +b.dataset.d;
          var kids = [].slice.call(list.children), p = kids.indexOf(it), np = p + d;
          if (np < 0 || np >= kids.length) return;
          if (d < 0) list.insertBefore(it, kids[np]); else list.insertBefore(kids[np], it);
          [].forEach.call(list.children, function (c, ix) { c.querySelector('.idx').textContent = ix + 1; });
        });
      });
    });
  }
  function optsHTML(o, id) {
    return '<div class="opts" data-g="' + id + '">' + o.map(function (t, k) {
      return '<button class="opt" data-v="' + k + '"><span class="k">' + KEY[k] + '</span><span>' + esc(t) + '</span></button>';
    }).join('') + '</div>';
  }

  function gradeAll(host, qs, state) {
    var got = 0, total = 0;
    qs.forEach(function (q, i) {
      var el = host.querySelector('.q[data-i="' + i + '"]'); if (!el) return;
      if (q.t === 'read') {
        (q.subs || []).forEach(function (s, k) {
          total++;
          var sub = el.querySelector('.subq[data-sub="' + k + '"]');
          var ok = gradeChoice(sub, s.a);
          if (ok) got++;
          expl(sub.querySelector('.exp'), ok, s.e);
        });
        return;
      }
      total++;
      var ok = false;
      if (q.t === 'mc') ok = gradeChoice(el, q.a);
      else if (q.t === 'tf') {
        var sel = el.querySelector('.opt.sel');
        var want = q.a ? '1' : '0';
        [].forEach.call(el.querySelectorAll('.opt'), function (o) {
          o.classList.remove('right', 'wrong');
          if (o.dataset.v === want) o.classList.add('right');
          else if (o.classList.contains('sel')) o.classList.add('wrong');
        });
        ok = !!sel && sel.dataset.v === want;
      }
      else if (q.t === 'fill') {
        var inp = el.querySelector('.fillin');
        var v = (inp.value || '').trim().replace(/\s|　|‧|・/g, '');
        ok = (q.a || []).some(function (a) { return v && v.indexOf(String(a).replace(/\s|　|‧|・/g, '')) >= 0; });
        inp.classList.remove('right', 'wrong'); inp.classList.add(ok ? 'right' : 'wrong');
        if (!ok && inp.value.trim() === '') inp.placeholder = '參考答案：' + (q.a || []).join('／');
      }
      else if (q.t === 'order') {
        var list = el.querySelector('.orderlist');
        var order = [].map.call(list.children, function (c) { return +c.dataset.k; });
        ok = order.every(function (k, ix) { return k === ix; });
        [].forEach.call(list.children, function (c, ix) {
          c.classList.remove('right', 'wrong'); c.classList.add((+c.dataset.k === ix) ? 'right' : 'wrong');
        });
        if (!ok) {
          // 顯示正解順序
          var sorted = [].slice.call(list.children).sort(function (a, b) { return a.dataset.k - b.dataset.k; });
          sorted.forEach(function (c) { list.appendChild(c); });
          [].forEach.call(list.children, function (c, ix) { c.querySelector('.idx').textContent = ix + 1; c.classList.remove('wrong'); c.classList.add('right'); });
        }
      }
      else if (q.t === 'match') {
        var all = true;
        [].forEach.call(el.querySelectorAll('.mrow'), function (r) {
          var k = +r.dataset.k, sel2 = r.querySelector('select');
          var good = sel2.value === q.pairs[k][1];
          r.classList.remove('right', 'wrong'); r.classList.add(good ? 'right' : 'wrong');
          if (!good) { all = false; sel2.value = q.pairs[k][1]; }
        });
        ok = all;
      }
      if (ok) got++;
      expl(el.querySelector(':scope > .exp'), ok, q.e);
    });
    setScore('得分 ' + got + ' / ' + total);
    saveProgress(got, total);
    var first = host.querySelector('.q'); if (first) first.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function gradeChoice(scope, ans) {
    var sel = scope.querySelector('.opt.sel');
    [].forEach.call(scope.querySelectorAll('.opt'), function (o) {
      o.classList.remove('right', 'wrong');
      if (+o.dataset.v === ans) o.classList.add('right');
      else if (o.classList.contains('sel')) o.classList.add('wrong');
    });
    return !!sel && +sel.dataset.v === ans;
  }
  function expl(node, ok, text) {
    if (!node) return;
    node.innerHTML = '<span class="verdict ' + (ok ? 'ok' : 'bad') + '">' + (ok ? '答對了。' : '再想一下。') + '</span>' + esc(text || '');
    node.classList.add('show');
  }

  /* ── 進度 ─────────────────────────── */
  function saveProgress(got, total) {
    var id = document.body.dataset.chap; if (!id) return;
    var p = LS.get('progress', {});
    p[id] = { got: got, total: total, at: Date.now() };
    LS.set('progress', p);
  }
  function initProgress() {
    var p = LS.get('progress', {});
    [].forEach.call(document.querySelectorAll('[data-prog]'), function (el) {
      var r = p[el.dataset.prog];
      if (r) el.textContent = '上次得分 ' + r.got + '/' + r.total;
    });
    var done = Object.keys(p).length;
    var dn = document.getElementById('doneCount'); if (dn) dn.textContent = done;
  }

  /* ── 搜尋 ─────────────────────────── */
  function initSearch() {
    var inp = document.getElementById('q'); var out = document.getElementById('sresults');
    if (!inp || !out || !window.INDEX) return;
    function run() {
      var v = inp.value.trim();
      if (v.length < 1) { out.innerHTML = '<p style="color:var(--ink-3)">輸入關鍵字，例如「文藝復興」「冷戰」「原住民」「史料」。</p>'; return; }
      var hits = window.INDEX.filter(function (r) { return (r.t + r.c + r.k).indexOf(v) >= 0; }).slice(0, 60);
      out.innerHTML = hits.length ? hits.map(function (r) {
        return '<a class="sr-item" href="' + r.u + '"><div class="k">' + esc(r.k) + '</div><div class="t">' + esc(r.t) + '</div><div class="c">' + esc(r.c.slice(0, 90)) + '</div></a>';
      }).join('') : '<p style="color:var(--ink-3)">找不到「' + esc(v) + '」。試試別的關鍵字。</p>';
    }
    inp.addEventListener('input', run); run();
  }
})();
