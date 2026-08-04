# マスタデータ

`scripts/extract_checkpoints.py` により、元Excel（.xls）ファイルから抽出したチェックポイントのマスタデータ。
元の.xlsファイル自体はライセンス上の理由からこのリポジトリには含めていない。

## tpi-next/

- `key-areas.json`：16キーエリア（`code`, `nameEn`, `nameJa`, `descriptionJa`）
- `stages.json`：キーエリア×3段階（Controlled/Efficient/Optimizing）ごとの説明文
- `checkpoints.json`：チェックポイント本体（157件）。`id`は元シートの番号（例`01.c.1`）をそのまま使用

## agile-tpi/

- `key-areas.json`：16キーエリア（`code`, `nameJa`）。TPI NEXTと同一の16項目
- `checkpoints.json`：チェックポイント本体（108件、Excel側`graphData`シートの合計値と一致確認済み）。`id`は元シートの番号（例`1.1.1`）、`cluster`は成熟度算出ロジック（フェーズ2で実装）に使う元データのクラスタ文字

## 未収録（フェーズ2で対応）

成熟度算出に必要な閾値表・クラスタ定義（TPI NEXTの`baseData`/`Cluster A`〜`M`シート）は、
[PLAN.md](../PLAN.md) の開発フェーズ2「成熟度算出ロジックの実装・検証」で別途構造化する。
