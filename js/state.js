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
