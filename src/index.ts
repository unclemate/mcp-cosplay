#!/usr/bin/env node

// MCP Cosplay - Content Safety Protected Software
//
// This software includes essential content safety functionality that may not be
// removed, disabled, or bypassed per the additional terms in the LICENSE file.
// The content safety checking features are critical safety mechanisms.

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { Cosplay } from "./cosplay.js";
import { CharacterGenerationRequest } from "./dynamic-character-generator.js";

// Create server instance
const server = new Server(
  {
    name: "cosplay-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Create cosplay instance
const cosplay = new Cosplay();

// Set server reference for content safety checker
cosplay.setServer(server);

// Define schemas
const CosplayRequestSchema = z.object({
  text: z.string().min(1),
  character: z.string().min(1).optional(),
  intensity: z.number().min(0).max(5).optional(),
  context: z.string().optional(),
  isLLMContent: z.boolean().optional(),
});

const CharacterProfileSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  personality: z.object({
    signaturePhrases: z.array(z.string()),
    toneWords: z.array(z.string()),
    attitude: z.string(),
    speechPatterns: z.array(z.string()),
    backgroundContext: z.string(),
    emojiPreferences: z.array(z.string()),
    languageStyle: z.string(),
  }),
  examples: z.array(z.string()).optional(),
  category: z.string().optional(),
});

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "cosplay_text",
        description:
          "Add cosplay character and personality to text. Only processes content marked as LLM-generated. Supports both built-in personalities (enthusiastic, sarcastic, professional) and custom characters.",
        inputSchema: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "The text to cosplay",
            },
            character: {
              type: "string",
              description:
                "Character name or personality type to apply. Built-in types: enthusiastic, sarcastic, professional. Custom characters can be added using add_character tool.",
            },
            intensity: {
              type: "number",
              minimum: 0,
              maximum: 5,
              description: "Intensity level (0-5, default: 3)",
            },
            context: {
              type: "string",
              description: "Optional context for better character analysis",
            },
            isLLMContent: {
              type: "boolean",
              description:
                "Mark if the text is LLM generated content (only LLM content will be cosplayed)",
            },
          },
          required: ["text"],
        },
      },
      {
        name: "get_characters",
        description: "Get available character types",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_all_characters",
        description:
          "Get all available character profiles including custom characters",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_character_profile",
        description: "Get detailed profile for a specific character",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Character name",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "add_character",
        description: "Add a new custom character profile",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Character name",
            },
            description: {
              type: "string",
              description: "Character description",
            },
            personality: {
              type: "object",
              properties: {
                signaturePhrases: {
                  type: "array",
                  items: { type: "string" },
                  description: "Signature phrases the character uses",
                },
                toneWords: {
                  type: "array",
                  items: { type: "string" },
                  description: "Common tone words",
                },
                attitude: {
                  type: "string",
                  description:
                    "Character attitude (e.g., superior, contemplative, critical)",
                },
                speechPatterns: {
                  type: "array",
                  items: { type: "string" },
                  description: "Speech patterns and styles",
                },
                backgroundContext: {
                  type: "string",
                  description: "Background context for the character",
                },
                emojiPreferences: {
                  type: "array",
                  items: { type: "string" },
                  description: "Preferred emojis",
                },
                languageStyle: {
                  type: "string",
                  description: "Language style description",
                },
              },
              required: [
                "signaturePhrases",
                "toneWords",
                "attitude",
                "speechPatterns",
                "backgroundContext",
                "emojiPreferences",
                "languageStyle",
              ],
            },
            examples: {
              type: "array",
              items: { type: "string" },
              description: "Example phrases or dialogues",
            },
            category: {
              type: "string",
              description:
                "Character category (e.g., celebrity, historical, fictional)",
            },
          },
          required: ["name", "description", "personality"],
        },
      },
      {
        name: "search_characters",
        description: "Search characters by name, description, or category",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_characters_by_category",
        description: "Get characters filtered by category",
        inputSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description: "Category to filter by",
            },
          },
          required: ["category"],
        },
      },
      {
        name: "remove_character",
        description: "Remove a custom character profile",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Character name to remove",
            },
          },
          required: ["name"],
        },
      },
      {
        name: "get_config",
        description: "Get current cosplay configuration",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "update_config",
        description: "Update cosplay configuration",
        inputSchema: {
          type: "object",
          properties: {
            defaultPersonality: {
              type: "string",
              enum: ["enthusiastic", "sarcastic", "professional"],
              description: "Default personality type",
            },
            defaultIntensity: {
              type: "number",
              minimum: 0,
              maximum: 5,
              description: "Default intensity level",
            },
          },
        },
      },
      {
        name: "check_content_safety",
        description: "Check content safety for violations",
        inputSchema: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "Text to check for safety violations",
            },
          },
          required: ["text"],
        },
      },
      {
        name: "get_content_safety_config",
        description: "Get current content safety configuration",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "update_content_safety_config",
        description: "Update content safety configuration",
        inputSchema: {
          type: "object",
          properties: {
            enabled: {
              type: "boolean",
              description: "Enable/disable content safety checks",
            },
            checkMethod: {
              type: "string",
              enum: ["llm", "keyword"],
              description: "Method to use for content checking",
            },
            confidenceThreshold: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description: "Confidence threshold for violation detection",
            },
            strictMode: {
              type: "boolean",
              description: "Enable strict mode for content checking",
            },
          },
        },
      },
      {
        name: "generate_character",
        description: "Dynamically generate character personality using LLM",
        inputSchema: {
          type: "object",
          properties: {
            characterName: {
              type: "string",
              description: "Name of the character to generate",
            },
            description: {
              type: "string",
              description: "Optional description of the character",
            },
            context: {
              type: "string",
              description: "Optional context for character generation",
            },
            intensity: {
              type: "number",
              minimum: 0,
              maximum: 5,
              description: "Optional intensity level (0-5)",
            },
            examples: {
              type: "array",
              items: { type: "string" },
              description: "Optional example phrases or dialogues",
            },
          },
          required: ["characterName"],
        },
      },
      {
        name: "clear_character_cache",
        description: "Clear the character generation cache",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_character_cache_stats",
        description: "Get character cache statistics",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "cosplay_text_simple",
        description:
          "Add cosplay character and personality to text and return only the processed text (no JSON output). Only processes content marked as LLM-generated.",
        inputSchema: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "The text to cosplay",
            },
            character: {
              type: "string",
              description:
                "Character name or personality type to apply. Built-in types: enthusiastic, sarcastic, professional. Custom characters can be added using add_character tool.",
            },
            intensity: {
              type: "number",
              minimum: 0,
              maximum: 5,
              description: "Intensity level (0-5, default: 3)",
            },
            context: {
              type: "string",
              description: "Optional context for better character analysis",
            },
            isLLMContent: {
              type: "boolean",
              description:
                "Mark if the text is LLM generated content (only LLM content will be cosplayed)",
            },
          },
          required: ["text"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "cosplay_text": {
        const parsed = CosplayRequestSchema.parse(args);
        const result = await cosplay.cosplayText({
          text: parsed.text,
          character: parsed.character,
          intensity: parsed.intensity,
          context: parsed.context,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "get_characters": {
        const characters = cosplay.getAvailableCharacters();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ characters }, null, 2),
            },
          ],
        };
      }

      case "get_all_characters": {
        const characters = cosplay.getAllCharacters();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ characters }, null, 2),
            },
          ],
        };
      }

      case "get_character_profile": {
        const name = args?.name;
        if (!name) {
          throw new Error("Character name is required");
        }

        const profile = cosplay.getCharacterProfile(name as string);
        if (!profile) {
          throw new Error(`Character "${name}" not found`);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ profile }, null, 2),
            },
          ],
        };
      }

      case "add_character": {
        if (!args) {
          throw new Error("Character parameters are required");
        }

        const parsed = CharacterProfileSchema.parse(args);
        cosplay.addCharacter(parsed);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: `Character "${parsed.name}" added successfully`,
                  character: parsed,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "search_characters": {
        const query = args?.query;
        if (!query) {
          throw new Error("Search query is required");
        }

        const characters = cosplay.searchCharacters(query as string);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  query,
                  characters,
                  total: characters.length,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "get_characters_by_category": {
        const category = args?.category;
        if (!category) {
          throw new Error("Category is required");
        }

        const characters = cosplay.getCharactersByCategory(category as string);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  category,
                  characters,
                  total: characters.length,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "remove_character": {
        const name = args?.name;
        if (!name) {
          throw new Error("Character name is required");
        }

        const success = cosplay.removeCharacter(name as string);
        if (!success) {
          throw new Error(`Character "${name}" not found`);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: `Character "${name}" removed successfully`,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "get_config": {
        const config = cosplay.getConfig();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(config, null, 2),
            },
          ],
        };
      }

      case "update_config": {
        if (!args) {
          throw new Error("Configuration parameters are required");
        }
        cosplay.updateConfig(args);
        const updatedConfig = cosplay.getConfig();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: "Configuration updated successfully",
                  config: updatedConfig,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "check_content_safety": {
        const text = args?.text;
        if (!text) {
          throw new Error("Text parameter is required");
        }

        const result = await cosplay.checkContentSafety(text as string);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  safetyCheck: result,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "get_content_safety_config": {
        const config = cosplay.getContentSafetyConfig();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  contentSafetyConfig: config,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "update_content_safety_config": {
        if (!args) {
          throw new Error("Configuration parameters are required");
        }

        cosplay.updateContentSafetyConfig(args);
        const updatedConfig = cosplay.getContentSafetyConfig();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: "Content safety configuration updated successfully",
                  config: updatedConfig,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "generate_character": {
        if (!args) {
          throw new Error("Character name is required");
        }

        const { characterName, description, context, intensity, examples } =
          args as {
            characterName?: string;
            description?: string;
            context?: string;
            intensity?: number;
            examples?: string[];
          };
        if (!characterName) {
          throw new Error("Character name is required");
        }

        const request: CharacterGenerationRequest = {
          characterName: characterName as string,
          description: description as string,
          context: context as string,
          intensity: intensity as number,
          examples: examples as string[],
        };

        const result = await cosplay.generateCharacter(request);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: "Character generated successfully",
                  result,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "clear_character_cache": {
        cosplay.clearCharacterCache();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: "Character cache cleared successfully",
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "get_character_cache_stats": {
        const stats = cosplay.getCharacterCacheStats();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  message: "Character cache statistics",
                  stats,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      case "cosplay_text_simple": {
        const parsed = CosplayRequestSchema.parse(args);
        const result = await cosplay.cosplayText({
          text: parsed.text,
          character: parsed.character,
          intensity: parsed.intensity,
          context: parsed.context,
        });

        return {
          content: [
            {
              type: "text",
              text: result.emotionizedText,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              error: error instanceof Error ? error.message : "Unknown error",
            },
            null,
            2,
          ),
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // MCP Cosplay server started
}

main().catch(() => {
  process.exit(1);
});
