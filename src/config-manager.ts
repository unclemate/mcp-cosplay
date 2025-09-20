import {
  PersonalityConfig,
  PersonalityType,
  ContentSafetyConfig,
} from "./types.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export interface CosplayConfig {
  defaultPersonality: PersonalityType;
  defaultIntensity: number;
  maxIntensity: number;
  customRules?: Record<string, unknown>;
  contentSafety?: ContentSafetyConfig;
}

export class ConfigManager {
  private configPath: string;
  private config: CosplayConfig;

  constructor(configPath?: string) {
    this.configPath = configPath || join(process.cwd(), "cosplay-config.json");
    this.config = this.loadConfig();
  }

  private loadConfig(): CosplayConfig {
    const defaultConfig: CosplayConfig = {
      defaultPersonality: "enthusiastic",
      defaultIntensity: 3,
      maxIntensity: 5,
      contentSafety: {
        enabled: true,
        confidenceThreshold: 0.5,
        strictMode: true,
        checkMethod: "llm",
        customRules: [],
      },
    };

    if (existsSync(this.configPath)) {
      try {
        const fileContent = readFileSync(this.configPath, "utf-8");
        const userConfig = JSON.parse(fileContent);
        return { ...defaultConfig, ...userConfig };
      } catch {
        // Silently handle config loading failure in production
        return defaultConfig;
      }
    }

    this.saveConfig(defaultConfig);
    return defaultConfig;
  }

  getConfig(): CosplayConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<CosplayConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig(this.config);
  }

  private saveConfig(config: CosplayConfig): void {
    try {
      writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch {
      // Silently handle config save failure in production
    }
  }

  createCharacterConfig(
    character?: PersonalityType,
    intensity?: number,
  ): PersonalityConfig {
    return {
      type: character || this.config.defaultPersonality,
      intensity:
        intensity !== undefined
          ? Math.max(0, Math.min(this.config.maxIntensity, intensity))
          : this.config.defaultIntensity,
      useEmojis: (intensity || this.config.defaultIntensity) > 1,
      allowStrongLanguage: (intensity || this.config.defaultIntensity) >= 4,
    };
  }

  getContentSafetyConfig(): ContentSafetyConfig {
    if (!this.config.contentSafety) {
      throw new Error("Content safety configuration is not initialized");
    }
    return { ...this.config.contentSafety };
  }

  updateContentSafetyConfig(updates: Partial<ContentSafetyConfig>): void {
    if (!this.config.contentSafety) {
      throw new Error("Content safety configuration is not initialized");
    }
    this.config.contentSafety = { ...this.config.contentSafety, ...updates };
    this.saveConfig(this.config);
  }
}
