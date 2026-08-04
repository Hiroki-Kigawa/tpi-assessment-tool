# マスタデータ

`scripts/extract_checkpoints.py`・`scripts/extract_maturity_rules.py` により、元Excel（.xls）ファイルから抽出したマスタデータ。
元の.xlsファイル自体はライセンス上の理由からこのリポジトリには含めていない。
成熟度算出ロジックの根拠は [ALGORITHM.md](../ALGORITHM.md) を参照。

## tpi-next/

- `key-areas.json`：16キーエリア（`code`, `nameEn`, `nameJa`, `descriptionJa`）
- `stages.json`：キーエリア×3段階（Controlled/Efficient/Optimizing）ごとの説明文
- `checkpoints.json`：チェックポイント本体（157件）。`id`は元シートの番号（例`01.c.1`）をそのまま使用
- `threshold-table.json`：キーエリア×重要度(h/n/l)ごとの、チェックポイント→達成クラスタ文字の対応表（`baseData`シート由来、48行）

## agile-tpi/

- `key-areas.json`：16キーエリア（`code`, `nameJa`）。TPI NEXTと同一の16項目
- `checkpoints.json`：チェックポイント本体（108件、Excel側`graphData`シートの合計値と一致確認済み）。`id`は元シートの番号（例`1.1.1`）、`cluster`は成熟度算出ロジックに使う元データのクラスタ文字、`axis`はProfessional/Team/Organizationのいずれか（IDの第2セグメントから導出）

## 未検証事項

スパイダーグラフの達成率(%)の算出式は、元ファイルのセル数式を逆コンパイルして確認したものではなく、構造的根拠に基づく推定である。詳細は [ALGORITHM.md](../ALGORITHM.md) の「未検証事項」を参照。
