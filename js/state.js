"use strict";

// 回答内容はサーバー・DBには一切送信せず、ブラウザのlocalStorageにのみ保存する。
// ブラウザを閉じても回答が残るようにするための永続化であり、サーバーサイドの
// 永続化（バックエンド・DB）とは異なる（PLAN.mdの「バックエンド・DBなし」方針に反しない）。
const STORAGE_KEY = "tpiAssessmentTool.answers.v1";

function loadStoredAnswers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    // プライベートブラウジング等でlocalStorageが使えない場合はメモリ上のみで動作させる。
    console.warn("localStorageから回答を読み込めませんでした。この状態では保存されません。", err);
    return {};
  }
}

function persistAnswers(allAnswers) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allAnswers));
  } catch (err) {
    console.warn("localStorageへの保存に失敗しました。回答はこのセッション内でのみ保持されます。", err);
  }
}

// { [framework]: { [checkpointId]: "met" | "not_met" | "n_a" } }
const allAnswers = loadStoredAnswers();

// 呼び出すたびに同じオブジェクト参照を返す。呼び出し側でそのままmutateすれば
// 診断画面内では即座に反映されるが、ブラウザを閉じても残すにはsaveDraftAnswers()
// を呼んでlocalStorageへ書き込む必要がある。
export function getDraftAnswers(framework) {
  if (!allAnswers[framework]) {
    allAnswers[framework] = {};
  }
  return allAnswers[framework];
}

export function saveDraftAnswers() {
  persistAnswers(allAnswers);
}

export function clearDraftAnswers(framework) {
  allAnswers[framework] = {};
  persistAnswers(allAnswers);
}
