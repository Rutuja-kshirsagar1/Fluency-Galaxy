// ========== STAR ANIMATION ==========
function createStars() {
    const starsContainer = document.getElementById('starsContainer');
    for (let i = 0; i < 150; i++) {
        const star = document.createElement('div');
        star.classList.add('star');
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.width = Math.random() * 3 + 'px';
        star.style.height = star.style.width;
        star.style.animationDelay = Math.random() * 5 + 's';
        star.style.animationDuration = 2 + Math.random() * 4 + 's';
        starsContainer.appendChild(star);
    }
}

function createShootingStars() {
    const shootingContainer = document.getElementById('shootingStarsContainer');
    for (let i = 0; i < 3; i++) {
        const star = document.createElement('div');
        star.classList.add('shooting-star');
        star.style.left = Math.random() * 80 + '%';
        star.style.top = Math.random() * 50 + '%';
        star.style.animationDelay = Math.random() * 10 + 's';
        star.style.animationDuration = 4 + Math.random() * 6 + 's';
        shootingContainer.appendChild(star);
    }
}

createStars();
createShootingStars();

// ========== CSV TOPIC MANAGEMENT ==========
let topicsDB = {
    general: [],
    professional: []
};

let currentCategory = 'general';
let usedTopicsHistory = [];

// Load CSV files
async function loadCSV(filename, category) {
    try {
        const response = await fetch(filename);
        const text = await response.text();
        const lines = text.split('\n').filter(line => line.trim());
        
        // Skip header if exists (check if first line contains 'topic' or 'category')
        let startIndex = 0;
        if (lines[0] && (lines[0].toLowerCase().includes('topic') || lines[0].toLowerCase().includes('category'))) {
            startIndex = 1;
        }
        
        const topics = [];
        for (let i = startIndex; i < lines.length; i++) {
            let topic = lines[i].trim();
            // Remove any CSV quotes and carriage returns
            topic = topic.replace(/^["']|["']$/g, '').replace(/\r/g, '');
            if (topic.length > 0 && topic.length < 300) { // Reasonable topic length
                topics.push(topic);
            }
        }
        
        topicsDB[category] = topics;
        console.log(`✅ Loaded ${topics.length} topics from ${filename}`);
        return topics;
    } catch (error) {
        console.error(`❌ Error loading ${filename}:`, error);
        // Fallback topics if CSV not found
        if (category === 'general') {
            topicsDB.general = [
                "Describe a perfect day in your life",
                "What would you do if you had a million dollars?",
                "The most important lesson life taught you",
                "If you could meet anyone from history, who and why?",
                "What does success mean to you?"
            ];
        } else {
            topicsDB.professional = [
                "How would you handle a difficult coworker?",
                "Describe your dream job and why",
                "What makes a great leader?",
                "How to stay motivated during tough projects?",
                "The future of remote work"
            ];
        }
        return topicsDB[category];
    }
}

function getRandomTopic() {
    const topics = topicsDB[currentCategory];
    if (!topics || topics.length === 0) {
        return "✨ Add topics to your CSV file! ✨";
    }
    
    // Filter out recently used topics
    let available = topics.filter(t => !usedTopicsHistory.includes(t));
    
    if (available.length === 0) {
        usedTopicsHistory = [];
        available = topics;
    }
    
    const chosen = available[Math.floor(Math.random() * available.length)];
    usedTopicsHistory.push(chosen);
    
    // Keep history manageable
    if (usedTopicsHistory.length > 20) {
        usedTopicsHistory.shift();
    }
    
    return chosen;
}

function refreshTopic() {
    const topicText = document.getElementById('topicText');
    topicText.style.opacity = '0';
    setTimeout(() => {
        topicText.innerText = getRandomTopic();
        topicText.style.opacity = '1';
    }, 150);
    topicText.style.transition = 'opacity 0.15s';
}

// ========== TIMER FUNCTIONALITY ==========
let currentPhase = 'idle'; // idle, prep, speak
let timeLeft = 0;
let timerInterval = null;
let isPaused = false;
let prepSeconds = 30;
let speakSeconds = 120;
let speechCounter = 0;
let soundEnabled = true;
let audioContext = null;

// DOM Elements
const timerDisplay = document.getElementById('timerDisplay');
const timeFill = document.getElementById('timeFill');
const phaseLabel = document.getElementById('phaseLabel');
const speechCountSpan = document.getElementById('speechCount');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const newTopicBtn = document.getElementById('newTopicBtn');
const categorySelect = document.getElementById('categorySelect');
const prepSelect = document.getElementById('prepSelect');
const speakSelect = document.getElementById('speakSelect');
const soundToggleBtn = document.getElementById('soundToggleBtn');

function playBeep() {
    if (!soundEnabled) return;
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 880;
        gainNode.gain.value = 0.15;
        oscillator.type = 'sine';
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.8);
        oscillator.stop(audioContext.currentTime + 0.8);
        audioContext.resume();
    } catch(e) {
        console.log('Audio not supported');
    }
}

