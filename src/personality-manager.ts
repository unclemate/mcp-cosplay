import {
  PersonalityConfig,
  PersonalityType,
  EmotionAnalysis,
  PersonalityTraits,
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
  ): string {
    // Don't modify empty strings
    if (!text.trim()) {
      return text;
    }

    const traits = this.personalities[personality.type];
    let result = text;

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
