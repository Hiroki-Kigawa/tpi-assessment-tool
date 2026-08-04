#!/usr/bin/env python3
"""
data/ 配下のマスタデータおよび js/maturity.js のロジックの整合性を検証する。

js/maturity.js と同じ計算式をPythonで再実装し、以下を確認する:
  1. threshold-table.json の各行が参照するcheckpointIdが実在し、
     該当キーエリアに属し、元シートと同じ並び順になっていること
  2. 各キーエリア×重要度(h/n/l)のクラスタ文字列が単調非減少（A→M方向）であること
     （TPI NEXTの成熟度モデル上、ありえない逆転がないかのデータ健全性チェック）
  3. computeKeyAreaPercentages 相当のロジックが既知の境界値
     （全問「満たしている」→100%、全問「満たしていない」→0%、半々→50%、
     全問「該当なし」→0%）で期待通りになること
  4. Agile TPIのaxis(P/T/O)分布が元ファイルの合計値(P=44,T=32,O=32)と一致すること

このスクリプトは開発時の回帰テスト用であり、実行にExcel(VBA)は不要。
ただし、達成率(%)の算出式そのものは元ファイルのセル数式を逆コンパイルして
確認したものではなく、構造的な根拠に基づく推定である点に注意
（詳細は ALGORITHM.md を参照）。
"""
import json
from collections import Counter
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def load(name: str):
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


def compute_percentage(met: int, not_met: int) -> float:
    denom = met + not_met
    if denom == 0:
        return 0.0
    return round((met / denom) * 1000) / 10


def validate_tpi_next() -> None:
    checkpoints = load("tpi-next/checkpoints.json")
    threshold_table = load("tpi-next/threshold-table.json")

    checkpoints_by_ka = {}
    for cp in checkpoints:
        checkpoints_by_ka.setdefault(cp["keyAreaCode"], []).append(cp["id"])

    errors = []
    for row in threshold_table:
        ka = row["keyAreaCode"]
        expected_ids = checkpoints_by_ka[ka]
        actual_ids = [c["checkpointId"] for c in row["clusters"]]
        if actual_ids != expected_ids[: len(actual_ids)]:
            errors.append(f"KA{ka}/{row['track']}: チェックポイント順が一致しない")

        letters = [c["cluster"] for c in row["clusters"]]
        if letters != sorted(letters):
            errors.append(f"KA{ka}/{row['track']}: クラスタ文字が単調非減少でない: {letters}")

    assert not errors, "\n".join(errors)
    print(f"[OK] TPI NEXT threshold-table: {len(threshold_table)}行、順序・単調性ともに問題なし")

    # 境界値チェック（キーエリア01: 10チェックポイント）
    ka01_ids = checkpoints_by_ka["01"]
    all_met = {cid: "met" for cid in ka01_ids}
    all_not_met = {cid: "not_met" for cid in ka01_ids}
    all_na = {cid: "n_a" for cid in ka01_ids}
    half = {cid: ("met" if i % 2 == 0 else "not_met") for i, cid in enumerate(ka01_ids)}

    def pct(answers):
        met = sum(1 for v in answers.values() if v == "met")
        not_met = sum(1 for v in answers.values() if v == "not_met")
        return compute_percentage(met, not_met)

    assert pct(all_met) == 100.0, pct(all_met)
    assert pct(all_not_met) == 0.0, pct(all_not_met)
    assert pct(all_na) == 0.0, pct(all_na)
    assert pct(half) == 50.0, pct(half)
    print("[OK] キーエリア達成率の境界値（100% / 0% / 該当なしのみ0% / 半々50%）は期待通り")


def validate_agile_tpi() -> None:
    checkpoints = load("agile-tpi/checkpoints.json")
    counts = Counter(cp["axis"] for cp in checkpoints)
    expected = {"professional": 44, "team": 32, "organization": 32}
    assert counts == expected, f"{dict(counts)} != {expected}"
    print(f"[OK] Agile TPI axis分布は元ファイルのgraphData合計値と一致: {dict(counts)}")

    assert len(checkpoints) == 108
    print("[OK] Agile TPIチェックポイント総数は108件で一致")


if __name__ == "__main__":
    validate_tpi_next()
    validate_agile_tpi()
    print("\nすべての検証に成功しました。")
