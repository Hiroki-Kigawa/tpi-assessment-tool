"use strict";

// 成熟度マトリクスの描画。
// TPI NEXTは Controlled / Efficient / Optimizing の3段階、
// Agile TPIは Professional / Team / Organization の3軸で構成される
// （元Excelの `Test maturity matrix` シートに相当。ALGORITHM.md参照）。
// 元シートにはInitial列（チェックポイントを持たず全プロジェクトが到達済みの
// 基礎段階）もあるが、表示上の情報価値が低いため列自体を省略している。
//
// 各軸の列幅は常に均等（CSS側でflex:1）。列内のチェックポイントセルも
// flex:1で軸の幅をチェックポイント数だけ均等分割するため、キーエリアごとに
// 該当軸のチェックポイント数が異なっても（1個なら軸幅いっぱいの1マス、
// 4個なら4分割、等）余白なく敷き詰められる。

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

function renderCell(cell) {
  const cls = STATUS_CLASS[cell.status] || "matrix-cell--empty";
  const label = cell.cluster || "";
  return `<span class="matrix-cell ${cls}" title="${escapeHtml(cell.id)}">${escapeHtml(label)}</span>`;
}

function renderGroupCells(cells) {
  return cells.map(renderCell).join("");
}

export function renderTpiNextMatrix(matrix, keyAreas) {
  const header = `
    <div class="matrix-row matrix-row--header">
      <div class="matrix-row__label">キーエリア</div>
      ${TPI_NEXT_STAGES.map((stage) => `<div class="matrix-row__group">${TPI_NEXT_STAGE_LABELS[stage]}</div>`).join("")}
    </div>
  `;

  const rows = keyAreas
    .map((ka) => {
      const groups = TPI_NEXT_STAGES.map((stage) => {
        const cells = matrix.filter((c) => c.keyAreaCode === ka.code && c.stage === stage);
        return `<div class="matrix-row__group">${renderGroupCells(cells)}</div>`;
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
  const header = `
    <div class="matrix-row matrix-row--header">
      <div class="matrix-row__label">キーエリア</div>
      ${AGILE_AXES.map((axis) => `<div class="matrix-row__group">${AGILE_AXIS_LABELS[axis]}</div>`).join("")}
    </div>
  `;

  const rows = keyAreas
    .map((ka) => {
      const groups = AGILE_AXES.map((axis) => {
        const cells = matrix.filter((c) => c.keyAreaCode === ka.code && c.axis === axis);
        return `<div class="matrix-row__group">${renderGroupCells(cells)}</div>`;
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
