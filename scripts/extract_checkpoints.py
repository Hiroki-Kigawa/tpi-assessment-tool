#!/usr/bin/env python3
"""
TPI NEXT / Agile TPI の元Excel(.xls)ファイルから、チェックポイントのマスタデータをJSON化する。

このスクリプトはデータ抽出時にのみ使用する開発用ツールであり、
Webアプリケーション本体（クライアントサイド）の実行には不要。

使い方:
    pip3 install xlrd
    python3 scripts/extract_checkpoints.py \
        --tpi-next /path/to/TPI_NEXT_tool_v2.1.2_0-Nippon-one-list_0.xls \
        --agile-tpi /path/to/Agile-TPI-tool-Japanese-v1.0.xls
"""
import argparse
import json
import re
from pathlib import Path

import xlrd

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# TPI NEXTは16キーエリアの英語見出ししか持たないため、Agile TPI（完全日本語版）の
# キーエリア名を共通の正式な日本語名として採用する（両フレームワークで同一の16項目）。
KEY_AREA_NAMES_JA = [
    "利害関係者のコミットメント",
    "関与の度合い",
    "テスト戦略",
    "テスト組織",
    "コミュニケーション",
    "報告",
    "テストプロセス管理",
    "見積もりと計画",
    "メトリクス",
    "欠陥管理",
    "テストウェア管理",
    "手法の実践",
    "テスト担当者のプロ意識",
    "テストケース設計",
    "テストツール",
    "テスト環境",
]

CHECKPOINT_ID_RE = re.compile(r"^\d{2}\.[ceo]\.\d+$")
STAGE_NAMES = {"Controlled": "controlled", "Efficient": "efficient", "Optimizing": "optimizing"}
AGILE_CHECKPOINT_ID_RE = re.compile(r"^\d+\.\d+\.\d+$")


def extract_tpi_next(path: Path) -> None:
    wb = xlrd.open_workbook(str(path))
    sheet = wb.sheet_by_name("All Checkpoints")

    key_areas = []
    checkpoints = []
    stages = []

    key_area_index = 0
    current_key_area_code = None
    current_stage = None
    awaiting_description = False

    for r in range(sheet.nrows):
        col0 = sheet.cell_value(r, 0)
        col1 = sheet.cell_value(r, 1)
        col2 = sheet.cell_value(r, 2)

        if r < 3:
            continue  # シートタイトル・見出し行をスキップ

        if isinstance(col0, str) and col0 in STAGE_NAMES and col2 == "":
            current_stage = STAGE_NAMES[col0]
            stages.append(
                {
                    "keyAreaCode": current_key_area_code,
                    "stage": current_stage,
                    "descriptionJa": col1.strip(),
                }
            )
            continue

        if isinstance(col0, str) and CHECKPOINT_ID_RE.match(col0):
            checkpoints.append(
                {
                    "id": col0,
                    "keyAreaCode": current_key_area_code,
                    "stage": current_stage,
                    "textJa": col1.strip(),
                }
            )
            continue

        if awaiting_description and col1 == "" and col2 == "" and isinstance(col0, str) and col0.strip():
            key_areas[-1]["descriptionJa"] = col0.strip()
            awaiting_description = False
            continue

        if col1 == "" and col2 == "" and isinstance(col0, str) and col0.strip():
            # 新しいキーエリアの見出し行（英語名）
            key_area_index += 1
            current_key_area_code = f"{key_area_index:02d}"
            current_stage = None
            awaiting_description = True
            key_areas.append(
                {
                    "code": current_key_area_code,
                    "nameEn": col0.strip(),
                    "nameJa": KEY_AREA_NAMES_JA[key_area_index - 1],
                    "descriptionJa": None,
                }
            )
            continue

    assert key_area_index == 16, f"期待した16キーエリアと異なる: {key_area_index}"

    out_dir = DATA_DIR / "tpi-next"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "key-areas.json").write_text(
        json.dumps(key_areas, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (out_dir / "stages.json").write_text(
        json.dumps(stages, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (out_dir / "checkpoints.json").write_text(
        json.dumps(checkpoints, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"[TPI NEXT] key-areas: {len(key_areas)}, stages: {len(stages)}, checkpoints: {len(checkpoints)}")


def extract_agile_tpi(path: Path) -> None:
    wb = xlrd.open_workbook(str(path))
    sheet = wb.sheet_by_name("All checkpointsMaster")

    key_areas = []
    checkpoints = []

    key_area_index = 0
    current_key_area_code = None

    for r in range(sheet.nrows):
        col0 = sheet.cell_value(r, 0)
        col1 = sheet.cell_value(r, 1)
        col2 = sheet.cell_value(r, 2)
        col3 = sheet.cell_value(r, 3)
        col4 = sheet.cell_value(r, 4)

        if r < 3:
            continue  # シートタイトル・見出し行をスキップ

        if isinstance(col0, str) and AGILE_CHECKPOINT_ID_RE.match(col0):
            checkpoints.append(
                {
                    "id": col0,
                    "keyAreaCode": current_key_area_code,
                    "cluster": (col1.strip() if isinstance(col1, str) else col1) or None,
                    "textJa": col2.strip(),
                }
            )
            continue

        if col1 == "" and col2 == "" and col3 == "" and col4 == "" and isinstance(col0, str) and col0.strip():
            key_area_index += 1
            current_key_area_code = f"{key_area_index:02d}"
            key_areas.append(
                {
                    "code": current_key_area_code,
                    "nameJa": col0.strip(),
                }
            )
            continue

    assert key_area_index == 16, f"期待した16キーエリアと異なる: {key_area_index}"

    out_dir = DATA_DIR / "agile-tpi"
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "key-areas.json").write_text(
        json.dumps(key_areas, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    (out_dir / "checkpoints.json").write_text(
        json.dumps(checkpoints, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"[Agile TPI] key-areas: {len(key_areas)}, checkpoints: {len(checkpoints)}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tpi-next", type=Path, required=True, help="TPI NEXT の .xls ファイルパス")
    parser.add_argument("--agile-tpi", type=Path, required=True, help="Agile TPI の .xls ファイルパス")
    args = parser.parse_args()

    extract_tpi_next(args.tpi_next)
    extract_agile_tpi(args.agile_tpi)


if __name__ == "__main__":
    main()
