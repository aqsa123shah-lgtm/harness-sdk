import fs from 'node:fs';
import path from 'node:path';
import { db, uid, ts, SEED_DIR } from './db.js';
import { hashPassword } from './auth.js';
import { extractTags } from './dto.js';

const HOUR = 60 * 60 * 1000;

const PALETTES = [
  ['#7c3aed', '#ec4899', '#fbbf24'],
  ['#0ea5e9', '#6366f1', '#a855f7'],
  ['#f97316', '#ef4444', '#fda4af'],
  ['#10b981', '#06b6d4', '#a3e635'],
  ['#f43f5e', '#8b5cf6', '#38bdf8'],
  ['#fbbf24', '#f97316', '#7c3aed'],
  ['#22d3ee', '#818cf8', '#f472b6'],
  ['#84cc16', '#14b8a6', '#0ea5e9'],
];

const USERS = [
  { key: 'admin', username: 'lumen', displayName: 'Lumen', email: 'admin@lumen.app', password: 'admin1234', bio: 'Keeping Lumen safe, fast and beautiful.', website: 'lumen.app', verified: 1, admin: 1, letter: 'L', palette: 0 },
  { key: 'aria', username: 'aria.malik', displayName: 'Aria Malik', email: 'aria@lumen.app', password: 'lumen1234', bio: 'Product designer · chasing golden hour ☀️\nBuilding calm interfaces.', website: 'aria.design', verified: 1, admin: 0, letter: 'A', palette: 1 },
  { key: 'kai', username: 'kai.nakamura', displayName: 'Kai Nakamura', email: 'kai@lumen.app', password: 'lumen1234', bio: 'Street photography & slow mornings in Tokyo.', website: 'kai.photo', verified: 1, admin: 0, letter: 'K', palette: 2 },
  { key: 'nova', username: 'nova.reyes', displayName: 'Nova Reyes', email: 'nova@lumen.app', password: 'lumen1234', bio: 'Movement, film and a little chaos.', website: '', verified: 0, admin: 0, letter: 'N', palette: 3 },
  { key: 'theo', username: 'theo.silva', displayName: 'Theo Silva', email: 'theo@lumen.app', password: 'lumen1234', bio: 'Coffee, code and city runs.', website: '', verified: 0, admin: 0, letter: 'T', palette: 4 },
  { key: 'mira', username: 'mira.chen', displayName: 'Mira Chen', email: 'mira@lumen.app', password: 'lumen1234', bio: 'Ceramics studio · quiet things', website: '', verified: 1, admin: 0, letter: 'M', palette: 5 },
  { key: 'zayn', username: 'zayn.ahmed', displayName: 'Zayn Ahmed', email: 'zayn@lumen.app', password: 'lumen1234', bio: 'Just here for the reels.', website: '', verified: 0, admin: 0, letter: 'Z', palette: 6 },
];

const SHAPES = [
  '<circle cx="220" cy="200" r="210" fill="#fff" opacity=".14"/><circle cx="620" cy="610" r="250" fill="#000" opacity=".12"/>',
  '<rect x="-90" y="430" width="980" height="420" rx="190" fill="#fff" opacity=".12" transform="rotate(-8 400 600)"/>',
  '<circle cx="400" cy="400" r="235" fill="none" stroke="#fff" stroke-width="26" opacity=".22"/><circle cx="620" cy="210" r="88" fill="#fff" opacity=".18"/>',
  '<path d="M0 560 C 160 440 320 700 480 580 C 620 475 720 600 800 540 L800 800 L0 800 Z" fill="#000" opacity=".2"/>',
];

function artSvg(palette, seed) {
  const [a, b, c] = palette;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>
<radialGradient id="s" cx=".28" cy=".18" r=".95"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
</defs>
<rect width="800" height="800" fill="url(#g)"/><rect width="800" height="800" fill="url(#s)"/>
${SHAPES[seed % SHAPES.length]}
</svg>`;
}

function avatarSvg(letter, palette) {
  const [a, b] = palette;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
<rect width="200" height="200" fill="url(#g)"/>
<text x="100" y="134" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif" font-size="94" font-weight="700" fill="#fff" text-anchor="middle" opacity=".95">${letter}</text>
</svg>`;
}

