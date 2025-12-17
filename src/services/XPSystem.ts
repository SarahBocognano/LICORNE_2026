/**
 * XP System for PR Rescue Game
 * Tracks user experience points based on rescue activity
 */

export interface UserXP {
  currentXP: number;
  level: number;
  xpForNextLevel: number;
  totalRescues: number;
  title: string;
  rank: string;
}

export interface XPGain {
  amount: number;
  reason: string;
  leveledUp: boolean;
  newLevel?: number;
}

export class XPSystem {
  private static readonly STORAGE_KEY = 'user_xp';
  private static readonly USERNAME_KEY = 'github_username';

  // XP rewards
  private static readonly XP_REWARDS = {
    CRITICAL_RESCUE: 100,      // Rescued 14+ day old PR
    URGENT_RESCUE: 50,         // Rescued 7-13 day old PR
    WARNING_RESCUE: 25,        // Rescued 3-6 day old PR
    APPROVAL: 30,              // Approved a PR
    CHANGES_REQUESTED: 20,     // Requested changes
    COMMENT: 10,               // Commented on PR
    ROULETTE_BONUS: 50,        // Bonus for roulette rescue
    FIRST_RESCUE_OF_DAY: 25,   // Daily first rescue bonus
    STREAK_BONUS: 10,          // Per day of streak
  };

  // Level thresholds (exponential growth)
  private static readonly LEVELS = [
    { level: 1, xpRequired: 0, title: 'Rookie Reviewer', rank: '🌱' },
    { level: 2, xpRequired: 100, title: 'Junior Rescuer', rank: '🔰' },
    { level: 3, xpRequired: 250, title: 'PR Firefighter', rank: '🚒' },
    { level: 4, xpRequired: 500, title: 'Code Guardian', rank: '🛡️' },
    { level: 5, xpRequired: 1000, title: 'Review Master', rank: '⭐' },
    { level: 6, xpRequired: 2000, title: 'Rescue Hero', rank: '🦸' },
    { level: 7, xpRequired: 4000, title: 'Elite Reviewer', rank: '💎' },
    { level: 8, xpRequired: 8000, title: 'Grand Master', rank: '👑' },
    { level: 9, xpRequired: 15000, title: 'Legend', rank: '🏆' },
    { level: 10, xpRequired: 30000, title: 'Mythical Guardian', rank: '🌟' },
  ];

  /**
   * Get user's current XP status
   */
  static getUserXP(): UserXP {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    
    if (!stored) {
      return this.createNewUser();
    }

    const data = JSON.parse(stored);
    const levelInfo = this.calculateLevel(data.currentXP);

    return {
      currentXP: data.currentXP,
      level: levelInfo.level,
      xpForNextLevel: levelInfo.xpForNextLevel,
      totalRescues: data.totalRescues || 0,
      title: levelInfo.title,
      rank: levelInfo.rank,
    };
  }

  /**
   * Award XP for an action
   */
  static awardXP(action: keyof typeof XPSystem.XP_REWARDS, multiplier = 1): XPGain {
    const xpAmount = this.XP_REWARDS[action] * multiplier;
    const currentData = this.getUserXP();
    const oldLevel = currentData.level;

    // Add XP
    const newXP = currentData.currentXP + xpAmount;
    const newLevelInfo = this.calculateLevel(newXP);

    // Save
    const stored = localStorage.getItem(this.STORAGE_KEY);
    const data = stored ? JSON.parse(stored) : { currentXP: 0, totalRescues: 0 };
    data.currentXP = newXP;
    data.totalRescues = (data.totalRescues || 0) + 1;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));

    // Check if leveled up
    const leveledUp = newLevelInfo.level > oldLevel;

    return {
      amount: xpAmount,
      reason: this.getActionName(action),
      leveledUp,
      newLevel: leveledUp ? newLevelInfo.level : undefined,
    };
  }

  /**
   * Award XP for rescuing a PR based on its urgency
   */
  static awardRescueXP(urgency: 'critical' | 'urgent' | 'warning', isRoulette = false): XPGain {
    let action: keyof typeof XPSystem.XP_REWARDS;
    
    switch (urgency) {
      case 'critical':
        action = 'CRITICAL_RESCUE';
        break;
      case 'urgent':
        action = 'URGENT_RESCUE';
        break;
      case 'warning':
        action = 'WARNING_RESCUE';
        break;
      default:
        action = 'WARNING_RESCUE';
    }

    const gain = this.awardXP(action);

    // Add roulette bonus if applicable
    if (isRoulette) {
      const rouletteGain = this.awardXP('ROULETTE_BONUS');
      gain.amount += rouletteGain.amount;
      gain.reason += ' + Roulette Bonus';
    }

    return gain;
  }

  /**
   * Get XP progress as percentage (0-100)
   */
  static getXPProgress(): number {
    const user = this.getUserXP();
    const currentLevel = this.LEVELS.find(l => l.level === user.level);
    const nextLevel = this.LEVELS.find(l => l.level === user.level + 1);

    if (!currentLevel || !nextLevel) return 100;

    const xpInCurrentLevel = user.currentXP - currentLevel.xpRequired;
    const xpNeededForNextLevel = nextLevel.xpRequired - currentLevel.xpRequired;

    return Math.floor((xpInCurrentLevel / xpNeededForNextLevel) * 100);
  }

  /**
   * Get leaderboard position
   */
  static async getLeaderboardPosition(username: string, allRescuers: any[]): Promise<number> {
    // Find position based on points/rescues
    const position = allRescuers.findIndex(r => r.username === username);
    return position >= 0 ? position + 1 : -1;
  }

  /**
   * Calculate level from XP
   */
  private static calculateLevel(xp: number): { level: number; xpForNextLevel: number; title: string; rank: string } {
    let currentLevel = this.LEVELS[0];

    for (let i = this.LEVELS.length - 1; i >= 0; i--) {
      if (xp >= this.LEVELS[i].xpRequired) {
        currentLevel = this.LEVELS[i];
        break;
      }
    }

    const nextLevel = this.LEVELS.find(l => l.level === currentLevel.level + 1);
    const xpForNextLevel = nextLevel ? nextLevel.xpRequired - xp : 0;

    return {
      level: currentLevel.level,
      xpForNextLevel: Math.max(0, xpForNextLevel),
      title: currentLevel.title,
      rank: currentLevel.rank,
    };
  }

  /**
   * Create new user
   */
  private static createNewUser(): UserXP {
    const data = {
      currentXP: 0,
      totalRescues: 0,
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));

    return {
      currentXP: 0,
      level: 1,
      xpForNextLevel: this.LEVELS[1].xpRequired,
      totalRescues: 0,
      title: this.LEVELS[0].title,
      rank: this.LEVELS[0].rank,
    };
  }

  /**
   * Get human-readable action name
   */
  private static getActionName(action: keyof typeof XPSystem.XP_REWARDS): string {
    const names: Record<string, string> = {
      CRITICAL_RESCUE: 'Critical PR Rescued',
      URGENT_RESCUE: 'Urgent PR Rescued',
      WARNING_RESCUE: 'PR Rescued',
      APPROVAL: 'PR Approved',
      CHANGES_REQUESTED: 'Changes Requested',
      COMMENT: 'PR Commented',
      ROULETTE_BONUS: 'Roulette Bonus',
      FIRST_RESCUE_OF_DAY: 'First Rescue Today',
      STREAK_BONUS: 'Streak Bonus',
    };
    return names[action] || action;
  }

  /**
   * Reset XP (for testing)
   */
  static reset(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Get all level info
   */
  static getAllLevels() {
    return this.LEVELS;
  }
}