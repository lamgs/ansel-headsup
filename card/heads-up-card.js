/*
 * Heads-Up card · contract 2.0
 * A plain-JavaScript custom element: <heads-up-card>. No dependencies, no build step.
 * See CONTRACT.md for the data it reads and the events it fires.
 *
 * The Countdown design: a large timer with Join beside it, then one row per action item. Your own
 * items come first with a YOURS label and their status; everyone else's rows show no status.
 * Inside a Slack app message frame (avatar, APP tag, time).
 */
(function () {
  'use strict';

  const CONTRACT_VERSION = '2.0';
  const MIN = 60 * 1000;
  const SOON_MS = 5 * MIN; // Join turns primary at 5 minutes out
  const TIMELINE = ['posted', 'starting-soon', 'started', 'ended'];

  const DEFAULT_ROW_LIMIT = 6;
  // Icons for embedded mode (an app such as Ansel): play, mark done, done, edit.
  const svg = (d, fill = 'none') => `<svg width="16" height="16" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICON = {
    play: svg('<polygon points="7 4 20 12 7 20 7 4"/>', 'currentColor'),
    check: svg('<path d="M20 6 9 17l-5-5"/>'),
    done: svg('<circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>'),
    edit: svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
  };
  const FLAG_REASONS = [
    ['wrong_owner', 'Wrong owner'],
    ['not_real', 'Not a real item'],
    ['already_done', 'Already done'],
  ];
  const NOT_USEFUL_REASONS = [
    ['already_knew', 'Already knew this'],
    ['wrong_meeting', 'Wrong meeting'],
    ['bad_timing', 'Bad timing'],
  ];
  const STATE_ANNOUNCEMENTS = {
    'posted': 'Heads-Up posted.',
    'starting-soon': 'Meeting starts in 5 minutes. Join is ready.',
    'started': 'Meeting started.',
    'ended': 'Meeting ended. Join is off.',
  };

  // ---------- small helpers ----------

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function num(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  // 872 -> "14:32"; 3725 -> "1:02:05"
  function fmtStamp(seconds) {
    const s = Math.max(0, Math.floor(num(seconds, 0)));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return h ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
  }

  // 872 -> "14 minutes 32 seconds" (for screen readers)
  function spokenStamp(seconds) {
    const s = Math.max(0, Math.floor(num(seconds, 0)));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    const unit = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
    const parts = [];
    if (h) parts.push(unit(h, 'hour'));
    if (m || h) parts.push(unit(m, 'minute'));
    parts.push(unit(r, 'second'));
    return parts.join(' ');
  }

  function fmtClock(ms) {
    return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  function withParam(url, key, value) {
    if (!url) return null;
    return `${url}${url.includes('?') ? '&' : '?'}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
  }

  // ---------- styles: a Slack app message built from Block Kit pieces ----------
  // Motion numbers follow the taste skill: hover 150ms in / 120ms out, press 90ms, 1px step, .985 press.

  const FONT_URL = 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap';
  if (typeof document !== 'undefined' && !document.getElementById('heads-up-lato')) {
    const link = document.createElement('link');
    link.id = 'heads-up-lato';
    link.rel = 'stylesheet';
    link.href = FONT_URL;
    document.head.appendChild(link);
  }

  const LOCK = '<svg class="ico" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M5 7V5a3 3 0 0 1 6 0v2h.5A1.5 1.5 0 0 1 13 8.5v5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 13.5v-5A1.5 1.5 0 0 1 4.5 7H5Zm1.5 0h3V5a1.5 1.5 0 0 0-3 0v2Z"/></svg>';
  const PEOPLE_COLORS = ['#3E6E9C', '#2E7D6B', '#9C5B2E', '#5E6B3A'];

  const STYLES = `
    :host {
      --ink: #1D1C1D; --quiet: #616061; --line: #DDDDDD; --link: #1264A3;
      --green: #007A5A; --ansel: #1E4F8C; --soon: #A85F00; --live: #1A7F4B; --done-bg: #EAF5EF; --row-hover: #F8F8F8;
      --surface: #fff; --on-accent: #fff; --btn-line: rgba(29, 28, 29, .3); --track: #E8EEF6; --rail: #D9D9D9;
      --ease: cubic-bezier(.2, .8, .2, 1);
      display: block; max-width: 780px; color: var(--ink);
      container-type: inline-size; /* lets the narrow layout follow the card's own width, e.g. inside Ansel */
      font: 15px/1.46668 Lato, "Helvetica Neue", Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    :host([hidden]) { display: none; }
    [hidden] { display: none !important; }
    * { box-sizing: border-box; }

    /* The message row */
    .msg { display: grid; grid-template-columns: 36px minmax(0, 1fr); column-gap: 8px; padding: 8px 20px; }
    .msg:hover { background: var(--row-hover); }
    .avatar { width: 36px; height: 36px; border-radius: 8px; background: var(--ansel); color: var(--on-accent);
      display: grid; place-items: center; font-weight: 900; font-size: 18px; }
    .meta { display: flex; align-items: baseline; gap: 6px; line-height: 1.3; }
    .name { font-weight: 900; }
    .app { font-size: 10px; font-weight: 700; color: var(--quiet); background: rgba(29, 28, 29, .13);
      border-radius: 2px; padding: 1px 3px; letter-spacing: .02em; }
    .time { font-size: 12px; color: var(--quiet); }

    /* The card body sits on an Ansel-blue rail */
    .att { border-left: 4px solid var(--ansel); padding: 2px 0 2px 14px; margin-top: 4px; }

    /* Countdown: the timer is the hero, Join sits on the same line */
    .clock { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 0 18px; align-items: center; margin: 6px 0 14px; }
    .big { font-size: 56px; line-height: 1; font-weight: 900; letter-spacing: -.03em; white-space: nowrap;
      font-variant-numeric: tabular-nums; color: var(--ansel); min-width: 100px; }
    .big small { font-size: 18px; font-weight: 700; color: var(--quiet); letter-spacing: 0; margin-left: 4px; }
    .big.soon { color: var(--soon); }
    .big.live { color: var(--live); font-size: 44px; }
    .big.ended { color: var(--quiet); font-size: 44px; }
    .big.turned { animation: turn 600ms var(--ease); }
    @keyframes turn { from { color: var(--ansel); } to { color: var(--soon); } }
    h2.title { margin: 0; font-size: 18px; line-height: 1.33; font-weight: 700; }
    .sub { font-size: 13px; line-height: 1.38; color: var(--quiet); }
    .track { grid-column: 1 / -1; height: 6px; margin-top: 12px; border-radius: 3px; background: var(--track); overflow: hidden; }
    .track i { display: block; height: 100%; background: var(--ansel); transition: width 600ms var(--ease); }
    .track.soon i { background: var(--soon); }
    .track.live i { background: var(--live); }
    .track.ended i { background: #BDBDBD; }

    /* Action item rows */
    .rows { display: flex; flex-direction: column; gap: 6px; }
    .rows.others { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--line); }
    .r { display: grid; grid-template-columns: 4px minmax(0, 1fr) auto; column-gap: 12px; row-gap: 8px; align-items: center;
      padding: 10px 12px 10px 0; border-radius: 8px; transition: background-color 240ms var(--ease); }
    .rail { align-self: stretch; border-radius: 2px; background: var(--rail); }
    .r.mine .rail { background: var(--ansel); }
    .r.mine.is-done { background: var(--done-bg); }
    .r.mine.is-done .rail { background: var(--live); }
    .r.is-flagged .t { opacity: .55; }
    .t .task { font-weight: 700; }
    .t .who { font-size: 13px; color: var(--quiet); }
    .t .summary { display: block; margin-top: 1px; font-size: 13px; line-height: 1.38; color: var(--quiet); }
    .acts { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px; }
    .st { font-size: 11px; font-weight: 900; padding: 3px 9px; border-radius: 10px; letter-spacing: .02em; color: var(--on-accent); background: var(--ansel); }
    .ask { grid-column: 2 / -1; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
    .note { font-size: 13px; color: var(--quiet); }
    .context { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; font-size: 13px; line-height: 1.38; color: var(--quiet); }
    .more { margin-top: 8px; }

    /* Footer */
    .bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 14px; }
    .foot { flex-wrap: nowrap; align-items: flex-start; margin-top: 8px; }
    .foot .ico { margin-top: 2px; flex: none; }
    .quote { border-left: 4px solid var(--line); padding: 2px 0 2px 12px; margin-top: 6px; }
    .num { font-variant-numeric: tabular-nums; }

    /* Buttons: one rounded shape everywhere; one green button (Join) */
    .btn { height: 28px; padding: 0 12px; border-radius: 14px; border: 1px solid var(--btn-line);
      background: var(--surface); color: var(--ink); font: 700 13px/1 Lato, "Helvetica Neue", Helvetica, Arial, sans-serif;
      display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; cursor: pointer; font-variant-numeric: tabular-nums;
      transition: background-color 120ms var(--ease), border-color 120ms var(--ease), transform 120ms var(--ease); }
    .btn.primary { background: var(--green); border-color: var(--green); color: var(--on-accent); }
    .btn.join { height: 40px; padding: 0 22px; border-radius: 20px; font-size: 15px; font-weight: 900; }
    .btn.state-done { border-color: var(--live); color: var(--live); }
    .btn:disabled { opacity: .45; cursor: not-allowed; }
    @media (hover: hover) and (pointer: fine) {
      .btn:not(:disabled):hover { background: color-mix(in srgb, var(--surface) 86%, var(--ink)); transform: translateY(-1px);
        transition-duration: 150ms; }
      .btn.primary:not(:disabled):hover { background: color-mix(in srgb, var(--green) 86%, var(--ink)); }
    }
    .btn:not(:disabled):active { transform: translateY(1px) scale(.985); transition-duration: 90ms; }
    .link { border: 0; background: none; padding: 0; font: inherit; color: var(--link); cursor: pointer; }
    .link:hover { text-decoration: underline; }
    :focus-visible { outline: 2px solid var(--link); outline-offset: 2px; border-radius: 4px; }
    .btn:focus-visible { border-radius: 14px; }

    .edited { font-size: 11px; font-weight: 700; color: var(--soon); border: 1px solid currentColor; border-radius: 4px; padding: 0 4px; margin-left: 4px; vertical-align: 1px; }

    /* Embedded mode (<heads-up-card embedded>): shown inside an app such as Ansel rather than as a
       Slack message. No avatar, name, APP tag, time, blue rail or hover band; the host page's font;
       colours come from the --* variables the host sets. The default (no attribute) is unchanged. */
    :host([embedded]) { max-width: none; font-family: inherit; font-size: 15px; line-height: 1.5; }
    :host([embedded]) .msg { display: block; padding: 0; }
    :host([embedded]) .msg:hover { background: none; }
    :host([embedded]) .avatar, :host([embedded]) .meta { display: none; }
    :host([embedded]) .att { border-left: 0; padding: 0; margin: 0; }
    :host([embedded]) .clock { margin-top: 0; }
    :host([embedded]) .big { font-weight: 700; letter-spacing: -.02em; }
    :host([embedded]) h2.title { font-weight: 600; }
    :host([embedded]) .t .task { font-weight: 600; }
    :host([embedded]) .st { font-weight: 700; border-radius: 4px; }
    :host([embedded]) .btn { font-family: inherit; font-weight: 500; border-radius: 6px; }
    :host([embedded]) .btn.join { font-weight: 600; border-radius: 8px; }
    :host([embedded]) .btn:focus-visible { border-radius: 6px; }
    /* Embedded layout: Join left-aligned under the timer; larger type for demos */
    :host([embedded]) { font-size: 16px; }
    :host([embedded]) h2.title { font-size: 19px; }
    :host([embedded]) .sub, :host([embedded]) .t .summary, :host([embedded]) .t .who,
    :host([embedded]) .note, :host([embedded]) .context { font-size: 14px; }
    :host([embedded]) .st, :host([embedded]) .edited { font-size: 12px; }
    :host([embedded]) .btn { height: 32px; font-size: 14px; }
    :host([embedded]) .btn.icon { width: 32px; padding: 0; justify-content: center; }
    :host([embedded]) .clock { grid-template-columns: auto minmax(0, 1fr); row-gap: 12px; }
    :host([embedded]) .clock .join { grid-column: 1 / -1; justify-self: start; justify-content: center; }
    /* Embedded action items: two stacked cards (yours, then the team's); rows touch, split by a
       hairline; buttons on the right with no borders */
    :host([embedded]) .stacks { display: flex; flex-direction: column; gap: 12px; }
    :host([embedded]) .stack { border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
    :host([embedded]) .stack.mine-stack { background: var(--mine-bg, #EEEFFA); border-color: color-mix(in srgb, var(--ansel) 28%, transparent); }
    :host([embedded]) .stack-h { padding: 9px 14px; font-size: 14px; font-weight: 600; color: var(--quiet); border-bottom: 1px solid var(--line); }
    :host([embedded]) .mine-stack .stack-h { color: var(--ansel); border-bottom-color: color-mix(in srgb, var(--ansel) 20%, transparent); }
    :host([embedded]) .stack-h .n { font-weight: 500; font-variant-numeric: tabular-nums; }
    :host([embedded]) .stack .rows { gap: 0; }
    :host([embedded]) .r { grid-template-columns: minmax(0, 1fr) auto; column-gap: 12px; padding: 12px 10px 12px 14px; border-radius: 0; }
    :host([embedded]) .r + .r { border-top: 1px solid var(--line); }
    :host([embedded]) .mine-stack .r + .r { border-top-color: color-mix(in srgb, var(--ansel) 14%, transparent); }
    :host([embedded]) .rail { display: none; }
    :host([embedded]) .acts { grid-column: 2; align-self: start; justify-content: flex-end; flex-wrap: nowrap; gap: 2px; }
    :host([embedded]) .ask { grid-column: 1 / -1; }
    :host([embedded]) .r.mine { background: none; }
    :host([embedded]) .r.mine.is-done { background: var(--done-bg); }
    :host([embedded]) .r .btn { border-color: transparent; background: transparent; color: var(--quiet); }
    :host([embedded]) .r .btn.state-done { color: var(--live); }
    @media (hover: hover) and (pointer: fine) {
      :host([embedded]) .r .btn:not(:disabled):hover { background: color-mix(in srgb, var(--ink) 8%, transparent); color: var(--ink); transform: none; }
    }

    /* Error state */
    .pad { padding: 8px 20px; margin: 0; }
    .quiet { color: var(--quiet); }
    .error { margin: 8px 20px; padding: 12px; border: 2px solid #B00020; border-radius: 8px; color: #B00020; }
    .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

    /* Phones: Join drops under the timer at full width; buttons wrap under each task; 44px targets */
    @media (max-width: 560px) {
      .msg { padding: 8px 12px; }
      .att { padding-left: 10px; }
      .clock { grid-template-columns: auto minmax(0, 1fr); row-gap: 12px; }
      .clock .join { grid-column: 1 / -1; justify-content: center; }
      .track { margin-top: 0; }
      .big { font-size: 44px; min-width: 86px; }
      .big.live, .big.ended { font-size: 34px; }
      .r { grid-template-columns: 4px minmax(0, 1fr); }
      .acts { grid-column: 2; justify-content: flex-start; }
    }
    /* Same layout when the card itself is narrow (embedded in a sidebar or panel), whatever the window width */
    @container (max-width: 560px) {
      .msg { padding: 8px 12px; }
      .att { padding-left: 10px; }
      .clock { grid-template-columns: auto minmax(0, 1fr); row-gap: 12px; }
      .clock .join { grid-column: 1 / -1; justify-content: center; }
      .track { margin-top: 0; }
      .big { font-size: 44px; min-width: 86px; }
      .big.live, .big.ended { font-size: 34px; }
      .r { grid-template-columns: 4px minmax(0, 1fr); }
      .acts { grid-column: 2; justify-content: flex-start; }
    }
    @media (pointer: coarse), (max-width: 560px) {
      .btn { height: 44px; padding: 0 16px; border-radius: 22px; font-size: 15px; }
      .btn.join { height: 48px; border-radius: 24px; }
      .link { min-height: 44px; }
    }
    @media (prefers-reduced-motion: reduce) {
      *, .btn, .track i { transition: none !important; animation: none !important; }
      .btn:hover, .btn:active { transform: none !important; }
    }
  `;

  class HeadsUpCard extends HTMLElement {
    constructor() {
      super();
      this._data = null;
      this._error = null;
      this._offset = 0;          // card clock minus real clock, in ms
      this._timing = null;       // { meetingId, startMs, endMs, postMs }
      this._identity = null;     // viewerId|meetingId the local changes belong to
      this._ui = this._freshUi();
      this._lastState = null;
      this._lifecycleFired = false;
      this._lifecyclePending = false;
      this._focusKey = null;
      this._flashSoon = false;
      this._timer = null;

      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `<style>${STYLES}</style><div part="view"></div><div class="sr" aria-live="polite"></div>`;
      this._view = root.querySelector('[part="view"]');
      this._live = root.querySelector('[aria-live]');

      root.addEventListener('click', (e) => {
        const el = e.target.closest('[data-act]');
        if (!el || el.disabled || el.tagName === 'INPUT') return;
        this._onAct(el.dataset.act, el.dataset);
      });
    }

    connectedCallback() {
      if (!this._timer) this._timer = setInterval(() => this._tick(), 1000);
      this._render();
    }

    disconnectedCallback() {
      clearInterval(this._timer);
      this._timer = null;
    }

    // ---------- public API ----------

    get data() { return this._data; }

    set data(value) {
      const d = value && typeof value === 'object' ? clone(value) : null;
      this._data = d;
      this._error = d ? this._validate(d) : null;

      if (d && !this._error) {
        const major = String(d.contractVersion || '').split('.')[0];
        if (major !== CONTRACT_VERSION.split('.')[0]) {
          console.warn(`[heads-up-card] Data says contract "${d.contractVersion || 'none'}"; this card supports ${CONTRACT_VERSION}.`);
        }
        const identity = `${(d.viewer && d.viewer.id) || ''}|${(d.meeting && d.meeting.meetingId) || ''}|${d.variant || 'card'}`;
        if (identity !== this._identity) {
          this._identity = identity;
          this._ui = this._freshUi();
          this._lifecycleFired = false;
          this._lastState = null;
        }
        this._setupTiming(d);
        this._loadItemsFromData(d);
      }
      this._render();
    }

    get now() { return new Date(this._nowMs()); }

    // Embedded mode shows the first DEFAULT_ROW_LIMIT rows with "Show N more"; setting expanded = true
    // opens the full list (e.g. when a link asks for every action item).
    get expanded() { return !!this._ui.showAll; }
    set expanded(value) { this._ui.showAll = !!value; this._render(); }

    set now(value) {
      if (value == null) {
        this._offset = 0;
      } else {
        const t = value instanceof Date ? value.getTime() : (typeof value === 'number' ? value : Date.parse(value));
        if (Number.isNaN(t)) { console.warn('[heads-up-card] card.now needs a Date, a timestamp, or null.'); return; }
        this._offset = t - Date.now();
      }
      this._tick();
    }

    jumpTo(state) {
      const t = this._timing;
      if (!t) { console.warn('[heads-up-card] Set card.data before calling jumpTo().'); return; }
      const targets = {
        'posted': t.postMs,
        'starting-soon': t.startMs - 4 * MIN,
        'started': t.startMs + MIN,
        'ended': t.endMs + MIN,
      };
      if (!(state in targets)) { console.warn(`[heads-up-card] jumpTo() accepts: ${Object.keys(targets).join(', ')}.`); return; }
      this.now = targets[state];
    }

    reset() {
      this._ui = this._freshUi();
      if (!this._lifecyclePending) this._lifecycleFired = false; // don't announce the same card twice in one step
      this._lastState = null;
      if (this._data && !this._error) this._loadItemsFromData(this._data);
      this._render();
    }

    // ---------- setup ----------

    _freshUi() {
      return {
        done: new Set(),
        flagged: new Map(),     // itemId -> { reason, section, ownerId }
        tapped: false,          // any ▶ tap this card
        muted: false,
        notUseful: null,        // null, or { reason }
        whyOpen: false,
        showAll: false,         // embedded: rows beyond the limit are shown
        seeded: false,
      };
    }

    _validate(d) {
      if (d.variant && d.variant !== 'card') return `variant must be "card", not "${d.variant}".`;
      if (!d.viewer) return 'viewer is missing.';
      if (!d.meeting) return 'meeting is missing.';
      if (!d.meeting.title) return 'meeting.title is missing.';
      if (!d.meeting.meetingId) return 'meeting.meetingId is missing.';
      if (d.meeting.start && Number.isNaN(Date.parse(d.meeting.start))) return 'meeting.start is not a valid ISO time.';
      if (!d.lastMeeting) return 'lastMeeting is missing.';
      const items = (d.actionItems && d.actionItems.items) || [];
      const bad = items.find((it) => !it || !it.id || !it.owner || !it.owner.id);
      if (bad) return 'every actionItems.items entry needs an id and an owner with an id.';
      return null;
    }

    _setupTiming(d) {
      const m = d.meeting;
      const reminder = num(m.reminderMinutes, 30) * MIN;
      const duration = num(m.durationMinutes, 30) * MIN;
      const prev = this._timing && this._timing.meetingId === m.meetingId ? this._timing : null;
      let start;

      if (m.start) {
        start = Date.parse(m.start);
      } else if (prev) {
        start = prev.startMs; // same meeting: keep the clock running
      } else if (m.demoStartTime && /^\d{1,2}:\d{2}$/.test(m.demoStartTime)) {
        const [h, min] = m.demoStartTime.split(':').map(Number);
        const day = new Date();
        day.setHours(h, min, 0, 0);
        start = day.getTime();
        this._offset = (start - reminder) - Date.now(); // card clock opens at the reminder
      } else {
        start = this._nowMs() + reminder;
      }
      this._timing = { meetingId: m.meetingId, startMs: start, endMs: start + duration, postMs: start - reminder };
    }

    _loadItemsFromData(d) {
      if (this._ui.seeded) return;
      this._ui.seeded = true;
      this._allItems(d).forEach(({ item }) => { if (item && item.done && item.owner.id === d.viewer.id) this._ui.done.add(item.id); });
    }

    // Action items in display order: the viewer's own first, then everyone else's in data order.
    _rows(d) {
      const items = ((d.actionItems && d.actionItems.items) || []).slice();
      const me = d.viewer.id;
      return [...items.filter((it) => it.owner.id === me), ...items.filter((it) => it.owner.id !== me)];
    }

    _allItems(d) {
      return this._rows(d).map((item) => ({ section: 'actionItems', item }));
    }

    // ---------- clock ----------

    _nowMs() { return Date.now() + this._offset; }

    _state(now) {
      const t = this._timing;
      if (!t) return null;
      if (now < t.postMs) return 'not-posted';
      if (now >= t.endMs) return 'ended';
      if (now >= t.startMs) return 'started';
      if (t.startMs - now <= SOON_MS) return 'starting-soon';
      return 'posted';
    }

    _statusText(state, now) {
      if (state === 'started') return 'Started';
      if (state === 'ended') return 'Ended · new summary in about 6 min';
      const mins = Math.max(1, Math.ceil((this._timing.startMs - now) / MIN));
      return `Starts in ${mins} min`;
    }

    _tick() {
      const d = this._data;
      if (!d || this._error || !this._timing) return;
      if (d.viewer.inHoldout || d.meeting.isRecurring === false || d.lastMeeting.recorded === false) return;
      const now = this._nowMs();
      const state = this._state(now);
      if (state !== this._lastState) {
        const from = this._lastState;
        if (from === 'posted' && state === 'starting-soon') this._flashSoon = true;
        this._render();
        if (TIMELINE.includes(from) && TIMELINE.includes(state)) {
          this._announce(STATE_ANNOUNCEMENTS[state]);
          this._emit('state_changed', { from, to: state });
        }
        return;
      }
      this._view.querySelectorAll('[data-role="status"]').forEach((el) => {
        const text = this._statusText(state, now);
        if (el.textContent !== text) el.textContent = text;
      });
      this._updateClock(state, now);
    }

    // ---------- rendering ----------

    _render() {
      const active = this.shadowRoot.activeElement;
      const key = this._focusKey || (active && active.dataset ? active.dataset.key : null);
      this._focusKey = null;

      this._view.innerHTML = this._html();
      this._flashSoon = false;

      if (key) {
        const el = this._view.querySelector(`[data-key="${CSS.escape(key)}"]`);
        if (el) el.focus();
      }
      this._fireLifecycle();
    }

    _html() {
      const d = this._data;
      if (!d) return '';
      if (this._error) return `<p class="error" role="alert">Card data problem: ${esc(this._error)} See CONTRACT.md, section 3.</p>`;

      if (d.meeting.isRecurring === false || d.lastMeeting.recorded === false) {
        this._lastState = 'ineligible';
        return ''; // no card: not a recurring series, or last instance not recorded
      }
      if (d.viewer.inHoldout) {
        this._lastState = 'holdout';
        return ''; // holdout: no card (card_suppressed still fires so the app can log it)
      }

      const now = this._nowMs();
      const state = this._state(now);
      this._lastState = state;
      if (state === 'not-posted') return ''; // the Outlook reminder hasn't fired yet
      if (this._ui.muted) return this._mutedHtml(d, state, now);
      return this._cardHtml(d, state, now);
    }

    _message(label, inner) {
      const time = this._timing ? `<time class="time">${esc(fmtClock(this._timing.postMs))}</time>` : '';
      return `<article class="msg" aria-label="${esc(label)}">
        <div class="avatar" aria-hidden="true">A</div>
        <div><div class="meta"><span class="name">Ansel</span><span class="app">APP</span>${time}</div>
        <div class="att">${inner}</div></div></article>`;
    }

    _joinButton(d, state) {
      const platform = d.meeting.platform || 'meeting';
      const label = state === 'started' ? 'Join now' : `Join ${platform}`;
      const off = state === 'ended' || !d.meeting.joinUrl;
      return `<button data-act="join" data-key="join" class="btn primary join" ${off ? 'disabled' : ''}>${esc(label)}</button>`;
    }

    // The timer: minutes left (amber in the last 5), "Live" once started, "Ended" after.
    _clockParts(state, now) {
      const t = this._timing;
      if (state === 'started') return { big: 'Live', cls: 'live', pct: 100 };
      if (state === 'ended') return { big: 'Ended', cls: 'ended', pct: 100 };
      const mins = Math.max(1, Math.ceil((t.startMs - now) / MIN));
      const span = Math.max(1, t.startMs - t.postMs);
      const pct = Math.round(Math.min(100, Math.max(4, ((now - t.postMs) / span) * 100)));
      return { big: `${mins}<small>min</small>`, cls: state === 'starting-soon' ? 'soon' : '', pct };
    }

    _clockHtml(d, state, now) {
      const m = d.meeting;
      const p = this._clockParts(state, now);
      const count = this._rows(d).length + num(d.actionItems && d.actionItems.moreCount, 0);
      const on = m.platform ? ` on ${esc(m.platform)}` : '';
      const when = state === 'started' ? `Started at ${esc(fmtClock(this._timing.startMs))}${on}`
        : state === 'ended' ? 'New summary in about 6 min'
          : `Starts at ${esc(fmtClock(this._timing.startMs))}${on}`;
      const items = count ? ` · ${count} action item${count === 1 ? '' : 's'} from last week` : '';
      const flash = this._flashSoon && state === 'starting-soon' ? ' turned' : '';
      return `<div class="clock">
        <div class="big ${p.cls}${flash}" data-role="big" aria-hidden="true">${p.big}</div>
        <div><h2 class="title">${esc(m.title)}</h2><div class="sub">${when}${items}</div>
          <span class="sr" data-role="status">${esc(this._statusText(state, now))}</span></div>
        ${this._joinButton(d, state)}
        <div class="track ${p.cls}" aria-hidden="true"><i data-role="track" style="width:${p.pct}%"></i></div>
      </div>`;
    }

    _updateClock(state, now) {
      const p = this._clockParts(state, now);
      const big = this._view.querySelector('[data-role="big"]');
      if (big && big.innerHTML !== p.big) big.innerHTML = p.big;
      const bar = this._view.querySelector('[data-role="track"]');
      if (bar) bar.style.width = `${p.pct}%`;
    }

    // ▶ mm:ss, or ▶ Nov 6 · mm:ss when the item carries its meeting's date (items can come from
    // different meetings in the series, e.g. carried over from an earlier one).
    _playButton(item) {
      const date = item.dateLabel ? `${item.dateLabel} · ` : '';
      const spokenDate = item.dateLabel ? ` from ${item.dateLabel}` : '';
      if (this.hasAttribute('embedded')) {
        // Embedded: just a play icon; the date and time show on hover.
        return `<button class="btn icon" data-act="play" data-section="actionItems" data-item="${esc(item.id)}" data-key="play-${esc(item.id)}"
          title="${esc(date)}${esc(fmtStamp(item.seconds))}" aria-label="Play transcript${esc(spokenDate)} at ${esc(spokenStamp(item.seconds))}: ${esc(item.text)}">${ICON.play}</button>`;
      }
      return `<button class="btn" data-act="play" data-section="actionItems" data-item="${esc(item.id)}" data-key="play-${esc(item.id)}"
        aria-label="Play transcript${esc(spokenDate)} at ${esc(spokenStamp(item.seconds))}: ${esc(item.text)}">▶ ${esc(date)}${esc(fmtStamp(item.seconds))}</button>`;
    }

    // One action item. Status (YOURS, Mark done / ✓ Done, the green row) shows only on the viewer's own items.
    _rowHtml(it, mine) {
      const ui = this._ui;
      const id = esc(it.id);
      const done = mine && ui.done.has(it.id);
      const flag = ui.flagged.get(it.id);

      const emb = this.hasAttribute('embedded');
      // Embedded: your rows name you like everyone else's ("· Varun (you)"); the tint marks them, so no YOURS tag.
      const who = !mine ? ` <span class="who">· ${esc(it.owner.name)}</span>`
        : emb ? ` <span class="who">· ${esc(it.owner.name)} (you)</span>` : '';
      const summary = it.summary ? `<span class="summary">${esc(it.summary)}</span>` : '';

      const acts = [];
      if (mine && !emb) acts.push('<span class="st" aria-label="Your item">YOURS</span>');
      // Embedded: ▶ goes last (rightmost) so it lines up down every row; elsewhere it leads.
      if (!emb) acts.push(this._playButton(it));
      if (mine && !flag && emb) {
        // Embedded: icon buttons with hover labels.
        acts.push(done
          ? `<button class="btn icon state-done" data-act="done-undo" data-item="${id}" data-key="done-undo-${id}" aria-pressed="true"
              title="Done · tap to undo" aria-label="Done: ${esc(it.text)}. Tap to undo">${ICON.done}</button>`
          : `<button class="btn icon" data-act="done" data-item="${id}" data-key="done-${id}" aria-pressed="false"
              title="Mark done" aria-label="Mark done: ${esc(it.text)}">${ICON.check}</button>`);
      } else if (mine && !flag) {
        acts.push(done
          ? `<button class="btn state-done" data-act="done-undo" data-item="${id}" data-key="done-undo-${id}" aria-pressed="true"
              aria-label="Done: ${esc(it.text)}. Tap to undo">✓ Done</button>`
          : `<button class="btn" data-act="done" data-item="${id}" data-key="done-${id}" aria-pressed="false"
              aria-label="Mark done: ${esc(it.text)}">Mark done</button>`);
      }
      // Edit (contract 2.2): shown when the app marks the item editable (e.g. its owner or the
      // organizer). On your own editable items it replaces Not right: you fix it instead of flagging it.
      if (it.editable && !flag) {
        acts.push(emb
          ? `<button class="btn icon" data-act="edit" data-item="${id}" data-key="edit-${id}" title="Edit" aria-label="Edit: ${esc(it.text)}">${ICON.edit}</button>`
          : `<button class="btn" data-act="edit" data-item="${id}" data-key="edit-${id}" aria-label="Edit: ${esc(it.text)}">Edit</button>`);
      }
      // Embedded: no Not right on other people's items (your own have Edit; Not useful covers the card).
      if (!done && !(mine && it.editable) && !(emb && !mine)) {
        if (flag) {
          const why = flag.reason ? (FLAG_REASONS.find(([r]) => r === flag.reason) || [null, flag.reason])[1].toLowerCase() : null;
          acts.push(`<button class="btn" data-act="flag-undo" data-item="${id}" data-key="flag-undo-${id}" aria-pressed="true"
            aria-label="Flagged${why ? ` as ${esc(why)}` : ''}: ${esc(it.text)}. Tap to undo">Flagged</button>`);
        } else {
          acts.push(`<button class="btn" data-act="flag" data-section="actionItems" data-item="${id}" data-owner="${esc(it.owner.id)}"
            data-key="flag-${id}" aria-pressed="false" aria-label="Not right: ${esc(it.text)}">Not right</button>`);
        }
      }

      if (emb) acts.push(this._playButton(it));

      const ask = flag && !flag.reason ? `
        <div class="ask" role="group" aria-label="What's wrong with ${esc(it.text)}?">
          <span class="note">What's wrong?</span>
          ${FLAG_REASONS.map(([r, label]) => `<button class="btn" data-act="flag-reason" data-item="${id}" data-reason="${r}" data-key="reason-${id}-${r}">${label}</button>`).join('')}
        </div>` : '';

      const cls = ['r', mine ? 'mine' : '', done ? 'is-done' : '', flag ? 'is-flagged' : ''].join(' ').replace(/\s+/g, ' ').trim();
      return `<div class="${cls}" role="listitem"><span class="rail" aria-hidden="true"></span>
        <div class="t"><span class="task">${esc(it.text)}</span>${it.edited ? ` <span class="edited" title="${esc(it.edited)}">Edited</span>` : ''}${who}${summary}</div>
        <div class="acts">${acts.join('')}</div>${ask}</div>`;
    }

    _rowsHtml(d) {
      const me = d.viewer.id;
      const rows = this._rows(d);
      const mine = rows.filter((it) => it.owner.id === me);
      const others = rows.filter((it) => it.owner.id !== me);
      const more = num(d.actionItems && d.actionItems.moreCount, 0);
      const moreLine = more > 0
        ? `<div class="context more"><button class="link" data-act="more" data-section="actionItems" data-key="more-actionItems"
            aria-label="${more} more action items in Ansel">+${more} more in Ansel</button></div>`
        : '';
      if (!rows.length) return `<div class="context">No action items from last week.</div>${moreLine}`;
      // Embedded (inside an app that has every item): expand in place instead of linking out.
      let shownMine = mine, shownOthers = others, toggle = '';
      if (this.hasAttribute('embedded') && rows.length > DEFAULT_ROW_LIMIT) {
        const hidden = rows.length - DEFAULT_ROW_LIMIT;
        if (!this._ui.showAll) {
          shownMine = mine.slice(0, DEFAULT_ROW_LIMIT);
          shownOthers = others.slice(0, Math.max(0, DEFAULT_ROW_LIMIT - shownMine.length));
        }
        toggle = `<div class="context more"><button class="link" data-act="more-toggle" data-key="more-toggle" aria-expanded="${this._ui.showAll}">${
          this._ui.showAll ? 'Show fewer' : `Show ${hidden} more`}</button></div>`;
      }
      if (this.hasAttribute('embedded')) {
        // Embedded: two stacked cards, yours first, each with a heading and count.
        const stack = (items, isMine, title, total) => (items.length
          ? `<section class="stack${isMine ? ' mine-stack' : ''}" aria-label="${title}"><div class="stack-h">${title} <span class="n">· ${total}</span></div>
              <div class="rows" role="list">${items.map((it) => this._rowHtml(it, isMine)).join('')}</div></section>` : '');
        return `<div class="stacks">${stack(shownMine, true, 'Your action items', mine.length)}${stack(shownOthers, false, 'Team', others.length)}</div>`
          + toggle + moreLine;
      }
      const list = (items, isMine, extra, label) => (items.length
        ? `<div class="rows${extra}" role="list" aria-label="${label}">${items.map((it) => this._rowHtml(it, isMine)).join('')}</div>` : '');
      return list(shownMine, true, '', 'Your action items')
        + list(shownOthers, false, shownMine.length ? ' others' : '', "Everyone else's action items")
        + toggle + moreLine;
    }

    _cardHtml(d, state, now) {
      const m = d.meeting;
      const ui = this._ui;
      const inner = `
        ${this._clockHtml(d, state, now)}
        ${this._rowsHtml(d)}
        ${ui.notUseful ? this._notUsefulHtml() : ''}
        <div class="bar">
          <button data-act="open-last" data-key="open-last" class="btn">Open last meeting</button>
          <button data-act="mute" data-key="mute" class="btn">Mute series</button>
          ${ui.notUseful ? '' : '<button data-act="not-useful" data-key="not-useful" class="btn">Not useful</button>'}
        </div>
        <div class="context foot">${LOCK}<span>Only you can see this. Built from ${esc(d.lastMeeting.label || "last week's recording")},
          which everyone on the invite can open, with no new AI processing.</span></div>
        <div class="context" style="margin-top:4px">
          <button class="link" data-act="why" data-key="why" aria-expanded="${ui.whyOpen}" aria-controls="why-panel">Why am I seeing this?</button>
        </div>
        <div class="quote" id="why-panel" ${ui.whyOpen ? '' : 'hidden'}>
          You're on the invite for ${esc(m.title)}. These items come from last week's Ansel recording,
          which invitees can already open. Only you see this card. Nothing new is shared.
          No new AI processing. Actions are audit-logged.
        </div>`;
      return this._message(`Heads-Up for ${m.title}`, inner);
    }

    _mutedHtml(d, state, now) {
      const inner = `
        <div class="clock" style="margin-bottom:0">
          <div><h2 class="title">Muted ${esc(d.meeting.title)}</h2>
            <div class="sub">You won't get Heads-Up for this series. <span data-role="status">${esc(this._statusText(state, now))}</span></div></div>
          <span></span>
          <div class="bar" style="margin-top:0">${this._joinButton(d, state)}<button data-act="mute-undo" data-key="mute-undo" class="btn">Undo</button></div>
        </div>`;
      return this._message(`Heads-Up for ${d.meeting.title}, muted`, inner);
    }

    _notUsefulHtml() {
      const reason = this._ui.notUseful.reason;
      const inner = reason
        ? '<span class="note">Thanks for the feedback.</span>'
        : `<span class="note">Thanks. What was off?</span>
           ${NOT_USEFUL_REASONS.map(([r, label]) => `<button class="btn" data-act="nu-reason" data-reason="${r}" data-key="nu-${r}">${label}</button>`).join('')}`;
      return `<div class="bar strip" role="group" aria-label="Feedback">${inner}<button class="btn" data-act="nu-undo" data-key="nu-undo">Undo</button></div>`;
    }

    // ---------- actions ----------

    _findItem(id) {
      return this._allItems(this._data).find((x) => x.item.id === id) || null;
    }

    _onAct(act, ds) {
      const d = this._data;
      if (!d || this._error) return;
      const ui = this._ui;
      const m = d.meeting || {};
      const last = d.lastMeeting || {};

      switch (act) {
        case 'play': {
          const found = this._findItem(ds.item);
          if (!found) return;
          ui.tapped = true;
          this._emit('timestamp_tap',
            { itemId: found.item.id, section: ds.section, seconds: found.item.seconds, meetingId: found.item.meetingId || last.meetingId },
            withParam(last.transcriptUrl, 't', found.item.seconds), { valueAction: true });
          break;
        }
        case 'done': {
          const found = this._findItem(ds.item);
          if (!found || !found.item.owner || found.item.owner.id !== d.viewer.id) return; // only the owner marks done
          ui.done.add(ds.item);
          this._rerender(`done-undo-${ds.item}`, `Done: ${found.item.text}`);
          this._emit('mark_done', { itemId: ds.item }, null, { valueAction: true });
          break;
        }
        case 'done-undo':
          ui.done.delete(ds.item);
          this._rerender(`done-${ds.item}`, 'Mark done undone.');
          this._emit('mark_done_undone', { itemId: ds.item });
          break;
        case 'edit': {
          const found = this._findItem(ds.item);
          if (!found || !found.item.editable) return;
          this._emit('edit_tap', { itemId: ds.item, section: 'actionItems', meetingId: found.item.meetingId || last.meetingId });
          break;
        }
        case 'flag':
          ui.flagged.set(ds.item, { reason: null, section: ds.section, ownerId: ds.owner || null });
          this._rerender(`reason-${ds.item}-wrong_owner`, "Flagged. What's wrong? Choose a reason, or skip.");
          this._emit('item_flagged', { itemId: ds.item, section: ds.section, ownerId: ds.owner || null });
          break;
        case 'flag-reason': {
          const f = ui.flagged.get(ds.item);
          if (!f) return;
          f.reason = ds.reason;
          this._rerender(`flag-undo-${ds.item}`, 'Thanks. Reason saved.');
          this._emit('item_flag_reason', { itemId: ds.item, reason: ds.reason });
          break;
        }
        case 'flag-undo':
          ui.flagged.delete(ds.item);
          this._rerender(`flag-${ds.item}`, 'Flag removed.');
          this._emit('item_flag_undone', { itemId: ds.item });
          break;
        case 'more-toggle':
          ui.showAll = !ui.showAll;
          this._rerender('more-toggle', ui.showAll ? 'Showing every action item.' : 'Showing fewer action items.');
          this._emit('more_toggled', { section: 'actionItems', expanded: ui.showAll });
          break;
        case 'more': {
          const sec = d.actionItems || {};
          this._emit('more_tap', { section: ds.section, moreCount: num(sec.moreCount, 0) },
            withParam(last.url, 'section', ds.section));
          break;
        }
        case 'join':
          this._emit('join_tap', { platform: m.platform || null, joinedPrepared: ui.tapped || ui.done.size > 0 },
            m.joinUrl || null, { newTab: true });
          break;
        case 'open-last':
          this._emit('open_last_meeting', { meetingId: last.meetingId }, last.url || null);
          break;
        case 'mute':
          ui.muted = true;
          this._rerender('mute-undo', `Muted ${m.title}. Join is still available.`);
          this._emit('mute_series', { seriesId: m.seriesId });
          break;
        case 'mute-undo':
          ui.muted = false;
          this._rerender('mute', 'Unmuted.');
          this._emit('mute_undone', { seriesId: m.seriesId });
          break;
        case 'not-useful':
          ui.notUseful = { reason: null };
          this._rerender('nu-already_knew', 'Thanks. What was off? Choose a reason, or skip.');
          this._emit('not_useful', {});
          break;
        case 'nu-reason':
          if (!ui.notUseful) return;
          ui.notUseful.reason = ds.reason;
          this._rerender('nu-undo', 'Thanks for the feedback.');
          this._emit('not_useful_reason', { reason: ds.reason });
          break;
        case 'nu-undo':
          ui.notUseful = null;
          this._rerender('not-useful', 'Feedback removed.');
          this._emit('not_useful_undone', {});
          break;
        case 'why':
          ui.whyOpen = !ui.whyOpen;
          this._rerender('why');
          if (ui.whyOpen) this._emit('why_opened', {});
          break;
        default:
          break;
      }
    }

    _rerender(focusKey, announcement) {
      this._focusKey = focusKey || null;
      this._render();
      if (announcement) this._announce(announcement);
    }

    _announce(text) {
      this._live.textContent = '';
      requestAnimationFrame(() => { this._live.textContent = text; });
    }

    // ---------- events ----------

    _fireLifecycle() {
      if (this._lifecycleFired) return;
      const d = this._data;
      if (!d || this._error) return;
      const state = this._lastState;
      let action = null;
      let payload = {};
      if (state === 'holdout') { action = 'card_suppressed'; payload = { reason: 'holdout' }; }
      else if (TIMELINE.includes(state)) { action = 'card_shown'; payload = { state }; }
      if (!action) return;
      this._lifecycleFired = true;
      this._lifecyclePending = true;
      queueMicrotask(() => { this._lifecyclePending = false; this._emit(action, payload); });
    }

    _emit(action, payload, href, { valueAction = false, newTab = false } = {}) {
      const d = this._data || {};
      const m = d.meeting || {};
      const viewer = d.viewer || {};
      const detail = {
        action,
        contractVersion: CONTRACT_VERSION,
        at: new Date(this._nowMs()).toISOString(),
        viewerId: viewer.id || null,
        seriesId: m.seriesId || null,
        meetingId: m.meetingId || null,
        inHoldout: !!viewer.inHoldout,
        valueAction,
        payload: payload || {},
        href: href || null,
      };
      const event = new CustomEvent('headsup:action', { detail, bubbles: true, composed: true, cancelable: true });
      const proceed = this.dispatchEvent(event);
      if (proceed && href) {
        if (newTab) window.open(href, '_blank', 'noopener');
        else window.location.assign(href);
      }
      return event;
    }
  }

  if (!customElements.get('heads-up-card')) customElements.define('heads-up-card', HeadsUpCard);
})();
