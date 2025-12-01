

class WeatherStationAI {
    constructor() {
        this.apiKey = localStorage.getItem('gemini_api_key') || '';
        this.weatherData = {};
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.voices = [];
        this.isListening = false;

        this.init();
    }

    init() {
        // Setup event listeners
        document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });

        document.getElementById('clearChat').addEventListener('click', () => this.clearChat());
        document.getElementById('voiceBtn').addEventListener('click', () => this.toggleVoiceRecognition());

        // Load voices for TTS - chờ một chút để trình duyệt load xong
        setTimeout(() => {
            this.loadVoices();
        }, 100);

        if (this.synthesis.onvoiceschanged !== undefined) {
            this.synthesis.onvoiceschanged = () => this.loadVoices();
        }

        // Initialize Speech Recognition
        this.initSpeechRecognition();

        // Fetch weather data every 2 seconds
        this.fetchWeatherData();
        setInterval(() => this.fetchWeatherData(), 2000);

        this.updateStatus('Sẵn sàng');
    }

    loadVoices() {
        this.voices = this.synthesis.getVoices();

        if (this.voices.length === 0) {
            console.log('No voices loaded yet, waiting...');
            return;
        }

        const voiceSelect = document.getElementById('voiceSelect');
        voiceSelect.innerHTML = '';

        console.log('Available voices:', this.voices.length);

        // Prioritize Vietnamese voices
        const vietnameseVoices = this.voices.filter(voice =>
            voice.lang.toLowerCase().includes('vi') ||
            voice.name.toLowerCase().includes('viet')
        );

        const otherVoices = this.voices.filter(voice =>
            !voice.lang.toLowerCase().includes('vi') &&
            !voice.name.toLowerCase().includes('viet')
        );

        console.log('Vietnamese voices found:', vietnameseVoices.length);

        if (vietnameseVoices.length > 0) {
            const optgroup1 = document.createElement('optgroup');
            optgroup1.label = '🇻🇳 Tiếng Việt';
            vietnameseVoices.forEach((voice) => {
                const option = document.createElement('option');
                option.value = this.voices.indexOf(voice);
                option.textContent = `${voice.name} (${voice.lang})`;
                optgroup1.appendChild(option);
            });
            voiceSelect.appendChild(optgroup1);
        } else {
            // Nếu không có giọng tiếng Việt, chọn giọng mặc định
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Giọng mặc định của trình duyệt';
            voiceSelect.appendChild(option);
        }

        if (otherVoices.length > 0) {
            const optgroup2 = document.createElement('optgroup');
            optgroup2.label = '🌍 Ngôn ngữ khác';
            otherVoices.forEach((voice) => {
                const option = document.createElement('option');
                option.value = this.voices.indexOf(voice);
                option.textContent = `${voice.name} (${voice.lang})`;
                optgroup2.appendChild(option);
            });
            voiceSelect.appendChild(optgroup2);
        }
    }

    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('Speech Recognition not supported');
            document.getElementById('voiceBtn').disabled = true;
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.lang = 'vi-VN';
        this.recognition.continuous = false;
        this.recognition.interimResults = false;

        this.recognition.onstart = () => {
            this.isListening = true;
            document.getElementById('voiceBtn').classList.add('listening');
            document.getElementById('voiceStatus').textContent = '🎤 Đang nghe...';
            this.updateStatus('Đang lắng nghe...');
        };

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            document.getElementById('chatInput').value = transcript;
            this.sendMessage();
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.isListening = false;
            document.getElementById('voiceBtn').classList.remove('listening');
            document.getElementById('voiceStatus').textContent = '';
            this.updateStatus('Lỗi nhận dạng giọng nói');
        };

        this.recognition.onend = () => {
            this.isListening = false;
            document.getElementById('voiceBtn').classList.remove('listening');
            document.getElementById('voiceStatus').textContent = '';
        };
    }

    toggleVoiceRecognition() {
        if (!this.recognition) {
            alert('Trình duyệt không hỗ trợ nhận dạng giọng nói');
            return;
        }

        if (this.isListening) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    }

    async fetchWeatherData() {
        try {
            const response = await fetch('/api/weather');
            if (response.ok) {
                this.weatherData = await response.json();
                this.updateDashboard();
            }
        } catch (error) {
            console.error('Error fetching weather data:', error);
        }
    }

    updateDashboard() {
        document.getElementById('temperature').textContent = `${this.weatherData.temperature || '--'}°C`;
        document.getElementById('humidity').textContent = `${this.weatherData.humidity || '--'}%`;
        document.getElementById('rain_level').textContent = `${this.weatherData.rain_level || '--'}%`;
        document.getElementById('wind_speed').textContent = `${this.weatherData.wind_speed || '--'} km/h`;
        document.getElementById('pressure').textContent = `${this.weatherData.pressure || '--'} hPa`;
        document.getElementById('rain_status').textContent = this.weatherData.rain_status || '--';

        // Update realtime charts
        if (window.realtimeCharts && this.weatherData.temperature !== undefined) {
            window.realtimeCharts.addDataPoint(this.weatherData);
        }
    }

    async sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();

        if (!message) return;

        if (!this.apiKey) {
            alert('Vui lòng nhập Gemini API key trong phần cài đặt!');
            return;
        }

        // Add user message
        this.addMessage(message, 'user');
        input.value = '';

        // Show typing indicator
        this.addTypingIndicator();

        // Disable send button
        const sendBtn = document.getElementById('sendBtn');
        sendBtn.disabled = true;
        this.updateStatus('Đang xử lý...');

        try {
            const response = await this.callOpenAI(message);
            this.removeTypingIndicator();
            this.addMessage(response, 'bot');

            // Auto speak if enabled
            if (document.getElementById('autoSpeak').checked) {
                this.speak(response);
            }
        } catch (error) {
            this.removeTypingIndicator();
            this.addMessage('Xin lỗi, đã có lỗi xảy ra: ' + error.message, 'bot');
        } finally {
            sendBtn.disabled = false;
            this.updateStatus('Sẵn sàng');
        }
    }

    // Lấy xu hướng từ dữ liệu biểu đồ
    getTrendAnalysis() {
        if (!window.realtimeCharts) return '';

        const charts = window.realtimeCharts;
        const trends = [];

        const analyzeTrend = (key, label, unit) => {
            const data = charts.data[key];
            if (data.length < 3) return null;

            const recent = data.slice(-5); // 5 điểm gần nhất
            const first = recent[0].value;
            const last = recent[recent.length - 1].value;
            const diff = last - first;
            const avgChange = diff / (recent.length - 1);

            let trend = 'ổn định';
            if (avgChange > 0.1) trend = 'đang tăng';
            else if (avgChange < -0.1) trend = 'đang giảm';

            const min = Math.min(...data.map(d => d.value));
            const max = Math.max(...data.map(d => d.value));

            return `${label}: ${trend} (dao động ${min.toFixed(1)}-${max.toFixed(1)}${unit} trong ${data.length * 2}s gần đây)`;
        };

        const tempTrend = analyzeTrend('temperature', 'Nhiệt độ', '°C');
        const humidTrend = analyzeTrend('humidity', 'Độ ẩm', '%');
        const rainTrend = analyzeTrend('rain', 'Mức mưa', '%');
        const windTrend = analyzeTrend('wind', 'Gió', 'km/h');
        const pressTrend = analyzeTrend('pressure', 'Áp suất', 'hPa');

        [tempTrend, humidTrend, rainTrend, windTrend, pressTrend].forEach(t => {
            if (t) trends.push(t);
        });

        return trends.length > 0 ? '\n\nXU HƯỚNG BIỂU ĐỒ (phút gần đây):\n' + trends.join('\n') : '';
    }

    async callOpenAI(userMessage) {
        const trendAnalysis = this.getTrendAnalysis();

        const systemPrompt = `Bạn là trợ lý AI thông minh và thân thiện.

Dữ liệu thời tiết hiện tại (từ cảm biến thực tế):
- Nhiệt độ: ${this.weatherData.temperature}°C
- Độ ẩm: ${this.weatherData.humidity}%
- Mức mưa: ${this.weatherData.rain_level}%
- Trạng thái mưa: ${this.weatherData.rain_status}
- Tốc độ gió: ${this.weatherData.wind_speed} km/h
- Áp suất khí quyển: ${this.weatherData.pressure} hPa
${trendAnalysis}

Khi được hỏi về THỜI TIẾT:
- Phân tích dữ liệu cảm biến và xu hướng biểu đồ để đưa ra thông tin chính xác
- Nếu có xu hướng đáng chú ý (nhiệt độ tăng/giảm, áp suất giảm...), hãy đề cập
- Gợi ý ăn mặc phù hợp (áo mỏng/dày, mang ô, áo mưa...)
- Gợi ý hoạt động (có nên ra ngoài, thể thao, dã ngoại...)
- Dự đoán xu hướng (áp suất thấp/giảm → có thể mưa, áp suất cao/tăng → trời đẹp)
- Cảnh báo sức khỏe nếu cần (nóng/lạnh quá, độ ẩm cao...)

Khi được hỏi NGOÀI phạm vi thời tiết:
- Vẫn trả lời bình thường như một AI trợ lý thông minh
- Có thể trò chuyện về nhiều chủ đề khác
- Giữ phong cách thân thiện, hữu ích

Phong cách trả lời:
- Ngắn gọn, rõ ràng (2-4 câu)
- Thân thiện, dễ hiểu
- Sử dụng tiếng Việt tự nhiên`;

        // Gemini API endpoint - sử dụng gemini-2.5-flash-lite (model nhẹ, ổn định)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${this.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: systemPrompt + '\n\nCâu hỏi: ' + userMessage
                    }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000,
                    responseModalities: ["TEXT"]
                },
                safetySettings: [
                    {
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_NONE"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH",
                        threshold: "BLOCK_NONE"
                    },
                    {
                        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold: "BLOCK_NONE"
                    },
                    {
                        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold: "BLOCK_NONE"
                    }
                ]
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }

        const data = await response.json();

        // Debug: Log response để kiểm tra
        console.log('Gemini API Response:', data);
        console.log('Candidate[0]:', data.candidates[0]);

        // Kiểm tra xem có candidates không
        if (!data.candidates || data.candidates.length === 0) {
            throw new Error('Không nhận được phản hồi từ AI');
        }

        const candidate = data.candidates[0];

        // Kiểm tra nếu bị block vì safety settings
        if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'BLOCKED_REASON') {
            throw new Error('Câu hỏi bị chặn bởi bộ lọc an toàn. Vui lòng thử câu hỏi khác.');
        }

        // Kiểm tra nếu không có content (có thể bị block hoặc lỗi khác)
        if (!candidate.content) {
            console.error('No content, finishReason:', candidate.finishReason);
            console.error('Full candidate:', JSON.stringify(candidate, null, 2));
            throw new Error('AI không thể trả lời câu hỏi này. Thử: "Nhiệt độ bây giờ thế nào?"');
        }

        // Kiểm tra xem có parts không
        if (!candidate.content.parts || candidate.content.parts.length === 0) {
            console.error('No parts in content:', candidate.content);
            throw new Error('Phản hồi từ AI không có nội dung');
        }

        // Lấy text từ part đầu tiên
        const text = candidate.content.parts[0].text;
        if (!text) {
            console.error('No text in part:', candidate.content.parts[0]);
            throw new Error('Không tìm thấy nội dung text trong phản hồi');
        }

        return text;
    }

    speak(text) {
        // Cancel any ongoing speech
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        const selectedVoiceIndex = document.getElementById('voiceSelect').value;

        if (selectedVoiceIndex && this.voices[selectedVoiceIndex]) {
            utterance.voice = this.voices[selectedVoiceIndex];
        }

        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onstart = () => {
            this.updateStatus('Đang đọc...');
        };

        utterance.onend = () => {
            this.updateStatus('Sẵn sàng');
        };

        this.synthesis.speak(utterance);
    }

    addMessage(text, type) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        const avatar = type === 'user' ? '👤' : '🤖';
        const name = type === 'user' ? 'Bạn' : 'AI Assistant';

        messageDiv.innerHTML = `
            <div class="avatar">${avatar}</div>
            <div class="text">
                <strong>${name}</strong>
                <p>${text}</p>
            </div>
        `;

        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    addTypingIndicator() {
        const messagesContainer = document.getElementById('chatMessages');
        const indicatorDiv = document.createElement('div');
        indicatorDiv.className = 'message bot typing-indicator-message';
        indicatorDiv.innerHTML = `
            <div class="avatar">🤖</div>
            <div class="text">
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        messagesContainer.appendChild(indicatorDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    removeTypingIndicator() {
        const indicator = document.querySelector('.typing-indicator-message');
        if (indicator) {
            indicator.remove();
        }
    }

    clearChat() {
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.innerHTML = `
            <div class="message bot">
                <div class="avatar">🤖</div>
                <div class="text">
                    <strong>AI Assistant</strong>
                    <p>Xin chào! Tôi là trợ lý AI của trạm thời tiết. Bạn có thể hỏi tôi về nhiệt độ, độ ẩm, tốc độ gió, hay bất kỳ thông tin thời tiết nào!</p>
                </div>
            </div>
        `;
    }

    updateStatus(text) {
        document.getElementById('statusText').textContent = text;
    }
}

// ==================== Realtime Charts ====================
class RealtimeCharts {
    constructor() {
        this.maxDataPoints = 30; // Hiển thị 30 điểm dữ liệu (~1 phút với interval 2s)
        this.data = {
            temperature: [],
            humidity: [],
            rain: [],
            wind: [],
            pressure: []
        };
        this.charts = {};
        this.colors = {
            temperature: { line: '#FF6B6B', fill: 'rgba(255, 107, 107, 0.2)' },
            humidity: { line: '#4ECDC4', fill: 'rgba(78, 205, 196, 0.2)' },
            rain: { line: '#45B7D1', fill: 'rgba(69, 183, 209, 0.2)' },
            wind: { line: '#96CEB4', fill: 'rgba(150, 206, 180, 0.2)' },
            pressure: { line: '#667eea', fill: 'rgba(102, 126, 234, 0.2)' }
        };
        // Minimum range để biểu đồ không bị scale quá nhạy
        this.minRanges = {
            temperature: 5,   // Tối thiểu 5°C range
            humidity: 10,     // Tối thiểu 10% range
            rain: 20,         // Tối thiểu 20% range
            wind: 5,          // Tối thiểu 5 km/h range
            pressure: 10      // Tối thiểu 10 hPa range
        };
        this.init();
    }

    init() {
        this.charts = {
            temperature: document.getElementById('tempChart'),
            humidity: document.getElementById('humidityChart'),
            rain: document.getElementById('rainChart'),
            wind: document.getElementById('windChart'),
            pressure: document.getElementById('pressureChart')
        };
    }

    addDataPoint(weatherData) {
        const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        this.pushData('temperature', weatherData.temperature, time);
        this.pushData('humidity', weatherData.humidity, time);
        this.pushData('rain', weatherData.rain_level, time);
        this.pushData('wind', weatherData.wind_speed, time);
        this.pushData('pressure', weatherData.pressure, time);

        this.drawAllCharts();
    }

    pushData(key, value, time) {
        if (value === undefined || value === null || isNaN(value)) return;

        this.data[key].push({ value: parseFloat(value), time: time });

        if (this.data[key].length > this.maxDataPoints) {
            this.data[key].shift();
        }
    }

    drawAllCharts() {
        this.drawChart('temperature', '°C');
        this.drawChart('humidity', '%');
        this.drawChart('rain', '%');
        this.drawChart('wind', 'km/h');
        this.drawChart('pressure', 'hPa');
    }

    drawChart(key, unit) {
        const canvas = this.charts[key];
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const data = this.data[key];

        if (data.length < 2) {
            this.drawEmptyChart(ctx, canvas, unit);
            return;
        }

        // Set canvas size
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        const width = rect.width;
        const height = rect.height;
        const padding = { top: 20, right: 50, bottom: 25, left: 10 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Calculate min/max
        const values = data.map(d => d.value);
        let min = Math.min(...values);
        let max = Math.max(...values);

        // Đảm bảo range tối thiểu để biểu đồ không nhảy lung tung
        const minRange = this.minRanges[key] || 5;
        let range = max - min;

        if (range < minRange) {
            const center = (max + min) / 2;
            min = center - minRange / 2;
            max = center + minRange / 2;
        } else {
            // Add padding to range
            min = min - range * 0.1;
            max = max + range * 0.1;
        }

        // Draw grid
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (chartHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
        }

        // Draw fill area
        const colors = this.colors[key];
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top + chartHeight);

        data.forEach((point, i) => {
            const x = padding.left + (i / (data.length - 1)) * chartWidth;
            const y = padding.top + chartHeight - ((point.value - min) / (max - min)) * chartHeight;
            if (i === 0) {
                ctx.lineTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
        ctx.closePath();
        ctx.fillStyle = colors.fill;
        ctx.fill();

        // Draw line
        ctx.beginPath();
        ctx.strokeStyle = colors.line;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';

        data.forEach((point, i) => {
            const x = padding.left + (i / (data.length - 1)) * chartWidth;
            const y = padding.top + chartHeight - ((point.value - min) / (max - min)) * chartHeight;
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // Draw current value
        const lastPoint = data[data.length - 1];
        const lastX = width - padding.right;
        const lastY = padding.top + chartHeight - ((lastPoint.value - min) / (max - min)) * chartHeight;

        // Draw point
        ctx.beginPath();
        ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
        ctx.fillStyle = colors.line;
        ctx.fill();

        // Draw value label
        ctx.fillStyle = '#333';
        ctx.font = 'bold 11px Segoe UI';
        ctx.textAlign = 'left';
        ctx.fillText(lastPoint.value.toFixed(1) + unit, lastX + 5, lastY + 4);

        // Draw min/max labels
        ctx.fillStyle = '#999';
        ctx.font = '9px Segoe UI';
        ctx.textAlign = 'right';
        ctx.fillText(max.toFixed(1), width - padding.right - 5, padding.top + 8);
        ctx.fillText(min.toFixed(1), width - padding.right - 5, height - padding.bottom - 2);
    }

    drawEmptyChart(ctx, canvas, unit) {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        ctx.clearRect(0, 0, rect.width, rect.height);
        ctx.fillStyle = '#999';
        ctx.font = '12px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText('Đang thu thập dữ liệu...', rect.width / 2, rect.height / 2);
    }
}

// ==================== OTA Update Handler ====================
class OTAUpdater {
    constructor() {
        this.uploadBtn = document.getElementById('uploadBtn');
        this.fileInput = document.getElementById('firmwareFile');
        this.progressDiv = document.getElementById('otaProgress');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.statusDiv = document.getElementById('otaStatus');
        this.versionSpan = document.getElementById('currentVersion');

        this.init();
    }

    init() {
        this.uploadBtn.addEventListener('click', () => this.uploadFirmware());
        this.fetchVersion();
    }

    async fetchVersion() {
        try {
            const response = await fetch('/api/version');
            if (response.ok) {
                const data = await response.json();
                this.versionSpan.textContent = data.version || 'v1.0';
            }
        } catch (error) {
            console.log('Version API not available');
        }
    }

    async uploadFirmware() {
        const file = this.fileInput.files[0];

        if (!file) {
            this.showStatus('Vui lòng chọn file firmware (.bin)', 'error');
            return;
        }

        if (!file.name.endsWith('.bin')) {
            this.showStatus('File không hợp lệ. Vui lòng chọn file .bin', 'error');
            return;
        }

        // Confirm before upload
        if (!confirm(`Bạn có chắc muốn cập nhật firmware?\n\nFile: ${file.name}\nKích thước: ${(file.size / 1024).toFixed(2)} KB\n\nESP32 sẽ khởi động lại sau khi cập nhật.`)) {
            return;
        }

        this.uploadBtn.disabled = true;
        this.progressDiv.style.display = 'block';
        this.showStatus('Đang upload firmware...', 'info');

        const formData = new FormData();
        formData.append('firmware', file);

        try {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
                    this.progressFill.style.width = percent + '%';
                    this.progressText.textContent = percent + '%';
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    this.showStatus('Cập nhật thành công! ESP32 đang khởi động lại...', 'success');
                    setTimeout(() => {
                        this.showStatus('Đang kết nối lại...', 'info');
                        setTimeout(() => location.reload(), 5000);
                    }, 3000);
                } else {
                    this.showStatus('Lỗi: ' + (xhr.responseText || 'Upload thất bại'), 'error');
                    this.uploadBtn.disabled = false;
                }
            });

            xhr.addEventListener('error', () => {
                this.showStatus('Lỗi kết nối. Vui lòng thử lại.', 'error');
                this.uploadBtn.disabled = false;
            });

            xhr.open('POST', '/update');
            xhr.send(formData);

        } catch (error) {
            this.showStatus('Lỗi: ' + error.message, 'error');
            this.uploadBtn.disabled = false;
        }
    }

    showStatus(message, type) {
        this.statusDiv.textContent = message;
        this.statusDiv.className = 'ota-status ' + type;
    }
}

// ==================== Realtime Clock ====================
function updateClock() {
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };
    const clockEl = document.getElementById('realtimeClock');
    if (clockEl) {
        clockEl.textContent = now.toLocaleString('vi-VN', options);
    }
}

// ==================== Email Settings Handler ====================
class EmailSettings {
    constructor() {
        this.saveBtn = document.getElementById('saveEmailBtn');
        this.testBtn = document.getElementById('testEmailBtn');
        this.statusDiv = document.getElementById('emailStatus');

        this.init();
    }

    init() {
        // Save settings
        this.saveBtn.addEventListener('click', () => this.saveSettings());

        // Test email
        this.testBtn.addEventListener('click', () => this.testEmail());

        // Load settings
        this.loadSettings();
    }

    async loadSettings() {
        try {
            const response = await fetch('/api/email');
            if (response.ok) {
                const data = await response.json();
                document.getElementById('emailEnabled').checked = data.enabled || false;
                document.getElementById('emailSender').value = data.sender || '';
                document.getElementById('emailRecipient').value = data.recipient || '';
                document.getElementById('alertTempHigh').value = data.tempHigh || 30;
                document.getElementById('alertTempLow').value = data.tempLow || 20;
                document.getElementById('alertRainLevel').value = data.rainLevel || 50;
                document.getElementById('alertWindSpeed').value = data.windSpeed || 30;
            }
        } catch (error) {
            console.log('Email API not available (firmware v1.0)');
        }
    }

    async saveSettings() {
        this.showStatus('Đang lưu...', 'loading');

        const data = {
            enabled: document.getElementById('emailEnabled').checked,
            sender: document.getElementById('emailSender').value,
            password: document.getElementById('emailPassword').value,
            recipient: document.getElementById('emailRecipient').value,
            tempHigh: parseFloat(document.getElementById('alertTempHigh').value),
            tempLow: parseFloat(document.getElementById('alertTempLow').value),
            rainLevel: parseInt(document.getElementById('alertRainLevel').value),
            windSpeed: parseFloat(document.getElementById('alertWindSpeed').value)
        };

        try {
            const response = await fetch('/api/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                this.showStatus('✓ Đã lưu cài đặt!', 'success');
                document.getElementById('emailPassword').value = '';
            } else {
                this.showStatus('Lỗi khi lưu cài đặt', 'error');
            }
        } catch (error) {
            this.showStatus('Cần firmware v1.1 để sử dụng tính năng này', 'error');
        }
    }

    async testEmail() {
        this.showStatus('Đang gửi email thử...', 'loading');
        this.testBtn.disabled = true;

        try {
            const response = await fetch('/api/email/test', { method: 'POST' });
            const data = await response.json();

            if (data.success) {
                this.showStatus('✓ Email đã được gửi! Kiểm tra hộp thư.', 'success');
            } else {
                this.showStatus('✗ ' + (data.message || 'Gửi email thất bại'), 'error');
            }
        } catch (error) {
            this.showStatus('Cần firmware v1.1 để sử dụng tính năng này', 'error');
        }

        this.testBtn.disabled = false;
    }

    showStatus(message, type) {
        this.statusDiv.textContent = message;
        this.statusDiv.className = 'email-status ' + type;
    }
}

// ==================== Notification Center ====================
class NotificationCenter {
    constructor() {
        this.notifications = JSON.parse(localStorage.getItem('weatherNotifications') || '[]');
        this.notificationBtn = document.getElementById('notificationBtn');
        this.dropdown = document.getElementById('notificationDropdown');
        this.listDiv = document.getElementById('notificationList');
        this.clearBtn = document.getElementById('clearNotifBtn');

        this.init();
    }

    init() {
        // Toggle dropdown
        this.notificationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.dropdown.contains(e.target) && e.target !== this.notificationBtn) {
                this.closeDropdown();
            }
        });

        // Clear all notifications
        this.clearBtn.addEventListener('click', () => this.clearAll());

        // Fetch notifications from ESP32 every 10 seconds
        this.fetchNotifications();
        setInterval(() => this.fetchNotifications(), 10000);

        // Render initial
        this.render();
    }

    toggleDropdown() {
        this.dropdown.classList.toggle('show');
        if (this.dropdown.classList.contains('show')) {
            this.markAllAsRead();
        }
    }

    closeDropdown() {
        this.dropdown.classList.remove('show');
    }

    async fetchNotifications() {
        try {
            const response = await fetch('/api/notifications');
            if (response.ok) {
                const data = await response.json();
                if (data.notifications && data.notifications.length > 0) {
                    // Add new notifications
                    data.notifications.forEach(notif => {
                        if (!this.notifications.find(n => n.id === notif.id)) {
                            this.notifications.unshift({
                                ...notif,
                                unread: true
                            });
                        }
                    });
                    this.save();
                    this.render();
                }
            }
        } catch (error) {
            // API not available (firmware v1.0)
        }
    }

    addNotification(type, title, message) {
        const notification = {
            id: Date.now(),
            type: type,
            title: title,
            message: message,
            time: new Date().toLocaleString('vi-VN'),
            unread: true
        };

        this.notifications.unshift(notification);

        // Keep only last 50 notifications
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(0, 50);
        }

        this.save();
        this.render();
    }

    markAllAsRead() {
        this.notifications.forEach(n => n.unread = false);
        this.save();
        this.render();
    }

    clearAll() {
        this.notifications = [];
        this.save();
        this.render();
    }

    save() {
        localStorage.setItem('weatherNotifications', JSON.stringify(this.notifications));
    }

    getIcon(type) {
        const icons = {
            'hot': '🔥',
            'cold': '❄️',
            'rain': '🌧️',
            'wind': '💨',
            'info': 'ℹ️',
            'warning': '⚠️',
            'success': '✅'
        };
        return icons[type] || '🔔';
    }

    render() {
        const unreadCount = this.notifications.filter(n => n.unread).length;

        // Update badge
        let badge = this.notificationBtn.querySelector('.badge');
        if (unreadCount > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'badge';
                this.notificationBtn.appendChild(badge);
            }
            badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        } else if (badge) {
            badge.remove();
        }

        // Render list
        if (this.notifications.length === 0) {
            this.listDiv.innerHTML = `
                <div class="notification-empty">
                    <div class="icon">📭</div>
                    <div>Chưa có thông báo nào</div>
                </div>
            `;
            return;
        }

        this.listDiv.innerHTML = this.notifications.map(notif => `
            <div class="notification-item ${notif.unread ? 'unread' : ''}">
                <div class="icon">${this.getIcon(notif.type)}</div>
                <div class="content">
                    <div class="title">${notif.title}</div>
                    <div class="message">${notif.message}</div>
                    <div class="time">${notif.time}</div>
                </div>
            </div>
        `).join('');
    }
}

// Initialize the app when page loads
window.addEventListener('DOMContentLoaded', () => {
    window.weatherApp = new WeatherStationAI();
    window.otaUpdater = new OTAUpdater();
    window.realtimeCharts = new RealtimeCharts();
    window.emailSettings = new EmailSettings();
    window.notificationCenter = new NotificationCenter();

    // Start realtime clock
    updateClock();
    setInterval(updateClock, 1000);
});
