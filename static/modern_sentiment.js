// Modern News Sentiment Analysis JavaScript with Animations
// Professional, Creative UI with Advanced Animations

// Global variables
let currentTheme = 'light';
let sentimentChart = null;
let allHistoryData = [];
let filteredNewsData = [];
let isAnalyzing = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Modern Sentiment Analyzer Loaded');
    initializeApp();
    setupAnimations();
    loadHistory();
});

function initializeApp() {
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    
    // Set up form submission
    const form = document.getElementById('sentimentForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
        console.log('✅ Form event listener attached');
    }
    
    // Auto-resize textarea and live statistics
    const textarea = document.getElementById('newsArticle');
    const titleInput = document.getElementById('newsTitle');
    
    if (textarea) {
        textarea.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            updateQuickStats();
        });
    }
    
    if (titleInput) {
        titleInput.addEventListener('input', updateQuickStats);
    }
    
    // Setup floating labels
    setupFloatingLabels();
    
    // Setup tab animations
    setupTabAnimations();
}

function setupAnimations() {
    // Add entrance animations to existing elements
    const cards = document.querySelectorAll('.modern-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('animate-fade-in');
    });
    
    // Add hover effects
    addInteractiveEffects();
}

function setupFloatingLabels() {
    const inputs = document.querySelectorAll('.form-control-modern');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentNode.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            if (!this.value) {
                this.parentNode.classList.remove('focused');
            }
        });
        
        // Check if input has value on load
        if (input.value) {
            input.parentNode.classList.add('focused');
        }
    });
}

function setupTabAnimations() {
    const tabLinks = document.querySelectorAll('.nav-link');
    tabLinks.forEach(link => {
        link.addEventListener('click', function() {
            // Add ripple effect
            createRippleEffect(this);
            
            // Animate tab content
            const targetTab = document.querySelector(this.getAttribute('href'));
            if (targetTab) {
                setTimeout(() => {
                    targetTab.classList.add('animate-slide-up');
                }, 100);
            }
        });
    });
}

function addInteractiveEffects() {
    // Add button hover effects
    const buttons = document.querySelectorAll('.btn-modern');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px) scale(1.02)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Add card hover effects
    const cards = document.querySelectorAll('.modern-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px)';
            this.style.boxShadow = '0 20px 40px rgba(0,0,0,0.1), 0 0 20px rgba(99, 102, 241, 0.3)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)';
        });
    });
}

