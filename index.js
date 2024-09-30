// index.js
// Extensão Streamer Poll Event para SillyTavern com correções no registro do evento

// Importa as funções necessárias
import { getContext } from "../../../extensions.js";

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

// Função para carregar o arquivo de configuração JSON
function loadConfig() {
    const configUrl = new URL('config.json', import.meta.url).href;

    fetch(configUrl)
        .then(response => response.json())
        .then(config => {
            pollOptions = config.pollOptions || [];
            messages = config.messages || {};

            console.log("Streamer Poll Event: Configuração carregada com sucesso.");
            console.log("Opções da enquete:", pollOptions);
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
            messages = {
                pollIntro: `👩‍💻 *{characterName} sorri para a câmera e diz:* "E aí, pessoal! Vamos fazer uma enquete rápida! O que vocês acham?"\n\n`,
                pollOption: "🔹 {index}. {option}\n",
                pollResult: `🎉 *{characterName} anuncia animadamente:* "E a opção vencedora é... **{winningOption}**! Obrigada por participarem, pessoal!"`
            };

            console.log("Streamer Poll Event: Usando configurações padrão.");
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

// Função para disparar a enquete
function triggerPollEvent() {
    if (pollOptions.length === 0) {
        console.warn("Streamer Poll Event: Nenhuma opção de enquete disponível.");
        return;
    }

    // Seleciona aleatoriamente as opções da enquete
    const shuffledOptions = shuffleArray(pollOptions);
    const options = shuffledOptions.slice(0, numberOfOptions);

    console.log("Streamer Poll Event: Opções selecionadas para a enquete:", options);

    // Apresenta a enquete no roleplay
    displayPoll(options);

    // Seleciona aleatoriamente a opção vencedora
    const winningIndex = Math.floor(Math.random() * options.length);
    const winningOption = options[winningIndex];

    console.log(`Streamer Poll Event: Opção vencedora será anunciada após 5 segundos: "${winningOption}"`);

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

    console.log("Streamer Poll Event: Enquete apresentada no chat.");
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

    console.log(`Streamer Poll Event: Resultado da enquete apresentado no chat: "${winningOption}"`);
}

// Evento que é chamado a cada nova mensagem enviada pelo usuário
function onUserMessage(data) {
    // Verifica se a mensagem foi enviada pelo usuário
    if (data.is_user) {
        console.log("Streamer Poll Event: Nova mensagem do usuário detectada.");
        checkForRandomEvent();
    }
}

// Função para registrar o evento
function registerEvent() {
    if (context.eventSource && context.eventSource.on) {
        context.eventSource.on('MESSAGE_SENT', onUserMessage);
        console.log("Streamer Poll Event: Evento MESSAGE_SENT registrado com sucesso.");
    } else {
        console.warn("Streamer Poll Event: Não foi possível registrar o evento MESSAGE_SENT. eventSource não está disponível.");
    }
}

// Aguarda o contexto estar pronto antes de registrar o evento
if (context && context.eventSource) {
    registerEvent();
} else {
    // Tenta novamente após um pequeno atraso
    setTimeout(registerEvent, 1000);
}

// Comando para redefinir as variáveis (opcional)
if (window.SlashCommandParser && window.SlashCommand) {
    const { SlashCommandParser, SlashCommand } = window;

    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'resetpoll',
        callback: (namedArgs, unnamedArgs) => {
            messageCount = 0;
            eventChance = 0.1;
            cooldownCounter = 0;
            console.log("Streamer Poll Event: Variáveis resetadas pelo comando /resetpoll.");
            return "Variáveis de enquete resetadas.";
        },
        aliases: [],
        returns: 'Mensagem de confirmação',
        namedArgumentList: [],
        unnamedArgumentList: [],
        helpString: `
            <div>
                Reseta as variáveis da extensão Streamer Poll Event.
            </div>
            <div>
                <strong>Uso:</strong>
                <pre><code class="language-stscript">/resetpoll</code></pre>
            </div>
        `,
    }));
} else {
    console.warn("Streamer Poll Event: Não foi possível registrar o comando /resetpoll. SlashCommandParser não está disponível.");
}
