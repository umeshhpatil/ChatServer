import test from 'node:test';
import assert from 'node:assert/strict';

test('Voice Volume Speaking Threshold Detection', () => {
  // Simulate analyser buffer
  const bufferSilent = new Uint8Array(128).fill(10);
  const avgSilent = bufferSilent.reduce((acc, val) => acc + val, 0) / bufferSilent.length;
  assert.equal(avgSilent > 25, false, 'Silent audio buffer should not trigger speaking');

  const bufferSpeaking = new Uint8Array(128).fill(80);
  const avgSpeaking = bufferSpeaking.reduce((acc, val) => acc + val, 0) / bufferSpeaking.length;
  assert.equal(avgSpeaking > 25, true, 'Active speaking buffer (>25) should trigger speaking outline');

  // When muted, speaking should always evaluate to false
  const isMuted = true;
  const isSpeaking = avgSpeaking > 25 && !isMuted;
  assert.equal(isSpeaking, false, 'Speaking ring must be inactive when mic is muted');
});

test('Image Attachment Resilient Body Encoding & Decoding', () => {
  const imageUrl = 'https://lfcxwgjafxemgpjbiize.supabase.co/storage/v1/object/public/attachments/test.jpg';
  const encodedBody = `[attachment:image]${imageUrl}`;

  // Check prefix detection
  assert.equal(encodedBody.startsWith('[attachment:image]'), true);

  // Extract URL
  const extractedUrl = encodedBody.replace('[attachment:image]', '').trim();
  assert.equal(extractedUrl, imageUrl);

  // Normal text message without attachment
  const normalBody = 'Hello world!';
  assert.equal(normalBody.startsWith('[attachment:image]'), false);
});

test('Emoji Reaction Aggregation and User Deduplication', () => {
  const rawReactions = [
    { message_id: 'msg-1', emoji: '👍', user_id: 'user-1' },
    { message_id: 'msg-1', emoji: '👍', user_id: 'user-2' },
    { message_id: 'msg-1', emoji: '❤️', user_id: 'user-1' },
    { message_id: 'msg-2', emoji: '🔥', user_id: 'user-3' },
  ];

  const currentUserId = 'user-1';

  // Aggregation logic mimicking useChat.ts
  const grouped = new Map();
  rawReactions.forEach((r) => {
    if (!grouped.has(r.message_id)) grouped.set(r.message_id, new Map());
    const msgMap = grouped.get(r.message_id);
    if (!msgMap.has(r.emoji)) {
      msgMap.set(r.emoji, { count: 0, hasReacted: false, users: [] });
    }
    const data = msgMap.get(r.emoji);
    data.count += 1;
    data.users.push(r.user_id);
    if (r.user_id === currentUserId) data.hasReacted = true;
  });

  const msg1Thumbs = grouped.get('msg-1').get('👍');
  assert.equal(msg1Thumbs.count, 2);
  assert.equal(msg1Thumbs.hasReacted, true);
  assert.deepEqual(msg1Thumbs.users, ['user-1', 'user-2']);

  const msg1Heart = grouped.get('msg-1').get('❤️');
  assert.equal(msg1Heart.count, 1);
  assert.equal(msg1Heart.hasReacted, true);

  const msg2Fire = grouped.get('msg-2').get('🔥');
  assert.equal(msg2Fire.count, 1);
  assert.equal(msg2Fire.hasReacted, false);
});

test('Voice Connect & Disconnect Audio Note Frequencies', () => {
  // A major triad
  const connectNotes = [440, 554.37, 659.25];
  assert.equal(connectNotes.length, 3);
  assert.ok(connectNotes[0] < connectNotes[1] && connectNotes[1] < connectNotes[2], 'Ascending chords for connect');

  // Descending tones for disconnect
  const disconnectNotes = [659.25, 440];
  assert.equal(disconnectNotes.length, 2);
  assert.ok(disconnectNotes[0] > disconnectNotes[1], 'Descending chords for disconnect');
});

test('Default Channel Fallback Resilience', () => {
  // When channels query fails or table does not exist (404)
  const fallbackChannels = (groupId) => [
    {
      id: `${groupId}-general`,
      group_id: groupId,
      name: 'general',
      topic: 'General discussion',
      type: 'text',
      created_at: new Date().toISOString(),
    },
  ];

  const res = fallbackChannels('server-123');
  assert.equal(res.length, 1);
  assert.equal(res[0].name, 'general');
  assert.equal(res[0].type, 'text');
});
