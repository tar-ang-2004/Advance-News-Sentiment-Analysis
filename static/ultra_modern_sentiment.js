// Ultra Modern Sentiment Analysis JavaScript
class SentimentAnalyzer {
    constructor() {
        this.currentInputMethod = 'text';
        this.isAnalyzing = false;
        this.isLoadingNews = false;
        this.currentCategory = 'general';
        this.trendingNews = [];
        this.sentimentChart = null;
        this.chartDays = 7;
        
        // New properties for save/download functionality
        this.currentAnalysisResult = null;
        this.currentAnalysisText = '';
        
        this.initEventListeners();
        this.initAnimations();
        this.loadTrendingNews('general'); // Load trending news on startup
        this.initSentimentChart(); // Initialize sentiment chart
    }

    initEventListeners() {
        // Form submission
        document.getElementById('sentimentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAnalysis();
        });

        // File upload handler
        document.getElementById('fileUpload').addEventListener('change', this.handleFileUpload.bind(this));
        
        // Video upload handler
        document.getElementById('videoUpload').addEventListener('change', this.handleVideoUpload.bind(this));

        // Smooth scrolling for navigation
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Auto-save draft
        document.getElementById('textArea').addEventListener('input', this.debounce(this.saveDraft.bind(this), 1000));
        
        // Load draft on page load
        this.loadDraft();
    }

    initAnimations() {
        // Intersection Observer for scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-slide-up');
                }
            });
        }, observerOptions);

        // Observe elements for animation
        document.querySelectorAll('.glass, .input-section').forEach(el => {
            observer.observe(el);
        });

        // Parallax effect for background elements
        window.addEventListener('scroll', this.handleParallax.bind(this));
    }

    handleParallax() {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        
        const floatingElements = document.querySelectorAll('.animate-float');
        floatingElements.forEach((el, index) => {
            el.style.transform = `translateY(${rate * (index + 1) * 0.1}px)`;
        });
    }

    setInputMethod(method) {
        this.currentInputMethod = method;
        
        // Update button states
        document.querySelectorAll('.input-method-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`${method}Btn`).classList.add('active');
        
        // Show/hide input sections
        document.querySelectorAll('.input-section').forEach(section => {
            section.classList.add('hidden');
        });
        document.getElementById(`${method}Input`).classList.remove('hidden');
        
        // Add transition animation
        const activeSection = document.getElementById(`${method}Input`);
        activeSection.style.opacity = '0';
        activeSection.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            activeSection.style.transition = 'all 0.5s ease';
            activeSection.style.opacity = '1';
            activeSection.style.transform = 'translateY(0)';
        }, 100);
    }

    updateCharCount(textarea) {
        const count = textarea.value.length;
        document.getElementById('charCount').textContent = `${count.toLocaleString()} characters`;
        
        // Update color based on length
        const counter = document.getElementById('charCount');
        if (count < 10) {
            counter.className = 'text-red-400';
        } else if (count < 100) {
            counter.className = 'text-yellow-400';
        } else {
            counter.className = 'text-green-400';
        }
    }

    toggleAdvanced() {
        const options = document.getElementById('advancedOptions');
        const icon = document.getElementById('advancedIcon');
        
        if (options.classList.contains('hidden')) {
            options.classList.remove('hidden');
            options.style.maxHeight = '0px';
            options.style.overflow = 'hidden';
            options.style.transition = 'max-height 0.5s ease';
            
            setTimeout(() => {
                options.style.maxHeight = options.scrollHeight + 'px';
            }, 10);
            
            icon.style.transform = 'rotate(180deg)';
        } else {
            options.style.maxHeight = '0px';
            icon.style.transform = 'rotate(0deg)';
            
            setTimeout(() => {
                options.classList.add('hidden');
            }, 500);
        }
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Show file processing animation
        this.showFileProcessing(file.name);

        try {
            // Check if it's an image file
            if (this.isImageFile(file)) {
                await this.handleImageUploadDirect(file);
            } else {
                // Handle text files directly for sentiment analysis
                await this.handleTextFileUploadDirect(file);
            }
        } catch (error) {
            this.showNotification('Error processing file: ' + error.message, 'error');
        }
    }

    async handleTextFileUploadDirect(file) {
        try {
            this.showNotification('📄 Processing text file for sentiment analysis...', 'info');
            
            // Create form data and send to backend for language detection
            const formData = new FormData();
            formData.append('text_file', file);
            
            const response = await fetch('/process-text-file', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to process text file');
            }
            
            const result = await response.json();
            
            if (result.success && result.extracted_text) {
                // Directly analyze the extracted text without showing it
                await this.analyzeExtractedContent(result.extracted_text, 'text file', file.name, result);
            } else {
                throw new Error('Could not read text from file');
            }
            
        } catch (error) {
            this.showNotification('❌ Text file processing failed: ' + error.message, 'error');
        }
    }

    async handleImageUploadDirect(file) {
        try {
            this.showNotification('🔍 Extracting text from image and analyzing...', 'info');
            
            const formData = new FormData();
            formData.append('image', file);
            
            const response = await fetch('/process-image', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to process image');
            }
            
            const result = await response.json();
            
            if (result.success && result.extracted_text) {
                // Directly analyze the extracted text without showing it
                await this.analyzeExtractedContent(result.extracted_text, 'image', file.name, result);
            } else {
                throw new Error('No text could be extracted from the image');
            }
            
        } catch (error) {
            this.showNotification('❌ Image processing failed: ' + error.message, 'error');
        }
    }

    async analyzeExtractedContent(text, contentType, fileName, extractionResult = null) {
        try {
            this.showNotification(`🔄 Analyzing ${contentType} content...`, 'info');
            
            // Use original text for analysis (not translated) so language detection works properly
            let textForAnalysis = text;
            
            // If we have extraction result with original text, use that instead of translated text
            if (extractionResult && extractionResult.extracted_text && extractionResult.english_text) {
                // This means the text was translated, so use the original for proper language detection
                textForAnalysis = extractionResult.extracted_text;
                console.log(`🌐 Using original ${extractionResult.language_name} text for analysis to ensure proper summary translation`);
            }
            
            // Perform sentiment analysis directly
            const analysisData = {
                text: textForAnalysis
            };
            
            const response = await fetch('/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(analysisData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Analysis failed');
            }
            
            const result = await response.json();
            
            // Add extraction metadata to results
            result.extraction_info = {
                source_type: contentType,
                file_name: fileName,
                character_count: text.length
            };
            
            // Add language information if available from extraction
            if (extractionResult) {
                result.extraction_info.detected_language = extractionResult.detected_language;
                result.extraction_info.language_name = extractionResult.language_name;
                
                // Add translation info if available
                if (extractionResult.english_text) {
                    result.extraction_info.translation_available = true;
                    result.extraction_info.translation_note = extractionResult.translation_note;
                }
            }
            
            // Display results directly (same as text input)
            this.displayResults(result);
            
            // Success notification with source info
            let successMsg = `✅ ${contentType} analysis completed!`;
            if (extractionResult && extractionResult.language_name && extractionResult.language_name !== 'English (default)') {
                successMsg += ` (${extractionResult.language_name})`;
            }
            this.showNotification(successMsg, 'success');
            
        } catch (error) {
            this.showNotification('❌ Analysis failed: ' + error.message, 'error');
        }
    }

    isImageFile(file) {
        const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff', 'image/webp'];
        return imageTypes.includes(file.type);
    }

    async handleImageUpload(file) {
        try {
            this.showNotification('🔍 Extracting text from image using OCR...', 'info');
            
            const formData = new FormData();
            formData.append('image', file);
            
            const response = await fetch('/process-image', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to process image');
            }
            
            const result = await response.json();
            
            if (result.success && result.extracted_text) {
                // Set the extracted text in the text area
                document.getElementById('textArea').value = result.extracted_text;
                this.updateCharCount(document.getElementById('textArea'));
                
                // Switch to text input mode
                this.setInputMethod('text');
                
                // Show success message with language detection info
                let message = `✅ Text extracted from image successfully!`;
                if (result.language_name && result.language_name !== 'English (default)') {
                    message += ` (Detected: ${result.language_name})`;
                }
                
                this.showNotification(message, 'success');
                
                // If translation is available, offer it
                if (result.english_text && result.detected_language !== 'en') {
                    this.showTranslationOption(result.extracted_text, result.english_text, result.language_name);
                }
            } else {
                throw new Error('No text could be extracted from the image');
            }
            
        } catch (error) {
            this.showNotification('❌ Image processing failed: ' + error.message, 'error');
        }
    }

    showTranslationOption(originalText, englishText, languageName) {
        // Create a temporary notification with translation option
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-md';
        notification.innerHTML = `
            <div class="mb-2">
                <strong>Translation Available</strong><br>
                Original text detected in ${languageName}
            </div>
            <div class="flex space-x-2">
                <button onclick="this.parentElement.parentElement.remove()" 
                        class="px-3 py-1 bg-blue-500 rounded text-sm hover:bg-blue-400">
                    Keep Original
                </button>
                <button onclick="
                    document.getElementById('textArea').value = '${englishText.replace(/'/g, "\\'")}';
                    sentimentAnalyzer.updateCharCount(document.getElementById('textArea'));
                    this.parentElement.parentElement.remove();
                " class="px-3 py-1 bg-green-500 rounded text-sm hover:bg-green-400">
                    Use English
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 10000);
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    showFileProcessing(fileName) {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 z-50 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg animate-slide-in';
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-spinner animate-spin mr-3"></i>
                Processing ${fileName}...
            </div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    async handleVideoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate video file
        const validTypes = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-ms-wmv'];
        if (!validTypes.includes(file.type)) {
            this.showNotification('Please upload a valid video file', 'error');
            return;
        }

        // Check file size (limit to 100MB for reasonable upload time)
        if (file.size > 100 * 1024 * 1024) {
            this.showNotification('Video file too large. Please upload a file smaller than 100MB', 'error');
            return;
        }

        // Show transcription progress
        this.showVideoTranscriptionProgress(file.name);

        try {
            const transcriptionResult = await this.transcribeVideo(file);
            
            if (transcriptionResult && transcriptionResult.transcription && transcriptionResult.transcription.length > 0) {
                // Hide the transcription progress
                this.hideVideoTranscriptionProgress();
                
                // Instead of showing transcribed text, directly process and show sentiment analysis results
                await this.processVideoTranscriptionResults(transcriptionResult);
                
            } else {
                throw new Error('No speech detected in video');
            }
        } catch (error) {
            this.hideVideoTranscriptionProgress();
            this.showNotification('Video transcription failed: ' + error.message, 'error');
        }
    }

    async processVideoTranscriptionResults(transcriptionResult) {
        try {
            // Convert video transcription result to match the format expected by displayResults
            const formattedResult = {
                sentiment: transcriptionResult.sentiment || 'unknown',
                confidence: transcriptionResult.confidence || 0,
                readability_score: 50, // Default readability score
                keywords: ['video', 'transcription'], // Default keywords
                text_length: transcriptionResult.character_count || 0,
                language: transcriptionResult.detected_language || 'en',
                language_name: transcriptionResult.language_name || 'Unknown',
                processing_method: transcriptionResult.processing_method || 'auto',
                source_type: 'video',
                english_translation: transcriptionResult.english_transcription || null,
                translation_available: transcriptionResult.translation_available || false
            };

            // Display results using the existing method
            this.displayResults(formattedResult);
            this.showNotification('Video analyzed successfully!', 'success');
        } catch (error) {
            this.showNotification('Failed to analyze video: ' + error.message, 'error');
        }
    }

    async transcribeVideo(file) {
        const formData = new FormData();
        formData.append('video', file);

        const response = await fetch('/transcribe-video', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        
        if (result.success) {
            // Return the full result object instead of just transcription text
            return result;
        } else {
            throw new Error(result.error || 'Transcription failed');
        }
    }

    analyzeAnother() {
        // Reset the interface to allow new analysis
        document.getElementById('resultsSection').classList.add('hidden');
        document.getElementById('inputSection').classList.remove('hidden');
        
        // Clear any previous results
        const textArea = document.getElementById('textArea');
        if (textArea) textArea.value = '';
        
        // Reset to text input method
        this.setInputMethod('text');
    }

    showFullTranslation() {
        if (this.lastVideoTranscription && this.lastVideoTranscription.english_transcription) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-white rounded-lg p-6 max-w-4xl max-h-[80vh] overflow-y-auto m-4">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-xl font-bold">Full Translation</h3>
                        <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                                class="text-gray-500 hover:text-gray-700">✕</button>
                    </div>
                    <div class="space-y-4">
                        <div>
                            <h4 class="font-semibold text-gray-700 mb-2">Original (${this.lastVideoTranscription.language_name}):</h4>
                            <div class="p-3 bg-gray-50 rounded border">${this.lastVideoTranscription.transcription}</div>
                        </div>
                        <div>
                            <h4 class="font-semibold text-gray-700 mb-2">English Translation:</h4>
                            <div class="p-3 bg-blue-50 rounded border">${this.lastVideoTranscription.english_transcription}</div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
    }

    showVideoTranscriptionProgress(fileName) {
        const progressDiv = document.getElementById('videoTranscribeProgress');
        progressDiv.classList.remove('hidden');
        
        // Simulate progress animation
        const progressBar = document.getElementById('transcribeProgressBar');
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 90) progress = 90; // Don't complete until actual transcription is done
            progressBar.style.width = progress + '%';
        }, 500);
        
        // Store interval for cleanup
        this.transcriptionInterval = interval;
    }

    hideVideoTranscriptionProgress() {
        const progressDiv = document.getElementById('videoTranscribeProgress');
        const progressBar = document.getElementById('transcribeProgressBar');
        
        // Complete the progress bar
        progressBar.style.width = '100%';
        
        setTimeout(() => {
            progressDiv.classList.add('hidden');
            progressBar.style.width = '0%';
        }, 1000);
        
        // Clear the interval
        if (this.transcriptionInterval) {
            clearInterval(this.transcriptionInterval);
            this.transcriptionInterval = null;
        }
    }

    async handleAnalysis() {
        if (this.isAnalyzing) return;
        
        const formData = this.getFormData();
        if (!this.validateInput(formData)) return;

        this.setAnalyzingState(true);
        
        try {
            const response = await this.sendAnalysisRequest(formData);
            
            if (response.success) {
                this.displayResults(response);
                this.saveToHistory(formData, response);
                this.showNotification('Analysis completed successfully!', 'success');
                
                // Trigger chart refresh when new analysis is completed
                this.onNewAnalysisCompleted();
            } else {
                throw new Error(response.error || 'Analysis failed');
            }
        } catch (error) {
            console.error('Analysis error:', error);
            this.showNotification('Analysis failed: ' + error.message, 'error');
        } finally {
            this.setAnalyzingState(false);
        }
    }

    getFormData() {
        let text = '';
        
        // Get text based on current input method
        switch (this.currentInputMethod) {
            case 'text':
                text = document.getElementById('textArea').value.trim();
                break;
            case 'file':
                // File content is already in textArea after upload
                text = document.getElementById('textArea').value.trim();
                break;
            case 'video':
                // Video transcription is already in textArea after transcription
                text = document.getElementById('textArea').value.trim();
                break;
        }
        
        return { text };
    }

    getAnalyzedText() {
        // Get the text that was analyzed
        if (this.currentInputMethod === 'text') {
            return document.getElementById('textArea').value;
        }
        return '';
    }

    validateInput(data) {
        const { title, text } = data;
        
        if (this.currentInputMethod === 'text' && (!text || text.length < 10)) {
            this.showNotification('Please enter at least 10 characters of text', 'error');
            return false;
        }
        
        return true;
    }

    async sendAnalysisRequest(data) {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        // Format response to match expected structure
        return {
            success: true,
            sentiment: result.sentiment,
            confidence: result.confidence,
            language: result.language,
            translation_info: result.translation_info,
            wordcloud: result.wordcloud,
            writing_style: result.writing_style,
            clickbait_score: result.clickbait_score,
            readability_score: result.readability_score,
            word_count: result.word_count,
            key_details: result.key_details,
            keywords: result.keywords,
            news_genre: result.news_genre,
            similar_articles: result.similar_articles
        };
    }

    setAnalyzingState(analyzing) {
        this.isAnalyzing = analyzing;
        const btn = document.getElementById('analyzeBtn');
        const btnText = document.getElementById('btnText');
        const spinner = document.getElementById('loadingSpinner');
        
        if (analyzing) {
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
            btnText.classList.add('hidden');
            spinner.classList.remove('hidden');
        } else {
            btn.disabled = false;
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
            btnText.classList.remove('hidden');
            spinner.classList.add('hidden');
        }
    }

    displayResults(response) {
        // Store the current analysis result for save/download functionality
        this.currentAnalysisResult = response;
        this.currentAnalysisText = this.getAnalyzedText();
        
        const container = document.getElementById('resultsContainer');
        
        // Create results HTML
        const resultsHtml = this.createResultsHTML(response);
        
        // Animate container appearance
        container.innerHTML = resultsHtml;
        container.classList.remove('hidden');
        container.style.opacity = '0';
        container.style.transform = 'translateY(50px)';
        
        setTimeout(() => {
            container.style.transition = 'all 0.8s ease';
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        }, 100);
        
        // Scroll to results
        setTimeout(() => {
            container.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 400);
        
        // Initialize result animations
        this.initResultAnimations();
    }

    createResultsHTML(response) {
        const sentiment = response.sentiment;
        const confidence = Math.round(response.confidence * 100);
        const isPositive = sentiment.toLowerCase() === 'positive';
        const isVideo = response.source_type === 'video';
        const isFileUpload = response.extraction_info && (response.extraction_info.source_type === 'image' || response.extraction_info.source_type === 'text file');
        
        const gradientClass = isPositive 
            ? 'from-green-400 to-emerald-400' 
            : 'from-red-400 to-pink-400';
        
        const bgClass = isPositive 
            ? 'from-green-900/20 to-emerald-900/20' 
            : 'from-red-900/20 to-pink-900/20';
        
        const iconClass = isPositive ? 'fa-smile' : 'fa-frown';
        
        // Video analysis header
        const videoHeader = isVideo ? `
            <div class="mb-4 text-center">
                <div class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 rounded-full border border-blue-400/30">
                    <span class="text-blue-400">📹</span>
                    <span class="text-blue-300 font-medium">Video Analysis</span>
                    ${response.language_name ? `<span class="text-blue-200 text-sm">• ${response.language_name}</span>` : ''}
                    ${response.processing_method ? `<span class="text-blue-200 text-sm">• ${response.processing_method}</span>` : ''}
                </div>
            </div>
        ` : '';
        
        // File upload analysis header
        const fileUploadHeader = isFileUpload ? `
            <div class="mb-4 text-center">
                <div class="inline-flex items-center gap-2 px-4 py-2 bg-purple-600/20 rounded-full border border-purple-400/30">
                    <span class="text-purple-400">${response.extraction_info.source_type === 'image' ? '🖼️' : '📄'}</span>
                    <span class="text-purple-300 font-medium">${response.extraction_info.source_type.charAt(0).toUpperCase() + response.extraction_info.source_type.slice(1)} Analysis</span>
                    <span class="text-purple-200 text-sm">• ${response.extraction_info.file_name}</span>
                    ${response.extraction_info.detected_language ? `<span class="text-purple-200 text-sm">• ${response.extraction_info.language_name}</span>` : ''}
                </div>
            </div>
        ` : '';
        
        return `
            <div class="glass rounded-3xl overflow-hidden animate-scale-in">
                <!-- Analysis Type Header -->
                ${videoHeader}
                ${fileUploadHeader}
                
                <!-- Main Result -->
                <div class="bg-gradient-to-r ${bgClass} p-8 border-b border-white/10">
                    <div class="text-center">
                        <div class="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r ${gradientClass} rounded-full mb-6 animate-bounce-slow">
                            <i class="fas ${iconClass} text-3xl text-white"></i>
                        </div>
                        <h3 class="text-4xl font-bold mb-2 bg-gradient-to-r ${gradientClass} bg-clip-text text-transparent">
                            ${sentiment}
                        </h3>
                        <p class="text-xl text-gray-300 mb-4">
                            ${isVideo ? 'Video' : isFileUpload ? response.extraction_info.source_type.charAt(0).toUpperCase() + response.extraction_info.source_type.slice(1) : 'Text'} Sentiment Detected
                        </p>
                        
                        <!-- Confidence Meter -->
                        <div class="max-w-md mx-auto">
                            <div class="flex justify-between text-sm text-gray-400 mb-2">
                                <span>Confidence</span>
                                <span>${confidence}%</span>
                            </div>
                            <div class="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                                <div class="h-full bg-gradient-to-r ${gradientClass} rounded-full transition-all duration-1000 ease-out confidence-bar" 
                                     style="width: 0%" data-width="${confidence}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Detailed Analysis -->
                <div class="p-8">
                    <div class="grid md:grid-cols-2 gap-8">
                        <!-- Analysis Metrics -->
                        <div>
                            <h4 class="text-2xl font-semibold mb-6 flex items-center">
                                <i class="fas fa-chart-bar mr-3 text-blue-400"></i>
                                Analysis Metrics
                            </h4>
                            <div class="space-y-4">
                                ${this.createMetricItem('Confidence Score', `${confidence}%`, confidence)}
                                ${this.createMetricItem('Text Length', `${response.text_length || (response.extraction_info ? response.extraction_info.character_count + ' chars' : 'N/A')}`, 100)}
                                ${this.createMetricItem('Processing Time', `${response.processing_time || '0.1'}s`, 100)}
                            </div>
                        </div>
                        
                        <!-- Additional Info -->
                        <div>
                            <h4 class="text-2xl font-semibold mb-6 flex items-center">
                                <i class="fas fa-info-circle mr-3 text-purple-400"></i>
                                Analysis Details
                            </h4>
                            <div class="space-y-4">
                                <div class="bg-black/20 rounded-xl p-4">
                                    <div class="text-sm text-gray-400 mb-1">Language</div>
                                    <div class="text-lg font-medium">${response.language || (response.extraction_info && response.extraction_info.language_name) || 'English'}</div>
                                </div>
                                ${response.translation_info && response.translation_info.was_translated ? `
                                <div class="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-4 border border-blue-400/20">
                                    <div class="flex items-center mb-2">
                                        <i class="fas fa-language text-blue-400 mr-2"></i>
                                        <div class="text-sm text-blue-300">Translation Applied</div>
                                    </div>
                                    <div class="text-sm text-gray-300">
                                        Content translated from <strong>${response.translation_info.original_language.name}</strong> to English for analysis.
                                        Summary translated back to original language.
                                    </div>
                                </div>
                                ` : ''}
                                ${response.extraction_info && response.extraction_info.translation_available ? `
                                <div class="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-4 border border-blue-400/20">
                                    <div class="flex items-center mb-2">
                                        <i class="fas fa-language text-blue-400 mr-2"></i>
                                        <div class="text-sm text-blue-300">OCR Translation Available</div>
                                    </div>
                                    <div class="text-sm text-gray-300">
                                        ${response.extraction_info.translation_note}
                                    </div>
                                </div>
                                ` : ''}
                                <div class="bg-black/20 rounded-xl p-4">
                                    <div class="text-sm text-gray-400 mb-1">Readability Score</div>
                                    <div class="text-lg font-medium">${response.readability_score !== undefined && response.readability_score !== null ? response.readability_score.toFixed(1) : 'N/A'}</div>
                                </div>
                                <div class="bg-black/20 rounded-xl p-4">
                                    <div class="text-sm text-gray-400 mb-1">News Genre</div>
                                    <div class="text-lg font-medium">${response.news_genre || 'General News'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Keywords Section -->
                    ${response.important_keywords ? this.createImportantKeywordsSection(response.important_keywords) : ''}
                    
                    ${response.wordcloud ? this.createWordCloudSection(response.wordcloud) : ''}
                    
                    <!-- Action Buttons -->
                    <div class="flex flex-wrap gap-4 mt-8 pt-8 border-t border-white/10">
                        <button onclick="sentimentAnalyzer.saveResult()" class="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-medium hover:scale-105 transition-all duration-300">
                            <i class="fas fa-save mr-2"></i>
                            Save Result
                        </button>
                        <button onclick="sentimentAnalyzer.shareResult()" class="px-6 py-3 glass rounded-xl font-medium hover:scale-105 transition-all duration-300 border border-white/20">
                            <i class="fas fa-share mr-2"></i>
                            Share
                        </button>
                        <button onclick="sentimentAnalyzer.downloadReport()" class="px-6 py-3 glass rounded-xl font-medium hover:scale-105 transition-all duration-300 border border-white/20">
                            <i class="fas fa-download mr-2"></i>
                            Download Report
                        </button>
                        <button onclick="sentimentAnalyzer.analyzeAnother()" class="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 rounded-xl font-medium hover:scale-105 transition-all duration-300">
                            <i class="fas fa-plus mr-2"></i>
                            Analyze Another
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    createMetricItem(label, value, percentage) {
        return `
            <div class="bg-black/20 rounded-xl p-4">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm text-gray-400">${label}</span>
                    <span class="text-lg font-semibold">${value}</span>
                </div>
                <div class="w-full bg-gray-700 rounded-full h-2">
                    <div class="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000 ease-out metric-bar" 
                         style="width: 0%" data-width="${percentage}%"></div>
                </div>
            </div>
        `;
    }

    createSummarySection(summary, response = null) {
        const summaryId = 'summary-' + Date.now(); // Unique ID for this summary
        const isVideo = response?.source_type === 'video';
        const hasTranslation = response?.english_summary && response?.translation_available;
        
        // Check for translation failure warning
        const translationFailed = response?.translation_info && 
                                  response.translation_info.was_translated && 
                                  response.translation_info.summary_translation_success === false;
        
        const summaryLanguage = response?.translation_info?.summary_language || 'Unknown';
        
        return `
            <div class="mt-8 p-6 bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-2xl border border-blue-500/20 animate-slide-in">
                <div class="flex justify-between items-center mb-4">
                    <h4 class="text-xl font-semibold flex items-center">
                        <i class="fas fa-file-alt mr-3 text-blue-400"></i>
                        ${isVideo ? 'Video' : 'Content'} Summary
                        ${response?.language_name && response.language_name !== 'English' ? 
                            `<span class="ml-2 px-2 py-1 text-xs bg-blue-600/30 rounded">${summaryLanguage}</span>` : ''}
                    </h4>
                    ${hasTranslation ? `
                        <button 
                            id="toggle-translation-${summaryId}" 
                            onclick="sentimentAnalyzer.toggleTranslation('${summaryId}')"
                            class="px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white text-sm rounded-lg hover:from-green-700 hover:to-blue-700 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl"
                            title="Toggle English Translation"
                        >
                            <i class="fas fa-language"></i>
                            <span>EN</span>
                        </button>
                    ` : `
                        <button 
                            id="translate-btn-${summaryId}" 
                            onclick="sentimentAnalyzer.translateSummary('${summaryId}')"
                            class="px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white text-sm rounded-lg hover:from-green-700 hover:to-blue-700 transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl"
                            title="Translate to English"
                        >
                            <i class="fas fa-language"></i>
                            <span>EN</span>
                        </button>
                    `}
                </div>
                
                ${translationFailed ? `
                    <div class="mb-4 p-3 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
                        <div class="flex items-center text-yellow-300">
                            <i class="fas fa-exclamation-triangle mr-2"></i>
                            <span class="text-sm">Summary translation failed. Showing English version instead.</span>
                        </div>
                    </div>
                ` : ''}
                
                <div class="bg-black/20 rounded-xl p-4">
                    <p id="summary-text-${summaryId}" class="text-gray-300 leading-relaxed text-lg">${summary}</p>
                    ${hasTranslation ? `
                        <p id="summary-translation-${summaryId}" class="text-gray-300 leading-relaxed text-lg hidden">${response.english_summary}</p>
                    ` : ''}
                    <div id="loading-${summaryId}" class="hidden text-center py-4">
                        <i class="fas fa-spinner fa-spin text-blue-400 mr-2"></i>
                        <span class="text-gray-400">Translating...</span>
                    </div>
                </div>
                <div class="mt-3 flex justify-between items-center">
                    <div class="text-xs text-gray-500">
                        <i class="fas fa-robot mr-1"></i>
                        ${isVideo ? 'AI-generated from video transcription' : 'AI-generated extractive summary'}
                    </div>
                    <div id="translation-info-${summaryId}" class="text-xs text-gray-500 ${hasTranslation ? '' : 'hidden'}">
                        <i class="fas fa-check-circle mr-1 text-green-400"></i>
                        Translation available
                    </div>
                </div>
            </div>
        `;
    }

    createWordCloudSection(wordcloud) {
        return `
            <div class="mt-8 p-6 bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-2xl border border-purple-500/20">
                <h4 class="text-xl font-semibold mb-4 flex items-center">
                    <i class="fas fa-cloud mr-3 text-purple-400"></i>
                    Word Cloud
                </h4>
                <div class="text-center">
                    <img src="data:image/png;base64,${wordcloud}" alt="Word Cloud" class="max-w-full h-auto rounded-xl shadow-lg">
                </div>
            </div>
        `;
    }

    createImportantKeywordsSection(keywords) {
        if (!keywords || keywords.length === 0) {
            return '';
        }

        // Create simple keyword badges
        const keywordsHtml = keywords.map(keyword => `
            <span class="inline-block px-3 py-2 m-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 text-blue-200 rounded-full text-sm border border-blue-500/30 hover:from-blue-600/30 hover:to-purple-600/30 transition-all duration-200">
                ${keyword.word} <span class="text-xs opacity-70">(${keyword.frequency})</span>
            </span>
        `).join('');

        return `
            <div class="mt-6 p-6 bg-gradient-to-r from-emerald-900/20 to-teal-900/20 rounded-2xl border border-emerald-500/20 animate-slide-in">
                <h4 class="text-xl font-semibold mb-4 flex items-center">
                    <i class="fas fa-key mr-3 text-emerald-400"></i>
                    Keywords
                </h4>
                <div class="flex flex-wrap -m-1">
                    ${keywordsHtml}
                </div>
                <div class="mt-4 text-xs text-gray-500">
                    <i class="fas fa-info-circle mr-1"></i>
                    Most frequent words from the article content
                </div>
            </div>
        `;
    }

    initResultAnimations() {
        // Animate confidence bar
        setTimeout(() => {
            const confidenceBar = document.querySelector('.confidence-bar');
            if (confidenceBar) {
                confidenceBar.style.width = confidenceBar.dataset.width;
            }
        }, 500);
        
        // Animate metric bars
        setTimeout(() => {
            document.querySelectorAll('.metric-bar').forEach((bar, index) => {
                setTimeout(() => {
                    bar.style.width = bar.dataset.width;
                }, index * 200);
            });
        }, 800);
    }

    saveResult() {
        if (!this.currentAnalysisResult) {
            this.showNotification('No analysis result to save!', 'error');
            return;
        }

        try {
            // Create a unique ID for this result
            const resultId = `analysis_${Date.now()}`;
            
            // Prepare the result data to save
            const savedResult = {
                id: resultId,
                timestamp: new Date().toISOString(),
                text: this.currentAnalysisText,
                inputMethod: this.currentInputMethod,
                result: this.currentAnalysisResult,
                summary: {
                    sentiment: this.currentAnalysisResult.sentiment,
                    confidence: this.currentAnalysisResult.confidence,
                    language: this.currentAnalysisResult.language,
                    genre: this.currentAnalysisResult.genre
                }
            };

            // Get existing saved results
            const existingSavedResults = JSON.parse(localStorage.getItem('saved_sentiment_results') || '[]');
            
            // Add new result to the beginning
            existingSavedResults.unshift(savedResult);
            
            // Keep only the latest 20 results to prevent localStorage overflow
            if (existingSavedResults.length > 20) {
                existingSavedResults.splice(20);
            }
            
            // Save to localStorage
            localStorage.setItem('saved_sentiment_results', JSON.stringify(existingSavedResults));
            
            this.showNotification('Result saved successfully! You can view saved results in the sidebar.', 'success');
            
            // Update saved results display if it exists
            this.updateSavedResultsDisplay();
            
        } catch (error) {
            console.error('Error saving result:', error);
            this.showNotification('Failed to save result. Please try again.', 'error');
        }
    }

    shareResult() {
        if (navigator.share) {
            navigator.share({
                title: 'Sentiment Analysis Result',
                text: 'Check out this sentiment analysis result!',
                url: window.location.href
            });
        } else {
            // Fallback to clipboard
            navigator.clipboard.writeText(window.location.href);
            this.showNotification('Link copied to clipboard!', 'success');
        }
    }

    downloadReport() {
        if (!this.currentAnalysisResult) {
            this.showNotification('No analysis result to download!', 'error');
            return;
        }

        try {
            const result = this.currentAnalysisResult;
            const analysisText = this.currentAnalysisText;
            const timestamp = new Date().toLocaleString();

            // Create comprehensive report content
            const reportContent = `
SENTIMENT ANALYSIS REPORT
========================

Generated: ${timestamp}
Analysis Method: ${this.currentInputMethod.toUpperCase()}

ANALYZED CONTENT
---------------
${this.currentInputMethod === 'url' ? 'URL: ' + analysisText : 'Text Content:'}
${this.currentInputMethod === 'url' ? '' : analysisText.substring(0, 500) + (analysisText.length > 500 ? '...' : '')}

SENTIMENT ANALYSIS RESULTS
==========================

Primary Sentiment: ${result.sentiment.toUpperCase()}
Confidence Level: ${(result.confidence * 100).toFixed(1)}%

Probability Breakdown:
- Positive: ${(result.probabilities.positive * 100).toFixed(1)}%
- Negative: ${(result.probabilities.negative * 100).toFixed(1)}%

DETAILED ANALYSIS
================

Language: ${result.language || 'English'}
Genre: ${result.genre || 'General'}
Writing Style: ${result.writing_style || 'Neutral'}
Word Count: ${result.word_count || 'N/A'}
Reading Level: ${result.readability_score ? result.readability_score.toFixed(1) : 'N/A'}
Clickbait Score: ${result.clickbait_score ? (result.clickbait_score * 100).toFixed(1) + '%' : 'N/A'}

KEY INSIGHTS
============
${result.key_details ? Object.entries(result.key_details).map(([key, value]) => `${key}: ${value}`).join('\n') : 'No additional insights available'}

IMPORTANT KEYWORDS
=================
${result.important_keywords ? result.important_keywords.join(', ') : 'No keywords extracted'}

PROCESSING DETAILS
==================
Processing Time: ${result.processing_time || 'N/A'} seconds
Text Length: ${result.text_length || analysisText.length} characters

---
Report generated by Advanced Sentiment Analysis Tool
${window.location.origin}
            `.trim();

            // Create and download the file
            const blob = new Blob([reportContent], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            
            // Create download link
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = `sentiment_analysis_report_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
            
            // Trigger download
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            // Clean up the URL object
            window.URL.revokeObjectURL(url);
            
            this.showNotification('Report downloaded successfully!', 'success');
            
        } catch (error) {
            console.error('Error generating report:', error);
            this.showNotification('Failed to generate report. Please try again.', 'error');
        }
    }

    updateSavedResultsDisplay() {
        // This method can be called to update any saved results display
        // For now, it's a placeholder - could be expanded to show a sidebar or modal
        const savedResults = JSON.parse(localStorage.getItem('saved_sentiment_results') || '[]');
        console.log(`Total saved results: ${savedResults.length}`);
    }

    getSavedResults() {
        return JSON.parse(localStorage.getItem('saved_sentiment_results') || '[]');
    }

    deleteSavedResult(resultId) {
        try {
            const savedResults = this.getSavedResults();
            const filteredResults = savedResults.filter(result => result.id !== resultId);
            localStorage.setItem('saved_sentiment_results', JSON.stringify(filteredResults));
            this.updateSavedResultsDisplay();
            this.showNotification('Result deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting result:', error);
            this.showNotification('Failed to delete result.', 'error');
        }
    }

    clearAllSavedResults() {
        try {
            localStorage.removeItem('saved_sentiment_results');
            this.updateSavedResultsDisplay();
            this.showNotification('All saved results cleared!', 'success');
        } catch (error) {
            console.error('Error clearing results:', error);
            this.showNotification('Failed to clear results.', 'error');
        }
    }

    analyzeAnother() {
        document.getElementById('textArea').value = '';
        document.getElementById('urlField').value = '';
        document.getElementById('resultsContainer').classList.add('hidden');
        document.getElementById('analyze').scrollIntoView({ behavior: 'smooth' });
    }

    clearForm() {
        // Clear all input fields
        document.getElementById('textArea').value = '';
        document.getElementById('urlField').value = '';
        
        // Clear file upload
        document.getElementById('fileUpload').value = '';
        
        // Reset character count
        this.updateCharCount(document.getElementById('textArea'));
        
        // Hide results
        document.getElementById('resultsContainer').classList.add('hidden');
        
        // Reset to text input method
        this.setInputMethod('text');
        
        // Clear local storage draft
        localStorage.removeItem('sentiment_analysis_draft');
        
        // Show notification
        this.showNotification('Form cleared successfully!', 'success');
        
        // Focus on text area
        document.getElementById('textArea').focus();
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        
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

    saveDraft() {
        const text = document.getElementById('textArea').value;
        if (text.length > 0) {
            localStorage.setItem('sentiment_analysis_draft', text);
        }
    }

    loadDraft() {
        const draft = localStorage.getItem('sentiment_analysis_draft');
        if (draft) {
            document.getElementById('textArea').value = draft;
            this.updateCharCount(document.getElementById('textArea'));
        }
    }

    saveToHistory(data, response) {
        const historyItem = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            title: data.title || 'Untitled',
            text: data.text?.substring(0, 200) + '...',
            sentiment: response.sentiment,
            confidence: response.confidence,
            method: this.currentInputMethod,
            language: response.language
        };
        
        let history = JSON.parse(localStorage.getItem('sentiment_history') || '[]');
        history.unshift(historyItem);
        history = history.slice(0, 50); // Keep only last 50 items
        
        localStorage.setItem('sentiment_history', JSON.stringify(history));
        this.updateHistoryDisplay();
    }

    loadHistory() {
        this.updateHistoryDisplay();
    }

    clearHistory() {
        // Show confirmation dialog
        if (confirm('Are you sure you want to clear all analysis history? This action cannot be undone.')) {
            try {
                // Clear from localStorage
                localStorage.removeItem('sentiment_history');
                
                // Update display
                this.updateHistoryDisplay();
                
                // Show success notification
                this.showNotification('Analysis history cleared successfully!', 'success');
                
            } catch (error) {
                console.error('Error clearing history:', error);
                this.showNotification('Failed to clear history. Please try again.', 'error');
            }
        }
    }

    updateHistoryDisplay() {
        const container = document.getElementById('historyContainer');
        const history = JSON.parse(localStorage.getItem('sentiment_history') || '[]');
        
        if (history.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-gray-400">
                    <i class="fas fa-history text-4xl mb-4"></i>
                    <p>No analysis history yet. Start analyzing to see your results here!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = history.map(item => this.createHistoryItem(item)).join('');
    }

    async loadTrendingNews(category = 'general') {
        console.log('🔍 loadTrendingNews called with category:', category);
        
        // Prevent multiple simultaneous calls to the same category
        if (this.isLoadingNews && this.currentCategory === category) {
            console.log('📋 Already loading news for this category, skipping...');
            return;
        }
        
        this.isLoadingNews = true;
        this.currentCategory = category;
        
        // Update active category button
        document.querySelectorAll('.news-category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
        
        // Show loading state
        const container = document.getElementById('trendingContainer');
        container.innerHTML = `
            <div class="text-center py-12 text-gray-400">
                <i class="fas fa-spinner animate-spin text-4xl mb-4"></i>
                <p>Loading ${category} news articles...</p>
            </div>
        `;
        
        try {
            const response = await fetch(`/trending-news?category=${category}&country=us`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.articles) {
                this.trendingNews = data.articles;
                
                // Auto-analyze each article for sentiment
                console.log('🔍 Starting auto-analysis of trending articles...');
                await this.autoAnalyzeTrendingArticles(data.articles);
                
                this.displayTrendingNews(this.trendingNews);
                this.updateSentimentDashboard(this.trendingNews);
            } else {
                throw new Error(data.error || 'Failed to load trending news');
            }
            
        } catch (error) {
            console.error('Error loading trending news:', error);
            container.innerHTML = `
                <div class="text-center py-12 text-gray-400">
                    <i class="fas fa-exclamation-triangle text-4xl mb-4 text-red-400"></i>
                    <p>Failed to load trending news</p>
                    <button onclick="sentimentAnalyzer.loadTrendingNews('${category}')" class="mt-4 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:scale-105 transition-all duration-300">
                        Try Again
                    </button>
                </div>
            `;
        } finally {
            this.isLoadingNews = false;
        }
    }

    async autoAnalyzeTrendingArticles(articles) {
        for (let i = 0; i < articles.length; i++) {
            const article = articles[i];
            try {
                console.log(`🔍 Analyzing article ${i + 1}/${articles.length}: ${article.title.substring(0, 50)}...`);
                
                // Analyze sentiment for this article
                const analysisData = {
                    title: article.title,
                    text: article.content || article.description || ''
                };
                
                if (analysisData.text.length < 10) {
                    console.log(`⚠️ Skipping article ${i + 1} - content too short`);
                    article.sentiment = 'Unknown';
                    article.confidence = 0;
                    continue;
                }
                
                const response = await this.sendAnalysisRequest(analysisData);
                
                // Add sentiment data to the article
                article.sentiment = response.sentiment;
                article.confidence = response.confidence;
                article.language = response.language;
                article.summary = response.summary;
                
                console.log(`✅ Article ${i + 1} analyzed: ${response.sentiment} (${Math.round(response.confidence * 100)}%)`);
                
            } catch (error) {
                console.error(`❌ Error analyzing article ${i + 1}:`, error);
                article.sentiment = 'Error';
                article.confidence = 0;
            }
            
            // Small delay to avoid overwhelming the API
            if (i < articles.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        console.log('✅ Auto-analysis completed for all trending articles');
        
        // Refresh the chart to include the new analysis data
        console.log('🔄 Refreshing sentiment chart with trending news analysis data...');
        this.showNotification(`${articles.length} trending articles analyzed! Chart updating...`, 'success');
        this.refreshSentimentChart();
    }

    displayTrendingNews(articles) {
        const container = document.getElementById('trendingContainer');
        
        if (!articles || articles.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-gray-400">
                    <i class="fas fa-newspaper text-4xl mb-4"></i>
                    <p>No trending articles found for this category</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = articles.map((article, index) => this.createNewsCard(article, index)).join('');
        
        // Show sentiment dashboard
        document.getElementById('sentimentDashboard').classList.remove('hidden');
    }

    createNewsCard(article, index) {
        const hasAnalysis = article.sentiment && article.confidence !== undefined;
        const sentiment = article.sentiment || 'Analyzing...';
        const confidence = article.confidence ? Math.round(article.confidence * 100) : 0;
        const isPositive = sentiment.toLowerCase() === 'positive';
        const isNegative = sentiment.toLowerCase() === 'negative';
        
        let sentimentColor, sentimentBg, sentimentIcon;
        
        if (!hasAnalysis || sentiment === 'Analyzing...') {
            sentimentColor = 'text-yellow-400';
            sentimentBg = 'from-yellow-900/20 to-orange-900/20 border-yellow-500/20';
            sentimentIcon = 'fa-spinner fa-spin';
        } else if (sentiment === 'Error' || sentiment === 'Unknown') {
            sentimentColor = 'text-gray-400';
            sentimentBg = 'from-gray-900/20 to-gray-800/20 border-gray-500/20';
            sentimentIcon = 'fa-question';
        } else if (isPositive) {
            sentimentColor = 'text-green-400';
            sentimentBg = 'from-green-900/20 to-emerald-900/20 border-green-500/20';
            sentimentIcon = 'fa-smile';
        } else if (isNegative) {
            sentimentColor = 'text-red-400';
            sentimentBg = 'from-red-900/20 to-pink-900/20 border-red-500/20';
            sentimentIcon = 'fa-frown';
        } else {
            sentimentColor = 'text-blue-400';
            sentimentBg = 'from-blue-900/20 to-purple-900/20 border-blue-500/20';
            sentimentIcon = 'fa-meh';
        }
        
        return `
            <div class="bg-black/20 rounded-2xl p-6 mb-6 hover:bg-black/30 transition-all duration-300 animate-slide-in" style="animation-delay: ${index * 0.1}s;">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex-1">
                        <h3 class="text-xl font-semibold mb-2 text-white leading-tight">
                            ${article.title || 'Untitled Article'}
                        </h3>
                        <p class="text-gray-300 mb-4 leading-relaxed">
                            ${article.content || article.description || article.summary || 'No description available'}
                        </p>
                    </div>
                    <div class="ml-6 flex-shrink-0">
                        <div class="bg-gradient-to-r ${sentimentBg} rounded-xl p-4 border text-center min-w-[120px]">
                            <i class="fas ${sentimentIcon} ${sentimentColor} text-2xl mb-2"></i>
                            <div class="${sentimentColor} font-semibold text-lg">${sentiment}</div>
                            <div class="text-gray-400 text-sm">${confidence}% confidence</div>
                        </div>
                    </div>
                </div>
                
                <div class="flex flex-wrap items-center justify-between gap-4">
                    <div class="flex items-center text-sm text-gray-400">
                        <i class="fas fa-clock mr-2"></i>
                        ${article.published_at ? new Date(article.published_at).toLocaleDateString() : 'Recent'}
                        ${article.source ? `<span class="mx-2">•</span><i class="fas fa-newspaper mr-1"></i>${article.source}` : ''}
                    </div>
                    
                    <div class="flex gap-3">
                        <button onclick="sentimentAnalyzer.reAnalyzeArticle(${index})" class="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-sm font-medium hover:scale-105 transition-all duration-300">
                            <i class="fas fa-redo mr-2"></i>
                            Re-analyze
                        </button>
                        <button onclick="sentimentAnalyzer.viewFullAnalysis(${index})" class="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-sm font-medium hover:scale-105 transition-all duration-300">
                            <i class="fas fa-chart-line mr-2"></i>
                            Full Analysis
                        </button>
                        ${article.url ? `
                        <a href="${article.url}" target="_blank" class="px-4 py-2 glass rounded-lg text-sm font-medium hover:scale-105 transition-all duration-300 border border-white/20">
                            <i class="fas fa-external-link-alt mr-2"></i>
                            Read More
                        </a>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    updateSentimentDashboard(articles) {
        const positiveCount = articles.filter(a => a.sentiment && a.sentiment.toLowerCase() === 'positive').length;
        const negativeCount = articles.filter(a => a.sentiment && a.sentiment.toLowerCase() === 'negative').length;
        const totalCount = articles.filter(a => a.sentiment).length;
        
        const avgConfidence = totalCount > 0 
            ? Math.round(articles.reduce((sum, a) => sum + (a.confidence || 0), 0) / totalCount * 100)
            : 0;
        
        // Animate the numbers
        this.animateNumber('positiveCount', positiveCount);
        this.animateNumber('negativeCount', negativeCount);
        this.animateNumber('avgConfidence', avgConfidence, '%');
        
        // Refresh the live sentiment chart to include the new trending news data
        console.log('🔄 Refreshing sentiment chart after trending news analysis');
        this.refreshSentimentChart();
    }

    animateNumber(elementId, targetValue, suffix = '') {
        const element = document.getElementById(elementId);
        const startValue = 0;
        const duration = 1000;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const currentValue = Math.round(startValue + (targetValue - startValue) * progress);
            element.textContent = currentValue + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    async analyzeNewsArticle(url) {
        if (!url || url === '#') {
            this.showNotification('Article URL not available', 'error');
            return;
        }
        
        // Switch to analyze section and populate URL
        document.getElementById('urlField').value = url;
        this.setInputMethod('url');
        document.getElementById('analyze').scrollIntoView({ behavior: 'smooth' });
        
        // Show notification
        this.showNotification('Article URL loaded! Click Analyze to get sentiment analysis.', 'info');
    }

    async reAnalyzeArticle(index) {
        if (!this.trendingNews || !this.trendingNews[index]) {
            this.showNotification('Article not found', 'error');
            return;
        }

        const article = this.trendingNews[index];
        
        try {
            this.showNotification('Re-analyzing article...', 'info');
            
            // Update UI to show analyzing state
            article.sentiment = 'Analyzing...';
            article.confidence = 0;
            this.displayTrendingNews(this.trendingNews);
            
            // Analyze sentiment for this article
            const analysisData = {
                title: article.title,
                text: article.content || article.description || ''
            };
            
            const response = await this.sendAnalysisRequest(analysisData);
            
            // Update article with new analysis
            article.sentiment = response.sentiment;
            article.confidence = response.confidence;
            article.language = response.language;
            article.summary = response.summary;
            
            // Refresh display
            this.displayTrendingNews(this.trendingNews);
            this.updateSentimentDashboard(this.trendingNews);
            
            this.showNotification(`Analysis complete: ${response.sentiment} (${Math.round(response.confidence * 100)}%)`, 'success');
            
        } catch (error) {
            console.error('Error re-analyzing article:', error);
            article.sentiment = 'Error';
            article.confidence = 0;
            this.displayTrendingNews(this.trendingNews);
            this.showNotification('Error during analysis: ' + error.message, 'error');
        }
    }

    viewFullAnalysis(index) {
        if (!this.trendingNews || !this.trendingNews[index]) {
            this.showNotification('Article not found', 'error');
            return;
        }

        const article = this.trendingNews[index];
        
        if (!article.sentiment || article.sentiment === 'Analyzing...' || article.sentiment === 'Error') {
            this.showNotification('Please wait for analysis to complete or re-analyze', 'warning');
            return;
        }

        // Populate the main analysis form with this article
        document.getElementById('textArea').value = article.content || article.description || '';
        
        // Switch to text input method
        this.setInputMethod('text');
        
        // Scroll to analyze section
        document.getElementById('analyze').scrollIntoView({ behavior: 'smooth' });
        
        this.showNotification('Article loaded for detailed analysis!', 'success');
    }

    refreshTrendingNews() {
        this.loadTrendingNews(this.currentCategory);
    }

    createHistoryItem(item) {
        const date = new Date(item.timestamp).toLocaleDateString();
        const time = new Date(item.timestamp).toLocaleTimeString();
        const isPositive = item.sentiment.toLowerCase() === 'positive';
        const sentimentColor = isPositive ? 'text-green-400' : 'text-red-400';
        const confidence = Math.round(item.confidence * 100);
        
        return `
            <div class="bg-black/20 rounded-xl p-4 mb-4 hover:bg-black/30 transition-all duration-300 cursor-pointer" onclick="sentimentAnalyzer.viewHistoryItem('${item.id}')">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center">
                        <span class="${sentimentColor} font-semibold text-lg">${item.sentiment}</span>
                        <span class="text-gray-400 text-sm ml-2">${confidence}% confidence</span>
                    </div>
                    <div class="text-xs text-gray-500">
                        ${date} ${time}
                    </div>
                </div>
                <p class="text-gray-300 text-sm mb-2">${item.text}</p>
                <div class="flex items-center justify-between">
                    <span class="text-xs text-gray-500 capitalize">
                        <i class="fas fa-${item.method === 'text' ? 'keyboard' : item.method === 'url' ? 'link' : 'file'} mr-1"></i>
                        ${item.method} input
                    </span>
                    <button class="text-blue-400 hover:text-blue-300 text-sm">
                        View Details
                    </button>
                </div>
            </div>
        `;
    }

    viewHistoryItem(id) {
        // Implementation for viewing history item details
        this.showNotification('History item details coming soon!', 'info');
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Sentiment Chart Methods
    async initSentimentChart() {
        try {
            await this.loadSentimentDistribution(this.chartDays);
        } catch (error) {
            console.error('Error initializing sentiment chart:', error);
            this.showChartError('Failed to load sentiment chart');
        }
    }

    async loadSentimentDistribution(days = 7) {
        this.chartDays = days;
        
        this.showChartLoading();
        
        try {
            const response = await fetch(`/sentiment-distribution?days=${days}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.distribution && data.distribution.length > 0) {
                this.renderSentimentChart(data.distribution);
                console.log(`[CHART] Chart updated with data for last ${days} days`);
            } else {
                // No data available - show empty state instead of error
                this.showEmptyChart();
                console.log(`[CHART] No sentiment data available for last ${days} days - showing empty state`);
            }
            
        } catch (error) {
            console.error('Error loading sentiment distribution:', error);
            this.showChartError('Failed to load sentiment data');
        }
    }

    showChartLoading() {
        const loadingState = document.getElementById('chartLoadingState');
        const canvas = document.getElementById('sentimentChart');
        
        if (loadingState && canvas) {
            loadingState.style.display = 'block';
            canvas.style.display = 'none';
        }
    }

    showChartError(message) {
        const container = document.getElementById('sentimentChartContainer');
        container.innerHTML = `
            <div class="text-center py-12 text-gray-400">
                <i class="fas fa-exclamation-triangle text-4xl mb-4 text-red-400"></i>
                <p>${message}</p>
                <button onclick="sentimentAnalyzer.refreshSentimentChart()" class="mt-4 px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:scale-105 transition-all duration-300">
                    Try Again
                </button>
            </div>
        `;
    }

    showEmptyChart() {
        const container = document.getElementById('sentimentChartContainer');
        container.innerHTML = `
            <div class="text-center py-12 text-gray-400">
                <i class="fas fa-chart-line text-4xl mb-4 text-blue-400"></i>
                <p class="text-lg mb-2">No Analysis Data Yet</p>
                <p class="text-sm mb-4">Perform some sentiment analyses to see trends appear here</p>
                <div class="flex gap-2 justify-center">
                    <button onclick="document.getElementById('analyze').scrollIntoView({behavior: 'smooth'})" class="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:scale-105 transition-all duration-300 text-sm">
                        <i class="fas fa-brain mr-2"></i>
                        Start Analyzing
                    </button>
                    <button onclick="sentimentAnalyzer.refreshSentimentChart()" class="px-4 py-2 glass rounded-lg hover:scale-105 transition-all duration-300 border border-white/20 text-sm">
                        <i class="fas fa-sync mr-2"></i>
                        Refresh
                    </button>
                </div>
            </div>
        `;
    }

    renderSentimentChart(distributionData) {
        const loadingState = document.getElementById('chartLoadingState');
        const canvas = document.getElementById('sentimentChart');
        
        if (loadingState) loadingState.style.display = 'none';
        if (canvas) canvas.style.display = 'block';
        
        // Destroy existing chart
        if (this.sentimentChart) {
            this.sentimentChart.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        
        // Prepare data
        const labels = distributionData.map(item => {
            const dateStr = item.date;
            
            // Check if it's minute-level data (contains hour:minute format)
            if (dateStr.includes(' ') && dateStr.includes(':')) {
                const date = new Date(dateStr);
                if (this.chartDays <= 0.0417) {
                    // Only for 15min, 30min, 60min - show minute format
                    return date.toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                    });
                } else {
                    // For 6+ hours, show hour format
                    return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
                }
            } else if (dateStr.includes(' ')) {
                // Hourly data without minutes
                const date = new Date(dateStr);
                return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
            } else {
                // Daily data
                const date = new Date(dateStr);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
        });
        
        const sentimentScores = distributionData.map(item => item.sentiment_score);
        const positiveData = distributionData.map(item => item.positive);
        const negativeData = distributionData.map(item => item.negative);
        
        // Create gradient for sentiment score line
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.3)');
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0.05)');
        
        this.sentimentChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Sentiment Score',
                        data: sentimentScores,
                        borderColor: '#8b5cf6',
                        backgroundColor: gradient,
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: sentimentScores.map(score => score > 0 ? '#22c55e' : score < 0 ? '#ef4444' : '#6b7280'),
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Positive Articles',
                        data: positiveData,
                        type: 'bar',
                        backgroundColor: 'rgba(34, 197, 94, 0.6)',
                        borderColor: '#22c55e',
                        borderWidth: 1,
                        yAxisID: 'y1',
                        order: 2
                    },
                    {
                        label: 'Negative Articles',
                        data: negativeData,
                        type: 'bar',
                        backgroundColor: 'rgba(239, 68, 68, 0.6)',
                        borderColor: '#ef4444',
                        borderWidth: 1,
                        yAxisID: 'y1',
                        order: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 10,
                        bottom: 10,
                        left: 10,
                        right: 10
                    }
                },
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    title: {
                        display: true,
                        text: this.getChartTitle(this.chartDays),
                        color: '#e5e7eb',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: '#e5e7eb',
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#e5e7eb',
                        borderColor: '#6b7280',
                        borderWidth: 1,
                        callbacks: {
                            title: function(context) {
                                const dataIndex = context[0].dataIndex;
                                const item = distributionData[dataIndex];
                                return `${item.date} (${item.total} articles)`;
                            },
                            afterBody: function(context) {
                                const dataIndex = context[0].dataIndex;
                                const item = distributionData[dataIndex];
                                
                                let trend = '';
                                if (item.trend === 'up') {
                                    trend = '↗ Trending Up';
                                } else if (item.trend === 'down') {
                                    trend = '↘ Trending Down';
                                } else {
                                    trend = '→ Neutral Trend';
                                }
                                
                                return [
                                    '',
                                    trend,
                                    `Positive: ${item.positive} articles (${Math.round(item.positive_confidence * 100)}% avg confidence)`,
                                    `Negative: ${item.negative} articles (${Math.round(item.negative_confidence * 100)}% avg confidence)`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(107, 114, 128, 0.2)',
                        },
                        ticks: {
                            color: '#9ca3af',
                            font: {
                                size: 11
                            },
                            // For minute-level data, show fewer ticks to avoid crowding
                            maxTicksLimit: this.chartDays <= 0.0417 ? 10 : 20,
                            callback: function(value, index, values) {
                                // For minute-level data, show every 5th or 10th tick
                                if (this.chart.chartArea && this.chart.chartArea.width) {
                                    const chartDays = this.chart.sentimentAnalyzer?.chartDays || 7;
                                    if (chartDays <= 0.0417) {
                                        // For short periods (15min, 30min, 60min), show every few minutes
                                        const totalTicks = values.length;
                                        const skipInterval = Math.max(1, Math.floor(totalTicks / 8));
                                        return (index % skipInterval === 0) ? this.getLabelForValue(value) : '';
                                    }
                                }
                                return this.getLabelForValue(value);
                            }
                        }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Sentiment Score',
                            color: '#e5e7eb'
                        },
                        grid: {
                            color: 'rgba(107, 114, 128, 0.2)',
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
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Article Count',
                            color: '#e5e7eb'
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
                elements: {
                    point: {
                        hoverBackgroundColor: '#ffffff'
                    }
                },
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart',
                    resize: {
                        duration: 0
                    },
                    // Smooth animation for data updates
                    onComplete: function() {
                        // Update last refresh time
                        const now = new Date();
                        const timeString = now.toLocaleTimeString();
                        console.log(`[CHART] Chart updated at ${timeString}`);
                    }
                },
                onResize: function(chart, size) {
                    // Prevent excessive resizing
                    chart.resize(size.width, 400);
                }
            }
        });
        
        // Add trend indicators
        this.addTrendIndicators(distributionData);
    }

    getChartTitle(days) {
        if (days <= 0.04) {
            return 'Live Sentiment Analysis Trends (Last 1 hour)';
        } else if (days <= 0.25) {
            return 'Live Sentiment Analysis Trends (Last 6 hours)';
        } else if (days <= 1) {
            return 'Live Sentiment Analysis Trends (Last 24 hours)';
        } else if (days <= 7) {
            return `Live Sentiment Analysis Trends (Last ${days} days)`;
        } else {
            return `Live Sentiment Analysis Trends (Last ${days} days)`;
        }
    }

    addTrendIndicators(distributionData) {
        // Create trend indicators overlay
        const container = document.getElementById('sentimentChartContainer');
        
        // Remove existing trend indicators
        const existingIndicators = container.querySelectorAll('.trend-indicator');
        existingIndicators.forEach(indicator => indicator.remove());
        
        // Add trend summary
        const trendSummary = document.createElement('div');
        trendSummary.className = 'trend-indicator flex justify-center mt-4 space-x-6 text-sm';
        
        const upCount = distributionData.filter(item => item.trend === 'up').length;
        const downCount = distributionData.filter(item => item.trend === 'down').length;
        const neutralCount = distributionData.filter(item => item.trend === 'neutral').length;
        
        // Calculate total positive and negative analyses (not just trend days)
        const totalPositive = distributionData.reduce((sum, item) => sum + item.positive, 0);
        const totalNegative = distributionData.reduce((sum, item) => sum + item.negative, 0);
        const totalAnalyses = totalPositive + totalNegative;
        
        const avgScore = distributionData.length > 0 
            ? distributionData.reduce((sum, item) => sum + item.sentiment_score, 0) / distributionData.length
            : 0;
        
        // More responsive thresholds for trend detection
        // Consider the balance of positive vs negative articles, not just average score
        const totalPositiveArticles = distributionData.reduce((sum, item) => sum + item.positive, 0);
        const totalNegativeArticles = distributionData.reduce((sum, item) => sum + item.negative, 0);
        
        let overallTrend;
        if (totalPositiveArticles > totalNegativeArticles && avgScore >= 0) {
            overallTrend = 'positive';
        } else if (totalNegativeArticles > totalPositiveArticles && avgScore <= 0) {
            overallTrend = 'negative';
        } else if (avgScore === 0.0) {
            overallTrend = 'neutral';
        } else if (avgScore > 0) {
            overallTrend = 'positive';
        } else {
            overallTrend = 'negative';
        }
        
        const trendIcon = overallTrend === 'positive' ? '↗' : overallTrend === 'negative' ? '↘' : '→';
        
        trendSummary.innerHTML = `
            <div class="bg-black/20 rounded-lg px-4 py-2">
                <span class="text-gray-400">Overall Trend:</span>
                <span class="ml-2 font-semibold ${overallTrend === 'positive' ? 'text-green-400' : overallTrend === 'negative' ? 'text-red-400' : 'text-gray-400'}">
                    ${trendIcon} ${overallTrend.charAt(0).toUpperCase() + overallTrend.slice(1)} (${avgScore.toFixed(1)})
                </span>
            </div>
            <div class="bg-black/20 rounded-lg px-4 py-2">
                <span class="text-green-400">↗ ${totalPositive} Positive</span>
                <span class="text-gray-400 mx-2">•</span>
                <span class="text-red-400">↘ ${totalNegative} Negative</span>
                <span class="text-gray-400 mx-2">•</span>
                <span class="text-gray-400">→ ${totalAnalyses - totalPositive - totalNegative} Neutral</span>
            </div>
        `;
        
        container.appendChild(trendSummary);
    }

    updateSentimentChart(days) {
        this.loadSentimentDistribution(parseFloat(days));
    }

    refreshSentimentChart() {
        this.loadSentimentDistribution(this.chartDays);
    }

    async clearLiveAnalysisData() {
        try {
            // Show confirmation dialog
            if (!confirm('Are you sure you want to clear all live analysis data from the chart? This will reset the sentiment trends chart.')) {
                return;
            }

            const response = await fetch('/chart/clear-live-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.message) {
                this.showNotification('Live analysis data cleared successfully!', 'success');
                // Refresh the chart to show empty state
                this.loadSentimentDistribution(this.chartDays);
            } else {
                throw new Error(data.error || 'Failed to clear live analysis data');
            }

        } catch (error) {
            console.error('Error clearing live analysis data:', error);
            this.showNotification('Failed to clear live analysis data: ' + error.message, 'error');
        }
    }

    // Method to trigger chart refresh when new analysis is completed
    onNewAnalysisCompleted() {
        // Immediately refresh the chart when a new analysis is done
        this.loadSentimentDistribution(this.chartDays);
    }

    async translateSummary(summaryId) {
        const summaryTextElement = document.getElementById(`summary-text-${summaryId}`);
        const translateBtn = document.getElementById(`translate-btn-${summaryId}`);
        const loadingElement = document.getElementById(`loading-${summaryId}`);
        const translationInfo = document.getElementById(`translation-info-${summaryId}`);
        
        if (!summaryTextElement || !translateBtn) {
            console.error('Summary elements not found');
            return;
        }

        const originalText = summaryTextElement.textContent.trim();
        
        // If already translated, show original
        if (translateBtn.dataset.translated === 'true') {
            summaryTextElement.textContent = translateBtn.dataset.originalText;
            translateBtn.innerHTML = '<i class="fas fa-language"></i><span>EN</span>';
            translateBtn.title = 'Translate to English';
            translateBtn.dataset.translated = 'false';
            translationInfo.classList.add('hidden');
            return;
        }

        try {
            // Store original text
            translateBtn.dataset.originalText = originalText;
            
            // Show loading
            summaryTextElement.classList.add('hidden');
            loadingElement.classList.remove('hidden');
            translateBtn.disabled = true;

            const response = await fetch('/translate-text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: originalText
                })
            });

            const result = await response.json();

            if (result.success && result.translatedText) {
                summaryTextElement.textContent = result.translatedText;
                translateBtn.innerHTML = '<i class="fas fa-undo"></i><span>Original</span>';
                translateBtn.title = 'Show original text';
                translateBtn.dataset.translated = 'true';
                translationInfo.classList.remove('hidden');
                
                this.showNotification('Summary translated to English!', 'success');
            } else {
                throw new Error(result.error || 'Translation failed');
            }
        } catch (error) {
            console.error('Translation error:', error);
            this.showNotification('Translation failed: ' + error.message, 'error');
        } finally {
            // Hide loading
            summaryTextElement.classList.remove('hidden');
            loadingElement.classList.add('hidden');
            translateBtn.disabled = false;
        }
    }

    toggleTranslation(summaryId) {
        const originalElement = document.getElementById(`summary-text-${summaryId}`);
        const translationElement = document.getElementById(`summary-translation-${summaryId}`);
        const toggleBtn = document.getElementById(`toggle-translation-${summaryId}`);
        
        if (originalElement && translationElement && toggleBtn) {
            const isShowingOriginal = !originalElement.classList.contains('hidden');
            
            if (isShowingOriginal) {
                // Show translation
                originalElement.classList.add('hidden');
                translationElement.classList.remove('hidden');
                toggleBtn.innerHTML = '<i class="fas fa-undo"></i><span>Original</span>';
                toggleBtn.title = 'Show original text';
            } else {
                // Show original
                originalElement.classList.remove('hidden');
                translationElement.classList.add('hidden');
                toggleBtn.innerHTML = '<i class="fas fa-language"></i><span>EN</span>';
                toggleBtn.title = 'Show English translation';
            }
        }
    }
}

