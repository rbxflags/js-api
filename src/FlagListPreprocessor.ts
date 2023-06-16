import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import json5 from 'json5';
import toml from 'toml';
import crypto from 'crypto';
import axios from 'axios';
import { Config, FlagList, File } from './MiscTypes';

//////

export type ProcessedFeature = {
  name: string;
  options: Record<string, string[]>;
  default: string[];
  value: string[];
  multiple: true;
  min: number;
  max: number;
} | {
  name: string;
  options: Record<string, string[]>;
  default: string;
  value: string;
  multiple: false;
  min: null;
  max: null;
}
export type ProcessedFlagListItem = {
  name: string;
  baseurl: string;
  default: boolean;
  enabled: boolean;
  base: string[];
  features: ProcessedFeature[];
}
export type ProcessedFlagList = Record<string, ProcessedFlagListItem>

/**
 * Preprocesses Flag Lists, to provide easier-to-use and cached flag lists.
 * @example ```ts
 * const preprocessor = new RFO.FlagListPreprocessor();
 * const processed = await preprocessor.process();
 * require('fs').writeFileSync('./flagLists.json', JSON.stringify(processed, null, 2));
 * ```
 */
export class FlagListPreprocessor {
  /**
    * Downloads a file with a checksum & cache.
    * @param {File} file File to download
    * @param {string} baseUrl Base URL to prepend
    * @returns Path to downloaded file
    * @example ```ts
    * const file = {
    *   f: 'https://rfo.sh/flags/flags.json',
    *   h: {
    *     algorithm: 'SHA512',
    *     hash: 'osamabinladen',
    *   },
    * };
    * const cachedFilePath = await FlagListPreprocessor.downloadFile(file);
    * ```
    */
  static async downloadFile(file: File, baseUrl: string = ''): Promise<string> {
    file = {
      ...file,
      f: `${baseUrl}${file.f}`,
    };
    if (file.h.algorithm.toUpperCase() === 'MD5') {
      throw new Error('FATAL: INSECURE: MD5 is not supported');
    }
    if (file.h.algorithm.toUpperCase() === 'SHA1') {
      throw new Error('FATAL: INSECURE: SHA1 is not supported');
    }
    if (file.h.algorithm !== 'none') {
      const fileRoute = `_cache/${file.h.digest}`;
      if (existsSync(fileRoute)) {
        return fileRoute;
      }
      const fileResponse = await axios.get(fileRoute);
      if (fileResponse.status !== 200) {
        throw new Error(`Failed to download file ${file.f} from ${fileRoute}: ${fileResponse.status} ${fileResponse.statusText}`);
      }
      const fileBuffer = Buffer.from(fileResponse.data, 'binary');
      const fileHash = crypto.createHash(file.h.algorithm).update(fileBuffer).digest('hex');
      if (fileHash !== file.h.digest) {
        throw new Error(`File ${file.f} from ${fileRoute} has an invalid hash`);
      }
      writeFileSync(fileRoute, fileBuffer);
      return fileRoute;
    } else {
      const fileResponse = await axios.get(file.f, { responseType: 'arraybuffer' });
      if (fileResponse.status !== 200) {
        throw new Error(`Failed to download file ${file.f}: ${fileResponse.status} ${fileResponse.statusText}`);
      }
      const fileBuffer = Buffer.from(fileResponse.data, 'binary');
      const fileHash = crypto.createHash('SHA512').update(fileBuffer).digest('hex');
      writeFileSync(`_cache/${fileHash}`, fileBuffer);
      return `_cache/${fileHash}`;
    }
  }

