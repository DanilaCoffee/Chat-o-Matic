// modules/modal.js
export function showImageModal(file, onConfirm) {
  const modal = document.getElementById('imageModal');
  const previewImg = document.getElementById('previewImage');
  const confirmBtn = document.getElementById('confirmImageBtn');
  const cancelBtn = document.getElementById('cancelImageBtn');

  // Создаем временную ссылку для предпросмотра
  const objectUrl = URL.createObjectURL(file);
  previewImg.src = objectUrl;

  // Показываем окно
  modal.classList.remove('hidden');

  // Функция очистки (освобождает память)
  const cleanup = () => {
    modal.classList.add('hidden');
    URL.revokeObjectURL(objectUrl); // Освобождаем память
    confirmBtn.onclick = null;
    cancelBtn.onclick = null;
  };

  // Обработчик кнопки "Отправить"
  confirmBtn.onclick = () => {
    cleanup();
    onConfirm(file); // Вызываем переданную функцию отправки
  };

  // Обработчик кнопки "Отмена"
  cancelBtn.onclick = () => {
    cleanup();
  };
}