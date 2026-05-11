# View Switch 2.5D Prototype

Three.js + TypeScript + Vite で作成した、視点切替2.5Dアクションの最小プロトです。

## セットアップ

```bash
npm install
npm run dev
```

## ビルド確認

```bash
npm run build
```

## 操作

- 左右移動: ←→ / A・D
- ジャンプ: Space
- しゃがみ: Shift / S
- ダッシュ: 同方向キー2回押し
- 視点切替: Q
- 扉: E

## 構成

- `src/ui`: 画面側。core/engine の関数呼び出しのみ。
- `src/core`: ゲームロジック、入力、物理、カメラ、ステージ、セーブ。
- `src/engine`: Three.js の初期化と RenderState 反映。
- `src/stages`: ステージJSON。

## TBD

- ジャンプ到達「2ブロック弱」の最終体感調整値
- REAL扉の遷移先ステージ追加
- 敵AIの移動実装
- ステージクリア条件の詳細化
