# MCP Cosplay

[中文README](README.zh_CN.md)

An MCP (Model Context Protocol) server that adds cosplay characters and personality to LLM responses.

**Communication Mode**: Stdio only

## usage

Just say `cosplay <somebody's name>`

## Installation

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

Add to your Claude Desktop configuration file (`claude_desktop_config.json`):

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

#### Claude Code Configuration

Add to your Claude Code configuration file:

```json
{
  "mcpServers": {
    "cosplay": {
      "command": "npx",
      "args": ["-y", "mcp-cosplay@latest"]
    }
  }
}
```

Or if you have installed it globally:

```json
{
  "mcpServers": {
    "cosplay": {
      "command": "mcp-cosplay"
    }
  }
}
```

**Configuration file locations:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

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

> **Note**: Use `tsx` to run TypeScript files directly. `tsc` only compiles TS to JS but cannot execute them.

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
- `character` (optional): Character type (`enthusiastic`, `sarcastic`, `professional`, or custom characters)
- `intensity` (optional): Intensity level (0-5, default: 3)
- `context` (optional): Context for better character analysis

**Example:**
```json
{
  "text": "Your code looks great!",
  "character": "enthusiastic",
  "intensity": 4
}
```

### cosplay_text_simple
Add cosplay character and personality to text (returns processed text only)

**Parameters:**
- `text` (required): Text to cosplay
- `character` (optional): Character type (`enthusiastic`, `sarcastic`, `professional`, or custom characters)
- `intensity` (optional): Intensity level (0-5, default: 3)
- `context` (optional): Context for better character analysis

### get_characters
Get available character types

### get_all_characters
Get all available character profiles including custom characters

### get_character_profile
Get detailed profile for a specific character

**Parameters:**
- `name` (required): Character name

### add_character
Add a new custom character profile

**Parameters:**
- `name` (required): Character name
- `description` (required): Character description
- `personality` (required): Personality configuration
- `examples` (optional): Example phrases
- `category` (optional): Character category

### remove_character
Remove a custom character profile

**Parameters:**
- `name` (required): Character name to remove

### search_characters
Search characters by name, description, or category

**Parameters:**
- `query` (required): Search query

### get_characters_by_category
Get characters filtered by category

**Parameters:**
- `category` (required): Category to filter by

### generate_character
Dynamically generate character personality using LLM

**Parameters:**
- `characterName` (required): Name of the character to generate
- `description` (optional): Description of the character
- `context` (optional): Context for character generation
- `intensity` (optional): Intensity level (0-5)
- `examples` (optional): Example phrases

### get_config
Get current configuration

### update_config
Update configuration

**Parameters:**
- `defaultPersonality`: Default personality type
- `defaultIntensity`: Default intensity level

### check_content_safety
Check content safety for violations

**Parameters:**
- `text` (required): Text to check for safety violations

### get_content_safety_config
Get current content safety configuration

### update_content_safety_config
Update content safety configuration

**Parameters:**
- `enabled`: Enable/disable content safety checks
- `checkMethod`: Method to use for content checking (`llm` or `keyword`)
- `confidenceThreshold`: Confidence threshold for violation detection
- `strictMode`: Enable strict mode for content checking

## 🤔 Core Concept

The `MCP Cosplay` server acts as a "character translator" or "personality filter". It receives standard LLM-generated responses, then performs secondary processing based on your configured rules or character parameters, adding character-specific traits, tone words, and personality before returning the processed text.

## 🛠️ Key Features

### Character Management System
- **Built-in Characters**: Pre-configured personalities (`enthusiastic`, `sarcastic`, `professional`)
- **Custom Characters**: Add and manage your own character profiles with detailed personality traits
- **Dynamic Generation**: Generate character personalities using LLM based on descriptions
- **Character Search**: Search and filter characters by name, description, or category

### Content Safety System
- **Configurable Safety Checks**: Enable/disable content safety monitoring
- **Multiple Detection Methods**: Choose between LLM-based or keyword-based detection
- **Adjustable Sensitivity**: Set confidence thresholds and strict mode options
- **Real-time Monitoring**: Check content for safety violations before processing

### Advanced Text Processing
- **Emotion Analysis**: Analyze emotional tone and context of input text
- **Personality Application**: Apply character-specific traits, speech patterns, and tone
- **Intensity Control**: Adjust personality strength from subtle (0) to intense (5)
- **Context Awareness**: Consider conversation context for better character portrayal

### Dialect Support
- **Multiple Dialects**: Support for different linguistic styles and regional variations
- **Cultural Adaptation**: Adapt character personalities to different cultural contexts
- **Language Style Matching**: Maintain consistency across different language styles

## ⚠️ Important Considerations

### Content Safety and Appropriateness
The server includes built-in content safety mechanisms that cannot be disabled. These features ensure responsible usage:

- **Configurable Safety Levels**: Adjust sensitivity thresholds and detection methods
- **Context-aware Processing**: Automatic adaptation based on conversation context
- **Professional Standards**: Maintains appropriate language in formal contexts
- **Real-time Monitoring**: Continuous safety checks during processing

### Performance and Latency
Every response requires additional processing by the MCP server (sentiment analysis -> personalization rewriting), which will increase system response time. You need to optimize your code to ensure efficient processing flow.

### Consistency
The designed personality should be consistent. If a character is an "angry guy", all their responses should conform to this setting, rather than being hot and cold.

## 📝 License

See [LICENSE](LICENSE) file.
