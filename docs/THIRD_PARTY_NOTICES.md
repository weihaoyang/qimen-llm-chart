# 第三方声明（Third-Party Notices）

## 随仓库内嵌（vendored）的代码

### 皇极经世 · 元会运世纪年

- 来源：<https://github.com/Ryanlyly-ai/huangji-jingshi>（`src/chronology.ts`、`src/constants.ts`、`src/types.ts`）
- 许可：MIT License — Copyright (c) 2026 Huangji Jingshi contributors
- 位置：`src/lib/huangji/chronology.ts`（忠实移植并改写导出与文档注释，算法与原实现一致）
- 说明：本仓库为 GPL-3.0-only。MIT 为宽松许可，允许在有署名与许可声明的前提下使用、修改与再分发；MIT 代码并入 GPL 项目是允许的方向。上表许可原文如下。

```
MIT License

Copyright (c) 2026 Huangji Jingshi contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 运行时依赖

见 `package.json` 的 `dependencies` / `devDependencies`；各包的许可随其发布物提供。

## 已评估但**未采用**的开源实现（许可不兼容）

- `mingyu-core`（含 `huangji-jingshi` 模块）— AGPL-3.0-only
- `caelis-engine` / `Caelus`（`harmonicChart`）— AGPL-3.0
- `kaabalah`（含 enneagram）— AGPL-3.0

AGPL-3.0 与本仓库的 GPL-3.0-only 组合会把整体许可提升为 AGPL，故不引入。
