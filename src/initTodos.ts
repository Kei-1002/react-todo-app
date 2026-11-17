import type { Todo } from "./types";
import { v4 as uuid } from "uuid"; // v4 を uuid という名前でインポート

export const initTodos: Todo[] = [
  {
    id: uuid(), // UUID v4 を生成してIDにセット
    name: "これは",
    isDone: false,
    priority: 2,
    deadline: null,
  },
  {
    id: uuid(),
    name: "チュートリアル",
    isDone: true,
    priority: 3,
    deadline: new Date(2026, 11, 31, 23, 59), 
  },
  {
    id: uuid(),
    name: "です",
    isDone: false,
    priority: 1,
    deadline: null,
  },
];