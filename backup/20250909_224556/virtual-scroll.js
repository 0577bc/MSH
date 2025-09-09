/**
 * 虚拟滚动组件 - 优化大量DOM操作
 * 用于处理大量数据的表格和列表显示
 */

class VirtualScrollManager {
    constructor(options = {}) {
        this.container = options.container;
        this.itemHeight = options.itemHeight || 40;
        this.visibleCount = options.visibleCount || 20;
        this.bufferSize = options.bufferSize || 5;
        this.data = options.data || [];
        this.renderItem = options.renderItem;
        
        this.scrollTop = 0;
        this.startIndex = 0;
        this.endIndex = 0;
        this.visibleItems = [];
        
        this.init();
    }
    
    init() {
        if (!this.container) {
            console.error('VirtualScrollManager: 容器元素未找到');
            return;
        }
        
        this.setupContainer();
        this.setupScrollListener();
        this.updateVisibleItems();
    }
    
    setupContainer() {
        // 设置容器样式
        this.container.style.position = 'relative';
        this.container.style.overflow = 'auto';
        this.container.style.height = `${this.visibleCount * this.itemHeight}px`;
        
        // 创建内容容器
        this.contentContainer = document.createElement('div');
        this.contentContainer.style.position = 'relative';
        this.contentContainer.style.height = `${this.data.length * this.itemHeight}px`;
        
        // 创建可见项容器
        this.visibleContainer = document.createElement('div');
        this.visibleContainer.style.position = 'absolute';
        this.visibleContainer.style.top = '0';
        this.visibleContainer.style.left = '0';
        this.visibleContainer.style.right = '0';
        
        this.contentContainer.appendChild(this.visibleContainer);
        this.container.appendChild(this.contentContainer);
    }
    
    setupScrollListener() {
        this.container.addEventListener('scroll', this.handleScroll.bind(this));
    }
    
    handleScroll() {
        this.scrollTop = this.container.scrollTop;
        this.updateVisibleItems();
    }
    
    updateVisibleItems() {
        const startIndex = Math.floor(this.scrollTop / this.itemHeight);
        const endIndex = Math.min(
            startIndex + this.visibleCount + this.bufferSize,
            this.data.length
        );
        
        const actualStartIndex = Math.max(0, startIndex - this.bufferSize);
        
        if (actualStartIndex !== this.startIndex || endIndex !== this.endIndex) {
            this.startIndex = actualStartIndex;
            this.endIndex = endIndex;
            this.renderVisibleItems();
        }
    }
    
    renderVisibleItems() {
        // 清空现有内容
        this.visibleContainer.innerHTML = '';
        
        // 设置容器位置
        this.visibleContainer.style.transform = `translateY(${this.startIndex * this.itemHeight}px)`;
        
        // 渲染可见项
        for (let i = this.startIndex; i < this.endIndex; i++) {
            if (i >= this.data.length) break;
            
            const item = this.data[i];
            const itemElement = this.renderItem(item, i);
            
            if (itemElement) {
                itemElement.style.position = 'absolute';
                itemElement.style.top = '0';
                itemElement.style.left = '0';
                itemElement.style.right = '0';
                itemElement.style.height = `${this.itemHeight}px`;
                itemElement.style.transform = `translateY(${(i - this.startIndex) * this.itemHeight}px)`;
                
                this.visibleContainer.appendChild(itemElement);
            }
        }
    }
    
    updateData(newData) {
        this.data = newData;
        this.contentContainer.style.height = `${this.data.length * this.itemHeight}px`;
        this.updateVisibleItems();
    }
    
    scrollToIndex(index) {
        if (index >= 0 && index < this.data.length) {
            const scrollTop = index * this.itemHeight;
            this.container.scrollTop = scrollTop;
        }
    }
    
    destroy() {
        if (this.container) {
            this.container.removeEventListener('scroll', this.handleScroll.bind(this));
            this.container.innerHTML = '';
        }
    }
}

/**
 * 分页管理器
 */
class PaginationManager {
    constructor(options = {}) {
        this.container = options.container;
        this.data = options.data || [];
        this.pageSize = options.pageSize || 50;
        this.currentPage = 1;
        this.renderItem = options.renderItem;
        this.renderPagination = options.renderPagination;
        
        this.totalPages = Math.ceil(this.data.length / this.pageSize);
        this.init();
    }
    
    init() {
        if (!this.container) {
            console.error('PaginationManager: 容器元素未找到');
            return;
        }
        
        this.setupContainer();
        this.renderCurrentPage();
        this.renderPaginationControls();
    }
    
    setupContainer() {
        this.container.innerHTML = '';
        
        // 创建内容容器
        this.contentContainer = document.createElement('div');
        this.contentContainer.className = 'pagination-content';
        
        // 创建分页控制容器
        this.paginationContainer = document.createElement('div');
        this.paginationContainer.className = 'pagination-controls';
        
        this.container.appendChild(this.contentContainer);
        this.container.appendChild(this.paginationContainer);
    }
    
    renderCurrentPage() {
        this.contentContainer.innerHTML = '';
        
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, this.data.length);
        
