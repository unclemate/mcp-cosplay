import { describe, it, expect, beforeEach, vi } from "vitest";
import { DialectService, DialectQueryRequest } from "./dialect-service.js";

describe("DialectService", () => {
  let dialectService: DialectService;

  beforeEach(() => {
    dialectService = new DialectService();
  });

  describe("queryDialect", () => {
    it("should return fallback dialect for Hong Xiuquan without server", async () => {
      const request: DialectQueryRequest = {
        characterName: "洪秀全",
        characterDescription: "太平天国天王",
        characterBackground: "19世纪中国革命领袖",
      };

      const result = await dialectService.queryDialect(request);

      expect(result.success).toBe(true);
      expect(result.dialect).toBeDefined();
      expect(result.dialect.name).toBe("广东客家话");
      expect(result.dialect.region).toBe("广东花县");
      expect(result.dialect.commonPhrases).toContain("天父");
      expect(result.dialect.commonPhrases).toContain("天国");
      expect(result.dialect.slangWords).toContain("清妖");
      expect(result.dialect.grammarPatterns).toContain("宗教用语");
    });

    it("should return fallback dialect for Sun Yat-sen without server", async () => {
      const request: DialectQueryRequest = {
        characterName: "孙中山",
        characterDescription: "中华民国国父",
        characterBackground: "近代中国革命家",
      };

      const result = await dialectService.queryDialect(request);

      expect(result.success).toBe(true);
      expect(result.dialect).toBeDefined();
      expect(result.dialect.name).toBe("广东中山话");
      expect(result.dialect.region).toBe("广东中山");
      expect(result.dialect.commonPhrases).toContain("革命");
      expect(result.dialect.commonPhrases).toContain("共和");
      expect(result.dialect.slangWords).toContain("革命");
      expect(result.dialect.exampleSentences).toContain(
        "革命尚未成功，同志仍需努力",
      );
    });

    it("should return standard dialect for unknown characters", async () => {
      const request: DialectQueryRequest = {
        characterName: "未知角色",
        characterDescription: "测试角色",
      };

      const result = await dialectService.queryDialect(request);

      expect(result.success).toBe(true);
      expect(result.dialect).toBeDefined();
      expect(result.dialect.name).toBe("标准官话");
      expect(result.dialect.region).toBe("全国");
      expect(result.dialect.characteristics).toContain("标准汉语");
    });

    it("should handle minimal request", async () => {
      const request: DialectQueryRequest = {
        characterName: "测试角色",
      };

      const result = await dialectService.queryDialect(request);

      expect(result.success).toBe(true);
      expect(result.dialect).toBeDefined();
      expect(result.dialect.name).toBe("标准官话");
    });

    it("should handle request with region information", async () => {
      const request: DialectQueryRequest = {
        characterName: "测试角色",
        region: "四川",
      };

      const result = await dialectService.queryDialect(request);

      expect(result.success).toBe(true);
      expect(result.dialect).toBeDefined();
      // Region doesn't affect fallback in current implementation
      expect(result.dialect.name).toBe("标准官话");
    });

    it("should handle request with historical period", async () => {
      const request: DialectQueryRequest = {
        characterName: "古代角色",
        characterDescription: "古代人物",
        historicalPeriod: "唐朝",
      };

      const result = await dialectService.queryDialect(request);

      expect(result.success).toBe(true);
      expect(result.dialect).toBeDefined();
    });

    it("should handle special characters in character name", async () => {
      const request: DialectQueryRequest = {
        characterName: " rôle-with-spécial-chars_123",
        characterDescription: "特殊字符角色",
      };

      const result = await dialectService.queryDialect(request);

      expect(result.success).toBe(true);
      expect(result.dialect).toBeDefined();
      expect(result.dialect.name).toBe("标准官话");
    });

    it("should handle very long character descriptions", async () => {
      const longDescription = "这是一个非常长的角色描述".repeat(100);
      const request: DialectQueryRequest = {
        characterName: "长描述角色",
        characterDescription: longDescription,
      };

      const result = await dialectService.queryDialect(request);

      expect(result.success).toBe(true);
      expect(result.dialect).toBeDefined();
    });
  });

  describe("LLM Integration", () => {
    it("should call LLM when server is available", async () => {
      const mockServer = {
        request: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                name: "测试方言",
                region: "测试地区",
                characteristics: ["特点1", "特点2"],
                commonPhrases: ["短语1", "短语2"],
                pronunciationNotes: ["发音1"],
                slangWords: ["词汇1"],
                grammarPatterns: ["语法1"],
                exampleSentences: ["例句1"],
              }),
            },
          ],
        }),
      };

      dialectService.setServer(mockServer);

      const request: DialectQueryRequest = {
        characterName: "测试角色",
        characterDescription: "测试描述",
      };

      const result = await dialectService.queryDialect(request);

      expect(result.success).toBe(true);
      expect(result.dialect).toBeDefined();
      expect(result.dialect.name).toBe("测试方言");
      expect(mockServer.request).toHaveBeenCalledTimes(1);
    });

    it("should handle LLM errors gracefully", async () => {
      const mockServer = {
        request: vi.fn().mockRejectedValue(new Error("LLM Error")),
      };

      dialectService.setServer(mockServer);

      const request: DialectQueryRequest = {
        characterName: "测试角色",
      };

      const result = await dialectService.queryDialect(request);

      // Should return fallback dialect instead of error
      expect(result.success).toBe(true);
      expect(result.dialect).toBeDefined();
      expect(result.dialect.name).toBe("标准官话");
      expect(mockServer.request).toHaveBeenCalledTimes(1);
    });

    it("should handle invalid LLM response", async () => {
      const mockServer = {
        request: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: "Invalid JSON response",
            },
          ],
        }),
      };

      dialectService.setServer(mockServer);

      const request: DialectQueryRequest = {
        characterName: "测试角色",
      };

      const result = await dialectService.queryDialect(request);

      // Should return fallback dialect instead of error
      expect(result.success).toBe(true);
      expect(result.dialect).toBeDefined();
      expect(result.dialect.name).toBe("标准官话");
    });

    it("should handle LLM response with missing required fields", async () => {
      const mockServer = {
        request: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                characteristics: ["特点1"],
                commonPhrases: ["短语1"],
                // Missing required fields: name and region
              }),
            },
          ],
        }),
      };

      dialectService.setServer(mockServer);

      const request: DialectQueryRequest = {
        characterName: "测试角色",
      };

      const result = await dialectService.queryDialect(request);

      // Should return fallback dialect instead of error
      expect(result.success).toBe(true);
      expect(result.dialect).toBeDefined();
      expect(result.dialect.name).toBe("标准官话");
    });
  });

  describe("Prompt Building", () => {
    it("should build correct prompt with all fields", async () => {
      const mockServer = {
        request: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                name: "测试方言",
                region: "测试地区",
                characteristics: [],
                commonPhrases: [],
                pronunciationNotes: [],
                slangWords: [],
                grammarPatterns: [],
                exampleSentences: [],
              }),
            },
          ],
        }),
      };

      dialectService.setServer(mockServer);

      const request: DialectQueryRequest = {
        characterName: "测试角色",
        characterDescription: "角色描述",
        characterBackground: "角色背景",
        historicalPeriod: "明朝",
        region: "江南",
      };

      await dialectService.queryDialect(request);

      expect(mockServer.request).toHaveBeenCalledTimes(1);
      const callArgs = mockServer.request.mock.calls[0];
      const prompt = callArgs[0].params.messages[0].content.text;

      expect(prompt).toContain("测试角色");
      expect(prompt).toContain("角色描述");
      expect(prompt).toContain("角色背景");
      expect(prompt).toContain("明朝");
      expect(prompt).toContain("江南");
    });

    it("should build prompt with minimal fields", async () => {
      const mockServer = {
        request: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                name: "测试方言",
                region: "测试地区",
                characteristics: [],
                commonPhrases: [],
                pronunciationNotes: [],
                slangWords: [],
                grammarPatterns: [],
                exampleSentences: [],
              }),
            },
          ],
        }),
      };

      dialectService.setServer(mockServer);

      const request: DialectQueryRequest = {
        characterName: "测试角色",
      };

      await dialectService.queryDialect(request);

      expect(mockServer.request).toHaveBeenCalledTimes(1);
      const callArgs = mockServer.request.mock.calls[0];
      const prompt = callArgs[0].params.messages[0].content.text;

      expect(prompt).toContain("测试角色");
      expect(prompt).not.toContain("角色描述");
      expect(prompt).not.toContain("角色背景");
    });
  });

  describe("Response Parsing", () => {
    it("should parse valid JSON response correctly", async () => {
      const validResponse = {
        name: "四川话",
        region: "四川",
        characteristics: ["麻辣", "豪爽"],
        commonPhrases: ["巴适", "要得"],
        pronunciationNotes: ["卷舌"],
        slangWords: ["瓜娃子"],
        grammarPatterns: ["语气词"],
        exampleSentences: ["今天天气巴适"],
      };

      const mockServer = {
        request: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: JSON.stringify(validResponse),
            },
          ],
        }),
      };

      dialectService.setServer(mockServer);

      const request: DialectQueryRequest = {
        characterName: "测试角色",
      };

      const result = await dialectService.queryDialect(request);

      expect(result.success).toBe(true);
      expect(result.dialect).toEqual(validResponse);
    });

    it("should handle response with extra fields", async () => {
      const responseWithExtras = {
        name: "测试方言",
        region: "测试地区",
        characteristics: ["特点1"],
        commonPhrases: ["短语1"],
        pronunciationNotes: ["发音1"],
        slangWords: ["词汇1"],
        grammarPatterns: ["语法1"],
        exampleSentences: ["例句1"],
        extraField: "should be ignored",
        anotherExtra: { nested: "object" },
      };

      const mockServer = {
        request: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: JSON.stringify(responseWithExtras),
            },
          ],
        }),
      };

      dialectService.setServer(mockServer);

      const request: DialectQueryRequest = {
        characterName: "测试角色",
      };

      const result = await dialectService.queryDialect(request);

      expect(result.success).toBe(true);
      expect(result.dialect).toBeDefined();
      expect(result.dialect.name).toBe("测试方言");
      expect(result.dialect.region).toBe("测试地区");
      // Extra fields should be ignored
      expect("extraField" in result.dialect).toBe(false);
    });

    it("should handle response with missing optional fields", async () => {
      const minimalResponse = {
        name: "最小方言",
        region: "最小地区",
        characteristics: [],
        commonPhrases: [],
        pronunciationNotes: [],
        slangWords: [],
        grammarPatterns: [],
        exampleSentences: [],
      };

      const mockServer = {
        request: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: JSON.stringify(minimalResponse),
            },
          ],
        }),
      };

      dialectService.setServer(mockServer);

      const request: DialectQueryRequest = {
        characterName: "测试角色",
      };

      const result = await dialectService.queryDialect(request);

      expect(result.success).toBe(true);
      expect(result.dialect).toEqual(minimalResponse);
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors", async () => {
      const mockServer = {
        request: vi.fn().mockRejectedValue(new Error("Network Error")),
      };

      dialectService.setServer(mockServer);

      const request: DialectQueryRequest = {
        characterName: "测试角色",
      };

      const result = await dialectService.queryDialect(request);

      // Should return fallback dialect instead of error
      expect(result.success).toBe(true);
      expect(result.dialect).toBeDefined();
      expect(result.dialect.name).toBe("标准官话");
    });

    it("should handle timeout errors", async () => {
      const mockServer = {
        request: vi.fn().mockRejectedValue(new Error("Request timeout")),
      };

      dialectService.setServer(mockServer);

      const request: DialectQueryRequest = {
        characterName: "测试角色",
      };

      const result = await dialectService.queryDialect(request);

      // Should return fallback dialect instead of error
      expect(result.success).toBe(true);
      expect(result.dialect).toBeDefined();
      expect(result.dialect.name).toBe("标准官话");
    });

    it("should handle malformed JSON response", async () => {
      const mockServer = {
        request: vi.fn().mockResolvedValue({
          content: [
            {
              type: "text",
              text: "This is not valid JSON {",
            },
          ],
        }),
      };

      dialectService.setServer(mockServer);

      const request: DialectQueryRequest = {
        characterName: "测试角色",
      };

      const result = await dialectService.queryDialect(request);

      // Should return fallback dialect instead of error
      expect(result.success).toBe(true);
      expect(result.dialect).toBeDefined();
      expect(result.dialect.name).toBe("标准官话");
    });
  });

  describe("setServer", () => {
    it("should set server without errors", () => {
      const mockServer = {};
      expect(() => {
        dialectService.setServer(mockServer);
      }).not.toThrow();
    });

    it("should update server reference", () => {
      const mockServer1 = { id: 1 };
      const mockServer2 = { id: 2 };

      dialectService.setServer(mockServer1);
      dialectService.setServer(mockServer2);

      // The second call should overwrite the first
      expect(() => dialectService.setServer(mockServer2)).not.toThrow();
    });

    it("should handle null server", () => {
      expect(() => {
        dialectService.setServer(null);
      }).not.toThrow();
    });

    it("should handle undefined server", () => {
      expect(() => {
        dialectService.setServer(undefined);
      }).not.toThrow();
    });
  });
});
