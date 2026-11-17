/* 색 계산: 앨범 커버에서 대표색 추출 + 테마와 자연스럽게 혼합 */
(function (global) {
  'use strict';

  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

  function hexToRgb(hex) {
    let h = String(hex || '').replace('#', '').trim();
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    if (!isFinite(n) || h.length !== 6) return { r: 0, g: 0, b: 0 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgbToHex(r, g, b) {
    const to = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
    return '#' + to(r) + to(g) + to(b);
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h, s, l };
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    if (s === 0) { const v = l * 255; return { r: v, g: v, b: v }; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return {
      r: hue2rgb(p, q, h / 360 + 1 / 3) * 255,
      g: hue2rgb(p, q, h / 360) * 255,
      b: hue2rgb(p, q, h / 360 - 1 / 3) * 255
    };
  }

  function hexToHsl(hex) {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHsl(r, g, b);
  }

  function hslToHex(h, s, l) {
    const { r, g, b } = hslToRgb(h, s, l);
    return rgbToHex(r, g, b);
  }

  function mix(a, b, t) {
    const A = hexToRgb(a), B = hexToRgb(b);
    return rgbToHex(A.r + (B.r - A.r) * t, A.g + (B.g - A.g) * t, A.b + (B.b - A.b) * t);
  }

  function withAlpha(hex, alpha) {
    const { r, g, b } = hexToRgb(hex);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function shade(hex, amount) {
    const { r, g, b } = hexToRgb(hex);
    const f = (v) => (amount >= 0 ? v + (255 - v) * amount : v * (1 + amount));
    return rgbToHex(f(r), f(g), f(b));
  }

  function luminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    const s = [r, g, b].map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
  }

  /** 이미지에서 대표색 추출: 채도·빈도 가중, 극단 밝기/무채색 회피 */
  function extractColor(img) {
    try {
      const size = 48;
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      const buckets = new Map();
      let grayR = 0, grayG = 0, grayB = 0, grayCount = 0;

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 200) continue;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const hsl = rgbToHsl(r, g, b);
        if (hsl.l < 0.06 || hsl.l > 0.96) continue;
        if (hsl.s < 0.14) {
          if (hsl.l > 0.12 && hsl.l < 0.9) { grayR += r; grayG += g; grayB += b; grayCount++; }
          continue;
        }
        const key = Math.round(hsl.h / 20) % 18;
        const w = hsl.s * (0.45 + Math.abs(hsl.l - 0.5));
        const prev = buckets.get(key) || { w: 0, r: 0, g: 0, b: 0 };
        buckets.set(key, { w: prev.w + w, r: prev.r + r * w, g: prev.g + g * w, b: prev.b + b * w });
      }

      let best = null;
      buckets.forEach((v) => { if (!best || v.w > best.w) best = v; });
      if (best && best.w > 0) {
        return { hex: rgbToHex(best.r / best.w, best.g / best.w, best.b / best.w), colorful: true };
      }
      if (grayCount > 0) {
        return { hex: rgbToHex(grayR / grayCount, grayG / grayCount, grayB / grayCount), colorful: false };
      }
    } catch (e) {
      /* 캔버스 접근 실패 시 테마 기본색 사용 */
    }
    return null;
  }

  /** 커버 색과 테마 색을 섞어 카드에서 읽히는 강조색으로 보정 */
  function harmonize(cover, themeAccent, isDark) {
    if (!cover || !cover.hex) return themeAccent;
    const c = hexToHsl(cover.hex);
    const t = hexToHsl(themeAccent);
    if (!cover.colorful || c.s < 0.1) {
      // 커버가 흑백이면 테마 색조는 유지하되 살짝만 데운다
      return isDark ? mix(themeAccent, cover.hex, 0.12) : themeAccent;
    }
    let delta = c.h - t.h;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    const h = t.h + delta * 0.68;
    const s = clamp(c.s * 0.55 + t.s * 0.45, 0.32, 0.86);
    const l = isDark ? clamp(c.l * 0.45 + 0.44, 0.56, 0.78) : clamp(c.l * 0.35 + 0.26, 0.3, 0.52);
    return hslToHex(h, s, l);
  }

  global.MusicColor = {
    hexToRgb, rgbToHex, rgbToHsl, hslToRgb, hexToHsl, hslToHex,
    mix, withAlpha, shade, luminance, extractColor, harmonize, clamp
  };
})(window);
