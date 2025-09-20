import { describe, it, expect, beforeEach } from "vitest";
import { PersonalityManager } from "./personality-manager.js";
import { EmotionType } from "./types.js";

describe("PersonalityManager", () => {
  let manager: PersonalityManager;

  beforeEach(() => {
    manager = new PersonalityManager();
  });

  describe("getPersonalityConfig", () => {
    it("should create valid personality config with defaults", () => {
      const config = manager.getPersonalityConfig("enthusiastic");

      expect(config.type).toBe("enthusiastic");
      expect(config.intensity).toBe(3);
      expect(config.useEmojis).toBe(true);
      expect(config.allowStrongLanguage).toBe(false);
    });

    it("should respect intensity parameter", () => {
      const config1 = manager.getPersonalityConfig("sarcastic", 5);
      const config2 = manager.getPersonalityConfig("professional", 1);

      expect(config1.intensity).toBe(5);
      expect(config1.useEmojis).toBe(true);
      expect(config1.allowStrongLanguage).toBe(true);

      expect(config2.intensity).toBe(1);
      expect(config2.useEmojis).toBe(false);
      expect(config2.allowStrongLanguage).toBe(false);
    });

    it("should clamp intensity values", () => {
      const config1 = manager.getPersonalityConfig("enthusiastic", 10);
      const config2 = manager.getPersonalityConfig("sarcastic", -5);

      expect(config1.intensity).toBe(5);
      expect(config2.intensity).toBe(0);
    });
  });

  describe("applyPersonality", () => {
    const baseEmotion = {
      emotion: "neutral" as EmotionType,
      confidence: 0.5,
      keywords: [],
    };

    it("should apply enthusiastic personality to positive text", () => {
      const config = manager.getPersonalityConfig("enthusiastic", 4);
      const positiveEmotion = {
        ...baseEmotion,
        emotion: "positive" as EmotionType,
      };

      const result = manager.applyPersonality(
        "Your code is great",
        positiveEmotion,
        config,
      );

      expect(result.toLowerCase()).toMatch(/c.*od.*e|code/);
      expect(result.toLowerCase()).toMatch(/gr.*eat|great/);
      expect(result.length).toBeGreaterThan("Your code is great".length);
    });

    it("should apply sarcastic personality to negative text", () => {
      const config = manager.getPersonalityConfig("sarcastic", 4);
      const negativeEmotion = {
        ...baseEmotion,
        emotion: "negative" as EmotionType,
      };

      const result = manager.applyPersonality(
        "There is an error",
        negativeEmotion,
        config,
      );

      expect(result.toLowerCase()).toMatch(/err.*or/);
      expect(result.length).toBeGreaterThan("There is an error".length);
    });

    it("should apply professional personality appropriately", () => {
      const config = manager.getPersonalityConfig("professional", 3);

      const result = manager.applyPersonality(
        "The function works",
        baseEmotion,
        config,
      );

      expect(result).toContain("The function works");
      expect(result).toMatch(/^[A-Z]/); // Should be capitalized
    });

    it("should handle intensity level 1 (minimal changes)", () => {
      const config = manager.getPersonalityConfig("enthusiastic", 1);

      const result = manager.applyPersonality(
        "This is fine",
        baseEmotion,
        config,
      );

      // With intensity 1, should have minimal or no changes
      expect(result).toBe("This is fine");
    });

    it("should handle intensity level 5 (maximum changes)", () => {
      const config = manager.getPersonalityConfig("enthusiastic", 5);

      const result = manager.applyPersonality(
        "This is amazing",
        baseEmotion,
        config,
      );

      expect(result.length).toBeGreaterThan("This is amazing".length);
      // Should contain emojis at high intensity
      expect(result).toMatch(
        /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u,
      );
    });

    it("should not modify empty strings", () => {
      const config = manager.getPersonalityConfig("enthusiastic", 3);

      const result = manager.applyPersonality("", baseEmotion, config);

      expect(result).toBe("");
    });

    it("should not modify whitespace-only strings", () => {
      const config = manager.getPersonalityConfig("enthusiastic", 3);

      const result = manager.applyPersonality("   ", baseEmotion, config);

      expect(result).toBe("   ");
    });

    it("should handle very short strings", () => {
      const config = manager.getPersonalityConfig("sarcastic", 3);

      const result = manager.applyPersonality("OK", baseEmotion, config);

      expect(result).toContain("OK");
    });

    it("should respect useEmojis configuration", () => {
      const configWithEmojis = manager.getPersonalityConfig("enthusiastic", 4);
      const configWithoutEmojis = manager.getPersonalityConfig(
        "enthusiastic",
        2,
      );

      const result1 = manager.applyPersonality(
        "Good work",
        baseEmotion,
        configWithEmojis,
      );

      const result2 = manager.applyPersonality(
        "Good work",
        baseEmotion,
        configWithoutEmojis,
      );

      // Higher intensity should use emojis more frequently
      expect(result1.length).toBeGreaterThanOrEqual(result2.length);
    });

    it("should apply different intensities appropriately", () => {
      const text = "The code works";
      const results = [];

      for (let intensity = 1; intensity <= 5; intensity++) {
        const config = manager.getPersonalityConfig("enthusiastic", intensity);
        const result = manager.applyPersonality(text, baseEmotion, config);
        results.push(result);
      }

      // Results should generally increase in length/complexity with intensity
      expect(results[0].length).toBeLessThanOrEqual(results[4].length);
    });
  });
});
