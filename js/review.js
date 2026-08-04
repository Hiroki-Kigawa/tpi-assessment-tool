"use strict";

// 診断結果画面の「短評」欄に出す、デフォルトのコメント文言を生成する。
// ルールの詳細はユーザー指定の「文言出力ルール」に基づく。
//
// 優先度付けの考え方（TPI NEXT・Agile TPI共通）：
//   「満たしていない」チェックポイントを、クラスタ文字（A→M/A→G）の昇順で並べ、
//   上位5件を対象とする。ただし5件目と同じクラスタ文字の項目が他にもある場合は、
//   それらもすべて含める（6件以上になることを許容する）。

const TPI_NEXT_STAGES = ["controlled", "efficient", "optimizing"];

const TPI_NEXT_STAGE_INTRO = {
  controlled:
    "TPI NEXTにおいて、先ずはCONTROLLEDを完全達成を目指すことがセオリーです。\n" +
    "未達成のチェックポイントから、優先度の高いクラスタに属するものから順に、達成を目指していきましょう！",
  efficient:
    "多くの組織において目指すべき目標とされるCONTROLLEDを達成しています。\n" +
    "更に高い期待・大志に答えられる品質組織を目指すべく、更なる高みであるEFFICIENTレベルの達成を目指していきましょう！",
  optimizing:
    "EFFICIENTレベルを達成しており、業界上位の水準での品質組織となっています。\n" +
    "更なる高みであるOPTIMIZINGレベルは、「偉大な成果」と呼ばれるレベルです。\n" +
    "品質業界のリーディング組織を目指して、更なる高みを目指しましょう！",
};

const TPI_NEXT_ALL_ACHIEVED = "本プロジェクトの成熟度は業界最高水準に達しています！Excellent！！";

const AGILE_TPI_LEAD = "改善優先度の高いチェックポイントは以下の通りです。";
const AGILE_TPI_ALL_ACHIEVED = "すべてのチェックポイントを満たしています。素晴らしい成果です！";

const AGILE_AXIS_LABELS = {
  professional: "Professional",
  team: "Team",
  organization: "Organization",
};

const PRIORITY_LIST_HEADING = "【優先して着手すべきチェックポイント】";

function buildLookups(checkpoints, keyAreas) {
  const textById = new Map(checkpoints.map((cp) => [cp.id, cp.textJa]));
  const nameByKeyArea = new Map(keyAreas.map((ka) => [ka.code, ka.nameJa]));
  return { textById, nameByKeyArea };
}

// クラスタ文字（1文字のアルファベット）の昇順で並べ、上位5件＋同率5位の項目をすべて含めて返す。
// クラスタ未割当（null）の項目は最下位扱いとし、他に候補が無い場合のみ含める。
function pickTopPriority(cells, limit = 5) {
  const sortKey = (c) => c.cluster || "￿"; // null等は最後尾に回す
  const sorted = [...cells].sort((a, b) => {
    const ka = sortKey(a);
    const kb = sortKey(b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });

  if (sorted.length <= limit) return sorted;

  const cutoff = sortKey(sorted[limit - 1]);
  return sorted.filter((c) => sortKey(c) <= cutoff);
}

function isStageFullyAchieved(matrix, stage) {
  return matrix.filter((c) => c.stage === stage).every((c) => c.status === "met" || c.status === "n_a");
}

// [クラスタ][キーエリア]（1行目）+ 全角スペース1つに続けてチェックポイント本文（2行目）の形式。
function formatItem(cell, labels, textById) {
  const brackets = [cell.cluster || "", ...labels].map((label) => `[${label}]`).join("");
  return `${brackets}\n　${textById.get(cell.id)}`;
}

function formatTpiNextItem(cell, textById, nameByKeyArea) {
  return formatItem(cell, [nameByKeyArea.get(cell.keyAreaCode)], textById);
}

function formatAgileTpiItem(cell, textById, nameByKeyArea) {
  const axisLabel = AGILE_AXIS_LABELS[cell.axis] || cell.axis;
  return formatItem(cell, [axisLabel, nameByKeyArea.get(cell.keyAreaCode)], textById);
}

/**
 * TPI NEXT用の短評デフォルト文言を生成する。
 * matrixは computeTpiNextMatrix() の戻り値（{id, keyAreaCode, stage, status, cluster}[]）。
 */
export function generateTpiNextReview(matrix, checkpoints, keyAreas) {
  const { textById, nameByKeyArea } = buildLookups(checkpoints, keyAreas);

  for (const stage of TPI_NEXT_STAGES) {
    if (isStageFullyAchieved(matrix, stage)) continue;

    const notMet = matrix.filter((c) => c.status === "not_met");
    const top = pickTopPriority(notMet);

    return [
      TPI_NEXT_STAGE_INTRO[stage],
      "",
      PRIORITY_LIST_HEADING,
      ...top.map((cell) => formatTpiNextItem(cell, textById, nameByKeyArea)),
    ].join("\n");
  }

  return TPI_NEXT_ALL_ACHIEVED;
}

/**
 * Agile TPI用の短評デフォルト文言を生成する。
 * matrixは computeAgileTpiMatrix() の戻り値（{id, keyAreaCode, axis, status, cluster}[]）。
 */
export function generateAgileTpiReview(matrix, checkpoints, keyAreas) {
  const { textById, nameByKeyArea } = buildLookups(checkpoints, keyAreas);

  const notMet = matrix.filter((c) => c.status === "not_met");
  if (notMet.length === 0) return AGILE_TPI_ALL_ACHIEVED;

  const top = pickTopPriority(notMet);

  return [
    AGILE_TPI_LEAD,
    "",
    PRIORITY_LIST_HEADING,
    ...top.map((cell) => formatAgileTpiItem(cell, textById, nameByKeyArea)),
  ].join("\n");
}