function coverSvg(palette) {
  const [a, b, c] = palette;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 420" width="1200" height="420">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".6" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs>
<rect width="1200" height="420" fill="url(#g)"/>
<circle cx="220" cy="90" r="190" fill="#fff" opacity=".12"/>
<circle cx="980" cy="360" r="230" fill="#000" opacity=".12"/>
<path d="M0 320 C 260 230 420 400 640 320 C 860 240 1000 330 1200 280 L1200 420 L0 420 Z" fill="#000" opacity=".16"/>
</svg>`;
}

function writeSeedMedia() {
  const files = [];
  for (let i = 0; i < 8; i += 1) files.push([`art-${i + 1}.svg`, artSvg(PALETTES[i % PALETTES.length], i)]);
  for (const user of USERS) {
    files.push([`avatar-${user.key}.svg`, avatarSvg(user.letter, PALETTES[user.palette])]);
    files.push([`cover-${user.key}.svg`, coverSvg(PALETTES[user.palette])]);
  }
  for (const [name, svg] of files) {
    const target = path.join(SEED_DIR, name);
    if (!fs.existsSync(target)) fs.writeFileSync(target, svg);
  }
}

const POSTS = [
  ['kai', 'image', 2, 'art-1.svg', 'Golden hour on the rooftop. Nothing beats this light. #goldenhour #citylife'],
  ['aria', 'image', 5, 'art-2.svg', 'New workspace setup is finally done. Soft light, warm coffee, zero notifications. #design #workspace'],
  ['nova', 'image', 9, 'art-3.svg', 'Shot on film, developed at home. There is something about waiting for the scan. #filmphotography #35mm'],
  ['mira', 'image', 14, 'art-4.svg', 'Fresh out of the kiln this morning — a set of speckled cups in sage. #ceramics #handmade'],
  ['theo', 'text', 20, null, 'Hot take: the best productivity app is a closed laptop and a walk outside.'],
  ['kai', 'image', 26, 'art-5.svg', 'Rained all morning so the streets were basically mirrors. #streetphotography #tokyo'],
  ['aria', 'image', 32, 'art-6.svg', 'Prototyping week. Ten versions of the same screen and version seven is the one. #uidesign #productdesign'],
  ['nova', 'image', 40, 'art-7.svg', 'Sunday reset: stretch, smoothie, sunlight. #fitness #morningroutine'],
  ['mira', 'image', 52, 'art-8.svg', 'Studio corner, 7:40am. The quietest hour of the day. #studiolife #ceramics'],
  ['theo', 'image', 64, 'art-1.svg', 'Long run along the river, 12k and a flat white at the end. #running #citylife'],
];

const REELS = [
  ['nova', '/media/reel-1.mp4', 'Behind the scenes of the new shoot 🔥 #bts #fashion', 3],
  ['kai', '/media/reel-2.mp4', '60 seconds of city rain. Turn the sound on. #rain #tokyo', 8],
  ['theo', '/media/reel-3.mp4', 'Pour-over in real time. Slow coffee, slow Sunday. #coffee', 15],
];

const STORIES = [
  ['kai', 'art-6.svg', 'image', 'Rooftop light 🌇', 3],
  ['nova', 'art-3.svg', 'image', 'Studio day ✨', 5],
  ['mira', 'art-8.svg', 'image', 'Fresh batch 🏺', 7],
  ['aria', 'art-2.svg', 'image', 'Coffee #1 ☕', 9],
];

export function seedIfEmpty() {
  writeSeedMedia();
  if (db.prepare('SELECT COUNT(*) c FROM users').get().c > 0) return;

  const now = ts();
  const ids = {};

  const insertUser = db.prepare(
    `INSERT INTO users (id, username, display_name, email, password_hash, avatar_url, cover_url, bio, website,
      is_private, is_admin, is_verified, is_banned, email_verified, last_seen, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0, 1, ?, ?)`
  );
  USERS.forEach((user, index) => {
    ids[user.key] = uid();
    insertUser.run(
      ids[user.key],
      user.username,
      user.displayName,
      user.email,
      hashPassword(user.password),
      `/seed/avatar-${user.key}.svg`,
      `/seed/cover-${user.key}.svg`,
      user.bio,
      user.website,
      user.admin,
      user.verified,
      user.key === 'kai' || user.key === 'nova' ? now - 20_000 : now - (index + 1) * 26 * HOUR,
      now - (index * 20 + 6) * HOUR
    );
  });

  const follow = db.prepare('INSERT OR IGNORE INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)');
  [
    ['aria', 'kai'], ['aria', 'nova'], ['aria', 'mira'], ['aria', 'theo'],
    ['kai', 'aria'], ['kai', 'mira'], ['nova', 'aria'], ['nova', 'kai'],
    ['theo', 'aria'], ['theo', 'kai'], ['mira', 'aria'], ['mira', 'nova'],
    ['zayn', 'aria'], ['zayn', 'kai'], ['zayn', 'nova'],
  ].forEach(([a, b], i) => follow.run(ids[a], ids[b], now - (30 - i) * HOUR));

  const insertPost = db.prepare(
    'INSERT INTO posts (id, user_id, type, media_url, caption, is_reel, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insertTag = db.prepare('INSERT INTO post_tags (post_id, tag) VALUES (?, ?)');

  const postIds = POSTS.map(([key, type, hoursAgo, media, caption]) => {
    const id = uid();
    insertPost.run(id, ids[key], type, media ? `/seed/${media}` : null, caption, 0, now - hoursAgo * HOUR);
    for (const tag of extractTags(caption)) insertTag.run(id, tag);
    return { id, author: key };
  });

  const reelIds = REELS.map(([key, url, caption, hoursAgo]) => {
    const id = uid();
    insertPost.run(id, ids[key], 'video', url, caption, 1, now - hoursAgo * HOUR);
    for (const tag of extractTags(caption)) insertTag.run(id, tag);
    return { id, author: key };
  });

  const like = db.prepare('INSERT OR IGNORE INTO likes (user_id, post_id, created_at) VALUES (?, ?, ?)');
  [...postIds, ...reelIds].forEach((post, index) => {
    USERS.forEach((user, userIndex) => {
      if (user.key === post.author) return;
      if ((userIndex + index) % 3 === 0) return;
      like.run(ids[user.key], post.id, now - (index + userIndex) * 900_000);
    });
  });

  db.prepare('INSERT OR IGNORE INTO bookmarks (user_id, post_id, created_at) VALUES (?, ?, ?)').run(
    ids.aria,
    postIds[3].id,
    now - HOUR
  );

  const insertComment = db.prepare(
    'INSERT INTO comments (id, post_id, user_id, parent_id, text, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const c1 = uid();
  insertComment.run(c1, postIds[0].id, ids.aria, null, 'This light is unreal. Which lens?', now - 90 * 60_000);
  insertComment.run(uid(), postIds[0].id, ids.kai, c1, '35mm, wide open — the cheap one 🙂', now - 80 * 60_000);
  const c2 = uid();
  insertComment.run(c2, postIds[1].id, ids.mira, null, 'That desk setup is goals.', now - 4 * HOUR);
  insertComment.run(uid(), postIds[3].id, ids.nova, null, 'The sage glaze is perfect. Do you sell these?', now - 12 * HOUR);
  const spamComment = uid();
  insertComment.run(spamComment, postIds[5].id, ids.zayn, null, 'FREE FOLLOWERS — click my bio link now!!!', now - 3 * HOUR);
  insertComment.run(uid(), postIds[6].id, ids.theo, null, 'Version seven always wins.', now - 20 * HOUR);

  const insertStory = db.prepare(
    'INSERT INTO stories (id, user_id, media_url, media_type, text, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  STORIES.forEach(([key, media, type, text, hoursAgo]) => {
    const created = now - hoursAgo * HOUR;
    insertStory.run(uid(), ids[key], `/seed/${media}`, type, text, created, created + 24 * HOUR);
  });

  const conv = db.prepare(
    'INSERT INTO conversations (id, user_a, user_b, last_message_at, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  const insertMessage = db.prepare(
    `INSERT INTO messages (id, conversation_id, sender_id, text, media_url, media_type, created_at, read_at)
     VALUES (?, ?, ?, ?, NULL, NULL, ?, ?)`
  );

  const pair = (a, b) => [ids[a], ids[b]].sort();
  const ariaKai = uid();
  const [a1, a2] = pair('aria', 'kai');
  conv.run(ariaKai, a1, a2, now - 18 * 60_000, now - 6 * HOUR);
  [
    ['kai', 'Hey Aria! Loved the new prototype screens 👀', 3 * HOUR, 1],
    ['aria', 'Thank you! Still tweaking the empty states.', 2.9 * HOUR, 1],
    ['kai', 'The motion on the feed card is so smooth. How did you do it?', 2.8 * HOUR, 1],
    ['aria', 'Spring curves plus a tiny stagger. I can send you the file.', 2.7 * HOUR, 1],
    ['kai', 'Please do 🙏', 18 * 60_000, null],
  ].forEach(([sender, text, offset, read]) =>
    insertMessage.run(uid(), ariaKai, ids[sender], text, now - offset, read ? now - offset + 60_000 : null)
  );

  const ariaNova = uid();
  const [n1, n2] = pair('aria', 'nova');
  conv.run(ariaNova, n1, n2, now - 5 * HOUR, now - 2 * 24 * HOUR);
  [
    ['nova', 'Are we still on for the shoot Saturday?', 5.2 * HOUR, 1],
    ['aria', 'Yes! Golden hour, 5pm at the pier.', 5 * HOUR, 1],
  ].forEach(([sender, text, offset, read]) =>
    insertMessage.run(uid(), ariaNova, ids[sender], text, now - offset, read ? now - offset + 30_000 : null)
  );

  const notif = db.prepare(
    `INSERT INTO notifications (id, user_id, actor_id, type, post_id, comment_id, story_id, text, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`
  );
  notif.run(uid(), ids.aria, ids.kai, 'like', postIds[1].id, null, '', 0, now - 40 * 60_000);
  notif.run(uid(), ids.aria, ids.mira, 'comment', postIds[1].id, c2, 'That desk setup is goals.', 0, now - 4 * HOUR);
  notif.run(uid(), ids.aria, ids.mira, 'follow', null, null, '', 0, now - 6 * HOUR);
  notif.run(uid(), ids.aria, ids.kai, 'message', null, null, 'Please do 🙏', 0, now - 18 * 60_000);
  notif.run(uid(), ids.aria, ids.theo, 'like', postIds[6].id, null, '', 1, now - 20 * HOUR);
  notif.run(uid(), ids.kai, ids.aria, 'comment', postIds[0].id, c1, 'This light is unreal. Which lens?', 1, now - 90 * 60_000);

  const report = db.prepare(
    'INSERT INTO reports (id, reporter_id, target_type, target_id, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  report.run(uid(), ids.nova, 'post', postIds[5].id, 'Spam links in the comments', 'open', now - 2 * HOUR);
  report.run(uid(), ids.theo, 'comment', spamComment, 'Spam / promotional comment', 'open', now - 1 * HOUR);
  report.run(uid(), ids.mira, 'user', ids.zayn, 'Repeated spam in comments', 'open', now - 45 * 60_000);

  console.log('[seed] Lumen demo data created');
}
