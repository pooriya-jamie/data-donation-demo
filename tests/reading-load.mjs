import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const require = createRequire(new URL('../../project/package.json', import.meta.url));
const { chromium } = require('@playwright/test');
const output = fileURLToPath(new URL('./output/', import.meta.url));
await mkdir(output, { recursive: true });
const baseline = process.argv.includes('--baseline');
// Visible-word counts captured from the published demo at commit 2577c53.
const originalWords = {
  overview: 768, server: 314, architecture: 304,
  'admin-overview': 290, 'admin-sources': 290, 'admin-release': 369,
  'participant-join': 257, 'participant-sources': 251,
  'participant-guide': 373, 'participant-review': 260,
};
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
const errors = [];
await context.route(/^https?:/, route => route.abort());
const page = await context.newPage();
page.setDefaultTimeout(15000);
page.on('pageerror', error => errors.push(error.message));
const report = {};
async function visit(route) {
  await page.evaluate(route => App.navigate(route), route);
  await page.waitForFunction(route => App.S.route.view === route.split('/')[0], route);
}
async function measure(label) {
  report[label] = await page.evaluate(() => {
    const section = document.getElementById('view-' + App.S.route.view);
    const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
    const text = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent.trim() || node.parentElement.closest('script,style,svg,[hidden]')) continue;
      let element = node.parentElement;
      let hidden = false;
      while (element && section.contains(element)) {
        if (element.tagName === 'DETAILS' && !element.open && !element.querySelector(':scope > summary')?.contains(node)) hidden = true;
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden') hidden = true;
        element = element.parentElement;
      }
      if (!hidden) text.push(node.textContent);
    }
    return { words: text.join(' ').trim().split(/\s+/).filter(Boolean).length, height: Math.round(section.getBoundingClientRect().height) };
  });
  if (!baseline) {
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.screenshot({ path: output + '/concise-' + label + '.png', fullPage: true });
  }
}
try {
  await page.goto(new URL('../index.html', import.meta.url).href);
  await page.waitForFunction(() => App.S.hashes.ready);
  for (const route of ['overview', 'server', 'architecture', 'admin/overview', 'admin/sources', 'admin/release']) {
    await visit(route);
    await measure(route.replace('/', '-'));
  }
  await visit('participant/join');
  await measure('participant-join');
  await page.evaluate(() => {
    const release = App.activeRelease();
    Object.assign(App.S.participant.consent, { agreed: true, releaseId: release.id, version: release.consentVersion, signature: 'Sample reviewer' });
    App.navigate('participant/sources');
  });
  await page.waitForFunction(() => App.S.participant.step === 'sources');
  await measure('participant-sources');
  await page.locator('[data-action="p-open-source"][data-source="tiktok"]').click();
  await measure('participant-guide');
  await page.locator('[data-action="p-go"][data-step="upload"]').click();
  await page.locator('[data-action="p-add-sample"]').click();
  await page.waitForFunction(() => App.S.participant.step === 'preview' && App.S.participant.work?.finalized);
  await measure('participant-review');
  const file = output + (baseline ? '/reading-baseline.json' : '/reading-current.json');
  await writeFile(file, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!baseline) {
    const totals = Object.keys(report).reduce((sum, key) => ({ before: sum.before + originalWords[key], after: sum.after + report[key].words }), { before: 0, after: 0 });
    console.log('Default-view word reduction:', Math.round((1 - totals.after / totals.before) * 100) + '%');
    assert.ok(totals.after <= totals.before * 0.65, 'Reduce initial reading across sampled screens by at least 35%');
    assert.ok(report.overview.words <= 230, 'Keep overview concise');
    assert.ok(report['participant-review'].words <= 280, 'Keep review concise without hiding donation scope');
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
