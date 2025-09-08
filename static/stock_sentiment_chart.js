// Stock-Like Sentiment Analysis Chart
class StockSentimentChart {
    constructor() {
        this.chart = null;
        this.data = [];
        this.timeframe = 7; // days
        this.autoRefresh = false;
        this.refreshInterval = null;
        this.currentSentiment = 0;
        this.previousSentiment = 0;
        this.indicators = {
            rsi: 50,
            macd: 0,
            sma: 0
        };
        
        this.init();
    }

    async init() {
        console.log('Initializing Stock Sentiment Chart...');
        this.updateLastUpdate();
        await this.loadData();
        this.initChart();
        this.updateTicker();
        
        // Set up periodic updates
        setInterval(() => {
            this.updateLastUpdate();
            if (this.autoRefresh) {
                this.loadData();
            }
        }, 30000); // Update every 30 seconds
        
        // Auto-analyze trending news every 5 minutes (only if auto-refresh is enabled)
        setInterval(() => {
            if (this.autoRefresh) {
                console.log('Auto-analyzing trending news...');
                this.analyzeTrendingAll();
            }
        }, 300000); // 5 minutes = 300000ms
    }

    updateLastUpdate() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        document.getElementById('lastUpdate').textContent = `Last update: ${timeString}`;
    }

    async loadData() {
        try {
            console.log(`Loading sentiment data for ${this.timeframe} days...`);
            
            const response = await fetch(`/sentiment-distribution?days=${this.timeframe}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.distribution && Array.isArray(result.distribution)) {
                this.data = result.distribution;
                console.log(`Loaded ${this.data.length} data points`);
                
                this.updateChart();
                this.updateStats();
                this.updateIndicators();
                this.hideLoading();
            } else {
                throw new Error('Invalid data format received');
            }
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load sentiment data: ' + error.message);
        }
    }

    showError(message) {
        const chartContainer = document.querySelector('.chart-container');
        chartContainer.innerHTML = `
            <div class="absolute inset-0 flex items-center justify-center">
                <div class="text-center">
                    <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-4"></i>
                    <p class="text-gray-400 mb-4">${message}</p>
                    <button onclick="stockChart.loadData()" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg">
                        Try Again
                    </button>
                </div>
            </div>
        `;
    }

    hideLoading() {
        const loading = document.getElementById('chartLoading');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    initChart() {
        const ctx = document.getElementById('sentimentChart').getContext('2d');
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Overall Sentiment',
                        data: [],
                        borderColor: '#3b82f6',
                        backgroundColor: this.createGradient(ctx, '#3b82f6'),
                        borderWidth: 3,
                        fill: true,
                        tension: 0.3,
                        pointBackgroundColor: '#3b82f6',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        yAxisID: 'sentiment'
                    },
                    {
                        label: 'Positive Count',
                        data: [],
                        type: 'bar',
                        backgroundColor: 'rgba(34, 197, 94, 0.7)',
                        borderColor: '#22c55e',
                        borderWidth: 1,
                        yAxisID: 'volume',
                        order: 2
                    },
                    {
                        label: 'Negative Count',
                        data: [],
                        type: 'bar',
                        backgroundColor: 'rgba(239, 68, 68, 0.7)',
                        borderColor: '#ef4444',
                        borderWidth: 1,
                        yAxisID: 'volume',
                        order: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: false // Using custom legend
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        titleColor: '#ffffff',
                        bodyColor: '#e5e7eb',
                        borderColor: '#374151',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            title: (context) => {
                                const dataIndex = context[0].dataIndex;
                                if (dataIndex < this.data.length) {
                                    const item = this.data[dataIndex];
                                    return `${item.date} • Total: ${item.total} articles`;
                                }
                                return '';
                            },
                            beforeBody: (context) => {
                                const dataIndex = context[0].dataIndex;
                                if (dataIndex < this.data.length) {
                                    const item = this.data[dataIndex];
                                    const trend = item.trend === 'up' ? '↗ Bullish' : 
                                                 item.trend === 'down' ? '↘ Bearish' : '→ Neutral';
                                    return [`Market Sentiment: ${trend}`];
                                }
                                return [];
                            },
                            afterBody: (context) => {
                                const dataIndex = context[0].dataIndex;
                                if (dataIndex < this.data.length) {
                                    const item = this.data[dataIndex];
                                    return [
                                        '',
                                        `Positive: ${item.positive} articles`,
                                        `Negative: ${item.negative} articles`,
                                        `Confidence: ${(item.positive_confidence * 100).toFixed(1)}% / ${(item.negative_confidence * 100).toFixed(1)}%`
                                    ];
                                }
                                return [];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(75, 85, 99, 0.3)',
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#9ca3af',
                            font: {
                                size: 11
                            },
                            maxTicksLimit: 10
                        }
                    },
                    sentiment: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Sentiment Score',
                            color: '#e5e7eb',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            color: 'rgba(75, 85, 99, 0.2)',
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#9ca3af',
                            callback: function(value) {
                                return value.toFixed(0);
                            }
                        },
                        min: -100,
                        max: 100
                    },
                    volume: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Article Volume',
                            color: '#e5e7eb',
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                        ticks: {
                            color: '#9ca3af',
                            stepSize: 1
                        },
                        min: 0
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutCubic',
                    onComplete: () => {
                        console.log('Chart animation completed');
                    }
                },
                onHover: (event, activeElements) => {
                    event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
                }
            }
        });
    }

    createGradient(ctx, color) {
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, color + '40'); // 25% opacity
        gradient.addColorStop(1, color + '10'); // 6% opacity
        return gradient;
    }

    updateChart() {
        if (!this.chart || !this.data.length) return;

        // Prepare labels
        const labels = this.data.map(item => {
            const date = new Date(item.date);
            if (this.timeframe <= 1) {
                // For intraday, show time
                return date.toLocaleTimeString('en-US', { 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                });
            } else {
                // For daily+, show date
                return date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                });
            }
        });

        // Prepare datasets
        const sentimentData = this.data.map(item => item.sentiment_score);
        const positiveData = this.data.map(item => item.positive);
        const negativeData = this.data.map(item => item.negative);

        // Update chart data
        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = sentimentData;
        this.chart.data.datasets[1].data = positiveData;
        this.chart.data.datasets[2].data = negativeData;

        // Color points based on sentiment
        this.chart.data.datasets[0].pointBackgroundColor = sentimentData.map(score => {
            if (score > 10) return '#22c55e'; // Green for positive
            if (score < -10) return '#ef4444'; // Red for negative
            return '#6b7280'; // Gray for neutral
        });

        this.chart.update('active');
        
        // Update current sentiment display
        if (sentimentData.length > 0) {
            this.previousSentiment = this.currentSentiment;
            this.currentSentiment = sentimentData[sentimentData.length - 1];
            this.updateSentimentDisplay();
        }
    }

    updateSentimentDisplay() {
        const currentElement = document.getElementById('currentSentiment');
        const changeElement = document.getElementById('sentimentChange');
        
        if (!currentElement || !changeElement) return;

        const change = this.currentSentiment - this.previousSentiment;
        const changePercent = this.previousSentiment !== 0 ? ((change / Math.abs(this.previousSentiment)) * 100) : 0;
        
        // Update current sentiment
        currentElement.textContent = this.currentSentiment.toFixed(2);
        currentElement.className = this.currentSentiment >= 0 ? 'text-2xl font-bold positive-sentiment' : 'text-2xl font-bold negative-sentiment';
        
        // Update change indicator
        const isPositiveChange = change >= 0;
        const arrow = isPositiveChange ? 'fa-arrow-up' : 'fa-arrow-down';
        const colorClass = isPositiveChange ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400';
        const sign = isPositiveChange ? '+' : '';
        
        changeElement.innerHTML = `
            <i class="fas ${arrow} mr-1"></i>
            ${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)
        `;
        changeElement.className = `text-sm px-2 py-1 rounded ${colorClass}`;
        
        // Add flash animation for changes
        if (Math.abs(change) > 0.1) {
            changeElement.classList.add('animate-trading-flash');
            setTimeout(() => {
                changeElement.classList.remove('animate-trading-flash');
            }, 1500);
        }
    }

    updateStats() {
        if (!this.data.length) return;

        const scores = this.data.map(item => item.sentiment_score);
        const volumes = this.data.map(item => item.total);
        
        const currentScore = scores[scores.length - 1] || 0;
        const dailyHigh = Math.max(...scores);
        const dailyLow = Math.min(...scores);
        const totalVolume = volumes.reduce((sum, vol) => sum + vol, 0);
        
        // Calculate volatility (standard deviation)
        const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
        const volatility = Math.sqrt(variance);

        // Update display elements
        this.updateElement('currentScore', currentScore.toFixed(2));
        this.updateElement('dailyHigh', dailyHigh.toFixed(2));
        this.updateElement('dailyLow', dailyLow.toFixed(2));
        this.updateElement('totalVolume', totalVolume.toLocaleString());
        this.updateElement('volatility', volatility.toFixed(2) + '%');

        // Update sentiment breakdown
        const totalPositive = this.data.reduce((sum, item) => sum + item.positive, 0);
        const totalNegative = this.data.reduce((sum, item) => sum + item.negative, 0);
        const totalNeutral = Math.max(0, totalVolume - totalPositive - totalNegative);
        
        const total = totalPositive + totalNegative + totalNeutral;
        
        if (total > 0) {
            const posPercent = (totalPositive / total * 100).toFixed(1);
            const negPercent = (totalNegative / total * 100).toFixed(1);
            const neuPercent = (totalNeutral / total * 100).toFixed(1);
            
            this.updateElement('positiveCount', totalPositive.toString());
            this.updateElement('negativeCount', totalNegative.toString());
            this.updateElement('neutralCount', totalNeutral.toString());
            this.updateElement('positivePercent', posPercent + '%');
            this.updateElement('negativePercent', negPercent + '%');
            this.updateElement('neutralPercent', neuPercent + '%');
            
            // Update visual bars
            document.getElementById('positiveBar').style.width = posPercent + '%';
            document.getElementById('negativeBar').style.width = negPercent + '%';
            document.getElementById('neutralBar').style.width = neuPercent + '%';
        }
    }

    updateIndicators() {
        if (!this.data.length) return;

        const scores = this.data.map(item => item.sentiment_score);
        
        // Calculate RSI (simplified)
        this.indicators.rsi = this.calculateRSI(scores);
        
        // Calculate MACD (simplified)
        this.indicators.macd = this.calculateMACD(scores);
        
        // Calculate SMA
        this.indicators.sma = this.calculateSMA(scores, 7);
        
        // Update indicator displays
        this.updateElement('rsiValue', this.indicators.rsi.toFixed(1));
        this.updateElement('macdValue', this.indicators.macd.toFixed(2));
        this.updateElement('smaValue', this.indicators.sma.toFixed(2));
        
        // Update signals
        this.updateRSISignal();
        this.updateMACDSignal();
        this.updateSMASignal();
        this.updateTrendDirection();
    }

    calculateRSI(values, period = 14) {
        if (values.length < period + 1) return 50;
        
        const gains = [];
        const losses = [];
        
        for (let i = 1; i < values.length; i++) {
            const change = values[i] - values[i - 1];
            gains.push(change > 0 ? change : 0);
            losses.push(change < 0 ? Math.abs(change) : 0);
        }
        
        if (gains.length < period) return 50;
        
        const avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period;
        const avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period;
        
        if (avgLoss === 0) return 100;
        
        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    calculateMACD(values) {
        if (values.length < 26) return 0;
        
        const ema12 = this.calculateEMA(values, 12);
        const ema26 = this.calculateEMA(values, 26);
        
        return ema12 - ema26;
    }

    calculateEMA(values, period) {
        if (values.length === 0) return 0;
        
        const multiplier = 2 / (period + 1);
        let ema = values[0];
        
        for (let i = 1; i < values.length; i++) {
            ema = (values[i] * multiplier) + (ema * (1 - multiplier));
        }
        
        return ema;
    }

    calculateSMA(values, period) {
        if (values.length < period) return 0;
        
        const recentValues = values.slice(-period);
        return recentValues.reduce((sum, val) => sum + val, 0) / period;
    }

    updateRSISignal() {
        const signal = document.getElementById('rsiSignal');
        if (!signal) return;
        
        if (this.indicators.rsi > 70) {
            signal.textContent = 'Overbought';
            signal.className = 'text-xs text-red-400';
        } else if (this.indicators.rsi < 30) {
            signal.textContent = 'Oversold';
            signal.className = 'text-xs text-green-400';
        } else {
            signal.textContent = 'Neutral';
            signal.className = 'text-xs text-gray-400';
        }
    }

    updateMACDSignal() {
        const signal = document.getElementById('macdSignal');
        if (!signal) return;
        
        if (this.indicators.macd > 0) {
            signal.textContent = 'Bullish';
            signal.className = 'text-xs text-green-400';
        } else if (this.indicators.macd < 0) {
            signal.textContent = 'Bearish';
            signal.className = 'text-xs text-red-400';
        } else {
            signal.textContent = 'Neutral';
            signal.className = 'text-xs text-gray-400';
        }
    }

    updateSMASignal() {
        const signal = document.getElementById('smaSignal');
        if (!signal) return;
        
        if (this.currentSentiment > this.indicators.sma) {
            signal.textContent = 'Above SMA';
            signal.className = 'text-xs text-green-400';
        } else if (this.currentSentiment < this.indicators.sma) {
            signal.textContent = 'Below SMA';
            signal.className = 'text-xs text-red-400';
        } else {
            signal.textContent = 'At SMA';
            signal.className = 'text-xs text-gray-400';
        }
    }

    updateTrendDirection() {
        const element = document.getElementById('trendDirection');
        if (!element || this.data.length < 2) return;
        
        const recent = this.data.slice(-3);
        const avgRecent = recent.reduce((sum, item) => sum + item.sentiment_score, 0) / recent.length;
        
        if (avgRecent > 10) {
            element.innerHTML = '<i class="fas fa-arrow-up mr-1"></i>Bullish';
            element.className = 'font-semibold positive-sentiment';
        } else if (avgRecent < -10) {
            element.innerHTML = '<i class="fas fa-arrow-down mr-1"></i>Bearish';
            element.className = 'font-semibold negative-sentiment';
        } else {
            element.innerHTML = '<i class="fas fa-minus mr-1"></i>Sideways';
            element.className = 'font-semibold neutral-sentiment';
        }
    }

    updateTicker() {
        const ticker = document.getElementById('newsTicker');
        if (!ticker) return;
        
        const messages = [
            '📈 Sentiment analysis powered by advanced AI models',
            '📊 Real-time tracking of news sentiment trends',
            '🔍 Monitor positive, negative, and neutral article flows',
            '📰 Live market-style indicators for news sentiment',
            '⚡ Updated every 30 seconds with latest data',
            '🎯 Technical analysis applied to sentiment data',
            '📈 RSI, MACD, and moving averages for sentiment trends'
        ];
        
        let currentIndex = 0;
        
        const updateMessage = () => {
            ticker.textContent = messages[currentIndex];
            currentIndex = (currentIndex + 1) % messages.length;
        };
        
        updateMessage();
        setInterval(updateMessage, 5000);
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    // Public methods for UI controls
    updateTimeframe(days) {
        this.timeframe = parseFloat(days);
        console.log(`Timeframe changed to ${this.timeframe} days`);
        this.loadData();
    }

    refreshData() {
        console.log('Manual refresh triggered');
        this.loadData();
    }

    toggleAutoRefresh() {
        this.autoRefresh = !this.autoRefresh;
        const btn = document.getElementById('autoRefreshBtn');
        
        if (this.autoRefresh) {
            btn.innerHTML = '<i class="fas fa-pause mr-2"></i>Auto';
            btn.className = 'px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors duration-200';
            this.refreshInterval = setInterval(() => {
                this.loadData();
            }, 60000); // Refresh every minute when auto is on
        } else {
            btn.innerHTML = '<i class="fas fa-play mr-2"></i>Auto';
            btn.className = 'px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors duration-200';
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
                this.refreshInterval = null;
            }
        }
        
        console.log(`Auto refresh ${this.autoRefresh ? 'enabled' : 'disabled'}`);
    }

    async analyzeSample() {
        console.log('Adding sample analysis...');
        
        // Sample texts for demonstration
        const samples = [
            { text: "Great news! The economy is showing strong growth and positive indicators.", sentiment: "positive" },
            { text: "Breaking: Major breakthrough in renewable energy technology announced today.", sentiment: "positive" },
            { text: "Concerning reports indicate rising unemployment and economic uncertainty.", sentiment: "negative" },
            { text: "Stock markets face volatility amid global economic concerns.", sentiment: "negative" },
            { text: "The weather forecast shows partly cloudy skies for the weekend.", sentiment: "neutral" }
        ];
        
        const sample = samples[Math.floor(Math.random() * samples.length)];
        
        try {
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: sample.text })
            });
            
            if (response.ok) {
                console.log('Sample analysis added successfully');
                // Wait a moment then refresh data
                setTimeout(() => {
                    this.loadData();
                }, 1000);
                this.showNotification('Sample analysis added!', 'success');
            } else {
                throw new Error('Failed to add sample analysis');
            }
            
        } catch (error) {
            console.error('Error adding sample:', error);
            this.showNotification('Failed to add sample analysis', 'error');
        }
    }

    async analyzeTrendingAll() {
        console.log('Analyzing trending news from all categories...');
        
        // Show loading notification
        this.showNotification('Analyzing trending news from all categories... This may take a moment.', 'info');
        
        try {
            const response = await fetch('/analyze-trending-all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.message) {
                console.log(`Successfully analyzed ${result.total_analyzed} trending articles`);
                this.showNotification(
                    `Successfully analyzed ${result.total_analyzed} trending news articles from all categories!`, 
                    'success'
                );
                
                // Wait a moment then refresh data to show new analyses
                setTimeout(() => {
                    this.loadData();
                }, 2000);
            } else {
                throw new Error(result.error || 'Failed to analyze trending news');
            }
            
        } catch (error) {
            console.error('Error analyzing trending news:', error);
            this.showNotification('Failed to analyze trending news: ' + error.message, 'error');
        }
    }

    async clearChart() {
        if (!confirm('Are you sure you want to clear all chart data? This action cannot be undone.')) {
            return;
        }
        
        try {
            const response = await fetch('/chart/clear-live-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                console.log('Chart data cleared');
                this.data = [];
                this.updateChart();
                this.showNotification('Chart data cleared successfully!', 'success');
            } else {
                throw new Error('Failed to clear chart data');
            }
            
        } catch (error) {
            console.error('Error clearing chart:', error);
            this.showNotification('Failed to clear chart data', 'error');
        }
    }

    exportData() {
        if (!this.data.length) {
            this.showNotification('No data to export', 'warning');
            return;
        }
        
        const csvContent = this.dataToCSV();
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `sentiment_data_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.showNotification('Data exported successfully!', 'success');
    }

    dataToCSV() {
        const headers = ['Date', 'Sentiment Score', 'Positive Count', 'Negative Count', 'Total Volume', 'Trend'];
        const rows = this.data.map(item => [
            item.date,
            item.sentiment_score,
            item.positive,
            item.negative,
            item.total,
            item.trend
        ]);
        
        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
        
        return csvContent;
    }

    showNotification(message, type = 'info') {
        const colors = {
            success: 'bg-green-600 border-green-500',
            error: 'bg-red-600 border-red-500',
            info: 'bg-blue-600 border-blue-500',
            warning: 'bg-yellow-600 border-yellow-500'
        };
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            info: 'fa-info-circle',
            warning: 'fa-exclamation-triangle'
        };
        
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 ${colors[type]} text-white px-6 py-4 rounded-lg shadow-2xl border-l-4 max-w-sm transform translate-x-full transition-transform duration-300`;
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${icons[type]} mr-3 text-lg"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white/80 hover:text-white">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 5000);
    }
}

// Global functions for HTML onclick handlers
function updateTimeframe(days) {
    if (window.stockChart) {
        window.stockChart.updateTimeframe(days);
    }
}

function refreshData() {
    if (window.stockChart) {
        window.stockChart.refreshData();
    }
}

function toggleAutoRefresh() {
    if (window.stockChart) {
        window.stockChart.toggleAutoRefresh();
    }
}

function analyzeSample() {
    if (window.stockChart) {
        window.stockChart.analyzeSample();
    }
}

function analyzeTrendingAll() {
    if (window.stockChart) {
        window.stockChart.analyzeTrendingAll();
    }
}

function clearChart() {
    if (window.stockChart) {
        window.stockChart.clearChart();
    }
}

function exportData() {
    if (window.stockChart) {
        window.stockChart.exportData();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Stock Sentiment Chart...');
    window.stockChart = new StockSentimentChart();
});
