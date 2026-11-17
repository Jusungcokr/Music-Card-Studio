/* 음악 카드뉴스 스튜디오 — 추천 이유·무드 태그 자동 작성 (담백한 큐레이션 톤) */
(function (global) {
  'use strict';

  const DATA = global.MusicData;
  const LYR = global.MusicLyrics || null;

  /* ---------- 장르 ---------- */

  const GENRE_KEYS = [
    { key: 'R&B', test: /r\s*&\s*b|soul|알앤비/i },
    { key: '힙합', test: /hip.?hop|rap|힙합/i },
    { key: '시티팝', test: /city\s*pop|시티팝/i },
    { key: '발라드', test: /ballad|발라드/i },
    { key: '인디 록', test: /indie|alternative|인디/i },
    { key: '재즈', test: /jazz|재즈/i },
    { key: '일렉트로닉', test: /electronic|dance|house|techno|edm|일렉/i },
    { key: '포크', test: /folk|acoustic|싱어송|포크/i },
    { key: '클래식', test: /classical|클래식|orchestra/i },
    { key: 'OST', test: /soundtrack|ost|score|영화|드라마/i },
    { key: '록', test: /rock|metal|록/i },
    { key: 'K-POP', test: /k.?pop|케이팝/i }
  ];

  function genreKey(genre) {
    const g = String(genre || '');
    if (!g) return '';
    for (let i = 0; i < GENRE_KEYS.length; i++) {
      if (GENRE_KEYS[i].test.test(g)) return GENRE_KEYS[i].key;
    }
    return '';
  }

  const SOUND = {
    'R&B': ['저음 보컬과 느린 리듬이 중심을 잡아 줍니다.', '보컬이 낮게 가라앉는 대목에서 곡의 온도가 정해집니다.'],
    '힙합': ['비트가 단단하고 라임이 또렷해서 귀에 남습니다.', '저음이 두텁게 깔려 있어서 흐름을 놓치기 어려워요.'],
    '시티팝': ['베이스라인이 경쾌해서 기분이 조금 올라갑니다.', '신스와 기타가 번갈아 나오는 구성이 산뜻해요.'],
    '발라드': ['보컬이 앞으로 나오고 반주는 뒤로 물러나 있어요.', '후반으로 갈수록 감정이 한 겹씩 쌓이는 구성이에요.'],
    '인디 록': ['기타 톤이 살아 있어서 반복해서 들어도 질리지 않아요.', '드럼이 앞에서 끌고 가는 맛이 있어요.'],
    '재즈': ['드럼과 피아노 사이의 여백이 편안합니다.', '즉흥적인 흐름이 있어서 들을 때마다 조금씩 다르게 들려요.'],
    '일렉트로닉': ['신스가 만드는 공간감이 넓어서 귀가 편합니다.', '저역이 깔끔하게 정리돼 있어요.'],
    '포크': ['기타 한 대와 목소리만으로 끝까지 갑니다.', '꾸밈이 적어서 목소리가 그대로 들려요.'],
    '클래식': ['현악의 결이 고르게 이어져서 듣는 내내 안정적이에요.', '선율이 크게 흔들리지 않아 편안하게 들려요.'],
    'OST': ['장면이 떠오르는 선율이 남습니다.', '영상 없이 들어도 이야기가 그려지는 편이에요.'],
    '록': ['기타가 터지는 대목에서 힘이 붙습니다.', '드럼과 베이스가 단단하게 받쳐 줍니다.'],
    'K-POP': ['후렴이 한 번에 기억되는 구성이에요.', '파트가 자주 바뀌어서 지루할 틈이 없어요.']
  };
  const SOUND_DEFAULT = ['전체적으로 과하지 않게 정리된 편곡이에요.', '처음부터 끝까지 톤이 일정해서 듣기 편해요.'];

  /* ---------- 상황·장면 ---------- */

  const SCENES = [
    { id: 'dawn', tags: ['새벽'], kw: ['새벽'],
      long: '잠이 안 오는 새벽, 불을 끄고 가만히 듣기 좋아요.',
      short: '해가 뜨기 전 조용한 시간에 잘 어울려요.' },
    { id: 'night', tags: ['늦은 밤'], kw: ['밤'],
      long: '하루를 접기 전, 이어폰 볼륨을 조금 낮추고 듣기 좋은 곡이에요.',
      short: '잠들기 전 마지막 한 곡으로 무난해요.' },
    { id: 'rain', tags: ['비 오는 날'], kw: ['비'],
      long: '비가 오는 날 창가에 앉아 있을 때 잘 어울려요.',
      short: '빗소리와 같이 틀어 두면 편안합니다.' },
    { id: 'breakup', tags: ['이별'], kw: ['이별'],
      long: '정리되지 않는 마음이 남아 있을 때 곁에 두게 되는 곡이에요.',
      short: '이별을 정리하는 중이라면 한 번쯤 틀어 볼 만해요.' },
    { id: 'love', tags: ['설렘'], kw: ['사랑'],
      long: '설레는 마음이 남아 있는 날에 잘 맞아요.',
      short: '좋아하는 마음이 있는 날 듣기 좋아요.' },
    { id: 'walk', tags: ['산책'], kw: ['산책'],
      long: '이어폰 끼고 동네를 한 바퀴 돌 때 발걸음과 잘 맞아요.',
      short: '가볍게 걷는 시간에 두고 듣기 좋아요.' },
    { id: 'drive', tags: ['드라이브'], kw: ['드라이브'],
      long: '창문을 열고 달릴 때 듣기 좋아요.',
      short: '차 안에서 틀어 두면 이동이 지루하지 않아요.' },
    { id: 'commuteAm', tags: ['출근길'], kw: [],
      long: '아침 버스나 지하철에서 하루를 시작할 때 무난하게 어울려요.',
      short: '출근길 잡생각을 덜어 주는 정도의 곡이에요.' },
    { id: 'commutePm', tags: ['퇴근길'], kw: [],
      long: '퇴근길에 이어폰을 끼고 걷기 좋은 속도예요.',
      short: '하루 끝에 걸으면서 듣기 좋아요.' },
    { id: 'cafe', tags: ['카페'], kw: [],
      long: '카페에서 책을 펴 놓고 들으면 배경처럼 잘 깔려요.',
      short: '커피 한 잔 옆에 두기 좋아요.' },
    { id: 'focus', tags: ['집중', '공부'], kw: [],
      long: '책상에 앉아 집중해야 할 때 방해되지 않는 편이에요.',
      short: '공부나 작업할 때 틀어 두면 좋아요.' },
    { id: 'workout', tags: ['운동'], kw: [],
      long: '러닝이나 운동할 때 페이스를 조금 올려 주는 편이에요.',
      short: '몸을 움직이는 날 시작곡으로 괜찮아요.' },
    { id: 'comfort', tags: ['위로', '힐링'], kw: ['위로'],
      long: '지친 하루 끝에 아무 말 없이 틀어 두기 좋아요.',
      short: '기운이 없을 때 조용히 곁에 두는 곡이에요.' },
    { id: 'winter', tags: ['겨울'], kw: ['겨울'],
      long: '찬 바람 부는 날, 따뜻한 방에서 듣기 좋아요.',
      short: '겨울 저녁에 창문 닫고 듣기 좋아요.' },
    { id: 'summer', tags: ['여름'], kw: ['여름'],
      long: '해 질 무렵 선선해진 공기에 잘 맞아요.',
      short: '더운 날 저녁, 바람이 불 때 어울려요.' },
    { id: 'sunset', tags: ['노을'], kw: ['노을'],
      long: '해가 지는 시간, 창밖을 보며 듣기 좋아요.',
      short: '노을을 보며 듣기 좋은 곡이에요.' },
    { id: 'travel', tags: ['여행'], kw: ['바다'],
      long: '낯선 거리를 걸을 때나 이동하는 차 안에서 잘 어울려요.',
      short: '여행지에서 틀어 두기 좋아요.' }
  ];

  const SCENE_DEFAULT = {
    long: '오늘 한 번 다시 들어보기 좋은 곡이에요.',
    short: '플레이리스트 한 칸에 두기 좋은 곡이에요.'
  };

  function pickScene(tags, kws) {
    const tagList = tags || [];
    for (let i = 0; i < tagList.length; i++) {
      for (let s = 0; s < SCENES.length; s++) {
        if (SCENES[s].tags.indexOf(tagList[i]) !== -1) return SCENES[s];
      }
    }
    for (let k = 0; k < (kws || []).length; k++) {
      for (let s = 0; s < SCENES.length; s++) {
        if (SCENES[s].kw.indexOf(kws[k]) !== -1) return SCENES[s];
      }
    }
    return SCENE_DEFAULT;
  }

  /* ---------- 가사 인용 ---------- */

  function quoteFrom(lyrics) {
    const line = String(lyrics || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean)[0] || '';
    if (!line) return '';
    let q = line.replace(/[.!?~,]+$/, '').trim();
    if (q.length > 24) q = q.slice(0, 23).replace(/[\s,·]$/, '') + '…';
    return q;
  }

  /* ---------- 추천 이유 ---------- */

  function yearClause(year) {
    const y = parseInt(String(year || '').replace(/[^0-9]/g, ''), 10);
    if (!y || y < 1950) return '';
    const age = new Date().getFullYear() - y;
    if (age < 6 || age > 45) return '';
    return '발매한 지 ' + age + '년이 지났는데도 지금 들어도 어색하지 않아요.';
  }

  function trimResult(text) {
    let t = String(text || '').replace(/\s+/g, ' ').trim();
    if (t.length <= 200) return t;
    const parts = t.match(/[^.!?]+[.!?]?/g) || [t];
    while (parts.length > 1 && parts.join('').trim().length > 200) parts.shift();
    t = parts.join('').trim();
    if (t.length > 200) t = t.slice(0, 197).replace(/[\s,·]$/, '') + '…';
    return t;
  }

  /**
   * 추천 이유 문구 생성.
   * variant 를 올리면 문장 구성·어투가 달라진 다른 버전이 나온다.
   */
  function build(input, variant) {
    const src = input || {};
    const v = ((variant || 0) % 6 + 6) % 6;
    const tags = src.tags || [];
    const kws = src.lyricKeywords || (LYR ? LYR.keywordsOf(src.lyrics || '') : []);
    const scene = pickScene(tags.concat(kws), kws);
    const soundPack = SOUND[genreKey(src.genre)] || SOUND_DEFAULT;
    const sound0 = soundPack[0];
    const sound1 = soundPack[1] || soundPack[0];
    const quote = quoteFrom(src.lyrics);
    const lyricClause = quote ? '가사에서 ‘' + quote + '’ 대목이 오래 남습니다.' : '';
    const yc = yearClause(src.year);

    const long = scene.long || SCENE_DEFAULT.long;
    const short = scene.short || SCENE_DEFAULT.short;

    let out = '';
    if (v === 0) {
      out = long + ' ' + sound0;
    } else if (v === 1) {
      out = sound1 + ' ' + short;
    } else if (v === 2) {
      out = (lyricClause || long) + ' ' + sound0;
    } else if (v === 3) {
      out = yc ? yc + ' ' + short : sound1 + ' ' + short;
    } else if (v === 4) {
      const gk = genreKey(src.genre);
      out = gk ? '장르로 보면 ' + gk + ' 쪽인데, ' + sound0 : long + ' ' + sound0;
    } else {
      out = sound1 + ' ' + long;
    }
    return trimResult(out);
  }

  /** 고를 수 있는 버전 6개를 한 번에 (UI에서 미리보기용) */
  function allVariants(input) {
    const out = [];
    for (let i = 0; i < 6; i++) out.push(build(input, i));
    return out;
  }

  /* ---------- 무드 태그 ---------- */

  const GENRE_TAGS = {
    'R&B': ['늦은 밤', '감성'],
    '힙합': ['운동', '드라이브'],
    '시티팝': ['드라이브', '카페'],
    '발라드': ['이별', '위로'],
    '인디 록': ['퇴근길', '산책'],
    '재즈': ['카페', '늦은 밤'],
    '일렉트로닉': ['운동', '드라이브'],
    '포크': ['산책', '노을'],
    '클래식': ['집중', '공부'],
    'OST': ['감성', '위로'],
    '록': ['운동', '드라이브'],
    'K-POP': ['설렘', '감성']
  };

  const KW_TAGS = {
    '새벽': '새벽', '밤': '늦은 밤', '비': '비 오는 날', '사랑': '설렘',
    '이별': '이별', '산책': '산책', '드라이브': '드라이브', '노을': '노을',
    '겨울': '겨울', '여름': '여름', '바다': '여행', '위로': '힐링',
    '꿈': '감성', '시간': '감성'
  };

  function suggestTags(input) {
    const src = input || {};
    const allowed = (DATA && DATA.TAG_OPTIONS) || [];
    const kws = src.lyricKeywords || (LYR ? LYR.keywordsOf(src.lyrics || '') : []);
    const picked = [];
    const add = function (t) {
      if (!t) return;
      if (allowed.length && allowed.indexOf(t) === -1) return;
      if (picked.indexOf(t) === -1 && picked.length < 3) picked.push(t);
    };

    kws.forEach(function (k) { if (picked.length < 2) add(KW_TAGS[k]); });
    const gTags = GENRE_TAGS[genreKey(src.genre)] || [];
    gTags.forEach(function (t) { if (picked.length < 3) add(t); });
    if (picked.length < 2) ['감성', '힐링', '새벽'].forEach(function (t) { if (picked.length < 2) add(t); });
    return picked;
  }

  global.MusicCurator = {
    build: build,
    allVariants: allVariants,
    suggestTags: suggestTags,
    genreKey: genreKey,
    quoteFrom: quoteFrom,
    pickScene: pickScene
  };
})(window);
