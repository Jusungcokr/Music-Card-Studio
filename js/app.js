/* 음악 카드뉴스 스튜디오 — 화면 동작 */
(function () {
  'use strict';

  const DATA = window.MusicData;
  const COLOR = window.MusicColor;
  const LOOKUP = window.MusicLookup || null;
  const RENDER = function (ctx, w, h, d, theme, accent, ratio, i) {
    window.MusicRender.render(ctx, w, h, d, theme, accent, ratio, i);
  };

  const LS_LIB = 'mcs.library.v1';
  const LS_PREFS = 'mcs.prefs.v1';
  const LS_STARTED = 'mcs.started.v1';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.prototype.slice.call(document.querySelectorAll(sel));

  const state = {
    title: '',
    artist: '',
    genre: '',
    year: '',
    lyrics: '',
    reason: '',
    tags: [],
    handle: '',
    ratio: '4:5',
    theme: 'vinyl',
    cover: null
  };

  let renderQueued = false;
  let toastTimer = null;
  const canvases = [$('#cv-0'), $('#cv-1'), $('#cv-2')];

  /* ---------- 유틸 ---------- */

  function themeById(id) {
    return DATA.THEMES.filter((t) => t.id === id)[0] || DATA.THEMES[0];
  }
  function ratioById(id) {
    return DATA.RATIOS.filter((r) => r.id === id)[0] || DATA.RATIOS[0];
  }

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  function sanitizeName(str) {
    return String(str || '')
      .replace(/[\\/:*?"<>|\n\r\t]/g, ' ')
      .replace(/\s+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || 'music_card';
  }

  function baseName() {
    return sanitizeName((state.artist || '아티스트') + '_' + (state.title || '곡'));
  }

  /* ---------- 렌더 ---------- */

  function currentAccent(theme) {
    const palette = state.cover && state.cover.palette ? state.cover.palette : null;
    return COLOR.harmonize(palette, theme.palette.accentFallback, theme.isDark);
  }

  function renderData() {
    return {
      title: state.title.trim(),
      artist: state.artist.trim(),
      genre: state.genre.trim(),
      year: state.year.trim(),
      lyrics: state.lyrics.trim(),
      reason: state.reason.trim(),
      tags: state.tags.slice(),
      handle: state.handle.trim(),
      coverImg: state.cover ? state.cover.img : null
    };
  }

  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(function () {
      renderQueued = false;
      renderAll();
    });
  }

  function renderAll() {
    const theme = themeById(state.theme);
    const ratio = ratioById(state.ratio);
    const accent = currentAccent(theme);
    const data = renderData();

    canvases.forEach(function (cv, i) {
      if (cv.width !== ratio.w || cv.height !== ratio.h) {
        cv.width = ratio.w;
        cv.height = ratio.h;
      }
      const ctx = cv.getContext('2d');
      RENDER(ctx, ratio.w, ratio.h, data, theme, accent, ratio.id, i);
    });

    $('#ratio-badge').textContent = ratio.id + ' · ' + ratio.w + '×' + ratio.h;
    updateCaptions(data);

    document.documentElement.style.setProperty('--card-accent', accent);
  }

  function updateCaptions(data) {
    const ig = window.MusicCaptions.instagram(data);
    const ytTitle = window.MusicCaptions.youtubeTitle(data);
    const ytDesc = window.MusicCaptions.youtubeDesc(data);
    $('#out-ig').textContent = ig;
    $('#out-yt-title').textContent = ytTitle;
    $('#out-yt-desc').textContent = ytDesc;
    $('#ig-count').textContent = ig.length + '자';
    $('#yt-title-count').textContent = ytTitle.length + '/100자';
    $('#yt-desc-count').textContent = ytDesc.length + '자';
  }

  /* ---------- 폼 값 동기화 ---------- */

  function syncFormFromState() {
    $('#f-title').value = state.title;
    $('#f-artist').value = state.artist;
    $('#f-genre').value = state.genre;
    $('#f-year').value = state.year;
    $('#f-lyrics').value = state.lyrics;
    $('#f-reason').value = state.reason;
    $('#f-handle').value = state.handle;
    updateCounters();
    renderTags();
  }

  function updateCounters() {
    $('#c-lyrics').textContent = state.lyrics.length + '/180';
    $('#c-reason').textContent = state.reason.length + '/220';
  }

  /* ---------- 태그 ---------- */

  function tagUniverse() {
    const extra = state.tags.filter(function (t) { return DATA.TAG_OPTIONS.indexOf(t) === -1; });
    return DATA.TAG_OPTIONS.concat(extra);
  }

  function renderTags() {
    const wrap = $('#tag-chips');
    wrap.innerHTML = '';
    const universe = tagUniverse();
    universe.forEach(function (tag) {
      const selected = state.tags.indexOf(tag) !== -1;
      const custom = DATA.TAG_OPTIONS.indexOf(tag) === -1;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chip';
      btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
      btn.dataset.tag = tag;
      btn.textContent = tag;
      if (custom) {
        const x = document.createElement('span');
        x.className = 'x';
        x.textContent = '✕';
        btn.appendChild(x);
      }
      btn.addEventListener('click', function () {
        toggleTag(tag);
      });
      wrap.appendChild(btn);
    });
    $('#tag-count').textContent = state.tags.length + '개 선택';
  }

  function toggleTag(tag) {
    const i = state.tags.indexOf(tag);
    if (i === -1) {
      if (state.tags.length >= 6) {
        toast('태그는 6개까지 넣을 수 있어요.');
        return;
      }
      state.tags.push(tag);
    } else {
      state.tags.splice(i, 1);
    }
    renderTags();
    scheduleRender();
  }

  function addCustomTag() {
    const input = $('#f-tag');
    const val = input.value.trim().replace(/^#/, '');
    if (!val) return;
    if (val.length > 12) { toast('태그는 12자 이내로 적어 주세요.'); return; }
    if (state.tags.indexOf(val) !== -1) { input.value = ''; return; }
    if (state.tags.length >= 6) { toast('태그는 6개까지 넣을 수 있어요.'); return; }
    state.tags.push(val);
    input.value = '';
    renderTags();
    scheduleRender();
  }

  /* ---------- 커버 ---------- */

  let coverInputTimer = null;

  function handleCoverFile(file) {
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast('이미지 파일만 올릴 수 있어요.'); return; }
    if (file.size > 20 * 1024 * 1024) { toast('20MB 이하 이미지를 사용해 주세요.'); return; }

    const reader = new FileReader();
    reader.onload = function () {
      const img = new Image();
      img.onload = function () {
        state.cover = {
          img: img,
          dataUrl: String(reader.result),
          name: file.name,
          size: file.size,
          palette: COLOR.extractColor(img)
        };
        paintCoverUI();
        scheduleRender();
        toast('커버를 넣었어요. 테마 색을 커버에 맞춰 조정합니다.');
      };
      img.onerror = function () { toast('이미지를 읽지 못했어요. 다른 파일로 시도해 주세요.'); };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function paintCoverUI() {
    const empty = $('#drop-empty');
    const filled = $('#drop-filled');
    const input = $('#f-cover');
    if (state.cover) {
      empty.hidden = true;
      filled.hidden = false;
      $('#cover-thumb').src = state.cover.dataUrl;
      $('#cover-name').textContent = state.cover.name;
      const sizeText = state.cover.size
        ? Math.max(1, Math.round(state.cover.size / 1024)) + 'KB'
        : (state.cover.source === 'link' ? '링크에서 가져온 커버' : '이미지');
      $('#cover-size').textContent = sizeText + ' · 커버 색에 맞춰 테마를 조정했어요';
    } else {
      empty.hidden = false;
      filled.hidden = true;
      $('#cover-thumb').removeAttribute('src');
      if (input) input.value = '';
    }
  }

  function removeCover() {
    state.cover = null;
    paintCoverUI();
    scheduleRender();
    toast('커버를 지웠어요. LP 그래픽으로 대신 채웁니다.');
  }

  function bindDropzone() {
    const drop = $('#drop');
    const input = $('#f-cover');

    drop.addEventListener('click', function (e) {
      if (e.target.closest('#btn-cover-remove')) return;
      input.click();
    });
    drop.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    input.addEventListener('change', function () {
      if (input.files && input.files[0]) handleCoverFile(input.files[0]);
    });
    $('#btn-cover-remove').addEventListener('click', function (e) {
      e.stopPropagation();
      removeCover();
    });

    ['dragenter', 'dragover'].forEach(function (type) {
      drop.addEventListener(type, function (e) {
        e.preventDefault();
        drop.classList.add('over');
      });
    });
    ['dragleave', 'drop'].forEach(function (type) {
      drop.addEventListener(type, function (e) {
        e.preventDefault();
        if (type === 'dragleave' && drop.contains(e.relatedTarget)) return;
        drop.classList.remove('over');
      });
    });
    drop.addEventListener('drop', function (e) {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handleCoverFile(f);
    });

    document.addEventListener('paste', function (e) {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image/') === 0) {
          const f = items[i].getAsFile();
          if (f) { handleCoverFile(f); e.preventDefault(); }
          break;
        }
      }
    });
  }

  /* ---------- 곡 링크 · 음원 검색 자동 채우기 ---------- */

  const PROVIDER_LABEL = { youtube: '유튜브', spotify: '스포티파이', apple: '애플뮤직' };

  function setNote(text, tone) {
    const el = $('#link-note');
    if (!el) return;
    el.textContent = text;
    el.className = 'autofill-note' + (tone ? ' ' + tone : '');
  }

  function setBusy(kind, on) {
    const btn = kind === 'link' ? $('#btn-link-load') : $('#btn-search');
    if (!btn) return;
    if (on) {
      if (!btn.dataset.label) btn.dataset.label = btn.textContent;
      btn.disabled = true;
      btn.textContent = kind === 'link' ? '불러오는 중…' : '찾는 중…';
    } else {
      btn.disabled = false;
      if (btn.dataset.label) btn.textContent = btn.dataset.label;
    }
  }

  function clip(str, max) {
    return String(str || '').slice(0, max);
  }

  async function loadCoverFromUrls(urls, label) {
    if (!LOOKUP) return false;
    const list = (Array.isArray(urls) ? urls : [urls]).filter(Boolean);
    for (let i = 0; i < list.length; i++) {
      try {
        const img = await LOOKUP.loadCanvasImage(list[i]);
        let dataUrl = '';
        try { dataUrl = imageDataUrl(img, 900, 0.9); } catch (e) { dataUrl = ''; }
        state.cover = {
          img: img,
          dataUrl: dataUrl || list[i],
          name: label || '앨범 커버',
          size: 0,
          palette: COLOR.extractColor(img),
          source: 'link'
        };
        paintCoverUI();
        scheduleRender();
        return true;
      } catch (e) {
        /* 다음 후보 이미지로 */
      }
    }
    return false;
  }

  async function applySongInfo(info, sourceLabel) {
    if (!info) return false;
    if (!info.title && !info.artist) {
      if (info.coverUrls && info.coverUrls.length) {
        const ok = await loadCoverFromUrls(info.coverUrls, '유튜브 썸네일');
        if (ok) {
          setNote('제목은 가져오지 못했지만 썸네일을 커버로 넣었어요. 곡명과 아티스트는 직접 적어 주세요.', 'warn');
          toast('썸네일만 넣었어요. 곡명은 직접 적어 주세요.');
          return true;
        }
      }
      setNote('곡 정보를 읽지 못했어요. 아래 곡명 검색이나 직접 입력을 이용해 주세요.', 'warn');
      toast('곡 정보를 읽지 못했어요. 검색으로 찾아보세요.');
      return false;
    }

    if (info.title) state.title = clip(info.title, 60);
    if (info.artist) state.artist = clip(info.artist, 40);
    if (info.year) state.year = clip(info.year, 4);
    if (info.genre) state.genre = clip(info.genre, 20);
    syncFormFromState();
    scheduleRender();

    let coverOk = false;
    if (info.coverUrls && info.coverUrls.length) {
      coverOk = await loadCoverFromUrls(info.coverUrls, info.title ? info.title + ' 커버' : '앨범 커버');
    }

    const name = [info.artist, info.title].filter(Boolean).join(' - ');
    const where = sourceLabel || PROVIDER_LABEL[info.provider === 'YouTube' ? 'youtube' : info.provider === 'Spotify' ? 'spotify' : 'apple'] || '링크';
    let line = where + '에서 ‘' + name + '’을(를) 채웠어요';
    if (coverOk) line += ' · 앨범 커버도 넣었어요.';
    else line += ' · 커버는 직접 올려 주세요.';
    if (info.note) line += ' (' + info.note + ')';
    setNote(line, coverOk ? 'ok' : '');
    toast('곡 정보를 채웠어요. 필요하면 다듬어 주세요.');
    savePrefs();
    return true;
  }

  function showBlockedNote(reason) {
    setNote('이 사이트 링크는 브라우저 보안상 직접 불러올 수 없어, 아래 곡명 검색이나 직접 입력을 이용해 주세요.', 'warn');
    toast(reason ? reason + ' 링크는 바로 불러올 수 없어요.' : '이 링크는 바로 불러올 수 없어요.');
  }

  async function fillFromLink(raw) {
    const value = String(raw || '').trim();
    if (!value) {
      setNote('곡 링크를 붙여 넣어 주세요.', 'warn');
      $('#f-link').focus();
      return;
    }
    if (!LOOKUP) {
      setNote('자동 채우기 도구를 불러오지 못했어요. 페이지를 새로고침해 주세요.', 'warn');
      return;
    }

    const parsed = LOOKUP.parseLink(value);

    if (parsed.kind === 'blocked') { showBlockedNote(parsed.site); return; }
    if (parsed.kind === 'unknown') { showBlockedNote(parsed.host); return; }
    if (parsed.kind === 'spotify-other') {
      setNote('스포티파이는 곡(track) 링크만 바로 불러올 수 있어요. 곡을 열어 주소를 다시 복사하거나 아래 곡명 검색을 이용해 주세요.', 'warn');
      return;
    }
    if (parsed.kind === 'apple-page') {
      setNote('애플뮤직 곡 번호(?i=…)를 찾지 못했어요. 곡 화면에서 주소를 다시 복사하거나 아래 곡명 검색을 이용해 주세요.', 'warn');
      return;
    }
    if (parsed.kind === 'invalid') {
      setNote('링크를 알아보지 못했어요. 주소 전체를 붙여 넣어 주세요.', 'warn');
      return;
    }

    setBusy('link', true);
    setNote('링크에서 곡 정보를 가져오는 중…');
    try {
      const info = await LOOKUP.fromLink(value);
      await applySongInfo(info, PROVIDER_LABEL[parsed.kind] || '링크');
    } catch (e) {
      setNote('링크에서 곡 정보를 가져오지 못했어요. 잠시 뒤 다시 시도하거나 아래 곡명 검색을 이용해 주세요.', 'warn');
      toast('곡 정보를 가져오지 못했어요.');
    } finally {
      setBusy('link', false);
    }
  }

  async function runSearch() {
    const input = $('#f-search');
    const term = input.value.trim();
    if (!term) {
      toast('곡명이나 아티스트를 먼저 적어 주세요.');
      input.focus();
      return;
    }
    if (!LOOKUP) {
      setNote('음원 검색 도구를 불러오지 못했어요. 페이지를 새로고침해 주세요.', 'warn');
      return;
    }
    setBusy('search', true);
    setNote('애플뮤직에서 ‘' + term + '’을(를) 찾는 중…');
    try {
      const list = await LOOKUP.search(term, 5);
      renderSearchResults(list, term);
    } catch (e) {
      renderSearchResults([], term);
    } finally {
      setBusy('search', false);
    }
  }

  function renderSearchResults(list, term) {
    const wrap = $('#search-results');
    wrap.innerHTML = '';
    if (!list || !list.length) {
      wrap.hidden = true;
      setNote('‘' + term + '’에 맞는 곡을 찾지 못했어요. 다른 검색어로 시도해 주세요.', 'warn');
      return;
    }
    wrap.hidden = false;
    list.forEach(function (info) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sr-btn';
      const cover = info.coverUrls && info.coverUrls[0];
      const thumb = cover
        ? '<img class="sr-thumb" src="' + escapeHtml(cover) + '" alt="" loading="lazy" referrerpolicy="no-referrer">'
        : '<span class="sr-thumb empty" aria-hidden="true">♪</span>';
      const meta = [info.artist, info.year, info.genre].filter(Boolean).join(' · ');
      btn.innerHTML = thumb +
        '<span class="sr-text"><strong>' + escapeHtml(info.title) + '</strong>' +
        '<small>' + escapeHtml(meta) + '</small></span>' +
        '<span class="sr-go">넣기</span>';
      btn.setAttribute('aria-label', info.title + ' - ' + info.artist + ' 정보 넣기');
      btn.addEventListener('click', function () { chooseSearchResult(info); });
      li.appendChild(btn);
      wrap.appendChild(li);
    });
    setNote('‘' + term + '’ 검색 결과 ' + list.length + '개 · 넣을 곡을 눌러 주세요.', 'ok');
  }

  async function chooseSearchResult(info) {
    setNote('곡 정보를 채우는 중…');
    await applySongInfo(info, '애플뮤직');
  }

  function bindAutofill() {
    const linkInput = $('#f-link');
    const searchInput = $('#f-search');
    const form = $('#song-form');

    if (form) {
      form.addEventListener('submit', function (e) { e.preventDefault(); });
    }

    if (!linkInput) return;    linkInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        fillFromLink(linkInput.value);
      }
    });
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        runSearch();
      }
    });

    $('#btn-link-load').addEventListener('click', function () { fillFromLink(linkInput.value); });
    $('#btn-search').addEventListener('click', runSearch);

    // 링크를 붙여 넣으면 바로 시도
    linkInput.addEventListener('paste', function () {
      setTimeout(function () {
        const value = linkInput.value.trim();
        if (!value || !LOOKUP) return;
        const kind = LOOKUP.parseLink(value).kind;
        if (kind === 'youtube' || kind === 'spotify' || kind === 'apple' || kind === 'blocked' || kind === 'unknown' || kind === 'spotify-other') {
          fillFromLink(value);
        }
      }, 40);
    });
  }

  /* ---------- 비율 & 테마 버튼 ---------- */

  function shapeClass(id) {
    if (id === '4:5') return 's45';
    if (id === '1:1') return 's11';
    return 's916';
  }

  function buildControls() {
    const ratioWrap = $('#ratio-list');
    DATA.RATIOS.forEach(function (r) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg-btn';
      b.dataset.ratio = r.id;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', state.ratio === r.id ? 'true' : 'false');
      b.title = r.name + ' ' + r.desc;
      b.innerHTML = '<span class="shape ' + shapeClass(r.id) + '"></span>' +
        '<span class="ratio-txt"><b>' + r.id + '</b><small>' + r.name + '</small></span>';
      b.addEventListener('click', function () { setRatio(r.id); });
      ratioWrap.appendChild(b);
    });

    const themeWrap = $('#theme-list');
    DATA.THEMES.forEach(function (t) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'theme-btn';
      b.dataset.theme = t.id;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', state.theme === t.id ? 'true' : 'false');
      b.title = t.name + ' · ' + t.hint;
      b.innerHTML = '<span class="theme-swatch" style="background:linear-gradient(140deg,' + t.swatch[0] + ' 0%,' + t.swatch[1] + ' 62%,' + t.swatch[2] + ' 100%)"></span>' +
        '<span class="theme-name">' + t.name + '</span>';
      b.addEventListener('click', function () { setTheme(t.id); });
      themeWrap.appendChild(b);
    });
  }

  function refreshControlStates() {
    $$('#ratio-list .seg-btn').forEach(function (b) {
      b.setAttribute('aria-checked', b.dataset.ratio === state.ratio ? 'true' : 'false');
    });
    $$('#theme-list .theme-btn').forEach(function (b) {
      b.setAttribute('aria-checked', b.dataset.theme === state.theme ? 'true' : 'false');
    });
  }

  function setRatio(id) {
    if (state.ratio === id) return;
    state.ratio = id;
    refreshControlStates();
    savePrefs();
    scheduleRender();
  }

  function setTheme(id) {
    if (state.theme === id) return;
    state.theme = id;
    refreshControlStates();
    savePrefs();
    scheduleRender();
  }

  /* ---------- 예시 ---------- */

  function buildExamples() {
    const wrap = $('#example-list');
    DATA.EXAMPLES.forEach(function (ex) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'quick-btn';
      b.dataset.example = ex.id;
      b.innerHTML = '<span class="q-emoji" aria-hidden="true">' + ex.emoji + '</span>' +
        '<span class="q-text"><strong>' + ex.label + '</strong><small>' + ex.desc + '</small></span>' +
        '<span class="q-plus" aria-hidden="true">＋</span>';
      b.addEventListener('click', function () { applyExample(ex); });
      wrap.appendChild(b);
    });
  }

  function applyExample(ex, silent) {
    const d = ex.data;
    state.title = d.title;
    state.artist = d.artist;
    state.genre = d.genre;
    state.year = d.year;
    state.lyrics = d.lyrics;
    state.reason = d.reason;
    state.tags = d.tags.slice();
    state.handle = d.handle;
    state.cover = null;
    if (ex.theme) state.theme = ex.theme;
    if (ex.ratio) state.ratio = ex.ratio;

    paintCoverUI();
    syncFormFromState();
    refreshControlStates();
    savePrefs();
    scheduleRender();
    if (!silent) toast(ex.emoji + ' ' + ex.label + ' 예시를 채웠어요.');
  }

  function resetAll() {
    state.title = '';
    state.artist = '';
    state.genre = '';
    state.year = '';
    state.lyrics = '';
    state.reason = '';
    state.tags = [];
    state.handle = '';
    state.cover = null;
    paintCoverUI();
    syncFormFromState();
    const results = $('#search-results');
    if (results) { results.innerHTML = ''; results.hidden = true; }
    const linkInput = $('#f-link');
    if (linkInput) linkInput.value = '';
    setNote('링크를 붙여 넣으면 곡명·아티스트·앨범 커버가 한 번에 채워져요.');
    savePrefs();
    scheduleRender();
    toast('새 카드로 비웠어요.');
    $('#f-title').focus();
  }

  /* ---------- 보관함 ---------- */

  function readLibrary() {
    try {
      const raw = localStorage.getItem(LS_LIB);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function writeLibrary(list) {
    try {
      localStorage.setItem(LS_LIB, JSON.stringify(list));
      return true;
    } catch (e) {
      toast('저장 공간이 부족해요. 보관함의 오래된 곡을 지운 뒤 다시 시도해 주세요.');
      return false;
    }
  }

  function imageDataUrl(img, max, quality) {
    const limit = max || 900;
    const w = img.naturalWidth || limit;
    const h = img.naturalHeight || limit;
    const scale = Math.min(1, limit / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * scale));
    c.height = Math.max(1, Math.round(h * scale));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', quality || 0.82);
  }

  function coverForStorage() {
    if (!state.cover) return null;
    try {
      return imageDataUrl(state.cover.img, 900, 0.82);
    } catch (e) {
      return null;
    }
  }

  function saveCurrent() {
    if (!state.title.trim()) {
      toast('곡명을 먼저 입력해 주세요.');
      $('#f-title').focus();
      return;
    }
    const item = {
      id: String(Date.now()),
      savedAt: new Date().toISOString(),
      title: state.title.trim(),
      artist: state.artist.trim(),
      genre: state.genre.trim(),
      year: state.year.trim(),
      lyrics: state.lyrics,
      reason: state.reason,
      tags: state.tags.slice(),
      handle: state.handle,
      theme: state.theme,
      ratio: state.ratio,
      cover: coverForStorage()
    };
    const lib = readLibrary();
    const idx = lib.findIndex(function (x) {
      return x.title === item.title && (x.artist || '') === item.artist;
    });
    if (idx !== -1) {
      item.id = lib[idx].id;
      lib[idx] = item;
    } else {
      lib.unshift(item);
    }
    const trimmed = lib.slice(0, 40);
    if (!writeLibrary(trimmed)) return;
    renderLibrary();
    toast(idx !== -1 ? '같은 곡을 최신 내용으로 바꿨어요.' : '보관함에 저장했어요.');
  }

  function renderLibrary() {
    const lib = readLibrary();
    const list = $('#lib-list');
    list.innerHTML = '';
    $('#lib-count').textContent = String(lib.length);
    $('#lib-empty').hidden = lib.length > 0;

    lib.forEach(function (item) {
      const li = document.createElement('li');
      li.className = 'lib-item';
      li.dataset.id = item.id;

      const thumb = item.cover
        ? '<img class="lib-thumb" src="' + item.cover + '" alt="">'
        : '<span class="lib-thumb empty" aria-hidden="true">♪</span>';

      li.innerHTML = thumb +
        '<span class="lib-text"><strong>' + escapeHtml(item.title) + '</strong>' +
        '<small>' + escapeHtml(item.artist || '아티스트 미입력') + (item.genre ? ' · ' + escapeHtml(item.genre) : '') + '</small></span>';

      const loadBtn = document.createElement('button');
      loadBtn.type = 'button';
      loadBtn.className = 'btn tiny';
      loadBtn.textContent = '불러오기';
      loadBtn.addEventListener('click', function () { loadItem(item); });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'icon-btn';
      delBtn.setAttribute('aria-label', item.title + ' 삭제');
      delBtn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>';
      delBtn.addEventListener('click', function () { deleteItem(item.id); });

      li.appendChild(loadBtn);
      li.appendChild(delBtn);
      list.appendChild(li);
    });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function loadItem(item) {
    state.title = item.title || '';
    state.artist = item.artist || '';
    state.genre = item.genre || '';
    state.year = item.year || '';
    state.lyrics = item.lyrics || '';
    state.reason = item.reason || '';
    state.tags = Array.isArray(item.tags) ? item.tags.slice() : [];
    state.handle = item.handle || '';
    if (item.theme) state.theme = item.theme;
    if (item.ratio) state.ratio = item.ratio;

    if (item.cover) {
      const img = new Image();
      img.onload = function () {
        state.cover = {
          img: img,
          dataUrl: item.cover,
          name: item.title + ' 커버',
          size: 0,
          palette: COLOR.extractColor(img)
        };
        paintCoverUI();
        scheduleRender();
      };
      img.src = item.cover;
      state.cover = null;
      paintCoverUI();
    } else {
      state.cover = null;
      paintCoverUI();
    }

    syncFormFromState();
    refreshControlStates();
    savePrefs();
    scheduleRender();
    toast('“' + item.title + '”을(를) 불러왔어요.');
  }

  function deleteItem(id) {
    const lib = readLibrary().filter(function (x) { return x.id !== id; });
    if (!writeLibrary(lib)) return;
    renderLibrary();
    toast('보관함에서 지웠어요.');
  }

  /* ---------- 저장 & 다운로드 ---------- */

  function canvasBlob(canvas) {
    return new Promise(function (resolve, reject) {
      try {
        canvas.toBlob(function (blob) {
          if (blob) resolve(blob);
          else reject(new Error('blob'));
        }, 'image/png');
      } catch (e) { reject(e); }
    });
  }

  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1500);
  }

  function cardFileName(i) {
    const labels = ['표지', '킬링포인트', '큐레이션'];
    return baseName() + '_' + String(i + 1).padStart(2, '0') + '_' + labels[i] + '.png';
  }

  async function downloadCard(i) {
    try {
      const blob = await canvasBlob(canvases[i]);
      saveBlob(blob, cardFileName(i));
      toast((i + 1) + '번 카드를 PNG로 저장했어요.');
    } catch (e) {
      toast('저장에 실패했어요. 다시 시도해 주세요.');
    }
  }

  async function downloadAll() {
    for (let i = 0; i < 3; i++) {
      await downloadCard(i);
      await new Promise(function (r) { setTimeout(r, 420); });
    }
  }

  async function downloadZip() {
    const btn = $('#btn-download-zip');
    const old = btn.textContent;
    btn.disabled = true;

    try {
      const blobs = [];
      for (let i = 0; i < 3; i++) blobs.push(await canvasBlob(canvases[i]));

      if (window.JSZip) {
        const zip = new JSZip();
        const folder = zip.folder(baseName());
        blobs.forEach(function (blob, i) { folder.file(cardFileName(i), blob); });
        const out = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
        saveBlob(out, baseName() + '_카드뉴스.zip');
        toast('3장을 ZIP 한 파일로 저장했어요.');
      } else {
        for (let i = 0; i < 3; i++) {
          saveBlob(blobs[i], cardFileName(i));
          await new Promise(function (r) { setTimeout(r, 420); });
        }
        toast('ZIP 도구를 불러오지 못해 3장을 따로 저장했어요.');
      }
    } catch (e) {
      toast('압축 저장에 실패했어요. 잠시 뒤 다시 시도해 주세요.');
    } finally {
      btn.disabled = false;
      btn.textContent = old;
    }
  }

  /* ---------- 복사 ---------- */

  async function copyText(text) {
    if (!text) return false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* 폴백으로 진행 */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-2000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, text.length);
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  }

  async function copyBlock(btn) {
    const key = btn.dataset.copy;
    const map = { ig: '#out-ig', 'yt-title': '#out-yt-title', 'yt-desc': '#out-yt-desc' };
    const el = $(map[key]);
    if (!el) return;
    const ok = await copyText(el.textContent);
    const old = btn.textContent;
    btn.textContent = ok ? '복사됨 ✓' : '복사 실패';
    setTimeout(function () { btn.textContent = old; }, 1600);
    toast(ok ? '클립보드에 복사했어요.' : '복사가 막혀 있어요. 문구를 길게 눌러 복사해 주세요.');
  }

  /* ---------- 환경 설정 저장 ---------- */

  function savePrefs() {
    try {
      localStorage.setItem(LS_PREFS, JSON.stringify({ theme: state.theme, ratio: state.ratio }));
    } catch (e) { /* 무시 */ }
  }

  function readPrefs() {
    try {
      return JSON.parse(localStorage.getItem(LS_PREFS) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  /* ---------- 이벤트 연결 ---------- */

  function bindFields() {
    const bindText = function (id, key) {
      const el = $(id);
      el.addEventListener('input', function () {
        state[key] = el.value;
        if (key === 'lyrics' || key === 'reason') updateCounters();
        scheduleRender();
      });
    };

    bindText('#f-title', 'title');
    bindText('#f-artist', 'artist');
    bindText('#f-genre', 'genre');
    bindText('#f-lyrics', 'lyrics');
    bindText('#f-reason', 'reason');

    $('#f-year').addEventListener('input', function (e) {
      const cleaned = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
      e.target.value = cleaned;
      state.year = cleaned;
      scheduleRender();
    });

    $('#f-handle').addEventListener('input', function (e) {
      const cleaned = e.target.value.replace(/^@+/, '').replace(/[^0-9A-Za-z._-]/g, '');
      if (e.target.value !== cleaned) e.target.value = cleaned;
      state.handle = cleaned;
      scheduleRender();
    });

    $('#btn-tag-add').addEventListener('click', addCustomTag);
    $('#f-tag').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        addCustomTag();
      }
    });

    $('#btn-save').addEventListener('click', saveCurrent);
    $('#btn-reset').addEventListener('click', resetAll);

    $('#btn-download-all').addEventListener('click', downloadAll);
    $('#btn-download-zip').addEventListener('click', downloadZip);

    $$('[data-download]').forEach(function (btn) {
      btn.addEventListener('click', function () { downloadCard(Number(btn.dataset.download)); });
    });
    $$('[data-copy]').forEach(function (btn) {
      btn.addEventListener('click', function () { copyBlock(btn); });
    });
  }

  /* ---------- 시작 ---------- */

  function init() {
    buildControls();
    buildExamples();
    bindFields();
    bindDropzone();
    bindAutofill();

    const genres = $('#genre-list');
    DATA.GENRES.forEach(function (g) {
      const opt = document.createElement('option');
      opt.value = g;
      genres.appendChild(opt);
    });

    const prefs = readPrefs();
    if (prefs.theme && DATA.THEMES.some(function (t) { return t.id === prefs.theme; })) state.theme = prefs.theme;
    if (prefs.ratio && DATA.RATIOS.some(function (r) { return r.id === prefs.ratio; })) state.ratio = prefs.ratio;

    let started = null;
    try { started = localStorage.getItem(LS_STARTED); } catch (e) { started = '1'; }

    if (!started) {
      applyExample(DATA.EXAMPLES[0], true);
      try { localStorage.setItem(LS_STARTED, '1'); } catch (e) { /* 무시 */ }
    } else {
      syncFormFromState();
      refreshControlStates();
    }

    renderLibrary();
    renderAll();

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { scheduleRender(); });
      if (document.fonts.load) {
        document.fonts.load('700 40px Pretendard').then(function () { scheduleRender(); }).catch(function () {});
        document.fonts.load('400 20px Pretendard').then(function () { scheduleRender(); }).catch(function () {});
      }
    }

    window.addEventListener('resize', function () { scheduleRender(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
