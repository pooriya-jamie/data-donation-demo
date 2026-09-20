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
    consent: ['Consent', 'Immutable consent documents, comprehension questions with server-side answers, scroll and signature rules, receipt and email-copy behavior.'],
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

  function stepUpFresh() {
    return Date.now() < A.stepUpUntil;
  }

  async function requireStepUp() {
    if (stepUpFresh()) return true;
    const result = await App.dialog({
      title: 'Confirm it is you',
      body: '<p>Sensitive administrator actions require recent step-up authentication (within the last 5 minutes). Re-enter your password to continue.</p>',
      fields: [{ name: 'password', label: 'Password for ' + A.user.username, type: 'password', required: true, hint: 'Demo: any value is accepted.' }],
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

  function acceptedDonations() {
    return A.donations.filter((d) => d.status === 'accepted');
  }

  function reconsentPending() {
    const rel = activeRelease();
    return A.participants.filter((p) => p.status === 'active' && p.consentVersion && p.consentVersion !== rel.consentVersion);
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
    return pageHeader('Umbrella', 'Projects', 'Create and manage independent data-donation projects from one secure administration workspace.', '<button type="button" class="btn btn-primary btn-sm" data-action="a-not-in-tour">New project</button>') + '<div class="admin-project-grid">' + cards + '</div>';
  }

  function screenOverview() {
    const pr = project();
    const rel = activeRelease();
    const active = A.participants.filter((p) => p.status === 'active').length;
    const invited = A.participants.filter((p) => p.status === 'invited').length;
    const accepted = acceptedDonations().length;
    const pendingWithdrawals = A.withdrawals.filter((w) => w.status === 'received').length;
    const jobsAwaiting = A.withdrawals.filter((w) => w.deletionJob && w.deletionJob.status === 'pending_approval').length;
    const suspended = Object.keys(S.catalog.suspended);
    const reconsent = reconsentPending();
    const metrics =
      '<div class="admin-metric-grid">' +
      '<div class="admin-metric"><span>Participants</span><strong>' + active + '</strong><small>' + active + ' active · ' + invited + ' invited</small></div>' +
      '<div class="admin-metric admin-metric-positive"><span>Accepted donations</span><strong>' + accepted + '</strong><small>' + A.donations.length + ' total attempts</small></div>' +
      '<div class="admin-metric"><span>Feedback</span><strong>' + D.FEEDBACK.averageRating.toFixed(1) + '</strong><small>average rating · ' + D.FEEDBACK.ratings + ' ratings</small></div>' +
      '<div class="admin-metric ' + (pendingWithdrawals ? 'admin-metric-warning' : '') + '"><span>Pending withdrawals</span><strong>' + pendingWithdrawals + '</strong><small>' + jobsAwaiting + ' job' + (jobsAwaiting === 1 ? '' : 's') + ' awaiting action</small></div>' +
      '</div>';
    const attention =
      '<ul class="admin-action-list">' +
      (suspended.length ? '<li class="is-alert"><button type="button" data-action="a-nav" data-screen="system"><span><strong>' + suspended.length + ' source adapter' + (suspended.length > 1 ? 's' : '') + ' suspended: ' + esc(suspended.map(App.sourceName).join(', ')) + '</strong><span>Participants cannot upload for this source until an owner restores it.</span></span>' + icon('arrow-right', 'ico-sm') + '</button></li>' : '') +
      (reconsent.length ? '<li><button type="button" data-action="a-nav" data-screen="participants"><span><strong>' + reconsent.length + ' participant' + (reconsent.length > 1 ? 's' : '') + ' must re-consent</strong><span>Release v' + rel.version + ' changed material terms; their next session starts with consent.</span></span>' + icon('arrow-right', 'ico-sm') + '</button></li>' : '') +
      '<li><button type="button" data-action="a-nav" data-screen="withdrawals"><span><strong>' + pendingWithdrawals + ' withdrawal request' + (pendingWithdrawals === 1 ? '' : 's') + '</strong><span>Review deadlines and begin deletion jobs.</span></span>' + icon('arrow-right', 'ico-sm') + '</button></li>' +
      '<li><button type="button" data-action="a-nav" data-screen="feedback"><span><strong>' + D.FEEDBACK.unreviewed + ' unreviewed feedback entries</strong><span>Read usability comments and mark follow-up.</span></span>' + icon('arrow-right', 'ico-sm') + '</button></li>' +
      '<li><button type="button" data-action="a-nav" data-screen="participants"><span><strong>Manage participant access</strong><span>Provision access links and review delivery status.</span></span>' + icon('arrow-right', 'ico-sm') + '</button></li>' +
      '</ul>';
    const system =
      '<dl class="admin-definition-list"><dt>Health</dt><dd>' + badge(D.SYSTEM.status) + '</dd><dt>Deployment</dt><dd>' + esc(D.SYSTEM.deploymentProfile) + ' profile · S3 SSE-KMS</dd><dt>Application version</dt><dd><code>' + esc(D.SYSTEM.appVersion.slice(0, 12)) + '</code></dd><dt>Active release</dt><dd>v' + rel.version + ' · published ' + esc(E.formatDate(rel.publishedAt)) + '</dd><dt>Policy hash</dt><dd><code>' + esc(E.shortHash(App.hashesFor(rel.id).materialHash, 10, 6)) + '</code></dd></dl>' +
      '<p style="margin:0.75rem 0 0"><button type="button" class="link-btn" data-action="a-nav" data-screen="system">Open system details</button></p>';
    const byPlatform = App.donationSources().map((s) => {
      const n = acceptedDonations().filter((d) => d.platform === s.id).length;
      return { label: s.displayName, n };
    });
    const max = Math.max(1, ...byPlatform.map((b) => b.n));
    const bars = '<div class="admin-platform-bars">' + byPlatform.map((b) => '<div><span>' + esc(b.label) + '</span><progress value="' + b.n + '" max="' + max + '" aria-label="' + esc(b.label) + ' accepted donations"></progress><b>' + b.n + '</b></div>').join('') + '</div>';
    return (
      pageHeader(pr.name, 'Overview', 'Monitor participation, review incoming feedback, and respond to time-sensitive requests.') +
      metrics +
      '<div class="admin-dashboard-grid">' +
      '<section class="admin-panel"><div class="admin-panel-heading"><div><span class="admin-eyebrow">Action center</span><h2>' + icon('warning-circle') + 'Needs attention</h2></div></div>' + attention + '</section>' +
      '<section class="admin-panel"><div class="admin-panel-heading"><div><span class="admin-eyebrow">Environment</span><h2>' + icon('check-circle') + 'System status</h2></div></div>' + system + '</section>' +
      '</div>' +
      '<section class="admin-panel"><div class="admin-panel-heading"><div><span class="admin-eyebrow">Activity</span><h2>' + icon('database') + 'Donations by platform</h2></div><p>Accepted donations in ' + esc(S.round.name) + '. Metadata only.</p></div>' + bars + '</section>'
    );
  }

  function donationRow(d) {
    return '<tr class="' + (d.isNew ? 'is-new' : '') + '"><td class="admin-mono">' + esc(d.id.slice(0, 16)) + '…</td><td class="admin-mono">' + esc(d.participantId) + '</td><td>' + esc(App.sourceName(d.platform)) + '</td><td>' + (d.records ? E.formatNumber(d.records) : '—') + '</td><td>' + (d.payloadBytes ? E.formatBytes(d.payloadBytes) : '—') + '</td><td>' + esc(E.formatDateTime(d.createdAt)) + '</td><td>' + badge(d.status) + (d.receiptCode && d.status === 'accepted' ? '<div class="xs admin-mono muted">' + esc(d.receiptCode) + '</div>' : '') + '</td></tr>';
  }

  function screenDonations() {
    const f = A.filters;
    const rows = A.donations.filter((d) => (f.status === 'all' || d.status === f.status) && (f.platform === 'all' || d.platform === f.platform));
    const statuses = ['all', 'awaiting_upload', 'uploaded', 'accepted', 'failed', 'deleted'];
    const filters = '<div class="admin-filters"><select class="select-input" data-change="a-filter-status" aria-label="Status">' + statuses.map((s) => '<option value="' + s + '" ' + (f.status === s ? 'selected' : '') + '>' + (s === 'all' ? 'All statuses' : esc(s.replace('_', ' ').replace(/^./, (c) => c.toUpperCase()))) + '</option>').join('') + '</select><select class="select-input" data-change="a-filter-platform" aria-label="Platform"><option value="all">All platforms</option>' + App.donationSources().map((s) => '<option value="' + s.id + '" ' + (f.platform === s.id ? 'selected' : '') + '>' + esc(s.displayName) + '</option>').join('') + '</select></div>';
    const table = rows.length
      ? '<div class="admin-table-wrap responsive"><table class="admin-table"><thead><tr><th>Donation</th><th>Participant</th><th>Platform</th><th>Records</th><th>Size</th><th>Created</th><th>Status</th></tr></thead><tbody>' + rows.map(donationRow).join('') + '</tbody></table></div>' +
        '<div class="admin-mobile-list">' + rows.map((d) => '<div class="admin-mobile-card"><strong class="admin-mono">' + esc(d.id.slice(0, 16)) + '…</strong> ' + badge(d.status) + '<dl class="kv"><dt>Participant</dt><dd>' + esc(d.participantId) + '</dd><dt>Platform</dt><dd>' + esc(App.sourceName(d.platform)) + '</dd><dt>Records</dt><dd>' + (d.records ? E.formatNumber(d.records) : '—') + '</dd><dt>Created</dt><dd>' + esc(E.formatDate(d.createdAt)) + '</dd></dl></div>').join('') + '</div>'
      : '<div class="admin-empty"><span class="admin-empty-icon">' + icon('database') + '</span><br /><strong>No donation attempts found</strong><br />No donations match the selected filters.</div>';
    return (
      pageHeader(project().name, 'Donations', 'Review donation metadata and integrity status. Payload contents remain protected behind a separate audited download workflow.', '<button type="button" class="btn btn-secondary btn-sm" data-action="a-nav" data-screen="downloads">' + icon('download', 'ico-sm') + ' Secure downloads</button>') +
      '<div class="admin-privacy-callout">' + icon('shield-check') + '<div><strong>Metadata-only view</strong><p>This page never renders participant payload content. Downloads require a reason, step-up verification, and an audit event.</p></div></div>' +
      panel('Donation attempts', 'Filter by processing status or source platform. Rows highlighted in green arrived from the participant journey in this session.', filters + table)
    );
  }

  function screenRelease() {
    const rel = activeRelease();
    const nextVersion = Math.max(...S.releases.map((r) => r.version)) + 1;
    const changes = A.release.draftChanges;
    const material = changes.some((c) => c.material);
    const warnings = [];
    const roundRequired = S.round.requiredSourceIds.filter((id) => !rel.sourcePolicies.find((p) => p.sourceId === id && p.required));
    if (roundRequired.length) warnings.push({ title: 'Round ' + S.round.roundKey + ' adds a required source', detail: App.sourceName(roundRequired[0]) + ' is optional at project level but required by this round. Completion and flat compensation use the union: ' + App.requiredSourceIds().map(App.sourceName).join(' + ') + '.' });
    Object.keys(S.catalog.suspended).forEach((id) => warnings.push({ title: App.sourceName(id) + ' adapter is globally suspended', detail: 'Publishing does not change the global switch. Participants cannot upload for this source until an owner restores it.' }));
    if (material) warnings.push({ title: 'Material change: every active participant must re-consent', detail: reconsentPending().length + ' already need it from v' + rel.version + '; ' + A.participants.filter((p) => p.status === 'active' && p.consentVersion === rel.consentVersion).length + ' more will after v' + nextVersion + '.' });
    const ready = changes.length > 0;
    const hero =
      '<div class="admin-release-hero ' + (ready ? 'is-ready' : 'is-idle') + '"><div><span class="admin-eyebrow">Next release · v' + nextVersion + '</span><h2>' + (ready ? 'Ready to publish' : 'Nothing to publish yet') + '</h2><p>' + (ready ? 'All readiness checks pass. Publication writes one immutable release and switches the active pointer in the same transaction.' : 'The draft matches release v' + rel.version + '. Use the simulation buttons to draft a change, then review what it means for participants.') + '</p></div>' +
      '<div class="btn-row"><button type="button" class="btn btn-primary" data-action="a-publish" ' + (ready ? '' : 'disabled') + '>' + icon('rocket') + ' Publish release v' + nextVersion + '</button></div></div>';
    const toolbar = '<div class="admin-toolbar"><span class="small muted">Simulate a draft edit:</span><button type="button" class="btn btn-secondary btn-sm" data-action="a-change" data-kind="consent">' + icon('pencil', 'ico-sm') + ' Edit consent wording (material)</button><button type="button" class="btn btn-secondary btn-sm" data-action="a-change" data-kind="contact">' + icon('pencil', 'ico-sm') + ' Edit coordinator contact (non-material)</button><button type="button" class="btn btn-secondary btn-sm" data-action="a-change" data-kind="guide">' + icon('pencil', 'ico-sm') + ' Edit YouTube guide (non-material)</button></div>';
    const blockers = panel('Blocking checks', null, '<div class="notice notice-success" style="margin:0">' + icon('check-circle') + '<p>No blocking checks. Governance, contacts, consent, collection rounds, source and field policy, guide snapshots, communication templates, dates, compensation, retention and deletion terms are complete.</p></div>', 'check-circle');
    const warn = panel('Warnings to review', null, warnings.length ? '<ul class="admin-issue-list">' + warnings.map((w) => '<li class="is-warning"><span><strong>' + esc(w.title) + '</strong><span>' + esc(w.detail) + '</span></span>' + badge('review required') + '</li>').join('') + '</ul>' : '<p class="small muted" style="margin:0">No warnings.</p>', 'warning-circle');
    const changesHtml = changes.length ? '<ul class="admin-release-changes">' + changes.map((c) => '<li><span><strong>' + esc(c.section) + '</strong><span>' + esc(c.summary) + '</span></span>' + badge(c.material ? 're-consent required' : 'non-material') + '</li>').join('') + '</ul>' : '<p class="small muted" style="margin:0">No draft changes compared with release v' + rel.version + '.</p>';
    const reconsent = material ? '<div class="admin-reconsent-check"><label class="check-row"><input type="checkbox" data-change="a-reconsent" ' + (A.release.reconsentAck ? 'checked' : '') + ' /><span><span class="check-text"><strong>I understand this release will require re-consent.</strong></span><span class="check-desc">Existing consents remain valid for the release they were given for; new sessions and donation attempts require consent ' + esc(A.release.consentVersionDraft || rel.consentVersion) + '.</span></span></label></div>' : '';
    const history = panel('Release history', null, '<ul class="admin-release-history">' + S.releases.slice().sort((a, b) => b.version - a.version).map((r) => '<li><span><strong>Release v' + r.version + '</strong><span>Published ' + esc(E.formatDateTime(r.publishedAt)) + ' by ' + esc(r.publishedBy) + ' · consent ' + esc(r.consentVersion) + ' · policy ' + esc(E.shortHash(App.hashesFor(r.id).materialHash, 10, 6)) + '</span></span><span class="btn-row">' + (r.requiresReconsent ? badge('re-consent required') : '') + badge(r.status) + '</span></li>').join('') + '</ul>', 'clock-ccw');
    return pageHeader(project().name, 'Review & publish', 'Check the setup, see what changed, and publish a new locked version of the study.') + hero + toolbar + '<div class="admin-two-column">' + blockers + warn + '</div>' + panel('Changes in this release', 'Compared with the current version (v' + rel.version + '). Changes to consent, what is collected, payment, how long data is kept or how it is deleted mean participants must agree again.', changesHtml + reconsent, 'list-checks') + history;
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
    const catalog = panel('Global source adapters', 'Pausing a service is an emergency switch for owners, with a reason on record. Participants lose the upload button for that service immediately; every donation is re-checked against this switch.', '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Source</th><th>Base capability</th><th>Operational state</th><th>Control</th></tr></thead><tbody>' + rows + '</tbody></table></div>', 'sliders');
    const releaseInfo = panel('Release information', null, '<dl class="admin-definition-list"><dt>Application version</dt><dd><code>' + esc(sys.appVersion) + '</code></dd><dt>Deployment profile</dt><dd>' + esc(sys.deploymentProfile) + '</dd><dt>Last backup</dt><dd>' + badge(sys.backup.status) + ' ' + esc(E.formatDateTime(sys.backup.completedAt)) + '</dd><dt>Umbrella projects</dt><dd>' + D.PROJECTS.length + ' (' + D.PROJECTS.filter((p) => p.lifecycle === 'active').length + ' active)</dd></dl>', 'info');
    return pageHeader('Operations', 'System', 'Read-only service health and release information for this deployment.') + '<section class="admin-panel admin-health-hero"><div><span class="admin-eyebrow">Overall status</span><h2>' + badge(sys.status) + ' All services reporting</h2></div><span class="step-up-note ' + (stepUpFresh() ? 'is-fresh' : '') + '">' + icon('key', 'ico-sm') + (stepUpFresh() ? 'Step-up verified' : 'Step-up required for controls') + '</span></section>' + health + catalog + releaseInfo;
  }

  function screenRounds() {
    const rel = activeRelease();
    const projectRequired = rel.sourcePolicies.filter((p) => p.mode === 'donation' && p.required).map((p) => p.sourceId);
    const list = '<ul class="admin-round-list">' + D.ROUNDS.map((r) => {
      const union = Array.from(new Set(projectRequired.concat(r.requiredSourceIds)));
      return '<li><span><strong>' + esc(r.name) + ' <span class="admin-mono xs muted">' + esc(r.roundKey) + '</span></strong><span>Opens ' + esc(E.formatDate(r.startsAt)) + ' · donations close ' + esc(E.formatDate(r.donationsCloseAt)) + ' · access ends ' + esc(E.formatDate(r.participantAccessEndsAt)) + '</span><span>Required: ' + esc(union.map(App.sourceName).join(' + ') || 'none') + ' (project ' + esc(projectRequired.map(App.sourceName).join(', ') || '—') + ' ∪ round ' + esc(r.requiredSourceIds.map(App.sourceName).join(', ') || '—') + ') · eligibility: ' + esc(r.eligibilityMode.replace(/_/g, ' ')) + '</span><span>' + r.completed + ' completed · ' + r.partial + ' partial · ' + r.accepted + ' accepted donations</span></span>' + badge(r.status) + '</li>';
    }).join('') + '</ul>';
    return pageHeader(project().name, 'Collection rounds', 'A round is a collection wave. A participant can donate each service once per round and come back for the next wave.', '<button type="button" class="btn btn-primary btn-sm" data-action="a-not-in-tour">New round</button>') + panel('Rounds', null, list, 'flag') + '<div class="notice notice-info">' + icon('info') + '<p>A service the study marks as required is required in every round; a round can add more. Payment eligibility is recorded only when every required service has an accepted donation.</p></div>';
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
    const queue = panel('Withdrawal queue', 'Deadlines come from the release SLA in the project timezone. The approval control never extends a promised deadline.', '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Participant</th><th>Requested</th><th>Deadline</th><th>Status</th><th>Deletion job</th><th>Action</th></tr></thead><tbody>' + rows + '</tbody></table></div>', 'list-checks');
    const jobs = A.withdrawals.filter((w) => w.deletionJob).map((w) => {
      const j = w.deletionJob;
      return '<li><span><strong>' + esc(j.id) + ' · ' + esc(w.participantId) + '</strong><span>' + esc(j.scope || '') + ' · proposed by ' + esc(j.proposedBy) + ' ' + esc(E.formatDate(j.proposedAt)) + (j.approvedBy ? ' · approved by ' + esc(j.approvedBy) : ' · awaiting approval by a different owner') + (j.completedAt ? ' · completed ' + esc(E.formatDateTime(j.completedAt)) + ' with deletion evidence' : '') + '</span>' + (j.reason ? '<span>Reason: ' + esc(j.reason) + '</span>' : '') + '</span>' + badge(j.status) + '</li>';
    }).join('');
    return pageHeader(project().name, 'Withdrawals & deletion', 'Erasing data takes two people: one proposes it with a reason, a different owner approves it, then the system deletes the files and records proof.') + queue + panel('Deletion jobs', null, jobs ? '<ul class="admin-release-history">' + jobs + '</ul>' : '<p class="small muted" style="margin:0">No deletion jobs.</p>', 'trash');
  }

  function screenParticipants() {
    const rel = activeRelease();
    const P = S.participant;
    const rows = A.participants.map((p) => {
      const live = p.id === P.id;
      const consent = live ? (P.consent.agreed ? P.consent.version : null) : p.consentVersion;
      const status = live ? P.status : p.status;
      const w2 = live ? (P.donations.length ? (App.requiredSourceIds().every((id) => P.donations.some((d) => d.platform === id)) ? 'complete' : 'partial') : 'none') : p.rounds['wave-2'];
      const note = live ? 'Live tour participant' : p.note || '';
      const reconsent = status === 'active' && consent && consent !== rel.consentVersion;
      return '<tr class="' + (p.isNew ? 'is-new' : '') + '"><td class="admin-mono">' + esc(p.id) + '</td><td>' + badge(status) + '</td><td>' + esc(E.formatDate(p.invitedAt)) + '</td><td>' + (consent ? esc(consent) + (reconsent ? ' ' + badge('re-consent required') : '') : '<span class="muted">—</span>') + '</td><td>' + badge(p.rounds['wave-1']) + '</td><td>' + badge(w2) + '</td><td class="xs muted">' + esc(note) + '</td></tr>';
    }).join('');
    return pageHeader(project().name, 'Participants & access', 'Participants are codes, not names. Private links are shown once; any contact email is stored separately and hidden.', '<button type="button" class="btn btn-primary btn-sm" data-action="a-provision">' + icon('id-card', 'ico-sm') + ' Provision participant</button>') + panel('Participants', 'Each code belongs to this study only.', '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Participant</th><th>Status</th><th>Invited</th><th>Consent</th><th>Wave 1</th><th>Wave 2</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>', 'id-card');
  }

  function screenAudit() {
    const rows = A.audit.map((a) => '<tr class="' + (a.isNew ? 'is-new' : '') + '"><td class="xs" style="white-space:nowrap">' + esc(E.formatDateTime(a.at)) + '</td><td class="admin-mono">' + esc(a.action) + '</td><td>' + esc(a.actor) + '</td><td class="admin-mono">' + esc(a.subject || '') + '</td><td>' + esc(a.summary) + '</td></tr>').join('');
    return pageHeader(project().name, 'Project audit', 'Who did what to which record, when. Audit details never contain raw Study IDs, tokens, or payload content.') + panel('Audit events', 'Newest first. Rows in green were written during this session.', '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>When</th><th>Action</th><th>Actor</th><th>Subject</th><th>Summary</th></tr></thead><tbody>' + rows + '</tbody></table></div>', 'clock-ccw');
  }

  function screenSources() {
    const rel = activeRelease();
    const rows = D.SOURCES.map((s) => {
      const p = rel.sourcePolicies.find((x) => x.sourceId === s.id);
      const summary = p && p.mode === 'donation' ? p.categories.map((c) => (c.enabled ? '<div><b>' + esc(c.id) + '</b>: ' + c.fields.map((f) => f.mode === 'prohibited' ? '<s>' + esc(f.id) + '</s>' : esc(f.id) + (f.mode === 'optional' ? (f.defaultIncluded ? ' (on)' : ' (off)') : '')).join(', ') + '</div>' : '<div><s>' + esc(c.id) + '</s> disabled</div>')).join('') : '<span class="muted">—</span>';
      return '<tr><td><strong>' + esc(s.displayName) + '</strong><div class="xs muted">' + badge(s.capabilityStatus) + '</div></td><td>' + badge(p ? p.mode : 'disabled') + '</td><td>' + (p && p.required ? 'Yes' : 'No') + '</td><td class="xs">' + summary + '</td></tr>';
    }).join('');
    return pageHeader(project().name, 'Sources & data policy', 'Choose which services this study uses and which groups and details it may collect. A study can only narrow what the software already supports.') + panel('Version ' + rel.version + ' data policy', 'Read-only in this demo. In the product, edits here show up in Review & publish and require participants to agree again.', '<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Source</th><th>Mode</th><th>Required</th><th>Data policy</th></tr></thead><tbody>' + rows + '</tbody></table></div>', 'database');
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
      { rating: 5, screen: 'Choose your data', comment: 'Liked that I could remove everything with one word instead of scrolling.', status: 'reviewed' },
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
      '<main class="admin-main" id="admin-main">' + body + '</main>';
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
      ? { section: 'Consent', summary: 'Consent wording updated: clarified the retention period and added the ChatGPT example (document ' + bumpVersion(rel.consentVersion) + ').', material: true }
      : kind === 'contact'
        ? { section: 'Project setup', summary: 'Coordinator contact changed to study-team@css-lab.example. Contact-only change; consent stays valid.', material: false }
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
    const parts = String(v).split('.');
    parts[parts.length - 1] = String(Number(parts[parts.length - 1]) + 1);
    return parts.join('.');
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
    const result = await App.dialog({ title: 'Publish release v' + nextVersion + '?', body: '<p>Publication atomically changes the configuration used for new participant sessions and donation attempts. Published releases are immutable.</p>' + (material ? '<p><strong>This release requires re-consent.</strong> Active participants will see the consent step again before their next donation.</p>' : '<p>Non-material changes only: existing consents remain valid.</p>'), confirmLabel: 'Verify and publish' });
    if (!result.ok) return;
    if (!(await requireStepUp())) return;
    const release = {
      id: 'rel_v' + nextVersion,
      projectId: rel.projectId,
      version: nextVersion,
      status: 'active',
      publishedAt: App.nowIso(),
      publishedBy: A.user.username,
      supersedesReleaseId: rel.id,
      requiresReconsent: material,
      consentVersion: material ? A.release.consentVersionDraft : rel.consentVersion,
      sourcePolicies: rel.sourcePolicies,
      material: Object.assign({}, rel.material, { consentVersion: material ? A.release.consentVersionDraft : rel.consentVersion, contact: changes.some((c) => c.section === 'Project setup') ? 'study-team@css-lab.example' : undefined }),
      changes: changes.slice(),
    };
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
    App.toast('Release v' + nextVersion + ' is live. Policy hash ' + E.shortHash(App.hashesFor(release.id).materialHash, 8, 4) + (material ? ' · participants must re-consent.' : '.'));
  };

  App.actions['a-propose-deletion'] = async (el) => {
    const w = A.withdrawals.find((x) => x.id === el.dataset.wd);
    if (!w) return;
    const count = w.acceptedDonations !== undefined ? w.acceptedDonations : A.donations.filter((d) => d.participantId === w.participantId && d.status === 'accepted').length;
    const result = await App.dialog({ title: 'Propose deletion for ' + w.participantId + '?', body: '<p>Exact scope: ' + esc(S.round.roundKey) + ' · ' + count + ' accepted donation' + (count === 1 ? '' : 's') + '. A different owner must approve before the worker deletes primary payload objects and writes deletion evidence.</p>', fields: [{ name: 'reason', label: 'Reason', type: 'textarea', required: true, placeholder: 'Participant withdrawal request received ' + E.formatDate(w.requestedAt) }], confirmLabel: 'Propose deletion' });
    if (!result.ok) return;
    if (!(await requireStepUp())) return;
    w.deletionJob = { id: 'job_del_' + E.fnv1a(w.id).toString(16).slice(0, 4), status: 'pending_approval', proposedBy: A.user.username, proposedAt: App.nowIso(), reason: result.values.reason, scope: S.round.roundKey + ' · ' + count + ' accepted donation' + (count === 1 ? '' : 's') };
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
            if (d.participantId === w.participantId && d.status === 'accepted') d.status = 'deleted';
          });
          App.addAudit({ action: 'deletion.completed', actor: 'system worker', subject: job.id, summary: 'Primary payload objects deleted through stored, project-bound metadata; donations marked deleted; deletion evidence written.' });
          if (A.screen === 'withdrawals') renderAdmin();
          App.toast('Deletion ' + job.id + ' completed with evidence.');
        },
      },
    ]);
  };

  App.actions['a-provision'] = async () => {
    const result = await App.dialog({ title: 'Provision a participant', body: '<p>Creates a pseudonymous participant in <strong>' + esc(S.round.name) + '</strong>. Optional contact email would be encrypted independently and masked everywhere.</p>', fields: [{ name: 'alias', label: 'Internal alias (optional)', type: 'text', placeholder: 'e.g. cohort-b-12' }], confirmLabel: 'Create and show link once' });
    if (!result.ok) return;
    const n = 417 + A.participants.length;
    const id = 'P-0' + n;
    A.participants.push({ id, status: 'invited', invitedAt: S.today, consentVersion: null, rounds: { 'wave-1': 'none', 'wave-2': 'none' }, note: result.values.alias || '', isNew: true });
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
