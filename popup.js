// Словарь переводов
const messages = {
  uk: {
    title: "Запис Екрану",
    btn: "🚀 Відкрити панель"
  },
  ru: {
    title: "Запись Экрана",
    btn: "🚀 Открыть панель"
  },
  en: {
    title: "Screen Recorder",
    btn: "🚀 Open Recorder"
  }
};

// Определение языка (берем первые 2 буквы: uk-UA -> uk)
const userLang = navigator.language.slice(0, 2);
// Если языка нет в списке, используем английский
const t = messages[userLang] || messages['en'];

// Применяем тексты
document.getElementById('appTitle').textContent = t.title;
document.getElementById('openRecorder').textContent = t.btn;

document.getElementById('openRecorder').addEventListener('click', () => {
  chrome.windows.create({
    url: 'recorder.html',
    type: 'popup',
    width: 450,
    height: 650
  });
  window.close();
});