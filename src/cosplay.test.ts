import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Cosplay } from "./cosplay.js";
import { CosplayRequest, PersonalityType } from "./types.js";
import { existsSync, unlinkSync } from "fs";
import { join } from "path";

describe("Cosplay", () => {
  let cosplay: Cosplay;
  let testConfigPath: string;

  beforeEach(() => {
    testConfigPath = join(process.cwd(), "test-cosplay-config.json");

    // Clean up any existing test config file
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }

    cosplay = new Cosplay(testConfigPath);
  });

  afterEach(() => {
    // Clean up test config file after each test
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }
  });

  describe("emotionizeText", () => {
    it("should process text with default personality", async () => {
      const request: CosplayRequest = {
        text: "Your code is great",
      };

      const result = await cosplay.cosplayText(request);

      expect(result.originalText).toBe("Your code is great");
      expect(result.emotionizedText).toContain("Your code is great");
      expect(result.emotionizedText.length).toBeGreaterThan(
        result.originalText.length,
      );
      expect(result.personality.type).toBe("enthusiastic"); // Default
      expect(result.personality.intensity).toBe(3); // Default
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it("should handle different personalities", async () => {
      const baseRequest: CosplayRequest = {
        text: "There is an error in the code",
      };

      const personalities: PersonalityType[] = [
        "enthusiastic",
        "sarcastic",
        "professional",
      ];
      const results = [];

      for (const character of personalities) {
        const request = { ...baseRequest, character };
        const result = await cosplay.cosplayText(request);
        results.push(result);
      }

      // Each personality should produce different results
      const texts = results.map((r) => r.emotionizedText);
      expect(new Set(texts).size).toBe(3); // All should be different

      // All should contain key words from original text (not necessarily exact string due to modifications)
      results.forEach((result) => {
        expect(result.emotionizedText.toLowerCase()).toContain("error");
        expect(result.emotionizedText.toLowerCase()).toContain("code");
      });

      // All should have correct personality types
      results.forEach((result, index) => {
        expect(result.personality.type).toBe(personalities[index]);
      });
    });

    it("should respect intensity levels", async () => {
      const baseRequest: CosplayRequest = {
        text: "The function works correctly",
      };

      const results = [];
      for (let intensity = 1; intensity <= 5; intensity++) {
        const request = { ...baseRequest, intensity };
        const result = await cosplay.cosplayText(request);
        results.push(result);
      }

      // Results should vary by intensity
      results.map((r) => r.emotionizedText);

      // Generally, higher intensity should produce longer/more modified text
      const lowIntensityLength = results[0].emotionizedText.length;
      const highIntensityLength = results[4].emotionizedText.length;
      expect(highIntensityLength).toBeGreaterThanOrEqual(lowIntensityLength);

      // All should have correct intensity
      results.forEach((result, index) => {
        expect(result.personality.intensity).toBe(index + 1);
      });
    });

    it("should analyze sentiment correctly", async () => {
      const positiveRequest: CosplayRequest = {
        text: "This is absolutely fantastic and wonderful!",
      };

      const negativeRequest: CosplayRequest = {
        text: "This is terrible and horrible, I hate it",
      };

      const positiveResult = await cosplay.cosplayText(positiveRequest);
      const negativeResult = await cosplay.cosplayText(negativeRequest);

      expect(positiveResult.emotion.emotion).toBe("positive");
      expect(positiveResult.emotion.confidence).toBeGreaterThan(0.5);
      expect(positiveResult.emotion.keywords).toContain("fantastic");

      expect(negativeResult.emotion.emotion).toBe("negative");
      expect(negativeResult.emotion.confidence).toBeGreaterThan(0.5);
      expect(negativeResult.emotion.keywords).toContain("terrible");
    });

    it("should handle empty text", async () => {
      const request: CosplayRequest = {
        text: "",
      };

      const result = await cosplay.cosplayText(request);

      expect(result.originalText).toBe("");
      expect(result.emotionizedText).toBe("");
      expect(result.emotion.emotion).toBe("neutral");
    });

    it("should handle very long text", async () => {
      const longText = "This is a very long piece of text. ".repeat(20);
      const request: CosplayRequest = {
        text: longText,
      };

      const result = await cosplay.cosplayText(request);

      expect(result.originalText).toBe(longText);
      expect(result.emotionizedText.toLowerCase()).toContain(
        "long piece of text",
      );
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it("should process text quickly", async () => {
      const request: CosplayRequest = {
        text: "Simple test text",
      };

      const startTime = Date.now();
      const result = await cosplay.cosplayText(request);
      const endTime = Date.now();

      expect(result.processingTime).toBeLessThan(100); // Should be very fast
      expect(endTime - startTime).toBeLessThan(50); // Overall processing should be fast
    });

    it("should handle context parameter", async () => {
      const request: CosplayRequest = {
        text: "The code runs",
        context: "debugging session",
      };

      const result = await cosplay.cosplayText(request);

      // Context is stored but may not affect the result in current implementation
      expect(result.originalText).toBe("The code runs");
      expect(result.emotionizedText).toContain("The code runs");
    });

    it("should handle Unicode and emojis in input", async () => {
      const request: CosplayRequest = {
        text: "Great job! 🎉 This is awesome!",
      };

      const result = await cosplay.cosplayText(request);

      expect(result.originalText).toBe("Great job! 🎉 This is awesome!");
      expect(result.emotionizedText.toLowerCase()).toContain("great");
      expect(result.emotionizedText.toLowerCase()).toContain("awesome");
    });

    it("should handle special characters", async () => {
      const request: CosplayRequest = {
        text: 'The code has a "bug" & needs fixing...',
      };

      const result = await cosplay.cosplayText(request);

      expect(result.originalText).toBe(
        'The code has a "bug" & needs fixing...',
      );
      expect(result.emotionizedText.toLowerCase()).toContain("bug");
      expect(result.emotionizedText.toLowerCase()).toContain("fixing");
    });
  });

  describe("getAvailablePersonalities", () => {
    it("should return all available personality types", () => {
      const personalities = cosplay.getAvailableCharacters();

      expect(personalities).toContain("enthusiastic");
      expect(personalities).toContain("sarcastic");
      expect(personalities).toContain("professional");
      expect(personalities).toHaveLength(3);
    });
  });

  describe("config management", () => {
    it("should provide access to current config", () => {
      const config = cosplay.getConfig();

      expect(config.defaultPersonality).toBeDefined();
      expect(config.defaultIntensity).toBeDefined();
      expect(config.maxIntensity).toBeDefined();
    });

    it("should allow config updates", () => {
      cosplay.updateConfig({
        defaultPersonality: "sarcastic",
        defaultIntensity: 4,
      });

      const config = cosplay.getConfig();

      expect(config.defaultPersonality).toBe("sarcastic");
      expect(config.defaultIntensity).toBe(4);
    });

    it("should persist config updates", () => {
      cosplay.updateConfig({
        defaultPersonality: "professional",
        defaultIntensity: 2,
      });

      // Create new emotionizer instance with same config path
      const newCosplay = new Cosplay(testConfigPath);
      const config = newCosplay.getConfig();

      expect(config.defaultPersonality).toBe("professional");
      expect(config.defaultIntensity).toBe(2);
    });

    it("should use updated config for new requests", async () => {
      cosplay.updateConfig({
        defaultPersonality: "sarcastic",
        defaultIntensity: 2,
      });

      const request: CosplayRequest = {
        text: "The code works",
      };

      const result = await cosplay.cosplayText(request);

      expect(result.personality.type).toBe("sarcastic");
      expect(result.personality.intensity).toBe(2);
    });
  });

  describe("error handling", () => {
    it("should handle invalid intensity gracefully", async () => {
      const request: CosplayRequest = {
        text: "Test text",
        intensity: 10, // Should be clamped
      };

      const result = await cosplay.cosplayText(request);

      expect(result.personality.intensity).toBeLessThanOrEqual(5);
      expect(result.emotionizedText.toLowerCase()).toMatch(/t.*e.*s.*t/);
    });

    it("should handle negative intensity gracefully", async () => {
      const request: CosplayRequest = {
        text: "Test text",
        intensity: -5,
      };

      const result = await cosplay.cosplayText(request);

      expect(result.personality.intensity).toBeGreaterThanOrEqual(0);
      expect(result.emotionizedText).toContain("Test text");
    });
  });

  describe("performance and reliability", () => {
    it("should handle concurrent requests", async () => {
      const requests: CosplayRequest[] = [
        { text: "Request 1" },
        { text: "Request 2" },
        { text: "Request 3" },
        { text: "Request 4" },
        { text: "Request 5" },
      ];

      const promises = requests.map((req) => cosplay.cosplayText(req));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result, index) => {
        expect(result.originalText).toBe(`Request ${index + 1}`);
        expect(result.emotionizedText).toContain(`Request ${index + 1}`);
      });
    });

    it("should be consistent across multiple runs", async () => {
      const request: CosplayRequest = {
        text: "Consistent test",
        character: "professional",
        intensity: 3,
      };

      const results = [];
      for (let i = 0; i < 5; i++) {
        const result = await cosplay.cosplayText(request);
        results.push(result.emotionizedText);
      }

      // Results should be consistent (though not necessarily identical due to randomization)
      results.forEach((result) => {
        expect(result).toContain("Consistent test");
        expect(result.length).toBeGreaterThan("Consistent test".length);
      });
    });
  });

  describe("content safety integration", () => {
    it("should allow normal content during emotionize", async () => {
      const request: CosplayRequest = {
        text: "今天天气真好",
        character: "enthusiastic",
        intensity: 3,
      };

      const result = await cosplay.cosplayText(request);

      expect(result.originalText).toBe("今天天气真好");
      expect(result.emotionizedText).toContain("今天天气真好");
      expect(result.emotionizedText.length).toBeGreaterThan(
        "今天天气真好".length,
      );
    });

    it("should provide content safety check method", async () => {
      const normalResult = await cosplay.checkContentSafety("正常文本");
      expect(normalResult.isViolation).toBe(false);
    });

    it("should manage content safety config", () => {
      const originalConfig = cosplay.getContentSafetyConfig();

      // Update config
      cosplay.updateContentSafetyConfig({
        enabled: false,
        confidenceThreshold: 0.8,
      });

      const updatedConfig = cosplay.getContentSafetyConfig();

      expect(updatedConfig.enabled).toBe(false);
      expect(updatedConfig.confidenceThreshold).toBe(0.8);
      expect(updatedConfig.checkMethod).toBe(originalConfig.checkMethod); // unchanged
    });
  });
});
