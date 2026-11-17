/* 인스타 캡션·해시태그, 유튜브 쇼츠 제목·설명 자동 생성 */
(function (global) {
  'use strict';

  const DATA = global.MusicData;

  const BASE_TAGS = ['음악추천', '노래추천', '플레이리스트', '뮤직카드뉴스', '오늘의노래'];

  function moodEmoji(d) {
    const tags = (d.tags || []).join(' ') + ' ' + (d.genre || '');
    for (let i = 0; i < DATA.MOOD_EMOJI.length; i++) {
      const m = DATA.MOOD_EMOJI[i];
      for (let k = 0; k < m.keys.length; k++) {
        if (tags.indexOf(m.keys[k]) !== -1) return m.emoji;
      }
    }
    return '🎧';
  }

  function cleanTag(t) {
    return String(t || '').replace(/[#\s]+/g, '');
  }

  function hashtags(d) {
    const list = [];
    const push = (t) => {
      const c = cleanTag(t);
      if (c && c.length <= 20 && list.indexOf(c) === -1) list.push(c);
    };
    (d.tags || []).forEach(push);
    if (d.genre) push(d.genre.replace(/\s+/g, ''));
    BASE_TAGS.forEach(push);
    push('음악스타그램');
    return list.slice(0, 14).map((t) => '#' + t).join(' ');
  }

  function firstLine(text, max) {
    const line = String(text || '').split('\n').map((s) => s.trim()).filter(Boolean)[0] || '';
    if (line.length <= max) return line;
    return line.slice(0, max - 1).replace(/[\s,·]$/, '') + '…';
  }

  function moodPhrase(d) {
    const tags = d.tags || [];
    if (!tags.length) return d.genre ? d.genre + ' 추천' : '오늘의 노래';
    return tags.slice(0, 2).join(' · ') + '에 어울리는';
  }

  function instagram(d) {
    const title = d.title || '제목 없는 곡';
    const artist = d.artist || '아티스트';
    const emoji = moodEmoji(d);
    const meta = [d.genre, d.year ? String(d.year) : ''].filter(Boolean).join(' · ');
    const tags = (d.tags || []).slice(0, 4);
    const lines = [];

    lines.push(emoji + ' ' + moodPhrase(d) + (d.genre ? ' ' + d.genre : ' 한 곡'));
    lines.push('');
    lines.push(artist + ' — ' + title);
    if (meta) lines.push(meta);
    lines.push('');

    if (d.reason) {
      lines.push(d.reason.trim());
      lines.push('');
    }

    if (d.lyrics) {
      const q = d.lyrics.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 2).join(' / ');
      if (q) {
        lines.push('“' + q + '”');
        lines.push('');
      }
    }

    if (tags.length) lines.push(tags.join(' · '));
    lines.push('저장해두고 오늘 한 번 다시 들어봐요 ' + emoji);
    if (d.handle) { lines.push(''); lines.push('@' + d.handle); }
    lines.push('.');
    lines.push('.');
    lines.push(hashtags(d));

    return lines.join('\n').replace(/\n{3,}/g, '\n\n');
  }

  function youtubeTitle(d) {
    const title = d.title || '제목 없는 곡';
    const artist = d.artist || '아티스트';
    const mood = (d.tags && d.tags.length ? d.tags[0] : (d.genre || '감성')) + '에 듣기 좋은';
    let t = artist + ' - ' + title + ' | ' + mood + ' ' + (d.genre || '노래') + ' 🎧';
    if (t.length > 95) t = t.slice(0, 94) + '…';
    return t;
  }

  function youtubeDesc(d) {
    const title = d.title || '제목 없는 곡';
    const artist = d.artist || '아티스트';
    const lines = [];
    lines.push(artist + ' - ' + title + (d.year ? ' (' + d.year + ')' : ''));
    if (d.genre) lines.push(d.genre);
    lines.push('');

    if (d.tags && d.tags.length) lines.push('🎧 이런 순간에: ' + d.tags.join(' · '));
    if (d.reason) lines.push('💬 ' + d.reason.replace(/\n+/g, ' '));
    if (d.lyrics) {
      const q = firstLine(d.lyrics, 70);
      if (q) lines.push('🎶 “' + q + '”');
    }
    lines.push('');
    lines.push('마음에 들면 좋아요와 구독으로 응원해 주세요. 요청곡은 댓글로 남겨 주세요!');
    if (d.handle) { lines.push(''); lines.push('@' + d.handle); }
    lines.push('');
    lines.push(hashtags(d).split(' ').slice(0, 10).join(' '));
    lines.push('#Shorts');
    return lines.join('\n');
  }

  global.MusicCaptions = { instagram, youtubeTitle, youtubeDesc, hashtags, moodEmoji };
})(window);
