import { Redis } from 'ioredis';

// Define a custom error type for Redis errors
export class RedisConnectorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RedisConnectorError';
  }
}

interface RedisConnectorOptions {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

export class RedisConnector {
  private client: Redis;
  
  constructor(options: RedisConnectorOptions) {
    this.client = new Redis({
      host: options.host,
      port: options.port,
      password: options.password,
      db: options.db || 0,  // Default to db 0 if not specified
    });
  }

  // GET operation
  public async get(key: string): Promise<string | null> {
    try {
      const value = await this.client.get(key);
      return value;
    } catch (error) {
      throw new RedisConnectorError(`Failed to GET key "${key}" from Redis: ${error instanceof Error ? error.message : error}`);
    }
  }

  // SET operation
  public async set(key: string, value: string): Promise<'OK'> {
    try {
      return await this.client.set(key, value);
    } catch (error) {
      throw new RedisConnectorError(`Failed to SET key "${key}" in Redis: ${error instanceof Error ? error.message : error}`);
    }
  }

  // DELETE operation
  public async del(key: string): Promise<number> {
    try {
      return await this.client.del(key);
    } catch (error) {
      throw new RedisConnectorError(`Failed to DELETE key "${key}" from Redis: ${error instanceof Error ? error.message : error}`);
    }
  }

  // EXISTS operation
  public async exists(key: string): Promise<boolean> {
    try {
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      throw new RedisConnectorError(`Failed to check existence of key "${key}" in Redis: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Disconnect from Redis
  public disconnect(): void {
    this.client.disconnect();
  }
}
