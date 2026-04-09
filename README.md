# WordMap / 圈选即翻译

[中文](#中文说明) | [English](#english)

> 在任意网页上圈选文字区域，调用 OCR 识别，并用 AI 完成翻译与拆解。
> Capture text from any webpage, run OCR, and translate it with AI.

---

## 中文说明

### 项目简介

**WordMap** 是一个基于截图识别的浏览器翻译插件。
用户可以在网页上自由圈选或矩形框选任意可见区域，先通过 OCR 提取文字，再交给大模型完成整句翻译和词语拆解。

它尤其适合以下场景：

- 字幕
- 漫画气泡
- 图片中的文字
- 扫描段落
- 表格或复杂排版内容

### 功能特性

#### 核心功能

- **自由圈选**：适合字幕、气泡、不规则区域
- **矩形框选**：适合段落、表格、规则文本区域
- **OCR 识别**：基于 OCR.space 提取图片文字
- **AI 翻译 + 词语拆解**：支持整句翻译与逐词解释
- **中英双语界面**
- **界面语言与 OCR 识别语言彻底解耦**
- **支持自定义大模型接口地址与模型名称**
- **快捷键支持**，提高操作效率

#### 关键设计原则

> **界面语言不等于 OCR 原文语言。**
>
> 插件界面语言只影响设置面板和页面提示文案；OCR 识别语言会直接传给 OCR API，必须与图片中的实际文字语言一致。

### 界面预览

仓库公开后，你可以把截图补充到这里。

```md
![Popup UI](./docs/screenshots/popup.png)
![Result Card](./docs/screenshots/result-card.png)
```

### 安装方式

#### 方式一：加载本地开发版

1. 下载或克隆本仓库
2. 打开浏览器扩展管理页
3. 开启 **开发者模式**
4. 点击 **加载已解压的扩展程序**
5. 选择本项目目录

#### 方式二：安装打包版本

如果你发布了打包版 ZIP，用户也可以解压后通过同样方式加载。

### 配置说明

开始使用前，请先配置以下内容：

#### 必填

- **Model Base URL**：你的大模型接口地址
- **Model Name**：你的模型名称

#### 可选

- **Model API Key**：如果服务商要求认证，则填写
- **OCR.space API Key**：可选。默认可使用公共测试 Key，但建议使用你自己的 OCR.space Key 以获得更稳定的体验

#### 语言设置

- **UI Language**：仅控制插件界面显示语言
- **OCR Source Language**：必须与图片中的原文语言一致
- **Translation Target Language**：大模型翻译输出的目标语言

### 使用方法

#### 三步上手

1. 先填写模型配置
2. 选择 OCR 原文语言和翻译目标语言
3. 在网页上开始圈选识别

#### 圈选模式

##### 自由圈选

适合：

- 字幕
- 气泡
- 不规则区域

##### 矩形框选

适合：

- 段落
- 表格
- 规则文本块

完成圈选后，插件会：

- 截取所选区域
- 调用 OCR.space 识别文字
- 将识别结果发送给你配置的大模型
- 在页面内显示 OCR 原文、整句翻译和词语拆解

### 快捷键

默认快捷键：

- **Alt + T**：自由圈选
- **Alt + R**：矩形框选

你也可以在浏览器扩展快捷键设置中自定义快捷键。

### 项目结构

```text
.
├── manifest.json
├── background.js      # 后台逻辑
├── content.js         # 页面内圈选与结果展示
├── popup.html         # 弹窗结构
├── popup.js           # 弹窗逻辑
├── popup.css          # 弹窗样式
├── style.css          # 页面注入样式
├── i18n.js            # 界面文案与国际化
├── assets/            # 图标与品牌资源
└── README.md
```

### 隐私说明

WordMap 只处理用户主动圈选的图片区域。

所选区域可能会被发送到：

- **OCR.space**：用于文字识别
- **你配置的大模型服务商**：用于翻译和解释

请自行确认所使用第三方服务的隐私政策与数据合规要求。

### 已知限制

- OCR 识别质量依赖图片清晰度、字体样式以及语言参数是否匹配
- 部分网站可能会限制脚本注入或截图行为
- 大模型输出质量取决于你使用的模型和服务商
- 如果 OCR 语言选择错误，识别结果可能明显变差

### 后续计划

- 支持更多 OCR 服务商
- 更多翻译输出格式
- 更完善的结果卡片布局
- 更好的模型服务商预设
- 可选历史记录面板

### 开发说明

本项目当前重点是“实用优先”：

- 快速圈选流程
- 清晰的中英双语界面
- 尽量减少配置门槛
- 严格区分界面语言与 OCR 语言

欢迎提交 issue 或 pull request 一起改进这个项目。

### 💖 赞助开发者
如果这个小工具为你节省了时间，或者帮助了你的外语学习，欢迎请我喝杯咖啡！你的支持是我持续开源的动力。
**[☕ 点击这里赞助 (Sponsor) ](https://www.paypal.com/paypalme/robin326753)**

### 开源协议

请根据你的仓库实际情况选择开源协议，例如：

- MIT
- Apache-2.0
- GPL-3.0

示例：

```md
本项目基于 MIT License 开源。
```

---

## English

### Overview

**WordMap** is a browser extension for screenshot-based text translation.
It lets users select any visible area on a webpage, extract text with OCR, and send the result to an LLM for translation and word-level breakdown.

It is especially useful for:

- subtitles
- speech bubbles
- images with embedded text
- scanned paragraphs
- tables or mixed layout content

### Features

#### Core Features

- **Freehand capture** for irregular regions such as bubbles and subtitles
- **Rectangle capture** for paragraphs, tables, and text blocks
- **OCR extraction** using OCR.space
- **AI translation + word breakdown**
- **Bilingual UI** (Chinese / English)
- **UI language separated from OCR language**
- **Custom LLM endpoint support**
- **Keyboard shortcuts** for quick workflow

#### Important Design Rule

> **UI language is NOT the same as OCR source language.**
>
> The extension interface language only controls the popup UI and in-page prompts.
> The OCR language parameter is sent directly to the OCR API and must match the text language in the selected image.

### Screenshots

You can add screenshots here after publishing the repository.

```md
![Popup UI](./docs/screenshots/popup.png)
![Result Card](./docs/screenshots/result-card.png)
```

### Installation

#### Option 1: Load unpacked extension

1. Download or clone this repository
2. Open your browser extension page
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the project folder

#### Option 2: Install from packaged ZIP

If you provide a packaged ZIP release, users can unzip it and load it the same way.

### Configuration

Before using WordMap, configure the following fields:

#### Required

- **Model Base URL**: Your LLM API base URL
- **Model Name**: The model identifier used by your provider

#### Optional

- **Model API Key**: Required only if your provider needs authentication
- **OCR.space API Key**: Optional. The extension can use the public test key by default, but your own key is recommended for stability

#### Language Settings

- **UI Language**: Controls only the extension interface language
- **OCR Source Language**: Must match the text language in the selected image
- **Translation Target Language**: The output language returned by the LLM

### How to Use

#### Simple Workflow

1. Configure model settings
2. Choose OCR source language and translation target language
3. Start capturing on the webpage

#### Capture Modes

##### Freehand Capture

Best for:

- subtitles
- speech bubbles
- irregular shapes

##### Rectangle Capture

Best for:

- paragraphs
- tables
- text blocks

After capture, the extension will:

- take a screenshot of the selected area
- send it to OCR.space
- extract text
- send the text to your configured LLM
- render OCR text, full translation, and word breakdown in an in-page result card

### Keyboard Shortcuts

Default shortcuts:

- **Alt + T**: Freehand capture
- **Alt + R**: Rectangle capture

You can customize shortcuts in your browser extension shortcut settings.

### Architecture

```text
.
├── manifest.json
├── background.js      # background service worker
├── content.js         # in-page selection and result card
├── popup.html         # popup structure
├── popup.js           # popup logic
├── popup.css          # popup styles
├── style.css          # in-page styles
├── i18n.js            # UI copy and translations
├── assets/            # icons and logo
└── README.md
```

### Privacy

WordMap processes user-selected image regions only.

Selected screenshots may be sent to:

- **OCR.space** for text extraction
- **your configured LLM provider** for translation and explanation

Please review the privacy policies of the third-party services you use.

### Known Limitations

- OCR quality depends on image clarity, font style, and language match
- Some websites may restrict script injection or screenshot behavior
- LLM output quality depends on the configured model and provider
- Poor OCR language selection may lead to incorrect recognition

### Roadmap

- More OCR providers
- More translation output formats
- Better result card layout
- Better model provider presets
- Optional history panel

### Development Notes

This project is currently focused on practical usability:

- fast capture workflow
- clean bilingual UI
- minimal setup friction
- strict separation between UI language and OCR language

If you want to contribute, feel free to open an issue or pull request.

### 💖 Sponsor the Developer
If this tool saves you time or helps you learn a new language, consider buying me a coffee! Your support fuels my motivation to maintain and build more open-source tools.
**[☕ Click here to Sponsor ](https://www.paypal.com/paypalme/robin326753)**

### License

Choose the license that matches your repository setup, for example:

- MIT
- Apache-2.0
- GPL-3.0

Example:

```md
This project is licensed under the MIT License.
```
