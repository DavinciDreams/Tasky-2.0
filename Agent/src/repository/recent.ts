import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { RepositoryInfo } from './discovery';

export interface RecentRepository {
  path: string;
  name: string;
  lastAccessed: Date;
  accessCount: number;
}

export class RecentRepositoryManager {
  private static readonly CONFIG_DIR = join(homedir(), '.looper-cli');
  private static readonly RECENT_FILE = join(this.CONFIG_DIR, 'recent-repos.json');
  private static readonly MAX_RECENT = 10;

  /**
   * Initialize the configuration directory
   */
  private static ensureConfigDir(): void {
    if (!existsSync(this.CONFIG_DIR)) {
      mkdirSync(this.CONFIG_DIR, { recursive: true });
    }
  }

  /**
   * Load recent repositories from file
   */
  static loadRecentRepositories(): RecentRepository[] {
    this.ensureConfigDir();

    if (!existsSync(this.RECENT_FILE)) {
      return [];
    }

    try {
      const content = readFileSync(this.RECENT_FILE, 'utf8');
      const data = JSON.parse(content);

      // Convert date strings back to Date objects
      return data.map((repo: any) => ({
        ...repo,
        lastAccessed: new Date(repo.lastAccessed)
      }));
    } catch (error) {
      console.error('Failed to load recent repositories:', error);
      return [];
    }
  }

  /**
   * Save recent repositories to file
   */
  private static saveRecentRepositories(repos: RecentRepository[]): void {
    this.ensureConfigDir();

    try {
      const content = JSON.stringify(repos, null, 2);
      writeFileSync(this.RECENT_FILE, content, 'utf8');
    } catch (error) {
      console.error('Failed to save recent repositories:', error);
    }
  }

  /**
   * Add or update a repository in the recent list
   */
  static addRecentRepository(repo: RepositoryInfo): void {
    const recent = this.loadRecentRepositories();

    // Check if repository already exists
    const existingIndex = recent.findIndex(r => r.path.toLowerCase() === repo.path.toLowerCase());

    if (existingIndex >= 0) {
      // Update existing entry
      recent[existingIndex].lastAccessed = new Date();
      recent[existingIndex].accessCount++;

      // Move to front
      const [updated] = recent.splice(existingIndex, 1);
      recent.unshift(updated);
    } else {
      // Add new entry
      recent.unshift({
        path: repo.path,
        name: repo.name,
        lastAccessed: new Date(),
        accessCount: 1
      });
    }

    // Limit to maximum recent repositories
    if (recent.length > this.MAX_RECENT) {
      recent.splice(this.MAX_RECENT);
    }

    this.saveRecentRepositories(recent);
  }

  /**
   * Get recent repositories sorted by last access
   */
  static getRecentRepositories(): RecentRepository[] {
    return this.loadRecentRepositories();
  }

  /**
   * Remove a repository from recent list
   */
  static removeRecentRepository(path: string): void {
    const recent = this.loadRecentRepositories();
    const filtered = recent.filter(r => r.path.toLowerCase() !== path.toLowerCase());

    if (filtered.length < recent.length) {
      this.saveRecentRepositories(filtered);
    }
  }

  /**
   * Clear all recent repositories
   */
  static clearRecentRepositories(): void {
    this.saveRecentRepositories([]);
  }

  /**
   * Get most frequently accessed repositories
   */
  static getFrequentRepositories(limit: number = 5): RecentRepository[] {
    const recent = this.loadRecentRepositories();
    return recent.sort((a, b) => b.accessCount - a.accessCount).slice(0, limit);
  }
}
