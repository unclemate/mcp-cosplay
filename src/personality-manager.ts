import {
  PersonalityConfig,
  PersonalityType,
  EmotionAnalysis,
  PersonalityTraits,
  EnhancedPersonalityConfig,
  CharacterProfile,
} from "./types.js";

export class PersonalityManager {
  private personalities = {
    enthusiastic: {
      prefixes: ["Wow! ", "Awesome! ", "Fantastic! ", "Hell yeah! ", "Sweet! "],
      suffixes: ["! 🚀", "! 💪", "! 🎉", "! 🔥", "! ✨"],
      intensifiers: [
        "absolutely",
        "completely",
        "totally",
        "incredibly",
        "amazingly",
      ],
      emojis: ["🚀", "💪", "🎉", "🔥", "✨", "⭐", "🌟"],
    },
    sarcastic: {
      prefixes: [
        "Well... ",
        "Oh great... ",
        "Surprise surprise... ",
        "How shocking... ",
        "Yay... ",
      ],
      suffixes: [". 💅", ". 🙃", ". 😒", ". 🎭", ". 👀"],
      intensifiers: ["totally", "absolutely", "definitely", "clearly"],
      emojis: ["💅", "🙃", "😒", "🎭", "👀", "🤔", "😏"],
    },
    professional: {
      prefixes: [
        "Indeed, ",
        "Certainly, ",
        "Absolutely, ",
        "Excellent, ",
        "Great, ",
      ],
      suffixes: [".", "! 🙂", ".", "! 👍"],
      intensifiers: ["quite", "rather", "quite", "fairly"],
      emojis: ["👍", "🙂", "💼", "📊", "🎯"],
    },
  };

  private enhancedConfigs: Record<PersonalityType, EnhancedPersonalityConfig> =
    {
      sarcastic: {
        signaturePhrases: [
          "呵呵",
          "我告诉你",
          "有钱就是任性",
          "你们这些凡人",
          "我爸是王健林",
        ],
        toneWords: ["啧", "哼", "呵", "切", "哦"],
        attitude: "superior",
        speechPatterns: ["装逼", "嘲讽", "炫耀", "轻蔑"],
        backgroundContext: "富二代，万达集团继承人，说话嚣张跋扈",
        emojiPreferences: ["🙃", "👀", "🎭", "💰"],
        languageStyle: "casual_arrogant",
      },
      enthusiastic: {
        signaturePhrases: ["太棒了！", "厉害！", "我太喜欢了！", "简直完美！"],
        toneWords: ["哇", "哦", "天呐", "太", "真"],
        attitude: "excited",
        speechPatterns: ["赞美", "鼓励", "热情", "积极"],
        backgroundContext: "充满活力的人，对什么都充满热情",
        emojiPreferences: ["😊", "🎉", "✨", "🔥"],
        languageStyle: "energetic",
      },
      professional: {
        signaturePhrases: ["从专业角度", "根据我的经验", "建议", "综上所述"],
        toneWords: ["嗯", "好的", "确实", "不过", "因此"],
        attitude: "formal",
        speechPatterns: ["分析", "解释", "建议", "总结"],
        backgroundContext: "专业人士，做事严谨有条理",
        emojiPreferences: ["📊", "💼", "🎯", "📈"],
        languageStyle: "formal_business",
      },
    };

  getPersonalityConfig(
    type: PersonalityType,
    intensity: number = 3,
  ): PersonalityConfig {
    return {
      type,
      intensity: Math.max(0, Math.min(5, intensity)),
      useEmojis: intensity > 1,
      allowStrongLanguage: intensity >= 4 && type === "sarcastic",
    };
  }

  applyPersonality(
    text: string,
    emotion: EmotionAnalysis,
    personality: PersonalityConfig,
    characterName?: string,
  ): string {
    // Don't modify empty strings
    if (!text.trim()) {
      return text;
    }

    const traits = this.personalities[personality.type];
    let enhancedConfig = this.enhancedConfigs[personality.type];
    let result = text;

    // If character name is provided, try to get character-specific enhanced config
    if (characterName) {
      const characterEnhancedConfig =
        this.getCharacterEnhancedConfig(characterName);
      if (characterEnhancedConfig) {
        enhancedConfig = characterEnhancedConfig;
      }
    }

    // Apply enhanced personality features
    result = this.applyEnhancedPersonality(result, enhancedConfig, personality);

    // Apply prefix based on emotion and personality
    if (personality.intensity >= 3) {
      const prefix = this.selectPrefix(traits, emotion, personality);
      if (prefix) {
        result = prefix + result;
      }
    }

    // Apply intensifiers
    if (personality.intensity >= 2) {
      result = this.addIntensifiers(result, traits, personality);
    }

    // Apply suffix
    if (personality.intensity >= 2) {
      const suffix = this.selectSuffix(traits, emotion, personality);
      if (suffix) {
        result = result + suffix;
      }
    }

    // Add random emojis for high intensity
    if (personality.useEmojis && personality.intensity >= 4) {
      result = this.addRandomEmojis(result, traits, personality);
    }

    return result;
  }

