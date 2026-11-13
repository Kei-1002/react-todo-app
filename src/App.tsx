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
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

const localStorageKey = "TodoApp";

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
  const [newTodoPriority, setNewTodoPriority] = useState(3);
  const [newTodoDeadline, setNewTodoDeadline] = useState<Date | null>(null);
  const [isNameTouched, setIsNameTouched] = useState(false);

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
    setNewTodoPriority(3);
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
    <div className="mx-4 mt-10 max-w-2xl md:mx-auto">
      <h1 className="mb-4 text-2xl font-bold">TodoApp</h1>
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
        className="mt-4 space-y-2 rounded-md border border-slate-300 bg-white p-3 drop-shadow"
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
                "min-w-0 grow rounded-md border border-gray-300 p-2",
                showNewTodoNameError && "border-red-500 outline-red-500",
              )}
              placeholder="2文字以上、32文字以内で入力してください"
            />
          </div>
          {showNewTodoNameError && (
            <div
              id="newTodoNameError"
              aria-live="polite"
              className="ml-10 flex items-center space-x-1 text-sm font-medium text-red-500"
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
          <legend className="mb-1 font-bold">優先度</legend>
          <div className="flex gap-5">
            {[1, 2, 3].map((value) => (
              <label key={value} className="flex items-center space-x-1">
                <input
                  id={`priority-${value}`}
                  name="priorityGroup"
                  type="radio"
                  value={value}
                  checked={newTodoPriority === value}
                  onChange={updateNewTodoPriority}
                />
                <span>{value}</span>
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
            className="max-w-full min-w-0 rounded-md border border-gray-300 px-2 py-0.5"
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
  );
};

export default App;