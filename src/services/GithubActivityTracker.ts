import { ServiceRegistry } from '../services/ServiceRegistry';
import { XPSystem } from '../services/XPSystem';
import type { RescuerStats } from '../services/github.types';

/**
 * GitHub Activity Tracker
 * Syncs XP with actual GitHub reviews and comments
 */

interface ActivitySnapshot {
  username: string;
  totalRescues: number;
  criticalRescues: number;
  urgentRescues: number;
  warningRescues: number;
  approvals: number;
  changesRequested: number;
  comments: number;
  lastChecked: number;
}

export class GitHubActivityTracker {
  private static readonly STORAGE_KEY = 'github_activity_snapshot';
  private static readonly USERNAME_KEY = 'github_username';

  /**
   * Sync XP with GitHub activity
   * Compares current activity with last snapshot and awards XP for new activity
   */
  static async syncXP(options?: {
    username?: string;
    minAge?: number;
    timeUnit?: 'hours' | 'days';
  }): Promise<{ xpGained: number; newActivities: string[]; leveledUp?: boolean; newLevel?: number }> {
    const { username, minAge = 7, timeUnit = 'days' } = options || {};

    try {
      const github = ServiceRegistry.getGitHub();
      
      // Get username from parameter or storage
      const user = username || this.getStoredUsername();
      if (!user) {
        console.warn('No username set. Set with GitHubActivityTracker.setUsername()');
        return { xpGained: 0, newActivities: [] };
      }

      console.log(`🔍 Syncing activity for ${user} (${minAge}+ ${timeUnit})`);

      // Get current rescue stats from GitHub
      const rescuers = await github.getTopRescuers(100, minAge, timeUnit, true);
      console.log(`📊 Found ${rescuers.length} total rescuers`);
      
      const currentStats = rescuers.find(r => r.username === user);

      if (!currentStats) {
        console.log(`❌ No rescue activity found for ${user}`);
        console.log(`💡 Make sure you've reviewed/commented on PRs that are ${minAge}+ ${timeUnit} old`);
        return { xpGained: 0, newActivities: [] };
      }

      console.log(`✅ Found activity for ${user}:`, currentStats);

      // Get last snapshot
      const lastSnapshot = this.getLastSnapshot(user);

      // Track level before awarding XP
      const levelBefore = XPSystem.getUserXP().level;

      // Calculate differences (new activity since last check)
      const newActivities: string[] = [];
      let totalXPGained = 0;

      if (lastSnapshot) {
        // Critical rescues (new ones)
        const newCritical = Math.max(0, currentStats.criticalRescues - lastSnapshot.criticalRescues);
        if (newCritical > 0) {
          for (let i = 0; i < newCritical; i++) {
            const gain = XPSystem.awardXP('CRITICAL_RESCUE');
            totalXPGained += gain.amount;
          }
          newActivities.push(`${newCritical} critical rescue${newCritical > 1 ? 's' : ''}`);
        }

        // Urgent rescues
        const newUrgent = Math.max(0, currentStats.urgentRescues - lastSnapshot.urgentRescues);
        if (newUrgent > 0) {
          for (let i = 0; i < newUrgent; i++) {
            const gain = XPSystem.awardXP('URGENT_RESCUE');
            totalXPGained += gain.amount;
          }
          newActivities.push(`${newUrgent} urgent rescue${newUrgent > 1 ? 's' : ''}`);
        }

        // Warning rescues
        const newWarning = Math.max(0, currentStats.warningRescues - lastSnapshot.warningRescues);
        if (newWarning > 0) {
          for (let i = 0; i < newWarning; i++) {
            const gain = XPSystem.awardXP('WARNING_RESCUE');
            totalXPGained += gain.amount;
          }
          newActivities.push(`${newWarning} warning rescue${newWarning > 1 ? 's' : ''}`);
        }

        // Approvals (new ones)
        const newApprovals = Math.max(0, currentStats.approvals - lastSnapshot.approvals);
        if (newApprovals > 0) {
          for (let i = 0; i < newApprovals; i++) {
            const gain = XPSystem.awardXP('APPROVAL');
            totalXPGained += gain.amount;
          }
          newActivities.push(`${newApprovals} approval${newApprovals > 1 ? 's' : ''}`);
        }

        // Changes requested
        const newChangesRequested = Math.max(0, currentStats.changesRequested - lastSnapshot.changesRequested);
        if (newChangesRequested > 0) {
          for (let i = 0; i < newChangesRequested; i++) {
            const gain = XPSystem.awardXP('CHANGES_REQUESTED');
            totalXPGained += gain.amount;
          }
          newActivities.push(`${newChangesRequested} change request${newChangesRequested > 1 ? 's' : ''}`);
        }

        // Comments
        const newComments = Math.max(0, currentStats.comments - lastSnapshot.comments);
        if (newComments > 0) {
          for (let i = 0; i < newComments; i++) {
            const gain = XPSystem.awardXP('COMMENT');
            totalXPGained += gain.amount;
          }
          newActivities.push(`${newComments} comment${newComments > 1 ? 's' : ''}`);
        }
      } else {
        // First time - award XP for all existing activity
        console.log('First sync - awarding XP for all existing activity');

        // Award for all rescues
        for (let i = 0; i < currentStats.criticalRescues; i++) {
          totalXPGained += XPSystem.awardXP('CRITICAL_RESCUE').amount;
        }
        for (let i = 0; i < currentStats.urgentRescues; i++) {
          totalXPGained += XPSystem.awardXP('URGENT_RESCUE').amount;
        }
        for (let i = 0; i < currentStats.warningRescues; i++) {
          totalXPGained += XPSystem.awardXP('WARNING_RESCUE').amount;
        }
        for (let i = 0; i < currentStats.approvals; i++) {
          totalXPGained += XPSystem.awardXP('APPROVAL').amount;
        }
        for (let i = 0; i < currentStats.changesRequested; i++) {
          totalXPGained += XPSystem.awardXP('CHANGES_REQUESTED').amount;
        }
        for (let i = 0; i < currentStats.comments; i++) {
          totalXPGained += XPSystem.awardXP('COMMENT').amount;
        }

        newActivities.push('Initial sync complete');
      }

      // Save new snapshot
      this.saveSnapshot(user, currentStats);

      // Check if leveled up
      const levelAfter = XPSystem.getUserXP().level;
      const leveledUp = levelAfter > levelBefore;

      return {
        xpGained: totalXPGained,
        newActivities,
        leveledUp,
        newLevel: leveledUp ? levelAfter : undefined,
      };

    } catch (error) {
      console.error('Error syncing GitHub activity:', error);
      return { xpGained: 0, newActivities: [] };
    }
  }

