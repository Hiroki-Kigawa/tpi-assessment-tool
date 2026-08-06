"use strict";

// PDF出力機能。
//
// - ①②③（成熟度マトリクス・スパイダーグラフ・キーエリア別達成率）は、画面表示用の
//   HTML断片をそのまま流用しつつ印刷用にコンパクトなサイズへ上書きした非表示DOMを
//   html2canvasで画像化してPDFへ貼り付ける（色・罫線の見た目の忠実性を優先する）。
// - ④短評は選択・コピー可能な実テキストとしてjsPDFで直接描画する。
//   日本語フォントの埋め込みが必要なため、vendor/NotoSansJP-subset.ttf
//   （scripts/subset_pdf_font.pyで生成。本ツールで使う文字だけに絞ったサブセット）
//   を読み込む。チェックポイント本文・キーエリア名等に含まれない非常に稀な漢字を
//   ユーザーが短評へ自由入力した場合、その文字だけPDF上で表示されないことがある。
//
// レイアウトは原則A4縦1ページに収める。短評だけが可変長になり得るため、
// 残りスペースに応じてフォントサイズを自動縮小し（下限8pt）、それでも
// 収まらない場合は短評のみ2ページ目以降に続ける（内容は切り捨てない）。

const FRAMEWORK_TITLES = {
  "tpi-next": "TPI NEXT 診断結果",
  "agile-tpi": "Agile TPI 診断結果",
};

const FONT_URL = "vendor/NotoSansJP-subset.ttf";
const FONT_FILE_NAME = "NotoSansJP-subset.ttf";
const FONT_NAME = "NotoSansJP";

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const MARGIN_MM = 15;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_MM * 2;
const CAPTURE_WIDTH_PX = 900; // 900px ÷ 180mm = 5px/mm 換算
const MM_PER_PT = 0.3527778;

const REVIEW_HEADING = "短評";
const REVIEW_FONT_SIZES = [11, 10, 9, 8]; // pt。先頭から試し、収まる最大サイズを採用する
const REVIEW_LINE_HEIGHT_FACTOR = 1.5;

let cachedFontBase64 = null;

async function loadFontBase64() {
  if (cachedFontBase64) return cachedFontBase64;

  const res = await fetch(FONT_URL);
  if (!res.ok) throw new Error("PDF用フォントの読み込みに失敗しました");
  const buffer = await res.arrayBuffer();

  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  cachedFontBase64 = btoa(binary);
  return cachedFontBase64;
}

