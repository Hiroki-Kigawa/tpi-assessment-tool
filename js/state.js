"use strict";

// 診断結果はDBに保存せず、メモリ上でのみ保持する（リロード・離脱で消える想定）。
let currentAssessment = null;

export function setAssessment(assessment) {
  currentAssessment = assessment;
}

export function getAssessment(framework) {
  if (currentAssessment && currentAssessment.framework === framework) {
    return currentAssessment;
  }
  return null;
}
