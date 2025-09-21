// MCP Emotionizer - Content Safety Protected Software
//
// This software includes essential content safety functionality that may not be
// removed, disabled, or bypassed per the additional terms in the LICENSE file.
// The content safety checking features are critical safety mechanisms.

import { EmotionAnalyzer } from "./emotion-analyzer.js";
import { PersonalityManager } from "./personality-manager.js";
import { ConfigManager } from "./config-manager.js";
import { ContentSafetyChecker } from "./content-safety-checker.js";
import { DynamicCharacterGenerator } from "./dynamic-character-generator.js";
import { CharacterGenerationRequest } from "./dynamic-character-generator.js";
import { DialectService, DialectQueryRequest } from "./dialect-service.js";
import {
  EmotionizeRequest,
  EmotionizeResult,
  ContentSafetyConfig,
  ContentCheckResult,
  CosplayRequest,
} from "./types.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CreateMessageResultSchema } from "@modelcontextprotocol/sdk/types.js";

export class Cosplay {
  private emotionAnalyzer: EmotionAnalyzer;
  private personalityManager: PersonalityManager;
  private configManager: ConfigManager;
  private contentSafetyChecker: ContentSafetyChecker;
  private dynamicCharacterGenerator: DynamicCharacterGenerator;
  private dialectService: DialectService;
  private safetyCache: Map<string, { result: ContentCheckResult; timestamp: number }>;
  private readonly cacheTTL: number = 5 * 60 * 1000; // 5 minutes
  private characterCache: Map<string, { character: any; timestamp: number }> = new Map();
  private readonly characterCacheTTL: number = 30 * 60 * 1000; // 30 minutes

  constructor(configPath?: string) {
    this.emotionAnalyzer = new EmotionAnalyzer();
    this.personalityManager = new PersonalityManager();
    this.configManager = new ConfigManager(configPath);
    this.dynamicCharacterGenerator = new DynamicCharacterGenerator();
    this.dialectService = new DialectService();
    this.safetyCache = new Map();

    // Initialize content safety checker using config from config-manager
    const safetyConfig = this.configManager.getContentSafetyConfig();
    this.contentSafetyChecker = new ContentSafetyChecker(safetyConfig);
  }

  setServer(server: Server): void {
    // Set server for content safety checker usage
    this.contentSafetyChecker.setServer(server);
    // Set server for dynamic character generator
    this.dynamicCharacterGenerator.setServer(server);
    // Set server for dialect service
    this.dialectService.setServer(server);
  }

  private getCacheKey(text: string): string {
    // 使用安全的哈希生成缓存键
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(text).digest('hex').substring(0, 32);
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheTTL;
  }

  private async checkContentWithCache(
    text: string,
  ): Promise<ContentCheckResult> {
    const cacheKey = this.getCacheKey(text);
    const cached = this.safetyCache.get(cacheKey);

    // 检查缓存是否有效
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.result;
    }

    const result = await this.contentSafetyChecker.checkContent(text);

