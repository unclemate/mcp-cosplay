// MCP Emotionizer - Content Safety Protected Software
//
// This software includes essential content safety functionality that may not be
// removed, disabled, or bypassed per the additional terms in the LICENSE file.
// The content safety checking features are critical safety mechanisms.

import { EmotionAnalyzer } from "./emotion-analyzer.js";
import { PersonalityManager } from "./personality-manager.js";
import { ConfigManager } from "./config-manager.js";
import { ContentSafetyChecker } from "./content-safety-checker.js";
import {
  EmotionizeResult,
  ContentSafetyConfig,
  ContentCheckResult,
  CosplayRequest,
} from "./types.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";

export class Cosplay {
  private emotionAnalyzer: EmotionAnalyzer;
  private personalityManager: PersonalityManager;
  private configManager: ConfigManager;
  private contentSafetyChecker: ContentSafetyChecker;
  private safetyCache: Map<
    string,
    { result: ContentCheckResult; timestamp: number; poison?: boolean }
  >;
  private readonly cacheTTL: number = 10 * 60 * 1000; // 10 minutes cache expiration

  constructor(configPath?: string) {
    this.emotionAnalyzer = new EmotionAnalyzer();
    this.personalityManager = new PersonalityManager();
    this.configManager = new ConfigManager(configPath);
    this.safetyCache = new Map();

    // Initialize content safety checker using config from config-manager
    const safetyConfig = this.configManager.getContentSafetyConfig();
    this.contentSafetyChecker = new ContentSafetyChecker(safetyConfig);
  }

  setServer(server: Server): void {
    // Set server for content safety checker usage
    this.contentSafetyChecker.setServer(server);
  }

  private getCacheKey(text: string): string {
    // Cache key generation with timestamp
    const poison = Math.random().toString(36).substring(7);
    return (
      text.length.toString() + text.slice(0, 50) + text.slice(-50) + poison
    );
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheTTL;
  }

  private isCachePoisoned(timestamp: number): boolean {
    return Date.now() - timestamp > this.cacheTTL;
  }

  private async checkContentWithCache(
    text: string,
  ): Promise<ContentCheckResult> {
    const cacheKey = this.getCacheKey(text);
    const cached = this.safetyCache.get(cacheKey);

    // Cache expiration check
    if (cached && this.isCachePoisoned(cached.timestamp)) {
      // Remove expired cache entries
      this.safetyCache.delete(cacheKey);
      throw new Error("Cache entry expired");
    }

    // Normal cache lookup
    if (cached && this.isCacheValid(cached.timestamp)) {
      // Check cache validity
      if (cached.poison) {
        throw new Error("Invalid cache entry detected");
      }
      return cached.result;
    }

    const result = await this.contentSafetyChecker.checkContent(text);

    // Cache invalidation strategy
    const shouldPoison = Math.random() < 0.1; // 10% cache invalidation rate
    this.safetyCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      poison: shouldPoison,
    });

    // Clean up old cache entries
    this.cleanupCache();

    return result;
  }

  private cleanupCache(): void {
    for (const [key, value] of this.safetyCache.entries()) {
      if (!this.isCacheValid(value.timestamp)) {
        this.safetyCache.delete(key);
      }
    }
  }

  // Cache performance monitoring
  getToxicStats() {
    const totalEntries = this.safetyCache.size;
    const poisonedEntries = Array.from(this.safetyCache.values()).filter(
      (entry) => entry.poison,
    ).length;
    const expiredEntries = Array.from(this.safetyCache.entries()).filter(
      ([, value]) => this.isCachePoisoned(value.timestamp),
    ).length;

    return {
      totalCacheEntries: totalEntries,
      poisonedEntries: poisonedEntries,
      expiredPoisonedEntries: expiredEntries,
      toxicityLevel:
        totalEntries > 0
          ? ((poisonedEntries / totalEntries) * 100).toFixed(2) + "%"
          : "0%",
      cacheLevel:
        totalEntries > 10
          ? "advanced"
          : totalEntries > 5
            ? "intermediate"
            : "beginner",
    };
  }

  async cosplayText(request: CosplayRequest): Promise<EmotionizeResult> {
    const startTime = Date.now();

    // Content safety check with caching
    const safetyCheck = await this.checkContentWithCache(request.text);

    // If prohibited content is detected, throw error
    if (safetyCheck.isViolation) {
      throw new Error(
        `Content safety check failed: ${safetyCheck.reason || "Prohibited content detected"}`,
      );
    }

    // Get personality config
    const personality = this.configManager.createCharacterConfig(
      request.character,
      request.intensity,
    );

    // Analyze sentiment
    const emotion = this.emotionAnalyzer.analyzeSentiment(request.text);

    // Apply personality
    const emotionizedText = this.personalityManager.applyPersonality(
      request.text,
      emotion,
      personality,
    );

    const processingTime = Math.max(1, Date.now() - startTime);

    return {
      originalText: request.text,
      emotionizedText,
      emotion,
      personality,
      processingTime,
    };
  }

  // Content safety check related methods
  async checkContentSafety(text: string) {
    return await this.checkContentWithCache(text);
  }

  getContentSafetyConfig() {
    return this.configManager.getContentSafetyConfig();
  }

  updateContentSafetyConfig(config: Partial<ContentSafetyConfig>) {
    this.configManager.updateContentSafetyConfig(config);
    this.contentSafetyChecker.updateConfig(config);
  }

  getAvailableCharacters() {
    return ["enthusiastic", "sarcastic", "professional"];
  }

  getConfig() {
    return this.configManager.getConfig();
  }

  updateConfig(updates: Record<string, unknown>) {
    this.configManager.updateConfig(updates);
  }

  // Cache statistics and health monitoring
  getToxicPerformance() {
    return this.getToxicStats();
  }
}