  /**
   * Merges obj and defaultObj, defaulting obj to defaultObj.
   * @param {T} obj Object to default
   * @param {T2} defaultObj Default object
   * @returns {T & T2} Merged object
   * @example ```ts
   * const obj = {
   *   a: 1,
   *   b: {
   *     c: 2,
   *   },
   * };
   * const defaultObj = {
   *   a: 2,
   *   b: {
   *     c: 3,
   *     d: 4,
   *   },
   * };
   * const merged = FlagListPreprocessor.defaultRecursive(obj, defaultObj);
   * // => {a: 1, b: {c: 2, d: 4}}
   * ```
   */
  public static defaultRecursive<T, T2 extends T>(obj: T, defaultObj: T2): T & T2 {
    const objJoint = obj as unknown as T & T2;
    for (const key in defaultObj) {
      if (typeof objJoint[key] === 'object' && typeof defaultObj[key] === 'object') {
        objJoint[key] = this.defaultRecursive(objJoint[key], defaultObj[key]);
      } else {
        objJoint[key] = objJoint[key] ?? defaultObj[key];
      }
    }
    return objJoint;
  }

  /**
    * Hashes a string with SHA512.
    * @param {string | Buffer | Uint8Array | Uint16Array | Uint32Array} hash String to hash
    * @returns {string} Hex Hash
    * @example ```ts
    * const hash = FlagListPreprocessor.sha512digest('osamabinladen'); // => 'bc64956140705ca9cc97dcb467bcd0b1f7c9f546eca3628bf8b0cc889c9bf80a0eb60f5d4a93351dc8f417e86819a0ed15158a1678f9d4d9ebc75c4baec9f662'
    * ```
    */
  public static sha512digest(hash: string | Buffer | Uint8Array | Uint16Array | Uint32Array): string {
    return crypto.createHash('SHA512').update(hash).digest('hex');
  }

  /**
    * Flag List Dir
    */
  public flagListDir: string = existsSync(__dirname + '/flagLists/') ? __dirname + '/flagLists/' : existsSync(process.cwd() + '/flagLists/') ? process.cwd() + '/flagLists/' : './flagLists/';

  /**
    * The config for the preprocessor.
    * @type {Config}
    */
  public config: Config;
  /**
    * The flag lists.
    * @type {FlagList[]}
    * @private @internal
    */
  private flagLists: FlagList[];

  constructor() {
    this.config = this.loadConfig();
    this.flagLists = [];
  }

  /**
    * Loads the config from a specified file.
    * @param {string} configFile Path to config file
    * @returns {Config} Config
    * @example ```ts
    * const config = preprocessor.loadConfig('./config.json5'); // => config with default values inserted where undefined
    * ```
    */
  public loadConfig(configFile: string = './config.json5'): Config {
    const defaultConfig: Config = {
      dev: false,
      hashChecks: {
        update: false,
        flags: false,
      },
      urls: {
        flagLists: [],
        defaultFlagList: {
          name: 'Default Flags',
          url: 'https://raw.githubusercontent.com/rbxflags/Flags/main/flaglists.json5',
        },
        updater: 'https://rfo.sh/updater/updater.json5',
      },
    };
    const configData = existsSync(configFile) ? json5.parse(readFileSync(configFile, 'utf-8')) : {};
    return FlagListPreprocessor.defaultRecursive(configData, defaultConfig);
  }

  /**
    * Internal Method
    */
  private async fetchFlagLists(): Promise<void> {
    // push from config
    const flagListsData = await Promise.all([
      this.fetchFlagList(this.config.urls.defaultFlagList),
      ...this.config.urls.flagLists.map((flagList) => this.fetchFlagList(flagList)),
    ]);
    this.flagLists = flagListsData.filter((flagList) => flagList !== null) as FlagList[];
    // push from disk
    this.flagLists.push(...this.readLocalFlagLists());
  }

  /**
    * Internal Method
    */
  private async fetchFlagList(flagListUrl: { name: string; url: string }): Promise<FlagList | null> {
    try {
      const flagResponse = await axios.get(flagListUrl.url);
      if (flagResponse.status !== 200) {
        console.warn(`Failed to fetch flag list ${flagListUrl.name} from ${flagListUrl.url}`);
        return null;
      }
      const flagListText = flagResponse.data;
      const flagListJson = json5.parse(flagListText) as FlagList;
      return flagListJson;
    } catch (error) {
      console.error(error);
      throw new Error(`Failed to parse flag list ${flagListUrl.name} from ${flagListUrl.url}`);
    }
  }

