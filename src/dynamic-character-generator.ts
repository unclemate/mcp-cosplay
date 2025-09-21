import { CharacterProfile, EnhancedPersonalityConfig } from "./types.js";
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
  private promptTemplate = `你是一个专业的角色分析专家，擅长从角色名称和描述中提取出完整的人格特征，包括方言和语言特点。

请为以下角色生成详细的人格配置，以JSON格式返回：

角色名称: {{characterName}}
角色描述: {{description}}
{{#if context}}特殊上下文: {{context}}{{/if}}
{{#if examples}}经典台词示例: {{examples}}{{/if}}

请生成以下人格特征，特别注意考虑该角色可能具有的方言特点、地域特色或历史语言风格：
1. signaturePhrases: 5个标志性台词或口头禅（考虑方言特色）
2. toneWords: 5个常用语气词（考虑地方发音特点）
3. attitude: 态度倾向 (friendly, serious, humorous, professional, enthusiastic, sarcastic, critical, contemplative等)
4. speechPatterns: 4个表达模式特点（包括方言表达习惯）
5. backgroundContext: 详细背景设定 (50-100字，包括地域、时代背景)
6. emojiPreferences: 4个偏好表情符号
7. languageStyle: 语言风格描述（包括方言特色）

请严格按照以下JSON格式返回，不要添加其他解释：
{
  "signaturePhrases": ["台词1", "台词2", "台词3", "台词4", "台词5"],
  "toneWords": ["语气词1", "语气词2", "语气词3", "语气词4", "语气词5"],
  "attitude": "态度描述",
  "speechPatterns": ["模式1", "模式2", "模式3", "模式4"],
  "backgroundContext": "详细背景设定",
  "emojiPreferences": ["emoji1", "emoji2", "emoji3", "emoji4"],
  "languageStyle": "语言风格描述"
}`;

  private dialectService: DialectService;

  constructor(private server?: any) {
    this.dialectService = new DialectService(server);
  }

  async generateCharacter(request: CharacterGenerationRequest): Promise<CharacterGenerationResult> {
    if (!this.server) {
      // 如果没有服务器，返回基于规则的简化版本
      return this.generateFallbackCharacter(request);
    }

    try {
      // 并行生成人格配置和方言配置
      const [personalityPromise, dialectPromise] = await Promise.allSettled([
        this.generatePersonalityConfig(request),
        this.generateDialectConfig(request)
      ]);

      const personalityConfig = personalityPromise.status === 'fulfilled'
        ? personalityPromise.value
        : this.getFallbackPersonalityConfig(request);

      const dialectConfig = dialectPromise.status === 'fulfilled' && dialectPromise.value.success
        ? dialectPromise.value.dialect
        : undefined;

      // 将方言配置添加到人格配置中
      const enhancedConfig = {
        ...personalityConfig,
        dialect: dialectConfig
      };

      const character: CharacterProfile = {
        name: request.characterName,
        description: request.description || `角色: ${request.characterName}`,
        personality: enhancedConfig,
        examples: request.examples,
        category: this.inferCategory(request.characterName)
      };

      return { success: true, character };
    } catch (error) {
      console.error('Character generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async generatePersonalityConfig(request: CharacterGenerationRequest): Promise<EnhancedPersonalityConfig> {
    const prompt = this.buildPrompt(request);
    const response = await this.callLLM(prompt);
    return this.parseLLMResponse(response);
  }

  private async generateDialectConfig(request: CharacterGenerationRequest): Promise<any> {
    const dialectRequest: DialectQueryRequest = {
      characterName: request.characterName,
      characterDescription: request.description,
      characterBackground: request.context,
      region: this.extractRegionFromContext(request.context)
    };

    return await this.dialectService.queryDialect(dialectRequest);
  }

  private extractRegionFromContext(context?: string): string | undefined {
    if (!context) return undefined;

    // 简单的地区提取逻辑
    const regionKeywords = [
      '广东', '广西', '北京', '上海', '四川', '重庆', '湖南', '湖北',
      '江苏', '浙江', '安徽', '福建', '江西', '山东', '山西', '河南',
      '河北', '辽宁', '吉林', '黑龙江', '陕西', '甘肃', '青海', '新疆',
      '西藏', '云南', '贵州', '海南', '台湾', '香港', '澳门',
      '东北', '华北', '华东', '华南', '华中', '西北', '西南'
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
      .replace('{{characterName}}', request.characterName)
      .replace('{{description}}', request.description || `角色: ${request.characterName}`);

    if (request.context) {
      prompt = prompt.replace('{{#if context}}特殊上下文: {{context}}{{/if}}', `特殊上下文: ${request.context}`);
    } else {
      prompt = prompt.replace('{{#if context}}特殊上下文: {{context}}{{/if}}', '');
    }

    if (request.examples && request.examples.length > 0) {
      prompt = prompt.replace('{{#if examples}}经典台词示例: {{examples}}{{/if}}',
        `经典台词示例: ${request.examples.slice(0, 3).join('、')}`);
    } else {
      prompt = prompt.replace('{{#if examples}}经典台词示例: {{examples}}{{/if}}', '');
    }

    return prompt;
  }

  private async callLLM(prompt: string): Promise<any> {
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
        systemPrompt: "你是一个专业的角色分析专家，请严格按照要求的JSON格式返回人格配置。",
        maxTokens: 1000,
        temperature: 0.7,
      },
    };

    const response = await this.server!.request(request);
    return this.extractTextFromResponse(response);
  }

  private parseLLMResponse(response: string): EnhancedPersonalityConfig {
    try {
      // 尝试直接解析JSON
      const parsed = JSON.parse(response);
      return {
        signaturePhrases: Array.isArray(parsed.signaturePhrases) ? parsed.signaturePhrases : [],
        toneWords: Array.isArray(parsed.toneWords) ? parsed.toneWords : [],
        attitude: parsed.attitude || "friendly",
        speechPatterns: Array.isArray(parsed.speechPatterns) ? parsed.speechPatterns : [],
        backgroundContext: parsed.backgroundContext || "",
        emojiPreferences: Array.isArray(parsed.emojiPreferences) ? parsed.emojiPreferences : [],
        languageStyle: parsed.languageStyle || "casual"
      };
    } catch (error) {
      // 如果JSON解析失败，尝试从文本中提取
      return this.extractFromText(response);
    }
  }

  private extractFromText(text: string): EnhancedPersonalityConfig {
    // 简单的文本提取逻辑
    const lines = text.split('\n');
    const result: EnhancedPersonalityConfig = {
      signaturePhrases: [],
      toneWords: [],
      attitude: "friendly",
      speechPatterns: [],
      backgroundContext: "",
      emojiPreferences: [],
      languageStyle: "casual"
    };

    lines.forEach(line => {
      if (line.includes('signaturePhrases') || line.includes('标志性台词')) {
        result.signaturePhrases = this.extractArrayFromLine(line);
      } else if (line.includes('toneWords') || line.includes('语气词')) {
        result.toneWords = this.extractArrayFromLine(line);
      } else if (line.includes('attitude') || line.includes('态度')) {
        result.attitude = this.extractValueFromLine(line);
      } else if (line.includes('speechPatterns') || line.includes('表达模式')) {
        result.speechPatterns = this.extractArrayFromLine(line);
      } else if (line.includes('backgroundContext') || line.includes('背景')) {
        result.backgroundContext = this.extractValueFromLine(line);
      } else if (line.includes('emojiPreferences') || line.includes('表情')) {
        result.emojiPreferences = this.extractArrayFromLine(line);
      } else if (line.includes('languageStyle') || line.includes('语言风格')) {
        result.languageStyle = this.extractValueFromLine(line);
      }
    });

    return result;
  }

  private extractArrayFromLine(line: string): string[] {
    const match = line.match(/\[(.*?)\]/);
    if (match) {
      return match[1].split(',').map(item => item.trim().replace(/['"]/g, ''));
    }
    return [];
  }

  private extractValueFromLine(line: string): string {
    const match = line.match(/[:=]\s*["']?([^"',\n]+)["']?/);
    return match ? match[1].trim() : "";
  }

  setServer(server: any): void {
    this.server = server;
    this.dialectService.setServer(server);
  }

  private getFallbackPersonalityConfig(request: CharacterGenerationRequest): EnhancedPersonalityConfig {
    return {
      signaturePhrases: [
        `我是${request.characterName}`,
        `这就是${request.characterName}的风格`,
        `${request.characterName}告诉你`
      ],
      toneWords: ['嗯', '哦', '啊', '呢', '吧'],
      attitude: 'neutral',
      speechPatterns: ['直接表达', '第一人称'],
      backgroundContext: `${request.characterName}的角色设定`,
      emojiPreferences: ['😊', '🎭', '✨'],
      languageStyle: 'standard'
    };
  }

  private generateFallbackCharacter(request: CharacterGenerationRequest): CharacterGenerationResult {
    // 基于名称生成简化的角色配置
    const name = request.characterName.toLowerCase();
    let attitude = "friendly";
    let emojiPreferences = ["😊", "👍", "✨", "💫"];

    // 简单的规则来推断角色类型
    if (name.includes('老师') || name.includes('教授') || name.includes('专家')) {
      attitude = "professional";
      emojiPreferences = ["📚", "🎓", "💼", "📊"];
    } else if (name.includes('朋友') || name.includes('伙伴') || name.includes('哆啦')) {
      attitude = "friendly";
      emojiPreferences = ["🐱", "💫", "✨", "😊"];
    } else if (name.includes('老板') || name.includes('领导') || name.includes('王思聪')) {
      attitude = "superior";
      emojiPreferences = ["💰", "🎭", "👀", "🙃"];
    }

    // 生成fallback方言配置
    const fallbackDialect = this.generateFallbackDialect(request.characterName);

    const character: CharacterProfile = {
      name: request.characterName,
      description: request.description || `角色: ${request.characterName}`,
      personality: {
        signaturePhrases: [
          `我是${request.characterName}`,
          "让我想想",
          "你知道吗",
          "我觉得",
          "没问题"
        ],
        toneWords: ["嗯", "哦", "啊", "呢", "吧"],
        attitude,
        speechPatterns: ["友好交流", "积极回应", "表达观点", "给出建议"],
        backgroundContext: request.description || `一个独特的角色：${request.characterName}`,
        emojiPreferences,
        languageStyle: "自然流畅的对话风格",
        dialect: fallbackDialect
      },
      examples: request.examples,
      category: this.inferCategory(request.characterName)
    };

    return { success: true, character };
  }

  private generateFallbackDialect(characterName: string) {
    // 基于角色名称的简单方言推测
    const dialectMap: Record<string, any> = {
      '洪秀全': {
        name: '广东客家话',
        region: '广东花县',
        characteristics: ['客家方言特点', '古汉语保留', '语气庄重'],
        commonPhrases: ['天父', '天国', '清妖', '万岁', '天王'],
        slangWords: ['天父', '天国', '清妖'],
        grammarPatterns: ['使用古典句式', '宗教用语'],
        exampleSentences: ['天父下凡，我乃真命天子', '清妖必灭，天国必兴']
      },
      '孙中山': {
        name: '广东中山话',
        region: '广东中山',
        characteristics: ['粤语特点', '近代汉语', '革命用语'],
        commonPhrases: ['革命', '共和', '民国', '同志', '自由'],
        slangWords: ['革命', '共和'],
        grammarPatterns: ['现代汉语', '政治术语'],
        exampleSentences: ['革命尚未成功，同志仍需努力']
      }
    };

    return dialectMap[characterName] || {
      name: '标准官话',
      region: '全国',
      characteristics: ['标准汉语'],
      commonPhrases: ['是', '不是', '很好', '不错'],
      slangWords: [],
      grammarPatterns: ['现代汉语语法'],
      exampleSentences: ['这是一个标准表达的例句']
    };
  }

  private inferCategory(characterName: string): string {
    const name = characterName.toLowerCase();

    if (name.includes('哆啦') || name.includes('蜡笔') || name.includes('火影') || name.includes('海贼')) {
      return "动漫";
    } else if (name.includes('老师') || name.includes('教授') || name.includes('专家')) {
      return "专业人士";
    } else if (name.includes('明星') || name.includes('演员') || name.includes('歌手')) {
      return "娱乐明星";
    } else if (name.includes('老板') || name.includes('总裁') || name.includes('领导')) {
      return "商界人士";
    } else {
      return "自定义角色";
    }
  }

  private extractTextFromResponse(response: unknown): string {
    if (response && typeof response === "object") {
      if ("content" in response && Array.isArray(response.content)) {
        const textContent = response.content.find((item: any) => item.type === "text");
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