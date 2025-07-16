import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export function validateString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new McpError(ErrorCode.InvalidParams, `${field} must be a string`);
  }
  return value;
}

export function validateOptionalString(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  return validateString(value, 'value');
}

export function validateNumber(value: unknown, field: string): number {
  if (typeof value !== 'number') {
    throw new McpError(ErrorCode.InvalidParams, `${field} must be a number`);
  }
  return value;
}

export function validateOptionalNumber(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  return validateNumber(value, 'value');
}

export function validateStringArray(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
    throw new McpError(ErrorCode.InvalidParams, 'Value must be an array of strings');
  }
  return value;
}

export function validateOptionalStringArray(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  return validateStringArray(value);
}

export function validateGetCardsListRequest(args: Record<string, unknown>): {
  boardId?: string;
  listId: string;
} {
  if (!args.listId) {
    throw new McpError(ErrorCode.InvalidParams, 'listId is required');
  }
  return {
    boardId: args.boardId ? validateString(args.boardId, 'boardId') : undefined,
    listId: validateString(args.listId, 'listId'),
  };
}

export function validateGetListsRequest(args: Record<string, unknown>): { boardId?: string } {
  return {
    boardId: args.boardId ? validateString(args.boardId, 'boardId') : undefined,
  };
}

export function validateGetRecentActivityRequest(args: Record<string, unknown>): {
  boardId?: string;
  limit?: number;
} {
  return {
    boardId: args.boardId ? validateString(args.boardId, 'boardId') : undefined,
    limit: validateOptionalNumber(args.limit),
  };
}

export function validateAddCardRequest(args: Record<string, unknown>): {
  boardId?: string;
  listId: string;
  name: string;
  description?: string;
  dueDate?: string;
  labels?: string[];
} {
  if (!args.listId || !args.name) {
    throw new McpError(ErrorCode.InvalidParams, 'listId and name are required');
  }
  return {
    boardId: args.boardId ? validateString(args.boardId, 'boardId') : undefined,
    listId: validateString(args.listId, 'listId'),
    name: validateString(args.name, 'name'),
    description: validateOptionalString(args.description),
    dueDate: validateOptionalString(args.dueDate),
    labels: validateOptionalStringArray(args.labels),
  };
}

export function validateUpdateCardRequest(args: Record<string, unknown>): {
  boardId?: string;
  cardId: string;
  name?: string;
  description?: string;
  dueDate?: string;
  labels?: string[];
} {
  if (!args.cardId) {
    throw new McpError(ErrorCode.InvalidParams, 'cardId is required');
  }
  return {
    boardId: args.boardId ? validateString(args.boardId, 'boardId') : undefined,
    cardId: validateString(args.cardId, 'cardId'),
    name: validateOptionalString(args.name),
    description: validateOptionalString(args.description),
    dueDate: validateOptionalString(args.dueDate),
    labels: validateOptionalStringArray(args.labels),
  };
}

export function validateArchiveCardRequest(args: Record<string, unknown>): {
  boardId?: string;
  cardId: string;
} {
  if (!args.cardId) {
    throw new McpError(ErrorCode.InvalidParams, 'cardId is required');
  }
  return {
    boardId: args.boardId ? validateString(args.boardId, 'boardId') : undefined,
    cardId: validateString(args.cardId, 'cardId'),
  };
}

export function validateAddListRequest(args: Record<string, unknown>): {
  boardId?: string;
  name: string;
} {
  if (!args.name) {
    throw new McpError(ErrorCode.InvalidParams, 'name is required');
  }
  return {
    boardId: args.boardId ? validateString(args.boardId, 'boardId') : undefined,
    name: validateString(args.name, 'name'),
  };
}

export function validateArchiveListRequest(args: Record<string, unknown>): {
  boardId?: string;
  listId: string;
} {
  if (!args.listId) {
    throw new McpError(ErrorCode.InvalidParams, 'listId is required');
  }
  return {
    boardId: args.boardId ? validateString(args.boardId, 'boardId') : undefined,
    listId: validateString(args.listId, 'listId'),
  };
}

export function validateMoveCardRequest(args: Record<string, unknown>): {
  boardId?: string;
  cardId: string;
  listId: string;
} {
  if (!args.cardId || !args.listId) {
    throw new McpError(ErrorCode.InvalidParams, 'cardId and listId are required');
  }
  return {
    boardId: args.boardId ? validateString(args.boardId, 'boardId') : undefined,
    cardId: validateString(args.cardId, 'cardId'),
    listId: validateString(args.listId, 'listId'),
  };
}

export function validateAttachImageRequest(args: Record<string, unknown>): {
  boardId?: string;
  cardId: string;
  imageUrl: string;
  name?: string;
} {
  if (!args.cardId || !args.imageUrl) {
    throw new McpError(ErrorCode.InvalidParams, 'cardId and imageUrl are required');
  }

  const imageUrl = validateString(args.imageUrl, 'imageUrl');
  try {
    new URL(imageUrl);
  } catch (e) {
    throw new McpError(ErrorCode.InvalidParams, 'imageUrl must be a valid URL');
  }

  return {
    boardId: args.boardId ? validateString(args.boardId, 'boardId') : undefined,
    cardId: validateString(args.cardId, 'cardId'),
    imageUrl: imageUrl,
    name: validateOptionalString(args.name),
  };
}

export function validateSetActiveBoardRequest(args: Record<string, unknown>): { boardId: string } {
  if (!args.boardId) {
    throw new McpError(ErrorCode.InvalidParams, 'boardId is required');
  }
  return {
    boardId: validateString(args.boardId, 'boardId'),
  };
}

export function validateSetActiveWorkspaceRequest(args: Record<string, unknown>): { workspaceId: string } {
  if (!args.workspaceId) {
    throw new McpError(ErrorCode.InvalidParams, 'workspaceId is required');
  }
  return {
    workspaceId: validateString(args.workspaceId, 'workspaceId'),
  };
}

export function validateListBoardsInWorkspaceRequest(args: Record<string, unknown>): { workspaceId: string } {
  if (!args.workspaceId) {
    throw new McpError(ErrorCode.InvalidParams, 'workspaceId is required');
  }
  return {
    workspaceId: validateString(args.workspaceId, 'workspaceId'),
  };
}
