/**
 * Generic module tool handlers.
 *
 * Provides direct access to any ServiceNow table via the Table API.
 * This module serves as the "power-user escape hatch" for operations
 * on tables that don't have dedicated domain modules.
 */

import { z } from 'zod';
import type { ServiceNowClient } from '../../client/index.js';
import { normalizeError } from '../../errors/index.js';

/**
 * Validate table name to prevent injection attacks.
 * Allows alphanumeric characters and underscores only.
 */
function validateTableName(table: string): boolean {
  return /^[a-z0-9_]+$/i.test(table);
}

/**
 * Tool input schemas with AI-friendly descriptions
 */

export const queryRecordsSchema = z.object({
  table: z
    .string()
    .min(1)
    .describe(
      "The ServiceNow table name (e.g., 'incident', 'cmdb_ci', 'sys_user')",
    ),
  query: z
    .string()
    .optional()
    .describe(
      'Optional encoded query string (sysparm_query format, e.g., "active=true^priority=1")',
    ),
  fields: z
    .string()
    .optional()
    .describe(
      'Optional comma-separated list of fields to return (e.g., "number,short_description,priority")',
    ),
  limit: z
    .number()
    .int()
    .positive()
    .max(1000)
    .default(10)
    .describe('Maximum number of records to return (default: 10, max: 1000)'),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe('Number of records to skip for pagination (default: 0)'),
  order_by: z
    .string()
    .optional()
    .describe(
      'Field to sort by, with optional direction (e.g., "priority", "sys_created_on DESC")',
    ),
});

export const getRecordSchema = z.object({
  table: z
    .string()
    .min(1)
    .describe("The ServiceNow table name (e.g., 'incident', 'sys_user')"),
  sys_id: z
    .string()
    .length(32)
    .describe('The sys_id of the record to retrieve (32-character GUID)'),
  fields: z
    .string()
    .optional()
    .describe(
      'Optional comma-separated list of fields to return (e.g., "number,short_description")',
    ),
});

export const createRecordSchema = z.object({
  table: z
    .string()
    .min(1)
    .describe("The ServiceNow table name (e.g., 'incident', 'cmdb_ci')"),
  fields: z
    .record(z.unknown())
    .describe(
      'Key-value pairs of field names and values for the new record (e.g., {"short_description": "Server down", "priority": "1"})',
    ),
});

export const updateRecordSchema = z.object({
  table: z
    .string()
    .min(1)
    .describe("The ServiceNow table name (e.g., 'incident')"),
  sys_id: z
    .string()
    .length(32)
    .describe('The sys_id of the record to update (32-character GUID)'),
  fields: z
    .record(z.unknown())
    .describe(
      'Key-value pairs of fields to update (e.g., {"state": "6", "close_notes": "Resolved"})',
    ),
});

export const deleteRecordSchema = z.object({
  table: z
    .string()
    .min(1)
    .describe("The ServiceNow table name (e.g., 'incident')"),
  sys_id: z
    .string()
    .length(32)
    .describe('The sys_id of the record to delete (32-character GUID)'),
});

/**
 * Tool handler types
 */
type QueryRecordsParams = z.infer<typeof queryRecordsSchema>;
type GetRecordParams = z.infer<typeof getRecordSchema>;
type CreateRecordParams = z.infer<typeof createRecordSchema>;
type UpdateRecordParams = z.infer<typeof updateRecordSchema>;
type DeleteRecordParams = z.infer<typeof deleteRecordSchema>;

/**
 * Query records from any ServiceNow table.
 *
 * Supports filtering, field selection, pagination, and sorting.
 * Returns an array of records matching the query criteria.
 */
export async function queryRecords(
  client: ServiceNowClient,
  params: QueryRecordsParams,
) {
  try {
    // Validate table name
    if (!validateTableName(params.table)) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: 'Invalid table name',
              details:
                'Table name must contain only alphanumeric characters and underscores',
            }),
          },
        ],
        isError: true,
      };
    }

    // Build query parameters
    const queryParams: Record<string, string | number> = {
      sysparm_limit: params.limit,
    };

    if (params.query) {
      queryParams.sysparm_query = params.query;
    }

    if (params.fields) {
      queryParams.sysparm_fields = params.fields;
    }

    if (params.offset !== undefined) {
      queryParams.sysparm_offset = params.offset;
    }

    if (params.order_by) {
      queryParams.sysparm_orderby = params.order_by;
    }

    // Execute query
    const response = await client.get(params.table, queryParams);

    // Return results with metadata
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            table: params.table,
            count: response.result.length,
            records: response.result,
          }),
        },
      ],
    };
  } catch (error) {
    return normalizeError(error);
  }
}

/**
 * Get a single record by sys_id from any ServiceNow table.
 */
export async function getRecord(
  client: ServiceNowClient,
  params: GetRecordParams,
) {
  try {
    // Validate table name
    if (!validateTableName(params.table)) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: 'Invalid table name',
              details:
                'Table name must contain only alphanumeric characters and underscores',
            }),
          },
        ],
        isError: true,
      };
    }

    // Build query parameters
    const queryParams: Record<string, string> = {};
    if (params.fields) {
      queryParams.sysparm_fields = params.fields;
    }

    // Get record
    const record = await client.getById(
      params.table,
      params.sys_id,
      queryParams,
    );

    // Return record with metadata
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            table: params.table,
            sys_id: params.sys_id,
            record,
          }),
        },
      ],
    };
  } catch (error) {
    return normalizeError(error);
  }
}

/**
 * Create a new record in any ServiceNow table.
 */
export async function createRecord(
  client: ServiceNowClient,
  params: CreateRecordParams,
) {
  try {
    // Validate table name
    if (!validateTableName(params.table)) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: 'Invalid table name',
              details:
                'Table name must contain only alphanumeric characters and underscores',
            }),
          },
        ],
        isError: true,
      };
    }

    // Create record
    const record = await client.post(params.table, params.fields);

    // Return created record with metadata
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            table: params.table,
            sys_id: (record as any).sys_id,
            record,
            message: 'Record created successfully',
          }),
        },
      ],
    };
  } catch (error) {
    return normalizeError(error);
  }
}

/**
 * Update an existing record in any ServiceNow table.
 */
export async function updateRecord(
  client: ServiceNowClient,
  params: UpdateRecordParams,
) {
  try {
    // Validate table name
    if (!validateTableName(params.table)) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: 'Invalid table name',
              details:
                'Table name must contain only alphanumeric characters and underscores',
            }),
          },
        ],
        isError: true,
      };
    }

    // Update record
    const record = await client.patch(
      params.table,
      params.sys_id,
      params.fields,
    );

    // Return updated record with metadata
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            table: params.table,
            sys_id: params.sys_id,
            record,
            message: 'Record updated successfully',
          }),
        },
      ],
    };
  } catch (error) {
    return normalizeError(error);
  }
}

/**
 * Delete a record from any ServiceNow table.
 */
export async function deleteRecord(
  client: ServiceNowClient,
  params: DeleteRecordParams,
) {
  try {
    // Validate table name
    if (!validateTableName(params.table)) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: 'Invalid table name',
              details:
                'Table name must contain only alphanumeric characters and underscores',
            }),
          },
        ],
        isError: true,
      };
    }

    // Delete record
    await client.delete(params.table, params.sys_id);

    // Return confirmation
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            table: params.table,
            sys_id: params.sys_id,
            message: 'Record deleted successfully',
          }),
        },
      ],
    };
  } catch (error) {
    return normalizeError(error);
  }
}
