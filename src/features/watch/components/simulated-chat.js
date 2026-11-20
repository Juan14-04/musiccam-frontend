export const MENSAJES_CHAT_INICIALES = [
  { autor: 'Luna M.', texto: '¡Qué buena energía! 🎶' },
  { autor: 'Carlos P.', texto: 'Saludos desde Medellín 🙌' },
  { autor: 'Sofi G.', texto: 'Esta canción es mi favorita' },
  { autor: 'Andrés R.', texto: '¡Que siga la música!' },
];

const MENSAJES_AUTOMATICOS = [
  { autor: 'Vale T.', texto: 'Se escucha increíble ✨' },
  { autor: 'Mateo C.', texto: 'Un saludo para toda la banda' },
  { autor: 'Dani L.', texto: '¡Gracias por el concierto!' },
  { autor: 'Nico F.', texto: 'Conectado desde Cali 🎤' },
];

/** Añade interacción local de demostración; ningún mensaje se envía al servidor. */
export function activarChatSimulado(
  raiz,
  { programar = setInterval, cancelar = clearInterval } = {},
) {
  const lista = raiz.querySelector('[data-chat-mensajes]');
  const formulario = raiz.querySelector('[data-chat-form]');
  const entrada = formulario?.querySelector('[name="mensaje"]');
  if (!lista || !formulario || !entrada) return { destroy() {} };

  const agregar = ({ autor, texto }) => {
    const mensaje = document.createElement('li');
    mensaje.className = 'watch-chat__message';
    const nombre = document.createElement('strong');
    nombre.textContent = `${autor}: `;
    const contenido = document.createElement('span');
    contenido.textContent = texto;
    mensaje.append(nombre, contenido);
    lista.append(mensaje);

    while (lista.children.length > 30) lista.firstElementChild.remove();
    lista.scrollTop = lista.scrollHeight;
  };

  let indice = 0;
  const temporizador = programar(() => {
    agregar(MENSAJES_AUTOMATICOS[indice % MENSAJES_AUTOMATICOS.length]);
    indice += 1;
  }, 3200);

  const alEnviar = (evento) => {
    evento.preventDefault();
    const texto = entrada.value.trim();
    if (!texto) return;
    agregar({ autor: 'Tú', texto });
    entrada.value = '';
  };
  formulario.addEventListener('submit', alEnviar);

  return {
    destroy() {
      cancelar(temporizador);
      formulario.removeEventListener('submit', alEnviar);
    },
  };
}
