
import re
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import PorterStemmer
import string

# Initialize preprocessing tools
stop_words = set(stopwords.words('english'))
stemmer = PorterStemmer()

def clean_text(text):
    """
    Comprehensive text cleaning function
    """
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
    """
    Advanced text preprocessing with tokenization, stopword removal, and stemming
    """
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
