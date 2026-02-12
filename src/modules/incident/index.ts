/**
 * Incident module - Semantic access to ServiceNow incident management.
 *
 * This is one of the Priority 1 domain modules based on user requirements.
 * Provides incident lifecycle operations with semantic parameter names
 * (e.g., "high" for priority) for improved AI assistant discoverability.
 *
 * Read operations (list_incidents, get_incident) are always available.
 * Write operations (create_incident, update_incident, resolve_incident,
 * add_incident_comment) are only registered when config.allow_write is true.
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
  listIncidents,
  getIncident,
  createIncident,
  updateIncident,
  resolveIncident,
  addIncidentComment,
  listIncidentsSchema,
  getIncidentSchema,
  createIncidentSchema,
  updateIncidentSchema,
  resolveIncidentSchema,
  addIncidentCommentSchema,
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

    // Determine type and default value
    let type = 'string';
    let defaultValue: any;
    let enumValues: any[] | undefined;

    if (zodField instanceof z.ZodString) {
      type = 'string';
    } else if (zodField instanceof z.ZodNumber) {
      type = 'number';
      defaultValue = (zodField._def as any).defaultValue;
    } else if (zodField instanceof z.ZodBoolean) {
      type = 'boolean';
      defaultValue = (zodField._def as any).defaultValue;
    } else if (zodField instanceof z.ZodRecord) {
      type = 'object';
    } else if (zodField instanceof z.ZodEnum) {
      type = 'string';
      enumValues = zodField._def.values;
    } else if (zodField instanceof z.ZodDefault) {
      // Handle z.default() wrapped schemas
      const innerType = zodField._def.innerType;
      if (innerType instanceof z.ZodEnum) {
        type = 'string';
        enumValues = innerType._def.values;
      }
      defaultValue = zodField._def.defaultValue;
    }

    properties[key] = { type, description };

    if (enumValues) {
      properties[key].enum = enumValues;
    }

    if (defaultValue !== undefined) {
      properties[key].default =
        typeof defaultValue === 'function' ? defaultValue() : defaultValue;
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
 * Incident module definition.
 *
 * Implements the ServiceNowModule interface for registration with
 * the module registry.
 */
export const incidentModule: ServiceNowModule = {
  name: 'incident',
  description: 'Incident Management (list/get/create/update/resolve/comment)',

  getTools(client: ServiceNowClient, config: ModuleConfig): ModuleTools {
    const tools: Tool[] = [];
    const handlers = new Map<string, ToolHandler>();

    // Read-only tools - always available
    tools.push({
      name: 'list_incidents',
      description:
        'List incidents with semantic filtering (state, priority, assigned_to, etc.)',
      inputSchema: zodToJsonSchema(listIncidentsSchema),
    });

    handlers.set('list_incidents', async (args) => {
      const params = listIncidentsSchema.parse(args);
      return listIncidents(client, params);
    });

    tools.push({
      name: 'get_incident',
      description: 'Get a single incident by sys_id or incident number',
      inputSchema: zodToJsonSchema(getIncidentSchema),
    });

    handlers.set('get_incident', async (args) => {
      const params = getIncidentSchema.parse(args);
      return getIncident(client, params);
    });

    // Write tools - only when allow_write is true
    if (config.allow_write) {
      tools.push({
        name: 'create_incident',
        description:
          'Create a new incident with semantic parameters (short_description required)',
        inputSchema: zodToJsonSchema(createIncidentSchema),
      });

      handlers.set('create_incident', async (args) => {
        const params = createIncidentSchema.parse(args);
        return createIncident(client, params);
      });

      tools.push({
        name: 'update_incident',
        description: 'Update an existing incident with arbitrary field updates',
        inputSchema: zodToJsonSchema(updateIncidentSchema),
      });

      handlers.set('update_incident', async (args) => {
        const params = updateIncidentSchema.parse(args);
        return updateIncident(client, params);
      });

      tools.push({
        name: 'resolve_incident',
        description:
          'Resolve an incident by setting state to resolved with close_code and close_notes',
        inputSchema: zodToJsonSchema(resolveIncidentSchema),
      });

      handlers.set('resolve_incident', async (args) => {
        const params = resolveIncidentSchema.parse(args);
        return resolveIncident(client, params);
      });

      tools.push({
        name: 'add_incident_comment',
        description:
          'Add a work note (internal) or comment (customer-visible) to an incident',
        inputSchema: zodToJsonSchema(addIncidentCommentSchema),
      });

      handlers.set('add_incident_comment', async (args) => {
        const params = addIncidentCommentSchema.parse(args);
        return addIncidentComment(client, params);
      });
    }

    return { tools, handlers };
  },
};
