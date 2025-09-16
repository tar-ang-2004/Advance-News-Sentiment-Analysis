# Enhanced News Sentiment Analysis Flask App with Advanced Features

from flask import Flask, render_template, request, jsonify
import joblib
import os
import json
import re
import time
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize, sent_tokenize
from nltk.stem import PorterStemmer
import numpy as np
from collections import Counter
import heapq
import sqlite3
from datetime import datetime, timedelta
import hashlib
import requests
import feedparser
from langdetect import detect
from langdetect.lang_detect_exception import LangDetectException
import textstat
from wordcloud import WordCloud
import base64
from io import BytesIO
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
from dotenv import load_dotenv
# --- OCR for image processing ---
try:
    import pytesseract
    from PIL import Image
    
    # Configure Tesseract path - try common Windows locations
    import shutil
    tesseract_cmd = shutil.which('tesseract')
    if tesseract_cmd:
        pytesseract.pytesseract.tesseract_cmd = tesseract_cmd
        print(f"✅ Tesseract found at: {tesseract_cmd}")
        OCR_AVAILABLE = True
    else:
        # Try common Windows installation paths
        possible_paths = [
            r'C:\Program Files\Tesseract-OCR\tesseract.exe',
            r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
            r'C:\Users\{}\AppData\Local\Tesseract-OCR\tesseract.exe'.format(os.getenv('USERNAME', '')),
            'tesseract'  # Assume it's in PATH
        ]
        
        for path in possible_paths:
            if os.path.exists(path) or path == 'tesseract':
                pytesseract.pytesseract.tesseract_cmd = path
                try:
                    # Test Tesseract
                    test_img = Image.new('RGB', (100, 50), color='white')
                    pytesseract.image_to_string(test_img)
                    print(f"✅ Tesseract configured successfully: {path}")
                    OCR_AVAILABLE = True
                    break
                except Exception as e:
                    print(f"⚠️ Tesseract test failed for {path}: {e}")
                    continue
        else:
            OCR_AVAILABLE = False
            print("⚠️ Tesseract OCR not found. Image processing will be disabled.")
    
    if OCR_AVAILABLE:
        print("✅ OCR libraries loaded successfully!")
        
except ImportError as e:
    OCR_AVAILABLE = False
    print(f"⚠️ OCR libraries not available: {e}")
except Exception as e:
    OCR_AVAILABLE = False
    print(f"⚠️ OCR configuration failed: {e}")
# --- Google Cloud Translate for multilingual support ---
import os
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = 'dummy'  # We'll use API key instead
from google.cloud import translate_v2 as translate

# --- Google Cloud Speech-to-Text for video transcription ---
from google.cloud import speech
import tempfile
import subprocess
import json
# --- Longformer Fake News Detection Integration ---
# Temporarily commented out due to import issues
# from transformers import AutoTokenizer, AutoModelForSequenceClassification
# import torch

# Load environment variables
load_dotenv()

# Download NLTK data if not already present
try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('punkt')
    nltk.download('stopwords')

app = Flask(__name__)

# Global variables for model components
model = None
vectorizer = None
label_encoder = None
summarization_system = None
stop_words = set(stopwords.words('english'))
stemmer = PorterStemmer()

