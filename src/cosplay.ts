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
  EmotionizeResult,
  ContentSafetyConfig,
  ContentCheckResult,
  CosplayRequest,
  CharacterProfile,
  PersonalityType,
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
  private safetyCache: Map<
    string,
    { result: ContentCheckResult; timestamp: number }
  >;
  private readonly cacheTTL: number = 5 * 60 * 1000; // 5 minutes
  private characterCache: Map<
    string,
    { character: CharacterProfile; timestamp: number }
  > = new Map();
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
    // Generate cache key using simple string
    return (
      text.length.toString() +
      "-" +
      text.charCodeAt(0).toString() +
      "-" +
      text.charCodeAt(Math.min(text.length - 1, 100)).toString()
    );
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheTTL;
  }

  private async checkContentWithCache(
    text: string,
  ): Promise<ContentCheckResult> {
    const cacheKey = this.getCacheKey(text);
    const cached = this.safetyCache.get(cacheKey);

    // Check if cache is valid
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.result;
    }

    const result = await this.contentSafetyChecker.checkContent(text);

    // Cache result
    this.safetyCache.set(cacheKey, {
      result,
      timestamp: Date.now(),
    });

    // Clean up expired cache
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

  // Cache statistics
  getCacheStats() {
    const totalEntries = this.safetyCache.size;
    const validEntries = Array.from(this.safetyCache.values()).filter((entry) =>
      this.isCacheValid(entry.timestamp),
    ).length;
    const expiredEntries = totalEntries - validEntries;

    return {
      totalCacheEntries: totalEntries,
      validEntries: validEntries,
      expiredEntries: expiredEntries,
      cacheHitRate:
        totalEntries > 0
          ? ((validEntries / totalEntries) * 100).toFixed(2) + "%"
          : "0%",
    };
  }

  async cosplayText(request: CosplayRequest): Promise<EmotionizeResult> {
    const startTime = Date.now();

    // Check if content is from LLM - only process LLM content
    if (!request.isLLMContent) {
      // For non-LLM content, return original text without processing
      const defaultConfig = this.configManager.createCharacterConfig(
        "professional",
        1, // lowest intensity
      );
      const emotion = this.emotionAnalyzer.analyzeSentiment(request.text);

      return {
        originalText: request.text,
        emotionizedText: request.text, // No processing for non-LLM content
        emotion,
        personality: defaultConfig,
        processingTime: Math.max(1, Date.now() - startTime),
      };
    }

    // Content safety check with caching (only for LLM content)
    const safetyCheck = await this.checkContentWithCache(request.text);

    // If prohibited content is detected, throw error
    if (safetyCheck.isViolation) {
      throw new Error(
        `Content safety check failed: ${safetyCheck.reason || "Prohibited content detected"}`,
      );
    }

    // Get or generate character profile
    const generatedCharacterProfile =
      await this.getOrGenerateCharacter(request);

    // Get personality config - prioritize generated character profile
    let personality;
    let characterProfile = generatedCharacterProfile || undefined;

    if (!characterProfile) {
      // Fallback to existing character profile
      characterProfile =
        this.personalityManager.getCharacterProfile(request.character || "") ||
        undefined;
    }

    if (characterProfile) {
      // Use custom character personality config
      personality =
        this.personalityManager.characterToPersonalityConfig(
          request.character,
          request.intensity || 3,
        ) ||
        this.configManager.createCharacterConfig(
          request.character as PersonalityType,
          request.intensity || 3,
        );
    } else {
      // Use built-in personality config only if no character profile found
      const config = this.configManager.getConfig();
      personality = this.configManager.createCharacterConfig(
        (request.character || config.defaultPersonality) as PersonalityType,
        request.intensity || config.defaultIntensity,
      );
    }

    // Use LLM to generate character-specific response
    const emotionizedText = await this.generateCharacterResponse(
      request.text,
      (request.character || "sarcastic") as string,
      request.intensity || 3,
      request.context,
      characterProfile,
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

  private async getOrGenerateCharacter(
    request: CosplayRequest,
  ): Promise<CharacterProfile | null> {
    if (!request.character) {
      return null;
    }

    // Check if it's a built-in personality type
    if (
      ["enthusiastic", "sarcastic", "professional"].includes(request.character)
    ) {
      return null; // Use built-in logic
    }

    // Check character cache first
    const cached = this.characterCache.get(request.character);
    if (cached && Date.now() - cached.timestamp < this.characterCacheTTL) {
      return cached.character;
    }

    // Generate character dynamically for non-built-in characters
    const generationRequest: CharacterGenerationRequest = {
      characterName: request.character,
      description: request.context,
      context: request.context,
      intensity: request.intensity,
    };

    try {
      const result =
        await this.dynamicCharacterGenerator.generateCharacter(
          generationRequest,
        );

      if (result.success && result.character) {
        // Cache the generated character
        this.characterCache.set(request.character, {
          character: result.character,
          timestamp: Date.now(),
        });

        // Add to personality manager for future use
        this.personalityManager.addCharacter(result.character);

        return result.character;
      }
    } catch {
      // Silently handle character generation failure
      return null;
    }

    return null; // Fallback to built-in logic if generation fails
  }

  private async generateCharacterResponse(
    text: string,
    character: string,
    intensity: number,
    context?: string,
    characterProfile?: CharacterProfile,
  ): Promise<string> {
    if (!this.contentSafetyChecker.getServer()) {
      // Fallback to character-specific method if server not available
      const characterConfig =
        this.personalityManager.getCharacterEnhancedConfig(character);
      if (characterConfig) {
        const personality =
          this.personalityManager.characterToPersonalityConfig(
            character,
            intensity,
          );

        // Emotion analysis available for future use if needed
        // const emotion = this.emotionAnalyzer.analyzeSentiment(text);

        // Use character-specific personality application
        let result = text;

        // Add character-specific features
        if (intensity >= 3 && characterConfig.signaturePhrases.length > 0) {
          const phrase =
            characterConfig.signaturePhrases[
              Math.floor(
                Math.random() * characterConfig.signaturePhrases.length,
              )
            ];
          if (Math.random() < 0.3) {
            result = phrase + "，" + result;
          }
        }

        if (intensity >= 2 && characterConfig.toneWords.length > 0) {
          const toneWord =
            characterConfig.toneWords[
              Math.floor(Math.random() * characterConfig.toneWords.length)
            ];
          if (Math.random() < 0.4) {
            result = toneWord + "，" + result;
          }
        }

        if (
          personality &&
          personality.useEmojis &&
          intensity >= 4 &&
          characterConfig.emojiPreferences.length > 0
        ) {
          const emoji =
            characterConfig.emojiPreferences[
              Math.floor(
                Math.random() * characterConfig.emojiPreferences.length,
              )
            ];
          if (Math.random() < 0.5) {
            result = result + " " + emoji;
          }
        }

        // Add foreign character native language catchphrase feature
        if (Math.random() < 0.2) {
          // 20% probability
          result = this.addNativeLanguageCatchphrase(
            result,
            character,
            intensity,
          );
        }

        return result;
      } else {
        // Fallback to old method for built-in personalities
        const personality = this.configManager.createCharacterConfig(
          character as PersonalityType,
          intensity,
        );
        const emotion = this.emotionAnalyzer.analyzeSentiment(text);
        let result = this.personalityManager.applyPersonality(
          text,
          emotion,
          personality,
          character,
        );

        // Add foreign character native language catchphrase feature
        if (Math.random() < 0.2) {
          // 20% probability
          result = this.addNativeLanguageCatchphrase(
            result,
            character,
            intensity,
          );
        }

        return result;
      }
    }

    // Build character-specific prompt with enhanced character attributes
    const characterPrompt = this.buildCharacterPrompt(
      character,
      intensity,
      context,
      characterProfile,
    );

    const request = {
      method: "sampling/createMessage",
      params: {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: `${characterPrompt}\n\nOriginal text: ${text}\n\nPlease re-express the above content in this character's voice:`,
            },
          },
        ],
        systemPrompt:
          "You are a professional role-playing assistant who can perfectly imitate the speech styles and characteristics of different characters. Please re-express the user's provided text content according to the requested character persona.",
        maxTokens: 500,
        temperature: Math.max(0.1, intensity * 0.2), // Higher intensity = more creative
      },
    };

    try {
      const response = await Promise.race([
        this.contentSafetyChecker
          .getServer()
          ?.request(request, CreateMessageResultSchema, {}),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("LLM request timeout")), 10000),
        ),
      ] as const);

      const resultText = this.extractTextFromResponse(response);

      // Add foreign character native language catchphrase feature
      let finalResult = resultText || text;
      if (Math.random() < 0.2) {
        // 20% 概率
        finalResult = this.addNativeLanguageCatchphrase(
          finalResult,
          character,
          intensity,
        );
      }

      return finalResult;
    } catch {
      // LLM character generation failed, fallback to old method
      const personality = this.configManager.createCharacterConfig(
        character as PersonalityType,
        intensity,
      );
      const emotion = this.emotionAnalyzer.analyzeSentiment(text);
      let result = this.personalityManager.applyPersonality(
        text,
        emotion,
        personality,
        character,
      );

      // Add foreign character native language catchphrase feature
      if (Math.random() < 0.2) {
        // 20% 概率
        result = this.addNativeLanguageCatchphrase(
          result,
          character,
          intensity,
        );
      }

      return result;
    }
  }

  private buildCharacterPrompt(
    character: string,
    intensity: number,
    context?: string,
    characterProfile?: CharacterProfile,
  ): string {
    // Use passed characterProfile or get new one
    const profile =
      characterProfile ||
      this.personalityManager.getCharacterProfile(character);
    const enhancedConfig = profile
      ? this.personalityManager.getCharacterEnhancedConfig(character)
      : this.personalityManager.getEnhancedConfig(character as PersonalityType);

    let prompt = `You are playing the ${character} character, with the following characteristics:\n`;

    if (profile) {
      // Use detailed character configuration
      prompt += `- Character Name: ${profile.name}\n`;
      prompt += `- Character Description: ${profile.description}\n`;
      if (profile.category) {
        prompt += `- Character Category: ${profile.category}\n`;
      }
    }

    if (enhancedConfig) {
      prompt += `- Background Setting: ${enhancedConfig.backgroundContext}\n`;
      prompt += `- Speaking Style: ${enhancedConfig.languageStyle}\n`;
      prompt += `- Attitude Tendency: ${enhancedConfig.attitude}\n`;
      prompt += `- Signature Lines: ${enhancedConfig.signaturePhrases.join(", ")}\n`;
      prompt += `- Common Tone Words: ${enhancedConfig.toneWords.join(", ")}\n`;
      prompt += `- Expression Patterns: ${enhancedConfig.speechPatterns.join(", ")}\n`;

      // Add dialect information
      if (enhancedConfig.dialect) {
        const dialect = enhancedConfig.dialect;
        prompt += `- Dialect Info: ${dialect.name} (${dialect.region})\n`;
        prompt += `- Dialect Features: ${dialect.characteristics.join(", ")}\n`;
        prompt += `- Dialect Common Phrases: ${dialect.commonPhrases.join(", ")}\n`;
        if (dialect.slangWords.length > 0) {
          prompt += `- Dialect Vocabulary: ${dialect.slangWords.join(", ")}\n`;
        }
        if (dialect.grammarPatterns.length > 0) {
          prompt += `- Dialect Grammar Features: ${dialect.grammarPatterns.join(", ")}\n`;
        }
      }
    }

    prompt += `- Performance Intensity: ${intensity}/5 (higher intensity = more prominent character features)\n`;

    if (context) {
      prompt += `- Special Context: ${context}\n`;
    }

    prompt += `\nPlease fully immerse yourself in this character and re-express the original text in ${character}'s tone and style.`;

    return prompt;
  }

  private extractTextFromResponse(response: unknown): string | null {
    if (response && typeof response === "object") {
      // Handle MCP response format
      if ("content" in response && Array.isArray(response.content)) {
        const textContent = response.content.find(
          (item: { type: string; text?: string }) => item.type === "text",
        );
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

  // Add foreign character native language catchphrase feature
  private addNativeLanguageCatchphrase(
    text: string,
    character: string,
    intensity: number,
  ): string {
    const foreignCharacters: Record<
      string,
      { catchphrases: string[]; probability: number }
    > = {
      奥特曼: {
        catchphrases: [
          "シャイニング！",
          "ウルトラマン！",
          "光の国！",
          "スペシウム光線！",
        ],
        probability: 0.3,
      },
      特朗普: {
        catchphrases: [
          "Make America Great Again!",
          "Tremendous!",
          "Believe me!",
          "Sad!",
          "Fake news!",
        ],
        probability: 0.4,
      },
      米莱: {
        catchphrases: [
          "¡Libertad!",
          "¡Viva la libertad!",
          "¡No hay alternativa!",
          "¡Abajo el socialismo!",
        ],
        probability: 0.3,
      },
      Jack: {
        catchphrases: [
          "I top your lung!",
          "You are Dao Ge?",
          "I am international killer!",
        ],
        probability: 0.5,
      },
    };

    const charConfig = foreignCharacters[character];
    if (!charConfig) {
      return text; // If not a foreign character, return original text directly
    }

    // Adjust probability based on intensity
    const adjustedProbability = charConfig.probability * (intensity / 5);

    if (Math.random() < adjustedProbability) {
      const catchphrase =
        charConfig.catchphrases[
          Math.floor(Math.random() * charConfig.catchphrases.length)
        ];

      // Randomly decide insertion position (beginning, end, or middle)
      const position = Math.random();
      if (position < 0.4) {
        return catchphrase + "！" + text;
      } else if (position < 0.7) {
        return text + " " + catchphrase + "！";
      } else {
        // Insert into middle of sentence
        const words = text.split("，");
        if (words.length > 1) {
          const insertIndex =
            Math.floor(Math.random() * (words.length - 1)) + 1;
          words.splice(insertIndex, 0, catchphrase + "！");
          return words.join("，");
        }
        return text + " " + catchphrase + "！";
      }
    }

    return text;
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
    return [
      "enthusiastic",
      "sarcastic",
      "professional",
      ...this.getAllCharacters().map((c) => c.name),
    ];
  }

  // New: Character management functionality
  getAllCharacters() {
    return this.personalityManager.getAllCharacters();
  }

  getCharacterProfile(name: string) {
    return this.personalityManager.getCharacterProfile(name);
  }

  addCharacter(character: CharacterProfile) {
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

  // New: Dynamic character generation functionality
  async generateCharacter(request: CharacterGenerationRequest) {
    // Check character cache first
    const cacheKey = `${request.characterName}-${request.description || ""}-${request.intensity || 3}`;
    const cached = this.characterCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.characterCacheTTL) {
      return {
        success: true,
        character: cached.character,
      };
    }

    // Generate character dynamically
    const result =
      await this.dynamicCharacterGenerator.generateCharacter(request);

    // Cache the result if successful
    if (result.success && result.character) {
      this.characterCache.set(cacheKey, {
        character: result.character,
        timestamp: Date.now(),
      });
    }

    return result;
  }

  // Clear character cache
  clearCharacterCache() {
    this.characterCache.clear();
  }

  // Dialect query functionality
  async queryCharacterDialect(
    characterName: string,
    description?: string,
    context?: string,
  ) {
    const request: DialectQueryRequest = {
      characterName,
      characterDescription: description,
      characterBackground: context,
    };

    return await this.dialectService.queryDialect(request);
  }

  // Get character cache statistics
  getCharacterCacheStats() {
    const totalEntries = this.characterCache.size;
    const expiredEntries = Array.from(this.characterCache.values()).filter(
      (entry) => Date.now() - entry.timestamp > this.characterCacheTTL,
    ).length;

    return {
      totalCacheEntries: totalEntries,
      expiredEntries: expiredEntries,
      cacheHitRate:
        totalEntries > 0
          ? (((totalEntries - expiredEntries) / totalEntries) * 100).toFixed(
              2,
            ) + "%"
          : "0%",
    };
  }

  getConfig() {
    return this.configManager.getConfig();
  }

  updateConfig(updates: Record<string, unknown>) {
    this.configManager.updateConfig(updates);
  }

  // Cache performance statistics
  getCachePerformance() {
    return this.getCacheStats();
  }
}
