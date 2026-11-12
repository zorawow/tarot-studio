import { deepWands } from './deepWands.ts';
import { deepCups } from './deepCups.ts';
import { deepSwords } from './deepSwords.ts';
import { deepPentacles } from './deepPentacles.ts';
import type { DeepTeaching } from './deepTypes.ts';
export const deepMinor: Record<string, DeepTeaching> = {...deepWands,...deepCups,...deepSwords,...deepPentacles};
