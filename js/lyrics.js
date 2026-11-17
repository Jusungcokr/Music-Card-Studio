/* 음악 카드뉴스 스튜디오 — 가사 자동 가져오기(LRCLIB) + 대표 소절 뽑기 */
(function (global) {
  'use strict';

  const API = 'https://lrclib.net/api';
  // 브라우저는 User-Agent를 못 바꾸므로 LRCLIB이 안내하는 X-User-Agent로 앱을 밝힌다.
  const CLIENT = 'MusicCardStudio/1.0 (https://jusungcokr.github.io/Music-Card-Studio/)';
  const NET_TIMEOUT = 9000;

  /* ---------- 요청 ---------- */

  function request(path) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, NET_TIMEOUT);
    return fetch(API + path, {
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      headers: { 'X-User-Agent': CLIENT },
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      clearTimeout(timer);
      if (res.status === 404) return null;              // 해당 곡 없음
      if (res.status === 429) throw new Error('rate');   // 잠시 뒤 다시
      if (!res.ok) throw new Error('http_' + res.status);
      return res.json();
    }, function (err) {
      clearTimeout(timer);
      throw err;
    });
  }

  function qs(params) {
    return Object.keys(params)
      .filter(function (k) { return params[k] != null && String(params[k]).trim() !== ''; })
      .map(function (k) { return k + '=' + encodeURIComponent(String(params[k]).trim()); })
      .join('&');
  }

  /* ---------- 이름 정리 ---------- */

  function tidy(s) {
    return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  }

  /** 비교용: 소문자, 괄호 부속(한글/영문 병기·feat) 제거, 특수문자 제거 */
  function norm(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .replace(/[\(\[]\s*(feat|with|prod|ft)[^\)\]]*[\)\]]/g, '')
      .replace(/[\(\[（【][^\)\]）】]*[\)\]）】]/g, ' ')
      .replace(/&/g, 'and')
      .replace(/[^0-9a-z\uac00-\ud7a3 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** 괄호 안 병기 이름까지 후보로: "Through the Night (밤편지)" → ["Through the Night", "밤편지"] */
  function titleVariants(title) {
    const raw = tidy(title);
    const out = [];
    const push = function (v) {
      const t = tidy(v);
      if (t && t.length > 1 && out.indexOf(t) === -1) out.push(t);
    };
    push(raw);
    const inside = raw.match(/[\(\[]([^\)\]]+)[\)\]]/);
    if (inside) push(inside[1]);
    push(raw.replace(/[\(\[]([^\)\]]+)[\)\]]/g, ' '));
    return out;
  }

  function artistVariants(artist) {
    const raw = tidy(artist);
    const out = [];
    const push = function (v) {
      const t = tidy(v);
      if (t && out.indexOf(t) === -1) out.push(t);
    };
    push(raw);
    const inside = raw.match(/[\(\[]([^\)\]]+)[\)\]]/);
    if (inside) push(inside[1]);
    push(raw.replace(/[\(\[]([^\)\]]+)[\)\]]/g, ' '));
    return out;
  }

  /* ---------- 후보 고르기 ---------- */

  function recordsOf(data) {
    if (!data) return [];
    return Array.isArray(data) ? data : [data];
  }

  function lyricLineCount(rec) {
    const text = rec.plainLyrics || rec.syncedLyrics || '';
    return text ? text.split('\n').filter(function (l) { return l.trim(); }).length : 0;
  }

  function scoreRecord(rec, title, artist) {
    if (!rec) return -99;
    if (rec.instrumental) return -99;
    if (!lyricLineCount(rec)) return -99;
    let s = 0;
    const t = norm(title);
    const a = norm(artist);
    const rt = norm(rec.trackName || rec.name || '');
    const ra = norm(rec.artistName || '');
    if (t) {
      if (rt === t) s += 6;
      else if (rt.indexOf(t) !== -1 || t.indexOf(rt) !== -1) s += 3;
      else s -= 1;
    }
    if (a && ra) {
      if (ra === a) s += 4;
      else if (ra.indexOf(a) !== -1 || a.indexOf(ra) !== -1) s += 2;
      else s -= 1.5;
    }
    if (rec.plainLyrics) s += 1.5;
    else if (rec.syncedLyrics) s += 0.5;
    // 추임새가 줄마다 붙은 판본·줄 수가 너무 적은 판본은 뒤로
    s -= Math.min(2.5, fillerTrouble(rec.plainLyrics || rec.syncedLyrics) * 0.45);
    s += Math.min(0.8, lyricLineCount(rec) * 0.02);
    if (/未知|unknown album/i.test(rec.albumName || '')) s -= 0.2;
    return s;
  }

  function bestRecord(list, title, artist) {
    let best = null;
    let bestScore = 0;
    (list || []).forEach(function (rec) {
      const s = scoreRecord(rec, title, artist);
      if (s > bestScore) { bestScore = s; best = rec; }
    });
    return bestScore >= 3 ? best : null;
  }

  /* ---------- LRCLIB 조회 ---------- */

  function getExact(artist, title) {
    return request('/get?' + qs({ artist_name: artist, track_name: title }));
  }

  function searchStructured(title, artist) {
    return request('/search?' + qs({ track_name: title, artist_name: artist }));
  }

  function searchQuery(q) {
    return request('/search?' + qs({ q: q }));
  }

  /**
   * 곡 정보로 가사 찾기.
   * 1) 정확 조회(/api/get) → 2) 제목·아티스트 구조 검색 → 3) 자유 검색 순서로 시도하고,
   * 응답에서 제목·아티스트가 가장 잘 맞는 기록을 고른다.
   */
  async function find(meta) {
    const title = tidy(meta && meta.title);
    const artist = tidy(meta && meta.artist);
    const album = tidy(meta && meta.album);
    if (!title) return { status: 'empty' };

    const titles = titleVariants(title);
    const artists = artistVariants(artist);
    const tried = [];
    let sawRate = false;
    let rateWait = 0;

    const record = function (r) { if (r) tried.push(r); };

    // 1) 정확 조회 — 앨범 정보가 있으면 함께 넘겨 동명 곡 오검색을 줄인다
    const exact = [];
    for (let i = 0; i < Math.min(artists.length, 2); i++) {
      for (let j = 0; j < Math.min(titles.length, 2); j++) {
        exact.push({ artist: artists[i], title: titles[j], album: i === 0 && j === 0 ? album : '' });
      }
    }
    for (let k = 0; k < Math.min(exact.length, 4); k++) {
      try {
        const params = { artist_name: exact[k].artist, track_name: exact[k].title };
        if (exact[k].album) params.album_name = exact[k].album;
        record(await request('/get?' + qs(params)));
      } catch (e) { if (e.message === 'rate') { sawRate = true; } }
      if (bestRecord(tried, title, artist)) break;
    }

    // 2) 제목 + 아티스트 구조 검색
    //    정확 조회가 성공해도 같은 곡의 판본이 여러 개라, 한 번은 검색 결과도 보고
    //    추임새가 섞이지 않은 깔끔한 판본을 고른다.
    const structured = [];
    for (let j = 0; j < Math.min(2, titles.length); j++) structured.push([titles[j], artists[0] || '']);
    if (artists[1]) structured.push([titles[0], artists[1]]);
    for (let k = 0; k < Math.min(structured.length, 3); k++) {
      try {
        const list = await searchStructured(structured[k][0], structured[k][1]);
        recordsOf(list).forEach(record);
      } catch (e) { if (e.message === 'rate') sawRate = true; }
      const picked = bestRecord(tried, title, artist);
      if (picked && fillerTrouble(picked.plainLyrics || picked.syncedLyrics) === 0) break;
    }

    // 3) 자유 검색
    if (!bestRecord(tried, title, artist)) {
      const queries = [];
      if (artists[0]) queries.push(artists[0] + ' ' + titles[0]);
      queries.push(titles[0]);
      if (titles[1]) queries.push(titles[1]);
      for (let i = 0; i < queries.length; i++) {
        try {
          const list = await searchQuery(queries[i]);
          recordsOf(list).forEach(record);
        } catch (e) { if (e.message === 'rate') sawRate = true; }
        if (bestRecord(tried, title, artist)) break;
      }
    }

    const hit = bestRecord(tried, title, artist);
    if (!hit) {
      return { status: sawRate ? 'rate' : 'none', tried: tried.length };
    }

    const lines = toLines(hit);
    return {
      status: lines.length ? 'ok' : 'none',
      source: 'LRCLIB',
      record: {
        id: hit.id,
        trackName: hit.trackName || hit.name || '',
        artistName: hit.artistName || '',
        albumName: hit.albumName || ''
      },
      lines: lines,
      snippets: buildSnippets(lines, { title: title, artist: artist }),
      variant: tidy(hit.trackName || '')
    };
  }

  /* ---------- 가사 줄 정리 ---------- */

  const META_LINE = /^(\[|\(|【)?\s*(verse|chorus|bridge|intro|outro|pre-chorus|hook|refrain|1절|2절|후렴|간주|verse\s*\d+|chorus\s*\d+)/i;

  // 줄 끝·앞에 붙은 추임새("… 음", "Oh …")는 대표 소절에서 지운다
  const FILLER_EDGE = /(^|\s)(음|아|어|오|우|와|예|네|oh+|ah+|uh+|eh|yeah|yeh|hey|woah|whoa|hmm|mmm|la|na|da|ooh|woo)\s*$/i;
  const FILLER_HEAD = /^(음|아|어|오|우|와|예|네|oh+|ah+|uh+|eh|yeah|yeh|hey|woah|whoa|hmm|mmm|ooh|woo)\s+/i;

  function trimFiller(line) {
    let s = String(line || '');
    for (let i = 0; i < 3; i++) {
      const before = s;
      s = s.replace(FILLER_EDGE, '').replace(FILLER_HEAD, '').trim();
      if (s === before) break;
    }
    return s;
  }

  function fillerTrouble(raw) {
    let n = 0;
    String(raw || '').split(/\r?\n/).forEach(function (line) {
      const s = stripTimestamp(line).trim();
      if (!s) return;
      if (trimFiller(s) !== s) n++;
    });
    return n;
  }

  function stripTimestamp(line) {
    return String(line == null ? '' : line)
      .replace(/^\s*\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\]\s*/g, '')
      .replace(/^\s*\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\]\s*$/g, '');
  }

  function toLines(rec) {
    let raw = rec.plainLyrics || '';
    if (!raw && rec.syncedLyrics) {
      raw = String(rec.syncedLyrics).split('\n').map(stripTimestamp).join('\n');
    }
    const seen = {};
    const out = [];
    String(raw).split(/\r?\n/).forEach(function (line) {
      let s = stripTimestamp(line).replace(/\s+/g, ' ').trim();
      if (!s) return;
      if (META_LINE.test(s)) return;
      if (/^[\-–—=~_*·.\s]+$/.test(s)) return;
      s = s.replace(/^["“”'‘’「」]+|["“”'‘’「」]+$/g, '').trim();
      s = trimFiller(s);
      if (s.length < 2) return;
      out.push(s);
      seen[s] = (seen[s] || 0) + 1;
    });
    out.__repeat = seen;
    return out;
  }

  /* ---------- 소절 고르기 ---------- */

  const FILLER_TOKEN = new Set([
    '음', '아', '어', '오', '우', '와', '워', '예', '네', '냐', '흐', '허', '후', '읍', '엥',
    'oh', 'ah', 'uh', 'eh', 'yeah', 'yeh', 'hey', 'woah', 'whoa', 'hmm', 'mmm', 'la', 'na',
    'da', 'doo', 'ooh', 'woo', 'yo', 'ay', 'aye', 'uhhuh', 'skrrt'
  ]);
  const FILLER_LOOP = /^(라|나|다|음|아|어|오|우|하|해|oh|ah|la|na|da|yeah|hey)+$/i;

  const FEELING_WORDS = [
    '사랑', '마음', '기억', '그리', '보고', '눈물', '밤', '새벽', '비', '바람', '계절',
    '우리', '너', '꿈', '하루', '시간', '거리', '불빛', '별', '노을', '손', '이름', '말',
    '숨', '창', '길', '집', '편지', '여름', '겨울', '봄', '가을', '눈', '바다',
    'love', 'night', 'heart', 'time', 'dream', 'rain', 'light', 'stay', 'gone'
  ];

  function isFillerLine(line) {
    const tokens = line.toLowerCase().replace(/[^0-9a-z가-힣\s]/g, ' ').split(/\s+/).filter(Boolean);
    if (!tokens.length) return true;
    const real = tokens.filter(function (t) { return !FILLER_TOKEN.has(t) && !FILLER_LOOP.test(t); });
    if (!real.length) return true;
    if (tokens.length >= 3 && new Set(tokens).size === 1) return true;
    // 같은 한 글자 추임새만 늘어놓은 줄: "아 아 아 아"
    if (real.join('').length < 3 && tokens.length > 1) return true;
    return false;
  }

  function isAscii(line) {
    return /^[\x20-\x7E]+$/.test(line);
  }

  function scoreLine(line, repeat) {
    const compact = line.replace(/\s+/g, '');
    const ascii = isAscii(line);
    const words = line.split(/\s+/).filter(Boolean).length;
    if (isFillerLine(line)) return -99;
    if (/[\[\]{}]/.test(line)) return -99;
    if (line.length > 90) return -99;

    let s = 0;
    if (ascii) {
      if (words < 3) s -= 2.5;
      else s += 1;
      if (line.length >= 12 && line.length <= 46) s += 2;
      else if (line.length <= 60) s += 1;
      else s -= 1;
    } else {
      if (compact.length < 6) s -= 3;
      else if (compact.length <= 11) s += 1;
      else if (compact.length <= 30) s += 2;
      else if (compact.length <= 44) s += 1;
      else s -= 1;
    }

    // 번역 병기·괄호 설명이 붙은 줄은 카드에 그대로 쓰기 어색하다
    if (/[()]/.test(line)) s -= 2;
    if (/\s[-/]\s/.test(line)) s -= 1;
    if (/\.{2,}|…/.test(line)) s -= 0.5;
    // 따옴표가 짝을 맞지 않으면 인용 카드에 그대로 쓰기 어렵다
    if ((line.match(/"/g) || []).length % 2 === 1) s -= 1.5;

    // 후렴처럼 반복되는 줄은 기억에 남는 대목
    if (repeat && repeat[line] >= 2) s += 1.5;

    const low = line.toLowerCase();
    for (let i = 0; i < FEELING_WORDS.length; i++) {
      if (low.indexOf(FEELING_WORDS[i]) !== -1) { s += 1; break; }
    }
    return s;
  }

  /** 2줄을 붙였을 때 읽기 좋은 길이인지 */
  function pairFits(a, b) {
    const joined = a.length + b.length;
    if (joined > 72) return false;
    if (isAscii(a) !== isAscii(b)) return false;
    return true;
  }

  /**
   * 가장 인상적인 소절 후보 목록. 순서는 좋은 순.
   * 후보가 여러 개라 UI에서 '다른 소절 뽑기'로 돌려 볼 수 있다.
   */
  function buildSnippets(lines, meta) {
    const repeat = lines.__repeat || {};
    const scores = lines.map(function (l) { return scoreLine(l, repeat); });
    const ranked = lines
      .map(function (line, i) { return { i: i, line: line, score: scores[i] }; })
      .filter(function (x) { return x.score > -90; })
      .sort(function (a, b) { return b.score - a.score; });

    const out = [];
    const seen = new Set();
    const add = function (text) {
      const t = String(text || '').trim();
      if (!t || t.length > 170) return;
      const key = t.replace(/\s+/g, ' ');
      if (seen.has(key)) return;
      seen.add(key);
      out.push(t);
    };

    ranked.forEach(function (item) {
      const pairs = [[item.i - 1, item.i], [item.i, item.i + 1]];
      let best = null;
      let bestScore = -1e9;
      pairs.forEach(function (p) {
        const a = p[0];
        const b = p[1];
        if (a < 0 || b >= lines.length) return;
        if (scores[a] <= -90 || scores[b] <= -90) return;
        if (lines[a] === lines[b]) return;        // 같은 줄을 두 번 뽑지 않는다
        // 한 줄이 다른 줄을 거의 그대로 담고 있으면 한 줄만 쓴다
        const na = lines[a].replace(/[^0-9A-Za-z가-힣]/g, '').toLowerCase();
        const nb = lines[b].replace(/[^0-9A-Za-z가-힣]/g, '').toLowerCase();
        if (na && nb && (na.indexOf(nb) !== -1 || nb.indexOf(na) !== -1)) return;
        if (!pairFits(lines[a], lines[b])) return;
        const sum = scores[a] + scores[b];
        if (sum > bestScore) { bestScore = sum; best = [a, b]; }
      });
      if (best) add(lines[best[0]] + '\n' + lines[best[1]]);
      else add(item.line);
    });

    return out.slice(0, 12);
  }

  /** 가사에서 무드 키워드 뽑기 (추천 이유·태그에 함께 쓴다) */
  const KEYWORDS = [
    { key: '새벽', words: ['새벽', '동트', '해뜨', 'dawn'] },
    { key: '밤', words: ['밤', '달빛', '별빛', 'night', 'moon'] },
    { key: '비', words: ['비가', '빗소리', '장마', 'rain'] },
    { key: '사랑', words: ['사랑', 'love', '입맞춤', '고백'] },
    { key: '이별', words: ['이별', '헤어', '떠나', '그리', '미안', 'goodbye'] },
    { key: '산책', words: ['산책', '걷', '골목', 'walk'] },
    { key: '드라이브', words: ['드라이브', '차창', '도로', 'drive'] },
    { key: '노을', words: ['노을', '해질', '석양', 'sunset'] },
    { key: '겨울', words: ['겨울', '눈이', '찬 바람', 'winter'] },
    { key: '여름', words: ['여름', '햇살', 'summer'] },
    { key: '바다', words: ['바다', '파도', 'sea', 'ocean'] },
    { key: '위로', words: ['괜찮', '위로', '쉬어', 'breathe'] },
    { key: '꿈', words: ['꿈', 'dream'] },
    { key: '시간', words: ['시간', '기억', '추억', 'time', 'memory'] }
  ];

  function keywordsOf(text) {
    const src = String(text || '').toLowerCase();
    const out = [];
    if (!src) return out;
    KEYWORDS.forEach(function (k) {
      for (let i = 0; i < k.words.length; i++) {
        if (src.indexOf(k.words[i].toLowerCase()) !== -1) { out.push(k.key); return; }
      }
    });
    return out;
  }

  global.MusicLyrics = {
    find: find,
    buildSnippets: buildSnippets,
    toLines: toLines,
    keywordsOf: keywordsOf,
    stripTimestamp: stripTimestamp,
    trimFiller: trimFiller,
    isFillerLine: isFillerLine,
    scoreRecord: scoreRecord,
    bestRecord: bestRecord,
    norm: norm
  };
})(window);
