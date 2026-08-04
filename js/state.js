"use strict";

// 診断結果・回答途中の状態はDBに保存せず、メモリ上でのみ保持する（リロード・離脱で消える想定）。
let currentAssessment = null;

// フレームワークごとの回答下書き。診断画面から結果画面へ遷移した後、
// 「回答を修正する」で診断画面に戻っても選択状態を保持するために使う。
const draftAnswers = new Map();

export function setAssessment(assessment) {
  currentAssessment = assessment;
}

export function getAssessment(framework) {
  if (currentAssessment && currentAssessment.framework === framework) {
    return currentAssessment;
  }
  return null;
}

// 呼び出すたびに同じオブジェクト参照を返すため、呼び出し側でそのまま
// mutateすれば自動的に下書きへ反映される。
export function getDraftAnswers(framework) {
  if (!draftAnswers.has(framework)) {
    draftAnswers.set(framework, {});
  }
  return draftAnswers.get(framework);
}
