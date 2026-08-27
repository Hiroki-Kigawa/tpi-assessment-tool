"use strict";

import {
  loadTpiNextData,
  loadAgileTpiData,
  findUnanswered,
  computeTpiNextMatrix,
  computeAgileTpiMatrix,
  computeKeyAreaPercentages,
  computeGroupedPercentages,
} from "../maturity.js";
import { getDraftAnswers, getPreservedReview, commitReview, getProjectMeta, saveProjectMeta } from "../state.js";
import { renderTpiNextMatrix, renderAgileTpiMatrix } from "../charts/matrix.js";
import { renderSpiderChart } from "../charts/spider.js";
import { generateTpiNextReview, generateAgileTpiReview } from "../review.js";
import { exportResultPdf } from "../pdf-export.js";
import { escapeHtml } from "../util.js";

const FRAMEWORK_TITLES = {
  "tpi-next": "TPI NEXT 診断結果",
  "agile-tpi": "Agile TPI 診断結果",
};

// 「キーエリア別達成率」表の軸列定義。TPI NEXTは段階、Agile TPIは軸でグルーピングする。
const AXIS_CONFIG = {
  "tpi-next": {
    groupField: "stage",
    groups: [
      { value: "controlled", label: "Controlled" },
      { value: "efficient", label: "Efficient" },
      { value: "optimizing", label: "Optimizing" },
    ],
  },
  "agile-tpi": {
    groupField: "axis",
    groups: [
      { value: "professional", label: "Professional" },
      { value: "team", label: "Team" },
      { value: "organization", label: "Organization" },
    ],
  },
};

function formatPercentage(met, total, percentage) {
  return `${percentage}%(${met}/${total})`;
}

