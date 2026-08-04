#!/usr/bin/env python3
"""
成熟度算出ロジックのマスタデータ（TPI NEXTのbaseData等）をJSON化する。

VBAソース(olevba解析)から判明した内容:
  - TPI NEXTの各チェックポイントには、キーエリアの重要度設定(H=高/N=標準/L=低)ごとに
    異なる「到達クラスタ文字」が割り当てられている。この対応表が baseData シート
    （16キーエリア×3重要度=48行）であり、各行はチェックポイントの出現順（Controlled→
    Efficient→Optimizingの元シート順）に並んだクラスタ文字の配列になっている。
    （VBA Blad38.updateMaturityMatrix が Blad37の "<KA>_<H|N|L>_Clusters" という
    名前付き範囲からこの配列をそのままマトリクスのセルへ書き込んでいることを確認）
  - Test maturity matrix シートのH/N/L選択列（既定値）はすべて "N"（標準）。
  - Agile TPIはH/N/L選択を持たず、チェックポイントごとに単一のクラスタ文字
    （All checkpointsMasterシートの2列目）を持つ。
  - Agile TPIのチェックポイントIDは "<キーエリア番号>.<軸番号>.<連番>" の形式で、
    軸番号 1=Professional(P) / 2=Team(T) / 3=Organization(O) を表す。
    （VBA Blad43.setNbrOffCheckpoints が ".1." / ".2." / ".3." の文字列判定で
    P/T/Oを分類し、達成数(Y/NA/N)を集計していることを確認）

使い方:
    python3 scripts/extract_maturity_rules.py \
        --tpi-next /path/to/TPI_NEXT_tool_v2.1.2_0-Nippon-one-list_0.xls
"""
import argparse
import json
from pathlib import Path

import xlrd

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

AXIS_BY_SUBGROUP = {"1": "professional", "2": "team", "3": "organization"}


def extract_tpi_next_thresholds(path: Path) -> None:
    wb = xlrd.open_workbook(str(path))
    sheet = wb.sheet_by_name("baseData")

    checkpoints = json.loads((DATA_DIR / "tpi-next" / "checkpoints.json").read_text(encoding="utf-8"))
    checkpoints_by_ka = {}
    for cp in checkpoints:
        checkpoints_by_ka.setdefault(cp["keyAreaCode"], []).append(cp["id"])

    threshold_table = []  # [{ keyAreaCode, track, clusters: [{checkpointId, cluster}] }]

    for r in range(sheet.nrows):
        ka_num = int(sheet.cell_value(r, 0))
        ka_code = f"{ka_num:02d}"
        track = sheet.cell_value(r, 2)  # 'h' | 'n' | 'l'
        letters = [sheet.cell_value(r, c) for c in range(3, sheet.ncols)]
        letters = [l for l in letters if isinstance(l, str) and l.strip()]

        checkpoint_ids = checkpoints_by_ka[ka_code]
        assert len(letters) <= len(checkpoint_ids), (
            f"KA{ka_code} track={track}: クラスタ文字数({len(letters)})が"
            f"チェックポイント数({len(checkpoint_ids)})を超えている"
        )

        clusters = [
            {"checkpointId": checkpoint_ids[i], "cluster": letters[i]}
            for i in range(len(letters))
        ]
        threshold_table.append({"keyAreaCode": ka_code, "track": track, "clusters": clusters})

    out_dir = DATA_DIR / "tpi-next"
    (out_dir / "threshold-table.json").write_text(
        json.dumps(threshold_table, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"[TPI NEXT] threshold-table rows: {len(threshold_table)} (16 key areas x h/n/l)")


def enrich_agile_tpi_axis() -> None:
    path = DATA_DIR / "agile-tpi" / "checkpoints.json"
    checkpoints = json.loads(path.read_text(encoding="utf-8"))

    for cp in checkpoints:
        subgroup = cp["id"].split(".")[1]
        cp["axis"] = AXIS_BY_SUBGROUP[subgroup]

    path.write_text(json.dumps(checkpoints, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    from collections import Counter

    counts = Counter(cp["axis"] for cp in checkpoints)
    print(f"[Agile TPI] axis distribution: {dict(counts)} (期待値: P=44, T=32, O=32)")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tpi-next", type=Path, required=True, help="TPI NEXT の .xls ファイルパス")
    args = parser.parse_args()

    extract_tpi_next_thresholds(args.tpi_next)
    enrich_agile_tpi_axis()


if __name__ == "__main__":
    main()
