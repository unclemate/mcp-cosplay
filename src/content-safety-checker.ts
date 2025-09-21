// MCP Emotionizer - Content Safety Protected Software
//
// This software includes essential content safety functionality that may not be
// removed, disabled, or bypassed per the additional terms in the LICENSE file.
// The content safety checking features are critical safety mechanisms.

import { ContentCheckResult, ContentSafetyConfig } from "./types.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CreateMessageResultSchema } from "@modelcontextprotocol/sdk/types.js";

// Node.js global types
declare const setTimeout: (callback: () => void, ms: number) => number;

export class ContentSafetyChecker {
  private config: ContentSafetyConfig;
  private server?: Server;

  constructor(config: ContentSafetyConfig, server?: Server) {
    this.config = config;
    this.server = server;
  }

  setServer(server: Server): void {
    this.server = server;
  }

  getServer(): Server | undefined {
    return this.server;
  }

  async checkContent(text: string): Promise<ContentCheckResult> {
    if (!this.config.enabled) {
      return {
        isViolation: false,
        confidence: 0,
        reason: "Content safety check disabled",
      };
    }

    return this.checkWithLLM(text);
  }

  private async checkWithLLM(text: string): Promise<ContentCheckResult> {
    try {
      const prompt = `Please check if the following text contains content that simulates or inappropriately mentions Chinese national leaders, fascist figures, or extreme ideological content. Please carefully analyze the semantics and intent of the text to determine if there are the following situations:
1. Direct simulation of Chinese national leaders' speech or behavior
2. Inappropriate mention or teasing of Chinese national leaders
3. Politically sensitive content that may cause misunderstanding
4. Simulation or portrayal of fascist figures (Hitler, Mussolini, Franco, etc.)
5. Promotion or glorification of fascist ideology, Nazism, or extreme political views
6. Content related to racial superiority, ethnic cleansing, or inhumane ideologies
7. Creation of fascist characters or roles for personality simulation

Text content: "${text}"

Please return the detection result in JSON format, including the following fields:
- isViolation: Whether it violates rules (true/false)
- confidence: Confidence level (0-1)
- reason: Specific reason explanation
- category: Violation category (such as "leader-related", "fascist-content", "extreme-ideology", "simulation-behavior", etc.)

Requirement: Judgment should be cautious to avoid misjudging normal historical discussions while preventing harmful content.`;

      const request = {
        method: "sampling/createMessage",
        params: {
          messages: [
            {
              role: "user" as const,
              content: {
                type: "text" as const,
                text: prompt,
              },
            },
          ],
          systemPrompt:
            "You are a content safety check assistant, specializing in detecting whether text contains inappropriate mentions or simulations of Chinese national leaders, fascist figures, or extreme ideological content. Please judge cautiously to avoid misjudgment while preventing harmful content.",
          maxTokens: 500,
          temperature: 0.1,
        },
      };

      // 使用MCP Sampling机制调用LLM进行内容安全检查
      if (!this.server) {
        throw new Error("Server not initialized for content safety checking");
      }
      const response = await Promise.race([
        this.server.request(request, CreateMessageResultSchema, {}),
        new Promise<never>((_, reject) =>
          setTimeout(() => {
            reject(new Error("LLM request timeout"));
          }, 10000),
        ),
      ] as const);

      // MCP response format may vary, handle different possible structures
      if (response && typeof response === "object") {
        const resultText = this.extractTextFromResponse(response);
        if (resultText) {
          try {
            const parsed = JSON.parse(resultText);
            return {
              isViolation: parsed.isViolation || false,
              confidence: parsed.confidence || 0,
              reason: parsed.reason,
              category: parsed.category,
            };
          } catch {
            // If JSON parsing fails, try to extract information from text
            return this.extractFromText(resultText);
          }
        }
      }

      throw new Error("Failed to parse LLM response for content safety check");
    } catch {
      throw new Error("Content safety check failed");
    }
  }

  private extractTextFromResponse(response: unknown): string | null {
    // Type guard for MCP response format

    // Safely check if response matches expected format
    if (this.isMCPResponse(response)) {
      // Handle content array
      if (
        response.content &&
        Array.isArray(response.content) &&
        response.content.length > 0
      ) {
        const firstContent = response.content[0];
        if (firstContent.type === "text" && firstContent.text) {
          return firstContent.text;
        }
      }

      // Fallback: try to find text content anywhere in the response
      if (response.text) {
        return response.text;
      }
    }

    // Another fallback: stringify the response and return
    try {
      return JSON.stringify(response);
    } catch {
      return null;
    }
  }

  // Type guard function
  private isMCPResponse(response: unknown): response is {
    content?:
      | Array<{ type: string; text?: string }>
      | { type: string; text?: string };
    text?: string;
  } {
    if (typeof response !== "object" || response === null) {
      return false;
    }

    const resp = response as Record<string, unknown>;

    // Check if it has the expected structure
    return (
      ("content" in resp && typeof resp.content === "object") ||
      ("text" in resp && typeof resp.text === "string")
    );
  }

  private extractFromText(text: string): ContentCheckResult {
    // Simple text parsing, try to extract information from non-JSON responses
    const hasViolation =
      text.includes("违规") ||
      text.includes("violation") ||
      text.includes("是");
    const confidenceMatch =
      text.match(/置信度[:：]\s*(\d+\.?\d*)/i) ||
      text.match(/confidence[:：]\s*(\d+\.?\d*)/i);
    const confidence = confidenceMatch
      ? parseFloat(confidenceMatch[1]) / 100
      : 0.5;

    return {
      isViolation: hasViolation && confidence > 0.5,
      confidence: Math.min(confidence, 1),
      reason: "LLM检测结果解析",
      category: "内容安全",
    };
  }

  updateConfig(newConfig: Partial<ContentSafetyConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): ContentSafetyConfig {
    return { ...this.config };
  }
}