# Initialize database for article history
def init_database():
    """Initialize SQLite database for storing article history"""
    conn = sqlite3.connect('article_history.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS articles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            content TEXT,
            sentiment TEXT,
            confidence REAL,
            summary TEXT,
            language TEXT,
            writing_style TEXT,
            clickbait_score REAL,
            key_details TEXT,
            word_count INTEGER,
            readability_score REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            content_hash TEXT UNIQUE,
            is_live_analysis BOOLEAN DEFAULT 0
        )
    ''')
    
    # Add the is_live_analysis column if it doesn't exist (for existing databases)
    try:
        cursor.execute('ALTER TABLE articles ADD COLUMN is_live_analysis BOOLEAN DEFAULT 0')
    except sqlite3.OperationalError:
        # Column already exists, ignore the error
        pass
    
    conn.commit()
    conn.close()

# News API configuration (Mediastack)
newsapi_key = None
try:
    newsapi_key = os.getenv('NEWS_API_KEY')
    if newsapi_key:
        print(f"✅ Mediastack API key loaded: {newsapi_key[:10]}...")
    else:
        print("⚠️  No News API key found in environment")
except Exception as e:
    print(f"⚠️  Error loading News API: {e}")

# RSS Feed URLs for news
RSS_FEEDS = [
    'https://rss.cnn.com/rss/edition.rss',
    'https://feeds.bbci.co.uk/news/rss.xml',
    'https://feeds.reuters.com/reuters/topNews',
    'https://feeds.npr.org/1001/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.rss'
]

def load_models():
    """Load the trained models and preprocessors"""
    global model, vectorizer, label_encoder, summarization_system
    
    models_dir = 'models'
    
    try:
        # Load sentiment analysis model metadata
        with open(os.path.join(models_dir, 'model_metadata.json'), 'r') as f:
            metadata = json.load(f)
        
        # Load the best sentiment model
        model_file = metadata['model_files']['model']
        model_path = os.path.join(models_dir, model_file)
        model = joblib.load(model_path)
        
        # Load vectorizer
        vectorizer_path = os.path.join(models_dir, 'tfidf_vectorizer.pkl')
        vectorizer = joblib.load(vectorizer_path)
        
        # Load label encoder
        label_encoder_path = os.path.join(models_dir, 'label_encoder.pkl')
        label_encoder = joblib.load(label_encoder_path)
        
        print("✅ Sentiment analysis models loaded successfully!")
        print(f"Best model: {metadata['best_model']}")
        print(f"Model performance: {metadata['model_performance']}")
        
        # Load enhanced summarization system
        try:
            summarization_system_path = os.path.join(models_dir, 'summarization_system.pkl')
            summarization_system = joblib.load(summarization_system_path)
            print("✅ Enhanced summarization system loaded successfully!")
            
            # Load summarization metadata
            with open(os.path.join(models_dir, 'summarization_metadata.json'), 'r') as f:
                sum_metadata = json.load(f)
            print(f"Summarization model accuracy: {sum_metadata.get('model_accuracy', 'N/A'):.4f}")
            
        except Exception as sum_e:
            print(f"⚠️  Enhanced summarization system not found, using fallback: {sum_e}")
            summarization_system = None
        
        return metadata
        
    except Exception as e:
        print(f"❌ Error loading models: {e}")
        return None

def detect_language(text):
    """Detect language of the text"""
    try:
        language = detect(text)
        # Map some common language codes to readable names
        lang_map = {
            'en': 'English',
            'es': 'Spanish', 
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'zh': 'Chinese',
            'ja': 'Japanese',
            'ar': 'Arabic',
            'hi': 'Hindi'
        }
        return lang_map.get(language, language.upper())
    except LangDetectException:
        return 'Unknown'

def detect_writing_style(text):
    """Detect if writing style is formal or informal"""
    formal_indicators = [
        r'\b(therefore|furthermore|moreover|consequently|nevertheless|however)\b',
        r'\b(in conclusion|in summary|to summarize)\b', 
        r'\b(according to|pursuant to|with respect to)\b',
        r'\b(demonstrate|indicate|conclude|establish)\b',
        r'\b(significant|substantial|considerable|comprehensive)\b'
    ]
    
    informal_indicators = [
        r'\b(gonna|wanna|gotta|kinda|sorta)\b',
        r'\b(awesome|cool|amazing|crazy|super)\b',
        r'\b(yeah|yep|nope|ok|okay)\b',
        r'[!]{2,}|[?]{2,}',  # Multiple exclamation/question marks
        r'\b(lol|omg|wtf|btw|fyi)\b'
    ]
    
    text_lower = text.lower()
    
    formal_count = sum(len(re.findall(pattern, text_lower)) for pattern in formal_indicators)
    informal_count = sum(len(re.findall(pattern, text_lower)) for pattern in informal_indicators)
    
    # Also check sentence length and complexity
    sentences = sent_tokenize(text)
    avg_sentence_length = np.mean([len(word_tokenize(sent)) for sent in sentences]) if sentences else 0
    
    # Longer sentences tend to be more formal
    if avg_sentence_length > 20:
        formal_count += 2
    elif avg_sentence_length < 10:
        informal_count += 1
    
    if formal_count > informal_count:
        return 'Formal'
    elif informal_count > formal_count:
        return 'Informal'
    else:
        return 'Neutral'

def detect_clickbait(title, content):
    """Detect if content might be clickbait"""
    if not title:
        return 0.0
    
    clickbait_patterns = [
        r'\b(you won\'t believe|shocking|amazing|incredible)\b',
        r'\b(this will|you need to|you have to|you must)\b',
        r'\b(\d+\s+(things|ways|reasons|secrets))\b',
        r'\b(what happens next|wait until you see)\b',
        r'\?{2,}|!{2,}',  # Multiple question/exclamation marks
        r'\b(before and after|then and now)\b',
        r'\b(doctors hate|experts don\'t want)\b'
    ]
    
    title_lower = title.lower()
    clickbait_score = 0
    
    for pattern in clickbait_patterns:
        if re.search(pattern, title_lower):
            clickbait_score += 1
    
    # Check for excessive capitalization
    if sum(1 for c in title if c.isupper()) / len(title) > 0.3:
        clickbait_score += 1
    
    # Normalize score to 0-1 range
    max_possible_score = len(clickbait_patterns) + 1
    return min(clickbait_score / max_possible_score, 1.0)

def calculate_readability(text):
    """Calculate readability score using Flesch Reading Ease"""
    try:
        # Ensure we have meaningful text
        if not text or len(text.strip()) < 50:
            print(f"DEBUG: Text too short for readability analysis: {len(text.strip())} chars")
            return 50.0  # Default moderate score for very short text
        
        # Clean text for better analysis
        clean_content = re.sub(r'<[^>]+>', '', text)  # Remove HTML tags
        clean_content = re.sub(r'http\S+', '', clean_content)  # Remove URLs
        clean_content = re.sub(r'\s+', ' ', clean_content).strip()  # Clean whitespace
        
        if len(clean_content) < 50:
            print(f"DEBUG: Cleaned text too short: {len(clean_content)} chars")
            return 50.0
            
        print(f"DEBUG: Calculating readability for text: {len(clean_content)} chars")
        score = textstat.flesch_reading_ease(clean_content)
        print(f"DEBUG: Readability score calculated: {score}")
        
        # Ensure score is within reasonable bounds
        if score < 0:
            return 0.0
        elif score > 100:
            return 100.0
        else:
            return float(score)
            
    except Exception as e:
        print(f"DEBUG: Readability calculation error: {e}")
        return 50.0  # Default moderate score on error

def detect_news_genre(title, text):
    """Detect the genre/category of news based on content"""
    combined_text = f"{title} {text}".lower()
    
    # Define genre keywords and patterns
    genre_patterns = {
        'Politics': [
            r'\b(government|parliament|congress|senate|election|vote|politician|minister|president|prime minister|policy|law|legislation|democracy|republican|democrat|party)\b',
            r'\b(campaign|ballot|candidate|political|governance|administration|federal|state|municipal|cabinet)\b'
        ],
        'Business & Finance': [
            r'\b(economy|market|stock|trading|investment|profit|loss|revenue|company|corporation|business|financial|money|dollar|euro|currency)\b',
            r'\b(bank|banking|finance|economic|gdp|inflation|recession|merger|acquisition|startup|entrepreneur|ceo|shares|nasdaq|dow)\b'
        ],
        'Technology': [
            r'\b(technology|tech|digital|computer|software|hardware|internet|ai|artificial intelligence|machine learning|data|cyber|online)\b',
            r'\b(innovation|smartphone|app|application|platform|coding|programming|robot|automation|blockchain|cryptocurrency|bitcoin)\b'
        ],
        'Health & Medicine': [
            r'\b(health|medical|medicine|doctor|hospital|patient|treatment|disease|virus|vaccine|pharmaceutical|drug|therapy|clinical)\b',
            r'\b(diagnosis|surgery|healthcare|wellness|mental health|pandemic|epidemic|symptoms|cure|research|study|trial)\b'
        ],
        'Sports': [
            r'\b(sports|football|basketball|baseball|soccer|tennis|golf|olympics|championship|tournament|team|player|coach|game|match)\b',
            r'\b(athlete|competition|league|season|score|win|victory|defeat|training|fitness|stadium|arena)\b'
        ],
        'Entertainment': [
            r'\b(entertainment|movie|film|actor|actress|director|music|musician|singer|concert|album|tv|television|show|series)\b',
            r'\b(celebrity|hollywood|cinema|theatre|performance|art|culture|fashion|festival|award|oscar|grammy)\b'
        ],
        'Science & Environment': [
            r'\b(science|research|study|environment|climate|global warming|pollution|energy|renewable|solar|wind|nuclear|space|nasa)\b',
            r'\b(scientist|discovery|experiment|laboratory|wildlife|conservation|sustainability|carbon|emission|temperature|weather)\b'
        ],
        'Crime & Law': [
            r'\b(crime|criminal|police|law enforcement|court|judge|lawyer|attorney|trial|verdict|guilty|innocent|arrest|investigation)\b',
            r'\b(justice|legal|lawsuit|prosecution|defendant|evidence|witness|jury|prison|jail|sentence|fine)\b'
        ],
        'Education': [
            r'\b(education|school|university|college|student|teacher|professor|academic|learning|curriculum|degree|graduation)\b',
            r'\b(classroom|scholarship|tuition|enrollment|campus|research|faculty|administration|exam|test|grade)\b'
        ],
        'International': [
            r'\b(international|global|world|foreign|embassy|diplomat|treaty|alliance|war|conflict|peace|trade|export|import)\b',
            r'\b(united nations|nato|european union|asia|africa|america|europe|country|nation|border|refugee|immigration)\b'
        ]
    }
    
    # Calculate scores for each genre
    genre_scores = {}
    for genre, patterns in genre_patterns.items():
        score = 0
        for pattern in patterns:
            matches = len(re.findall(pattern, combined_text))
            score += matches
        genre_scores[genre] = score
    
    # Find the genre with highest score
    if max(genre_scores.values()) > 0:
        top_genre = max(genre_scores.items(), key=lambda x: x[1])
        return top_genre[0]
    else:
        return 'General News'

def extract_important_keywords(text, max_keywords=8):
    """Extract the most important keywords from text in a simple format"""
    try:
        print(f"DEBUG: Extracting keywords from text: {len(text)} chars")
        if not text or len(text.strip()) < 20:
            print("DEBUG: Text too short for keyword extraction")
            return []
        
        # Clean and preprocess text
        clean_content = clean_text(text)
        if not clean_content:
            print("DEBUG: No clean content after preprocessing")
            return []
        
        # Tokenize and filter
        tokens = word_tokenize(clean_content.lower())
        
        # Remove stopwords and short words
        filtered_tokens = [
            token for token in tokens 
            if (len(token) > 3 and 
                token not in stop_words and 
                token.isalpha() and 
                not token.isdigit())
        ]
        
        print(f"DEBUG: Filtered tokens: {len(filtered_tokens)}")
        
        if not filtered_tokens:
            print("DEBUG: No filtered tokens found")
            return []
        
        # Count word frequencies
        word_freq = Counter(filtered_tokens)
        
        # Get top frequent words
        common_words = word_freq.most_common(max_keywords * 2)
        print(f"DEBUG: Common words: {common_words[:5]}")
        
        # Simple keyword extraction - just get the most frequent meaningful words
        keywords = []
        
        for word, freq in common_words:
            if len(keywords) >= max_keywords:
                break
                
            # Skip if frequency is too low (less than 2 occurrences)
            if freq < 2:
                continue
            
            # Add word with its frequency
            keywords.append({
                'word': word.capitalize(),
                'frequency': freq
            })
        
        # If we don't have enough high-frequency words, add some single-occurrence words
        if len(keywords) < 5:
            for word, freq in common_words[:max_keywords]:
                if len(keywords) >= max_keywords:
                    break
                if not any(kw['word'].lower() == word for kw in keywords):
                    keywords.append({
                        'word': word.capitalize(),
                        'frequency': freq
                    })
        
        print(f"DEBUG: Extracted {len(keywords)} keywords: {[k['word'] for k in keywords]}")
        return keywords[:max_keywords]
        
    except Exception as e:
        print(f"DEBUG: Keyword extraction error: {e}")
        return []

def generate_word_cloud(text):
    """Generate word cloud as base64 image with enhanced error handling"""
    try:
        print(f"🎨 Starting word cloud generation for text length: {len(text)}")
        
        # Clean and prepare text
        cleaned_text = clean_text(text)
        print(f"🧹 Cleaned text length: {len(cleaned_text)}")
        
        if len(cleaned_text) < 10:
            print(f"⚠️ Text too short for word cloud: {len(cleaned_text)} chars")
            return None
        
        # Check if we have meaningful words
        words = cleaned_text.split()
        if len(words) < 5:
            print(f"⚠️ Not enough words for word cloud: {len(words)} words")
            return None
        
        print(f"📊 Generating word cloud with {len(words)} words...")
        
        # Generate word cloud with error handling
        try:
            wordcloud = WordCloud(
                width=400, 
                height=200, 
                background_color='white',
                colormap='viridis',
                max_words=50,
                relative_scaling=0.5,
                min_font_size=10
            ).generate(cleaned_text)
            
            print(f"✅ Word cloud object created successfully")
        except Exception as wc_error:
            print(f"❌ WordCloud generation failed: {wc_error}")
            return None
        
        # Convert to base64
        try:
            img_buffer = BytesIO()
            plt.figure(figsize=(8, 4), facecolor='white')
            plt.imshow(wordcloud, interpolation='bilinear')
            plt.axis('off')
            plt.tight_layout(pad=0)
            plt.savefig(img_buffer, format='png', bbox_inches='tight', 
                       dpi=100, facecolor='white', edgecolor='none')
            plt.close()
            
            img_buffer.seek(0)
            img_data = img_buffer.read()
            
            if len(img_data) == 0:
                print(f"❌ Empty image buffer")
                return None
                
            img_str = base64.b64encode(img_data).decode()
            print(f"✅ Word cloud converted to base64: {len(img_str)} chars")
            return img_str
            
        except Exception as img_error:
            print(f"❌ Image conversion failed: {img_error}")
            return None
        
    except Exception as e:
        print(f"❌ Word cloud generation error: {e}")
        import traceback
        print(f"Full traceback: {traceback.format_exc()}")
        return None

def save_article_to_history(title, content, result, is_live_analysis=False):
    """Save analyzed article to history database"""
    try:
        # Create content hash to avoid duplicates
        content_hash = hashlib.md5((title + content).encode()).hexdigest()
        
        conn = sqlite3.connect('article_history.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR REPLACE INTO articles 
            (title, content, sentiment, confidence, summary, language, writing_style, 
             clickbait_score, key_details, word_count, readability_score, content_hash, is_live_analysis)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            title,
            content[:1000],  # Limit content length
            result['sentiment'],
            result['confidence'],
            result.get('summary', ''),
            result.get('language', ''),
            result.get('writing_style', ''),
            result.get('clickbait_score', 0.0),
            json.dumps(result.get('key_details', {})),
            result.get('word_count', 0),
            result.get('readability_score', 0.0),
            content_hash,
            is_live_analysis
        ))
        
        conn.commit()
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error saving to history: {e}")
        return False

def get_article_history(limit=50):
    """Get recent article analysis history"""
    try:
        conn = sqlite3.connect('article_history.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT id, title, content, sentiment, confidence, summary, timestamp, language, 
                   writing_style, clickbait_score, word_count 
            FROM articles 
            ORDER BY timestamp DESC 
            LIMIT ?
        ''', (limit,))
        
        rows = cursor.fetchall()
        conn.close()
        
        history = []
        for row in rows:
            history.append({
                'id': row[0],
                'title': row[1][:100] + '...' if len(row[1]) > 100 else row[1],
                'content': row[2][:500] + '...' if len(row[2]) > 500 else row[2],  # Add content field
                'sentiment': row[3],
                'confidence': row[4],
                'summary': row[5],  # Add summary field
                'timestamp': row[6],
                'language': row[7],
                'writing_style': row[8],
                'clickbait_score': row[9],
                'word_count': row[10]
            })
        
        return history
        
    except Exception as e:
        print(f"Error retrieving history: {e}")
        return []

