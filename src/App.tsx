import { useState, useEffect, useRef, useCallback } from "react";
import type { ChangeEvent } from "react";
import type { Todo } from "./types";
import { initTodos } from "./initTodos";
import WelcomeMessage from "./WelcomeMessage";
import TodoList from "./TodoList";
import { v4 as uuid } from "uuid";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTriangleExclamation,
  faSun,
  faMoon,
  faPen,
  faCheck,
  faBell,
  faBellSlash,
} from "@fortawesome/free-solid-svg-icons";

const localStorageKey = "TodoApp";
const darkModeStorageKey = "TodoApp_DarkMode";
const userNameStorageKey = "TodoApp_UserName";
const importanceEffectStorageKey = "TodoApp_ImportanceEffect";
const notifyEnabledStorageKey = "TodoApp_NotifyEnabled";
const notifyHoursStorageKey = "TodoApp_NotifyHours";

const IMPORTANCE_OPTIONS = [
  { value: 0, label: "なし", colorClass: "text-black dark:text-slate-200" },
  { value: 1, label: "低", colorClass: "text-yellow-500 dark:text-yellow-400" },
  { value: 2, label: "中", colorClass: "text-orange-500 dark:text-orange-400" },
  { value: 3, label: "高", colorClass: "text-red-600 dark:text-red-400" },
  { value: 4, label: "最高", colorClass: "text-green-600 dark:text-green-400" },
];

type StoredTodo = {
  id: string;
  name: string;
  isDone: boolean;
  priority: number;
  deadline: string | null;
};

const loadTodos = (): Todo[] => {
  const todoJsonStr = localStorage.getItem(localStorageKey);
  if (todoJsonStr === null) {
    return initTodos;
  }

  const storedTodos: StoredTodo[] = JSON.parse(todoJsonStr);
  return storedTodos.map((todo) => ({
    ...todo,
    deadline: todo.deadline === null ? null : new Date(todo.deadline),
  }));
};

const getTodoNameError = (name: string): string => {
  const trimmedName = name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 32) {
    return "前後の空白を除いて、2文字以上、32文字以内で入力してください";
  }
  return "";
};

// 現在時刻から期限までの残り時間を逆算して文字列化する関数
const formatRemainingTime = (now: dayjs.Dayjs, deadline: Date): string => {
  const diffMinutes = dayjs(deadline).diff(now, "minute");
  if (diffMinutes < 60) {
    return `${Math.max(1, diffMinutes)}分`;
  }
  const remainingHours = Math.ceil(diffMinutes / 60);
  return `${remainingHours}時間`;
};

