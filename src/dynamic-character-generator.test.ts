import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  DynamicCharacterGenerator,
  CharacterGenerationRequest,
} from "./dynamic-character-generator.js";
import { EnhancedPersonalityConfig, DialectConfig } from "./types.js";

describe("DynamicCharacterGenerator", () => {
  let generator: DynamicCharacterGenerator;
  let mockServer: { request: (request: unknown) => Promise<unknown> };

  // Type for accessing private methods in tests
  type TestGenerator = {
    buildPrompt: (request: CharacterGenerationRequest) => string;
    extractRegionFromContext: (context?: string) => string | undefined;
    extractFromText: (text: string) => EnhancedPersonalityConfig;
    extractArrayFromLine: (line: string) => string[];
    extractValueFromLine: (line: string) => string;
    extractTextFromResponse: (response: unknown) => string;
    getFallbackPersonalityConfig: (
      request: CharacterGenerationRequest,
    ) => EnhancedPersonalityConfig;
    generateFallbackDialect: (characterName: string) => DialectConfig;
    inferCategory: (characterName: string) => string;
  };

  beforeEach(() => {
    generator = new DynamicCharacterGenerator();
    mockServer = {
      request: vi
        .fn()
        .mockImplementation(() => Promise.resolve("mock response")),
    };
  });

  describe("generateCharacter", () => {
    it("should generate fallback character when no server is provided", async () => {
      const request: CharacterGenerationRequest = {
        characterName: "测试角色",
        description: "一个测试角色",
      };

      const result = await generator.generateCharacter(request);

      expect(result.success).toBe(true);
      expect(result.character).toBeDefined();
      expect(result.character?.name).toBe("测试角色");
      expect(result.character?.description).toBe("一个测试角色");
      expect(result.character?.personality.signaturePhrases).toContain(
        "I am 测试角色",
      );
    });

    it("should handle server request failure gracefully", async () => {
      generator.setServer(mockServer);
      mockServer.request.mockRejectedValue(new Error("Server error"));

      const request: CharacterGenerationRequest = {
        characterName: "测试角色",
      };

      const result = await generator.generateCharacter(request);

      // Should return fallback character instead of error
      expect(result.success).toBe(true);
      expect(result.character).toBeDefined();
      expect(result.character?.name).toBe("测试角色");
    });

    it("should generate character with minimal request", async () => {
      const request: CharacterGenerationRequest = {
        characterName: "简单角色",
      };

      const result = await generator.generateCharacter(request);

      expect(result.success).toBe(true);
      expect(result.character?.name).toBe("简单角色");
      expect(result.character?.description).toBe("Character: 简单角色");
      expect(result.character?.category).toBe("custom");
    });

    it("should infer category from character name", async () => {
      const requests = [
        { name: "哆啦A梦", expected: "anime" },
        { name: "张老师", expected: "professional" },
        { name: "某明星", expected: "entertainment" },
        { name: "王老板", expected: "business" },
        { name: "未知角色", expected: "custom" },
      ];

      for (const { name, expected } of requests) {
        const result = await generator.generateCharacter({
          characterName: name,
        });
        expect(result.character?.category).toBe(expected);
      }
    });

    it("should handle different character types with appropriate emojis", async () => {
      const testCases = [
        { name: "李老师", expectedEmojis: ["📚", "🎓", "💼", "📊"] },
        { name: "哆啦A梦", expectedEmojis: ["🐱", "💫", "✨", "😊"] },
        { name: "王老板", expectedEmojis: ["💰", "🎭", "👀", "🙃"] },
      ];

      for (const { name, expectedEmojis } of testCases) {
        const result = await generator.generateCharacter({
          characterName: name,
        });
        expect(result.character?.personality.emojiPreferences).toEqual(
          expectedEmojis,
        );
      }
    });
  });

  describe("buildPrompt", () => {
    it("should build prompt with all fields", () => {
      const request: CharacterGenerationRequest = {
        characterName: "测试角色",
        description: "角色描述",
        context: "特殊上下文",
        examples: ["台词1", "台词2", "台词3"],
        intensity: 5,
      };

      // Access private method for testing
      const prompt = (generator as unknown as TestGenerator).buildPrompt(
        request,
      );

      expect(prompt).toContain("测试角色");
      expect(prompt).toContain("角色描述");
      expect(prompt).toContain("特殊上下文");
      expect(prompt).toContain("Classic Line Examples: 台词1, 台词2, 台词3");
    });

    it("should build prompt with minimal fields", () => {
      const request: CharacterGenerationRequest = {
        characterName: "简单角色",
      };

      const prompt = (generator as unknown as TestGenerator).buildPrompt(
        request,
      );

      expect(prompt).toContain("简单角色");
      expect(prompt).toContain("Character: 简单角色");
      expect(prompt).not.toContain("特殊上下文");
      expect(prompt).not.toContain("Classic Line Examples");
    });
  });

  describe("parseLLMResponse", () => {
    it("should parse valid JSON response", () => {
      const jsonResponse = `{
        "signaturePhrases": ["台词1", "台词2"],
        "toneWords": ["语气1", "语气2"],
        "attitude": "friendly",
        "speechPatterns": ["模式1", "模式2"],
        "backgroundContext": "背景描述",
        "emojiPreferences": ["😊", "👍"],
        "languageStyle": "自然风格"
      }`;

      const result = (generator as unknown as TestGenerator).parseLLMResponse(
        jsonResponse,
      );

      expect(result.signaturePhrases).toEqual(["台词1", "台词2"]);
      expect(result.toneWords).toEqual(["语气1", "语气2"]);
      expect(result.attitude).toBe("friendly");
      expect(result.speechPatterns).toEqual(["模式1", "模式2"]);
      expect(result.backgroundContext).toBe("背景描述");
      expect(result.emojiPreferences).toEqual(["😊", "👍"]);
      expect(result.languageStyle).toBe("自然风格");
    });

    it("should handle invalid JSON gracefully", () => {
      const invalidJson = "这不是有效的JSON";
      const result = (generator as unknown as TestGenerator).parseLLMResponse(
        invalidJson,
      );

      expect(result.signaturePhrases).toEqual([]);
      expect(result.toneWords).toEqual([]);
      expect(result.attitude).toBe("friendly");
      expect(result.speechPatterns).toEqual([]);
      expect(result.backgroundContext).toBe("");
      expect(result.emojiPreferences).toEqual([]);
      expect(result.languageStyle).toBe("casual");
    });

    it("should handle partial JSON response", () => {
      const partialJson = `{
        "signaturePhrases": ["台词1"],
        "toneWords": ["语气1"],
        "attitude": "professional"
      }`;

      const result = (generator as unknown as TestGenerator).parseLLMResponse(
        partialJson,
      );

      expect(result.signaturePhrases).toEqual(["台词1"]);
      expect(result.toneWords).toEqual(["语气1"]);
      expect(result.attitude).toBe("professional");
      expect(result.speechPatterns).toEqual([]);
      expect(result.backgroundContext).toBe("");
      expect(result.emojiPreferences).toEqual([]);
      expect(result.languageStyle).toBe("casual");
    });
  });

  describe("extractFromText", () => {
    it("should extract personality from text response", () => {
      const textResponse = `
        signaturePhrases: ["我是角色", "让我想想"]
        toneWords: ["嗯", "哦"]
        attitude: friendly
        speechPatterns: ["友好交流", "积极回应"]
        backgroundContext: 这是一个友好的角色
        emojiPreferences: ["😊", "👍"]
        languageStyle: 自然流畅
      `;

      const result = (generator as unknown as TestGenerator).extractFromText(
        textResponse,
      );

      expect(result.signaturePhrases).toEqual(["我是角色", "让我想想"]);
      expect(result.toneWords).toEqual(["嗯", "哦"]);
      expect(result.attitude).toBe("friendly");
      expect(result.speechPatterns).toEqual(["友好交流", "积极回应"]);
      expect(result.backgroundContext).toBe("这是一个友好的角色");
      expect(result.emojiPreferences).toEqual(["😊", "👍"]);
      expect(result.languageStyle).toBe("自然流畅");
    });

    it("should handle empty text response", () => {
      const result = (generator as unknown as TestGenerator).extractFromText(
        "",
      );

      expect(result.signaturePhrases).toEqual([]);
      expect(result.toneWords).toEqual([]);
      expect(result.attitude).toBe("friendly");
      expect(result.speechPatterns).toEqual([]);
      expect(result.backgroundContext).toBe("");
      expect(result.emojiPreferences).toEqual([]);
      expect(result.languageStyle).toBe("casual");
    });
  });

  describe("extractArrayFromLine", () => {
    it("should extract array from JSON format", () => {
      const line = 'signaturePhrases: ["台词1", "台词2", "台词3"]';
      const result = (
        generator as unknown as TestGenerator
      ).extractArrayFromLine(line);

      expect(result).toEqual(["台词1", "台词2", "台词3"]);
    });

    it("should return empty array for invalid format", () => {
      const line = "signaturePhrases: 这是一个无效的格式";
      const result = (
        generator as unknown as TestGenerator
      ).extractArrayFromLine(line);

      expect(result).toEqual([]);
    });

    it("should handle empty array", () => {
      const line = "signaturePhrases: []";
      const result = (
        generator as unknown as TestGenerator
      ).extractArrayFromLine(line);

      expect(result).toEqual([""]);
    });
  });

  describe("extractValueFromLine", () => {
    it("should extract value from key-value pair", () => {
      const line = "attitude: friendly";
      const result = (
        generator as unknown as TestGenerator
      ).extractValueFromLine(line);

      expect(result).toBe("friendly");
    });

    it("should extract value with equals sign", () => {
      const line = "attitude = friendly";
      const result = (
        generator as unknown as TestGenerator
      ).extractValueFromLine(line);

      expect(result).toBe("friendly");
    });

    it("should extract quoted value", () => {
      const line = 'attitude: "friendly"';
      const result = (
        generator as unknown as TestGenerator
      ).extractValueFromLine(line);

      expect(result).toBe("friendly");
    });

    it("should return empty string for invalid format", () => {
      const line = "invalid format";
      const result = (
        generator as unknown as TestGenerator
      ).extractValueFromLine(line);

      expect(result).toBe("");
    });
  });

  describe("extractTextFromResponse", () => {
    it("should extract text from content array", () => {
      const response = {
        content: [
          { type: "text", text: "提取的文本" },
          { type: "other", data: "其他数据" },
        ],
      };

      const result = (
        generator as unknown as TestGenerator
      ).extractTextFromResponse(response);
      expect(result).toBe("提取的文本");
    });

    it("should extract text from direct text property", () => {
      const response = {
        text: "直接的文本",
      };

      const result = (
        generator as unknown as TestGenerator
      ).extractTextFromResponse(response);
      expect(result).toBe("直接的文本");
    });

    it("should return empty string for invalid response", () => {
      const result = (
        generator as unknown as TestGenerator
      ).extractTextFromResponse(null);
      expect(result).toBe("");

      const result2 = (
        generator as unknown as TestGenerator
      ).extractTextFromResponse({});
      expect(result2).toBe("");
    });

    it("should return empty string when no text content found", () => {
      const response = {
        content: [{ type: "other", data: "其他数据" }],
      };

      const result = (
        generator as unknown as TestGenerator
      ).extractTextFromResponse(response);
      expect(result).toBe("");
    });
  });

  describe("setServer", () => {
    it("should set server instance", () => {
      generator.setServer(mockServer);
      expect((generator as unknown as TestGenerator).server).toBe(mockServer);
    });
  });
});
