'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash, webcrypto } = require('node:crypto');
const { test } = require('node:test');

const demoRoot = path.resolve(__dirname, '..');
const clone = (value) => JSON.parse(JSON.stringify(value));
const expectedScope = {
  tiktok: { watch_history: ['contentRef', 'timestamp'] },
  youtube: {
    watch_history: ['channelName', 'contentRef', 'timestamp', 'title'],
    post_views: ['contentRef', 'timestamp', 'title'],
  },
  instagram: { videos_watched: ['contentRef', 'timestamp'] },
  facebook: {
    posts_shown: ['contentRef', 'timestamp'],
    videos_shown: ['contentRef', 'timestamp'],
    searches: ['searchTerm', 'timestamp'],
  },
};

function loadDemo({ fallback = false } = {}) {
  const context = vm.createContext({
    window: { crypto: webcrypto },
    location: { search: fallback ? '?nosubtle' : '' },
    TextEncoder,
    TextDecoder,
    console,
  });
  for (const file of ['engine.js', 'data.js']) {
    vm.runInContext(readFileSync(path.join(demoRoot, file), 'utf8'), context, { filename: file });
  }
  const E = context.window.DemoEngine;
  const D = context.window.DEMO_DATA;
  const release = D.RELEASES.find((item) => item.id === D.PROJECTS[0].activeReleaseId);
  function scoped(sourceId) {
    return E.applyProjectSourcePolicy(D.generateCandidates(sourceId), release.sourcePolicies.find((p) => p.sourceId === sourceId));
  }
  function finalize(extraction, policy) {
    return E.finalize(extraction, policy || E.recordExclusionsOnlyPolicy(extraction.inventory.source, extraction.categories), {
      participantReviewMode: release.participantReviewMode,
      adapterVersion: D.CAPABILITIES[extraction.inventory.source].adapterVersion,
      projectReleaseId: release.id,
      collectionRoundId: D.ROUNDS.find((round) => round.status === 'active').id,
      processedAt: new Date('2026-10-07T19:00:00Z'),
    });
  }
  return { D, E, release, scoped, finalize };
}

test('default study is release v4 in the existing Round 2, with all four sources required', () => {
  const { D, E, release } = loadDemo();
  assert.equal(D.PROJECTS[0].name, 'Social Media Data Donation');
  assert.equal(release.version, 4);
  assert.equal(release.supersedesReleaseId, 'rel_v3');
  assert.equal(release.requiresReconsent, true);
  assert.equal(release.participantReviewMode, 'record_exclusions_only');
  assert.equal(release.material.compensation.mode, 'none');
  const round = D.ROUNDS.find((item) => item.status === 'active');
  assert.equal(round.roundKey, 'data-donation-round-2');
  assert.equal(round.projectReleaseId, release.id);
  assert.deepEqual(clone(round.requiredSourceIds), ['tiktok', 'youtube', 'instagram', 'facebook']);
  const enabled = release.sourcePolicies.filter((policy) => policy.mode === 'donation');
  assert.deepEqual(clone(enabled.map((policy) => policy.sourceId).sort()), Object.keys(expectedScope).sort());
  for (const policy of enabled) {
    assert.equal(policy.required, false, 'requirements stay scoped to the existing Round 2');
    const descriptors = E.projectCategoryDescriptors(D.CAPABILITIES[policy.sourceId].categories, policy);
    const actual = Object.fromEntries(descriptors.map((category) => [category.id, Array.from(category.fields, (field) => field.id).sort()]));
    assert.deepEqual(clone(actual), expectedScope[policy.sourceId]);
    assert.ok(descriptors.every((category) => category.fields.every((field) => field.required && field.defaultIncluded)));
  }
  for (const policy of release.sourcePolicies) {
    assert.equal(E.validateProjectSourcePolicy(policy, policy.sourceId, D.CAPABILITIES[policy.sourceId]?.categories || []).length, 0);
    if (policy.mode !== 'donation') assert.equal(policy.required, false);
  }
  assert.equal(round.completed, 0, 'seeded TikTok/YouTube-only donations no longer complete Round 2');
  assert.equal(round.partial, 7);
  assert.ok(D.PARTICIPANTS.every((participant) => participant.rounds[round.roundKey] !== 'complete'));
  assert.deepEqual(clone(D.ROUNDS.find((item) => item.id === 'rnd_w1').requiredSourceIds), []);
  for (const earlier of D.RELEASES.filter((item) => item.version < 4)) {
    assert.ok(earlier.sourcePolicies.every((policy) => !policy.required), 'published historical policies stay unchanged');
  }
  const earlier = D.RELEASES.find((item) => item.id === 'rel_v3');
  assert.deepEqual(clone(release.sourcePolicies), clone(earlier.sourcePolicies), 'the new release does not broaden project-wide requirements');
  assert.match(earlier.participantDataScopeNotice, /Instagram and Facebook are optional/);
  assert.match(release.participantDataScopeNotice, /TikTok, YouTube, Instagram and Facebook are all required/);
  assert.notEqual(earlier.consentVersion, release.consentVersion);
});