const App = () => {
  const [todos, setTodos] = useState<Todo[]>(loadTodos);
  const [newTodoName, setNewTodoName] = useState("");
  const [newTodoPriority, setNewTodoPriority] = useState(0);
  const [newTodoDeadline, setNewTodoDeadline] = useState<Date | null>(null);
  const [isNameTouched, setIsNameTouched] = useState(false);

  // ユーザー名の状態管理
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem(userNameStorageKey) || "寝屋川タヌキ";
  });
  const [isEditingUserName, setIsEditingUserName] = useState(false);
  const [tempUserName, setTempUserName] = useState(userName);

  useEffect(() => {
    localStorage.setItem(userNameStorageKey, userName);
  }, [userName]);

  const handleSaveUserName = () => {
    const trimmed = tempUserName.trim();
    if (trimmed !== "") {
      setUserName(trimmed);
    } else {
      setTempUserName(userName);
    }
    setIsEditingUserName(false);
  };

  // ダークモードの状態管理
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem(darkModeStorageKey);
    if (saved !== null) {
      return saved === "true";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem(darkModeStorageKey, String(isDark));
  }, [isDark]);

  // 重要度エフェクト（名前の色変更＆イラスト表示）のON/OFF状態管理
  const [showImportanceEffects, setShowImportanceEffects] = useState<boolean>(
    () => {
      const saved = localStorage.getItem(importanceEffectStorageKey);
      return saved !== null ? saved === "true" : true;
    },
  );

  useEffect(() => {
    localStorage.setItem(
      importanceEffectStorageKey,
      String(showImportanceEffects),
    );
  }, [showImportanceEffects]);

  // 通知ON/OFFと通知タイミング（何時間前）の状態管理
  const [isNotifyEnabled, setIsNotifyEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(notifyEnabledStorageKey);
    return saved !== null ? saved === "true" : true;
  });

  const [notifyHoursBefore, setNotifyHoursBefore] = useState<number>(() => {
    const saved = localStorage.getItem(notifyHoursStorageKey);
    const parsed = saved !== null ? Number(saved) : 24;
    return !Number.isNaN(parsed) && parsed >= 1 ? parsed : 24;
  });

  // 同じセッション内で同じ内容の通知を連続発火させないための記録
  const lastNotifiedKeyRef = useRef<string>("");

  useEffect(() => {
    localStorage.setItem(notifyEnabledStorageKey, String(isNotifyEnabled));
  }, [isNotifyEnabled]);

  useEffect(() => {
    localStorage.setItem(notifyHoursStorageKey, String(notifyHoursBefore));
    lastNotifiedKeyRef.current = "";
  }, [notifyHoursBefore]);

  const uncompletedCount = todos.filter((todo) => !todo.isDone).length;
  const completedCount = todos.length - uncompletedCount;
  const newTodoNameError = getTodoNameError(newTodoName);
  const isNewTodoNameInvalid = newTodoNameError !== "";
  const showNewTodoNameError = isNameTouched && isNewTodoNameInvalid;

  // 1. localStorageへの自動保存
  useEffect(() => {
    localStorage.setItem(localStorageKey, JSON.stringify(todos));
  }, [todos]);

  // 2. 期限チェック＆通知実行関数
  const checkAndNotify = useCallback(() => {
    if (!isNotifyEnabled || !("Notification" in window)) {
      return;
    }
    if (Notification.permission !== "granted") {
      return;
    }

    const now = dayjs();
    const threshold = now.add(notifyHoursBefore, "hour");

    // ① 期限切れの未完了タスク（deadline < 現在時刻）
    const overdueTodos = todos.filter((todo) => {
      return (
        !todo.isDone &&
        todo.deadline !== null &&
        dayjs(todo.deadline).isBefore(now)
      );
    });

    // ② 指定した「○時間以内」に期限が迫っている未完了タスク
    const approachingTodos = todos.filter((todo) => {
      return (
        !todo.isDone &&
        todo.deadline !== null &&
        !dayjs(todo.deadline).isBefore(now) &&
        (dayjs(todo.deadline).isBefore(threshold) ||
          dayjs(todo.deadline).isSame(threshold))
      );
    });

    // 残り時間テキストごとにタスクをグループ化（期限が近い順に並べてから分類）
    const sortedApproaching = [...approachingTodos].sort(
      (a, b) => dayjs(a.deadline).valueOf() - dayjs(b.deadline).valueOf(),
    );
    const groupedByRemainingTime = new Map<string, Todo[]>();
    for (const todo of sortedApproaching) {
      const remainingText = formatRemainingTime(now, todo.deadline!);
      const group = groupedByRemainingTime.get(remainingText) ?? [];
      group.push(todo);
      groupedByRemainingTime.set(remainingText, group);
    }

    // 重複通知防止用のキーを作成（各タスクの残り時間グループも含める）
    const soonKeyPart = Array.from(groupedByRemainingTime.entries())
      .map(([time, list]) => `${time}:${list.map((t) => t.id).join(",")}`)
      .join(";");
    const notifyKey = `overdue:${overdueTodos.map((t) => t.id).join(",")}|soon:${soonKeyPart}|h:${notifyHoursBefore}`;

    if (notifyKey === lastNotifiedKeyRef.current) {
      return;
    }

    let hasNotified = false;

    // ① 期限切れのタスクがある場合（緊急度：高）
    if (overdueTodos.length > 0) {
      const names = overdueTodos.map((todo) => `「${todo.name}」`).join("と");
      const OVERDUE_MESSAGES = [
        `師匠から課された課題${names} の期限が過ぎています...遠くから師匠の怒鳴り声が聞こえてきますね...`, //ルチオ
        `（ビープ音）ど、どうして指令：${names} を遂行しなかったんですか？そ、そうしてはいけないって分かってるのに...`, //ソラ
        `${names}をやらなかったの！？パパに怒られちゃう...`, //キラ
        `あら？${names}がまだ完成していないじゃない。マエストロのクリティークに間に合わないわ。`, //アルビナ
        `${names}をしなかったんだな...く・への時間だ。 `, //良秀
        `子供じゃないんだから、ちゃんと${names}はやりなよ... `, //アラヤ
      ];
      const randomIndex = Math.floor(Math.random() * OVERDUE_MESSAGES.length);
      new Notification("TodoAppからの通知（期限切れ）", {
        body: OVERDUE_MESSAGES[randomIndex],
        tag: "todo-overdue",
      });
      hasNotified = true;
    }

    // ② 残り時間が異なるタスクグループごとに個別の通知を発行（緊急度：中）
    groupedByRemainingTime.forEach((groupTodos, remainingText) => {
      const names = groupTodos.map((todo) => `「${todo.name}」`).join("と");
      const DUE_SOON_MESSAGES = [
        `おい、教本。${names}はもう終わったのか？アタシ言ったよな！？あと${remainingText}以内に終わらせろよ！！？？`, //ヴァレンチーナ
        `（ビープ音）指令： ${names} の期限があと${remainingText}後に迫っているな。そろそろ遂行したほうがいいんじゃないか？`, //リアン
        `娘ちゃん！！${names}はもう終わったのか！？あと${remainingText}以内だ、まだならパパと一緒に終わらせようぜ！`, //マティアス
        `あなたの作品：${names}はもう完成したのですか？展示会まであと${remainingText}しかありませんよ？`, //カリスト
        `${names}をする時間だ。あと${remainingText}以内にやらなければ、く・へ。`, //良秀
      ];
      const randomIndex = Math.floor(Math.random() * DUE_SOON_MESSAGES.length);
      new Notification(`TodoAppからの通知（残り${remainingText}）`, {
        body: DUE_SOON_MESSAGES[randomIndex],
        tag: `todo-soon-${remainingText}`,
      });
      hasNotified = true;
    });

    if (hasNotified) {
      lastNotifiedKeyRef.current = notifyKey;
    }
  }, [isNotifyEnabled, notifyHoursBefore, todos]);

  // 初回マウント時・設定変更時・1分ごとの定期チェック
  useEffect(() => {
    if (!isNotifyEnabled || !("Notification" in window)) {
      return;
    }

    if (Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          checkAndNotify();
        }
      });
    } else if (Notification.permission === "granted") {
      checkAndNotify();
    }

    const intervalId = window.setInterval(() => {
      checkAndNotify();
    }, 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, [isNotifyEnabled, checkAndNotify]);

  // 通知ON/OFFボタンの切り替え処理
  const handleToggleNotify = () => {
    if (!isNotifyEnabled) {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            lastNotifiedKeyRef.current = "";
            setIsNotifyEnabled(true);
          } else {
            alert("ブラウザの設定で通知がブロックされています。");
          }
        });
      } else if (
        "Notification" in window &&
        Notification.permission === "denied"
      ) {
        alert(
          "ブラウザの設定で通知が拒否されています。アドレスバー左側のアイコンから通知を許可してください。",
        );
      } else {
        lastNotifiedKeyRef.current = "";
        setIsNotifyEnabled(true);
      }
    } else {
      setIsNotifyEnabled(false);
    }
  };

  const handleNotifyHoursChange = (e: ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (!Number.isNaN(val) && val >= 1 && val <= 168) {
      setNotifyHoursBefore(val);
    }
  };

  const updateNewTodoName = (e: ChangeEvent<HTMLInputElement>) => {
    setNewTodoName(e.target.value);
    setIsNameTouched(true);
  };

  const updateNewTodoPriority = (e: ChangeEvent<HTMLInputElement>) => {
    setNewTodoPriority(Number(e.target.value));
  };

  const updateDeadline = (e: ChangeEvent<HTMLInputElement>) => {
    const dt = e.target.value;
    setNewTodoDeadline(dt === "" ? null : new Date(dt));
  };

  const addNewTodo = () => {
    if (isNewTodoNameInvalid) {
      setIsNameTouched(true);
      return;
    }

    const newTodo: Todo = {
      id: uuid(),
      name: newTodoName.trim(),
      isDone: false,
      priority: newTodoPriority,
      deadline: newTodoDeadline,
    };
    setTodos((currentTodos) => [...currentTodos, newTodo]);
    setNewTodoName("");
    setNewTodoPriority(0);
    setNewTodoDeadline(null);
    setIsNameTouched(false);
  };

  const updateIsDone = (id: string, value: boolean) => {
    setTodos((currentTodos) =>
      currentTodos.map((todo) => {
        if (todo.id === id) {
          return { ...todo, isDone: value };
        } else {
          return todo;
        }
      }),
    );
  };

  const removeCompletedTodos = () => {
    setTodos((currentTodos) => currentTodos.filter((todo) => !todo.isDone));
  };

  const remove = (id: string) => {
    setTodos((currentTodos) => currentTodos.filter((todo) => todo.id !== id));
  };

  return (
    <div className="relative min-h-screen bg-slate-50 px-4 py-10 text-slate-900 transition-colors dark:bg-slate-900 dark:text-slate-100">
      {/* うっすら表示する背景画像レイヤー */}
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center opacity-20 dark:opacity-25"
        style={{
          backgroundImage: `url('${import.meta.env.BASE_URL}the_house_of_spider.png')`,
        }}
        aria-hidden="true"
      />

      {/* 手前のメインコンテンツ */}
      <div className="relative z-10 mx-auto max-w-2xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">TodoApp</h1>

          {/* 右上の各種切り替えボタン群 */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 通知ON/OFFボタン */}
            <button
              type="button"
              onClick={handleToggleNotify}
              aria-pressed={isNotifyEnabled}
              className={twMerge(
                "flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-bold text-white shadow-sm transition-colors",
                isNotifyEnabled
                  ? "bg-amber-500 hover:bg-amber-600"
                  : "bg-slate-500 hover:bg-slate-600",
              )}
            >
              <FontAwesomeIcon icon={isNotifyEnabled ? faBell : faBellSlash} />
              <span>通知{isNotifyEnabled ? "ON" : "OFF"}</span>
            </button>

            {/* 重要度ON/OFFボタン */}
            <button
              type="button"
              onClick={() => setShowImportanceEffects((prev) => !prev)}
              aria-pressed={showImportanceEffects}
              className={twMerge(
                "cursor-pointer rounded-md px-3 py-1.5 text-sm font-bold text-white shadow-sm transition-colors",
                showImportanceEffects
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-red-600/60 hover:bg-red-600/80",
              )}
            >
              重要度{showImportanceEffects ? "ON" : "OFF"}
            </button>

            {/* ダークモード切替ボタン */}
            <button
              type="button"
              onClick={() => setIsDark((prev) => !prev)}
              aria-label="ダークモード切替"
              className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <FontAwesomeIcon
                icon={isDark ? faSun : faMoon}
                className={isDark ? "text-amber-400" : "text-indigo-500"}
              />
              <span>{isDark ? "ライト" : "ダーク"}</span>
            </button>
          </div>
        </div>

        {/* 通知タイミング設定バー（通知ONのときのみ表示） */}
        {isNotifyEnabled && (
          <div className="mb-4 flex items-center justify-end gap-2 text-sm">
            <label
              htmlFor="notifyHours"
              className="font-medium text-slate-700 dark:text-slate-300"
            >
              期限の通知タイミング:
            </label>
            <input
              id="notifyHours"
              type="number"
              min={1}
              max={168}
              value={notifyHoursBefore}
              onChange={handleNotifyHoursChange}
              className="w-16 rounded-md border border-slate-300 bg-white px-2 py-1 text-center font-bold text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
            <span className="font-medium text-slate-700 dark:text-slate-300">
              時間前から通知
            </span>
          </div>
        )}

        {/* ウェルカムメッセージとユーザー名変更UI */}
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <WelcomeMessage
            name={userName}
            uncompletedCount={uncompletedCount}
          />

          {isEditingUserName ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveUserName();
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="text"
                value={tempUserName}
                onChange={(e) => setTempUserName(e.target.value)}
                placeholder="ユーザー名を入力"
                aria-label="新しいユーザー名"
                maxLength={20}
                autoFocus
                className="w-36 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="submit"
                className="flex cursor-pointer items-center gap-1 rounded-md bg-indigo-500 px-2.5 py-1 text-xs font-bold text-white hover:bg-indigo-600"
              >
                <FontAwesomeIcon icon={faCheck} />
                <span>決定</span>
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setTempUserName(userName);
                setIsEditingUserName(true);
              }}
              className="flex cursor-pointer items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <FontAwesomeIcon icon={faPen} />
              <span>名前を変更</span>
            </button>
          )}
        </div>

        <TodoList
          todos={todos}
          updateIsDone={updateIsDone}
          remove={remove}
          showImportanceEffects={showImportanceEffects}
        />

        <button
          type="button"
          onClick={removeCompletedTodos}
          disabled={completedCount === 0}
          className={twMerge(
            "mt-4 cursor-pointer rounded-md px-3 py-1 font-medium",
            "bg-rose-500 text-white hover:bg-rose-600",
            "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-rose-500",
          )}
        >
          完了済みのタスクを削除
        </button>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            addNewTodo();
          }}
          aria-labelledby="newTodoHeading"
          className="mt-4 space-y-2 rounded-md border border-slate-300 bg-white p-3 drop-shadow dark:border-slate-700 dark:bg-slate-800"
        >
          <h2 id="newTodoHeading" className="text-lg font-bold">
            新しいタスクの追加
          </h2>

          <div>
            <div className="flex items-center space-x-2">
              <label className="font-bold" htmlFor="newTodoName">
                名前
              </label>
              <input
                id="newTodoName"
                name="todoName"
                type="text"
                required
                value={newTodoName}
                onChange={updateNewTodoName}
                aria-invalid={showNewTodoNameError}
                aria-describedby={
                  showNewTodoNameError ? "newTodoNameError" : undefined
                }
                className={twMerge(
                  "min-w-0 grow rounded-md border border-gray-300 bg-white p-2 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400",
                  showNewTodoNameError && "border-red-500 outline-red-500",
                )}
                placeholder="2文字以上、32文字以内で入力してください"
              />
            </div>
            {showNewTodoNameError && (
              <div
                id="newTodoNameError"
                aria-live="polite"
                className="ml-10 flex items-center space-x-1 text-sm font-medium text-red-500 dark:text-red-400"
              >
                <FontAwesomeIcon
                  icon={faTriangleExclamation}
                  className="mr-0.5"
                />
                <div>{newTodoNameError}</div>
              </div>
            )}
          </div>

          <fieldset>
            <legend className="mb-1 font-bold">重要度</legend>
            <div className="flex flex-wrap gap-4">
              {IMPORTANCE_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center space-x-1"
                >
                  <input
                    id={`importance-${option.value}`}
                    name="importanceGroup"
                    type="radio"
                    value={option.value}
                    checked={newTodoPriority === option.value}
                    onChange={updateNewTodoPriority}
                    className="cursor-pointer"
                  />
                  <span className={twMerge("font-bold", option.colorClass)}>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center gap-2">
            <label className="font-bold" htmlFor="deadline">
              期限
            </label>
            <input
              type="datetime-local"
              id="deadline"
              name="deadline"
              value={
                newTodoDeadline
                  ? dayjs(newTodoDeadline).format("YYYY-MM-DDTHH:mm:ss")
                  : ""
              }
              onChange={updateDeadline}
              className="max-w-full min-w-0 rounded-md border border-gray-300 bg-white px-2 py-0.5 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:[color-scheme:dark]"
            />
          </div>

          <button
            type="submit"
            disabled={isNewTodoNameInvalid}
            className={twMerge(
              "cursor-pointer rounded-md px-3 py-1",
              "bg-indigo-500 font-bold text-white hover:bg-indigo-600",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-indigo-500",
            )}
          >
            追加
          </button>
        </form>
      </div>
    </div>
  );
};

export default App;