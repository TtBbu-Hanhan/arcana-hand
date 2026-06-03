# Arcana Hand｜灵视塔罗 · V0.1 MVP

基于摄像头手势识别的沉浸式塔罗占卜网站。用户张开手掌洗牌、捏合手指抽牌，将三张牌放入「现状 / 阻碍 / 建议」卡位，仪式翻牌后获得正逆位解读。无摄像头时可用鼠标 / 触控完成同样流程。

## 快速开始

```bash
npm install
npm run dev      # 本地开发 http://localhost:5173
npm run build    # 类型检查 + 生产构建
npm run preview  # 预览构建产物
```

> 手势模式需要摄像头权限。浏览器要求在 `https://` 或 `localhost` 下才会授予摄像头权限——`npm run dev` 的 `localhost` 已满足。

## 核心流程（状态机）

```
INIT(首页) → QUESTION_INPUT(问题) → MODE_SELECT(模式)
  → [手势] CALIBRATION(3秒校准) / [无摄像头] 直接进入
  → SHUFFLING(洗牌×3) → DRAW_CARD_1/2/3(抽牌放牌)
  → RITUAL_PAUSE(3秒仪式) → REVEALING(依次翻牌)
  → READING/RESULT(解读结果)
```

状态机集中在 [src/store/tarotStore.ts](src/store/tarotStore.ts)，页面只读阶段并触发动作。

## 两种交互模式如何统一

手势与鼠标 / 触控都写入同一个归一化指针状态 [src/modules/input/pointerState.ts](src/modules/input/pointerState.ts)（`x,y ∈ [0,1]`、`present`、`grabbing`）。抽牌页用一个 `requestAnimationFrame` 循环读取它，因此「靠近发光、捏合选中、拖动、放入卡位」这套交互对两种模式完全一致——只是数据来源不同：

| 手势模式 | 无摄像头模式 |
| --- | --- |
| 张开手掌左右滑动 | 鼠标 / 手指左右拖动 |
| 食指拇指捏合 | 鼠标按下 / 手指按住 |
| 捏合移动 | 拖拽 |
| 松开捏合 | 松开 / 抬起 |

为避免 60fps 触发 React 重渲染，所有逐帧运动（光点、浮动卡、悬停判定）都直接操作 DOM transform，React state 只用于离散态切换。

## 手势识别

- 摄像头：`navigator.mediaDevices.getUserMedia`，画面仅本地使用，不上传 [src/modules/gesture/cameraService.ts](src/modules/gesture/cameraService.ts)
- 关键点：MediaPipe `HandLandmarker`（`@mediapipe/tasks-vision`），WASM 与模型从 CDN 加载 [src/modules/gesture/gestureService.ts](src/modules/gesture/gestureService.ts)
- 手势判定（张开手掌 / 捏合 / 捏合点 / 手掌中心）：相对手掌尺度归一化，避免远近影响 [src/modules/gesture/gestureUtils.ts](src/modules/gesture/gestureUtils.ts)
- 校准：连续稳定识别 3 秒进入洗牌，超过 8 秒未识别提示切换无摄像头模式
- 防误触：捏合保持 0.3 秒以上才判定为有效选中

## 视觉层说明（实现取舍）

文档建议用 Three.js。本版改用 **CSS 3D transforms（卡牌浮起 / 翻转 / 抖动 / 发光）+ Canvas 粒子星空 + SVG 星盘**：

- 塔罗牌本身是平面 2D 图，CSS 3D 翻转即可完美呈现，并且硬件加速、无需在 Three.js 场景里做射线拾取，交互更稳。
- 文档要求的全部动效都已保留：粒子漂浮、卡牌悬浮、靠近发光震动、扇形展开重排、3D 翻牌、星盘旋转、卷轴展开。
- 四个核心差异点（手势洗牌、捏合抽牌、卡牌回应、三张牌仪式翻开）全部实现。

如需后续升级为真正的 Three.js 3D 场景，交互层（pointerState）可保持不变，只替换渲染层。

## 卡牌素材

- 22 张大阿卡那正面：公有领域 Rider-Waite-Smith 牌组（来自 Wikimedia Commons），已本地缩放至长边 800px，存于 [public/cards/major/](public/cards/major/)。
- 卡背、卡位图腾、favicon：原创 SVG（深紫黑蓝渐变 + 金色命运之眼 + 月相 + 星盘），见 [public/cards/card-back.svg](public/cards/card-back.svg)。
- 牌义与正逆位解读：本地 JSON 数据 [src/data/tarotDeck.ts](src/data/tarotDeck.ts)，综合解读由 [src/modules/tarot/readingService.ts](src/modules/tarot/readingService.ts) 拼装，后续可替换为 AI API。

> 商业化前请重新核对素材授权，并建议重绘原创牌面。

## 目录结构

```
src/
├── components/      # TarotCard / CardSlot / Starfield / StarWheel / CameraPreview / HandCursor / RitualButton
├── data/            # tarotDeck.ts（22 张大阿卡那 + 卡位定义）
├── modules/
│   ├── gesture/     # 摄像头 + MediaPipe 手势识别 + useGestureSession 钩子
│   ├── input/       # 统一指针状态
│   └── tarot/       # 解牌服务
├── pages/           # 8 个流程页面
├── store/           # Zustand 状态机
├── types/           # 类型定义
└── App.tsx          # 状态机路由
```

## 技术栈

React 18 + TypeScript · Vite 6 · Tailwind CSS v4 · Zustand · MediaPipe Tasks Vision
