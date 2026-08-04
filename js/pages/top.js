"use strict";

export function renderTop(container) {
  container.innerHTML = `
    <section class="hero">
      <h1>TPI診断ツール</h1>
      <p class="hero__lead">
        開発プロジェクトのテストプロセス成熟度を、TPI NEXT® または Agile TPI のフレームワークで診断します。
        すべての処理はブラウザ内で完結し、回答内容がサーバーに送信されることはありません。
      </p>
    </section>

    <section class="framework-picker">
      <a class="framework-card" href="#/assessment/tpi-next">
        <h2>TPI NEXT®️</h2>
        <p>
          16のキーエリアを Controlled / Efficient / Optimizing の3段階で評価する、
          伝統的なテストプロセス成熟度モデルです。
        </p>
        <span class="framework-card__meta">チェックポイント数：157件</span>
        <span class="framework-card__cta">この診断をはじめる →</span>
      </a>

      <a class="framework-card" href="#/assessment/agile-tpi">
        <h2>Agile TPI</h2>
        <p>
          Professional / Team / Organization の3つの観点から、
          アジャイル開発におけるテスト成熟度を評価します。
        </p>
        <span class="framework-card__meta">チェックポイント数：108件</span>
        <span class="framework-card__cta">この診断をはじめる →</span>
      </a>
    </section>
  `;
}
