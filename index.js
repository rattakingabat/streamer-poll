// index.js
// Extensão Streamer Poll Event para SillyTavern com correções no registro do evento

// Importa as funções necessárias
import { sendMessageAsUser, eventSource, event_types } from "../../../../script.js";

// Variáveis globais da extensão
let messageCount = 0;
let eventChance = 0.1; // Chance inicial de 10%
const increaseRate = 0.05; // Aumenta 5% a cada mensagem sem evento
const maxChance = 0.5; // Chance máxima de 50%
const cooldownMessages = 10; // Cooldown de 10 mensagens após um evento
let cooldownCounter = 0; // Contador de cooldown

// Variáveis configuráveis
const numPollOptions = 4; // Número de opções de pollOptions
const numNeverPollOptions = 2; // Número de opções de neverPollOptions
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

            console.log("Streamer Poll Event: Configuração carregada com sucesso.");
            console.log("Opções da enquete:", pollOptions);
            console.log("Opções que nunca serão selecionadas:", neverPollOptions);
            console.log("Mensagens personalizadas:", messages);
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
                pollIntro: `👩‍💻 *Sorrindo para a câmera, ela diz:* "E aí, pessoal! Vamos fazer uma enquete rápida! O que vocês acham?"\n\n`,
                pollOption: "🔹 {index}. {option}\n",
                pollResult: `🎉 *Ela anuncia animadamente:* "E a opção vencedora é... **{winningOption}** com {winningPercentage}% dos votos! Obrigada por participarem, pessoal!"

Total de votos: {totalVotes}

{voteBreakdown}`
            };

            console.log("Streamer Poll Event: Usando configurações padrão.");
        });
}

// Chama a função para carregar a configuração ao iniciar a extensão
loadConfig();

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

    // Seleciona 2 itens de neverPollOptions
    const neverOptionsToAdd = getRandomElements(neverPollOptions, numNeverPollOptions);

    // Cria uma lista de opções disponíveis excluindo as neverPollOptions
    const optionsPool = pollOptions.filter(option => !neverPollOptions.includes(option));

    if (optionsPool.length < numPollOptions) {
        console.warn("Streamer Poll Event: Não há opções suficientes para selecionar.");
        return;
    }

    // Seleciona aleatoriamente as opções da enquete
    const selectedOptions = getRandomElements(optionsPool, numPollOptions);

    // Combina as opções
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

    // Gera o total de votos entre 5000 e 10000
    const totalVotes = Math.floor(Math.random() * 5001) + 5000; // 5000 a 10000

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

    // Distribui porcentagens aleatórias para as outras opções
    let otherOptions = selectedOptions.filter((_, index) => index !== winningIndex);
    let otherPercentages = [];

    otherOptions.forEach((option, index) => {
        let maxPercentage = remainingPercentage - (otherOptions.length - index - 1);
        let percentage = Math.floor(Math.random() * (maxPercentage + 1)); // Inclui o maxPercentage
        otherPercentages.push(percentage);
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

    // Calcula o número de votos para cada opção
    let voteCounts = {};
    for (let option in votes) {
        voteCounts[option] = Math.round((votes[option] / 100) * totalVotes);
    }

    // Ordena as opções por porcentagem decrescente
    const sortedOptions = Object.keys(votes).sort((a, b) => votes[b] - votes[a]);

    // Cria o detalhamento dos votos
    let voteBreakdown = "";
    sortedOptions.forEach((option, index) => {
        voteBreakdown += `${index + 1}. ${option} - ${votes[option]}% (${voteCounts[option]} votos)\n`;
    });

    // Exibe o resultado após um tempo (simulando a duração da enquete)
    setTimeout(() => {
        displayPollResult(winningOption, winningPercentage, totalVotes, voteBreakdown);
    }, 5000); // 5000 milissegundos = 5 segundos
}

// Função para apresentar a enquete
function displayPoll(options) {
    let pollMessage = formatMessage(messages.pollIntro, {});

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
function displayPollResult(winningOption, winningPercentage, totalVotes, voteBreakdown) {
    const resultMessage = formatMessage(messages.pollResult, {
        winningOption,
        winningPercentage,
        totalVotes,
        voteBreakdown
    });

    sendMessageAsUser(resultMessage);

    console.log(`Streamer Poll Event: Resultado da enquete apresentado no chat: "${winningOption}" com ${winningPercentage}% dos votos.`);
}
