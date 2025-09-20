# MCP Cosplay

利用 MCP（Model Context Protocol）服务器为 LLM 的回复添加角色扮演和个性.

## 安装

### 从 Smithery 安装（推荐）

从 Smithery 平台安装：

```bash
npx @smithery/cli@latest install mcp-cosplay
```

### 从 npm 安装

安装已发布的包：

```bash
npm install -g mcp-cosplay
```

### 开发环境安装

用于本地开发：

```bash
git clone git@github.com:unclemate/mcp-cosplay.git
cd mcp-cosplay
npm install
npm run build
```

### MCP 客户端配置

添加到你的 MCP 客户端配置中：

#### Claude Desktop 配置

```json
{
  "mcpServers": {
    "cosplay": {
      "command": "node",
      "args": ["/path/to/mcp-cosplay/dist/index.js"],
      "env": {}
    }
  }
}
```

#### 开发模式（带自动重载）

```json
{
  "mcpServers": {
    "cosplay": {
      "command": "npx",
      "args": ["tsx", "/path/to/mcp-cosplay/src/index.ts"],
      "env": {}
    }
  }
}
```

#### Smithery 安装（推荐）

使用 Smithery 平台：

```json
{
  "mcpServers": {
    "cosplay": {
      "command": "npx",
      "args": [
        "-y",
        "@smithery/mcp-cosplay@latest"
      ]
    }
  }
}
```

#### 包安装（发布后）

```json
{
  "mcpServers": {
    "cosplay": {
      "command": "npx",
      "args": [
        "-y",
        "@unclemate/mcp-cosplay@latest"
      ]
    }
  }
}
```

## 可用工具

### cosplay_text
为文本添加角色扮演和个性

**参数：**
- `text`（必需）：要角色扮演的文本
- `character`（可选）：角色类型（`trump`、`enthusiastic`、`sarcastic`、`professional`）
- `intensity`（可选）：强度等级（0-5，默认：3）
- `context`（可选）：用于更好角色分析的上下文

**示例：**
```json
{
  "text": "你的代码看起来很棒！",
  "personality": "enthusiastic",
  "intensity": 4
}
```

### get_personalities
获取可用的人格类型列表

### get_config
获取当前配置

### update_config
更新配置

**参数：**
- `defaultPersonality`：默认人格类型
- `defaultIntensity`：默认强度等级

## 🤔 核心思路

`MCP Cosplay` 服务器将扮演一个"角色翻译器"或"个性过滤器"的角色。它接收 LLM 生成的标准回复，然后根据你设定的规则或角色参数，对其内容进行二次加工，添加角色特定的特征、语气词和个性，最后再将加工后的文本返回。

## 🛠️ 关键技术

根据搜索结果，MCP 服务器的核心能力在于安全地连接外部资源与工具，并能通过 Sampling 机制在服务器端调用 LLM 的能力来处理数据。

### 情感分析作为基础
MCP 服务器内集成一个情感分析工具（analyze_sentiment）。这个工具可以判断原始文本的情感倾向（积极、消极、中性），为后续的个性化改写提供依据。

### 个性化与情感增强
在获取了原始文本的情感基调后，另一个核心工具（例如 add_personality）。这个工具将根据预设的个性（如"热情洋溢"、"愤世嫉俗"、"幽默风趣"）、情感分析结果以及你设定的规则（如"在消极情绪下适当添加 F words"），对文本进行改写。

### 利用 Sampling 调用 LLM
文本改写和情感增强本身也可以看作是一个"生成"任务。可以通过 Sampling 机制，将需要改写的文本和改写要求（system_prompt）发送给 LLM，让一个更强大的模型来完成精细的措辞修改和语气词添加，而不是依赖简单的字符串替换规则。

## ⚠️ 重要注意事项

### 内容安全与适当性
这是最大的挑战。频繁或不当使用"F words"很可能冒犯用户，或使产品显得不专业。强烈建议：

- **使其可配置**：不要写死。为用户或管理员提供一个开关或强度滑块（例如：personality_level: 0-5，0为无个性，5为充满"F words"的强烈风格），让使用者决定是否需要以及需要多大程度的"个性化"。
- **上下文感知**：确保在某些严肃或敏感的对话场景中（例如，讨论医疗、法律、财务建议时）自动禁用或大幅减弱这种个性化，保持回复的专业性和准确性。

### 性能与延迟
每一个回复都需要经过 MCP 服务器的额外处理（情感分析 -> 个性化改写），这会增加系统的响应时间。你需要优化代码，确保处理流程高效。

### 一致性
设计的个性应该是一致的。如果一个角色是"暴躁老哥"，那么它的所有回复都应该符合这个设定，而不是忽冷忽热。

## 📝 许可证

见 [LICENSE](LICENSE) 文件。
