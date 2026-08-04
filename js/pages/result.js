"use strict";

import { loadTpiNextData, loadAgileTpiData, findUnanswered, computeKeyAreaPercentages } from "../maturity.js";
import { getDraftAnswers } from "../state.js";
import { escapeHtml } from "../util.js";

// 成熟度マトリクス・スパイダーグラフ・改善アドバイス・PDF出力はフェーズ4で実装する。
// このフェーズ3時点では、診断画面からの遷移とデータ算出が正しく動くことを
// 確認するための簡易表示にとどめる。
//
// 結果はどこにも保存せず、表示のたびにlocalStorage上の回答（js/state.js）から
// 算出し直す。これにより、診断完了直後の遷移でも、後日ブラウザを開き直して
// このURLに直接アクセスした場合でも同じ結果が再現できる。
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

  const percentages = computeKeyAreaPercentages(data.keyAreas, data.checkpoints, answers);

  const rows = percentages
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

  container.innerHTML = `
    <div class="result result--placeholder">
      <a class="back-link" href="#/assessment/${framework}">← 回答を修正する</a>
      <h1>診断結果（簡易表示）</h1>
      <p class="result__notice">
        成熟度マトリクス・スパイダーグラフ・改善アドバイス・PDF出力は次のフェーズで実装予定です。
        現時点ではキーエリアごとの達成率のみを表示しています。
      </p>
      <table class="result-table">
        <thead>
          <tr><th>No.</th><th>キーエリア</th><th>達成率</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}
