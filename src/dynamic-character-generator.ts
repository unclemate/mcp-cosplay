import {
  CharacterProfile,
  EnhancedPersonalityConfig,
  DialectConfig,
} from "./types.js";
import { DialectService, DialectQueryRequest } from "./dialect-service.js";

export interface CharacterGenerationRequest {
  characterName: string;
  description?: string;
  context?: string;
  intensity?: number;
  examples?: string[];
}

export interface CharacterGenerationResult {
  success: boolean;
  character?: CharacterProfile;
  error?: string;
}

export class DynamicCharacterGenerator {
  private promptTemplate = `You are a professional character analysis expert who specializes in extracting complete personality traits from character names and descriptions, including dialect and language features.

Please generate detailed personality configuration for the following character in JSON format:

Character Name: {{characterName}}
Character Description: {{description}}
{{#if context}}Special Context: {{context}}{{/if}}
{{#if examples}}Classic Line Examples: {{examples}}{{/if}}

Please generate the following personality traits, paying special attention to the dialect features, regional characteristics, or historical language styles the character may have:
1. signaturePhrases: 5 signature lines or catchphrases (consider dialect features)
2. toneWords: 5 common tone words (consider regional pronunciation features)
3. attitude: attitude tendency (friendly, serious, humorous, professional, enthusiastic, sarcastic, critical, contemplative, etc.)
4. speechPatterns: 4 expression pattern features (including dialect expression habits)
5. backgroundContext: detailed background setting (50-100 words, including region, era background)
6. emojiPreferences: 4 preferred emoji symbols
7. languageStyle: language style description (including dialect features)

Please strictly return in the following JSON format without adding other explanations:
{
  "signaturePhrases": ["line1", "line2", "line3", "line4", "line5"],
  "toneWords": ["tone1", "tone2", "tone3", "tone4", "tone5"],
  "attitude": "attitude description",
  "speechPatterns": ["pattern1", "pattern2", "pattern3", "pattern4"],
  "backgroundContext": "detailed background setting",
  "emojiPreferences": ["emoji1", "emoji2", "emoji3", "emoji4"],
  "languageStyle": "language style description"
}`;

  private dialectService: DialectService;

  constructor(private server?: unknown) {
    this.dialectService = new DialectService(server);
  }

  async generateCharacter(
    request: CharacterGenerationRequest,
  ): Promise<CharacterGenerationResult> {
    if (!this.server) {
      // If no server, return rule-based simplified version
      return this.generateFallbackCharacter(request);
    }

    try {
      // Generate personality configuration and dialect configuration in parallel
      const [personalityPromise, dialectPromise] = await Promise.allSettled([
        this.generatePersonalityConfig(request),
        this.generateDialectConfig(request),
      ]);

      const personalityConfig =
        personalityPromise.status === "fulfilled"
          ? personalityPromise.value
          : this.getFallbackPersonalityConfig(request);

      const dialectConfig =
        dialectPromise.status === "fulfilled" && dialectPromise.value.success
          ? dialectPromise.value.dialect
          : undefined;

      // Add dialect configuration to personality configuration
      const enhancedConfig = {
        ...personalityConfig,
        dialect: dialectConfig as DialectConfig | undefined,
      };

      const character: CharacterProfile = {
        name: request.characterName,
        description:
          request.description || `Character: ${request.characterName}`,
        personality: enhancedConfig,
        examples: request.examples,
        category: this.inferCategory(request.characterName),
      };

      return { success: true, character };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async generatePersonalityConfig(
    request: CharacterGenerationRequest,
  ): Promise<EnhancedPersonalityConfig> {
    const prompt = this.buildPrompt(request);
    const response = await this.callLLM(prompt);
    return this.parseLLMResponse(response);
  }

  private async generateDialectConfig(
    request: CharacterGenerationRequest,
  ): Promise<{ success: boolean; dialect?: unknown }> {
    const dialectRequest: DialectQueryRequest = {
      characterName: request.characterName,
      characterDescription: request.description,
      characterBackground: request.context,
      region: this.extractRegionFromContext(request.context),
    };

    return await this.dialectService.queryDialect(dialectRequest);
  }

  private extractRegionFromContext(context?: string): string | undefined {
    if (!context) return undefined;

    // Simple region extraction logic
    const regionKeywords = [
      "广东",
      "广西",
      "北京",
      "上海",
      "四川",
      "重庆",
      "湖南",
      "湖北",
      "江苏",
      "浙江",
      "安徽",
      "福建",
      "江西",
      "山东",
      "山西",
      "河南",
      "河北",
      "辽宁",
      "吉林",
      "黑龙江",
      "陕西",
      "甘肃",
      "青海",
      "新疆",
      "西藏",
      "云南",
      "贵州",
      "海南",
      "台湾",
      "香港",
      "澳门",
      "东北",
      "华北",
      "华东",
      "华南",
      "华中",
      "西北",
      "西南",
    ];

    for (const keyword of regionKeywords) {
      if (context.includes(keyword)) {
        return keyword;
      }
    }

    return undefined;
  }

  private buildPrompt(request: CharacterGenerationRequest): string {
    let prompt = this.promptTemplate
      .replace("{{characterName}}", request.characterName)
      .replace(
        "{{description}}",
        request.description || `Character: ${request.characterName}`,
      );

    if (request.context) {
      prompt = prompt.replace(
        "{{#if context}}Special Context: {{context}}{{/if}}",
        `Special Context: ${request.context}`,
      );
    } else {
      prompt = prompt.replace(
        "{{#if context}}Special Context: {{context}}{{/if}}",
        "",
      );
    }

    if (request.examples && request.examples.length > 0) {
      prompt = prompt.replace(
        "{{#if examples}}Classic Line Examples: {{examples}}{{/if}}",
        `Classic Line Examples: ${request.examples.slice(0, 3).join(", ")}`,
      );
    } else {
      prompt = prompt.replace(
        "{{#if examples}}Classic Line Examples: {{examples}}{{/if}}",
        "",
      );
    }

    return prompt;
  }

  private async callLLM(prompt: string): Promise<string> {
    const request = {
      method: "sampling/createMessage",
      params: {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text: prompt,
            },
          },
        ],
        systemPrompt:
          "You are a professional character analysis expert, please return the personality configuration strictly in the required JSON format.",
        maxTokens: 1000,
        temperature: 0.7,
      },
    };