        for (let i = startIndex; i < endIndex; i++) {
            const item = this.data[i];
            const itemElement = this.renderItem(item, i);
            
            if (itemElement) {
                this.contentContainer.appendChild(itemElement);
            }
        }
    }
    
    renderPaginationControls() {
        this.paginationContainer.innerHTML = '';
        
        if (this.totalPages <= 1) return;
        
        // 创建分页控件
        const pagination = document.createElement('div');
        pagination.className = 'pagination';
        
        // 上一页按钮
        const prevButton = document.createElement('button');
        prevButton.textContent = '上一页';
        prevButton.disabled = this.currentPage === 1;
        prevButton.addEventListener('click', () => this.goToPage(this.currentPage - 1));
        
        // 页码按钮
        const pageButtons = document.createElement('div');
        pageButtons.className = 'page-buttons';
        
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.className = i === this.currentPage ? 'active' : '';
            pageButton.addEventListener('click', () => this.goToPage(i));
            pageButtons.appendChild(pageButton);
        }
        
        // 下一页按钮
        const nextButton = document.createElement('button');
        nextButton.textContent = '下一页';
        nextButton.disabled = this.currentPage === this.totalPages;
        nextButton.addEventListener('click', () => this.goToPage(this.currentPage + 1));
        
        // 页面信息
        const pageInfo = document.createElement('span');
        pageInfo.textContent = `第 ${this.currentPage} 页，共 ${this.totalPages} 页`;
        pageInfo.className = 'page-info';
        
        pagination.appendChild(prevButton);
        pagination.appendChild(pageButtons);
        pagination.appendChild(nextButton);
        pagination.appendChild(pageInfo);
        
        this.paginationContainer.appendChild(pagination);
    }
    
    goToPage(page) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.renderCurrentPage();
            this.renderPaginationControls();
        }
    }
    
    updateData(newData) {
        this.data = newData;
        this.totalPages = Math.ceil(this.data.length / this.pageSize);
        this.currentPage = 1;
        this.renderCurrentPage();
        this.renderPaginationControls();
    }
    
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

/**
 * 性能优化的表格渲染器
 */
class OptimizedTableRenderer {
    constructor(options = {}) {
        this.container = options.container;
        this.columns = options.columns || [];
        this.data = options.data || [];
        this.useVirtualScroll = options.useVirtualScroll || false;
        this.usePagination = options.usePagination || false;
        this.pageSize = options.pageSize || 50;
        this.rowHeight = options.rowHeight || 40;
        
        this.init();
    }
    
    init() {
        if (!this.container) {
            console.error('OptimizedTableRenderer: 容器元素未找到');
            return;
        }
        
        this.setupTable();
        this.renderData();
    }
    
    setupTable() {
        this.container.innerHTML = '';
        
        // 创建表格
        this.table = document.createElement('table');
        this.table.className = 'optimized-table';
        
        // 创建表头
        this.thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        
        this.columns.forEach(column => {
            const th = document.createElement('th');
            th.textContent = column.title;
            th.style.width = column.width || 'auto';
            headerRow.appendChild(th);
        });
        
        this.thead.appendChild(headerRow);
        this.table.appendChild(this.thead);
        
        // 创建表体
        this.tbody = document.createElement('tbody');
        this.table.appendChild(this.tbody);
        
        this.container.appendChild(this.table);
    }
    
    renderData() {
        if (this.useVirtualScroll) {
            this.renderWithVirtualScroll();
        } else if (this.usePagination) {
            this.renderWithPagination();
        } else {
            this.renderAll();
        }
    }
    
    renderWithVirtualScroll() {
        // 使用虚拟滚动渲染
        const virtualScroll = new VirtualScrollManager({
            container: this.tbody,
            data: this.data,
            itemHeight: this.rowHeight,
            visibleCount: Math.ceil(this.container.clientHeight / this.rowHeight),
            renderItem: (item, index) => this.renderTableRow(item, index)
        });
        
        this.virtualScroll = virtualScroll;
    }
    
    renderWithPagination() {
        // 使用分页渲染
        const pagination = new PaginationManager({
            container: this.tbody,
            data: this.data,
            pageSize: this.pageSize,
            renderItem: (item, index) => this.renderTableRow(item, index)
        });
        
        this.pagination = pagination;
    }
    
    renderAll() {
        // 渲染所有数据
        this.tbody.innerHTML = '';
        
        this.data.forEach((item, index) => {
            const row = this.renderTableRow(item, index);
            this.tbody.appendChild(row);
        });
    }
    
    renderTableRow(item, index) {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'even' : 'odd';
        
        this.columns.forEach(column => {
            const cell = document.createElement('td');
            const value = this.getCellValue(item, column);
            cell.textContent = value;
            cell.className = column.className || '';
            row.appendChild(cell);
        });
        
        return row;
    }
    
    getCellValue(item, column) {
        if (typeof column.dataKey === 'function') {
            return column.dataKey(item);
        } else if (typeof column.dataKey === 'string') {
            return item[column.dataKey] || '';
        } else {
            return '';
        }
    }
    
    updateData(newData) {
        this.data = newData;
        
        if (this.virtualScroll) {
            this.virtualScroll.updateData(newData);
        } else if (this.pagination) {
            this.pagination.updateData(newData);
        } else {
            this.renderAll();
        }
    }
    
    destroy() {
        if (this.virtualScroll) {
            this.virtualScroll.destroy();
        }
        if (this.pagination) {
            this.pagination.destroy();
        }
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// 导出到全局
if (typeof window !== 'undefined') {
    window.VirtualScrollManager = VirtualScrollManager;
    window.PaginationManager = PaginationManager;
    window.OptimizedTableRenderer = OptimizedTableRenderer;
}
