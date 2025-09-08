// Enhanced News Sentiment Analysis JavaScript

// Global variables
let currentTheme = 'light';
let sentimentChart = null;
let allHistoryData = [];
let filteredNewsData = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 DOM Content Loaded');
    initializeApp();
    loadHistory();
    setupTabs();
});

function setupTabs() {
    // Auto-load trending news when trending tab is shown
    const trendingTab = document.querySelector('a[href="#trending"]');
    if (trendingTab) {
        trendingTab.addEventListener('shown.bs.tab', function() {
            loadTrendingNews();
        });
        
        // Load trending news if trending tab is active on page load
        if (trendingTab.classList.contains('active')) {
            loadTrendingNews();
        }
    }
}

function initializeApp() {
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    
    // Set up form submission
    const form = document.getElementById('sentimentForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
        console.log('✅ Form event listener attached successfully');
    } else {
        console.error('❌ Could not find sentimentForm element');
    }
    
    // Auto-resize textarea
    const textarea = document.getElementById('newsArticle');
    if (textarea) {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }
    
    // Live character counting
    updateCharCount('newsTitle', 'titleCount', 200);
    updateCharCount('newsArticle', 'articleCount', 5000);
}

// Theme Management
function toggleTheme() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

function setTheme(theme) {
    currentTheme = theme;
    document.body.setAttribute('data-bs-theme', theme);
    
    const icon = document.getElementById('theme-icon');
    if (theme === 'dark') {
        icon.className = 'fas fa-sun';
    } else {
        icon.className = 'fas fa-moon';
    }
    
    localStorage.setItem('theme', theme);
    
    // Update charts if they exist
    if (sentimentChart) {
        updateChartTheme(sentimentChart);
    }
    if (trendsChart) {
        updateChartTheme(trendsChart);
    }
}

function updateChartTheme(chart) {
    const isDark = currentTheme === 'dark';
    chart.options.plugins.legend.labels.color = isDark ? '#f8f9fa' : '#495057';
    chart.options.scales.x.ticks.color = isDark ? '#f8f9fa' : '#495057';
    chart.options.scales.y.ticks.color = isDark ? '#f8f9fa' : '#495057';
    chart.update();
}

// Character Counter
function updateCharCount(inputId, counterId, maxLength) {
    const input = document.getElementById(inputId);
    const counter = document.getElementById(counterId);
    
    if (!input || !counter) return;
    
    const currentLength = input.value.length;
    counter.textContent = `${currentLength} / ${maxLength} characters`;
    
    // Update counter color based on length
    counter.className = 'char-counter';
    if (currentLength > maxLength * 0.9) {
        counter.classList.add('danger');
    } else if (currentLength > maxLength * 0.7) {
        counter.classList.add('warning');
    }
    
    // Update quick stats in real-time
    updateQuickStats(input.value);
}

function updateQuickStats(text) {
    const statsContainer = document.getElementById('quickStats');
    if (!text.trim()) {
        statsContainer.innerHTML = '<p class="text-muted text-center">Enter text to see analysis stats</p>';
        return;
    }
    
    const wordCount = text.trim().split(/\s+/).length;
    const sentenceCount = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const charCount = text.length;
    const readingTime = Math.ceil(wordCount / 200); // 200 words per minute average
    
    // Advanced text analysis - keyword extraction
    const keywords = extractKeywords(text);
    
    statsContainer.innerHTML = `
        <div class="analysis-grid">
            <div class="analysis-item">
                <i class="fas fa-font"></i>
                <div class="analysis-value">${wordCount}</div>
                <small>Words</small>
            </div>
            <div class="analysis-item">
                <i class="fas fa-paragraph"></i>
                <div class="analysis-value">${sentenceCount}</div>
                <small>Sentences</small>
            </div>
            <div class="analysis-item">
                <i class="fas fa-keyboard"></i>
                <div class="analysis-value">${charCount}</div>
                <small>Characters</small>
            </div>
            <div class="analysis-item">
                <i class="fas fa-clock"></i>
                <div class="analysis-value">${readingTime}</div>
                <small>Min Read</small>
            </div>
        </div>
        <div class="mt-3">
            <h6><i class="fas fa-key text-primary"></i> Key Terms</h6>
            <div class="keywords-container">
                ${keywords.map(keyword => `<span class="badge bg-primary me-1 mb-1">${keyword}</span>`).join('')}
            </div>
        </div>
    `;
}

