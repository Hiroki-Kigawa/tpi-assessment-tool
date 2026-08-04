"use strict";

import {
  loadTpiNextData,
  loadAgileTpiData,
  findUnanswered,
  computeTpiNextMatrix,
  computeAgileTpiMatrix,
  computeKeyAreaPercentages,
} from "../maturity.js";
import { getDraftAnswers } from "../state.js";
import { renderTpiNextMatrix, renderAgileTpiMatrix } from "../charts/matrix.js";
import { renderSpiderChart } from "../charts/spider.js";
import { escapeHtml } from "../util.js";

const FRAMEWORK_TITLES = {
  "tpi-next": "TPI NEXT 診断結果",
  "agile-tpi": "Agile TPI 診断結果",
};

// 結果はどこにも保存せず、表示のたびにlocalStorage上の回答（js/state.js）から
// 算出し直す。これにより、診断完了直後の遷移でも、後日ブラウザを開き直して
// このURLに直接アクセスした場合でも同じ結果が再現できる。
//
// 短評／改善アドバイスとPDF出力は次フェーズで実装する（PLAN.mdフェーズ5・6）。
export async function renderResult(container, framework) {
  container.innerHTML = `<p class="loading">読み込み中...</p>`;

  const data =
    framework === "tpi-next" ? await loadTpiNextData() : await loadAgileTpiData();
  const answers = getDraftAnswers(framework);
  const unanswered = findUnanswered(data.checkpoints, answers);

  if (unanswered.length > 0) {
    const answeredCount = data.checkpoints.length - unanswered.length;
    container.innerHTML = `
      <div class="empty-state">
        <p>
          診断がまだ完了していません（${answeredCount} / ${data.checkpoints.length}件回答済み）。
          診断画面ですべてのチェックポイントに回答してください。
        </p>
        <a class="btn btn--primary" href="#/assessment/${framework}">診断を続ける</a>
      </div>
    `;
    return;
  }

  const matrix =
    framework === "tpi-next"
      ? computeTpiNextMatrix(data, answers)
      : computeAgileTpiMatrix(data, answers);
  const percentages = computeKeyAreaPercentages(data.keyAreas, data.checkpoints, answers);

  const matrixHtml =
    framework === "tpi-next"
      ? renderTpiNextMatrix(matrix, data.keyAreas)
      : renderAgileTpiMatrix(matrix, data.keyAreas);
  const spiderHtml = renderSpiderChart(percentages);

  container.innerHTML = `
    <div class="result">
      <a class="back-link" href="#/assessment/${framework}">← 回答を修正する</a>
      <h1>${escapeHtml(FRAMEWORK_TITLES[framework])}</h1>

      <section class="result-section">
        <h2>①成熟度マトリクス</h2>
        <div class="matrix-legend">
          <span class="legend-item"><span class="matrix-cell matrix-cell--met"></span>満たしている</span>
          <span class="legend-item"><span class="matrix-cell matrix-cell--not-met"></span>満たしていない</span>
          <span class="legend-item"><span class="matrix-cell matrix-cell--na"></span>該当なし</span>
        </div>
        <div class="matrix-scroll">${matrixHtml}</div>
      </section>

      <section class="result-section">
        <h2>②スパイダーグラフ（キーエリア別達成率）</h2>
        <div class="spider-legend">
          <span class="legend-item"><span class="legend-swatch legend-swatch--current"></span>現在の達成率</span>
          <span class="legend-item"><span class="legend-swatch legend-swatch--max"></span>満点（100%）</span>
        </div>
        ${spiderHtml}
      </section>

      <p class="result__notice">
        ③短評／改善アドバイスとPDF出力は次のフェーズで実装予定です。
      </p>
    </div>
  `;
}
