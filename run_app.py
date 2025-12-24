#!/usr/bin/env python3
"""
Simple script to run the sentiment analysis application
"""

import subprocess
import sys
import os

def run_app():
    """Run the Flask application"""
    print("🚀 Starting News Sentiment Analysis Application...")
    print("📊 Stock-like sentiment chart is now available!")
    print("")
    print("Available URLs:")
    print("  📝 Main App: http://localhost:5000")
    print("  📈 Stock Chart: http://localhost:5000/stock-chart")
    print("")
    print("Press Ctrl+C to stop the application")
    print("-" * 50)
    
    try:
        # Change to the directory containing app.py
        os.chdir(os.path.dirname(os.path.abspath(__file__)))
        
        # Run the Flask app
        subprocess.run([sys.executable, "app.py"], check=True)
        
    except KeyboardInterrupt:
        print("\n🛑 Application stopped by user")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error running application: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    run_app()
