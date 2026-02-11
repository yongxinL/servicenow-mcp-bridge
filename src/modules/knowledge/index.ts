/**
 * Knowledge Base module - Semantic access to ServiceNow knowledge articles.
 *
 * This is the Priority 1 domain module based on user requirements.
 * Provides search and retrieval capabilities for the kb_knowledge table.
 *
 * Read operations (search_knowledge, get_article) are always available.
 * Write operations (create_article, update_article) are only registered
 * when config.allow_write is true.
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
  searchKnowledge,
  getArticle,
  createArticle,
  updateArticle,
  searchKnowledgeSchema,
  getArticleSchema,
  createArticleSchema,
  updateArticleSchema,
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
 * Knowledge Base module definition.
 *
 * Implements the ServiceNowModule interface for registration with
 * the module registry.
 */
export const knowledgeModule: ServiceNowModule = {
  name: 'knowledge',
  description: 'Knowledge Base (search/get/create/update articles)',

  getTools(client: ServiceNowClient, config: ModuleConfig): ModuleTools {
    const tools: Tool[] = [];
    const handlers = new Map<string, ToolHandler>();

    // Read-only tools - always available
    tools.push({
      name: 'search_knowledge',
      description:
        'Search knowledge articles by query term (searches short_description and text fields)',
      inputSchema: zodToJsonSchema(searchKnowledgeSchema),
    });

    handlers.set('search_knowledge', async (args) => {
      const params = searchKnowledgeSchema.parse(args);
      return searchKnowledge(client, params);
    });

    tools.push({
      name: 'get_article',
      description:
        'Get a knowledge article by sys_id with full content',
      inputSchema: zodToJsonSchema(getArticleSchema),
    });

    handlers.set('get_article', async (args) => {
      const params = getArticleSchema.parse(args);
      return getArticle(client, params);
    });

    // Write tools - only when allow_write is true
    if (config.allow_write) {
      tools.push({
        name: 'create_article',
        description:
          'Create a new knowledge article with title and content',
        inputSchema: zodToJsonSchema(createArticleSchema),
      });

      handlers.set('create_article', async (args) => {
        const params = createArticleSchema.parse(args);
        return createArticle(client, params);
      });

      tools.push({
        name: 'update_article',
        description: 'Update an existing knowledge article',
        inputSchema: zodToJsonSchema(updateArticleSchema),
      });

      handlers.set('update_article', async (args) => {
        const params = updateArticleSchema.parse(args);
        return updateArticle(client, params);
      });
    }

    return { tools, handlers };
  },
};
