import { describe, it, expect } from "vitest";
import { DialectConfig } from "./types.js";

describe("DialectConfig", () => {
  describe("Type Safety", () => {
    it("should accept valid dialect configuration", () => {
      const validDialect: DialectConfig = {
        name: "广东话",
        region: "广东",
        characteristics: ["声调复杂", "保留古音", "词汇丰富"],
        commonPhrases: ["唔该", "多谢", "早上好"],
        pronunciationNotes: ["九声六调", "入声保留"],
        slangWords: ["靓仔", "靓女", "食咗飯未"],
        grammarPatterns: ["形容词后置", "量词特殊"],
        exampleSentences: ["你好吗？", "今日天气几好。"],
      };

      expect(validDialect.name).toBe("广东话");
      expect(validDialect.region).toBe("广东");
      expect(validDialect.characteristics).toHaveLength(3);
      expect(validDialect.commonPhrases).toHaveLength(3);
      expect(validDialect.pronunciationNotes).toHaveLength(2);
      expect(validDialect.slangWords).toHaveLength(3);
      expect(validDialect.grammarPatterns).toHaveLength(2);
      expect(validDialect.exampleSentences).toHaveLength(2);
    });

    it("should accept minimal dialect configuration", () => {
      const minimalDialect: DialectConfig = {
        name: "标准官话",
        region: "全国",
        characteristics: [],
        commonPhrases: [],
        pronunciationNotes: [],
        slangWords: [],
        grammarPatterns: [],
        exampleSentences: [],
      };

      expect(minimalDialect.name).toBe("标准官话");
      expect(minimalDialect.region).toBe("全国");
      expect(Array.isArray(minimalDialect.characteristics)).toBe(true);
      expect(Array.isArray(minimalDialect.commonPhrases)).toBe(true);
      expect(Array.isArray(minimalDialect.pronunciationNotes)).toBe(true);
      expect(Array.isArray(minimalDialect.slangWords)).toBe(true);
      expect(Array.isArray(minimalDialect.grammarPatterns)).toBe(true);
      expect(Array.isArray(minimalDialect.exampleSentences)).toBe(true);
    });
  });

  describe("Hong Xiuquan Dialect Configuration", () => {
    it("should represent Hong Xiuquan's Hakka dialect correctly", () => {
      const hongDialect: DialectConfig = {
        name: "广东客家话",
        region: "广东花县",
        characteristics: ["客家方言特点", "古汉语保留", "语气庄重"],
        commonPhrases: ["天父", "天国", "清妖", "万岁", "天王"],
        pronunciationNotes: ["客家声调", "古音保留"],
        slangWords: ["天父", "天国", "清妖"],
        grammarPatterns: ["使用古典句式", "宗教用语"],
        exampleSentences: ["天父下凡，我乃真命天子", "清妖必灭，天国必兴"],
      };

      expect(hongDialect.name).toBe("广东客家话");
      expect(hongDialect.region).toBe("广东花县");
      expect(hongDialect.characteristics).toContain("客家方言特点");
      expect(hongDialect.commonPhrases).toContain("天父");
      expect(hongDialect.commonPhrases).toContain("天王");
      expect(hongDialect.slangWords).toContain("天国");
      expect(hongDialect.grammarPatterns).toContain("宗教用语");
      expect(hongDialect.exampleSentences).toContain("天父下凡，我乃真命天子");
    });
  });

  describe("Sun Yat-sen Dialect Configuration", () => {
    it("should represent Sun Yat-sen's Zhongshan dialect correctly", () => {
      const sunDialect: DialectConfig = {
        name: "广东中山话",
        region: "广东中山",
        characteristics: ["粤语特点", "近代汉语", "革命用语"],
        commonPhrases: ["革命", "共和", "民国", "同志", "自由"],
        pronunciationNotes: ["粤语声调", "中山口音"],
        slangWords: ["革命", "共和"],
        grammarPatterns: ["现代汉语", "政治术语"],
        exampleSentences: ["革命尚未成功，同志仍需努力"],
      };

      expect(sunDialect.name).toBe("广东中山话");
      expect(sunDialect.region).toBe("广东中山");
      expect(sunDialect.characteristics).toContain("革命用语");
      expect(sunDialect.commonPhrases).toContain("革命");
      expect(sunDialect.commonPhrases).toContain("自由");
      expect(sunDialect.slangWords).toContain("共和");
      expect(sunDialect.grammarPatterns).toContain("政治术语");
      expect(sunDialect.exampleSentences).toContain(
        "革命尚未成功，同志仍需努力",
      );
    });
  });

  describe("Data Validation", () => {
    it("should handle Unicode characters correctly", () => {
      const unicodeDialect: DialectConfig = {
        name: "四川话🌶️",
        region: "四川",
        characteristics: ["麻辣风味", "语调独特"],
        commonPhrases: ["巴适", "要得", "安逸"],
        pronunciationNotes: ["卷舌音", "儿化音"],
        slangWords: ["摆龙门阵", "瓜娃子"],
        grammarPatterns: ["语气词丰富"],
        exampleSentences: ["今天天气巴适得很！", "这个菜要得！"],
      };

      expect(unicodeDialect.name).toContain("🌶️");
      expect(unicodeDialect.commonPhrases).toContain("巴适");
      expect(unicodeDialect.slangWords).toContain("摆龙门阵");
    });

    it("should handle empty arrays gracefully", () => {
      const emptyDialect: DialectConfig = {
        name: "测试方言",
        region: "测试地区",
        characteristics: [],
        commonPhrases: [],
        pronunciationNotes: [],
        slangWords: [],
        grammarPatterns: [],
        exampleSentences: [],
      };

      expect(emptyDialect.characteristics).toEqual([]);
      expect(emptyDialect.commonPhrases).toEqual([]);
      expect(emptyDialect.pronunciationNotes).toEqual([]);
      expect(emptyDialect.slangWords).toEqual([]);
      expect(emptyDialect.grammarPatterns).toEqual([]);
      expect(emptyDialect.exampleSentences).toEqual([]);
    });
  });
});
