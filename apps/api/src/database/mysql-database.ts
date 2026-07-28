import mysql, { type Pool, type PoolConnection } from 'mysql2/promise';

import type { ApiConfig } from '../config';

export interface SqlSession {
  rows<T>(sql: string, values?: readonly unknown[]): Promise<T[]>;
  execute(sql: string, values?: readonly unknown[]): Promise<void>;
}

export interface Database extends SqlSession {
  transaction<T>(work: (session: SqlSession) => Promise<T>): Promise<T>;
  ping(): Promise<boolean>;
  close(): Promise<void>;
}

class MySqlSession implements SqlSession {
  public constructor(private readonly connection: Pool | PoolConnection) {}

  public async rows<T>(sql: string, values: readonly unknown[] = []): Promise<T[]> {
    const [rows] = await this.connection.query(sql, values as unknown[]);
    return rows as T[];
  }

  public async execute(sql: string, values: readonly unknown[] = []): Promise<void> {
    await this.connection.execute(sql, values as never);
  }
}

export class MySqlDatabase extends MySqlSession implements Database {
  private constructor(private readonly pool: Pool) {
    super(pool);
  }

  public static create(config: ApiConfig): MySqlDatabase {
    const pool = mysql.createPool({
      host: config.mysql.host,
      port: config.mysql.port,
      database: config.mysql.database,
      user: config.mysql.user,
      password: config.mysql.password,
      connectionLimit: config.mysql.connectionLimit,
      charset: 'utf8mb4_unicode_ci',
      timezone: 'Z',
      dateStrings: false,
    });
    return new MySqlDatabase(pool);
  }

  public async transaction<T>(work: (session: SqlSession) => Promise<T>): Promise<T> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await work(new MySqlSession(connection));
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  public async ping(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}