    const response = await (
      this.server as { request: (req: unknown) => Promise<string> }
    ).request(request);
    return this.extractTextFromResponse(response);
  }

  private parseLLMResponse(response: string): EnhancedPersonalityConfig {
    try {
      // Try to parse JSON directly
      const parsed = JSON.parse(response);
      return {
        signaturePhrases: Array.isArray(parsed.signaturePhrases)
          ? parsed.signaturePhrases
          : [],
        toneWords: Array.isArray(parsed.toneWords) ? parsed.toneWords : [],
        attitude: parsed.attitude || "friendly",
        speechPatterns: Array.isArray(parsed.speechPatterns)
          ? parsed.speechPatterns
          : [],
        backgroundContext: parsed.backgroundContext || "",
        emojiPreferences: Array.isArray(parsed.emojiPreferences)
          ? parsed.emojiPreferences
          : [],
        languageStyle: parsed.languageStyle || "casual",
      };
    } catch {
      // If JSON parsing fails, try to extract from text
      return this.extractFromText(response);
    }
  }

  private extractFromText(text: string): EnhancedPersonalityConfig {
    // Simple text extraction logic
    const lines = text.split("\n");
    const result: EnhancedPersonalityConfig = {
      signaturePhrases: [],
      toneWords: [],
      attitude: "friendly",
      speechPatterns: [],
      backgroundContext: "",
      emojiPreferences: [],
      languageStyle: "casual",
    };

    lines.forEach((line) => {
      if (
        line.includes("signaturePhrases") ||
        line.includes("signature lines")
      ) {
        result.signaturePhrases = this.extractArrayFromLine(line);
      } else if (line.includes("toneWords") || line.includes("tone words")) {
        result.toneWords = this.extractArrayFromLine(line);
      } else if (line.includes("attitude") || line.includes("attitude")) {
        result.attitude = this.extractValueFromLine(line);
      } else if (
        line.includes("speechPatterns") ||
        line.includes("expression patterns")
      ) {
        result.speechPatterns = this.extractArrayFromLine(line);
      } else if (
        line.includes("backgroundContext") ||
        line.includes("background")
      ) {
        result.backgroundContext = this.extractValueFromLine(line);
      } else if (line.includes("emojiPreferences") || line.includes("emoji")) {
        result.emojiPreferences = this.extractArrayFromLine(line);
      } else if (
        line.includes("languageStyle") ||
        line.includes("language style")
      ) {
        result.languageStyle = this.extractValueFromLine(line);
      }
    });

    return result;
  }

  private extractArrayFromLine(line: string): string[] {
    const match = line.match(/\[(.*?)\]/);
    if (match) {
      return match[1]
        .split(",")
        .map((item) => item.trim().replace(/['"]/g, ""));
    }
    return [];
  }

  private extractValueFromLine(line: string): string {
    const match = line.match(/[:=]\s*["']?([^"',\n]+)["']?/);
    return match ? match[1].trim() : "";
  }

  setServer(server: unknown): void {
    this.server = server;
    this.dialectService.setServer(server);
  }

  private getFallbackPersonalityConfig(
    request: CharacterGenerationRequest,
  ): EnhancedPersonalityConfig {
    return {
      signaturePhrases: [
        `I am ${request.characterName}`,
        `This is ${request.characterName}'s style`,
        `${request.characterName} tells you`,
      ],
      toneWords: ["hmm", "oh", "ah", "ne", "ba"],
      attitude: "neutral",
      speechPatterns: ["direct expression", "first person"],
      backgroundContext: `${request.characterName}'s character setting`,
      emojiPreferences: ["😊", "🎭", "✨"],
      languageStyle: "standard",
    };
  }

  private generateFallbackCharacter(
    request: CharacterGenerationRequest,
  ): CharacterGenerationResult {
    // Generate simplified character configuration based on name
    const name = request.characterName.toLowerCase();
    let attitude = "friendly";
    let emojiPreferences = ["😊", "👍", "✨", "💫"];

    // Simple rules to infer character type
    if (
      name.includes("老师") ||
      name.includes("教授") ||
      name.includes("专家")
    ) {
      attitude = "professional";
      emojiPreferences = ["📚", "🎓", "💼", "📊"];
    } else if (
      name.includes("朋友") ||
      name.includes("伙伴") ||
      name.includes("哆啦")
    ) {
      attitude = "friendly";
      emojiPreferences = ["🐱", "💫", "✨", "😊"];
    } else if (name.includes("老板") || name.includes("领导")) {
      attitude = "superior";
      emojiPreferences = ["💰", "🎭", "👀", "🙃"];
    }

    // Generate fallback dialect configuration
    const fallbackDialect = this.generateFallbackDialect(request.characterName);

    const character: CharacterProfile = {
      name: request.characterName,
      description: request.description || `Character: ${request.characterName}`,
      personality: {
        signaturePhrases: [
          `I am ${request.characterName}`,
          "Let me think",
          "Do you know",
          "I think",
          "No problem",
        ],
        toneWords: ["hmm", "oh", "ah", "ne", "ba"],
        attitude,
        speechPatterns: [
          "friendly communication",
          "positive response",
          "expressing opinions",
          "giving suggestions",
        ],
        backgroundContext:
          request.description || `A unique character: ${request.characterName}`,
        emojiPreferences,
        languageStyle: "Natural and smooth conversational style",
        dialect: fallbackDialect,
      },
      examples: request.examples,
      category: this.inferCategory(request.characterName),
    };

    return { success: true, character };
  }

  private generateFallbackDialect(characterName: string) {
    // Simple dialect inference based on character name
    const dialectMap: Record<string, DialectConfig> = {
      洪秀全: {
        name: "广东客家话",
        region: "广东花县",
        characteristics: ["客家方言特点", "古汉语保留", "语气庄重"],
        commonPhrases: ["天父", "天国", "清妖", "万岁", "天王"],
        pronunciationNotes: ["客家话发音特点", "保留古汉语音韵"],
        slangWords: ["天父", "天国", "清妖"],
        grammarPatterns: ["使用古典句式", "宗教用语"],
        exampleSentences: ["天父下凡，我乃真命天子", "清妖必灭，天国必兴"],
      },
      孙中山: {
        name: "广东中山话",
        region: "广东中山",
        characteristics: ["粤语特点", "近代汉语", "革命用语"],
        commonPhrases: ["革命", "共和", "民国", "同志", "自由"],
        pronunciationNotes: ["粤语中山口音", "近代国语发音"],
        slangWords: ["革命", "共和"],
        grammarPatterns: ["现代汉语", "政治术语"],
        exampleSentences: ["革命尚未成功，同志仍需努力"],
      },
    };

    return (
      dialectMap[characterName] || {
        name: "标准官话",
        region: "全国",
        characteristics: ["标准汉语"],
        commonPhrases: ["是", "不是", "很好", "不错"],
        pronunciationNotes: ["标准普通话发音"],
        slangWords: [],
        grammarPatterns: ["现代汉语语法"],
        exampleSentences: ["这是一个标准表达的例句"],
      }
    );
  }

  private inferCategory(characterName: string): string {
    const name = characterName.toLowerCase();

    if (
      name.includes("dora") ||
      name.includes("crayon") ||
      name.includes("naruto") ||
      name.includes("onepiece") ||
      name.includes("哆啦") ||
      name.includes("蜡笔") ||
      name.includes("火影") ||
      name.includes("海贼") ||
      name.includes("奥特曼")
    ) {
      return "anime";
    } else if (
      name.includes("teacher") ||
      name.includes("professor") ||
      name.includes("expert") ||
      name.includes("老师") ||
      name.includes("教授") ||
      name.includes("专家")
    ) {
      return "professional";
    } else if (
      name.includes("star") ||
      name.includes("actor") ||
      name.includes("singer") ||
      name.includes("明星") ||
      name.includes("演员") ||
      name.includes("歌手")
    ) {
      return "entertainment";
    } else if (
      name.includes("boss") ||
      name.includes("ceo") ||
      name.includes("leader") ||
      name.includes("老板") ||
      name.includes("领导") ||
      name.includes("总裁")
    ) {
      return "business";
    } else {
      return "custom";
    }
  }

  private extractTextFromResponse(response: unknown): string {
    if (response && typeof response === "object") {
      if ("content" in response && Array.isArray(response.content)) {
        const textContent = response.content.find(
          (item: { type: string; text?: string }) => item.type === "text",
        );
        if (textContent && "text" in textContent) {
          return textContent.text;
        }
      }
      if ("text" in response && typeof response.text === "string") {
        return response.text;
      }
    }
    return "";
  }
}
