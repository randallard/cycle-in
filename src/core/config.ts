import type { Weekday } from "./time";

/**
 * User-tunable preferences, in one place so a fork can change them easily
 * (the fork-and-configure goal, 2026-07-10). Everything downstream takes
 * these as parameters — nothing in the core reads a global.
 */
export interface CycleConfig {
  /** Maximum entries on the choices list (Ryan: config value, default 10). */
  maxOptions: number;
  /** First day of the week for weekly cadences and rollups.
   * 0 = Sunday … 6 = Saturday. Default Monday (Ryan's pick, 2026-07-08). */
  weekStartsOn: Weekday;
}

export const DEFAULT_CONFIG: CycleConfig = {
  maxOptions: 10,
  weekStartsOn: 1,
};
