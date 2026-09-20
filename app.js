/*
 * DataDonate demo — application core
 *
 * State, hash router, event delegation, dialogs, toasts and the animation
 * sequencer. The three view files register themselves in App.views.
 */
window.App = (function () {
  'use strict';
  const E = window.DemoEngine;
  const D = window.DEMO_DATA;

  /* ------------------------------------------------------------------ */
  /* State                                                               */
  /* ------------------------------------------------------------------ */

  const TODAY = '2026-09-19';

  function initialState() {
    const project = D.PROJECTS[0];
    return {
      today: TODAY,
      route: { view: 'overview', sub: null },
      motion: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      catalog: { suspended: {} },
      project,
      releases: D.RELEASES.map((r) => Object.assign({}, r)),
      activeReleaseId: project.activeReleaseId,
      round: D.ROUNDS.find((r) => r.status === 'active'),
      hashes: { ready: false, releases: {} },
      overview: { ceilingSource: 'tiktok' },
      participant: {
        id: 'P-0417',
        status: 'active',
        step: 'join',
        consent: { scrolled: false, answers: {}, signature: '', agreed: false, recordedAt: null, receiptCode: null, releaseId: null, version: null },
        selectedSources: [],
        activeSource: null,
        guideOnly: false,
        work: null,
        processing: null,
        donations: [],
        ui: { browse: {}, previewPage: 0, previewQuery: '', previewCategory: '', confirmed: false, donating: null, donateError: null },
        withdrawal: null,
      },
      server: { scenario: 'normal', stepIndex: -1, playing: false, timer: null, donation: null, fallback: null, log: [], status: null, checks: {}, finished: false },
      admin: {
        screen: 'overview',
        navOpen: false,
        user: D.ADMINS[0],
        stepUpUntil: 0,
        donations: D.DONATIONS.map((d) => Object.assign({}, d)),
        participants: D.PARTICIPANTS.map((p) => Object.assign({}, p)),
        withdrawals: D.WITHDRAWALS.map((w) => Object.assign({}, w, { deletionJob: Object.assign({}, w.deletionJob) })),
        audit: D.AUDIT_EVENTS.map((a) => Object.assign({}, a)),
        filters: { status: 'all', platform: 'all' },
        release: { draftChanges: [], reconsentAck: false, consentVersionDraft: null },
      },
    };
  }

  const S = initialState();

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function icon(name, extra) {
    return '<svg class="ico ' + (extra || '') + '" aria-hidden="true"><use href="#icon-' + name + '"></use></svg>';
  }

  const TONES = {
    positive: ['active', 'accepted', 'completed', 'ready', 'healthy', 'published', 'reviewed', 'approved', 'donation ready', 'donation_ready', 'enabled', 'complete', 'listed', 'operational', 'consented'],
    warning: ['invited', 'received', 'processing', 'pending', 'pending_approval', 'queued', 'preparing', 'unreviewed', 'follow_up', 'draft', 'review_required', 'awaiting_upload', 'uploaded', 'partial', 'paused', 'guide_only', 'instructions_only', 'superseded', 'unlisted', 're-consent required', 'reconsent_required', 'closed'],
    danger: ['failed', 'disabled', 'suspended', 'globally_suspended', 'withdrawn', 'deleted', 'unavailable', 'expired', 'blocked', 'rejected'],
  };

  function tone(value) {
    const v = String(value || '').toLowerCase().replace(/\s+/g, '_');
    if (TONES.positive.includes(v)) return 'positive';
    if (TONES.warning.includes(v)) return 'warning';
    if (TONES.danger.includes(v)) return 'danger';
    return 'neutral';
  }

  function badge(value, extra) {
    const t = tone(value);
    const label = String(value || '').replace(/_/g, ' ');
    return '<span class="admin-status' + (t === 'neutral' ? '' : ' admin-status-' + t) + ' ' + (extra || '') + '">' + esc(label) + '</span>';
  }

  function activeRelease() {
    return S.releases.find((r) => r.id === S.activeReleaseId);
  }

  function releasePolicyFor(sourceId, releaseId) {
    const release = releaseId ? S.releases.find((r) => r.id === releaseId) : activeRelease();
    return release ? release.sourcePolicies.find((p) => p.sourceId === sourceId) || null : null;
  }

  function sourceSuspended(sourceId) {
    return Boolean(S.catalog.suspended[sourceId]);
  }

  function donationSources() {
    const release = activeRelease();
    return D.SOURCES.filter((s) => {
      const policy = release.sourcePolicies.find((p) => p.sourceId === s.id);
      return policy && policy.mode === 'donation' && s.enabled;
    });
  }

  function requiredSourceIds() {
    const release = activeRelease();
    const projectRequired = release.sourcePolicies.filter((p) => p.mode === 'donation' && p.required).map((p) => p.sourceId);
    const roundRequired = S.round.requiredSourceIds.filter((id) => {
      const policy = release.sourcePolicies.find((p) => p.sourceId === id);
      return policy && policy.mode === 'donation';
    });
    return Array.from(new Set(projectRequired.concat(roundRequired)));
  }

  function sourceName(id) {
    const s = D.sourceById(id);
    return s ? s.displayName : id;
  }

  function addAudit(event) {
    S.admin.audit.unshift(Object.assign({ at: new Date().toISOString(), actor: 'system' }, event, { isNew: true }));
  }

  function nowIso() {
    return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  }

  function addBusinessDays(startIso, count) {
    const d = new Date(startIso);
    let added = 0;
    while (added < count) {
      d.setUTCDate(d.getUTCDate() + 1);
      const day = d.getUTCDay();
      if (day !== 0 && day !== 6) added += 1;
    }
    return d.toISOString();
  }

  function money(cents, currency) {
    return currency + ' ' + (cents / 100).toFixed(2);
  }

  /* ------------------------------------------------------------------ */
  /* Release integrity hashes (computed with the real engine at boot)    */
  /* ------------------------------------------------------------------ */

  async function computeReleaseHashes(release) {
    const sourcePolicy = {};
    for (const policy of release.sourcePolicies) {
      sourcePolicy[policy.sourceId] = await E.sha256HexOfString(E.canonicalJson(policy));
    }
    const materialHash = await E.sha256HexOfString(
      E.canonicalJson({ material: release.material, sourcePolicies: release.sourcePolicies }),
    );
    const releaseHash = await E.sha256HexOfString(
      E.canonicalJson({ id: release.id, version: release.version, publishedAt: release.publishedAt, material: release.material, sourcePolicies: release.sourcePolicies, changes: release.changes }),
    );
    S.hashes.releases[release.id] = { materialHash, releaseHash, sourcePolicy };
    return S.hashes.releases[release.id];
  }

  function hashesFor(releaseId) {
    return S.hashes.releases[releaseId] || { materialHash: '', releaseHash: '', sourcePolicy: {} };
  }

  /* ------------------------------------------------------------------ */
  /* Router                                                              */
  /* ------------------------------------------------------------------ */

  const VIEWS = ['overview', 'participant', 'server', 'admin', 'architecture'];
  const TITLES = { overview: 'Overview', participant: 'Participant', server: 'After donating', admin: 'Research team', architecture: 'Where data goes' };

  function parseHash() {
    const raw = (location.hash || '#overview').replace(/^#/, '');
    const parts = raw.split('/');
    const view = VIEWS.includes(parts[0]) ? parts[0] : 'overview';
    const sub = parts.length > 1 ? parts.slice(1).join('/') : null;
    return { view, sub };
  }

  function navigate(hash, opts) {
    opts = opts || {};
    const target = hash.startsWith('#') ? hash : '#' + hash;
    if (location.hash === target) {
      render();
      return;
    }
    if (opts.replace) {
      history.replaceState(null, '', target);
      onRoute({ focus: opts.focus !== false });
    } else {
      location.hash = target;
    }
  }

  function syncHash(view, sub) {
    const target = '#' + view + (sub ? '/' + sub : '');
    if (location.hash !== target) history.replaceState(null, '', target);
  }

  let firstRoute = true;

  function onRoute(opts) {
    opts = opts || {};
    const previous = S.route.view;
    S.route = parseHash();
    for (const name of VIEWS) {
      const section = document.getElementById('view-' + name);
      section.hidden = name !== S.route.view;
    }
    document.querySelectorAll('.tour-link').forEach((link) => {
      if (link.dataset.view === S.route.view) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    document.title = 'DataDonate demo · ' + TITLES[S.route.view];
    render();
    if (!firstRoute && (previous !== S.route.view || opts.focus)) {
      const heading = document.querySelector('#view-' + S.route.view + ' h1');
      if (heading && opts.focus !== false) {
        heading.focus({ preventScroll: false });
        if (previous !== S.route.view) window.scrollTo({ top: 0, behavior: S.motion ? 'smooth' : 'auto' });
      }
    }
    firstRoute = false;
  }

  /* ------------------------------------------------------------------ */
  /* Rendering                                                           */
  /* ------------------------------------------------------------------ */

  const views = {};

  function render() {
    const view = views[S.route.view];
    if (view && typeof view.render === 'function') view.render(S.route.sub);
  }

  /** Re-render another view's dynamic content if it is the one on screen. */
  function refresh(name) {
    if (S.route.view === name && views[name]) views[name].render(S.route.sub);
  }

  /* ------------------------------------------------------------------ */
  /* Events                                                              */
  /* ------------------------------------------------------------------ */

  const actions = {};
  const changes = {};
  const inputs = {};

  document.addEventListener('click', (event) => {
    const el = event.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const fn = actions[el.dataset.action];
    if (!fn) return;
    if (el.tagName === 'A') event.preventDefault();
    fn(el, event);
  });

  document.addEventListener('change', (event) => {
    const el = event.target.closest('[data-change]');
    if (!el) return;
    const fn = changes[el.dataset.change];
    if (fn) fn(el, event);
  });

  document.addEventListener('input', (event) => {
    const el = event.target.closest('[data-input]');
    if (!el) return;
    const fn = inputs[el.dataset.input];
    if (fn) fn(el, event);
  });

  document.addEventListener('mouseover', (event) => {
    const chip = event.target.closest('[data-chip]');
    if (!chip) return;
    document.querySelectorAll('[data-chip="' + chip.dataset.chip + '"]').forEach((c) => c.classList.add('is-hot'));
  });
  document.addEventListener('mouseout', (event) => {
    const chip = event.target.closest('[data-chip]');
    if (!chip) return;
    document.querySelectorAll('[data-chip="' + chip.dataset.chip + '"]').forEach((c) => c.classList.remove('is-hot'));
  });
  document.addEventListener('focusin', (event) => {
    const chip = event.target.closest('[data-chip]');
    if (!chip) return;
    document.querySelectorAll('[data-chip="' + chip.dataset.chip + '"]').forEach((c) => c.classList.add('is-hot'));
  });
  document.addEventListener('focusout', (event) => {
    const chip = event.target.closest('[data-chip]');
    if (!chip) return;
    document.querySelectorAll('[data-chip="' + chip.dataset.chip + '"]').forEach((c) => c.classList.remove('is-hot'));
  });

  actions['nav'] = (el) => navigate(el.dataset.to);
  actions['reset-demo'] = () => {
    history.replaceState(null, '', '#overview');
    location.reload();
  };

  /* ------------------------------------------------------------------ */
  /* Dialog                                                              */
  /* ------------------------------------------------------------------ */

  function dialog(options) {
    const dlg = document.getElementById('dlg');
    const title = document.getElementById('dlg-title');
    const body = document.getElementById('dlg-body');
    const actionsEl = document.getElementById('dlg-actions');
    const form = document.getElementById('dlg-form');
    const opener = document.activeElement;
    title.textContent = options.title || '';
    let html = options.body || '';
    (options.fields || []).forEach((field, index) => {
      const id = 'dlg-field-' + index;
      html += '<div class="dialog-field">';
      if (field.type === 'checkbox') {
        html += '<label class="check-row"><input type="checkbox" name="' + esc(field.name) + '" ' + (field.checked ? 'checked' : '') + ' /><span class="check-text">' + esc(field.label) + '</span></label>';
      } else {
        html += '<label class="field-label" for="' + id + '">' + esc(field.label) + '</label>';
        if (field.type === 'textarea') {
          html += '<textarea class="text-input" id="' + id + '" name="' + esc(field.name) + '" rows="3" placeholder="' + esc(field.placeholder || '') + '" ' + (field.required ? 'required' : '') + '></textarea>';
        } else {
          html += '<input class="text-input input-sm" id="' + id + '" type="' + esc(field.type || 'text') + '" name="' + esc(field.name) + '" placeholder="' + esc(field.placeholder || '') + '" value="' + esc(field.value || '') + '" ' + (field.required ? 'required' : '') + ' autocomplete="off" />';
        }
        if (field.hint) html += '<div class="xs muted">' + esc(field.hint) + '</div>';
      }
      html += '</div>';
    });
    body.innerHTML = html;
    actionsEl.innerHTML =
      '<button type="button" class="btn btn-secondary" value="cancel" data-dlg="cancel">' + esc(options.cancelLabel || 'Cancel') + '</button>' +
      '<button type="submit" class="btn ' + (options.danger ? 'btn-danger' : 'btn-primary') + '" data-dlg="confirm">' + esc(options.confirmLabel || 'Confirm') + '</button>';
    return new Promise((resolve) => {
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        const values = {};
        new FormData(form).forEach((v, k) => {
          values[k] = v;
        });
        form.querySelectorAll('input[type=checkbox]').forEach((cb) => {
          values[cb.name] = cb.checked;
        });
        dlg.removeEventListener('close', onClose);
        form.removeEventListener('submit', onSubmit);
        cancelBtn.removeEventListener('click', onCancel);
        if (dlg.open) dlg.close();
        if (opener && typeof opener.focus === 'function' && document.contains(opener)) opener.focus();
        // The dialog's own `close` event is dispatched asynchronously. Resolve
        // after it has fired so a dialog opened next is not closed by it.
        setTimeout(() => resolve({ ok, values }), 0);
      };
      const onClose = () => {
        if (dlg.open) return; // stale event from a previous dialog
        finish(false);
      };
      const onSubmit = (event) => {
        event.preventDefault();
        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }
        finish(true);
      };
      const onCancel = () => finish(false);
      const cancelBtn = actionsEl.querySelector('[data-dlg=cancel]');
      form.addEventListener('submit', onSubmit);
      cancelBtn.addEventListener('click', onCancel);
      dlg.addEventListener('close', onClose);
      dlg.showModal();
      const firstField = body.querySelector('input, textarea');
      if (firstField) firstField.focus();
      else actionsEl.querySelector('[data-dlg=confirm]').focus();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Toast                                                               */
  /* ------------------------------------------------------------------ */

  let toastTimer = null;
  let toastHandler = null;

  function toast(text, options) {
    options = options || {};
    const el = document.getElementById('toast');
    const textEl = document.getElementById('toast-text');
    const actionEl = document.getElementById('toast-action');
    textEl.textContent = text;
    if (toastHandler) actionEl.removeEventListener('click', toastHandler);
    if (options.actionLabel) {
      actionEl.hidden = false;
      actionEl.textContent = options.actionLabel;
      toastHandler = () => {
        hideToast();
        options.onAction();
      };
      actionEl.addEventListener('click', toastHandler);
    } else {
      actionEl.hidden = true;
      toastHandler = null;
    }
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, options.duration || 6000);
  }

  function hideToast() {
    document.getElementById('toast').classList.remove('is-visible');
  }

  /* ------------------------------------------------------------------ */
  /* Animation                                                           */
  /* ------------------------------------------------------------------ */

  /**
   * Run steps [{ delay, run }] one after another. Returns a cancel function.
   * With reduced motion every delay collapses to zero.
   */
  function sequence(steps, onDone) {
    let index = 0;
    let timer = null;
    let cancelled = false;
    const next = () => {
      if (cancelled) return;
      if (index >= steps.length) {
        if (onDone) onDone();
        return;
      }
      const step = steps[index++];
      const delay = S.motion ? step.delay : 0;
      timer = setTimeout(() => {
        if (cancelled) return;
        step.run();
        next();
      }, delay);
    };
    next();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }

  function animateNumber(el, from, to, ms, format) {
    if (!el) return;
    format = format || E.formatNumber;
    if (!S.motion || ms <= 0) {
      el.textContent = format(to);
      return;
    }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = format(Math.round(from + (to - from) * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------------ */
  /* Boot                                                                */
  /* ------------------------------------------------------------------ */

  async function boot() {
    window.addEventListener('hashchange', () => onRoute({ focus: true }));
    onRoute({ focus: false });
    for (const release of S.releases) await computeReleaseHashes(release);
    S.hashes.ready = true;
    render();
    window.addEventListener('beforeprint', () => {
      document.querySelectorAll('details').forEach((d) => {
        d.open = true;
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    boot();
  });

  return {
    E,
    D,
    S,
    esc,
    icon,
    badge,
    tone,
    views,
    render,
    refresh,
    navigate,
    syncHash,
    actions,
    changes,
    inputs,
    dialog,
    toast,
    hideToast,
    sequence,
    animateNumber,
    activeRelease,
    releasePolicyFor,
    sourceSuspended,
    donationSources,
    requiredSourceIds,
    sourceName,
    addAudit,
    nowIso,
    addBusinessDays,
    money,
    computeReleaseHashes,
    hashesFor,
  };
})();
