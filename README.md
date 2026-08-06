# TPI診断ツール

TPI NEXT® / Agile TPI のフレームワークに基づき、テストプロセス成熟度を診断するWebアプリケーション。
詳細な仕様は [PLAN.md](PLAN.md)、成熟度算出ロジックの根拠は [ALGORITHM.md](ALGORITHM.md) を参照。

## 起動方法

ビルド不要・npm不要。`fetch`でJSONを読み込むため、`file://`では動作しない（簡易サーバー経由で開くこと）。

```bash
python3 -m http.server 8000
# ブラウザで http://localhost:8000 を開く
```

## ディレクトリ構成

- `index.html` / `styles.css` — 画面のシェル（ヘッダー・フッター・`#view`のマウント先）
- `js/app.js` — ハッシュルーター（`#/`, `#/assessment/<framework>`, `#/result/<framework>`）
- `js/pages/` — 画面ごとの描画ロジック（トップ・診断・結果）
- `js/charts/` — 成熟度マトリクス・スパイダーグラフのHTML/SVG描画
- `js/maturity.js` — 成熟度算出ロジック（マトリクス算出・達成率算出）
- `js/review.js` — 短評のデフォルト文言生成ロジック（ルールベース）
- `js/pdf-export.js` — 結果画面のPDF出力（jsPDF + html2canvasを使用）
- `js/state.js` — localStorageへの回答・メモ・短評スナップショットの永続化
- `data/` — Excel原本から抽出したチェックポイント等のマスタデータ（[data/README.md](data/README.md)参照）
- `vendor/` — PDF出力用にローカル同梱したライブラリ・フォント（jsPDF、html2canvas、日本語フォントのサブセット。CDNは使わない）
- `scripts/` — マスタデータ抽出・PDF用フォント生成などの開発時ツール（Python。アプリ本体の実行には不要）

## 現在の実装状況

トップ画面・診断画面（回答・バリデーション・メモ・回答クリア）・成熟度算出ロジック・結果画面（成熟度マトリクス／スパイダーグラフ／キーエリア別達成率／短評／PDF出力）まで実装済み（[PLAN.md](PLAN.md)参照）。
