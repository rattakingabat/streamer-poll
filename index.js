// index.js
// Extensão Streamer Poll Event para SillyTavern com correções no registro do evento

// Importa as funções necessárias
import { getContext } from "../../../extensions.js";
import { sendMessageAsUser, system_message_types, sendSystemMessage, eventSource, event_types } from "../../../../script.js";

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
let numberOfOptions = 4; // Número total de opções na enquete
let pollOptions = [];
let neverPollOptions = [];
let messages = {};

function handleMessage(data) {
    console.log("Streamer Poll Event: Nova mensagem do usuário detectada.");
    checkForRandomEvent();
}

// Função para registrar o evento
function registerEvent() {
    if (eventSource && eventSource.on) {
        eventSource.on(event_types.MESSAGE_RECEIVED, handleMessage);
        eventSource.on(event_types.MESSAGE_SENT, handleMessage);
        console.log("Streamer Poll Event: Evento MESSAGE_RECEIVED registrado com sucesso.");
    } else {
        console.warn("Streamer Poll Event: Não foi possível registrar o evento MESSAGE_SENT. eventSource não está disponível.");
    }
}

registerEvent();

// Função para carregar o arquivo de configuração JSON
function loadConfig() {
    const configUrl = new URL('config.json', import.meta.url).href;

    fetch(configUrl)
        .then(response => response.json())
        .then(config => {
            pollOptions = config.pollOptions || [];
            neverPollOptions = config.neverPollOptions || [];
            messages = config.messages || {};
            numberOfOptions = config.numberOfOptions || 4;

            console.log("Streamer Poll Event: Configuração carregada com sucesso.");
            console.log("Opções da enquete:", pollOptions);
            console.log("Opções que nunca serão selecionadas:", neverPollOptions);
            console.log("Mensagens personalizadas:", messages);
            console.log("Número de opções na enquete:", numberOfOptions);
        })
        .catch(error => {
            console.error("Streamer Poll Event: Erro ao carregar o arquivo de configuração:", error);
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
            neverPollOptions = ["Opção secreta 1", "Opção secreta 2"];
            messages = {
                pollIntro: `👩‍💻 *{characterName} sorri para a câmera e diz:* "E aí, pessoal! Vamos fazer uma enquete rápida! O que vocês acham?"\n\n`,
                pollOption: "🔹 {index}. {option}\n",
                pollResult: `🎉 *{characterName} anuncia animadamente:* "E a opção vencedora é... **{winningOption}** com {winningPercentage}% dos votos! Obrigada por participarem, pessoal!"\n\n{voteBreakdown}`
            };
            numberOfOptions = 4;

            console.log("Streamer Poll Event: Usando configurações padrão.");
        });
}

// Chama a função para carregar a configuração ao iniciar a extensão
loadConfig();

// Função para obter o nome da personagem atual

// Função para verificar e disparar o evento aleatório
function checkForRandomEvent() {
    console.log("Streamer Poll Event: Verificando se o evento deve ocorrer...");

    if (cooldownCounter > 0) {
        cooldownCounter--;
        console.log(`Streamer Poll Event: Em cooldown. Mensagens restantes no cooldown: ${cooldownCounter}`);
        return;
    }

    messageCount++;
    console.log(`Streamer Poll Event: Contador de mensagens: ${messageCount}`);

    const randomNumber = Math.random();
    console.log(`Streamer Poll Event: Número aleatório gerado: ${randomNumber}`);
    console.log(`Streamer Poll Event: Chance atual do evento: ${eventChance}`);

    if (randomNumber < eventChance) {
        console.log("Streamer Poll Event: Evento disparado!");
        triggerPollEvent();
        // Resetar após o evento ocorrer
        messageCount = 0;
        eventChance = 0.1;
        cooldownCounter = cooldownMessages;
        console.log(`Streamer Poll Event: Cooldown iniciado por ${cooldownMessages} mensagens.`);
    } else {
        // Aumentar a chance para a próxima mensagem
        eventChance = Math.min(eventChance + increaseRate, maxChance);
        console.log(`Streamer Poll Event: Evento não ocorreu. Nova chance do evento: ${eventChance}`);
    }
}

// Função para substituir placeholders nas mensagens
function formatMessage(template, data) {
    return template.replace(/{(.*?)}/g, (match, key) => data[key.trim()] || "");
}

// Função para selecionar N elementos aleatórios de um array sem repetição
function getRandomElements(array, n) {
    let result = [];
    let len = array.length;
    let taken = new Array(len);

    if (n > len) n = len;

    while (result.length < n) {
        let randomIndex = Math.floor(Math.random() * len);
        if (!taken[randomIndex]) {
            result.push(array[randomIndex]);
            taken[randomIndex] = true;
        }
    }
    return result;
}