def get_sentiment_distribution(days=7):
    """Get sentiment distribution data for the last N days/hours for stock-like chart - LIVE ANALYSES ONLY"""
    try:
        conn = sqlite3.connect('article_history.db')
        cursor = conn.cursor()
        
        # Determine grouping strategy and time calculation based on time period
        if days < 1:  # Less than 1 day (hours/minutes)
            hours = max(0.25, days * 24)  # Convert to hours, minimum 15 minutes
            
            # For very short periods (less than 6 hours), group by minutes
            if days <= 0.25:  # 6 hours or less - group by 10-minute intervals
                minutes = int(hours * 60)
                group_format = "strftime('%Y-%m-%d %H:%M', datetime((julianday(timestamp) - julianday(timestamp) % (10.0/1440)) * 1440, 'unixepoch'), 'localtime')"
                time_label = "10min"
                time_filter = f"datetime('now', 'localtime', '-{minutes} minutes')"
            else:  # 6-24 hours - group by hour
                group_format = "strftime('%Y-%m-%d %H:00', timestamp, 'localtime')"
                time_label = "hour"
                time_filter = f"datetime('now', 'localtime', '-{int(hours)} hours')"
        else:
            # Group by day for longer periods
            group_format = "date(timestamp, 'localtime')"
            time_label = "day"
            time_filter = f"datetime('now', 'localtime', '-{int(days)} days')"
        
        # Get data for the specified time period - ONLY from live analyses
        # Use localtime for consistent timezone handling
        if days <= 1:  # For periods <= 1 day (hours/minutes)
            if days <= 0.0417:  # Only for 15min, 30min, 60min - use custom intervals
                minutes = int(days * 24 * 60)
                
                # Determine interval based on period
                if days == 0.0104:  # 15 minutes - 1 minute intervals
                    interval_minutes = 1
                    group_format = "strftime('%Y-%m-%d %H:%M', timestamp, 'localtime')"
                elif days == 0.0208:  # 30 minutes - 5 minute intervals  
                    interval_minutes = 5
                    # Group by 5-minute intervals: round down minutes to nearest 5
                    group_format = "strftime('%Y-%m-%d %H:', timestamp, 'localtime') || printf('%02d', (CAST(strftime('%M', timestamp, 'localtime') AS INTEGER) / 5) * 5)"
                elif days == 0.0417:  # 60 minutes - 10 minute intervals
                    interval_minutes = 10
                    # Group by 10-minute intervals: round down minutes to nearest 10
                    group_format = "strftime('%Y-%m-%d %H:', timestamp, 'localtime') || printf('%02d', (CAST(strftime('%M', timestamp, 'localtime') AS INTEGER) / 10) * 10)"
                else:
                    # Fallback for other short periods
                    interval_minutes = 1
                    group_format = "strftime('%Y-%m-%d %H:%M', timestamp, 'localtime')"
                
                cursor.execute(f'''
                    SELECT 
                        {group_format} as time_period,
                        sentiment,
                        confidence,
                        COUNT(*) as count,
                        AVG(confidence) as avg_confidence
                    FROM articles 
                    WHERE datetime(timestamp, 'localtime') >= datetime('now', 'localtime', '-{minutes} minutes')
                        AND is_live_analysis = 1
                    GROUP BY {group_format}, sentiment
                    ORDER BY time_period ASC
                ''')
            else:  # 6 hours, 24 hours, etc. - group by hour
                hours = int(days * 24)
                cursor.execute(f'''
                    SELECT 
                        strftime('%Y-%m-%d %H:00', timestamp, 'localtime') as time_period,
                        sentiment,
                        confidence,
                        COUNT(*) as count,
                        AVG(confidence) as avg_confidence
                    FROM articles 
                    WHERE datetime(timestamp, 'localtime') >= datetime('now', 'localtime', '-{hours} hours')
                        AND is_live_analysis = 1
                    GROUP BY strftime('%Y-%m-%d %H:00', timestamp, 'localtime'), sentiment
                    ORDER BY time_period ASC
                ''')
        else:
            # For daily data, use localtime conversion (only for > 1 day)
            cursor.execute(f'''
                SELECT 
                    date(timestamp, 'localtime') as time_period,
                    sentiment,
                    confidence,
                    COUNT(*) as count,
                    AVG(confidence) as avg_confidence
                FROM articles 
                WHERE date(timestamp, 'localtime') >= date('now', 'localtime', '-{int(days)} days')
                    AND is_live_analysis = 1
                GROUP BY date(timestamp, 'localtime'), sentiment
                ORDER BY time_period ASC
            ''')
        
        rows = cursor.fetchall()
        conn.close()
        
        # Process data into chart format
        distribution_data = {}
        
        for row in rows:
            time_period = row[0]
            sentiment = row[1]
            confidence = row[2]
            count = row[3]
            avg_confidence = row[4]
            
            if time_period not in distribution_data:
                distribution_data[time_period] = {
                    'date': time_period,
                    'positive': 0,
                    'negative': 0,
                    'positive_confidence': 0,
                    'negative_confidence': 0,
                    'total': 0,
                    'sentiment_score': 0,  # Overall sentiment score for the period
                    'trend': 'neutral'  # up, down, neutral
                }
            
            if sentiment.lower() == 'positive':
                distribution_data[time_period]['positive'] = count
                distribution_data[time_period]['positive_confidence'] = avg_confidence
            elif sentiment.lower() == 'negative':
                distribution_data[time_period]['negative'] = count
                distribution_data[time_period]['negative_confidence'] = avg_confidence
            
            distribution_data[time_period]['total'] += count
        
        # Calculate sentiment scores and trends
        previous_score = None
        sentiment_timeline = []
        
        for time_period in sorted(distribution_data.keys()):
            data = distribution_data[time_period]
            
            # Calculate sentiment score (-100 to +100)
            if data['total'] > 0:
                positive_weighted = data['positive'] * data['positive_confidence'] if data['positive'] > 0 else 0
                negative_weighted = data['negative'] * data['negative_confidence'] if data['negative'] > 0 else 0
                total_weighted = positive_weighted + negative_weighted
                
                if total_weighted > 0:
                    sentiment_score = ((positive_weighted - negative_weighted) / total_weighted) * 100
                else:
                    sentiment_score = 0
                
                data['sentiment_score'] = round(sentiment_score, 2)
                
                # Determine trend
                if previous_score is not None:
                    if sentiment_score > previous_score + 5:
                        data['trend'] = 'up'
                    elif sentiment_score < previous_score - 5:
                        data['trend'] = 'down'
                    else:
                        data['trend'] = 'neutral'
                else:
                    data['trend'] = 'neutral'
                
                previous_score = sentiment_score
            
            sentiment_timeline.append(data)
        
        # Fill in missing time periods with neutral data
        from datetime import datetime, timedelta
        
        if days <= 1:  # Hours and minutes
            if days <= 0.0417:  # Only for 15min, 30min, 60min - use custom intervals
                minutes = int(days * 24 * 60)
                
                # Determine interval and data points based on period
                if days == 0.0104:  # 15 minutes - 1 minute intervals (15 points)
                    interval_minutes = 1
                    data_points = 15
                elif days == 0.0208:  # 30 minutes - 5 minute intervals (6 points)
                    interval_minutes = 5
                    data_points = 6
                elif days == 0.0417:  # 60 minutes - 10 minute intervals (6 points)
                    interval_minutes = 10
                    data_points = 6
                else:
                    # Fallback for other short periods
                    interval_minutes = 1
                    data_points = minutes
                
                # Calculate start time aligned to intervals
                now = datetime.now()
                if interval_minutes == 1:
                    # For 1-minute intervals, go back exact minutes
                    start_time = now - timedelta(minutes=minutes)
                else:
                    # For 5-minute and 10-minute intervals, align to rounded intervals
                    current_minute = now.minute
                    rounded_minute = (current_minute // interval_minutes) * interval_minutes
                    aligned_now = now.replace(minute=rounded_minute, second=0, microsecond=0)
                    start_time = aligned_now - timedelta(minutes=data_points * interval_minutes)
                
                complete_timeline = []
                
                # Generate timeline with custom intervals
                for i in range(data_points + 1):  # Include current time point
                    check_time = (start_time + timedelta(minutes=i * interval_minutes)).strftime('%Y-%m-%d %H:%M')
                    found_data = next((item for item in sentiment_timeline if item['date'] == check_time), None)
                    
                    if found_data:
                        complete_timeline.append(found_data)
                    else:
                        complete_timeline.append({
                            'date': check_time,
                            'positive': 0,
                            'negative': 0,
                            'positive_confidence': 0,
                            'negative_confidence': 0,
                            'total': 0,
                            'sentiment_score': 0,
                            'trend': 'neutral'
                        })
            else:  # 6 hours and above - use hourly coverage
                hours = max(1, int(days * 24))  # Ensure at least 1 hour
                start_time = datetime.now() - timedelta(hours=hours-1)
                complete_timeline = []
                
                for i in range(hours):
                    check_time = (start_time + timedelta(hours=i)).strftime('%Y-%m-%d %H:00')
                    found_data = next((item for item in sentiment_timeline if item['date'] == check_time), None)
                    
                    if found_data:
                        complete_timeline.append(found_data)
                    else:
                        complete_timeline.append({
                            'date': check_time,
                            'positive': 0,
                            'negative': 0,
                            'positive_confidence': 0,
                            'negative_confidence': 0,
                            'total': 0,
                            'sentiment_score': 0,
                            'trend': 'neutral'
                        })
        else:
            # Handle daily data (existing logic) - only for > 1 day
            start_date = datetime.now() - timedelta(days=int(days)-1)
            complete_timeline = []
            
            for i in range(int(days)):
                check_date = (start_date + timedelta(days=i)).strftime('%Y-%m-%d')
                found_data = next((item for item in sentiment_timeline if item['date'] == check_date), None)
                
                if found_data:
                    complete_timeline.append(found_data)
                else:
                    complete_timeline.append({
                        'date': check_date,
                        'positive': 0,
                        'negative': 0,
                        'positive_confidence': 0,
                        'negative_confidence': 0,
                        'total': 0,
                        'sentiment_score': 0,
                        'trend': 'neutral'
                    })
        
        return complete_timeline
        
    except Exception as e:
        print(f"Error retrieving sentiment distribution: {e}")
        return []

def clear_article_history():
    """Clear all article history"""
    try:
        conn = sqlite3.connect('article_history.db')
        cursor = conn.cursor()
        cursor.execute('DELETE FROM articles')
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error clearing history: {e}")
        return False

def clear_live_analysis_data():
    """Clear only live analysis data (for chart reset)"""
    try:
        conn = sqlite3.connect('article_history.db')
        cursor = conn.cursor()
        cursor.execute('DELETE FROM articles WHERE is_live_analysis = 1')
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Error clearing live analysis data: {e}")
        return False

def analyze_trending_news_all_categories():
    """Analyze trending news from all categories and save to database"""
    categories = ['general', 'business', 'technology', 'health', 'science', 'sports', 'entertainment']
    total_analyzed = 0
    
    print("🔄 Starting automated trending news analysis for all categories...")
    
    for category in categories:
        try:
            print(f"📰 Analyzing {category} news...")
            articles = fetch_trending_news(category, 'us')
            
            for article in articles[:3]:  # Limit to 3 articles per category to avoid overwhelming
                if article.get('title') and article.get('content'):
                    try:
                        # Perform sentiment analysis
                        result = predict_sentiment(article['title'], article['content'], include_wordcloud=False)
                        
                        if 'error' not in result:
                            # Save to database as live analysis (so it appears on chart)
                            save_article_to_history(
                                f"[{category.upper()}] {article['title']}", 
                                article['content'], 
                                result, 
                                is_live_analysis=True
                            )
                            total_analyzed += 1
                            print(f"✅ Analyzed: {article['title'][:50]}... | Sentiment: {result['sentiment']}")
                        else:
                            print(f"⚠️  Analysis error: {result['error']}")
                    except Exception as e:
                        print(f"❌ Error analyzing article: {e}")
                        continue
            
            # Small delay between categories to avoid overwhelming the system
            time.sleep(0.5)
            
        except Exception as e:
            print(f"❌ Error processing {category} news: {e}")
            continue
    
    print(f"✅ Completed automated analysis! Total articles analyzed: {total_analyzed}")
    return total_analyzed

def fetch_rss_news(max_articles=10):
    """Fetch latest news from RSS feeds with better error handling"""
    articles = []
    
    # Enhanced RSS feeds with more sources
    enhanced_rss_feeds = [
        'https://rss.cnn.com/rss/edition.rss',
        'https://feeds.bbci.co.uk/news/rss.xml',
        'https://feeds.reuters.com/reuters/topNews',
        'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.rss',
        'https://feeds.npr.org/1001/rss.xml',
        'https://www.theguardian.com/world/rss',
        'https://feeds.washingtonpost.com/rss/world',
        'https://abcnews.go.com/abcnews/topstories'
    ]
    
    successful_feeds = 0
    target_feeds = min(4, len(enhanced_rss_feeds))  # Try up to 4 feeds
    
    for feed_url in enhanced_rss_feeds:
        if successful_feeds >= target_feeds:
            break
            
        try:
            print(f"🔄 Fetching RSS from: {feed_url}")
            feed = feedparser.parse(feed_url)
            
            if hasattr(feed, 'entries') and len(feed.entries) > 0:
                feed_articles = 0
                articles_per_feed = max_articles // target_feeds
                
                for entry in feed.entries[:articles_per_feed + 2]:  # Get a few extra
                    try:
                        if feed_articles >= articles_per_feed:
                            break
                            
                        # Clean and validate entry data
                        title = entry.get('title', '').strip()
                        content = entry.get('summary', entry.get('description', '')).strip()
                        
                        if title and len(title) > 10:  # Ensure meaningful title
                            articles.append({
                                'title': title,
                                'content': content[:500] if content else title,  # Limit content length
                                'url': entry.get('link', ''),
                                'published': entry.get('published', ''),
                                'source': feed.feed.get('title', 'RSS Feed')
                            })
                            feed_articles += 1
                    except Exception as entry_error:
                        print(f"⚠️ Error processing entry: {entry_error}")
                        continue
                
                if feed_articles > 0:
                    successful_feeds += 1
                    print(f"✅ RSS: Got {feed_articles} articles from {feed.feed.get('title', 'Unknown')}")
                
        except Exception as e:
            print(f"⚠️ RSS feed error for {feed_url}: {e}")
            continue
    
    # Add some sample articles if no RSS feeds work
    if not articles:
        print("📝 Using sample articles as fallback")
        articles = [
            {
                'title': 'Technology Advances Continue to Shape Modern Life',
                'content': 'Recent developments in technology are transforming how we work, communicate, and live our daily lives.',
                'url': '#',
                'published': '2025-01-01',
                'source': 'Sample News'
            },
            {
                'title': 'Global Markets Show Positive Growth Trends',
                'content': 'Financial markets around the world are displaying encouraging signs of stability and growth.',
                'url': '#',
                'published': '2025-01-01',
                'source': 'Sample Business'
            },
            {
                'title': 'Healthcare Innovation Brings New Treatment Options',
                'content': 'Medical researchers announce breakthrough treatments that could improve patient outcomes significantly.',
                'url': '#',
                'published': '2025-01-01',
                'source': 'Sample Health'
            }
        ]
    
    print(f"📊 Total RSS articles collected: {len(articles)}")
    return articles[:max_articles]

# Cache for API responses
news_cache = {}
cache_duration = 300  # 5 minutes

def deduplicate_articles(articles):
    """Remove duplicate articles based on title similarity"""
    if not articles:
        return articles
    
    import difflib
    
    unique_articles = []
    seen_titles = []
    
    for article in articles:
        title = article.get('title', '').strip().lower()
        
        # Skip empty titles
        if not title:
            continue
            
        # Check similarity with existing titles
        is_duplicate = False
        for seen_title in seen_titles:
            # Calculate similarity ratio
            similarity = difflib.SequenceMatcher(None, title, seen_title).ratio()
            
            # If titles are 80% similar or more, consider it a duplicate
            if similarity >= 0.8:
                is_duplicate = True
                print(f"🔄 Skipping duplicate article: '{title[:50]}...' (similar to existing)")
                break
        
        if not is_duplicate:
            unique_articles.append(article)
            seen_titles.append(title)
            
    print(f"🔍 Deduplication: {len(articles)} -> {len(unique_articles)} articles")
    return unique_articles

def fetch_trending_news(category='general', country='us'):
    """Fetch trending news using multiple APIs with fallback to RSS feeds"""
    print(f"🔍 fetch_trending_news called with category={category}, country={country}")
    
    # Create cache key
    cache_key = f"{category}_{country}"
    current_time = time.time()
    
    # Check cache first
    if cache_key in news_cache:
        cached_data, cached_time = news_cache[cache_key]
        if current_time - cached_time < cache_duration:
            print(f"📋 Using cached data for {cache_key}")
            return cached_data
    
    # Try Mediastack API first if configured
    if newsapi_key and len(newsapi_key) > 20:  # Mediastack keys are longer
        articles = fetch_from_mediastack(category, country)
        if articles:
            articles = deduplicate_articles(articles)
            news_cache[cache_key] = (articles, current_time)
            return articles
    
    # Try NewsAPI.org if configured
    if newsapi_key and len(newsapi_key) <= 32:  # NewsAPI.org keys are shorter
        articles = fetch_from_newsapi(category, country)
        if articles:
            articles = deduplicate_articles(articles)
            news_cache[cache_key] = (articles, current_time)
            return articles
    
    # Fallback to RSS feeds
    print("🔄 Falling back to RSS feeds...")
    articles = fetch_rss_news(10)
    
    # Filter by category if possible
    if category != 'general' and articles:
        filtered_articles = []
        category_keywords = {
            'business': ['business', 'finance', 'economy', 'market', 'stock'],
            'technology': ['tech', 'technology', 'software', 'ai', 'digital'],
            'health': ['health', 'medical', 'healthcare', 'doctor', 'medicine'],
            'sports': ['sport', 'football', 'basketball', 'game', 'team'],
            'entertainment': ['entertainment', 'movie', 'music', 'celebrity', 'show']
        }
        
        keywords = category_keywords.get(category, [])
        for article in articles:
            article_text = f"{article.get('title', '')} {article.get('content', '')}".lower()
            if any(keyword in article_text for keyword in keywords):
                filtered_articles.append(article)
        
        articles = filtered_articles[:10] if filtered_articles else articles[:5]
    
    # Apply deduplication to RSS articles as well
    articles = deduplicate_articles(articles)
    
    # Cache the results
    news_cache[cache_key] = (articles, current_time)
    return articles

def fetch_from_mediastack(category, country):
    """Fetch from Mediastack API"""
    try:
        # Map categories to Mediastack format
        category_map = {
            'general': 'general',
            'business': 'business',
            'entertainment': 'entertainment',
            'health': 'health',
            'science': 'science',
            'sports': 'sports',
            'technology': 'technology'
        }
        
        # Map countries to Mediastack format
        country_map = {
            'us': 'us',
            'gb': 'gb', 
            'ca': 'ca',
            'au': 'au',
            'in': 'in',
            'global': None
        }
        
        # Build API URL for Mediastack
        base_url = 'http://api.mediastack.com/v1/news'
        params = {
            'access_key': newsapi_key,
            'limit': 10,
            'sort': 'published_desc'
        }
        
        # Add filters
        if category != 'general' and category in category_map:
            params['categories'] = category_map[category]
            
        if country != 'global' and country in country_map:
            params['countries'] = country_map[country]
        
        print(f"📡 Making Mediastack request with params: {params}")
        response = requests.get(base_url, params=params, timeout=5)
        
        if response.status_code != 200:
            print(f"❌ Mediastack API Error: {response.status_code}")
            return []
            
        data = response.json()
        articles = []
        
        for article in data.get('data', []):
            # Mediastack API uses different field names - check multiple possible content fields
            title = article.get('title', '')
            content = (article.get('description') or 
                      article.get('summary') or 
                      article.get('text') or 
                      article.get('content') or 
                      title)  # Fallback to title if no content
            
            if title and content and len(content.strip()) > 10:
                articles.append({
                    'title': title,
                    'content': content,
                    'url': article.get('url', ''),
                    'published': article.get('published_at', ''),
                    'source': article.get('source', 'Mediastack'),
                    'image_url': article.get('image')
                })
        
        print(f"✅ Mediastack: {len(articles)} articles")
        return articles
        
    except Exception as e:
        print(f"❌ Mediastack error: {e}")
        return []

def fetch_from_newsapi(category, country):
    """Fetch from NewsAPI.org"""
    try:
        # Map categories
        category_map = {
            'general': 'general',
            'business': 'business',
            'entertainment': 'entertainment',
            'health': 'health',
            'science': 'science',
            'sports': 'sports',
            'technology': 'technology'
        }
        
        base_url = 'https://newsapi.org/v2/top-headlines'
        params = {
            'apiKey': newsapi_key,
            'pageSize': 10,
            'country': country if country != 'global' else 'us'
        }
        
        if category != 'general' and category in category_map:
            params['category'] = category_map[category]
        
        print(f"📡 Making NewsAPI request with params: {params}")
        response = requests.get(base_url, params=params, timeout=5)
        
        if response.status_code != 200:
            print(f"❌ NewsAPI Error: {response.status_code}")
            return []
            
        data = response.json()
        articles = []
        
        for article in data.get('articles', []):
            title = article.get('title', '')
            content = (article.get('description') or 
                      article.get('summary') or 
                      article.get('content') or 
                      title)  # Fallback to title if no description
            
            if title and content and len(content.strip()) > 10:
                articles.append({
                    'title': title,
                    'content': content,
                    'url': article.get('url', ''),
                    'published': article.get('publishedAt', ''),
                    'source': article.get('source', {}).get('name', 'NewsAPI'),
                    'image_url': article.get('urlToImage')
                })
        
        print(f"✅ NewsAPI: {len(articles)} articles")
        return articles
        
    except Exception as e:
        print(f"❌ NewsAPI error: {e}")
        return []

def find_similar_articles(content, history_limit=100):
    """Find similar articles from history using basic text similarity"""
    try:
        conn = sqlite3.connect('article_history.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT title, content, sentiment, confidence 
            FROM articles 
            ORDER BY timestamp DESC 
            LIMIT ?
        ''', (history_limit,))
        
        rows = cursor.fetchall()
        conn.close()
        
        if not rows:
            return []
        
        # Simple keyword-based similarity
        current_keywords = set(clean_text(content).split())
        similar_articles = []
        
        for row in rows:
            stored_content = row[1]
            stored_keywords = set(clean_text(stored_content).split())
            
            # Calculate Jaccard similarity
            intersection = current_keywords.intersection(stored_keywords)
            union = current_keywords.union(stored_keywords)
            
            if len(union) > 0:
                similarity = len(intersection) / len(union)
                if similarity > 0.2:  # Threshold for similarity
                    similar_articles.append({
                        'title': row[0],
                        'sentiment': row[2],
                        'confidence': row[3],
                        'similarity': similarity
                    })
        
        # Sort by similarity and return top 5
        similar_articles.sort(key=lambda x: x['similarity'], reverse=True)
        return similar_articles[:5]
        
    except Exception as e:
        print(f"Error finding similar articles: {e}")
        return []

def clean_text(text):
    """Comprehensive text cleaning function"""
    if not text or text == '':
        return ''
    
    # Convert to lowercase
    text = text.lower()
    
    # Remove URLs
    text = re.sub(r'http\S+|www\S+|https\S+', '', text, flags=re.MULTILINE)
    
    # Remove email addresses
    text = re.sub(r'\S+@\S+', '', text)
    
    # Remove HTML tags
    text = re.sub(r'<.*?>', '', text)
    
    # Remove special characters and digits, keep only letters and spaces
    text = re.sub(r'[^a-zA-Z\s]', '', text)
    
    # Remove extra whitespaces
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

def preprocess_text(text, remove_stopwords=True, apply_stemming=False):
    """Advanced text preprocessing with tokenization, stopword removal, and stemming"""
    if not text or text == '':
        return ''
    
    # Clean the text
    text = clean_text(text)
    
    # Tokenize
    tokens = word_tokenize(text)
    
    # Remove stopwords if specified
    if remove_stopwords:
        tokens = [token for token in tokens if token not in stop_words]
    
    # Apply stemming if specified
    if apply_stemming:
        tokens = [stemmer.stem(token) for token in tokens]
    
    # Filter out very short tokens
    tokens = [token for token in tokens if len(token) > 2]
    
    return ' '.join(tokens)

def generate_enhanced_summary(text, max_sentences=2):
    """
    Generate summary using prioritized rule-based system for better news summarization
    """
    global summarization_system
    
    try:
        # Always use enhanced rule-based summarization for better control
        # The ML model may not be trained specifically for news priority detection
        summary = summarize_text_fallback(text, max_sentences=max_sentences)
        key_details = extract_key_details(text)
        return summary, key_details
        
        # Commented out ML system for now - using rule-based for better news prioritization
        # if summarization_system is not None:
        #     # Use the trained ML-based summarization system
        #     analysis = summarization_system.analyze_article(text, max_sentences=max_sentences)
        #     return analysis['summary'], analysis['key_details']
        # else:
        #     # Fallback to rule-based summarization
        #     summary = summarize_text_fallback(text, max_sentences=max_sentences)
        #     key_details = extract_key_details(text)
        #     return summary, key_details
            
    except Exception as e:
        print(f"Enhanced summarization error: {e}")
        # Fallback to rule-based methods
        summary = summarize_text_fallback(text, max_sentences=max_sentences)
        key_details = extract_key_details(text)
        return summary, key_details

def generate_video_summary(transcription, max_sentences=3):
    """
    Generate an enhanced summary specifically optimized for video transcriptions
    """
    try:
        if len(transcription.strip()) < 50:
            return transcription.strip(), []
        
        # First, extract key topics and themes
        key_topics = extract_video_topics(transcription)
        
        # Video-specific enhancements
        enhanced_summary, key_details = generate_enhanced_summary(transcription, max_sentences=max_sentences)
        
        # Add video-specific context clues
        video_indicators = [
            'in this video', 'today we', 'I will show', 'let me explain', 'as you can see',
            'hello everyone', 'welcome to', 'today I', 'in today\'s', 'subscribe',
            'like and subscribe', 'don\'t forget to', 'hit the bell', 'notification',
            'comment below', 'let me know', 'what do you think', 'thanks for watching',
            'check the description', 'link in description', 'please like', 'share this video'
        ]
        
        # Clean up video-specific phrases that don't add value to summary
        lines = enhanced_summary.split('. ')
        cleaned_lines = []
        
        for line in lines:
            line_lower = line.lower()
            # Skip lines that are primarily video engagement prompts
            if not any(indicator in line_lower for indicator in video_indicators):
                cleaned_lines.append(line)
            elif len(line) > 50:  # Keep longer lines even if they have video indicators
                cleaned_lines.append(line)
        
        # If we filtered out too much, use original
        if len(cleaned_lines) < max_sentences and len(lines) > len(cleaned_lines):
            cleaned_summary = '. '.join(lines[:max_sentences])
        else:
            cleaned_summary = '. '.join(cleaned_lines[:max_sentences])
        
        # Enhance summary with topic information
        if key_topics:
            # If the summary doesn't capture main topics, enhance it
            topic_str = ', '.join(key_topics[:3])
            if not any(topic.lower() in cleaned_summary.lower() for topic in key_topics[:2]):
                cleaned_summary = f"Video discusses {topic_str}. {cleaned_summary}"
        
        # Ensure proper sentence ending
        if cleaned_summary and not cleaned_summary.endswith('.'):
            cleaned_summary += '.'
        
        # Combine video topics with existing key details
        combined_details = list(key_topics[:2]) + list(key_details[:3]) if isinstance(key_details, (list, tuple)) else list(key_topics[:2])
        
        return cleaned_summary, combined_details
        
    except Exception as e:
        print(f"❌ Video summarization failed: {e}")
        # Fallback to basic enhanced summary
        return generate_enhanced_summary(transcription, max_sentences=max_sentences)

def extract_video_topics(transcription):
    """
    Extract main topics and themes from video transcription
    """
    try:
        # Try to use scikit-learn if available
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            use_tfidf = True
        except ImportError:
            use_tfidf = False
            print("💡 Install scikit-learn for enhanced topic extraction: pip install scikit-learn")
        
        import re
        
        # Clean and prepare text
        text = transcription.lower()
        
        # Common video topics and categories
        topic_patterns = {
            'technology': ['tech', 'software', 'app', 'computer', 'digital', 'AI', 'artificial intelligence', 'machine learning'],
            'business': ['business', 'company', 'startup', 'entrepreneur', 'market', 'sales', 'revenue', 'profit'],
            'education': ['learn', 'study', 'education', 'course', 'tutorial', 'guide', 'how to', 'tips'],
            'health': ['health', 'medical', 'doctor', 'treatment', 'fitness', 'exercise', 'wellness'],
            'news': ['news', 'breaking', 'report', 'announcement', 'update', 'latest', 'current events'],
            'entertainment': ['movie', 'music', 'game', 'entertainment', 'celebrity', 'show', 'performance'],
            'science': ['science', 'research', 'study', 'discovery', 'experiment', 'theory', 'analysis'],
            'politics': ['politics', 'government', 'election', 'policy', 'minister', 'president', 'law'],
            'sports': ['sports', 'game', 'match', 'player', 'team', 'championship', 'tournament'],
            'finance': ['money', 'investment', 'stock', 'finance', 'economy', 'banking', 'crypto']
        }
        
        # Extract topics based on keyword presence
        detected_topics = []
        for topic, keywords in topic_patterns.items():
            keyword_count = sum(1 for keyword in keywords if keyword in text)
            if keyword_count > 0:
                detected_topics.append((topic.title(), keyword_count))
        
        # Sort by relevance (keyword count)
        detected_topics.sort(key=lambda x: x[1], reverse=True)
        top_topics = [topic for topic, count in detected_topics[:3]]
        
        # Extract important entities and proper nouns
        words = re.findall(r'\b[A-Z][a-z]+\b', transcription)  # Capitalized words
        entity_candidates = [word for word in words if len(word) > 3 and word not in ['This', 'That', 'The', 'They', 'Then', 'There']]
        
        # Get most frequent entities
        from collections import Counter
        entity_counts = Counter(entity_candidates)
        top_entities = [entity for entity, count in entity_counts.most_common(3) if count >= 2]
        
        # Combine topics and entities
        all_topics = top_topics + top_entities
        
        return all_topics[:5]  # Return top 5 topics
        
    except Exception as e:
        print(f"⚠️ Topic extraction failed: {e}")
        return []

def extract_text_from_image(image_file):
    """
    Extract text from image using OCR (Optical Character Recognition)
    """
    try:
        if not OCR_AVAILABLE:
            return None, "OCR is not available. Please ensure Tesseract is installed and in your system PATH."
        
        print(f"🔍 Processing image with OCR...")
        
        # Open the image
        image = Image.open(image_file)
        print(f"📊 Image info: {image.format}, {image.size}, {image.mode}")
        
        # Convert to RGB if necessary for better OCR accuracy
        if image.mode != 'RGB':
            image = image.convert('RGB')
            print(f"🔄 Converted image to RGB mode")
        
        # Enhance image for better OCR if needed
        # You can add image preprocessing here if needed
        
        # Perform OCR with multiple language support
        print(f"🌐 Attempting OCR with multiple languages...")
        try:
            # Try with multiple languages for better accuracy
            extracted_text = pytesseract.image_to_string(
                image, 
                lang='eng+spa+fra+deu+ita+por+rus+ara+hin+chi_sim+jpn+kor',
                config='--oem 3 --psm 6'  # Use LSTM OCR Engine and assume uniform block of text
            )
            print(f"✅ Multi-language OCR successful")
        except Exception as multi_lang_error:
            print(f"⚠️ Multi-language OCR failed: {multi_lang_error}")
            print(f"🔄 Trying English-only OCR...")
            try:
                # Fallback to English only with different PSM mode
                extracted_text = pytesseract.image_to_string(
                    image, 
                    lang='eng',
                    config='--oem 3 --psm 3'  # Fully automatic page segmentation
                )
                print(f"✅ English-only OCR successful")
            except Exception as eng_error:
                print(f"⚠️ English OCR failed: {eng_error}")
                # Last resort - basic OCR
                extracted_text = pytesseract.image_to_string(image)
                print(f"✅ Basic OCR completed")
        
        print(f"📝 Raw extracted text length: {len(extracted_text)} characters")
        
        # Clean and validate the extracted text
        if extracted_text:
            # Remove excessive whitespace and clean text
            cleaned_text = re.sub(r'\s+', ' ', extracted_text.strip())
            
            # Remove common OCR artifacts
            cleaned_text = re.sub(r'[|\\]', '', cleaned_text)  # Remove common OCR noise
            cleaned_text = re.sub(r'\n+', ' ', cleaned_text)    # Replace multiple newlines with space
            
            print(f"🧹 Cleaned text length: {len(cleaned_text)} characters")
            
            # Check if we got meaningful text (more than just noise)
            if len(cleaned_text) > 5 and any(c.isalpha() for c in cleaned_text):
                # Check text quality - should have some real words
                words = cleaned_text.split()
                meaningful_words = [w for w in words if len(w) > 2 and w.isalpha()]
                
                if len(meaningful_words) >= 2:  # At least 2 meaningful words
                    print(f"✅ Successfully extracted {len(meaningful_words)} meaningful words")
                    return cleaned_text, None
                else:
                    return None, "Extracted text appears to contain mostly noise. Please ensure the image has clear, readable text."
            else:
                return None, "No readable text found in the image. Please ensure the image contains clear, readable text."
        else:
            return None, "No text could be extracted from the image."
            
    except Exception as e:
        error_msg = f"Error processing image: {str(e)}"
        print(f"❌ OCR Error: {error_msg}")
        return None, error_msg

def is_image_file(filename):
    """
    Check if a file is an image based on its extension
    """
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'}
    return any(filename.lower().endswith(ext) for ext in image_extensions)

def summarize_text_fallback(text, max_sentences=3):
    """
    Generate an enhanced extractive summary with important details highlighted
    """
    try:
        # Split into sentences
        from nltk.tokenize import sent_tokenize
        sentences = sent_tokenize(text)
        
        if len(sentences) <= max_sentences:
            return text.strip()
        
        # Enhanced important keywords that indicate key news information
        importance_keywords = {
            'critical_news': ['died', 'death', 'killed', 'murdered', 'suicide', 'dead', 'passed away',
                             'announced', 'declares', 'declared', 'launches', 'launched', 'releases', 'released',
                             'resigns', 'resigned', 'appointed', 'elected', 'fired', 'dismissed',
                             'arrested', 'charged', 'sentenced', 'convicted', 'acquitted',
                             'breaks', 'broke', 'breaking', 'emergency', 'urgent', 'alert',
                             'first', 'historic', 'record', 'milestone', 'breakthrough'],
            'major_events': ['earthquake', 'flood', 'fire', 'disaster', 'accident', 'crash', 'explosion',
                            'attack', 'bomb', 'shooting', 'terror', 'violence', 'war', 'conflict',
                            'pandemic', 'outbreak', 'crisis', 'scandal', 'controversy'],
            'authority_figures': ['president', 'prime minister', 'minister', 'ceo', 'chairman', 'director',
                                 'chief', 'head', 'leader', 'commissioner', 'judge', 'justice',
                                 'governor', 'mayor', 'secretary', 'spokesperson'],
            'key_actions': ['confirms', 'confirmed', 'denies', 'denied', 'reveals', 'revealed',
                           'discovers', 'discovered', 'reports', 'reported', 'claims', 'claimed',
                           'alleges', 'alleged', 'states', 'stated', 'warns', 'warned'],
            'institutions': ['government', 'court', 'police', 'military', 'hospital', 'university',
                            'parliament', 'congress', 'senate', 'ministry', 'department'],
            'numbers_time': ['million', 'billion', 'thousand', 'percent', 'year', 'years', 'month', 'months']
        }
        
        # Score sentences based on importance keywords
        sentence_scores = {}
        
        for i, sentence in enumerate(sentences):
            score = 0
            sentence_lower = sentence.lower()
            
            # Base score for all sentences
            words = len(sentence.split())
            score += words * 0.1  # Longer sentences get slightly higher base score
            
            # Add scores for different keyword categories
            for category, keywords in importance_keywords.items():
                for keyword in keywords:
                    if keyword in sentence_lower:
                        if category == 'critical_news':
                            score += 3.0
                        elif category == 'major_events':
                            score += 2.5
                        elif category == 'authority_figures':
                            score += 2.0
                        elif category == 'key_actions':
                            score += 1.5
                        elif category == 'institutions':
                            score += 1.0
                        elif category == 'numbers_time':
                            score += 0.5
            
            # Boost first and last sentences slightly
            if i == 0:
                score += 1.0
            elif i == len(sentences) - 1:
                score += 0.5
            
            sentence_scores[i] = score
        
        # Select top sentences
        top_sentences = sorted(sentence_scores.items(), key=lambda x: x[1], reverse=True)
        selected_indices = sorted([idx for idx, score in top_sentences[:max_sentences]])
        
        # Build summary
        summary_sentences = [sentences[i] for i in selected_indices]
        summary = ' '.join(summary_sentences)
        
        return summary.strip()
        
    except Exception as e:
        print(f"Summarization error: {e}")
        # Simple fallback - return first few sentences
        try:
            sentences = sent_tokenize(text)
            return ' '.join(sentences[:max_sentences])
        except:
            return text[:500] + "..."

def extract_key_details(text):
    """Extract key details from text for enhanced analysis"""
    try:
        details = {
            'people': [],
            'organizations': [],
            'locations': [],
            'dates': [],
            'numbers': []
        }
        
        # Simple extraction using patterns
        import re
        
        # Extract potential names (capitalized words)
        people_pattern = r'\b[A-Z][a-z]+ [A-Z][a-z]+\b'
        people = re.findall(people_pattern, text)
        details['people'] = list(set(people))[:5]
        
        # Extract organizations (words with Corp, Inc, Ltd, etc.)
        org_pattern = r'\b[A-Z][a-zA-Z\s]*(Corp|Inc|Ltd|Company|Organization|Agency|Department)\b'
        orgs = re.findall(org_pattern, text)
        details['organizations'] = list(set(orgs))[:5]
        
        # Extract numbers
        number_pattern = r'\b\d+(?:,\d{3})*(?:\.\d+)?\b'
        numbers = re.findall(number_pattern, text)
        details['numbers'] = list(set(numbers))[:5]
        
        return details
        
    except Exception as e:
        print(f"Key details extraction error: {e}")
        return {
            'people': [],
            'organizations': [],
            'locations': [],
            'dates': [],
            'numbers': []
        }

# Google Cloud Translate configuration
GOOGLE_TRANSLATE_API_KEY = os.getenv('GOOGLE_TRANSLATE_API_KEY')

def initialize_translator():
    """Initialize Google Cloud Translate client using direct HTTP API"""
    try:
        if not GOOGLE_TRANSLATE_API_KEY:
            print("⚠️  Google Translate API key not found in environment variables")
            return None
            
        # Create a simple HTTP-based client for Google Translate API
        class GoogleTranslateClient:
            def __init__(self, api_key):
                self.api_key = api_key
                self.base_url = 'https://translation.googleapis.com/language/translate/v2'
            
            def translate(self, text, target_language='en', source_language=None):
                import requests
                params = {
                    'key': self.api_key,
                    'q': text,
                    'target': target_language,
                    'format': 'text'
                }
                if source_language:
                    params['source'] = source_language
                
                try:
                    response = requests.post(self.base_url, params=params, timeout=10)
                    response.raise_for_status()
                    data = response.json()
                    
                    if 'data' in data and 'translations' in data['data']:
                        translation = data['data']['translations'][0]
                        return {
                            'translatedText': translation['translatedText'],
                            'detectedSourceLanguage': translation.get('detectedSourceLanguage', source_language)
                        }
                    else:
                        raise Exception(f"Translation failed: {data}")
                except Exception as e:
                    print(f"Translation API error: {e}")
                    return None
        
        translate_client = GoogleTranslateClient(GOOGLE_TRANSLATE_API_KEY)
        print("✅ Google Cloud Translate initialized successfully!")
        return translate_client
    except Exception as e:
        print(f"❌ Error initializing Google Cloud Translate: {e}")
        return None

def initialize_speech_client():
    """Initialize Google Cloud Speech-to-Text client using service account"""
    try:
        # Path to the service account key file
        key_path = os.path.join(os.path.dirname(__file__), 'Transcribe Key', 'enduring-tea-471009-i0-0f335912af59.json')
        
        if not os.path.exists(key_path):
            print("⚠️  Speech-to-Text service account key not found")
            return None
        
        # Set the environment variable for authentication
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = key_path
        
        # Create the speech client
        speech_client = speech.SpeechClient()
        print("✅ Google Cloud Speech-to-Text initialized successfully!")
        return speech_client
        
    except Exception as e:
        print(f"❌ Error initializing Google Cloud Speech-to-Text: {e}")
        return None

def detect_language_advanced(text):
    """Enhanced language detection with more details"""
    try:
        language_code = detect(text)
        
        # Extended language mapping
        lang_map = {
            'en': 'English',
            'es': 'Spanish', 
            'fr': 'French',
            'de': 'German',
            'it': 'Italian',
            'pt': 'Portuguese',
            'ru': 'Russian',
            'zh': 'Chinese',
            'ja': 'Japanese',
            'ar': 'Arabic',
            'hi': 'Hindi',
            'ko': 'Korean',
            'th': 'Thai',
            'vi': 'Vietnamese',
            'tr': 'Turkish',
            'pl': 'Polish',
            'nl': 'Dutch',
            'sv': 'Swedish',
            'da': 'Danish',
            'no': 'Norwegian',
            'fi': 'Finnish',
            'cs': 'Czech',
            'hu': 'Hungarian',
            'ro': 'Romanian',
            'bg': 'Bulgarian',
            'hr': 'Croatian',
            'sk': 'Slovak',
            'sl': 'Slovenian',
            'et': 'Estonian',
            'lv': 'Latvian',
            'lt': 'Lithuanian',
            'el': 'Greek',
            'he': 'Hebrew',
            'fa': 'Persian',
            'ur': 'Urdu',
            'bn': 'Bengali',
            'ta': 'Tamil',
            'te': 'Telugu',
            'ml': 'Malayalam',
            'kn': 'Kannada',
            'gu': 'Gujarati',
            'pa': 'Punjabi',
            'mr': 'Marathi',
            'ne': 'Nepali',
            'si': 'Sinhala',
            'my': 'Myanmar',
            'km': 'Khmer',
            'lo': 'Lao',
            'ka': 'Georgian',
            'am': 'Amharic',
            'sw': 'Swahili',
            'zu': 'Zulu',
            'af': 'Afrikaans',
            'sq': 'Albanian',
            'eu': 'Basque',
            'be': 'Belarusian',
            'bs': 'Bosnian',
            'ca': 'Catalan',
            'cy': 'Welsh',
            'eo': 'Esperanto',
            'fo': 'Faroese',
            'fy': 'Frisian',
            'ga': 'Irish',
            'gd': 'Scottish Gaelic',
            'gl': 'Galician',
            'is': 'Icelandic',
            'jw': 'Javanese',
            'lb': 'Luxembourgish',
            'mk': 'Macedonian',
            'mg': 'Malagasy',
            'ms': 'Malay',
            'mt': 'Maltese',
            'mn': 'Mongolian',
            'sr': 'Serbian',
            'tl': 'Filipino',
            'uk': 'Ukrainian',
            'uz': 'Uzbek',
            'yi': 'Yiddish'
        }
        
        return {
            'code': language_code,
            'name': lang_map.get(language_code, language_code.upper()),
            'is_english': language_code == 'en'
        }
    except LangDetectException:
        return {
            'code': 'unknown',
            'name': 'Unknown',
            'is_english': False
        }

def translate_text(text, target_language='en', source_language=None):
    """Translate text using Google Cloud Translate with enhanced error handling"""
    global translate_client
    
    if not translate_client:
        translate_client = initialize_translator()
        if not translate_client:
            print("❌ Translation client not available")
            return None
    
    try:
        # Detect source language if not provided
        if not source_language:
            detected = detect_language_advanced(text)
            source_language = detected['code']
        
        print(f"🔄 Translation request: {source_language} → {target_language}")
        print(f"📝 Text preview: {text[:100]}...")
        
        # Skip translation if already in target language
        if source_language == target_language:
            print(f"✅ Text already in target language ({target_language})")
            return {
                'translated_text': text,
                'source_language': source_language,
                'target_language': target_language,
                'confidence': 1.0
            }
        
        # Clean text before translation (remove mixed characters that might cause issues)
        cleaned_text = ''.join(char for char in text if ord(char) < 127 or ord(char) > 160)
        if len(cleaned_text) < len(text) * 0.5:  # If too much was removed, use original
            cleaned_text = text
        
        # Perform translation
        result = translate_client.translate(
            cleaned_text,
            target_language=target_language,
            source_language=source_language
        )
        
        translated = result['translatedText']
        print(f"✅ Translation successful: {translated[:100]}...")
        
        return {
            'translated_text': translated,
            'source_language': result.get('detectedSourceLanguage', source_language),
            'target_language': target_language,
            'confidence': 0.9  # Google Translate doesn't provide confidence scores
        }
        
    except Exception as e:
        print(f"❌ Translation error: {e}")
        print(f"📝 Failed text: {text[:100]}...")
        
        # Return None to indicate translation failure
        return None

def predict_sentiment(title, content, include_wordcloud=True):
    """
    Enhanced predict sentiment function with multilingual support
    """
    global model, vectorizer, label_encoder, translate_client
    
    try:
        # Step 1: Detect original language
        combined_text = f"{title} {content}"
        original_language = detect_language_advanced(combined_text)
        print(f"🌐 Detected language: {original_language['name']} ({original_language['code']})")
        
        # Step 2: Translate to English if not already English
        translated_title = title
        translated_content = content
        translation_info = None
        
        if not original_language['is_english'] and original_language['code'] != 'unknown':
            print(f"🔄 Translating from {original_language['name']} to English...")
            
            # Translate title
            title_translation = translate_text(title, 'en', original_language['code'])
            if title_translation:
                translated_title = title_translation['translated_text']
            
            # Translate content
            content_translation = translate_text(content, 'en', original_language['code'])
            if content_translation:
                translated_content = content_translation['translated_text']
                translation_info = content_translation
        
        # Step 3: Perform sentiment analysis on English text
        combined_english_text = f"{translated_title} {translated_content}"
        
        # Preprocess the text for analysis
        processed_text = preprocess_text(combined_english_text)
        
        if not processed_text:
            return {'error': 'Unable to process text after translation'}
        
        # Vectorize the text
        text_vector = vectorizer.transform([processed_text])
        
        # Make prediction
        prediction = model.predict(text_vector)[0]
        prediction_proba = model.predict_proba(text_vector)[0]
        
        # Get sentiment label and confidence
        sentiment = label_encoder.inverse_transform([prediction])[0]
        confidence = max(prediction_proba)
        
        # Step 4: Extract additional features (removed summary generation)
        writing_style = detect_writing_style(translated_content)
        clickbait_score = detect_clickbait(translated_title, translated_content)
        readability_score = calculate_readability(translated_content)
        word_count = len(combined_text.split())
        keywords = extract_important_keywords(translated_content)
        news_genre = detect_news_genre(translated_title, translated_content)
        
        # Generate word cloud if requested
        wordcloud_img = None
        if include_wordcloud:
            print(f"🎨 Generating word cloud for {len(translated_content)} characters...")
            wordcloud_img = generate_word_cloud(translated_content)
            if wordcloud_img:
                print(f"✅ Word cloud generated successfully")
            else:
                print(f"❌ Word cloud generation failed")
        
        # Find similar articles
        similar_articles = find_similar_articles(translated_content)
        
        # Prepare result
        result = {
            'sentiment': sentiment,
            'confidence': confidence,
            'language': original_language['name'],
            'language_code': original_language['code'],
            'writing_style': writing_style,
            'clickbait_score': clickbait_score,
            'readability_score': readability_score,
            'word_count': word_count,
            'keywords': keywords,
            'news_genre': news_genre,
            'similar_articles': similar_articles,
            'translation_info': {
                'was_translated': not original_language['is_english'],
                'original_language': original_language,
                'translation_details': translation_info
            }
        }
        
        if wordcloud_img:
            result['wordcloud'] = wordcloud_img
        
        print(f"✅ Analysis completed - Sentiment: {sentiment} ({confidence:.2%})")
        return result
        
    except Exception as e:
        print(f"Error in sentiment prediction: {e}")
        return {'error': str(e)}

# Initialize the translator
translate_client = initialize_translator()

# Initialize the speech-to-text client
speech_client = initialize_speech_client()

# Flask Routes and main functions would go here...
# Let me add the essential Flask routes

@app.route('/')
def index():
    """Main page"""
    return render_template('ultra_modern_index.html')

@app.route('/predict', methods=['POST'])
def predict():
    """Predict sentiment for given text with multilingual support"""
    try:
        data = request.json
        text = data.get('text', '')
        title = data.get('title', '')
        
        if not text:
            return jsonify({'error': 'Text is required'}), 400
        
        # Perform multilingual sentiment analysis with word cloud
        result = predict_sentiment(title, text, include_wordcloud=True)
        
        if 'error' in result:
            return jsonify(result), 400
        
        # Save to history
        save_article_to_history(title, text, result, is_live_analysis=True)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/analyze-article', methods=['POST'])
def analyze_article():
    """Analyze a specific article (for trending news items)"""
    try:
        data = request.json
        title = data.get('title', '')
        content = data.get('content', '')
        url = data.get('url', '')
        
        if not content and not title:
            return jsonify({'error': 'Title or content is required'}), 400
        
        # Use title as content if no content available
        analysis_text = content if content else title
        
        print(f"📰 Analyzing article: {title[:50]}...")
        print(f"📝 Content length: {len(analysis_text)} characters")
        
        # Perform sentiment analysis with word cloud
        result = predict_sentiment(title, analysis_text, include_wordcloud=True)
        
        if 'error' in result:
            return jsonify(result), 400
        
        # Add article metadata to result
        result['article_url'] = url
        result['article_title'] = title
        
        # Save to history
        save_article_to_history(title, analysis_text, result, is_live_analysis=True)
        
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ Error analyzing article: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/history')
def history():
    """Get analysis history"""
    try:
        limit = request.args.get('limit', 50, type=int)
        articles = get_article_history(limit)
        return jsonify({'history': articles})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/clear-history', methods=['POST'])
def clear_history():
    """Clear analysis history"""
    try:
        success = clear_article_history()
        if success:
            return jsonify({'message': 'History cleared successfully'})
        else:
            return jsonify({'error': 'Failed to clear history'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/trending-news')
def trending_news():
    """Get trending news for a category and country"""
    try:
        category = request.args.get('category', 'general')
        country = request.args.get('country', 'us')
        
        print(f"🔄 Trending news request: category={category}, country={country}")
        
        articles = fetch_trending_news(category, country)
        
        return jsonify({
            'articles': articles,
            'category': category,
            'country': country,
            'total': len(articles)
        })
        
    except Exception as e:
        print(f"❌ Error in trending news: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/rss-news')
def rss_news():
    """Get RSS news feeds"""
    try:
        articles = fetch_rss_news(15)  # Get more articles for RSS endpoint
        
        return jsonify({
            'articles': articles,
            'total': len(articles),
            'source': 'RSS Feeds'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/sentiment-distribution')
def sentiment_distribution():
    """Get sentiment distribution data for charts"""
    try:
        days = request.args.get('days', 7, type=float)
        
        distribution_data = get_sentiment_distribution(days)
        
        return jsonify({
            'success': True,
            'distribution': distribution_data,
            'days': days
        })
        
    except Exception as e:
        print(f"❌ Error in sentiment distribution: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/translate-text', methods=['POST'])
def translate_text_endpoint():
    """Translate text to English"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Use the existing translate_text function
        translation_result = translate_text(text, target_language='en')
        
        if translation_result and 'translated_text' in translation_result:
            return jsonify({
                'success': True,
                'translatedText': translation_result['translated_text'],
                'sourceLanguage': translation_result.get('source_language', 'auto')
            })
        else:
            return jsonify({'error': 'Translation failed'}), 500
            
    except Exception as e:
        print(f"❌ Error in translation: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/transcribe-video', methods=['POST'])
def transcribe_video():
    """Transcribe video to text using Google Cloud Speech-to-Text"""
    try:
        if 'video' not in request.files:
            return jsonify({'error': 'No video file provided'}), 400
        
        video_file = request.files['video']
        if video_file.filename == '':
            return jsonify({'error': 'No video file selected'}), 400
        
        # Validate file type
        allowed_extensions = {'.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v'}
        file_ext = os.path.splitext(video_file.filename)[1].lower()
        if file_ext not in allowed_extensions:
            return jsonify({'error': 'Invalid video file type'}), 400
        
        # Save video to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_video:
            video_file.save(temp_video.name)
            temp_video_path = temp_video.name
        
        try:
            # Find ffmpeg executable (check local installation first)
            ffmpeg_path = 'ffmpeg'  # Default system path
            local_ffmpeg = os.path.join(os.getcwd(), 'tools', 'ffmpeg-8.0-essentials_build', 'bin', 'ffmpeg.exe')
            
            if os.path.exists(local_ffmpeg):
                ffmpeg_path = local_ffmpeg
                print(f"✅ Using local FFmpeg: {local_ffmpeg}")
            else:
                # Check if system ffmpeg is available
                try:
                    subprocess.run(['ffmpeg', '-version'], check=True, capture_output=True)
                    print("✅ Using system FFmpeg")
                except (subprocess.CalledProcessError, FileNotFoundError):
                    return jsonify({
                        'error': 'FFmpeg is not available. Please install FFmpeg to enable video transcription.'
                    }), 500
            
            # Extract audio from video using ffmpeg
            audio_path = temp_video_path.replace(file_ext, '.wav')
            result = subprocess.run([
                ffmpeg_path, '-i', temp_video_path,
                '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1',
                audio_path, '-y'
            ], check=True, capture_output=True, text=True)
            
            # Transcribe audio using Google Cloud Speech-to-Text
            transcription = transcribe_audio_file(audio_path)
            
            # Detect language of the transcribed text
            detected_language = detect_language(transcription)
            
            # Get language name mapping
            language_names = {
                'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German', 
                'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese',
                'ko': 'Korean', 'zh': 'Chinese', 'ar': 'Arabic', 'hi': 'Hindi',
                'th': 'Thai', 'vi': 'Vietnamese', 'nl': 'Dutch', 'pl': 'Polish',
                'tr': 'Turkish', 'sv': 'Swedish', 'no': 'Norwegian', 'da': 'Danish',
                'fi': 'Finnish', 'cs': 'Czech', 'hu': 'Hungarian'
            }
            language_name = language_names.get(detected_language, f"Unknown ({detected_language})")
            
            print(f"🌐 Detected language in video: {language_name} ({detected_language})")
            
            # Perform sentiment analysis on the transcription
            try:
                # Use the existing predict_sentiment function (assuming video content as title)
                sentiment_result = predict_sentiment("Video Content", transcription, include_wordcloud=False)
                sentiment = sentiment_result.get('sentiment', 'unknown')
                confidence = sentiment_result.get('confidence', 0)
            except Exception as e:
                print(f"⚠️ Sentiment analysis failed: {e}")
                sentiment = 'unknown'
                confidence = 0
            
            # Summary generation removed per user request
            
            # Prepare response with comprehensive multilingual data
            response_data = {
                'success': True,
                'transcription': transcription,
                'detected_language': detected_language,
                'language_name': language_name,
                'sentiment': sentiment,
                'confidence': confidence,
                'processing_method': 'chunked' if len(transcription) > 500 else 'synchronous',
                'character_count': len(transcription),
                'translation_available': detected_language != 'en'
            }
            
            # If the detected language is not English, offer translation
            if detected_language != 'en' and translate_client:
                try:
                    # Translate transcription to English
                    english_transcription = translate_client.translate(
                        transcription, target_language='en'
                    )['translatedText']
                    
                    response_data.update({
                        'english_transcription': english_transcription,
                        'translation_note': f'Original content detected in {language_name}, English translation provided'
                    })
                    
                    print(f"🔄 Translated {language_name} content to English")
                    
                except Exception as e:
                    print(f"⚠️ Translation failed: {e}")
                    response_data['translation_error'] = str(e)
            
            return jsonify(response_data)
            
        except subprocess.CalledProcessError as e:
            error_msg = f'Failed to extract audio from video. Error: {e.stderr if hasattr(e, "stderr") and e.stderr else str(e)}'
            return jsonify({'error': error_msg}), 500
        except Exception as e:
            return jsonify({'error': f'Transcription failed: {str(e)}'}), 500
        finally:
            # Clean up temporary files
            try:
                os.unlink(temp_video_path)
                if 'audio_path' in locals():
                    os.unlink(audio_path)
            except:
                pass
                
    except Exception as e:
        print(f"❌ Error in video transcription: {e}")
        return jsonify({'error': str(e)}), 500

def transcribe_audio_file(audio_path):
    """Transcribe audio file using Google Cloud Speech-to-Text with automatic fallback for long files"""
    global speech_client
    
    if not speech_client:
        raise Exception("Speech-to-Text client not initialized")
    
    # Get file size to determine which method to use
    file_size = os.path.getsize(audio_path)
    max_sync_size = 10 * 1024 * 1024  # 10MB limit for synchronous recognition
    
    print(f"🎵 Audio file size: {file_size / (1024*1024):.2f} MB")
    
    # Configure multilingual audio settings with comprehensive language support
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=16000,
        language_code='en-US',  # Primary language (most common)
        alternative_language_codes=[
            # European languages
            'es-ES', 'fr-FR', 'de-DE', 'it-IT', 'pt-PT', 'pt-BR', 'nl-NL', 'ru-RU',
            'pl-PL', 'tr-TR', 'sv-SE', 'no-NO', 'da-DK', 'fi-FI', 'cs-CZ', 'hu-HU',
            # Asian languages
            'ja-JP', 'ko-KR', 'zh-CN', 'zh-TW', 'th-TH', 'vi-VN', 'hi-IN', 'ar-SA',
            # Other major languages
            'bn-BD', 'ta-IN', 'te-IN', 'mr-IN', 'gu-IN', 'kn-IN', 'ml-IN', 'ur-PK'
        ],
        enable_automatic_punctuation=True,
        enable_word_time_offsets=False,
        enable_word_confidence=True,
        enable_spoken_punctuation=True,
        enable_spoken_emojis=True,
        model='latest_long',  # Best for longer audio
        use_enhanced=True,  # Better accuracy for noisy audio
        profanity_filter=False,  # Allow all words for sentiment analysis
        speech_contexts=[
            # Add context for better recognition of news-related terms
            speech.SpeechContext(phrases=[
                "news", "breaking news", "weather", "sports", "politics", "economy",
                "technology", "business", "finance", "health", "education", "entertainment"
            ])
        ]
    )
    
    try:
        if file_size <= max_sync_size:
            print("🔄 Using synchronous recognition (file <= 10MB)")
            # Use synchronous recognition for smaller files
            with open(audio_path, 'rb') as audio_file:
                content = audio_file.read()
            
            audio = speech.RecognitionAudio(content=content)
            response = speech_client.recognize(config=config, audio=audio)
            
        else:
            print("🔄 Using asynchronous recognition (file > 10MB)")
            # Use asynchronous recognition for larger files
            # First, we need to split the audio into smaller chunks
            return transcribe_long_audio_chunked(audio_path, config)
        
        # Combine all transcription results
        transcription_parts = []
        for result in response.results:
            if result.alternatives:
                transcription_parts.append(result.alternatives[0].transcript)
        
        transcription = ' '.join(transcription_parts).strip()
        
        if not transcription:
            raise Exception("No speech detected in the audio")
        
        print(f"✅ Transcription completed: {len(transcription)} characters")
        return transcription
        
    except Exception as e:
        error_msg = str(e)
        if "too long" in error_msg.lower() or "sync input too long" in error_msg.lower():
            print("⚠️ Audio too long for sync recognition, trying chunked approach...")
            return transcribe_long_audio_chunked(audio_path, config)
        else:
            raise Exception(f"Speech recognition failed: {error_msg}")

def transcribe_long_audio_chunked(audio_path, config):
    """Split long audio into chunks and transcribe each chunk"""
    global speech_client
    
    print("🔄 Splitting audio into chunks for processing...")
    
    # Calculate audio duration first
    try:
        # Use ffprobe to get duration
        ffprobe_path = os.path.join(os.getcwd(), 'tools', 'ffmpeg-8.0-essentials_build', 'bin', 'ffprobe.exe')
        if not os.path.exists(ffprobe_path):
            ffprobe_path = 'ffprobe'  # fallback to system ffprobe
        
        result = subprocess.run([
            ffprobe_path, '-v', 'quiet', '-show_entries', 'format=duration',
            '-of', 'csv=p=0', audio_path
        ], capture_output=True, text=True, check=True)
        
        duration = float(result.stdout.strip())
        print(f"🎵 Audio duration: {duration:.2f} seconds")
        
        # Split into 30-second chunks with 2-second overlap
        chunk_duration = 30
        overlap = 2
        chunks = []
        start_time = 0
        
        while start_time < duration:
            end_time = min(start_time + chunk_duration, duration)
            chunks.append((start_time, end_time))
            start_time += (chunk_duration - overlap)
        
        print(f"📂 Created {len(chunks)} audio chunks")
        
        # Process each chunk
        all_transcriptions = []
        successful_chunks = 0
        processed_chunks = 0
        
        for i, (start, end) in enumerate(chunks):
            print(f"🔄 Processing chunk {i+1}/{len(chunks)} ({start:.1f}s - {end:.1f}s)")
            
            # Extract chunk
            chunk_path = audio_path.replace('.wav', f'_chunk_{i}.wav')
            
            ffmpeg_path = os.path.join(os.getcwd(), 'tools', 'ffmpeg-8.0-essentials_build', 'bin', 'ffmpeg.exe')
            if not os.path.exists(ffmpeg_path):
                ffmpeg_path = 'ffmpeg'
            
            try:
                # Create chunk with better error handling
                cmd = [
                    ffmpeg_path, '-i', audio_path,
                    '-ss', str(start), '-t', str(end - start),
                    '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1',
                    chunk_path, '-y'
                ]
                
                result = subprocess.run(cmd, capture_output=True, text=True, 
                                      creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
                
                if result.returncode != 0:
                    print(f"⚠️ Warning: Failed to extract chunk {i+1}: {result.stderr}")
                    continue
                
                # Check if chunk file was created and has reasonable size
                if not os.path.exists(chunk_path) or os.path.getsize(chunk_path) < 1000:
                    print(f"⚠️ Warning: Chunk {i+1} file is too small or missing")
                    continue
                
                processed_chunks += 1
                
                # Transcribe chunk
                with open(chunk_path, 'rb') as audio_file:
                    content = audio_file.read()
                
                audio = speech.RecognitionAudio(content=content)
                response = speech_client.recognize(config=config, audio=audio)
                
                chunk_transcription = []
                for result in response.results:
                    if result.alternatives:
                        chunk_transcription.append(result.alternatives[0].transcript)
                
                if chunk_transcription:
                    chunk_text = ' '.join(chunk_transcription)
                    all_transcriptions.append(chunk_text)
                    successful_chunks += 1
                    print(f"✅ Chunk {i+1} transcribed: '{chunk_text[:50]}...' ({len(chunk_text)} chars)")
                else:
                    print(f"⚪ Chunk {i+1}: No speech detected in this segment")
                
            except Exception as e:
                print(f"❌ Error processing chunk {i+1}: {str(e)}")
                continue
            finally:
                # Clean up chunk file
                try:
                    if os.path.exists(chunk_path):
                        os.unlink(chunk_path)
                except:
                    pass
        
        print(f"📊 Processing summary: {successful_chunks}/{processed_chunks} chunks with speech, {processed_chunks}/{len(chunks)} chunks processed")
        
        final_transcription = ' '.join(all_transcriptions).strip()
        
        if not final_transcription:
            if processed_chunks == 0:
                raise Exception("Failed to process any audio chunks - there may be an issue with the audio file format")
            elif successful_chunks == 0:
                # More detailed message when no speech is detected
                return "Audio processed successfully but no clear speech was detected. The audio may contain background noise, music, or very quiet speech. Try using audio with clearer speech content."
            else:
                raise Exception("Processed chunks but no transcription text was generated")
        
        print(f"✅ Full transcription completed: {len(final_transcription)} characters from {successful_chunks} chunks")
        return final_transcription
        
    except subprocess.CalledProcessError as e:
        raise Exception(f"Failed to process audio chunks: {str(e)}")
    except Exception as e:
        raise Exception(f"Chunked transcription failed: {str(e)}")

@app.route('/process-text-file', methods=['POST'])
def process_text_file():
    """Process uploaded text file with language detection and translation support"""
    try:
        if 'text_file' not in request.files:
            return jsonify({'error': 'No text file provided'}), 400
        
        text_file = request.files['text_file']
        
        if text_file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Read file content
        try:
            file_content = text_file.read().decode('utf-8')
        except UnicodeDecodeError:
            try:
                # Try different encodings
                text_file.seek(0)
                file_content = text_file.read().decode('latin-1')
            except:
                return jsonify({'error': 'Could not decode file. Please ensure it\'s a valid text file.'}), 400
        
        if not file_content or file_content.strip() == '':
            return jsonify({'error': 'File is empty or contains no readable text.'}), 400
        
        if len(file_content.strip()) < 10:
            return jsonify({'error': 'File content is too short for meaningful analysis.'}), 400
        
        # Detect language of file content
        try:
            detected_language = detect_language(file_content)
            language_names = {
                'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German', 
                'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese',
                'ko': 'Korean', 'zh': 'Chinese', 'ar': 'Arabic', 'hi': 'Hindi',
                'th': 'Thai', 'vi': 'Vietnamese', 'nl': 'Dutch', 'pl': 'Polish',
                'tr': 'Turkish', 'sv': 'Swedish', 'no': 'Norwegian', 'da': 'Danish',
                'fi': 'Finnish', 'cs': 'Czech', 'hu': 'Hungarian'
            }
            language_name = language_names.get(detected_language, f"Unknown ({detected_language})")
        except:
            detected_language = 'en'
            language_name = 'English (default)'
        
        print(f"🌐 Detected language in text file: {language_name} ({detected_language})")
        
        # Return the file content for further processing
        response_data = {
            'success': True,
            'extracted_text': file_content,
            'detected_language': detected_language,
            'language_name': language_name,
            'character_count': len(file_content),
            'processing_method': 'Text File',
            'file_name': text_file.filename
        }
        
        # If the detected language is not English, offer translation
        if detected_language != 'en' and translate_client:
            try:
                # Translate file content to English
                english_text = translate_client.translate(
                    file_content, target_language='en'
                )['translatedText']
                
                response_data['english_text'] = english_text
                response_data['translation_available'] = True
                response_data['translation_note'] = f'Text translated from {language_name} to English for analysis'
                
                print(f"✅ Text file translated from {language_name} to English")
                
            except Exception as e:
                print(f"❌ Translation failed: {str(e)}")
                response_data['translation_available'] = False
                response_data['translation_error'] = 'Translation service unavailable'
        else:
            response_data['translation_available'] = False
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"❌ Text file processing error: {str(e)}")
        return jsonify({'error': f'Failed to process text file: {str(e)}'}), 500


@app.route('/chart/clear-live-data', methods=['POST'])
def clear_live_data():
    """Clear live analysis data for chart reset"""
    try:
        success = clear_live_analysis_data()
        if success:
            return jsonify({'message': 'Live analysis data cleared successfully'})
        else:
            return jsonify({'error': 'Failed to clear live analysis data'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/process-image', methods=['POST'])
def process_image():
    """Process uploaded image and extract text using OCR"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        image_file = request.files['image']
        
        if image_file.filename == '':
            return jsonify({'error': 'No image selected'}), 400
        
        # Check if it's a valid image file
        if not is_image_file(image_file.filename):
            return jsonify({'error': 'Invalid image file. Please upload JPG, PNG, GIF, BMP, TIFF, or WebP files.'}), 400
        
        # Extract text from image using OCR
        extracted_text, error = extract_text_from_image(image_file)
        
        if error:
            return jsonify({'error': error}), 400
        
        if not extracted_text:
            return jsonify({'error': 'No readable text found in the image.'}), 400
        
        # Detect language of extracted text
        try:
            detected_language = detect_language(extracted_text)
            language_names = {
                'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German', 
                'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'ja': 'Japanese',
                'ko': 'Korean', 'zh': 'Chinese', 'ar': 'Arabic', 'hi': 'Hindi',
                'th': 'Thai', 'vi': 'Vietnamese', 'nl': 'Dutch', 'pl': 'Polish',
                'tr': 'Turkish', 'sv': 'Swedish', 'no': 'Norwegian', 'da': 'Danish',
                'fi': 'Finnish', 'cs': 'Czech', 'hu': 'Hungarian'
            }
            language_name = language_names.get(detected_language, f"Unknown ({detected_language})")
        except:
            detected_language = 'en'
            language_name = 'English (default)'
        
        print(f"🌐 Detected language in image: {language_name} ({detected_language})")
        
        # Return the extracted text for further processing
        response_data = {
            'success': True,
            'extracted_text': extracted_text,
            'detected_language': detected_language,
            'language_name': language_name,
            'character_count': len(extracted_text),
            'processing_method': 'OCR',
            'file_name': image_file.filename
        }
        
        # If the detected language is not English, offer translation
        if detected_language != 'en' and translate_client:
            try:
                # Translate extracted text to English
                english_text = translate_client.translate(
                    extracted_text, target_language='en'
                )['translatedText']
                
                response_data.update({
                    'english_text': english_text,
                    'translation_note': f'Original text detected in {language_name}, English translation provided'
                })
            except Exception as e:
                print(f"⚠️ Translation failed: {e}")
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"❌ Error in image processing: {e}")
        return jsonify({'error': f'Image processing failed: {str(e)}'}), 500

if __name__ == '__main__':
    print("🚀 Starting Enhanced Multilingual News Sentiment Analysis App...")
    
    # Initialize database
    init_database()
    
    # Load models
    metadata = load_models()
    if metadata:
        print("✅ All models loaded successfully!")
        print("🌐 Multilingual support enabled with Google Cloud Translate")
        print("📊 Application ready!")
        print("=" * 60)
        app.run(debug=True, host='0.0.0.0', port=5000)
    else:
        print("❌ Failed to load models. Please check model files.")
