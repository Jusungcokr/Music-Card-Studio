/* 음악 카드뉴스 스튜디오 — 곡 링크 해석 · 음원 검색 */
(function (global) {
  'use strict';

  const NOEMBED = 'https://noembed.com/embed?url=';
  const SPOTIFY_OEMBED = 'https://open.spotify.com/oembed?url=';
  const ITUNES = 'https://itunes.apple.com';
  const NET_TIMEOUT = 12000;
  const IMG_TIMEOUT = 15000;

  /* ---------- 네트워크 ---------- */

  function fetchJson(url) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, NET_TIMEOUT);
    return fetch(url, {
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      clearTimeout(timer);
      if (!res.ok) throw new Error('http_' + res.status);
      return res.json();
    }, function (err) {
      clearTimeout(timer);
      throw err;
    });
  }

  /** <img crossOrigin="anonymous"> 로 불러오기 (캔버스에 그려도 오염되지 않는 상태) */
  function loadImage(url, opts) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      if (!opts || opts.cors !== false) img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      let done = false;
      const timer = setTimeout(function () {
        if (done) return;
        done = true;
        reject(new Error('timeout'));
      }, IMG_TIMEOUT);
      img.onload = function () {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (!img.naturalWidth) { reject(new Error('empty')); return; }
        resolve(img);
      };
      img.onerror = function () {
        if (done) return;
        done = true;
        clearTimeout(timer);
        reject(new Error('load'));
      };
      img.src = url;
    });
  }

  /** CORS 헤더가 없어 <img>가 막힐 때: fetch → Blob URL 로 우회 */
  function fetchBlobUrl(url) {
    return fetch(url, { mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer' })
      .then(function (res) {
        if (!res.ok) throw new Error('http_' + res.status);
        return res.blob();
      })
      .then(function (blob) {
        if (!/^image\//.test(blob.type)) throw new Error('not_image');
        return URL.createObjectURL(blob);
      });
  }

  function isCanvasClean(img) {
    try {
      const c = document.createElement('canvas');
      c.width = 2;
      c.height = 2;
      c.getContext('2d').drawImage(img, 0, 0, 2, 2);
      c.toDataURL('image/png');
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * 카드 캔버스에 그려도 toDataURL()이 살아 있는 이미지를 만든다.
   * 1) crossOrigin=anonymous 이미지 → 2) fetch→Blob URL → 3) 실패 시 예외
   */
  async function loadCanvasImage(url) {
    let firstErr = null;
    try {
      const img = await loadImage(url);
      if (isCanvasClean(img)) return img;
      firstErr = new Error('tainted');
    } catch (e) {
      firstErr = e;
    }
    const objUrl = await fetchBlobUrl(url).catch(function () { return null; });
    if (objUrl) {
      try {
        const img2 = await loadImage(objUrl);
        if (isCanvasClean(img2)) {
          img2.__objectUrl = objUrl;
          return img2;
        }
      } catch (e) { /* 아래에서 실패 처리 */ }
      URL.revokeObjectURL(objUrl);
    }
    throw firstErr || new Error('cors');
  }

  /* ---------- 문자열 정리 ---------- */

  const NOISE_GROUP = /(official\s*(music\s*)?video|official\s*audio|official\s*lyric[s]?\s*video|lyric[s]?\s*video|lyrics?|m\/v|\bmv\b|music\s*video|performance\s*video|visuali[sz]er|dance\s*practice|choreography|teaser|audio|4k|uhd|hd|hq|remaster(ed)?|color\s*coded|produce\s*48|가사|뮤직비디오|라이브|자막|한글\s*자막)/i;
  const NOISE_TAIL = /\s*[-–—|:·]?\s*(official\s*(music\s*)?video|official\s*audio|official\s*lyric[s]?\s*video|lyric[s]?\s*video|lyrics?|m\/v|mv|music\s*video|visuali[sz]er|performance\s*video|audio|teaser|가사|뮤직비디오|자막)\s*$/i;

  function tidy(str) {
    return String(str == null ? '' : str).replace(/\s+/g, ' ').trim();
  }

  /** 제목에 붙은 (Official Video), [MV], 가사 같은 꼬리표 제거 */
  function stripNoise(raw) {
    let s = String(raw == null ? '' : raw);
    s = s.replace(/[\(\[]([^\)\]]*)[\)\]]/g, function (whole, inner) {
      return NOISE_GROUP.test(inner) ? ' ' : whole;
    });
    s = s.replace(/【[^】]*】/g, ' ');
    for (let i = 0; i < 4; i++) {
      const before = s;
      s = s.replace(NOISE_TAIL, '');
      if (s === before) break;
    }
    return tidy(s).replace(/^[\s\-–—|:·]+|[\s\-–—|:·]+$/g, '').trim();
  }

  function normName(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .replace(/[\(\[]\s*(feat|with|prod)[^\)\]]*[\)\]]/g, '')
      .replace(/\b(feat|ft)\.?\s.*$/, '')
      .replace(/[^0-9a-z\uac00-\ud7a3]/g, '');
  }

  /** "아티스트 - 곡명" 형태면 나눈다 */
  function splitArtistTitle(title) {
    const m = String(title || '').match(/^(.{1,48}?)\s+[-–—]\s+(.+)$/);
    if (!m) return { artist: '', title: tidy(title) };
    const left = tidy(m[1]);
    const right = tidy(m[2]);
    if (!left || !right) return { artist: '', title: tidy(title) };
    // 왼쪽이 "Track 01" 처럼 보이면 나누지 않는다
    if (/^\d+$/.test(left) || /^(track|곡)\s*\d+/i.test(left)) return { artist: '', title: tidy(title) };
    return { artist: left, title: right };
  }

  function cleanChannel(name) {
    let s = tidy(name);
    s = s.replace(/\s*-\s*topic$/i, '');
    s = s.replace(/\s*(official|official\s*channel)$/i, '');
    if (/vevo$/i.test(s) && s.length > 4) s = s.replace(/vevo$/i, '');
    s = s.replace(/_/g, ' ');
    return tidy(s);
  }

  function art600(url) {
    const u = String(url || '');
    if (!u) return '';
    return u.replace(/\/\d+x\d+(?:bb|sr)?\.(jpg|png|jpeg)$/i, '/600x600bb.$1');
  }

  function yearOf(dateStr) {
    const m = String(dateStr || '').match(/^(\d{4})/);
    return m ? m[1] : '';
  }

  /* ---------- 링크 해석 ---------- */

  const BLOCKED_HOSTS = [
    { host: /(^|\.)melon\.com$/, site: '멜론' },
    { host: /(^|\.)genie\.co\.kr$/, site: '지니뮤직' },
    { host: /(^|\.)music-flo\.com$/, site: '플로' },
    { host: /(^|\.)bugs\.co\.kr$/, site: '벅스' },
    { host: /(^|\.)vibe\.naver\.com$/, site: '바이브' },
    { host: /(^|\.)vibe\.com$/, site: '바이브' },
    { host: /(^|\.)soribada\.com$/, site: '소리바다' },
    { host: /(^|\.)jiosaavn\.com$/, site: 'JioSaavn' },
    { host: /(^|\.)soundcloud\.com$/, site: '사운드클라우드' },
    { host: /(^|\.)bandcamp\.com$/, site: '밴드캠프' },
    { host: /(^|\.)music\.naver\.com$/, site: '네이버 바이브' }
  ];

  function toUrl(raw) {
    let s = tidy(raw).replace(/^<|>$/g, '');
    if (!s) return null;
    if (!/^https?:\/\//i.test(s)) {
      if (!/^[a-z0-9.-]+\.[a-z]{2,}(\/|$|\?)/i.test(s)) return null;
      s = 'https://' + s;
    }
    try { return new URL(s); } catch (e) { return null; }
  }

  const YT_ID = /^[A-Za-z0-9_-]{6,20}$/;
  const YT_HOSTS = ['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'];

  function parseLink(raw) {
    const url = toUrl(raw);
    if (!url) return { kind: 'invalid' };
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();
    const path = url.pathname || '/';

    if (host === 'youtu.be') {
      const id = (path.split('/')[1] || '').split('&')[0];
      if (YT_ID.test(id)) return { kind: 'youtube', videoId: id };
      return { kind: 'invalid' };
    }
    if (YT_HOSTS.indexOf(host) !== -1) {
      const v = url.searchParams.get('v');
      if (path === '/watch' && v && YT_ID.test(v)) return { kind: 'youtube', videoId: v };
      const m = path.match(/^\/(?:shorts|embed|live|v|watch)\/([A-Za-z0-9_-]{6,20})/);
      if (m) return { kind: 'youtube', videoId: m[1] };
      if (v && YT_ID.test(v)) return { kind: 'youtube', videoId: v };
      return { kind: 'invalid' };
    }
    if (host === 'open.spotify.com' || host === 'play.spotify.com' || host === 'spotify.com') {
      const m = path.match(/^\/(?:intl-[a-z-]{2,5}\/)?track\/([A-Za-z0-9]{10,30})/);
      if (m) return { kind: 'spotify', trackId: m[1] };
      if (/\/(album|playlist|artist|show|episode)\//.test(path)) return { kind: 'spotify-other' };
      return { kind: 'invalid' };
    }
    if (host === 'music.apple.com' || host === 'geo.music.apple.com' || host === 'itunes.apple.com') {
      const segs = path.split('/').filter(Boolean);
      let cc = '';
      if (segs.length && /^[a-z]{2}$/i.test(segs[0])) cc = segs[0].toLowerCase();
      const iParam = url.searchParams.get('i');
      if (iParam && /^\d{4,}$/.test(iParam)) return { kind: 'apple', id: iParam, cc: cc };
      const last = segs[segs.length - 1] || '';
      if (/^\d{4,}$/.test(last)) return { kind: 'apple', id: last, cc: cc };
      const idParam = url.searchParams.get('id');
      if (idParam && /^\d{4,}$/.test(idParam)) return { kind: 'apple', id: idParam, cc: cc };
      return { kind: 'apple-page', cc: cc };
    }
    for (let i = 0; i < BLOCKED_HOSTS.length; i++) {
      if (BLOCKED_HOSTS[i].host.test(host)) return { kind: 'blocked', site: BLOCKED_HOSTS[i].site };
    }
    return { kind: 'unknown', host: host };
  }

  /* ---------- YouTube ---------- */

  function youtubeInfo(videoId) {
    const watch = 'https://www.youtube.com/watch?v=' + videoId;
    const thumbs = [
      'https://i.ytimg.com/vi/' + videoId + '/maxresdefault.jpg',
      'https://i.ytimg.com/vi/' + videoId + '/hqdefault.jpg'
    ];
    return fetchJson(NOEMBED + encodeURIComponent(watch)).then(function (j) {
      if (!j || j.error) throw new Error('noembed');
      const raw = tidy(j.title || '');
      const channel = cleanChannel(j.author_name || '');
      const cleaned = stripNoise(raw);
      const split = splitArtistTitle(cleaned);
      let artist = split.artist;
      const title = split.title || cleaned || raw;
      if (!artist) {
        if (channel && normName(channel) && normName(title).indexOf(normName(channel)) === -1) artist = channel;
      }
      return {
        title: title,
        artist: artist,
        year: '',
        genre: '',
        coverUrls: thumbs,
        provider: 'YouTube'
      };
    }).catch(function () {
      // 제목을 못 가져와도 썸네일은 넣을 수 있다
      return {
        title: '',
        artist: '',
        year: '',
        genre: '',
        coverUrls: thumbs,
        provider: 'YouTube',
        partial: true
      };
    }).then(function (info) {
      info.linkId = videoId;
      return info;
    });
  }

  /* ---------- Spotify ---------- */

  function spotifyInfo(trackId) {
    const target = 'https://open.spotify.com/track/' + trackId;
    return fetchJson(SPOTIFY_OEMBED + encodeURIComponent(target)).then(function (j) {
      const title = stripNoise(j.title || '');
      const info = {
        title: title,
        artist: '',
        year: '',
        genre: '',
        coverUrls: j.thumbnail_url ? [art600(j.thumbnail_url)] : [],
        provider: 'Spotify'
      };
      if (!title) return info;
      // Spotify oEmbed는 아티스트를 주지 않는다 → 같은 제목으로 애플뮤직을 한 번 조회해 보정
      return search(title, 4).then(function (list) {
        const hit = pickMatch(list, title);
        if (hit) {
          info.artist = hit.artist;
          info.year = hit.year;
          info.genre = hit.genre;
          if (hit.coverUrls && hit.coverUrls[0]) info.coverUrls = hit.coverUrls.concat(info.coverUrls);
          info.note = '아티스트·발매년도는 애플뮤직 검색으로 맞췄어요';
        }
        return info;
      }).catch(function () { return info; });
    });
  }

  function pickMatch(list, title) {
    const t = normName(title);
    if (!t) return null;
    for (let i = 0; i < list.length; i++) {
      if (normName(list[i].title) === t) return list[i];
    }
    for (let i = 0; i < list.length; i++) {
      const n = normName(list[i].title);
      if (n && (n.indexOf(t) === 0 || t.indexOf(n) === 0) && Math.min(n.length, t.length) >= 4) return list[i];
    }
    return null;
  }

  /* ---------- Apple Music / iTunes ---------- */

  function itunesResultToInfo(r) {
    if (!r) return null;
    const cover = art600(r.artworkUrl100 || r.artworkUrl60 || '');
    return {
      title: stripNoise(r.trackName || r.collectionName || ''),
      artist: tidy(r.artistName || ''),
      year: yearOf(r.releaseDate),
      genre: tidy(r.primaryGenreName || ''),
      coverUrls: cover ? [cover] : [],
      provider: 'Apple Music',
      trackId: r.trackId || '',
      kind: r.kind || r.wrapperType || '',
      url: r.trackViewUrl || ''
    };
  }

  function appleLookup(id, country) {
    return fetchJson(ITUNES + '/lookup?id=' + encodeURIComponent(id) + '&country=' + country)
      .then(function (j) {
        const r = j && j.results && j.results[0];
        return r || null;
      });
  }

  function appleInfo(id, cc) {
    const order = [];
    [cc, 'kr', 'us'].forEach(function (c) {
      if (c && order.indexOf(c) === -1) order.push(c);
    });
    let chain = Promise.reject(new Error('empty'));
    order.forEach(function (c) {
      chain = chain.catch(function () {
        return appleLookup(id, c).then(function (r) {
          if (!r) throw new Error('not_found');
          return r;
        });
      });
    });
    return chain.then(function (r) {
      const info = itunesResultToInfo(r);
      if (!info || !info.title) throw new Error('not_found');
      return info;
    });
  }

  function search(term, limit) {
    const t = tidy(term);
    const max = limit || 5;
    if (!t) return Promise.resolve([]);
    const q = 'term=' + encodeURIComponent(t) + '&media=music&limit=10';
    return Promise.all([
      fetchJson(ITUNES + '/search?' + q + '&country=kr').catch(function () { return null; }),
      fetchJson(ITUNES + '/search?' + q + '&country=us').catch(function () { return null; })
    ]).then(function (packs) {
      if (!packs[0] && !packs[1]) throw new Error('search_failed');
      const byKey = new Map();
      const order = [];
      packs.forEach(function (pack) {
        ((pack && pack.results) || []).forEach(function (r) {
          if (!r || !r.trackName || !r.artistName) return;
          const key = normName(r.artistName) + '|' + normName(r.trackName);
          const score = (r.kind === 'song' ? 2 : 0) + (r.kind === 'music-video' ? 1 : 0);
          const prev = byKey.get(key);
          if (!prev) {
            byKey.set(key, { r: r, score: score });
            order.push(key);
          } else if (score > prev.score) {
            byKey.set(key, { r: r, score: score });
          }
        });
      });
      const rows = order.map(function (k) { return byKey.get(k); });
      rows.sort(function (a, b) { return b.score - a.score; });
      return rows.slice(0, max).map(function (x) { return itunesResultToInfo(x.r); })
        .filter(function (x) { return x && x.title && x.artist; });
    });
  }

  /** 링크 하나를 곡 정보로 */
  function fromLink(raw) {
    const parsed = parseLink(raw);
    if (parsed.kind === 'youtube') return youtubeInfo(parsed.videoId);
    if (parsed.kind === 'spotify') return spotifyInfo(parsed.trackId);
    if (parsed.kind === 'apple') return appleInfo(parsed.id, parsed.cc);
    return Promise.reject(new Error('unsupported:' + parsed.kind));
  }

  global.MusicLookup = {
    parseLink: parseLink,
    fromLink: fromLink,
    youtubeInfo: youtubeInfo,
    spotifyInfo: spotifyInfo,
    appleInfo: appleInfo,
    search: search,
    loadImage: loadImage,
    loadCanvasImage: loadCanvasImage,
    isCanvasClean: isCanvasClean,
    stripNoise: stripNoise,
    splitArtistTitle: splitArtistTitle,
    normName: normName
  };
})(window);
