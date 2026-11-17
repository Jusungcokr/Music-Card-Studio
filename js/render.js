/* 카드뉴스 캔버스 렌더러: 테마 4종 × 카드 3장 × 비율 3종 */
(function (global) {
  'use strict';

  const C = global.MusicColor;
  const FONT = "Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, sans-serif";
  const SERIF = "Georgia, 'Times New Roman', 'DejaVu Serif', serif";

  /* ---------- 기본 유틸 ---------- */

  function setFont(ctx, size, weight, ls) {
    ctx.font = (weight || 400) + ' ' + Math.max(8, Math.round(size)) + 'px ' + FONT;
    if ('letterSpacing' in ctx) ctx.letterSpacing = (ls || 0) + 'px';
  }

  function setSerif(ctx, size, weight) {
    ctx.font = (weight || 400) + ' ' + Math.max(8, Math.round(size)) + 'px ' + SERIF;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
    } else {
      const rr = Math.min(r, w / 2, h / 2);
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    }
  }

  function wrapLines(ctx, text, maxWidth) {
    const out = [];
    const paragraphs = String(text == null ? '' : text).replace(/\r/g, '').split('\n');
    for (let p = 0; p < paragraphs.length; p++) {
      const para = paragraphs[p].trim();
      if (!para) { out.push(''); continue; }
      const words = para.split(/\s+/);
      let line = '';
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width <= maxWidth) { line = test; continue; }
        if (line) { out.push(line); line = ''; }
        if (ctx.measureText(word).width > maxWidth) {
          let chunk = '';
          const chars = Array.from(word);
          for (let k = 0; k < chars.length; k++) {
            if (chunk && ctx.measureText(chunk + chars[k]).width > maxWidth) {
              out.push(chunk);
              chunk = chars[k];
            } else {
              chunk += chars[k];
            }
          }
          line = chunk;
        } else {
          line = word;
        }
      }
      if (line) out.push(line);
    }
    return out;
  }

  function truncateLast(ctx, lines, maxWidth) {
    if (!lines.length) return lines;
    let last = lines[lines.length - 1];
    while (last.length > 1 && ctx.measureText(last + '…').width > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[lines.length - 1] = last.replace(/[\s,·]$/, '') + '…';
    return lines;
  }

  /** 크기·줄 수 제한에 맞춰 글자 크기 자동 축소 */
  function fitText(ctx, str, maxW, maxLines, baseSize, minSize, weight, ls) {
    for (let s = Math.round(baseSize); s >= Math.round(minSize); s -= 2) {
      setFont(ctx, s, weight, ls);
      const lines = wrapLines(ctx, str, maxW);
      if (lines.length <= maxLines) return { size: s, lines };
    }
    setFont(ctx, minSize, weight, ls);
    const lines = wrapLines(ctx, str, maxW);
    if (lines.length > maxLines) {
      return { size: minSize, lines: truncateLast(ctx, lines.slice(0, maxLines), maxW) };
    }
    return { size: minSize, lines };
  }

  function lineWidth(ctx, lines) {
    let w = 0;
    for (let i = 0; i < lines.length; i++) w = Math.max(w, ctx.measureText(lines[i]).width);
    return w;
  }

  /* ---------- 그레인 ---------- */

  let grainTile = null;
  function grainPattern(ctx) {
    if (!grainTile) {
      grainTile = document.createElement('canvas');
      grainTile.width = 170; grainTile.height = 170;
      const g = grainTile.getContext('2d');
      const img = g.createImageData(170, 170);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 120 + Math.random() * 135;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = Math.random() * 46;
      }
      g.putImageData(img, 0, 0);
    }
    return ctx.createPattern(grainTile, 'repeat');
  }

  /* ---------- LP 그래픽 ---------- */

  function drawDisc(ctx, cx, cy, r, accent, alpha, withLabel) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.05, cx, cy, r);
    g.addColorStop(0, '#26262E');
    g.addColorStop(0.55, '#121218');
    g.addColorStop(1, '#08080B');
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();

    ctx.lineWidth = Math.max(1, r * 0.0022);
    for (let i = 0; i < 26; i++) {
      const rr = r * (0.3 + i * 0.027);
      if (rr > r * 0.99) break;
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.03 + (i % 3) * 0.014) + ')';
      ctx.stroke();
    }

    const hgl = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    hgl.addColorStop(0, 'rgba(255,255,255,0.10)');
    hgl.addColorStop(0.38, 'rgba(255,255,255,0)');
    hgl.addColorStop(1, 'rgba(255,255,255,0.035)');
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = hgl; ctx.fill();

    if (withLabel !== false) {
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.235, 0, Math.PI * 2);
      ctx.fillStyle = C.withAlpha(accent, 0.85); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.02, 0, Math.PI * 2);
      ctx.fillStyle = '#0A0A0D'; ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- 배경 ---------- */

  function backdrop(ctx, W, H, theme, accent, index) {
    const P = theme.palette;

    if (theme.id === 'vinyl') {
      const g = ctx.createLinearGradient(0, 0, W * 0.5, H);
      g.addColorStop(0, '#18181F');
      g.addColorStop(0.52, '#101014');
      g.addColorStop(1, '#080809');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      // 아래쪽에 걸친 LP (라벨 없이 질감만)
      drawDisc(ctx, W * 0.86, H * 0.93, W * 0.52, accent, 0.5, false);

      const rg = ctx.createRadialGradient(W * 0.06, H * 0.04, 0, W * 0.06, H * 0.04, W * 0.9);
      rg.addColorStop(0, C.withAlpha(accent, 0.16));
      rg.addColorStop(0.45, C.withAlpha(accent, 0.05));
      rg.addColorStop(1, C.withAlpha(accent, 0));
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);

      // 가장자리 비네트
      const vg = ctx.createRadialGradient(W * 0.5, H * 0.45, W * 0.25, W * 0.5, H * 0.5, W * 0.85);
      vg.addColorStop(0, 'rgba(0,0,0,0)');
      vg.addColorStop(1, 'rgba(0,0,0,0.42)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

      ctx.save(); ctx.globalAlpha = 0.45;
      ctx.fillStyle = grainPattern(ctx); ctx.fillRect(0, 0, W, H);
      ctx.restore();

      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = Math.max(1.5, W * 0.0018);
      ctx.strokeRect(W * 0.042, H * 0.032, W * 0.916, H * 0.936);

    } else if (theme.id === 'magazine') {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, P.bg1);
      g.addColorStop(1, P.bg2);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      ctx.save(); ctx.globalAlpha = 0.18; ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = grainPattern(ctx); ctx.fillRect(0, 0, W, H);
      ctx.restore();

      ctx.fillStyle = accent;
      ctx.fillRect(0, 0, W, Math.max(8, H * 0.011));

      ctx.fillStyle = C.withAlpha(P.ink, 0.13);
      ctx.fillRect(W * 0.045, H * 0.075, Math.max(1.5, W * 0.0016), H * 0.85);

      ctx.save();
      setFont(ctx, W * 0.34, 800, -W * 0.01);
      ctx.textAlign = 'right';
      ctx.fillStyle = C.withAlpha(P.ink, 0.035);
      ctx.fillText(String(index).padStart(2, '0'), W * 1.01, H * 1.02);
      ctx.restore();

    } else if (theme.id === 'film') {
      const g = ctx.createLinearGradient(0, 0, W * 0.8, H);
      g.addColorStop(0, '#F6EBD8');
      g.addColorStop(0.55, '#E6D5B9');
      g.addColorStop(1, '#CBB08A');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const lg = ctx.createRadialGradient(W * 0.84, H * 0.06, 0, W * 0.84, H * 0.06, W * 0.8);
      lg.addColorStop(0, 'rgba(255,240,205,0.6)');
      lg.addColorStop(0.45, 'rgba(255,226,175,0.16)');
      lg.addColorStop(1, 'rgba(255,226,175,0)');
      ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
      ctx.restore();

      const vg = ctx.createRadialGradient(W * 0.5, H * 0.45, W * 0.2, W * 0.5, H * 0.5, W * 1.05);
      vg.addColorStop(0, 'rgba(70,44,20,0)');
      vg.addColorStop(1, 'rgba(70,44,20,0.24)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

      const holeW = W * 0.019, holeH = W * 0.028, gapY = holeH * 2.1;
      ctx.fillStyle = 'rgba(58,40,22,0.13)';
      for (let y = H * 0.035; y < H * 0.95; y += gapY) {
        roundRectPath(ctx, W * 0.014, y, holeW, holeH, holeW * 0.3); ctx.fill();
        roundRectPath(ctx, W - W * 0.014 - holeW, y, holeW, holeH, holeW * 0.3); ctx.fill();
      }

      ctx.save(); ctx.globalAlpha = 0.55;
      ctx.fillStyle = grainPattern(ctx); ctx.fillRect(0, 0, W, H);
      ctx.restore();

    } else {
      // neon
      ctx.fillStyle = P.bg2; ctx.fillRect(0, 0, W, H);
      let g = ctx.createRadialGradient(W * 0.14, H * 0.06, 0, W * 0.14, H * 0.06, W * 0.95);
      g.addColorStop(0, C.withAlpha(accent, 0.4));
      g.addColorStop(0.45, C.withAlpha(accent, 0.08));
      g.addColorStop(1, C.withAlpha(accent, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      g = ctx.createRadialGradient(W * 0.92, H * 0.94, 0, W * 0.92, H * 0.94, W * 0.85);
      g.addColorStop(0, C.withAlpha('#F472B6', 0.34));
      g.addColorStop(0.5, C.withAlpha('#F472B6', 0.07));
      g.addColorStop(1, C.withAlpha('#F472B6', 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(237,241,255,0.045)';
      ctx.lineWidth = Math.max(1, W * 0.0012);
      const step = W * 0.085;
      for (let x = step; x < W; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = step; y < H; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // 오른쪽 가장자리 네온 링
      ctx.save();
      ctx.beginPath();
      ctx.arc(W * 1.04, H * 0.46, W * 0.3, 0, Math.PI * 2);
      ctx.strokeStyle = C.withAlpha('#F472B6', 0.22);
      ctx.lineWidth = Math.max(2, W * 0.003);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(W * 1.04, H * 0.46, W * 0.24, 0, Math.PI * 2);
      ctx.strokeStyle = C.withAlpha(accent, 0.16);
      ctx.lineWidth = Math.max(1, W * 0.0014);
      ctx.stroke();
      ctx.restore();

      ctx.save(); ctx.globalAlpha = 0.3;
      ctx.fillStyle = grainPattern(ctx); ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  /* ---------- 커버 ---------- */

  function autoArtwork(ctx, x, y, size, accent, theme) {
    const light = !theme.isDark;
    const g = ctx.createLinearGradient(x, y, x + size, y + size);
    if (light) {
      g.addColorStop(0, C.mix(accent, '#FFFDF8', 0.88));
      g.addColorStop(0.55, C.mix(accent, '#F4EADB', 0.62));
      g.addColorStop(1, C.mix(accent, '#2C211A', 0.12));
    } else {
      g.addColorStop(0, C.mix(accent, '#1A1A22', 0.66));
      g.addColorStop(0.55, C.mix(accent, '#0A0A0E', 0.86));
      g.addColorStop(1, '#07070A');
    }
    ctx.fillStyle = g; ctx.fillRect(x, y, size, size);

    const glow = ctx.createRadialGradient(x + size * 0.5, y + size * 0.5, size * 0.05, x + size * 0.5, y + size * 0.5, size * 0.6);
    glow.addColorStop(0, C.withAlpha(accent, light ? 0.25 : 0.22));
    glow.addColorStop(1, C.withAlpha(accent, 0));
    ctx.fillStyle = glow; ctx.fillRect(x, y, size, size);

    drawDisc(ctx, x + size * 0.5, y + size * 0.5, size * 0.3, accent, 1, true);

    ctx.save();
    setFont(ctx, size * 0.021, 600, size * 0.009);
    ctx.textAlign = 'left';
    ctx.fillStyle = light ? 'rgba(44,33,26,0.42)' : 'rgba(255,255,255,0.42)';
    ctx.fillText('AUTO ARTWORK', x + size * 0.07, y + size * 0.945);
    ctx.textAlign = 'right';
    ctx.fillText('LP', x + size * 0.93, y + size * 0.945);
    ctx.restore();
  }

  function drawCoverImage(ctx, img, x, y, size, radius, accent, theme) {
    ctx.save();
    roundRectPath(ctx, x, y, size, size, radius);
    ctx.clip();

    if (img) {
      const ir = img.naturalWidth / img.naturalHeight || 1;
      let sw = img.naturalWidth, sh = img.naturalHeight, sx = 0, sy = 0;
      if (ir > 1) { sw = img.naturalHeight; sx = (img.naturalWidth - sw) / 2; }
      else if (ir < 1) { sh = img.naturalWidth; sy = (img.naturalHeight - sh) / 2; }
      ctx.drawImage(img, sx, sy, sw, sh, x, y, size, size);
    } else {
      autoArtwork(ctx, x, y, size, accent, theme);
    }

    const eg = ctx.createLinearGradient(x, y, x + size * 0.4, y + size);
    eg.addColorStop(0, 'rgba(255,255,255,0.10)');
    eg.addColorStop(0.45, 'rgba(255,255,255,0)');
    ctx.fillStyle = eg; ctx.fillRect(x, y, size, size);
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.085)';
    ctx.lineWidth = Math.max(1, size * 0.0016);
    roundRectPath(ctx, x + 0.5, y + 0.5, size - 1, size - 1, radius);
    ctx.stroke();
  }

  /* ---------- 텍스트 조각 ---------- */

  function eyebrow(ctx, label, x, y, P, opts) {
    const size = (opts && opts.size) || 22;
    ctx.save();
    setFont(ctx, size, 700, size * 0.2);
    ctx.textAlign = 'left';
    ctx.fillStyle = (opts && opts.color) || P.ink2;
    ctx.fillText(label, x, y);
    ctx.restore();
  }

  function drawChips(ctx, tags, x, y, maxW, opt) {
    if (!tags || !tags.length) return 0;
    const size = opt.size;
    const padX = size * 0.62;
    const h = size * 2.05;
    const gapX = size * 0.4;
    const gapY = size * 0.42;

    setFont(ctx, size, 600, 0);
    const items = tags.map((t) => ({ t: t, w: ctx.measureText(t).width + padX * 2 }));
    const rows = [];
    let row = [], rowW = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const add = row.length ? gapX + it.w : it.w;
      if (row.length && rowW + add > maxW) {
        rows.push({ items: row, w: rowW });
        row = [it]; rowW = it.w;
      } else {
        row.push(it); rowW += add;
      }
    }
    if (row.length) rows.push({ items: row, w: rowW });

    let cy = y;
    for (let r = 0; r < rows.length; r++) {
      let cx = opt.align === 'center' ? x + (maxW - rows[r].w) / 2 : x;
      for (let k = 0; k < rows[r].items.length; k++) {
        const it = rows[r].items[k];
        roundRectPath(ctx, cx, cy, it.w, h, h / 2);
        ctx.fillStyle = opt.bg; ctx.fill();
        if (opt.border) {
          ctx.strokeStyle = opt.border; ctx.lineWidth = Math.max(1, size * 0.045); ctx.stroke();
        }
        setFont(ctx, size, 600, 0);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = opt.color;
        ctx.fillText(it.t, cx + padX, cy + h / 2 + size * 0.05);
        cx += it.w + gapX;
      }
      cy += h + gapY;
    }
    ctx.textBaseline = 'alphabetic';
    return rows.length * h + (rows.length - 1) * gapY;
  }

  function drawWatermark(ctx, W, H, theme, handle, index) {
    const P = theme.palette;
    const pad = Math.round(W * 0.085);
    const y = H - pad * 0.72;
    ctx.save();
    if (handle) {
      setFont(ctx, W * 0.0215, 600, W * 0.0016);
      ctx.textAlign = 'left';
      ctx.fillStyle = P.ink3;
      ctx.fillText('@' + handle, pad, y);
    }
    setFont(ctx, W * 0.0195, 500, W * 0.0022);
    ctx.textAlign = 'right';
    ctx.fillStyle = P.ink3;
    ctx.fillText(String(index).padStart(2, '0') + ' / 03', W - pad, y);
    ctx.restore();
  }

  function drawBookmark(ctx, x, y, s, color) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + s, y);
    ctx.lineTo(x + s, y + s * 1.34);
    ctx.lineTo(x + s / 2, y + s * 0.98);
    ctx.lineTo(x, y + s * 1.34);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  /* ---------- 카드 1: 표지 ---------- */

  function drawCoverCard(ctx, W, H, d, theme, accent, ratioId) {
    const P = theme.palette;
    const pad = Math.round(W * 0.085);
    const innerW = W - pad * 2;
    backdrop(ctx, W, H, theme, accent, 1);

    const topY = pad + W * 0.008;
    eyebrow(ctx, 'TRACK 01', pad, topY, P, { size: W * 0.0205 });

    ctx.save();
    setFont(ctx, W * 0.0195, 600, W * 0.0022);
    ctx.textAlign = 'right';
    ctx.fillStyle = P.ink3;
    ctx.fillText(d.year ? String(d.year) : 'MUSIC NOTE', W - pad, topY);
    ctx.restore();

    let coverSize;
    if (ratioId === '9:16') coverSize = Math.min(innerW, H * 0.55);
    else if (ratioId === '1:1') coverSize = Math.min(innerW * 0.72, H * 0.44);
    else coverSize = Math.min(innerW * 0.8, H * 0.48);

    const coverX = (W - coverSize) / 2;
    const coverY = topY + W * 0.055;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,' + (theme.isDark ? 0.55 : 0.22) + ')';
    ctx.shadowBlur = coverSize * 0.07;
    ctx.shadowOffsetY = coverSize * 0.02;
    roundRectPath(ctx, coverX, coverY, coverSize, coverSize, coverSize * 0.035);
    ctx.fillStyle = 'rgba(0,0,0,0.001)';
    ctx.fill();
    ctx.restore();

    drawCoverImage(ctx, d.coverImg, coverX, coverY, coverSize, coverSize * 0.035, accent, theme);

    const titleText = d.title || '곡명을 입력하세요';
    const artistText = d.artist || '아티스트';
    const textTop = coverY + coverSize + W * 0.062;
    const textBottom = H - pad * 1.35;

    const artistSize = W * 0.033;
    const tagSize = W * 0.0235;
    const tags = (d.tags || []).slice(0, 4);
    const gapArtist = W * 0.024;
    const gapTags = tags.length ? W * 0.04 : 0;
    const chipsH = tags.length ? tagSize * 2.05 : 0;
    const reserved = artistSize * 1.2 + gapArtist + (tags.length ? gapTags + chipsH : 0);
    const titleRoom = Math.max(artistSize * 2, textBottom - textTop - reserved);

    const baseTitle = ratioId === '1:1' ? W * 0.062 : W * 0.074;
    const fit = fitText(ctx, titleText, innerW * 0.96, 2, baseTitle, W * 0.044, 800, 0);
    let titleSize = fit.size;
    let lines = fit.lines;
    while (lines.length * titleSize * 1.16 > titleRoom && titleSize > W * 0.038) {
      titleSize -= 2;
      setFont(ctx, titleSize, 800, 0);
      lines = wrapLines(ctx, titleText, innerW * 0.96);
      if (lines.length > 2) lines = [lines[0]];
    }
    const titleLH = titleSize * 1.16;
    const blockH = lines.length * titleLH + gapArtist + artistSize * 1.2 + (tags.length ? gapTags + chipsH : 0);

    const spare = textBottom - textTop - blockH;
    let y = textTop;
    if (spare > 0) y = textTop + (ratioId === '9:16' ? spare * 0.5 : spare / 2);

    ctx.save();
    setFont(ctx, titleSize, 800, -titleSize * 0.012);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = d.title ? P.ink : P.ink3;
    if (theme.id === 'neon') {
      ctx.shadowColor = C.withAlpha(accent, 0.4);
      ctx.shadowBlur = W * 0.028;
    }
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], W / 2, y + titleSize * 0.82 + i * titleLH);
    }
    ctx.restore();

    y += lines.length * titleLH + gapArtist;
    ctx.save();
    setFont(ctx, artistSize, 500, artistSize * 0.06);
    ctx.textAlign = 'center';
    ctx.fillStyle = d.artist ? P.ink2 : P.ink3;
    ctx.fillText(artistText, W / 2, y + artistSize * 0.95);
    ctx.restore();

    if (tags.length) {
      y += artistSize * 1.2 + gapTags;
      drawChips(ctx, tags, pad, y, innerW, {
        size: tagSize, align: 'center',
        bg: P.chip, color: P.chipInk,
        border: theme.id === 'neon' ? C.withAlpha(accent, 0.32) : null
      });
    }

    drawWatermark(ctx, W, H, theme, d.handle, 1);
  }

  /* ---------- 카드 2: 킬링 포인트 ---------- */

  function drawLyricCard(ctx, W, H, d, theme, accent, ratioId) {
    const P = theme.palette;
    const pad = Math.round(W * 0.085);
    const innerW = W - pad * 2;
    backdrop(ctx, W, H, theme, accent, 2);

    const topY = pad + W * 0.008;
    eyebrow(ctx, 'KILLING POINT', pad, topY, P, { size: W * 0.0205 });
    ctx.save();
    setFont(ctx, W * 0.0195, 600, W * 0.0022);
    ctx.textAlign = 'right'; ctx.fillStyle = P.ink3;
    ctx.fillText('02', W - pad, topY);
    ctx.restore();

    const infoTitle = d.title || '곡명';
    const infoArtist = d.artist || '아티스트';
    const infoSize = W * 0.0255;
    const metaSize = W * 0.0195;
    const metaBits = [d.genre, d.year ? String(d.year) : ''].filter(Boolean).join(' · ');
    const infoH = infoSize * 1.3 + (metaBits ? metaSize * 1.5 : 0);
    const infoBottom = H - pad * 1.25;
    const infoTop = infoBottom - infoH;

    const lyricsText = d.lyrics || '대표 가사를 적으면\n여기에 인용구로 담겨요';
    const maxLyricsLines = ratioId === '9:16' ? 9 : 6;
    let fit = fitText(ctx, lyricsText, innerW * 0.88, maxLyricsLines, W * 0.066, W * 0.034, 600, -0.01);
    const lh = fit.size * 1.5;

    // 키커 아래 짧은 액센트 룰
    ctx.save();
    ctx.fillStyle = C.withAlpha(accent, 0.7);
    ctx.fillRect(pad, topY + W * 0.028, W * 0.058, Math.max(2, W * 0.0026));
    ctx.restore();

    const regionTop = topY + W * 0.12;
    const regionBottom = infoTop - W * 0.13;
    const quoteSize = W * 0.15;
    const linesH = fit.lines.length * lh;
    const groupH = quoteSize * 0.5 + linesH + quoteSize * 0.42;
    let y = regionTop + Math.max(0, (regionBottom - regionTop - groupH) * 0.42);

    // 여는 인용부호
    ctx.save();
    setSerif(ctx, quoteSize, 700);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = C.withAlpha(accent, theme.isDark ? 0.72 : 0.58);
    ctx.fillText('“', pad - W * 0.004, y);
    ctx.restore();
    y += quoteSize * 0.5;

    ctx.save();
    setFont(ctx, fit.size, 600, -fit.size * 0.012);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = d.lyrics ? P.ink : P.ink3;
    if (theme.id === 'neon') { ctx.shadowColor = C.withAlpha(accent, 0.3); ctx.shadowBlur = W * 0.024; }
    for (let i = 0; i < fit.lines.length; i++) {
      ctx.fillText(fit.lines[i], W / 2, y + fit.size * 0.82 + i * lh);
    }
    ctx.restore();

    // 닫는 인용부호
    ctx.save();
    setSerif(ctx, quoteSize, 700);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillStyle = C.withAlpha(accent, theme.isDark ? 0.72 : 0.58);
    ctx.fillText('”', W - pad + W * 0.004, y + linesH - quoteSize * 0.1);
    ctx.restore();

    // 구분선 + 트랙 정보
    ctx.save();
    ctx.fillStyle = accent;
    ctx.fillRect(W / 2 - W * 0.035, infoTop - W * 0.075, W * 0.07, Math.max(2, W * 0.003));
    setFont(ctx, infoSize, 700, infoSize * 0.02);
    ctx.textAlign = 'center';
    ctx.fillStyle = P.ink;
    ctx.fillText(infoTitle + ' — ' + infoArtist, W / 2, infoTop + infoSize * 0.95);
    if (metaBits) {
      setFont(ctx, metaSize, 500, metaSize * 0.1);
      ctx.fillStyle = P.ink2;
      ctx.fillText(metaBits, W / 2, infoTop + infoSize * 1.3 + metaSize * 1.1);
    }
    ctx.restore();

    drawWatermark(ctx, W, H, theme, d.handle, 2);
  }

  /* ---------- 카드 3: 큐레이션 노트 ---------- */

  function drawNoteCard(ctx, W, H, d, theme, accent, ratioId) {
    const P = theme.palette;
    const pad = Math.round(W * 0.085);
    const innerW = W - pad * 2;
    backdrop(ctx, W, H, theme, accent, 3);

    const topY = pad + W * 0.008;
    eyebrow(ctx, 'CURATION NOTE', pad, topY, P, { size: W * 0.0205 });
    ctx.save();
    setFont(ctx, W * 0.0195, 600, W * 0.0022);
    ctx.textAlign = 'right'; ctx.fillStyle = P.ink3;
    ctx.fillText('03', W - pad, topY);
    ctx.restore();

    const watermarkY = H - pad * 0.72;
    const shareY = watermarkY - W * 0.06;
    const ctaH = W * 0.094;
    const ctaY = shareY - W * 0.052 - ctaH;

    const regionTop = topY + W * 0.075;
    const regionBottom = ctaY - W * 0.075;

    const indent = pad + W * 0.045;
    const contentW = innerW - W * 0.045;
    const labelSize = W * 0.0205;
    const tagSize = W * 0.0225;
    const tags = (d.tags || []).slice(0, 6);

    // 칩 높이 미리 계산
    let chipsH = 0;
    if (tags.length) {
      setFont(ctx, tagSize, 600, 0);
      let rowW = 0, rows = 1;
      const gapX = tagSize * 0.4;
      tags.forEach((t, i) => {
        const w = ctx.measureText(t).width + tagSize * 1.24;
        const add = i ? gapX + w : w;
        if (rowW + add > contentW) { rows++; rowW = w; } else { rowW += add; }
      });
      chipsH = rows * tagSize * 2.05 + (rows - 1) * tagSize * 0.42;
    }

    const labelGap = W * 0.032;
    const reasonLabelGap = W * 0.018;
    const blockGap = W * 0.058;
    const fixedH = labelSize * 1.2 + labelGap + chipsH +
      (tags.length ? blockGap : 0) + labelSize * 1.2 + reasonLabelGap;
    const reasonRoom = regionBottom - regionTop - fixedH;

    const reasonText = d.reason || '추천 이유를 적어 주세요.\n어떤 순간에 왜 좋은지 한두 줄이면 충분해요.';
    let rFit = fitText(ctx, reasonText, contentW, 24, W * 0.046, W * 0.022, 500, -0.005);
    let rlh = rFit.size * 1.58;
    while (rFit.lines.length * rlh > reasonRoom && rFit.size > W * 0.022) {
      rFit = fitText(ctx, reasonText, contentW, 24, rFit.size - 3, W * 0.022, 500, -0.005);
      rlh = rFit.size * 1.58;
    }

    const contentH = fixedH + rFit.lines.length * rlh;
    let y = regionTop + Math.max(0, (regionBottom - regionTop - contentH) * 0.45);

    // 왼쪽 세로 액센트 라인
    ctx.fillStyle = C.withAlpha(accent, 0.6);
    ctx.fillRect(pad, y - W * 0.006, Math.max(3, W * 0.0035), Math.min(contentH + W * 0.012, H));

    ctx.save();
    setFont(ctx, labelSize, 700, labelSize * 0.06);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = accent;
    ctx.fillText('이런 순간에', indent, y + labelSize * 0.95);
    ctx.restore();
    y += labelSize * 1.2 + labelGap;

    if (tags.length) {
      drawChips(ctx, tags, indent, y, contentW, {
        size: tagSize, align: 'left', bg: P.chip, color: P.chipInk,
        border: theme.id === 'neon' ? C.withAlpha(accent, 0.32) : null
      });
      y += chipsH + blockGap;
    }

    ctx.save();
    setFont(ctx, labelSize, 700, labelSize * 0.06);
    ctx.textAlign = 'left';
    ctx.fillStyle = P.ink2;
    ctx.fillText('한 줄 감상', indent, y + labelSize * 0.95);
    ctx.restore();
    y += labelSize * 1.2 + reasonLabelGap;

    ctx.save();
    setFont(ctx, rFit.size, 500, -rFit.size * 0.008);
    ctx.textAlign = 'left';
    ctx.fillStyle = d.reason ? P.ink : P.ink3;
    for (let i = 0; i < rFit.lines.length; i++) {
      ctx.fillText(rFit.lines[i], indent, y + rFit.size * 0.82 + i * rlh);
    }
    ctx.restore();

    // CTA
    ctx.save();
    ctx.fillStyle = P.line;
    ctx.fillRect(indent, ctaY - W * 0.075, contentW, Math.max(1.5, W * 0.0016));
    ctx.restore();

    ctx.save();
    const ctaText = '저장하고 다시 듣기';
    setFont(ctx, W * 0.0235, 700, W * 0.004);
    const ctaTextW = ctx.measureText(ctaText).width;
    const ctaPadX = W * 0.038;
    const ctaW = ctaTextW + ctaPadX * 2 + W * 0.05;
    roundRectPath(ctx, indent, ctaY, ctaW, ctaH, ctaH / 2);
    ctx.fillStyle = accent;
    ctx.fill();
    drawBookmark(ctx, indent + ctaPadX, ctaY + ctaH * 0.32, W * 0.0205, P.accentInk);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = P.accentInk;
    ctx.fillText(ctaText, indent + ctaPadX + W * 0.036, ctaY + ctaH / 2 + W * 0.001);
    ctx.restore();

    // 공유 유도
    ctx.save();
    setFont(ctx, W * 0.019, 500, W * 0.002);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = P.ink3;
    ctx.fillText('마음에 들었다면 저장 · 공유해 주세요', indent, shareY);
    ctx.restore();

    drawWatermark(ctx, W, H, theme, d.handle, 3);
  }

  /* ---------- 공개 API ---------- */

  function render(ctx, width, height, data, theme, accent, ratioId, index) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.textBaseline = 'alphabetic';
    ctx.clearRect(0, 0, width, height);
    if (index === 0) drawCoverCard(ctx, width, height, data, theme, accent, ratioId);
    else if (index === 1) drawLyricCard(ctx, width, height, data, theme, accent, ratioId);
    else drawNoteCard(ctx, width, height, data, theme, accent, ratioId);
    ctx.restore();
  }

  global.MusicRender = { render };
})(window);
