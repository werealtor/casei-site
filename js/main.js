/* 移除主题切换，以极简 */

/* 移动端菜单 (简化：假设无需要) */

/* 上传预览 (简化：移除错误显示) */
const uForm = document.getElementById('uForm');
if (uForm) {
  const fileInput = document.getElementById('file');
  const nameEl = document.getElementById('fileName');
  const preview = document.getElementById('preview');
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB

  fileInput.addEventListener('change', () => {
    if (!fileInput.files.length) { nameEl.textContent = 'PNG/JPEG · < 10MB'; return; }
    const f = fileInput.files[0];
    nameEl.textContent = `${f.name} · ${(f.size/1024/1024).toFixed(1)}MB`;
  });

  uForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = fileInput.files[0];
    if (!f || !/^image\/(png|jpe?g)$/i.test(f.type) || f.size > MAX_SIZE) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      preview.src = ev.target.result;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(f);
  });
}

/* 移除U3滑块JS，只剩静态图像 */