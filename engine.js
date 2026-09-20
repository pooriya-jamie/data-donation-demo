/*
 * DataDonate demo — engine
 *
 * A small, dependency-free port of the semantics that live in the real
 * shared package (shared/src/projectPolicy.ts, shared/src/selection/engine.ts,
 * shared/src/payload.ts, shared/src/manifest2.ts). Nothing here talks to a
 * server. It exists so the demo's counts, ordering, canonical bytes and
 * SHA-256 fingerprints behave exactly like the product, not like a mock-up.
 */
window.DemoEngine = (function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Deterministic randomness                                            */
  /* ------------------------------------------------------------------ */

  function fnv1a(value) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function next() {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ------------------------------------------------------------------ */
  /* Project policy (release boundary) — mirrors projectPolicy.ts        */
  /* ------------------------------------------------------------------ */

  function validateProjectSourcePolicy(policy, sourceId, capabilities) {
    const issues = [];
    if (policy.sourceId !== sourceId) {
      issues.push({ path: 'sourceId', message: 'Source policy does not match the adapter.' });
    }
    if (policy.mode !== 'donation') return issues;
    const categories = new Map(capabilities.map((category) => [category.id, category]));
    const seenCategories = new Set();
    for (const categoryPolicy of policy.categories) {
      const path = 'categories.' + categoryPolicy.id;
      if (seenCategories.has(categoryPolicy.id)) {
        issues.push({ path, message: 'Category appears more than once.' });
        continue;
      }
      seenCategories.add(categoryPolicy.id);
      const descriptor = categories.get(categoryPolicy.id);
      if (!descriptor) {
        issues.push({ path, message: 'Category is not supported by the deployed adapter.' });
        continue;
      }
      const fields = new Map(descriptor.fields.map((field) => [field.id, field]));
      const seenFields = new Set();
      for (const fieldPolicy of categoryPolicy.fields) {
        const fieldPath = path + '.fields.' + fieldPolicy.id;
        if (seenFields.has(fieldPolicy.id)) {
          issues.push({ path: fieldPath, message: 'Field appears more than once.' });
          continue;
        }
        seenFields.add(fieldPolicy.id);
        const field = fields.get(fieldPolicy.id);
        if (!field) {
          issues.push({ path: fieldPath, message: 'Field is not supported by the adapter.' });
        } else if (field.required && fieldPolicy.mode !== 'mandatory') {
          issues.push({
            path: fieldPath,
            message: 'Adapter-required fields must remain mandatory in a donation policy.',
          });
        }
      }
      for (const field of descriptor.fields) {
        if (field.required && !seenFields.has(field.id)) {
          issues.push({
            path: path + '.fields.' + field.id,
            message: 'Adapter-required field is missing from the project policy.',
          });
        }
      }
      if (categoryPolicy.enabled && categoryPolicy.fields.every((f) => f.mode === 'prohibited')) {
        issues.push({ path, message: 'An enabled category must permit at least one field.' });
      }
    }
    return issues;
  }

  function descriptorForPolicy(field, policy) {
    if (policy.mode === 'mandatory') {
      return Object.assign({}, field, { required: true, defaultIncluded: true });
    }
    return Object.assign({}, field, {
      required: false,
      defaultIncluded: policy.defaultIncluded === undefined ? field.defaultIncluded : policy.defaultIncluded,
    });
  }

  /** Exact category/field descriptors a project release exposes. */
  function projectCategoryDescriptors(capabilities, policy) {
    if (policy.mode !== 'donation') return [];
    const categoryPolicies = new Map(
      policy.categories.filter((c) => c.enabled).map((c) => [c.id, c]),
    );
    const out = [];
    for (const descriptor of capabilities) {
      const categoryPolicy = categoryPolicies.get(descriptor.id);
      if (!categoryPolicy) continue;
      const policies = new Map(categoryPolicy.fields.map((f) => [f.id, f]));
      const fields = [];
      for (const field of descriptor.fields) {
        const fieldPolicy = policies.get(field.id);
        // Fields absent from the project policy are not approved: same as prohibited.
        if (fieldPolicy && fieldPolicy.mode !== 'prohibited') {
          fields.push(descriptorForPolicy(field, fieldPolicy));
        }
      }
      if (fields.length > 0) out.push(Object.assign({}, descriptor, { fields }));
    }
    return out;
  }

  /**
   * Intersect extracted candidates with the immutable release policy. Runs
   * before candidates are retained. Returns the narrowed extraction plus a
   * small tally used by the demo's worker console.
   */
  function applyProjectSourcePolicy(extraction, policy) {
    if (policy.mode !== 'donation') {
      throw new Error('The selected source is not enabled for donation in this project.');
    }
    const issues = validateProjectSourcePolicy(policy, extraction.inventory.source, extraction.categories);
    if (issues.length > 0) {
      throw new Error('Invalid project source policy: ' + issues.map((i) => i.path).join(', '));
    }
    const categories = projectCategoryDescriptors(extraction.categories, policy);
    const allowedFields = new Map();
    for (const descriptor of categories) {
      allowedFields.set(descriptor.id, new Set(descriptor.fields.map((f) => f.id)));
    }
    let removedRecords = 0;
    const removedFields = {};
    const records = [];
    for (const record of extraction.records) {
      const fields = allowedFields.get(record.category);
      if (!fields) {
        removedRecords += 1;
        continue;
      }
      const kept = {};
      for (const key of Object.keys(record.fields)) {
        if (fields.has(key)) kept[key] = record.fields[key];
        else removedFields[key] = (removedFields[key] || 0) + 1;
      }
      records.push(Object.assign({}, record, { fields: kept }));
    }
    const permitted = new Set(categories.map((c) => c.id));
    const removedCategories = extraction.categories
      .filter((c) => !permitted.has(c.id))
      .map((c) => c.label);
    const inventoryCategories = extraction.inventory.categories
      .filter((c) => permitted.has(c.id))
      .map((c) =>
        Object.assign({}, c, {
          presentFields: c.presentFields.filter((f) => allowedFields.get(c.id).has(f)),
        }),
      );
    return {
      ok: true,
      records,
      categories,
      inventory: Object.assign({}, extraction.inventory, {
        categories: inventoryCategories,
        totalRecords: records.length,
        warnings: extraction.inventory.warnings.filter(
          (w) => !w.categoryId || permitted.has(w.categoryId),
        ),
        systemExcludedCategories: Array.from(
          new Set(extraction.inventory.systemExcludedCategories.concat(removedCategories)),
        ),
      }),
      tally: { removedRecords, removedFields, removedCategories },
    };
  }

  /* ------------------------------------------------------------------ */
  /* Selection engine (participant boundary) — mirrors engine.ts         */
  /* ------------------------------------------------------------------ */

  function defaultPolicy(sourceId, categories) {
    const cats = {};
    for (const c of categories) {
      const fields = {};
      for (const f of c.fields) fields[f.id] = f.required ? true : f.defaultIncluded;
      cats[c.id] = { included: true, fields };
    }
    return {
      version: 2,
      sourceId,
      categories: cats,
      bulkExclusions: [],
      recordOverrides: { included: [], excluded: [] },
      conversationOverrides: { included: [], excluded: [] },
    };
  }

  const MAX_RULE_QUERY_LENGTH = 200;

  function createBulkExclusionRule(input) {
    const categoryId = (input.categoryId || '').trim() || undefined;
    const textContains = (input.textContains || '').trim() || undefined;
    const from = ((input.dateRange && input.dateRange.from) || '').trim() || undefined;
    const to = ((input.dateRange && input.dateRange.to) || '').trim() || undefined;
    if (input.target === 'records' && !categoryId) {
      throw new Error('A record exclusion rule must name a category.');
    }
    if (input.target === 'conversations' && categoryId) {
      throw new Error('A conversation exclusion rule cannot be limited to one record category.');
    }
    if (textContains && textContains.length > MAX_RULE_QUERY_LENGTH) {
      throw new Error('Search text must be ' + MAX_RULE_QUERY_LENGTH + ' characters or fewer.');
    }
    const isoDay = /^\d{4}-\d{2}-\d{2}$/;
    if ((from && !isoDay.test(from)) || (to && !isoDay.test(to))) {
      throw new Error('Rule dates must use YYYY-MM-DD.');
    }
    if (from && to && from > to) throw new Error('The start date must not be after the end date.');
    if (!textContains && !from && !to) {
      throw new Error('An exclusion rule needs search text or a date range.');
    }
    const signature = [
      input.target,
      categoryId || '',
      textContains ? textContains.toLowerCase() : '',
      from || '',
      to || '',
    ].join('|');
    const rule = { id: 'rule-' + fnv1a(signature).toString(36), target: input.target };
    if (categoryId) rule.categoryId = categoryId;
    if (textContains) rule.textContains = textContains;
    if (from || to) {
      rule.dateRange = {};
      if (from) rule.dateRange.from = from;
      if (to) rule.dateRange.to = to;
    }
    return rule;
  }

  function fieldIncluded(descriptor, selection, fieldId) {
    const fd = descriptor.fields.find((f) => f.id === fieldId);
    if (!fd) return false; // unknown fields can never be selected
    if (fd.required) return true;
    const chosen = selection && selection.fields ? selection.fields[fieldId] : undefined;
    return chosen === undefined ? fd.defaultIncluded : chosen;
  }

  function inDateRange(timestamp, rule) {
    if (!rule || (!rule.from && !rule.to)) return true;
    if (!timestamp) return false;
    const day = timestamp.slice(0, 10);
    if (rule.from && day < rule.from) return false;
    if (rule.to && day > rule.to) return false;
    return true;
  }

  function conversationFacts(candidates) {
    const facts = new Map();
    for (const record of candidates) {
      if (!record.conversationId) continue;
      const existing = facts.get(record.conversationId);
      if (!existing) {
        facts.set(record.conversationId, {
          title: record.conversationTitle || '',
          timestamp: record.timestamp,
        });
        continue;
      }
      if (!existing.title && record.conversationTitle) existing.title = record.conversationTitle;
      if (record.timestamp && (existing.timestamp === null || record.timestamp < existing.timestamp)) {
        existing.timestamp = record.timestamp;
      }
    }
    return facts;
  }

  function recordSearchText(record) {
    return (
      Object.values(record.fields).join(' ') +
      ' ' +
      (record.conversationTitle || '')
    ).toLowerCase();
  }

  function matchesRule(record, rule, conversations) {
    let text = '';
    let timestamp = record.timestamp;
    if (rule.target === 'records') {
      if (!rule.categoryId || record.category !== rule.categoryId) return false;
      text = recordSearchText(record);
    } else {
      if (!record.conversationId) return false;
      const fact = conversations.get(record.conversationId);
      if (!fact) return false;
      text = fact.title.toLowerCase();
      timestamp = fact.timestamp;
    }
    if (rule.textContains && !text.includes(rule.textContains.toLowerCase())) return false;
    return inDateRange(timestamp, rule.dateRange);
  }

  /** Compile the policy once; evaluate each record in O(active rules). */
  function createSelectionMatcher(candidates, policy) {
    const recordExcluded = new Set(policy.recordOverrides.excluded);
    const recordIncluded = new Set(policy.recordOverrides.included);
    const conversationExcluded = new Set(policy.conversationOverrides.excluded);
    const conversationIncluded = new Set(policy.conversationOverrides.included);
    const recordRules = policy.bulkExclusions.filter((r) => r.target === 'records');
    const conversationRules = policy.bulkExclusions.filter((r) => r.target === 'conversations');
    const conversations = conversationRules.length > 0 ? conversationFacts(candidates) : new Map();
    return function isSelected(record) {
      // Individual restoration is only an exception to a bulk rule. It can never
      // bypass the study boundary, a disabled category, or its date rule.
      const selection = policy.categories[record.category];
      if (!selection || !selection.included || !inDateRange(record.timestamp, selection.dateRange)) {
        return false;
      }
      if (recordExcluded.has(record.localId)) return false;
      if (record.conversationId && conversationExcluded.has(record.conversationId)) return false;
      if (!recordIncluded.has(record.localId)) {
        for (const rule of recordRules) if (matchesRule(record, rule, conversations)) return false;
      }
      if (!record.conversationId || !conversationIncluded.has(record.conversationId)) {
        for (const rule of conversationRules) if (matchesRule(record, rule, conversations)) return false;
      }
      return true;
    };
  }

  function compareCandidates(a, b) {
    return (
      a.category.localeCompare(b.category) ||
      (a.timestamp || '').localeCompare(b.timestamp || '') ||
      a.localId.localeCompare(b.localId)
    );
  }

  function initialCategoryCounts(descriptors) {
    const out = {};
    for (const d of descriptors) out[d.id] = { candidates: 0, selected: 0, state: 'none', includedFields: [] };
    return out;
  }

  function finishCounts(byCategory, descriptors, policy, min, max) {
    const descByCat = new Map(descriptors.map((d) => [d.id, d]));
    let totalSelected = 0;
    let totalCandidates = 0;
    for (const categoryId of Object.keys(byCategory)) {
      const category = byCategory[categoryId];
      totalSelected += category.selected;
      totalCandidates += category.candidates;
      category.state =
        category.selected === 0 ? 'none' : category.selected === category.candidates ? 'all' : 'partial';
      const descriptor = descByCat.get(categoryId);
      category.includedFields = descriptor
        ? descriptor.fields
            .filter((f) => category.selected > 0 && fieldIncluded(descriptor, policy.categories[categoryId], f.id))
            .map((f) => f.id)
        : [];
    }
    return {
      totalCandidates,
      totalSelected,
      totalParticipantExcluded: totalCandidates - totalSelected,
      byCategory,
      dateRange: { from: min, to: max },
    };
  }

  function projectRecord(record, descriptor, policy, conversation) {
    const output = { category: record.category };
    if (record.timestamp && fieldIncluded(descriptor, policy.categories[record.category], 'timestamp')) {
      output.timestamp = record.timestamp;
    }
    if (conversation !== undefined) output.conversation = conversation;
    for (const fieldId of Object.keys(record.fields)) {
      if (fieldId !== 'timestamp' && fieldIncluded(descriptor, policy.categories[record.category], fieldId)) {
        output[fieldId] = record.fields[fieldId];
      }
    }
    return output;
  }

  /**
   * Apply the policy: one pass, deterministic ordering (category, timestamp,
   * localId). Only selected fields survive; excluded VALUES never leave here.
   */
  function applySelection(candidates, descriptors, policy) {
    const descByCat = new Map(descriptors.map((d) => [d.id, d]));
    const isSelected = createSelectionMatcher(candidates, policy);
    const byCategory = initialCategoryCounts(descriptors);
    const selected = [];
    let min = null;
    let max = null;
    for (const rec of candidates) {
      const cat = byCategory[rec.category] || (byCategory[rec.category] = { candidates: 0, selected: 0, state: 'none', includedFields: [] });
      cat.candidates += 1;
      const desc = descByCat.get(rec.category);
      if (!desc) continue;
      if (!isSelected(rec)) continue;
      cat.selected += 1;
      if (rec.timestamp && fieldIncluded(desc, policy.categories[rec.category], 'timestamp')) {
        if (min === null || rec.timestamp < min) min = rec.timestamp;
        if (max === null || rec.timestamp > max) max = rec.timestamp;
      }
      selected.push(rec);
    }
    selected.sort(compareCandidates);
    const conversationSequence = new Map();
    const payloadRecords = selected.map((record) => {
      let conversation;
      if (record.conversationId) {
        conversation = conversationSequence.get(record.conversationId);
        if (conversation === undefined) {
          conversation = conversationSequence.size + 1;
          conversationSequence.set(record.conversationId, conversation);
        }
      }
      return projectRecord(record, descByCat.get(record.category), policy, conversation);
    });
    return {
      payloadRecords,
      selectedIds: selected.map((r) => r.localId),
      selectedRecords: selected,
      counts: finishCounts(byCategory, descriptors, policy, min, max),
    };
  }

  function computeInventory(candidates, descriptors) {
    const map = new Map();
    for (const d of descriptors) {
      map.set(d.id, { id: d.id, count: 0, dateRange: { from: null, to: null }, presentFields: [], convs: new Set() });
    }
    const present = new Map();
    for (const rec of candidates) {
      const inv = map.get(rec.category);
      if (!inv) continue;
      inv.count += 1;
      let p = present.get(rec.category);
      if (!p) present.set(rec.category, (p = new Set()));
      if (rec.timestamp) {
        if (inv.dateRange.from === null || rec.timestamp < inv.dateRange.from) inv.dateRange.from = rec.timestamp;
        if (inv.dateRange.to === null || rec.timestamp > inv.dateRange.to) inv.dateRange.to = rec.timestamp;
        p.add('timestamp');
      }
      for (const f of Object.keys(rec.fields)) p.add(f);
      if (rec.conversationId) inv.convs.add(rec.conversationId);
    }
    return Array.from(map.values()).map((inv) => {
      const out = { id: inv.id, count: inv.count, dateRange: inv.dateRange, presentFields: Array.from(present.get(inv.id) || []).sort() };
      if (inv.convs.size > 0) out.conversationCount = inv.convs.size;
      return out;
    });
  }

  function buildSourceInventory(source, exportSchemaVersion, candidates, descriptors, systemExcluded, unsupported, warnings) {
    return {
      source,
      exportSchemaVersion,
      categories: computeInventory(candidates, descriptors),
      totalRecords: candidates.length,
      systemExcludedCategories: systemExcluded.slice(),
      unsupportedCategories: unsupported.slice(),
      warnings: warnings.slice(),
    };
  }

  function sampleSelected(items, max) {
    if (items.length <= max) return items;
    const step = items.length / max;
    const out = [];
    for (let i = 0; i < max; i += 1) out.push(items[Math.floor(i * step)]);
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Canonical JSON + SHA-256 — mirrors payload.ts / checksum.ts         */
  /* ------------------------------------------------------------------ */

  function sortValue(value) {
    if (Array.isArray(value)) return value.map(sortValue);
    if (value !== null && typeof value === 'object') {
      const out = {};
      for (const key of Object.keys(value).sort()) {
        const v = value[key];
        if (v !== undefined) out[key] = sortValue(v);
      }
      return out;
    }
    return value;
  }

  function canonicalJson(value) {
    return JSON.stringify(sortValue(value));
  }

  function canonicalJsonBytes(value) {
    return new TextEncoder().encode(canonicalJson(value));
  }

  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  function rotr(x, n) {
    return (x >>> n) | (x << (32 - n));
  }

  /** Pure-JS SHA-256 used only when WebCrypto is unavailable. */
  function sha256Sync(bytes) {
    const len = bytes.length;
    const padded = new Uint8Array((((len + 9 + 63) / 64) | 0) * 64);
    padded.set(bytes);
    padded[len] = 0x80;
    const view = new DataView(padded.buffer);
    const bitLen = len * 8;
    view.setUint32(padded.length - 4, bitLen >>> 0);
    view.setUint32(padded.length - 8, Math.floor(bitLen / 4294967296));
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const W = new Uint32Array(64);
    for (let off = 0; off < padded.length; off += 64) {
      for (let i = 0; i < 16; i += 1) W[i] = view.getUint32(off + i * 4);
      for (let i = 16; i < 64; i += 1) {
        const s0 = rotr(W[i - 15], 7) ^ rotr(W[i - 15], 18) ^ (W[i - 15] >>> 3);
        const s1 = rotr(W[i - 2], 17) ^ rotr(W[i - 2], 19) ^ (W[i - 2] >>> 10);
        W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
      }
      let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (let i = 0; i < 64; i += 1) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    return H.map((v) => v.toString(16).padStart(8, '0')).join('');
  }

  const forceFallback = /[?&]nosubtle\b/.test(location.search);
  const subtle = !forceFallback && window.crypto && window.crypto.subtle ? window.crypto.subtle : null;

  function bytesToHex(buffer) {
    return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function sha256Hex(bytes) {
    if (subtle) {
      try {
        return bytesToHex(await subtle.digest('SHA-256', bytes));
      } catch (err) {
        /* fall through to the pure-JS implementation */
      }
    }
    return sha256Sync(bytes);
  }

  function sha256HexOfString(text) {
    return sha256Hex(new TextEncoder().encode(text));
  }

  /* ------------------------------------------------------------------ */
  /* Manifest v2 + finalization — mirrors manifest2.ts / pipeline.ts     */
  /* ------------------------------------------------------------------ */

  const PARSER_VERSION = '1.0.0';

  async function buildManifest(payload, counts, inventory, opts) {
    opts = opts || {};
    const bytes = canonicalJsonBytes(payload);
    const manifest = {
      schema: 'datadonate.manifest.v2',
      source: payload.source,
      adapterVersion: payload.adapterVersion,
      parserVersion: PARSER_VERSION,
      detectedExportSchemaVersion: payload.detectedExportSchemaVersion,
      selectionPolicyVersion: 2,
      categories: Object.keys(counts.byCategory)
        .filter((id) => counts.byCategory[id].selected > 0)
        .map((id) => ({
          id,
          includedRecords: counts.byCategory[id].selected,
          includedFields: counts.byCategory[id].includedFields,
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
      totalRecords: counts.totalSelected,
      dateRange: counts.dateRange,
      systemExcludedCategories: inventory.systemExcludedCategories,
      unsupportedCategories: inventory.unsupportedCategories,
      warningCounts: inventory.warnings.reduce((acc, w) => {
        acc[w.code] = (acc[w.code] || 0) + w.count;
        return acc;
      }, {}),
      payloadSha256: await sha256Hex(bytes),
      payloadBytes: bytes.byteLength,
      processedAt: (opts.processedAt || new Date()).toISOString(),
    };
    if (opts.includeExcludedCounts) manifest.participantExcludedTotal = counts.totalParticipantExcluded;
    if (opts.projectReleaseId) manifest.projectReleaseId = opts.projectReleaseId;
    if (opts.sourcePolicySha256) manifest.sourcePolicySha256 = opts.sourcePolicySha256;
    if (opts.collectionRoundId) manifest.collectionRoundId = opts.collectionRoundId;
    return manifest;
  }

  async function finalize(extraction, policy, opts) {
    opts = opts || {};
    const applied = applySelection(extraction.records, extraction.categories, policy);
    const payload = {
      schema: 'datadonate.donation.v2',
      source: extraction.inventory.source,
      adapterVersion: opts.adapterVersion || 'unknown',
      detectedExportSchemaVersion: extraction.inventory.exportSchemaVersion,
      records: applied.payloadRecords,
    };
    const payloadBytes = canonicalJsonBytes(payload);
    const manifest = await buildManifest(payload, applied.counts, extraction.inventory, opts);
    return {
      payload,
      payloadBytes,
      manifest,
      counts: applied.counts,
      selectedIds: applied.selectedIds,
      sampleRecords: sampleSelected(applied.payloadRecords, opts.sampleSize || 8),
    };
  }

  /* ------------------------------------------------------------------ */
  /* Small formatting helpers                                            */
  /* ------------------------------------------------------------------ */

  const RECEIPT_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  function receiptCode(rng) {
    const pick = (n) => {
      let out = '';
      for (let i = 0; i < n; i += 1) out += RECEIPT_ALPHABET[Math.floor(rng() * RECEIPT_ALPHABET.length)];
      return out;
    };
    return 'DD-' + pick(4) + '-' + pick(4);
  }

  function formatBytes(n) {
    if (!Number.isFinite(n)) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(2) + ' MB';
  }

  const nf = new Intl.NumberFormat('en-US');
  function formatNumber(n) {
    return nf.format(n);
  }

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate() + ', ' + d.getUTCFullYear();
  }

  function formatDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    return formatDate(iso) + ' ' + hh + ':' + mm + ' UTC';
  }

  function shortHash(hex, head, tail) {
    if (!hex) return '…';
    head = head || 8;
    tail = tail || 6;
    return hex.slice(0, head) + '…' + hex.slice(-tail);
  }

  function isoDay(date) {
    return date.toISOString().slice(0, 10);
  }

  /* Self-check at boot: FIPS 180-4 test vector for "abc". */
  const ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
  console.assert(sha256Sync(new TextEncoder().encode('abc')) === ABC, 'pure-JS SHA-256 self-check failed');
  sha256HexOfString('abc').then((hex) => console.assert(hex === ABC, 'SHA-256 self-check failed'));

  return {
    fnv1a,
    mulberry32,
    validateProjectSourcePolicy,
    projectCategoryDescriptors,
    applyProjectSourcePolicy,
    defaultPolicy,
    createBulkExclusionRule,
    createSelectionMatcher,
    applySelection,
    computeInventory,
    buildSourceInventory,
    sampleSelected,
    recordSearchText,
    inDateRange,
    canonicalJson,
    canonicalJsonBytes,
    sha256Hex,
    sha256HexOfString,
    sha256Sync,
    usingWebCrypto: Boolean(subtle),
    buildManifest,
    finalize,
    receiptCode,
    formatBytes,
    formatNumber,
    formatDate,
    formatDateTime,
    shortHash,
    isoDay,
    PARSER_VERSION,
  };
})();
