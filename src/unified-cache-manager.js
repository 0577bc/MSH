/**
 * 统一缓存管理器 (unified-cache-manager.js)
 * 功能：统一管理所有缓存，避免冲突
 * 作者：MSH系统
 * 版本：2.0
 */

const unifiedCacheManager = {
  // 统一缓存存储
  _cache: new Map(),
  
  // 缓存键生成策略
  _generateCacheKey: function(dataType, memberUUID, additionalParams = '') {
    return `${dataType}_${memberUUID}_${additionalParams}`;
  },
  
  // 统一获取缓存
  get: function(dataType, memberUUID, additionalParams = '') {
    const key = this._generateCacheKey(dataType, memberUUID, additionalParams);
    const cached = this._cache.get(key);
    
    if (!cached) return null;
    
    // 检查缓存是否过期
    const cacheAge = Date.now() - cached.timestamp;
    const maxAge = this._getMaxAge(dataType);
    
    if (cacheAge > maxAge) {
      this._cache.delete(key);
      return null;
    }
    
    return cached.data;
  },
  
  // 统一设置缓存
  set: function(dataType, memberUUID, data, additionalParams = '') {
    const key = this._generateCacheKey(dataType, memberUUID, additionalParams);
    this._cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  },
  
  // 统一清除缓存
  clear: function(dataType, memberUUID, additionalParams = '') {
    const key = this._generateCacheKey(dataType, memberUUID, additionalParams);
    this._cache.delete(key);
  },
  
  // 清除成员所有相关缓存
  clearMemberCache: function(memberUUID) {
    for (const [key, value] of this._cache) {
      if (key.includes(memberUUID)) {
        this._cache.delete(key);
      }
    }
  },
  
  // 清除所有缓存
  clearAll: function() {
    this._cache.clear();
    console.log('🧹 所有缓存已清除');
  },
  
  // 获取缓存统计信息
  getCacheStats: function() {
    const stats = {
      totalEntries: this._cache.size,
      dataTypes: {},
      oldestEntry: null,
      newestEntry: null
    };
    
    let oldestTime = Date.now();
    let newestTime = 0;
    
    for (const [key, value] of this._cache) {
      const dataType = key.split('_')[0];
      stats.dataTypes[dataType] = (stats.dataTypes[dataType] || 0) + 1;
      
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp;
        stats.oldestEntry = key;
      }
      
      if (value.timestamp > newestTime) {
        newestTime = value.timestamp;
        stats.newestEntry = key;
      }
    }
    
    return stats;
  },
  
  // 获取缓存最大年龄
  _getMaxAge: function(dataType) {
    const maxAges = {
      'eventList': 30 * 60 * 1000,      // 30分钟
      'absenceDetails': 5 * 60 * 1000,  // 5分钟
      'trackingRecords': 2 * 60 * 1000,  // 2分钟
      'memberCalculations': 2 * 60 * 1000 // 2分钟
    };
    
    return maxAges[dataType] || 5 * 60 * 1000;
  }
};

// 将统一缓存管理器暴露到全局
window.unifiedCacheManager = unifiedCacheManager;

console.log('✅ 统一缓存管理器已加载');


