import { useState, useEffect } from "react";
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
} from "@fortawesome/free-solid-svg-icons";

const localStorageKey = "TodoApp";
const darkModeStorageKey = "TodoApp_DarkMode";

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

const App = () => {
  const [todos, setTodos] = useState<Todo[]>(loadTodos);
  const [newTodoName, setNewTodoName] = useState("");
  const [newTodoPriority, setNewTodoPriority] = useState(0);
  const [newTodoDeadline, setNewTodoDeadline] = useState<Date | null>(null);
  const [isNameTouched, setIsNameTouched] = useState(false);

  // ダークモードの状態管理（localStorage または OS設定を初期値にする）
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem(darkModeStorageKey);
    if (saved !== null) {
      return saved === "true";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // ダークモードのクラスを <html> タグに反映＆保存
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem(darkModeStorageKey, String(isDark));
  }, [isDark]);

  const uncompletedCount = todos.filter((todo) => !todo.isDone).length;
  const completedCount = todos.length - uncompletedCount;
  const newTodoNameError = getTodoNameError(newTodoName);
  const isNewTodoNameInvalid = newTodoNameError !== "";
  const showNewTodoNameError = isNameTouched && isNewTodoNameInvalid;

  // 1. localStorageへの自動保存
  useEffect(() => {
    localStorage.setItem(localStorageKey, JSON.stringify(todos));
  }, [todos]);

  // 2. 通知許可のリクエストと期限チェック通知（初回マウント時に実行）
  useEffect(() => {
    if (!("Notification" in window)) {
      return;
    }

    const checkAndNotify = () => {
      if (Notification.permission !== "granted") {
        return;
      }

      const now = dayjs();

      // 期限切れの未完了タスク（deadline < 現在時刻）
      const overdueTodos = todos.filter((todo) => {
        return (
          !todo.isDone &&
          todo.deadline !== null &&
          dayjs(todo.deadline).isBefore(now)
        );
      });

      // 今日が期限の未完了タスク（期限切れを除く、今日中のタスク）
      const dueTodayTodos = todos.filter((todo) => {
        return (
          !todo.isDone &&
          todo.deadline !== null &&
          !dayjs(todo.deadline).isBefore(now) &&
          dayjs(todo.deadline).isSame(now, "day")
        );
      });

      let selectedMessage = "";

      // ① 期限切れのタスクがある場合（緊急度：高）
      if (overdueTodos.length > 0) {
        const names = overdueTodos.map((todo) => `「${todo.name}」`).join("と");
        const OVERDUE_MESSAGES = [
          `師匠から課された課題${names} の期限が過ぎています...遠くから師匠の怒鳴り声が聞こえてきますね...`, //ルチオ
          `ど、どうして指令：${names} を遂行しなかったんですか？そ、そうしてはいけないって分かってるのに...`, //ソラ
          `${names}をやらなかったの！？パパに怒られちゃう...`, //キラ
          `あら？${names}がまだ完成していないじゃない。マエストロのクリティークに間に合わないわ。`, //アルビナ
          `${names}をしなかったんだな...く・への時間だ。 `, //良秀
          `子供じゃないんだから、ちゃんと${names}はやりなよ... `, //アラヤ
        ];
        const randomIndex = Math.floor(Math.random() * OVERDUE_MESSAGES.length);
        selectedMessage = OVERDUE_MESSAGES[randomIndex];
      }
      // ② 期限切れはないが、今日が期限のタスクがある場合（緊急度：中）
      else if (dueTodayTodos.length > 0) {
        const names = dueTodayTodos.map((todo) => `「${todo.name}」`).join("と");
        const DUE_TODAY_MESSAGES = [
          `おい、教本。${names}はもう終わったのか？ `, //ヴァレンチーナ
          `指令： ${names} の期限が迫っているな。そろそろ遂行したほうがいいんじゃないか？`, //リアン
          `娘ちゃん！！${names}はもう終わったのか！？まだならパパと一緒に終わらせようぜ！ `, //マティアス
          `${names} `, //カリスト
          `${names}をする時間だ。やらなければ、く・へ。 `, //良秀
        ];
        const randomIndex = Math.floor(Math.random() * DUE_TODAY_MESSAGES.length);
        selectedMessage = DUE_TODAY_MESSAGES[randomIndex];
      }

      if (selectedMessage) {
        new Notification("TodoAppからの通知", {
          body: selectedMessage,
        });
      }
    };

    if (Notification.permission === "default") {
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          checkAndNotify();
        }
      });
    } else if (Notification.permission === "granted") {
      checkAndNotify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        className="pointer-events-none fixed inset-0 bg-cover bg-center opacity-15 dark:opacity-10"
        style={{
          backgroundImage: `url('${import.meta.env.BASE_URL}the_house_of_spider.png')`,
        }}
        aria-hidden="true"
      />
      {/* 手前のメインコンテンツ */}
      <div className="relative z-10 mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">TodoApp</h1>
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

        <div className="mb-4">
          <WelcomeMessage
            name="寝屋川タヌキ"
            uncompletedCount={uncompletedCount}
          />
        </div>
        <TodoList todos={todos} updateIsDone={updateIsDone} remove={remove} />

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