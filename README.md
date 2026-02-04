# 🗞️ Advanced News Sentiment Analysis System

A comprehensive Flask-based web application that performs real-time sentiment analysis on news articles with advanced features including multilingual support, live RSS feeds, video transcription, OCR image processing, and interactive sentiment visualization.

![Python](https://img.shields.io/badge/Python-3.8%2B-blue)
![Flask](https://img.shields.io/badge/Flask-2.3.3-green)
![Machine Learning](https://img.shields.io/badge/ML-Scikit--Learn-orange)
![NLP](https://img.shields.io/badge/NLP-NLTK-yellow)
![Status](https://img.shields.io/badge/Status-Active-brightgreen)

## 🌟 Key Features

### 🔍 **Multi-Input Analysis**
- **📝 Text Input**: Direct text analysis with real-time results
- **🔗 URL Analysis**: Fetch and analyze articles from web URLs
- **🖼️ Image OCR**: Extract text from images using Tesseract OCR
- **🎥 Video Transcription**: Speech-to-text analysis using Google Cloud Speech API
- **📂 File Upload**: Analyze text files, images, and documents

### 🌐 **Multilingual Support**
- **Language Detection**: Automatic detection of 50+ languages
- **Real-time Translation**: Google Cloud Translate integration
- **Cross-language Analysis**: Analyze sentiment in any language
- **Language-specific Insights**: Writing style and readability analysis

### 📊 **Advanced Analytics**
- **Sentiment Classification**: High-accuracy ML model (86% accuracy)
- **Confidence Scoring**: Reliability metrics for predictions
- **Content Summarization**: AI-powered text summarization
- **Keyword Extraction**: Important terms and entities
- **Readability Analysis**: Flesch Reading Ease scores
- **Clickbait Detection**: Identify sensationalized content
- **Writing Style Analysis**: Formal vs informal classification

### 📈 **Real-time News Monitoring**
- **Live RSS Feeds**: CNN, BBC, Reuters, NPR, NYT integration
- **Multiple News APIs**: Mediastack and NewsAPI.org support
- **Trending Analysis**: Category-based news sentiment tracking
- **Historical Data**: SQLite database for trend analysis
- **Interactive Charts**: Stock-like sentiment visualization

### 🎨 **Rich Visualizations**
- **Word Clouds**: Visual representation of key terms
- **Sentiment Charts**: Time-series sentiment tracking
- **Distribution Graphs**: Confidence and category analysis
- **Interactive Dashboard**: Real-time data updates

## 📱 Application Screenshots

### 🏠 **Home Page - Main Interface**
![Home Page](Flask%20app%20Images/Home_Page.png)
*Clean, modern interface for text analysis with multiple input options*

### 📊 **Analysis Results Page**
![Analysis Page](Flask%20app%20Images/Analyssi_Page.png)
*Comprehensive sentiment analysis results with confidence scores, summaries, and key insights*

### 📈 **News Sentiment Trends Chart**
![Sentiment Trends](Flask%20app%20Images/News_Sentiment_Trends.png)
*Real-time sentiment tracking with interactive stock-like visualization*

### 📰 **Trending News Section**
![Trending News](Flask%20app%20Images/Trending_News_Section.png)
*Live news feeds with automatic sentiment analysis from multiple sources*

### ℹ️ **About Page - Features Overview**
![About Page](Flask%20app%20Images/About_Page.png)
*Detailed information about application capabilities and technical features*

## 🏗️ Project Structure

```
Sentiment Analysis_news - V5/
├── 📁 Dataset/                    # Training data organized by categories
│   ├── Crime, Law and Justice_*/
│   ├── Economy, Business_*/
│   ├── Health_*/
│   └── ...
├── 📁 models/                     # Trained ML models and metadata
│   ├── best_sentiment_model_logistic_regression.pkl
│   ├── tfidf_vectorizer.pkl
│   ├── label_encoder.pkl
│   ├── model_metadata.json
│   └── summarization_system.pkl
├── 📁 static/                     # Frontend JavaScript and assets
│   ├── enhanced_sentiment.js
│   ├── stock_sentiment_chart.js
│   └── videos/
├── 📁 templates/                  # HTML templates
│   ├── index.html
│   ├── dashboard.html
│   └── stock_sentiment_chart.html
├── 📁 tools/                      # Utility scripts
├── 📁 Video/                      # Video processing assets
├── 📄 app.py                      # Main Flask application
├── 📄 run_app.py                  # Application launcher
├── 📄 requirements.txt            # Python dependencies
├── 📄 news_sentiment_analysis.ipynb  # Model training notebook
├── 📄 add_sample_data.py          # Sample data generator
└── 📄 article_history.db          # SQLite database
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.8+**
- **pip package manager**
- **Tesseract OCR** (optional, for image processing)
- **Google Cloud credentials** (optional, for advanced features)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd "Sentiment Analysis_news - V5"
```

### 2. Install Dependencies

```bash
# Install Python packages
pip install -r requirements.txt

# Download NLTK data
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords')"
```

### 3. Optional: Install Tesseract OCR

**Windows:**
```bash
# Download from: https://github.com/UB-Mannheim/tesseract/wiki
# Or using chocolatey:
choco install tesseract
```

**macOS:**
```bash
brew install tesseract
```

**Linux:**
```bash
sudo apt-get install tesseract-ocr
```

### 4. Environment Setup (Optional)

Create a `.env` file for API keys:

```env
# News APIs (choose one)
NEWS_API_KEY=your_mediastack_or_newsapi_key

# Google Cloud APIs (optional)
GOOGLE_TRANSLATE_API_KEY=your_google_translate_key
GOOGLE_APPLICATION_CREDENTIALS=path/to/speech-key.json
```

### 5. Run the Application

```bash
# Method 1: Direct launch
python app.py

# Method 2: Using launcher script
python run_app.py
```

### 6. Access the Application

- **Main Application**: http://localhost:5000
- **Sentiment Chart**: http://localhost:5000/stock-chart
- **Dashboard**: http://localhost:5000/dashboard

## 📊 Machine Learning Model

### Model Performance
- **Algorithm**: Logistic Regression (Best Performer)
- **Accuracy**: 86.05%
- **Precision**: 86.39%
- **Recall**: 88.45%
- **F1-Score**: 87.40%
- **ROC-AUC**: 93.41%

### Training Data
- **Dataset Size**: 56,365 news articles
- **Categories**: 10+ news categories
- **Features**: 10,000 TF-IDF features
- **Classes**: Positive / Negative sentiment

### Model Architecture
```
Input Text → Preprocessing → TF-IDF Vectorization → Logistic Regression → Sentiment + Confidence
```

## 🔧 API Endpoints

### Core Analysis
- `POST /analyze` - Analyze text sentiment
- `POST /analyze_url` - Analyze URL content
- `POST /analyze_file` - Analyze uploaded files

### Live News
- `GET /trending/<category>` - Get trending news by category
- `POST /analyze_trending` - Analyze trending news automatically
- `GET /live_sentiment_data/<period>` - Get live sentiment chart data

### Data Management
- `GET /history` - Get analysis history
- `POST /clear_history` - Clear all history
- `POST /clear_live_data` - Clear live analysis data

### Utilities
- `GET /sentiment_distribution/<days>` - Get sentiment distribution
- `GET /dashboard` - Analytics dashboard
- `GET /stock-chart` - Real-time sentiment chart

## 🎯 Use Cases

### 📰 **News Organizations**
- Monitor public sentiment on breaking news
- Track audience reaction to articles
- Optimize content strategy based on sentiment trends

### 📊 **Market Research**
- Analyze consumer sentiment about products/services
- Track brand perception over time
- Competitive sentiment analysis

### 🏛️ **Political Campaigns**
- Monitor public opinion on policies
- Track candidate sentiment in news coverage
- Real-time reaction analysis during events

### 📚 **Academic Research**
- Study media bias and sentiment patterns
- Analyze public discourse on social issues
- Longitudinal sentiment studies

### 🏢 **Business Intelligence**
- Customer feedback analysis
- Social media monitoring
- Crisis management and PR response

## 🛠️ Advanced Configuration

### News API Setup

**Mediastack (Recommended)**:
```python
# Get free API key from: https://mediastack.com/
NEWS_API_KEY = "your_mediastack_key"
```

**NewsAPI.org Alternative**:
```python
# Get free API key from: https://newsapi.org/
NEWS_API_KEY = "your_newsapi_key"
```

### Google Cloud Services

**Translation API**:
```python
# Enable Google Cloud Translate API
GOOGLE_TRANSLATE_API_KEY = "your_google_translate_key"
```

**Speech-to-Text API**:
```python
# Download service account key and set path
GOOGLE_APPLICATION_CREDENTIALS = "path/to/speech-key.json"
```

### OCR Configuration

The system automatically detects Tesseract installation. For custom paths:

```python
# In app.py, modify:
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
```

## 📈 Performance Optimization

### Database Optimization
```sql
-- Add indexes for better query performance
CREATE INDEX idx_sentiment ON articles(sentiment);
CREATE INDEX idx_timestamp ON articles(timestamp);
CREATE INDEX idx_live_analysis ON articles(is_live_analysis);
```

### Caching Strategy
- **News API responses**: 5-minute cache
- **Translation results**: Session-based cache
- **Model predictions**: In-memory optimization

### Resource Management
- **Memory usage**: ~200MB baseline
- **CPU usage**: Optimized for single-core processing
- **Storage**: SQLite database grows ~1MB per 1000 articles

## 🧪 Testing

### Run Sample Data Generator
```bash
python add_sample_data.py
```

### Model Training Notebook
```bash
jupyter notebook news_sentiment_analysis.ipynb
```

### Test Different Input Types
1. **Text**: Paste any news article
2. **URL**: Try news websites (CNN, BBC, etc.)
3. **Images**: Upload screenshots of news articles
4. **Files**: Upload .txt files with news content

## 🔍 Troubleshooting

### Common Issues

**1. OCR Not Working**
```bash
# Install Tesseract OCR
# Windows: Download from GitHub releases
# macOS: brew install tesseract
# Linux: sudo apt-get install tesseract-ocr
```

**2. Translation Errors**
```bash
# Check Google Cloud API key
# Ensure billing is enabled for the project
```

**3. News API Limits**
```bash
# Free tiers have rate limits
# Implement fallback to RSS feeds
```

**4. Model Loading Issues**
```bash
# Check if all model files exist in models/ directory
# Re-run the training notebook if needed
```

### Performance Issues
- **Slow analysis**: Check if translation is enabled for non-English text
- **Memory usage**: Clear history periodically
- **API timeouts**: Increase timeout values in configuration

## 📊 Model Comparison Results

| Model | Accuracy | Precision | Recall | F1-Score |
|-------|----------|-----------|---------|----------|
| **Logistic Regression** | **86.05%** | **86.39%** | **88.45%** | **87.40%** |
| Random Forest | 84.23% | 84.67% | 85.91% | 85.29% |
| SVM | 83.78% | 83.45% | 84.12% | 83.78% |
| Naive Bayes | 82.91% | 81.23% | 86.45% | 83.76% |

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Areas for Contribution
- 🌐 Additional language support
- 📊 New visualization features
- 🔗 More news source integrations
- 🧠 Model improvements
- 🔧 Performance optimizations

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🎯 Quick Demo

1. **Start the application**: `python run_app.py`
2. **Visit**: http://localhost:5000
3. **Try analyzing**: "The new technology breakthrough promises to revolutionize healthcare"
4. **Expected result**: Positive sentiment with high confidence

---

*Made for better understanding of news sentiment and public opinion analysis*

