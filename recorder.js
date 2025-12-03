// --- 1. ЛОКАЛИЗАЦИЯ (i18n) ---
const translations = {
  uk: {
    uiTitle: "🎥 Панель запису",
    startBtn: "Обрати місце далі вкладку та Почати", // Исправлено название кнопки
    stopBtn: "⏹ Зупинити запис",
    uiInfo: "Натисніть кнопку, вкажіть шлях для файлу, а потім оберіть вікно для запису.",
    statusReady: "Готовий до роботи",
    statusSelectFile: "1. Вкажіть шлях для збереження...",
    statusCancel: "Скасовано користувачем",
    statusSelectWindow: "2. Виберіть вікно/екран...",
    statusErrorWebm: "Помилка: WebM не підтримується.",
    statusRecording: "Йде запис...",
    statusError: "Помилка: ",
    statusDiskError: "Помилка запису на диск! ",
    statusSaving: "💾 Збереження файлу...",
    statusSaved: "✅ Запис збережено!",
    statusReadyNew: "Готовий до нового запису"
  },
  ru: {
    uiTitle: "🎥 Панель записи",
    startBtn: "Выбрать место далее вкладку и Начать", // Исправлено название кнопки
    stopBtn: "⏹ Остановить запись",
    uiInfo: "Нажмите кнопку, укажите путь для файла, а затем выберите окно для записи.",
    statusReady: "Готов к работе",
    statusSelectFile: "1. Укажите путь для сохранения...",
    statusCancel: "Отменено пользователем",
    statusSelectWindow: "2. Выберите окно/экран...",
    statusErrorWebm: "Ошибка: WebM не поддерживается.",
    statusRecording: "Идет запись...",
    statusError: "Ошибка: ",
    statusDiskError: "Ошибка записи на диск! ",
    statusSaving: "💾 Сохранение файла...",
    statusSaved: "✅ Запись сохранена!",
    statusReadyNew: "Готов к новой записи"
  },
  en: {
    uiTitle: "🎥 Recording Panel",
    startBtn: "Select Location & Window & Start", // Исправлено название кнопки
    stopBtn: "⏹ Stop Recording",
    uiInfo: "Click the button, choose save location, then select window to record.",
    statusReady: "Ready",
    statusSelectFile: "1. Choose save location...",
    statusCancel: "Cancelled by user",
    statusSelectWindow: "2. Select window/screen...",
    statusErrorWebm: "Error: WebM not supported.",
    statusRecording: "Recording...",
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
  document.getElementById('uiInfo').textContent = t.uiInfo;
  document.getElementById('status').textContent = t.statusReady;
  
  // Инициализация анимации (Замена инлайн скрипта)
  initVisualEffects();
});

// --- 2. ЛОГИКА ЗАПИСИ ---

let mediaRecorder;
let fileHandle;
let writableStream;
let recordingInterval;
let startTime;
let stream;

// Очередь для записи (защита от краша RAM)
const writeQueue = [];
let isWriting = false;

const statusEl = document.getElementById('status');
const timerEl = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');

if (startBtn) startBtn.addEventListener('click', startRecording);
if (stopBtn) stopBtn.addEventListener('click', stopRecording);

async function startRecording() {
  try {
    statusEl.textContent = t.statusSelectFile;
    
    // 1. Выбор файла (File System Access API)
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

    // Создаем поток записи на диск
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

    // 3. Выбор кодека
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

    // Остановка если нажали "Прекратить доступ" в браузере
    stream.getVideoTracks()[0].onended = () => {
      stopRecording();
    };

    // 4. Обработка данных
    mediaRecorder.ondataavailable = handleDataAvailable;
    
    // Сбрасываем чанки каждую 1 секунду
    mediaRecorder.start(1000);

    // UI Updates
    startBtn.style.display = 'none';
    stopBtn.style.display = 'block';
    statusEl.textContent = t.statusRecording; // Содержит 🔴, запустит анимацию
    startTime = Date.now();
    recordingInterval = setInterval(updateTimer, 1000);

  } catch (err) {
    console.error(err);
    statusEl.textContent = t.statusError + err.message;
    if (stream) stream.getTracks().forEach(t => t.stop());
  }
}

// Процессор очереди записи (FIFO)
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
    // Если еще есть данные, продолжаем писать
    if (writeQueue.length > 0) {
      processWriteQueue();
    }
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
  startBtn.style.display = 'none'; 
  stopBtn.style.display = 'none';

  // Ждем пока очередь допишется
  const checkQueue = setInterval(async () => {
    if (writeQueue.length === 0 && !isWriting) {
      clearInterval(checkQueue);
      try {
        if (writableStream) await writableStream.close();
        
        statusEl.textContent = t.statusSaved;
        statusEl.style.color = "#a6e3a1"; // Green accent
        
        setTimeout(() => {
            startBtn.style.display = 'block';
            statusEl.textContent = t.statusReadyNew;
            statusEl.style.color = ""; // Reset color
            timerEl.textContent = "00:00:00";
        }, 3000);

      } catch (err) {
        statusEl.textContent = t.statusError + err.message;
      }
    }
  }, 100);
}

function updateTimer() {
  const diff = Date.now() - startTime;
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
        // Если в тексте есть красный эмодзи, включаем пульсацию
        if (text.includes("🔴")) {
          statusContainer.classList.add('recording');
        } else {
          statusContainer.classList.remove('recording');
        }
      });
    });
    
    observer.observe(statusNode, { childList: true, characterData: true, subtree: true });
  }
}