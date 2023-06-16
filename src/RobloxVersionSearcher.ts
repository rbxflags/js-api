import { promises as fs } from 'fs';
import path from 'path';
import { Platform } from './MiscTypes';

/**
 * @example ```ts
 * const searcher = new RFO.RobloxVersionSearcher();
 * const versions = await searcher.searchVersions('Windows')
 * console.log(versions);
 * ```
 */
export class RobloxVersionSearcher {
  private platformDirs: Record<string, string[]> = {
    windows: [
      process.env.ROBLOXVERSION!,
      process.env.ROBLOX!,
      'C:/Program Files/Roblox/versions/version-%s',
      'C:/Program Files (x86)/Roblox/versions/version-%s',
      `${process.env.localappdata}/Roblox/versions/version-%s`,
      `${process.env.appdata}/Roblox/versions/version-%s`,
    ].filter(v => v),
    macos: [
      process.env.ROBLOXVERSION!,
      process.env.ROBLOX!,
      '/Applications/Roblox.app/Contents/MacOS',
      '/Applications/Roblox.app/Contents/',
    ].filter(v => v),
    linux: [
      process.env.ROBLOXVERSION!,
      `${process.env.ROBLOX}/versions/version-%s`,
    ].filter(v => v),
  };

  public async searchVersions(platform: Platform): Promise<string[]> {
    const versionDirectories: string[] = [];

    const searchPaths = this.platformDirs[platform.toLowerCase() === 'darwin' ? 'macos' : platform.toLowerCase()];
    if (!searchPaths)
      throw new Error(`Unsupported platform: ${platform}`);

    for (const searchPath of searchPaths) {
      const resolvedPath = await this.resolvePath(searchPath);
      if (resolvedPath) {
        const versionDirectory = await this.searchVersionDirectory(resolvedPath);
        if (versionDirectory)
          versionDirectories.push(versionDirectory);
        else
          versionDirectories.push(resolvedPath);
      }
    }

    return versionDirectories;
  }

  private async searchVersionDirectory(directory: string): Promise<string | undefined> {
    try {
      const files = await fs.readdir(directory);
      for (const file of files) {
        if (file.startsWith('version-')) {
          return path.join(directory, file);
        }
      }
    } catch (error) {
      // Ignore any errors and continue to the next directory
    }

    return undefined;
  }

  private async resolvePath(directory: string): Promise<string | undefined> {
    if (!directory.includes('%s')) {
      // Directory doesn't contain %s, return it as-is
      return directory;
    }

    const baseDir = path.dirname(directory);
    const pattern = path.basename(directory.replace('%s', ''));
    try {
      const files = await fs.readdir(baseDir);
      for (const file of files) {
        if (file.includes(pattern)) {
          return path.join(baseDir, file);
        }
      }
    } catch (error) {
      // Ignore any errors and return undefined
    }

    return undefined;
  }
}