test('past donations and release-specific consent are synthetic history, not Round 2 completion', () => {
  const { D, release } = loadDemo();
  const participant = D.PARTICIPANTS.find((item) => item.id === 'P-0417');
  assert.ok(participant.consentReleaseId);
  assert.notEqual(participant.consentReleaseId, release.id);
  const donations = D.DONATIONS.filter((item) => item.participantId === participant.id);
  assert.deepEqual(clone(donations.map((item) => item.platform).sort()), ['tiktok', 'youtube']);
  assert.ok(donations.every((item) => item.roundKey === 'initial-collection' && item.status === 'accepted'));
  assert.equal(participant.rounds['data-donation-round-2'], 'none');
  for (const item of D.PARTICIPANTS.filter((candidate) => candidate.consentReleaseId)) {
    assert.equal(D.RELEASES.find((entry) => entry.id === item.consentReleaseId).consentVersion, item.consentVersion);
  }
});

test('synthetic generation is repeatable, project-narrowed, and includes old dates', () => {
  const first = loadDemo();
  const second = loadDemo();
  const counts = { tiktok: 1240, youtube: 2000, instagram: 480, facebook: 192 };
  for (const [sourceId, count] of Object.entries(counts)) {
    const extraction = first.scoped(sourceId);
    assert.equal(extraction.records.length, count);
    assert.equal(extraction.inventory.totalRecords, count);
    assert.equal(first.E.canonicalJson(extraction), second.E.canonicalJson(second.scoped(sourceId)));
    assert.equal(new Set(extraction.records.map((record) => record.localId)).size, count);
    for (const record of extraction.records) {
      assert.ok(expectedScope[sourceId][record.category]);
      assert.ok(Object.keys(record.fields).every((field) => expectedScope[sourceId][record.category].includes(field)));
    }
  }
  assert.equal(first.scoped('youtube').records[0].timestamp, '2012-06-15T12:00:00Z');
  assert.equal(first.scoped('facebook').records[0].timestamp, '2012-06-15T12:00:00Z');
  assert.throws(() => first.D.generateCandidates('not-a-source'), /No synthetic example/);
});

test('record-only policy includes every approved field and every available date', async () => {
  const { E, scoped, finalize } = loadDemo();
  for (const sourceId of Object.keys(expectedScope)) {
    const extraction = scoped(sourceId);
    const policy = E.recordExclusionsOnlyPolicy(sourceId, extraction.categories);
    E.assertRecordExclusionsOnlyPolicy(sourceId, extraction.categories, policy, new Set(extraction.records.map((record) => record.localId)));
    assert.equal(E.isRecordExclusionsOnlyPolicy(sourceId, extraction.categories, policy), true);
    const result = await finalize(extraction, policy);
    assert.equal(result.counts.totalSelected, extraction.records.length);
    assert.equal(result.counts.totalParticipantExcluded, 0);
    assert.ok(result.payload.records.some((record) => record.timestamp === extraction.records[0].timestamp));
    assert.equal(result.manifest.projectReleaseId, 'rel_v4');
    assert.equal(result.manifest.collectionRoundId, 'rnd_w2');
    assert.equal(Object.hasOwn(result.manifest, 'participantExcludedTotal'), false);
  }
});

