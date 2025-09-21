import { describe, it, expect, beforeEach } from 'vitest';
import { PersonalityManager } from './personality-manager.js';
import { CharacterProfile, EnhancedPersonalityConfig } from './types.js';

describe('Character Management', () => {
  let manager: PersonalityManager;

  beforeEach(() => {
    manager = new PersonalityManager();
  });

  describe('preset characters', () => {
    it('should initialize with preset characters', () => {
      const allCharacters = manager.getAllCharacters();
      expect(allCharacters.length).toBeGreaterThan(0);

      const names = allCharacters.map(c => c.name);
      expect(names).toContain('王思聪');
      expect(names).toContain('余秋雨');
      expect(names).toContain('鲁迅');
    });

    it('should have correct preset character properties', () => {
      const wangSicong = manager.getCharacterProfile('王思聪');

      expect(wangSicong).toBeDefined();
      expect(wangSicong?.name).toBe('王思聪');
      expect(wangSicong?.category).toBe('名人');
      expect(wangSicong?.personality.attitude).toBe('superior');
      expect(wangSicong?.personality.signaturePhrases).toContain('有钱就是任性');
      expect(wangSicong?.personality.emojiPreferences).toContain('💰');
    });

    it('should have different categories for preset characters', () => {
      const allCharacters = manager.getAllCharacters();
      const categories = [...new Set(allCharacters.map(c => c.category))];

      expect(categories).toContain('名人');
      expect(categories).toContain('文化名人');
      expect(categories).toContain('文学巨匠');
    });
  });

  describe('addCharacter', () => {
    it('should add new character successfully', () => {
      const newCharacter: CharacterProfile = {
        name: '测试角色',
        description: '一个用于测试的角色',
        personality: {
          signaturePhrases: ['测试一下', '让我看看'],
          toneWords: ['嗯', '哦'],
          attitude: 'friendly',
          speechPatterns: ['友好', '测试'],
          backgroundContext: '测试背景',
          emojiPreferences: ['😊', '👍'],
          languageStyle: '测试风格'
        },
        category: '测试分类'
      };

      manager.addCharacter(newCharacter);

      const retrieved = manager.getCharacterProfile('测试角色');
      expect(retrieved).toEqual(newCharacter);
    });

    it('should update existing character when adding with same name', () => {
      const originalCharacter: CharacterProfile = {
        name: '更新测试',
        description: '原始描述',
        personality: {
          signaturePhrases: ['原始'],
          toneWords: ['嗯'],
          attitude: 'friendly',
          speechPatterns: ['原始'],
          backgroundContext: '原始背景',
          emojiPreferences: ['😊'],
          languageStyle: '原始风格'
        },
        category: '原始分类'
      };

      const updatedCharacter: CharacterProfile = {
        name: '更新测试',
        description: '更新描述',
        personality: {
          signaturePhrases: ['更新'],
          toneWords: ['哦'],
          attitude: 'serious',
          speechPatterns: ['更新'],
          backgroundContext: '更新背景',
          emojiPreferences: ['👍'],
          languageStyle: '更新风格'
        },
        category: '更新分类'
      };

      manager.addCharacter(originalCharacter);
      manager.addCharacter(updatedCharacter);

      const retrieved = manager.getCharacterProfile('更新测试');
      expect(retrieved).toEqual(updatedCharacter);
    });

    it('should handle character with minimal required fields', () => {
      const minimalCharacter: CharacterProfile = {
        name: '最小角色',
        description: '最小描述',
        personality: {
          signaturePhrases: [],
          toneWords: [],
          attitude: 'friendly',
          speechPatterns: [],
          backgroundContext: '',
          emojiPreferences: [],
          languageStyle: 'simple'
        },
        category: '测试'
      };

      expect(() => manager.addCharacter(minimalCharacter)).not.toThrow();

      const retrieved = manager.getCharacterProfile('最小角色');
      expect(retrieved).toEqual(minimalCharacter);
    });
  });

  describe('getCharacterProfile', () => {
    it('should return correct character for existing name', () => {
      const character = manager.getCharacterProfile('鲁迅');
      expect(character).toBeDefined();
      expect(character?.name).toBe('鲁迅');
      expect(character?.personality.attitude).toBe('critical');
    });

    it('should return undefined for non-existent character', () => {
      const character = manager.getCharacterProfile('不存在');
      expect(character).toBeUndefined();
    });

    it('should be case sensitive', () => {
      // Add a test character with mixed case
      const testChar: CharacterProfile = {
        name: 'CaseTest',
        description: 'Case sensitivity test',
        personality: {
          signaturePhrases: ['Case'],
          toneWords: ['case'],
          attitude: 'friendly',
          speechPatterns: ['Case'],
          backgroundContext: 'Case context',
          emojiPreferences: ['🔤'],
          languageStyle: 'Case style'
        },
        category: 'Test'
      };

      manager.addCharacter(testChar);

      const character = manager.getCharacterProfile('CaseTest');
      const lowerCase = manager.getCharacterProfile('casetest');

      expect(character).toBeDefined();
      expect(lowerCase).toBeUndefined();
    });
  });

  describe('getAllCharacters', () => {
    it('should return all characters including added ones', () => {
      const initialCount = manager.getAllCharacters().length;

      const newCharacter: CharacterProfile = {
        name: '新增角色',
        description: '新增描述',
        personality: {
          signaturePhrases: ['新增'],
          toneWords: ['新'],
          attitude: 'friendly',
          speechPatterns: ['新增'],
          backgroundContext: '新增背景',
          emojiPreferences: ['🆕'],
          languageStyle: '新增风格'
        },
        category: '新增分类'
      };

      manager.addCharacter(newCharacter);
      const allCharacters = manager.getAllCharacters();

      expect(allCharacters.length).toBe(initialCount + 1);
      expect(allCharacters.some(c => c.name === '新增角色')).toBe(true);
    });

    it('should return character array with all required properties', () => {
      const allCharacters = manager.getAllCharacters();

      for (const character of allCharacters) {
        expect(character).toHaveProperty('name');
        expect(character).toHaveProperty('description');
        expect(character).toHaveProperty('personality');
        expect(character).toHaveProperty('category');
        expect(character.personality).toHaveProperty('signaturePhrases');
        expect(character.personality).toHaveProperty('toneWords');
        expect(character.personality).toHaveProperty('attitude');
        expect(character.personality).toHaveProperty('speechPatterns');
        expect(character.personality).toHaveProperty('backgroundContext');
        expect(character.personality).toHaveProperty('emojiPreferences');
        expect(character.personality).toHaveProperty('languageStyle');
      }
    });
  });

  describe('searchCharacters', () => {
    beforeEach(() => {
      // Add test characters for search
      manager.addCharacter({
        name: '搜索测试A',
        description: '这是一个用于搜索测试的角色',
        personality: {
          signaturePhrases: ['搜索'],
          toneWords: ['测试'],
          attitude: 'friendly',
          speechPatterns: ['搜索'],
          backgroundContext: '搜索背景',
          emojiPreferences: ['🔍'],
          languageStyle: '搜索风格'
        },
        category: '搜索分类'
      });

      manager.addCharacter({
        name: 'Search Test B',
        description: 'English description for search',
        personality: {
          signaturePhrases: ['Search'],
          toneWords: ['Test'],
          attitude: 'professional',
          speechPatterns: ['Search'],
          backgroundContext: 'Search context',
          emojiPreferences: ['🔎'],
          languageStyle: 'Search style'
        },
        category: 'Search Category'
      });
    });

    it('should find characters by name', () => {
      const results = manager.searchCharacters('搜索测试A');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('搜索测试A');
    });

    it('should find characters by description', () => {
      const results = manager.searchCharacters('用于搜索测试');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('搜索测试A');
    });

    it('should find characters by category', () => {
      const results = manager.searchCharacters('搜索分类');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('搜索测试A');
    });

    it('should be case insensitive', () => {
      const results = manager.searchCharacters('search test');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Search Test B');
    });

    it('should find multiple matches', () => {
      // Add multiple test characters with matching names
      manager.addCharacter({
        name: '多重匹配测试1',
        description: '描述1',
        personality: {
          signaturePhrases: ['测试1'],
          toneWords: ['测1'],
          attitude: 'friendly',
          speechPatterns: ['测试1'],
          backgroundContext: '背景1',
          emojiPreferences: ['1️⃣'],
          languageStyle: '风格1'
        },
        category: '测试分类'
      });

      manager.addCharacter({
        name: '多重匹配测试2',
        description: '描述2',
        personality: {
          signaturePhrases: ['测试2'],
          toneWords: ['测2'],
          attitude: 'friendly',
          speechPatterns: ['测试2'],
          backgroundContext: '背景2',
          emojiPreferences: ['2️⃣'],
          languageStyle: '风格2'
        },
        category: '测试分类'
      });

      const results = manager.searchCharacters('多重匹配');
      expect(results.length).toBeGreaterThan(1);
    });

    it('should return empty array for no matches', () => {
      const results = manager.searchCharacters('不存在的搜索词');
      expect(results).toEqual([]);
    });

    it('should handle empty search string', () => {
      const results = manager.searchCharacters('');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('getCharactersByCategory', () => {
    beforeEach(() => {
      // Add test characters in different categories
      manager.addCharacter({
        name: '分类测试1',
        description: '分类测试1',
        personality: {
          signaturePhrases: ['测试1'],
          toneWords: ['测1'],
          attitude: 'friendly',
          speechPatterns: ['测试1'],
          backgroundContext: '背景1',
          emojiPreferences: ['1️⃣'],
          languageStyle: '风格1'
        },
        category: '测试分类A'
      });

      manager.addCharacter({
        name: '分类测试2',
        description: '分类测试2',
        personality: {
          signaturePhrases: ['测试2'],
          toneWords: ['测2'],
          attitude: 'serious',
          speechPatterns: ['测试2'],
          backgroundContext: '背景2',
          emojiPreferences: ['2️⃣'],
          languageStyle: '风格2'
        },
        category: '测试分类A'
      });

      manager.addCharacter({
        name: '分类测试3',
        description: '分类测试3',
        personality: {
          signaturePhrases: ['测试3'],
          toneWords: ['测3'],
          attitude: 'professional',
          speechPatterns: ['测试3'],
          backgroundContext: '背景3',
          emojiPreferences: ['3️⃣'],
          languageStyle: '风格3'
        },
        category: '测试分类B'
      });
    });

    it('should return characters in specified category', () => {
      const results = manager.getCharactersByCategory('测试分类A');
      expect(results.length).toBe(2);
      expect(results.every(c => c.category === '测试分类A')).toBe(true);
    });

    it('should return empty array for non-existent category', () => {
      const results = manager.getCharactersByCategory('不存在的分类');
      expect(results).toEqual([]);
    });

    it('should handle category with special characters', () => {
      manager.addCharacter({
        name: '特殊分类测试',
        description: '特殊分类测试',
        personality: {
          signaturePhrases: ['特殊'],
          toneWords: ['特'],
          attitude: 'friendly',
          speechPatterns: ['特殊'],
          backgroundContext: '特殊背景',
          emojiPreferences: ['🌟'],
          languageStyle: '特殊风格'
        },
        category: '特殊-分类_测试'
      });

      const results = manager.getCharactersByCategory('特殊-分类_测试');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('特殊分类测试');
    });
  });

  describe('removeCharacter', () => {
    it('should remove existing character successfully', () => {
      const newCharacter: CharacterProfile = {
        name: '删除测试',
        description: '将被删除的角色',
        personality: {
          signaturePhrases: ['删除'],
          toneWords: ['删'],
          attitude: 'friendly',
          speechPatterns: ['删除'],
          backgroundContext: '删除背景',
          emojiPreferences: ['🗑️'],
          languageStyle: '删除风格'
        },
        category: '删除分类'
      };

      manager.addCharacter(newCharacter);
      expect(manager.getCharacterProfile('删除测试')).toBeDefined();

      const result = manager.removeCharacter('删除测试');
      expect(result).toBe(true);
      expect(manager.getCharacterProfile('删除测试')).toBeUndefined();
    });

    it('should return false for non-existent character', () => {
      const result = manager.removeCharacter('不存在的角色');
      expect(result).toBe(false);
    });

    it('should not affect other characters when removing one', () => {
      const initialCount = manager.getAllCharacters().length;
      const characterToRemove = '鲁迅';

      expect(manager.getCharacterProfile(characterToRemove)).toBeDefined();

      manager.removeCharacter(characterToRemove);

      expect(manager.getCharacterProfile(characterToRemove)).toBeUndefined();
      expect(manager.getAllCharacters().length).toBe(initialCount - 1);
    });

    it('should handle case sensitive removal', () => {
      const character: CharacterProfile = {
        name: 'CaseSensitive',
        description: 'Case sensitive test',
        personality: {
          signaturePhrases: ['Case'],
          toneWords: ['case'],
          attitude: 'friendly',
          speechPatterns: ['Case'],
          backgroundContext: 'Case context',
          emojiPreferences: ['🔤'],
          languageStyle: 'Case style'
        },
        category: 'Case'
      };

      manager.addCharacter(character);
      expect(manager.getCharacterProfile('CaseSensitive')).toBeDefined();

      const result = manager.removeCharacter('casesensitive');
      expect(result).toBe(false);
      expect(manager.getCharacterProfile('CaseSensitive')).toBeDefined();
    });
  });

  describe('characterToPersonalityConfig', () => {
    it('should convert character to personality config', () => {
      const config = manager.characterToPersonalityConfig('王思聪', 4);

      expect(config).toBeDefined();
      expect(config?.type).toBe('sarcastic'); // superior attitude maps to sarcastic
      expect(config?.intensity).toBe(4);
    });

    it('should return null for non-existent character', () => {
      const config = manager.characterToPersonalityConfig('不存在', 3);
      expect(config).toBeNull();
    });

    it('should map different attitudes correctly', () => {
      // Test character with enthusiastic attitude
      const enthusiasticChar: CharacterProfile = {
        name: '热情测试',
        description: '热情测试',
        personality: {
          signaturePhrases: ['热情'],
          toneWords: ['热'],
          attitude: 'enthusiastic',
          speechPatterns: ['热情'],
          backgroundContext: '热情背景',
          emojiPreferences: ['🔥'],
          languageStyle: '热情风格'
        },
        category: '测试'
      };

      manager.addCharacter(enthusiasticChar);
      const config = manager.characterToPersonalityConfig('热情测试', 3);

      expect(config?.type).toBe('enthusiastic');
    });

    it('should use default intensity when not provided', () => {
      const config = manager.characterToPersonalityConfig('王思聪');

      expect(config).toBeDefined();
      expect(config?.intensity).toBe(3); // default intensity
    });

    it('should handle custom intensity values', () => {
      const config = manager.characterToPersonalityConfig('王思聪', 5);

      expect(config).toBeDefined();
      expect(config?.intensity).toBe(5);
    });
  });
});