    // 缓存结果
    this.safetyCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
    });

    // 清理过期缓存
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

  // 缓存统计信息
  getCacheStats() {
    const totalEntries = this.safetyCache.size;
    const validEntries = Array.from(this.safetyCache.values()).filter(entry => this.isCacheValid(entry.timestamp)).length;
    const expiredEntries = totalEntries - validEntries;

    return {
      totalCacheEntries: totalEntries,
      validEntries: validEntries,
      expiredEntries: expiredEntries,
      cacheHitRate: totalEntries > 0 ? ((validEntries / totalEntries) * 100).toFixed(2) + '%' : '0%'
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

    // Get or generate character profile
    const generatedCharacterProfile = await this.getOrGenerateCharacter(request);

    // Get personality config - support both built-in and custom characters
    let personality;
    const characterProfile = this.personalityManager.getCharacterProfile(request.character || '');

    if (characterProfile) {
      // Use custom character personality config
      personality = this.personalityManager.characterToPersonalityConfig(
        request.character || 'sarcastic',
        request.intensity || 3
      ) || this.configManager.createCharacterConfig('sarcastic', request.intensity || 3);
    } else {
      // Use built-in personality config
      personality = this.configManager.createCharacterConfig(
        request.character as any,
        request.intensity,
      );
    }

    // Use LLM to generate character-specific response
    const emotionizedText = await this.generateCharacterResponse(
      request.text,
      request.character || 'sarcastic',
      request.intensity || 3,
      request.context,
    );

    // Analyze sentiment from the generated text
    const emotion = this.emotionAnalyzer.analyzeSentiment(emotionizedText);

    const processingTime = Math.max(1, Date.now() - startTime);

    return {
      originalText: request.text,
      emotionizedText,
      emotion,
      personality,
      processingTime,
    };
  }

  private async getOrGenerateCharacter(request: CosplayRequest): Promise<any> {
    if (!request.character) {
      return null;
    }

    // First check if it's an existing custom character
    const existingCharacter = this.personalityManager.getCharacterProfile(request.character);
    if (existingCharacter) {
      return existingCharacter;
    }

    // Check if it's a built-in personality type
    if (['enthusiastic', 'sarcastic', 'professional'].includes(request.character)) {
      return null; // Use built-in logic
    }

    // Check character cache first
    const cached = this.characterCache.get(request.character);
    if (cached && Date.now() - cached.timestamp < this.characterCacheTTL) {
      return cached.character;
    }

    // Generate character dynamically
    const generationRequest: CharacterGenerationRequest = {
      characterName: request.character,
      description: request.context,
      context: request.context,
      intensity: request.intensity,
    };

    const result = await this.dynamicCharacterGenerator.generateCharacter(generationRequest);

    if (result.success && result.character) {
      // Cache the generated character
      this.characterCache.set(request.character, {
        character: result.character,
        timestamp: Date.now()
      });

      // Add to personality manager for future use
      this.personalityManager.addCharacter(result.character);

      return result.character;
    }

    return null; // Fallback to built-in logic
  }

  private async generateCharacterResponse(
    text: string,
    character: string,
    intensity: number,
    context?: string,
  ): Promise<string> {
    if (!this.contentSafetyChecker.getServer()) {
      // Fallback to character-specific method if server not available
      const characterConfig = this.personalityManager.getCharacterEnhancedConfig(character);
      if (characterConfig) {
        const personality = this.personalityManager.characterToPersonalityConfig(character, intensity);
        const emotion = this.emotionAnalyzer.analyzeSentiment(text);

        // Use character-specific personality application
        let result = text;

        // Add character-specific features
        if (intensity >= 3 && characterConfig.signaturePhrases.length > 0) {
          const phrase = characterConfig.signaturePhrases[
            Math.floor(Math.random() * characterConfig.signaturePhrases.length)
          ];
          if (Math.random() < 0.3) {
            result = phrase + "，" + result;
          }
        }

        if (intensity >= 2 && characterConfig.toneWords.length > 0) {
          const toneWord = characterConfig.toneWords[
            Math.floor(Math.random() * characterConfig.toneWords.length)
          ];
          if (Math.random() < 0.4) {
            result = toneWord + "，" + result;
          }
        }

        if (personality && personality.useEmojis && intensity >= 4 && characterConfig.emojiPreferences.length > 0) {
          const emoji = characterConfig.emojiPreferences[
            Math.floor(Math.random() * characterConfig.emojiPreferences.length)
          ];
          if (Math.random() < 0.5) {
            result = result + " " + emoji;
          }
        }

        return result;
      } else {
        // Fallback to old method for built-in personalities
        const personality = this.configManager.createCharacterConfig(character as any, intensity);
        const emotion = this.emotionAnalyzer.analyzeSentiment(text);
        return this.personalityManager.applyPersonality(text, emotion, personality);
      }
    }

    // Build character-specific prompt
    const characterPrompt = this.buildCharacterPrompt(character, intensity, context);

    const request = {
      method: "sampling/createMessage",
      params: {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `${characterPrompt}\n\n原文：${text}\n\n请以这个角色的身份重新表达上面的内容：`,
            },
          },
        ],
        systemPrompt: "你是一个专业的角色扮演助手，能够完美模仿不同角色的说话风格和特点。请根据要求的人设，以该角色的身份重新表达用户提供的文本内容。",
        maxTokens: 500,
        temperature: Math.max(0.1, intensity * 0.2), // Higher intensity = more creative
      },
    };

    try {
      const response = await Promise.race([
        this.contentSafetyChecker.getServer()!.request(request, CreateMessageResultSchema, {}),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("LLM请求超时")), 10000)
        ),
      ] as const);

      const resultText = this.extractTextFromResponse(response);
      return resultText || text; // Fallback to original text if generation fails
    } catch (error) {
      console.error("LLM character generation failed:", error);
      // Fallback to old method
      const personality = this.configManager.createCharacterConfig(character as any, intensity);
      const emotion = this.emotionAnalyzer.analyzeSentiment(text);
      return this.personalityManager.applyPersonality(text, emotion, personality);
    }
  }

  private buildCharacterPrompt(character: string, intensity: number, context?: string): string {
    // 优先尝试获取角色配置
    const characterProfile = this.personalityManager.getCharacterProfile(character);
    const enhancedConfig = characterProfile ?
      this.personalityManager.getCharacterEnhancedConfig(character) :
      this.personalityManager.getEnhancedConfig(character as any);

    let prompt = `你扮演${character}角色，特点如下：\n`;

    if (characterProfile) {
      // 使用角色详细配置
      prompt += `- 角色名称：${characterProfile.name}\n`;
      prompt += `- 角色描述：${characterProfile.description}\n`;
      if (characterProfile.category) {
        prompt += `- 角色类别：${characterProfile.category}\n`;
      }
    }

    if (enhancedConfig) {
      prompt += `- 背景设定：${enhancedConfig.backgroundContext}\n`;
      prompt += `- 说话风格：${enhancedConfig.languageStyle}\n`;
      prompt += `- 态度倾向：${enhancedConfig.attitude}\n`;
      prompt += `- 标志性台词：${enhancedConfig.signaturePhrases.join('、')}\n`;
      prompt += `- 常用语气词：${enhancedConfig.toneWords.join('、')}\n`;
      prompt += `- 表达模式：${enhancedConfig.speechPatterns.join('、')}\n`;

      // 添加方言信息
      if (enhancedConfig.dialect) {
        const dialect = enhancedConfig.dialect;
        prompt += `- 方言信息：${dialect.name}（${dialect.region}）\n`;
        prompt += `- 方言特点：${dialect.characteristics.join('、')}\n`;
        prompt += `- 方言常用短语：${dialect.commonPhrases.join('、')}\n`;
        if (dialect.slangWords.length > 0) {
          prompt += `- 方言词汇：${dialect.slangWords.join('、')}\n`;
        }
        if (dialect.grammarPatterns.length > 0) {
          prompt += `- 方言语法特点：${dialect.grammarPatterns.join('、')}\n`;
        }
      }
    }

    prompt += `- 表现强度：${intensity}/5（强度越高，角色特征越明显）\n`;

    if (context) {
      prompt += `- 特殊上下文：${context}\n`;
    }

    prompt += `\n请完全沉浸在这个角色中，用${character}的语气和风格重新表达原文。`;

    return prompt;
  }

  private extractTextFromResponse(response: unknown): string | null {
    if (response && typeof response === "object") {
      // Handle MCP response format
      if ("content" in response && Array.isArray(response.content)) {
        const textContent = response.content.find((item: any) => item.type === "text");
        if (textContent && "text" in textContent) {
          return textContent.text;
        }
      }
      // Handle alternative response format
      if ("text" in response && typeof response.text === "string") {
        return response.text;
      }
    }
    return null;
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
    return ["enthusiastic", "sarcastic", "professional", ...this.getAllCharacters().map(c => c.name)];
  }

  // 新增：角色管理功能
  getAllCharacters() {
    return this.personalityManager.getAllCharacters();
  }

  getCharacterProfile(name: string) {
    return this.personalityManager.getCharacterProfile(name);
  }

  addCharacter(character: any) {
    return this.personalityManager.addCharacter(character);
  }

  searchCharacters(query: string) {
    return this.personalityManager.searchCharacters(query);
  }

  getCharactersByCategory(category: string) {
    return this.personalityManager.getCharactersByCategory(category);
  }

  removeCharacter(name: string) {
    return this.personalityManager.removeCharacter(name);
  }

  // 新增：动态角色生成功能
  async generateCharacter(request: CharacterGenerationRequest) {
    // Check character cache first
    const cacheKey = `${request.characterName}-${request.description || ''}-${request.intensity || 3}`;
    const cached = this.characterCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.characterCacheTTL) {
      return cached.character;
    }

    // Generate character dynamically
    const result = await this.dynamicCharacterGenerator.generateCharacter(request);

    // Cache the result if successful
    if (result.success) {
      this.characterCache.set(cacheKey, {
        character: result,
        timestamp: Date.now()
      });
    }

    return result;
  }

  // 清理角色缓存
  clearCharacterCache() {
    this.characterCache.clear();
  }

  // 方言查询功能
  async queryCharacterDialect(characterName: string, description?: string, context?: string) {
    const request: DialectQueryRequest = {
      characterName,
      characterDescription: description,
      characterBackground: context
    };

    return await this.dialectService.queryDialect(request);
  }

  // 获取角色缓存统计
  getCharacterCacheStats() {
    const totalEntries = this.characterCache.size;
    const expiredEntries = Array.from(this.characterCache.values())
      .filter(entry => Date.now() - entry.timestamp > this.characterCacheTTL).length;

    return {
      totalCacheEntries: totalEntries,
      expiredEntries: expiredEntries,
      cacheHitRate: totalEntries > 0 ? ((totalEntries - expiredEntries) / totalEntries * 100).toFixed(2) + '%' : '0%'
    };
  }

  getConfig() {
    return this.configManager.getConfig();
  }

  updateConfig(updates: Record<string, unknown>) {
    this.configManager.updateConfig(updates);
  }

  // 缓存性能统计
  getCachePerformance() {
    return this.getCacheStats();
  }
}
