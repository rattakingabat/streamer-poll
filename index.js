// index.js
// Extensão Streamer Poll Event para SillyTavern com nome da personagem automático

// Importa as funções necessárias
import { getContext } from "../../extensions.js";
import { eventSource, event_types } from "../../../script.js";
import { registerSlashCommand } from "../../slash-commands.js";

// Importa a biblioteca js-yaml
importScripts('js-yaml.min.js');

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

// Função para carregar o arquivo de configuração YAML
function loadConfig() {
    const configUrl = new URL('config.yaml', import.meta.url).href;

    fetch(configUrl)
        .then(response => response.text())
        .then(yamlText => {
            const config = jsyaml.load(yamlText);
            // characterName não é mais carregado do arquivo de configuração
            pollOptions = config.pollOptions || [];
            messages = config.messages || {};
        })
        .catch(error => {
            console.error("Erro ao carregar o arquivo de configuração:", error);
            // Define valores padrão caso ocorra um erro
            pollOptions = [
                "Jogar um novo game",
                "Fazer um desafio",
                "Responder perguntas",
                "Contar uma história engraçada",
                "Mostrar bastidores",
                "Iniciar um sorteio",
                "Realizar uma votação de popularidade",
                "Fazer um tutorial ao vivo",
                "Compartilhar dicas exclusivas",
                "Convidar um espectador para participar"
            ];
            messages = {
                pollIntro: `👩‍💻 *{characterName} sorri para a câmera e diz:* "E aí, pessoal! Vamos fazer uma enquete rápida! O que vocês acham?"\n\n`,
                pollOption: "🔹 {index}. {option}\n",
                pollResult: `🎉 *{characterName} anuncia animadamente:* "E a opção vencedora é... **{winningOption}**! Obrigada por participarem, pessoal!"`
            };
        });
}

// Chama a função para carregar a configuração ao iniciar a extensão
loadConfig();

// Função para obter o nome da personagem atual
function getCharacterName() {
    // Verifica se há uma personagem selecionada
    if (context.characterName && context.characterName !== '') {
        return context.characterName;
    } else {
        // Caso não haja uma personagem selecionada, retorna um nome padrão
        return "Personagem";
    }
}

// Função para embaralhar um array
function shuffleArray(array) {
    const shuffled = array.slice();
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Função para verificar e disparar o evento aleatório
function checkForRandomEvent() {
    if (cooldownCounter > 0) {
        cooldownCounter--;
        return;
    }

    messageCount++;

    const randomNumber = Math.random();

    if (randomNumber < eventChance) {
        triggerPollEvent();
        // Resetar após o evento ocorrer
        messageCount = 0;
        eventChance = 0.1;
        cooldownCounter = cooldownMessages;
    } else {
        // Aumentar a chance para a próxima mensagem
        eventChance = Math.min(eventChance + increaseRate, maxChance);
    }
}

// Função para substituir placeholders nas mensagens
function formatMessage(template, data) {
    return template.replace(/{(.*?)}/g, (match, key) => data[key.trim()] || "");
}

// Função para disparar a enquete
function triggerPollEvent() {
    if (pollOptions.length === 0) {
        console.warn("Nenhuma opção de enquete disponível.");
        return;
    }

    // Seleciona aleatoriamente as opções da enquete
    const shuffledOptions = shuffleArray(pollOptions);
    const options = shuffledOptions.slice(0, numberOfOptions);

    // Apresenta a enquete no roleplay
    displayPoll(options);

    // Seleciona aleatoriamente a opção vencedora
    const winningIndex = Math.floor(Math.random() * options.length);
    const winningOption = options[winningIndex];

    // Apresenta o resultado após um tempo (simulando a duração da enquete)
    setTimeout(() => {
        displayPollResult(winningOption);
    }, 5000); // 5000 milissegundos = 5 segundos
}

// Função para apresentar a enquete
function displayPoll(options) {
    const characterName = getCharacterName();
    let pollMessage = formatMessage(messages.pollIntro, { characterName });

    options.forEach((option, index) => {
        pollMessage += formatMessage(messages.pollOption, {
            index: index + 1,
            option
        });
    });

    // Adiciona a mensagem ao chat como a personagem
    context.addMessage({
        name: characterName,
        is_user: false,
        is_system: false,
        send_date: Date.now(),
        mes: pollMessage
    });
}

// Função para apresentar o resultado da enquete
function displayPollResult(winningOption) {
    const characterName = getCharacterName();
    const resultMessage = formatMessage(messages.pollResult, {
        characterName,
        winningOption
    });

    // Adiciona a mensagem ao chat como a personagem
    context.addMessage({
        name: characterName,
        is_user: false,
        is_system: false,
        send_date: Date.now(),
        mes: resultMessage
    });
}

// Evento que é chamado a cada nova mensagem enviada pelo usuário
function onUserMessage(data) {
    // Verifica se a mensagem foi enviada pelo usuário
    if (data.is_user) {
        checkForRandomEvent();
    }
}

// Registra o evento de mensagem enviada
eventSource.on(event_types.MESSAGE_SENT, onUserMessage);

// Comando para redefinir as variáveis (pode ser útil para testes)
registerSlashCommand("resetpoll", (namedArgs, unnamedArgs) => {
    messageCount = 0;
    eventChance = 0.1;
    cooldownCounter = 0;
    return "Variáveis de enquete resetadas.";
}, [], "Reseta as variáveis da extensão Streamer Poll Event.");
