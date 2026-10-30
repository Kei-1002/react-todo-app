import React from "react";

// コンポーネントに渡す引数 (Props) の型を定義する
type Props = {
  name: string;
  uncompletedCount: number; // ← uncompletedCount を追加
};

// WelcomeMessage という関数コンポーネントを定義する
const WelcomeMessage = (props: Props) => {
  // JSX を返す前に、通常の TypeScript の処理を記述できる
  const currentTime = new Date();
  const greeting =
    currentTime.getHours() < 12 ? "おはようございます" : "こんにちは";

  // 【重要】JSX を使って UI を記述し、return で返す
  return (
    <div className="text-blue-700">
      <p>{greeting}、{props.name}さん。</p>
      <p>未完了のタスクは {props.uncompletedCount} 件です。</p>
    </div>
  );
};

// 他のファイルから WelcomeMessage を import できるようにする
export default WelcomeMessage;