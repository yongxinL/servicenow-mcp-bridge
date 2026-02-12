/**
 * Incident module tool handlers.
 *
 * Provides semantic access to ServiceNow's incident table with
 * human-readable parameter names that map to ServiceNow field codes.
 */

import { z } from 'zod';
import type { ServiceNowClient } from '../../client/index.js';
import { normalizeError } from '../../errors/index.js';

/**
 * Semantic value mappings for ServiceNow incident fields.
 *
 * These allow AI assistants to use readable values like "high" instead
 * of numeric codes like "2".
 */

// State values: 1=New, 2=In Progress, 3=On Hold, 6=Resolved, 7=Closed
const STATE_MAP: Record<string, string> = {
  new: '1',
  'in_progress': '2',
  'on_hold': '3',
  resolved: '6',
  closed: '7',
};

// Priority values: 1=Critical, 2=High, 3=Moderate, 4=Low, 5=Planning
const PRIORITY_MAP: Record<string, string> = {
  critical: '1',
  high: '2',
  moderate: '3',
  low: '4',
  planning: '5',
};

// Impact values: 1=High, 2=Medium, 3=Low
const IMPACT_MAP: Record<string, string> = {
  high: '1',
  medium: '2',
  low: '3',
};

// Urgency values: 1=High, 2=Medium, 3=Low
const URGENCY_MAP: Record<string, string> = {
  high: '1',
  medium: '2',
  low: '3',
};

/**
 * Resolve semantic or numeric value using a mapping.
 * Returns the ServiceNow numeric code, or the original value if already numeric.
 */
function resolveValue(
  value: string | undefined,
  map: Record<string, string>,
): string | undefined {
  if (!value) return undefined;

  // If already numeric, return as-is
  if (/^\d+$/.test(value)) return value;

  // Map semantic value to numeric
  const lower = value.toLowerCase().replace(/\s+/g, '_');
  return map[lower] || value;
}

/**
 * Tool input schemas with AI-friendly descriptions
 */

export const listIncidentsSchema = z.object({
  state: z
    .string()
    .optional()
    .describe(
      'Incident state: "new", "in_progress", "on_hold", "resolved", "closed", or numeric value (1-7)',
    ),
  priority: z
    .string()
    .optional()
    .describe(
      'Priority level: "critical", "high", "moderate", "low", "planning", or numeric value (1-5)',
    ),
  assigned_to: z
    .string()
    .optional()
    .describe('User sys_id or username of the assigned user'),
  assignment_group: z
    .string()
    .optional()
    .describe('Group sys_id or name of the assignment group'),
  category: z
    .string()
    .optional()
    .describe('Incident category (e.g., "hardware", "software", "network")'),
  query: z
    .string()
    .optional()
    .describe(
      'Optional raw sysparm_query for advanced filtering (e.g., "active=true^priority=1")',
    ),
  limit: z
    .number()
    .int()
    .positive()
    .max(1000)
    .default(10)
    .describe('Maximum number of incidents to return (default: 10, max: 1000)'),
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
      'Field to sort by with optional direction (e.g., "priority", "sys_created_on DESC")',
    ),
});

export const getIncidentSchema = z.object({
  sys_id: z
    .string()
    .length(32)
    .optional()
    .describe('The sys_id of the incident (32-character GUID)'),
  number: z
    .string()
    .optional()
    .describe('The incident number (e.g., "INC0001234")'),
});

export const createIncidentSchema = z.object({
  short_description: z
    .string()
    .min(1)
    .describe('Brief summary of the incident (required)'),
  description: z
    .string()
    .optional()
    .describe('Detailed description of the incident'),
  category: z
    .string()
    .optional()
    .describe('Incident category (e.g., "hardware", "software", "network")'),
  priority: z
    .string()
    .optional()
    .describe(
      'Priority level: "critical", "high", "moderate", "low", "planning", or numeric value (1-5)',
    ),
  assigned_to: z
    .string()
    .optional()
    .describe('User sys_id or username to assign the incident to'),
  assignment_group: z
    .string()
    .optional()
    .describe('Group sys_id or name to assign the incident to'),
  impact: z
    .string()
    .optional()
    .describe('Impact level: "high", "medium", "low", or numeric value (1-3)'),
  urgency: z
    .string()
    .optional()
    .describe(
      'Urgency level: "high", "medium", "low", or numeric value (1-3)',
    ),
});

