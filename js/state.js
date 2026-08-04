"use strict";

// 回答・メモはサーバー・DBには一切送信せず、ブラウザのlocalStorageにのみ保存する。
// ブラウザを閉じても内容が残るようにするための永続化であり、サーバーサイドの
// 永続化（バックエンド・DB）とは異なる（PLAN.mdの「バックエンド・DBなし」方針に反しない）。
//
// フレームワーク（tpi-next / agile-tpi）ごとにデータを持つストアを、
// 回答用・メモ用それぞれ生成する。呼び出すたびに同じオブジェクト参照を返すため、
// 呼び出し側でそのままmutateすれば画面内では即座に反映されるが、ブラウザを
// 閉じても残すには save() を呼んでlocalStorageへ書き込む必要がある。
function createFrameworkStore(storageKey) {
  function load() {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch (err) {
      // プライベートブラウジング等でlocalStorageが使えない場合はメモリ上のみで動作させる。
      console.warn(`localStorageから読み込めませんでした（${storageKey}）。この状態では保存されません。`, err);
      return {};
    }
  }

  function persist(data) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (err) {
      console.warn(`localStorageへの保存に失敗しました（${storageKey}）。このセッション内でのみ保持されます。`, err);
    }
  }

  const data = load();

  return {
    get(framework) {
      if (!data[framework]) data[framework] = {};
      return data[framework];
    },
    save() {
      persist(data);
    },
    clear(framework) {
      data[framework] = {};
      persist(data);
    },
  };
}

// { [framework]: { [checkpointId]: "met" | "not_met" | "n_a" } }
const answersStore = createFrameworkStore("tpiAssessmentTool.answers.v1");
// { [framework]: { [checkpointId]: string } }
const notesStore = createFrameworkStore("tpiAssessmentTool.notes.v1");

export function getDraftAnswers(framework) {
  return answersStore.get(framework);
}

export function saveDraftAnswers() {
  answersStore.save();
}

export function clearDraftAnswers(framework) {
  answersStore.clear(framework);
}

export function getDraftNotes(framework) {
  return notesStore.get(framework);
}

export function saveDraftNotes() {
  notesStore.save();
}

export function clearDraftNotes(framework) {
  notesStore.clear(framework);
}

// 短評はキーエリア別の下書き（answers/notes）と異なり、フレームワークごとに
// 1つの文字列を持つだけなので専用の軽量ストアにする。未編集（自動生成文言のまま）
// の場合は保存せず null を返し、呼び出し側でルールベースの文言を都度生成する。
function createReviewStore(storageKey) {
  function load() {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch (err) {
      console.warn(`localStorageから読み込めませんでした（${storageKey}）。この状態では保存されません。`, err);
      return {};
    }
  }

  function persist(data) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (err) {
      console.warn(`localStorageへの保存に失敗しました（${storageKey}）。このセッション内でのみ保持されます。`, err);
    }
  }

  const data = load();

  return {
    get(framework) {
      return Object.prototype.hasOwnProperty.call(data, framework) ? data[framework] : null;
    },
    set(framework, text) {
      data[framework] = text;
      persist(data);
    },
    clear(framework) {
      delete data[framework];
      persist(data);
    },
  };
}

const reviewStore = createReviewStore("tpiAssessmentTool.review.v1");

// 保存済みの編集内容（ユーザーが一度でも書き換えたもの）を返す。未編集ならnull。
export function getSavedReview(framework) {
  return reviewStore.get(framework);
}

export function saveReview(framework, text) {
  reviewStore.set(framework, text);
}

export function clearSavedReview(framework) {
  reviewStore.clear(framework);
}