// Global functions for HTML onclick handlers
function scrollToAnalyze() {
    document.getElementById('analyze').scrollIntoView({ behavior: 'smooth' });
}

function setInputMethod(method) {
    sentimentAnalyzer.setInputMethod(method);
}

function updateCharCount(textarea) {
    sentimentAnalyzer.updateCharCount(textarea);
}

function toggleAdvanced() {
    sentimentAnalyzer.toggleAdvanced();
}

function loadHistory() {
    sentimentAnalyzer.loadHistory();
}

function clearHistory() {
    sentimentAnalyzer.clearHistory();
}

function clearForm() {
    sentimentAnalyzer.clearForm();
}

function loadTrendingNews(category) {
    sentimentAnalyzer.loadTrendingNews(category);
}

function refreshTrendingNews() {
    sentimentAnalyzer.refreshTrendingNews();
}

function updateSentimentChart(days) {
    sentimentAnalyzer.updateSentimentChart(days);
}

function refreshSentimentChart() {
    sentimentAnalyzer.refreshSentimentChart();
}

function clearLiveAnalysisData() {
    sentimentAnalyzer.clearLiveAnalysisData();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.sentimentAnalyzer = new SentimentAnalyzer();
    
    // Note: trending news is already loaded in the constructor, no need to call again
    
    // Add CSS classes for input method buttons
    const style = document.createElement('style');
    style.textContent = `
        .input-method-btn {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #cbd5e1;
        }
        .input-method-btn:hover {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.3);
            color: white;
            transform: translateY(-2px);
        }
        .input-method-btn.active {
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            border-color: #3b82f6;
            color: white;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
        .news-category-btn {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #cbd5e1;
        }
        .news-category-btn:hover {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.3);
            color: white;
            transform: translateY(-2px);
        }
        .news-category-btn.active {
            background: linear-gradient(135deg, #f97316, #ef4444);
            border-color: #f97316;
            color: white;
            box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
        }
    `;
    document.head.appendChild(style);
});

