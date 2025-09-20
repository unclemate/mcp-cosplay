import { describe, it, expect, beforeEach } from "vitest";
import { EmotionAnalyzer } from "./emotion-analyzer.js";

describe("EmotionAnalyzer", () => {
  let analyzer: EmotionAnalyzer;

  beforeEach(() => {
    analyzer = new EmotionAnalyzer();
  });

  describe("analyzeSentiment", () => {
    it("should identify positive emotions", () => {
      const result = analyzer.analyzeSentiment("This is great and awesome!");

      expect(result.emotion).toBe("positive");
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.keywords).toContain("great");
      expect(result.keywords).toContain("awesome");
    });

    it("should identify negative emotions", () => {
      const result = analyzer.analyzeSentiment("This is terrible and awful!");

      expect(result.emotion).toBe("negative");
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.keywords).toContain("terrible");
      expect(result.keywords).toContain("awful");
    });

    it("should identify neutral emotions", () => {
      const result = analyzer.analyzeSentiment("This is a normal statement.");

      expect(result.emotion).toBe("neutral");
      expect(result.confidence).toBeLessThanOrEqual(0.7);
      expect(result.keywords).toHaveLength(0);
    });

    it("should handle mixed emotions", () => {
      const result = analyzer.analyzeSentiment(
        "This is great but also terrible",
      );

      // Should detect keywords from both sides
      expect(result.keywords).toContain("great");
      expect(result.keywords).toContain("terrible");
    });

    it("should prioritize stronger emotions", () => {
      const positiveResult = analyzer.analyzeSentiment(
        "great awesome fantastic perfect",
      );
      const negativeResult = analyzer.analyzeSentiment(
        "terrible awful horrible bad",
      );

      expect(positiveResult.emotion).toBe("positive");
      expect(positiveResult.confidence).toBeGreaterThan(0.7);

      expect(negativeResult.emotion).toBe("negative");
      expect(negativeResult.confidence).toBeGreaterThan(0.7);
    });

    it("should handle empty strings", () => {
      const result = analyzer.analyzeSentiment("");

      expect(result.emotion).toBe("neutral");
      expect(result.confidence).toBe(0.5);
      expect(result.keywords).toHaveLength(0);
    });

    it("should be case insensitive", () => {
      const result1 = analyzer.analyzeSentiment("This is GREAT");
      const result2 = analyzer.analyzeSentiment("this is great");

      expect(result1.emotion).toBe(result2.emotion);
      expect(result1.keywords).toEqual(result2.keywords);
    });

    it("should detect Chinese keywords", () => {
      const result = analyzer.analyzeSentiment("这个代码很棒，很好！");

      expect(result.emotion).toBe("positive");
      expect(result.keywords).toContain("棒");
      expect(result.keywords).toContain("很好");
    });

    it("should detect Chinese negative keywords", () => {
      const result = analyzer.analyzeSentiment("这个代码很糟糕，有错误！");

      expect(result.emotion).toBe("negative");
      expect(result.keywords).toContain("糟糕");
      expect(result.keywords).toContain("错误");
    });

    it("should have reasonable confidence bounds", () => {
      const results = [
        analyzer.analyzeSentiment("great"),
        analyzer.analyzeSentiment("terrible"),
        analyzer.analyzeSentiment("normal"),
      ];

      results.forEach((result) => {
        expect(result.confidence).toBeGreaterThanOrEqual(0.3);
        expect(result.confidence).toBeLessThanOrEqual(0.95);
      });
    });
  });
});
