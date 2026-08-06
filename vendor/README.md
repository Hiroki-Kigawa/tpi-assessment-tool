# vendor/

PDF出力機能（`js/pdf-export.js`）のために、ビルド不要・CDN不使用の方針を保ちながら
ローカルに同梱している第三者ライブラリ・フォント。

- `jspdf.umd.min.js` — [jsPDF](https://github.com/parallax/jsPDF) v2.5.1（MITライセンス）
- `html2canvas.min.js` — [html2canvas](https://github.com/niklasvh/html2canvas) v1.4.1（MITライセンス）
- `NotoSansJP-subset.ttf` — [Noto Sans JP](https://fonts.google.com/noto/specimen/Noto+Sans+JP)（SIL Open Font License 1.1）を、本ツールで使う文字だけに絞ったサブセット。生成手順は[scripts/subset_pdf_font.py](../scripts/subset_pdf_font.py)を参照
