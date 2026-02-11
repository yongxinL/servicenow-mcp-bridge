/**
 * Knowledge Base module tool handlers.
 *
 * Provides semantic access to ServiceNow's kb_knowledge table for
 * searching and managing knowledge articles. This is the Priority 1
 * domain module based on user requirements.
 */

import { z } from 'zod';
import type { ServiceNowClient } from '../../client/index.js';
import { normalizeError } from '../../errors/index.js';

/**
 * Default fields to return for knowledge articles when not specified
 */
const DEFAULT_KB_FIELDS =
  'sys_id,number,short_description,text,kb_knowledge_base,workflow_state,sys_updated_on';

/**
 * Tool input schemas with AI-friendly descriptions
 */

export const searchKnowledgeSchema = z.object({
  query: z
    .string()
    .min(1)
    .describe(
      'Search term to find in knowledge articles (searches short_description and text fields)',
    ),
  limit: z
    .number()
    .int()
    .positive()
    .max(100)
    .default(10)
    .describe('Maximum number of articles to return (default: 10, max: 100)'),
  fields: z
    .string()
    .optional()
    .describe(
      'Optional comma-separated list of fields to return (default: sys_id, number, short_description, text, kb_knowledge_base, workflow_state, sys_updated_on)',
    ),
  published_only: z
    .boolean()
    .default(true)
    .describe(
      'Only return published articles (workflow_state=published). Set to false to include drafts (default: true)',
    ),
});

export const getArticleSchema = z.object({
  sys_id: z
    .string()
    .length(32)
    .describe(
      'The sys_id of the knowledge article to retrieve (32-character GUID)',
    ),
  fields: z
    .string()
    .optional()
    .describe('Optional comma-separated list of fields to return'),
});

export const createArticleSchema = z.object({
  short_description: z
    .string()
    .min(1)
    .describe('Title/short description of the knowledge article (required)'),
  text: z
    .string()
    .min(1)
    .describe('Full article content/body in HTML or plain text (required)'),
  kb_knowledge_base: z
    .string()
    .optional()
    .describe(
      'Knowledge base sys_id (optional, uses default if not specified)',
    ),
  kb_category: z
    .string()
    .optional()
    .describe('Category sys_id for organizing the article (optional)'),
});

export const updateArticleSchema = z.object({
  sys_id: z
    .string()
    .length(32)
    .describe(
      'The sys_id of the knowledge article to update (32-character GUID)',
    ),
  fields: z
    .record(z.unknown())
    .describe(
      'Key-value pairs of fields to update (e.g., {"short_description": "Updated title", "text": "Updated content"})',
    ),
});

/**
 * Tool handler types
 */
type SearchKnowledgeParams = z.infer<typeof searchKnowledgeSchema>;
type GetArticleParams = z.infer<typeof getArticleSchema>;
type CreateArticleParams = z.infer<typeof createArticleSchema>;
type UpdateArticleParams = z.infer<typeof updateArticleSchema>;

/**
 * Search knowledge articles by query term.
 *
 * Searches both short_description and text fields using LIKE query.
 * By default, only returns published articles.
 */
export async function searchKnowledge(
  client: ServiceNowClient,
  params: SearchKnowledgeParams,
) {
  try {
    // Build encoded query: search in short_description OR text
    // Example: short_descriptionLIKEterm^ORtextLIKEterm
    let query = `short_descriptionLIKE${params.query}^ORtextLIKE${params.query}`;

    // Filter for published articles by default
    if (params.published_only) {
      query += '^workflow_state=published';
    }

    // Build query parameters
    const queryParams: Record<string, string | number> = {
      sysparm_query: query,
      sysparm_limit: params.limit,
      sysparm_fields: params.fields || DEFAULT_KB_FIELDS,
    };

    // Execute search
    const response = await client.get('kb_knowledge', queryParams);

    // Return results with metadata
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            query: params.query,
            count: response.result.length,
            hasMore: response.result.length === params.limit,
            published_only: params.published_only,
            articles: response.result,
          }),
        },
      ],
    };
  } catch (error) {
    return normalizeError(error);
  }
}

/**
 * Get a single knowledge article by sys_id.
 *
 * Returns the full article including all content.
 */
export async function getArticle(
  client: ServiceNowClient,
  params: GetArticleParams,
) {
  try {
    // Build query parameters
    const queryParams: Record<string, string> = {};
    if (params.fields) {
      queryParams.sysparm_fields = params.fields;
    }

    // Get article
    const article = await client.getById(
      'kb_knowledge',
      params.sys_id,
      queryParams,
    );

    // Return article with metadata
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            sys_id: params.sys_id,
            article,
          }),
        },
      ],
    };
  } catch (error) {
    return normalizeError(error);
  }
}

/**
 * Create a new knowledge article.
 *
 * Creates an article with the specified content and optional metadata.
 */
export async function createArticle(
  client: ServiceNowClient,
  params: CreateArticleParams,
) {
  try {
    // Build article data
    const articleData: Record<string, unknown> = {
      short_description: params.short_description,
      text: params.text,
    };

    // Add optional fields
    if (params.kb_knowledge_base) {
      articleData.kb_knowledge_base = params.kb_knowledge_base;
    }
    if (params.kb_category) {
      articleData.kb_category = params.kb_category;
    }

    // Create article
    const article = await client.post('kb_knowledge', articleData);

    // Return created article with metadata
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            sys_id: (article as any).sys_id,
            number: (article as any).number,
            article,
            message: 'Knowledge article created successfully',
          }),
        },
      ],
    };
  } catch (error) {
    return normalizeError(error);
  }
}

/**
 * Update an existing knowledge article.
 *
 * Updates the specified fields of an article.
 */
export async function updateArticle(
  client: ServiceNowClient,
  params: UpdateArticleParams,
) {
  try {
    // Update article
    const article = await client.patch(
      'kb_knowledge',
      params.sys_id,
      params.fields,
    );

    // Return updated article with metadata
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            sys_id: params.sys_id,
            article,
            message: 'Knowledge article updated successfully',
          }),
        },
      ],
    };
  } catch (error) {
    return normalizeError(error);
  }
}
