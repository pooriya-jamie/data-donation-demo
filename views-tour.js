/*
 * DataDonate demo — Overview, Server pipeline and Architecture views
 */
(function () {
  'use strict';
  const App = window.App;
  const { E, D, S, esc, icon, badge } = App;

  /* ================================================================== */
  /* Overview                                                            */
  /* ================================================================== */

  const CEILING_SOURCES = ['tiktok', 'youtube', 'chatgpt'];

  function chip(key, label, state, title) {
    return (
      '<span class="chip ' + state + '" data-chip="' + esc(key) + '" tabindex="0" title="' + esc(title || '') + '">' +
      esc(label) +
      '</span>'
    );
  }

  function renderCeilings() {
    const mount = document.getElementById('ceilings-widget');
    if (!mount) return;
    const sourceId = S.overview.ceilingSource;
    const source = D.sourceById(sourceId);
    const capability = D.CAPABILITIES[sourceId];
    const policy = App.releasePolicyFor(sourceId);
    const release = App.activeRelease();
    const projectDescriptors = E.projectCategoryDescriptors(capability.categories, policy);
    const participantPolicy = E.defaultPolicy(sourceId, projectDescriptors);

    const seg =
      '<div class="seg" role="group" aria-label="Source">' +
      CEILING_SOURCES.map(
        (id) =>
          '<button type="button" class="seg-btn" data-action="ceiling-source" data-source="' + id + '" aria-pressed="' + (id === sourceId) + '">' +
          esc(App.sourceName(id)) +
          '</button>',
      ).join('') +
      '</div>';

    // Layer 1: what the software can read at all
    const catalogGroups = capability.categories
      .map((category) => {
        const chips = category.fields
          .map((f) => {
            const state = f.required ? 'is-mandatory' : f.defaultIncluded ? 'is-on' : 'is-off';
            const title = f.required ? 'Always part of a record' : f.sensitivity === 'high' ? 'Words you typed: off unless you turn it on' : 'Starts ' + (f.defaultIncluded ? 'on' : 'off');
            return chip(category.id + '.' + f.id, f.label, state, title);
          })
          .join('');
        return '<div class="ring-group"><span class="ring-group-label">' + esc(category.label) + '</span>' + chips + '</div>';
      })
      .join('');

    // Layer 2: what this study allows
    const releaseGroups = capability.categories
      .map((category) => {
        const categoryPolicy = policy.categories.find((c) => c.id === category.id);
        if (!categoryPolicy || !categoryPolicy.enabled) {
          return (
            '<div class="ring-group is-removed"><span class="ring-group-label">' + esc(category.label) + '</span>' +
            '<span class="chip is-prohibited">not collected by this study</span></div>'
          );
        }
        const chips = category.fields
          .map((f) => {
            const fp = categoryPolicy.fields.find((x) => x.id === f.id);
            if (!fp || fp.mode === 'prohibited') return chip(category.id + '.' + f.id, f.label, 'is-prohibited', 'This study never collects it. Deleted on your device before you see anything.');
            if (fp.mode === 'mandatory') return chip(category.id + '.' + f.id, f.label, 'is-mandatory', 'Always part of a record in this study');
            const on = fp.defaultIncluded === undefined ? f.defaultIncluded : fp.defaultIncluded;
            return chip(category.id + '.' + f.id, f.label, on ? 'is-on' : 'is-off', 'Optional · starts ' + (on ? 'on' : 'off'));
          })
          .join('');
        return '<div class="ring-group"><span class="ring-group-label">' + esc(category.label) + '</span>' + chips + '</div>';
      })
      .join('');

    // Layer 3: what you choose (starting point)
    const participantGroups = projectDescriptors
      .map((category) => {
        const selection = participantPolicy.categories[category.id];
        const chips = category.fields
          .map((f) => {
            const on = f.required ? true : selection.fields[f.id];
            const state = f.required ? 'is-mandatory' : on ? 'is-on' : 'is-off';
            const title = f.required ? 'Always included' : on ? 'Shared unless you turn it off' : 'Off unless you turn it on';
            return chip(category.id + '.' + f.id, f.label, state, title);
          })
          .join('');
        return '<div class="ring-group"><span class="ring-group-label">' + esc(category.label) + '</span>' + chips + '</div>';
      })
      .join('');

    const removedCategories = capability.categories.filter((c) => !projectDescriptors.some((p) => p.id === c.id)).length;
    const prohibitedFields = policy.categories.reduce((n, c) => n + (c.enabled ? c.fields.filter((f) => f.mode === 'prohibited').length : 0), 0);
    const narrowing = [];
    if (removedCategories) narrowing.push(removedCategories + ' group' + (removedCategories > 1 ? 's' : '') + ' switched off');
    if (prohibitedFields) narrowing.push(prohibitedFields + ' detail' + (prohibitedFields > 1 ? 's' : '') + ' never collected');

    mount.innerHTML =
      '<div class="ceilings">' +
      '<div>' +
      seg +
      '<div class="ring ring-catalog"><div class="ring-head"><strong>1 · What the software can read at all</strong><span>' +
      esc(source.displayName) + ' · checked ' + esc(source.exportFormatVerifiedOn) +
      '</span></div><div class="ring-groups">' + catalogGroups + '</div>' +
      '<div class="ring ring-release"><div class="ring-head"><strong>2 · What this study allows</strong><span>' +
      (narrowing.length ? esc(narrowing.join(' · ')) : 'everything from layer 1') +
      '</span></div><div class="ring-groups">' + releaseGroups + '</div>' +
      '<div class="ring ring-participant"><div class="ring-head"><strong>3 · What you choose to share</strong><span>your starting point</span></div>' +
      '<div class="ring-groups">' + participantGroups + '</div>' +
      '<p class="xs muted" style="margin:0.6rem 0 0">You can also switch whole groups off, limit the dates, or remove single items. You can never add something that is not here.</p>' +
      '</div></div></div>' +
      '</div>' +
      '<div class="card ceilings-legend"><h3>How to read it</h3><ul>' +
      '<li><span class="chip is-mandatory">detail</span> always part of a record, like the date.</li>' +
      '<li><span class="chip is-on">detail</span> shared unless you turn it off.</li>' +
      '<li><span class="chip is-off">detail</span> off unless you turn it on. Words you typed start here.</li>' +
      '<li><span class="chip is-prohibited">detail</span> this study never collects it. It is deleted on your device before you see anything.</li>' +
      '</ul><p class="xs muted">Hover a detail to follow it through the layers.</p></div>' +
      '</div>';
  }

  App.actions['ceiling-source'] = (el) => {
    S.overview.ceilingSource = el.dataset.source;
    renderCeilings();
  };

  function renderSourcesStrip() {
    const mount = document.getElementById('sources-strip');
    if (!mount) return;
    mount.innerHTML = D.SOURCES.map((source) => {
      const policy = App.releasePolicyFor(source.id);
      const suspended = App.sourceSuspended(source.id);
      const status = suspended ? 'paused' : source.capabilityStatus === 'donation_ready' ? 'ready' : source.capabilityStatus === 'instructions_only' ? 'guide only' : 'not yet';
      const toneClass = suspended ? 'admin-status-danger' : source.capabilityStatus === 'donation_ready' ? 'admin-status-positive' : source.capabilityStatus === 'instructions_only' ? 'admin-status-warning' : '';
      const projectLine =
        policy && policy.mode === 'donation'
          ? (policy.required ? 'Required' : 'Optional') + ' in this study'
          : policy && policy.mode === 'guide_only'
            ? 'Instructions only in this study'
            : 'Not used in this study';
      return (
        '<div class="source-pill"><span class="source-icon' + (source.enabled ? '' : ' is-muted') + '">' + esc(source.letter) + '</span>' +
        '<span><strong>' + esc(source.displayName) + '</strong><span class="admin-status ' + toneClass + '">' + esc(status) + '</span>' +
        '<span class="xs muted" style="display:block">' + esc(projectLine) + '</span></span></div>'
      );
    }).join('');
  }

  App.views.overview = {
    render() {
      renderCeilings();
      renderSourcesStrip();
    },
  };

  /* ================================================================== */
  /* Server pipeline                                                     */
  /* ================================================================== */

  const LANES = [
    { id: 'worker', title: 'Your device', sub: 'the browser', x: 110, device: true },
    { id: 'api', title: 'Research server', sub: 'checks and records', x: 360 },
    { id: 'storage', title: 'File storage', sub: 'encrypted', x: 610 },
    { id: 'db', title: 'Database', sub: 'records, no files', x: 860 },
  ];

  const CHECKS = [
    { phase: 'Before the upload' },
    { id: 'scope', label: 'Right participant, right study, right round' },
    { id: 'mode', label: 'This study is allowed to collect from this service' },
    { id: 'switch', label: 'The service has not been paused by staff' },
    { id: 'manifest', label: 'The summary sheet matches this study\'s rules' },
    { id: 'consent', label: 'Consent is on record for this version of the study' },
    { id: 'idem', label: 'Not the same upload sent twice' },
    { id: 'once', label: 'No earlier donation for this service in this round' },
    { phase: 'The upload' },
    { id: 'auth', label: 'The upload slot is unused, still valid, and the exact size' },
    { phase: 'Before accepting' },
    { id: 'head', label: 'File size matches the summary sheet' },
    { id: 'len', label: 'The whole file arrived' },
    { id: 'sha', label: 'Fingerprint matches what you reviewed' },
    { id: 'schema', label: 'Format matches: only allowed groups and details inside' },
    { id: 'policy2', label: 'Study rules are the same as when you started' },
    { id: 'release', label: 'The study is still running and unchanged' },
    { id: 'switch2', label: 'The service is still allowed' },
    { id: 'once2', label: 'No duplicate slipped in meanwhile' },
    { phase: 'Keeping it' },
    { id: 'promote', label: 'File moved to a permanent, locked place; the temporary slot is deleted' },
    { id: 'receipt', label: 'Receipt, payment note and audit entry written together' },
  ];

  function buildSteps(d) {
    const p = 'prj_a4f1e2';
    const r = S.round.id;
    const short = (id) => id.slice(0, 12) + '…';
    return [
      { from: 'worker', to: 'api', label: 'Ask to start a donation', sub: 'sends the summary sheet and the fingerprint', checks: [], log: ['→ POST /api/donations  source=' + d.platform + '  records=' + d.records + '  bytes=' + d.payloadBytes, '   manifest.projectReleaseId=' + d.releaseId + '  collectionRoundId=' + r + '  sourcePolicySha256=' + E.shortHash(d.policyHash)] },
      { from: 'api', to: 'db', label: 'Check the rules', sub: 'right study · still allowed · consent given · not a repeat', checks: ['scope', 'mode', 'switch', 'manifest', 'consent', 'idem', 'once'], status: 'awaiting_upload', log: ['   FOR UPDATE participants, studies, collection_rounds', '   INSERT donation_attempts (' + short(d.id) + ', awaiting_upload)', '   INSERT donation_manifests (payload_sha256=' + E.shortHash(d.sha256) + ')'] },
      { from: 'api', to: 'worker', label: 'One-time upload slot', sub: 'valid 15 minutes · exactly ' + E.formatBytes(d.payloadBytes), checks: [], log: ['← 201 { donationId, upload: { kind: "presigned", expiresAt: +15m, headers: SSE-KMS } }'] },
      { from: 'worker', to: 'storage', label: 'Upload exactly what was reviewed', sub: 'the same list, nothing else, straight to storage', checks: ['auth'], status: 'uploaded', log: ['→ PUT staging/projects/' + p + '/rounds/' + r + '/donations/' + short(d.id) + '/upl_….json  (' + d.payloadBytes + ' bytes)', '   x-amz-server-side-encryption: aws:kms'] },
      { from: 'worker', to: 'api', label: 'Say “done”', sub: 'safe to repeat if the connection drops', checks: [], log: ['→ POST /api/donations/' + short(d.id) + '/complete'] },
      { from: 'api', to: 'storage', label: 'Check the size', sub: 'must match the summary sheet before anything is read', checks: ['head'], log: ['→ HEAD staging object  content-length=' + d.payloadBytes + '  expected=' + d.payloadBytes] },
      { from: 'api', to: 'storage', label: 'Check fingerprint and format', sub: 'must match what you reviewed · only allowed details inside', checks: ['len', 'sha', 'schema', 'policy2'], failAt: 'tampered', log: ['→ GET bytes', '   sha256(bytes)=' + E.shortHash(d.sha256) + '  manifest=' + E.shortHash(d.sha256), '   schema datadonate.donation.v2 ✓  categories/fields ⊆ policy ✓'] },
      { from: 'api', to: 'db', label: 'Re-check the rules', sub: 'study unchanged? service still allowed? still not a repeat?', checks: ['release', 'switch2', 'once2'], failAt: 'suspended', log: ['   FOR UPDATE participants, studies (active_release_id=' + d.releaseId + ' ✓)', '   source_capability_controls[' + d.platform + '] enabled ✓'] },
      { from: 'api', to: 'storage', label: 'Lock the file away', sub: 'permanent encrypted copy · temporary slot deleted', checks: ['promote'], log: ['→ PUT projects/' + p + '/rounds/' + r + '/donations/' + short(d.id) + '.json  (If-None-Match: *)', '→ DELETE staging object'] },
      { from: 'api', to: 'db', label: 'Write the receipt', sub: 'receipt · payment note · audit entry, all at once', checks: ['receipt'], status: 'accepted', log: ['   INSERT stored_payloads (sha256, bytes, encryption=SSE-KMS)', '   UPDATE donation_attempts SET status=accepted', '   INSERT donation_receipts (' + d.receiptCode + ')', '   UPDATE participant_round_eligibility → ' + (d.roundComplete ? 'completed · compensation eligibility recorded' : 'in_progress'), '   INSERT audit_events (donation.accepted)'] },
      { from: 'api', to: 'worker', label: 'Receipt sent back', sub: d.receiptCode, checks: [], log: ['← 200 { status: "accepted", receipt: "' + d.receiptCode + '" }'] },
    ];
  }

  async function serverDonation() {
    if (S.server.donation) return S.server.donation;
    if (S.server.fallback) return S.server.fallback;
    // Build a seeded donation from the TikTok default policy so the view works
    // before the participant journey has been played.
    const extraction = D.generateCandidates('tiktok');
    const policy = App.releasePolicyFor('tiktok');
    const narrowed = E.applyProjectSourcePolicy(extraction, policy);
    const selection = E.defaultPolicy('tiktok', narrowed.categories);
    const hashes = App.hashesFor(S.activeReleaseId);
    const finalized = await E.finalize(narrowed, selection, {
      adapterVersion: D.CAPABILITIES.tiktok.adapterVersion,
      projectReleaseId: S.activeReleaseId,
      sourcePolicySha256: hashes.sourcePolicy.tiktok,
      collectionRoundId: S.round.id,
      processedAt: new Date('2026-09-19T15:41:00Z'),
    });
    S.server.fallback = {
      id: 'don_5e7a9c1b3d2f4680a2c4e6f8',
      platform: 'tiktok',
      records: finalized.counts.totalSelected,
      payloadBytes: finalized.payloadBytes.byteLength,
      sha256: finalized.manifest.payloadSha256,
      releaseId: S.activeReleaseId,
      policyHash: hashes.sourcePolicy.tiktok || '',
      receiptCode: 'DD-Q4WM-7XKT',
      roundComplete: false,
      seeded: true,
    };
    return S.server.fallback;
  }

  function seqSvg(steps) {
    const top = 70;
    const gap = 44;
    const height = top + steps.length * gap + 30;
    let out = '<svg class="seq" viewBox="0 0 960 ' + height + '" role="img" aria-label="Sequence diagram of the donation pipeline">';
    out += '<defs><marker id="seq-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><polygon points="0 0,10 5,0 10"/></marker></defs>';
    for (const lane of LANES) {
      out += '<rect class="lane-head' + (lane.device ? ' is-device' : '') + '" x="' + (lane.x - 80) + '" y="12" width="160" height="42" rx="10"/>';
      out += '<text class="lane-title" x="' + lane.x + '" y="30" text-anchor="middle">' + esc(lane.title) + '</text>';
      out += '<text class="lane-sub" x="' + lane.x + '" y="46" text-anchor="middle">' + esc(lane.sub) + '</text>';
      out += '<line class="lane-line" x1="' + lane.x + '" y1="56" x2="' + lane.x + '" y2="' + (height - 12) + '"/>';
    }
    steps.forEach((step, i) => {
      const y = top + i * gap + 10;
      const from = LANES.find((l) => l.id === step.from).x;
      const to = LANES.find((l) => l.id === step.to).x;
      const dir = to > from ? 1 : -1;
      const x1 = from + dir * 10;
      const x2 = to - dir * 12;
      const mid = (from + to) / 2;
      const status = stepState(i);
      out += '<g class="arrow ' + status + '" data-step="' + i + '">';
      out += '<line x1="' + x1 + '" y1="' + y + '" x2="' + x2 + '" y2="' + y + '" marker-end="url(#seq-arrow)"/>';
      out += '<circle class="step-badge" cx="' + (from - dir * 2) + '" cy="' + y + '" r="10"/>';
      out += '<text class="step-badge-text" x="' + (from - dir * 2) + '" y="' + (y + 3.5) + '" text-anchor="middle">' + (i + 1) + '</text>';
      out += '<text x="' + mid + '" y="' + (y - 8) + '" text-anchor="middle">' + esc(step.label) + '</text>';
      out += '<text x="' + mid + '" y="' + (y + 16) + '" text-anchor="middle" style="font-size:9.5px">' + esc(step.sub) + '</text>';
      out += '</g>';
    });
    // scenario note
    if (S.server.scenario !== 'normal') {
      const note = S.server.scenario === 'suspended' ? 'What if staff paused this service during the upload? Step 8 stops. Nothing is accepted; the upload waits and can be finished once the service is back.' : 'What if the file changed on the way? Step 7 catches it: the fingerprint does not match, the upload is thrown away, and nothing is kept.';
      out += '<rect class="note" x="20" y="' + (height - 30) + '" width="920" height="22" rx="6"/>';
      out += '<text class="note-text" x="480" y="' + (height - 15) + '" text-anchor="middle">' + esc(note) + '</text>';
    }
    out += '</svg>';
    return out;
  }

  function stepState(i) {
    const sv = S.server;
    if (sv.failedAt === i) return 'is-failed';
    if (i < sv.stepIndex) return 'is-done';
    if (i === sv.stepIndex) return sv.finished ? 'is-done' : 'is-active';
    return '';
  }

  function renderChecks() {
    const mount = document.getElementById('seq-checks');
    if (!mount) return;
    mount.innerHTML = CHECKS.map((c) => {
      if (c.phase) return '<li class="phase">' + esc(c.phase) + '</li>';
      const state = S.server.checks[c.id] || '';
      const cls = state === 'pass' ? 'is-pass' : state === 'fail' ? 'is-fail' : state === 'active' ? 'is-active' : '';
      const mark = state === 'pass' ? icon('check', 'ico-sm') : state === 'fail' ? icon('x', 'ico-sm') : '';
      return '<li class="' + cls + '"><span class="mark">' + mark + '</span><span>' + esc(c.label) + '</span></li>';
    }).join('');
  }

  function renderFacts(d) {
    const mount = document.getElementById('seq-facts');
    if (!mount) return;
    const p = 'prj_a4f1e2';
    const r = S.round.id;
    const final = S.server.status === 'accepted';
    mount.innerHTML =
      '<span class="eyebrow">' + (d.seeded ? 'A sample donation' : 'Your donation from step 2') + '</span>' +
      '<h2 style="font-size:1.05rem">' + esc(App.sourceName(d.platform)) + ' · ' + E.formatNumber(d.records) + ' records · ' + E.formatBytes(d.payloadBytes) + '</h2>' +
      '<dl class="kv">' +
      '<dt>Fingerprint</dt><dd class="mono">' + esc(E.shortHash(d.sha256, 16, 8)) + '</dd>' +
      '<dt>Study version</dt><dd>v' + esc(String((S.releases.find((x) => x.id === d.releaseId) || {}).version || '')) + '</dd>' +
      '<dt>Round</dt><dd>' + esc(S.round.name) + '</dd>' +
      '<dt>Receipt</dt><dd class="mono">' + (final ? esc(d.receiptCode) : '<span class="muted">appears at step 10</span>') + '</dd>' +
      '</dl>' +
      '<div class="key-transition" aria-label="Where the file is stored">' +
      '<span>Temporary slot <span class="muted">· deleted after 15 minutes or once accepted</span></span>' +
      '<span class="' + (final ? 'is-final' : '') + '">Permanent locked copy <span class="muted">· filed under study ' + p.slice(0, 10) + '…, round ' + esc(r) + '</span></span>' +
      '</div>' +
      (d.seeded ? '<p class="xs muted" style="margin:0.75rem 0 0">Make a donation in step 2 and this view will replay it with your own choices and fingerprint.</p>' : '');
  }

  function renderControls() {
    const mount = document.getElementById('seq-controls');
    if (!mount) return;
    const sv = S.server;
    const status = sv.status || 'not started';
    mount.innerHTML =
      '<button type="button" class="btn btn-primary btn-sm" data-action="seq-play" ' + (sv.playing || sv.finished ? 'disabled' : '') + '>' + icon('play', 'ico-sm') + ' Play</button>' +
      '<button type="button" class="btn btn-secondary btn-sm" data-action="seq-step" ' + (sv.playing || sv.finished ? 'disabled' : '') + '>' + icon('skip', 'ico-sm') + ' Step</button>' +
      '<button type="button" class="btn btn-ghost btn-sm" data-action="seq-reset">' + icon('reset', 'ico-sm') + ' Reset</button>' +
      '<label>What if… <select class="select-input" data-change="seq-scenario" ' + (sv.playing ? 'disabled' : '') + '>' +
      '<option value="normal"' + (sv.scenario === 'normal' ? ' selected' : '') + '>Everything goes normally</option>' +
      '<option value="suspended"' + (sv.scenario === 'suspended' ? ' selected' : '') + '>Staff pause the service mid-upload</option>' +
      '<option value="tampered"' + (sv.scenario === 'tampered' ? ' selected' : '') + '>The file changes on the way</option>' +
      '</select></label>' +
      '<span class="status-chip is-' + esc(status.replace(/\s/g, '_')) + '" aria-live="polite">' + esc(status === 'awaiting_upload' ? 'waiting for upload' : status === 'uploaded' ? (sv.paused ? 'uploaded · waiting for the service' : 'uploaded, being checked') : status === 'accepted' ? 'accepted' : status === 'failed' ? 'rejected' : 'not started') + '</span>';
  }

  function renderLog() {
    const mount = document.getElementById('seq-log');
    if (!mount) return;
    if (S.server.log.length === 0) {
      mount.innerHTML = '<div class="t">Press Play above. These lines mirror what the real server writes (server/src/routes/donations.ts).</div>';
      return;
    }
    mount.innerHTML = S.server.log.map((line) => '<div class="' + line.cls + '"><span class="t">' + line.t + '</span> ' + esc(line.text) + '</div>').join('');
    mount.scrollTop = mount.scrollHeight;
  }

  let cachedSteps = null;

  async function renderServer() {
    const d = await serverDonation();
    cachedSteps = buildSteps(d);
    const figure = document.getElementById('seq-figure');
    if (figure) figure.innerHTML = seqSvg(cachedSteps);
    renderControls();
    renderChecks();
    renderFacts(d);
    renderLog();
  }

  function logLine(text, cls) {
    const t = S.server.log.length === 0 ? 0 : S.server.log[S.server.log.length - 1].ms + 40 + Math.floor(Math.random() * 60);
    S.server.log.push({ text, cls: cls || '', ms: t, t: '+' + String(t).padStart(4, ' ') + 'ms' });
  }

  function applyStep(i) {
    const sv = S.server;
    const step = cachedSteps[i];
    sv.stepIndex = i;
    const failing = step.failAt && step.failAt === sv.scenario;
    step.checks.forEach((id) => {
      sv.checks[id] = 'pass';
    });
    if (failing) {
      if (sv.scenario === 'tampered') {
        sv.checks['sha'] = 'fail';
        sv.checks['schema'] = '';
        sv.checks['policy2'] = '';
        sv.failedAt = i;
        sv.status = 'failed';
        sv.finished = true;
        logLine('→ GET bytes', '');
        logLine('   sha256(bytes)=' + E.shortHash('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855') + '  manifest=' + E.shortHash(cachedSteps[0] && S.server.donation ? S.server.donation.sha256 : (S.server.fallback || {}).sha256 || ''), 'bad');
        logLine('✗ checksum_or_length_mismatch → status=failed, staging object deleted, audit donation.verification_failed', 'bad');
        logLine('← 409 { error: "verification_failed", message: "The uploaded data did not match its fingerprint. Please process the file and try again." }', 'bad');
      } else if (sv.scenario === 'suspended') {
        sv.checks['switch2'] = 'fail';
        sv.checks['once2'] = '';
        sv.failedAt = i;
        sv.status = 'uploaded';
        sv.paused = true;
        sv.finished = true;
        logLine('   FOR UPDATE participants, studies (active_release_id ✓)', '');
        logLine('   source_capability_controls[' + (S.server.donation || S.server.fallback).platform + '] enabled? NO — suspended by owner (reason recorded)', 'bad');
        logLine('← 503 { error: "source_temporarily_unavailable" }  attempt remains "uploaded"; completion can be retried once restored', 'bad');
      }
    } else {
      step.log.forEach((line) => logLine(line, line.startsWith('←') || line.startsWith('   INSERT') ? 'ok' : ''));
      if (step.status) sv.status = step.status;
      if (i === cachedSteps.length - 1) sv.finished = true;
    }
    if (sv.finished) sv.playing = false;
    // Refresh figure classes without rebuilding the SVG
    document.querySelectorAll('#seq-figure .arrow').forEach((g, idx) => {
      g.setAttribute('class', 'arrow ' + stepState(idx));
    });
    renderControls();
    renderChecks();
    renderFacts(S.server.donation || S.server.fallback);
    renderLog();
  }

  function resetServer() {
    const sv = S.server;
    if (sv.timer) sv.timer();
    sv.timer = null;
    sv.stepIndex = -1;
    sv.playing = false;
    sv.finished = false;
    sv.paused = false;
    sv.failedAt = null;
    sv.status = null;
    sv.checks = {};
    sv.log = [];
    renderServer();
  }

  App.actions['seq-reset'] = () => resetServer();
  App.actions['seq-step'] = () => {
    if (!cachedSteps || S.server.finished) return;
    applyStep(S.server.stepIndex + 1);
  };
  App.actions['seq-play'] = () => {
    if (!cachedSteps || S.server.finished) return;
    const sv = S.server;
    sv.playing = true;
    renderControls();
    const remaining = [];
    for (let i = sv.stepIndex + 1; i < cachedSteps.length; i += 1) remaining.push(i);
    sv.timer = App.sequence(
      remaining.map((i) => ({ delay: i === remaining[0] ? 200 : 700, run: () => { if (!sv.finished) applyStep(i); } })),
      () => {
        sv.playing = false;
        renderControls();
      },
    );
  };
  App.changes['seq-scenario'] = (el) => {
    S.server.scenario = el.value;
    resetServer();
  };

  App.views.server = {
    render() {
      renderServer();
    },
  };

  /* ================================================================== */
  /* Architecture (static)                                               */
  /* ================================================================== */

  App.views.architecture = { render() {} };
})();
