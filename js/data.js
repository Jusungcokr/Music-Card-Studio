/* 음악 카드뉴스 스튜디오 — 테마·비율·태그·예시 데이터 */
(function (global) {
  'use strict';

  const RATIOS = [
    { id: '4:5', w: 1080, h: 1350, name: '인스타 피드', desc: '1080×1350' },
    { id: '1:1', w: 1080, h: 1080, name: '정방형', desc: '1080×1080' },
    { id: '9:16', w: 1080, h: 1920, name: '릴스·쇼츠', desc: '1080×1920' }
  ];

  const THEMES = [
    {
      id: 'vinyl',
      name: '다크 바이닐',
      hint: '무광 블랙 + 골드',
      swatch: ['#15151B', '#D9B87C', '#2B2B33'],
      isDark: true,
      palette: {
        bg1: '#16161D',
        bg2: '#0A0A0D',
        ink: '#F4F1E9',
        ink2: 'rgba(244,241,233,0.64)',
        ink3: 'rgba(244,241,233,0.36)',
        line: 'rgba(244,241,233,0.16)',
        accentFallback: '#D9B87C',
        accentInk: '#171207',
        chip: 'rgba(244,241,233,0.075)',
        chipInk: 'rgba(244,241,233,0.9)'
      }
    },
    {
      id: 'magazine',
      name: '매거진 화이트',
      hint: '아이보리 + 잉크',
      swatch: ['#F7F3EA', '#8C3B32', '#DCD3C4'],
      isDark: false,
      palette: {
        bg1: '#FCF9F2',
        bg2: '#EEE6D7',
        ink: '#1A1A1D',
        ink2: 'rgba(26,26,29,0.66)',
        ink3: 'rgba(26,26,29,0.38)',
        line: 'rgba(26,26,29,0.18)',
        accentFallback: '#8C3B32',
        accentInk: '#FFF8F0',
        chip: 'rgba(26,26,29,0.055)',
        chipInk: 'rgba(26,26,29,0.86)'
      }
    },
    {
      id: 'film',
      name: '웜 필름',
      hint: '세피아 + 노을빛',
      swatch: ['#E9D9C0', '#A65A34', '#C9AE8A'],
      isDark: false,
      palette: {
        bg1: '#F1E4CE',
        bg2: '#CFB590',
        ink: '#3A2A1D',
        ink2: 'rgba(58,42,29,0.68)',
        ink3: 'rgba(58,42,29,0.4)',
        line: 'rgba(58,42,29,0.2)',
        accentFallback: '#A65A34',
        accentInk: '#FFF5E8',
        chip: 'rgba(58,42,29,0.075)',
        chipInk: 'rgba(58,42,29,0.88)'
      }
    },
    {
      id: 'neon',
      name: '네온 나이트',
      hint: '딥 바이올렛 + 네온',
      swatch: ['#0A0714', '#8B7BFF', '#F472B6'],
      isDark: true,
      palette: {
        bg1: '#0C0818',
        bg2: '#04030B',
        ink: '#EDF1FF',
        ink2: 'rgba(237,241,255,0.68)',
        ink3: 'rgba(237,241,255,0.38)',
        line: 'rgba(237,241,255,0.18)',
        accentFallback: '#8B7BFF',
        accentInk: '#07040F',
        chip: 'rgba(237,241,255,0.085)',
        chipInk: 'rgba(237,241,255,0.92)'
      }
    }
  ];

  const TAG_OPTIONS = [
    '새벽', '늦은 밤', '드라이브', '카페', '출근길', '퇴근길',
    '산책', '운동', '집중', '공부', '비 오는 날', '노을',
    '이별', '설렘', '위로', '여행', '겨울', '여름', '힐링', '감성'
  ];

  const GENRES = ['R&B', '인디 록', '시티팝', '발라드', '힙합', '재즈', '일렉트로닉', '포크', 'K-POP', '록', '클래식', 'OST'];

  const EXAMPLES = [
    {
      id: 'dawn',
      label: '새벽 감성 R&B',
      emoji: '🌙',
      desc: '저음 보컬 · 이별 · 다크 바이닐',
      theme: 'vinyl',
      ratio: '4:5',
      data: {
        title: '새벽 4시의 우리',
        artist: '유하',
        genre: 'R&B',
        year: '2025',
        lyrics: '깨진 시계는 그대로 두자\n지금 이 새벽이 마지막이니까',
        reason: '잠이 안 오는 밤, 불을 끄고 가만히 듣기 좋은 곡이에요. 목소리가 낮게 가라앉는 후렴에서 하루의 긴장이 천천히 풀립니다.',
        tags: ['새벽', '늦은 밤', '이별', '감성'],
        handle: 'midnight.tape'
      }
    },
    {
      id: 'indie',
      label: '인디 록',
      emoji: '🎸',
      desc: '기타 리프 · 퇴근길 · 웜 필름',
      theme: 'film',
      ratio: '4:5',
      data: {
        title: '골목 끝 파도',
        artist: '파도우체국',
        genre: '인디 록',
        year: '2024',
        lyrics: '우리는 자주 넘어졌지만\n매번 다시 일어났지',
        reason: '기타가 터지는 순간이 좋아서 몇 번을 돌려 들었어요. 퇴근길에 이어폰 끼고 걷기 딱 좋은 속도입니다.',
        tags: ['퇴근길', '산책', '위로', '기타'],
        handle: 'indie.room'
      }
    },
    {
      id: 'citypop',
      label: '시티팝',
      emoji: '🌃',
      desc: '경쾌한 베이스 · 드라이브 · 네온 나이트',
      theme: 'neon',
      ratio: '4:5',
      data: {
        title: '네온 사인 러브레터',
        artist: '미도리 클럽',
        genre: '시티팝',
        year: '2022',
        lyrics: '네온이 번진 거리에서\n너의 이름을 다시 불러',
        reason: '창문 열고 드라이브할 때 듣기 좋은 시티팝. 베이스라인이 경쾌해서 기분이 확 올라갑니다.',
        tags: ['드라이브', '카페', '설렘', '시티팝'],
        handle: 'citypop.daily'
      }
    }
  ];

  const MOOD_EMOJI = [
    { keys: ['새벽', '늦은 밤', '밤', '야간'], emoji: '🌙' },
    { keys: ['드라이브', '차', '주행'], emoji: '🚗' },
    { keys: ['카페', '커피', '라떼'], emoji: '☕' },
    { keys: ['출근', '아침'], emoji: '🌤️' },
    { keys: ['퇴근', '저녁'], emoji: '🌆' },
    { keys: ['운동', '러닝', '헬스'], emoji: '🔥' },
    { keys: ['비', '장마'], emoji: '☔' },
    { keys: ['이별', '그리움'], emoji: '💔' },
    { keys: ['설렘', '사랑', '고백'], emoji: '💗' },
    { keys: ['산책', '공원', '걷기'], emoji: '🌿' },
    { keys: ['여행', '바다', '휴가'], emoji: '✈️' },
    { keys: ['집중', '공부', '작업'], emoji: '🎧' },
    { keys: ['위로', '힐링', '쉼'], emoji: '🫧' },
    { keys: ['노을', '석양'], emoji: '🌅' }
  ];

  global.MusicData = { RATIOS, THEMES, TAG_OPTIONS, GENRES, EXAMPLES, MOOD_EMOJI };
})(window);
