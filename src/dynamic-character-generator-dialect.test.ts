import { describe, it, expect, beforeEach, vi } from "vitest";
import { DynamicCharacterGenerator, CharacterGenerationRequest } from "./dynamic-character-generator.js";
import { DialectConfig } from "./types.js";

describe("DynamicCharacterGenerator Dialect Integration", () => {
  let characterGenerator: DynamicCharacterGenerator;
  let mockServer: any;

  beforeEach(() => {
    mockServer = {
      request: vi.fn()
    };
    characterGenerator = new DynamicCharacterGenerator();
    characterGenerator.setServer(mockServer);
  });

  describe("Dialect Integration", () => {
    it("should include dialect in generated character when LLM succeeds", async () => {
      // Mock LLM responses for both personality and dialect
      mockServer.request
        .mockResolvedValueOnce({
          content: [{
            type: "text",
            text: JSON.stringify({
              signaturePhrases: ["我是天王", "天父保佑"],
              toneWords: ["嗯", "哦"],
              attitude: "superior",
              speechPatterns: ["庄重", "威严"],
              backgroundContext: "太平天国领袖",
              emojiPreferences: ["👑", "⚡"],
              languageStyle: "古典汉语"
            })
          }]
        })
        .mockResolvedValueOnce({
          content: [{
            type: "text",
            text: JSON.stringify({
              name: "广东客家话",
              region: "广东花县",
              characteristics: ["客家方言", "古汉语保留"],
              commonPhrases: ["天父", "天国", "清妖"],
              pronunciationNotes: ["客家声调"],
              slangWords: ["天父", "天国"],
              grammarPatterns: ["古典句式"],
              exampleSentences: ["天父下凡"]
            })
          }]
        });

      const request: CharacterGenerationRequest = {
        characterName: "洪秀全",
        description: "太平天国天王",
        context: "19世纪中国革命领袖"
      };

      const result = await characterGenerator.generateCharacter(request);

      expect(result.success).toBe(true);
      expect(result.character).toBeDefined();
      expect(result.character!.personality.dialect).toBeDefined();
      expect(result.character!.personality.dialect!.name).toBe("广东客家话");
      expect(result.character!.personality.dialect!.region).toBe("广东花县");
      expect(result.character!.personality.dialect!.commonPhrases).toContain("天父");
      expect(result.character!.personality.dialect!.slangWords).toContain("天国");
    });

    it("should include fallback dialect when server is not available", async () => {
      const generatorWithoutServer = new DynamicCharacterGenerator();

      const request: CharacterGenerationRequest = {
        characterName: "洪秀全",
        description: "太平天国天王"
      };

      const result = await generatorWithoutServer.generateCharacter(request);

      expect(result.success).toBe(true);
      expect(result.character).toBeDefined();
      expect(result.character!.personality.dialect).toBeDefined();
      expect(result.character!.personality.dialect!.name).toBe("广东客家话");
      expect(result.character!.personality.dialect!.region).toBe("广东花县");
      expect(result.character!.personality.dialect!.commonPhrases).toContain("天父");
    });

    it("should include fallback dialect for Sun Yat-sen", async () => {
      const generatorWithoutServer = new DynamicCharacterGenerator();

      const request: CharacterGenerationRequest = {
        characterName: "孙中山",
        description: "中华民国国父"
      };

      const result = await generatorWithoutServer.generateCharacter(request);

      expect(result.success).toBe(true);
      expect(result.character).toBeDefined();
      expect(result.character!.personality.dialect).toBeDefined();
      expect(result.character!.personality.dialect!.name).toBe("广东中山话");
      expect(result.character!.personality.dialect!.region).toBe("广东中山");
      expect(result.character!.personality.dialect!.commonPhrases).toContain("革命");
    });

    it("should use standard dialect for unknown characters", async () => {
      const generatorWithoutServer = new DynamicCharacterGenerator();

      const request: CharacterGenerationRequest = {
        characterName: "未知角色",
        description: "测试角色"
      };

      const result = await generatorWithoutServer.generateCharacter(request);

      expect(result.success).toBe(true);
      expect(result.character).toBeDefined();
      expect(result.character!.personality.dialect).toBeDefined();
      expect(result.character!.personality.dialect!.name).toBe("标准官话");
      expect(result.character!.personality.dialect!.region).toBe("全国");
    });

    it("should handle dialect generation failure gracefully", async () => {
      // Mock personality generation success but dialect generation failure
      mockServer.request
        .mockResolvedValueOnce({
          content: [{
            type: "text",
            text: JSON.stringify({
              signaturePhrases: ["测试短语"],
              toneWords: ["嗯"],
              attitude: "neutral",
              speechPatterns: ["直接"],
              backgroundContext: "测试背景",
              emojiPreferences: ["😊"],
              languageStyle: "标准"
            })
          }]
        })
        .mockRejectedValueOnce(new Error("Dialect generation failed"));

      const request: CharacterGenerationRequest = {
        characterName: "测试角色",
        description: "测试描述"
      };

      const result = await characterGenerator.generateCharacter(request);

      expect(result.success).toBe(true);
      expect(result.character).toBeDefined();
      // Should include fallback dialect when generation fails
      expect(result.character!.personality.dialect).toBeDefined();
      expect(result.character!.personality.dialect!.name).toBe("标准官话");
    });

    it("should handle personality generation failure but include fallback dialect", async () => {
      // Mock personality generation failure but dialect generation success
      mockServer.request
        .mockRejectedValueOnce(new Error("Personality generation failed"))
        .mockResolvedValueOnce({
          content: [{
            type: "text",
            text: JSON.stringify({
              name: "测试方言",
              region: "测试地区",
              characteristics: ["特点1"],
              commonPhrases: ["短语1"],
              pronunciationNotes: ["发音1"],
              slangWords: ["词汇1"],
              grammarPatterns: ["语法1"],
              exampleSentences: ["例句1"]
            })
          }]
        });

      const request: CharacterGenerationRequest = {
        characterName: "测试角色",
        description: "测试描述"
      };

      const result = await characterGenerator.generateCharacter(request);

      expect(result.success).toBe(true);
      expect(result.character).toBeDefined();
      expect(result.character!.personality.dialect).toBeDefined();
      expect(result.character!.personality.dialect!.name).toBe("测试方言");
    });

    it("should extract region from context correctly", async () => {
      const generatorWithoutServer = new DynamicCharacterGenerator();

      const request: CharacterGenerationRequest = {
        characterName: "地方角色",
        description: "来自四川的角色",
        context: "四川地区的代表人物"
      };

      const result = await generatorWithoutServer.generateCharacter(request);

      expect(result.success).toBe(true);
      expect(result.character).toBeDefined();
      // Should still use fallback dialect since region extraction doesn't affect fallback
      expect(result.character!.personality.dialect).toBeDefined();
    });

    it("should handle empty context for region extraction", async () => {
      const generatorWithoutServer = new DynamicCharacterGenerator();

      const request: CharacterGenerationRequest = {
        characterName: "测试角色",
        description: "测试描述"
        // No context provided
      };

      const result = await generatorWithoutServer.generateCharacter(request);

      expect(result.success).toBe(true);
      expect(result.character).toBeDefined();
      expect(result.character!.personality.dialect).toBeDefined();
    });

    it("should parallelize personality and dialect generation", async () => {
      let totalCallCount = 0;

      mockServer.request.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            totalCallCount++;
            resolve({
              content: [{
                type: "text",
                text: JSON.stringify({
                  signaturePhrases: ["测试短语"],
                  toneWords: ["嗯"],
                  attitude: "neutral",
                  speechPatterns: ["直接"],
                  backgroundContext: "测试背景",
                  emojiPreferences: ["😊"],
                  languageStyle: "标准"
                })
              }]
            });
          }, 10);
        });
      });

      const request: CharacterGenerationRequest = {
        characterName: "测试角色",
        description: "测试描述"
      };

      const startTime = Date.now();
      await characterGenerator.generateCharacter(request);
      const endTime = Date.now();

      // Should complete in roughly 10ms (parallel execution), not 20ms (sequential)
      expect(endTime - startTime).toBeLessThan(20);
      // Should have 2 calls total (personality + dialect)
      expect(totalCallCount).toBe(2);
    });

    it("should handle special character names in dialect generation", async () => {
      const generatorWithoutServer = new DynamicCharacterGenerator();

      const request: CharacterGenerationRequest = {
        characterName: " rôle-with-spécial-chars_123",
        description: "特殊字符角色"
      };

      const result = await generatorWithoutServer.generateCharacter(request);

      expect(result.success).toBe(true);
      expect(result.character).toBeDefined();
      expect(result.character!.personality.dialect).toBeDefined();
      expect(result.character!.personality.dialect!.name).toBe("标准官话");
    });

    it("should preserve dialect information in character profile", async () => {
      const mockDialect: DialectConfig = {
        name: "四川话",
        region: "四川",
        characteristics: ["麻辣", "豪爽"],
        commonPhrases: ["巴适", "要得"],
        pronunciationNotes: ["卷舌"],
        slangWords: ["瓜娃子"],
        grammarPatterns: ["语气词"],
        exampleSentences: ["今天天气巴适"]
      };

      mockServer.request
        .mockResolvedValueOnce({
          content: [{
            type: "text",
            text: JSON.stringify({
              signaturePhrases: ["测试短语"],
              toneWords: ["嗯"],
              attitude: "neutral",
              speechPatterns: ["直接"],
              backgroundContext: "测试背景",
              emojiPreferences: ["😊"],
              languageStyle: "标准"
            })
          }]
        })
        .mockResolvedValueOnce({
          content: [{
            type: "text",
            text: JSON.stringify(mockDialect)
          }]
        });

      const request: CharacterGenerationRequest = {
        characterName: "四川角色",
        description: "四川代表"
      };

      const result = await characterGenerator.generateCharacter(request);

      expect(result.success).toBe(true);
      expect(result.character).toBeDefined();
      expect(result.character!.personality.dialect).toEqual(mockDialect);
    });

    it("should handle minimal dialect configuration", async () => {
      const minimalDialect: DialectConfig = {
        name: "最小方言",
        region: "最小地区",
        characteristics: [],
        commonPhrases: [],
        pronunciationNotes: [],
        slangWords: [],
        grammarPatterns: [],
        exampleSentences: []
      };

      mockServer.request
        .mockResolvedValueOnce({
          content: [{
            type: "text",
            text: JSON.stringify({
              signaturePhrases: ["测试短语"],
              toneWords: ["嗯"],
              attitude: "neutral",
              speechPatterns: ["直接"],
              backgroundContext: "测试背景",
              emojiPreferences: ["😊"],
              languageStyle: "标准"
            })
          }]
        })
        .mockResolvedValueOnce({
          content: [{
            type: "text",
            text: JSON.stringify(minimalDialect)
          }]
        });

      const request: CharacterGenerationRequest = {
        characterName: "最小角色",
        description: "最小描述"
      };

      const result = await characterGenerator.generateCharacter(request);

      expect(result.success).toBe(true);
      expect(result.character).toBeDefined();
      expect(result.character!.personality.dialect).toEqual(minimalDialect);
    });
  });

  describe("setServer", () => {
    it("should set server for both generator and dialect service", () => {
      const testServer = { id: "test-server" };

      expect(() => {
        characterGenerator.setServer(testServer);
      }).not.toThrow();
    });

    it("should update server reference correctly", () => {
      const server1 = { id: "server1" };
      const server2 = { id: "server2" };

      characterGenerator.setServer(server1);
      characterGenerator.setServer(server2);

      expect(() => characterGenerator.setServer(server2)).not.toThrow();
    });
  });
});