import { describe, expect, it } from 'vitest';
import { RECIPE_FIXTURES, type GenerationApiRequest, type GenerationApiResponse } from '@ai-kitchen/shared';

import type { Database, SqlSession } from '../database/mysql-database';
import { MySqlRecipePersistence } from './mysql-recipe-persistence';

const request: GenerationApiRequest = {
  schemaVersion: 'v1', requestId: 'req_mysql_test_1234', idempotencyKey: 'idem_mysql_test_1234', clientVersion: '1.0.0', identity: { type: 'guest', guestId: 'session-guest-mysql' },
  generationRequest: { schemaVersion: 'v1', selectedIngredientIds: ['egg', 'tomato', 'noodles'], customIngredients: [], servings: 2, maxCookingTimeMinutes: 30, availableTools: [], dietaryPreferences: [], allergens: [], excludedIngredients: [] },
};

class TransactionSpyDatabase implements Database {
  public commits = 0;
  public rollbacks = 0;
  private executes = 0;
  public async rows<T>(): Promise<T[]> { return []; }
  public async execute(): Promise<void> {
    this.executes += 1;
    if (this.executes === 2) throw new Error('write failed');
  }
  public async transaction<T>(work: (session: SqlSession) => Promise<T>): Promise<T> {
    try {
      const value = await work(this);
      this.commits += 1;
      return value;
    } catch (error) {
      this.rollbacks += 1;
      throw error;
    }
  }
  public async ping(): Promise<boolean> { return true; }
  public async close(): Promise<void> {}
}

describe('MySqlRecipePersistence', () => {
  it('rolls back the transaction when recipe persistence fails', async () => {
    const database = new TransactionSpyDatabase();
    const persistence = new MySqlRecipePersistence(database);
    const response: Extract<GenerationApiResponse, { status: 'success' }> = {
      status: 'success', schemaVersion: 'v1', requestId: request.requestId, recipe: RECIPE_FIXTURES[0],
      metadata: { source: 'provider', provider: 'aliyun-dashscope', model: 'qwen3.7-plus', generatedAt: '2026-07-28T00:00:00.000Z', durationMs: 1, repaired: false, requestVersion: 'v1', recipeSchemaVersion: 'recipe.v1.0.0' },
    };
    await expect(persistence.saveRecipeSuccess({ request, requestHash: 'hash', response, recipe: RECIPE_FIXTURES[0], durationMs: 1 })).rejects.toThrow('write failed');
    expect(database.commits).toBe(0);
    expect(database.rollbacks).toBe(1);
  });
});