export const updateIncidentSchema = z.object({
  sys_id: z
    .string()
    .length(32)
    .describe('The sys_id of the incident to update (32-character GUID)'),
  fields: z
    .record(z.unknown())
    .describe(
      'Key-value pairs of fields to update (e.g., {"state": "6", "close_notes": "Resolved"})',
    ),
});

export const resolveIncidentSchema = z.object({
  sys_id: z
    .string()
    .length(32)
    .describe('The sys_id of the incident to resolve (32-character GUID)'),
  close_code: z
    .string()
    .min(1)
    .describe('Resolution code (e.g., "Solved (Permanently)", "Solved (Workaround)")'),
  close_notes: z
    .string()
    .min(1)
    .describe('Notes explaining how the incident was resolved'),
});

export const addIncidentCommentSchema = z.object({
  sys_id: z
    .string()
    .length(32)
    .describe('The sys_id of the incident (32-character GUID)'),
  comment: z
    .string()
    .min(1)
    .describe('The comment text to add to the incident'),
  type: z
    .enum(['work_notes', 'comments'])
    .default('work_notes')
    .describe(
      'Comment type: "work_notes" (internal, default) or "comments" (customer-visible)',
    ),
});

/**
 * Tool handler types
 */
type ListIncidentsParams = z.infer<typeof listIncidentsSchema>;
type GetIncidentParams = z.infer<typeof getIncidentSchema>;
type CreateIncidentParams = z.infer<typeof createIncidentSchema>;
type UpdateIncidentParams = z.infer<typeof updateIncidentSchema>;
type ResolveIncidentParams = z.infer<typeof resolveIncidentSchema>;
type AddIncidentCommentParams = z.infer<typeof addIncidentCommentSchema>;

/**
 * Default fields to return for incident list operations.
 * Provides a curated set of essential fields for AI comprehension.
 */
const DEFAULT_INCIDENT_FIELDS = [
  'sys_id',
  'number',
  'short_description',
  'state',
  'priority',
  'assigned_to',
  'assignment_group',
  'category',
  'impact',
  'urgency',
  'sys_created_on',
  'sys_updated_on',
].join(',');

/**
 * List incidents with semantic filtering.
 *
 * Supports filtering by state, priority, assigned user, assignment group,
 * category, and raw query. Returns human-readable display values.
 */
export async function listIncidents(
  client: ServiceNowClient,
  params: ListIncidentsParams,
) {
  try {
    // Build query parts from semantic filters
    const queryParts: string[] = [];

    if (params.state) {
      const stateValue = resolveValue(params.state, STATE_MAP);
      if (stateValue) queryParts.push(`state=${stateValue}`);
    }

    if (params.priority) {
      const priorityValue = resolveValue(params.priority, PRIORITY_MAP);
      if (priorityValue) queryParts.push(`priority=${priorityValue}`);
    }

    if (params.assigned_to) {
      queryParts.push(`assigned_to=${params.assigned_to}`);
    }

    if (params.assignment_group) {
      queryParts.push(`assignment_group=${params.assignment_group}`);
    }

    if (params.category) {
      queryParts.push(`category=${params.category}`);
    }

    // Combine with raw query if provided
    let finalQuery = queryParts.join('^');
    if (params.query) {
      finalQuery = finalQuery
        ? `${finalQuery}^${params.query}`
        : params.query;
    }

    // Build ServiceNow query parameters
    const queryParams: Record<string, string | number> = {
      sysparm_limit: params.limit,
      sysparm_fields: DEFAULT_INCIDENT_FIELDS,
      sysparm_display_value: 'true', // Return human-readable values
    };

    if (finalQuery) {
      queryParams.sysparm_query = finalQuery;
    }

    if (params.offset !== undefined) {
      queryParams.sysparm_offset = params.offset;
    }

    if (params.order_by) {
      queryParams.sysparm_orderby = params.order_by;
    }

    // Execute query
    const response = await client.get('incident', queryParams);

    // Return results with metadata
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            count: response.result.length,
            incidents: response.result,
          }),
        },
      ],
    };
  } catch (error) {
    return normalizeError(error);
  }
}

/**
 * Get a single incident by sys_id or number.
 *
 * At least one identifier (sys_id or number) must be provided.
 * Returns full incident record with human-readable display values.
 */