function createRippleEffect(element) {
    const ripple = document.createElement('span');
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s ease-out;
        pointer-events: none;
    `;
    
    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// Add ripple animation CSS
const rippleCSS = `
@keyframes ripple {
    to {
        transform: scale(2);
        opacity: 0;
    }
}
`;
const style = document.createElement('style');
style.textContent = rippleCSS;
document.head.appendChild(style);

function updateQuickStats() {
    const titleElement = document.getElementById('newsTitle');
    const textareaElement = document.getElementById('newsArticle');
    const statsContainer = document.getElementById('quickStats');
    
    const title = titleElement.value.trim();
    const text = textareaElement.value.trim();
    const combinedText = `${title} ${text}`.trim();
    
    if (!combinedText) {
        statsContainer.innerHTML = `
            <div class="text-center text-muted">
                <i class="fas fa-info-circle me-2"></i>
                Enter text to see live statistics
            </div>
        `;
        return;
    }
    
    const wordCount = combinedText.split(/\s+/).filter(word => word.length > 0).length;
    const sentenceCount = combinedText.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const charCount = combinedText.length;
    const readingTime = Math.ceil(wordCount / 200); // 200 words per minute
    
    // Extract keywords
    const keywords = extractKeywords(combinedText);
    
    statsContainer.innerHTML = `
        <div class="row text-center mb-3">
            <div class="col-3">
                <div class="metric-small">
                    <i class="fas fa-font text-primary"></i>
                    <div class="metric-value-small">${wordCount}</div>
                    <small>Words</small>
                </div>
            </div>
            <div class="col-3">
                <div class="metric-small">
                    <i class="fas fa-paragraph text-info"></i>
                    <div class="metric-value-small">${sentenceCount}</div>
                    <small>Sentences</small>
                </div>
            </div>
            <div class="col-3">
                <div class="metric-small">
                    <i class="fas fa-keyboard text-warning"></i>
                    <div class="metric-value-small">${charCount}</div>
                    <small>Characters</small>
                </div>
            </div>
            <div class="col-3">
                <div class="metric-small">
                    <i class="fas fa-clock text-success"></i>
                    <div class="metric-value-small">${readingTime}</div>
                    <small>Min Read</small>
                </div>
            </div>
        </div>
        ${keywords.length > 0 ? `
        <div class="text-center">
            <h6 class="mb-2"><i class="fas fa-tags text-primary"></i> Key Terms</h6>
            <div class="keywords-container">
                ${keywords.map(keyword => `<span class="badge bg-primary me-1 mb-1">${keyword}</span>`).join('')}
            </div>
        </div>
        ` : ''}
    `;
    
    // Add small metric styles
    if (!document.getElementById('quickStatsCSS')) {
        const quickStatsCSS = `
            <style id="quickStatsCSS">
                .metric-small {
                    padding: 0.5rem;
                    transition: all 0.3s ease;
                }
                .metric-small:hover {
                    transform: scale(1.05);
                }
                .metric-value-small {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: #1e293b;
                }
                [data-bs-theme="dark"] .metric-value-small {
                    color: #f1f5f9;
                }
                .keywords-container {
                    max-height: 60px;
                    overflow-y: auto;
                }
            </style>
        `;
        document.head.insertAdjacentHTML('beforeend', quickStatsCSS);
    }
}

function extractKeywords(text) {
    const stopWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
        'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
        'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does',
        'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that',
        'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you',
        'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her',
        'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves'
    ]);
    
    const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.has(word));
    
    const frequency = {};
    words.forEach(word => {
        frequency[word] = (frequency[word] || 0) + 1;
    });
    
    return Object.entries(frequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 6)
        .map(([word]) => word);
}

async function handleFormSubmit(e) {
    console.log('🚀 Form submission triggered');
    e.preventDefault();
    e.stopPropagation();
    
    if (isAnalyzing) return;
    
    const titleElement = document.getElementById('newsTitle');
    const textareaElement = document.getElementById('newsArticle');
    const title = titleElement.value.trim();
    const text = textareaElement.value.trim();
    
    console.log('📝 Form data:', { title: title.substring(0, 50) + '...', textLength: text.length });
    
    // Clear previous validation
    textareaElement.classList.remove('is-invalid');
    
    if (!text) {
        console.log('❌ Validation failed: No text provided');
        textareaElement.classList.add('is-invalid');
        showToast('Please enter some text to analyze', 'warning');
        animateShake(textareaElement);
        textareaElement.focus();
        return false;
    }
    
    if (text.length < 10) {
        console.log('❌ Validation failed: Text too short');
        textareaElement.classList.add('is-invalid');
        showToast('Please enter at least 10 characters of text', 'warning');
        animateShake(textareaElement);
        textareaElement.focus();
        return false;
    }
    
    console.log('✅ Validation passed, starting analysis...');
    
    // Start analysis animation
    startAnalysisAnimation();
    
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
            await displayResults(data);
            showToast('Analysis completed successfully!', 'success');
        }
        
    } catch (error) {
        console.error('❌ Network/Parse error:', error);
        showToast('Network error: ' + error.message, 'error');
    } finally {
        stopAnalysisAnimation();
    }
}

function startAnalysisAnimation() {
    isAnalyzing = true;
    const submitBtn = document.querySelector('button[type="submit"]');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    // Disable button with animation
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Analyzing...';
    submitBtn.style.transform = 'scale(0.95)';
    
    // Show loading overlay
    loadingOverlay.style.display = 'flex';
    loadingOverlay.style.opacity = '0';
    setTimeout(() => {
        loadingOverlay.style.opacity = '1';
    }, 10);
    
    // Animate form
    const form = document.getElementById('sentimentForm');
    form.style.transform = 'scale(0.98)';
    form.style.opacity = '0.7';
}

function stopAnalysisAnimation() {
    isAnalyzing = false;
    const submitBtn = document.querySelector('button[type="submit"]');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const form = document.getElementById('sentimentForm');
    
    // Re-enable button
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-brain me-2"></i>Analyze Sentiment';
    submitBtn.style.transform = 'scale(1)';
    
    // Hide loading overlay
    loadingOverlay.style.opacity = '0';
    setTimeout(() => {
        loadingOverlay.style.display = 'none';
    }, 300);
    
    // Reset form animation
    form.style.transform = 'scale(1)';
    form.style.opacity = '1';
}

async function displayResults(data) {
    const resultsContainer = document.getElementById('analysisResults');
    const sentiment = data.sentiment;
    const confidence = data.confidence || 0;
    const sentimentClass = sentiment === 'positive' ? 'sentiment-positive' : 'sentiment-negative';
    const sentimentIcon = sentiment === 'positive' ? 'fa-smile-beam' : 'fa-frown';
    const sentimentColor = sentiment === 'positive' ? 'success' : 'danger';
    
    // Animate results container
    resultsContainer.classList.add('show');
    
    // Build the results HTML with modern design
    const resultsHTML = `
        <div class="card-header-modern">
            <div class="card-icon">
                <i class="fas fa-chart-line"></i>
            </div>
            <h3 class="card-title-modern">Analysis Results</h3>
            <p class="card-subtitle-modern">Comprehensive AI-powered sentiment analysis</p>
        </div>
        
        <div class="card-body p-4">
            <!-- Main Sentiment Display -->
            <div class="sentiment-display ${sentimentClass} animate-bounce-in">
                <i class="fas ${sentimentIcon} sentiment-icon"></i>
                <h2 class="mb-2">${sentiment.toUpperCase()}</h2>
                <div class="confidence-meter">
                    <div class="confidence-fill" style="width: ${confidence * 100}%"></div>
                </div>
                <p class="mb-0 mt-2">Confidence: ${(confidence * 100).toFixed(1)}%</p>
            </div>
            
            <!-- Metrics Grid -->
            <div class="metrics-grid">
                ${data.language ? `
                <div class="metric-card">
                    <div class="metric-icon">
                        <i class="fas fa-globe"></i>
                    </div>
                    <div class="metric-value">${data.language}</div>
                    <div class="metric-label">Language</div>
                </div>
                ` : ''}
                
                ${data.writing_style ? `
                <div class="metric-card">
                    <div class="metric-icon">
                        <i class="fas fa-pen-fancy"></i>
                    </div>
                    <div class="metric-value">${data.writing_style}</div>
                    <div class="metric-label">Writing Style</div>
                </div>
                ` : ''}
                
                ${data.word_count ? `
                <div class="metric-card">
                    <div class="metric-icon">
                        <i class="fas fa-calculator"></i>
                    </div>
                    <div class="metric-value">${data.word_count}</div>
                    <div class="metric-label">Word Count</div>
                </div>
                ` : ''}
                
                ${data.readability_score !== undefined ? `
                <div class="metric-card">
                    <div class="metric-icon">
                        <i class="fas fa-book-open"></i>
                    </div>
                    <div class="metric-value">${data.readability_score.toFixed(1)}</div>
                    <div class="metric-label">Readability</div>
                </div>
                ` : ''}
            </div>
            
            <!-- Summary Section -->
            ${data.summary ? `
            <div class="mt-4 p-3 rounded" style="background: rgba(99, 102, 241, 0.1); border-left: 4px solid var(--primary);">
                <h6><i class="fas fa-newspaper text-primary me-2"></i>Summary</h6>
                <p class="mb-0">${data.summary}</p>
            </div>
            ` : ''}
            
            <!-- Probabilities Chart -->
            <div class="mt-4">
                <h6><i class="fas fa-chart-pie text-primary me-2"></i>Sentiment Distribution</h6>
                <div class="row">
                    <div class="col-6">
                        <div class="d-flex align-items-center">
                            <div class="badge bg-success me-2">Positive</div>
                            <div class="progress flex-grow-1" style="height: 8px;">
                                <div class="progress-bar bg-success" style="width: ${(data.probabilities?.positive || 0) * 100}%"></div>
                            </div>
                            <small class="ms-2 text-muted">${((data.probabilities?.positive || 0) * 100).toFixed(1)}%</small>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="d-flex align-items-center">
                            <div class="badge bg-danger me-2">Negative</div>
                            <div class="progress flex-grow-1" style="height: 8px;">
                                <div class="progress-bar bg-danger" style="width: ${(data.probabilities?.negative || 0) * 100}%"></div>
                            </div>
                            <small class="ms-2 text-muted">${((data.probabilities?.negative || 0) * 100).toFixed(1)}%</small>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Additional Features -->
            ${data.clickbait_score !== undefined ? `
            <div class="mt-3">
                <h6><i class="fas fa-exclamation-triangle text-warning me-2"></i>Clickbait Analysis</h6>
                <div class="progress" style="height: 8px;">
                    <div class="progress-bar bg-warning" style="width: ${data.clickbait_score * 100}%"></div>
                </div>
                <small class="text-muted">Clickbait Score: ${(data.clickbait_score * 100).toFixed(1)}%</small>
            </div>
            ` : ''}
            
            <!-- Key Details -->
            ${data.key_details && Object.values(data.key_details).some(arr => arr && arr.length > 0) ? `
            <div class="mt-4">
                <h6><i class="fas fa-key text-primary me-2"></i>Key Details Extracted</h6>
                <div class="row">
                    ${data.key_details.people && data.key_details.people.length > 0 ? `
                    <div class="col-md-6 mb-2">
                        <strong><i class="fas fa-user text-primary me-1"></i> People:</strong><br>
                        <small>${data.key_details.people.join(', ')}</small>
                    </div>` : ''}
                    ${data.key_details.organizations && data.key_details.organizations.length > 0 ? `
                    <div class="col-md-6 mb-2">
                        <strong><i class="fas fa-building text-info me-1"></i> Organizations:</strong><br>
                        <small>${data.key_details.organizations.join(', ')}</small>
                    </div>` : ''}
                    ${data.key_details.numbers && data.key_details.numbers.length > 0 ? `
                    <div class="col-md-6 mb-2">
                        <strong><i class="fas fa-chart-bar text-warning me-1"></i> Key Numbers:</strong><br>
                        <small>${data.key_details.numbers.join(', ')}</small>
                    </div>` : ''}
                    ${data.key_details.locations && data.key_details.locations.length > 0 ? `
                    <div class="col-md-6 mb-2">
                        <strong><i class="fas fa-map-marker-alt text-danger me-1"></i> Locations:</strong><br>
                        <small>${data.key_details.locations.join(', ')}</small>
                    </div>` : ''}
                </div>
            </div>
            ` : ''}
            
            <!-- Similar Articles -->
            ${data.similar_articles && data.similar_articles.length > 0 ? `
            <div class="mt-4">
                <h6><i class="fas fa-search text-primary me-2"></i>Similar Articles Found</h6>
                ${data.similar_articles.map(article => `
                    <div class="d-flex justify-content-between align-items-center p-2 mb-2 rounded" style="background: rgba(0,0,0,0.05);">
                        <div>
                            <strong style="font-size: 0.9rem;">${article.title}</strong>
                            <div class="badge bg-${article.sentiment === 'positive' ? 'success' : 'danger'} ms-2">
                                ${article.sentiment}
                            </div>
                        </div>
                        <small class="text-muted">${(article.similarity * 100).toFixed(1)}% similar</small>
                    </div>
                `).join('')}
            </div>
            ` : ''}
        </div>
    `;
    
    // Animate the update
    resultsContainer.style.opacity = '0';
    resultsContainer.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
        resultsContainer.innerHTML = resultsHTML;
        resultsContainer.style.opacity = '1';
        resultsContainer.style.transform = 'translateY(0)';
        
        // Add staggered animations to metric cards
        const metricCards = resultsContainer.querySelectorAll('.metric-card');
        metricCards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
        
        // Animate progress bars
        const progressBars = resultsContainer.querySelectorAll('.progress-bar');
        progressBars.forEach(bar => {
            const width = bar.style.width;
            bar.style.width = '0%';
            setTimeout(() => {
                bar.style.width = width;
            }, 500);
        });
        
    }, 300);
}

async function analyzeUrl() {
    const urlInput = document.getElementById('newsUrl');
    const url = urlInput.value.trim();
    
    if (!url) {
        showToast('Please enter a URL', 'warning');
        animateShake(urlInput);
        return;
    }
    
    startAnalysisAnimation();
    
    try {
        const response = await fetch('/analyze-url', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url })
        });
        
        const data = await response.json();
        
        if (response.ok && !data.error) {
            // Switch to analyze tab and display results
            const analyzeTab = document.getElementById('analyze-tab');
            analyzeTab.click();
            
            // Fill in the extracted content
            document.getElementById('newsTitle').value = data.extracted_title || '';
            document.getElementById('newsArticle').value = data.processed_text || '';
            
            // Display results
            await displayResults(data);
            showToast('URL analyzed successfully!', 'success');
        } else {
            showToast(data.error || 'Error analyzing URL', 'error');
        }
        
    } catch (error) {
        showToast('Network error: ' + error.message, 'error');
    } finally {
        stopAnalysisAnimation();
    }
}

function loadTrendingNews() {
    const container = document.getElementById('trendingNewsContainer');
    container.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div></div>';
    
    fetch('/trending-news')
        .then(response => response.json())
        .then(data => {
            if (data.articles && data.articles.length > 0) {
                displayTrendingNews(data.articles);
            } else {
                container.innerHTML = '<div class="text-center text-muted"><i class="fas fa-exclamation-circle me-2"></i>No trending news available</div>';
            }
        })
        .catch(error => {
            container.innerHTML = '<div class="text-center text-danger"><i class="fas fa-exclamation-triangle me-2"></i>Error loading news</div>';
        });
}

function displayTrendingNews(articles) {
    const container = document.getElementById('trendingNewsContainer');
    
    const articlesHTML = articles.map((article, index) => `
        <div class="modern-card mb-3 animate-slide-up" style="animation-delay: ${index * 0.1}s;">
            <div class="card-body p-3">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="card-title mb-0">${article.title}</h6>
                    <span class="badge bg-${article.sentiment === 'positive' ? 'success' : 'danger'} ms-2">
                        ${article.sentiment} ${(article.confidence * 100).toFixed(0)}%
                    </span>
                </div>
                <p class="card-text text-muted small">${article.content.substring(0, 150)}...</p>
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted">
                        <i class="fas fa-clock me-1"></i>${new Date(article.publishedAt).toLocaleDateString()}
                    </small>
                    ${article.url ? `<a href="${article.url}" target="_blank" class="btn btn-outline-primary btn-sm">Read More</a>` : ''}
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = articlesHTML;
}