// Função para disparar a enquete
function triggerPollEvent() {
    if (pollOptions.length === 0) {
        console.warn("Streamer Poll Event: Nenhuma opção de enquete disponível.");
        return;
    }

    // Seleciona dois itens aleatórios de neverPollOptions
    const neverOptionsToAdd = getRandomElements(neverPollOptions, 2);

    // Cria uma lista de opções disponíveis excluindo as neverPollOptions
    const optionsPool = pollOptions.filter(option => !neverPollOptions.includes(option));

    if (optionsPool.length === 0) {
        console.warn("Streamer Poll Event: Nenhuma opção disponível após excluir neverPollOptions.");
        return;
    }

    // Calcula quantas opções precisamos selecionar do optionsPool
    const optionsToSelect = Math.min(numberOfOptions - neverOptionsToAdd.length, optionsPool.length);

    // Seleciona aleatoriamente as opções da enquete
    const selectedOptions = getRandomElements(optionsPool, optionsToSelect);

    // Adiciona as neverPollOptions selecionadas ao final da lista
    const options = selectedOptions.concat(neverOptionsToAdd);

    console.log("Streamer Poll Event: Opções selecionadas para a enquete:", options);

    // Apresenta a enquete no roleplay
    displayPoll(options);

    // Simula os resultados da votação
    simulatePollResults(selectedOptions, neverOptionsToAdd);
}

// Função para simular os resultados da votação
function simulatePollResults(selectedOptions, neverOptions) {
    // Inicializa os votos
    let votes = {};

    // Total de votos simulados
    const totalVotes = 1000;

    // Gera porcentagens para neverOptions (0-2%)
    let neverOptionPercentages = neverOptions.map(() => Math.floor(Math.random() * 3)); // 0-2%

    // Soma das porcentagens dos neverOptions
    const totalNeverPercentage = neverOptionPercentages.reduce((a, b) => a + b, 0);

    // Porcentagem restante para distribuir entre selectedOptions
    let remainingPercentage = 100 - totalNeverPercentage;

    // Garante que o winningOption tenha a maior porcentagem
    // Seleciona aleatoriamente a opção vencedora entre as selectedOptions
    const winningIndex = Math.floor(Math.random() * selectedOptions.length);
    const winningOption = selectedOptions[winningIndex];

    // Distribui porcentagens aleatórias para as opções, garantindo que o winningOption tenha a maior
    let otherOptions = selectedOptions.filter((_, index) => index !== winningIndex);
    let otherPercentages = [];

    // Gera porcentagens aleatórias para as outras opções
    let totalOtherPercentage = 0;
    otherOptions.forEach((option, index) => {
        let maxPercentage = remainingPercentage - (otherOptions.length - index - 1);
        let percentage = Math.floor(Math.random() * (maxPercentage));
        otherPercentages.push(percentage);
        totalOtherPercentage += percentage;
        remainingPercentage -= percentage;
    });

    // Atribui o restante da porcentagem ao winningOption
    const winningPercentage = remainingPercentage;

    // Compila os resultados
    votes[winningOption] = winningPercentage;
    otherOptions.forEach((option, index) => {
        votes[option] = otherPercentages[index];
    });
    neverOptions.forEach((option, index) => {
        votes[option] = neverOptionPercentages[index];
    });

    // Ordena as opções por porcentagem decrescente
    const sortedOptions = Object.keys(votes).sort((a, b) => votes[b] - votes[a]);

    // Cria o detalhamento dos votos
    let voteBreakdown = "";
    sortedOptions.forEach((option, index) => {
        voteBreakdown += `${index + 1}. ${option} - ${votes[option]}%\n`;
    });

    // Exibe o resultado após um tempo (simulando a duração da enquete)
    setTimeout(() => {
        displayPollResult(winningOption, winningPercentage, voteBreakdown);
    }, 5000); // 5000 milissegundos = 5 segundos
}

// Função para apresentar a enquete
function displayPoll(options) {
    let pollMessage = formatMessage(messages.pollIntro);

    options.forEach((option, index) => {
        pollMessage += formatMessage(messages.pollOption, {
            index: index + 1,
            option
        });
    });

    sendMessageAsUser(pollMessage);

    console.log("Streamer Poll Event: Enquete apresentada no chat.");
}

// Função para apresentar o resultado da enquete
function displayPollResult(winningOption, winningPercentage, voteBreakdown) {
    const resultMessage = formatMessage(messages.pollResult, {
        winningOption,
        winningPercentage,
        voteBreakdown
    });

    sendMessageAsUser(resultMessage);

    console.log(`Streamer Poll Event: Resultado da enquete apresentado no chat: "${winningOption}" com ${winningPercentage}% dos votos.`);
}
