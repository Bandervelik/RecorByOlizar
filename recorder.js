// --- 1. ЛОКАЛИЗАЦИЯ (i18n) ---
const translations = {
  uk: {
    uiTitle: "🎥 Панель запису",
    startBtn: "Обрати місце та Почати",
    stopBtn: "⏹ Зупинити запис",
    pauseBtn: "⏸ Призупинити",
    resumeBtn: "▶️ Продовжити",
    uiInfo: "Натисніть кнопку, вкажіть шлях для файлу, а потім оберіть вікно для запису.",
    statusReady: "Готовий до роботи",
    statusSelectFile: "1. Вкажіть шлях для збереження...",
    statusCancel: "Скасовано користувачем",
    statusSelectWindow: "2. Виберіть вікно/екран...",
    statusErrorWebm: "Помилка: WebM не підтримується.",
    statusRecording: "Йде запис...",
    statusPaused: "⏸ Пауза", // Новый статус
    statusError: "Помилка: ",
    statusDiskError: "Помилка запису на диск! ",
    statusSaving: "💾 Збереження файлу...",
    statusSaved: "✅ Запис збережено!",
    statusReadyNew: "Готовий до нового запису"
  },
  ru: {
    uiTitle: "🎥 Панель записи",
    startBtn: "Выбрать место и Начать",
    stopBtn: "⏹ Остановить запись",
    pauseBtn: "⏸ Приостановить",
    resumeBtn: "▶️ Продолжить",
    uiInfo: "Нажмите кнопку, укажите путь для файла, а затем выберите окно для записи.",
    statusReady: "Готов к работе",
    statusSelectFile: "1. Укажите путь для сохранения...",
    statusCancel: "Отменено пользователем",
    statusSelectWindow: "2. Выберите окно/экран...",
    statusErrorWebm: "Ошибка: WebM не поддерживается.",
    statusRecording: "Идет запись...",
    statusPaused: "⏸ Пауза", // Новый статус
    statusError: "Ошибка: ",
    statusDiskError: "Ошибка записи на диск! ",
    statusSaving: "💾 Сохранение файла...",
    statusSaved: "✅ Запись сохранена!",
    statusReadyNew: "Готов к новой записи"
  },
  en: {
    uiTitle: "🎥 Recording Panel",
    startBtn: "Select Location & Start",
    stopBtn: "⏹ Stop Recording",
    pauseBtn: "⏸ Pause",
    resumeBtn: "▶️ Resume",
    uiInfo: "Click the button, choose save location, then select window to record.",
    statusReady: "Ready",
    statusSelectFile: "1. Choose save location...",
    statusCancel: "Cancelled by user",
    statusSelectWindow: "2. Select window/screen...",
    statusErrorWebm: "Error: WebM not supported.",
    statusRecording: "Recording...",
    statusPaused: "⏸ Paused", // Новый статус
    statusError: "Error: ",
    statusDiskError: "Disk Write Error! ",
    statusSaving: "💾 Saving file...",
    statusSaved: "✅ Recording saved!",
    statusReadyNew: "Ready for new recording"
  }
};

// Определение языка
const userLang = navigator.language.slice(0, 2);
const t = translations[userLang] || translations['en'];

// Применение переводов при загрузке
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('uiTitle').textContent = t.uiTitle;
  document.getElementById('startBtn').textContent = t.startBtn;
  document.getElementById('stopBtn').textContent = t.stopBtn;
  document.getElementById('pauseBtn').textContent = t.pauseBtn;
  document.getElementById('uiInfo').textContent = t.uiInfo;
  document.getElementById('status').textContent = t.statusReady;
  
  initVisualEffects();
});

// --- 2. ЛОГИКА ЗАПИСИ ---

let mediaRecorder;
let fileHandle;
let writableStream;
let stream;

// Переменные для таймера и пауз
let recordingInterval;
let startTime;
let totalPausedTime = 0; // Накопленное время пауз
let lastPauseStartTime = 0; // Когда началась текущая пауза

const writeQueue = [];
let isWriting = false;

const statusEl = document.getElementById('status');
const timerEl = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const pauseBtn = document.getElementById('pauseBtn'); // Ссылка на новую кнопку

if (startBtn) startBtn.addEventListener('click', startRecording);
if (stopBtn) stopBtn.addEventListener('click', stopRecording);
if (pauseBtn) pauseBtn.addEventListener('click', togglePause);

