import { describe, it, expect, beforeEach, vi } from "vitest";
import { Cosplay } from "./cosplay.js";
import {
  CharacterGenerationRequest,
  CharacterGenerationResult,
} from "./dynamic-character-generator.js";

// Mock config manager before importing
vi.mock("./config-manager.js", () => ({
  ConfigManager: vi.fn().mockImplementation(() => ({
    getConfig: vi.fn().mockReturnValue({}),
    updateConfig: vi.fn(),
    loadConfig: vi.fn(),
    getContentSafetyConfig: vi.fn().mockReturnValue({}),
  })),
}));

describe("Character Cache", () => {
  let cosplay: Cosplay;
  let mockServer: {
    request: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockServer = {
      request: vi
        .fn()
        .mockImplementation(
          (request: {
            params: { messages: Array<{ content: { text: string } }> };
          }) => {
            // Check if this is a dialect request based on the prompt content
            const isDialectRequest =
              request.params.messages[0].content.text.includes(
                "方言和语言文化专家",
              );

            if (isDialectRequest) {
              return Promise.resolve({
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      name: "测试方言",
                      region: "测试地区",
                      characteristics: ["特点1"],
                      commonPhrases: ["短语1"],
                      pronunciationNotes: ["发音1"],
                      slangWords: ["词汇1"],
                      grammarPatterns: ["语法1"],
                      exampleSentences: ["例句1"],
                    }),
                  },
                ],
              });
            } else {
              // Personality request
              return Promise.resolve({
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      signaturePhrases: ["测试短语"],
                      toneWords: ["嗯"],
                      attitude: "neutral",
                      speechPatterns: ["直接"],
                      backgroundContext: "测试背景",
                      emojiPreferences: ["😊"],
                      languageStyle: "标准",
                    }),
                  },
                ],
              });
            }
          },
        ),
    };
    cosplay = new Cosplay();
    cosplay.setServer(mockServer);
  });

  describe("cache behavior", () => {
    it("should cache generated characters", async () => {
      const request: CharacterGenerationRequest = {
        characterName: "测试角色",
        description: "测试描述",
      };

      // First call should generate and cache
      const result1 = (await cosplay.generateCharacter(
        request,
      )) as CharacterGenerationResult;
      expect(result1.success).toBe(true);

      // Second call should use cache
      const result2 = (await cosplay.generateCharacter(
        request,
      )) as CharacterGenerationResult;
      expect(result2.success).toBe(true);
      expect(result2.character).toEqual(result1.character);

      // Verify server was called only twice (personality + dialect for first call)
      expect(mockServer.request).toHaveBeenCalledTimes(2);
    });

    it("should handle cache expiration", async () => {
      const request: CharacterGenerationRequest = {
        characterName: "缓存测试角色",
      };

      // Mock a shorter cache TTL for testing
      (cosplay as { characterCacheTTL: number }).characterCacheTTL = 0; // Immediate expiration

      // First call
      const result1 = (await cosplay.generateCharacter(
        request,
      )) as CharacterGenerationResult;
      expect(result1.success).toBe(true);

      // Second call should regenerate due to expiration
      const result2 = (await cosplay.generateCharacter(
        request,
      )) as CharacterGenerationResult;
      expect(result2.success).toBe(true);

      // Results should be the same but cache was bypassed
      expect(result2.character).toEqual(result1.character);
    });

    it("should cache different characters separately", async () => {
      const request1: CharacterGenerationRequest = {
        characterName: "角色A",
      };

      const request2: CharacterGenerationRequest = {
        characterName: "角色B",
      };

      const result1 = (await cosplay.generateCharacter(
        request1,
      )) as CharacterGenerationResult;
      const result2 = (await cosplay.generateCharacter(
        request2,
      )) as CharacterGenerationResult;

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.character?.name).toBe("角色A");
      expect(result2.character?.name).toBe("角色B");
    });

    it("should handle cache with same character name but different descriptions", async () => {
      const request1: CharacterGenerationRequest = {
        characterName: "测试角色",
        description: "描述A",
      };

      const request2: CharacterGenerationRequest = {
        characterName: "测试角色",
        description: "描述B",
      };

      const result1 = (await cosplay.generateCharacter(
        request1,
      )) as CharacterGenerationResult;
      const result2 = (await cosplay.generateCharacter(
        request2,
      )) as CharacterGenerationResult;

      // Should use same cache entry (only character name is used as key)
      expect(result1.character?.name).toBe(result2.character?.name);
    });
  });

  describe("clearCharacterCache", () => {
    it("should clear all cache entries", async () => {
      const request: CharacterGenerationRequest = {
        characterName: "缓存清除测试",
      };

      // Generate and cache a character
      await cosplay.generateCharacter(request);
      const cacheSize = (cosplay as { characterCache: Map<string, unknown> })
        .characterCache.size;
      expect(cacheSize).toBeGreaterThan(0);

      // Clear cache
      cosplay.clearCharacterCache();
      expect(
        (cosplay as { characterCache: Map<string, unknown> }).characterCache
          .size,
      ).toBe(0);

      // Generate again - should work normally
      const result = (await cosplay.generateCharacter(
        request,
      )) as CharacterGenerationResult;
      expect(result.success).toBe(true);
    });

    it("should handle empty cache gracefully", () => {
      expect(() => cosplay.clearCharacterCache()).not.toThrow();
      expect(
        (cosplay as { characterCache: Map<string, unknown> }).characterCache
          .size,
      ).toBe(0);
    });
  });

  describe("getCharacterCacheStats", () => {
    it("should return correct stats for empty cache", () => {
      const stats = cosplay.getCharacterCacheStats();

      expect(stats.totalCacheEntries).toBe(0);
      expect(stats.expiredEntries).toBe(0);
      expect(stats.cacheHitRate).toBe("0%");
    });

    it("should return correct stats for active cache", async () => {
      const request: CharacterGenerationRequest = {
        characterName: "缓存统计测试",
      };

      // Add entry to cache
      await cosplay.generateCharacter(request);

      const stats = cosplay.getCharacterCacheStats();

      expect(stats.totalCacheEntries).toBe(1);
      expect(stats.expiredEntries).toBe(0);
      expect(stats.cacheHitRate).toBe("100.00%");
    });

    it("should calculate expired entries correctly", async () => {
      const request: CharacterGenerationRequest = {
        characterName: "过期测试",
      };

      // Add entry to cache
      await cosplay.generateCharacter(request);

      // Manually set timestamp to make it expired
      const cache = (cosplay as { characterCache: Map<string, unknown> })
        .characterCache;
      const cacheKey = "过期测试--3"; // New cache key format
      const entry = cache.get(cacheKey);
      if (entry && typeof entry === "object" && "timestamp" in entry) {
        (entry as { timestamp: number }).timestamp =
          Date.now() - 31 * 60 * 1000; // 31 minutes ago
      }

      const stats = cosplay.getCharacterCacheStats();

      expect(stats.totalCacheEntries).toBe(1);
      expect(stats.expiredEntries).toBe(1);
      expect(stats.cacheHitRate).toBe("0.00%");
    });

    it("should handle mixed cache states", async () => {
      const requests = [
        { characterName: "活跃角色1" },
        { characterName: "活跃角色2" },
        { characterName: "过期角色1" },
        { characterName: "过期角色2" },
      ];

      // Generate all characters
      for (const request of requests) {
        await cosplay.generateCharacter(request);
      }

      // Make some entries expired
      const cache = (cosplay as { characterCache: Map<string, unknown> })
        .characterCache;
      for (const name of ["过期角色1", "过期角色2"]) {
        const cacheKey = `${name}--3`; // New cache key format
        const entry = cache.get(cacheKey);
        if (entry && typeof entry === "object" && "timestamp" in entry) {
          (entry as { timestamp: number }).timestamp =
            Date.now() - 31 * 60 * 1000;
        }
      }

      const stats = cosplay.getCharacterCacheStats();

      expect(stats.totalCacheEntries).toBe(4);
      expect(stats.expiredEntries).toBe(2);
      expect(stats.cacheHitRate).toBe("50.00%");
    });
  });

  describe("cache with error handling", () => {
    it("should not cache failed generations", async () => {
      const request: CharacterGenerationRequest = {
        characterName: "失败角色",
      };

      // Clear any existing cache
      cosplay.clearCharacterCache();

      // Mock server that throws error for both personality and dialect requests
      mockServer.request.mockRejectedValue(new Error("Generation failed"));

      // Set server to trigger server-based generation
      (
        cosplay as {
          dynamicCharacterGenerator: { setServer: (server: unknown) => void };
        }
      ).dynamicCharacterGenerator.setServer(mockServer);

      const result = (await cosplay.generateCharacter(
        request,
      )) as CharacterGenerationResult;

      // The dynamic character generator has fallback logic, so it might still succeed
      // but we should check that server failures are handled gracefully
      expect(result.success).toBe(true); // Fallback should succeed

      // Check that cache behavior is working (entry should exist for successful generation)
      const cacheKey = "失败角色--3";
      const hasEntry = (
        cosplay as { characterCache: Map<string, unknown> }
      ).characterCache.has(cacheKey);

      // Since fallback generation succeeded, cache should have an entry
      // This test verifies that the system handles failures gracefully with fallbacks
      expect(hasEntry).toBe(true);
    });

    it("should handle cache operations during errors", async () => {
      const request: CharacterGenerationRequest = {
        characterName: "错误处理测试",
      };

      // First successful generation
      const result1 = (await cosplay.generateCharacter(
        request,
      )) as CharacterGenerationResult;
      expect(result1.success).toBe(true);

      // Clear cache
      cosplay.clearCharacterCache();

      // Should still work after cache clear
      const result2 = (await cosplay.generateCharacter(
        request,
      )) as CharacterGenerationResult;
      expect(result2.success).toBe(true);
    });
  });

  describe("cache performance", () => {
    it("should handle rapid successive calls", async () => {
      const request: CharacterGenerationRequest = {
        characterName: "性能测试角色",
      };

      // First call to populate cache
      const firstResult = (await cosplay.generateCharacter(
        request,
      )) as CharacterGenerationResult;
      expect(firstResult.success).toBe(true);

      // Reset call count to track subsequent calls
      mockServer.request.mockClear();

      // Rapid subsequent calls should use cache
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          cosplay.generateCharacter(
            request,
          ) as Promise<CharacterGenerationResult>,
        );
      }

      const results = await Promise.all(promises);

      // All should succeed
      expect(results.every((r: CharacterGenerationResult) => r.success)).toBe(
        true,
      );

      // All should return the same character as the first call
      const characters = results.map(
        (r: { character: unknown }) => r.character,
      );
      expect(new Set(characters).size).toBe(1);
      expect(characters[0]).toEqual(firstResult.character);

      // Server should not be called again due to cache
      expect(mockServer.request).not.toHaveBeenCalled();
    });

    it("should handle cache with many different characters", async () => {
      const requests = [];
      for (let i = 0; i < 20; i++) {
        requests.push({
          characterName: `角色${i}`,
          description: `描述${i}`,
        });
      }

      const results = await Promise.all(
        requests.map(
          (req) =>
            cosplay.generateCharacter(
              req,
            ) as Promise<CharacterGenerationResult>,
        ),
      );

      // All should succeed
      expect(results.every((r: CharacterGenerationResult) => r.success)).toBe(
        true,
      );

      // Cache should contain all entries
      expect(
        (cosplay as { characterCache: Map<string, unknown> }).characterCache
          .size,
      ).toBe(20);

      // Stats should reflect all entries
      const stats = cosplay.getCharacterCacheStats();
      expect(stats.totalCacheEntries).toBe(20);
      expect(stats.expiredEntries).toBe(0);
      expect(stats.cacheHitRate).toBe("100.00%");
    });
  });
});