  /**
    * Internal Method
    */
  private readLocalFlagLists(): FlagList[] {
    const flagListFiles = existsSync(this.flagListDir) ? readdirSync(this.flagListDir) : [];
    return flagListFiles.map((flagList) => {
      const flagListText = readFileSync(`${this.flagListDir}/${flagList}`, 'utf-8');
      try {
        const flagListJson = (flagList.toLowerCase().endsWith('json') ? JSON.parse : flagList.endsWith('toml') ? toml.parse : json5.parse)(flagListText) as FlagList;
        return flagListJson;
      } catch (error) {
        console.error(error);
        throw new Error(`Failed to parse flag list ${flagList}`);
      }
    });
  }

  /**
    * Internal Method
    */
  private async processFlagLists(): Promise<ProcessedFlagList[]> {
    const processedFlagLists: ProcessedFlagList[] = [];
    for (const flagList of this.flagLists) {
      const processedFlagList = await this.processFlagList(flagList);
      processedFlagLists.push(processedFlagList);
    }
    return processedFlagLists;
  }

  /**
    * Internal Method
    */
  private async processFlagList(flagList: FlagList): Promise<ProcessedFlagList> {
    const processedFlagList: ProcessedFlagList = {};
    for (const [name, flagListItem] of Object.entries(flagList)) {
      const { baseurl, base, features } = flagListItem;
      const baseFiles = await Promise.all(base.map((file) => FlagListPreprocessor.downloadFile(file, baseurl)));
      const processedFeatures = await Promise.all(
        features.map(async (feature) => {
          if (!feature.name) {
            throw new Error('Feature name is required');
          }
          const processedOptions = await Promise.all(
            Object.entries(feature.options).map(async ([optionName, files]) => {
              const filesDownloaded = await Promise.all(files.map((file) => FlagListPreprocessor.downloadFile(file, baseurl)));
              return {
                name: optionName,
                files: filesDownloaded,
              };
            })
          );
          const processedFeature: ProcessedFeature = feature.multiple ? {
            name: feature.name,
            options: Object.fromEntries(processedOptions.map((option) => [option.name, option.files])),
            default: feature.default,
            value: feature.default,
            multiple: true,
            min: feature.min,
            max: feature.max,
          } : {
            name: feature.name,
            options: Object.fromEntries(processedOptions.map((option) => [option.name, option.files])),
            default: feature.default,
            value: feature.default,
            multiple: false,
            min: null,
            max: null,
          }
          return processedFeature;
        })
      );
      const processedFlagListItem: ProcessedFlagListItem = {
        name,
        baseurl,
        default: flagListItem.default,
        base: baseFiles,
        features: processedFeatures,
        enabled: flagListItem.default,
      };
      processedFlagList[name] = processedFlagListItem;
    }
    return processedFlagList;
  }

  /**
    * Processes the flag lists.
    * @param {FlagList[]} flagLists Flag lists to process
    * @param {boolean} pushFlagListsFromDisk Whether to include flag lists in the flagLists/ dir & from the config
    * @returns {Promise<ProcessedFlagList[]>} Processed flag lists
    * @example ```ts
    * const processedFlagLists = await preprocessor.process(); // => processed flag lists
    * ```
    */
  public async process(flagLists: FlagList[] | null = null, pushFlagListsFromDisk: boolean = true): Promise<ProcessedFlagList[]> {
    if (!existsSync('_cache'))
      mkdirSync('_cache');
    this.config = this.loadConfig();
    if (flagLists)
      this.flagLists.push(...flagLists);
    if (pushFlagListsFromDisk)
      await this.fetchFlagLists();
    return await this.processFlagLists();
  }
}