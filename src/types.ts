export type EmotionType = "positive" | "negative" | "neutral";

export type PersonalityType = "enthusiastic" | "sarcastic" | "professional";

export interface EmotionAnalysis {
  emotion: EmotionType;
  confidence: number;
  keywords: string[];
}

export interface PersonalityConfig {
  type: PersonalityType;
  intensity: number; // 0-5
  useEmojis: boolean;
  allowStrongLanguage: boolean;
}

export interface EmotionizeRequest {
  text: string;
  personality?: PersonalityType;
}

export interface CosplayRequest {
  text: string;
  character?: PersonalityType;
  intensity?: number;
  context?: string;
}

export interface EmotionizeResult {
  originalText: string;
  emotionizedText: string;
  emotion: EmotionAnalysis;
  personality: PersonalityConfig;
  processingTime: number;
}

export interface ContentCheckResult {
  isViolation: boolean;
  confidence: number;
  reason?: string;
  category?: string;
}

export interface ContentSafetyConfig {
  enabled: boolean;
  confidenceThreshold: number;
  strictMode: boolean;
  checkMethod: "llm" | "keyword";
  customRules?: string[];
}

export interface MCPResponse {
  content?:
    | Array<{
        type: string;
        text?: string;
      }>
    | {
        type: string;
        text?: string;
      };
  text?: string;
}

export type ServerConfig = Record<string, unknown>;

export interface PersonalityTraits {
  prefixes: string[];
  suffixes: string[];
  intensifiers: string[];
  emojis: string[];
}
