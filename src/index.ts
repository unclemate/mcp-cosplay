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
  character: z.enum(["enthusiastic", "sarcastic", "professional"]).optional(),
  intensity: z.number().min(0).max(5).optional(),
  context: z.string().optional(),
});

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "cosplay_text",
        description: "Add cosplay character and personality to text",
        inputSchema: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description: "The text to cosplay",
            },
            character: {
              type: "string",
              enum: ["enthusiastic", "sarcastic", "professional"],
              description: "Character type to apply",
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
  console.error("MCP Cosplay server started");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
