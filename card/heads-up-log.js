/*
 * Heads-Up event log · contract 2.0
 * <heads-up-log for="card-id"> shows every event one card fires.
 * <heads-up-log> with no "for" shows events from every card on the page.
 *
 * For each event it shows the card's time, the action, its details, a ★ for value actions,
 * and whether the app took over the tap or the card followed its backup link.
 */
(function () {
  'use strict';

  const STYLES = `
    :host { display: block; font: 13px/1.4 system-ui, sans-serif; color: #1d1c1d; }
    :host([hidden]) { display: none; }
    .top { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 6px; }
    button { font: inherit; padding: 2px 8px; border: 1px solid #999; border-radius: 4px; background: #fff; cursor: pointer; }
    :focus-visible { outline: 3px solid #e8912d; outline-offset: 2px; }
    ol { list-style: none; margin: 0; padding: 0; border: 1px solid #bbb; border-radius: 6px; max-height: 480px; overflow: auto; }
    li { padding: 6px 8px; border-bottom: 1px solid #eee; }
    li:last-child { border-bottom: 0; }
    .value { background: #fff7d6; }
    .time { color: #616061; margin-right: 6px; }
    .action { font-weight: 600; }
    .details, .route { color: #616061; }
    .empty { padding: 8px; color: #616061; }
  `;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function summarize(payload) {
    return Object.entries(payload || {})
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join(', ');
  }

  class HeadsUpLog extends HTMLElement {
    constructor() {
      super();
      this._entries = [];
      this._target = null;
      this._onEvent = this._onEvent.bind(this);
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `<style>${STYLES}</style>
        <div class="top"><span data-role="stats"></span><button type="button" data-role="clear">Clear log</button></div>
        <ol aria-label="Heads-Up events" data-role="list"></ol>`;
      root.querySelector('[data-role="clear"]').addEventListener('click', () => this.clear());
      this._list = root.querySelector('[data-role="list"]');
      this._stats = root.querySelector('[data-role="stats"]');
    }

    connectedCallback() {
      this._attach();
      if (!this._target && document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this._attach(), { once: true });
      }
      this._paint();
    }

    disconnectedCallback() {
      if (this._target) this._target.removeEventListener('headsup:action', this._onEvent);
      this._target = null;
    }

    // Attach to a specific card element, or call with no argument to follow the "for" attribute.
    attach(element) {
      if (this._target) this._target.removeEventListener('headsup:action', this._onEvent);
      this._target = element || null;
      if (this._target) this._target.addEventListener('headsup:action', this._onEvent);
    }

    clear() {
      this._entries = [];
      this._paint();
    }

    get entries() { return this._entries.slice(); }

    _attach() {
      if (this._target) return;
      const id = this.getAttribute('for');
      const target = id ? document.getElementById(id) : document;
      if (target) this.attach(target);
    }

    _onEvent(event) {
      const d = event.detail || {};
      const entry = { ...d, route: '…' };
      this._entries.unshift(entry);
      // Read defaultPrevented after every listener has run.
      setTimeout(() => {
        if (event.defaultPrevented) entry.route = 'handled by the app';
        else if (d.href) entry.route = `followed backup link: ${d.href}`;
        else entry.route = 'no link needed';
        this._paint();
      }, 0);
      this._paint();
    }

    _paint() {
      const all = this._entries;
      const value = all.filter((e) => e.valueAction).length;
      const prepared = all.filter((e) => e.action === 'join_tap' && e.payload && e.payload.joinedPrepared).length;
      const joins = all.filter((e) => e.action === 'join_tap').length;
      const holdout = all.length ? (all[0].inHoldout ? 'yes' : 'no') : '—';
      this._stats.textContent = `Events: ${all.length} · ★ Value actions: ${value} · Prepared joins: ${prepared} of ${joins} · Holdout: ${holdout}`;

      if (!all.length) {
        this._list.innerHTML = '<li class="empty">No events yet. Tap anything on the card.</li>';
        return;
      }
      this._list.innerHTML = all.map((e) => {
        const time = e.at ? new Date(e.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' }) : '';
        const star = e.valueAction ? '★ ' : '';
        const prep = e.action === 'join_tap' ? (e.payload.joinedPrepared ? ' · joined prepared' : ' · joined without preparing') : '';
        return `<li class="${e.valueAction ? 'value' : ''}">
          <span class="time">${esc(time)}</span><span class="action">${star}${esc(e.action)}</span>${esc(prep)}
          <div class="details">${esc(summarize(e.payload)) || '—'} · viewer: ${esc(e.viewerId)}</div>
          <div class="route">${esc(e.route)}</div>
        </li>`;
      }).join('');
    }
  }

  if (!customElements.get('heads-up-log')) customElements.define('heads-up-log', HeadsUpLog);
})();
