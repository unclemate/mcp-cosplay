import { EmotionAnalysis, EmotionType } from "./types.js";

export class EmotionAnalyzer {
  private positiveKeywords = [
    "great",
    "awesome",
    "excellent",
    "amazing",
    "wonderful",
    "fantastic",
    "good",
    "nice",
    "perfect",
    "love",
    "like",
    "happy",
    "excited",
    "成功",
    "很好",
    "棒",
    "优秀",
    "完美",
    "喜欢",
    "开心",
  ];

  private negativeKeywords = [
    "bad",
    "terrible",
    "awful",
    "horrible",
    "hate",
    "dislike",
    "angry",
    "frustrated",
    "disappointed",
    "sad",
    "wrong",
    "error",
    "糟糕",
    "差",
    "讨厌",
    "愤怒",
    "失望",
    "错误",
    "失败",
  ];

  analyzeSentiment(text: string): EmotionAnalysis {
    const lowerText = text.toLowerCase();
    const foundKeywords: string[] = [];

    let positiveScore = 0;
    let negativeScore = 0;

    this.positiveKeywords.forEach((keyword) => {
      if (lowerText.includes(keyword)) {
        positiveScore++;
        foundKeywords.push(keyword);
      }
    });

    this.negativeKeywords.forEach((keyword) => {
      if (lowerText.includes(keyword)) {
        negativeScore++;
        foundKeywords.push(keyword);
      }
    });

    let emotion: EmotionType = "neutral";
    let confidence = 0.5;

    if (positiveScore > negativeScore) {
      emotion = "positive";
      confidence = Math.min(0.5 + (positiveScore - negativeScore) * 0.1, 0.95);
    } else if (negativeScore > positiveScore) {
      emotion = "negative";
      confidence = Math.min(0.5 + (negativeScore - positiveScore) * 0.1, 0.95);
    } else {
      confidence = Math.max(
        0.3,
        0.5 - Math.max(positiveScore, negativeScore) * 0.05,
      );
    }

    return {
      emotion,
      confidence,
      keywords: foundKeywords,
    };
  }
}
