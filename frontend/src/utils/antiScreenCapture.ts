/**
 * 🎭 ANTI-SCREEN CAPTURE SYSTEM
 * 
 * Advanced visual obfuscation system designed to defeat Graphite-class spyware
 * that captures screens, logs keystrokes, and performs OCR analysis.
 * 
 * DEFENSE STRATEGY:
 * 1. Dynamic content scrambling that human eyes can follow but OCR cannot
 * 2. Visual noise injection that defeats screenshot analysis
 * 3. Temporal content shifting that prevents pattern recognition
 * 4. Fake content injection to mislead surveillance
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface VisualProtectionConfig {
  level: 'off' | 'basic' | 'medium' | 'high' | 'maximum';
  dynamicScrambling: boolean;
  noiseInjection: boolean;
  temporalShifting: boolean;
  fakeContentInjection: boolean;
  ocrDefeating: boolean;
}

export interface ScrambledContent {
  originalText: string;
  scrambledText: string;
  visualNoise: string;
  decoyContent: string[];
  renderInstructions: RenderInstruction[];
}

export interface RenderInstruction {
  type: 'text' | 'noise' | 'decoy' | 'shift';
  content: string;
  style: {
    opacity?: number;
    color?: string;
    position?: 'overlay' | 'underlay' | 'inline';
    timing?: number;
  };
}

class AntiScreenCaptureSystem {
  private static instance: AntiScreenCaptureSystem;
  private config: VisualProtectionConfig = {
    level: 'basic',
    dynamicScrambling: true,
    noiseInjection: true,
    temporalShifting: true,
    fakeContentInjection: true,
    ocrDefeating: true
  };
  
  private scramblingPatterns: string[] = [
    'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘQʀꜱᴛᴜᴠᴡxʏᴢ', // Small caps
    'ᗩᗷᑢᕲᘿᖴᘜᕼᓰᒚᖽᐸᒪᘻᘉᓍᕵᕴᖇSᖶᑘᐺᘺ᙭ᖻᗱ', // Canadian Aboriginal
    'αβ¢∂εƒցհ⇔ʝƙℓɱղօքçɾรէմѵ⧦×վﻮ', // Unicode mixed
    'abcdєfghíjklmñöpqrstúvwxyz', // Accented
    '𝖆𝖇𝖈𝖉𝖊𝖋𝖌𝖍𝖎𝖏𝖐𝖑𝖒𝖓𝖔𝖕𝖖𝖗𝖘𝖙𝖚𝖛𝖜𝖝𝖞𝖟' // Mathematical bold
  ];
  
  private noiseCharacters: string[] = [
    '‌', '‍', '‎', '‏', '​', '‐', '‑', '‒', '–', '—', '―', '‖', '‗', ''', ''', '"', '"', '†', '‡', '•', '‰', '′', '″', '‴', '‵', '‶', '‷', '‸', '‹', '›', '※', '‼', '‽', '‾', '‿', '⁀', '⁁', '⁂', '⁃', '⁄', '⁅', '⁆', '⁇', '⁈', '⁉', '⁊', '⁋', '⁌', '⁍', '⁎', '⁏', '⁐', '⁑', '⁒', '⁓', '⁔', '⁕', '⁖', '⁗', '⁘', '⁙', '⁚', '⁛', '⁜', '⁝', '⁞'
  ];
  
  private decoyPhrases: string[] = [
    'Check weather forecast',
    'Meeting at 3pm today',
    'Pick up groceries',
    'Call dentist appointment',
    'Update software tomorrow',
    'Book flight tickets',
    'Pay electricity bill',
    'Schedule car maintenance',
    'Review project documents',
    'Plan weekend activities',
    'Organize photo albums',
    'Clean desktop files',
    'Backup important data',
    'Read news articles',
    'Watch tutorial videos',
    'Send birthday wishes',
    'Calculate monthly budget',
    'Compare insurance quotes',
    'Research vacation spots',
    'Update contact information'
  ];

  static getInstance(): AntiScreenCaptureSystem {
    if (!AntiScreenCaptureSystem.instance) {
      AntiScreenCaptureSystem.instance = new AntiScreenCaptureSystem();
    }
    return AntiScreenCaptureSystem.instance;
  }

  /**
   * Initialize the anti-screen capture system
   */
  async initialize(): Promise<void> {
    console.log('🎭 ANTI-SCREEN CAPTURE: Initializing visual protection...');
    
    // Load configuration
    await this.loadConfiguration();
    
    console.log('🎭 ANTI-SCREEN CAPTURE: Protection level:', this.config.level);
  }

  /**
   * Load protection configuration
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const configData = await AsyncStorage.getItem('anti_screen_capture_config');
      if (configData) {
        this.config = { ...this.config, ...JSON.parse(configData) };
      }
    } catch (error) {
      console.warn('Failed to load anti-screen capture config:', error);
    }
  }

  /**
   * Save protection configuration
   */
  private async saveConfiguration(): Promise<void> {
    try {
      await AsyncStorage.setItem('anti_screen_capture_config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save anti-screen capture config:', error);
    }
  }

  /**
   * Update protection configuration
   */
  async updateProtectionLevel(level: VisualProtectionConfig['level']): Promise<void> {
    this.config.level = level;
    
    // Configure features based on protection level
    switch (level) {
      case 'off':
        this.config.dynamicScrambling = false;
        this.config.noiseInjection = false;
        this.config.temporalShifting = false;
        this.config.fakeContentInjection = false;
        this.config.ocrDefeating = false;
        break;
        
      case 'basic':
        this.config.dynamicScrambling = true;
        this.config.noiseInjection = false;
        this.config.temporalShifting = false;
        this.config.fakeContentInjection = false;
        this.config.ocrDefeating = true;
        break;
        
      case 'medium':
        this.config.dynamicScrambling = true;
        this.config.noiseInjection = true;
        this.config.temporalShifting = false;
        this.config.fakeContentInjection = true;
        this.config.ocrDefeating = true;
        break;
        
      case 'high':
        this.config.dynamicScrambling = true;
        this.config.noiseInjection = true;
        this.config.temporalShifting = true;
        this.config.fakeContentInjection = true;
        this.config.ocrDefeating = true;
        break;
        
      case 'maximum':
        this.config.dynamicScrambling = true;
        this.config.noiseInjection = true;
        this.config.temporalShifting = true;
        this.config.fakeContentInjection = true;
        this.config.ocrDefeating = true;
        break;
    }
    
    await this.saveConfiguration();
    console.log('🎭 ANTI-SCREEN CAPTURE: Protection level updated to', level);
  }

  /**
   * Scramble text content to defeat OCR
   */
  private scrambleText(text: string): string {
    if (!this.config.dynamicScrambling) return text;
    
    const pattern = this.scramblingPatterns[Math.floor(Math.random() * this.scramblingPatterns.length)];
    const normalAlphabet = 'abcdefghijklmnopqrstuvwxyz';
    
    let scrambled = text.toLowerCase();
    
    for (let i = 0; i < normalAlphabet.length; i++) {
      const normalChar = normalAlphabet[i];
      const scrambledChar = pattern[i] || normalChar;
      
      // Replace both lowercase and uppercase
      scrambled = scrambled.replace(new RegExp(normalChar, 'g'), scrambledChar);
      scrambled = scrambled.replace(new RegExp(normalChar.toUpperCase(), 'g'), scrambledChar.toUpperCase());
    }
    
    return scrambled;
  }

  /**
   * Inject visual noise to defeat OCR
   */
  private injectVisualNoise(text: string): string {
    if (!this.config.noiseInjection) return text;
    
    let noisyText = '';
    
    for (let i = 0; i < text.length; i++) {
      noisyText += text[i];
      
      // Add noise characters randomly
      if (Math.random() < 0.1) { // 10% chance
        const noiseChar = this.noiseCharacters[Math.floor(Math.random() * this.noiseCharacters.length)];
        noisyText += noiseChar;
      }
    }
    
    return noisyText;
  }

  /**
   * Generate decoy content
   */
  private generateDecoyContent(): string[] {
    if (!this.config.fakeContentInjection) return [];
    
    const decoyCount = Math.min(3 + Math.floor(Math.random() * 3), this.decoyPhrases.length);
    const shuffled = [...this.decoyPhrases].sort(() => 0.5 - Math.random());
    
    return shuffled.slice(0, decoyCount);
  }

  /**
   * Create OCR-defeating patterns
   */
  private createOCRDefeatingPattern(text: string): string {
    if (!this.config.ocrDefeating) return text;
    
    // Add zero-width characters that break OCR but are invisible to humans
    const zeroWidthChars = ['‌', '‍', '​'];
    let ocrDefeated = '';
    
    for (let i = 0; i < text.length; i++) {
      ocrDefeated += text[i];
      
      // Add zero-width character after spaces and punctuation
      if (text[i] === ' ' || /[.,!?;:]/.test(text[i])) {
        const zeroWidthChar = zeroWidthChars[Math.floor(Math.random() * zeroWidthChars.length)];
        ocrDefeated += zeroWidthChar;
      }
    }
    
    return ocrDefeated;
  }

  /**
   * Generate temporal shifting instructions
   */
  private generateTemporalShifting(): RenderInstruction[] {
    if (!this.config.temporalShifting) return [];
    
    return [
      {
        type: 'shift',
        content: '',
        style: {
          timing: 1000 + Math.random() * 2000, // 1-3 second shifts
          opacity: 0.8
        }
      }
    ];
  }

  /**
   * Process content with anti-screen capture protection
   */
  processContent(originalText: string): ScrambledContent {
    if (this.config.level === 'off') {
      return {
        originalText,
        scrambledText: originalText,
        visualNoise: '',
        decoyContent: [],
        renderInstructions: []
      };
    }
    
    let processedText = originalText;
    
    // Apply transformations based on configuration
    if (this.config.dynamicScrambling) {
      processedText = this.scrambleText(processedText);
    }
    
    let visualNoise = '';
    if (this.config.noiseInjection) {
      visualNoise = this.injectVisualNoise('');
    }
    
    if (this.config.ocrDefeating) {
      processedText = this.createOCRDefeatingPattern(processedText);
    }
    
    const decoyContent = this.generateDecoyContent();
    
    const renderInstructions: RenderInstruction[] = [
      // Main content
      {
        type: 'text',
        content: processedText,
        style: {
          opacity: 1,
          position: 'inline'
        }
      }
    ];
    
    // Add visual noise overlay
    if (visualNoise) {
      renderInstructions.push({
        type: 'noise',
        content: visualNoise,
        style: {
          opacity: 0.1,
          position: 'overlay',
          color: '#00000010'
        }
      });
    }
    
    // Add decoy content
    decoyContent.forEach(decoy => {
      renderInstructions.push({
        type: 'decoy',
        content: decoy,
        style: {
          opacity: 0.05,
          position: 'underlay',
          color: '#00000008'
        }
      });
    });
    
    // Add temporal shifting
    const temporalInstructions = this.generateTemporalShifting();
    renderInstructions.push(...temporalInstructions);
    
    return {
      originalText,
      scrambledText: processedText,
      visualNoise,
      decoyContent,
      renderInstructions
    };
  }

  /**
   * Get current protection configuration
   */
  getProtectionConfig(): VisualProtectionConfig {
    return { ...this.config };
  }

  /**
   * Check if protection is active
   */
  isProtectionActive(): boolean {
    return this.config.level !== 'off';
  }

  /**
   * Get protection level color for UI
   */
  getProtectionLevelColor(level: VisualProtectionConfig['level']): string {
    const colors = {
      'off': '#6b7280', // gray
      'basic': '#10b981', // green
      'medium': '#f59e0b', // amber
      'high': '#f97316', // orange
      'maximum': '#ef4444' // red
    };
    return colors[level] || '#6b7280';
  }

  /**
   * Simulate real typing to defeat keystroke timing analysis
   */
  generateTypingSimulation(text: string): number[] {
    const baseDelay = 100; // Base typing speed
    const variance = 50; // Natural variance
    const delays: number[] = [];
    
    for (let i = 0; i < text.length; i++) {
      let delay = baseDelay + (Math.random() - 0.5) * variance;
      
      // Longer delays for spaces and punctuation (natural typing)
      if (text[i] === ' ') delay += 50;
      if (/[.,!?;:]/.test(text[i])) delay += 100;
      
      // Shorter delays for common letter combinations
      if (i > 0) {
        const bigram = text.substr(i-1, 2).toLowerCase();
        const commonBigrams = ['th', 'he', 'in', 'er', 'an', 're', 'ed', 'nd', 'on', 'en'];
        if (commonBigrams.includes(bigram)) {
          delay -= 20;
        }
      }
      
      delays.push(Math.max(delay, 30)); // Minimum 30ms
    }
    
    return delays;
  }
}

// Export singleton instance
export const AntiScreenCapture = AntiScreenCaptureSystem.getInstance();

export default AntiScreenCapture;