function updateTimerUI() {
    if (currentPhase === 'idle') {
        timerDisplay.innerText = '00:00';
        timeFill.style.width = '0%';
        return;
    }
    
    const total = (currentPhase === 'prep') ? prepSeconds : speakSeconds;
    const percent = (timeLeft / total) * 100;
    timeFill.style.width = Math.max(0, percent) + '%';
    
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    timerDisplay.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    // Warning color when time is low
    if (timeLeft <= 3 && timeLeft > 0) {
        timerDisplay.style.color = '#ffa0d0';
        timerDisplay.style.textShadow = '0 0 8px #ff44aa';
    } else {
        timerDisplay.style.color = '#aaffdd';
        timerDisplay.style.textShadow = '0 0 10px #0ff';
    }
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function handlePhaseComplete() {
    if (currentPhase === 'prep') {
        playBeep();
        currentPhase = 'speak';
        timeLeft = speakSeconds;
        phaseLabel.innerText = '🎙️ SPEAKING PHASE';
        updateTimerUI();
        startCountdown();
    } else if (currentPhase === 'speak') {
        playBeep();
        stopTimer();
        currentPhase = 'idle';
        phaseLabel.innerText = '✅ SPEECH COMPLETE!';
        speechCounter++;
        speechCountSpan.innerText = speechCounter;
        updateTimerUI();
        
        setTimeout(() => {
            if (currentPhase === 'idle') {
                phaseLabel.innerText = '✨ Ready for next topic';
            }
        }, 2000);
    }
}

function startCountdown() {
    if (timerInterval) stopTimer();
    
    timerInterval = setInterval(() => {
        if (isPaused) return;
        
        if (timeLeft <= 0) {
            stopTimer();
            handlePhaseComplete();
            return;
        }
        
        timeLeft--;
        updateTimerUI();
    }, 1000);
}

function startPractice() {
    if (currentPhase !== 'idle') {
        stopTimer();
        currentPhase = 'idle';
    }
    
    prepSeconds = parseInt(prepSelect.value);
    speakSeconds = parseInt(speakSelect.value);
    currentPhase = 'prep';
    timeLeft = prepSeconds;
    isPaused = false;
    phaseLabel.innerText = '🧠 PREPARATION PHASE';
    pauseBtn.innerText = '⏸ ORBIT PAUSE';
    updateTimerUI();
    startCountdown();
}

function pauseResume() {
    if (currentPhase === 'idle') return;
    isPaused = !isPaused;
    pauseBtn.innerText = isPaused ? '▶ RESUME' : '⏸ ORBIT PAUSE';
    
    if (!isPaused && timeLeft > 0 && !timerInterval) {
        startCountdown();
    }
}

function resetSession() {
    stopTimer();
    currentPhase = 'idle';
    isPaused = false;
    phaseLabel.innerText = '✨ Ready';
    pauseBtn.innerText = '⏸ ORBIT PAUSE';
    updateTimerUI();
}

// ========== EVENT LISTENERS ==========
startBtn.addEventListener('click', startPractice);
pauseBtn.addEventListener('click', pauseResume);
resetBtn.addEventListener('click', resetSession);

newTopicBtn.addEventListener('click', () => {
    if (currentPhase !== 'idle') {
        resetSession();
    }
    refreshTopic();
});

categorySelect.addEventListener('change', (e) => {
    currentCategory = e.target.value;
    usedTopicsHistory = [];
    refreshTopic();
});

soundToggleBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundToggleBtn.innerHTML = soundEnabled ? '🔊 SOUND ON' : '🔇 SOUND OFF';
    if (soundEnabled) playBeep();
});

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (currentPhase === 'idle') {
            startPractice();
        } else {
            pauseResume();
        }
    } else if (e.code === 'KeyN') {
        e.preventDefault();
        if (currentPhase !== 'idle') resetSession();
        refreshTopic();
    }
});

// ========== INITIALIZE APP ==========
async function init() {
    // Show loading state
    document.getElementById('topicText').innerText = '🌌 Loading galaxy topics...';
    
    // Load both CSV files
    await Promise.all([
        loadCSV('impromptu_speaking_topics_500.csv', 'general'),
        loadCSV('speaking_topics.csv', 'professional')
    ]);
    
    // Verify topics loaded
    if (topicsDB.general.length === 0 && topicsDB.professional.length === 0) {
        document.getElementById('topicText').innerText = '⚠️ No CSV files found. Using fallback topics.';
    } else {
        const totalTopics = topicsDB.general.length + topicsDB.professional.length;
        console.log(`✅ Total topics available: ${totalTopics}`);
    }
    
    refreshTopic();
    resetSession();
    speechCountSpan.innerText = '0';
}

// Start the app
init();