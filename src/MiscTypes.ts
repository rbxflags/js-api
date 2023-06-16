export type Platform = 'Windows' | 'MacOS' | 'Linux' | 'windows' | 'macos' | 'linux' | 'win32' | 'darwin'
export type FileHash = {
  /** Algorithm, throw err if MD5 */
  algorithm: string,
  /** Hash Digest */
  digest: string,
} | {
  /** No Algo */
  algorithm: 'none',
  /** Hash Digest */
  digest: undefined | null,
}
export type File = {
  /** File Route relative to {@link FlagItem.base} */
  f: string,
  /** File Hash */
  h: FileHash,
}
export type Feature<T extends string> = {
  /** Human-Readable Name */
  name: string,
  /** Question */
  question: string,
  /** Options */
  options: Record<T, File[]>,
  /** Default Option */
  default: T[],
  /** Multiple Choice */
  multiple: true,
  /** Minimum Choices */
  min: number,
  /** Maximum Choices */
  max: number,
} | {
  /** Human-Readable Name */
  name: string,
  /** Options */
  options: Record<T, File[]>,
  /** Default Option */
  default: T,
  /** Multiple Choice */
  multiple: false,
}
export type FlagItem = {
  /** Base URL - e.g. https://rfo.sh/flags/ */
  baseurl: string,
  /** Is it enabled by default */
  default: boolean,
  /** Human-Readable Name */
  name: string,
  /** Base Flags */
  base: File[],
  /** Feature List */
  features: Feature<any>[],
}
export type FlagList = Record<string, FlagItem>
export type Config = {
  /** Is the updater in dev mode */
  dev: boolean,
  /** Hash Checks */
  hashChecks: {
    /** Check for updates */
    update: boolean,
    /** Check if flag list hash matches - If false, always download flags */
    flags: boolean,
  },
  /** URLs */
  urls: {
    /** Flag Lists */
    flagLists: {
      /** Human-Readable Name */
      name: string,
      /** URL */
      url: string,
    }[],
    /** Default Flag List | Unshifted to flagLists */
    defaultFlagList: {
      /** Human-Readable Name */
      name: string,
      /** URL */
      url: string,
    },
  },
};
