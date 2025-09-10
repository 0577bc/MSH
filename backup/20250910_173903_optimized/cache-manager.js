/**
 * 智能缓存管理器 (cache-manager.js)
 * 功能：提供高效的缓存策略和自动缓存管理
 * 作者：MSH系统
 * 版本：2.0
 * 
 * 特性：
 * - 自动过期清理
 * - LRU缓存策略
 * - 缓存统计
 * - 内存使用优化
 */

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.cacheStats = new Map();
    this.maxCacheSize = 200; // 增加最大缓存条目数
    this.defaultTTL = 10 * 60 * 1000; // 增加默认TTL到10分钟
    this.uuidIndex = new Map(); // UUID索引缓存
    this.cleanupInterval = 60 * 1000; // 每分钟清理一次
    this.startCleanupTimer();
  }

  /**
   * 设置UUID索引缓存
   * @param {string} key 缓存键
   * @param {Object} indexData 索引数据
   * @param {number} ttl 过期时间（毫秒）
   */
  setUUIDIndex(key, indexData, ttl = this.defaultTTL) {
    this.uuidIndex.set(key, {
      data: indexData,
      expiry: Date.now() + ttl,
      hits: 0
    });
    console.log(`UUID索引已缓存: ${key} (TTL: ${ttl}ms)`);
  }

  /**
   * 获取UUID索引缓存
   * @param {string} key 缓存键
   * @returns {Object|null} 索引数据或null
   */
  getUUIDIndex(key) {
    const cached = this.uuidIndex.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expiry) {
      this.uuidIndex.delete(key);
      return null;
    }
    
    cached.hits++;
    return cached.data;
  }

  /**
   * 设置缓存项
   */
  set(key, value, ttl = this.defaultTTL) {
    const expiry = Date.now() + ttl;
    
    // 如果缓存已满，清理最旧的条目
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldest();
    }

    this.cache.set(key, value);
    this.cacheExpiry.set(key, expiry);
    this.updateStats(key, 'set');
    
    console.log(`缓存已设置: ${key} (TTL: ${ttl}ms)`);
  }

  /**
   * 获取缓存项
   */
  get(key) {
    if (!this.cache.has(key)) {
      this.updateStats(key, 'miss');
      return null;
    }

    const expiry = this.cacheExpiry.get(key);
    if (Date.now() > expiry) {
      this.delete(key);
      this.updateStats(key, 'expired');
      return null;
    }

    this.updateStats(key, 'hit');
    return this.cache.get(key);
  }

  /**
   * 删除缓存项
   */
  delete(key) {
    const existed = this.cache.has(key);
    this.cache.delete(key);
    this.cacheExpiry.delete(key);
    this.cacheStats.delete(key);
    
    if (existed) {
      console.log(`缓存已删除: ${key}`);
    }
  }

  /**
   * 检查缓存项是否存在且未过期
   */
  has(key) {
    if (!this.cache.has(key)) {
      return false;
    }

    const expiry = this.cacheExpiry.get(key);
    if (Date.now() > expiry) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 清除所有缓存
   */
  clear() {
    this.cache.clear();
    this.cacheExpiry.clear();
    this.cacheStats.clear();
    console.log('所有缓存已清除');
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    const totalHits = Array.from(this.cacheStats.values())
      .reduce((sum, stats) => sum + (stats.hit || 0), 0);
    const totalMisses = Array.from(this.cacheStats.values())
      .reduce((sum, stats) => sum + (stats.miss || 0), 0);
    const totalSets = Array.from(this.cacheStats.values())
      .reduce((sum, stats) => sum + (stats.set || 0), 0);

    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: totalHits + totalMisses > 0 ? (totalHits / (totalHits + totalMisses)) * 100 : 0,
      totalHits,
      totalMisses,
      totalSets,
      entries: Array.from(this.cache.keys())
    };
  }

  /**
   * 更新缓存统计
   */
  updateStats(key, operation) {
    if (!this.cacheStats.has(key)) {
      this.cacheStats.set(key, { hit: 0, miss: 0, set: 0, expired: 0 });
    }

    const stats = this.cacheStats.get(key);
    stats[operation] = (stats[operation] || 0) + 1;
  }

  /**
   * 清理过期缓存
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (now > expiry) {
        this.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`清理了 ${cleanedCount} 个过期缓存项`);
    }
  }

  /**
   * 驱逐最旧的缓存项
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, expiry] of this.cacheExpiry.entries()) {
      if (expiry < oldestTime) {
        oldestTime = expiry;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
      console.log(`驱逐最旧缓存项: ${oldestKey}`);
    }
  }

  /**
   * 启动清理定时器
   */
  startCleanupTimer() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * 预热缓存
   */
  async warmup(keys, loader) {
    console.log(`开始预热缓存，共 ${keys.length} 个键`);
    
    for (const key of keys) {
      if (!this.has(key)) {
        try {
          const value = await loader(key);
          this.set(key, value);
        } catch (error) {
          console.error(`预热缓存失败 (${key}):`, error);
        }
      }
    }
    
    console.log('缓存预热完成');
  }

  /**
   * 批量获取缓存项
   */
  getBatch(keys) {
    const result = new Map();
    const missingKeys = [];

    for (const key of keys) {
      const value = this.get(key);
      if (value !== null) {
        result.set(key, value);
      } else {
        missingKeys.push(key);
      }
    }

    return { result, missingKeys };
  }

  /**
   * 批量设置缓存项
   */
  setBatch(entries, ttl = this.defaultTTL) {
    for (const [key, value] of entries) {
      this.set(key, value, ttl);
    }
  }

  /**
   * 获取缓存大小（字节）
   */
  getCacheSize() {
    let size = 0;
    for (const [key, value] of this.cache.entries()) {
      size += JSON.stringify({ key, value }).length;
    }
    return size;
  }

  /**
   * 设置缓存配置
   */
  configure(options) {
    if (options.maxSize) {
      this.maxCacheSize = options.maxSize;
    }
    if (options.defaultTTL) {
      this.defaultTTL = options.defaultTTL;
    }
    if (options.cleanupInterval) {
      this.cleanupInterval = options.cleanupInterval;
    }
    console.log('缓存配置已更新:', options);
  }
}

// 创建全局实例
const cacheManager = new CacheManager();

// 导出到全局作用域
if (typeof window !== 'undefined') {
  window.cacheManager = cacheManager;
}

// 在页面卸载时清理缓存
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    cacheManager.clear();
  });
}
