// background.js
// В данном решении основная логика перенесена в Window context для доступа к FileSystem API
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
});