function loadHistory() {
    const container = document.getElementById('historyContainer');
    container.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div></div>';
    
    fetch('/history?limit=20')
        .then(response => response.json())
        .then(data => {
            if (data.history && data.history.length > 0) {
                displayHistory(data.history);
            } else {
                container.innerHTML = '<div class="text-center text-muted"><i class="fas fa-history me-2"></i>No analysis history found</div>';
            }
        })
        .catch(error => {
            container.innerHTML = '<div class="text-center text-danger"><i class="fas fa-exclamation-triangle me-2"></i>Error loading history</div>';
        });
}

function displayHistory(history) {
    const container = document.getElementById('historyContainer');
    
    const historyHTML = history.map((item, index) => `
        <div class="modern-card mb-3 animate-slide-up" style="animation-delay: ${index * 0.05}s;">
            <div class="card-body p-3">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="card-title mb-0">${item.title || 'Untitled Analysis'}</h6>
                    <div>
                        <span class="badge bg-${item.sentiment === 'positive' ? 'success' : 'danger'} me-2">
                            ${item.sentiment} ${(item.confidence * 100).toFixed(0)}%
                        </span>
                        <small class="text-muted">${new Date(item.timestamp).toLocaleDateString()}</small>
                    </div>
                </div>
                <p class="card-text text-muted small mb-2">${item.content.substring(0, 100)}...</p>
                ${item.summary ? `<p class="card-text small"><strong>Summary:</strong> ${item.summary}</p>` : ''}
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted">
                        <i class="fas fa-font me-1"></i>${item.word_count} words
                        <i class="fas fa-globe ms-2 me-1"></i>${item.language}
                    </small>
                    <button class="btn btn-outline-primary btn-sm" onclick="reanalyzeFromHistory('${item.id}', '${item.title}', '${item.content.replace(/'/g, "\\'")}')">
                        <i class="fas fa-redo me-1"></i>Reanalyze
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = historyHTML;
}

function reanalyzeFromHistory(id, title, content) {
    // Switch to analyze tab
    const analyzeTab = document.getElementById('analyze-tab');
    analyzeTab.click();
    
    // Fill in the form
    document.getElementById('newsTitle').value = title || '';
    document.getElementById('newsArticle').value = content || '';
    
    // Update quick stats
    updateQuickStats();
    
    showToast('Content loaded from history', 'info');
    
    // Scroll to form
    document.getElementById('sentimentForm').scrollIntoView({ behavior: 'smooth' });
}

function clearHistory() {
    if (confirm('Are you sure you want to clear all analysis history?')) {
        fetch('/history/clear', { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    showToast('History cleared successfully', 'success');
                    loadHistory();
                } else {
                    showToast('Error clearing history', 'error');
                }
            })
            .catch(error => {
                showToast('Error clearing history', 'error');
            });
    }
}

function showToast(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container');
    const toastId = 'toast-' + Date.now();
    
    const toastColors = {
        success: 'success',
        error: 'danger',
        warning: 'warning',
        info: 'primary'
    };
    
    const toastIcons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const toastHTML = `
        <div id="${toastId}" class="toast toast-modern" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <i class="fas ${toastIcons[type]} text-${toastColors[type]} me-2"></i>
                <strong class="me-auto">Notification</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: 5000
    });
    
    toast.show();
    
    // Remove toast from DOM after it's hidden
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
    });
}

function animateShake(element) {
    element.style.animation = 'shake 0.5s ease-in-out';
    setTimeout(() => {
        element.style.animation = '';
    }, 500);
}

// Add shake animation CSS
const shakeCSS = `
@keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
}
`;
const shakeStyle = document.createElement('style');
shakeStyle.textContent = shakeCSS;
document.head.appendChild(shakeStyle);

function toggleTheme() {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

function setTheme(theme) {
    currentTheme = theme;
    document.body.setAttribute('data-bs-theme', theme);
    
    const themeIcon = document.getElementById('themeIcon');
    const themeText = document.getElementById('themeText');
    
    if (theme === 'dark') {
        themeIcon.className = 'fas fa-sun';
        themeText.textContent = 'Light Mode';
    } else {
        themeIcon.className = 'fas fa-moon';
        themeText.textContent = 'Dark Mode';
    }
    
    localStorage.setItem('theme', theme);
}

// Initialize theme on load
document.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
});
