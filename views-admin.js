/*
 * DataDonate demo — Admin console view
 */
(function () {
  'use strict';
  const App = window.App;
  const { E, D, S, esc, icon, badge } = App;
  const A = S.admin;

  const NAV_GLOBAL = [
    { id: 'projects', label: 'Projects', icon: 'squares-four' },
    { id: 'administrators', label: 'Administrators', icon: 'users', ownerOnly: true },
    { id: 'system', label: 'System', icon: 'sliders' },
    { id: 'account', label: 'Account & security', icon: 'shield-check' },
  ];
  const NAV_PROJECT = [
    { id: 'overview', label: 'Overview', icon: 'gauge' },
    { id: 'setup', label: 'Project setup', icon: 'sliders' },
    { id: 'sources', label: 'Sources & data policy', icon: 'database' },
    { id: 'rounds', label: 'Collection rounds', icon: 'flag' },
    { id: 'consent', label: 'Consent', icon: 'clipboard' },
    { id: 'communications', label: 'Communications', icon: 'envelope' },
    { id: 'guides', label: 'Participant guides', icon: 'folder' },
    { id: 'release', label: 'Review & publish', icon: 'rocket' },
    { id: 'participants', label: 'Participants & access', icon: 'id-card' },
    { id: 'donations', label: 'Donations', icon: 'database' },
    { id: 'feedback', label: 'Feedback', icon: 'chat' },
    { id: 'withdrawals', label: 'Withdrawals & deletion', icon: 'list-checks' },
    { id: 'downloads', label: 'Downloads', icon: 'download' },
    { id: 'audit', label: 'Project audit', icon: 'clock-ccw' },
  ];

  const STUBS = {
    setup: ['Project setup', 'Identity, governance reference and dates, contacts, timezone, visibility and lifecycle. Slug and timezone freeze at first activation.'],
    consent: ['Consent', 'Immutable consent documents and a release-specific data-scope notice. Participants read and agree again when collection terms change; the original document and prior evidence remain unchanged.'],
    communications: ['Communications', 'Versioned invitation and reminder templates. A project in external mode cannot queue application email at all.'],
    guides: ['Participant guides', 'Verified base guide versions with project notes. Images must be synthetic or redacted and contain no identifiers.'],
    downloads: ['Downloads', 'Individual and batch research downloads scoped to one project, release and round. Each requires a reason, step-up verification and an audit event, and produces a one-use authorization.'],
    feedback: ['Feedback', 'Read usability comments from participants and mark follow-up. Ratings never include payload content.'],
  };

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  function project() {
    return S.project;
  }

  function pageHeader(eyebrow, title, description, actionsHtml) {
    return '<header class="admin-page-header"><div>' + (eyebrow ? '<span class="admin-eyebrow">' + esc(eyebrow) + '</span>' : '') + '<h1 tabindex="-1">' + esc(title) + '</h1>' + (description ? '<p>' + esc(description) + '</p>' : '') + '</div>' + (actionsHtml ? '<div class="admin-page-actions btn-row">' + actionsHtml + '</div>' : '') + '</header>';
  }

  function panel(title, subtitle, bodyHtml, iconName, extraCls) {
    return '<section class="admin-panel ' + (extraCls || '') + '"><div class="admin-panel-heading"><div><h2>' + (iconName ? icon(iconName) : '') + esc(title) + '</h2>' + (subtitle ? '<p>' + esc(subtitle) + '</p>' : '') + '</div></div>' + bodyHtml + '</section>';
  }

  function details(label, bodyHtml) {
    return '<details class="demo-details"><summary>' + esc(label) + '</summary><div class="demo-details-body">' + bodyHtml + '</div></details>';
  }

  function stepUpFresh() {
    return Date.now() < A.stepUpUntil;
  }

  async function requireStepUp() {
    if (stepUpFresh()) return true;
    const result = await App.dialog({
      title: 'Confirm it is you',
      body: '<p>Demo only. Enter a fictional password, never a real one.</p>',
      fields: [{ name: 'password', label: 'Demo password for ' + A.user.username, type: 'password', required: true, hint: 'Any fictional value is accepted.' }],
      confirmLabel: 'Verify',
    });
    if (!result.ok) return false;
    A.stepUpUntil = Date.now() + 5 * 60 * 1000;
    App.addAudit({ action: 'admin.step_up', actor: 'admin ' + A.user.username, subject: A.user.username, summary: 'Step-up authentication recorded (valid 5 minutes).' });
    return true;
  }

  function activeRelease() {
    return App.activeRelease();
  }

  function acceptedDonations(roundKey) {
    return A.donations.filter((d) => d.status === 'accepted' && (!roundKey || d.roundKey === roundKey));
  }

  function roundName(roundKey) {
    const round = D.ROUNDS.find((r) => r.roundKey === roundKey);
    return round ? round.name : roundKey || 'Unknown round';
  }

  function requiredForRound(round) {
    if (round.roundKey === S.round.roundKey) return App.requiredSourceIds();
    const rel = S.releases.find((r) => r.id === round.projectReleaseId);
    const policies = rel ? rel.sourcePolicies : [];
    return Array.from(new Set(policies.filter((p) => p.mode === 'donation' && p.required).map((p) => p.sourceId).concat(round.requiredSourceIds)));
  }

  function participantRoundStatus(participant, round) {
    const accepted = acceptedDonations(round.roundKey).filter((d) => d.participantId === participant.id);
    if (accepted.length) {
      return requiredForRound(round).every((id) => accepted.some((d) => d.platform === id)) ? 'complete' : 'partial';
    }
    // Historical summary rows can outlive their payloads. The live participant's
    // current round is computed only from accepted donations, never skipped items.
    if (participant.id === S.participant.id && round.roundKey === S.round.roundKey) return 'none';
    return (participant.rounds || {})[round.roundKey] || 'none';
  }

  function participantConsent(p) {
    const recorded = p.id === S.participant.id && S.participant.consent.agreed;
    return recorded
      ? { version: S.participant.consent.version, releaseId: S.participant.consent.releaseId }
      : { version: p.consentVersion, releaseId: p.consentReleaseId };
  }

  function participantNeedsReconsent(p) {
    const status = p.id === S.participant.id ? S.participant.status : p.status;
    const consent = participantConsent(p);
    if (status !== 'active' || !consent.version) return false;
    if (consent.version !== activeRelease().consentVersion) return true;
    let current = activeRelease();
    const visited = new Set();
    while (current && !visited.has(current.id)) {
      if (current.id === consent.releaseId) return false;
      if (current.requiresReconsent) return true;
      visited.add(current.id);
      current = S.releases.find((r) => r.id === current.supersedesReleaseId);
    }
    return true;
  }

  function reconsentPending() {
    return A.participants.filter(participantNeedsReconsent);
  }

  /* ------------------------------------------------------------------ */
  /* Sidebar                                                             */
  /* ------------------------------------------------------------------ */

  function navButton(item, active) {
    return '<button type="button" class="' + (active ? 'is-active' : '') + '" data-action="a-nav" data-screen="' + item.id + '" ' + (active ? 'aria-current="page"' : '') + '>' + icon(item.icon) + '<span>' + esc(item.label) + '</span></button>';
  }

  function sidebar() {
    const pr = project();
    const rel = activeRelease();
    return (
      '<aside class="admin-sidebar" aria-label="Administrator navigation">' +
      '<div class="admin-sidebar-brand"><span class="admin-brand-mark" aria-hidden="true">D</span><span><strong>DataDonate</strong><small>Administration</small></span></div>' +
      '<nav class="admin-nav" aria-label="Administrator">' + NAV_GLOBAL.filter((i) => !i.ownerOnly || A.user.role === 'owner').map((i) => navButton(i, A.screen === i.id)).join('') + '</nav>' +
      '<div class="admin-project-switcher"><label for="admin-project-select">Project workspace</label><select id="admin-project-select" data-change="a-project"><option value="' + esc(pr.id) + '" selected>' + esc(pr.name) + ' · ' + esc(pr.lifecycle) + '</option><option value="' + esc(D.PROJECTS[1].id) + '">' + esc(D.PROJECTS[1].name) + ' · ' + esc(D.PROJECTS[1].lifecycle) + '</option></select><small>' + esc(pr.governanceReference) + ' · release v' + rel.version + '</small></div>' +
      '<nav class="admin-nav admin-project-nav" aria-label="Selected project">' + NAV_PROJECT.map((i) => navButton(i, A.screen === i.id)).join('') + '</nav>' +
      '<div class="admin-account"><span class="admin-avatar" aria-hidden="true">' + esc(A.user.displayName.slice(0, 1)) + '</span><span><strong>' + esc(A.user.displayName) + '</strong><small>' + esc(A.user.role) + ' administrator</small></span><span class="icon-btn" style="margin-left:auto;background:transparent;border-color:rgb(255 255 255 / 0.2);color:#fff" aria-hidden="true">' + icon('sign-out', 'ico-sm') + '</span></div>' +
      '</aside>'
    );
  }

  /* ------------------------------------------------------------------ */
  /* Screens                                                             */
  /* ------------------------------------------------------------------ */

  function screenProjects() {
    const cards = D.PROJECTS.map((p) => {
      const isMain = p.id === project().id;
      const rel = isMain ? activeRelease() : null;
      return (
        '<article class="admin-panel admin-project-card"><div class="admin-panel-heading"><div class="admin-project-title"><span class="admin-project-icon">' + icon('squares-four') + '</span><div><h2>' + esc(p.name) + '</h2><small>/p/' + esc(p.slug) + '</small></div></div>' + badge(p.lifecycle) + '</div>' +
        '<dl class="admin-definition-list"><dt>Governance</dt><dd>' + badge(p.governanceStatus) + ' <span class="admin-mono">' + esc(p.governanceReference) + '</span></dd><dt>Visibility</dt><dd>' + badge(p.visibility) + '</dd><dt>Active release</dt><dd>' + (rel ? 'v' + rel.version + ' · published ' + esc(E.formatDate(rel.publishedAt)) : '<span class="muted">—</span>') + '</dd><dt>Updated</dt><dd>' + esc(E.formatDate(p.updatedAt)) + '</dd></dl>' +
        '<div class="btn-row" style="margin-top:1rem"><button type="button" class="btn btn-primary btn-sm" data-action="' + (isMain ? 'a-nav' : 'a-not-in-tour') + '" data-screen="overview">Open workspace</button><select class="select-input input-sm" style="width:auto" aria-label="Lifecycle" data-change="a-lifecycle"><option>' + esc(p.lifecycle) + '</option><option>paused</option><option>closed</option></select></div></article>'
      );
    }).join('');
    return pageHeader('Umbrella', 'Projects', null, '<button type="button" class="btn btn-primary btn-sm" data-action="a-not-in-tour">New project</button>') + '<div class="admin-project-grid">' + cards + '</div>';
  }

  function screenOverview() {
    const pr = project();
    const rel = activeRelease();
    const active = A.participants.filter((p) => p.status === 'active').length;
    const invited = A.participants.filter((p) => p.status === 'invited').length;
    const accepted = acceptedDonations(S.round.roundKey).length;
    const attempts = A.donations.filter((d) => d.roundKey === S.round.roundKey).length;
    const pendingWithdrawals = A.withdrawals.filter((w) => w.status === 'received').length;
    const jobsAwaiting = A.withdrawals.filter((w) => w.deletionJob && w.deletionJob.status === 'pending_approval').length;
    const suspended = Object.keys(S.catalog.suspended);
    const reconsent = reconsentPending();
    const metrics =
      '<div class="admin-metric-grid">' +
      '<div class="admin-metric"><span>Active participants</span><strong>' + active + '</strong><small>' + invited + ' invited</small></div>' +
      '<div class="admin-metric admin-metric-positive"><span>Accepted donations</span><strong>' + accepted + '</strong><small>' + esc(S.round.name) + ' · ' + attempts + ' attempts</small></div>' +
      '<div class="admin-metric"><span>Feedback</span><strong>' + D.FEEDBACK.averageRating.toFixed(1) + '</strong><small>average rating · ' + D.FEEDBACK.ratings + ' ratings</small></div>' +
      '<div class="admin-metric ' + (pendingWithdrawals ? 'admin-metric-warning' : '') + '"><span>Pending withdrawals</span><strong>' + pendingWithdrawals + '</strong><small>' + jobsAwaiting + ' job' + (jobsAwaiting === 1 ? '' : 's') + ' awaiting action</small></div>' +
      '</div>';
    const attention =
      '<ul class="admin-action-list">' +
      (suspended.length ? '<li class="is-alert"><button type="button" data-action="a-nav" data-screen="system"><span><strong>Uploads paused: ' + esc(suspended.map(App.sourceName).join(', ')) + '</strong><span>An owner must restore access.</span></span>' + icon('arrow-right', 'ico-sm') + '</button></li>' : '') +
      (reconsent.length ? '<li><button type="button" data-action="a-nav" data-screen="participants"><span><strong>' + reconsent.length + ' participant' + (reconsent.length > 1 ? 's' : '') + ' must re-consent</strong></span>' + icon('arrow-right', 'ico-sm') + '</button></li>' : '') +
      '<li><button type="button" data-action="a-nav" data-screen="withdrawals"><span><strong>' + pendingWithdrawals + ' withdrawal request' + (pendingWithdrawals === 1 ? '' : 's') + '</strong></span>' + icon('arrow-right', 'ico-sm') + '</button></li>' +
      '<li><button type="button" data-action="a-nav" data-screen="feedback"><span><strong>' + D.FEEDBACK.unreviewed + ' unreviewed feedback entries</strong></span>' + icon('arrow-right', 'ico-sm') + '</button></li>' +
      '<li><button type="button" data-action="a-nav" data-screen="participants"><span><strong>Manage participant access</strong></span>' + icon('arrow-right', 'ico-sm') + '</button></li>' +
      '</ul>';
    const system =
      '<dl class="admin-definition-list"><dt>Health</dt><dd>' + badge(D.SYSTEM.status) + '</dd><dt>Active release</dt><dd>v' + rel.version + ' · ' + esc(E.formatDate(rel.publishedAt)) + '</dd></dl>' +
      '<p style="margin:0.75rem 0 0"><button type="button" class="link-btn" data-action="a-nav" data-screen="system">Open system details</button></p>';
    const byPlatform = App.donationSources().map((s) => {
      const n = acceptedDonations(S.round.roundKey).filter((d) => d.platform === s.id).length;
      return { label: s.displayName, n };
    });
    const max = Math.max(1, ...byPlatform.map((b) => b.n));
    const bars = '<div class="admin-platform-bars">' + byPlatform.map((b) => '<div><span>' + esc(b.label) + '</span><progress value="' + b.n + '" max="' + max + '" aria-label="' + esc(b.label) + ' accepted donations"></progress><b>' + b.n + '</b></div>').join('') + '</div>';
    return (
      pageHeader(pr.name, 'Overview', null) +
      metrics +
      '<div class="admin-dashboard-grid">' +
      '<section class="admin-panel"><div class="admin-panel-heading"><h2>' + icon('warning-circle') + 'Needs attention</h2></div>' + attention + '</section>' +
      '<section class="admin-panel"><div class="admin-panel-heading"><h2>' + icon('check-circle') + 'System status</h2></div>' + system + '</section>' +
      '</div>' +
      '<section class="admin-panel"><div class="admin-panel-heading"><h2>' + icon('database') + 'Donations by platform</h2><p>' + esc(S.round.name) + ' · accepted only</p></div>' + bars + '</section>'
    );
  }

  function donationRow(d) {
    return '<tr class="' + (d.isNew ? 'is-new' : '') + '"><td class="admin-mono">' + esc(d.id.slice(0, 16)) + '…</td><td class="admin-mono">' + esc(d.participantId) + '</td><td>' + esc(roundName(d.roundKey)) + '</td><td>' + esc(App.sourceName(d.platform)) + '</td><td>' + (d.records ? E.formatNumber(d.records) : '—') + '</td><td>' + (d.payloadBytes ? E.formatBytes(d.payloadBytes) : '—') + '</td><td>' + esc(E.formatDateTime(d.createdAt)) + '</td><td>' + badge(d.status) + (d.receiptCode && d.status === 'accepted' ? '<div class="xs admin-mono muted">' + esc(d.receiptCode) + '</div>' : '') + '</td></tr>';
  }

  function screenDonations() {
    const f = A.filters;
    const roundFilter = f.round || 'all';
    const rows = A.donations.filter((d) => (roundFilter === 'all' || d.roundKey === roundFilter) && (f.status === 'all' || d.status === f.status) && (f.platform === 'all' || d.platform === f.platform));
    const statuses = ['all', 'awaiting_upload', 'uploaded', 'accepted', 'failed', 'deleted'];
    const platforms = D.SOURCES.filter((s) => App.donationSources().some((active) => active.id === s.id) || A.donations.some((d) => d.platform === s.id));
    const filters = '<div class="admin-filters"><select class="select-input" data-change="a-filter-round" aria-label="Collection round"><option value="all">All rounds</option>' + D.ROUNDS.map((r) => '<option value="' + esc(r.roundKey) + '" ' + (roundFilter === r.roundKey ? 'selected' : '') + '>' + esc(r.name) + '</option>').join('') + '</select><select class="select-input" data-change="a-filter-status" aria-label="Status">' + statuses.map((s) => '<option value="' + s + '" ' + (f.status === s ? 'selected' : '') + '>' + (s === 'all' ? 'All statuses' : esc(s.replace('_', ' ').replace(/^./, (c) => c.toUpperCase()))) + '</option>').join('') + '</select><select class="select-input" data-change="a-filter-platform" aria-label="Platform"><option value="all">All platforms</option>' + platforms.map((s) => '<option value="' + s.id + '" ' + (f.platform === s.id ? 'selected' : '') + '>' + esc(s.displayName) + '</option>').join('') + '</select></div>';
    const table = rows.length
      ? '<div class="admin-table-wrap responsive"><table class="admin-table"><thead><tr><th>Donation</th><th>Participant</th><th>Round</th><th>Platform</th><th>Records</th><th>Size</th><th>Created</th><th>Status</th></tr></thead><tbody>' + rows.map(donationRow).join('') + '</tbody></table></div>' +
        '<div class="admin-mobile-list">' + rows.map((d) => '<div class="admin-mobile-card"><strong class="admin-mono">' + esc(d.id.slice(0, 16)) + '…</strong> ' + badge(d.status) + '<dl class="kv"><dt>Participant</dt><dd>' + esc(d.participantId) + '</dd><dt>Round</dt><dd>' + esc(roundName(d.roundKey)) + '</dd><dt>Platform</dt><dd>' + esc(App.sourceName(d.platform)) + '</dd><dt>Records</dt><dd>' + (d.records ? E.formatNumber(d.records) : '—') + '</dd><dt>Created</dt><dd>' + esc(E.formatDate(d.createdAt)) + '</dd></dl></div>').join('') + '</div>'
      : '<div class="admin-empty"><span class="admin-empty-icon">' + icon('database') + '</span><br /><strong>No donation attempts found</strong><br />No donations match the selected filters.</div>';
    return (
      pageHeader(project().name, 'Donations', 'Metadata only. Participant payloads are not shown.', '<button type="button" class="btn btn-secondary btn-sm" data-action="a-nav" data-screen="downloads">' + icon('download', 'ico-sm') + ' Secure downloads</button>') +
      panel('Donation attempts', rows.length + ' shown · ' + (roundFilter === 'all' ? 'all rounds' : roundName(roundFilter)), filters + table + details('Download safeguards', '<p>Downloads require a reason, step-up verification and an audit event. Green rows were simulated in this session.</p>'))
    );
  }

  function screenRelease() {
    const rel = activeRelease();
    const nextVersion = Math.max(...S.releases.map((r) => r.version)) + 1;
    const changes = A.release.draftChanges;
    const material = changes.some((c) => c.material);
    const warnings = [];
    const roundRequired = S.round.requiredSourceIds.filter((id) => !rel.sourcePolicies.find((p) => p.sourceId === id && p.required));
    if (roundRequired.length) warnings.push({ title: S.round.name + ' requirements', detail: 'Required: ' + App.requiredSourceIds().map(App.sourceName).join(' + ') + '. Instagram and Facebook optional. Unpaid.' });
    Object.keys(S.catalog.suspended).forEach((id) => warnings.push({ title: App.sourceName(id) + ' uploads paused', detail: 'Publishing will not restore uploads; an owner must do so.' }));
    if (material) warnings.push({ title: 'Material change: every active participant must re-consent', detail: reconsentPending().length + ' already need it from v' + rel.version + '; ' + A.participants.filter((p) => p.status === 'active' && p.consentVersion === rel.consentVersion).length + ' more will after v' + nextVersion + '.' });
    const ready = changes.length > 0;
    const hero =
      '<div class="admin-release-hero ' + (ready ? 'is-ready' : 'is-idle') + '"><div><span class="admin-eyebrow">Next release · v' + nextVersion + '</span><h2>' + (ready ? 'Ready to publish' : 'No draft changes') + '</h2><p>' + (ready ? changes.length + ' change' + (changes.length === 1 ? '' : 's') + ' to review. Demo only.' : 'Choose a simulated edit below.') + '</p></div>' +
      '<div class="btn-row"><button type="button" class="btn btn-primary" data-action="a-publish" ' + (ready ? '' : 'disabled') + '>' + icon('rocket') + ' Publish release v' + nextVersion + '</button></div></div>';
    const toolbar = '<div class="admin-toolbar"><span class="small muted">Simulate edit:</span><button type="button" class="btn btn-secondary btn-sm" data-action="a-change" data-kind="consent">' + icon('pencil', 'ico-sm') + ' Consent wording</button><button type="button" class="btn btn-secondary btn-sm" data-action="a-change" data-kind="contact">' + icon('pencil', 'ico-sm') + ' Coordinator contact</button><button type="button" class="btn btn-secondary btn-sm" data-action="a-change" data-kind="guide">' + icon('pencil', 'ico-sm') + ' YouTube guide</button></div>';
    const blockers = panel('Readiness', null, '<div class="notice notice-success" style="margin:0">' + icon('check-circle') + '<p>All checks pass.</p></div>' + details('View checked items', '<p>Governance, contacts, consent, rounds, data policy, guides, communications, dates, payment, retention and deletion terms.</p>'), 'check-circle');
    const warn = panel('Warnings to review', null, warnings.length ? '<ul class="admin-issue-list">' + warnings.map((w) => '<li class="is-warning"><span><strong>' + esc(w.title) + '</strong><span>' + esc(w.detail) + '</span></span>' + badge('review required') + '</li>').join('') + '</ul>' : '<p class="small muted" style="margin:0">No warnings.</p>', 'warning-circle');
    const changesHtml = changes.length ? '<ul class="admin-release-changes">' + changes.map((c) => '<li><span><strong>' + esc(c.section) + '</strong><span>' + esc(c.summary) + '</span></span>' + badge(c.material ? 're-consent required' : 'non-material') + '</li>').join('') + '</ul>' : '<p class="small muted" style="margin:0">No draft changes compared with release v' + rel.version + '.</p>';
    const reconsent = material ? '<div class="admin-reconsent-check"><label class="check-row"><input type="checkbox" data-change="a-reconsent" ' + (A.release.reconsentAck ? 'checked' : '') + ' /><span><span class="check-text"><strong>I understand participants must agree again.</strong></span><span class="check-desc">Consent ' + esc(A.release.consentVersionDraft || rel.consentVersion) + ' is required before their next donation.</span></span></label></div>' : '';
    const history = details('Release history (' + S.releases.length + ')', '<ul class="admin-release-history">' + S.releases.slice().sort((a, b) => b.version - a.version).map((r) => '<li><span><strong>Release v' + r.version + '</strong><span>Published ' + esc(E.formatDateTime(r.publishedAt)) + ' by ' + esc(r.publishedBy) + ' · consent ' + esc(r.consentVersion) + ' · policy ' + esc(E.shortHash(App.hashesFor(r.id).materialHash, 10, 6)) + '</span></span><span class="btn-row">' + (r.requiresReconsent ? badge('re-consent required') : '') + badge(r.status) + '</span></li>').join('') + '</ul>');
    return pageHeader(project().name, 'Review & publish', null) + hero + toolbar + '<div class="admin-two-column">' + blockers + warn + '</div>' + panel('Changes since v' + rel.version, null, changesHtml + reconsent, 'list-checks') + details('Publishing & consent rules', '<p>Publication creates a locked release. Changes to consent, collected data, payment, retention or deletion require participants to agree again. Earlier consent evidence stays unchanged.</p><p>This demo changes only this page; no real project is published.</p>') + history;
  }

  function screenSystem() {
    const sys = D.SYSTEM;
    const health = '<div class="admin-health-grid">' +
      '<section class="admin-panel"><h2>Database ' + badge(sys.database.status) + '</h2><dl class="admin-definition-list"><dt>Latency</dt><dd>' + sys.database.latencyMs + ' ms</dd><dt>Detail</dt><dd>' + esc(sys.database.detail) + '</dd></dl></section>' +
      '<section class="admin-panel"><h2>Payload storage ' + badge(sys.storage.status) + '</h2><dl class="admin-definition-list"><dt>Provider</dt><dd>' + esc(sys.storage.provider) + '</dd><dt>Active payloads</dt><dd>' + (sys.storage.activePayloads + acceptedDonations().filter((d) => d.isNew).length) + ' · ' + esc(E.formatBytes(sys.storage.activePayloadBytes)) + '</dd><dt>Staging objects</dt><dd>' + sys.storage.stagingObjects + '</dd></dl></section>' +
      '<section class="admin-panel"><h2>Background worker ' + badge(sys.worker.status) + '</h2><dl class="admin-definition-list"><dt>Heartbeat</dt><dd>' + esc(E.formatDateTime(sys.worker.lastHeartbeat)) + '</dd><dt>Queued jobs</dt><dd>' + (sys.worker.queued + A.withdrawals.filter((w) => w.deletionJob && ['queued', 'running'].includes(w.deletionJob.status)).length) + '</dd></dl></section></div>';
    const rows = D.SOURCES.map((s) => {
      const suspended = S.catalog.suspended[s.id];
      const operational = suspended ? badge('suspended') + '<div class="xs muted">' + esc(suspended.reason) + ' · ' + esc(suspended.by) + '</div>' : s.enabled ? badge('operational') : '<span class="muted">—</span>';
      const control = s.capabilityStatus === 'donation_ready' ? (suspended ? '<button type="button" class="btn btn-secondary btn-sm" data-action="a-restore" data-source="' + s.id + '">Restore uploads</button>' : '<button type="button" class="btn btn-danger btn-sm" data-action="a-suspend" data-source="' + s.id + '">Suspend uploads</button>') : '<span class="muted xs">cannot be promoted</span>';
      return '<tr><td><strong>' + esc(s.displayName) + '</strong>' + (s.exportFormatVerifiedOn ? '<div class="xs muted">verified ' + esc(s.exportFormatVerifiedOn) + '</div>' : '') + '</td><td>' + badge(s.capabilityStatus) + '</td><td>' + operational + '</td><td>' + control + '</td></tr>';
    }).join('');
    const catalog = panel('Global source adapters', 'Suspending a source immediately blocks its uploads.', '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Source</th><th>Base capability</th><th>Operational state</th><th>Control</th></tr></thead><tbody>' + rows + '</tbody></table></div>' + details('Suspension safeguards', '<p>Only owners can suspend a source, with a recorded reason and step-up verification. Every donation re-checks this switch; published releases are unchanged.</p>'), 'sliders');
    const releaseInfo = details('Deployment & backup details', '<dl class="admin-definition-list"><dt>Application version</dt><dd><code>' + esc(sys.appVersion) + '</code></dd><dt>Deployment profile</dt><dd>' + esc(sys.deploymentProfile) + '</dd><dt>Last backup</dt><dd>' + badge(sys.backup.status) + ' ' + esc(E.formatDateTime(sys.backup.completedAt)) + '</dd><dt>Umbrella projects</dt><dd>' + D.PROJECTS.length + ' (' + D.PROJECTS.filter((p) => p.lifecycle === 'active').length + ' active)</dd></dl>');
    return pageHeader('Operations', 'System', 'Simulated health. No live service or security checks.') + '<section class="admin-panel admin-health-hero"><div><h2>' + badge(sys.status) + ' Example services</h2></div><span class="step-up-note ' + (stepUpFresh() ? 'is-fresh' : '') + '">' + icon('key', 'ico-sm') + (stepUpFresh() ? 'Demo step-up verified' : 'Demo step-up required') + '</span></section>' + health + catalog + releaseInfo;
  }

  function screenRounds() {
    const list = '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Round</th><th>Required sources</th><th>Complete</th><th>Partial</th><th>Accepted donations</th><th>Status</th></tr></thead><tbody>' + D.ROUNDS.map((r) => {
      const required = requiredForRound(r);
      const states = A.participants.map((p) => participantRoundStatus(p, r));
      return '<tr><td><strong>' + esc(r.name) + '</strong>' + details('Dates & eligibility', '<dl class="admin-definition-list"><dt>Round key</dt><dd>' + esc(r.roundKey) + '</dd><dt>Opens</dt><dd>' + esc(E.formatDate(r.startsAt)) + '</dd><dt>Donations close</dt><dd>' + esc(E.formatDate(r.donationsCloseAt)) + '</dd><dt>Access ends</dt><dd>' + esc(E.formatDate(r.participantAccessEndsAt)) + '</dd><dt>Eligibility</dt><dd>' + esc(r.eligibilityMode.replace(/_/g, ' ')) + '</dd></dl>') + '</td><td>' + esc(required.map(App.sourceName).join(' + ') || 'None') + '</td><td>' + states.filter((state) => state === 'complete').length + '</td><td>' + states.filter((state) => state === 'partial').length + '</td><td>' + acceptedDonations(r.roundKey).length + '</td><td>' + badge(r.status) + '</td></tr>';
    }).join('') + '</tbody></table></div>';
    return pageHeader(project().name, 'Collection rounds', 'Progress is separate for each round.', '<button type="button" class="btn btn-primary btn-sm" data-action="a-not-in-tour">New round</button>') + panel('Rounds', null, list, 'flag') + '<div class="notice notice-info">' + icon('info') + '<p>Instagram and Facebook are optional. Participation is unpaid; skips do not count.</p></div>' + details('How rounds work', '<p>A donation in an earlier round does not block one in the current open round. Optional sources remain available after the required donations are complete.</p>');
  }

  function screenWithdrawals() {
    const rows = A.withdrawals.map((w) => {
      const job = w.deletionJob;
      let action = '';
      if (!job) action = '<button type="button" class="btn btn-secondary btn-sm" data-action="a-propose-deletion" data-wd="' + esc(w.id) + '">Begin deletion</button>';
      else if (job.status === 'pending_approval') action = job.proposedBy === A.user.username ? '<span class="xs muted">Awaiting a different owner</span> <button type="button" class="btn btn-ghost btn-sm" data-action="a-approve-deletion" data-wd="' + esc(w.id) + '">Approve</button>' : '<button type="button" class="btn btn-primary btn-sm" data-action="a-approve-deletion" data-wd="' + esc(w.id) + '">Approve</button>';
      else if (job.status === 'queued' || job.status === 'running') action = '<span class="xs muted">Worker ' + esc(job.status) + '…</span>';
      else action = '<span class="xs muted">Evidence recorded</span>';
      return '<tr class="' + (w.isNew ? 'is-new' : '') + '"><td class="admin-mono">' + esc(w.participantId) + '</td><td>' + esc(E.formatDateTime(w.requestedAt)) + '</td><td>' + esc(E.formatDate(w.deadlineAt)) + '</td><td>' + badge(w.status) + '</td><td>' + (job ? badge(job.status) + '<div class="xs muted">' + esc(job.scope || '') + '</div>' : '<span class="muted">—</span>') + '</td><td>' + action + '</td></tr>';
    }).join('');
    const queue = panel('Withdrawal queue', null, '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Participant</th><th>Requested</th><th>Deadline</th><th>Status</th><th>Deletion job</th><th>Action</th></tr></thead><tbody>' + rows + '</tbody></table></div>', 'list-checks');
    const jobs = A.withdrawals.filter((w) => w.deletionJob).map((w) => {
      const j = w.deletionJob;
      return '<li><span><strong>' + esc(j.id) + ' · ' + esc(w.participantId) + '</strong><span>' + esc(j.scope || '') + ' · proposed by ' + esc(j.proposedBy) + ' ' + esc(E.formatDate(j.proposedAt)) + (j.approvedBy ? ' · approved by ' + esc(j.approvedBy) : ' · awaiting approval by a different owner') + (j.completedAt ? ' · completed ' + esc(E.formatDateTime(j.completedAt)) + ' with deletion evidence' : '') + '</span>' + (j.reason ? '<span>Reason: ' + esc(j.reason) + '</span>' : '') + '</span>' + badge(j.status) + '</li>';
    }).join('');
    return pageHeader(project().name, 'Withdrawals & deletion', 'Deletion requires approval from a different owner.') + queue + details('Deletion job history', jobs ? '<ul class="admin-release-history">' + jobs + '</ul>' : '<p>No deletion jobs.</p>') + details('Deadlines & deletion safeguards', '<p>Deadlines follow the release terms in the project timezone; approval never extends them. One person proposes a deletion with a reason, a different owner approves it, and the system records deletion evidence.</p>');
  }

  function screenParticipants() {
    const P = S.participant;
    const rows = A.participants.map((p) => {
      const live = p.id === P.id;
      const evidence = participantConsent(p);
      const consent = evidence.version;
      const status = live ? P.status : p.status;
      const roundCells = D.ROUNDS.map((round) => '<td>' + badge(participantRoundStatus(p, round)) + '</td>').join('');
      const note = live ? 'Interactive demo participant' : p.note || '';
      const consentReleaseId = evidence.releaseId;
      const reconsent = participantNeedsReconsent(p);
      return '<tr class="' + (p.isNew ? 'is-new' : '') + '"><td class="admin-mono">' + esc(p.id) + '</td><td>' + badge(status) + '</td><td>' + esc(E.formatDate(p.invitedAt)) + '</td><td>' + (consent ? esc(consent) + (consentReleaseId ? '<div class="xs muted">' + esc(consentReleaseId) + '</div>' : '') + (reconsent ? ' ' + badge('re-consent required') : '') : '<span class="muted">—</span>') + '</td>' + roundCells + '<td class="xs muted">' + esc(note) + '</td></tr>';
    }).join('');
    return pageHeader(project().name, 'Participants & access', 'Demo links cannot grant access to a real study.', '<button type="button" class="btn btn-primary btn-sm" data-action="a-provision">' + icon('id-card', 'ico-sm') + ' Provision participant</button>') + panel('Participants', 'Only accepted donations count toward round progress.', '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Participant</th><th>Status</th><th>Invited</th><th>Consent</th>' + D.ROUNDS.map((round) => '<th>' + esc(round.name) + '</th>').join('') + '<th></th></tr></thead><tbody>' + rows + '</tbody></table></div>', 'id-card');
  }

  function screenAudit() {
    const rows = A.audit.map((a) => '<tr class="' + (a.isNew ? 'is-new' : '') + '"><td class="xs" style="white-space:nowrap">' + esc(E.formatDateTime(a.at)) + '</td><td class="admin-mono">' + esc(a.action) + '</td><td>' + esc(a.actor) + '</td><td class="admin-mono">' + esc(a.subject || '') + '</td><td>' + details('View event details', '<p>' + esc(a.summary) + '</p>') + '</td></tr>').join('');
    return pageHeader(project().name, 'Project audit', 'No raw Study IDs, tokens or payloads.') + panel('Audit events', 'Newest first · green rows are new this session.', '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>When</th><th>Action</th><th>Actor</th><th>Subject</th><th>Details</th></tr></thead><tbody>' + rows + '</tbody></table></div>', 'clock-ccw');
  }

  function screenSources() {
    const rel = activeRelease();
    const rows = D.SOURCES.map((s) => {
      const p = rel.sourcePolicies.find((x) => x.sourceId === s.id);
      const summary = p && p.mode === 'donation' ? details(p.categories.filter((c) => c.enabled).length + ' categories · view fields', p.categories.map((c) => (c.enabled ? '<div><b>' + esc(c.id) + '</b>: ' + c.fields.map((f) => f.mode === 'prohibited' ? '<s>' + esc(f.id) + '</s>' : esc(f.id) + (f.mode === 'optional' ? (f.defaultIncluded ? ' (on)' : ' (off)') : '')).join(', ') + '</div>' : '<div><s>' + esc(c.id) + '</s> disabled</div>')).join('')) : '<span class="muted">—</span>';
      return '<tr><td><strong>' + esc(s.displayName) + '</strong><div class="xs muted">' + badge(s.capabilityStatus) + '</div></td><td>' + badge(p ? p.mode : 'disabled') + '</td><td>' + (App.requiredSourceIds().includes(s.id) ? 'Yes' : 'No') + '</td><td class="xs">' + summary + '</td></tr>';
    }).join('');
    return pageHeader(project().name, 'Sources & data policy', 'All dates · approved fields · individual records can be excluded.') + panel('Version ' + rel.version + ' data policy', null, '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Source</th><th>Mode</th><th>Required in ' + esc(S.round.name) + '</th><th>Data policy</th></tr></thead><tbody>' + rows + '</tbody></table></div>', 'database') + details('Collection scope & sensitive fields', '<p>This read-only policy includes all available approved records and fields. Participants can exclude individual records, not fields or categories. Required labels include the current round requirements.</p><p>The scope notice discloses Facebook search words and potentially private group links.</p>');
  }

  function screenAdministrators() {
    const rows = D.ADMINS.map((a) => '<tr><td><strong>' + esc(a.displayName) + '</strong><div class="xs admin-mono muted">' + esc(a.username) + '</div></td><td>' + esc(a.role) + '</td><td>' + badge(a.status) + '</td><td>' + esc(E.formatDateTime(a.lastSeen)) + '</td></tr>').join('');
    return pageHeader('Umbrella', 'Administrators', 'Named staff accounts with three roles: owner, manager, viewer. Sensitive actions ask for the password again. Every administrator can see every study.') + panel('Accounts', null, '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Administrator</th><th>Role</th><th>Status</th><th>Last seen</th></tr></thead><tbody>' + rows + '</tbody></table></div>', 'users');
  }

  function screenAccount() {
    return pageHeader('Umbrella', 'Account & security', 'Your administrator identity, recovery codes and step-up state.') + panel('Step-up authentication', 'Sensitive actions (publish, suspend, downloads, deletion approvals) require re-authentication within 5 minutes.', '<p class="step-up-note ' + (stepUpFresh() ? 'is-fresh' : '') + '" style="font-size:var(--font-size-sm)">' + icon('key', 'ico-sm') + (stepUpFresh() ? 'Verified until ' + esc(new Date(A.stepUpUntil).toLocaleTimeString()) : 'Not currently verified') + '</p><div class="btn-row"><button type="button" class="btn btn-secondary btn-sm" data-action="a-stepup">Re-authenticate now</button></div>', 'shield-check') + panel('Session', null, '<dl class="admin-definition-list"><dt>Signed in as</dt><dd>' + esc(A.user.displayName) + ' (' + esc(A.user.username) + ')</dd><dt>Role</dt><dd>' + esc(A.user.role) + '</dd><dt>Idle timeout</dt><dd>15 minutes · absolute 8 hours</dd><dt>Cookie</dt><dd>HttpOnly · Secure · SameSite=Strict</dd></dl>', 'user-circle');
  }

  function screenFeedback() {
    const entries = [
      { rating: 5, screen: 'Review and donate', comment: 'The short summary helped, and I could open the list to remove one record.', status: 'reviewed' },
      { rating: 4, screen: 'Add your file', comment: 'Took me a minute to find the ZIP in Downloads; the file name hint helped.', status: 'unreviewed' },
      { rating: 4, screen: 'Review your donation', comment: 'The fingerprint idea is reassuring even if I do not fully get it.', status: 'unreviewed' },
    ];
    return pageHeader(project().name, 'Feedback', STUBS.feedback[1]) + panel('Recent feedback', null, '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Rating</th><th>Screen</th><th>Comment</th><th>Status</th></tr></thead><tbody>' + entries.map((e) => '<tr><td>' + '★'.repeat(e.rating) + '</td><td>' + esc(e.screen) + '</td><td>' + esc(e.comment) + '</td><td>' + badge(e.status) + '</td></tr>').join('') + '</tbody></table></div>', 'chat');
  }

  function screenStub(id) {
    const [title, description] = STUBS[id];
    return pageHeader(project().name, title, description) + '<section class="admin-panel"><div class="admin-state"><span class="admin-empty-icon">' + icon('info') + '</span><br />This screen is not part of the tour.<br /><span class="xs">It exists in the product with the description above.</span></div></section>';
  }

  const SCREENS = { projects: screenProjects, overview: screenOverview, donations: screenDonations, release: screenRelease, system: screenSystem, rounds: screenRounds, withdrawals: screenWithdrawals, participants: screenParticipants, audit: screenAudit, sources: screenSources, administrators: screenAdministrators, account: screenAccount, feedback: screenFeedback };

  function renderAdmin(opts) {
    const shell = document.getElementById('admin-shell');
    if (!shell) return;
    if (!SCREENS[A.screen] && !STUBS[A.screen]) A.screen = 'overview';
    const body = SCREENS[A.screen] ? SCREENS[A.screen]() : screenStub(A.screen);
    shell.className = 'admin-shell' + (A.navOpen ? ' nav-open' : '');
    shell.innerHTML =
      '<div style="grid-column:1/-1;display:contents"><div class="admin-mobile-header"><button type="button" class="icon-btn" aria-label="Open administrator navigation" aria-expanded="' + A.navOpen + '" data-action="a-nav-toggle">' + icon('list') + '</button><span><strong>DataDonate</strong><small>Administration</small></span></div></div>' +
      '<button type="button" class="admin-nav-scrim" aria-label="Close administrator navigation" data-action="a-nav-toggle"></button>' +
      sidebar() +
      '<main class="admin-main" id="admin-main"><p class="xs muted">Offline simulation · fictional accounts and records · no real authentication, uploads, emails or administrative changes.</p>' + body + '</main>';
    App.syncHash('admin', A.screen);
    if (opts && opts.focus) {
      const h1 = shell.querySelector('.admin-main h1');
      if (h1) h1.focus({ preventScroll: true });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Actions                                                             */
  /* ------------------------------------------------------------------ */

  App.actions['a-nav'] = (el) => {
    A.screen = el.dataset.screen;
    A.navOpen = false;
    renderAdmin({ focus: true });
  };
  App.actions['a-nav-toggle'] = () => {
    A.navOpen = !A.navOpen;
    renderAdmin();
  };
  App.actions['a-not-in-tour'] = () => App.toast('This control exists in the product but is not part of the tour.');
  App.changes['a-project'] = (el) => {
    if (el.value !== project().id) {
      App.toast('The draft project “' + D.PROJECTS[1].name + '” has no published release yet. The tour stays in the active project.');
      el.value = project().id;
    }
  };
  App.changes['a-lifecycle'] = (el) => {
    App.toast('Lifecycle changes can immediately affect participant access. Activation still requires a valid published release. (Not applied in the demo.)');
    el.selectedIndex = 0;
  };
  App.changes['a-filter-status'] = (el) => {
    A.filters.status = el.value;
    renderAdmin();
  };
  App.changes['a-filter-platform'] = (el) => {
    A.filters.platform = el.value;
    renderAdmin();
  };
  App.changes['a-filter-round'] = (el) => {
    A.filters.round = el.value;
    renderAdmin();
  };
  App.actions['a-stepup'] = async () => {
    A.stepUpUntil = 0;
    if (await requireStepUp()) renderAdmin();
  };

  App.actions['a-suspend'] = async (el) => {
    const id = el.dataset.source;
    if (A.user.role !== 'owner') return App.toast('Only an owner can suspend a source adapter.');
    const result = await App.dialog({ title: 'Suspend uploads for ' + App.sourceName(id) + '?', body: '<p>Participants will immediately lose the upload control for this source. Donation creation and final acceptance both re-check this switch. Published releases are not modified.</p>', fields: [{ name: 'reason', label: 'Reason (recorded in the audit log)', type: 'textarea', required: true, placeholder: 'For example: export format changed on ' + S.today + '; adapter under re-verification.' }], confirmLabel: 'Suspend uploads', danger: true });
    if (!result.ok) return;
    if (!(await requireStepUp())) return;
    S.catalog.suspended[id] = { reason: result.values.reason, at: App.nowIso(), by: A.user.username };
    App.addAudit({ action: 'source.suspended', actor: 'admin ' + A.user.username, subject: id, summary: App.sourceName(id) + ' adapter suspended globally. Reason: ' + result.values.reason });
    S.server.fallback = null;
    renderAdmin();
    App.toast(App.sourceName(id) + ' uploads suspended. Open the participant journey to see the tile change.');
  };
  App.actions['a-restore'] = async (el) => {
    const id = el.dataset.source;
    const result = await App.dialog({ title: 'Restore uploads for ' + App.sourceName(id) + '?', body: '<p>Review affected projects, in-flight uploads and audit events before restoring. Attempts that were paused at completion can be retried.</p>', confirmLabel: 'Restore uploads' });
    if (!result.ok) return;
    if (!(await requireStepUp())) return;
    delete S.catalog.suspended[id];
    App.addAudit({ action: 'source.restored', actor: 'admin ' + A.user.username, subject: id, summary: App.sourceName(id) + ' adapter restored globally.' });
    renderAdmin();
    App.toast(App.sourceName(id) + ' uploads restored.');
  };

  App.actions['a-change'] = (el) => {
    const kind = el.dataset.kind;
    const rel = activeRelease();
    const change = kind === 'consent'
      ? { section: 'Consent', summary: 'Simulated consent wording change: clarified the retention period (new demo document ' + bumpVersion(rel.consentVersion) + '). Earlier documents remain unchanged.', material: true }
      : kind === 'contact'
        ? { section: 'Project setup', summary: 'Coordinator contact changed to study-team@oasislab.example. Contact-only change; consent stays valid.', material: false }
        : { section: 'Participant guides', summary: 'YouTube guide step 3 wording refreshed against the current Takeout layout.', material: false };
    if (A.release.draftChanges.some((c) => c.summary === change.summary)) return App.toast('That draft change is already listed.');
    A.release.draftChanges.push(change);
    if (change.material) A.release.consentVersionDraft = bumpVersion(rel.consentVersion);
    renderAdmin();
  };
  App.changes['a-reconsent'] = (el) => {
    A.release.reconsentAck = el.checked;
  };

  function bumpVersion(v) {
    return String(v).replace(/\d+(?=\D*$)/, (part) => String(Number(part) + 1));
  }

  App.actions['a-publish'] = async () => {
    const changes = A.release.draftChanges;
    if (!changes.length) return;
    const material = changes.some((c) => c.material);
    if (material && !A.release.reconsentAck) {
      App.toast('Acknowledge the re-consent requirement before publishing.');
      return;
    }
    const rel = activeRelease();
    const nextVersion = Math.max(...S.releases.map((r) => r.version)) + 1;
    const result = await App.dialog({ title: 'Simulate publishing release v' + nextVersion + '?', body: '<p>This changes only the in-memory demo. No real project is published. The product uses immutable releases and guarded publication.</p>' + (material ? '<p><strong>This release requires re-consent.</strong> The demo participant will see the consent step again before the next donation.</p>' : '<p>Non-material changes only: existing consents remain valid.</p>'), confirmLabel: 'Verify and simulate' });
    if (!result.ok) return;
    if (!(await requireStepUp())) return;
    const release = Object.assign({}, JSON.parse(JSON.stringify(rel)), {
      id: 'rel_v' + nextVersion,
      projectId: rel.projectId,
      version: nextVersion,
      status: 'active',
      publishedAt: App.nowIso(),
      publishedBy: A.user.username,
      supersedesReleaseId: rel.id,
      requiresReconsent: material,
      consentVersion: material ? A.release.consentVersionDraft : rel.consentVersion,
      sourcePolicies: JSON.parse(JSON.stringify(rel.sourcePolicies)),
      material: Object.assign({}, JSON.parse(JSON.stringify(rel.material)), { consentVersion: material ? A.release.consentVersionDraft : rel.consentVersion }, changes.some((c) => c.section === 'Project setup') ? { contact: 'study-team@oasislab.example' } : {}),
      changes: changes.slice(),
    });
    rel.status = 'superseded';
    S.releases.push(release);
    S.activeReleaseId = release.id;
    S.project.activeReleaseId = release.id;
    S.server.fallback = null;
    await App.computeReleaseHashes(release);
    App.addAudit({ action: 'release.published', actor: 'admin ' + A.user.username, subject: release.id, summary: 'Release v' + nextVersion + ' published after step-up; active pointer switched atomically.' + (material ? ' Material change flagged re-consent (consent ' + release.consentVersion + ').' : ' Non-material changes only.') });
    A.release.draftChanges = [];
    A.release.reconsentAck = false;
    A.release.consentVersionDraft = null;
    renderAdmin();
    App.toast('Demo release v' + nextVersion + ' is active in this page only. Policy hash ' + E.shortHash(App.hashesFor(release.id).materialHash, 8, 4) + (material ? ' · participants must re-consent.' : '.'));
  };

  App.actions['a-propose-deletion'] = async (el) => {
    const w = A.withdrawals.find((x) => x.id === el.dataset.wd);
    if (!w) return;
    const scopeRoundKey = w.roundKey || null;
    const count = A.donations.filter((d) => d.participantId === w.participantId && d.status === 'accepted' && (!scopeRoundKey || d.roundKey === scopeRoundKey)).length;
    const scope = (scopeRoundKey ? roundName(scopeRoundKey) : 'All rounds in this study') + ' · ' + count + ' accepted donation' + (count === 1 ? '' : 's');
    const result = await App.dialog({ title: 'Propose simulated deletion for ' + w.participantId + '?', body: '<p>Scope: ' + esc(scope) + '. A different demo owner must approve. Only fictional metadata changes; no real files are deleted.</p>', fields: [{ name: 'reason', label: 'Reason', type: 'textarea', required: true, placeholder: 'Participant withdrawal request received ' + E.formatDate(w.requestedAt) }], confirmLabel: 'Propose deletion' });
    if (!result.ok) return;
    if (!(await requireStepUp())) return;
    w.deletionJob = { id: 'job_del_' + E.fnv1a(w.id).toString(16).slice(0, 4), status: 'pending_approval', proposedBy: A.user.username, proposedAt: App.nowIso(), reason: result.values.reason, roundKey: scopeRoundKey, scope };
    w.status = 'processing';
    App.addAudit({ action: 'deletion_job.proposed', actor: 'admin ' + A.user.username, subject: w.deletionJob.id, summary: 'Withdrawal deletion proposed for ' + w.participantId + ' (' + w.deletionJob.scope + '). Awaiting approval by a different owner.' });
    renderAdmin();
    App.toast('Deletion proposed. Because you proposed it, you cannot approve it: a different owner must.');
  };
  App.actions['a-approve-deletion'] = async (el) => {
    const w = A.withdrawals.find((x) => x.id === el.dataset.wd);
    if (!w || !w.deletionJob) return;
    const job = w.deletionJob;
    if (job.proposedBy === A.user.username) {
      await App.dialog({ title: 'Self-approval is rejected', body: '<p>' + esc(job.id) + ' was proposed by <strong>' + esc(job.proposedBy) + '</strong>, the account you are signed in as. The server enforces that a different owner approves every destructive job.</p>', confirmLabel: 'Understood', cancelLabel: 'Close' });
      return;
    }
    const result = await App.dialog({ title: 'Approve deletion ' + job.id + '?', body: '<p>Scope: ' + esc(job.scope) + '. Proposed by ' + esc(job.proposedBy) + ' with reason “' + esc(job.reason || 'Not provided') + '”. The worker will re-resolve the exact scope, delete the primary-storage objects and write deletion evidence.</p>', confirmLabel: 'Approve deletion', danger: true });
    if (!result.ok) return;
    if (!(await requireStepUp())) return;
    job.status = 'queued';
    job.approvedBy = A.user.username;
    job.approvedAt = App.nowIso();
    App.addAudit({ action: 'deletion_job.approved', actor: 'admin ' + A.user.username, subject: job.id, summary: 'Deletion approved by a different owner; job queued for the worker.' });
    renderAdmin();
    App.sequence([
      { delay: 1200, run: () => { job.status = 'running'; if (A.screen === 'withdrawals') renderAdmin(); } },
      {
        delay: 1600,
        run: () => {
          job.status = 'completed';
          job.completedAt = App.nowIso();
          w.status = 'completed';
          A.donations.forEach((d) => {
            const roundKey = job.roundKey || w.roundKey || (D.ROUNDS.find((r) => String(job.scope).startsWith(r.roundKey + ' ·')) || {}).roundKey;
            if (d.participantId === w.participantId && d.status === 'accepted' && (!roundKey || d.roundKey === roundKey)) d.status = 'deleted';
          });
          App.addAudit({ action: 'deletion.completed', actor: 'system worker', subject: job.id, summary: 'Primary payload objects deleted through stored, project-bound metadata; donations marked deleted; deletion evidence written.' });
          if (A.screen === 'withdrawals') renderAdmin();
          App.toast('Deletion ' + job.id + ' completed with evidence.');
        },
      },
    ]);
  };

  App.actions['a-provision'] = async () => {
    const result = await App.dialog({ title: 'Provision a demo participant', body: '<p>Adds a fictional participant in <strong>' + esc(S.round.name) + '</strong> to this page only. No account, email or real access link is created.</p>', fields: [{ name: 'alias', label: 'Fictional internal alias (optional)', type: 'text', placeholder: 'e.g. cohort-b-12' }], confirmLabel: 'Create demo link' });
    if (!result.ok) return;
    const n = 417 + A.participants.length;
    const id = 'P-0' + n;
    A.participants.push({ id, status: 'invited', invitedAt: S.today, consentVersion: null, consentReleaseId: null, rounds: Object.fromEntries(D.ROUNDS.map((r) => [r.roundKey, 'none'])), note: result.values.alias || '', isNew: true });
    const bytes = new Uint8Array(32);
    (window.crypto || {}).getRandomValues ? window.crypto.getRandomValues(bytes) : bytes.fill(7);
    const token = btoa(String.fromCharCode.apply(null, bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    App.addAudit({ action: 'participant.provisioned', actor: 'admin ' + A.user.username, subject: id, summary: 'Pseudonymous participant created in ' + S.round.roundKey + '; invitation link displayed once.' });
    renderAdmin();
    await App.dialog({ title: id + ' created · link shown once', body: '<p>Copy the canonical private link now. It is never returned again by any API; reissuing revokes it.</p><p><code class="mono" style="word-break:break-all;display:block;padding:0.5rem;border:1px solid var(--color-border);border-radius:8px;background:var(--color-surface-subtle)">https://datadonate.example/p/' + esc(project().slug) + '/join#token=' + esc(token) + '</code></p><p class="xs muted">The token is in the URL fragment: it never appears in server logs, Referer headers or link-scanner requests. Send it through an approved channel without shortening or tracking.</p>', confirmLabel: 'I saved it', cancelLabel: 'Close' });
  };

  App.views.admin = {
    render(sub) {
      if (sub && (SCREENS[sub] || STUBS[sub])) A.screen = sub;
      renderAdmin();
    },
  };
})();
