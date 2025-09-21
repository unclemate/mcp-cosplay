import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Cosplay } from "./cosplay.js";
import { CosplayRequest } from "./types.js";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";

describe("Cosplay Dialect Integration", () => {
  let cosplay: Cosplay;
  let testConfigPath: string;
  let mockServer: any;

  beforeEach(() => {
    testConfigPath = join(process.cwd(), "test-cosplay-dialect-config.json");

    // Clean up any existing test config file
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }

    cosplay = new Cosplay(testConfigPath);

    // Setup mock server
    mockServer = {
      request: vi.fn().mockImplementation((request: any) => {
        // Check if this is a dialect request based on the prompt content
        const isDialectRequest = request.params.messages[0].content.text.includes('方言和语言文化专家');

        if (isDialectRequest) {
          // Extract character name from the prompt
          const prompt = request.params.messages[0].content.text;
          let dialectName = "标准官话";
          let dialectRegion = "全国";
          let characteristics = ["标准汉语"];
          let commonPhrases = ["是", "不是"];
          let pronunciationNotes = ["标准发音"];
          let slangWords: string[] = [];
          let grammarPatterns = ["现代汉语语法"];
          let exampleSentences = ["这是一个标准表达的例句"];

          if (prompt.includes("洪秀全")) {
            dialectName = "广东客家话";
            dialectRegion = "广东花县";
            characteristics = ["客家方言特点", "古汉语保留", "语气庄重"];
            commonPhrases = ["天父", "天国", "清妖", "万岁", "天王"];
            pronunciationNotes = ["客家声调特点", "古音保留"];
            slangWords = ["天父", "天国", "清妖"] as string[];
            grammarPatterns = ["使用古典句式", "宗教用语"];
            exampleSentences = ["天父下凡，我乃真命天子", "清妖必灭，天国必兴"];
          } else if (prompt.includes("孙中山")) {
            dialectName = "广东中山话";
            dialectRegion = "广东中山";
            characteristics = ["粤语特点", "近代汉语", "革命用语"];
            commonPhrases = ["革命", "共和", "民国", "同志", "自由"];
            pronunciationNotes = ["粤语声调", "近代发音"];
            slangWords = ["革命", "共和"] as string[];
            grammarPatterns = ["现代汉语", "政治术语"];
            exampleSentences = ["革命尚未成功，同志仍需努力"];
          }

          return Promise.resolve({
            content: [{
              type: "text",
              text: JSON.stringify({
                name: dialectName,
                region: dialectRegion,
                characteristics,
                commonPhrases,
                pronunciationNotes,
                slangWords,
                grammarPatterns,
                exampleSentences
              })
            }]
          });
        } else {
          // Personality request - extract character name
          const prompt = request.params.messages[0].content.text;
          let attitude = "friendly";
          let background = "测试角色";
          let signaturePhrases = ["测试短语"];
          let languageStyle = "标准";

          if (prompt.includes("洪秀全")) {
            attitude = "superior";
            background = "太平天国领袖";
            signaturePhrases = ["我是天王", "天父保佑", "清妖必灭"];
            languageStyle = "古典汉语";
          }

          return Promise.resolve({
            content: [{
              type: "text",
              text: JSON.stringify({
                signaturePhrases: signaturePhrases,
                toneWords: ["嗯", "哦", "啊", "呢"],
                attitude: attitude,
                speechPatterns: ["庄重", "威严", "直接"],
                backgroundContext: background,
                emojiPreferences: ["👑", "⚡", "🔥"],
                languageStyle: languageStyle
              })
            }]
          });
        }
      })
    };

    cosplay.setServer(mockServer);

    // Disable content safety for testing
    cosplay.updateContentSafetyConfig({
      enabled: false
    });
  });

  afterEach(() => {
    // Clean up test config file after each test
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }
  });

  describe("Dialect Query Functionality", () => {
    it("should query dialect for Hong Xiuquan successfully", async () => {
      const result = await cosplay.queryCharacterDialect(
        "洪秀全",
        "太平天国天王",
        "19世纪中国革命领袖"
      );

      expect(result.success).toBe(true);
      expect(result.dialect).toBeDefined();
      expect(result.dialect!.name).toBe("广东客家话");
      expect(result.dialect!.region).toBe("广东花县");
      expect(result.dialect!.commonPhrases).toContain("天父");
      expect(result.dialect!.slangWords).toContain("清妖");
    });

    it("should query dialect with minimal parameters", async () => {
      const result = await cosplay.queryCharacterDialect("测试角色");

      expect(result.success).toBe(true);
      expect(result.dialect).toBeDefined();
      expect(result.dialect!.name).toBe("标准官话");
    });

    it("should handle dialect query errors gracefully", async () => {
      mockServer.request.mockRejectedValue(new Error("Server error"));

      const result = await cosplay.queryCharacterDialect("测试角色", "测试描述");

      // Should fallback to local dialect mapping
      expect(result.success).toBe(true);
      expect(result.dialect).toBeDefined();
    });
  });

  describe("Character Generation with Dialect", () => {
    it("should include dialect information in generated character", async () => {
      // Mock LLM response for character generation with dialect
      mockServer.request.mockResolvedValue({
        content: [{
          type: "text",
          text: JSON.stringify({
            signaturePhrases: ["我是天王", "天父保佑"],
            toneWords: ["嗯", "哦"],
            attitude: "superior",
            speechPatterns: ["庄重", "威严"],
            backgroundContext: "太平天国领袖",
            emojiPreferences: ["👑", "⚡"],
            languageStyle: "古典汉语",
            dialect: {
              name: "广东客家话",
              region: "广东花县",
              characteristics: ["客家方言", "古汉语保留"],
              commonPhrases: ["天父", "天国", "清妖"],
              pronunciationNotes: ["客家声调"],
              slangWords: ["天父", "天国"],
              grammarPatterns: ["古典句式"],
              exampleSentences: ["天父下凡"]
            }
          })
        }]
      });

      const result = await cosplay.generateCharacter({
        characterName: "洪秀全",
        description: "太平天国天王",
        context: "19世纪中国革命领袖"
      });

      expect(result.success).toBe(true);
      expect(result.character).toBeDefined();
      expect(result.character!.personality.dialect).toBeDefined();
      expect(result.character!.personality.dialect!.name).toBe("广东客家话");
      expect(result.character!.personality.dialect!.commonPhrases).toContain("天父");
    });

    it("should use fallback dialect when LLM fails", async () => {
      mockServer.request.mockRejectedValue(new Error("LLM Error"));

      const result = await cosplay.generateCharacter({
        characterName: "洪秀全",
        description: "太平天国天王"
      });

      expect(result.success).toBe(true);
      expect(result.character).toBeDefined();
      expect(result.character!.personality.dialect).toBeDefined();
      expect(result.character!.personality.dialect!.name).toBe("广东客家话");
    });
  });

  describe("buildCharacterPrompt with Dialect", () => {
    it("should include dialect information in character prompt", async () => {
      // First, create a character with dialect
      const characterWithDialect = {
        name: "洪秀全",
        description: "太平天国天王",
        personality: {
          signaturePhrases: ["我是天王"],
          toneWords: ["嗯"],
          attitude: "superior",
          speechPatterns: ["庄重"],
          backgroundContext: "太平天国领袖",
          emojiPreferences: ["👑"],
          languageStyle: "古典汉语",
          dialect: {
            name: "广东客家话",
            region: "广东花县",
            characteristics: ["客家方言", "古汉语保留"],
            commonPhrases: ["天父", "天国", "清妖"],
            pronunciationNotes: ["客家声调"],
            slangWords: ["天父", "天国"],
            grammarPatterns: ["古典句式"],
            exampleSentences: ["天父下凡"]
          }
        }
      };

      // Mock the character generation to return our test character
      mockServer.request.mockResolvedValue({
        content: [{
          type: "text",
          text: JSON.stringify(characterWithDialect.personality)
        }]
      });

      // Add character to personality manager
      await cosplay.generateCharacter({
        characterName: "洪秀全",
        description: "太平天国天王"
      });

      // Now test the prompt building
      const request: CosplayRequest = {
        text: "天王牛逼",
        character: "洪秀全",
        intensity: 5
      };

      // Mock the LLM call for cosplay text generation
      mockServer.request.mockResolvedValue({
        content: [{
          type: "text",
          text: "天王牛逼 🎉"
        }]
      });

      const result = await cosplay.cosplayText(request);

      // Check that the prompt includes dialect information
      expect(mockServer.request).toHaveBeenCalled();
      const calls = mockServer.request.mock.calls;
      const cosplayCall = calls.find((call: any) =>
        call[0].params.messages[0].content.text.includes("天王牛逼")
      );

      expect(cosplayCall).toBeDefined();
      const prompt = cosplayCall[0].params.messages[0].content.text;
      expect(prompt).toContain("方言信息");
      expect(prompt).toContain("广东客家话");
      expect(prompt).toContain("方言特点");
      expect(prompt).toContain("方言常用短语");
    });

    it("should handle character without dialect information", async () => {
      // For this test, we'll use a built-in character which doesn't have dialect
      const request: CosplayRequest = {
        text: "你好世界",
        character: "enthusiastic", // Built-in character without dialect
        intensity: 3
      };

      mockServer.request.mockResolvedValue({
        content: [{
          type: "text",
          text: "你好世界 😊"
        }]
      });

      const result = await cosplay.cosplayText(request);

      expect(mockServer.request).toHaveBeenCalled();
      const calls = mockServer.request.mock.calls;
      const cosplayCall = calls.find((call: any) =>
        call[0].params.messages[0].content.text.includes("你好世界")
      );

      expect(cosplayCall).toBeDefined();
      const prompt = cosplayCall[0].params.messages[0].content.text;

      // Should not include dialect information for built-in characters
      expect(prompt).not.toContain("方言信息");
      expect(prompt).not.toContain("方言特点");
      expect(prompt).not.toContain("方言常用短语");
    });

    it("should include empty slang words section when no slang words", async () => {
      const characterWithEmptySlang = {
        name: "测试角色",
        description: "测试角色",
        personality: {
          signaturePhrases: ["测试"],
          toneWords: ["嗯"],
          attitude: "neutral",
          speechPatterns: ["测试"],
          backgroundContext: "测试背景",
          emojiPreferences: ["😊"],
          languageStyle: "标准",
          dialect: {
            name: "测试方言",
            region: "测试地区",
            characteristics: ["特点1"],
            commonPhrases: ["短语1"],
            pronunciationNotes: ["发音1"],
            slangWords: [], // Empty slang words
            grammarPatterns: ["语法1"],
            exampleSentences: ["例句1"]
          }
        }
      };

      mockServer.request.mockResolvedValue({
        content: [{
          type: "text",
          text: JSON.stringify(characterWithEmptySlang.personality)
        }]
      });

      await cosplay.generateCharacter({
        characterName: "测试角色",
        description: "测试角色"
      });

      const request: CosplayRequest = {
        text: "测试文本",
        character: "测试角色",
        intensity: 3
      };

      mockServer.request.mockResolvedValue({
        content: [{
          type: "text",
          text: "测试文本 😊"
        }]
      });

      const result = await cosplay.cosplayText(request);

      expect(mockServer.request).toHaveBeenCalled();
      const calls = mockServer.request.mock.calls;
      const cosplayCall = calls.find((call: any) =>
        call[0].params.messages[0].content.text.includes("测试文本")
      );

      expect(cosplayCall).toBeDefined();
      const prompt = cosplayCall[0].params.messages[0].content.text;

      // Should include dialect information but not slang words section
      expect(prompt).toContain("方言信息");
      expect(prompt).toContain("方言常用短语");
      expect(prompt).not.toContain("方言词汇"); // Should not include empty slang words section
    });
  });

  describe("Error Handling", () => {
    it("should handle dialect service errors gracefully", async () => {
      // Mock a character generation that includes dialect query failure
      mockServer.request
        .mockResolvedValueOnce({
          content: [{
            type: "text",
            text: JSON.stringify({
              signaturePhrases: ["测试"],
              toneWords: ["嗯"],
              attitude: "neutral",
              speechPatterns: ["测试"],
              backgroundContext: "测试背景",
              emojiPreferences: ["😊"],
              languageStyle: "标准"
            })
          }]
        })
        .mockRejectedValueOnce(new Error("Dialect service error"));

      const result = await cosplay.generateCharacter({
        characterName: "测试角色",
        description: "测试角色"
      });

      expect(result.success).toBe(true);
      expect(result.character).toBeDefined();
      // Dialect might be undefined when generation fails
      // This is acceptable as the system should degrade gracefully
    });

    it("should handle malformed dialect responses", async () => {
      mockServer.request
        .mockResolvedValueOnce({
          content: [{
            type: "text",
            text: JSON.stringify({
              signaturePhrases: ["测试"],
              toneWords: ["嗯"],
              attitude: "neutral",
              speechPatterns: ["测试"],
              backgroundContext: "测试背景",
              emojiPreferences: ["😊"],
              languageStyle: "标准"
            })
          }]
        })
        .mockResolvedValueOnce({
          content: [{
            type: "text",
            text: "Invalid JSON response for dialect"
          }]
        });

      const result = await cosplay.generateCharacter({
        characterName: "测试角色",
        description: "测试角色"
      });

      expect(result.success).toBe(true);
      expect(result.character).toBeDefined();
      // Should handle malformed dialect response gracefully
    });
  });

  describe("Integration with Built-in Characters", () => {
    it("should work with built-in characters without dialect", async () => {
      const request: CosplayRequest = {
        text: "Hello world",
        character: "enthusiastic",
        intensity: 4
      };

      mockServer.request.mockResolvedValue({
        content: [{
          type: "text",
          text: "Hello world! 🎉"
        }]
      });

      const result = await cosplay.cosplayText(request);

      expect(result.emotionizedText).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
      // Built-in characters should work normally without dialect
    });

    it("should handle mixed character types gracefully", async () => {
      // Test with a character that has dialect and one that doesn't
      const characterWithDialect = {
        name: "洪秀全",
        description: "太平天国天王",
        personality: {
          signaturePhrases: ["我是天王"],
          toneWords: ["嗯"],
          attitude: "superior",
          speechPatterns: ["庄重"],
          backgroundContext: "太平天国领袖",
          emojiPreferences: ["👑"],
          languageStyle: "古典汉语",
          dialect: {
            name: "广东客家话",
            region: "广东花县",
            characteristics: ["客家方言"],
            commonPhrases: ["天父"],
            pronunciationNotes: ["客家声调"],
            slangWords: ["天国"],
            grammarPatterns: ["古典句式"],
            exampleSentences: ["天父下凡"]
          }
        }
      };

      mockServer.request.mockResolvedValue({
        content: [{
          type: "text",
          text: JSON.stringify(characterWithDialect.personality)
        }]
      });

      await cosplay.generateCharacter({
        characterName: "洪秀全",
        description: "太平天国天王"
      });

      const request: CosplayRequest = {
        text: "天王牛逼",
        character: "洪秀全",
        intensity: 5
      };

      mockServer.request.mockResolvedValue({
        content: [{
          type: "text",
          text: "天王牛逼 🎉"
        }]
      });

      const result = await cosplay.cosplayText(request);

      expect(result.emotionizedText).toBeDefined();
      // Should work correctly with character that has dialect
    });
  });
});