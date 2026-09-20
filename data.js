/*
 * DataDonate demo — synthetic data
 *
 * Every value in this file is fictitious. Project names, governance
 * references, participants, donations, receipts and activity records are
 * generated for the tour and do not correspond to any real study, person,
 * account or file. Candidate activity is generated deterministically from a
 * seeded PRNG so the tour shows the same numbers and fingerprints every time.
 */
window.DEMO_DATA = (function () {
  'use strict';
  const E = window.DemoEngine;

  /* ------------------------------------------------------------------ */
  /* Global source registry (capability catalog — the outer ceiling)     */
  /* ------------------------------------------------------------------ */

  const SOURCES = [
    {
      id: 'tiktok',
      displayName: 'TikTok',
      letter: 'T',
      description: 'Videos you watched or liked, and searches you made — search words start off',
      capabilityStatus: 'donation_ready',
      enabled: true,
      exportFormatVerifiedOn: '2026-07-17',
      fileName: 'user_data_tiktok.json',
      archive: {
        kind: 'ZIP or JSON',
        entries: ['user_data_tiktok.json'],
        allowlisted: ['user_data_tiktok.json'],
        sectionsTotal: 18,
        sectionsRead: ['Your Activity › Watch History', 'Your Activity › Searches', 'Likes and Favorites › Like List'],
      },
      exportGuide: {
        version: '2026-08-24',
        intro: 'TikTok lets you request a copy of your own activity data.',
        steps: [
          { title: 'Open TikTok and go to your profile', detail: 'Use the Profile button at the bottom of the TikTok app.' },
          { title: 'Open Settings and privacy', detail: 'Open the menu, then choose Settings and privacy.' },
          { title: 'Find Download your data', detail: 'Open Account, then choose Download your data.' },
          {
            title: 'Select the activity categories named in your project guide',
            detail:
              'On Select data to download, choose Your Activity. Choose Likes and Favorites only when your project guide asks for liked-video activity. Leave Comments, Direct Messages, Income + Wallet, Location Reviews, Posts, Profile and Settings, TikTok LIVE, and TikTok Shop unchecked.',
          },
          { title: 'Choose JSON and request the file', detail: 'Choose JSON rather than HTML, then tap Request data.' },
          {
            title: 'Return to Download data when TikTok says it is ready',
            detail: 'Download and save the ZIP without changing it. TikTok says a ready file is available for up to 4 days.',
          },
        ],
        wait: 'Your TikTok file may take 1–2 days to be ready, and some requests can take a few days. TikTok also says the newest 24 to 48 hours of some activity may not be included.',
      },
    },
    {
      id: 'chatgpt',
      displayName: 'ChatGPT',
      letter: 'C',
      description: 'Your conversations with ChatGPT — you choose how much to share',
      capabilityStatus: 'donation_ready',
      enabled: true,
      exportFormatVerifiedOn: '2026-07-17',
      fileName: 'chatgpt-export.zip',
      archive: {
        kind: 'ZIP',
        entries: ['conversations.json', 'user.json', 'message_feedback.json', 'model_comparisons.json', 'shared_conversations.json', 'chat.html'],
        allowlisted: ['conversations.json'],
        sectionsTotal: 6,
        sectionsRead: ['conversations.json (active message path only)'],
      },
      exportGuide: {
        version: '2026-07-17',
        intro:
          'ChatGPT can prepare a ZIP copy of your chat history and other account data. Data export may not be available for every workspace plan.',
        steps: [
          { title: 'Make sure you can access your account email or phone', detail: 'OpenAI uses it to verify the request and send the download link.' },
          { title: 'Open ChatGPT Settings', detail: 'Sign in, open your profile menu, then choose Settings.' },
          { title: 'Open Data Controls and choose Export Data', detail: 'Choose Export, then confirm the export request.' },
          { title: 'Check your email or text messages', detail: 'OpenAI sends the download link to the email address or phone on the account.' },
          { title: 'Save the ZIP file', detail: 'The download link expires after 24 hours. Save the ZIP without changing it.' },
        ],
        wait: 'OpenAI says an export can take up to 7 days to arrive. If the 24-hour download link expires, request a new export.',
      },
    },
    {
      id: 'instagram',
      displayName: 'Instagram',
      letter: 'I',
      description:
        'Videos and Reels recorded in your watched-video export — captions and private account data are never collected',
      capabilityStatus: 'donation_ready',
      enabled: true,
      exportFormatVerifiedOn: '2026-08-31',
      exportGuide: {
        version: '2026-08-31',
        intro:
          'Instagram can prepare a ZIP containing watched-video activity. Choose Ads and topics only. DataDonate opens the ZIP on your device, reads only the watched-video file, and never uploads the full archive.',
        steps: [
          { title: 'Open Accounts Center from Instagram', detail: 'Open your Instagram profile, open the menu, then choose Accounts Center.' },
          { title: 'Start an information export', detail: 'Choose Your information and permissions, Export your information, then Create export.' },
          { title: 'Choose only your Instagram profile', detail: 'Select the Instagram profile you want to use, then choose Export to device.' },
          { title: 'Choose only Ads and topics', detail: 'Open Customize information, deselect everything, then under Ads information select Ads and topics.' },
          { title: 'Use JSON, the project date range, and Low media quality', detail: 'Choose the date range named in your project instructions, JSON for the format, and Low for media quality.' },
          { title: 'Download the original ZIP', detail: 'Save every ZIP part without unzipping, renaming, or changing its contents.' },
        ],
        wait: 'Meta does not promise a fixed preparation time. It may take several days, and ready downloads are available for a limited time.',
      },
    },
    {
      id: 'facebook',
      displayName: 'Facebook',
      letter: 'F',
      description: 'Viewing-history export guide — upload support is being verified',
      capabilityStatus: 'instructions_only',
      enabled: false,
      exportGuide: {
        version: '2026-08-31',
        intro:
          "Facebook's standard export does not provide a verified per-video watch history. DataDonate cannot accept that export until its current structure and privacy boundary are verified.",
        steps: [
          { title: 'Open Accounts Center from Facebook', detail: 'Open your profile menu, choose Settings and privacy, Settings, then Accounts Center.' },
          { title: 'Do not upload a Facebook archive yet', detail: 'Facebook remains instructions-only. The platform will not show an upload control or accept a Facebook ZIP.' },
        ],
        wait: 'Facebook upload support remains unavailable until a current Data Logs export is verified with synthetic fixtures and privacy tests.',
      },
      verificationNeeded:
        'Needs a current Data Logs export to verify its content-viewed files, HTML/JSON structures, split-archive behavior, paths, and fields, plus synthetic fixtures, strict allowlisting, and redaction tests.',
    },
    {
      id: 'youtube',
      displayName: 'YouTube',
      letter: 'Y',
      description: 'Videos and posts you viewed, and searches you made — labels, titles, and search words start off',
      capabilityStatus: 'donation_ready',
      enabled: true,
      exportFormatVerifiedOn: '2026-07-24',
      fileName: 'takeout-20260908T171522Z-001.zip',
      archive: {
        kind: 'ZIP',
        entries: [
          'Takeout/archive_browser.html',
          'Takeout/YouTube and YouTube Music/history/watch-history.json',
          'Takeout/YouTube and YouTube Music/history/search-history.json',
          'Takeout/YouTube and YouTube Music/subscriptions/subscriptions.csv',
          'Takeout/YouTube and YouTube Music/playlists/Watch later.csv',
          'Takeout/YouTube and YouTube Music/playlists/Liked videos.csv',
          'Takeout/YouTube and YouTube Music/comments/comments.csv',
          'Takeout/YouTube and YouTube Music/channels/channel.csv',
          'Takeout/YouTube and YouTube Music/video metadata/videos.csv',
          'Takeout/YouTube and YouTube Music/music library songs/music-library-songs.csv',
          'Takeout/YouTube and YouTube Music/live chats/live chats.csv',
          'Takeout/YouTube and YouTube Music/posts/posts.csv',
          'Takeout/YouTube and YouTube Music/music-uploads/music-uploads.csv',
          'Takeout/YouTube and YouTube Music/product settings.json',
        ],
        allowlisted: [
          'Takeout/YouTube and YouTube Music/history/watch-history.json',
          'Takeout/YouTube and YouTube Music/history/search-history.json',
        ],
        sectionsTotal: 14,
        sectionsRead: ['history/watch-history.json', 'history/search-history.json'],
      },
      exportGuide: {
        version: '2026-08-24',
        intro:
          'Google Takeout can prepare a ZIP containing YouTube video, community-post, and search history. Your project controls which approved activity can be donated, and sensitive text starts off on your device.',
        steps: [
          { title: 'Open Google Takeout and sign in', detail: 'Go to takeout.google.com using the Google account you use for YouTube.' },
          {
            title: 'Choose only YouTube history',
            detail:
              'Choose Deselect all on the main Takeout page, then turn on YouTube and YouTube Music. Open All YouTube data included, choose Deselect all in that window, check only history, then choose OK.',
          },
          {
            title: 'Choose JSON when Google offers it',
            detail: 'Open Multiple formats if Google shows it. JSON is the most reliable choice. The current English HTML layout is also supported.',
          },
          { title: 'Create a one-time ZIP export', detail: 'Choose Next step, a one-time export, ZIP file type, and Create export.' },
          { title: 'Download the ZIP when Google says it is ready', detail: 'Save the ZIP without opening, renaming, or changing files inside it.' },
        ],
        wait: 'Google says preparation can take from a few minutes to a few days, although most people receive the link the same day. Takeout archives expire after about 7 days.',
      },
    },
    {
      id: 'twitter',
      displayName: 'X (Twitter)',
      letter: 'X',
      description:
        'Posts you liked and posts you authored — post text is project-controlled and likes are engagement, not viewing exposure',
      capabilityStatus: 'donation_ready',
      enabled: true,
      exportFormatVerifiedOn: '2026-08-31',
    },
    {
      id: 'reddit',
      displayName: 'Reddit',
      letter: 'R',
      description: 'Not available yet',
      capabilityStatus: 'unavailable',
      enabled: false,
      verificationNeeded:
        'Needs a real Reddit GDPR data export to verify the current CSV set, plus sanitized fixtures and redaction tests.',
    },
  ];

  /* ------------------------------------------------------------------ */
  /* Adapter capability descriptors (mirrors the real adapters)          */
  /* ------------------------------------------------------------------ */

  const field = (id, label, description, sensitivity, required, defaultIncluded, freeText) => {
    const f = { id, label, description, sensitivity, required, defaultIncluded };
    if (freeText) f.freeText = true;
    return f;
  };

  const CAPABILITIES = {
    tiktok: {
      adapterVersion: '1.4.0',
      schemaVersion: 'tiktok-json-v3',
      categories: [
        {
          id: 'watch_history',
          label: 'Videos you watched',
          description: 'When you watched videos, and links to those public videos.',
          fields: [
            field('timestamp', 'Date and time watched', 'When each video was watched.', 'low', true, true),
            field('contentRef', 'Link to the video', 'A link to the public video. Query strings are always removed.', 'medium', false, true),
          ],
        },
        {
          id: 'likes',
          label: 'Videos you liked',
          description: 'When you liked videos, and links to those public videos.',
          fields: [
            field('timestamp', 'Date and time liked', 'When each video was liked.', 'low', true, true),
            field('contentRef', 'Link to the video', 'A canonical public video link. Creator handles and query strings are removed.', 'medium', false, true),
          ],
        },
        {
          id: 'searches',
          label: 'Your searches',
          description: 'When you searched on TikTok, and (only if you choose) the words you searched for.',
          fields: [
            field('timestamp', 'Date and time of the search', 'When each search happened.', 'low', true, true),
            field('searchTerm', 'What you searched for', 'The words you typed. This is free text you wrote, so it stays out of your donation unless you turn it on.', 'high', false, false, true),
          ],
        },
      ],
      systemExcluded: [
        'Profile and account details',
        'Autofill contact information',
        'Direct messages',
        'Comments you wrote',
        'Followers and following',
        'Login, IP and device history',
        'Purchases and payment details',
        'Off-platform activity',
        'Advertising interests and ad responses',
        'Donations and fundraisers',
        'Hashtags, stickers, effects and sounds',
        'Watched-video titles and labels',
      ],
      unsupported: ['Videos you shared', 'Reposts'],
      presets: [
        { id: 'activity_details', label: 'Activity details', description: 'Share activity dates and canonical public video links. Search words stay out.', recommended: true, includesSensitiveText: false, off: [] },
        { id: 'dates_only', label: 'Dates only', description: 'Share only when activity happened. No links and no search words.', recommended: false, includesSensitiveText: false, off: [['watch_history', 'contentRef'], ['likes', 'contentRef']] },
      ],
    },
    youtube: {
      adapterVersion: '1.4.0',
      schemaVersion: 'youtube-takeout-history-v1',
      categories: [
        {
          id: 'watch_history',
          label: 'Videos you watched',
          description: 'When you watched YouTube videos, with optional links, titles, and channel names.',
          fields: [
            field('timestamp', 'Date and time watched', 'When each video was watched.', 'low', true, true),
            field('title', 'Video title', 'The title can reveal health, political, religious, or other private interests.', 'high', false, false),
            field('channelName', 'Channel name', 'The public name of the channel shown in the activity record.', 'medium', false, false),
            field('contentRef', 'Link to the video', 'A canonical YouTube link. Tracking parameters are always removed.', 'medium', false, true),
          ],
        },
        {
          id: 'post_views',
          label: 'Posts you viewed',
          description: 'When you viewed YouTube community posts, with an optional public link and label.',
          fields: [
            field('timestamp', 'Date and time viewed', 'When each post was viewed.', 'low', true, true),
            field('contentRef', 'Link to the post', 'A canonical YouTube post link. Tracking parameters are always removed.', 'medium', false, true),
            field('title', 'Post label shown by YouTube', 'This label may reveal a channel or private interest. It remains off unless you turn it on.', 'high', false, false),
          ],
        },
        {
          id: 'searches',
          label: 'Your YouTube searches',
          description: 'When you searched YouTube and, only if you choose, the words you entered.',
          fields: [
            field('timestamp', 'Date and time of the search', 'When each search happened.', 'low', true, true),
            field('searchTerm', 'What you searched for', 'The words you entered. They remain out of the donation unless you turn this on.', 'high', false, false, true),
          ],
        },
      ],
      systemExcluded: [
        'Google account and YouTube channel profile',
        'Videos and music you uploaded',
        'Comments and posts you created, messages and live chats',
        'Subscriptions, playlists and liked-video lists',
        'Location, image, audio and file attachments',
        'Advertising details and activity provenance',
        'Shopping, payment and playable-game data',
        'Activity from other Google products',
        'Likes and reactions',
      ],
      unsupported: ['YouTube Music listening history'],
      presets: [
        { id: 'activity_details', label: 'Activity details', description: 'Share activity dates and canonical public links. Titles, channel names, and search words stay out.', recommended: true, includesSensitiveText: false, off: [] },
        { id: 'dates_only', label: 'Dates only', description: 'Share only when activity happened. No links, titles, channel names, or search words.', recommended: false, includesSensitiveText: false, off: [['watch_history', 'contentRef'], ['post_views', 'contentRef']] },
      ],
    },
    chatgpt: {
      adapterVersion: '1.0.0',
      schemaVersion: 'chatgpt-conversations-v1',
      categories: [
        {
          id: 'conversations',
          label: 'Conversation details',
          description: 'One entry per conversation: when it happened and how many messages it has.',
          supportsConversations: true,
          fields: [
            field('timestamp', 'Date the conversation started', 'When the conversation was created.', 'low', true, true),
            field('messageCount', 'Number of messages', 'How many messages the conversation has (a count only).', 'low', false, true),
            field('title', 'Conversation title', 'The name ChatGPT gave the conversation. Titles can reveal what you talked about, so they stay out unless you turn them on.', 'high', false, false, true),
          ],
        },
        {
          id: 'prompts',
          label: 'Things you wrote to ChatGPT',
          description: 'Your own messages to ChatGPT. You can leave out any conversation or message.',
          supportsConversations: true,
          fields: [
            field('timestamp', 'Date and time', 'When you sent each message.', 'low', true, true),
            field('text', 'The message text', 'The words you wrote.', 'high', false, false, true),
          ],
        },
        {
          id: 'responses',
          label: "ChatGPT's replies",
          description: "ChatGPT's answers in the conversations you include.",
          supportsConversations: true,
          fields: [
            field('timestamp', 'Date and time', 'When each reply was sent.', 'low', true, true),
            field('text', 'The reply text', "ChatGPT's words.", 'high', false, false, true),
          ],
        },
      ],
      systemExcluded: [
        'Account and profile details (user.json)',
        'Feedback you gave on replies (message_feedback.json)',
        'Model comparison records (model_comparisons.json)',
        'Shared-conversation links',
        'Uploaded files and attachment contents',
        'Images and non-text message content',
        'System and tool messages',
        'Abandoned conversation branches (edited-away messages)',
      ],
      unsupported: [],
      presets: [
        { id: 'full_conversations', label: 'Conversations and messages', description: "Conversation dates, message counts, what you wrote and ChatGPT's replies. Titles stay out.", recommended: true, includesSensitiveText: true, off: [] },
        { id: 'activity_only', label: 'Activity only', description: 'Conversation dates and message counts. No message text.', recommended: false, includesSensitiveText: false, off: [['prompts', 'text'], ['responses', 'text']] },
      ],
    },
    instagram: {
      adapterVersion: '1.0.0',
      schemaVersion: 'meta-instagram-json-v1',
      categories: [
        {
          id: 'videos_watched',
          label: 'Videos you watched',
          description: 'Dated videos-watched records from the Ads and topics export.',
          fields: [
            field('timestamp', 'Date and time watched', 'When Meta logged the video as watched.', 'low', true, true),
            field('contentRef', 'Link to the post or Reel', 'A canonical public Instagram reference.', 'medium', false, true),
          ],
        },
      ],
      systemExcluded: ['Captions, titles and account identifiers', 'Advertiser and brand-partner details', 'Messages, contacts, followers and searches', 'Login, device and location records'],
      unsupported: [],
      presets: [],
    },
    twitter: {
      adapterVersion: '1.0.0',
      schemaVersion: 'x-ytd-js-v1',
      categories: [
        {
          id: 'liked_posts',
          label: 'Posts you liked',
          description: 'Undated engagement records. X does not include when each like happened.',
          fields: [
            field('contentRef', 'Link to the post', 'A canonical public post link derived from the numeric post id.', 'medium', false, true),
            field('text', 'Post text', 'High-sensitivity text controlled by the project.', 'high', false, false, true),
          ],
        },
        {
          id: 'authored_posts',
          label: 'Posts you wrote',
          description: 'Dated posts you authored.',
          fields: [
            field('timestamp', 'Date and time posted', 'When the post was created.', 'low', true, true),
            field('contentRef', 'Link to the post', 'A canonical public post link.', 'medium', false, true),
            field('text', 'Post text', 'High-sensitivity text controlled by the project.', 'high', false, false, true),
          ],
        },
      ],
      systemExcluded: ['Direct messages and Grok chats', 'Account, profile and contact data', 'Follow graph', 'IP, device and security logs', 'Inferred interests, demographics and ads'],
      unsupported: [],
      presets: [],
    },
  };

  /* ------------------------------------------------------------------ */
  /* Projects, releases and rounds                                       */
  /* ------------------------------------------------------------------ */

  const PROJECTS = [
    {
      id: 'prj_a4f1e2',
      slug: 'screen-exposure-2026',
      name: 'Screen Exposure and Wellbeing 2026',
      institution: 'OASIS Lab',
      purpose:
        'This study looks at how the videos and posts people encounter on everyday apps relate to self-reported wellbeing over time.',
      governanceStatus: 'approved',
      governanceReference: 'DEMO-IRB-2026-041',
      governanceApprovedAt: '2026-02-20',
      governanceExpiresAt: '2027-02-19',
      lifecycle: 'active',
      visibility: 'unlisted',
      timezone: 'America/Los_Angeles',
      activeReleaseId: 'rel_v2',
      coordinatorEmail: 'coordinator@oasislab.example',
      estimatedMinutes: 20,
      donationsCloseAt: '2026-12-15T23:59:00-08:00',
      participantAccessEndsAt: '2027-01-15T23:59:00-08:00',
      communicationMode: 'platform_email',
      compensation: { mode: 'flat_completion', amountCents: 2000, currency: 'USD' },
      retention: { anchor: 'round_close', days: 365 },
      deletion: { slaDays: 30, slaUnit: 'business_days' },
      createdAt: '2026-01-14T18:12:00Z',
      updatedAt: '2026-09-12T20:41:00Z',
    },
    {
      id: 'prj_b7c209',
      slug: 'assistant-diaries-2026',
      name: 'Conversational AI in Everyday Life',
      institution: 'OASIS Lab',
      purpose: 'A diary-style study of how people use AI assistants for everyday tasks.',
      governanceStatus: 'pending',
      governanceReference: 'DEMO-IRB-2026-077',
      lifecycle: 'draft',
      visibility: 'unlisted',
      timezone: 'America/Los_Angeles',
      activeReleaseId: null,
      coordinatorEmail: 'diaries@oasislab.example',
      communicationMode: 'external',
      compensation: { mode: 'none', amountCents: 0, currency: 'USD' },
      retention: { anchor: 'project_close', days: 730 },
      deletion: { slaDays: 30, slaUnit: 'calendar_days' },
      createdAt: '2026-08-03T16:00:00Z',
      updatedAt: '2026-09-10T22:05:00Z',
    },
  ];

  const fieldPolicy = (id, mode, defaultIncluded) => {
    const p = { id, mode };
    if (defaultIncluded !== undefined) p.defaultIncluded = defaultIncluded;
    return p;
  };

  const V2_SOURCE_POLICIES = [
    {
      sourceId: 'tiktok',
      mode: 'donation',
      required: true,
      categories: [
        { id: 'watch_history', enabled: true, fields: [fieldPolicy('timestamp', 'mandatory'), fieldPolicy('contentRef', 'optional', true)] },
        { id: 'likes', enabled: true, fields: [fieldPolicy('timestamp', 'mandatory'), fieldPolicy('contentRef', 'optional', true)] },
        { id: 'searches', enabled: true, fields: [fieldPolicy('timestamp', 'mandatory'), fieldPolicy('searchTerm', 'optional', false)] },
      ],
    },
    {
      sourceId: 'youtube',
      mode: 'donation',
      required: false,
      categories: [
        {
          id: 'watch_history',
          enabled: true,
          fields: [
            fieldPolicy('timestamp', 'mandatory'),
            fieldPolicy('title', 'prohibited'),
            fieldPolicy('channelName', 'optional', false),
            fieldPolicy('contentRef', 'optional', true),
          ],
        },
        { id: 'post_views', enabled: false, fields: [fieldPolicy('timestamp', 'mandatory'), fieldPolicy('contentRef', 'prohibited'), fieldPolicy('title', 'prohibited')] },
        { id: 'searches', enabled: true, fields: [fieldPolicy('timestamp', 'mandatory'), fieldPolicy('searchTerm', 'optional', false)] },
      ],
    },
    {
      sourceId: 'chatgpt',
      mode: 'donation',
      required: false,
      categories: [
        { id: 'conversations', enabled: true, fields: [fieldPolicy('timestamp', 'mandatory'), fieldPolicy('messageCount', 'optional', true), fieldPolicy('title', 'prohibited')] },
        { id: 'prompts', enabled: true, fields: [fieldPolicy('timestamp', 'mandatory'), fieldPolicy('text', 'optional', true)] },
        { id: 'responses', enabled: true, fields: [fieldPolicy('timestamp', 'mandatory'), fieldPolicy('text', 'optional', true)] },
      ],
    },
    { sourceId: 'instagram', mode: 'guide_only', required: false, categories: [] },
    { sourceId: 'facebook', mode: 'guide_only', required: false, categories: [] },
    { sourceId: 'twitter', mode: 'disabled', required: false, categories: [] },
    { sourceId: 'reddit', mode: 'disabled', required: false, categories: [] },
  ];

  const V1_SOURCE_POLICIES = V2_SOURCE_POLICIES.map((p) => {
    if (p.sourceId === 'chatgpt') return { sourceId: 'chatgpt', mode: 'guide_only', required: false, categories: [] };
    if (p.sourceId === 'youtube') {
      return JSON.parse(JSON.stringify(p).replace('"id":"channelName","mode":"optional","defaultIncluded":false', '"id":"channelName","mode":"prohibited"'));
    }
    return p;
  });

  const RELEASES = [
    {
      id: 'rel_v1',
      projectId: 'prj_a4f1e2',
      version: 1,
      status: 'superseded',
      publishedAt: '2026-03-02T17:04:00Z',
      publishedBy: 'p.jamie',
      supersedesReleaseId: null,
      requiresReconsent: false,
      consentVersion: '1.0',
      sourcePolicies: V1_SOURCE_POLICIES,
      material: {
        consentVersion: '1.0',
        compensation: { mode: 'flat_completion', amountCents: 2000, currency: 'USD' },
        retention: { anchor: 'round_close', days: 365 },
        deletion: { slaDays: 30, slaUnit: 'business_days' },
      },
      changes: [{ section: 'Initial release', summary: 'First published configuration.', material: true }],
    },
    {
      id: 'rel_v2',
      projectId: 'prj_a4f1e2',
      version: 2,
      status: 'active',
      publishedAt: '2026-05-18T16:20:00Z',
      publishedBy: 'p.jamie',
      supersedesReleaseId: 'rel_v1',
      requiresReconsent: true,
      consentVersion: '2.0',
      sourcePolicies: V2_SOURCE_POLICIES,
      material: {
        consentVersion: '2.0',
        compensation: { mode: 'flat_completion', amountCents: 2000, currency: 'USD' },
        retention: { anchor: 'round_close', days: 365 },
        deletion: { slaDays: 30, slaUnit: 'business_days' },
      },
      changes: [
        { section: 'Sources & data policy', summary: "ChatGPT enabled for donation: conversation dates, message counts, the messages you wrote and ChatGPT's replies (titles stay out).", material: true },
        { section: 'Sources & data policy', summary: 'YouTube channel name became an optional field, off by default.', material: true },
        { section: 'Consent', summary: 'Consent document 2.0 describes the added ChatGPT scope.', material: true },
        { section: 'Participant guides', summary: 'TikTok guide re-checked against current app menus.', material: false },
      ],
    },
  ];

  const ROUNDS = [
    {
      id: 'rnd_w1',
      roundKey: 'wave-1',
      name: 'Wave 1 · Spring 2026',
      status: 'closed',
      startsAt: '2026-03-02',
      donationsCloseAt: '2026-06-30',
      participantAccessEndsAt: '2026-07-15',
      requiredSourceIds: [],
      eligibilityMode: 'all_active_participants',
      completed: 9,
      partial: 2,
      accepted: 17,
    },
    {
      id: 'rnd_w2',
      roundKey: 'wave-2',
      name: 'Wave 2 · Fall 2026',
      status: 'active',
      startsAt: '2026-09-01',
      donationsCloseAt: '2026-12-15',
      participantAccessEndsAt: '2027-01-15',
      requiredSourceIds: ['youtube'],
      eligibilityMode: 'all_active_participants',
      completed: 3,
      partial: 4,
      accepted: 11,
    },
  ];

  /* ------------------------------------------------------------------ */
  /* Participants, donations, withdrawals, audit                         */
  /* ------------------------------------------------------------------ */

  const PARTICIPANTS = [
    { id: 'P-0417', status: 'active', invitedAt: '2026-09-02', consentVersion: null, rounds: { 'wave-1': 'complete', 'wave-2': 'none' }, contact: 'masked', note: 'Live tour participant' },
    { id: 'P-0418', status: 'active', invitedAt: '2026-09-02', consentVersion: '2.0', rounds: { 'wave-1': 'complete', 'wave-2': 'complete' } },
    { id: 'P-0419', status: 'active', invitedAt: '2026-09-02', consentVersion: '2.0', rounds: { 'wave-1': 'complete', 'wave-2': 'partial' } },
    { id: 'P-0420', status: 'invited', invitedAt: '2026-09-03', consentVersion: null, rounds: { 'wave-1': 'none', 'wave-2': 'none' } },
    { id: 'P-0421', status: 'withdrawn', invitedAt: '2026-03-04', consentVersion: '1.0', rounds: { 'wave-1': 'complete', 'wave-2': 'none' } },
    { id: 'P-0422', status: 'active', invitedAt: '2026-03-04', consentVersion: '2.0', rounds: { 'wave-1': 'partial', 'wave-2': 'partial' } },
    { id: 'P-0423', status: 'active', invitedAt: '2026-03-05', consentVersion: '2.0', rounds: { 'wave-1': 'complete', 'wave-2': 'complete' } },
    { id: 'P-0424', status: 'active', invitedAt: '2026-09-04', consentVersion: '2.0', rounds: { 'wave-1': 'none', 'wave-2': 'partial' } },
    { id: 'P-0425', status: 'invited', invitedAt: '2026-09-08', consentVersion: null, rounds: { 'wave-1': 'none', 'wave-2': 'none' } },
    { id: 'P-0426', status: 'active', invitedAt: '2026-03-06', consentVersion: '1.0', rounds: { 'wave-1': 'complete', 'wave-2': 'none' }, note: 'Re-consent pending' },
    { id: 'P-0427', status: 'active', invitedAt: '2026-09-09', consentVersion: '2.0', rounds: { 'wave-1': 'none', 'wave-2': 'complete' } },
    { id: 'P-0428', status: 'active', invitedAt: '2026-09-10', consentVersion: '2.0', rounds: { 'wave-1': 'none', 'wave-2': 'partial' } },
  ];

  const DONATIONS = [
    { id: 'don_9c1e4b7a2d3f6081a5c7e9b2', participantId: 'P-0418', platform: 'tiktok', roundKey: 'wave-2', records: 2114, payloadBytes: 236804, createdAt: '2026-09-03T18:22:00Z', status: 'accepted', receiptCode: 'DD-K7M2-Q9RX' },
    { id: 'don_1f4a8c2e6b9d0357a2c4e6f8', participantId: 'P-0418', platform: 'youtube', roundKey: 'wave-2', records: 3402, payloadBytes: 401117, createdAt: '2026-09-03T18:41:00Z', status: 'accepted', receiptCode: 'DD-3HQV-8NTB' },
    { id: 'don_7b3d5f9a1c2e4680b1d3f5a7', participantId: 'P-0419', platform: 'tiktok', roundKey: 'wave-2', records: 987, payloadBytes: 110236, createdAt: '2026-09-04T02:15:00Z', status: 'accepted', receiptCode: 'DD-XW4P-2MJ7' },
    { id: 'don_2e6c8a0f4b1d3579c2e4a6b8', participantId: 'P-0422', platform: 'chatgpt', roundKey: 'wave-2', records: 1204, payloadBytes: 121350, createdAt: '2026-09-05T15:03:00Z', status: 'accepted', receiptCode: 'DD-9BRD-5KCN' },
    { id: 'don_5a9e1c3b7d2f4680e1c3a5b7', participantId: 'P-0422', platform: 'tiktok', roundKey: 'wave-2', records: 1533, payloadBytes: 171894, createdAt: '2026-09-05T15:27:00Z', status: 'accepted', receiptCode: 'DD-M6TZ-7QGE' },
    { id: 'don_8d2f4a6c0e3b5791d2f4a6c8', participantId: 'P-0423', platform: 'youtube', roundKey: 'wave-2', records: 5218, payloadBytes: 614352, createdAt: '2026-09-06T21:48:00Z', status: 'accepted', receiptCode: 'DD-R2NF-4HWX' },
    { id: 'don_3c7a9e1b5d0f2468a3c5e7f9', participantId: 'P-0423', platform: 'tiktok', roundKey: 'wave-2', records: 402, payloadBytes: 45109, createdAt: '2026-09-06T22:03:00Z', status: 'accepted', receiptCode: 'DD-7VJK-3PMQ' },
    { id: 'don_6b0d2f4a8c1e3579b4d6f8a0', participantId: 'P-0424', platform: 'tiktok', roundKey: 'wave-2', records: 1760, payloadBytes: 197336, createdAt: '2026-09-08T17:36:00Z', status: 'accepted', receiptCode: 'DD-2QSE-9YRB' },
    { id: 'don_4e8b0c2d6a9f1357e5a7c9d1', participantId: 'P-0424', platform: 'youtube', roundKey: 'wave-2', records: 0, payloadBytes: 0, createdAt: '2026-09-08T17:58:00Z', status: 'failed', receiptCode: null, failureReason: 'checksum_or_length_mismatch' },
    { id: 'don_0f4c6e8a2b5d7913f6b8d0e2', participantId: 'P-0427', platform: 'youtube', roundKey: 'wave-2', records: 2921, payloadBytes: 343188, createdAt: '2026-09-11T19:12:00Z', status: 'accepted', receiptCode: 'DD-H5WT-6DKA' },
    { id: 'don_a1c3e5b7d9f02468c7e9b1d3', participantId: 'P-0427', platform: 'tiktok', roundKey: 'wave-2', records: 1188, payloadBytes: 132511, createdAt: '2026-09-11T19:33:00Z', status: 'accepted', receiptCode: 'DD-NQ8X-2FMV' },
    { id: 'don_b2d4f6a8c0e13579d8f0b2c4', participantId: 'P-0428', platform: 'tiktok', roundKey: 'wave-2', records: 640, payloadBytes: 71802, createdAt: '2026-09-15T00:06:00Z', status: 'uploaded', receiptCode: null },
    { id: 'don_c3e5a7b9d1f24680e9a1c3d5', participantId: 'P-0419', platform: 'youtube', roundKey: 'wave-2', records: 2210, payloadBytes: 262960, createdAt: '2026-09-18T16:47:00Z', status: 'awaiting_upload', receiptCode: null },
    { id: 'don_d4f6b8c0e2a35791f0b2d4e6', participantId: 'P-0421', platform: 'tiktok', roundKey: 'wave-1', records: 1421, payloadBytes: 158660, createdAt: '2026-04-11T20:20:00Z', status: 'deleted', receiptCode: 'DD-6ZKR-8CTP' },
  ];

  const WITHDRAWALS = [
    {
      id: 'wdr_3a5c7e9b1d2f4680a1c3e5b7',
      participantId: 'P-0421',
      requestedAt: '2026-09-08T14:12:00Z',
      deadlineAt: '2026-10-20T23:59:00-07:00',
      status: 'received',
      reason: 'Not provided',
      deletionJob: { id: 'job_del_7f2c', status: 'pending_approval', proposedBy: 'd.reyes', proposedAt: '2026-09-09T17:30:00Z', approvedBy: null, scope: 'wave-1 · 1 accepted donation' },
    },
    {
      id: 'wdr_8b0d2f4a6c1e3579b3d5f7a9',
      participantId: 'P-0409',
      requestedAt: '2026-05-22T19:41:00Z',
      deadlineAt: '2026-07-06T23:59:00-07:00',
      status: 'completed',
      reason: 'Not provided',
      deletionJob: { id: 'job_del_2b9e', status: 'completed', proposedBy: 'd.reyes', proposedAt: '2026-05-26T16:02:00Z', approvedBy: 'p.jamie', approvedAt: '2026-05-27T15:10:00Z', completedAt: '2026-05-27T15:14:00Z', scope: 'wave-1 · 2 accepted donations' },
    },
  ];

  const AUDIT_EVENTS = [
    { at: '2026-09-19T09:00:00Z', action: 'backup.completed', actor: 'system', subject: 'backup_runs/bkp_0919', summary: 'Nightly PostgreSQL backup verified (SSE-KMS).' },
    { at: '2026-09-18T16:47:00Z', action: 'donation.created', actor: 'participant P-0419', subject: 'don_c3e5…c3d5', summary: 'YouTube donation attempt created; staging authorization issued (15 min).' },
    { at: '2026-09-15T00:06:00Z', action: 'donation.uploaded', actor: 'participant P-0428', subject: 'don_b2d4…b2c4', summary: 'Exact bytes staged; awaiting completion verification.' },
    { at: '2026-09-11T19:33:00Z', action: 'donation.accepted', actor: 'participant P-0427', subject: 'don_a1c3…b1d3', summary: 'TikTok payload verified and promoted to the immutable project key. Round wave-2 complete; flat completion eligibility recorded.' },
    { at: '2026-09-10T22:05:00Z', action: 'project.draft.updated', actor: 'admin d.reyes', subject: 'prj_b7c209', summary: 'Draft project “Conversational AI in Everyday Life” consent workflow edited.' },
    { at: '2026-09-09T17:30:00Z', action: 'deletion_job.proposed', actor: 'admin d.reyes', subject: 'job_del_7f2c', summary: 'Withdrawal deletion proposed for P-0421 (wave-1, 1 donation). Awaiting a different owner.' },
    { at: '2026-09-08T17:58:00Z', action: 'donation.verification_failed', actor: 'system', subject: 'don_4e8b…c9d1', summary: 'Checksum/length mismatch; staging object deleted, attempt marked failed.' },
    { at: '2026-09-08T14:12:00Z', action: 'withdrawal.requested', actor: 'participant P-0421', subject: 'wdr_3a5c…e5b7', summary: 'Sessions and links revoked, queued email cancelled, deadline computed (30 business days).' },
    { at: '2026-09-02T18:00:00Z', action: 'participant.provisioned', actor: 'admin d.reyes', subject: 'P-0417', summary: 'Pseudonymous participant created in wave-2; invitation link displayed once.' },
    { at: '2026-09-01T15:00:00Z', action: 'round.opened', actor: 'system', subject: 'rnd_w2', summary: 'Collection round wave-2 opened under release v2.' },
    { at: '2026-05-18T16:20:00Z', action: 'release.published', actor: 'admin p.jamie', subject: 'rel_v2', summary: 'Release v2 published after step-up; material change flagged re-consent.' },
    { at: '2026-03-02T17:04:00Z', action: 'release.published', actor: 'admin p.jamie', subject: 'rel_v1', summary: 'Initial release v1 published.' },
  ];

  const ADMINS = [
    { username: 'p.jamie', displayName: 'Pooriya Jamie', role: 'owner', status: 'active', lastSeen: '2026-09-19T15:40:00Z' },
    { username: 'd.reyes', displayName: 'Daniel Reyes', role: 'manager', status: 'active', lastSeen: '2026-09-19T14:05:00Z' },
    { username: 'l.chen', displayName: 'Lin Chen', role: 'viewer', status: 'active', lastSeen: '2026-09-17T21:12:00Z' },
    { username: 'a.brooks', displayName: 'Avery Brooks', role: 'owner', status: 'active', lastSeen: '2026-09-18T18:30:00Z' },
  ];

  const SYSTEM = {
    status: 'healthy',
    database: { status: 'healthy', latencyMs: 4, detail: 'PostgreSQL 16 · TLS required' },
    storage: { status: 'healthy', provider: 'S3 · SSE-KMS', activePayloads: 11, activePayloadBytes: 2318113, stagingObjects: 2 },
    worker: { status: 'healthy', lastHeartbeat: '2026-09-19T15:58:00Z', queued: 1, running: 0 },
    appVersion: '2026.09.1+demo',
    deploymentProfile: 'participant',
    backup: { status: 'completed', completedAt: '2026-09-19T09:00:00Z' },
  };

  const FEEDBACK = { averageRating: 4.4, ratings: 9, unreviewed: 2 };

  /* ------------------------------------------------------------------ */
  /* Consent (fictional research consent, version 2.0)                   */
  /* ------------------------------------------------------------------ */

  const CONSENT = {
    version: '2.0',
    summary: {
      purpose:
        'Researchers at OASIS Lab are studying how the videos, posts and searches people encounter on everyday apps relate to wellbeing over time.',
      whatYouShare:
        "Only the activity groups approved for this project: when you watched or liked videos, when you searched, public links to that content, and (only if you turn it on) the words you searched for. For ChatGPT: when conversations happened, the messages you wrote and ChatGPT's replies. Video titles, direct messages, profiles and account details are never collected.",
      risks:
        'The main risk is that public links, search words or ChatGPT messages could reveal interests or private matters. You review every outgoing record first, and data is stored pseudonymously under encryption.',
      voluntary:
        'Participation is voluntary. You may stop at any point without penalty. Compensation of USD 20.00 is offered after completing the required donations for a collection round.',
      withdrawal:
        'You can request withdrawal and deletion while your data remain identifiable to the study, in the app or by contacting the coordinator. Deletion is completed within 30 business days.',
    },
    paragraphs: [
      'You are being asked to take part in a research study conducted by OASIS Lab. Please read this document carefully. It explains what the study involves and what happens to the information you choose to donate.',
      'The study asks you to request a copy of your own activity from one or more apps or online services, open that file in the DataDonate application on your own device, and donate only the activity groups you choose. Your original file never leaves your device.',
      "This project may collect: the dates and times of videos you watched or liked, the dates of searches you made, canonical public links to that content, and, only when you switch it on, the words you searched for. For ChatGPT it may collect when each conversation happened, how many messages it has, the messages you wrote and ChatGPT's replies; you can leave out any conversation or message. The application removes every other part of your export before you can even see it.",
      'The study never collects profile or account details, contact information, direct messages, comments, followers, login or device history, purchases, advertising records, conversation titles, or the titles of videos you watched.',
      'Donated records are stored under a pseudonymous participant identifier in encrypted research storage. The research team can decrypt research payloads; this is not end-to-end encryption. Your optional contact email is encrypted separately and is never part of research data.',
      'You may withdraw at any time during the identifiable data-collection period. Withdrawal immediately ends your access and starts a deletion request that is completed within 30 business days. Compensation already earned is not affected.',
      'De-identified research data are retained for 365 days after the collection round closes and are then deleted according to the approved data-management plan.',
      'If you have questions about this study, contact the research coordinator at coordinator@oasislab.example. By continuing you confirm you have read this document, that your questions were answered, and that you agree to take part.',
    ],
    questions: [
      {
        id: 'q1',
        prompt: 'Which of these will the study never collect?',
        options: [
          { id: 'a', label: 'Dates of the videos you watched' },
          { id: 'b', label: 'Public links to videos' },
          { id: 'c', label: 'Your direct messages and account details' },
          { id: 'd', label: 'Dates of your searches' },
        ],
        correct: 'c',
      },
      {
        id: 'q2',
        prompt: 'When can you ask to withdraw?',
        options: [
          { id: 'a', label: 'Only before you upload anything' },
          { id: 'b', label: 'At any time during the identifiable data-collection period' },
          { id: 'c', label: 'Never after you agree to consent' },
        ],
        correct: 'b',
      },
    ],
  };

  /* ------------------------------------------------------------------ */
  /* Vocabularies for synthetic activity                                 */
  /* ------------------------------------------------------------------ */

  const SEARCH_VOCAB = [
    'sourdough starter', 'study playlist', 'bike chain repair', 'marathon training plan', 'houseplant care',
    'budget spreadsheet', 'cast iron seasoning', 'desk stretches', 'weekend hikes near me', 'how to fold a fitted sheet',
    'beginner watercolor', 'meal prep ideas', 'learn spanish daily', 'rain sounds for sleep', 'commuter bike lights',
    'diy bookshelf', 'ramen at home', 'garden tomatoes', 'chess openings', 'how to tie a bowline',
    'jazz piano basics', 'cold brew ratio', 'stargazing tonight', 'trail running shoes', 'indoor herb garden',
    'best budget headphones', 'sewing machine threading', 'home espresso', 'pottery wheel basics', 'yoga for back pain',
    'crossword tips', 'birdwatching beginners', 'sketchbook ideas', 'camping checklist', 'knitting cast on',
    'compost bin', 'fountain pen ink', 'thrift store finds', 'kombucha second ferment', 'origami crane',
  ];

  const YT_TITLES = [
    'How I repotted a monstera without killing it', 'Sourdough for beginners, start to finish', '10-minute mobility routine',
    'Fixing a slipping bike chain', 'Cast iron care in 5 minutes', 'A quiet morning in the workshop', 'Reading vlog: rainy weekend',
    'Trail run: ridge loop at sunrise', 'Home espresso: dialing in a new bag', 'Beginner watercolor skies', 'Weeknight ramen from scratch',
    'Chess: the London System explained', 'Knitting a first scarf', 'Building a simple bookshelf', 'Compost that actually works',
    'Bird ID for absolute beginners', 'Packing for a 3-day hike', 'Piano: ii–V–I in every key', 'Desk setup for small rooms',
    'Camp coffee three ways', 'Sketchbook tour, spring', 'Fountain pens under twenty dollars', 'Tomato pruning basics',
    'Cold brew ratio test', 'Learning Spanish: week 12', 'Kombucha second ferment flavors', 'Origami crane, slow tutorial',
    'Thrift flip: lamp rewire', 'Pottery wheel centering practice', 'Yoga for a stiff back', 'Crossword solving habits',
    'Rain on a tent, 8 hours', 'Budget headphones compared', 'Sewing machine threading guide', 'Stargazing with binoculars',
    'Marathon plan, month one', 'Commuter lights that last', 'Indoor herb garden update', 'Meal prep for a busy week',
    'Study with me, 2 hours',
  ];

  const YT_CHANNELS = [
    'Kitchen Bench', 'Trailhead Notes', 'Quiet Workshop', 'Bench & Bloom', 'The Slow Commute', 'Pocket Physics', 'Paper Garden',
    'Late Shift Piano', 'Field Guide Weekly', 'Studio Sixteen', 'North Loop Cycling', 'Simple Suppers', 'Morning Pages',
    'Deep Focus Radio', 'Sketch Habit', 'Camp Stove Club',
  ];

  const YT_POST_LABELS = ['Community update', 'Poll: next video topic', 'Behind the scenes', 'Thank you for 10k', 'Schedule this week', 'Photo from the trail'];

  const CHAT_TITLES = [
    'Trip packing checklist', 'Explain compound interest', 'Rewrite a thank-you note', 'Plan a week of dinners', 'Debug a spreadsheet formula',
    'Sourdough troubleshooting', 'Study schedule for finals', 'Summarize a long article', 'Names for a book club', 'Convert recipe to metric',
    'Stretching routine for desk work', 'Draft a birthday message', 'Learn basic chess tactics', 'Compare bike commuter bags', 'Gift ideas for a gardener',
    'Explain a form field', 'Outline a short story', 'Fix a leaky faucet steps', 'Plan a rainy day with kids', 'Tips for a first 5K',
    'Houseplant light needs', 'Practice Spanish small talk', 'Explain how yeast works', 'Plan a picnic menu', 'Organize a small closet',
    'Write a polite decline', 'Quick lunch ideas', 'Explain a chess opening', 'Camping checklist for two', 'Compost questions',
  ];

  const PROMPT_TEXT = [
    'Can you make this shorter and friendlier?', 'What should I pack for three days of hiking?', 'Explain this like I am new to it.',
    'Give me three options with pros and cons.', 'Turn this into a checklist.', 'What am I missing here?', 'Make it sound less formal.',
    'Can you check my plan for gaps?', 'Suggest a simple weekly schedule.', 'What is a good beginner approach?',
  ];

  const RESPONSE_TEXT = [
    'Here is a shorter version you can adapt.', 'For three days, focus on layers, water, and a small first-aid kit.',
    'Think of it as a recipe with three steps.', 'Option one is simplest; option three gives the most control.',
    'Here is a checklist you can copy.', 'You might also want a backup plan for weather.', 'This reads more relaxed now.',
    'The plan looks solid; two small gaps are noted below.', 'A simple schedule alternates focus days and rest days.',
    'Start small and increase gradually.',
  ];

  /* ------------------------------------------------------------------ */
  /* Deterministic candidate generation                                  */
  /* ------------------------------------------------------------------ */

  const START = Date.UTC(2025, 9, 1);
  const END = Date.UTC(2026, 8, 10);
  const DAY = 86400000;

  function isoNoMs(ms) {
    return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
  }

  function randomTime(rng) {
    if (rng() < 0.15) return END - rng() * 30 * DAY;
    const span = END - 30 * DAY - START;
    return START + span * Math.pow(rng(), 0.75);
  }

  function pick(rng, list) {
    return list[Math.floor(rng() * list.length)];
  }

  function digits(rng, n) {
    let out = '';
    for (let i = 0; i < n; i += 1) out += Math.floor(rng() * 10);
    return out;
  }

  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  function ytId(rng) {
    let out = '';
    for (let i = 0; i < 11; i += 1) out += B64[Math.floor(rng() * B64.length)];
    return out;
  }

  function generateTikTok(rng) {
    const records = [];
    let seq = 0;
    for (let i = 0; i < 1240; i += 1) {
      records.push({ localId: 'watch_history#' + seq++, category: 'watch_history', timestamp: isoNoMs(randomTime(rng)), fields: { contentRef: 'https://www.tiktokv.com/share/video/7' + digits(rng, 18) + '/' } });
    }
    for (let i = 0; i < 318; i += 1) {
      records.push({ localId: 'likes#' + seq++, category: 'likes', timestamp: isoNoMs(randomTime(rng)), fields: { contentRef: 'https://www.tiktokv.com/share/video/7' + digits(rng, 18) + '/' } });
    }
    for (let i = 0; i < 96; i += 1) {
      records.push({ localId: 'searches#' + seq++, category: 'searches', timestamp: isoNoMs(randomTime(rng)), fields: { searchTerm: pick(rng, SEARCH_VOCAB) } });
    }
    return records;
  }

  function generateYouTube(rng) {
    const records = [];
    let seq = 0;
    for (let i = 0; i < 1860; i += 1) {
      records.push({
        localId: 'watch_history#' + seq++,
        category: 'watch_history',
        timestamp: isoNoMs(randomTime(rng)),
        fields: { contentRef: 'https://www.youtube.com/watch?v=' + ytId(rng), title: pick(rng, YT_TITLES), channelName: pick(rng, YT_CHANNELS) },
      });
    }
    for (let i = 0; i < 140; i += 1) {
      records.push({
        localId: 'post_views#' + seq++,
        category: 'post_views',
        timestamp: isoNoMs(randomTime(rng)),
        fields: { contentRef: 'https://www.youtube.com/post/Ug' + ytId(rng) + ytId(rng).slice(0, 5), title: pick(rng, YT_POST_LABELS) },
      });
    }
    for (let i = 0; i < 210; i += 1) {
      records.push({ localId: 'searches#' + seq++, category: 'searches', timestamp: isoNoMs(randomTime(rng)), fields: { searchTerm: pick(rng, SEARCH_VOCAB) } });
    }
    return records;
  }

  function generateChatGpt(rng) {
    const records = [];
    let seq = 0;
    for (let c = 0; c < 84; c += 1) {
      const conversationId = 'conv-' + String(c + 1).padStart(3, '0');
      const title = pick(rng, CHAT_TITLES);
      const startedAt = randomTime(rng);
      const turns = 2 + Math.floor(rng() * 12);
      const replies = turns - (rng() < 0.12 ? 1 : 0);
      records.push({
        localId: 'conversations#' + seq++,
        category: 'conversations',
        timestamp: isoNoMs(startedAt),
        conversationId,
        conversationTitle: title,
        fields: { messageCount: turns + replies, title },
      });
      let t = startedAt;
      for (let m = 0; m < turns; m += 1) {
        t += 20000 + rng() * 240000;
        records.push({ localId: 'prompts#' + seq++, category: 'prompts', timestamp: isoNoMs(t), conversationId, conversationTitle: title, fields: { text: pick(rng, PROMPT_TEXT) } });
        if (m < replies) {
          t += 4000 + rng() * 20000;
          records.push({ localId: 'responses#' + seq++, category: 'responses', timestamp: isoNoMs(t), conversationId, conversationTitle: title, fields: { text: pick(rng, RESPONSE_TEXT) } });
        }
      }
    }
    return records;
  }

  const cache = new Map();

  /** Stage A output for a source, before the project policy is applied. */
  function generateCandidates(sourceId) {
    if (cache.has(sourceId)) return cache.get(sourceId);
    const rng = E.mulberry32(E.fnv1a('datadonate-demo:' + sourceId));
    const capability = CAPABILITIES[sourceId];
    let records;
    if (sourceId === 'tiktok') records = generateTikTok(rng);
    else if (sourceId === 'youtube') records = generateYouTube(rng);
    else if (sourceId === 'chatgpt') records = generateChatGpt(rng);
    else records = [];
    const extraction = {
      ok: true,
      records,
      categories: capability.categories,
      inventory: E.buildSourceInventory(
        sourceId,
        capability.schemaVersion,
        records,
        capability.categories,
        capability.systemExcluded,
        capability.unsupported,
        [],
      ),
    };
    cache.set(sourceId, extraction);
    return extraction;
  }

  return {
    SOURCES,
    CAPABILITIES,
    PROJECTS,
    RELEASES,
    ROUNDS,
    PARTICIPANTS,
    DONATIONS,
    WITHDRAWALS,
    AUDIT_EVENTS,
    ADMINS,
    SYSTEM,
    FEEDBACK,
    CONSENT,
    generateCandidates,
    sourceById: (id) => SOURCES.find((s) => s.id === id),
  };
})();
