/**
 * Module system exports.
 *
 * Provides the module registry and type definitions for ServiceNow domain modules.
 */

export { registerModules, ALL_MODULES } from './registry.js';
export type { ServiceNowModule, ModuleConfig } from './types.js';
