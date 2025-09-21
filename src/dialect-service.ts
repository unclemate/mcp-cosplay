import { DialectConfig } from "./types.js";

export interface DialectQueryRequest {
  characterName: string;
  characterDescription?: string;
  characterBackground?: string;
  historicalPeriod?: string;
  region?: string;
}

export interface DialectQueryResult {
  success: boolean;
  dialect?: DialectConfig;
  error?: string;
}

export class DialectService {
  private promptTemplate = `你是一个专业的方言和语言文化专家，擅长分析历史人物和角色的语言特点。

请为以下角色分析其可能使用的方言或语言特点：

角色名称: {{characterName}}
{{#if characterDescription}}角色描述: {{characterDescription}}{{/if}}
{{#if characterBackground}}角色背景: {{characterBackground}}{{/if}}
{{#if historicalPeriod}}历史时期: {{historicalPeriod}}{{/if}}
{{#if region}}地区信息: {{region}}{{/if}}

请分析并生成该角色的方言特点，包括：
1. 方言名称 - 该角色可能使用的方言名称
2. 地区 - 该方言的主要使用地区
3. 方言特点 - 该方言的主要语言特点（3-5个）
4. 常用短语 - 该方言中的常用短语或口头禅（4-6个）
5. 发音特点 - 该方言的发音特点说明（2-3个）
6. 方言词汇 - 该方言的特色词汇（4-6个）
7. 语法特点 - 该方言的语法特点（2-3个）
8. 例句 - 使用该方言的例句（2-3个）

请严格按照以下JSON格式返回，不要添加其他解释：
{
  "name": "方言名称",
  "region": "地区",
  "characteristics": ["特点1", "特点2", "特点3", "特点4", "特点5"],
  "commonPhrases": ["短语1", "短语2", "短语3", "短语4", "短语5", "短语6"],
  "pronunciationNotes": ["发音特点1", "发音特点2", "发音特点3"],
  "slangWords": ["词汇1", "词汇2", "词汇3", "词汇4", "词汇5", "词汇6"],
  "grammarPatterns": ["语法特点1", "语法特点2", "语法特点3"],
  "exampleSentences": ["例句1", "例句2", "例句3"]
}

如果该角色没有明显的方言特点，请基于其历史背景、地区信息或人物特点推测最可能的方言倾向。`;

  constructor(private server?: unknown) {}

  setServer(server: unknown): void {
    this.server = server;
  }

  async queryDialect(
    request: DialectQueryRequest,
  ): Promise<DialectQueryResult> {
    if (!this.server) {
      // 如果没有服务器，返回基于规则的简化版本
      return this.generateFallbackDialect(request);
    }

    try {
      const prompt = this.buildPrompt(request);
      const response = await this.callLLM(prompt);
      const dialectConfig = this.parseLLMResponse(response);

      return { success: true, dialect: dialectConfig };
    } catch {
      // 当LLM失败时，使用fallback方言
      return this.generateFallbackDialect(request);
    }
  }

  private buildPrompt(request: DialectQueryRequest): string {
    let prompt = this.promptTemplate.replace(
      "{{characterName}}",
      request.characterName,
    );

    if (request.characterDescription) {
      prompt = prompt.replace(
        "{{#if characterDescription}}角色描述: {{characterDescription}}{{/if}}",
        `角色描述: ${request.characterDescription}`,
      );
    } else {
      prompt = prompt.replace(
        "{{#if characterDescription}}角色描述: {{characterDescription}}{{/if}}",
        "",
      );
    }

    if (request.characterBackground) {
      prompt = prompt.replace(
        "{{#if characterBackground}}角色背景: {{characterBackground}}{{/if}}",
        `角色背景: ${request.characterBackground}`,
      );
    } else {
      prompt = prompt.replace(
        "{{#if characterBackground}}角色背景: {{characterBackground}}{{/if}}",
        "",
      );
    }

    if (request.historicalPeriod) {
      prompt = prompt.replace(
        "{{#if historicalPeriod}}历史时期: {{historicalPeriod}}{{/if}}",
        `历史时期: ${request.historicalPeriod}`,
      );
    } else {
      prompt = prompt.replace(
        "{{#if historicalPeriod}}历史时期: {{historicalPeriod}}{{/if}}",
        "",
      );
    }

    if (request.region) {
      prompt = prompt.replace(
        "{{#if region}}地区信息: {{region}}{{/if}}",
        `地区信息: ${request.region}`,
      );
    } else {
      prompt = prompt.replace("{{#if region}}地区信息: {{region}}{{/if}}", "");
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
          "你是一个专业的方言和语言文化专家，请准确分析角色的语言特点并返回JSON格式的结果。",
        maxTokens: 1000,
        temperature: 0.3,
      },
    };

