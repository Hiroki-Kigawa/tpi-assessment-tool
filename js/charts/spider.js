"use strict";

// 16キーエリアを軸とするスパイダーグラフ（レーダーチャート）をSVGで描画する。
// 外部チャートライブラリは使わず、極座標の計算のみで組み立てる。

import { escapeHtml } from "../util.js";

const SIZE = 760;
const CENTER = SIZE / 2;
// ラベル見切れ対策として margin = CENTER - MAX_RADIUS - LABEL_OFFSET を
// 「ラベル文字列の最大幅＋余白」ぶんだけ確保しつつ、それ以外は極力グラフ本体に
// 使う（MAX_RADIUSを大きくする）ことで余白を最小化している。
const MAX_RADIUS = 276;
const RINGS = [20, 40, 60, 80, 100];
const LABEL_OFFSET = 16;
const MAX_CHARS_PER_LINE = 6;
// 目盛りラベル（20%〜100%）は真上のスポーク付近にしか描画されないため、
// 先頭（0番目、常に真上に配置される）のキーエリアラベルだけがそれと重なりうる。
// 他のラベル位置には影響させたくないので、先頭だけ追加で外側にずらす。
const TOP_LABEL_EXTRA_OFFSET = 18;

function polarPoint(angle, radiusRatio) {
  const r = MAX_RADIUS * radiusRatio;
  return {
    x: CENTER + r * Math.cos(angle),
    y: CENTER + r * Math.sin(angle),
  };
}

// 先頭（0番目）を12時の位置とし、時計回りに配置する。
function angleForIndex(index, total) {
  return -Math.PI / 2 + (index * 2 * Math.PI) / total;
}

function pointsAttr(points) {
  return points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
}

// 長いキーエリア名はSVGでは自動折返しされないため、中央付近で2行に分割する。
function wrapLabel(text) {
  if (text.length <= MAX_CHARS_PER_LINE) return [text];
  const mid = Math.ceil(text.length / 2);
  return [text.slice(0, mid), text.slice(mid)];
}

export function renderSpiderChart(keyAreaPercentages) {
  const total = keyAreaPercentages.length;
  if (total === 0) return "";

  const ringPolygons = RINGS.map((ring) => {
    const points = keyAreaPercentages.map((_, i) => polarPoint(angleForIndex(i, total), ring / 100));
    return `<polygon points="${pointsAttr(points)}" class="spider-ring" />`;
  }).join("");

  const spokes = keyAreaPercentages
    .map((_, i) => {
      const p = polarPoint(angleForIndex(i, total), 1);
      return `<line x1="${CENTER}" y1="${CENTER}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" class="spider-spoke" />`;
    })
    .join("");

  const maxPoints = keyAreaPercentages.map((_, i) => polarPoint(angleForIndex(i, total), 1));
  const currentPoints = keyAreaPercentages.map((ka, i) =>
    polarPoint(angleForIndex(i, total), Math.max(0, Math.min(ka.percentage, 100)) / 100)
  );

  const markers = keyAreaPercentages
    .map((ka, i) => {
      const p = currentPoints[i];
      return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" class="spider-marker"><title>${escapeHtml(ka.nameJa)}: ${ka.percentage}%</title></circle>`;
    })
    .join("");

  const ringLabels = RINGS.map((ring) => {
    const y = CENTER - MAX_RADIUS * (ring / 100);
    return `<text x="${CENTER + 4}" y="${y.toFixed(1)}" class="spider-ring-label">${ring}%</text>`;
  }).join("");

  const axisLabels = keyAreaPercentages
    .map((ka, i) => {
      const angle = angleForIndex(i, total);
      const extraOffset = i === 0 ? TOP_LABEL_EXTRA_OFFSET : 0;
      const p = polarPoint(angle, 1 + (LABEL_OFFSET + extraOffset) / MAX_RADIUS);
      const cos = Math.cos(angle);
      const anchor = cos > 0.15 ? "start" : cos < -0.15 ? "end" : "middle";
      const lines = wrapLabel(ka.nameJa);
      const tspans = lines
        .map((line, idx) => `<tspan x="${p.x.toFixed(1)}" dy="${idx === 0 ? 0 : 12}">${escapeHtml(line)}</tspan>`)
        .join("");
      return `<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" text-anchor="${anchor}" class="spider-axis-label">${tspans}</text>`;
    })
    .join("");

  return `
    <svg viewBox="0 0 ${SIZE} ${SIZE}" class="spider-chart" role="img" aria-label="キーエリア別達成率のレーダーチャート">
      ${ringPolygons}
      ${spokes}
      <polygon points="${pointsAttr(maxPoints)}" class="spider-max-polygon" />
      <polygon points="${pointsAttr(currentPoints)}" class="spider-current-polygon" />
      ${markers}
      ${ringLabels}
      ${axisLabels}
    </svg>
  `;
}