// 結果はどこにも保存せず、表示のたびにlocalStorage上の回答（js/state.js）から
// 算出し直す。これにより、診断完了直後の遷移でも、後日ブラウザを開き直して
// このURLに直接アクセスした場合でも同じ結果が再現できる。
// 短評欄は、前回この画面を表示した時点の回答と現在の回答が完全一致していれば
// （＝診断結果に変化がなければ）保存済みの内容をそのまま復元し、1件でも
// 変わっていればjs/review.jsのルールベースで新しく生成し直す（js/state.js参照）。
// これにより、誤って診断画面に戻ってすぐ結果画面に戻ってきただけでは編集内容が
// 消えず、実際に回答を修正した場合だけ新しい診断結果に基づく文言に切り替わる。
//
// PDF出力（js/pdf-export.js）は、画面表示に使っているmatrixHtml/spiderHtml/
// tableHtmlの文字列と、現在のreviewTextareaの内容をそのまま渡す。
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

  const axisConfig = AXIS_CONFIG[framework];
  const groupedPercentages = computeGroupedPercentages(
    matrix,
    axisConfig.groupField,
    axisConfig.groups.map((g) => g.value),
    data.keyAreas
  );

  const percentageHeaderCells = axisConfig.groups
    .map((g) => `<th>${escapeHtml(g.label)}</th>`)
    .join("");

  const percentageRows = data.keyAreas
    .map((ka, index) => {
      const overall = percentages[index];
      const grouped = groupedPercentages[index];
      const groupCells = grouped.groups
        .map((g) => `<td>${formatPercentage(g.met, g.total, g.percentage)}</td>`)
        .join("");

      return `
        <tr>
          <td>${escapeHtml(ka.code)}</td>
          <td>${escapeHtml(ka.nameJa)}</td>
          ${groupCells}
          <td>${formatPercentage(overall.met, overall.total, overall.percentage)}</td>
        </tr>
      `;
    })
    .join("");

  // 画面表示・PDF出力（html2canvasでの画像化）の両方で使い回すテーブル本体。
  const tableHtml = `
    <table class="result-table">
      <thead>
        <tr><th>No.</th><th>キーエリア</th>${percentageHeaderCells}<th>全体</th></tr>
      </thead>
      <tbody>${percentageRows}</tbody>
    </table>
  `;

  const projectMeta = getProjectMeta();
  const todayIso = new Date().toISOString().slice(0, 10);

  const preservedReview = getPreservedReview(framework, answers);
  const reviewText =
    preservedReview !== null
      ? preservedReview
      : framework === "tpi-next"
        ? generateTpiNextReview(matrix, data.checkpoints, data.keyAreas)
        : generateAgileTpiReview(matrix, data.checkpoints, data.keyAreas);
  if (preservedReview === null) {
    // 新しく生成したデフォルト文言を、今回の回答内容とセットで次回比較用の基準点として保存する。
    commitReview(framework, reviewText, answers);
  }

  container.innerHTML = `
    <div class="result">
      <a class="back-link" href="#/assessment/${framework}">← 回答を修正する</a>
      <h1>${escapeHtml(FRAMEWORK_TITLES[framework])}</h1>

      <div class="result__meta">
        <div class="result__meta-field">
          <label class="result__meta-label" for="project-team-name">プロジェクトチーム名</label>
          <input
            type="text"
            id="project-team-name"
            class="result__meta-input"
            placeholder="例：〇〇プロジェクト"
            value="${escapeHtml(projectMeta.teamName || "")}"
          />
        </div>
        <div class="result__meta-field">
          <label class="result__meta-label" for="project-date">実施日</label>
          <input
            type="date"
            id="project-date"
            class="result__meta-input"
            value="${escapeHtml(projectMeta.date || todayIso)}"
          />
        </div>
      </div>

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
        <h2>②スパイダーグラフ</h2>
        <div class="spider-legend">
          <span class="legend-item"><span class="legend-swatch legend-swatch--current"></span>現在の達成率</span>
          <span class="legend-item"><span class="legend-swatch legend-swatch--max"></span>満点（100%）</span>
        </div>
        ${spiderHtml}
      </section>

      <section class="result-section">
        <h2>③キーエリア別達成率</h2>
        <p class="result-section__lead">
          キーエリア×${framework === "tpi-next" ? "段階" : "軸"}ごとの達成率と、全体の達成率（一番右の列）を一覧表示しています。
          達成率はパーセンテージと分子/分母（満たしている数/満たしている＋満たしていない数）を併記しています。
        </p>
        <div class="table-scroll">${tableHtml}</div>
      </section>

      <section class="result-section">
        <h2>④短評</h2>
        <p class="result-section__lead">
          診断結果をもとに自動生成したコメントです。内容は自由に加筆・修正できます（編集内容は、回答を変更しない限り保持されます）。
        </p>
        <textarea id="review-textarea" class="review-textarea">${escapeHtml(reviewText)}</textarea>
      </section>

      <div class="result__pdf">
        <button type="button" id="export-pdf-btn" class="btn btn--primary">PDFをダウンロード</button>
        <p id="export-pdf-error" class="export-pdf-error" hidden></p>
      </div>
    </div>
  `;

  const reviewTextarea = container.querySelector("#review-textarea");
  reviewTextarea.addEventListener("input", () => {
    commitReview(framework, reviewTextarea.value, answers);
  });

  const teamNameInput = container.querySelector("#project-team-name");
  const dateInput = container.querySelector("#project-date");
  teamNameInput.addEventListener("input", () => {
    saveProjectMeta({ teamName: teamNameInput.value });
  });
  dateInput.addEventListener("input", () => {
    saveProjectMeta({ date: dateInput.value });
  });

  const exportBtn = container.querySelector("#export-pdf-btn");
  const exportError = container.querySelector("#export-pdf-error");
  exportBtn.addEventListener("click", async () => {
    exportBtn.disabled = true;
    exportBtn.textContent = "生成中...";
    exportError.hidden = true;

    try {
      await exportResultPdf({
        framework,
        matrixHtml,
        spiderHtml,
        tableHtml,
        reviewText: reviewTextarea.value,
        teamName: teamNameInput.value,
        date: dateInput.value,
      });
    } catch (err) {
      console.error(err);
      exportError.hidden = false;
      exportError.textContent = "PDFの生成に失敗しました。時間をおいて再度お試しください。";
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = "PDFをダウンロード";
    }
  });
}
