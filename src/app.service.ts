import { Injectable, Logger } from '@nestjs/common';
import { ApiResponse, createResponse } from './utils/createResponse';
import { createClient } from 'redis';
import * as dotenv from 'dotenv';
dotenv.config();

const logger = new Logger('RestaurantsService');

const redis = createClient({
  url:
    process.env.REDIS_URL ||
    'iss://default:AT_LAAIjcDFkNjA0ZmNiNTJiOTc0NzJjYTY1ZjllM2RhNTFhYjZlNHAxMA@direct-woodcock-16331.upstash.io:6379' ||
    'redis://localhost:6379'
});
redis.connect().catch(err => logger.error('Redis connection error:', err));
@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
  async clearRedis(): Promise<ApiResponse<null>> {
    const start = Date.now();
    try {
      const keys = await redis.keys('*');
      if (keys.length > 0) {
        await redis.del(keys);
      }
      logger.log(
        `Cleared ${keys.length} keys from Redis in ${Date.now() - start}ms`
      );
      // Preload lại sau khi clear
      // await this.preloadRestaurants();
      return createResponse(
        'OK',
        null,
        'Redis cleared and restaurants preloaded successfully'
      );
    } catch (error: any) {
      logger.error('Error clearing Redis:', error);
      return createResponse('ServerError', null, 'Error clearing Redis');
    }
  }
}
