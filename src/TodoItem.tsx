import type { Todo } from "./types";
import dayjs from "dayjs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClock, faPersonDigging } from "@fortawesome/free-solid-svg-icons";
import { twMerge } from "tailwind-merge";

type Props = {
  todo: Todo;
  updateIsDone: (id: string, value: boolean) => void;
  remove: (id: string) => void;
};

const IMPORTANCE_CONFIG: Record<number, { label: string; colorClass: string }> = {
  0: { label: "なし", colorClass: "text-black dark:text-slate-200" },
  1: { label: "低", colorClass: "text-yellow-500 dark:text-yellow-400" },
  2: { label: "中", colorClass: "text-orange-500 dark:text-orange-400" },
  3: { label: "高", colorClass: "text-red-600 dark:text-red-400" },
  4: { label: "最高", colorClass: "text-green-600 dark:text-green-400" },
};

const formattedDate = (date: Date) => {
  if (date.getHours() === 0 && date.getMinutes() === 0) {
    return dayjs(date).format("YYYY/MM/DD");
  }
  return dayjs(date).format("YYYY/MM/DD HH:mm");
};

const TodoItem = (props: Props) => {
  const todo = props.todo;
  const importance = IMPORTANCE_CONFIG[todo.priority] ?? IMPORTANCE_CONFIG[0];

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-300 bg-white px-4 py-2 drop-shadow dark:border-slate-700 dark:bg-slate-800">
      <div
        className={twMerge(
          "flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1",
          todo.isDone && "opacity-60",
        )}
      >
        <label className="flex min-w-0 cursor-pointer items-center">
          <input
            type="checkbox"
            checked={todo.isDone}
            onChange={(e) => props.updateIsDone(todo.id, e.target.checked)}
            className="mr-3 shrink-0 cursor-pointer"
          />
          <FontAwesomeIcon
            icon={faPersonDigging}
            className="mr-2 shrink-0 text-slate-500 dark:text-slate-400"
          />
          <span className="min-w-0 text-lg font-medium wrap-anywhere text-slate-700 dark:text-slate-200">
            {todo.name}
          </span>
        </label>
        <span
          aria-label={`重要度: ${importance.label}`}
          className={twMerge("text-sm font-bold", importance.colorClass)}
        >
          {importance.label}
        </span>
        {todo.deadline && (
          <span className="flex items-center text-sm text-slate-500 dark:text-slate-400">
            <FontAwesomeIcon icon={faClock} className="mr-0.5" />
            {formattedDate(todo.deadline)}
          </span>
        )}
        {todo.isDone && (
          <span className="rounded-full bg-slate-800 px-3 py-0.5 text-xs font-medium text-white dark:bg-slate-600">
            完了済み
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => props.remove(todo.id)}
        aria-label={`${todo.name}を削除`}
        className={twMerge(
          "shrink-0 cursor-pointer rounded-md px-2 py-1 text-sm font-bold",
          "bg-rose-400 text-white hover:bg-rose-500 dark:bg-rose-600 dark:hover:bg-rose-500",
        )}
      >
        削除
      </button>
    </div>
  );
};

export default TodoItem;