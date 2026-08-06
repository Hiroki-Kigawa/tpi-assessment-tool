#!/usr/bin/env python3
"""
PDF出力機能（js/pdf-export.js）で埋め込む日本語フォントのサブセットを生成する。

jsPDFは既定では欧文フォントしか持たないため、短評をPDF上で選択・コピー可能な
実テキストとして描画するには日本語フォントの埋め込みが必要になる。フルセットの
Noto Sans JPは数MB〜十数MBあり、依存インストール不要・ビルド不要という方針の
このアプリに常時同梱するには重すぎるため、実際に使う文字だけに絞り込む。

対象文字：
  - チェックポイント本文・キーエリア名（TPI NEXT / Agile TPI 両方）
  - TPI NEXTの段階説明文（stages.json）
  - js/review.js の固定文言（短評のデフォルト生成に使われる）
  - ひらがな・カタカナ・半角/全角記号・数字・英字（ユーザーの自由入力に対応するため）

注意：上記に含まれない非常に稀な漢字をユーザーが短評へ自由入力した場合、
PDF上ではその文字が表示されない（フォールバックの表示になる）。

使い方:
    pip3 install fonttools
    python3 scripts/subset_pdf_font.py --source /path/to/NotoSansJP[wght].ttf

    --source には Google Fonts配布のNoto Sans JP可変フォント（.ttf）を指定する。
    https://github.com/google/fonts/raw/main/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
VENDOR_DIR = Path(__file__).resolve().parent.parent / "vendor"
REVIEW_JS = Path(__file__).resolve().parent.parent / "js" / "review.js"

CHAR_RANGES = [
    (0x3040, 0x309F),  # ひらがな
    (0x30A0, 0x30FF),  # カタカナ
    (0xFF00, 0xFFEF),  # 全角英数・記号
    (0x0020, 0x007E),  # 半角英数記号
    (0x3000, 0x303F),  # 句読点等
    (0x2010, 0x2049),  # ダッシュ・引用符等
]

EXTRA_TEXT = "短評 診断結果 TPI NEXT Agile ページ 続き"


def collect_chars() -> set:
    chars = set()

    def add(value):
        if isinstance(value, str):
            chars.update(value)

    for framework in ("tpi-next", "agile-tpi"):
        for filename in ("checkpoints.json", "key-areas.json"):
            path = DATA_DIR / framework / filename
            if not path.exists():
                continue
            for item in json.loads(path.read_text(encoding="utf-8")):
                for value in item.values():
                    add(value)

    stages_path = DATA_DIR / "tpi-next" / "stages.json"
    if stages_path.exists():
        for item in json.loads(stages_path.read_text(encoding="utf-8")):
            for value in item.values():
                add(value)

    # review.jsの全文字をそのまま対象にする（文字列リテラルだけを正規表現で
    # 抜き出そうとするとエスケープの扱いを誤りやすいため、コード全体を使う。
    # 識別子・記号はASCIIなので害はない）。
    add(REVIEW_JS.read_text(encoding="utf-8"))
    add(EXTRA_TEXT)

    for start, end in CHAR_RANGES:
        for codepoint in range(start, end + 1):
            chars.add(chr(codepoint))

    return chars


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True, help="Noto Sans JPの元フォント(.ttf)")
    parser.add_argument(
        "--output", type=Path, default=VENDOR_DIR / "NotoSansJP-subset.ttf", help="出力先"
    )
    args = parser.parse_args()

    chars = collect_chars()
    print(f"対象文字数: {len(chars)}")

    charset_file = Path("/tmp/pdf-font-charset.txt")
    charset_file.write_text("".join(sorted(chars)), encoding="utf-8")

    static_font = Path("/tmp/NotoSansJP-Regular-static.ttf")
    subprocess.run(
        [
            sys.executable, "-m", "fontTools.varLib.instancer",
            str(args.source), "wght=400", "-o", str(static_font),
        ],
        check=True,
    )

    subprocess.run(
        [
            "pyftsubset", str(static_font),
            f"--output-file={args.output}",
            f"--text-file={charset_file}",
            "--layout-features=*",
            "--no-hinting",
            "--desubroutinize",
            "--drop-tables+=DSIG",
        ],
        check=True,
    )

    size_kb = args.output.stat().st_size / 1024
    print(f"生成完了: {args.output} ({size_kb:.0f} KB)")


if __name__ == "__main__":
    main()
