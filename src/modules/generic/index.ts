/**
 * Generic module - Direct access to any ServiceNow table.
 *
 * This module provides the "power-user escape hatch" for operations on
 * tables that don't have dedicated domain modules. It exposes the raw
 * ServiceNow Table API capabilities.
 *
 * Read operations (query_records, get_record) are always available.
 * Write operations (create_record, update_record, delete_record) are
 * only registered when config.allow_write is true.
 */

import { z } from 'zod';
import type { ServiceNowClient } from '../../client/index.js';
import type {
  ServiceNowModule,
  ModuleConfig,
  Tool,
  ToolHandler,
  ModuleTools,
} from '../types.js';
import {
  queryRecords,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecord,
  queryRecordsSchema,
  getRecordSchema,
  createRecordSchema,
  updateRecordSchema,
  deleteRecordSchema,
} from './tools.js';

/**
 * Convert Zod schema to JSON Schema for MCP tool listing
 */
function zodToJsonSchema(schema: z.ZodObject<any>): any {
  const shape = schema._def.shape();
  const properties: any = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const zodField = value as z.ZodTypeAny;

    // Extract description
    const description = (zodField._def as any).description || '';

    // Determine type
    let type = 'string';
    let defaultValue: any;

    if (zodField instanceof z.ZodString) {
      type = 'string';
    } else if (zodField instanceof z.ZodNumber) {
      type = 'number';
      defaultValue = (zodField._def as any).defaultValue;
    } else if (zodField instanceof z.ZodRecord) {
      type = 'object';
    }

    properties[key] = { type, description };
    if (defaultValue !== undefined) {
      properties[key].default = defaultValue();
    }

    // Check if required (not optional)
    if (!zodField.isOptional()) {
      required.push(key);
    }
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
  };
}

/**
 * Generic module definition.
 *
 * Implements the ServiceNowModule interface for registration with
 * the module registry.
 */
export const genericModule: ServiceNowModule = {
  name: 'generic',
  description: 'Generic Table Operations (query/get/create/update/delete)',

  getTools(client: ServiceNowClient, config: ModuleConfig): ModuleTools {
    const tools: Tool[] = [];
    const handlers = new Map<string, ToolHandler>();

    // Read-only tools - always available
    tools.push({
      name: 'query_records',
      description:
        'Query records from any ServiceNow table with filtering, field selection, and pagination',
      inputSchema: zodToJsonSchema(queryRecordsSchema),
    });

    handlers.set('query_records', async (args) => {
      const params = queryRecordsSchema.parse(args);
      return queryRecords(client, params);
    });

    tools.push({
      name: 'get_record',
      description: 'Get a single record by sys_id from any ServiceNow table',
      inputSchema: zodToJsonSchema(getRecordSchema),
    });

    handlers.set('get_record', async (args) => {
      const params = getRecordSchema.parse(args);
      return getRecord(client, params);
    });

    // Write tools - only when allow_write is true
    if (config.allow_write) {
      tools.push({
        name: 'create_record',
        description: 'Create a new record in any ServiceNow table',
        inputSchema: zodToJsonSchema(createRecordSchema),
      });

      handlers.set('create_record', async (args) => {
        const params = createRecordSchema.parse(args);
        return createRecord(client, params);
      });

      tools.push({
        name: 'update_record',
        description: 'Update an existing record in any ServiceNow table',
        inputSchema: zodToJsonSchema(updateRecordSchema),
      });

      handlers.set('update_record', async (args) => {
        const params = updateRecordSchema.parse(args);
        return updateRecord(client, params);
      });

      tools.push({
        name: 'delete_record',
        description: 'Delete a record from any ServiceNow table',
        inputSchema: zodToJsonSchema(deleteRecordSchema),
      });

      handlers.set('delete_record', async (args) => {
        const params = deleteRecordSchema.parse(args);
        return deleteRecord(client, params);
      });
    }

    return { tools, handlers };
  },
};