// Advanced Text Analysis - Keyword Extraction
function extractKeywords(text) {
    // Common stop words to filter out
    const stopWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
        'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
        'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
        'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
        'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you',
        'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her',
        'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves'
    ]);
    
    // Extract words and count frequency
    const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.has(word));
    
    const frequency = {};
    words.forEach(word => {
        frequency[word] = (frequency[word] || 0) + 1;
    });
    
    // Return top 8 keywords sorted by frequency
    return Object.entries(frequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8)
        .map(([word]) => word);
}

// Form Handling
async function handleFormSubmit(e) {
    console.log('🔄 Form submission triggered');
    e.preventDefault();
    e.stopPropagation();
    
    const titleElement = document.getElementById('newsTitle');
    const textareaElement = document.getElementById('newsArticle');
    const title = titleElement.value.trim();
    const text = textareaElement.value.trim();
    
    console.log('📝 Form data:', { title: title.substring(0, 50) + '...', textLength: text.length });
    
    // Clear any previous validation styling
    textareaElement.classList.remove('is-invalid');
    
    if (!text) {
        console.log('❌ Validation failed: No text provided');
        // Add visual feedback for validation error
        textareaElement.classList.add('is-invalid');
        showToast('Please enter some text to analyze', 'warning');
        textareaElement.focus();
        return false;
    }
    
    if (text.length < 10) {
        console.log('❌ Validation failed: Text too short');
        textareaElement.classList.add('is-invalid');
        showToast('Please enter at least 10 characters of text', 'warning');
        textareaElement.focus();
        return false;
    }
    
    console.log('✅ Validation passed, starting analysis...');
    
    // Disable the submit button to prevent double submission
    const submitBtn = document.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    
    showLoading(true);
    
    try {
        console.log('📡 Sending request to /predict...');
        const response = await fetch('/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title, text })
        });
        
        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📊 Response data:', data);
        
        if (data.error) {
            console.log('❌ Server error:', data.error);
            showToast(data.error, 'error');
        } else {
            console.log('✅ Analysis successful, displaying results...');
            displayResults(data);
            updateRecentActivity();
        }
        
    } catch (error) {
        console.error('❌ Network/Parse error:', error);
        showToast('Network error: ' + error.message, 'error');
    } finally {
        showLoading(false);
        
        // Re-enable the submit button
        const submitBtn = document.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-brain"></i> Analyze Sentiment';
    }
}

