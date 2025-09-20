# MCP Cosplay - 使用指南

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 构建项目
```bash
npm run build
```

### 3. 启动服务器
```bash
npm start
```

### 4. 开发模式（热重载）
```bash
npm run dev
```

## 可用工具

### 1. cosplay_text
为文本添加角色扮演和个性

**参数：**
- `text` (必需): 要角色扮演的文本
- `character` (可选): 角色类型 (trump/enthusiastic/sarcastic/professional)
- `intensity` (可选): 强度等级 (0-5, 默认: 3)
- `context` (可选): 上下文信息

**示例：**
```json
{
  "text": "Your code looks great!",
  "character": "trump",
  "intensity": 4
}
```

### 2. get_characters
获取可用的角色类型列表

### 3. get_config
获取当前配置

### 4. update_config
更新配置

**参数：**
- `defaultPersonality`: 默认人格类型
- `defaultIntensity`: 默认强度等级

## 角色类型

### trump (特朗普型)
- 特点：充满自信，强势表达
- 使用"太棒了"、"相信我"等标志性语言
- 适合：需要强势领导力的场景

### enthusiastic (热情型)
- 特点：充满活力，积极向上
- 使用大量感叹号和积极词汇
- 适合：鼓励、赞美、庆祝成功

### sarcastic (讽刺型)
- 特点：幽默吐槽，带点讽刺
- 使用反讽和黑色幽默
- 适合：处理错误、自嘲、轻松氛围

### professional (专业型)
- 特点：专业礼貌，适度友好
- 保持专业性的同时添加温度
- 适合：正式讨论、技术指导

## 配置文件

项目启动时会自动创建 `cosplay-config.json` 配置文件：

```json
{
  "defaultPersonality": "enthusiastic",
  "defaultIntensity": 3,
  "maxIntensity": 5
}
```

## MCP 集成示例

在您的 MCP 客户端配置中添加：

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

## 测试

运行测试验证功能：
```bash
npx tsx test.ts  // 如果存在测试文件
```

## 故障排除

1. **构建失败**: 确保安装了所有依赖
2. **TypeScript 错误**: 检查类型定义
3. **MCP 连接问题**: 验证服务器是否正常启动