  /**
   * Get last activity snapshot
   */
  private static getLastSnapshot(username: string): ActivitySnapshot | null {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return null;

    const snapshots: Record<string, ActivitySnapshot> = JSON.parse(stored);
    return snapshots[username] || null;
  }

  /**
   * Save current activity snapshot
   */
  private static saveSnapshot(username: string, stats: RescuerStats): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    const snapshots: Record<string, ActivitySnapshot> = stored ? JSON.parse(stored) : {};

    snapshots[username] = {
      username: stats.username,
      totalRescues: stats.rescueCount,
      criticalRescues: stats.criticalRescues,
      urgentRescues: stats.urgentRescues,
      warningRescues: stats.warningRescues,
      approvals: stats.approvals,
      changesRequested: stats.changesRequested,
      comments: stats.comments,
      lastChecked: Date.now(),
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(snapshots));
  }

  /**
   * Set GitHub username for tracking
   */
  static setUsername(username: string): void {
    localStorage.setItem(this.USERNAME_KEY, username);
    console.log(`✅ GitHub username set to: ${username}`);
  }

  /**
   * Get stored GitHub username
   */
  static getStoredUsername(): string | null {
    return localStorage.getItem(this.USERNAME_KEY);
  }

  /**
   * Check if username is set
   */
  static hasUsername(): boolean {
    return this.getStoredUsername() !== null;
  }

  /**
   * Reset tracking (for testing)
   */
  static reset(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.USERNAME_KEY);
  }

  /**
   * Get current GitHub stats for user
   */
  static async getCurrentStats(username?: string): Promise<RescuerStats | null> {
    try {
      const github = ServiceRegistry.getGitHub();
      const user = username || this.getStoredUsername();
      
      if (!user) return null;

      const rescuers = await github.getTopRescuers(100, 7, 'days', true);
      return rescuers.find(r => r.username === user) || null;

    } catch (error) {
      console.error('Error getting current stats:', error);
      return null;
    }
  }

  /**
   * Debug: Check what GitHub sees for your username
   */
  static async debugUserActivity(minAge = 1, timeUnit: 'hours' | 'days' = 'hours'): Promise<void> {
    const user = this.getStoredUsername();
    if (!user) {
      console.log('❌ No username set');
      return;
    }

    console.log(`\n🔍 Debugging GitHub activity for: ${user}`);
    console.log(`⏰ Looking for activity on PRs ${minAge}+ ${timeUnit} old\n`);

    try {
      const github = ServiceRegistry.getGitHub();
      const rescuers = await github.getTopRescuers(100, minAge, timeUnit, true);
      
      console.log(`📊 Total rescuers found: ${rescuers.length}`);
      
      const userStats = rescuers.find(r => r.username === user);
      
      if (userStats) {
        console.log(`✅ Found activity for ${user}:`);
        console.log(`  🔥 Critical rescues (14+ ${timeUnit}): ${userStats.criticalRescues}`);
        console.log(`  🟠 Urgent rescues (7-13 ${timeUnit}): ${userStats.urgentRescues}`);
        console.log(`  🟡 Warning rescues (3-6 ${timeUnit}): ${userStats.warningRescues}`);
        console.log(`  ✅ Approvals: ${userStats.approvals}`);
        console.log(`  🔄 Changes requested: ${userStats.changesRequested}`);
        console.log(`  💬 Comments: ${userStats.comments}`);
        console.log(`  📊 Total rescues: ${userStats.rescueCount}`);
        console.log(`  ⭐ Points: ${userStats.points}`);
      } else {
        console.log(`❌ No activity found for ${user}`);
        console.log(`\n💡 Possible reasons:`);
        console.log(`  1. You haven't reviewed/commented on any PRs`);
        console.log(`  2. The PRs you reviewed are not ${minAge}+ ${timeUnit} old`);
        console.log(`  3. Your username is incorrect (current: ${user})`);
        console.log(`\n🔧 Try:`);
        console.log(`  - Check the PR age with: const prs = await github.getTop10MostNeglectedPRs(${minAge}, '${timeUnit}')`);
        console.log(`  - Make sure your comment/review is on one of those PRs`);
      }
      
      console.log(`\n📋 All rescuers (top 10):`);
      rescuers.slice(0, 10).forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.username}: ${r.rescueCount} rescues (${r.points} pts)`);
      });
      
    } catch (error) {
      console.error('❌ Error:', error);
    }
  }
}