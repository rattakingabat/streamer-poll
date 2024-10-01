// index.js
// Extensão Streamer Poll Event para SillyTavern com correções no registro do evento e toggle

// Importa as funções necessárias
import { sendMessageAsUser, eventSource, event_types } from "../../../../script.js";
import { SlashCommandParser } from '../../../slash-commands/SlashCommandParser.js';
import { SlashCommand } from '../../../slash-commands/SlashCommand.js';

// Variáveis globais da extensão
let isActive = false; // Script começa desligado
let messageCount = 0;
let eventChance = 0.1; // Chance inicial de 10%
const increaseRate = 0.05; // Aumenta 5% a cada mensagem sem evento
const maxChance = 0.5; // Chance máxima de 50%
const cooldownMessages = 7; // Cooldown de 7 mensagens após um evento
let cooldownCounter = 0; // Contador de cooldown

// Variáveis configuráveis
const numPollOptions = 4; // Número de opções de pollOptions
const numNeverPollOptions = 2; // Número de opções de neverPollOptions
let pollOptions = [];
let neverPollOptions = [];
let messages = {};

// Histórico das opções selecionadas nas últimas 7 rodadas
const pollHistoryRounds = []; // array de arrays, cada array contém as opções selecionadas em uma rodada
const maxHistoryRounds = 7; // número máximo de rodadas a serem mantidas no histórico

function handleMessage(data) {
    console.log("Streamer Poll Event: Nova mensagem do usuário detectada.");
    if (isActive) {
        checkForRandomEvent();
    }
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
        // Resetar após o evento ocorrer
        messageCount = 0;
        eventChance = 0.1;
        cooldownCounter = cooldownMessages;
        triggerPollEvent();
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

    // Obtém as opções selecionadas nas últimas 7 rodadas
    const optionsInHistory = pollHistoryRounds.flat();

    // Cria uma lista de opções disponíveis excluindo as neverPollOptions e as opções selecionadas nas últimas 7 rodadas
    const optionsPool = pollOptions.filter(option => !neverPollOptions.includes(option) && !optionsInHistory.includes(option));

    if (optionsPool.length < numPollOptions) {
        console.warn("Streamer Poll Event: Não há opções suficientes para selecionar.");
        return;
    }

    // Seleciona aleatoriamente as opções da enquete
    const selectedOptions = getRandomElements(optionsPool, numPollOptions);

    // Combina as opções
    const options = selectedOptions.concat(neverOptionsToAdd);

    console.log("Streamer Poll Event: Opções selecionadas para a enquete:", options);

    let pollMessage = formatMessage(messages.pollIntro, {});

    options.forEach((option, index) => {
        pollMessage += formatMessage(messages.pollOption, {
            index: index + 1,
            option
        });
    });

    // Adiciona as opções selecionadas ao histórico
    pollHistoryRounds.push(selectedOptions);

    // Mantém apenas as últimas 7 rodadas no histórico
    if (pollHistoryRounds.length > maxHistoryRounds) {
        pollHistoryRounds.shift();
    }

    sendMessageAsUser(pollMessage + "\n\n\n" + simulatePollResults(selectedOptions, neverOptionsToAdd));
}

// Função para simular os resultados da votação
function simulatePollResults(selectedOptions, neverOptions) {
    // Inicializa o objeto de votos
    let votes = {};

    // Gera votos totais entre 5000 e 10000
    const totalVotes = Math.floor(Math.random() * 3001) + 7000;

    // Gera porcentagens para neverOptions (0-2%), incluindo zero
    let neverOptionPercentages = neverOptions.map(() => Math.floor(Math.random() * 3));

    // Soma das porcentagens de neverOptions
    const totalNeverPercentage = neverOptionPercentages.reduce((a, b) => a + b, 0);

    // Porcentagem restante para distribuir entre selectedOptions
    let remainingPercentage = 100 - totalNeverPercentage;

    // Garante que winningOption tenha a maior porcentagem
    const winningIndex = Math.floor(Math.random() * selectedOptions.length);
    const winningOption = selectedOptions[winningIndex];

    // Outras opções excluindo winningOption
    let otherOptions = selectedOptions.filter((_, index) => index !== winningIndex);

    // Define porcentagem mínima para winningOption
    let minWinningPercentage = Math.floor(remainingPercentage / 2) + 1;
    let maxWinningPercentage = remainingPercentage - otherOptions.length; // Garante pelo menos 1% para cada otherOption

    // Porcentagem de winningOption é aleatória entre minWinningPercentage e maxWinningPercentage
    let winningPercentage = Math.floor(Math.random() * (maxWinningPercentage - minWinningPercentage + 1)) + minWinningPercentage;

    // Porcentagem restante após atribuir a winningOption
    let remainingAfterWinning = remainingPercentage - winningPercentage;

    // Distribui remainingAfterWinning entre otherOptions
    let otherPercentages = [];
    if (otherOptions.length > 0) {
        let totalOtherPercentage = 0;
        otherOptions.forEach((option, index) => {
            let optionsLeft = otherOptions.length - index - 1;
            if (optionsLeft > 0) {
                let maxPercentage = remainingAfterWinning - totalOtherPercentage - optionsLeft;
                let percentage = Math.floor(Math.random() * (maxPercentage)) + 1; // Garante pelo menos 1%
                otherPercentages.push(percentage);
                totalOtherPercentage += percentage;
            } else {
                // Última otherOption
                let percentage = remainingAfterWinning - totalOtherPercentage;
                otherPercentages.push(percentage);
            }
        });
    }

    // Compila os votos
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

    // Ordena as opções por porcentagem em ordem decrescente
    const sortedOptions = Object.keys(votes).sort((a, b) => votes[b] - votes[a]);

    // Cria o detalhamento dos votos
    let voteBreakdown = "";
    sortedOptions.forEach((option, index) => {
        voteBreakdown += `${index + 1}. ${option} - ${votes[option]}% (${voteCounts[option]} votos)\n`;
    });

    const resultMessage = formatMessage(messages.pollResult, {
        winningOption,
        winningPercentage,
        totalVotes,
        voteBreakdown
    });

    return resultMessage;
}

// Registrar os comandos de barra
if (typeof SlashCommandParser !== 'undefined') {
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'resetStreamerPoll',
        callback: (namedArgs, unnamedArgs) => {
            isActive = true;
            messageCount = 0;
            eventChance = 0.1;
            cooldownCounter = 0;
            return "Streamer Poll Event foi reiniciado e ativado.";
        },
        description: 'Reinicia e ativa o Streamer Poll Event.',
    }));

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'stopStreamerPoll',
        callback: (namedArgs, unnamedArgs) => {
            isActive = false;
            return "Streamer Poll Event foi desativado.";
        },
        description: 'Desativa o Streamer Poll Event.',
    }));

    console.log("Streamer Poll Event: Comandos de barra registrados.");
} else {
    console.warn("Streamer Poll Event: SlashCommandParser não está disponível.");
}
