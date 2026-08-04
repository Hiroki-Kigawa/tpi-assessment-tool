"use strict";

import { loadTpiNextData, loadAgileTpiData, findUnanswered } from "../maturity.js";
import { getDraftAnswers, saveDraftAnswers, getDraftNotes, saveDraftNotes } from "../state.js";
import { escapeHtml } from "../util.js";

const FRAMEWORK_TITLES = {
  "tpi-next": "TPI NEXT 診断",
  "agile-tpi": "Agile TPI 診断",
};

const STAGE_LABELS = {
  controlled: "Controlled",
  efficient: "Efficient",
  optimizing: "Optimizing",
};

const AXIS_LABELS = {
  professional: "Professional",
  team: "Team",
  organization: "Organization",
};

export async function renderAssessment(container, framework) {
  container.innerHTML = `<p class="loading">読み込み中...</p>`;

  const data =
    framework === "tpi-next" ? await loadTpiNextData() : await loadAgileTpiData();

  // getDraftAnswersは呼び出すたびに同じオブジェクト参照を返すため、
  // ここでの変更（change時のanswers[id]=value）がそのまま下書きとして
  // 保持され、結果画面から「回答を修正する」で戻っても選択状態が残る。
  // change時にsaveDraftAnswers()でlocalStorageへ書き込むため、
  // ブラウザを閉じても回答が残る。メモも同様の仕組みでgetDraftNotes/saveDraftNotesを使う。
  const answers = getDraftAnswers(framework);
  const notes = getDraftNotes(framework);

  container.innerHTML = buildMarkup(framework, data, answers, notes);

  const form = container.querySelector("#assessment-form");
  const totalCount = data.checkpoints.length;

  updateProgress(container, answers, totalCount);

  form.addEventListener("change", (event) => {
    const radio = event.target.closest("input[type=radio]");
    if (!radio) return;

    const checkpointId = radio.dataset.checkpointId;
    answers[checkpointId] = radio.value;
    saveDraftAnswers();

    const block = container.querySelector(`[data-checkpoint-block="${cssAttrEscape(checkpointId)}"]`);
    if (block) block.classList.remove("checkpoint--error");

    updateProgress(container, answers, totalCount);
  });

  form.addEventListener("input", (event) => {
    const textarea = event.target.closest("textarea.checkpoint__note");
    if (!textarea) return;

    const checkpointId = textarea.dataset.noteCheckpointId;
    notes[checkpointId] = textarea.value;
    saveDraftNotes();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearValidationErrors(container);

    const unanswered = findUnanswered(data.checkpoints, answers);
    if (unanswered.length > 0) {
      showValidationErrors(container, unanswered);
      return;
    }

    // 結果画面は表示のたびにlocalStorageの回答から算出し直すため、
    // ここでは遷移するだけでよい（直接#/resultへアクセスした場合と同じ経路になる）。
    location.hash = `#/result/${framework}`;
  });
}

function buildMarkup(framework, data, answers, notes) {
  const keyAreaSections = data.keyAreas
    .map((ka) => buildKeyAreaSection(framework, ka, data, answers, notes))
    .join("");

  return `
    <div class="assessment">
      <a class="back-link" href="#/">← トップに戻る</a>
      <header class="assessment__header">
        <h1>${escapeHtml(FRAMEWORK_TITLES[framework])}</h1>
        <p class="assessment__lead">
          すべてのチェックポイントについて「満たしている」「満たしていない」「該当なし」のいずれかを選択してください。
        </p>
      </header>

      <div class="progress" aria-live="polite">
        <div class="progress__bar-track"><div id="progress-bar" class="progress__bar-fill"></div></div>
        <span id="progress-count" class="progress__count"></span>
      </div>

      <div id="validation-message" class="validation-message" hidden></div>

      <form id="assessment-form" novalidate>
        ${keyAreaSections}
        <div class="assessment__submit">
          <button type="submit" class="btn btn--primary">診断する</button>
        </div>
      </form>
    </div>
  `;
}

function buildKeyAreaSection(framework, keyArea, data, answers, notes) {
  const items = data.checkpoints.filter((cp) => cp.keyAreaCode === keyArea.code);
  const body =
    framework === "tpi-next"
      ? buildTpiNextStages(keyArea, items, data.stages, answers, notes)
      : buildCheckpointList(items, answers, notes);

  return `
    <details class="key-area" open>
      <summary class="key-area__summary">
        <span class="key-area__code">${escapeHtml(keyArea.code)}</span>
        <span class="key-area__name">${escapeHtml(keyArea.nameJa)}</span>
      </summary>
      ${keyArea.descriptionJa ? `<p class="key-area__description">${escapeHtml(keyArea.descriptionJa)}</p>` : ""}
      ${body}
    </details>
  `;
}

