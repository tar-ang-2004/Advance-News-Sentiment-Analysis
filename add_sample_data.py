#!/usr/bin/env python3
"""
Add sample sentiment analysis data to the database for testing the chart
"""

import sqlite3
from datetime import datetime, timedelta
import random

def add_sample_data():
    """Add sample sentiment analysis data for the last 7 days"""
    
    conn = sqlite3.connect('article_history.db')
    cursor = conn.cursor()
    
    # Sample news titles and content
    sample_data = [
        ("Positive", "Technology breakthrough brings hope", "Scientists have made a significant breakthrough in renewable energy technology, promising a cleaner future for everyone."),
        ("Positive", "Local community comes together", "The local community showed amazing solidarity during the recent charity drive, raising funds for those in need."),
        ("Positive", "Economic growth shows promise", "Economic indicators show positive growth trends, suggesting improved conditions ahead."),
        ("Negative", "Environmental concerns rise", "Scientists warn about increasing pollution levels affecting local wildlife and ecosystems."),
        ("Negative", "Traffic accidents increase", "Recent reports show a concerning increase in traffic accidents in the metropolitan area."),
        ("Negative", "Budget cuts affect services", "Municipal budget cuts are affecting essential public services across the city."),
        ("Positive", "Medical advancement saves lives", "New medical treatment shows remarkable success rates in clinical trials."),
        ("Positive", "Education program succeeds", "The new educational initiative has shown excellent results in student performance."),
        ("Negative", "Security concerns reported", "Local authorities report increased security concerns in downtown areas."),
        ("Positive", "Innovation drives success", "Local startups are driving innovation and creating new job opportunities."),
    ]
    
    # Generate data for the last 7 days
    for i in range(7):
        date = datetime.now() - timedelta(days=i)
        
        # Add 3-8 random articles per day
        num_articles = random.randint(3, 8)
        
        for j in range(num_articles):
            # Pick random article
            sentiment, title, content = random.choice(sample_data)
            
            # Add some randomness to confidence
            base_confidence = 0.85 if sentiment == "Positive" else 0.82
            confidence = base_confidence + random.uniform(-0.15, 0.15)
            confidence = max(0.5, min(0.95, confidence))  # Keep between 0.5 and 0.95
            
            # Create variations in title
            title_variation = f"{title} - Day {7-i} Article {j+1}"
            
            try:
                cursor.execute('''
                    INSERT INTO articles 
                    (title, content, sentiment, confidence, summary, language, writing_style, 
                     clickbait_score, key_details, word_count, readability_score, timestamp, content_hash)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    title_variation,
                    content,
                    sentiment,
                    confidence,
                    content[:100] + "...",  # summary
                    "English",  # language
                    "Formal",   # writing_style
                    random.uniform(0.1, 0.4),  # clickbait_score
                    '{"people": [], "numbers": [], "organizations": []}',  # key_details
                    len(content.split()),  # word_count
                    random.uniform(60, 85),  # readability_score
                    date.strftime('%Y-%m-%d %H:%M:%S'),  # timestamp
                    f"hash_{i}_{j}_{random.randint(1000, 9999)}"  # content_hash
                ))
            except Exception as e:
                print(f"Error inserting article: {e}")
    
    conn.commit()
    conn.close()
    
    print("✅ Sample sentiment data added successfully!")
    print("📊 You can now view the sentiment distribution chart in the web application")

if __name__ == "__main__":
    add_sample_data()