test('only individual known record exclusions are accepted, and restoring returns the original payload', async () => {
  const { E, scoped, finalize } = loadDemo();
  const extraction = scoped('facebook');
  const original = await finalize(extraction);
  const recordId = extraction.records[0].localId;
  const policy = E.recordExclusionsOnlyPolicy('facebook', extraction.categories, [recordId, recordId]);
  assert.deepEqual(clone(policy.recordOverrides.excluded), [recordId]);
  const removed = await finalize(extraction, policy);
  assert.equal(removed.counts.totalSelected, original.counts.totalSelected - 1);
  assert.equal(removed.counts.totalParticipantExcluded, 1);
  assert.equal(removed.selectedIds.includes(recordId), false);
  assert.equal(removed.manifest.dateRange.from === '2012-06-15T12:00:00Z', false);
  assert.notEqual(removed.manifest.payloadSha256, original.manifest.payloadSha256);
  policy.recordOverrides.excluded = [];
  const restored = await finalize(extraction, policy);
  assert.equal(restored.manifest.payloadSha256, original.manifest.payloadSha256);
});

test('record-only validation rejects field/category/date/bulk/conversation and malformed changes', async () => {
  const { E, scoped, finalize } = loadDemo();
  const extraction = scoped('facebook');
  const known = new Set(extraction.records.map((record) => record.localId));
  const edits = [
    (policy) => { policy.categories.searches.fields.searchTerm = false; },
    (policy) => { policy.categories.posts_shown.included = false; },
    (policy) => { policy.categories.posts_shown.dateRange = {}; },
    (policy) => { policy.categories.posts_shown.dateRange = { from: '2026-01-01' }; },
    (policy) => { delete policy.categories.searches; },
    (policy) => { delete policy.categories.searches.fields.timestamp; },
    (policy) => { policy.categories.searches.fields.accountId = true; },
    (policy) => { policy.bulkExclusions.push({ id: 'forbidden', target: 'records', categoryId: 'searches', textContains: 'garden' }); },
    (policy) => { policy.recordOverrides.included.push('posts_shown#0'); },
    (policy) => { policy.conversationOverrides.excluded.push('anything'); },
    (policy) => { policy.recordOverrides.excluded.push('missing-record'); },
    (policy) => { policy.recordOverrides.excluded.push('posts_shown#0', 'posts_shown#0'); },
    (policy) => { policy.recordOverrides.excluded.push(null); },
    (policy) => { policy.sourceId = 'youtube'; },
    (policy) => { policy.version = 1; },
    (policy) => { policy.extra = true; },
    (policy) => { policy.categories = null; },
    (policy) => { policy.recordOverrides = null; },
  ];
  for (const edit of edits) {
    const policy = E.recordExclusionsOnlyPolicy('facebook', extraction.categories);
    edit(policy);
    assert.equal(E.isRecordExclusionsOnlyPolicy('facebook', extraction.categories, policy, known), false);
    assert.throws(() => E.assertRecordExclusionsOnlyPolicy('facebook', extraction.categories, policy, known), /only individual record removals/);
    await assert.rejects(finalize(extraction, policy), /only individual record removals/);
  }
  for (const policy of [null, undefined, [], {}]) {
    assert.equal(E.isRecordExclusionsOnlyPolicy('facebook', extraction.categories, policy, known), false);
  }
  await assert.rejects(E.finalize(extraction, E.recordExclusionsOnlyPolicy('facebook', extraction.categories), { participantReviewMode: 'unknown' }), /Unknown participant review mode/);
});