function buildTpiNextStages(keyArea, items, stages, answers, notes) {
  return ["controlled", "efficient", "optimizing"]
    .map((stageKey) => {
      const stageItems = items.filter((cp) => cp.stage === stageKey);
      if (stageItems.length === 0) return "";

      const stageInfo = stages.find(
        (s) => s.keyAreaCode === keyArea.code && s.stage === stageKey
      );

      return `
        <div class="stage">
          <h3 class="stage__title">${STAGE_LABELS[stageKey]}</h3>
          ${stageInfo ? `<p class="stage__description">${escapeHtml(stageInfo.descriptionJa)}</p>` : ""}
          ${buildCheckpointList(stageItems, answers, notes)}
        </div>
      `;
    })
    .join("");
}

function buildCheckpointList(items, answers, notes) {
  return `<ol class="checkpoint-list">${items
    .map((cp) => buildCheckpointRow(cp, answers, notes))
    .join("")}</ol>`;
}

function buildCheckpointRow(checkpoint, answers, notes) {
  const axisBadge = checkpoint.axis
    ? `<span class="badge badge--axis">${AXIS_LABELS[checkpoint.axis]}</span>`
    : "";
  const selectedValue = answers[checkpoint.id];
  const noteValue = notes[checkpoint.id] || "";

  return `
    <li class="checkpoint" data-checkpoint-block="${escapeHtml(checkpoint.id)}">
      <div class="checkpoint__text">
        ${axisBadge}
        <span>${escapeHtml(checkpoint.textJa)}</span>
      </div>
      <div class="checkpoint__options" role="radiogroup">
        ${buildRadioOption(checkpoint.id, "met", "満たしている", selectedValue)}
        ${buildRadioOption(checkpoint.id, "not_met", "満たしていない", selectedValue)}
        ${buildRadioOption(checkpoint.id, "n_a", "該当なし", selectedValue)}
        ${buildNoteTextarea(checkpoint.id, noteValue)}
      </div>
    </li>
  `;
}

function buildNoteTextarea(checkpointId, noteValue) {
  const textareaId = `note-${checkpointId}`;
  return `<textarea
      id="${escapeHtml(textareaId)}"
      class="checkpoint__note"
      data-note-checkpoint-id="${escapeHtml(checkpointId)}"
      aria-label="メモ"
      placeholder="メモ（任意）"
      maxlength="2000"
    >${escapeHtml(noteValue)}</textarea>`;
}

function buildRadioOption(checkpointId, value, label, selectedValue) {
  const inputId = `cp-${checkpointId}-${value}`;
  return `
    <label class="radio-pill" for="${escapeHtml(inputId)}">
      <input
        type="radio"
        id="${escapeHtml(inputId)}"
        name="cp-${escapeHtml(checkpointId)}"
        value="${value}"
        data-checkpoint-id="${escapeHtml(checkpointId)}"
        ${selectedValue === value ? "checked" : ""}
      />
      <span>${label}</span>
    </label>
  `;
}

function updateProgress(container, answers, totalCount) {
  const answeredCount = Object.keys(answers).length;
  const percentage = totalCount === 0 ? 0 : Math.round((answeredCount / totalCount) * 100);

  container.querySelector("#progress-bar").style.width = `${percentage}%`;
  container.querySelector("#progress-count").textContent =
    `${answeredCount} / ${totalCount} 件回答済み`;
}

function clearValidationErrors(container) {
  container
    .querySelectorAll(".checkpoint--error")
    .forEach((el) => el.classList.remove("checkpoint--error"));

  const message = container.querySelector("#validation-message");
  message.hidden = true;
  message.textContent = "";
}

function showValidationErrors(container, unansweredIds) {
  const message = container.querySelector("#validation-message");
  message.hidden = false;
  message.textContent = `未回答のチェックポイントが${unansweredIds.length}件あります。背景色のついた項目を確認してください。`;

  let firstBlock = null;
  for (const id of unansweredIds) {
    const block = container.querySelector(`[data-checkpoint-block="${cssAttrEscape(id)}"]`);
    if (!block) continue;
    block.classList.add("checkpoint--error");
    if (!firstBlock) firstBlock = block;
  }

  message.scrollIntoView({ behavior: "smooth", block: "start" });
  if (firstBlock) {
    setTimeout(() => firstBlock.scrollIntoView({ behavior: "smooth", block: "center" }), 400);
  }
}

// data-checkpoint-block 属性値にチェックポイントID（例 "01.c.1"）をそのまま使うため、
// querySelector の属性セレクタ内で意図しない文字として解釈されないようエスケープする。
function cssAttrEscape(value) {
  return value.replace(/["\\]/g, "\\$&");
}
