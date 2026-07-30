import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { FeatureFlag, DEFAULT_FEATURE_FLAGS } from '@tatkal/shared';

@Injectable()
export class FeatureFlagsService {
  private readonly FLAG_PREFIX = 'feature:';

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async isEnabled(flag: FeatureFlag): Promise<boolean> {
    const raw = await this.redis.get(`${this.FLAG_PREFIX}${flag}`);
    if (raw === null) return DEFAULT_FEATURE_FLAGS[flag] ?? false;
    return raw === '1';
  }

  async setEnabled(flag: FeatureFlag, enabled: boolean): Promise<void> {
    await this.redis.set(`${this.FLAG_PREFIX}${flag}`, enabled ? '1' : '0');
  }

  async getAllFlags(): Promise<Record<string, boolean>> {
    const keys = Object.values(FeatureFlag);
    const results: Record<string, boolean> = {};

    for (const key of keys) {
      results[key] = await this.isEnabled(key as FeatureFlag);
    }

    return results;
  }

  async resetAll(): Promise<void> {
    const keys = Object.values(FeatureFlag);
    const pipeline = this.redis.pipeline();
    for (const key of keys) {
      pipeline.set(
        `${this.FLAG_PREFIX}${key}`,
        DEFAULT_FEATURE_FLAGS[key as FeatureFlag] ? '1' : '0',
      );
    }
    await pipeline.exec();
  }

  getDefaults(): Record<string, boolean> {
    return { ...DEFAULT_FEATURE_FLAGS } as unknown as Record<string, boolean>;
  }
}