async function analyzeUrl() {
    const url = document.getElementById('newsUrl').value.trim();
    
    if (!url) {
        showToast('Please enter a URL', 'warning');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch('/analyze-url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url })
        });
        
        const data = await response.json();
        
        if (data.error) {
            showToast(data.error, 'error');
        } else {
            displayResults(data);
            updateRecentActivity();
        }
        
    } catch (error) {
        showToast('Error analyzing URL: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Results Display
function displayResults(data) {
    const resultsContainer = document.getElementById('analysisResults');
    const sentiment = data.sentiment;
    const sentimentClass = sentiment === 'positive' ? 'sentiment-positive' : 'sentiment-negative';
    const sentimentIcon = sentiment === 'positive' ? 'smile' : 'frown';
    const sentimentColor = sentiment === 'positive' ? 'text-success' : 'text-danger';
    
    // Build enhanced analysis display
    let enhancedFeaturesHtml = '';
    
    // Language and writing style
    if (data.language || data.writing_style) {
        enhancedFeaturesHtml += `
            <div class="row mb-3">
                ${data.language ? `
                <div class="col-md-6">
                    <div class="analysis-item">
                        <i class="fas fa-globe"></i>
                        <div class="analysis-value">${data.language}</div>
                        <small>Language</small>
                    </div>
                </div>` : ''}
                ${data.writing_style ? `
                <div class="col-md-6">
                    <div class="analysis-item">
                        <i class="fas fa-pen-fancy"></i>
                        <div class="analysis-value">${data.writing_style}</div>
                        <small>Writing Style</small>
                    </div>
                </div>` : ''}
            </div>
        `;
    }
    
    // Translation information
    if (data.translation_info && data.translation_info.was_translated) {
        enhancedFeaturesHtml += `
            <div class="row mb-3">
                <div class="col-12">
                    <div class="alert alert-info d-flex align-items-center">
                        <i class="fas fa-language me-2"></i>
                        <div>
                            <strong>🌐 Multilingual Analysis:</strong> 
                            Text was automatically translated from <strong>${data.translation_info.original_language.name}</strong> to English for analysis. 
                            Summary has been translated back to the original language.
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Additional metrics
    if (data.clickbait_score !== undefined || data.readability_score !== undefined || data.word_count) {
        enhancedFeaturesHtml += `
            <div class="row mb-3">
                ${data.clickbait_score !== undefined ? `
                <div class="col-md-4">
                    <div class="analysis-item">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div class="analysis-value">${(data.clickbait_score * 100).toFixed(1)}%</div>
                        <small>Clickbait Score</small>
                    </div>
                </div>` : ''}
                ${data.readability_score !== undefined ? `
                <div class="col-md-4">
                    <div class="analysis-item">
                        <i class="fas fa-book-open"></i>
                        <div class="analysis-value">${data.readability_score.toFixed(1)}</div>
                        <small>Readability</small>
                    </div>
                </div>` : ''}
                ${data.word_count ? `
                <div class="col-md-4">
                    <div class="analysis-item">
                        <i class="fas fa-calculator"></i>
                        <div class="analysis-value">${data.word_count}</div>
                        <small>Word Count</small>
                    </div>
                </div>` : ''}
            </div>
        `;
    }
    
    // Word cloud
    let wordCloudHtml = '';
    if (data.word_cloud) {
        wordCloudHtml = `
            <div class="word-cloud-container">
                <h6><i class="fas fa-cloud"></i> Word Cloud</h6>
                <img src="data:image/png;base64,${data.word_cloud}" alt="Word Cloud" class="img-fluid" style="max-height: 200px;">
            </div>
        `;
    }
    
    // Similar articles
    let similarArticlesHtml = '';
    if (data.similar_articles && data.similar_articles.length > 0) {
        similarArticlesHtml = `
            <div class="mt-3">
                <h6><i class="fas fa-search"></i> Similar Articles Found</h6>
                ${data.similar_articles.map(article => `
                    <div class="similar-article">
                        <strong>${article.title}</strong>
                        <div class="d-flex justify-content-between align-items-center mt-1">
                            <span class="badge bg-${article.sentiment === 'positive' ? 'success' : 'danger'}">
                                ${article.sentiment}
                            </span>
                            <small class="text-muted">
                                ${(article.similarity * 100).toFixed(1)}% similar
                            </small>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    // Key details
    let keyDetailsHtml = '';
    const keyDetails = data.key_details || {};
    const hasDetails = Object.values(keyDetails).some(arr => arr && arr.length > 0);
    
    if (hasDetails) {
        keyDetailsHtml = `
            <div class="mt-3">
                <h6><i class="fas fa-key"></i> Key Details</h6>
                <div class="row">
                    ${keyDetails.people && keyDetails.people.length > 0 ? `
                    <div class="col-md-6 mb-2">
                        <strong><i class="fas fa-user text-primary"></i> People:</strong><br>
                        ${keyDetails.people.join(', ')}
                    </div>` : ''}
                    ${keyDetails.organizations && keyDetails.organizations.length > 0 ? `
                    <div class="col-md-6 mb-2">
                        <strong><i class="fas fa-building text-info"></i> Organizations:</strong><br>
                        ${keyDetails.organizations.join(', ')}
                    </div>` : ''}
                    ${keyDetails.numbers && keyDetails.numbers.length > 0 ? `
                    <div class="col-md-6 mb-2">
                        <strong><i class="fas fa-chart-bar text-warning"></i> Key Numbers:</strong><br>
                        ${keyDetails.numbers.join(', ')}
                    </div>` : ''}
                    ${keyDetails.locations && keyDetails.locations.length > 0 ? `
                    <div class="col-md-6 mb-2">
                        <strong><i class="fas fa-map-marker-alt text-danger"></i> Locations:</strong><br>
                        ${keyDetails.locations.join(', ')}
                    </div>` : ''}
                    ${keyDetails.dates && keyDetails.dates.length > 0 ? `
                    <div class="col-md-6 mb-2">
                        <strong><i class="fas fa-calendar text-success"></i> Dates:</strong><br>
                        ${keyDetails.dates.join(', ')}
                    </div>` : ''}
                </div>
            </div>
        `;
    }
    
    resultsContainer.innerHTML = `
        <div class="card ${sentimentClass} slide-in result-section">
            <div class="card-header d-flex justify-content-between align-items-center">
                <h5 class="mb-0">
                    <i class="fas fa-${sentimentIcon} ${sentimentColor}"></i>
                    Analysis Results - ${sentiment.toUpperCase()}
                </h5>
                <button class="btn btn-sm btn-outline-secondary copy-btn" onclick="copyResults()">
                    <i class="fas fa-copy"></i> Copy
                </button>
                <div class="btn-group ms-2">
                    <button class="btn btn-sm btn-outline-primary" onclick="printResults()">
                        <i class="fas fa-print"></i> Print
                    </button>
                    <button class="btn btn-sm btn-outline-success" onclick="downloadResults()">
                        <i class="fas fa-download"></i> PDF
                    </button>
                </div>
            </div>
            <div class="card-body">
                <!-- Main Sentiment Display -->
                <div class="text-center mb-4">
                    <div class="display-4 ${sentimentColor} mb-2">
                        <i class="fas fa-${sentimentIcon}"></i>
                    </div>
                    <h3 class="${sentimentColor}">${sentiment.toUpperCase()}</h3>
                    <div class="fs-4 fw-bold">${(data.confidence * 100).toFixed(1)}% Confident</div>
                    <small class="text-muted">${data.confidence_level} confidence level</small>
                </div>
                
                <!-- Enhanced Features -->
                ${enhancedFeaturesHtml}
                
                <!-- Summary -->
                <div class="bg-light p-3 rounded mb-3">
                    <h6><i class="fas fa-file-alt"></i> Article Summary</h6>
                    <p class="mb-0">${data.summary || 'No summary available'}</p>
                </div>
                
                <!-- Word Cloud -->
                ${wordCloudHtml}
                
                <!-- Key Details -->
                ${keyDetailsHtml}
                
                <!-- Similar Articles -->
                ${similarArticlesHtml}
            </div>
        </div>
    `;
    
    // Scroll to results
    resultsContainer.scrollIntoView({ behavior: 'smooth' });
}

// Copy functionality
function copyResults() {
    const resultElement = document.querySelector('.result-section');
    if (!resultElement) return;
    
    // Extract text content
    const text = resultElement.innerText;
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('Results copied to clipboard!', 'success');
    }).catch(() => {
        showToast('Failed to copy to clipboard', 'error');
    });
}

// Print functionality
function printResults() {
    const resultElement = document.querySelector('.result-section');
    if (!resultElement) {
        showToast('No results to print', 'warning');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Sentiment Analysis Results</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <style>
                body { padding: 20px; }
                .sentiment-positive { border-left: 5px solid #28a745; }
                .sentiment-negative { border-left: 5px solid #dc3545; }
                @media print { 
                    .no-print { display: none; }
                    body { font-size: 12px; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Sentiment Analysis Report</h2>
                <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                <hr>
                ${resultElement.outerHTML}
            </div>
            <script>window.print(); window.close();</script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Download PDF functionality
function downloadResults() {
    const resultElement = document.querySelector('.result-section');
    if (!resultElement) {
        showToast('No results to download', 'warning');
        return;
    }
    
    showToast('PDF download feature requires dashboard dependencies', 'warning');
}

// History Management
async function loadHistory() {
    try {
        const response = await fetch('/history');
        const data = await response.json();
        
        displayHistory(data.history || []);
        
    } catch (error) {
        console.error('Error loading history:', error);
        document.getElementById('historyContent').innerHTML = 
            '<p class="text-center text-muted">Error loading history</p>';
    }
}

function displayHistory(history) {
    const container = document.getElementById('historyContent');
    
    if (history.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No analysis history yet</p>';
        return;
    }
    
    container.innerHTML = history.map(item => `
        <div class="history-item">
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <h6 class="mb-1">${item.title}</h6>
                    <div class="d-flex gap-3 mb-2">
                        <span class="badge bg-${item.sentiment === 'positive' ? 'success' : 'danger'}">
                            ${item.sentiment}
                        </span>
                        <small class="text-muted">
                            ${(item.confidence * 100).toFixed(1)}% confidence
                        </small>
                        ${item.language ? `<small class="text-muted">${item.language}</small>` : ''}
                        ${item.writing_style ? `<small class="text-muted">${item.writing_style}</small>` : ''}
                    </div>
                    <small class="text-muted">
                        <i class="fas fa-clock"></i> ${new Date(item.timestamp).toLocaleString()}
                        ${item.word_count ? ` • ${item.word_count} words` : ''}
                        ${item.clickbait_score ? ` • ${(item.clickbait_score * 100).toFixed(1)}% clickbait` : ''}
                    </small>
                </div>
            </div>
        </div>
    `).join('');
}

async function clearHistory() {
    if (!confirm('Are you sure you want to clear all analysis history?')) {
        return;
    }
    
    try {
        const response = await fetch('/clear-history', { method: 'POST' });
        const data = await response.json();
        
        if (data.error) {
            showToast(data.error, 'error');
        } else {
            showToast('History cleared successfully!', 'success');
            loadHistory();
        }
        
    } catch (error) {
        showToast('Error clearing history: ' + error.message, 'error');
    }
}

// News Feeds
async function loadTrendingNews() {
    const container = document.getElementById('trendingContent');
    container.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div></div>';
    
    try {
        const category = document.getElementById('newsCategory').value;
        const country = document.getElementById('newsCountry').value;
        
        console.log(`🔄 Loading trending news: category=${category}, country=${country}`);
        
        const response = await fetch(`/trending-news?category=${category}&country=${country}`);
        console.log(`📡 Response status: ${response.status}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📊 Response data:', data);
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        displayNewsArticles(data.articles || [], container, 'trending');
        
    } catch (error) {
        console.error('❌ Error loading trending news:', error);
        container.innerHTML = `<p class="text-center text-danger">Error loading trending news: ${error.message}</p>`;
    }
}

async function loadRSSNews() {
    const container = document.getElementById('rssContent');
    container.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div></div>';
    
    try {
        const response = await fetch('/rss-news');
        const data = await response.json();
        
        displayNewsArticles(data.articles || [], container, 'rss');
        
    } catch (error) {
        container.innerHTML = '<p class="text-center text-muted">Error loading RSS feeds</p>';
    }
}

function displayNewsArticles(articles, container, type) {
    console.log(`📰 Displaying ${articles.length} articles for type: ${type}`);
    
    if (articles.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">No articles found</p>';
        return;
    }
    
    container.innerHTML = articles.map(article => `
        <div class="card mb-3">
            <div class="card-body">
                <div class="row">
                    ${article.image_url ? `
                    <div class="col-md-3">
                        <img src="${article.image_url}" class="img-fluid rounded" alt="Article image">
                    </div>
                    <div class="col-md-9">` : '<div class="col-12">'}
                        <h6 class="card-title">${article.title}</h6>
                        <p class="card-text">${article.content.substring(0, 200)}...</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                <i class="fas fa-newspaper"></i> ${article.source}
                                ${article.published ? ` • ${new Date(article.published).toLocaleDateString()}` : ''}
                                ${article.sentiment ? ` • <span class="badge bg-${article.sentiment === 'positive' ? 'success' : article.sentiment === 'negative' ? 'danger' : 'secondary'}">${article.sentiment}</span>` : ''}
                            </small>
                            <div>
                                <button class="btn btn-sm btn-outline-primary me-2" 
                                        onclick="analyzeNewsArticle('${article.title.replace(/'/g, "\\'")}', '${article.content.replace(/'/g, "\\'")}')">
                                    <i class="fas fa-brain"></i> Analyze
                                </button>
                                ${article.url ? `
                                <a href="${article.url}" target="_blank" class="btn btn-sm btn-outline-secondary">
                                    <i class="fas fa-external-link-alt"></i>
                                </a>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    console.log(`✅ Successfully displayed ${articles.length} articles`);
}

function analyzeNewsArticle(title, content) {
    // Switch to analyze tab
    const analyzeTab = new bootstrap.Tab(document.querySelector('a[href="#analyze"]'));
    analyzeTab.show();
    
    // Fill the form
    document.getElementById('newsTitle').value = title;
    document.getElementById('newsArticle').value = content;
    
    // Update character counts
    updateCharCount('newsTitle', 'titleCount', 200);
    updateCharCount('newsArticle', 'articleCount', 5000);
    
    // Scroll to form
    document.getElementById('sentimentForm').scrollIntoView({ behavior: 'smooth' });
}

// Utility Functions
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
}

function showToast(message, type = 'info') {
    // Create and show toast notification
    const toastContainer = document.querySelector('.toast-container');
    const toastId = 'toast-' + Date.now();
    
    const bgClass = {
        'success': 'bg-success',
        'error': 'bg-danger',
        'warning': 'bg-warning',
        'info': 'bg-info'
    }[type] || 'bg-info';
    
    const iconClass = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    }[type] || 'fa-info-circle';
    
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas ${iconClass} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
    toast.show();
    
    // Remove toast element after it's hidden
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

function clearForm() {
    document.getElementById('newsTitle').value = '';
    document.getElementById('newsArticle').value = '';
    document.getElementById('newsUrl').value = '';
    updateCharCount('newsTitle', 'titleCount', 200);
    updateCharCount('newsArticle', 'articleCount', 5000);
    
    // Clear results
    document.getElementById('analysisResults').innerHTML = '';
    
    showToast('Form cleared', 'info');
}

// Navigation helpers
function showHistory() {
    const historyTab = new bootstrap.Tab(document.querySelector('a[href="#history"]'));
    historyTab.show();
    loadHistory();
}

// Advanced search functionality
function performAdvancedSearch() {
    const searchText = document.getElementById('search-text').value.toLowerCase();
    const sentimentFilter = document.getElementById('sentiment-filter').value;
    const confidenceMin = parseFloat(document.getElementById('confidence-min').value) || 0;
    const confidenceMax = parseFloat(document.getElementById('confidence-max').value) || 100;
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;
    
    const historyItems = document.querySelectorAll('.history-item');
    let visibleCount = 0;
    
    historyItems.forEach(item => {
        const text = item.querySelector('.analysis-text')?.textContent.toLowerCase() || '';
        const sentiment = item.querySelector('.badge')?.textContent.toLowerCase() || '';
        const confidenceText = item.querySelector('small')?.textContent || '';
        const confidenceRegex = confidenceText.match(/Confidence: ([\d.]+)%/);
        const confidence = confidenceRegex ? parseFloat(confidenceRegex[1]) : 0;
        const dateText = item.querySelector('.text-muted')?.textContent || '';
        const itemDate = extractDateFromText(dateText);
        
        // Apply filters
        const textMatch = !searchText || text.includes(searchText);
        const sentimentMatch = !sentimentFilter || sentiment === sentimentFilter;
        const confidenceInRange = confidence >= confidenceMin && confidence <= confidenceMax;
        const dateMatch = (!dateFrom || !itemDate || itemDate >= new Date(dateFrom)) &&
                         (!dateTo || !itemDate || itemDate <= new Date(dateTo));
        
        if (textMatch && sentimentMatch && confidenceInRange && dateMatch) {
            item.style.display = 'block';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    // Update result count
    const resultCount = document.getElementById('search-results-count');
    if (resultCount) {
        resultCount.textContent = `${visibleCount} results found`;
    }
}

// Clear search filters
function clearSearch() {
    document.getElementById('search-text').value = '';
    document.getElementById('sentiment-filter').value = '';
    document.getElementById('confidence-min').value = '';
    document.getElementById('confidence-max').value = '';
    document.getElementById('date-from').value = '';
    document.getElementById('date-to').value = '';
    
    // Show all items
    const historyItems = document.querySelectorAll('.history-item');
    historyItems.forEach(item => {
        item.style.display = 'block';
    });
    
    // Update result count
    const resultCount = document.getElementById('search-results-count');
    if (resultCount) {
        resultCount.textContent = `${historyItems.length} results found`;
    }
}

// Helper function to extract date from text
function extractDateFromText(text) {
    const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
    return dateMatch ? new Date(dateMatch[1]) : null;
}

// News credibility scoring and filtering
function filterNewsByCredibility() {
    const minCredibility = parseFloat(document.getElementById('credibility-filter').value) || 0;
    const keywordFilter = document.getElementById('keyword-filter').value.toLowerCase();
    
    const newsItems = document.querySelectorAll('.news-item');
    let visibleCount = 0;
    
    newsItems.forEach(item => {
        const credibilityBadge = item.querySelector('.credibility-score');
        const credibility = credibilityBadge ? 
            parseFloat(credibilityBadge.textContent.match(/[\d.]+/)?.[0]) || 0 : 0;
        
        const content = item.textContent.toLowerCase();
        const credibilityMatch = credibility >= minCredibility;
        const keywordMatch = !keywordFilter || content.includes(keywordFilter);
        
        if (credibilityMatch && keywordMatch) {
            item.style.display = 'block';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    // Update news count
    const newsCount = document.getElementById('news-results-count');
    if (newsCount) {
        newsCount.textContent = `${visibleCount} news items found`;
    }
}

// Calculate credibility score (mock implementation)
function calculateCredibilityScore(source, content) {
    let score = 50; // Base score
    
    // Source reliability (mock data)
    const reliableSources = ['reuters', 'ap news', 'bbc', 'npr', 'pbs'];
    const questionableSources = ['tabloid', 'gossip', 'unverified'];
    
    const sourceLower = source.toLowerCase();
    if (reliableSources.some(s => sourceLower.includes(s))) {
        score += 30;
    } else if (questionableSources.some(s => sourceLower.includes(s))) {
        score -= 30;
    }
    
    // Content quality indicators
    if (content.length > 500) score += 10; // Detailed articles
    if (content.includes('according to')) score += 5; // Citations
    if (content.includes('breaking') || content.includes('urgent')) score -= 5; // Sensationalism
    
    return Math.max(0, Math.min(100, score));
}