    const response = await (
      this.server as {
        request: (
          req: unknown,
          schema: unknown,
          params: unknown,
        ) => Promise<unknown>;
      }
    ).request(
      request,
      {
        type: "object",
        properties: {
          content: { type: "array" },
        },
      },
      {},
    );

    return this.extractTextFromResponse(response);
  }

  private extractTextFromResponse(response: unknown): string {
    if (response && typeof response === "object") {
      if ("content" in response && Array.isArray(response.content)) {
        const textContent = response.content.find(
          (item: { type: string }) => item.type === "text",
        );
        if (textContent && "text" in textContent) {
          return textContent.text;
        }
      }
      if ("text" in response && typeof response.text === "string") {
        return response.text;
      }
    }
    throw new Error("无法解析LLM响应");
  }

  private parseLLMResponse(response: string): DialectConfig {
    try {
      const parsed = JSON.parse(response);

      // 验证必要字段
      if (!parsed.name || !parsed.region) {
        throw new Error("LLM响应缺少必要字段");
      }

      return {
        name: parsed.name,
        region: parsed.region,
        characteristics: Array.isArray(parsed.characteristics)
          ? parsed.characteristics
          : [],
        commonPhrases: Array.isArray(parsed.commonPhrases)
          ? parsed.commonPhrases
          : [],
        pronunciationNotes: Array.isArray(parsed.pronunciationNotes)
          ? parsed.pronunciationNotes
          : [],
        slangWords: Array.isArray(parsed.slangWords) ? parsed.slangWords : [],
        grammarPatterns: Array.isArray(parsed.grammarPatterns)
          ? parsed.grammarPatterns
          : [],
        exampleSentences: Array.isArray(parsed.exampleSentences)
          ? parsed.exampleSentences
          : [],
      };
    } catch {
      // Silently handle LLM response parsing failure
      throw new Error("无法解析方言配置");
    }
  }

  private generateFallbackDialect(
    request: DialectQueryRequest,
  ): DialectQueryResult {
    // 基于角色名称和背景的简单方言推测
    const dialectMap: Record<string, Partial<DialectConfig>> = {
      洪秀全: {
        name: "广东客家话",
        region: "广东花县",
        characteristics: ["客家方言特点", "古汉语保留", "语气庄重"],
        commonPhrases: ["天父", "天国", "清妖", "万岁", "天王"],
        slangWords: ["天父", "天国", "清妖"],
        grammarPatterns: ["使用古典句式", "宗教用语"],
        exampleSentences: ["天父下凡，我乃真命天子", "清妖必灭，天国必兴"],
      },
      孙中山: {
        name: "广东中山话",
        region: "广东中山",
        characteristics: ["粤语特点", "近代汉语", "革命用语"],
        commonPhrases: ["革命", "共和", "民国", "同志", "自由"],
        slangWords: ["革命", "共和"],
        grammarPatterns: ["现代汉语", "政治术语"],
        exampleSentences: ["革命尚未成功，同志仍需努力"],
      },
    };

    const fallbackDialect = dialectMap[request.characterName] || {
      name: "标准官话",
      region: "全国",
      characteristics: ["标准汉语"],
      commonPhrases: ["是", "不是", "很好", "不错"],
      slangWords: [],
      grammarPatterns: ["现代汉语语法"],
      exampleSentences: ["这是一个标准表达的例句"],
    };

    return {
      success: true,
      dialect: {
        name: fallbackDialect.name || "标准官话",
        region: fallbackDialect.region || "全国",
        characteristics: fallbackDialect.characteristics || [],
        commonPhrases: fallbackDialect.commonPhrases || [],
        pronunciationNotes: fallbackDialect.pronunciationNotes || [],
        slangWords: fallbackDialect.slangWords || [],
        grammarPatterns: fallbackDialect.grammarPatterns || [],
        exampleSentences: fallbackDialect.exampleSentences || [],
      },
    };
  }
}
