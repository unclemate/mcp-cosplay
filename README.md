# MCP Cosplay

An MCP (Model Context Protocol) server that adds cosplay characters and personality to LLM responses.

**Communication Mode**: Stdio only

## Installation

### From Smithery (Recommended)

Install from Smithery platform:

```bash
npx @smithery/cli@latest install mcp-cosplay
```

### From npm

Install the published package:

```bash
npm install -g mcp-cosplay
```

### Development Installation

For local development:

```bash
git clone git@github.com:unclemate/mcp-cosplay.git
cd mcp-cosplay
npm install
npm run build
```

### MCP Client Configuration

Add to your MCP client configuration:

#### Claude Desktop Configuration

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

#### Development Mode (with auto-reload)

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

> **Note**: This MCP server only supports stdio mode communication.

#### Package Installation (Recommended)

Using the published npm package:

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

Or if installed globally:

```json
{
  "mcpServers": {
    "cosplay": {
      "command": "mcp-cosplay"
    }
  }
}
```

## Available Tools

### cosplay_text
Add cosplay character and personality to text

**Parameters:**
- `text` (required): Text to cosplay
- `character` (optional): Character type (`trump`, `enthusiastic`, `sarcastic`, `professional`)
- `intensity` (optional): Intensity level (0-5, default: 3)
- `context` (optional): Context for better character analysis

**Example:**
```json
{
  "text": "Your code looks great!",
  "personality": "enthusiastic",
  "intensity": 4
}
```

### get_personalities
Get available personality types

### get_config
Get current configuration

### update_config
Update configuration

**Parameters:**
- `defaultPersonality`: Default personality type
- `defaultIntensity`: Default intensity level

## 🤔 Core Concept

The `MCP Cosplay` server acts as a "character translator" or "personality filter". It receives standard LLM-generated responses, then performs secondary processing based on your configured rules or character parameters, adding character-specific traits, tone words, and personality before returning the processed text.

## 🛠️ Key Technologies

Based on research, MCP servers' core capabilities lie in securely connecting external resources and tools, and can leverage the Sampling mechanism to call LLM capabilities on the server side for data processing.

### Sentiment Analysis as Foundation
Integrate a sentiment analysis tool (analyze_sentiment) within the MCP server. This tool can determine the emotional tendency of the original text (positive, negative, neutral), providing a basis for subsequent personalized rewriting.

### Personalization and Emotional Enhancement
After obtaining the emotional tone of the original text, another core tool (e.g., add_personality) can be used. This tool will rewrite the text based on preset personalities (such as "enthusiastic", "cynical", "humorous"), sentiment analysis results, and your configured rules (such as "appropriately adding F words in negative emotions").

### Leveraging Sampling to Call LLM
Text rewriting and emotional enhancement can also be seen as a "generation" task. Through the Sampling mechanism, the text that needs rewriting and rewriting requirements (system_prompt) can be sent to the LLM, allowing a more powerful model to complete fine-grained wording modifications and tone word additions, rather than relying on simple string replacement rules.

## ⚠️ Important Considerations

### Content Safety and Appropriateness
This is the biggest challenge. Frequent or inappropriate use of "F words" may offend users or make the product appear unprofessional. Strong recommendations:

- **Make it configurable**: Don't hardcode it. Provide users or administrators with a switch or intensity slider (e.g., personality_level: 0-5, where 0 is no personality and 5 is intense style full of "F words"), letting users decide whether they need "personalization" and to what degree.
- **Context-aware**: Ensure automatic disabling or significant reduction of this personalization in certain serious or sensitive conversation scenarios (e.g., when discussing medical, legal, or financial advice), maintaining professional and accurate responses.

### Performance and Latency
Every response requires additional processing by the MCP server (sentiment analysis -> personalization rewriting), which will increase system response time. You need to optimize your code to ensure efficient processing flow.

### Consistency
The designed personality should be consistent. If a character is an "angry guy", all their responses should conform to this setting, rather than being hot and cold.

## 📝 License

See [LICENSE](LICENSE) file.
