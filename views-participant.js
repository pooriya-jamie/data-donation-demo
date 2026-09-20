/*
 * DataDonate demo — Participant journey view
 *
 * Renders the participant screens inside the device frame and drives the
 * simulated worker. Selection, canonical bytes and SHA-256 come from
 * engine.js, so counts and fingerprints behave like the product.
 */
(function () {
  'use strict';
  const App = window.App;
  const { E, D, S, esc, icon, badge } = App;

  const STEPS = ['Review and consent', 'Choose a source', 'Add your file', 'Choose your data', 'Review your donation'];
  const STEP_INDEX = { consent: 0, sources: 1, export: 2, upload: 2, choose: 3, preview: 4 };
  const ROUTE_PATH = { join: 'join', consent: 'consent', sources: 'sources', export: 'export', upload: 'upload', choose: 'choose', preview: 'preview', done: 'done', withdraw: 'withdraw' };
  const STAGE_LABELS = { opening: 'Opening your file…', finding: 'Finding activity the study can use…', removing: 'Removing information the study never collects…', preparing: 'Preparing your choices…' };
  const BROWSE_PAGE = 25;
  const PREVIEW_PAGE = 25;
  const MAX_PAYLOAD_BYTES = 50 * 1024 * 1024;

  const P = S.participant;

  /* ------------------------------------------------------------------ */
  /* Tour notes per screen                                               */
  /* ------------------------------------------------------------------ */

  const NOTES = {
    join: {
      title: 'Arriving by private link',
      bullets: [
        'The participant opened a private link sent by the research team. No login, no name, no email.',
        'Everything on this screen (dates, payment, which apps) comes from the study\'s locked, published rules.',
      ],
      where: 'Token in the URL fragment, redeemed by a slug-scoped POST · server/src/routes/accessLinks.ts',
    },
    consent: {
      title: 'Consent is tied to a study version',
      bullets: [
        'The participant reads, answers two quick questions and signs. All of it is recorded against this exact version of the study.',
        'If the study later changes what it collects, the participant is asked again.',
      ],
      where: 'consent_events bound to project_release_id · server/src/consentService.ts',
    },
    sources: {
      title: 'Only what this study allows',
      bullets: [
        'The list comes from the study\'s rules: TikTok is required, YouTube and ChatGPT are optional, two others show instructions only.',
        'Try the research team\'s System page: pausing a service greys its tile here at once.',
      ],
      where: 'shared/src/adapters/registry.ts · server/src/sourceCapabilityControl.ts',
    },
    export: {
      title: 'Checked instructions',
      bullets: [
        'A step-by-step guide for that app, checked against the app\'s current menus.',
        'It asks the participant to select as little as possible when requesting the export.',
      ],
      where: 'exportGuide versions in shared/src/adapters/registry.ts · server/src/projectGuides.ts',
    },
    upload: {
      title: 'Nothing leaves the browser',
      bullets: [
        'The file is opened on the participant\'s own device. Only the parts this study allows are kept; everything else is dropped right away.',
        'The panel below shows what was removed. Those values are already gone before the next screen appears.',
      ],
      where: 'shared/src/zip/safeUnzip.ts · pipeline.extractCandidatesFromFile · projectPolicy.applyProjectSourcePolicy',
    },
    choose: {
      title: 'Real choices, live fingerprint',
      bullets: [
        'Whole groups first, details only if wanted. Words the participant typed start off.',
        'The fingerprint is computed from exactly what will be sent. Change anything and it changes; change it back and it returns.',
      ],
      where: 'SHA-256 of canonical JSON · shared/src/selection/engine.ts · client/src/worker/processor.worker.ts',
    },
    preview: {
      title: 'What you see is what is sent',
      bullets: [
        'This list, the fingerprint and the uploaded data are the same thing.',
        'Pressing Donate uploads only this list. The server checks it before accepting.',
      ],
      where: 'shared/src/pipeline.ts finalizeDonation · server/src/routes/donations.ts',
    },
    done: {
      title: 'Receipt, and what is next',
      bullets: [
        'The receipt code exists only after the server verified and locked the data away.',
        'This round needs TikTok and YouTube. Payment eligibility is recorded when both are in.',
      ],
      where: 'recordCompensationEligibility in server/src/routes/donations.ts',
    },
    withdraw: {
      title: 'Withdrawal is immediate',
      bullets: [
        'Submitting cuts off access and starts the deletion clock (30 business days).',
        'Erasing the data itself needs two staff members. Earned payment stays.',
      ],
      where: 'server/src/routes/withdrawals.ts · withdrawalPolicy.ts',
    },
  };

  /* ------------------------------------------------------------------ */
  /* Small helpers                                                       */
  /* ------------------------------------------------------------------ */

  function project() {
    return S.project;
  }

  function release() {
    return App.activeRelease();
  }

  function donatedIds() {
    return P.donations.map((d) => d.platform);
  }

  function requiredMissing() {
    const donated = donatedIds();
    return App.requiredSourceIds().filter((id) => !donated.includes(id));
  }

  /** True when a material release was published after this participant consented. */
  function consentStale() {
    return P.consent.agreed && P.consent.releaseId !== S.activeReleaseId && release().requiresReconsent;
  }

  function roundComplete() {
    const required = App.requiredSourceIds();
    return required.length > 0 ? requiredMissing().length === 0 : P.donations.length > 0;
  }

  /** Donation-mode sources the participant could still work on right now. */
  function availableSources() {
    const donated = donatedIds();
    return App.donationSources().filter((s) => !donated.includes(s.id) && !App.sourceSuspended(s.id)).map((s) => s.id);
  }

  function nextSource() {
    const donated = donatedIds();
    const selected = P.selectedSources.filter((id) => !donated.includes(id) && !App.sourceSuspended(id));
    if (selected.length) return selected[0];
    const missing = requiredMissing().filter((id) => !App.sourceSuspended(id));
    return missing[0] || null;
  }

  function stepper(index) {
    return (
      '<nav class="flow-progress" aria-label="Progress"><div class="flow-progress-summary">Step ' + (index + 1) + ' of ' + STEPS.length + ' <strong>' + esc(STEPS[index]) + '</strong></div>' +
      '<progress value="' + (index + 1) + '" max="' + STEPS.length + '" aria-hidden="true"></progress>' +
      '<ol class="stepper">' +
      STEPS.map((label, i) => {
        const cls = i < index ? 'done' : i === index ? 'current' : '';
        const num = i < index ? icon('check', 'ico-sm') : String(i + 1);
        return '<li class="' + cls + '"' + (i === index ? ' aria-current="step"' : '') + '><span class="step-num">' + num + '</span><span>' + esc(label) + '</span></li>';
      }).join('') +
      '</ol></nav>'
    );
  }

  function privacyStatus() {
    return '<div class="privacy-status" role="status">' + icon('shield-check') + '<span><strong>Nothing has been sent</strong>Your file and choices are staying on this device.</span></div>';
  }

  function miniHeader() {
    return (
      '<div class="app-header-mini"><span class="tour-brand"><span class="brand-mark" aria-hidden="true">D</span><span class="brand-text"><span class="brand-name">DataDonate</span><span class="brand-sub">' + esc(project().institution) + '</span></span></span>' +
      '<span class="icon-btn" aria-hidden="true" title="Help and frequently asked questions">' + icon('question') + '</span></div>'
    );
  }

  function categoryLabel(sourceId, categoryId) {
    const cat = D.CAPABILITIES[sourceId].categories.find((c) => c.id === categoryId);
    return cat ? cat.label : categoryId;
  }

  function fieldLabel(sourceId, categoryId, fieldId) {
    const cat = D.CAPABILITIES[sourceId].categories.find((c) => c.id === categoryId);
    const f = cat && cat.fields.find((x) => x.id === fieldId);
    return f ? f.label : fieldId;
  }

  function dayOffset(days) {
    const d = new Date(S.today + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  /* ------------------------------------------------------------------ */
  /* Work (extraction + policy) management                               */
  /* ------------------------------------------------------------------ */

  function beginWork(sourceId, fileName) {
    const raw = D.generateCandidates(sourceId);
    const policy = App.releasePolicyFor(sourceId);
    const narrowed = E.applyProjectSourcePolicy(raw, policy);
    const selection = E.defaultPolicy(sourceId, narrowed.categories);
    P.work = {
      sourceId,
      fileName,
      raw,
      extraction: narrowed,
      tally: narrowed.tally,
      policy: selection,
      history: [],
      apply: null,
      bytes: 0,
      hash: '',
      finalized: null,
      releaseId: S.activeReleaseId,
    };
    P.ui.browse = {};
    P.ui.confirmed = false;
    P.ui.previewPage = 0;
    P.ui.previewQuery = '';
    P.ui.previewCategory = '';
    P.ui.donateError = null;
    recompute();
  }

  function recompute() {
    const w = P.work;
    if (!w) return;
    w.apply = E.applySelection(w.extraction.records, w.extraction.categories, w.policy);
    const payload = {
      schema: 'datadonate.donation.v2',
      source: w.sourceId,
      adapterVersion: D.CAPABILITIES[w.sourceId].adapterVersion,
      detectedExportSchemaVersion: w.extraction.inventory.exportSchemaVersion,
      records: w.apply.payloadRecords,
    };
    const bytes = E.canonicalJsonBytes(payload);
    w.bytes = bytes.byteLength;
    w.finalized = null;
    P.ui.confirmed = false;
    const token = (w.hashToken = (w.hashToken || 0) + 1);
    w.hash = '';
    E.sha256Hex(bytes).then((hex) => {
      if (w.hashToken !== token) return;
      w.hash = hex;
      const el = document.getElementById('hash-value');
      if (el) {
        el.textContent = hex;
        el.classList.add('is-changing');
        setTimeout(() => el.classList.remove('is-changing'), 420);
      }
    });
  }

  function mutatePolicy(fn) {
    const w = P.work;
    if (!w) return;
    w.history.push(JSON.stringify(w.policy));
    if (w.history.length > 25) w.history.shift();
    fn(w.policy);
    recompute();
  }

  function undoPolicy() {
    const w = P.work;
    if (!w || w.history.length === 0) return;
    w.policy = JSON.parse(w.history.pop());
    recompute();
    renderParticipant();
  }

  async function finalizeWork() {
    const w = P.work;
    if (!w) return null;
    if (w.finalized) return w.finalized;
    const hashes = App.hashesFor(S.activeReleaseId);
    w.finalized = await E.finalize(w.extraction, w.policy, {
      adapterVersion: D.CAPABILITIES[w.sourceId].adapterVersion,
      projectReleaseId: S.activeReleaseId,
      sourcePolicySha256: hashes.sourcePolicy[w.sourceId],
      collectionRoundId: S.round.id,
    });
    w.hash = w.finalized.manifest.payloadSha256;
    w.bytes = w.finalized.payloadBytes.byteLength;
    return w.finalized;
  }

  function identifyPreset() {
    const w = P.work;
    const presets = D.CAPABILITIES[w.sourceId].presets;
    const serialized = E.canonicalJson(w.policy);
    for (const preset of presets) {
      if (E.canonicalJson(presetPolicy(preset)) === serialized) return preset.id;
    }
    return 'custom';
  }

  function presetPolicy(preset) {
    const w = P.work;
    const policy = E.defaultPolicy(w.sourceId, w.extraction.categories);
    preset.off.forEach(([cat, field]) => {
      if (policy.categories[cat] && policy.categories[cat].fields[field] !== undefined) policy.categories[cat].fields[field] = false;
    });
    return policy;
  }

  /* ------------------------------------------------------------------ */
  /* Screens                                                             */
  /* ------------------------------------------------------------------ */

  function screenJoin() {
    const pr = project();
    const rel = release();
    const sources = App.donationSources();
    const required = App.requiredSourceIds();
    const comp = pr.compensation;

    if (P.status === 'withdrawn') {
      return (
        miniHeader() +
        '<span class="eyebrow">' + esc(pr.name) + '</span><h1>Participant access has ended</h1>' +
        '<p class="lede">Your withdrawal request was received. Access links and sessions for this project were revoked, and no information was changed by opening this page.</p>' +
        '<div class="card"><dl class="receipt-list"><dt>Request received</dt><dd>' + esc(E.formatDateTime(P.withdrawal.requestedAt)) + '</dd><dt>Deletion deadline</dt><dd>' + esc(E.formatDate(P.withdrawal.deadlineAt)) + '</dd></dl></div>' +
        '<p class="small muted" style="margin-top:1rem">Use “Reset demo” in the top bar to start the tour again.</p>'
      );
    }

    const returning = P.consent.agreed;
    let html = miniHeader() + '<span class="eyebrow">' + esc(pr.name) + ' · ' + esc(pr.institution) + '</span>';
    if (returning) {
      html += '<h1>Your study activity</h1><p class="lede">Continue when you are ready. Your saved progress contains only safe checkpoint details, never an export file or unfinished data choices.</p>';
      html += '<div class="card"><h2 style="font-size:1.05rem">' + esc(S.round.name) + '</h2><div class="progress-table">';
      for (const s of sources) {
        const donation = P.donations.find((d) => d.platform === s.id);
        const suspended = App.sourceSuspended(s.id);
        html += '<div class="progress-row"><span class="source-icon">' + esc(s.letter) + '</span><strong>' + esc(s.displayName) + (required.includes(s.id) ? ' <span class="tile-badge required">Required</span>' : '') + '</strong>' +
          (donation ? '<span class="tile-badge done">Donated · ' + esc(donation.receiptCode) + '</span>' : suspended ? badge('suspended') : '<span class="muted small">Not yet</span>') + '</div>';
      }
      html += '</div>';
      const missing = requiredMissing();
      if (missing.length) html += '<div class="notice notice-info" style="margin-top:1rem">' + icon('info') + '<p>Collection round incomplete. Still needed: <strong>' + esc(missing.map(App.sourceName).join(', ')) + '</strong>.</p></div>';
      else if (P.donations.length) html += '<div class="notice notice-success" style="margin-top:1rem">' + icon('check-circle') + '<p>Your required donations for this round are complete. Thank you.</p></div>';
      html += '</div>';
      if (consentStale()) {
        html += '<div class="notice notice-warn" style="margin-top:1rem">' + icon('warning-circle') + '<p>The study updated its terms (version ' + rel.version + '). Your earlier consent stays on record, but you must review and agree again before donating more.</p></div>';
      }
      html += '<div class="screen-actions">' +
        (consentStale() ? '<button type="button" class="btn btn-primary" data-action="p-go" data-step="consent">Review updated consent</button>' : availableSources().length ? '<button type="button" class="btn btn-primary" data-action="p-go" data-step="sources">Continue</button>' : '') +
        '<button type="button" class="btn btn-ghost" data-action="p-go" data-step="withdraw">Withdraw from the study</button>' +
        '<span class="spacer"></span><button type="button" class="btn btn-secondary" data-action="p-clear">Finish and clear this device</button></div>';
      return html;
    }

    html += '<h1>Review the study before you decide</h1>';
    html += '<p class="lede">' + esc(pr.purpose) + ' You choose whether to participate and exactly what data to donate.</p>';
    html += '<dl class="schedule-grid"><div><dt>Estimated time</dt><dd>About ' + pr.estimatedMinutes + ' minutes</dd></div><div><dt>Donations close</dt><dd>' + esc(E.formatDate(pr.donationsCloseAt)) + '</dd></div><div><dt>Participant access ends</dt><dd>' + esc(E.formatDate(pr.participantAccessEndsAt)) + '</dd></div></dl>';
    html += '<h2 style="font-size:1.05rem">Supported data sources</h2><p class="small muted" style="margin-bottom:0.25rem">The study can accept an export from:</p><ul class="source-list-compact">' +
      sources.map((s) => '<li><span class="source-icon">' + esc(s.letter) + '</span>' + esc(s.displayName) + (required.includes(s.id) ? ' <span class="tile-badge required">Required</span>' : '') + (App.sourceSuspended(s.id) ? ' ' + badge('suspended') : '') + '</li>').join('') + '</ul>';
    html += '<h2 style="font-size:1.05rem;margin-top:1.25rem">What you can count on</h2><ul class="trust-list">' +
      '<li>' + icon('check-circle') + 'Your original file stays on this device.</li>' +
      '<li>' + icon('check-circle') + 'Only what this study is approved to collect can be shared (study version ' + rel.version + ').</li>' +
      '<li>' + icon('check-circle') + 'You review the outgoing copy before anything is sent.</li>' +
      (comp.mode !== 'none' ? '<li>' + icon('check-circle') + esc(App.money(comp.amountCents, comp.currency)) + ' after completing the project donation.</li>' : '') +
      '</ul>';
    html += '<p class="xs muted" style="margin-top:1rem">Governance: ' + badge(pr.governanceStatus) + ' ' + esc(pr.governanceReference) + ' · Contact: ' + esc(pr.coordinatorEmail) + '</p>';
    html += '<div class="screen-actions"><button type="button" class="btn btn-primary" data-action="p-go" data-step="consent">Continue to consent ' + icon('arrow-right') + '</button></div>';
    return html;
  }

  function screenConsent() {
    const rel = release();
    const c = P.consent;
    const consent = D.CONSENT;
    const reconsent = consentStale();
    let html = stepper(0) + privacyStatus();
    html += '<h1>Research consent</h1><p class="muted small">Consent version ' + esc(rel.consentVersion) + ' · study version ' + rel.version + '</p>';

    if (c.agreed && !reconsent) {
      html += '<div class="notice notice-success">' + icon('check-circle') + '<p>You agreed to consent version ' + esc(c.version) + ' on ' + esc(E.formatDateTime(c.recordedAt)) + '. Receipt <span class="receipt-inline">' + esc(c.receiptCode) + '</span></p></div>';
      html += '<div class="screen-actions"><button type="button" class="btn btn-primary" data-action="p-go" data-step="sources">Continue</button><button type="button" class="btn btn-ghost" data-action="p-download-consent">Download consent receipt (PDF)</button></div>';
      return html;
    }
    if (reconsent) {
      html += '<div class="notice notice-warn">' + icon('warning-circle') + '<p>The study updated its terms (version ' + rel.version + '). Please review and agree again before continuing.</p></div>';
    }
    html += '<h2 style="font-size:1.05rem">Key points</h2><dl class="consent-points">' +
      '<div><dt>Purpose</dt><dd>' + esc(consent.summary.purpose) + '</dd></div>' +
      '<div><dt>What you share</dt><dd>' + esc(consent.summary.whatYouShare) + '</dd></div>' +
      '<div><dt>Possible risks</dt><dd>' + esc(consent.summary.risks) + '</dd></div>' +
      '<div><dt>Your choice</dt><dd>' + esc(consent.summary.voluntary) + '</dd></div></dl>';
    html += '<h2 style="font-size:1.05rem">Read the full consent document</h2>' +
      '<div class="consent-doc" id="consent-doc" tabindex="0" aria-label="Consent document, scroll to the end">' + consent.paragraphs.map((p) => '<p>' + esc(p) + '</p>').join('') + '</div>' +
      '<div class="consent-status ' + (c.scrolled ? 'is-done' : '') + '" id="consent-status">' + (c.scrolled ? icon('check-circle', 'ico-sm') + ' Complete consent reviewed. You may continue with the consent requirements.' : icon('info', 'ico-sm') + ' Scroll to the end of the document to continue.') + '</div>';
    html += '<h2 style="font-size:1.05rem;margin-top:1.25rem">Check your understanding</h2>';
    for (const q of consent.questions) {
      const answer = c.answers[q.id];
      const state = answer === undefined ? '' : answer === q.correct ? 'is-correct' : 'is-wrong';
      html += '<fieldset class="question ' + state + '"><legend>' + esc(q.prompt) + '</legend>' +
        q.options.map((o) => '<label class="check-row"><input type="radio" name="' + q.id + '" value="' + o.id + '" data-change="consent-answer" data-q="' + q.id + '" ' + (answer === o.id ? 'checked' : '') + ' /><span class="check-text">' + esc(o.label) + '</span></label>').join('') +
        (answer === undefined ? '' : answer === q.correct ? '<div class="question-feedback ok">Correct.</div>' : '<div class="question-feedback bad">Not quite. Re-read the “What you share” section and try again.</div>') +
        '</fieldset>';
    }
    html += '<h2 style="font-size:1.05rem;margin-top:1.25rem">Electronic signature</h2><div class="signature-box"><label class="field-label" for="sig">Type your name to sign</label><input class="text-input input-sm" id="sig" type="text" placeholder="Your name" value="' + esc(c.signature) + '" data-input="consent-signature" autocomplete="off" /><div class="xs muted" style="margin-top:0.3rem">Your typed name is stored with the consent record only. It is never part of research data.</div></div>';
    const allCorrect = consent.questions.every((q) => c.answers[q.id] === q.correct);
    const ready = c.scrolled && allCorrect && c.signature.trim().length > 1;
    html += '<div class="screen-actions"><button type="button" class="btn btn-primary" data-action="p-consent-agree" ' + (ready ? '' : 'disabled') + '>I agree and want to take part</button><button type="button" class="btn btn-ghost" data-action="p-go" data-step="join">Back</button></div>';
    if (!ready) html += '<p class="xs muted" style="margin-top:0.5rem">To continue: ' + [!c.scrolled ? 'read to the end' : null, !allCorrect ? 'answer both questions correctly' : null, c.signature.trim().length <= 1 ? 'type your name' : null].filter(Boolean).join(' · ') + '.</p>';
    return html;
  }

  function screenSources() {
    const sources = App.donationSources();
    const required = App.requiredSourceIds();
    const donated = donatedIds();
    let html = stepper(1) + privacyStatus();
    html += '<h1>Choose a data source</h1><p class="lede">Choose one or more services you feel comfortable considering. Selecting a source does not share anything.</p>';
    html += '<h2 style="font-size:1.05rem">Available now</h2><div class="platform-list">';
    for (const s of sources) {
      const done = donated.includes(s.id);
      const suspended = App.sourceSuspended(s.id);
      const checked = P.selectedSources.includes(s.id);
      const cls = 'platform-tile' + (done ? ' is-done' : '') + (suspended ? ' is-suspended' : '');
      html += '<label class="' + cls + '">' +
        '<input class="tile-check" type="checkbox" data-change="p-source" data-source="' + s.id + '" ' + (checked && !done && !suspended ? 'checked' : '') + ' ' + (done || suspended ? 'disabled' : '') + ' />' +
        '<span class="source-icon">' + esc(s.letter) + '</span>' +
        '<span class="tile-body"><strong>' + esc(s.displayName) + '</strong><span>' + esc(s.description) + '</span>' +
        (suspended ? '<span class="tile-warn">Uploading is temporarily unavailable. Please try again later.</span>' : '') + '</span>' +
        (done ? '<span class="tile-badge done">Done</span>' : required.includes(s.id) ? '<span class="tile-badge required">Required</span>' : '<span class="tile-badge">Optional</span>') +
        '</label>';
    }
    html += '</div>';
    const guides = D.SOURCES.filter((s) => {
      const p = App.releasePolicyFor(s.id);
      return p && p.mode === 'guide_only';
    });
    html += '<details><summary>Download guides and other sources (' + guides.length + ')</summary><div class="platform-list guide-group">' +
      guides.map((s) => '<div class="platform-tile"><span class="source-icon is-muted">' + esc(s.letter) + '</span><span class="tile-body"><strong>' + esc(s.displayName) + '</strong><span>' + esc(s.description) + '</span><span class="xs">Guide only in this project: no upload.</span></span><button type="button" class="btn btn-secondary btn-sm" data-action="p-guide" data-source="' + s.id + '">View guide</button></div>').join('') +
      '</div></details>';
    const count = P.selectedSources.filter((id) => !donated.includes(id) && !App.sourceSuspended(id)).length;
    html += '<div class="screen-actions"><button type="button" class="btn btn-primary" data-action="p-sources-continue" ' + (count ? '' : 'disabled') + '>' + (count ? 'Continue with ' + count + ' source' + (count > 1 ? 's' : '') : 'Choose at least one source') + '</button><button type="button" class="btn btn-ghost" data-action="p-go" data-step="join">Back</button></div>';
    return html;
  }

  function screenExport() {
    const s = D.sourceById(P.activeSource);
    const guide = s.exportGuide;
    const suspended = App.sourceSuspended(s.id);
    let html = stepper(2) + privacyStatus();
    html += '<span class="eyebrow">' + esc(s.displayName) + (P.guideOnly ? ' · guide only' : suspended ? ' · uploading temporarily unavailable' : '') + '</span>';
    html += '<h1>Get your data from ' + esc(s.displayName) + '</h1><p class="lede">' + esc(guide.intro) + '</p>';
    if (P.guideOnly) html += '<div class="notice notice-info">' + icon('info') + '<p>This source is guide-only in this project. You can prepare an export for a future round, but DataDonate will not show an upload control for it.</p></div>';
    if (suspended) html += '<div class="notice notice-warn">' + icon('warning-circle') + '<p>Uploading for ' + esc(s.displayName) + ' is temporarily unavailable. You can still request your export now and return later.</p></div>';
    html += '<ol class="steplist">' + guide.steps.map((st) => '<li><span><strong>' + esc(st.title) + '</strong><span>' + esc(st.detail) + '</span></span></li>').join('') + '</ol>';
    html += '<div class="notice">' + icon('hourglass') + '<p>' + esc(guide.wait) + '</p></div>';
    html += '<div class="screen-actions">' +
      (!P.guideOnly && !suspended ? '<button type="button" class="btn btn-primary" data-action="p-go" data-step="upload">I have my file ' + icon('arrow-right') + '</button>' : '') +
      '<button type="button" class="btn btn-ghost" data-action="p-go" data-step="sources">Back to sources</button></div>';
    return html;
  }

  function screenUpload() {
    const s = D.sourceById(P.activeSource);
    const proc = P.processing;
    let html = stepper(2) + privacyStatus();
    html += '<h1>Add your ' + esc(s.displayName) + ' file</h1><p class="lede">Choose the file exactly as ' + esc(s.displayName) + ' gave it to you (usually a .zip). Your file is read on your own device. In the next step you choose what to share.</p>';
    if (App.sourceSuspended(s.id)) {
      html += '<div class="notice notice-warn">' + icon('warning-circle') + '<p>Uploading for this source is temporarily unavailable. The upload control is hidden until an owner restores it.</p></div>';
      html += '<div class="screen-actions"><button type="button" class="btn btn-ghost" data-action="p-go" data-step="sources">Back to sources</button></div>';
      return html;
    }
    if (!proc) {
      html += '<div class="upload-zone"><span class="flow-step-icon">' + icon('file-up', 'ico-lg') + '</span><p>Drop your ' + esc(s.displayName) + ' export here, or choose it from your device.</p>' +
        '<button type="button" class="btn btn-primary" data-action="p-add-sample">Add synthetic sample file</button>' +
        '<p class="xs muted" style="margin:0.75rem 0 0">This demo generates a synthetic ' + esc(s.displayName) + ' export on this page instead of reading a real file. Nothing is uploaded anywhere.</p></div>';
      html += '<div class="screen-actions"><button type="button" class="btn btn-ghost" data-action="p-go" data-step="export">Back</button></div>';
      return html;
    }
    const stages = ['opening', 'finding', 'removing', 'preparing'];
    const current = stages.indexOf(proc.stage);
    html += '<div class="upload-zone has-file"><span class="file-chip">' + icon('file-zip', 'ico-sm') + esc(s.fileName) + '</span></div>';
    html += '<div class="worker-console" aria-live="polite"><div class="worker-console-head"><span>Web Worker · on this device</span><span>' + (proc.done ? 'complete' : 'working') + '</span></div><ul class="worker-stages">' +
      stages.map((st, i) => '<li class="' + (i < current || proc.done ? 'is-done' : i === current ? 'is-active' : '') + '"><span class="dot"></span>' + esc(STAGE_LABELS[st]) + '</li>').join('') + '</ul>';
    html += '<dl class="worker-tally" id="worker-tally">' + tallyHtml(proc) + '</dl></div>';
    if (proc.done) html += '<div class="screen-actions"><button type="button" class="btn btn-primary" data-action="p-go" data-step="choose">Choose your data ' + icon('arrow-right') + '</button></div>';
    else html += '<div class="screen-actions"><button type="button" class="btn btn-ghost" data-action="p-cancel-processing">Cancel</button></div>';
    return html;
  }

  function tallyHtml(proc) {
    const rows = [];
    const t = proc.tally || {};
    const push = (k, v, cls) => rows.push('<dt>' + esc(k) + '</dt><dd class="' + (cls || '') + '">' + v + '</dd>');
    if (t.entries !== undefined) push('Files opened inside the export', t.entries, 'is-kept');
    if (t.sectionsRead !== undefined) push('Sections read', t.sectionsRead, 'is-kept');
    if (t.found !== undefined) push('Activity records found', '<span id="tally-found">' + E.formatNumber(t.found) + '</span>');
    if (t.neverRead !== undefined) push('Sections never even read', t.neverRead, 'is-removed');
    if (t.groupsRemoved !== undefined) push('Groups this study does not collect', t.groupsRemoved, 'is-removed');
    if (t.fieldsRemoved !== undefined) push('Details deleted by the study\'s rules', '<span id="tally-fields">' + E.formatNumber(t.fieldsRemoved) + '</span>', 'is-removed');
    if (t.retained !== undefined) push('Records kept, on this device only', '<span id="tally-retained">' + E.formatNumber(t.retained) + '</span>', 'is-kept');
    return rows.join('');
  }

  function screenChoose() {
    const w = P.work;
    if (!w) {
      return stepper(3) + privacyStatus() + '<h1>Add your file again</h1><p class="lede">For privacy, DataDonate does not store your export file or unfinished sharing choices.</p><div class="screen-actions"><button type="button" class="btn btn-primary" data-action="p-go" data-step="upload">Add file</button></div>';
    }
    const s = D.sourceById(w.sourceId);
    const cap = D.CAPABILITIES[w.sourceId];
    const counts = w.apply.counts;
    const preset = identifyPreset();
    let html = stepper(3) + privacyStatus();
    html += '<span class="eyebrow">' + esc(s.displayName) + ' export · ' + esc(w.fileName) + '</span><h1>Choose your data</h1><p class="lede">Start with whole groups, then open only the details you want to change. You never need to review every item one by one.</p>';
    html += '<div class="selection-workspace"><div>';
    // Presets
    if (cap.presets.length) {
      html += '<fieldset class="preset-panel"><legend>Choose a comfortable starting point</legend>' +
        cap.presets.map((p) => '<label class="preset-option"><input type="radio" name="preset" value="' + p.id + '" data-change="p-preset" ' + (preset === p.id ? 'checked' : '') + ' /><span><strong>' + esc(p.label) + (p.recommended ? ' <span class="recommended-label">Recommended</span>' : '') + '</strong><span>' + esc(p.description) + '</span></span></label>').join('') +
        '<label class="preset-option"><input type="radio" name="preset" value="custom" ' + (preset === 'custom' ? 'checked' : '') + ' disabled /><span><strong>Custom</strong><span>Selected automatically when you change any detail below.</span></span></label></fieldset>';
    }
    // Rules
    if (w.policy.bulkExclusions.length) {
      html += '<div class="active-rules"><strong>Your removal rules</strong><span class="xs">These rules stay on this device and can exclude any number of matching items.</span><ul>' +
        w.policy.bulkExclusions.map((r) => '<li><span>Remove every item in “' + esc(categoryLabel(w.sourceId, r.categoryId)) + '” containing <b>“' + esc(r.textContains) + '”</b></span><button type="button" class="btn btn-ghost btn-sm" data-action="p-remove-rule" data-rule="' + esc(r.id) + '">Remove rule</button></li>').join('') + '</ul></div>';
    }
    // Category cards
    for (const cat of w.extraction.categories) {
      const sel = w.policy.categories[cat.id];
      const c = counts.byCategory[cat.id] || { candidates: 0, selected: 0, state: 'none' };
      const inv = w.extraction.inventory.categories.find((x) => x.id === cat.id);
      const stateLabel = c.state === 'all' ? 'All ' + E.formatNumber(c.selected) + ' included' : c.state === 'partial' ? E.formatNumber(c.selected) + ' of ' + E.formatNumber(c.candidates) : 'None included';
      html += '<article class="category-card state-' + c.state + '" id="cat-' + cat.id + '"><div class="category-head"><div class="category-title"><h3>' + esc(cat.label) + '</h3><p>' + esc(cat.description) + '</p></div><span class="category-state state-' + c.state + '">' + esc(stateLabel) + '</span></div>';
      html += '<div class="category-facts"><span><b>' + E.formatNumber(c.candidates) + '</b> items</span>' + (inv && inv.dateRange.from ? '<span>' + esc(E.formatDate(inv.dateRange.from)) + ' – ' + esc(E.formatDate(inv.dateRange.to)) + '</span>' : '') + '</div>';
      html += '<label class="check-row"><input type="checkbox" data-change="p-cat-toggle" data-cat="' + cat.id + '" ' + (sel.included ? 'checked' : '') + ' /><span class="check-text"><strong>Include this group</strong></span></label>';
      html += '<details ' + (P.ui.browse[cat.id] && P.ui.browse[cat.id].open ? 'open' : '') + '><summary>Choose the details inside each item</summary><div class="category-editor">';
      for (const f of cat.fields) {
        const on = f.required ? true : sel.fields[f.id] === undefined ? f.defaultIncluded : sel.fields[f.id];
        html += '<label class="check-row field-choice ' + (f.required ? 'is-required' : '') + '"><input type="checkbox" data-change="p-field-toggle" data-cat="' + cat.id + '" data-field="' + f.id + '" ' + (on ? 'checked' : '') + ' ' + (f.required || !sel.included ? 'disabled' : '') + ' /><span><span class="check-text">' + esc(f.label) + (f.required ? ' <span class="xs muted">(always included)</span>' : '') + (f.sensitivity === 'high' ? ' <span class="sensitive-flag">' + icon('warning-circle', 'ico-sm') + 'Sensitive: may contain private words</span>' : '') + '</span><span class="check-desc">' + esc(f.description) + '</span></span></label>';
      }
      // Dates
      const dr = sel.dateRange || {};
      const preset30 = dr.from === dayOffset(-30) && !dr.to;
      const preset180 = dr.from === dayOffset(-180) && !dr.to;
      const all = !dr.from && !dr.to;
      const custom = !all && !preset30 && !preset180;
      html += '<div class="date-controls"><h4>Choose dates</h4><div class="date-preset-grid">' +
        '<button type="button" class="btn btn-secondary" data-action="p-date" data-cat="' + cat.id + '" data-preset="all" aria-pressed="' + all + '">All dates</button>' +
        '<button type="button" class="btn btn-secondary" data-action="p-date" data-cat="' + cat.id + '" data-preset="30" aria-pressed="' + preset30 + '">Latest 30 days</button>' +
        '<button type="button" class="btn btn-secondary" data-action="p-date" data-cat="' + cat.id + '" data-preset="180" aria-pressed="' + preset180 + '">Latest 6 months</button>' +
        '<button type="button" class="btn btn-secondary" data-action="p-date" data-cat="' + cat.id + '" data-preset="custom" aria-pressed="' + custom + '">Custom dates</button></div>';
      if (custom) html += '<div class="date-custom"><label>From <input type="date" value="' + esc(dr.from || '') + '" data-change="p-date-custom" data-cat="' + cat.id + '" data-bound="from" /></label><label>To <input type="date" value="' + esc(dr.to || '') + '" data-change="p-date-custom" data-cat="' + cat.id + '" data-bound="to" /></label></div>';
      html += '</div>';
      // Local browser
      const b = P.ui.browse[cat.id] || { query: '', page: 0 };
      html += '<div class="local-browser"><h4 style="font-size:var(--font-size-sm);margin-bottom:0.4rem">Browse on this device</h4><div class="search-input-wrap"><input class="text-input input-sm" type="search" placeholder="Search this group" value="' + esc(b.query) + '" data-input="p-browse-query" data-cat="' + cat.id + '" aria-label="Search ' + esc(cat.label) + '" /></div><div id="browse-' + cat.id + '">' + browseListHtml(cat.id) + '</div></div>';
      html += '</div></details></article>';
    }
    html += '<div class="screen-actions"><button type="button" class="btn btn-ghost" data-action="p-go" data-step="upload">Change file</button></div>';
    html += '</div>';
    // Summary aside
    html += '<aside class="card selection-summary-card" aria-label="Your current selection">' + summaryHtml() + '</aside>';
    html += '</div>';
    return html;
  }

  function summaryHtml() {
    const w = P.work;
    const counts = w.apply.counts;
    const sensitiveOn = w.extraction.categories.some((cat) => cat.fields.some((f) => f.sensitivity === 'high' && !f.required && w.policy.categories[cat.id].included && (w.policy.categories[cat.id].fields[f.id] === undefined ? f.defaultIncluded : w.policy.categories[cat.id].fields[f.id])));
    const pct = Math.min(100, (w.bytes / MAX_PAYLOAD_BYTES) * 100);
    return (
      '<span class="eyebrow">Your current selection</span><span class="summary-number" id="summary-count" role="status">' + E.formatNumber(counts.totalSelected) + '</span><p class="summary-caption">items selected to share · ' + E.formatNumber(counts.totalParticipantExcluded) + ' left out by you</p>' +
      '<ul class="summary-list">' + w.extraction.categories.map((cat) => '<li><span>' + esc(cat.label) + '</span><b>' + E.formatNumber(counts.byCategory[cat.id].selected) + '</b></li>').join('') + '</ul>' +
      '<p class="small" style="margin:0 0 0.5rem">' + (sensitiveOn ? '<span class="sensitive-flag">' + icon('warning-circle', 'ico-sm') + 'Sensitive text is included</span>' : '<span style="color:var(--color-success);font-weight:650">' + icon('check-circle', 'ico-sm') + ' Sensitive details remain off.</span>') + '</p>' +
      '<div class="hash-line"><span class="hash-label"><span>Data fingerprint</span><span class="muted" style="font-weight:600;text-transform:none;letter-spacing:0">live</span></span><code class="hash-value" id="hash-value">' + (w.hash || 'computing…') + '</code><p class="hash-note">A unique code made from exactly what will be sent. Change anything and it changes; change it back and it returns. The server checks it on arrival.</p></div>' +
      '<div class="bytes-meter">' + esc(E.formatBytes(w.bytes)) + ' of ' + esc(E.formatBytes(MAX_PAYLOAD_BYTES)) + ' per donation<progress value="' + pct.toFixed(2) + '" max="100" aria-label="Payload size"></progress></div>' +
      '<details class="never-collected"><summary>Information the study never collects</summary><p class="xs muted" style="margin:0 0 0.4rem">These parts cannot be added, no matter what you choose.</p><ul>' + w.extraction.inventory.systemExcludedCategories.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul></details>' +
      '<div class="screen-actions" style="margin-top:1rem"><button type="button" class="btn btn-primary btn-block" data-action="p-to-preview" ' + (counts.totalSelected === 0 ? 'disabled' : '') + '>Continue to review</button><button type="button" class="btn btn-ghost btn-block" data-action="p-undo" ' + (w.history.length ? '' : 'disabled') + '>Undo last change</button><button type="button" class="btn btn-ghost btn-block" data-action="p-reset-choices">Reset all choices</button></div>'
    );
  }

  function browseListHtml(catId) {
    const w = P.work;
    const b = P.ui.browse[catId] || (P.ui.browse[catId] = { query: '', page: 0, open: false });
    const query = b.query.trim().toLowerCase();
    const matcher = E.createSelectionMatcher(w.extraction.records, w.policy);
    const rows = w.extraction.records.filter((r) => r.category === catId && (!query || E.recordSearchText(r).includes(query)));
    rows.sort((a, c) => (c.timestamp || '').localeCompare(a.timestamp || ''));
    const pages = Math.max(1, Math.ceil(rows.length / BROWSE_PAGE));
    if (b.page >= pages) b.page = pages - 1;
    const page = rows.slice(b.page * BROWSE_PAGE, (b.page + 1) * BROWSE_PAGE);
    let html = '';
    if (query && rows.length) {
      html += '<div class="btn-row" style="margin-bottom:0.5rem"><span class="small muted">' + E.formatNumber(rows.length) + ' matching item' + (rows.length > 1 ? 's' : '') + '</span><button type="button" class="btn btn-secondary btn-sm" data-action="p-bulk-remove" data-cat="' + catId + '">Remove all ' + E.formatNumber(rows.length) + ' matching items</button></div>';
    }
    if (rows.length === 0) {
      html += '<p class="small muted">No items match.</p>';
      return html;
    }
    html += '<ul class="record-list">' + page.map((r) => {
      const selected = matcher(r);
      const text = Object.keys(r.fields).map((k) => String(r.fields[k])).join(' · ') || '(date only)';
      return '<li class="record-row ' + (selected ? '' : 'is-excluded') + '"><time datetime="' + esc(r.timestamp || '') + '">' + esc(r.timestamp ? r.timestamp.slice(0, 10) : '—') + '</time><span class="record-main" title="' + esc(text) + '">' + esc(text) + '</span>' + (selected ? '' : '<span class="excluded-tag">Left out</span>') + '<button type="button" class="btn btn-ghost btn-sm" data-action="p-toggle-record" data-id="' + esc(r.localId) + '" data-cat="' + catId + '">' + (selected ? 'Remove' : 'Restore') + '</button></li>';
    }).join('') + '</ul>';
    html += '<div class="pager"><span>Showing ' + (b.page * BROWSE_PAGE + 1) + '–' + Math.min(rows.length, (b.page + 1) * BROWSE_PAGE) + ' of ' + E.formatNumber(rows.length) + ' · at most ' + BROWSE_PAGE + ' per page</span><span class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-action="p-browse-page" data-cat="' + catId + '" data-dir="-1" ' + (b.page === 0 ? 'disabled' : '') + '>Previous</button><button type="button" class="btn btn-ghost btn-sm" data-action="p-browse-page" data-cat="' + catId + '" data-dir="1" ' + (b.page >= pages - 1 ? 'disabled' : '') + '>Next</button></span></div>';
    return html;
  }

  function screenPreview() {
    const w = P.work;
    if (!w || !w.finalized) {
      finalizeWork().then(() => renderParticipant());
      return stepper(4) + privacyStatus() + '<h1>Review exactly what will be donated</h1><p class="lede"><span class="spinner" style="display:inline-block;vertical-align:middle"></span> Finalizing your choices on this device…</p>';
    }
    const f = w.finalized;
    const s = D.sourceById(w.sourceId);
    const counts = f.counts;
    const groups = w.extraction.categories.filter((c) => counts.byCategory[c.id].selected > 0);
    let html = stepper(4) + privacyStatus();
    html += '<span class="eyebrow">Final review · ' + esc(s.displayName) + '</span><h1>Review exactly what will be donated</h1><p class="lede">This is the outgoing data after all your choices. Browse by group or search it without loading every item at once.</p>';
    if (P.ui.donateError) html += '<div class="notice notice-danger">' + icon('x-circle') + '<p>' + esc(P.ui.donateError) + '</p></div>';
    html += '<div class="review-stat-grid"><div class="review-stat"><strong>' + E.formatNumber(counts.totalSelected) + '</strong><span>items selected</span></div><div class="review-stat"><strong>' + E.formatNumber(counts.totalParticipantExcluded) + '</strong><span>items left out by you</span></div><div class="review-stat"><strong>' + groups.length + '</strong><span>groups included</span></div></div>';
    html += '<h2 style="font-size:1.05rem">What each group includes</h2><ul class="review-category">' + w.extraction.categories.map((cat) => {
      const c = counts.byCategory[cat.id];
      const chips = cat.fields.map((fl) => '<span class="detail-chip ' + (c.includedFields.includes(fl.id) ? 'is-included' : 'is-excluded') + '">' + esc(fl.label) + '</span>').join('');
      return '<li><strong>' + esc(cat.label) + '</strong> · ' + (c.selected ? E.formatNumber(c.selected) + ' items' : '<span class="muted">not included</span>') + '<div class="chips">' + (c.selected ? chips : '') + '</div></li>';
    }).join('') + '</ul>';
    if (counts.dateRange.from) html += '<p class="small muted">Available activity dates: ' + esc(E.formatDate(counts.dateRange.from)) + ' – ' + esc(E.formatDate(counts.dateRange.to)) + '</p>';
    // Exact browser
    html += '<div class="exact-browser"><span class="eyebrow">Exact outgoing records</span><h2 style="font-size:1.05rem">Browse what will be sent</h2><p class="small muted">Only ' + PREVIEW_PAGE + ' items are shown at a time. Search checks this final outgoing copy.</p>' +
      '<div class="exact-filters"><select class="select-input" data-change="p-preview-cat" aria-label="Group"><option value="">All groups</option>' + groups.map((g) => '<option value="' + g.id + '" ' + (P.ui.previewCategory === g.id ? 'selected' : '') + '>' + esc(g.label) + '</option>').join('') + '</select><input class="text-input" type="search" placeholder="Search the outgoing copy" value="' + esc(P.ui.previewQuery) + '" data-input="p-preview-query" aria-label="Search outgoing records" /></div>' +
      '<div id="preview-list">' + previewListHtml() + '</div></div>';
    // Boundary
    const hashes = App.hashesFor(S.activeReleaseId);
    const fieldNames = Array.from(new Set(groups.flatMap((g) => counts.byCategory[g.id].includedFields))).map((id) => {
      for (const g of groups) {
        const fl = g.fields.find((x) => x.id === id);
        if (fl) return fl.label.toLowerCase();
      }
      return id;
    });
    const removedDetails = Object.values(w.tally.removedFields).reduce((a, b) => a + b, 0);
    html += '<span class="eyebrow">What leaves, what stays</span><div class="boundary-grid">' +
      '<div class="boundary-col leaves"><h3>' + icon('cloud', 'ico-sm') + 'Leaves this device</h3><dl class="kv"><dt>Records</dt><dd>' + E.formatNumber(counts.totalSelected) + '</dd><dt>Details</dt><dd>' + esc(fieldNames.join(', ')) + '</dd><dt>Size</dt><dd>' + esc(E.formatBytes(f.payloadBytes.byteLength)) + '</dd><dt>Fingerprint</dt><dd class="mono">' + esc(E.shortHash(f.manifest.payloadSha256, 12, 8)) + '</dd><dt>Study version</dt><dd>v' + esc(String(release().version)) + ' · ' + esc(S.round.name) + '</dd></dl></div>' +
      '<div class="boundary-col stays"><h3>' + icon('lock', 'ico-sm') + 'Stays on this device</h3><ul><li>Your file <span class="mono">' + esc(w.fileName) + '</span></li><li>' + w.extraction.inventory.systemExcludedCategories.length + ' parts of the file the study never reads</li><li>' + E.formatNumber(counts.totalParticipantExcluded) + ' items you left out</li>' + (w.policy.bulkExclusions.length ? '<li>Your ' + w.policy.bulkExclusions.length + ' removal rule' + (w.policy.bulkExclusions.length > 1 ? 's' : '') + ' and the words in them</li>' : '') + '<li>Anything you searched for on this screen</li>' + (w.tally.removedRecords + removedDetails ? '<li>' + (w.tally.removedRecords ? E.formatNumber(w.tally.removedRecords) + ' records and ' : '') + E.formatNumber(removedDetails) + ' details the study never collects (deleted before you saw them)</li>' : '') + '</ul></div></div>';
    html += '<details class="review-technical"><summary>For technical readers: receipt details</summary><dl class="kv"><dt>SHA-256</dt><dd class="mono">' + esc(f.manifest.payloadSha256) + '</dd><dt>Outgoing size</dt><dd>' + E.formatNumber(f.payloadBytes.byteLength) + ' bytes</dd><dt>Export format</dt><dd class="mono">' + esc(f.manifest.detectedExportSchemaVersion) + '</dd><dt>Versions</dt><dd>adapter ' + esc(f.manifest.adapterVersion) + ' · parser ' + esc(f.manifest.parserVersion) + ' · selection policy v' + f.manifest.selectionPolicyVersion + '</dd><dt>Release · round · policy hash</dt><dd class="mono">' + esc(S.activeReleaseId) + ' · ' + esc(S.round.id) + ' · ' + esc(E.shortHash(hashes.sourcePolicy[w.sourceId] || '', 12, 8)) + '</dd><dt>Manifest</dt><dd><code class="mono" style="white-space:pre-wrap;word-break:break-all;font-size:0.72rem">' + esc(JSON.stringify(Object.assign({}, f.manifest, { processedAt: undefined }), null, 1).replace(/\n\s*/g, ' ')) + '</code></dd></dl></details>';
    if (P.ui.donating) {
      const stages = ['Creating your donation record…', 'Uploading the exact reviewed bytes…', 'Verifying on the server…', 'Accepted'];
      html += '<ul class="donate-progress" aria-live="polite">' + stages.map((st, i) => '<li class="' + (i < P.ui.donating.stage ? 'is-done' : i === P.ui.donating.stage ? 'is-active' : '') + '">' + (i < P.ui.donating.stage ? icon('check-circle', 'ico-sm') : i === P.ui.donating.stage ? '<span class="spinner"></span>' : '<span class="dot" style="width:16px;display:inline-block"></span>') + esc(st) + '</li>').join('') + '</ul>';
    } else {
      html += '<div class="final-confirmation"><label class="check-row"><input type="checkbox" data-change="p-confirm" ' + (P.ui.confirmed ? 'checked' : '') + ' /><span><span class="check-text"><strong>I am ready to donate this selected data</strong></span><span class="check-desc">I understand that only the exact records and fields shown on this screen will be sent to the research team.</span></span></label></div>';
    }
    html += '<div class="sticky-action-bar"><div class="bar-text"><strong>' + E.formatNumber(counts.totalSelected) + ' items ready</strong>Nothing is sent until you press Donate selected data.</div><button type="button" class="btn btn-secondary" data-action="p-go" data-step="choose" ' + (P.ui.donating ? 'disabled' : '') + '>Change choices</button><button type="button" class="btn btn-primary" data-action="p-donate" ' + (P.ui.confirmed && !P.ui.donating ? '' : 'disabled') + '>' + (P.ui.donating ? 'Donating…' : 'Donate selected data') + '</button></div>';
    return html;
  }

  function previewListHtml() {
    const f = P.work.finalized;
    const q = P.ui.previewQuery.trim().toLowerCase();
    const records = f.payload.records.filter((r) => (!P.ui.previewCategory || r.category === P.ui.previewCategory) && (!q || JSON.stringify(r).toLowerCase().includes(q)));
    const pages = Math.max(1, Math.ceil(records.length / PREVIEW_PAGE));
    if (P.ui.previewPage >= pages) P.ui.previewPage = pages - 1;
    const page = records.slice(P.ui.previewPage * PREVIEW_PAGE, (P.ui.previewPage + 1) * PREVIEW_PAGE);
    if (records.length === 0) return '<p class="small muted">No outgoing records match.</p>';
    return '<div class="record-list">' + page.map((r) => '<div class="preview-record">' + Object.keys(r).sort().map((k) => '<span><span class="k">' + esc(k) + ':</span> <span class="v">' + esc(String(r[k])) + '</span></span>').join('') + '</div>').join('') + '</div>' +
      '<div class="pager"><span>Showing ' + (P.ui.previewPage * PREVIEW_PAGE + 1) + '–' + Math.min(records.length, (P.ui.previewPage + 1) * PREVIEW_PAGE) + ' of ' + E.formatNumber(records.length) + '</span><span class="btn-row"><button type="button" class="btn btn-ghost btn-sm" data-action="p-preview-page" data-dir="-1" ' + (P.ui.previewPage === 0 ? 'disabled' : '') + '>Previous</button><button type="button" class="btn btn-ghost btn-sm" data-action="p-preview-page" data-dir="1" ' + (P.ui.previewPage >= pages - 1 ? 'disabled' : '') + '>Next</button></span></div>';
  }

  function screenDone() {
    const last = P.donations[P.donations.length - 1];
    const pr = project();
    const comp = pr.compensation;
    const missing = requiredMissing();
    const complete = roundComplete();
    const next = nextSource();
    let html = miniHeader();
    if (!last) return html + '<h1>No donation yet</h1><div class="screen-actions"><button type="button" class="btn btn-primary" data-action="p-go" data-step="sources">Choose a source</button></div>';
    html += '<span class="eyebrow">' + (complete ? 'Donation complete' : 'Donation received') + '</span><h1>' + (complete ? 'Thank you for contributing to this study' : 'Your donation is safe, and this round is still in progress') + '</h1><p class="lede">' + esc(pr.purpose) + '</p>';
    html += '<div class="card"><h2 style="font-size:1.05rem">Your donation receipt</h2><p class="small muted">Keep these codes if you need to contact the research team.</p><dl class="receipt-list"><dt>Receipt code</dt><dd>' + esc(last.receiptCode) + '</dd><dt>Source</dt><dd>' + esc(App.sourceName(last.platform)) + '</dd><dt>Items donated</dt><dd>' + E.formatNumber(last.records) + '</dd><dt>Data fingerprint</dt><dd>' + esc(E.shortHash(last.sha256, 12, 8)) + '</dd><dt>Received</dt><dd>' + esc(E.formatDateTime(last.createdAt)) + '</dd></dl>' +
      (P.donations.length > 1 ? '<p class="small muted" style="margin:0.75rem 0 0">Earlier this session: ' + P.donations.slice(0, -1).map((d) => esc(App.sourceName(d.platform)) + ' · ' + esc(d.receiptCode)).join(', ') + '</p>' : '') + '</div>';
    if (!complete && missing.length) html += '<div class="notice notice-info" style="margin-top:1rem">' + icon('info') + '<p>This collection round is not complete. Still needed: <strong>' + esc(missing.map(App.sourceName).join(', ')) + '</strong>.' + (comp.mode === 'flat_completion' ? ' Compensation eligibility is recorded once every required source has an accepted donation.' : '') + '</p></div>';
    if (complete && comp.mode !== 'none') html += '<div class="notice notice-success" style="margin-top:1rem">' + icon('check-circle') + '<p>Compensation eligibility of <strong>' + esc(App.money(comp.amountCents, comp.currency)) + '</strong> has been recorded for your verified donations. The research team reviews eligibility before payment.</p></div>';
    html += '<div class="card"><h2 style="font-size:1.05rem">You still have control</h2><p class="small muted">Your participation remains voluntary after donating.</p><ul class="plain-check-list"><li>' + icon('check-circle', 'ico-sm') + 'You can request withdrawal and deletion while your data remain identifiable to the study.</li><li>' + icon('check-circle', 'ico-sm') + 'Your original file was never uploaded and is not stored by DataDonate.</li><li>' + icon('check-circle', 'ico-sm') + 'Compensation already earned is not affected by withdrawal.</li></ul></div>';
    if (next) html += '<div class="card continue-source-card"><span class="source-icon">' + esc(D.sourceById(next).letter) + '</span><div><h2 style="font-size:1.05rem;margin:0">Continue with ' + esc(App.sourceName(next)) + '?</h2><p>' + (App.requiredSourceIds().includes(next) ? 'This source is required for the round.' : 'You selected this source earlier.') + ' You will get its download guide next.</p></div><button type="button" class="btn btn-primary" data-action="p-continue-source" data-source="' + next + '">Continue with ' + esc(App.sourceName(next)) + '</button></div>';
    html += '<div class="screen-actions"><button type="button" class="btn btn-secondary" data-action="p-go" data-step="join">Return to study overview</button><button type="button" class="btn btn-ghost" data-action="p-clear">Finish and clear this device</button><span class="spacer"></span><button type="button" class="btn btn-ghost" data-action="p-go" data-step="withdraw">Withdraw from the study</button></div>';
    return html;
  }

  function screenWithdraw() {
    let html = miniHeader() + '<h1>Withdraw from the study</h1>';
    if (P.withdrawal) {
      html += '<div class="notice notice-success">' + icon('check-circle') + '<p>Your withdrawal request was received.</p></div><div class="card"><dl class="receipt-list"><dt>Request received</dt><dd>' + esc(E.formatDateTime(P.withdrawal.requestedAt)) + '</dd><dt>Deletion deadline</dt><dd>' + esc(E.formatDate(P.withdrawal.deadlineAt)) + '</dd><dt>SLA</dt><dd>30 business days · ' + esc(project().timezone) + '</dd></dl><p class="small muted" style="margin:0.75rem 0 0">Your access links and sessions were revoked, queued reminders were cancelled, and any pending upload authorization expired. A research administrator will propose the deletion job; a different owner must approve it.</p></div>';
      html += '<div class="screen-actions"><button type="button" class="btn btn-secondary" data-action="p-go" data-step="join">Return to study overview</button></div>';
      return html;
    }
    html += '<p class="lede">You may withdraw during the identifiable active data-collection period. Submitting your request immediately ends participant access.</p>';
    html += '<div class="notice notice-warn">' + icon('warning-circle') + '<p>Submitting immediately ends participant access, revokes active links and sessions, and clears saved donation progress. You do not need to provide a reason.</p></div>';
    html += '<div class="card"><label class="field-label" for="wd-reason">Reason (optional)</label><textarea class="text-input" id="wd-reason" rows="3" placeholder="You can leave this blank."></textarea></div>';
    html += '<div class="screen-actions"><button type="button" class="btn btn-danger" data-action="p-withdraw">Request withdrawal</button><button type="button" class="btn btn-ghost" data-action="p-go" data-step="' + (P.donations.length ? 'done' : 'join') + '">Cancel</button></div>';
    return html;
  }

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */

  const SCREENS = { join: screenJoin, consent: screenConsent, sources: screenSources, export: screenExport, upload: screenUpload, choose: screenChoose, preview: screenPreview, done: screenDone, withdraw: screenWithdraw };

  function renderParticipant() {
    const mount = document.getElementById('device-screen');
    if (!mount) return;
    if (!SCREENS[P.step]) P.step = 'join';
    if ((P.step === 'export' || P.step === 'upload') && !P.activeSource) P.step = 'sources';
    if (P.status === 'withdrawn' && P.step !== 'withdraw') P.step = 'join';
    mount.innerHTML = SCREENS[P.step]();
    const url = document.getElementById('device-url');
    if (url) url.innerHTML = '<span class="device-lock">' + icon('lock', 'ico-sm') + '</span> datadonate.example<b>/p/' + esc(project().slug) + '/' + esc(ROUTE_PATH[P.step]) + (P.activeSource && (P.step === 'export' || P.step === 'upload') ? '/' + esc(P.activeSource) : '') + '</b>';
    const notes = NOTES[P.step];
    const notesEl = document.getElementById('tour-notes');
    if (notesEl && notes) {
      notesEl.innerHTML = '<span class="eyebrow">What is happening</span><h2>' + icon('info', 'ico-sm') + esc(notes.title) + '</h2><ul>' + notes.bullets.map((b) => '<li>' + esc(b) + '</li>').join('') + '</ul><details class="where" style="border:0;padding:0;background:transparent;margin:0"><summary style="padding:0.25rem 0;font-size:var(--font-size-xs);color:var(--color-text-muted)">For technical readers</summary><code>' + esc(notes.where) + '</code></details>';
    }
    if (P.step === 'consent' && !P.consent.agreed) {
      const doc = document.getElementById('consent-doc');
      if (doc) doc.addEventListener('scroll', onConsentScroll, { passive: true });
    }
    App.syncHash('participant', P.step);
  }

  function onConsentScroll(event) {
    const doc = event.target;
    if (P.consent.scrolled) return;
    if (doc.scrollTop + doc.clientHeight >= doc.scrollHeight - 8) {
      P.consent.scrolled = true;
      const status = document.getElementById('consent-status');
      if (status) {
        status.className = 'consent-status is-done';
        status.innerHTML = icon('check-circle', 'ico-sm') + ' Complete consent reviewed. You may continue with the consent requirements.';
      }
      updateConsentButton();
    }
  }

  function updateConsentButton() {
    const btn = document.querySelector('[data-action="p-consent-agree"]');
    if (!btn) return;
    const allCorrect = D.CONSENT.questions.every((q) => P.consent.answers[q.id] === q.correct);
    btn.disabled = !(P.consent.scrolled && allCorrect && P.consent.signature.trim().length > 1);
  }

  function go(step) {
    P.step = step;
    renderParticipant();
    const device = document.querySelector('.device');
    if (device && S.route.view === 'participant') {
      const top = device.getBoundingClientRect().top + window.scrollY - 80;
      if (window.scrollY > top) window.scrollTo({ top, behavior: S.motion ? 'smooth' : 'auto' });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Actions                                                             */
  /* ------------------------------------------------------------------ */

  App.actions['p-go'] = (el) => {
    const step = el.dataset.step;
    if (step === 'sources' && (!P.consent.agreed || consentStale())) return go('consent');
    if (step === 'consent' && P.consent.agreed && !consentStale()) return go('sources');
    if (step === 'preview') return App.actions['p-to-preview']();
    if (step === 'upload' && P.work && P.work.sourceId === P.activeSource && P.processing && P.processing.done) {
      // Returning to the upload screen discards the file, as the product does.
      P.work = null;
      P.processing = null;
    }
    if (step === 'upload') {
      P.processing = null;
    }
    go(step);
  };

  App.actions['p-clear'] = () => {
    P.work = null;
    P.processing = null;
    P.selectedSources = [];
    P.activeSource = null;
    P.ui.browse = {};
    go('join');
    App.toast('Worker terminated. Export file, candidates and choices released from memory.');
  };

  App.changes['consent-answer'] = (el) => {
    P.consent.answers[el.dataset.q] = el.value;
    renderParticipant();
  };
  App.inputs['consent-signature'] = (el) => {
    P.consent.signature = el.value;
    updateConsentButton();
  };
  App.actions['p-consent-agree'] = () => {
    const rel = release();
    const rng = E.mulberry32(Date.now() & 0xffffffff);
    P.consent.agreed = true;
    P.consent.recordedAt = App.nowIso();
    P.consent.receiptCode = E.receiptCode(rng).replace('DD-', 'CR-');
    P.consent.releaseId = rel.id;
    P.consent.version = rel.consentVersion;
    P.consent.scrolled = false;
    const participant = S.admin.participants.find((p) => p.id === P.id);
    if (participant) participant.consentVersion = rel.consentVersion;
    App.addAudit({ action: 'consent.recorded', actor: 'participant ' + P.id, subject: P.consent.receiptCode, summary: 'Consent ' + rel.consentVersion + ' recorded for release ' + rel.id + ' (scroll evidence, 2 comprehension answers, typed signature).' });
    App.toast('Consent recorded · receipt ' + P.consent.receiptCode);
    go('sources');
  };
  App.actions['p-download-consent'] = () => App.toast('In the product this downloads the version-matched receipt PDF generated from the recorded consent evidence.');

  App.changes['p-source'] = (el) => {
    const id = el.dataset.source;
    if (el.checked) {
      if (!P.selectedSources.includes(id)) P.selectedSources.push(id);
    } else {
      P.selectedSources = P.selectedSources.filter((x) => x !== id);
    }
    renderParticipant();
  };
  App.actions['p-sources-continue'] = () => {
    const next = nextSource();
    if (!next) return;
    P.activeSource = next;
    P.guideOnly = false;
    go('export');
  };
  App.actions['p-guide'] = (el) => {
    P.activeSource = el.dataset.source;
    P.guideOnly = true;
    go('export');
  };
  App.actions['p-continue-source'] = (el) => {
    P.activeSource = el.dataset.source;
    P.guideOnly = false;
    if (!P.selectedSources.includes(P.activeSource)) P.selectedSources.push(P.activeSource);
    P.work = null;
    P.processing = null;
    go('export');
  };

  App.actions['p-add-sample'] = () => {
    const source = D.sourceById(P.activeSource);
    if (!source || App.sourceSuspended(source.id)) return;
    const raw = D.generateCandidates(source.id);
    const policy = App.releasePolicyFor(source.id);
    const narrowed = E.applyProjectSourcePolicy(raw, policy);
    const removedFieldTotal = Object.values(narrowed.tally.removedFields).reduce((a, b) => a + b, 0);
    P.processing = { stage: 'opening', done: false, tally: {} };
    renderParticipant();
    const setStage = (stage, tally) => {
      P.processing.stage = stage;
      Object.assign(P.processing.tally, tally);
      renderParticipant();
    };
    P.processing.cancel = App.sequence(
      [
        { delay: 500, run: () => setStage('finding', { entries: source.archive.allowlisted.length + ' of ' + source.archive.entries.length, sectionsRead: source.archive.sectionsRead.length, found: 0 }) },
        { delay: 120, run: () => App.animateNumber(document.getElementById('tally-found'), 0, raw.records.length, 700) },
        { delay: 900, run: () => setStage('removing', { found: raw.records.length, neverRead: D.CAPABILITIES[source.id].systemExcluded.length, groupsRemoved: narrowed.tally.removedCategories.length, fieldsRemoved: 0 }) },
        { delay: 120, run: () => App.animateNumber(document.getElementById('tally-fields'), 0, removedFieldTotal, 700) },
        { delay: 900, run: () => setStage('preparing', { fieldsRemoved: removedFieldTotal, retained: narrowed.records.length }) },
        { delay: 500, run: () => { P.processing.done = true; beginWork(source.id, source.fileName); renderParticipant(); } },
        { delay: 600, run: () => go('choose') },
      ],
    );
  };
  App.actions['p-cancel-processing'] = () => {
    if (P.processing && P.processing.cancel) P.processing.cancel();
    P.processing = null;
    P.work = null;
    renderParticipant();
    App.toast('Processing cancelled. The worker was terminated and nothing was kept.');
  };

  App.changes['p-preset'] = (el) => {
    const preset = D.CAPABILITIES[P.work.sourceId].presets.find((p) => p.id === el.value);
    if (!preset) return;
    mutatePolicy((policy) => {
      const fresh = presetPolicy(preset);
      policy.categories = fresh.categories;
      policy.bulkExclusions = [];
      policy.recordOverrides = { included: [], excluded: [] };
      policy.conversationOverrides = { included: [], excluded: [] };
    });
    renderParticipant();
  };
  App.changes['p-cat-toggle'] = (el) => {
    const cat = el.dataset.cat;
    mutatePolicy((policy) => {
      policy.categories[cat].included = el.checked;
    });
    renderParticipant();
  };
  App.changes['p-field-toggle'] = (el) => {
    const { cat, field } = el.dataset;
    mutatePolicy((policy) => {
      policy.categories[cat].fields[field] = el.checked;
    });
    renderParticipant();
  };
  App.actions['p-date'] = (el) => {
    const { cat, preset } = el.dataset;
    mutatePolicy((policy) => {
      const sel = policy.categories[cat];
      if (preset === 'all') delete sel.dateRange;
      else if (preset === '30') sel.dateRange = { from: dayOffset(-30) };
      else if (preset === '180') sel.dateRange = { from: dayOffset(-180) };
      else sel.dateRange = { from: dayOffset(-90), to: S.today };
    });
    renderParticipant();
  };
  App.changes['p-date-custom'] = (el) => {
    const { cat, bound } = el.dataset;
    mutatePolicy((policy) => {
      const sel = policy.categories[cat];
      sel.dateRange = Object.assign({}, sel.dateRange || {});
      if (el.value) sel.dateRange[bound] = el.value;
      else delete sel.dateRange[bound];
    });
    renderParticipant();
  };
  App.inputs['p-browse-query'] = (el) => {
    const cat = el.dataset.cat;
    const b = P.ui.browse[cat] || (P.ui.browse[cat] = { query: '', page: 0 });
    b.query = el.value;
    b.page = 0;
    b.open = true;
    const list = document.getElementById('browse-' + cat);
    if (list) list.innerHTML = browseListHtml(cat);
  };
  App.actions['p-browse-page'] = (el) => {
    const b = P.ui.browse[el.dataset.cat];
    b.page = Math.max(0, b.page + Number(el.dataset.dir));
    b.open = true;
    const list = document.getElementById('browse-' + el.dataset.cat);
    if (list) list.innerHTML = browseListHtml(el.dataset.cat);
  };
  App.actions['p-toggle-record'] = (el) => {
    const id = el.dataset.id;
    const cat = el.dataset.cat;
    (P.ui.browse[cat] || (P.ui.browse[cat] = { query: '', page: 0 })).open = true;
    const matcher = E.createSelectionMatcher(P.work.extraction.records, P.work.policy);
    const record = P.work.extraction.records.find((r) => r.localId === id);
    const wasSelected = matcher(record);
    mutatePolicy((policy) => {
      const ov = policy.recordOverrides;
      if (wasSelected) {
        ov.excluded = ov.excluded.concat(id);
        ov.included = ov.included.filter((x) => x !== id);
      } else {
        ov.excluded = ov.excluded.filter((x) => x !== id);
        if (!ov.included.includes(id)) ov.included = ov.included.concat(id);
      }
    });
    const stillOut = !E.createSelectionMatcher(P.work.extraction.records, P.work.policy)(record);
    if (!wasSelected && stillOut) App.toast('This item stays out because its group is switched off or outside the chosen dates. Restoring only overrides a removal rule.');
    renderParticipant();
    const details = document.querySelector('#cat-' + cat + ' details');
    if (details) details.open = true;
  };
  App.actions['p-bulk-remove'] = async (el) => {
    const cat = el.dataset.cat;
    const b = P.ui.browse[cat];
    const query = b.query.trim();
    const matching = P.work.extraction.records.filter((r) => r.category === cat && E.recordSearchText(r).includes(query.toLowerCase())).length;
    const result = await App.dialog({ title: 'Remove all ' + E.formatNumber(matching) + ' matching items?', body: '<p>Every item in “' + esc(categoryLabel(P.work.sourceId, cat)) + '” containing <strong>“' + esc(query) + '”</strong> will be left out. The rule and its text stay on this device. You can undo this.</p>', confirmLabel: 'Remove matching items', danger: true });
    if (!result.ok) return;
    let rule;
    try {
      rule = E.createBulkExclusionRule({ target: 'records', categoryId: cat, textContains: query });
    } catch (err) {
      App.toast(err.message);
      return;
    }
    mutatePolicy((policy) => {
      if (!policy.bulkExclusions.some((r) => r.id === rule.id)) policy.bulkExclusions.push(rule);
    });
    b.query = '';
    b.open = true;
    renderParticipant();
    App.toast('Removal rule added · ' + E.formatNumber(matching) + ' items removed', { actionLabel: 'Undo', onAction: undoPolicy });
  };
  App.actions['p-remove-rule'] = (el) => {
    mutatePolicy((policy) => {
      policy.bulkExclusions = policy.bulkExclusions.filter((r) => r.id !== el.dataset.rule);
    });
    renderParticipant();
  };
  App.actions['p-undo'] = () => undoPolicy();
  App.actions['p-reset-choices'] = () => {
    mutatePolicy((policy) => {
      const fresh = E.defaultPolicy(P.work.sourceId, P.work.extraction.categories);
      Object.assign(policy, fresh);
    });
    P.ui.browse = {};
    renderParticipant();
    App.toast('All choices reset to the project defaults.', { actionLabel: 'Undo', onAction: undoPolicy });
  };
  App.actions['p-to-preview'] = () => {
    if (!P.work || P.work.apply.counts.totalSelected === 0) return;
    P.ui.previewPage = 0;
    P.ui.previewQuery = '';
    P.ui.previewCategory = '';
    P.ui.confirmed = false;
    P.ui.donateError = null;
    go('preview');
  };
  App.changes['p-preview-cat'] = (el) => {
    P.ui.previewCategory = el.value;
    P.ui.previewPage = 0;
    document.getElementById('preview-list').innerHTML = previewListHtml();
  };
  App.inputs['p-preview-query'] = (el) => {
    P.ui.previewQuery = el.value;
    P.ui.previewPage = 0;
    document.getElementById('preview-list').innerHTML = previewListHtml();
  };
  App.actions['p-preview-page'] = (el) => {
    P.ui.previewPage = Math.max(0, P.ui.previewPage + Number(el.dataset.dir));
    document.getElementById('preview-list').innerHTML = previewListHtml();
  };
  App.changes['p-confirm'] = (el) => {
    P.ui.confirmed = el.checked;
    const btn = document.querySelector('[data-action="p-donate"]');
    if (btn) btn.disabled = !el.checked;
  };

  App.actions['p-donate'] = async () => {
    const w = P.work;
    if (!w || !w.finalized || !P.ui.confirmed || P.ui.donating) return;
    // Server-side checks the demo reproduces up front.
    if (consentStale()) {
      P.ui.donateError = 'The project settings changed. Please review consent and process the export again.';
      go('consent');
      return;
    }
    if (App.sourceSuspended(w.sourceId)) {
      P.ui.donateError = 'This data source is temporarily unavailable. Please try again later. (503 source_temporarily_unavailable)';
      P.ui.confirmed = false;
      renderParticipant();
      return;
    }
    if (P.donations.some((d) => d.platform === w.sourceId)) {
      P.ui.donateError = 'You have already completed a donation for this platform. Thank you!';
      renderParticipant();
      return;
    }
    P.ui.donating = { stage: 0 };
    renderParticipant();
    const f = w.finalized;
    const rng = E.mulberry32(E.fnv1a(f.manifest.payloadSha256));
    const id = 'don_' + f.manifest.payloadSha256.slice(0, 24);
    const receiptCode = E.receiptCode(rng);
    App.sequence(
      [
        { delay: 700, run: () => { P.ui.donating.stage = 1; renderParticipant(); } },
        { delay: 900, run: () => { P.ui.donating.stage = 2; renderParticipant(); } },
        { delay: 900, run: () => { P.ui.donating.stage = 3; renderParticipant(); } },
        {
          delay: 400,
          run: () => {
            const createdAt = App.nowIso();
            const donation = { id, platform: w.sourceId, records: f.counts.totalSelected, payloadBytes: f.payloadBytes.byteLength, sha256: f.manifest.payloadSha256, receiptCode, createdAt, manifest: f.manifest, releaseId: S.activeReleaseId };
            P.donations.push(donation);
            const complete = roundComplete();
            S.admin.donations.unshift({ id, participantId: P.id, platform: w.sourceId, roundKey: S.round.roundKey, records: donation.records, payloadBytes: donation.payloadBytes, createdAt, status: 'accepted', receiptCode, isNew: true });
            const participant = S.admin.participants.find((p) => p.id === P.id);
            if (participant) participant.rounds[S.round.roundKey] = complete ? 'complete' : 'partial';
            App.addAudit({ action: 'donation.accepted', actor: 'participant ' + P.id, subject: id.slice(0, 12) + '…', summary: App.sourceName(w.sourceId) + ' payload verified (' + E.formatNumber(donation.records) + ' records, ' + E.formatBytes(donation.payloadBytes) + ') and promoted to the immutable project key.' + (complete ? ' Round ' + S.round.roundKey + ' complete; flat completion eligibility recorded.' : '') });
            S.server.donation = { id, platform: w.sourceId, records: donation.records, payloadBytes: donation.payloadBytes, sha256: donation.sha256, releaseId: S.activeReleaseId, policyHash: App.hashesFor(S.activeReleaseId).sourcePolicy[w.sourceId] || '', receiptCode, roundComplete: complete, seeded: false };
            S.server.stepIndex = -1;
            S.server.finished = false;
            S.server.status = null;
            S.server.checks = {};
            S.server.log = [];
            S.server.failedAt = null;
            S.server.paused = false;
            P.ui.donating = null;
            P.ui.confirmed = false;
            P.work = null;
            P.processing = null;
            P.selectedSources = P.selectedSources.filter((x) => x !== w.sourceId);
            go('done');
          },
        },
      ],
    );
  };

  App.actions['p-withdraw'] = async () => {
    const result = await App.dialog({ title: 'Submit your withdrawal request?', body: '<p>This immediately ends your participant access for this project and starts a deletion request with a ' + esc('30 business day') + ' deadline. Compensation already earned is not affected.</p>', confirmLabel: 'Yes, withdraw me', danger: true });
    if (!result.ok) return;
    const requestedAt = App.nowIso();
    const deadlineAt = App.addBusinessDays(requestedAt, 30);
    P.withdrawal = { requestedAt, deadlineAt };
    P.status = 'withdrawn';
    P.work = null;
    P.processing = null;
    const participant = S.admin.participants.find((p) => p.id === P.id);
    if (participant) participant.status = 'withdrawn';
    const acceptedCount = P.donations.length;
    S.admin.withdrawals.unshift({ id: 'wdr_' + E.fnv1a(requestedAt).toString(16).padStart(8, '0') + 'a1c3e5b7d9f02468', participantId: P.id, requestedAt, deadlineAt, status: 'received', reason: 'Not provided', deletionJob: null, acceptedDonations: acceptedCount, isNew: true });
    App.addAudit({ action: 'withdrawal.requested', actor: 'participant ' + P.id, subject: P.id, summary: 'Sessions and links revoked, queued email cancelled, upload authorizations expired, progress cleared. Deadline ' + E.formatDate(deadlineAt) + ' (30 business days, ' + project().timezone + ').' });
    renderParticipant();
    App.toast('Withdrawal received. Access revoked; deletion deadline ' + E.formatDate(deadlineAt) + '.');
  };

  App.views.participant = {
    render(sub) {
      if (sub && SCREENS[sub] && sub !== P.step) {
        // Deep links may only jump to screens the participant can legitimately reach.
        const allowed = sub === 'join' || sub === 'withdraw' || (sub === 'consent') || (P.consent.agreed && ['sources', 'done'].includes(sub)) || (P.activeSource && ['export', 'upload'].includes(sub)) || (P.work && ['choose', 'preview'].includes(sub));
        if (allowed) P.step = sub;
      }
      renderParticipant();
    },
    rerender: renderParticipant,
  };
})();
