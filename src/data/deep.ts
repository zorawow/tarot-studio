import { deepMajor } from './deepMajor.ts';
import { deepMinor } from './deepMinor.ts';
import type { DeepTeaching } from './deepTypes.ts';
export const deepById: Record<string, DeepTeaching> = {...deepMajor, ...deepMinor};
