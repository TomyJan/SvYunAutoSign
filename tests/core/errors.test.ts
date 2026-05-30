import { describe, expect, it } from 'vitest';
import { WorkflowError } from '../../src/core/errors.js';

describe('WorkflowError', () => {
  it('sets a stable error name', () => {
    const error = new WorkflowError('failed');

    expect(error.name).toBe('WorkflowError');
    expect(error.message).toBe('failed');
  });
});
