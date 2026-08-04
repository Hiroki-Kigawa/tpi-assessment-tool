"use strict";

import { renderTop } from "./pages/top.js";
import { renderAssessment } from "./pages/assessment.js";
import { renderResult } from "./pages/result.js";

const FRAMEWORKS = new Set(["tpi-next", "agile-tpi"]);

const view = document.getElementById("view");

function parseHash() {
  const hash = location.hash.replace(/^#\/?/, "");
  const [route, framework] = hash.split("/").filter(Boolean);
  return { route: route || "", framework };
}

async function render() {
  const { route, framework } = parseHash();
  window.scrollTo(0, 0);

  try {
    if (!route) {
      renderTop(view);
    } else if (route === "assessment" && FRAMEWORKS.has(framework)) {
      await renderAssessment(view, framework);
    } else if (route === "result" && FRAMEWORKS.has(framework)) {
      await renderResult(view, framework);
    } else {
      location.hash = "#/";
    }
  } catch (err) {
    console.error(err);
    view.innerHTML = `<p class="error-message">画面の表示中にエラーが発生しました。トップページからやり直してください。</p>`;
  }
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);
