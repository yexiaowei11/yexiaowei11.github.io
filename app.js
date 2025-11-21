// 配置信息
const CONFIG = {
    GITHUB_USER: 'Yexiaowei11',
    REPO_NAME: 'Yexiaowei11.github.io',
    PER_PAGE: 100,
    CACHE_TIME: 30 * 60 * 1000
};

class IssuesBlog {
    constructor() {
        this.issues = [];
        this.filteredIssues = [];
        this.currentFilter = 'all';
        this.searchKeyword = '';
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadIssues();
        this.displayLastUpdate();
    }

    setupEventListeners() {
        // 分类筛选
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleFilterClick(e.target);
            });
        });

        // 搜索功能
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });
    }

    async loadIssues() {
        console.log('🔍 开始加载 Issues...');
        
        const cachedData = this.getCachedData();
        if (cachedData) {
            console.log('✅ 使用缓存数据');
            this.issues = cachedData;
            this.filteredIssues = [...this.issues]; // 重要：初始化 filteredIssues
            this.renderPosts();
            return;
        }

        try {
            this.showLoading(true);
            
            const apiUrl = `https://api.github.com/repos/${CONFIG.GITHUB_USER}/${CONFIG.REPO_NAME}/issues?per_page=${CONFIG.PER_PAGE}&state=open`;
            console.log('🌐 请求URL:', apiUrl);
            
            const response = await fetch(apiUrl);
            console.log('📡 响应状态:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            this.issues = await response.json();
            console.log('📚 获取到文章数量:', this.issues.length);
            
            this.cacheData(this.issues);
            this.filteredIssues = [...this.issues]; // 重要：初始化 filteredIssues
            this.renderPosts();
            
        } catch (error) {
            console.error('❌ 加载失败:', error);
            this.showError('加载文章失败: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    handleFilterClick(clickedElement) {
        // 更新活跃状态
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.classList.remove('active');
        });
        clickedElement.classList.add('active');

        // 应用筛选
        this.currentFilter = clickedElement.dataset.filter;
        this.applyFilters();
    }

    handleSearch(keyword) {
        this.searchKeyword = keyword.toLowerCase();
        this.applyFilters();
    }

    applyFilters() {
        console.log('🔍 应用筛选 - 分类:', this.currentFilter, '搜索:', this.searchKeyword);
        
        this.filteredIssues = this.issues.filter(issue => {
            // 分类筛选
            const labelMatch = this.currentFilter === 'all' || 
                issue.labels.some(label => label.name === this.currentFilter);
            
            // 搜索筛选
            const searchMatch = !this.searchKeyword || 
                issue.title.toLowerCase().includes(this.searchKeyword) ||
                (issue.body && issue.body.toLowerCase().includes(this.searchKeyword));
            
            return labelMatch && searchMatch;
        });

        console.log('📊 筛选后文章数量:', this.filteredIssues.length);
        this.renderPosts();
    }

    renderPosts() {
        const grid = document.getElementById('postsGrid');
        const loading = document.getElementById('loading');
        const noResults = document.getElementById('noResults');

        if (loading) loading.style.display = 'none';

        if (!grid) {
            console.error('❌ 找不到 postsGrid 元素');
            return;
        }

        if (this.filteredIssues.length === 0) {
            grid.innerHTML = '';
            if (noResults) noResults.style.display = 'block';
            return;
        }

        if (noResults) noResults.style.display = 'none';
        
        grid.innerHTML = this.filteredIssues.map(issue => `
            <article class="post-card" onclick="window.open('${issue.html_url}', '_blank')">
                <h2 class="post-title">${this.escapeHtml(issue.title)}</h2>
                <div class="post-body">${this.markdownToText(issue.body)}</div>
                <div class="post-meta">
                    <div class="post-labels">
                        ${issue.labels.map(label => 
                            `<span class="label" style="background: #${label.color}20; color: #${label.color}">${label.name}</span>`
                        ).join('')}
                    </div>
                    <time>${this.formatDate(issue.created_at)}</time>
                </div>
            </article>
        `).join('');

        console.log('🎨 渲染完成，显示', this.filteredIssues.length, '篇文章');
    }

    markdownToText(markdown) {
        if (!markdown) return '暂无内容';
        return markdown
            .replace(/!\[.*?\]\(.*?\)/g, '[图片]')
            .replace(/\[(.*?)\]\(.*?\)/g, '$1')
            .replace(/#{1,6}\s?/g, '')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/`(.*?)`/g, '$1')
            .replace(/\n/g, ' ')
            .substring(0, 150) + '...';
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = show ? 'block' : 'none';
    }

    showError(message) {
        const grid = document.getElementById('postsGrid');
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
        if (grid) grid.innerHTML = `<div class="error-message">${message}</div>`;
    }

    getCachedData() {
        const cached = localStorage.getItem('issues-blog-cache');
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CONFIG.CACHE_TIME) {
                return data;
            }
        }
        return null;
    }

    cacheData(data) {
        const cache = {
            data: data,
            timestamp: Date.now()
        };
        localStorage.setItem('issues-blog-cache', JSON.stringify(cache));
    }

    displayLastUpdate() {
        const element = document.getElementById('lastUpdate');
        if (element) {
            element.textContent = new Date().toLocaleDateString('zh-CN');
        }
    }
}

// 初始化博客
console.log('🚀 开始初始化博客...');
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM 加载完成，创建 IssuesBlog 实例');
    window.issuesBlog = new IssuesBlog();
});