function formatDateJa(date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

function buildFileName(framework) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${framework}_診断結果_${yyyy}${mm}${dd}.pdf`;
}

// 画面表示用のマトリクス・スパイダーグラフ・表のHTML断片を、非表示のコンテナに
// 印刷向けのコンパクトなサイズで流し込む。スタイルは同じクラス名（.matrix-cell等）
// を使い回し、IDセレクタで上書きすることで既存のstyles.cssのルールに勝たせている。
function buildCaptureContainer({ framework, matrixHtml, spiderHtml, tableHtml }) {
  const container = document.createElement("div");
  container.id = "pdf-capture-root";
  container.innerHTML = `
    <style>
      #pdf-capture-root {
        position: fixed;
        left: -99999px;
        top: 0;
        width: ${CAPTURE_WIDTH_PX}px;
        background: #fff;
        padding: 6px;
        font-family: -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif;
        color: #1f2430;
      }
      #pdf-capture-root h1 {
        font-size: 20px;
        margin: 0 0 4px;
      }
      #pdf-capture-root .pdf-meta {
        font-size: 12px;
        color: #5b6472;
        margin: 0 0 14px;
      }
      #pdf-capture-root .pdf-legend {
        display: flex;
        gap: 16px;
        font-size: 10px;
        color: #5b6472;
        margin-bottom: 8px;
      }
      #pdf-capture-root .pdf-legend span {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      #pdf-capture-root .pdf-row {
        display: flex;
        gap: 16px;
        align-items: flex-start;
        margin-bottom: 14px;
      }
      #pdf-capture-root .pdf-row > div:first-child {
        flex: 0 0 auto;
      }
      #pdf-capture-root .pdf-row > div:last-child {
        flex: 0 0 auto;
      }
      #pdf-capture-root .spider-chart {
        width: 380px;
      }
      #pdf-capture-root .matrix-row {
        gap: 8px;
        padding: 2px 0;
      }
      #pdf-capture-root .matrix-row--header {
        font-size: 8px;
        padding-bottom: 3px;
      }
      #pdf-capture-root .matrix-row__label {
        width: 130px;
        font-size: 9px;
      }
      #pdf-capture-root .matrix-cell {
        width: 14px;
        height: 14px;
        font-size: 7px;
        border-radius: 2px;
      }
      #pdf-capture-root .matrix-row__group {
        width: calc(var(--cell-count, 1) * 14px + (var(--cell-count, 1) - 1) * 2px);
      }
      #pdf-capture-root .matrix-row:not(.matrix-row--header) .matrix-row__group {
        grid-template-columns: repeat(var(--cell-count, 1), 14px);
        gap: 2px;
      }
      #pdf-capture-root .result-table {
        font-size: 9px;
        width: auto;
      }
      #pdf-capture-root .result-table th,
      #pdf-capture-root .result-table td {
        padding: 3px 7px;
      }
    </style>
    <h1>${FRAMEWORK_TITLES[framework]}</h1>
    <p class="pdf-meta">実施日: ${formatDateJa(new Date())}</p>
    <div class="pdf-legend">
      <span><span class="matrix-cell matrix-cell--met"></span>満たしている</span>
      <span><span class="matrix-cell matrix-cell--not-met"></span>満たしていない</span>
      <span><span class="matrix-cell matrix-cell--na"></span>該当なし</span>
    </div>
    <div class="pdf-row">
      <div>${matrixHtml}</div>
      <div>${spiderHtml}</div>
    </div>
    <div>${tableHtml}</div>
  `;
  document.body.appendChild(container);
  return container;
}

// 短評を実テキストとして描画する。フォントサイズを大きい方から試し、
// 残りスペースに収まる最大サイズを採用する。収まらなければ最小サイズのまま
// ページをまたいで続きを描画する（内容は切り捨てない）。
function renderReviewText(doc, reviewText, startY, pageBottom) {
  const headingSize = 12;
  doc.setFont(FONT_NAME, "normal");
  doc.setFontSize(headingSize);
  doc.text(REVIEW_HEADING, MARGIN_MM, startY + headingSize * MM_PER_PT);

  let cursorY = startY + headingSize * MM_PER_PT * REVIEW_LINE_HEIGHT_FACTOR;
  const availableHeight = pageBottom - cursorY;

  let chosenSize = REVIEW_FONT_SIZES[REVIEW_FONT_SIZES.length - 1];
  let chosenLines = null;
  for (const size of REVIEW_FONT_SIZES) {
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(reviewText, CONTENT_WIDTH_MM);
    const lineHeight = size * MM_PER_PT * REVIEW_LINE_HEIGHT_FACTOR;
    if (lines.length * lineHeight <= availableHeight) {
      chosenSize = size;
      chosenLines = lines;
      break;
    }
  }

  doc.setFontSize(chosenSize);
  const lineHeight = chosenSize * MM_PER_PT * REVIEW_LINE_HEIGHT_FACTOR;
  const lines = chosenLines || doc.splitTextToSize(reviewText, CONTENT_WIDTH_MM);

  let index = 0;
  while (index < lines.length) {
    const linesPerPage = Math.max(1, Math.floor((pageBottom - cursorY) / lineHeight));
    const pageLines = lines.slice(index, index + linesPerPage);

    for (const line of pageLines) {
      cursorY += lineHeight;
      doc.text(line, MARGIN_MM, cursorY - lineHeight * 0.3);
    }
    index += pageLines.length;

    if (index < lines.length) {
      doc.addPage();
      cursorY = MARGIN_MM;
    }
  }
}

/**
 * 診断結果画面の①②③④をレイアウトしたPDFを生成し、ダウンロードする。
 * matrixHtml/spiderHtml/tableHtmlは画面表示で使っているHTML文字列をそのまま渡す。
 */
export async function exportResultPdf({ framework, matrixHtml, spiderHtml, tableHtml, reviewText }) {
  if (!window.jspdf || !window.html2canvas) {
    throw new Error("PDF生成に必要なライブラリの読み込みに失敗しました。ページを再読み込みしてください。");
  }

  const [fontBase64] = await Promise.all([loadFontBase64()]);

  const container = buildCaptureContainer({ framework, matrixHtml, spiderHtml, tableHtml });
  let canvas;
  try {
    canvas = await window.html2canvas(container, { scale: 2, backgroundColor: "#ffffff" });
  } finally {
    container.remove();
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  doc.addFileToVFS(FONT_FILE_NAME, fontBase64);
  doc.addFont(FONT_FILE_NAME, FONT_NAME, "normal");

  const imageHeightMm = (canvas.height / canvas.width) * CONTENT_WIDTH_MM;
  // PNGのままdoc.addImage()へ渡すと、jsPDFが非圧縮のビットマップとして埋め込むため
  // ファイルサイズが数MB〜十数MBに膨れ上がる（実測: 同じ画像でPNG指定だと9MB超、
  // JPEG指定だと270KB程度）。背景は不透明（html2canvas側でbackgroundColor指定済み）
  // なので透過は不要で、JPEGの非可逆圧縮でも見た目の劣化はほぼ気にならない。
  doc.addImage(
    canvas.toDataURL("image/jpeg", 0.92),
    "JPEG",
    MARGIN_MM,
    MARGIN_MM,
    CONTENT_WIDTH_MM,
    imageHeightMm
  );

  const reviewStartY = MARGIN_MM + imageHeightMm + 6;
  const pageBottom = PAGE_HEIGHT_MM - MARGIN_MM;

  if (reviewStartY >= pageBottom) {
    // マトリクス・グラフ・表だけで1ページを使い切ってしまった場合は短評を次ページへ。
    doc.addPage();
    renderReviewText(doc, reviewText, MARGIN_MM, pageBottom);
  } else {
    renderReviewText(doc, reviewText, reviewStartY, pageBottom);
  }

  doc.save(buildFileName(framework));
}