test('missing approved values stay absent and arbitrary candidate fields never reach the payload', async () => {
  const { D, E, release, scoped, finalize } = loadDemo();
  const extraction = scoped('youtube');
  const result = await finalize(extraction);
  for (const localId of ['watch_history#1', 'watch_history#2']) {
    const candidate = extraction.records.find((record) => record.localId === localId);
    const payload = result.payload.records[result.selectedIds.indexOf(localId)];
    for (const fieldId of ['contentRef', 'title', 'channelName']) {
      assert.equal(Object.hasOwn(payload, fieldId), Object.hasOwn(candidate.fields, fieldId));
    }
  }
  const contaminated = clone(D.generateCandidates('facebook'));
  contaminated.records[0].fields.accountId = 'SYNTHETIC_PRIVATE_ACCOUNT_DO_NOT_SEND';
  contaminated.records[0].fields.authorDescription = 'SYNTHETIC_AUTHOR_DO_NOT_SEND';
  contaminated.records[0].privateValue = 'SYNTHETIC_TOP_LEVEL_DO_NOT_SEND';
  const narrowed = E.applyProjectSourcePolicy(contaminated, release.sourcePolicies.find((policy) => policy.sourceId === 'facebook'));
  const finalized = await finalize(narrowed);
  const serialized = E.canonicalJson(finalized.payload);
  assert.doesNotMatch(serialized, /SYNTHETIC_(?:PRIVATE|AUTHOR|TOP_LEVEL)|accountId|authorDescription|localId|recordOverrides/);
  assert.ok(finalized.payload.records.every((record) => Object.keys(record).every((fieldId) => fieldId === 'category' || expectedScope.facebook[record.category].includes(fieldId))));
  const missing = narrowed.records.find((record) => !Object.hasOwn(record.fields, 'contentRef') && record.category === 'posts_shown');
  assert.ok(missing);
  assert.equal(Object.hasOwn(finalized.payload.records[finalized.selectedIds.indexOf(missing.localId)], 'contentRef'), false);
});

test('Facebook examples preserve group/permalink links and exact queries without claiming watches', async () => {
  const { E, scoped, finalize } = loadDemo();
  const extraction = scoped('facebook');
  const result = await finalize(extraction);
  assert.deepEqual(clone(extraction.inventory.warnings.map(({ code, categoryId, count }) => ({ code, categoryId, count }))), [
    { code: 'duplicate_activity_entry', categoryId: 'searches', count: 2 },
  ]);
  assert.equal(result.manifest.warningCounts.duplicate_activity_entry, 2);
  assert.equal(result.payload.records.filter((record) => record.category === 'posts_shown').length, 72);
  assert.equal(result.payload.records.filter((record) => record.category === 'videos_shown').length, 24);
  assert.equal(result.payload.records.filter((record) => record.category === 'searches').length, 96);
  assert.ok(result.payload.records.some((record) => record.contentRef?.includes('/groups/synthetic-demo-group/posts/')));
  assert.ok(result.payload.records.some((record) => /^https:\/\/www\.facebook\.com\/permalink\.php\?story_fbid=\d+&id=\d+$/.test(record.contentRef || '')));
  assert.ok(result.payload.records.some((record) => record.searchTerm === 'ceramics café classes'));
  assert.equal(new Set(result.payload.records.map((record) => E.canonicalJson(record))).size, 192);
  assert.doesNotMatch(E.canonicalJson(result.payload), /fbclid|tracking|marketplace|videos_watched|watchDuration/);
});

test('deduplication warnings remain category-scoped after a project policy narrows searches away', () => {
  const { D, E, release } = loadDemo();
  const policy = clone(release.sourcePolicies.find((item) => item.sourceId === 'facebook'));
  policy.categories.find((category) => category.id === 'searches').enabled = false;
  const extraction = E.applyProjectSourcePolicy(D.generateCandidates('facebook'), policy);
  assert.equal(extraction.records.length, 96);
  assert.equal(extraction.inventory.warnings.length, 0);
});

