export type EmotionType = "positive" | "negative" | "neutral";

export type PersonalityType = "enthusiastic" | "sarcastic" | "professional";
export type CharacterType = PersonalityType | string; // 支持自定义角色名称

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
  character?: CharacterType;
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

export interface EnhancedPersonalityConfig {
  signaturePhrases: string[];
  toneWords: string[];
  attitude: string;
  speechPatterns: string[];
  backgroundContext: string;
  emojiPreferences: string[];
  languageStyle: string;
}

export interface CharacterProfile {
  name: string;
  description: string;
  personality: EnhancedPersonalityConfig;
  examples?: string[];
  category?: string;
}
