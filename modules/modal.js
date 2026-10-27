// modules/modal.js
export function showImageModal(file, onConfirm) {
  const modal = document.getElementById('imageModal');
  const previewImg = document.getElementById('previewImage');
  const confirmBtn = document.getElementById('confirmImageBtn');
  const cancelBtn = document.getElementById('cancelImageBtn');
  const captionInput = document.getElementById('imageCaptionInput'); // Новое поле

  // Создаем временную ссылку для предпросмотра
  const objectUrl = URL.createObjectURL(file);
  previewImg.src = objectUrl;

  // Показываем окно и фокусируемся на поле ввода текста
  modal.classList.remove('hidden');
  captionInput.focus();

  // Функция очистки
  const cleanup = () => {
    modal.classList.add('hidden');
    URL.revokeObjectURL(objectUrl);
    confirmBtn.onclick = null;
    cancelBtn.onclick = null;
    captionInput.onkeypress = null;
    captionInput.value = ''; // Очищаем поле при закрытии
  };

  // Обработчик кнопки "Отправить"
  const handleConfirm = () => {
    const caption = captionInput.value.trim();
    cleanup();
    onConfirm(file, caption); // Передаем и файл, и текст
  };

  confirmBtn.onclick = handleConfirm;
  cancelBtn.onclick = cleanup;

  // Отправка по Enter
  captionInput.onkeypress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
  };
}