// Global function for trending news analysis
window.analyzeTrendingNewsAll = async function() {
    const button = event.target;
    const originalText = button.innerHTML;
    
    button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Analyzing...';
    button.disabled = true;
    
    try {
        const response = await fetch('/analyze-trending-all', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to analyze trending news');
        }
        
        const result = await response.json();
        
        // Show success notification
        if (window.sentimentAnalyzer) {
            window.sentimentAnalyzer.showNotification('Trending news analyzed successfully! Data added to stock chart.', 'success');
        } else {
            alert('Trending news analyzed successfully! Data added to stock chart.');
        }
        
        // Optional: Open stock chart if user wants
        if (confirm('Trending news analysis complete! Open stock chart to view results?')) {
            window.open('/stock-chart', '_blank');
        }
        
    } catch (error) {
        console.error('Error analyzing trending news:', error);
        if (window.sentimentAnalyzer) {
            window.sentimentAnalyzer.showNotification('Failed to analyze trending news. Please try again.', 'error');
        } else {
            alert('Failed to analyze trending news. Please try again.');
        }
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
};

// Video modal functions
function openDemoVideo() {
    const modal = document.getElementById('demo-video-modal');
    const video = document.getElementById('demo-video');
    if (modal && video) {
        modal.style.display = 'flex';
        // Optional: Auto-play video when modal opens
        video.currentTime = 0; // Start from beginning
    }
}

function closeDemoVideo() {
    const modal = document.getElementById('demo-video-modal');
    const video = document.getElementById('demo-video');
    if (modal && video) {
        modal.style.display = 'none';
        video.pause(); // Pause video when modal closes
        video.currentTime = 0; // Reset to beginning
    }
}

// Close modal when clicking outside the video
window.addEventListener('click', function(event) {
    const modal = document.getElementById('demo-video-modal');
    if (event.target === modal) {
        closeDemoVideo();
    }
});

// Close modal with Escape key
window.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modal = document.getElementById('demo-video-modal');
        if (modal && modal.style.display === 'flex') {
            closeDemoVideo();
        }
    }
});

