import { describe, it, expect } from 'vitest';
import {
  validateString,
  validateOptionalString,
  validateNumber,
  validateOptionalNumber,
  validateStringArray,
  validateOptionalStringArray,
  validateBoolean,
  validateOptionalBoolean,
  validateOptionalDateString,
  validateGetCardsListRequest,
  validateGetListsRequest,
  validateGetRecentActivityRequest,
  validateAddCardRequest,
  validateUpdateCardRequest,
  validateArchiveCardRequest,
  validateAddListRequest,
  validateArchiveListRequest,
  validateMoveCardRequest,
  validateAttachImageRequest,
  validateSetActiveBoardRequest,
  validateSetActiveWorkspaceRequest,
  validateListBoardsInWorkspaceRequest,
  validateGetCardRequest,
} from '../../src/validators.js';

describe('Primitive Validators', () => {
  describe('validateString', () => {
    it('should return string when given a string', () => {
      expect(validateString('hello', 'field')).toBe('hello');
    });

    it('should return empty string', () => {
      expect(validateString('', 'field')).toBe('');
    });

    it('should throw on number', () => {
      expect(() => validateString(123, 'myField')).toThrow('myField must be a string');
    });

    it('should throw on null', () => {
      expect(() => validateString(null, 'field')).toThrow();
    });

    it('should throw on undefined', () => {
      expect(() => validateString(undefined, 'field')).toThrow();
    });

    it('should throw on boolean', () => {
      expect(() => validateString(true, 'field')).toThrow();
    });
  });

  describe('validateOptionalString', () => {
    it('should return undefined when given undefined', () => {
      expect(validateOptionalString(undefined)).toBeUndefined();
    });

    it('should return string when given a string', () => {
      expect(validateOptionalString('test')).toBe('test');
    });

    it('should throw on non-string, non-undefined', () => {
      expect(() => validateOptionalString(42)).toThrow();
    });
  });

  describe('validateNumber', () => {
    it('should return number when given a number', () => {
      expect(validateNumber(42, 'field')).toBe(42);
    });

    it('should accept 0', () => {
      expect(validateNumber(0, 'field')).toBe(0);
    });

    it('should accept negative numbers', () => {
      expect(validateNumber(-5, 'field')).toBe(-5);
    });

    it('should throw on string', () => {
      expect(() => validateNumber('42', 'myField')).toThrow('myField must be a number');
    });
  });

  describe('validateOptionalNumber', () => {
    it('should return undefined when given undefined', () => {
      expect(validateOptionalNumber(undefined)).toBeUndefined();
    });

    it('should return number when given a number', () => {
      expect(validateOptionalNumber(10)).toBe(10);
    });
  });

  describe('validateStringArray', () => {
    it('should return array of strings', () => {
      expect(validateStringArray(['a', 'b'])).toEqual(['a', 'b']);
    });

    it('should accept empty array', () => {
      expect(validateStringArray([])).toEqual([]);
    });

    it('should throw on non-array', () => {
      expect(() => validateStringArray('not array')).toThrow();
    });

    it('should throw on array with non-strings', () => {
      expect(() => validateStringArray(['a', 1])).toThrow();
    });

    it('should throw on mixed array', () => {
      expect(() => validateStringArray([1, 2, 3])).toThrow();
    });
  });

  describe('validateOptionalStringArray', () => {
    it('should return undefined when given undefined', () => {
      expect(validateOptionalStringArray(undefined)).toBeUndefined();
    });

    it('should return array when given valid array', () => {
      expect(validateOptionalStringArray(['a'])).toEqual(['a']);
    });
  });

  describe('validateBoolean', () => {
    it('should return true', () => {
      expect(validateBoolean(true, 'field')).toBe(true);
    });

    it('should return false', () => {
      expect(validateBoolean(false, 'field')).toBe(false);
    });

    it('should throw on string', () => {
      expect(() => validateBoolean('true', 'field')).toThrow();
    });

    it('should throw on number', () => {
      expect(() => validateBoolean(1, 'field')).toThrow();
    });
  });

  describe('validateOptionalBoolean', () => {
    it('should return undefined when given undefined', () => {
      expect(validateOptionalBoolean(undefined)).toBeUndefined();
    });

    it('should return boolean when given boolean', () => {
      expect(validateOptionalBoolean(true)).toBe(true);
    });
  });

  describe('validateOptionalDateString', () => {
    it('should return undefined when given undefined', () => {
      expect(validateOptionalDateString(undefined)).toBeUndefined();
    });

    it('should accept valid YYYY-MM-DD format', () => {
      expect(validateOptionalDateString('2024-01-15')).toBe('2024-01-15');
    });

    it('should reject invalid date format (MM/DD/YYYY)', () => {
      expect(() => validateOptionalDateString('01/15/2024')).toThrow('YYYY-MM-DD');
    });

    it('should reject ISO 8601 datetime', () => {
      expect(() => validateOptionalDateString('2024-01-15T10:30:00Z')).toThrow('YYYY-MM-DD');
    });

    it('should reject partial date', () => {
      expect(() => validateOptionalDateString('2024-01')).toThrow('YYYY-MM-DD');
    });

    it('should reject non-string', () => {
      expect(() => validateOptionalDateString(20240115)).toThrow();
    });
  });
});