export async function getIncident(
  client: ServiceNowClient,
  params: GetIncidentParams,
) {
  try {
    // Validate that at least one identifier is provided
    if (!params.sys_id && !params.number) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: 'Missing identifier',
              details: 'Either sys_id or number must be provided',
            }),
          },
        ],
        isError: true,
      };
    }

    let incident;

    if (params.sys_id) {
      // Get by sys_id
      incident = await client.getById('incident', params.sys_id, {
        sysparm_display_value: 'true',
      });
    } else {
      // Get by number - query for the incident
      const response = await client.get('incident', {
        sysparm_query: `number=${params.number}`,
        sysparm_limit: 1,
        sysparm_display_value: 'true',
      });

      if (!response.result || response.result.length === 0) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: 'Incident not found',
                details: `No incident found with number: ${params.number}`,
              }),
            },
          ],
          isError: true,
        };
      }

      incident = response.result[0];
    }

    // Return incident with metadata
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            incident,
          }),
        },
      ],
    };
  } catch (error) {
    return normalizeError(error);
  }
}

/**
 * Create a new incident.
 *
 * Accepts semantic parameter values (e.g., "high" for priority) and
 * converts them to ServiceNow field codes.
 */
export async function createIncident(
  client: ServiceNowClient,
  params: CreateIncidentParams,
) {
  try {
    // Build field object with semantic value resolution
    const fields: Record<string, any> = {
      short_description: params.short_description,
    };

    if (params.description) {
      fields.description = params.description;
    }

    if (params.category) {
      fields.category = params.category;
    }

    if (params.priority) {
      const priorityValue = resolveValue(params.priority, PRIORITY_MAP);
      if (priorityValue) fields.priority = priorityValue;
    }

    if (params.assigned_to) {
      fields.assigned_to = params.assigned_to;
    }

    if (params.assignment_group) {
      fields.assignment_group = params.assignment_group;
    }

    if (params.impact) {
      const impactValue = resolveValue(params.impact, IMPACT_MAP);
      if (impactValue) fields.impact = impactValue;
    }

    if (params.urgency) {
      const urgencyValue = resolveValue(params.urgency, URGENCY_MAP);
      if (urgencyValue) fields.urgency = urgencyValue;
    }

    // Create incident
    const incident = await client.post('incident', fields);

    // Return created incident with metadata
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            sys_id: (incident as any).sys_id,
            number: (incident as any).number,
            incident,
            message: 'Incident created successfully',
          }),
        },
      ],
    };
  } catch (error) {
    return normalizeError(error);
  }
}

/**
 * Update an existing incident.
 *
 * Accepts arbitrary field updates as a key-value object.
 * No semantic mapping is performed - caller must provide correct field values.
 */
export async function updateIncident(
  client: ServiceNowClient,
  params: UpdateIncidentParams,
) {
  try {
    // Update incident
    const incident = await client.patch(
      'incident',
      params.sys_id,
      params.fields,
    );

    // Return updated incident with metadata
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            sys_id: params.sys_id,
            incident,
            message: 'Incident updated successfully',
          }),
        },
      ],
    };
  } catch (error) {
    return normalizeError(error);
  }
}

/**
 * Resolve an incident.
 *
 * Convenience wrapper that sets state to "resolved" (6), close_code,
 * and close_notes in a single operation.
 */
export async function resolveIncident(
  client: ServiceNowClient,
  params: ResolveIncidentParams,
) {
  try {
    // Update incident to resolved state
    const fields = {
      state: '6', // Resolved
      close_code: params.close_code,
      close_notes: params.close_notes,
    };

    const incident = await client.patch('incident', params.sys_id, fields);

    // Return resolved incident with metadata
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            sys_id: params.sys_id,
            incident,
            message: 'Incident resolved successfully',
          }),
        },
      ],
    };
  } catch (error) {
    return normalizeError(error);
  }
}

/**
 * Add a comment or work note to an incident.
 *
 * Defaults to work_notes (internal) but can also add customer-visible comments.
 */
export async function addIncidentComment(
  client: ServiceNowClient,
  params: AddIncidentCommentParams,
) {
  try {
    // Determine which field to update based on comment type
    const fieldName = params.type === 'comments' ? 'comments' : 'work_notes';

    // Update incident with comment
    const fields = {
      [fieldName]: params.comment,
    };

    await client.patch('incident', params.sys_id, fields);

    // Return success message
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            sys_id: params.sys_id,
            type: params.type,
            message: `${params.type === 'comments' ? 'Comment' : 'Work note'} added successfully`,
          }),
        },
      ],
    };
  } catch (error) {
    return normalizeError(error);
  }
}
