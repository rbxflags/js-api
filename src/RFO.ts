import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { FlagListPreprocessor, ProcessedFlagList } from './FlagListPreprocessor';
import { RobloxVersionSearcher } from './RobloxVersionSearcher';
import { FlagList } from './MiscTypes';
import json5 from 'json5';

/**
  * Roblox Flag Optimizer Main Class
  * @example ```ts
  * const rfo = new RFO();
  * // Load & Preprocess flags - This downloads the flaglists alongside all flag files, and preprocesses them, for improved usage down the line
  * await rfo.preprocessFlags(true, [
  *   // you can put additional flag files not on disk here
  * ], true);
  * // You should modify .enabled properties in RFO.processedFlagList here
  * // Find Roblox Versions - You can also directly assign to rfo.versions if you want to have your own roblox version searcher
  * await rfo.findRoblox();
  * // Apply Flags
  * await rfo.applyFlags();
  * ```
  */
export class RFO {
  public static FlagListPreprocessor = FlagListPreprocessor;
  /** Preprocesses Flags */
  public preprocessor = new FlagListPreprocessor();
  public static RobloxVersionSearcher = RobloxVersionSearcher;
  /** Searches for Versions */
  public versionSearcher = new RobloxVersionSearcher();
  ////
  /** You'll likely want to modify the .enabled keys on this */
  public processedFlagList: ProcessedFlagList[] = [];
  /**
    * Are there any preprocessed flaglists?
    */
  public get hasProcessedFlags() {
    return this.processedFlagList.length > 0;
  }
  /**
    * Roblox Versions - assigned by findRoblox()
    */
  public robloxPaths: string[] = [];
  /**
    * Preprocess Flags
    * @example ```ts
    * const rfo = new RFO();
    * await rfo.preprocessFlags(true, [
    *   // you can put additional flag files not on disk here
    * ], true);
    * console.log(rfo.hasProcessedFlags); // => true
    */
  public async preprocessFlags(clearFlagList = false, flagList: FlagList[] = [], includeFlagsFromDisk = true) {
    if (clearFlagList) this.processedFlagList = [];
    this.processedFlagList.push(...await this.preprocessor.process(flagList, includeFlagsFromDisk));
    if (this.processedFlagList.length === 0) throw new Error('No flags found');
    return this;
  }
  /**
    * Find Roblox Paths
    * @example ```ts
    * const rfo = new RFO();
    * await rfo.findRoblox();
    * console.log(rfo.robloxPaths); // => ['C:/Program Files/Roblox/versions/version-f90af0b0c...',...]
    * ```
    */
  public async findRoblox() {
    this.robloxPaths = await this.versionSearcher.searchVersions(process.platform as any);
    if (this.robloxPaths.length === 0) console.warn('No Roblox Versions found');
    return this;
  }
  /** Merges processedFlagList into one flag list based on .enabled and .value properties */
  public getFlagFiles() {
    if (!this.hasProcessedFlags) throw new Error('Did not preprocess flags')
    if (this.processedFlagList.length === 0) throw new Error('No flags found');
    const flagFiles: string[] = [];
    for (const flagLists of this.processedFlagList) {
      for (const list of Object.values(flagLists)) {
        if (list.enabled) {
          flagFiles.push(...list.base)
          list.features.forEach(feature => {
            if (feature.multiple)
              for (const flag of feature.value) {
                const optionFiles = feature.options[flag];
                if (!optionFiles) throw new Error('Invalid flag value: ' + flag);
                flagFiles.push(...optionFiles);
              }
            else if (feature.value && feature.options[feature.value as any])
              flagFiles.push(...feature.options[feature.value as any]);
          })
        }
      }
    }
    return flagFiles;
  }
  /** Dump all enabled flags in order */
  public dumpFlags(flagFiles: string[] = this.getFlagFiles()) {
    let merged: Record<string, Record<string, any>> = {};
    for (const flagFile of flagFiles) {
      if (!existsSync(flagFile)) throw new Error('Flag file does not exist: ' + flagFile);
      merged[flagFile] = (json5.parse(readFileSync(flagFile, 'utf8')))
    }
    return merged;
  }
  /** Merges all flag files from getFlagFiles */
  public mergeFlagFiles(flagFiles: string[] = this.getFlagFiles()) {
    let merged: Record<string, any> = {};
    for (const flagFile of flagFiles) {
      if (!existsSync(flagFile)) throw new Error('Flag file does not exist: ' + flagFile);
      merged = {
        ...merged,
        ...json5.parse(readFileSync(flagFile, 'utf8'))
      }
    }
    return merged;
  }
  /** Applies the enabled flags in robloxPaths */
  public async applyFlags() {
    if (this.robloxPaths.length === 0) throw new Error('No Roblox Versions found');
    if (this.processedFlagList.length === 0) throw new Error('No flags found');
    const merged = this.mergeFlagFiles(this.getFlagFiles());
    for (const robloxPath of this.robloxPaths) {
      if (!existsSync(robloxPath)) throw new Error('Roblox Version does not exist: ' + robloxPath);
      if (!existsSync(`${robloxPath}/ClientSettings`)) mkdirSync(`${robloxPath}/ClientSettings`);
      writeFileSync(`${robloxPath}/ClientSettings/ClientAppSettings.json`, JSON.stringify(merged, null, 2));
    }
    return this;
  }
}
