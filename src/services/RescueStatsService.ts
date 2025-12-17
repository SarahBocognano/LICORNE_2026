/**
 * Service to track PR rescues, streaks, and team goals
 * Uses localStorage for persistence
 */

export interface RescueStats {
  totalRescues: number;
  rescuesToday: number;
  rescuesThisWeek: number;
  currentStreak: number;
  longestStreak: number;
  lastRescueDate: string | null;
}

export interface TeamGoal {
  target: number;
  current: number;
  period: 'daily' | 'weekly';
  startsAt: string;
  endsAt: string;
}

export class RescueStatsService {
  private static readonly STORAGE_KEY = 'pr_rescue_stats';
  private static readonly TEAM_GOAL_KEY = 'team_goal';
  private static readonly RESCUES_KEY = 'pr_rescued';

  /**
   * Get user's rescue statistics
   */
  static getStats(): RescueStats {
    const stats = localStorage.getItem(this.STORAGE_KEY);
    
    if (!stats) {
      return {
        totalRescues: 0,
        rescuesToday: 0,
        rescuesThisWeek: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastRescueDate: null,
      };
    }

    const parsed = JSON.parse(stats);
    
    // Update daily/weekly counts based on current date
    return this.updateTimePeriods(parsed);
  }

  /**
   * Record a new rescue
   */
  static recordRescue(prNumber: number): RescueStats {
    const stats = this.getStats();
    const today = this.getTodayString();
    const lastRescue = stats.lastRescueDate;

    // Increment counters
    stats.totalRescues++;
    stats.rescuesToday++;
    stats.rescuesThisWeek++;

    // Update streak
    if (!lastRescue) {
      // First rescue ever
      stats.currentStreak = 1;
      stats.longestStreak = 1;
    } else if (lastRescue === today) {
      // Already rescued today, streak stays same
    } else if (this.isYesterday(lastRescue)) {
      // Rescued yesterday, continue streak
      stats.currentStreak++;
      stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);
    } else {
      // Streak broken
      stats.currentStreak = 1;
    }

    stats.lastRescueDate = today;

    // Save
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stats));

    // Update team goal progress
    this.incrementTeamGoal();

    return stats;
  }

  /**
   * Check streak status
   */
  static checkStreak(): { isActive: boolean; broken: boolean } {
    const stats = this.getStats();
    
    if (!stats.lastRescueDate) {
      return { isActive: false, broken: false };
    }

    const today = this.getTodayString();
    const yesterday = this.getYesterdayString();

    if (stats.lastRescueDate === today || stats.lastRescueDate === yesterday) {
      return { isActive: true, broken: false };
    }

    // Streak was broken
    if (stats.currentStreak > 0) {
      // Reset streak
      const currentStats = this.getStats();
      currentStats.currentStreak = 0;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(currentStats));
      
      return { isActive: false, broken: true };
    }

    return { isActive: false, broken: false };
  }

  /**
   * Get or create team goal
   */
  static getTeamGoal(): TeamGoal {
    const stored = localStorage.getItem(this.TEAM_GOAL_KEY);
    
    if (stored) {
      const goal = JSON.parse(stored);
      
      // Check if goal period expired
      const now = new Date();
      const endsAt = new Date(goal.endsAt);
      
      if (now > endsAt) {
        // Goal expired, create new one
        return this.createNewTeamGoal(goal.period, goal.target);
      }
      
      return goal;
    }

    // Create default weekly goal of 30 rescues
    return this.createNewTeamGoal('weekly', 30);
  }

  /**
   * Create a new team goal
   */
  private static createNewTeamGoal(period: 'daily' | 'weekly', target: number): TeamGoal {
    const now = new Date();
    const startsAt = now.toISOString();
    
    let endsAt: Date;
    if (period === 'daily') {
      endsAt = new Date(now);
      endsAt.setHours(23, 59, 59, 999);
    } else {
      // Weekly - ends next Sunday at midnight
      endsAt = new Date(now);
      const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
      endsAt.setDate(now.getDate() + daysUntilSunday);
      endsAt.setHours(23, 59, 59, 999);
    }

    const goal: TeamGoal = {
      target,
      current: 0,
      period,
      startsAt,
      endsAt: endsAt.toISOString(),
    };

    localStorage.setItem(this.TEAM_GOAL_KEY, JSON.stringify(goal));
    return goal;
  }

  /**
   * Increment team goal progress
   */
  private static incrementTeamGoal(): void {
    const goal = this.getTeamGoal();
    goal.current = Math.min(goal.current + 1, goal.target);
    localStorage.setItem(this.TEAM_GOAL_KEY, JSON.stringify(goal));
  }

  /**
   * Get all rescues (for calculating team progress)
   */
  static getAllRescues(): Array<{ prNumber: number; timestamp: number }> {
    const rescued = localStorage.getItem(this.RESCUES_KEY);
    return rescued ? JSON.parse(rescued) : [];
  }

  /**
   * Update time-based counters (daily/weekly)
   */
  private static updateTimePeriods(stats: RescueStats): RescueStats {
    if (!stats.lastRescueDate) return stats;

    const today = this.getTodayString();
    const weekAgo = this.getWeekAgoString();

    // Reset daily count if last rescue wasn't today
    if (stats.lastRescueDate !== today) {
      stats.rescuesToday = 0;
    }

    // Reset weekly count if last rescue was more than a week ago
    if (stats.lastRescueDate < weekAgo) {
      stats.rescuesThisWeek = 0;
    }

    return stats;
  }

  /**
   * Helper: Get today's date as YYYY-MM-DD
   */
  private static getTodayString(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  /**
   * Helper: Get yesterday's date as YYYY-MM-DD
   */
  private static getYesterdayString(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }

  /**
   * Helper: Get date from a week ago as YYYY-MM-DD
   */
  private static getWeekAgoString(): string {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return weekAgo.toISOString().split('T')[0];
  }

  /**
   * Helper: Check if date is yesterday
   */
  private static isYesterday(dateString: string): boolean {
    return dateString === this.getYesterdayString();
  }

  /**
   * Reset all stats (for testing)
   */
  static reset(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.TEAM_GOAL_KEY);
    localStorage.removeItem(this.RESCUES_KEY);
  }
}