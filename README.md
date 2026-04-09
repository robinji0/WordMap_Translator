# WordMap Translator 圈选翻译 🔍🌍

[English Version](#english-version) | [中文说明](#中文说明)

---

<a id="中文说明"></a>
## 🇨🇳 中文说明

**WordMap Translator** 是一款专为外语学习者和开发者设计的 Chrome 浏览器扩展。无论是视频硬字幕、图片、还是被网站限制右键的文本，只需轻轻一圈（或框选），即可突破所有限制，实现**精准的整句翻译**与**深度的词语拆解**。

### ✨ 核心功能
- **万物皆可提取：** 无视任何网站的防复制（CSP / 禁用右键）策略，支持铅笔自由圈选与专业矩形截图。
- **词汇深度拆解：** 利用大型语言模型（LLM）的推理能力，不仅给出整句翻译，还能将外语长句拆解为一个个词汇，解释语法与助词，极其适合外语学习。
- **免本地算力：** 前端极其轻量，接入免费的专业 OCR（OCR.space）提取文本，再调用任意大模型（如 Llama, GPT, DeepSeek 等）进行翻译，不消耗你电脑的任何算力。
- **多语言自动兼容：** 插件界面支持中英双语自适应，OCR 支持中/英/日/韩/法/德/西/俄等 8 种主流语言。
- **极致的交互体验：** 支持快捷键秒开，翻译结果卡片支持自由拖拽，按 `ESC` 即可无缝退出。

### 🚀 安装指南
1. 下载此仓库的全部源码并解压。
2. 打开 Chrome 浏览器，在地址栏输入 `chrome://extensions/`。
3. 打开右上角的 **“开发者模式 (Developer mode)”**。
4. 点击左上角的 **“加载已解压的扩展程序 (Load unpacked)”**，选择你解压的文件夹即可完成安装。

### ⚙️ 配置与使用
1. 点击浏览器右上角的插件图标打开设置面板。
2. **大模型配置 (必需):** 填入你的大模型 Base URL、模型名称和 API Key。
3. **OCR.space Key (强烈建议):** 默认自带公共测试 Key（`helloworld`）。若报错频繁，请点击面板内的链接，免费申请一个你专属的 API Key（每月 25000 次免费额度）。
4. **选择语言:** 告诉插件你即将截取的是什么语言（Source Lang），以及希望翻译成什么语言（Target Lang）。
5. **快捷操作:** 按下 `Alt+T` 唤出铅笔画笔，`Alt+R` 唤出矩形框选，在网页任意位置截取后等待奇迹发生！

### 💖 赞助开发者
如果这个小工具为你节省了时间，或者帮助了你的外语学习，欢迎请我喝杯咖啡！你的支持是我持续开源的动力。
**[☕ 点击这里赞助 (Sponsor) ](https://www.paypal.com/paypalme/robin326753)**

---
<br><br>

<a id="english-version"></a>
## 🇺🇸 English Version

**WordMap Translator** is a powerful Chrome extension designed for language learners and developers. Whether it's hardcoded video subtitles, text within images, or websites that disable text selection, simply draw a circle (or a rectangle) around the text. WordMap breaks through all restrictions to provide **accurate full-sentence translations** alongside **in-depth word-by-word breakdowns**.

### ✨ Key Features
- **Extract Text from Anything:** Bypasses strict web security policies (CSP) and anti-copy mechanisms. Supports both freehand pencil drawing and precise rectangle selection.
- **Deep Vocabulary Breakdown:** Leverages the reasoning power of Large Language Models (LLMs) to not only translate sentences but also break them down into individual words and grammatical particles—perfect for language acquisition.
- **Zero Local Overhead:** An extremely lightweight frontend. It uses a free professional OCR API (OCR.space) to extract text, then delegates the heavy lifting to any LLM of your choice (Llama, GPT, DeepSeek, etc.).
- **Multi-Language Support:** The UI automatically adapts to English or Chinese. The OCR engine supports 8 major languages including English, Japanese, Korean, French, German, Spanish, Russian, and Chinese.
- **Smooth UX:** Launch instantly via customizable shortcuts. The floating translation result card can be dragged anywhere and dismissed seamlessly with the `ESC` key.

### 🚀 Installation Guide
1. Download or clone this repository to your local machine and extract the files.
2. Open your Chrome browser and navigate to `chrome://extensions/`.
3. Enable **"Developer mode"** toggle in the top right corner.
4. Click the **"Load unpacked"** button and select the extracted folder.

### ⚙️ Configuration & Usage
1. Click the extension icon in the toolbar to open the settings panel.
2. **LLM Configuration (Required):** Enter your LLM Base URL, Model Name, and API Key.
3. **OCR.space Key (Highly Recommended):** The extension uses a public test key (`helloworld`) by default. To avoid rate limits, click the link in the panel to get your own free API Key (25,000 requests/month).
4. **Language Selection:** Specify the source language you are going to capture, and your desired target translation language.
5. **Quick Action:** Use `Alt+T` for the pencil tool or `Alt+R` for the rectangle tool. Select any area on the webpage and wait for the translation magic!

### 💖 Sponsor the Developer
If this tool saves you time or helps you learn a new language, consider buying me a coffee! Your support fuels my motivation to maintain and build more open-source tools.
**[☕ Click here to Sponsor ](https://www.paypal.com/paypalme/robin326753)**
