// 成熟度算出ロジック（クライアントサイド）。
// アルゴリズムの根拠は ALGORITHM.md を参照。

export const STATUS = Object.freeze({
  MET: "met",
  NOT_MET: "not_met",
  NA: "n_a",
});

const DEFAULT_TRACK = "n";

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`データの読み込みに失敗しました: ${path}`);
  return res.json();
}

export async function loadTpiNextData(baseUrl = "data/tpi-next") {
  const [keyAreas, checkpoints, stages, thresholdTable] = await Promise.all([
    fetchJson(`${baseUrl}/key-areas.json`),
    fetchJson(`${baseUrl}/checkpoints.json`),
    fetchJson(`${baseUrl}/stages.json`),
    fetchJson(`${baseUrl}/threshold-table.json`),
  ]);
  return { framework: "tpi-next", keyAreas, checkpoints, stages, thresholdTable };
}

export async function loadAgileTpiData(baseUrl = "data/agile-tpi") {
  const [keyAreas, checkpoints] = await Promise.all([
    fetchJson(`${baseUrl}/key-areas.json`),
    fetchJson(`${baseUrl}/checkpoints.json`),
  ]);
  return { framework: "agile-tpi", keyAreas, checkpoints };
}

/**
 * 未回答のチェックポイントID一覧を返す（画面下部の「診断する」押下時のバリデーションに使用）。
 */
export function findUnanswered(checkpoints, answers) {
  return checkpoints
    .filter((cp) => !answers[cp.id])
    .map((cp) => cp.id);
}

function buildClusterLookup(thresholdTable, keyAreaCode, track) {
  const row = thresholdTable.find(
    (r) => r.keyAreaCode === keyAreaCode && r.track === track
  );
  const map = new Map();
  if (row) {
    for (const c of row.clusters) map.set(c.checkpointId, c.cluster);
  }
  return map;
}

/**
 * TPI NEXTの成熟度マトリクス用データを算出する。
 * priorityByKeyArea: { "01": "h" | "n" | "l", ... }（未指定のキーエリアは既定値 "n"）
 * 戻り値: 各チェックポイントについて { id, keyAreaCode, stage, status, cluster } の配列
 */
export function computeTpiNextMatrix({ checkpoints, thresholdTable }, answers, priorityByKeyArea = {}) {
  const lookupCache = new Map();

  return checkpoints.map((cp) => {
    const track = priorityByKeyArea[cp.keyAreaCode] || DEFAULT_TRACK;
    const cacheKey = `${cp.keyAreaCode}:${track}`;
    if (!lookupCache.has(cacheKey)) {
      lookupCache.set(cacheKey, buildClusterLookup(thresholdTable, cp.keyAreaCode, track));
    }
    const cluster = lookupCache.get(cacheKey).get(cp.id) ?? null;

    return {
      id: cp.id,
      keyAreaCode: cp.keyAreaCode,
      stage: cp.stage,
      status: answers[cp.id] || null,
      cluster,
    };
  });
}

/**
 * Agile TPIの成熟度マトリクス用データを算出する。
 * TPI NEXTと異なり重要度選択がなく、チェックポイントごとに固定のクラスタ文字を持つ。
 * 戻り値: 各チェックポイントについて { id, keyAreaCode, axis, status, cluster } の配列
 */
export function computeAgileTpiMatrix({ checkpoints }, answers) {
  return checkpoints.map((cp) => ({
    id: cp.id,
    keyAreaCode: cp.keyAreaCode,
    axis: cp.axis,
    status: answers[cp.id] || null,
    cluster: cp.cluster,
  }));
}

/**
 * スパイダーグラフ用のキーエリアごとの達成率(%)を算出する。
 *
 * 算出式: 満たしている数 / (満たしている数 + 満たしていない数) × 100
 * 　　　　（該当なし・未回答は分母から除外する）
 *
 * この式はAgile TPIの graphData シート（perc./'Y'/'NA'/'N'/total 列構成）の
 * 構造から妥当性の高い推定として採用しているが、元ファイルのセル数式そのものを
 * 逆コンパイルして確認したものではない（ALGORITHM.md の「未検証事項」を参照）。
 */
export function computeKeyAreaPercentages(keyAreas, checkpoints, answers) {
  return keyAreas.map((ka) => {
    const statuses = checkpoints
      .filter((cp) => cp.keyAreaCode === ka.code)
      .map((cp) => answers[cp.id]);
    const { met, total, percentage } = tallyPercentage(statuses);
    return { keyAreaCode: ka.code, nameJa: ka.nameJa, met, total, percentage };
  });
}

function tallyPercentage(statuses) {
  let met = 0;
  let notMet = 0;
  for (const status of statuses) {
    if (status === STATUS.MET) met += 1;
    else if (status === STATUS.NOT_MET) notMet += 1;
  }
  const total = met + notMet;
  const percentage = total === 0 ? 0 : Math.round((met / total) * 1000) / 10;
  return { met, total, percentage };
}

/**
 * キーエリア×グループ（TPI NEXTは段階、Agile TPIは軸）ごとの達成率を算出する。
 * matrixは computeTpiNextMatrix() / computeAgileTpiMatrix() の戻り値。
 * groupField は matrix内のグルーピングキー（"stage" または "axis"）、
 * groupValues はその値を表示したい順に並べたもの。
 *
 * 戻り値: キーエリアごとに { keyAreaCode, nameJa, groups: [{ groupValue, met, total, percentage }] }
 */
export function computeGroupedPercentages(matrix, groupField, groupValues, keyAreas) {
  return keyAreas.map((ka) => {
    const groups = groupValues.map((groupValue) => {
      const statuses = matrix
        .filter((c) => c.keyAreaCode === ka.code && c[groupField] === groupValue)
        .map((c) => c.status);
      const { met, total, percentage } = tallyPercentage(statuses);
      return { groupValue, met, total, percentage };
    });
    return { keyAreaCode: ka.code, nameJa: ka.nameJa, groups };
  });
}
