"use client";

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function DominoesEasterEggModal({ isOpen, onClose, theme = 'dark' }) {
  const rootRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !rootRef.current) return;
    const root = rootRef.current;
    const $ = (id) => root.querySelector(`#${id}`);

    const PV = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
    const PH = PV.slice();
    PH[6] = [0, 1, 2, 6, 7, 8];

    let S;
    let pending = null;
    let lastText = '';
    let score = { p: 0, c: 0 };
    let lastWinner = null;
    let destroyed = false;
    const timers = new Set();

    const later = (fn, ms) => {
      const id = setTimeout(() => {
        timers.delete(id);
        if (!destroyed) fn();
      }, ms);
      timers.add(id);
    };

    function half(n, horiz) {
      const h = document.createElement('div');
      h.className = 'half';
      const m = horiz ? PH : PV;
      for (let i = 0; i < 9; i++) {
        const c = document.createElement('div');
        if (m[n].includes(i)) c.className = 'pip';
        h.appendChild(c);
      }
      return h;
    }

    function tileEl(t, horiz) {
      const d = document.createElement('div');
      d.className = 'tile' + (horiz ? ' h' : '');
      d.append(half(t[0], horiz), half(t[1], horiz));
      return d;
    }

    function backEl() {
      const d = document.createElement('div');
      d.className = 'back';
      return d;
    }

    function ends() {
      return S.chain.length ? [S.chain[0][0], S.chain[S.chain.length - 1][1]] : null;
    }

    function can(t) {
      const e = ends();
      if (!e) return S.anyStart || (t[0] === t[1] && t[0] === S.startD);
      return t.includes(e[0]) || t.includes(e[1]);
    }

    function sum(h) {
      return h.reduce((s, t) => s + t[0] + t[1], 0);
    }

    function newGame() {
      score = { p: 0, c: 0 };
      lastWinner = null;
      startRound();
    }

    function startRound() {
      let all, p, c, d = -1;
      const anyStart = lastWinner !== null;
      do {
        all = [];
        for (let i = 0; i <= 6; i++) for (let j = i; j <= 6; j++) all.push([i, j]);
        for (let i = all.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [all[i], all[j]] = [all[j], all[i]];
        }
        p = all.splice(0, 7);
        c = all.splice(0, 7);
        d = -1;
        [...p, ...c].forEach((t) => {
          if (t[0] === t[1] && t[0] > d) d = t[0];
        });
      } while (!anyStart && d < 0);

      const turn = anyStart ? lastWinner : (p.some((t) => t[0] === d && t[1] === d) ? 'p' : 'c');
      const msg =
        turn === 'p'
          ? anyStart
            ? 'You won the last round — start with any tile'
            : 'You have the highest double — play it'
          : anyStart
          ? 'Opponent won the last round and starts'
          : 'Opponent starts with the highest double';

      S = {
        p,
        c,
        pile: all,
        chain: [],
        startIdx: 0,
        startD: anyStart ? -1 : d,
        anyStart,
        turn,
        passes: 0,
        over: false,
        match: false,
        deal: true,
        newest: null,
        newP: null,
        cDrew: false,
        msg,
      };
      pending = null;
      render();
      if (turn === 'c') later(compTurn, 1100);
    }

    function place(t, side) {
      if (!S.chain.length) {
        S.chain.push(t);
        S.startIdx = 0;
        S.newest = t;
        return;
      }
      const e = ends();
      let o;
      if (side === 'r') {
        o = t[0] === e[1] ? t : [t[1], t[0]];
        S.chain.push(o);
      } else {
        o = t[1] === e[0] ? t : [t[1], t[0]];
        S.chain.unshift(o);
        S.startIdx++;
      }
      S.newest = o;
    }

    function finish() {
      let pts = 0;
      let who = null;
      if (S.p.length === 0) {
        who = 'p';
        pts = sum(S.c);
        S.msg = 'You win the round · +' + pts;
      } else if (S.c.length === 0) {
        who = 'c';
        pts = sum(S.p);
        S.msg = 'Opponent wins the round · +' + pts;
      } else if (S.passes >= 2) {
        const a = sum(S.p);
        const b = sum(S.c);
        if (a < b) {
          who = 'p';
          pts = b - a;
          S.msg = 'Blocked — you win the round · +' + pts;
        } else if (a > b) {
          who = 'c';
          pts = a - b;
          S.msg = 'Blocked — opponent wins the round · +' + pts;
        } else {
          S.msg = 'Blocked — it\u2019s a draw, no points';
        }
      } else {
        return false;
      }

      S.over = true;
      if (who) score[who] += pts;
      lastWinner = who;
      if (score.p >= 100 || score.c >= 100) {
        S.match = true;
        S.msg =
          (score.p >= score.c ? 'You win the match' : 'Opponent wins the match') +
          ' · ' +
          score.p +
          ' to ' +
          score.c;
      }
      return true;
    }

    function toComputer() {
      S.turn = 'c';
      S.msg = 'Opponent\u2019s turn';
      render();
      later(compTurn, 900);
    }

    function playerPlay(i, side) {
      const t = S.p.splice(i, 1)[0];
      place(t, side);
      S.passes = 0;
      pending = null;
      if (finish()) {
        render();
        return;
      }
      toComputer();
    }

    function clickTile(i) {
      if (S.over || S.turn !== 'p') return;
      const t = S.p[i];
      if (!can(t)) return;
      const e = ends();
      if (!e) {
        playerPlay(i, 'r');
        return;
      }
      const L = t.includes(e[0]);
      const R = t.includes(e[1]);
      if (L && R && e[0] !== e[1]) {
        pending = i;
        render();
        return;
      }
      playerPlay(i, R ? 'r' : 'l');
    }

    function draw() {
      if (S.turn !== 'p' || !S.pile.length) return;
      const t = S.pile.pop();
      S.p.push(t);
      S.newP = t;
      render();
    }

    function pass() {
      S.passes++;
      pending = null;
      if (finish()) {
        render();
        return;
      }
      toComputer();
    }

    function compTurn() {
      if (S.over) return;
      const e = ends();
      const ok = S.c
        .map((t, i) => ({ t, i }))
        .filter((o) => can(o.t))
        .sort((a, b) => b.t[0] + b.t[1] - (a.t[0] + a.t[1]));
      if (ok.length) {
        const { t, i } = ok[0];
        let side = 'r';
        if (e && !t.includes(e[1])) side = 'l';
        S.c.splice(i, 1);
        place(t, side);
        S.passes = 0;
        if (finish()) {
          render();
          return;
        }
        S.turn = 'p';
        S.msg = 'Your turn';
        render();
        return;
      }
      if (S.pile.length) {
        S.c.push(S.pile.pop());
        S.cDrew = true;
        S.msg = 'Opponent draws';
        render();
        later(compTurn, 700);
        return;
      }
      S.passes++;
      if (finish()) {
        render();
        return;
      }
      S.turn = 'p';
      S.msg = 'Opponent passed — your turn';
      render();
    }

    function layoutBoard() {
      const bd = $('domino-board');
      if (!bd) return;
      bd.innerHTML = '';
      if (!S.chain.length) return;
      const W = bd.clientWidth;
      const H = bd.clientHeight;
      const T = 26;
      const Ln = 52;
      const g = 3;
      const Hx = Math.max(90, W / 2 - 30);
      const RS = Ln + 2 * g;
      const st0 = S.chain[S.startIdx];
      const sd = st0[0] === st0[1];
      const s0 = (sd ? T : Ln) / 2 + g;

      function walk(tiles) {
        let p = { x: s0, y: 0 };
        let d = { x: 1, y: 0 };
        let hdir = 1;
        let rowY = 0;
        let bridge = false;
        const out = [];
        for (const t of tiles) {
          const dbl = t[0] === t[1];
          const len = dbl ? T : Ln;
          let cx, cy, ang;
          if (bridge) {
            hdir = -hdir;
            const sx = p.x - (hdir * T) / 2;
            cx = sx + (hdir * Ln) / 2;
            cy = rowY;
            p = { x: sx + hdir * (Ln + g), y: rowY };
            d = { x: hdir, y: 0 };
            ang = hdir > 0 ? 0 : Math.PI;
            bridge = false;
          } else if (Math.abs(p.x + d.x * len) > Hx) {
            const sy = rowY - T / 2;
            cx = p.x + d.x * (T / 2 + g);
            cy = sy + Ln / 2;
            rowY += RS;
            p = { x: cx, y: rowY };
            d = { x: 0, y: 1 };
            ang = Math.PI / 2;
            bridge = true;
          } else {
            cx = p.x + (d.x * len) / 2;
            cy = p.y;
            p = { x: p.x + d.x * (len + g), y: p.y };
            ang = d.x > 0 ? 0 : Math.PI;
            if (dbl) ang += Math.PI / 2;
          }
          out.push({ x: cx, y: cy, ang, t });
        }
        return out;
      }

      const items = [
        { x: 0, y: 0, ang: sd ? Math.PI / 2 : 0, h: S.chain[S.startIdx], src: S.chain[S.startIdx] },
      ];
      walk(S.chain.slice(S.startIdx + 1)).forEach((o) =>
        items.push({ x: o.x, y: o.y, ang: o.ang, h: o.t, src: o.t })
      );
      walk(S.chain.slice(0, S.startIdx).reverse()).forEach((o) =>
        items.push({ x: -o.x, y: -o.y, ang: o.ang + Math.PI, h: [o.t[1], o.t[0]], src: o.t })
      );

      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      items.forEach((i) => {
        x0 = Math.min(x0, i.x - 30);
        x1 = Math.max(x1, i.x + 30);
        y0 = Math.min(y0, i.y - 30);
        y1 = Math.max(y1, i.y + 30);
      });
      const sc = Math.min(1, (W - 8) / (x1 - x0), (H - 8) / (y1 - y0));
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const layer = document.createElement('div');
      layer.id = 'domino-layer';
      layer.style.transform = `translate(${W / 2}px,${H / 2}px) scale(${sc}) translate(${-cx}px,${-cy}px)`;

      items.forEach((i) => {
        const w = document.createElement('div');
        w.className = 'pos';
        w.style.left = i.x + 'px';
        w.style.top = i.y + 'px';
        w.style.transform = `translate(-50%,-50%) rotate(${i.ang}rad)`;
        const el = tileEl(i.h, true);
        if (i.src === S.newest) el.classList.add('drop');
        w.appendChild(el);
        layer.appendChild(w);
      });
      bd.appendChild(layer);
    }

    function statusText() {
      if (S.over || S.turn !== 'p' || !S.chain.length) return S.msg;
      if (pending !== null) return 'Choose which end to play';
      if (!S.p.some(can)) return S.pile.length ? 'No matching tile — draw from the pile' : 'Nothing left to draw — pass';
      return S.msg;
    }

    function render() {
      const txt = statusText();
      const st = $('domino-status');
      const info = $('domino-info');
      const comp = $('domino-comp');
      const h = $('domino-hand');
      const bar = $('domino-bar');
      if (!st || !info || !comp || !h || !bar) return;

      if (txt !== lastText) {
        st.textContent = txt;
        st.classList.remove('fade');
        void st.offsetWidth;
        st.classList.add('fade');
        lastText = txt;
      }
      info.textContent = `You ${score.p}  ·  Opponent ${score.c}  ·  Pile ${S.pile.length}`;
      comp.innerHTML = '';
      comp.style.gap = S.c.length > 9 ? '-12px' : '6px';
      S.c.forEach((_, i) => {
        const el = backEl();
        if (S.deal) {
          el.classList.add('enter');
          el.style.animationDelay = i * 50 + 'ms';
        } else if (S.cDrew && i === S.c.length - 1) {
          el.classList.add('rise');
        }
        comp.appendChild(el);
      });
      layoutBoard();
      h.innerHTML = '';
      S.p.forEach((t, i) => {
        const el = tileEl(t, false);
        el.onclick = () => clickTile(i);
        if (S.deal) {
          el.classList.add('enter');
          el.style.animationDelay = 250 + i * 60 + 'ms';
        } else if (t === S.newP) {
          el.classList.add('rise');
        }
        h.appendChild(el);
      });
      bar.innerHTML = '';
      const mk = (bTxt, fn, cls) => {
        const x = document.createElement('button');
        x.type = 'button';
        x.textContent = bTxt;
        x.onclick = fn;
        if (cls) x.className = cls;
        bar.appendChild(x);
      };
      if (S.over) {
        S.match ? mk('New Match', newGame) : mk('Next Round', startRound);
      } else if (S.turn === 'p') {
        const e = ends();
        if (pending !== null) {
          mk('Left · ' + e[0], () => playerPlay(pending, 'l'));
          mk('Right · ' + e[1], () => playerPlay(pending, 'r'));
        } else if (e && !S.p.some(can)) {
          if (S.pile.length) mk('Draw', draw);
          else mk('Pass', pass);
        }
      }
      if (!S.over) mk('Restart', newGame, 'plain');
      S.deal = false;
      S.newest = null;
      S.newP = null;
      S.cDrew = false;
    }

    const onResize = () => {
      if (S) layoutBoard();
    };
    window.addEventListener('resize', onResize);
    newGame();

    return () => {
      destroyed = true;
      window.removeEventListener('resize', onResize);
      timers.forEach((id) => clearTimeout(id));
      timers.clear();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={rootRef}
      data-theme={theme === 'light' ? 'light' : 'dark'}
      className="domino-root fixed inset-0 z-[10060] flex flex-col overflow-hidden select-none"
    >
      <style>{`
        .domino-root{--bg:#000;--fg:#fff;background:var(--bg);color:var(--fg);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,"Segoe UI",sans-serif;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);touch-action:manipulation;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent}
        .domino-root[data-theme="light"]{--bg:#fff;--fg:#000}
        .domino-root *{box-sizing:border-box}
        .domino-root #domino-top{padding:16px 48px 0;text-align:center}
        .domino-root .row{display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
        .domino-root #domino-comp{min-height:44px}
        .domino-root #domino-info{font-size:13px;margin-top:12px;opacity:.55;letter-spacing:-.08px}
        .domino-root #domino-board{flex:1;position:relative;min-height:0;overflow:hidden}
        .domino-root #domino-layer{position:absolute;left:0;top:0;transform-origin:0 0}
        .domino-root .pos{position:absolute;width:52px;height:26px}
        .domino-root #domino-bottom{padding:0 16px 8px;text-align:center}
        .domino-root #domino-status{font-size:13px;font-weight:500;letter-spacing:-.08px;opacity:.55;min-height:20px;margin-bottom:16px}
        .domino-root .fade{animation:domino-fade .3s ease-out both}
        .domino-root .tile{display:flex;flex-direction:column;width:40px;height:74px;border:1px solid var(--fg);border-radius:8px;background:var(--bg);flex:none}
        .domino-root .tile.h{flex-direction:row;width:52px;height:26px;border-radius:6px}
        .domino-root .half{flex:1;display:grid;grid-template:repeat(3,1fr)/repeat(3,1fr);padding:4px}
        .domino-root .half+.half{border-top:1px solid var(--fg)}
        .domino-root .h .half{padding:2px}
        .domino-root .h .half+.half{border-top:0;border-left:1px solid var(--fg)}
        .domino-root .pip{width:6px;height:6px;border-radius:50%;background:var(--fg);place-self:center}
        .domino-root .h .pip{width:4px;height:4px}
        .domino-root .back{width:26px;height:46px;border-radius:6px;background:var(--fg);position:relative}
        .domino-root .back::after{content:"";position:absolute;left:4px;right:4px;top:50%;height:1px;background:var(--bg);opacity:.5}
        .domino-root .mine{margin-bottom:20px;gap:6px}
        .domino-root .mine .tile{cursor:pointer;transition:transform .15s ease}
        .domino-root .mine .tile:active{transform:scale(.94)}
        .domino-root .bar{display:flex;gap:8px;justify-content:center;align-items:center;min-height:44px}
        .domino-root .bar button{font:inherit;font-size:17px;font-weight:600;letter-spacing:-.4px;height:44px;padding:0 24px;border:0;border-radius:22px;cursor:pointer;background:var(--fg);color:var(--bg);transition:transform .15s ease,opacity .15s ease}
        .domino-root .bar button:active{transform:scale(.95);opacity:.8}
        .domino-root .bar button.plain{background:transparent;color:var(--fg);font-weight:500;opacity:.55}
        .domino-root .enter{animation:domino-enter .5s cubic-bezier(.2,.9,.3,1.15) both}
        .domino-root .drop{animation:domino-drop .45s cubic-bezier(.2,.9,.3,1.1) both}
        .domino-root .rise{animation:domino-enter .35s cubic-bezier(.2,.9,.3,1.1) both}
        @keyframes domino-enter{from{opacity:0;transform:translateY(18px) scale(.9)}to{opacity:1;transform:none}}
        @keyframes domino-drop{from{opacity:0;transform:scale(1.4)}55%{opacity:1}to{opacity:1;transform:scale(1)}}
        @keyframes domino-fade{from{opacity:0;transform:translateY(4px)}to{opacity:.55;transform:none}}
        @media (prefers-reduced-motion:reduce){.domino-root *{animation:none!important;transition:none!important}}
      `}</style>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close Dominoes"
        className="absolute top-[calc(env(safe-area-inset-top,0px)+14px)] right-4 z-10 w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all cursor-pointer"
      >
        <X size={18} />
      </button>

      <div id="domino-top">
        <div className="row" id="domino-comp" />
        <div id="domino-info" />
      </div>
      <div id="domino-board" />
      <div id="domino-bottom">
        <div id="domino-status" />
        <div className="row mine" id="domino-hand" />
        <div className="bar" id="domino-bar" />
      </div>
    </div>
  );
}
