/**
 * Web Worker管理器 - 管理异步操作
 * 避免同步操作阻塞UI线程
 */

class WorkerManager {
    constructor() {
        this.workers = new Map();
        this.taskQueue = [];
        this.isProcessing = false;
        this.maxWorkers = navigator.hardwareConcurrency || 4;
        this.activeWorkers = 0;
        
        this.init();
    }
    
    init() {
        // 检查Web Worker支持
        if (typeof Worker === 'undefined') {
            console.warn('Web Worker不支持，将使用主线程处理');
            this.useMainThread = true;
        } else {
            this.useMainThread = false;
        }
        
        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseWorkers();
            } else {
                this.resumeWorkers();
            }
        });
    }
    
    /**
     * 创建Worker
     */
    createWorker(workerScript) {
        if (this.useMainThread) {
            return new MainThreadWorker();
        }
        
        try {
            const worker = new Worker(workerScript);
            worker.onmessage = this.handleWorkerMessage.bind(this);
            worker.onerror = this.handleWorkerError.bind(this);
            return worker;
        } catch (error) {
            console.error('创建Worker失败:', error);
            return new MainThreadWorker();
        }
    }
    
    /**
     * 处理Worker消息
     */
    handleWorkerMessage(event) {
        const { type, data, error } = event.data;
        
        if (error) {
            console.error('Worker错误:', error);
            this.handleTaskError(error);
        } else {
            this.handleTaskComplete(type, data);
        }
    }
    
    /**
     * 处理Worker错误
     */
    handleWorkerError(error) {
        console.error('Worker运行时错误:', error);
        this.handleTaskError(error);
    }
    
    /**
     * 添加任务到队列
     */
    addTask(task) {
        return new Promise((resolve, reject) => {
            const taskItem = {
                ...task,
                resolve,
                reject,
                id: this.generateTaskId(),
                timestamp: Date.now()
            };
            
            this.taskQueue.push(taskItem);
            this.processQueue();
        });
    }
    
    /**
     * 处理任务队列
     */
    async processQueue() {
        if (this.isProcessing || this.taskQueue.length === 0) {
            return;
        }
        
        this.isProcessing = true;
        
        while (this.taskQueue.length > 0) {
            const task = this.taskQueue.shift();
            await this.executeTask(task);
        }
        
        this.isProcessing = false;
    }
    
    /**
     * 执行任务
     */
    async executeTask(task) {
        try {
            if (this.useMainThread) {
                await this.executeMainThreadTask(task);
            } else {
                await this.executeWorkerTask(task);
            }
        } catch (error) {
            task.reject(error);
        }
    }
    
    /**
     * 在主线程执行任务
     */
    async executeMainThreadTask(task) {
        const { type, data } = task;
        
        switch (type) {
            case 'SYNC_DATA':
                await this.syncDataMainThread(data);
                break;
            case 'VALIDATE_DATA':
                await this.validateDataMainThread(data);
                break;
            case 'MERGE_DATA':
                await this.mergeDataMainThread(data);
                break;
            case 'PROCESS_LARGE_DATASET':
                await this.processLargeDatasetMainThread(data);
                break;
            default:
                throw new Error(`不支持的任务类型: ${type}`);
        }
    }
    
    /**
     * 在Worker中执行任务
     */
    async executeWorkerTask(task) {
        const worker = this.getAvailableWorker();
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('任务超时'));
            }, 30000); // 30秒超时
            
            const messageHandler = (event) => {
                clearTimeout(timeout);
                worker.removeEventListener('message', messageHandler);
                
                if (event.data.error) {
                    reject(new Error(event.data.error));
                } else {
                    resolve(event.data);
                }
            };
            
            worker.addEventListener('message', messageHandler);
            worker.postMessage(task);
        });
    }
    
    /**
     * 获取可用的Worker
     */
    getAvailableWorker() {
        // 简单的Worker池管理
        if (this.activeWorkers < this.maxWorkers) {
            const worker = this.createWorker('./src/sync-worker.js');
            this.activeWorkers++;
            return worker;
        }
        
        // 如果没有可用Worker，等待
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(this.getAvailableWorker());
            }, 100);
        });
    }
    
    /**
     * 主线程数据同步
     */
    async syncDataMainThread(data) {
        const { localData, remoteData, conflictResolution } = data;
        
        // 模拟异步处理
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 简单的数据合并逻辑
        const mergedData = {
            ...remoteData,
            ...localData,
            lastSync: Date.now()
        };
        
        return {
            type: 'SYNC_COMPLETE',
            data: {
                mergedData,
                conflicts: [],
                processingTime: 100,
                timestamp: Date.now()
            }
        };
    }
    
    /**
     * 主线程数据验证
     */
    async validateDataMainThread(data) {
        const { dataset, validationRules } = data;
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const results = {
            valid: true,
            errors: [],
            warnings: []
        };
        
        return {
            type: 'VALIDATION_COMPLETE',
            data: {
                results,
                processingTime: 50,
                timestamp: Date.now()
            }
        };
    }
    
    /**
     * 主线程数据合并
     */
    async mergeDataMainThread(data) {
        const { datasets, mergeStrategy } = data;
        
        await new Promise(resolve => setTimeout(resolve, 75));
        
        const mergedData = datasets.reduce((acc, dataset) => {
            return { ...acc, ...dataset };
        }, {});
        
        return {
            type: 'MERGE_COMPLETE',
            data: {
                mergedData,
                processingTime: 75,
                timestamp: Date.now()
            }
        };
    }
    
    /**
     * 主线程大数据集处理
     */
    async processLargeDatasetMainThread(data) {
        const { dataset, operation, options } = data;
        
        await new Promise(resolve => setTimeout(resolve, 200));
        
        let result;
        switch (operation) {
            case 'SORT':
                result = dataset.sort((a, b) => a[options.key] > b[options.key] ? 1 : -1);
                break;
            case 'FILTER':
                result = dataset.filter(item => item[options.filter] === options.value);
                break;
            case 'SEARCH':
                result = dataset.filter(item => 
                    options.fields.some(field => 
                        item[field] && item[field].toLowerCase().includes(options.query.toLowerCase())
                    )
                );
                break;
            default:
                result = dataset;
        }
        
        return {
            type: 'LARGE_DATASET_COMPLETE',
            data: {
                result,
                operation,
                processingTime: 200,
                timestamp: Date.now()
            }
        };
    }
    
    /**
     * 处理任务完成
     */
    handleTaskComplete(type, data) {
        // 查找对应的任务并resolve
        const task = this.findTaskByType(type);
        if (task) {
            task.resolve({ type, data });
        }
    }
    
    /**
     * 处理任务错误
     */
    handleTaskError(error) {
        // 查找对应的任务并reject
        const task = this.taskQueue.find(t => t.timestamp > Date.now() - 30000);
        if (task) {
            task.reject(error);
        }
    }
    
    /**
     * 查找任务
     */
    findTaskByType(type) {
        return this.taskQueue.find(task => task.type === type);
    }
    
    /**
     * 生成任务ID
     */
    generateTaskId() {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    /**
     * 暂停Workers
     */
    pauseWorkers() {
        // 暂停所有Worker
        this.workers.forEach(worker => {
            if (worker.terminate) {
                worker.terminate();
            }
        });
        this.workers.clear();
        this.activeWorkers = 0;
    }
    
    /**
     * 恢复Workers
     */
    resumeWorkers() {
        // 重新创建Workers
        this.init();
    }
    
    /**
     * 销毁管理器
     */
    destroy() {
        this.pauseWorkers();
        this.taskQueue = [];
    }
}

/**
 * 主线程Worker模拟器
 */
class MainThreadWorker {
    constructor() {
        this.listeners = new Map();
    }
    
    addEventListener(type, listener) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        this.listeners.get(type).push(listener);
    }
    
    removeEventListener(type, listener) {
        if (this.listeners.has(type)) {
            const listeners = this.listeners.get(type);
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    postMessage(data) {
        // 模拟异步处理
        setTimeout(() => {
            const event = { data: { type: 'COMPLETE', data: data } };
            if (this.listeners.has('message')) {
                this.listeners.get('message').forEach(listener => {
                    listener(event);
                });
            }
        }, 100);
    }
    
    terminate() {
        this.listeners.clear();
    }
}

// 创建全局实例
const workerManager = new WorkerManager();

// 导出到全局
if (typeof window !== 'undefined') {
    window.WorkerManager = WorkerManager;
    window.workerManager = workerManager;
}
