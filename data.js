/*
 * DataDonate demo — synthetic data
 *
 * The visible study name and approved source/field scope mirror the product.
 * All identities, governance examples, dates, donations, receipts and activity
 * records are synthetic: no real participant, account, export or access token
 * is present. Candidate activity is generated deterministically from a
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
      description: 'This study includes watched-video dates and links only',
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
        intro: 'TikTok lets you request a copy of your own activity data. This study includes watched-video dates and links only. In this offline demo, use the synthetic example; do not provide a real export.',
        steps: [
          { title: 'Open TikTok and go to your profile', detail: 'Use the Profile button at the bottom of the TikTok app.' },
          { title: 'Open Settings and privacy', detail: 'Open the menu, then choose Settings and privacy.' },
          { title: 'Find Download your data', detail: 'Open Account, then choose Download your data.' },
          {
            title: 'Choose Your Activity only',
            detail:
              'On Select data to download, choose Your Activity. Leave Likes and Favorites, Comments, Direct Messages, Income + Wallet, Location Reviews, Posts, Profile and Settings, TikTok LIVE, and TikTok Shop unchecked. Search history is not donated to this study even if it is included in the export.',
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
      fileName: 'synthetic-instagram-export.zip',
      archive: {
        kind: 'Original ZIP · JSON',
        entries: ['ads_information/ads_and_topics/videos_watched.json', 'ads_information/ads_and_topics/ads_viewed.json', 'personal_information/profile.json'],
        allowlisted: ['ads_information/ads_and_topics/videos_watched.json'],
        sectionsTotal: 3,
        sectionsRead: ['ads_information/ads_and_topics/videos_watched.json'],
      },
      exportGuide: {
        version: '2026-10-07',
        intro:
          'In the real application, use the standard Available information export and choose Ads and topics only. Only dated watched-video records and their post or Reel links are included. This offline demo uses synthetic records; do not provide a real export.',
        steps: [
          { title: 'Open Accounts Center from Instagram', detail: 'Open your Instagram profile, open the menu, then choose Accounts Center.' },
          { title: 'Start an information export', detail: 'Choose Your information and permissions, Export your information, then Create export.' },
          { title: 'Choose only your Instagram profile', detail: 'Select the Instagram profile you want to use, then choose Export to device.' },
          { title: 'Choose Available information and only Ads and topics', detail: 'Open Customize information, deselect everything, then under Ads information select Ads and topics. Leave other categories unchecked. Do not request Data Logs.' },
          { title: 'Use JSON, All time, and Low media quality', detail: 'Choose All time for the date range, JSON for the format, and Low for media quality.' },
          { title: 'Download the original ZIP', detail: 'Save the ZIP unchanged. In this demo, use the synthetic example instead of opening a real export.' },
        ],
        wait: 'Meta does not promise a fixed preparation time. It may take several days, and ready downloads are available for a limited time.',
      },
    },
    {
      id: 'facebook',
      displayName: 'Facebook',
      letter: 'F',
      description: 'Posts and videos shown in your feed, plus main Facebook searches — not confirmed watches',
      capabilityStatus: 'donation_ready',
      enabled: true,
      exportFormatVerifiedOn: '2026-10-07',
      fileName: 'synthetic-facebook-export.zip',
      archive: {
        kind: 'Original ZIP · JSON',
        entries: ['logged_information/interactions/content_that_has_been_shown_to_you_in_your_feed.json', 'logged_information/search/your_search_history.json', 'logged_information/search/marketplace_search_history.json', 'messages/inbox/synthetic/message.json'],
        allowlisted: ['logged_information/interactions/content_that_has_been_shown_to_you_in_your_feed.json', 'logged_information/search/your_search_history.json'],
        sectionsTotal: 4,
        sectionsRead: ['Feed-shown posts and videos', 'Main Facebook search history'],
      },
      exportGuide: {
        version: '2026-10-07',
        intro:
          'Use standard Available information in the real application. Only posts and videos recorded as shown in the feed, their links and times, and main search words and times are included. Shown does not mean watched. Links can identify private or group posts, and search words can be sensitive. This demo only uses synthetic examples.',
        steps: [
          { title: 'Open Accounts Center from Facebook', detail: 'Open your profile menu, choose Settings and privacy, Settings, then Accounts Center.' },
          { title: 'Start an information export', detail: 'Choose Your information and permissions, Export your information, then Create export.' },
          { title: 'Choose only your Facebook profile', detail: 'Select the Facebook profile and choose Export to device.' },
          { title: 'Choose standard Available information', detail: 'Under Customize information, select Search, Reels, Posts, Interactions, Other logged information, Other activity, and Recommendations where available. Only the two verified feed-shown and main-search files are read by the real adapter.' },
          { title: 'Use JSON, All time, and Low media quality', detail: 'Start the standard Available information export. Do not request Data Logs.' },
          { title: 'Save the original ZIP', detail: 'Keep the ZIP unchanged. If several parts are supplied, keep them and contact the coordinator; multi-part merging is not supported. Use only the synthetic sample in this demo.' },
        ],
        wait: 'Preparation time varies. Download promptly when Meta says the standard export is ready. The demo does not request or download anything.',
      },
    },
    {
      id: 'youtube',
      displayName: 'YouTube',
      letter: 'Y',
      description: 'Watched-video dates, links, titles and channel names; viewed-post dates, links and titles',
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
          'Google Takeout can prepare a ZIP containing YouTube history. This study includes watched-video dates, links, titles and channel names, plus viewed-post dates, links and titles, when available. Searches are not included. In this offline demo, use the synthetic example instead of a real export.',
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
            field('contentRef', 'Link to the post or Reel', 'A canonical Instagram post or Reel link, when supplied.', 'medium', false, true),
          ],
        },
      ],
      systemExcluded: ['Captions, titles and account identifiers', 'Advertiser and brand-partner details', 'Messages, contacts, followers and searches', 'Login, device and location records'],
      unsupported: [],
      presets: [],
    },
    facebook: {
      adapterVersion: '1.0.0',
      schemaVersion: 'meta-facebook-json-v1',
      categories: [
        {
          id: 'posts_shown', label: 'Posts shown in your feed',
          description: 'Posts recorded as shown in the feed; not proof they were read.',
          fields: [
            field('timestamp', 'Activity date and time', 'When Facebook recorded the activity.', 'low', true, true),
            field('contentRef', 'Link to the content', 'The supplied canonical content link; group links need not be public.', 'medium', false, true),
          ],
        },
        {
          id: 'videos_shown', label: 'Videos shown in your feed',
          description: 'Videos recorded as shown in the feed; not confirmed watches or watch duration.',
          fields: [
            field('timestamp', 'Activity date and time', 'When Facebook recorded the activity.', 'low', true, true),
            field('contentRef', 'Link to the content', 'The supplied canonical video or group-post link.', 'medium', false, true),
          ],
        },
        {
          id: 'searches', label: 'Searches you made',
          description: 'Main Facebook searches, not Marketplace searches.',
          fields: [
            field('timestamp', 'Activity date and time', 'When Facebook recorded the search.', 'low', true, true),
            field('searchTerm', 'What you searched for', 'Exact query words; these may contain personal or sensitive information.', 'high', false, false, true),
          ],
        },
      ],
      systemExcluded: ['Private Meta identifiers, author descriptions and search-event titles', 'Messages, contacts and unrelated account data', 'Marketplace searches and unrelated export files', 'Links shown in the feed and aggregate viewing-time summaries', 'Advertising, recommendations, login, device and location information', 'Photos, videos and other media contents'],
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
      slug: 'social-media-data-donation-demo',
      name: 'Social Media Data Donation',
      institution: 'Synthetic offline study demonstration',
      purpose:
        'An offline walkthrough of the current social-media donation flow. All people and activity shown here are synthetic; this page does not enroll anyone or collect research data.',
      governanceStatus: 'not_required',
      governanceReference: 'DEMO ONLY — no research enrollment or approval claim',
      lifecycle: 'active',
      visibility: 'unlisted',
      timezone: 'America/Los_Angeles',
      activeReleaseId: 'rel_v4',
      participantReviewMode: 'record_exclusions_only',
      coordinatorEmail: 'coordinator@demo.invalid',
      estimatedMinutes: 20,
      donationsCloseAt: '2026-12-15T23:59:00-08:00',
      participantAccessEndsAt: '2027-01-15T23:59:00-08:00',
      communicationMode: 'platform_email',
      compensation: { mode: 'none', amountCents: 0, currency: 'USD' },
      retention: { anchor: 'round_close', days: 365 },
      deletion: { slaDays: 30, slaUnit: 'business_days' },
      createdAt: '2026-01-14T18:12:00Z',
      updatedAt: '2026-10-07T19:00:00Z',
    },
    {
      id: 'prj_b7c209',
      slug: 'assistant-diaries-2026',
      name: 'Conversational AI in Everyday Life',
      institution: 'Synthetic offline study demonstration',
      purpose: 'A diary-style study of how people use AI assistants for everyday tasks.',
      governanceStatus: 'pending',
      governanceReference: 'DEMO-IRB-2026-077',
      lifecycle: 'draft',
      visibility: 'unlisted',
      timezone: 'America/Los_Angeles',
      activeReleaseId: null,
      coordinatorEmail: 'diaries@demo.invalid',
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
      required: false,
      categories: [
        { id: 'watch_history', enabled: true, fields: [fieldPolicy('timestamp', 'mandatory'), fieldPolicy('contentRef', 'mandatory', true)] },
        { id: 'likes', enabled: false, fields: [fieldPolicy('timestamp', 'prohibited'), fieldPolicy('contentRef', 'prohibited')] },
        { id: 'searches', enabled: false, fields: [fieldPolicy('timestamp', 'prohibited'), fieldPolicy('searchTerm', 'prohibited')] },
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
            fieldPolicy('title', 'mandatory', true),
            fieldPolicy('channelName', 'mandatory', true),
            fieldPolicy('contentRef', 'mandatory', true),
          ],
        },
        { id: 'post_views', enabled: true, fields: [fieldPolicy('timestamp', 'mandatory'), fieldPolicy('contentRef', 'mandatory', true), fieldPolicy('title', 'mandatory', true)] },
        { id: 'searches', enabled: false, fields: [fieldPolicy('timestamp', 'prohibited'), fieldPolicy('searchTerm', 'prohibited')] },
      ],
    },
    { sourceId: 'chatgpt', mode: 'disabled', required: false, categories: [] },
    { sourceId: 'instagram', mode: 'disabled', required: false, categories: [] },
    { sourceId: 'facebook', mode: 'disabled', required: false, categories: [] },
    { sourceId: 'twitter', mode: 'disabled', required: false, categories: [] },
    { sourceId: 'reddit', mode: 'disabled', required: false, categories: [] },
  ];

  const V1_SOURCE_POLICIES = JSON.parse(JSON.stringify(V2_SOURCE_POLICIES));
  const V3_SOURCE_POLICIES = V2_SOURCE_POLICIES.map((policy) => {
    if (!['instagram', 'facebook'].includes(policy.sourceId)) return JSON.parse(JSON.stringify(policy));
    const definitions = policy.sourceId === 'instagram'
      ? [{ id: 'videos_watched', fields: ['timestamp', 'contentRef'] }]
      : [
          { id: 'posts_shown', fields: ['timestamp', 'contentRef'] },
          { id: 'videos_shown', fields: ['timestamp', 'contentRef'] },
          { id: 'searches', fields: ['timestamp', 'searchTerm'] },
        ];
    return { sourceId: policy.sourceId, mode: 'donation', required: false,
      categories: definitions.map((category) => ({ id: category.id, enabled: true,
        fields: category.fields.map((id) => fieldPolicy(id, 'mandatory', true)) })) };
  });

  // Requirements belong to Round 2, not to the project-wide source policies.
  const V4_SOURCE_POLICIES = JSON.parse(JSON.stringify(V3_SOURCE_POLICIES));

  // Keep the earlier published notice intact in the release history.
  const V3_PARTICIPANT_SCOPE_NOTICE = 'Demo of the current study scope: TikTok and YouTube are required for Round 2; Instagram and Facebook are optional. All approved available fields and all dates are included. Remove individual records before explicitly confirming. Instagram includes watched-video dates and links. Facebook includes dates and links for posts/videos shown in the feed, plus main search dates and exact search words. Shown in the feed does not mean watched or read. Group links and search words may reveal sensitive information. Missing values remain absent; no data are inferred. Participation is unpaid. This demo generates only synthetic data locally and sends nothing.';
  const PARTICIPANT_SCOPE_NOTICE = V3_PARTICIPANT_SCOPE_NOTICE.replace(
    'TikTok and YouTube are required for Round 2; Instagram and Facebook are optional.',
    'TikTok, YouTube, Instagram and Facebook are all required for Round 2.',
  );

  const RELEASES = [
    {
      id: 'rel_v1',
      projectId: 'prj_a4f1e2',
      version: 1,
      status: 'superseded',
      publishedAt: '2026-03-02T17:04:00Z',
      publishedBy: 'demo.owner',
      supersedesReleaseId: null,
      requiresReconsent: false,
      consentVersion: '1.0',
      sourcePolicies: V1_SOURCE_POLICIES,
      participantReviewMode: 'record_exclusions_only',
      material: {
        consentVersion: '1.0',
        compensation: { mode: 'none', amountCents: 0, currency: 'USD' },
        retention: { anchor: 'round_close', days: 365 },
        deletion: { slaDays: 30, slaUnit: 'business_days' },
      },
      changes: [{ section: 'Initial release', summary: 'First published configuration.', material: true }],
    },
    {
      id: 'rel_v2',
      projectId: 'prj_a4f1e2',
      version: 2,
      status: 'superseded',
      publishedAt: '2026-05-18T16:20:00Z',
      publishedBy: 'demo.owner',
      supersedesReleaseId: 'rel_v1',
      requiresReconsent: true,
      consentVersion: '2.0',
      sourcePolicies: V2_SOURCE_POLICIES,
      participantReviewMode: 'record_exclusions_only',
      material: {
        consentVersion: '2.0',
        compensation: { mode: 'none', amountCents: 0, currency: 'USD' },
        retention: { anchor: 'round_close', days: 365 },
        deletion: { slaDays: 30, slaUnit: 'business_days' },
      },
      changes: [
        { section: 'Sources & data policy', summary: 'TikTok watch dates/links and YouTube watch/post dates with approved available labels and links.', material: true },
        { section: 'Participant review', summary: 'All dates included. Individual records may be removed; no field, category, or bulk filters.', material: false },
        { section: 'Consent', summary: 'Synthetic consent example for the unpaid donation workflow.', material: true },
        { section: 'Participant guides', summary: 'TikTok guide re-checked against current app menus.', material: false },
      ],
    },
    {
      id: 'rel_v3', projectId: 'prj_a4f1e2', version: 3, status: 'superseded',
      publishedAt: '2026-10-07T18:00:00Z', publishedBy: 'demo.owner',
      supersedesReleaseId: 'rel_v2', requiresReconsent: true, consentVersion: '3.0-demo',
      participantReviewMode: 'record_exclusions_only', participantDataScopeNotice: V3_PARTICIPANT_SCOPE_NOTICE,
      sourcePolicies: V3_SOURCE_POLICIES,
      material: { consentVersion: '3.0-demo', compensation: { mode: 'none', amountCents: 0, currency: 'USD' }, retention: { anchor: 'round_close', days: 365 }, deletion: { slaDays: 30, slaUnit: 'business_days' } },
      changes: [
        { section: 'Optional sources', summary: 'Instagram watched-video dates/links and Facebook feed-shown dates/links plus main search dates/words added to the same Round 2.', material: true },
        { section: 'Privacy disclosure', summary: 'Facebook shown-in-feed is not watching. Search words and supplied group links can be sensitive.', material: true },
        { section: 'Preserved requirements', summary: 'TikTok and YouTube remain required. Earlier accepted donations are preserved; optional Meta sources do not create a new round.', material: false },
      ],
    },
    {
      id: 'rel_v4', projectId: 'prj_a4f1e2', version: 4, status: 'active',
      publishedAt: '2026-10-07T19:00:00Z', publishedBy: 'demo.owner',
      supersedesReleaseId: 'rel_v3', requiresReconsent: true, consentVersion: '4.0-demo',
      participantReviewMode: 'record_exclusions_only', participantDataScopeNotice: PARTICIPANT_SCOPE_NOTICE,
      sourcePolicies: V4_SOURCE_POLICIES,
      material: { consentVersion: '4.0-demo', compensation: { mode: 'none', amountCents: 0, currency: 'USD' }, retention: { anchor: 'round_close', days: 365 }, deletion: { slaDays: 30, slaUnit: 'business_days' } },
      changes: [
        { section: 'Required sources', summary: 'TikTok, YouTube, Instagram and Facebook are all required in the existing Round 2.', material: true },
        { section: 'Preserved history', summary: 'Earlier releases, consent and accepted donations stay unchanged. Earlier-round requirements are preserved.', material: false },
      ],
    },
  ];

  const ROUNDS = [
    {
      id: 'rnd_w1',
      roundKey: 'initial-collection',
      name: 'Initial collection · synthetic history',
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
      roundKey: 'data-donation-round-2',
      name: 'Round 2',
      projectReleaseId: 'rel_v4',
      status: 'active',
      startsAt: '2026-09-01',
      donationsCloseAt: '2026-12-15',
      participantAccessEndsAt: '2027-01-15',
      requiredSourceIds: ['tiktok', 'youtube', 'instagram', 'facebook'],
      eligibilityMode: 'all_active_participants',
      completed: 0,
      partial: 7,
      accepted: 11,
    },
  ];

  /* ------------------------------------------------------------------ */
  /* Participants, donations, withdrawals, audit                         */
  /* ------------------------------------------------------------------ */

  const PARTICIPANTS = [
    { id: 'P-0417', status: 'active', invitedAt: '2026-03-02', consentVersion: '1.0', consentReleaseId: 'rel_v1', rounds: { 'initial-collection': 'complete', 'data-donation-round-2': 'none' }, contact: 'not collected in demo', note: 'Synthetic tour participant' },
    { id: 'P-0418', status: 'active', invitedAt: '2026-09-02', consentVersion: '3.0-demo', consentReleaseId: 'rel_v3', rounds: { 'initial-collection': 'complete', 'data-donation-round-2': 'partial' } },
    { id: 'P-0419', status: 'active', invitedAt: '2026-09-02', consentVersion: '2.0', consentReleaseId: 'rel_v2', rounds: { 'initial-collection': 'complete', 'data-donation-round-2': 'partial' } },
    { id: 'P-0420', status: 'invited', invitedAt: '2026-09-03', consentVersion: null, consentReleaseId: null, rounds: { 'initial-collection': 'none', 'data-donation-round-2': 'none' } },
    { id: 'P-0421', status: 'withdrawn', invitedAt: '2026-03-04', consentVersion: '1.0', consentReleaseId: 'rel_v1', rounds: { 'initial-collection': 'complete', 'data-donation-round-2': 'none' } },
    { id: 'P-0422', status: 'active', invitedAt: '2026-03-04', consentVersion: '3.0-demo', consentReleaseId: 'rel_v3', rounds: { 'initial-collection': 'partial', 'data-donation-round-2': 'partial' } },
    { id: 'P-0423', status: 'active', invitedAt: '2026-03-05', consentVersion: '3.0-demo', consentReleaseId: 'rel_v3', rounds: { 'initial-collection': 'complete', 'data-donation-round-2': 'partial' } },
    { id: 'P-0424', status: 'active', invitedAt: '2026-09-04', consentVersion: '2.0', consentReleaseId: 'rel_v2', rounds: { 'initial-collection': 'none', 'data-donation-round-2': 'partial' } },
    { id: 'P-0425', status: 'invited', invitedAt: '2026-09-08', consentVersion: null, consentReleaseId: null, rounds: { 'initial-collection': 'none', 'data-donation-round-2': 'none' } },
    { id: 'P-0426', status: 'active', invitedAt: '2026-03-06', consentVersion: '1.0', consentReleaseId: 'rel_v1', rounds: { 'initial-collection': 'complete', 'data-donation-round-2': 'none' }, note: 'Synthetic re-consent example' },
    { id: 'P-0427', status: 'active', invitedAt: '2026-09-09', consentVersion: '2.0', consentReleaseId: 'rel_v2', rounds: { 'initial-collection': 'none', 'data-donation-round-2': 'partial' } },
    { id: 'P-0428', status: 'active', invitedAt: '2026-09-10', consentVersion: '2.0', consentReleaseId: 'rel_v2', rounds: { 'initial-collection': 'none', 'data-donation-round-2': 'partial' } },
  ];

  const DONATIONS = [
    { id: 'don_9c1e4b7a2d3f6081a5c7e9b2', participantId: 'P-0418', platform: 'tiktok', roundKey: 'data-donation-round-2', records: 2114, payloadBytes: 236804, createdAt: '2026-09-03T18:22:00Z', status: 'accepted', receiptCode: 'DD-K7M2-Q9RX' },
    { id: 'don_1f4a8c2e6b9d0357a2c4e6f8', participantId: 'P-0418', platform: 'youtube', roundKey: 'data-donation-round-2', records: 3402, payloadBytes: 401117, createdAt: '2026-09-03T18:41:00Z', status: 'accepted', receiptCode: 'DD-3HQV-8NTB' },
    { id: 'don_7b3d5f9a1c2e4680b1d3f5a7', participantId: 'P-0419', platform: 'tiktok', roundKey: 'data-donation-round-2', records: 987, payloadBytes: 110236, createdAt: '2026-09-04T02:15:00Z', status: 'accepted', receiptCode: 'DD-XW4P-2MJ7' },
    { id: 'don_2e6c8a0f4b1d3579c2e4a6b8', participantId: 'P-0422', platform: 'facebook', roundKey: 'data-donation-round-2', records: 192, payloadBytes: 30150, createdAt: '2026-10-07T18:20:00Z', status: 'accepted', receiptCode: 'DD-9BRD-5KCN' },
    { id: 'don_5a9e1c3b7d2f4680e1c3a5b7', participantId: 'P-0422', platform: 'tiktok', roundKey: 'data-donation-round-2', records: 1533, payloadBytes: 171894, createdAt: '2026-09-05T15:27:00Z', status: 'accepted', receiptCode: 'DD-M6TZ-7QGE' },
    { id: 'don_8d2f4a6c0e3b5791d2f4a6c8', participantId: 'P-0423', platform: 'youtube', roundKey: 'data-donation-round-2', records: 5218, payloadBytes: 614352, createdAt: '2026-09-06T21:48:00Z', status: 'accepted', receiptCode: 'DD-R2NF-4HWX' },
    { id: 'don_3c7a9e1b5d0f2468a3c5e7f9', participantId: 'P-0423', platform: 'tiktok', roundKey: 'data-donation-round-2', records: 402, payloadBytes: 45109, createdAt: '2026-09-06T22:03:00Z', status: 'accepted', receiptCode: 'DD-7VJK-3PMQ' },
    { id: 'don_6b0d2f4a8c1e3579b4d6f8a0', participantId: 'P-0424', platform: 'tiktok', roundKey: 'data-donation-round-2', records: 1760, payloadBytes: 197336, createdAt: '2026-09-08T17:36:00Z', status: 'accepted', receiptCode: 'DD-2QSE-9YRB' },
    { id: 'don_4e8b0c2d6a9f1357e5a7c9d1', participantId: 'P-0424', platform: 'youtube', roundKey: 'data-donation-round-2', records: 0, payloadBytes: 0, createdAt: '2026-09-08T17:58:00Z', status: 'failed', receiptCode: null, failureReason: 'checksum_or_length_mismatch' },
    { id: 'don_0f4c6e8a2b5d7913f6b8d0e2', participantId: 'P-0427', platform: 'youtube', roundKey: 'data-donation-round-2', records: 2921, payloadBytes: 343188, createdAt: '2026-09-11T19:12:00Z', status: 'accepted', receiptCode: 'DD-H5WT-6DKA' },
    { id: 'don_a1c3e5b7d9f02468c7e9b1d3', participantId: 'P-0427', platform: 'tiktok', roundKey: 'data-donation-round-2', records: 1188, payloadBytes: 132511, createdAt: '2026-09-11T19:33:00Z', status: 'accepted', receiptCode: 'DD-NQ8X-2FMV' },
    { id: 'don_b2d4f6a8c0e13579d8f0b2c4', participantId: 'P-0428', platform: 'tiktok', roundKey: 'data-donation-round-2', records: 640, payloadBytes: 71802, createdAt: '2026-09-15T00:06:00Z', status: 'uploaded', receiptCode: null },
    { id: 'don_c3e5a7b9d1f24680e9a1c3d5', participantId: 'P-0419', platform: 'youtube', roundKey: 'data-donation-round-2', records: 2210, payloadBytes: 262960, createdAt: '2026-09-18T16:47:00Z', status: 'awaiting_upload', receiptCode: null },
    { id: 'don_d4f6b8c0e2a35791f0b2d4e6', participantId: 'P-0421', platform: 'tiktok', roundKey: 'initial-collection', records: 1421, payloadBytes: 158660, createdAt: '2026-04-11T20:20:00Z', status: 'deleted', receiptCode: 'DD-6ZKR-8CTP' },
    { id: 'don_demo_instagram_001', participantId: 'P-0418', platform: 'instagram', roundKey: 'data-donation-round-2', records: 480, payloadBytes: 70800, createdAt: '2026-10-07T18:30:00Z', status: 'accepted', receiptCode: 'DD-DM7Q-7JG2' },
    { id: 'don_demo_initial_tiktok', participantId: 'P-0417', platform: 'tiktok', roundKey: 'initial-collection', records: 812, payloadBytes: 92480, createdAt: '2026-04-10T18:00:00Z', status: 'accepted', receiptCode: 'DD-4DMQ-K7TJ' },
    { id: 'don_demo_initial_youtube', participantId: 'P-0417', platform: 'youtube', roundKey: 'initial-collection', records: 1365, payloadBytes: 183960, createdAt: '2026-04-10T18:20:00Z', status: 'accepted', receiptCode: 'DD-8DMQ-P4YT' },
  ];

  const WITHDRAWALS = [
    {
      id: 'wdr_3a5c7e9b1d2f4680a1c3e5b7',
      participantId: 'P-0421',
      requestedAt: '2026-09-08T14:12:00Z',
      deadlineAt: '2026-10-20T23:59:00-07:00',
      status: 'received',
      reason: 'Not provided',
      deletionJob: { id: 'job_del_7f2c', status: 'pending_approval', proposedBy: 'demo.manager', proposedAt: '2026-09-09T17:30:00Z', approvedBy: null, scope: 'initial-collection · 1 synthetic donation' },
    },
    {
      id: 'wdr_8b0d2f4a6c1e3579b3d5f7a9',
      participantId: 'P-0409',
      requestedAt: '2026-05-22T19:41:00Z',
      deadlineAt: '2026-07-06T23:59:00-07:00',
      status: 'completed',
      reason: 'Not provided',
      deletionJob: { id: 'job_del_2b9e', status: 'completed', proposedBy: 'demo.manager', proposedAt: '2026-05-26T16:02:00Z', approvedBy: 'demo.owner', approvedAt: '2026-05-27T15:10:00Z', completedAt: '2026-05-27T15:14:00Z', scope: 'initial-collection · 2 synthetic donations' },
    },
  ];

  const AUDIT_EVENTS = [
    { at: '2026-10-07T19:00:00Z', action: 'release.published', actor: 'admin demo.owner', subject: 'rel_v4', summary: 'Simulated release v4: all four sources required in Round 2; earlier releases, consent, donations and earlier-round requirements preserved.' },
    { at: '2026-10-07T18:00:00Z', action: 'release.published', actor: 'admin demo.owner', subject: 'rel_v3', summary: 'Simulated release v3: optional Instagram/Facebook added within Round 2; TikTok/YouTube requirements and earlier donations preserved.' },
    { at: '2026-09-19T09:00:00Z', action: 'backup.completed', actor: 'system', subject: 'backup_runs/bkp_0919', summary: 'Nightly PostgreSQL backup verified (SSE-KMS).' },
    { at: '2026-09-18T16:47:00Z', action: 'donation.created', actor: 'participant P-0419', subject: 'don_c3e5…c3d5', summary: 'YouTube donation attempt created; staging authorization issued (15 min).' },
    { at: '2026-09-15T00:06:00Z', action: 'donation.uploaded', actor: 'participant P-0428', subject: 'don_b2d4…b2c4', summary: 'Exact bytes staged; awaiting completion verification.' },
    { at: '2026-09-11T19:33:00Z', action: 'donation.accepted', actor: 'participant P-0427', subject: 'don_a1c3…b1d3', summary: 'Synthetic TikTok payload accepted in the simulation. Round 2 complete; no payment.' },
    { at: '2026-09-10T22:05:00Z', action: 'project.draft.updated', actor: 'admin demo.manager', subject: 'prj_b7c209', summary: 'Synthetic draft project consent workflow edited.' },
    { at: '2026-09-09T17:30:00Z', action: 'deletion_job.proposed', actor: 'admin demo.manager', subject: 'job_del_7f2c', summary: 'Simulated deletion proposed for P-0421 (initial-collection, 1 donation). Awaiting a different owner.' },
    { at: '2026-09-08T17:58:00Z', action: 'donation.verification_failed', actor: 'system', subject: 'don_4e8b…c9d1', summary: 'Checksum/length mismatch; staging object deleted, attempt marked failed.' },
    { at: '2026-09-08T14:12:00Z', action: 'withdrawal.requested', actor: 'participant P-0421', subject: 'wdr_3a5c…e5b7', summary: 'Sessions and links revoked, queued email cancelled, deadline computed (30 business days).' },
    { at: '2026-09-02T18:00:00Z', action: 'participant.provisioned', actor: 'admin demo.manager', subject: 'P-0417', summary: 'Synthetic participant added to Round 2; no real invitation sent.' },
    { at: '2026-09-01T15:00:00Z', action: 'round.opened', actor: 'system', subject: 'rnd_w2', summary: 'Synthetic Round 2 opened under release v2.' },
    { at: '2026-05-18T16:20:00Z', action: 'release.published', actor: 'admin demo.owner', subject: 'rel_v2', summary: 'Synthetic release v2 published in the simulation.' },
    { at: '2026-03-02T17:04:00Z', action: 'release.published', actor: 'admin demo.owner', subject: 'rel_v1', summary: 'Synthetic initial release v1 published.' },
  ];

  const ADMINS = [
    { username: 'demo.owner', displayName: 'Demo Owner', role: 'owner', status: 'active', lastSeen: '2026-10-07T18:40:00Z' },
    { username: 'demo.manager', displayName: 'Demo Manager', role: 'manager', status: 'active', lastSeen: '2026-10-07T18:05:00Z' },
    { username: 'demo.viewer', displayName: 'Demo Viewer', role: 'viewer', status: 'active', lastSeen: '2026-10-07T17:12:00Z' },
    { username: 'demo.second-owner', displayName: 'Second Demo Owner', role: 'owner', status: 'active', lastSeen: '2026-10-07T17:30:00Z' },
  ];

  const SYSTEM = {
    status: 'healthy',
    database: { status: 'healthy', latencyMs: 4, detail: 'PostgreSQL 16 · TLS required' },
    storage: { status: 'healthy', provider: 'S3 · SSE-KMS', activePayloads: 11, activePayloadBytes: 2318113, stagingObjects: 2 },
    worker: { status: 'healthy', lastHeartbeat: '2026-09-19T15:58:00Z', queued: 1, running: 0 },
    appVersion: '2026.10.3+offline-demo',
    deploymentProfile: 'offline_demo',
    backup: { status: 'completed', completedAt: '2026-09-19T09:00:00Z' },
  };

  const FEEDBACK = { averageRating: 4.4, ratings: 9, unreviewed: 2 };

  /* ------------------------------------------------------------------ */
  /* Demonstration acknowledgment — not a real study consent document   */
  /* ------------------------------------------------------------------ */

  const CONSENT = {
    version: '4.0-demo',
    requireScroll: true,
    requireSignature: true,
    summary: {
      purpose:
        'Try a local-only demonstration of the Social Media Data Donation workflow. The study name and approved data scope mirror the application, but this tour does not enroll you in research. All activity and participant examples are fictional.',
      whatYouShare:
        'TikTok watched-video dates and links; YouTube watched-video dates, links, titles and channel names, plus viewed-post dates, links and titles. Instagram includes watched-video dates and links. Facebook includes feed-shown post/video dates and links, and main-search dates and exact query words. Only available values are included.',
      risks:
        'In real exports, links and search words can reveal sensitive interests. Facebook links may identify group or private content; “shown in feed” does not prove it was read or watched. Here, every example is synthetic and no payload is sent to a server.',
      voluntary:
        'This is an unpaid demo. TikTok, YouTube, Instagram and Facebook are all required in the simulated Round 2. You can leave the tour at any time. Use a made-up name for the demonstration acknowledgment.',
      withdrawal:
        'Withdrawal and deletion screens only illustrate the workflow. They do not submit requests or delete real study records. Restarting the tour clears its temporary page state; displayed timelines are synthetic examples, not a service promise.',
    },
    paragraphs: [
      'This is a fictional acknowledgment for an offline visual tour, not a legal consent form or research enrollment. Do not enter your real name, contact information, participant link, or export files. Use only the synthetic examples supplied by the demo.',
      'The simulated project is Social Media Data Donation, release v4, Round 2. TikTok, YouTube, Instagram and Facebook are all required for completion of that round. Earlier-round donations remain visible as history and do not complete the current round.',
      'TikTok includes watched-video dates and links. YouTube includes watched-video dates, links, titles and channel names, plus viewed-post dates, links and titles. TikTok likes and searches, YouTube searches, and ChatGPT conversations are not part of this study.',
      'Instagram includes dates and post or Reel links from its watched-video history. Facebook includes dates and links for posts and videos recorded as shown in the feed, plus dates and exact query words from main Facebook searches. Marketplace searches, author descriptions, private account identifiers, messages, and unrelated export sections are not included.',
      'Shown in a Facebook feed is not a measurement of reading or watching. Links can identify group or private posts and search queries can contain sensitive words. Review the exact records before confirming. A link is not a promise that content is publicly accessible.',
      'All available dates and all approved available fields are included. Missing values remain absent; the application does not infer them. You may remove or restore individual records. Date, category, field, and bulk-removal controls are not offered for this study. The date range shown in a preview describes the supplied sample, not completeness of platform history.',
      'The real application processes an original export locally and prepares a minimized payload for donation. This offline tour does not open real exports, contact platforms, upload payloads, or retain activity after a page reset. The bytes, hashes, receipts, storage panels, and deletion timelines shown here are simulated or calculated from synthetic data.',
      'The demonstrated study is unpaid. Scrolling to the end and typing a made-up name only unlock the local tour. There are no comprehension questions. Continuing does not create an account, consent record, payment entitlement, or request in the real study.',
    ],
    questions: [],
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
    records[0].timestamp = '2018-08-02T12:00:00Z';
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
    records[0].timestamp = '2012-06-15T12:00:00Z';
    // A supplied history entry can lack metadata. Do not invent it.
    delete records[1].fields.title;
    delete records[1].fields.channelName;
    delete records[2].fields.contentRef;
    return records;
  }

  function generateInstagram(rng) {
    const records = [];
    for (let i = 0; i < 480; i += 1) {
      const fields = i === 479 ? {} : {
        contentRef: 'https://www.instagram.com/' + (i % 3 === 0 ? 'p/' : 'reel/') + 'SYNTHETIC_' + String(i + 1).padStart(4, '0') + '/',
      };
      records.push({ localId: 'videos_watched#' + i, category: 'videos_watched', timestamp: isoNoMs(randomTime(rng)), fields });
    }
    records[0].timestamp = '2014-06-15T12:00:00Z';
    return records;
  }

  function generateFacebook(rng) {
    const records = [];
    for (let i = 0; i < 72; i += 1) {
      const id = String(900000000000000 + i);
      const contentRef = i % 3 === 0
        ? 'https://www.facebook.com/groups/synthetic-demo-group/posts/' + id
        : i % 3 === 1
          ? 'https://www.facebook.com/permalink.php?story_fbid=' + id + '&id=900000000099999'
          : 'https://www.facebook.com/synthetic.demo/posts/pfbidSynthetic' + String(i + 1).padStart(4, '0');
      records.push({ localId: 'posts_shown#' + i, category: 'posts_shown', timestamp: isoNoMs(randomTime(rng)), fields: { contentRef } });
    }
    for (let i = 0; i < 24; i += 1) {
      records.push({ localId: 'videos_shown#' + i, category: 'videos_shown', timestamp: isoNoMs(randomTime(rng)), fields: {
        contentRef: 'https://www.facebook.com/reel/' + String(900000000010000 + i),
      } });
    }
    for (let i = 0; i < 96; i += 1) {
      records.push({ localId: 'searches#' + i, category: 'searches', timestamp: isoNoMs(randomTime(rng)), fields: {
        searchTerm: i === 0 ? 'synthetic community garden' : i === 1 ? 'ceramics café classes' : pick(rng, SEARCH_VOCAB),
      } });
    }
    records[0].timestamp = '2012-06-15T12:00:00Z';
    delete records[71].fields.contentRef;
    // Two deliberate synthetic duplicates make the demo's cleanup count testable.
    for (let i = 0; i < 2; i += 1) {
      const original = records[96 + i];
      records.push(Object.assign({}, original, { localId: 'synthetic-duplicate#' + i, fields: Object.assign({}, original.fields) }));
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
    if (!capability) throw new Error('No synthetic example exists for this source.');
    let records;
    if (sourceId === 'tiktok') records = generateTikTok(rng);
    else if (sourceId === 'youtube') records = generateYouTube(rng);
    else if (sourceId === 'instagram') records = generateInstagram(rng);
    else if (sourceId === 'facebook') records = generateFacebook(rng);
    else if (sourceId === 'chatgpt') records = generateChatGpt(rng);
    else records = [];
    const warnings = [];
    if (sourceId === 'facebook') {
      const seen = new Set();
      let duplicateCount = 0;
      records = records.filter((record) => {
        const identity = E.canonicalJson([record.category, record.timestamp, record.fields]);
        if (seen.has(identity)) { duplicateCount += 1; return false; }
        seen.add(identity);
        return true;
      });
      if (duplicateCount) warnings.push({
        code: 'duplicate_activity_entry', categoryId: 'searches', count: duplicateCount,
        message: 'Exact duplicate entries were removed from the synthetic search sample.',
      });
    }
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
        warnings,
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
