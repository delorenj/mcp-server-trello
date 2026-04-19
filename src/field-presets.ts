/**
 * Field presets for Trello API responses
 *
 * These presets control which fields are returned from the Trello API.
 * Use 'minimal' for fast searches with low token usage (ideal for Haiku).
 * Use 'standard' for normal operations.
 * Use 'full' when you need all available data.
 */

export type FieldPreset = 'minimal' | 'standard' | 'full';

/**
 * Card field presets
 * See: https://developer.atlassian.com/cloud/trello/rest/api-group-cards/
 */
export const CARD_FIELDS = {
  // Minimal: Just enough to identify and locate cards
  minimal: 'id,name,idList,closed',

  // Standard: Common fields for most operations
  standard: 'id,name,desc,idList,idLabels,due,dueComplete,closed,url,dateLastActivity',

  // Full: All commonly needed fields
  full: 'all',
} as const;

/**
 * Board field presets
 * See: https://developer.atlassian.com/cloud/trello/rest/api-group-boards/
 */
export const BOARD_FIELDS = {
  // Minimal: Just enough to identify boards
  minimal: 'id,name,closed',

  // Standard: Common fields for most operations
  standard: 'id,name,desc,closed,idOrganization,url,shortUrl',

  // Full: All commonly needed fields
  full: 'all',
} as const;

/**
 * List field presets
 * See: https://developer.atlassian.com/cloud/trello/rest/api-group-lists/
 */
export const LIST_FIELDS = {
  // Minimal: Just enough to identify lists
  minimal: 'id,name,closed',

  // Standard: Common fields for most operations
  standard: 'id,name,closed,idBoard,pos',

  // Full: All commonly needed fields
  full: 'all',
} as const;

/**
 * Member field presets
 * See: https://developer.atlassian.com/cloud/trello/rest/api-group-members/
 */
export const MEMBER_FIELDS = {
  // Minimal: Just enough to identify members
  minimal: 'id,username',

  // Standard: Common fields for display
  standard: 'id,username,fullName,avatarUrl',

  // Full: All commonly needed fields
  full: 'all',
} as const;

/**
 * Label field presets
 */
export const LABEL_FIELDS = {
  // Minimal: Just enough to identify labels
  minimal: 'id,name,color',

  // Standard: Same as minimal for labels
  standard: 'id,name,color,idBoard',

  // Full: All fields
  full: 'all',
} as const;

/**
 * Action/Activity field presets
 */
export const ACTION_FIELDS = {
  // Minimal: Just the essentials
  minimal: 'id,type,date',

  // Standard: Common fields
  standard: 'id,type,date,data,memberCreator',

  // Full: All fields
  full: 'all',
} as const;

/**
 * Workspace/Organization field presets
 */
export const WORKSPACE_FIELDS = {
  // Minimal: Just enough to identify workspaces
  minimal: 'id,name,displayName',

  // Standard: Common fields
  standard: 'id,name,displayName,desc,url',

  // Full: All fields
  full: 'all',
} as const;

/**
 * Helper to get fields string from preset
 */
export function getCardFields(preset: FieldPreset = 'standard'): string {
  return CARD_FIELDS[preset];
}

export function getBoardFields(preset: FieldPreset = 'standard'): string {
  return BOARD_FIELDS[preset];
}

export function getListFields(preset: FieldPreset = 'standard'): string {
  return LIST_FIELDS[preset];
}

export function getMemberFields(preset: FieldPreset = 'standard'): string {
  return MEMBER_FIELDS[preset];
}

export function getLabelFields(preset: FieldPreset = 'standard'): string {
  return LABEL_FIELDS[preset];
}

export function getActionFields(preset: FieldPreset = 'standard'): string {
  return ACTION_FIELDS[preset];
}

export function getWorkspaceFields(preset: FieldPreset = 'standard'): string {
  return WORKSPACE_FIELDS[preset];
}

/**
 * Options for controlling nested resources and their fields
 */
export interface CardQueryOptions {
  fields?: FieldPreset | string;
  // Control what nested resources to include
  attachments?: boolean | 'cover';
  checklists?: boolean | 'all';
  members?: boolean;
  labels?: boolean;
  actions?: boolean | string; // action types filter
  actionsLimit?: number;
  // Field presets for nested resources
  memberFields?: FieldPreset | string;
  labelFields?: FieldPreset | string;
}

export interface BoardQueryOptions {
  fields?: FieldPreset | string;
}

export interface ListQueryOptions {
  fields?: FieldPreset | string;
  cards?: 'none' | 'open' | 'closed' | 'all';
  cardFields?: FieldPreset | string;
}

export interface MemberQueryOptions {
  fields?: FieldPreset | string;
}

export interface WorkspaceQueryOptions {
  fields?: FieldPreset | string;
}

/**
 * Helper to resolve fields - can be a preset name or custom fields string
 */
export function resolveFields(
  fieldsOrPreset: FieldPreset | string | undefined,
  defaultPreset: FieldPreset,
  fieldPresets: Record<FieldPreset, string>
): string {
  if (!fieldsOrPreset) {
    return fieldPresets[defaultPreset];
  }

  // Check if it's a preset name
  if (fieldsOrPreset in fieldPresets) {
    return fieldPresets[fieldsOrPreset as FieldPreset];
  }

  // Otherwise treat as custom fields string
  return fieldsOrPreset;
}
