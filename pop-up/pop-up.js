document.addEventListener("DOMContentLoaded", () => {
  const frase = "Olá! Eu sou a Allena. Posso clicar em botões, ler textos e interagir nos sites. Como posso te ajudar? ";

  window.speechSynthesis.onvoiceschanged = () => {
    const utterance = new SpeechSynthesisUtterance(frase);
    const voices = window.speechSynthesis.getVoices();

    // Voz feminina em português do Brasil
    const vozFeminina = voices.find(voice =>
      (voice.lang === 'pt-BR' || voice.name.toLowerCase().includes('brazil')) &&
      (voice.name.toLowerCase().includes('maria') || voice.name.toLowerCase().includes('female'))
    );

    if (vozFeminina) {
      utterance.voice = vozFeminina;
    }

    utterance.lang = 'pt-BR';
    utterance.rate = 3.5; // velocidade (0.1 a 10, onde 1.0 é o normal)

    window.speechSynthesis.speak(utterance);
  }
});



//ações possíveis allena
/*
clique_botao
ler_texto
digitar_texto
resumir_pagina
cancelar
*/



// Fluxo principal do popup
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("microphoneBtn").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(() => {
            console.log("Permissão de microfone concedida.");

            acoes_possiveis = [
              "clique_botao",
              "ler_texto",
              "digitar_texto",
              "resumir_pagina",
              "cancelar"
            ];

            const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            recognition.lang = "pt-BR";
            recognition.interimResults = false;
            recognition.continuous = true; // Mantém o reconhecimento contínuo

            recognition.onresult = async (event) => {
              transcription = event.results[event.resultIndex][0].transcript;
              console.log("Texto transcrito:", transcription);

              //Envia pro popup (interface)
              chrome.runtime.sendMessage({ action: "transcription", text: transcription });

              // Envia a transcrição para o servidor Gemini
              const resposta = await fetch("http://localhost:5500/gemini", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  text: transcription,
                  acoes: acoes_possiveis,
                })
              });

              const resultado = await resposta.json();
              console.log("Resposta do Gemini:", resultado);

              // Acessa os campos do JSON
              const acao = resultado.acao;
              const contexto = resultado.contexto;
              console.log("acao: ", acao);
              console.log("contexto: ", contexto)

              text_to_speak = "";

              // Vocalização e execução da ação
              window.speechSynthesis.onvoiceschanged = async () => {
                const voices = window.speechSynthesis.getVoices();

                // Voz feminina em português do Brasil
                const vozFeminina = voices.find(voice =>
                  (voice.lang === 'pt-BR' || voice.name.toLowerCase().includes('brazil')) &&
                  (voice.name.toLowerCase().includes('maria') || voice.name.toLowerCase().includes('female'))
                );

                
                // Exemplo de uso: se a ação for clicar em botão 
                switch (acao) {
                  case "clique_botao":
                    const botoes = Array.from(document.querySelectorAll(`
                      button,
                      input[type="button"],
                      input[type="submit"],
                      [role="button"],
                      a,
                      div[role="button"]
                    `));
                    const alvo = botoes.find(btn => (btn.innerText || btn.value || "").toLowerCase().includes(contexto.toLowerCase()));
                    if (alvo) {
                      text_to_speak = `Clicando no botão ${contexto}`;
                      console.log("Botão encontrado, clicando...");
                      alvo.click();
                    } else {
                      text_to_speak = `Nenhum botão encontrado com o texto ${contexto}`;
                      console.log("Nenhum botão correspondente encontrado.");
                    }
                    break;
                  case "ler_texto":
                    const conteudo = [...document.querySelectorAll('h1, h2, h3, p')]
                      .map(el => el.innerText.trim())
                      .filter(t => t.length > 0)
                      .join('\n\n');

                    console.log(conteudo);

                    if (conteudo) {
                      text_to_speak = `Lendo o texto: ${conteudo}`;
                    } else {
                      text_to_speak = `Nenhum texto encontrado para ler.`;
                      console.log("Nenhum texto correspondente encontrado.");
                    }
                    break;
                  case "resumir_pagina":
                    //a ser implementado
                    text_to_speak = `Resumindo a página...`;
                    break;
                  case "digitar_texto":
                    //ainda não funciona
                    const textoOriginal = contexto; // O texto a ser digitado
                    const textoSemUnderscores = textoOriginal.replace(/_/g, " ");
                    //console.log(textoSemUnderscores); 
                    texto = textoSemUnderscores;
                    const campo = document.querySelector("input, textarea");
                    
                    if (campo) {
                      text_to_speak = `Digitando o texto: ${textoSemUnderscores}`;
                      campo.value = texto;
                      campo.dispatchEvent(new Event('input', { bubbles: true }));
                      campo.dispatchEvent(new Event('change', { bubbles: true }));
                    } else {
                      text_to_speak = `Campo de texto não encontrado.`;
                      console.error(`Campo com seletor "${campo}" não encontrado ou não é um campo de texto.`);
                    }
                    break;
                  case "cancelar":
                    text_to_speak = `Ação cancelada.`;
                    break;
                }

                // Frase a ser vocalizada
                const utterance = new SpeechSynthesisUtterance(text_to_speak);
                if (vozFeminina) {
                  utterance.voice = vozFeminina;
                }

                utterance.lang = 'pt-BR';
                utterance.rate = 3.5; // velocidade (0.1 a 10, onde 1.0 é o normal)
                window.speechSynthesis.speak(utterance);

              };


            };

            recognition.onerror = (event) => {
              console.error("Erro no reconhecimento de voz:", event.error);
            };

            recognition.onend = () => {
              // Reinicia automaticamente para continuar ouvindo
              recognition.start();
            };

            recognition.start(); // Inicia reconhecimento após permissão



          })
          .catch(err => {
            alert("Erro ao acessar o microfone: " + err.message);
          });
      }
    });
  });
});


// Recebe mensagem da aba e atualiza a transcrição na interface
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "transcription") {
    const el = document.getElementById("transcription");
    if (el) {
      el.innerText = request.text;
    }
  }
});

class CommandsService {
  transcriptListening = '';

 fixar() {
  console.log("Iniciando extensão Allena...");
  
  // Evita injeção duplicada
  if (document.getElementById('allena-extension')) return;

  const container = document.createElement('div');
  container.id = 'allena-extension';
  container.style.position = 'fixed';
  container.style.bottom = '20px';
  container.style.right = '20px';
  container.style.width = '320px';
  container.style.height = '420px';
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
}
 

}

const commandsService = new CommandsService();


