# TPI診断ツール

TPI NEXT® / Agile TPI のフレームワークに基づき、テストプロセス成熟度を診断するWebアプリケーション。
詳細な仕様は [PLAN.md](PLAN.md)、成熟度算出ロジックの根拠は [ALGORITHM.md](ALGORITHM.md) を参照。

## 起動方法

ビルド不要・依存インストール不要。`fetch`でJSONを読み込むため、`file://`では動作しない（簡易サーバー経由で開くこと）。

```bash
python3 -m http.server 8000
# ブラウザで http://localhost:8000 を開く
```

## ディレクトリ構成

- `index.html` / `styles.css` — 画面のシェル（ヘッダー・フッター・`#view`のマウント先）
- `js/app.js` — ハッシュルーター（`#/`, `#/assessment/<framework>`, `#/result/<framework>`）
- `js/pages/` — 画面ごとの描画ロジック（トップ・診断・結果）
- `js/maturity.js` — 成熟度算出ロジック（マトリクス算出・達成率算出）
- `data/` — Excel原本から抽出したチェックポイント等のマスタデータ（[data/README.md](data/README.md)参照）
- `scripts/` — マスタデータ抽出用の開発時ツール（Python、実行にはxlrdが必要。アプリ本体の実行には不要）

## 現在の実装状況

トップ画面・診断画面（回答・バリデーション）・成熟度算出ロジックまで実装済み。
結果画面は達成率の簡易表示のみで、成熟度マトリクス／スパイダーグラフ／改善アドバイス／PDF出力は未実装（[PLAN.md](PLAN.md)のフェーズ4以降）。
