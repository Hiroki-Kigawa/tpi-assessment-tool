"use strict";

// 成熟度マトリクスの描画。
// TPI NEXTは Controlled / Efficient / Optimizing の3段階、
// Agile TPIは Professional / Team / Organization の3軸で構成される
// （元Excelの `Test maturity matrix` シートに相当。ALGORITHM.md参照）。
// 元シートにはInitial列（チェックポイントを持たず全プロジェクトが到達済みの
// 基礎段階）もあるが、表示上の情報価値が低いため列自体を省略している。

import { escapeHtml } from "../util.js";

const STATUS_CLASS = {
  met: "matrix-cell--met",
  not_met: "matrix-cell--not-met",
  n_a: "matrix-cell--na",
};

const TPI_NEXT_STAGES = ["controlled", "efficient", "optimizing"];
const TPI_NEXT_STAGE_LABELS = {
  controlled: "Controlled",
  efficient: "Efficient",
  optimizing: "Optimizing",
};

const AGILE_AXES = ["professional", "team", "organization"];
const AGILE_AXIS_LABELS = {
  professional: "Professional",
  team: "Team",
  organization: "Organization",
};

// グループ（段階・軸）ごとに、全キーエリア中の最大チェックポイント数を求める。
// 各行のセル列幅をこの最大値で揃えることで、スプレッドシートのようにグリッドが
// 縦に揃った見た目にする（列数が足りない行は空セルで埋める）。
function computeGroupMax(matrix, groupKey, groupValues) {
  const countsByKeyArea = new Map();
  for (const cell of matrix) {
    if (!countsByKeyArea.has(cell.keyAreaCode)) countsByKeyArea.set(cell.keyAreaCode, {});
    const counts = countsByKeyArea.get(cell.keyAreaCode);
    counts[cell[groupKey]] = (counts[cell[groupKey]] || 0) + 1;
  }

  const max = {};
  for (const g of groupValues) max[g] = 0;
  for (const counts of countsByKeyArea.values()) {
    for (const g of groupValues) {
      max[g] = Math.max(max[g], counts[g] || 0);
    }
  }
  return max;
}

function renderCell(cell) {
  const cls = STATUS_CLASS[cell.status] || "matrix-cell--empty";
  const label = cell.cluster || "";
  return `<span class="matrix-cell ${cls}" title="${escapeHtml(cell.id)}">${escapeHtml(label)}</span>`;
}

function renderEmptyCell() {
  return `<span class="matrix-cell matrix-cell--empty" aria-hidden="true"></span>`;
}

function renderGroupCells(cells, count) {
  const padding = Array.from({ length: Math.max(0, count - cells.length) }, renderEmptyCell).join("");
  return `${cells.map(renderCell).join("")}${padding}`;
}

export function renderTpiNextMatrix(matrix, keyAreas) {
  const max = computeGroupMax(matrix, "stage", TPI_NEXT_STAGES);

  const header = `
    <div class="matrix-row matrix-row--header">
      <div class="matrix-row__label">キーエリア</div>
      ${TPI_NEXT_STAGES.map(
        (stage) => `<div class="matrix-row__group" style="--cell-count:${max[stage]}">${TPI_NEXT_STAGE_LABELS[stage]}</div>`
      ).join("")}
    </div>
  `;

  const rows = keyAreas
    .map((ka) => {
      const groups = TPI_NEXT_STAGES.map((stage) => {
        const cells = matrix.filter((c) => c.keyAreaCode === ka.code && c.stage === stage);
        return `<div class="matrix-row__group" style="--cell-count:${max[stage]}">${renderGroupCells(cells, max[stage])}</div>`;
      }).join("");

      return `
        <div class="matrix-row">
          <div class="matrix-row__label">${escapeHtml(ka.code)} ${escapeHtml(ka.nameJa)}</div>
          ${groups}
        </div>
      `;
    })
    .join("");

  return `<div class="matrix-table">${header}${rows}</div>`;
}

export function renderAgileTpiMatrix(matrix, keyAreas) {
  const max = computeGroupMax(matrix, "axis", AGILE_AXES);

  const header = `
    <div class="matrix-row matrix-row--header">
      <div class="matrix-row__label">キーエリア</div>
      ${AGILE_AXES.map(
        (axis) => `<div class="matrix-row__group" style="--cell-count:${max[axis]}">${AGILE_AXIS_LABELS[axis]}</div>`
      ).join("")}
    </div>
  `;

  const rows = keyAreas
    .map((ka) => {
      const groups = AGILE_AXES.map((axis) => {
        const cells = matrix.filter((c) => c.keyAreaCode === ka.code && c.axis === axis);
        return `<div class="matrix-row__group" style="--cell-count:${max[axis]}">${renderGroupCells(cells, max[axis])}</div>`;
      }).join("");

      return `
        <div class="matrix-row">
          <div class="matrix-row__label">${escapeHtml(ka.code)} ${escapeHtml(ka.nameJa)}</div>
          ${groups}
        </div>
      `;
    })
    .join("");

  return `<div class="matrix-table matrix-table--agile">${header}${rows}</div>`;
}
