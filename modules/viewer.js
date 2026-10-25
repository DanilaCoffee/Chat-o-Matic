export function initImageViewer() {
  const viewer = document.getElementById('imageViewer');
  const viewerImg = document.getElementById('viewerImage');

  // Закрываем по клику на любое место
  viewer.addEventListener('click', () => {
    viewer.classList.add('hidden');
    viewerImg.src = ''; // Очищаем память
  });
}

// Функция для открытия
export function openImageViewer(imageSrc) {
  const viewer = document.getElementById('imageViewer');
  const viewerImg = document.getElementById('viewerImage');
  
  viewerImg.src = imageSrc;
  viewer.classList.remove('hidden');
}