describe('Request Validators', () => {
  describe('validateGetCardsListRequest', () => {
    it('should require listId', () => {
      expect(() => validateGetCardsListRequest({})).toThrow('listId is required');
    });

    it('should accept listId only', () => {
      const result = validateGetCardsListRequest({ listId: 'list123' });
      expect(result).toEqual({ boardId: undefined, listId: 'list123' });
    });

    it('should accept both boardId and listId', () => {
      const result = validateGetCardsListRequest({ boardId: 'board1', listId: 'list1' });
      expect(result).toEqual({ boardId: 'board1', listId: 'list1' });
    });
  });

  describe('validateGetListsRequest', () => {
    it('should accept empty args', () => {
      expect(validateGetListsRequest({})).toEqual({ boardId: undefined });
    });

    it('should accept boardId', () => {
      expect(validateGetListsRequest({ boardId: 'b1' })).toEqual({ boardId: 'b1' });
    });
  });

  describe('validateGetRecentActivityRequest', () => {
    it('should accept empty args', () => {
      const result = validateGetRecentActivityRequest({});
      expect(result).toEqual({ boardId: undefined, limit: undefined });
    });

    it('should accept boardId and limit', () => {
      const result = validateGetRecentActivityRequest({ boardId: 'b1', limit: 5 });
      expect(result).toEqual({ boardId: 'b1', limit: 5 });
    });
  });

  describe('validateAddCardRequest', () => {
    it('should require listId and name', () => {
      expect(() => validateAddCardRequest({})).toThrow('listId and name are required');
      expect(() => validateAddCardRequest({ listId: 'l1' })).toThrow('listId and name are required');
      expect(() => validateAddCardRequest({ name: 'card' })).toThrow('listId and name are required');
    });

    it('should accept minimal valid request', () => {
      const result = validateAddCardRequest({ listId: 'l1', name: 'Card 1' });
      expect(result.listId).toBe('l1');
      expect(result.name).toBe('Card 1');
    });

    it('should accept all optional fields', () => {
      const result = validateAddCardRequest({
        listId: 'l1',
        name: 'Card',
        boardId: 'b1',
        description: 'desc',
        dueDate: '2024-01-01T00:00:00Z',
        start: '2024-01-01',
        labels: ['label1'],
      });
      expect(result.boardId).toBe('b1');
      expect(result.description).toBe('desc');
      expect(result.start).toBe('2024-01-01');
      expect(result.labels).toEqual(['label1']);
    });

    it('should reject invalid start date format', () => {
      expect(() =>
        validateAddCardRequest({ listId: 'l1', name: 'Card', start: 'not-a-date' })
      ).toThrow('YYYY-MM-DD');
    });
  });

  describe('validateUpdateCardRequest', () => {
    it('should require cardId', () => {
      expect(() => validateUpdateCardRequest({})).toThrow('cardId is required');
    });

    it('should accept cardId only', () => {
      const result = validateUpdateCardRequest({ cardId: 'c1' });
      expect(result.cardId).toBe('c1');
    });

    it('should accept dueComplete boolean', () => {
      const result = validateUpdateCardRequest({ cardId: 'c1', dueComplete: true });
      expect(result.dueComplete).toBe(true);
    });
  });

  describe('validateArchiveCardRequest', () => {
    it('should require cardId', () => {
      expect(() => validateArchiveCardRequest({})).toThrow('cardId is required');
    });

    it('should accept valid request', () => {
      expect(validateArchiveCardRequest({ cardId: 'c1' })).toEqual({
        boardId: undefined,
        cardId: 'c1',
      });
    });
  });

  describe('validateAddListRequest', () => {
    it('should require name', () => {
      expect(() => validateAddListRequest({})).toThrow('name is required');
    });

    it('should accept name', () => {
      expect(validateAddListRequest({ name: 'My List' })).toEqual({
        boardId: undefined,
        name: 'My List',
      });
    });
  });

  describe('validateArchiveListRequest', () => {
    it('should require listId', () => {
      expect(() => validateArchiveListRequest({})).toThrow('listId is required');
    });
  });

  describe('validateMoveCardRequest', () => {
    it('should require cardId and listId', () => {
      expect(() => validateMoveCardRequest({})).toThrow('cardId and listId are required');
      expect(() => validateMoveCardRequest({ cardId: 'c1' })).toThrow();
      expect(() => validateMoveCardRequest({ listId: 'l1' })).toThrow();
    });

    it('should accept valid request', () => {
      const result = validateMoveCardRequest({ cardId: 'c1', listId: 'l1' });
      expect(result).toEqual({ boardId: undefined, cardId: 'c1', listId: 'l1' });
    });
  });

  describe('validateAttachImageRequest', () => {
    it('should require cardId and imageUrl', () => {
      expect(() => validateAttachImageRequest({})).toThrow('cardId and imageUrl are required');
    });

    it('should reject invalid URL', () => {
      expect(() =>
        validateAttachImageRequest({ cardId: 'c1', imageUrl: 'not-a-url' })
      ).toThrow('valid URL');
    });

    it('should accept valid URL', () => {
      const result = validateAttachImageRequest({
        cardId: 'c1',
        imageUrl: 'https://example.com/image.png',
      });
      expect(result.imageUrl).toBe('https://example.com/image.png');
    });
  });

  describe('validateSetActiveBoardRequest', () => {
    it('should require boardId', () => {
      expect(() => validateSetActiveBoardRequest({})).toThrow('boardId is required');
    });

    it('should accept boardId', () => {
      expect(validateSetActiveBoardRequest({ boardId: 'b1' })).toEqual({ boardId: 'b1' });
    });
  });

  describe('validateSetActiveWorkspaceRequest', () => {
    it('should require workspaceId', () => {
      expect(() => validateSetActiveWorkspaceRequest({})).toThrow('workspaceId is required');
    });
  });

  describe('validateListBoardsInWorkspaceRequest', () => {
    it('should require workspaceId', () => {
      expect(() => validateListBoardsInWorkspaceRequest({})).toThrow('workspaceId is required');
    });
  });

  describe('validateGetCardRequest', () => {
    it('should require cardId', () => {
      expect(() => validateGetCardRequest({})).toThrow('cardId is required');
    });

    it('should accept cardId with optional includeMarkdown', () => {
      const result = validateGetCardRequest({ cardId: 'c1', includeMarkdown: true });
      expect(result).toEqual({ cardId: 'c1', includeMarkdown: true });
    });

    it('should accept cardId without includeMarkdown', () => {
      const result = validateGetCardRequest({ cardId: 'c1' });
      expect(result).toEqual({ cardId: 'c1', includeMarkdown: undefined });
    });
  });
});
