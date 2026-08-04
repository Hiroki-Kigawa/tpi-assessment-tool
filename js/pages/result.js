"use strict";

import {
  loadTpiNextData,
  loadAgileTpiData,
  findUnanswered,
  computeTpiNextMatrix,
  computeAgileTpiMatrix,
  computeKeyAreaPercentages,
} from "../maturity.js";
import { getDraftAnswers, getSavedReview, saveReview } from "../state.js";
import { renderTpiNextMatrix, renderAgileTpiMatrix } from "../charts/matrix.js";
import { renderSpiderChart } from "../charts/spider.js";
import { generateTpiNextReview, generateAgileTpiReview } from "../review.js";
import { escapeHtml } from "../util.js";

const FRAMEWORK_TITLES = {
  "tpi-next": "TPI NEXT 診断結果",
  "agile-tpi": "Agile TPI 診断結果",
};

// 結果はどこにも保存せず、表示のたびにlocalStorage上の回答（js/state.js）から
// 算出し直す。これにより、診断完了直後の遷移でも、後日ブラウザを開き直して
// このURLに直接アクセスした場合でも同じ結果が再現できる。
// 短評欄はユーザーが加筆・修正した内容のみlocalStorageに保存し（js/state.js）、
// 未編集の場合は毎回js/review.jsのルールベースで文言を生成し直す。
//
// PDF出力は次フェーズで実装する（PLAN.mdフェーズ6）。
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

  const percentageRows = percentages
    .map(
      (p) => `
        <tr>
          <td>${escapeHtml(p.keyAreaCode)}</td>
          <td>${escapeHtml(p.nameJa)}</td>
          <td>${p.percentage}%</td>
        </tr>
      `
    )
    .join("");

  const defaultReview =
    framework === "tpi-next"
      ? generateTpiNextReview(matrix, data.checkpoints, data.keyAreas)
      : generateAgileTpiReview(matrix, data.checkpoints, data.keyAreas);
  const savedReview = getSavedReview(framework);
  const reviewText = savedReview !== null ? savedReview : defaultReview;

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

      <section class="result-section">
        <h2>キーエリア毎の達成率</h2>
        <p class="result-section__lead">
          上記グラフの数値を、キーエリアごとの達成率一覧として表示しています。
        </p>
        <table class="result-table">
          <thead>
            <tr><th>No.</th><th>キーエリア</th><th>達成率</th></tr>
          </thead>
          <tbody>${percentageRows}</tbody>
        </table>
      </section>

      <section class="result-section">
        <h2>③短評</h2>
        <p class="result-section__lead">
          診断結果をもとに自動生成したコメントです。内容は自由に加筆・修正できます（編集内容はこのブラウザに保存されます）。
        </p>
        <textarea id="review-textarea" class="review-textarea">${escapeHtml(reviewText)}</textarea>
      </section>

      <p class="result__notice">
        PDF出力は次のフェーズで実装予定です。
      </p>
    </div>
  `;

  const reviewTextarea = container.querySelector("#review-textarea");
  reviewTextarea.addEventListener("input", () => {
    saveReview(framework, reviewTextarea.value);
  });
}