async function startRecording() {
  try {
    statusEl.textContent = t.statusSelectFile;
    
    // 1. Выбор файла
    try {
      fileHandle = await window.showSaveFilePicker({
        suggestedName: `screen_rec_${new Date().toISOString().slice(0,19).replace(/[:T]/g, '-')}.webm`,
        types: [{
          description: 'WebM Video',
          accept: { 'video/webm': ['.webm'] },
        }],
      });
    } catch (err) {
      statusEl.textContent = t.statusCancel;
      return; 
    }

    writableStream = await fileHandle.createWritable();
    statusEl.textContent = t.statusSelectWindow;

    // 2. Захват экрана
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 }
      },
      audio: true 
    });

    // 3. Кодеки
    const mimeOptions = [
      'video/webm; codecs=vp9,opus',
      'video/webm; codecs=vp8,opus',
      'video/webm'
    ];
    let selectedMime = mimeOptions.find(mime => MediaRecorder.isTypeSupported(mime));
    
    if (!selectedMime) {
      statusEl.textContent = t.statusErrorWebm;
      return;
    }

    mediaRecorder = new MediaRecorder(stream, { mimeType: selectedMime });

    stream.getVideoTracks()[0].onended = () => {
      stopRecording();
    };

    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.start(1000);

    // UI Updates
    startBtn.style.display = 'none';
    stopBtn.style.display = 'block';
    pauseBtn.style.display = 'block'; // Показываем кнопку паузы
    pauseBtn.textContent = t.pauseBtn;
    
    statusEl.textContent = t.statusRecording;
    
    // Инициализация таймера
    startTime = Date.now();
    totalPausedTime = 0;
    recordingInterval = setInterval(updateTimer, 1000);

  } catch (err) {
    console.error(err);
    statusEl.textContent = t.statusError + err.message;
    if (stream) stream.getTracks().forEach(t => t.stop());
  }
}

// Функция управления паузой
function togglePause() {
  if (!mediaRecorder) return;

  if (mediaRecorder.state === 'recording') {
    // СТАВИМ НА ПАУЗУ
    mediaRecorder.pause();
    clearInterval(recordingInterval); // Останавливаем обновление таймера
    
    lastPauseStartTime = Date.now(); // Запоминаем когда нажали паузу
    
    pauseBtn.textContent = t.resumeBtn;
    statusEl.textContent = t.statusPaused;
    
  } else if (mediaRecorder.state === 'paused') {
    // ВОЗОБНОВЛЯЕМ
    mediaRecorder.resume();
    
    // Добавляем длительность этой паузы к общему времени простоя
    totalPausedTime += (Date.now() - lastPauseStartTime);
    
    recordingInterval = setInterval(updateTimer, 1000); // Снова запускаем таймер
    
    pauseBtn.textContent = t.pauseBtn;
    statusEl.textContent = t.statusRecording;
  }
}

async function processWriteQueue() {
  if (isWriting || writeQueue.length === 0) return;
  isWriting = true;
  const blob = writeQueue.shift();
  try {
    await writableStream.write(blob);
  } catch (err) {
    console.error("Disk Write Error:", err);
    statusEl.textContent = t.statusDiskError + err.message;
  } finally {
    isWriting = false;
    if (writeQueue.length > 0) processWriteQueue();
  }
}

function handleDataAvailable(event) {
  if (event.data && event.data.size > 0) {
    writeQueue.push(event.data);
    processWriteQueue();
  }
}

async function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

  clearInterval(recordingInterval);
  mediaRecorder.stop();
  if (stream) stream.getTracks().forEach(track => track.stop());

  statusEl.textContent = t.statusSaving;
  
  // Прячем кнопки
  startBtn.style.display = 'none'; 
  stopBtn.style.display = 'none';
  pauseBtn.style.display = 'none';

  const checkQueue = setInterval(async () => {
    if (writeQueue.length === 0 && !isWriting) {
      clearInterval(checkQueue);
      try {
        if (writableStream) await writableStream.close();
        
        statusEl.textContent = t.statusSaved;
        statusEl.style.color = "#a6e3a1";
        
        setTimeout(() => {
            startBtn.style.display = 'block';
            statusEl.textContent = t.statusReadyNew;
            statusEl.style.color = "";
            timerEl.textContent = "00:00:00";
        }, 3000);

      } catch (err) {
        statusEl.textContent = t.statusError + err.message;
      }
    }
  }, 100);
}

function updateTimer() {
  // Текущее время - Время старта - Время проведенное на паузе
  const diff = Date.now() - startTime - totalPausedTime;
  
  const h = Math.floor(diff / 3600000).toString().padStart(2, '0');
  const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
  const s = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
  timerEl.textContent = `${h}:${m}:${s}`;
}

// --- 3. ВИЗУАЛЬНЫЕ ЭФФЕКТЫ ---
function initVisualEffects() {
  const statusContainer = document.getElementById('statusContainer');
  const statusNode = document.getElementById('status');

  if (statusNode && statusContainer) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const text = mutation.target.textContent || statusNode.textContent;
        
        // Сброс классов
        statusContainer.classList.remove('recording', 'paused');

        if (text.includes("🔴")) {
          statusContainer.classList.add('recording');
        } else if (text.includes("⏸")) {
          statusContainer.classList.add('paused');
        }
      });
    });
    
    observer.observe(statusNode, { childList: true, characterData: true, subtree: true });
  }
}