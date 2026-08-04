"use strict";

import { getAssessment } from "../state.js";
import { escapeHtml } from "../util.js";

// 成熟度マトリクス・スパイダーグラフ・改善アドバイス・PDF出力はフェーズ4で実装する。
// このフェーズ3時点では、診断画面からの遷移とデータ算出が正しく動くことを
// 確認するための簡易表示にとどめる。
export function renderResult(container, framework) {
  const assessment = getAssessment(framework);

  if (!assessment) {
    container.innerHTML = `
      <div class="empty-state">
        <p>診断データが見つかりませんでした。ページの再読み込みやリンクからの直接アクセスでは結果が保持されません。トップページから診断をやり直してください。</p>
        <a class="btn btn--primary" href="#/">トップに戻る</a>
      </div>
    `;
    return;
  }

  const rows = assessment.percentages
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
