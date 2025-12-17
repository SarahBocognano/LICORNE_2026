import { GitHubService } from './GithubService';

/**
 * Global service registry
 * Initialize once in LauncherScene, use anywhere in any scene
 */
export class ServiceRegistry {
  private static github: GitHubService | null = null;

  /**
   * Initialize GitHub service (call once in LauncherScene)
   */
  static initGitHub(config: { token: string; owner: string; repo: string }): void {
    this.github = new GitHubService(config);
    console.log('✅ GitHub service initialized');
  }

  /**
   * Get GitHub service instance (use in any scene)
   */
  static getGitHub(): GitHubService {
    if (!this.github) {
      throw new Error('GitHub service not initialized! Call ServiceRegistry.initGitHub() first.');
    }
    return this.github;
  }

  /**
   * Check if GitHub service is initialized
   */
  static isInitialized(): boolean {
    return this.github !== null;
  }
}