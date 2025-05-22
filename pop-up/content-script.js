(function fixar() {
console.log('Iniciando o fixação de conteúdo...');
  // Evita injeção duplicada
  if (document.getElementById('allena-extension')) return;

  const container = document.createElement('div');
  container.id = 'allena-extension';
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.width = '300px';
  container.style.height = '400px';
  container.style.zIndex = '99999';
  container.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
  container.style.borderRadius = '12px';
  container.style.overflow = 'hidden';
  container.style.backgroundColor = '#fff';

  // Botão de fechar (opcional)
  const closeBtn = document.createElement('button');
  closeBtn.innerText = '×';
  closeBtn.style.position = 'absolute';
  closeBtn.style.top = '4px';
  closeBtn.style.right = '8px';
  closeBtn.style.zIndex = '100000';
  closeBtn.style.background = 'transparent';
  closeBtn.style.border = 'none';
  closeBtn.style.fontSize = '20px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.onclick = () => container.remove();

  const iframe = document.createElement('iframe');
  iframe.src = chrome.runtime.getURL('pop-up.page.html');
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';

  container.appendChild(closeBtn);
  container.appendChild(iframe);
  document.body.appendChild(container);
})();
