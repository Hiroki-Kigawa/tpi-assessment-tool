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

// 短評は「前回結果画面を表示した時点の回答」とセットで保存する。次に結果画面を
// 表示する際、回答が前回と完全に一致していれば保存内容（編集済みの場合も含む）を
// そのまま復元し、1件でも変わっていれば呼び出し側が新しく生成したデフォルト文言で
// 上書きする（診断画面へ誤って戻って結果画面に戻ってきただけでは編集内容が
// 消えないようにするため。メモは比較対象に含めない＝メモだけ変えても再生成されない）。
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
    set(framework, entry) {
      data[framework] = entry;
      persist(data);
    },
    clear(framework) {
      delete data[framework];
      persist(data);
    },
  };
}

const reviewStore = createReviewStore("tpiAssessmentTool.review.v1");

function answersEqual(a, b) {
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => a[key] === b[key]);
}

// 保存済みの短評テキストを返す。前回保存時点の回答と現在の回答が完全一致する
// 場合のみ返し、それ以外（未保存・回答が変化）はnullを返す。
export function getPreservedReview(framework, currentAnswers) {
  const snapshot = reviewStore.get(framework);
  if (snapshot && answersEqual(snapshot.answers, currentAnswers)) {
    return snapshot.text;
  }
  return null;
}

// 表示中のテキスト内容を、その時点の回答とセットで保存する。
// デフォルト文言を生成した直後（新しい基準点として）と、
// ユーザーがテキストエリアを編集した際の両方で呼ぶ。
// currentAnswersはgetDraftAnswers()が返す、以後も変更管理画面側でmutateされ続ける
// 生きたオブジェクトなので、参照ではなく複製を保存しないと「前回時点」の比較にならない。
export function commitReview(framework, text, currentAnswers) {
  reviewStore.set(framework, { text, answers: { ...currentAnswers } });
}

export function clearReviewSnapshot(framework) {
  reviewStore.clear(framework);
}