test('payload bytes and SHA-256 are deterministic in WebCrypto and file-compatible fallback', async () => {
  const normal = loadDemo();
  const fallback = loadDemo({ fallback: true });
  assert.equal(normal.E.usingWebCrypto, true);
  assert.equal(fallback.E.usingWebCrypto, false);
  for (const text of ['', 'abc', 'synthetic café \u{1f331}']) {
    const expected = createHash('sha256').update(text).digest('hex');
    assert.equal(await normal.E.sha256HexOfString(text), expected);
    assert.equal(await fallback.E.sha256HexOfString(text), expected);
  }
  const a = await normal.finalize(normal.scoped('facebook'));
  const b = await fallback.finalize(fallback.scoped('facebook'));
  assert.equal(a.manifest.payloadSha256, b.manifest.payloadSha256);
  assert.equal(a.manifest.payloadSha256, createHash('sha256').update(a.payloadBytes).digest('hex'));
  assert.equal(a.manifest.payloadBytes, a.payloadBytes.byteLength);
  assert.deepEqual(Buffer.from(a.payloadBytes), Buffer.from(b.payloadBytes));
});

test('Meta guides request standard JSON Available information, All time, Low, never Data Logs', () => {
  const { D } = loadDemo();
  for (const sourceId of ['instagram', 'facebook']) {
    const source = D.sourceById(sourceId);
    const guide = JSON.stringify(source.exportGuide);
    assert.match(guide, /Available information/);
    assert.match(guide, /JSON/);
    assert.match(guide, /All time/);
    assert.match(guide, /Low/);
    assert.match(guide, /Do not request Data Logs/);
    assert.match(guide, /synthetic/);
    assert.equal(source.capabilityStatus, 'donation_ready');
  }
  assert.deepEqual(clone(D.sourceById('instagram').archive.allowlisted), ['ads_information/ads_and_topics/videos_watched.json']);
  assert.equal(D.sourceById('facebook').archive.allowlisted.length, 2);
  assert.ok(D.sourceById('facebook').archive.allowlisted.every((entry) => !/marketplace|messages/.test(entry)));
});

test('demo acknowledgment is unpaid and fictional, with scroll/signature but no quiz', () => {
  const { D, release } = loadDemo();
  assert.equal(D.CONSENT.version, release.consentVersion);
  assert.equal(D.CONSENT.requireScroll, true);
  assert.equal(D.CONSENT.requireSignature, true);
  assert.deepEqual(clone(D.CONSENT.questions), []);
  const text = JSON.stringify(D.CONSENT);
  assert.match(text, /not a legal consent form or research enrollment/);
  assert.match(text, /made-up name/);
  assert.match(text, /unpaid/);
  assert.match(text, /All available dates/);
  assert.match(text, /Missing values remain absent/);
  assert.match(text, /TikTok, YouTube, Instagram and Facebook are all required/);
  assert.doesNotMatch(text, /Optional Instagram|Optional Facebook|Instagram and Facebook are optional/);
  assert.doesNotMatch(text, /USD 20|wellbeing|OASIS Lab|agree to take part/);
});

test('legacy generic selection APIs remain usable outside record-only releases', async () => {
  const { D, E } = loadDemo();
  const extraction = D.generateCandidates('tiktok');
  const policy = E.defaultPolicy('tiktok', extraction.categories);
  policy.categories.likes.included = false;
  policy.categories.searches.included = false;
  const result = await E.finalize(extraction, policy);
  assert.equal(result.payload.records.length, 1240);
  assert.ok(result.payload.records.every((record) => record.category === 'watch_history'));
  assert.equal(typeof E.createBulkExclusionRule, 'function');
  assert.equal(typeof E.createSelectionMatcher, 'function');
});
