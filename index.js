// index.js
// Extensão Streamer Poll Event para SillyTavern com correções no registro do evento

// Importa as funções necessárias
import { getContext } from "../../../extensions.js";
import { eventSource, event_types } from "../../../../script.js";


// Obtém o contexto do SillyTavern
const context = getContext();

// Variáveis globais da extensão
let messageCount = 0;
let eventChance = 0.1; // Chance inicial de 10%
const increaseRate = 0.05; // Aumenta 5% a cada mensagem sem evento
const maxChance = 0.5; // Chance máxima de 50%
const cooldownMessages = 10; // Cooldown de 10 mensagens após um evento
let cooldownCounter = 0; // Contador de cooldown

// Variáveis configuráveis
let numberOfOptions = 4; // Número de opções na enquete (pode ser ajustado)
let pollOptions = [];
let messages = {};

function handleMessage(data) {
    console.log("Streamer Poll Event: Nova mensagem do usuário detectada.");
}

// Função para registrar o evento
function registerEvent() {
    if (eventSource && eventSource.on) {
        eventSource.on(event_types.MESSAGE_RECEIVED, handleMessage);
        console.log("Streamer Poll Event: Evento MESSAGE_RECEIVED registrado com sucesso.");
    } else {
        console.warn("Streamer Poll Event: Não foi possível registrar o evento MESSAGE_SENT. eventSource não está disponível.");
    }
}

registerEvent();