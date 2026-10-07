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

  const STEPS = ['Review and consent', 'Your data sources', 'Add your file', 'Review and donate'];
  const STEP_INDEX = { consent: 0, sources: 1, export: 2, upload: 2, choose: 3, preview: 3 };
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
        'The live study uses a private participant link. This page simulates the invitation without authenticating anyone.',
        'Sources and requirements mirror the published collaborator study. All identities, records and receipts here are synthetic.',
      ],
      where: 'Token in the URL fragment, redeemed by a slug-scoped POST · server/src/routes/accessLinks.ts',
    },
    consent: {
      title: 'Consent is tied to a study version',
      bullets: [
        'The participant reads and signs a sample consent in this demo. The live collaborator workflow requires scrolling and a signature, with no comprehension questions.',
        'If the study later changes what it collects, the participant is asked again.',
      ],
      where: 'consent_events bound to project_release_id · server/src/consentService.ts',
    },
    sources: {
      title: 'Only what this study allows',
      bullets: [
        'TikTok and YouTube are required for Round 2. Instagram and Facebook are optional; each source has its own Start, Continue, or Completed status.',
        'Try the research team\'s System page: pausing a service greys its tile here at once.',
      ],
      where: 'shared/src/adapters/registry.ts · server/src/sourceCapabilityControl.ts',
    },
    export: {
      title: 'Checked instructions',
      bullets: [
        'A step-by-step guide for that app, checked against the app\'s current menus.',
        'The live study requests all dates and only its approved activity. This tour uses synthetic data and never reads an export.',
      ],
      where: 'exportGuide versions in shared/src/adapters/registry.ts · server/src/projectGuides.ts',
    },
    upload: {
      title: 'Nothing leaves the browser',
      bullets: [
        'The live product reads the export locally. This demo generates sample records instead of opening a real file.',
        'A replacement is staged. Cancel or failure keeps the original sample and choices; success requires a new confirmation.',
      ],
      where: 'shared/src/zip/safeUnzip.ts · pipeline.extractCandidatesFromFile · projectPolicy.applyProjectSourcePolicy',
    },
    choose: {
      title: 'Real choices, live fingerprint',
      bullets: [
        'All study-approved records and dates start included. Only individual record removal is offered.',
        'The fingerprint is computed from exactly what will be sent. Change anything and it changes; change it back and it returns.',
      ],
      where: 'SHA-256 of canonical JSON · shared/src/selection/engine.ts · client/src/worker/processor.worker.ts',
    },
    preview: {
      title: 'What you see is what is sent',
      bullets: [
        'The record list, canonical example payload and fingerprint describe the same synthetic selection.',
        'Confirm and donate simulates acceptance locally. No upload, server request, or real donation happens.',
      ],
      where: 'shared/src/pipeline.ts finalizeDonation · server/src/routes/donations.ts',
    },
    done: {
      title: 'Receipt, and what is next',
      bullets: [
        'The example receipt appears only after the local acceptance simulation finishes.',
        'This round needs TikTok and YouTube. Instagram and Facebook are optional. This collaborator study is unpaid.',
      ],
      where: 'recordCompensationEligibility in server/src/routes/donations.ts',
    },
    withdraw: {
      title: 'Withdrawal is immediate',
      bullets: [
        'Submitting cuts off access and starts the deletion clock (30 business days).',
        'Erasing data in the live product needs two staff members. This collaborator study is unpaid; this demo only simulates the workflow.',
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

  function roundDonations() {
    return P.donations.filter((donation) => donation.status === 'accepted' && donation.roundKey === S.round.roundKey);
  }

  function donatedIds() {
    return roundDonations().map((donation) => donation.platform);
  }

  function requiredMissing() {
    const donated = donatedIds();
    return App.requiredSourceIds().filter((id) => !donated.includes(id));
  }

  /** True when a material release was published after this participant consented. */
  function consentStale() {
    if (!P.consent.agreed) return false;
    if (P.consent.version !== release().consentVersion) return true;
    let current = release();
    const visited = new Set();
    while (current && !visited.has(current.id)) {
      if (current.id === P.consent.releaseId) return false;
      if (current.requiresReconsent) return true;
      visited.add(current.id);
      current = S.releases.find((item) => item.id === current.supersedesReleaseId);
    }
    return true;
  }

  function sourceAvailable(sourceId) {
    return App.donationSources().some((source) => source.id === sourceId) && !App.sourceSuspended(sourceId) && !donatedIds().includes(sourceId);
  }

  function workCurrent(work) {
    return Boolean(work && work.releaseId === S.activeReleaseId && work.roundId === S.round.id);
  }

  function participantReady() {
    return P.status !== 'withdrawn' && P.consent.agreed && !consentStale();
  }

  function roundComplete() {
    const required = App.requiredSourceIds();
    return required.length > 0 ? requiredMissing().length === 0 : roundDonations().length > 0;
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
    return '<div class="privacy-status" role="status">' + icon('shield-check') + '<span><strong>Synthetic, local demo only</strong>No real files are read, no data is uploaded, and no external posts are opened.</span></div>';
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

  let fileGeneration = 0;

  function makeWork(sourceId, fileName) {
    const narrowed = E.applyProjectSourcePolicy(D.generateCandidates(sourceId), App.releasePolicyFor(sourceId));
    return {
      sourceId, fileName, fileKey: sourceId + ':' + (++fileGeneration),
      extraction: narrowed, tally: narrowed.tally,
      policy: E.recordExclusionsOnlyPolicy(sourceId, narrowed.categories),
      apply: null, bytes: 0, hash: '', finalized: null, pendingFinalize: null,
      revision: 0, releaseId: S.activeReleaseId, roundId: S.round.id,
      sourcePolicySha256: App.hashesFor(S.activeReleaseId).sourcePolicy[sourceId],
    };
  }

  function commitWork(work) {
    P.work = work;
    P.ui.browse = {};
    P.ui.reviewOpen = false;
    P.ui.exactOpen = false;
    P.ui.previewPage = 0;
    P.ui.previewQuery = '';
    P.ui.previewCategory = '';
    P.ui.donateError = null;
    P.ui.fileError = null;
    recompute();
  }

  function recompute() {
    const work = P.work;
    if (!work) return;
    work.apply = E.applySelection(work.extraction.records, work.extraction.categories, work.policy);
    work.finalized = null;
    work.hash = '';
    work.pendingFinalize = null;
    P.ui.confirmed = false;
    void finalizeWork();
  }

  async function finalizeWork() {
    const work = P.work;
    if (!workCurrent(work)) return null;
    if (work.finalized) return work.finalized;
    if (work.pendingFinalize) return work.pendingFinalize;
    const revision = work.revision;
    const policy = JSON.parse(JSON.stringify(work.policy));
    const pending = E.finalize(work.extraction, policy, {
      adapterVersion: D.CAPABILITIES[work.sourceId].adapterVersion,
      projectReleaseId: work.releaseId,
      sourcePolicySha256: work.sourcePolicySha256,
      collectionRoundId: work.roundId,
      participantReviewMode: S.releases.find((item) => item.id === work.releaseId).participantReviewMode,
    }).then((finalized) => {
      if (P.work !== work || work.revision !== revision || work.releaseId !== S.activeReleaseId || work.roundId !== S.round.id) return null;
      work.finalized = finalized;
      work.hash = finalized.manifest.payloadSha256;
      work.bytes = finalized.payloadBytes.byteLength;
      refreshReview();
      return finalized;
    }).catch(() => {
      if (P.work === work && work.revision === revision) {
        P.ui.donateError = 'The synthetic review could not be prepared. Try the sample again.';
        refreshReview();
      }
      return null;
    }).finally(() => {
      if (work.pendingFinalize === pending) work.pendingFinalize = null;
    });
    work.pendingFinalize = pending;
    return pending;
  }

  function cancelProcessing() {
    const pending = P.processing;
    P.processing = null;
    if (pending && pending.cancel) pending.cancel();
  }

  function cancelDonation() {
    const pending = P.ui.donating;
    P.ui.donating = null;
    if (pending && pending.cancel) pending.cancel();
  }

  function reconcileParticipant() {
    if (P.processing && (!participantReady() || P.processing.releaseId !== S.activeReleaseId || P.processing.roundId !== S.round.id || P.processing.sourceId !== P.activeSource || !sourceAvailable(P.processing.sourceId))) {
      cancelProcessing();
      P.ui.fileError = 'The demo study or source changed. No replacement was made; your original file and choices remain available.';
    }
    if (P.ui.donating && (!participantReady() || !workCurrent(P.work) || !sourceAvailable(P.work.sourceId))) {
      cancelDonation();
      P.ui.donateError = 'The demo study or source changed. The donation simulation was canceled; no donation was accepted.';
    }
    if (!participantReady() || !workCurrent(P.work) || P.work && !sourceAvailable(P.work.sourceId)) P.ui.confirmed = false;
    if (P.status === 'withdrawn') {
      if (P.step !== 'withdraw') P.step = 'join';
      return;
    }
    if (P.consent.agreed && consentStale() && P.ui.consentDraftReleaseId !== S.activeReleaseId) {
      P.ui.consentDraftReleaseId = S.activeReleaseId;
      P.consent.scrolled = false;
      P.consent.signature = '';
      P.consent.answers = {};
    }
    if (['sources', 'export', 'upload', 'choose', 'preview'].includes(P.step) && !participantReady()) {
      P.step = 'consent';
      return;
    }
    if (P.step === 'choose') P.step = 'preview';
    if (P.step === 'preview') {
      if (!P.work || !sourceAvailable(P.work.sourceId)) P.step = 'sources';
      else if (!workCurrent(P.work)) {
        P.activeSource = P.work.sourceId;
        P.guideOnly = false;
        P.step = 'upload';
      }
    }
    if (['export', 'upload'].includes(P.step) && !sourceAvailable(P.activeSource)) {
      cancelProcessing();
      P.step = 'sources';
    }
  }

  function safeItemLink(record, category) {
    const included = category.fields.some((field) => field.id === 'contentRef');
    const value = record.fields.contentRef;
    if (!included || typeof value !== 'string') return null;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password ? value : null;
    } catch (_) {
      return null;
    }
  }

  function recordText(record, category) {
    const permitted = new Set(category.fields.map((field) => field.id));
    return Object.entries(record.fields).filter(([field]) => permitted.has(field))
      .map(([, value]) => String(value)).join(' · ') || 'Activity record';
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
      html += '<h1>Your study activity</h1><p class="lede">Continue when you are ready. This demo keeps synthetic progress only in page memory. In the live study, saved checkpoints never include your export file or unfinished choices.</p>';
      html += '<div class="card"><h2 style="font-size:1.05rem">' + esc(S.round.name) + '</h2><div class="progress-table">';
      for (const s of sources) {
        const donation = roundDonations().find((d) => d.platform === s.id);
        const suspended = App.sourceSuspended(s.id);
        html += '<div class="progress-row"><span class="source-icon">' + esc(s.letter) + '</span><strong>' + esc(s.displayName) + (required.includes(s.id) ? ' <span class="tile-badge required">Required</span>' : '') + '</strong>' +
          (donation ? '<span class="tile-badge done">Donated · ' + esc(donation.receiptCode) + '</span>' : suspended ? badge('suspended') : '<span class="muted small">Not yet</span>') + '</div>';
      }
      html += '</div>';
      const missing = requiredMissing();
      if (missing.length) html += '<div class="notice notice-info" style="margin-top:1rem">' + icon('info') + '<p>Collection round incomplete. Still needed: <strong>' + esc(missing.map(App.sourceName).join(', ')) + '</strong>.</p></div>';
      else if (roundDonations().length) html += '<div class="notice notice-success" style="margin-top:1rem">' + icon('check-circle') + '<p>Your required donations for this round are complete. Thank you.</p></div>';
      html += '</div>';
      const earlier = P.donations.filter((donation) => donation.status === 'accepted' && donation.roundKey !== S.round.roundKey);
      if (earlier.length) html += '<details><summary>Earlier-round example receipts (' + earlier.length + ')</summary><ul>' + earlier.map((donation) => '<li>' + esc(App.sourceName(donation.platform)) + ' · ' + esc(donation.receiptCode) + ' · ' + esc(donation.roundKey) + '</li>').join('') + '</ul><p class="small muted">These preserved examples do not count toward the current round.</p></details>';
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
    html += '<dl class="schedule-grid"><div><dt>Demo timing</dt><dd>Explore at your own pace</dd></div><div><dt>Donations close</dt><dd>' + esc(E.formatDate(pr.donationsCloseAt)) + '</dd></div><div><dt>Participant access ends</dt><dd>' + esc(E.formatDate(pr.participantAccessEndsAt)) + '</dd></div></dl>';
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
    html += '<h1>Research consent</h1><p class="notice notice-info">Sample consent only. Use an invented name; this page does not enroll you in the study.</p><p class="muted small">Consent version ' + esc(rel.consentVersion) + ' · study version ' + rel.version + '</p>';
    if (rel.participantDataScopeNotice) html += '<div class="notice notice-info"><p>' + esc(rel.participantDataScopeNotice) + '</p></div>';

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
    if (consent.questions.length) html += '<h2 style="font-size:1.05rem;margin-top:1.25rem">Check your understanding</h2>';
    for (const q of consent.questions) {
      const answer = c.answers[q.id];
      const state = answer === undefined ? '' : answer === q.correct ? 'is-correct' : 'is-wrong';
      html += '<fieldset class="question ' + state + '"><legend>' + esc(q.prompt) + '</legend>' +
        q.options.map((o) => '<label class="check-row"><input type="radio" name="' + q.id + '" value="' + o.id + '" data-change="consent-answer" data-q="' + q.id + '" ' + (answer === o.id ? 'checked' : '') + ' /><span class="check-text">' + esc(o.label) + '</span></label>').join('') +
        (answer === undefined ? '' : answer === q.correct ? '<div class="question-feedback ok">Correct.</div>' : '<div class="question-feedback bad">Not quite. Re-read the “What you share” section and try again.</div>') +
        '</fieldset>';
    }
    html += '<h2 style="font-size:1.05rem;margin-top:1.25rem">Electronic signature</h2><div class="signature-box"><label class="field-label" for="sig">Type your name to sign</label><input class="text-input input-sm" id="sig" type="text" placeholder="Demo Participant" value="' + esc(c.signature) + '" data-input="consent-signature" autocomplete="off" /><div class="xs muted" style="margin-top:0.3rem">Type an invented name only. This synthetic consent stays in page memory and is not a real agreement.</div></div>';
    const allCorrect = consent.questions.every((q) => c.answers[q.id] === q.correct);
    const ready = c.scrolled && allCorrect && c.signature.trim().length > 1;
    html += '<div class="screen-actions"><button type="button" class="btn btn-primary" data-action="p-consent-agree" ' + (ready ? '' : 'disabled') + '>I agree and want to take part</button><button type="button" class="btn btn-ghost" data-action="p-go" data-step="join">Back</button></div>';
    if (!ready) html += '<p class="xs muted" style="margin-top:0.5rem">To continue: ' + [!c.scrolled ? 'read to the end' : null, !allCorrect ? 'answer the questions correctly' : null, c.signature.trim().length <= 1 ? 'type your name' : null].filter(Boolean).join(' · ') + '.</p>';
    return html;
  }

  function screenSources() {
    const required = App.requiredSourceIds();
    const donated = donatedIds();
    let html = stepper(1) + privacyStatus() + '<h1>Your data sources</h1><p class="lede">Start with any source. TikTok and YouTube are required for this round; Instagram and Facebook are optional.</p><div class="platform-list">';
    for (const source of App.donationSources()) {
      const done = donated.includes(source.id);
      const suspended = App.sourceSuspended(source.id);
      const started = P.selectedSources.includes(source.id) || P.work && P.work.sourceId === source.id;
      html += '<article class="platform-tile simple-source' + (done ? ' is-done' : '') + (suspended ? ' is-suspended' : '') + '"><span class="source-icon">' + esc(source.letter) + '</span><div class="tile-body"><strong>' + esc(source.displayName) + '</strong><span>' + esc(source.description) + '</span><span class="tile-badge ' + (required.includes(source.id) ? 'required' : '') + '">' + (required.includes(source.id) ? 'Required' : 'Optional') + '</span>' + (done ? '<span>Completed for this collection round.</span>' : suspended ? '<span>Temporarily unavailable in this demo.</span>' : '') + '</div>' +
        (done ? '<span class="tile-badge done">Completed</span>' : '<button type="button" class="btn btn-primary" data-action="p-open-source" data-source="' + source.id + '" ' + (suspended ? 'disabled' : '') + '>' + (started ? 'Continue ' : 'Start ') + esc(source.displayName) + '</button>') + '</article>';
    }
    html += '</div><div class="screen-actions"><button type="button" class="btn btn-ghost" data-action="p-go" data-step="join">Study overview and receipts</button></div>';
    return html;
  }

  function screenExport() {
    const source = D.sourceById(P.activeSource);
    const guide = source.exportGuide;
    const unavailable = P.guideOnly || App.sourceSuspended(source.id);
    let html = stepper(2) + privacyStatus() + '<h1>Get your ' + esc(source.displayName) + ' data</h1>';
    if (!unavailable) html += '<div class="card simple-shortcut"><p>Already have your export? The next screen uses a synthetic sample only.</p><button type="button" class="btn btn-primary" data-action="p-go" data-step="upload">I already have my file</button></div>';
    html += '<p class="lede">' + esc(guide.intro) + '</p>';
    if (unavailable) html += '<p class="notice notice-warn">This source has download instructions only; adding a file is unavailable.</p>';
    html += '<ol class="steplist">' + guide.steps.map((step) => '<li><span><strong>' + esc(step.title) + '</strong><span>' + esc(step.detail) + '</span></span></li>').join('') + '</ol><div class="notice">' + icon('hourglass') + '<p>' + esc(guide.wait) + '</p></div><div class="screen-actions"><button type="button" class="btn btn-ghost" data-action="p-go" data-step="sources">Back to sources</button></div>';
    return html;
  }

  function screenUpload() {
    const source = D.sourceById(P.activeSource);
    const original = P.work;
    const processing = P.processing;
    let html = stepper(2) + privacyStatus() + '<h1>' + (original ? 'Change' : 'Add') + ' your ' + esc(source.displayName) + ' file</h1><p class="lede">In the live study, you add one unchanged export file and review it on your device. This offline tour uses generated samples only: do not select or drop a real file.</p>';
    if (original) html += '<div class="card simple-current-file"><strong>Current file</strong><p>' + esc(original.fileName) + '</p><p class="small muted">Your file and choices stay unchanged until a replacement succeeds.</p></div>';
    if (original && !workCurrent(original)) html += '<div class="notice notice-warn" role="status">The study version or collection round changed. Add a new synthetic sample for the current study before donating. The previous sample and choices are preserved until replacement succeeds.</div>';
    if (P.ui.fileError) html += '<div class="notice notice-danger" role="alert">' + esc(P.ui.fileError) + '</div>';
    if (App.sourceSuspended(source.id)) {
      html += '<p class="notice notice-warn">This source is temporarily unavailable.</p>';
    } else if (processing) {
      html += '<section class="card" aria-label="Synthetic processing"><p role="status"><span class="spinner"></span> ' + esc(STAGE_LABELS[processing.stage]) + '</p><p class="small muted">Local simulation only. No real archive is read.</p><button type="button" class="btn btn-secondary" data-action="p-cancel-processing">Cancel processing</button></section>';
    } else {
      html += '<div class="upload-zone"><span class="flow-step-icon">' + icon('file-up', 'ico-lg') + '</span><p>Use a synthetic ' + esc(source.displayName) + ' sample.</p><button type="button" class="btn btn-primary" data-action="p-add-sample">' + (original ? 'Choose a different synthetic file' : 'Add synthetic sample file') + '</button><p class="small muted">Nothing is uploaded or saved outside this page.</p>' + (original ? '<button type="button" class="btn btn-ghost" data-action="p-invalid-sample">Try an invalid synthetic file</button>' : '') + '</div>';
    }
    html += '<div class="screen-actions">' + (original ? '<button type="button" class="btn btn-secondary" data-action="p-back-review">Back to review</button>' : '') + '<button type="button" class="btn btn-ghost" data-action="p-go" data-step="sources">Back to sources</button></div>';
    return html;
  }

  function summaryHtml() {
    const work = P.work;
    const counts = work.apply.counts;
    const dates = counts.dateRange;
    return '<div class="simple-count"><strong>' + E.formatNumber(counts.totalSelected) + '</strong> ' + (counts.totalSelected === 1 ? 'record' : 'records') + ' selected<span>' + (counts.totalParticipantExcluded ? E.formatNumber(counts.totalParticipantExcluded) + ' removed' : 'All study-requested records included') + '</span></div>' +
      '<p class="small muted simple-update" role="status">' + (work.finalized ? 'Review is up to date.' : 'Updating the synthetic review…') + '</p>' +
      '<p><strong>Activity dates:</strong> ' + (dates.from ? esc(E.formatDate(dates.from)) + ' – ' + esc(E.formatDate(dates.to)) : 'No dated records selected') + '</p>' +
      '<dl class="simple-fields">' + work.extraction.categories.map((category) => {
        const count = counts.byCategory[category.id];
        return '<div><dt>' + esc(category.label) + ' · ' + E.formatNumber(count.selected) + ' ' + (count.selected === 1 ? 'record' : 'records') + '</dt><dd>' + esc(category.fields.map((field) => field.label).join(', ')) + (count.selected ? '' : ' (no records selected)') + '</dd></div>';
      }).join('') + '</dl><p class="small muted">All available dates are included. The study determines the details listed above; you can remove individual records below.</p>';
  }

  function browseState(categoryId) {
    return P.ui.browse[categoryId] || (P.ui.browse[categoryId] = { query: '', page: 0 });
  }

  function browseListHtml(categoryId) {
    const work = P.work;
    const category = work.extraction.categories.find((item) => item.id === categoryId);
    const browser = browseState(categoryId);
    const query = browser.query.trim().toLowerCase();
    const records = work.extraction.records.filter((record) => record.category === categoryId && (!query || E.recordSearchText(record).includes(query)));
    records.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '') || a.localId.localeCompare(b.localId));
    const pages = Math.max(1, Math.ceil(records.length / BROWSE_PAGE));
    browser.page = Math.min(browser.page, pages - 1);
    const offset = browser.page * BROWSE_PAGE;
    const rows = records.slice(offset, offset + BROWSE_PAGE);
    const excluded = new Set(work.policy.recordOverrides.excluded);
    return '<p class="small muted" role="status">' + E.formatNumber(records.length) + ' matching records</p><ul class="simple-record-list">' + rows.map((record, index) => {
      const included = !excluded.has(record.localId);
      const ref = safeItemLink(record, category);
      const text = recordText(record, category);
      const inputId = 'include-' + work.fileKey.replace(/[^a-z0-9]/gi, '-') + '-' + categoryId + '-' + (offset + index);
      const link = ref ? '<button type="button" class="link-btn simple-item-link" data-url="' + esc(ref) + '" data-action="p-open-item">' + (text === ref ? esc(ref) : 'Preview example link') + '<span class="visually-hidden"> (local demo explanation; no external post opened)</span></button>' : '';
      return '<li data-record="' + esc(record.localId) + '" class="' + (included ? '' : 'is-excluded') + '"><input id="' + esc(inputId) + '" type="checkbox" data-change="p-record" data-id="' + esc(record.localId) + '" aria-label="Include record ' + (offset + index + 1) + ': ' + esc(text.slice(0, 100)) + '" ' + (included ? 'checked' : '') + ' ' + (P.ui.donating ? 'disabled' : '') + ' /><div><time datetime="' + esc(record.timestamp || '') + '">' + esc(record.timestamp ? E.formatDateTime(record.timestamp) : 'Date unavailable') + '</time>' + (text === ref ? link : '<span class="simple-record-value">' + esc(text) + '</span>' + link) + '<label class="record-inclusion" for="' + esc(inputId) + '">' + (included ? 'Included' : 'Removed — check to restore') + '</label></div></li>';
    }).join('') + '</ul>' + (rows.length ? '' : '<p>No records match.</p>') +
      '<nav class="pager" aria-label="Individual record pages"><span>Page ' + (browser.page + 1) + ' of ' + pages + '</span><span class="btn-row"><button type="button" class="btn btn-secondary btn-sm" data-action="p-browse-page" data-cat="' + categoryId + '" data-dir="-1" ' + (browser.page === 0 ? 'disabled' : '') + '>Previous</button><button type="button" class="btn btn-secondary btn-sm" data-action="p-browse-page" data-cat="' + categoryId + '" data-dir="1" ' + (browser.page + 1 >= pages ? 'disabled' : '') + '>Next</button></span></nav>';
  }

  function individualBrowserHtml() {
    const work = P.work;
    const categories = work.extraction.categories.filter((category) => work.extraction.records.some((record) => record.category === category.id));
    if (!categories.some((category) => category.id === P.ui.browseCategory)) P.ui.browseCategory = categories[0] && categories[0].id;
    const category = categories.find((entry) => entry.id === P.ui.browseCategory);
    if (!category) return '<p>No study-requested records were found in this sample.</p>';
    const browser = browseState(category.id);
    const searchLabel = category.fields.some((field) => field.id === 'searchTerm') ? 'Search your search history' : category.fields.some((field) => field.id === 'title' || field.id === 'channelName') ? 'Search titles, channel names, or links' : 'Find an item by link or ID';
    return '<p>Uncheck an item to leave it out. Check it again to restore it. Search stays on this page.</p>' +
      (categories.length > 1 ? '<label class="field-label" for="record-category">Show activity</label><select id="record-category" class="select-input" data-change="p-record-category">' + categories.map((entry) => '<option value="' + entry.id + '" ' + (entry.id === category.id ? 'selected' : '') + '>' + esc(entry.label) + '</option>').join('') + '</select>' : '') +
      '<label class="field-label" for="record-search">' + esc(searchLabel) + '</label><input id="record-search" type="search" class="text-input" data-input="p-browse-query" data-cat="' + category.id + '" value="' + esc(browser.query) + '" maxlength="200" /><div id="individual-records">' + browseListHtml(category.id) + '</div>';
  }

  function previewListHtml() {
    if (!P.work) return '';
    const query = (P.ui.previewQuery || '').trim().toLowerCase();
    const records = P.work.apply.payloadRecords.filter((record) => (!P.ui.previewCategory || record.category === P.ui.previewCategory) && (!query || JSON.stringify(record).toLowerCase().includes(query)));
    const pages = Math.max(1, Math.ceil(records.length / PREVIEW_PAGE));
    P.ui.previewPage = Math.min(P.ui.previewPage || 0, pages - 1);
    const offset = P.ui.previewPage * PREVIEW_PAGE;
    return '<p class="small muted">' + E.formatNumber(records.length) + ' outgoing records</p><div class="record-list">' +
      records.slice(offset, offset + PREVIEW_PAGE).map((record) => '<pre class="preview-record">' + esc(JSON.stringify(record, null, 2)) + '</pre>').join('') + '</div>' +
      '<nav class="pager" aria-label="Exact data pages"><span>Page ' + (P.ui.previewPage + 1) + ' of ' + pages + '</span><span class="btn-row"><button type="button" class="btn btn-secondary btn-sm" data-action="p-preview-page" data-dir="-1" ' + (P.ui.previewPage === 0 ? 'disabled' : '') + '>Previous</button><button type="button" class="btn btn-secondary btn-sm" data-action="p-preview-page" data-dir="1" ' + (P.ui.previewPage + 1 >= pages ? 'disabled' : '') + '>Next</button></span></nav>';
  }

  function exactBrowserHtml() {
    return '<p class="small muted">Canonical example records only. Original archives, search-box text and local record IDs are not included.</p><label class="field-label" for="exact-search">Search the outgoing records</label><input id="exact-search" type="search" class="text-input" data-input="p-preview-query" value="' + esc(P.ui.previewQuery || '') + '" /><div id="preview-list">' + previewListHtml() + '</div><details><summary>Technical receipt details</summary><dl class="kv"><dt>SHA-256</dt><dd id="hash-value" class="mono">' + esc(P.work.hash || 'Calculating…') + '</dd><dt>Release and round</dt><dd class="mono">' + esc(P.work.releaseId) + ' · ' + esc(P.work.roundId) + '</dd></dl></details>';
  }

  function donationReady() {
    return Boolean(participantReady() && workCurrent(P.work) && sourceAvailable(P.work.sourceId) && P.work.finalized && P.work.apply.counts.totalSelected > 0 && P.work.bytes <= MAX_PAYLOAD_BYTES && !P.processing && !P.ui.donating);
  }

  function screenPreview() {
    const work = P.work;
    if (!work) return stepper(3) + privacyStatus() + '<h1>Add your sample to continue</h1><button class="btn btn-primary" data-action="p-go" data-step="upload">Add synthetic file</button>';
    const source = D.sourceById(work.sourceId);
    if (!work.finalized && !work.pendingFinalize) void finalizeWork();
    let html = stepper(3) + privacyStatus() + '<h1>Your ' + esc(source.displayName) + ' donation is ready</h1><section class="simple-current-file" aria-label="Current file"><p><strong>File:</strong> ' + esc(work.fileName) + '</p><div class="screen-actions"><button type="button" class="btn btn-secondary" data-action="p-change-file" ' + (P.ui.donating ? 'disabled' : '') + '>Change file</button><button type="button" class="btn btn-ghost" data-action="p-go" data-step="sources" ' + (P.ui.donating ? 'disabled' : '') + '>Back to sources</button></div></section><p>Start with all study-requested activity in the synthetic file. Remove individual items if you wish.</p><section id="donation-summary" class="card simple-summary" aria-label="Donation summary">' + summaryHtml() + '</section>';
    html += '<details id="individual-review" class="simple-review-disclosure" ' + (P.ui.reviewOpen ? 'open' : '') + '><summary>Review or remove individual items</summary><div id="individual-browser">' + (P.ui.reviewOpen ? individualBrowserHtml() : '') + '</div></details><details id="exact-review" class="simple-review-disclosure" ' + (P.ui.exactOpen ? 'open' : '') + '><summary>View exact data being donated</summary><div id="exact-browser-content">' + (P.ui.exactOpen ? exactBrowserHtml() : '') + '</div></details>';
    html += '<p id="review-feedback" class="small" role="status">' + reviewFeedback() + '</p>';
    if (P.ui.donating) {
      const labels = ['Simulating donation creation…', 'Simulating upload — no bytes leave this page…', 'Simulating verification…', 'Simulation accepted'];
      html += '<p role="status">' + esc(labels[P.ui.donating.stage]) + '</p>';
    }
    html += '<label class="final-confirmation check-row"><input id="donation-confirm" type="checkbox" data-change="p-confirm" ' + (P.ui.confirmed ? 'checked' : '') + ' ' + (donationReady() ? '' : 'disabled') + ' /><span>I agree to donate the selected records and included information to the research team. <small>This button only simulates a donation in this demo.</small></span></label><div class="screen-actions"><button type="button" class="btn btn-primary" data-action="p-donate" ' + (donationReady() && P.ui.confirmed ? '' : 'disabled') + '>' + (P.ui.donating ? 'Simulating donation…' : 'Confirm and donate') + '</button></div>';
    return html;
  }

  function reviewFeedback() {
    const work = P.work;
    if (P.ui.donateError) return esc(P.ui.donateError);
    if (!work.apply.counts.totalSelected) return 'No records are selected. Restore individual items to continue.';
    if (work.bytes > MAX_PAYLOAD_BYTES) return 'This selection is too large. Remove individual items before continuing.';
    const warnings = work.finalized ? work.finalized.manifest.warningCounts : {};
    const duplicateCount = warnings.duplicate_activity_entry || 0;
    return duplicateCount ? E.formatNumber(duplicateCount) + ' duplicate records removed from this synthetic example.' : '';
  }

  function refreshReview() {
    if (P.step !== 'preview' || !P.work) return;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const summary = document.getElementById('donation-summary');
    if (summary) {
      summary.style.minHeight = summary.offsetHeight + 'px';
      summary.innerHTML = summaryHtml();
      summary.style.minHeight = summary.offsetHeight + 'px';
    }
    const exact = document.getElementById('preview-list');
    if (exact) {
      exact.style.minHeight = exact.offsetHeight + 'px';
      exact.innerHTML = previewListHtml();
    }
    const hash = document.getElementById('hash-value');
    if (hash) hash.textContent = P.work.hash || 'Calculating…';
    const confirm = document.getElementById('donation-confirm');
    if (confirm) {
      confirm.checked = P.ui.confirmed;
      confirm.disabled = !donationReady();
    }
    const button = document.querySelector('[data-action="p-donate"]');
    if (button) button.disabled = !(donationReady() && P.ui.confirmed);
    const feedback = document.getElementById('review-feedback');
    if (feedback) feedback.innerHTML = reviewFeedback();
    window.scrollTo(scrollX, scrollY);
  }

  function screenDone() {
    const donations = roundDonations();
    const last = donations[donations.length - 1];
    const missing = requiredMissing();
    let html = miniHeader() + privacyStatus();
    if (!last) return html + '<h1>No donation in this round yet</h1><button class="btn btn-primary" data-action="p-go" data-step="sources">View this round’s sources</button>';
    html += '<h1>Thank you for your donation</h1><p class="lede">This was a local simulation. No information was sent to a research team.</p><section class="card"><h2>Your example receipt</h2><dl class="receipt-list"><dt>Receipt code</dt><dd>' + esc(last.receiptCode) + '</dd><dt>Source</dt><dd>' + esc(App.sourceName(last.platform)) + '</dd><dt>Records</dt><dd>' + E.formatNumber(last.records) + '</dd><dt>Collection round</dt><dd>' + esc(S.round.name) + '</dd><dt>Fingerprint</dt><dd>' + esc(E.shortHash(last.sha256, 12, 8)) + '</dd></dl></section>';
    html += missing.length ? '<p class="notice notice-info">Still required this round: ' + esc(missing.map(App.sourceName).join(', ')) + '.</p>' : '<p class="notice notice-success">The required sources for this round are complete. Instagram and Facebook remain optional.</p>';
    html += '<div class="screen-actions"><button class="btn btn-primary" data-action="p-go" data-step="sources">View this round’s sources</button><button class="btn btn-secondary" data-action="p-go" data-step="join">Study overview and receipts</button><button class="btn btn-ghost" data-action="p-go" data-step="withdraw">Withdrawal options</button></div>';
    return html;
  }

  function screenWithdraw() {
    let html = miniHeader() + privacyStatus() + '<h1>Withdraw from the study</h1>';
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

  const SCREENS = { join: screenJoin, consent: screenConsent, sources: screenSources, export: screenExport, upload: screenUpload, choose: screenPreview, preview: screenPreview, done: screenDone, withdraw: screenWithdraw };

  function renderParticipant() {
    reconcileParticipant();
    if (S.route.view !== 'participant') return;
    const mount = document.getElementById('device-screen');
    if (!mount) return;
    if (!SCREENS[P.step]) P.step = 'join';
    mount.innerHTML = SCREENS[P.step]();
    if (P.step === 'preview' && P.work) {
      const individual = document.getElementById('individual-review');
      const exact = document.getElementById('exact-review');
      individual.addEventListener('toggle', () => {
        if (!document.contains(individual) || !P.work || P.step !== 'preview') return;
        P.ui.reviewOpen = individual.open;
        const content = document.getElementById('individual-browser');
        if (individual.open && !content.hasChildNodes()) content.innerHTML = individualBrowserHtml();
      });
      exact.addEventListener('toggle', () => {
        if (!document.contains(exact) || !P.work || P.step !== 'preview') return;
        P.ui.exactOpen = exact.open;
        const content = document.getElementById('exact-browser-content');
        if (exact.open && !content.hasChildNodes()) content.innerHTML = exactBrowserHtml();
      });
    }
    const url = document.getElementById('device-url');
    if (url) url.innerHTML = '<span class="device-lock">' + icon('lock', 'ico-sm') + '</span> datadonate.example<b>/p/' + esc(project().slug) + '/' + esc(ROUTE_PATH[P.step]) + (P.activeSource && (P.step === 'export' || P.step === 'upload') ? '/' + esc(P.activeSource) : '') + '</b>';
    const notes = NOTES[P.step];
    const notesEl = document.getElementById('tour-notes');
    if (notesEl && notes) {
      notesEl.innerHTML = '<span class="eyebrow">What is happening</span><h2>' + icon('info', 'ico-sm') + esc(notes.title) + '</h2><ul>' + notes.bullets.map((b) => '<li>' + esc(b) + '</li>').join('') + '</ul><details class="where" style="border:0;padding:0;background:transparent;margin:0"><summary style="padding:0.25rem 0;font-size:var(--font-size-xs);color:var(--color-text-muted)">For technical readers</summary><code>' + esc(notes.where) + '</code></details>';
    }
    if (P.step === 'consent' && (!P.consent.agreed || consentStale())) {
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

  App.actions['p-go'] = (element) => {
    let step = element.dataset.step;
    if (step === 'choose') step = 'preview';
    if (step === 'sources' && (!P.consent.agreed || consentStale())) return go('consent');
    if (step === 'consent' && P.consent.agreed && !consentStale()) return go('sources');
    if (P.ui.donating) return;
    if (step !== 'upload') cancelProcessing();
    go(step);
  };

  App.actions['p-clear'] = () => {
    cancelProcessing();
    P.work = null;
    P.ui.confirmed = false;
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
    if (P.status === 'withdrawn' || P.step !== 'consent') return;
    if (!P.consent.scrolled || !D.CONSENT.questions.every((question) => P.consent.answers[question.id] === question.correct) || P.consent.signature.trim().length < 2) return;
    const rng = E.mulberry32(Date.now() & 0xffffffff);
    P.consent.agreed = true;
    P.consent.recordedAt = App.nowIso();
    P.consent.receiptCode = E.receiptCode(rng).replace('DD-', 'CR-');
    P.consent.releaseId = rel.id;
    P.consent.version = rel.consentVersion;
    P.consent.scrolled = false;
    const participant = S.admin.participants.find((p) => p.id === P.id);
    if (participant) {
      participant.consentVersion = rel.consentVersion;
      participant.consentReleaseId = rel.id;
    }
    App.addAudit({ action: 'consent.recorded', actor: 'participant ' + P.id, subject: P.consent.receiptCode, summary: 'Consent ' + rel.consentVersion + ' recorded for release ' + rel.id + ' (synthetic scroll evidence and typed example signature).' });
    App.toast('Consent recorded · receipt ' + P.consent.receiptCode);
    go('sources');
  };
  App.actions['p-download-consent'] = () => App.toast('In the product this downloads the version-matched receipt PDF generated from the recorded consent evidence.');

  App.actions['p-open-source'] = (element) => {
    const sourceId = element.dataset.source;
    if (P.ui.donating || P.status === 'withdrawn') return;
    if (!P.consent.agreed || consentStale()) return go('consent');
    if (!sourceAvailable(sourceId)) return go('sources');
    cancelProcessing();
    P.activeSource = sourceId;
    P.guideOnly = false;
    P.ui.fileError = null;
    if (!P.selectedSources.includes(sourceId)) P.selectedSources.push(sourceId);
    go(P.work && P.work.sourceId === sourceId ? 'preview' : 'export');
  };
  App.actions['p-continue-source'] = App.actions['p-open-source'];
  App.actions['p-guide'] = (element) => {
    if (!participantReady()) return go('consent');
    if (!sourceAvailable(element.dataset.source) || P.ui.donating) return;
    cancelProcessing();
    P.activeSource = element.dataset.source;
    P.guideOnly = false;
    go('export');
  };
  App.actions['p-change-file'] = () => {
    if (!P.work || P.ui.donating) return;
    P.activeSource = P.work.sourceId;
    P.guideOnly = false;
    P.ui.fileError = null;
    go('upload');
  };
  App.actions['p-back-review'] = () => {
    cancelProcessing();
    if (P.work) P.activeSource = P.work.sourceId;
    go(P.work ? 'preview' : 'sources');
  };

  async function startSample(invalid) {
    const source = D.sourceById(P.activeSource);
    if (!participantReady() || !source || !sourceAvailable(source.id) || P.step !== 'upload' || P.processing || P.ui.donating) return renderParticipant();
    const original = P.work;
    const releaseId = S.activeReleaseId;
    const roundId = S.round.id;
    if (original) {
      const result = await App.dialog({
        title: 'Replace this file?',
        body: '<p>Try ' + esc(invalid ? 'an invalid synthetic file' : source.fileName) + '? Your current file and choices stay available until the replacement succeeds. Successful replacement resets choices and donation confirmation.</p>',
        confirmLabel: 'Use this file',
      });
      if (!result.ok || P.work !== original || P.step !== 'upload' || P.activeSource !== source.id) return;
    }
    if (!participantReady() || releaseId !== S.activeReleaseId || roundId !== S.round.id || !sourceAvailable(source.id)) return renderParticipant();
    P.ui.fileError = null;
    const processing = { stage: 'opening', cancel: null, releaseId, roundId, sourceId: source.id };
    P.processing = processing;
    renderParticipant();
    const stage = (value) => {
      reconcileParticipant();
      if (P.processing !== processing) return;
      processing.stage = value;
      renderParticipant();
    };
    processing.cancel = App.sequence([
      { delay: 400, run: () => stage('finding') },
      { delay: 400, run: () => stage('removing') },
      { delay: 400, run: () => stage('preparing') },
      { delay: 400, run: () => {
        reconcileParticipant();
        if (P.processing !== processing || P.activeSource !== source.id) return;
        try {
          if (invalid) throw new Error('The synthetic example is not a valid export for this source.');
          const candidate = makeWork(source.id, source.fileName);
          P.processing = null;
          commitWork(candidate);
          go('preview');
        } catch (error) {
          P.processing = null;
          P.ui.fileError = error.message + (original ? ' Your original file and choices are unchanged.' : ' No file was added.');
          renderParticipant();
        }
      } },
    ]);
  }
  App.actions['p-add-sample'] = () => startSample(false);
  App.actions['p-invalid-sample'] = () => startSample(true);
  App.actions['p-cancel-processing'] = () => {
    cancelProcessing();
    renderParticipant();
    App.toast(P.work ? 'Canceled. Your original file and choices are unchanged.' : 'Canceled. No sample was added.');
  };

  App.actions['p-open-item'] = (element) => App.dialog({
    title: 'Example link—no external post opened',
    body: '<p>The live study opens the supplied item link separately from the selection checkbox. Its availability may depend on the platform and your access. This offline demo does not contact the platform.</p><p class="mono simple-example-link">' + esc(element.dataset.url) + '</p>',
    confirmLabel: 'Back to review',
    cancelLabel: 'Close',
  });
  App.changes['p-record-category'] = (element) => {
    P.ui.browseCategory = element.value;
    document.getElementById('individual-browser').innerHTML = individualBrowserHtml();
    document.getElementById('record-category').focus({ preventScroll: true });
  };
  App.inputs['p-browse-query'] = (element) => {
    const browser = browseState(element.dataset.cat);
    browser.query = element.value;
    browser.page = 0;
    document.getElementById('individual-records').innerHTML = browseListHtml(element.dataset.cat);
  };
  App.actions['p-browse-page'] = (element) => {
    const browser = browseState(element.dataset.cat);
    browser.page = Math.max(0, browser.page + Number(element.dataset.dir));
    document.getElementById('individual-records').innerHTML = browseListHtml(element.dataset.cat);
    const next = document.querySelector('#individual-records [data-dir="' + element.dataset.dir + '"]');
    if (next && !next.disabled) next.focus({ preventScroll: true });
  };
  App.changes['p-record'] = (element) => {
    const work = P.work;
    if (!work || P.ui.donating || !work.extraction.records.some((record) => record.localId === element.dataset.id)) return;
    const excluded = new Set(work.policy.recordOverrides.excluded);
    if (element.checked) excluded.delete(element.dataset.id);
    else excluded.add(element.dataset.id);
    work.policy = E.recordExclusionsOnlyPolicy(work.sourceId, work.extraction.categories, Array.from(excluded));
    work.revision += 1;
    recompute();
    // Keep the actual checkbox and row mounted: no jump, focus loss, or page reset.
    const row = element.closest('li');
    row.classList.toggle('is-excluded', !element.checked);
    row.querySelector('.record-inclusion').textContent = element.checked ? 'Included' : 'Removed — check to restore';
    refreshReview();
  };
  App.inputs['p-preview-query'] = (element) => {
    P.ui.previewQuery = element.value;
    P.ui.previewPage = 0;
    document.getElementById('preview-list').innerHTML = previewListHtml();
  };
  App.actions['p-preview-page'] = (element) => {
    P.ui.previewPage = Math.max(0, P.ui.previewPage + Number(element.dataset.dir));
    document.getElementById('preview-list').innerHTML = previewListHtml();
  };
  App.actions['p-to-preview'] = () => go('preview');
  App.changes['p-confirm'] = (element) => {
    P.ui.confirmed = element.checked && donationReady();
    refreshReview();
  };

  App.actions['p-donate'] = () => {
    const work = P.work;
    if (!donationReady() || !P.ui.confirmed || P.ui.donating) return renderParticipant();
    if (consentStale() || work.releaseId !== S.activeReleaseId || work.roundId !== S.round.id) {
      P.ui.donateError = 'The demo study changed. Review the current consent and add the sample again.';
      go('consent');
      return;
    }
    if (App.sourceSuspended(work.sourceId) || donatedIds().includes(work.sourceId)) {
      P.ui.donateError = 'This source is unavailable or already completed for this round.';
      P.ui.confirmed = false;
      refreshReview();
      return;
    }
    const finalized = work.finalized;
    const round = Object.assign({}, S.round);
    const donationState = { stage: 0, cancel: null };
    P.ui.donating = donationState;
    renderParticipant();
    const current = () => {
      reconcileParticipant();
      return P.ui.donating === donationState && P.work === work && S.round.id === round.id && S.activeReleaseId === work.releaseId;
    };
    const stage = (value) => {
      if (!current()) return;
      donationState.stage = value;
      renderParticipant();
    };
    donationState.cancel = App.sequence([
      { delay: 600, run: () => stage(1) },
      { delay: 600, run: () => stage(2) },
      { delay: 600, run: () => stage(3) },
      { delay: 300, run: () => {
        if (!current()) return;
        const scope = P.id + ':' + round.id + ':' + finalized.manifest.payloadSha256;
        const rng = E.mulberry32(E.fnv1a(scope));
        const id = 'don_demo_' + E.fnv1a(scope).toString(16) + '_' + finalized.manifest.payloadSha256.slice(0, 12);
        const receiptCode = E.receiptCode(rng);
        const createdAt = App.nowIso();
        const donation = { id, platform: work.sourceId, records: finalized.counts.totalSelected, payloadBytes: finalized.payloadBytes.byteLength, sha256: finalized.manifest.payloadSha256, receiptCode, createdAt, manifest: finalized.manifest, releaseId: work.releaseId, roundKey: round.roundKey, status: 'accepted' };
        P.donations.push(donation);
        const complete = roundComplete();
        S.admin.donations.unshift(Object.assign({}, donation, { participantId: P.id, isNew: true }));
        const participant = S.admin.participants.find((person) => person.id === P.id);
        if (participant) participant.rounds[round.roundKey] = complete ? 'complete' : 'partial';
        App.addAudit({ action: 'donation.accepted', actor: 'synthetic participant ' + P.id, subject: id, summary: 'Local simulation: ' + App.sourceName(work.sourceId) + ', ' + E.formatNumber(donation.records) + ' records; ' + round.name + (complete ? ' required sources complete.' : ' remains in progress.') });
        S.server.donation = { id, platform: work.sourceId, records: donation.records, payloadBytes: donation.payloadBytes, sha256: donation.sha256, releaseId: work.releaseId, policyHash: work.sourcePolicySha256 || '', receiptCode, roundComplete: complete, seeded: false };
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
        P.selectedSources = P.selectedSources.filter((id) => id !== work.sourceId);
        go('done');
      } },
    ]);
  };

  App.actions['p-withdraw'] = async () => {
    const result = await App.dialog({ title: 'Simulate a withdrawal request?', body: '<p>This local example ends synthetic participant access and starts a simulated deletion request with a ' + esc('30 business day') + ' deadline. It does not contact the research team or change real data.</p>', confirmLabel: 'Yes, simulate withdrawal', danger: true });
    if (!result.ok) return;
    cancelProcessing();
    cancelDonation();
    const requestedAt = App.nowIso();
    const deadlineAt = App.addBusinessDays(requestedAt, 30);
    P.withdrawal = { requestedAt, deadlineAt };
    P.status = 'withdrawn';
    P.work = null;
    P.processing = null;
    const participant = S.admin.participants.find((p) => p.id === P.id);
    if (participant) participant.status = 'withdrawn';
    const acceptedCount = P.donations.filter((donation) => donation.status === 'accepted').length;
    S.admin.withdrawals.unshift({ id: 'wdr_' + E.fnv1a(requestedAt).toString(16).padStart(8, '0') + 'a1c3e5b7d9f02468', participantId: P.id, requestedAt, deadlineAt, status: 'received', reason: 'Not provided', deletionJob: null, acceptedDonations: acceptedCount, isNew: true });
    App.addAudit({ action: 'withdrawal.requested', actor: 'participant ' + P.id, subject: P.id, summary: 'Sessions and links revoked, queued email cancelled, upload authorizations expired, progress cleared. Deadline ' + E.formatDate(deadlineAt) + ' (30 business days, ' + project().timezone + ').' });
    renderParticipant();
    App.toast('Withdrawal received. Access revoked; deletion deadline ' + E.formatDate(deadlineAt) + '.');
  };

  App.views.participant = {
    render(sub) {
      if (sub && SCREENS[sub] && sub !== P.step) {
        if (sub !== 'upload') cancelProcessing();
        if (!['choose', 'preview'].includes(sub)) cancelDonation();
        P.step = sub;
      }
      // Every route, including bookmarks, uses the same current study/source guards.
      renderParticipant();
    },
    rerender: renderParticipant,
  };
})();
