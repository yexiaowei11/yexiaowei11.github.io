// 配置信息
const CONFIG = {
    GITHUB_USER: 'Yexiaowei11',  // 替换为你的用户名
    REPO_NAME: 'Yexiaowei11.github.io'      // 替换为你的仓库名
    PER_PAGE: 100,               // 每页文章数量
    CACHE_TIME: 30 * 60 * 1000   // 缓存时间30分钟
};

class IssuesBlog {
    constructor() {
        this.issues = [];
        this.filteredIssues = [];
        this.currentFilter = 'all';
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
        const cachedData = this.getCachedData();
        
        if (cachedData) {
            this.issues = cachedData;
            this.renderPosts();
            return;
        }

        try {
            this.showLoading(true);
            
            const response = await fetch(
                `https://api.github.com/repos/${CONFIG.GITHUB_USER}/${CONFIG.REPO_NAME}/issues?per_page=${CONFIG.PER_PAGE}&state=open`
            );
            
            if (!response.ok) throw new Error('API 请求失败');
            
            this.issues = await response.json();
            this.cacheData(this.issues);
            this.renderPosts();
            
        } catch (error) {
            console.error('加载文章失败:', error);
            this.showError('加载文章失败，请刷新重试');
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
        this.filteredIssues = this.issues.filter(issue => {
            // 分类筛选
            const labelMatch = this.currentFilter === 'all' || 
                issue.labels.some(label => label.name === this.currentFilter);
            
            // 搜索筛选
            const searchMatch = !this.searchKeyword || 
                issue.title.toLowerCase().includes(this.searchKeyword) ||
                issue.body.toLowerCase().includes(this.searchKeyword);
            
            return labelMatch && searchMatch;
        });

        this.renderPosts();
    }

    renderPosts() {
        const grid = document.getElementById('postsGrid');
        const noResults = document.getElementById('noResults');

        if (this.filteredIssues.length === 0) {
            grid.innerHTML = '';
            noResults.style.display = 'block';
            return;
        }

        noResults.style.display = 'none';
        
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
    }

    markdownToText(markdown) {
        if (!markdown) return '暂无内容';
        return markdown
            .replace(/!\[.*?\]\(.*?\)/g, '[图片]')  // 移除图片
            .replace(/\[(.*?)\]\(.*?\)/g, '$1')     // 移除链接，保留文字
            .replace(/#{1,6}\s?/g, '')             // 移除标题标记
            .replace(/\*\*(.*?)\*\*/g, '$1')       // 移除粗体
            .replace(/\*(.*?)\*/g, '$1')           // 移除斜体
            .replace(/`(.*?)`/g, '$1')             // 移除代码标记
            .replace(/\n/g, ' ')                   // 换行转空格
            .substring(0, 150) + '...';            // 截取长度
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
        document.getElementById('loading').style.display = show ? 'block' : 'none';
    }

    showError(message) {
        const grid = document.getElementById('postsGrid');
        grid.innerHTML = `<div class="error-message">${message}</div>`;
    }

    // 缓存相关方法
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
        document.getElementById('lastUpdate').textContent = 
            new Date().toLocaleDateString('zh-CN');
    }
}

// 初始化博客
document.addEventListener('DOMContentLoaded', () => {
    new IssuesBlog();
});
// 自动更新年份
document.getElementById('currentYear').textContent = new Date().getFullYear();
