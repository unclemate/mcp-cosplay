# MCP Cosplay

一个为LLM回复添加角色扮演和人格特性的MCP（Model Context Protocol）服务器。

**通信模式**：仅支持Stdio

## 安装

### 从npm安装

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

### MCP客户端配置

添加到您的MCP客户端配置中：

#### Claude Desktop配置

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

#### 开发模式（支持自动重载）

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

> **注意**：此MCP服务器仅支持stdio模式通信。

#### 包安装（推荐）

使用已发布的npm包：

```json
{
  "mcpServers": {
    "cosplay": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-cosplay@latest"
      ]
    }
  }
}
```

或者如果已全局安装：

```json
{
  "mcpServers": {
    "cosplay": {
      "command": "mcp-cosplay"
    }
  }
}
```

## 可用工具

### cosplay_text
为文本添加角色扮演和人格特性

**参数：**
- `text`（必需）：要角色化的文本
- `character`（可选）：角色类型（`enthusiastic`、`sarcastic`、`professional`或自定义角色）
- `intensity`（可选）：强度级别（0-5，默认：3）
- `context`（可选）：用于更好角色分析的上下文

**示例：**
```json
{
  "text": "你的代码看起来很棒！",
  "character": "enthusiastic",
  "intensity": 4
}
```

### cosplay_text_simple
为文本添加角色扮演和人格特性（仅返回处理后的文本）

**参数：**
- `text`（必需）：要角色化的文本
- `character`（可选）：角色类型（`enthusiastic`、`sarcastic`、`professional`或自定义角色）
- `intensity`（可选）：强度级别（0-5，默认：3）
- `context`（可选）：用于更好角色分析的上下文

### get_characters
获取可用的角色类型

### get_all_characters
获取所有可用的角色配置文件，包括自定义角色

### get_character_profile
获取特定角色的详细配置文件

**参数：**
- `name`（必需）：角色名称

### add_character
添加新的自定义角色配置文件

**参数：**
- `name`（必需）：角色名称
- `description`（必需）：角色描述
- `personality`（必需）：人格配置
- `examples`（可选）：示例短语
- `category`（可选）：角色类别

### remove_character
删除自定义角色配置文件

**参数：**
- `name`（必需）：要删除的角色名称

### search_characters
按名称、描述或类别搜索角色

**参数：**
- `query`（必需）：搜索查询

### get_characters_by_category
按类别筛选角色

**参数：**
- `category`（必需）：筛选类别

### generate_character
使用LLM动态生成角色人格

**参数：**
- `characterName`（必需）：要生成的角色名称
- `description`（可选）：角色描述
- `context`（可选）：角色生成上下文
- `intensity`（可选）：强度级别（0-5）
- `examples`（可选）：示例短语

### get_config
获取当前配置

### update_config
更新配置

**参数：**
- `defaultPersonality`：默认人格类型
- `defaultIntensity`：默认强度级别

### check_content_safety
检查内容安全违规

**参数：**
- `text`（必需）：要检查安全违规的文本

### get_content_safety_config
获取当前内容安全配置

### update_content_safety_config
更新内容安全配置

**参数：**
- `enabled`：启用/禁用内容安全检查
- `checkMethod`：内容检查方法（`llm`或`keyword`）
- `confidenceThreshold`：违规检测的置信度阈值
- `strictMode`：启用严格模式进行内容检查

## 🤔 核心概念

`MCP Cosplay`服务器充当"角色翻译器"或"人格过滤器"。它接收标准LLM生成的回复，然后根据您配置的规则或角色参数执行二次处理，添加角色特定的特征、语气词和人格，然后返回处理后的文本。

## 🛠️ 主要功能

### 角色管理系统
- **内置角色**：预配置的人格（`enthusiastic`、`sarcastic`、`professional`）
- **自定义角色**：添加和管理具有详细人格特征的自定义角色配置文件
- **动态生成**：基于描述使用LLM生成角色人格
- **角色搜索**：按名称、描述或类别搜索和筛选角色

### 内容安全系统
- **可配置安全检查**：启用/禁用内容安全监控
- **多种检测方法**：选择基于LLM或基于关键字的检测
- **可调灵敏度**：设置置信度阈值和严格模式选项
- **实时监控**：在处理前检查内容安全违规

### 高级文本处理
- **情感分析**：分析输入文本的情感基调和上下文
- **人格应用**：应用角色特定的特征、言语模式和语气
- **强度控制**：将人格强度从微妙的（0）调整到强烈的（5）
- **上下文感知**：考虑对话上下文以获得更好的角色表现

### 方言支持
- **多种方言**：支持不同的语言风格和地域变体
- **文化适应**：使角色人格适应不同文化背景
- **语言风格匹配**：在不同语言风格间保持一致性

## ⚠️ 重要注意事项

### 内容安全性和适当性
服务器包含内置的内容安全机制，不能被禁用。这些功能确保负责任的使用：

- **可配置安全级别**：调整灵敏度阈值和检测方法
- **上下文感知处理**：基于对话上下文自动适应
- **专业标准**：在正式场合保持适当语言
- **实时监控**：处理过程中持续安全检查

### 性能和延迟
每个回复都需要MCP服务器进行额外处理（情感分析 -> 人格重写），这将增加系统响应时间。您需要优化代码以确保高效的处理流程。

### 一致性
设计的人格应该是一致的。如果一个角色是"愤怒的家伙"，他们的所有回复都应该符合这个设定，而不是忽冷忽热。

## 📝 许可证

见[LICENSE](LICENSE)文件。