  private applyEnhancedPersonality(
    text: string,
    config: EnhancedPersonalityConfig,
    personality: PersonalityConfig,
  ): string {
    let result = text;

    // Add signature phrases based on intensity
    if (personality.intensity >= 3 && config.signaturePhrases.length > 0) {
      const phrase =
        config.signaturePhrases[
          Math.floor(Math.random() * config.signaturePhrases.length)
        ];
      if (Math.random() < 0.3) {
        // 30% chance to add signature phrase
        result = phrase + "，" + result;
      }
    }

    // Add tone words based on intensity
    if (personality.intensity >= 2 && config.toneWords.length > 0) {
      const toneWord =
        config.toneWords[Math.floor(Math.random() * config.toneWords.length)];
      if (Math.random() < 0.4) {
        // 40% chance to add tone word
        result = toneWord + "，" + result;
      }
    }

    // Use preferred emojis instead of random ones
    if (
      personality.useEmojis &&
      personality.intensity >= 4 &&
      config.emojiPreferences.length > 0
    ) {
      const preferredEmoji =
        config.emojiPreferences[
          Math.floor(Math.random() * config.emojiPreferences.length)
        ];
      if (Math.random() < 0.5) {
        // 50% chance to add preferred emoji
        result = result + " " + preferredEmoji;
      }
    }

    return result;
  }

  getEnhancedConfig(
    type: PersonalityType,
  ): EnhancedPersonalityConfig | undefined {
    return this.enhancedConfigs[type];
  }

  // 新增：角色配置管理
  private characterProfiles: Map<string, CharacterProfile> = new Map();

  // 预设角色
  private presetCharacters: CharacterProfile[] = [];

  constructor() {
    // 初始化预设角色
    this.presetCharacters.forEach((char) => {
      this.characterProfiles.set(char.name, char);
    });
  }

  // 添加自定义角色
  addCharacter(character: CharacterProfile): void {
    this.characterProfiles.set(character.name, character);
  }

  // 获取角色配置
  getCharacterProfile(name: string): CharacterProfile | undefined {
    return this.characterProfiles.get(name);
  }

  // 获取所有角色
  getAllCharacters(): CharacterProfile[] {
    return Array.from(this.characterProfiles.values());
  }

  // 搜索角色
  searchCharacters(query: string): CharacterProfile[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.characterProfiles.values()).filter(
      (char) =>
        char.name.toLowerCase().includes(lowerQuery) ||
        char.description.toLowerCase().includes(lowerQuery) ||
        char.category?.toLowerCase().includes(lowerQuery),
    );
  }

  // 按类别获取角色
  getCharactersByCategory(category: string): CharacterProfile[] {
    return Array.from(this.characterProfiles.values()).filter(
      (char) => char.category === category,
    );
  }

  // 删除角色
  removeCharacter(name: string): boolean {
    return this.characterProfiles.delete(name);
  }

  // 将角色转换为人格配置
  characterToPersonalityConfig(
    characterName: string,
    intensity: number = 3,
  ): PersonalityConfig | null {
    const character = this.characterProfiles.get(characterName);
    if (!character) return null;

    // Map character attitude to personality type
    let personalityType: PersonalityType = "sarcastic"; // default
    switch (character.personality.attitude) {
      case "excited":
      case "enthusiastic":
        personalityType = "enthusiastic";
        break;
      case "formal":
      case "professional":
        personalityType = "professional";
        break;
      case "superior":
      case "critical":
      case "contemplative":
      case "authoritarian":
      default:
        personalityType = "sarcastic"; // fallback for most attitudes
        break;
    }

    return {
      type: personalityType,
      intensity: Math.max(0, Math.min(5, intensity)),
      useEmojis: intensity > 1,
      allowStrongLanguage:
        intensity >= 4 &&
        ["superior", "critical", "authoritarian"].includes(
          character.personality.attitude,
        ),
    };
  }

  // 获取角色的增强配置
  getCharacterEnhancedConfig(
    characterName: string,
  ): EnhancedPersonalityConfig | null {
    const character = this.characterProfiles.get(characterName);
    return character ? character.personality : null;
  }

  private selectPrefix(
    traits: PersonalityTraits,
    emotion: EmotionAnalysis,
    personality: PersonalityConfig,
  ): string {
    if (personality.type === "enthusiastic" && emotion.emotion === "positive") {
      return traits.prefixes[
        Math.floor(Math.random() * traits.prefixes.length)
      ];
    }
    if (personality.type === "sarcastic" && emotion.emotion === "negative") {
      return traits.prefixes[
        Math.floor(Math.random() * traits.prefixes.length)
      ];
    }
    if (personality.type === "professional" && personality.intensity >= 3) {
      return traits.prefixes[
        Math.floor(Math.random() * Math.min(3, traits.prefixes.length))
      ];
    }
    return "";
  }

  private selectSuffix(
    traits: PersonalityTraits,
    emotion: EmotionAnalysis,
    personality: PersonalityConfig,
  ): string {
    if (personality.intensity >= 3) {
      return traits.suffixes[
        Math.floor(Math.random() * traits.suffixes.length)
      ];
    }
    if (personality.intensity >= 2) {
      return traits.suffixes[0]; // Use first, more subtle suffix
    }
    return "";
  }

  private addIntensifiers(
    text: string,
    traits: PersonalityTraits,
    personality: PersonalityConfig,
  ): string {
    if (personality.intensity < 2) return text;

    const words = text.split(" ");
    if (words.length > 3) {
      const insertPosition = Math.floor(words.length / 3);
      const intensifier =
        traits.intensifiers[
          Math.floor(Math.random() * traits.intensifiers.length)
        ];
      words[insertPosition] = `${intensifier} ${words[insertPosition]}`;
      return words.join(" ");
    }
    return text;
  }

  private addRandomEmojis(
    text: string,
    traits: PersonalityTraits,
    personality: PersonalityConfig,
  ): string {
    if (personality.intensity < 4 || !personality.useEmojis) return text;

    const emojiCount = Math.min(personality.intensity - 3, 2);
    for (let i = 0; i < emojiCount; i++) {
      const emoji =
        traits.emojis[Math.floor(Math.random() * traits.emojis.length)];
      const insertPosition = Math.floor(Math.random() * (text.length + 1));
      text = text.slice(0, insertPosition) + emoji + text.slice(insertPosition);
    }
    return text;
  }
}
