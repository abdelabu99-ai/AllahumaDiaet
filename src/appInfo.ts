import Constants from 'expo-constants';

import { buildUserAgent } from './lib/openFoodFacts';

// Name und Version kommen aus app.json, damit sie nur an einer Stelle gepflegt werden.
export const APP_NAME = Constants.expoConfig?.name ?? 'HALABI';
export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export const CONTACT_EMAIL = 'abdel.abu99@gmail.com';

export const USER_AGENT = buildUserAgent(APP_NAME, APP_VERSION, CONTACT_EMAIL);
