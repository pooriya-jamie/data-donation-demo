import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../../project/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const homeUrl = new URL('../index.html', import.meta.url).href;
const output = fileURLToPath(new URL('./output/', import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const errors = [];
const requests = [];
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
await context.route(/^https?:/, async route => {
  requests.push(route.request().url());
  await route.abort();
});
const page = await context.newPage();
page.setDefaultTimeout(15000);
page.on('pageerror', error => errors.push(error.message));
async function boot() {
  await page.goto(homeUrl);
  await page.waitForFunction(() => window.App?.S.hashes.ready);
}
async function route(view) {
  await page.evaluate(view => window.App.navigate(view), view);
  await page.waitForFunction(view => window.App.S.route.view === view.split('/')[0], view);
}
async function readyParticipant() {
  await page.evaluate(() => {
    const A = window.App;
    const r = A.activeRelease();
    Object.assign(A.S.participant.consent, { agreed: true, scrolled: true, signature: 'Demo reviewer', recordedAt: '2026-10-07T12:00:00Z', receiptCode: 'DEMO-CONSENT', releaseId: r.id, version: r.consentVersion });
    A.S.participant.step = 'sources';
    A.navigate('participant/sources');
  });
  await page.waitForFunction(() => App.S.participant.step === 'sources');
}
async function addSample(source) {
  await readyParticipant();
  await page.locator(`[data-action="p-open-source"][data-source="${source}"]`).click();
  await page.locator('[data-action="p-go"][data-step="upload"]').click();
  await page.locator('[data-action="p-add-sample"]').click();
  await page.waitForFunction(() => App.S.participant.step === 'preview' && App.S.participant.work?.finalized);
}
async function noOverflow() {
  const layout = await page.evaluate(() => ({ width: innerWidth, page: document.documentElement.scrollWidth, route: App.S.route, offenders: [...document.querySelectorAll('main *')].filter(el => el.getBoundingClientRect().right > innerWidth + 2 && el.getBoundingClientRect().width > 0).slice(0, 8).map(el => ({ tag: el.tagName, class: el.className, text: el.textContent.trim().slice(0, 80) })) }));
  assert.ok(layout.page <= layout.width + 2, 'Page should not overflow horizontally: ' + JSON.stringify(layout));
}
async function selection() {
  return page.evaluate(() => {
    const w = App.S.participant.work;
    return { key: w.fileKey, revision: w.revision, selected: w.apply.counts.totalSelected, hash: w.hash, excluded: [...w.policy.recordOverrides.excluded], confirmed: App.S.participant.ui.confirmed };
  });
}
async function finalized() {
  await page.waitForFunction(() => App.S.participant.work?.finalized && !App.S.participant.work.pendingFinalize);
}
async function screenshot(name) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(resolve)));
  await page.screenshot({ path: output + '/' + name + '.png', fullPage: true });
}
async function reviewInteractions() {
  const original = await selection();
  await page.locator('#individual-review > summary').click();
  const record = page.locator('[data-change="p-record"]').first();
  await record.scrollIntoViewIfNeeded();
  await record.evaluate(el => { window.reviewCheckboxNode = el; });
  await record.uncheck();
  await finalized();
  assert.equal(await record.evaluate(el => el === window.reviewCheckboxNode && document.activeElement === el), true, 'Removal keeps the checkbox mounted and focused');
  assert.equal((await selection()).selected, original.selected - 1);
  assert.notEqual((await selection()).hash, original.hash);
  await page.locator('#donation-confirm').check();
  await record.check();
  await finalized();
  assert.equal((await selection()).hash, original.hash, 'Restoring a record restores the exact payload');
  assert.equal((await selection()).confirmed, false, 'Changing the selection invalidates confirmation');

  const beforeSearch = await selection();
  await page.locator('#record-search').fill('synthetic-no-match-zzzz');
  assert.equal(await page.locator('[data-change="p-record"]').count(), 0);
  assert.deepEqual(await selection(), beforeSearch, 'Search only filters the display');
  await page.locator('#record-search').fill('');
  const next = page.locator('[data-action="p-browse-page"][data-dir="1"]');
  if (await next.isEnabled()) {
    const firstId = await record.getAttribute('data-id');
    await next.click();
    assert.notEqual(await record.getAttribute('data-id'), firstId);
    await page.locator('[data-action="p-browse-page"][data-dir="-1"]').click();
    assert.equal(await record.getAttribute('data-id'), firstId);
  }
  const link = page.locator('[data-action="p-open-item"]').first();
  await link.scrollIntoViewIfNeeded();
  const beforeLink = { selection: await selection(), y: await page.evaluate(() => scrollY), url: page.url() };
  await link.click();
  await page.getByRole('dialog').waitFor();
  assert.match(await page.getByRole('dialog').innerText(), /no external post opened/);
  await page.locator('[data-dlg="cancel"]').click();
  assert.equal(page.url(), beforeLink.url);
  assert.deepEqual(await selection(), beforeLink.selection);
  assert.ok(Math.abs(await page.evaluate(() => scrollY) - beforeLink.y) < 5, 'Opening a link must not jump the review to the top');
  await page.locator('#exact-review > summary').click();
  await page.locator('.preview-record').first().waitFor();
  assert.ok(await page.locator('.preview-record').count() > 0);
  await page.screenshot({ path: output + '/individual-review-320.png', fullPage: true });

  // Delay one finalization so an older answer arrives after a newer selection.
  await page.evaluate(() => {
    const originalFinalize = DemoEngine.finalize;
    window.demoFinalizeOriginal = originalFinalize;
    let first = true;
    DemoEngine.finalize = (...args) => {
      const value = originalFinalize(...args);
      if (!first) return value;
      first = false;
      return new Promise((resolve, reject) => {
        window.releaseOldFinalization = () => value.then(resolve, reject);
      });
    };
  });
  await record.uncheck();
  assert.equal(await page.locator('[data-action="p-donate"]').isDisabled(), true);
  await record.check();
  await finalized();
  const fresh = await selection();
  await page.evaluate(async () => {
    await window.releaseOldFinalization();
    DemoEngine.finalize = window.demoFinalizeOriginal;
  });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.deepEqual(await selection(), fresh, 'Stale finalization must not replace the current payload');

  // Old bookmarked selection routes should land at the combined review screen.
  await route('participant/choose');
  await page.waitForFunction(() => App.S.participant.step === 'preview');
  await record.uncheck();
  await finalized();
  await page.locator('#donation-confirm').check();
  const beforeReplace = await selection();
  await page.locator('[data-action="p-change-file"]').click();
  await page.locator('[data-action="p-add-sample"]').click();
  await page.locator('[data-dlg="cancel"]').click();
  assert.deepEqual(await selection(), beforeReplace, 'Canceling replacement preserves the original');
  await page.getByText('Test a failed replacement', { exact: true }).click();
  await page.locator('[data-action="p-invalid-sample"]').click();
  await page.locator('[data-dlg="confirm"]').click();
  await page.waitForFunction(() => App.S.participant.ui.fileError && !App.S.participant.processing);
  assert.deepEqual(await selection(), beforeReplace, 'Invalid replacement preserves the original');

  await page.evaluate(() => { App.S.motion = true; });
  await page.locator('[data-action="p-add-sample"]').click();
  await page.locator('[data-dlg="confirm"]').click();
  await page.locator('[data-action="p-cancel-processing"]').click();
  assert.deepEqual(await selection(), beforeReplace, 'Canceling processing preserves the original');
  await page.evaluate(() => { App.S.motion = false; });
  await page.locator('[data-action="p-back-review"]').click();
  await page.locator('[data-action="p-change-file"]').click();
  await page.locator('[data-action="p-add-sample"]').click();
  await page.locator('[data-dlg="confirm"]').click();
  await page.waitForFunction(() => App.S.participant.step === 'preview');
  await finalized();
  const replaced = await selection();
  assert.notEqual(replaced.key, beforeReplace.key);
  assert.equal(replaced.confirmed, false);
  assert.equal(replaced.selected, original.selected);
}
async function publish(kind) {
  await route('admin/release');
  const next = await page.evaluate(() => App.activeRelease().version + 1);
  await page.locator(`[data-action="a-change"][data-kind="${kind}"]`).click();
  if (kind === 'consent') await page.locator('[data-change="a-reconsent"]').check();
  await page.evaluate(() => { App.S.admin.stepUpUntil = Date.now() + 300000; });
  await page.locator('[data-action="a-publish"]').click();
  await page.locator('[data-dlg="confirm"]').click();
  await page.waitForFunction(version => App.activeRelease().version === version && App.hashesFor(App.S.activeReleaseId).releaseHash, next);
  assert.equal(await page.evaluate(() => App.activeRelease().participantReviewMode), 'record_exclusions_only');
  assert.ok(await page.evaluate(() => Boolean(App.activeRelease().participantDataScopeNotice)));
  assert.equal(await page.evaluate(() => App.activeRelease().consentVersion.includes('NaN')), false);
}
async function publicationGuards() {
  await boot();
  await addSample('tiktok');
  await screenshot('review-desktop');
  await page.locator('#individual-review > summary').click();
  await page.locator('[data-change="p-record"]').first().uncheck();
  await finalized();
  const original = await selection();
  await route('participant/sources');
  await page.locator('[data-action="p-open-source"][data-source="youtube"]').click();
  await route('participant/sources');
  await page.locator('[data-action="p-open-source"][data-source="tiktok"]').click();
  assert.deepEqual(await selection(), original, 'Switching source guides preserves the existing work');

  await publish('contact');
  await route('participant/preview');
  await page.waitForFunction(() => App.S.participant.step === 'upload');
  assert.equal((await selection()).key, original.key, 'New release does not silently destroy earlier work');
  await page.locator('[data-action="p-add-sample"]').click();
  await page.locator('[data-dlg="confirm"]').click();
  await page.waitForFunction(() => App.S.participant.step === 'preview');
  await finalized();
  assert.equal(await page.evaluate(() => App.S.participant.work.releaseId === App.S.activeReleaseId), true);

  await publish('consent');
  // Also cover a material data-scope change that keeps the same consent document.
  await page.evaluate(async () => {
    const release = App.activeRelease();
    release.consentVersion = App.S.participant.consent.version;
    release.material.consentVersion = release.consentVersion;
    await App.computeReleaseHashes(release);
  });
  await publish('guide');
  await route('participant/preview');
  await page.waitForFunction(() => App.S.participant.step === 'consent');
  await page.locator('#consent-doc').waitFor();
  assert.equal(await page.locator('[data-action="p-consent-agree"]').isDisabled(), true, 'A later non-material release does not erase an outstanding consent requirement');
  await route('admin/participants');
  assert.match(await page.locator('.admin-table tbody tr').filter({ hasText: 'P-0417' }).innerText(), /re-consent required/i);
  await readyParticipant();
  await page.evaluate(() => { App.S.participant.activeSource = 'chatgpt'; });
  await route('participant/upload');
  await page.waitForFunction(() => App.S.participant.step === 'sources');
  assert.equal(await page.locator('[data-action="p-add-sample"]').count(), 0, 'Disabled sources cannot open a sample via deep link');
  console.log('Release, re-consent, stale work, and disabled-source guards checked.');
}
async function conciseTourChecks() {
  await boot();
  await route('overview');
  const privacy = page.getByText('How it works & privacy', { exact: true });
  const privacyDetails = privacy.locator('..');
  assert.equal(await privacyDetails.evaluate(el => el.open), false);
  await privacy.focus();
  await page.keyboard.press('Enter');
  assert.equal(await privacyDetails.evaluate(el => el.open), true, 'Details can be opened by keyboard');
  await page.keyboard.press('Space');
  assert.equal(await privacyDetails.evaluate(el => el.open), false, 'Details can be closed by keyboard');
  await page.getByText('Exactly what this study collects', { exact: true }).click();
  const fb = page.locator('[data-action="ceiling-source"][data-source="facebook"]');
  if (await fb.count()) await fb.click();
  await noOverflow();

  await route('server');
  await page.locator('.pipeline-steps li').first().waitFor();
  assert.equal(await page.locator('.pipeline-steps li').count(), 4);
  for (const scenario of ['normal', 'tampered', 'suspended']) {
    await page.locator('[data-change="seq-scenario"]').selectOption(scenario);
    await page.locator('[data-action="seq-play"]').click();
    await page.waitForFunction(() => App.S.server.finished || App.S.server.paused);
    const result = await page.evaluate(() => ({ status: App.S.server.status, paused: App.S.server.paused }));
    assert.equal(result.status, scenario === 'normal' ? 'accepted' : scenario === 'tampered' ? 'failed' : 'uploaded');
    if (scenario === 'suspended') assert.equal(result.paused, true);
  }
  await page.getByText('See all 11 server steps', { exact: true }).click();
  await page.locator('#seq-figure svg').waitFor();
  await noOverflow();
  await page.setViewportSize({ width: 320, height: 844 });
  await noOverflow();
  for (const view of ['overview', 'architecture']) {
    await route(view);
    await page.locator('#view-' + view + ' .tour-details').evaluateAll(nodes => nodes.forEach(node => { node.open = true; }));
    await noOverflow();
    await screenshot(view + '-expanded-320');
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  console.log('Concise disclosures, keyboard controls, and all three server scenarios checked.');
}
try {
  await boot();
  console.log('Demo loaded.');
  const config = await page.evaluate(() => ({
    name: App.S.project.name,
    enabled: App.donationSources().map(s => s.id).sort(),
    required: App.requiredSourceIds().sort(),
    version: App.activeRelease().version,
  }));
  assert.equal(config.name, 'Social Media Data Donation');
  assert.deepEqual(config.enabled, ['facebook', 'instagram', 'tiktok', 'youtube']);
  assert.deepEqual(config.required, ['tiktok', 'youtube']);
  assert.equal(config.version, 3);
  for (const view of ['overview', 'participant', 'server', 'admin', 'architecture']) {
    await route(view);
    await noOverflow();
  }
  console.log('Top-level views checked.');
  await route('admin/participants');
  const initialParticipant = await page.locator('.admin-table tbody tr').filter({ hasText: 'P-0417' }).innerText();
  assert.match(initialParticipant, /1\.0/);
  assert.match(initialParticipant, /re-consent required/i);
  // Exercise the normal consent screen, not real participant credentials.
  await route('participant/consent');
  await page.locator('#consent-doc').evaluate(el => {
    el.scrollTop = el.scrollHeight;
    el.dispatchEvent(new Event('scroll'));
  });
  assert.equal(await page.locator('[data-change="consent-answer"]').count(), 0);
  await page.locator('#sig').fill('Synthetic demonstration reviewer');
  await page.locator('[data-action="p-consent-agree"]').click();
  await page.waitForFunction(() => App.S.participant.step === 'sources');
  await readyParticipant();
  await screenshot('sources-desktop');
  await page.setViewportSize({ width: 320, height: 844 });
  await noOverflow();
  assert.equal(await page.locator('.simple-source .tile-body').evaluateAll(nodes => nodes.every(el => el.getBoundingClientRect().width >= 130)), true, 'Mobile source descriptions must not be squeezed beside buttons');
  await screenshot('sources-320');
  const historicalCount = await page.evaluate(() => App.S.participant.donations.filter(d => d.roundKey !== App.S.round.roundKey).length);
  assert.ok(historicalCount > 0, 'Seeded earlier-round history demonstrates repeat donation');
  for (const source of ['tiktok', 'youtube', 'instagram', 'facebook']) {
    console.log('Checking source:', source);
    await addSample(source);
    assert.equal(await page.locator('[data-change="p-field-toggle"], [data-change="p-cat-toggle"], input[type="date"], [data-action="p-bulk-remove"]').count(), 0);
    assert.match(await page.locator('.flow-progress-summary').innerText(), /Step 4 of 4/);
    const summary = await page.evaluate(() => ({ selected: App.S.participant.work.apply.counts.totalSelected, candidates: App.S.participant.work.extraction.records.length, source: App.S.participant.work.finalized.payload.source }));
    assert.ok(summary.selected > 0);
    assert.equal(summary.selected, summary.candidates, 'Every approved record initially selected');
    assert.equal(summary.source, source);
    assert.equal(await page.locator('[data-action="p-donate"]').isDisabled(), true);
    await noOverflow();
    await screenshot(source + '-review-320');
    if (source === 'tiktok') await reviewInteractions();
    await page.locator('[data-change="p-confirm"]').check();
    await page.locator('[data-action="p-donate"]').click();
    await page.waitForFunction(() => App.S.participant.step === 'done');
    const accepted = await page.evaluate(source => App.S.participant.donations.filter(d => d.roundKey === App.S.round.roundKey && d.status === 'accepted' && d.platform === source).length, source);
    assert.equal(accepted, 1, 'One accepted simulated donation per source and round');
    await noOverflow();
  }
  assert.equal(await page.evaluate(() => App.S.participant.donations.filter(d => d.roundKey !== App.S.round.roundKey).length), historicalCount);
  await readyParticipant();
  assert.equal(await page.locator('[data-action="p-open-source"]:not([disabled])').count(), 0, 'Completed sources cannot be donated twice in one round');
  for (const view of ['overview', 'admin', 'architecture']) {
    await route(view);
    await noOverflow();
    await screenshot(view + '-320');
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const view of ['admin/donations', 'admin/rounds', 'admin/participants', 'admin/sources', 'admin/release', 'server']) {
    await route(view);
    await noOverflow();
  }
  await route('admin/donations');
  await page.locator('[data-change="a-filter-round"]').selectOption('initial-collection');
  assert.match(await page.locator('.admin-table').innerText(), /Initial collection/);
  assert.doesNotMatch(await page.locator('.admin-table').innerText(), /Round 2/);
  await page.locator('[data-change="a-filter-round"]').selectOption('data-donation-round-2');
  assert.match(await page.locator('.admin-table').innerText(), /Round 2/);
  assert.doesNotMatch(await page.locator('.admin-table').innerText(), /Initial collection/);
  await publicationGuards();
  await conciseTourChecks();
  assert.deepEqual(requests, [], 'No external network requests are permitted');
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log('Demo consent, four-source donation, repeat-round history, responsive and offline-isolation checks passed.');
} finally {
  await browser.close();
}
