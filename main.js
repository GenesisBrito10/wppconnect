const express = require('express');
const bodyParser = require('body-parser');
const wppconnect = require('@wppconnect-team/wppconnect');
const fs = require('fs').promises;

const app = express();
const PORT = 8080; // ou a porta desejada
app.use(bodyParser.json());

const clients = [];

const SEND_MESSAGE_ROUTE = '/sendMessage/:phone/:group';
const CREATE_SESSION_ROUTE = '/createSession/:sessionName';


// Rota para criar uma nova sessão
app.post(CREATE_SESSION_ROUTE, async (req, res) => {
    try {
        const sessionName = req.params.sessionName;

        if (clients.find(client => client.sessionName === sessionName)) {
            res.status(400).send("Session already exists for the provided name.");
            return;
        }

        const client = await createSession(sessionName);
        clients.push({ sessionName, client });

        res.send(`Session "${sessionName}" created successfully.`);
    } catch (error) {
        console.log("createSession error", error);
        res.status(500).send("Error creating session.");
    }
});


app.post(SEND_MESSAGE_ROUTE, async (req, res) => {
    try {
        const phoneNumber = req.params.phone;
        const group = req.params.group;
        const message = req.body.message;

        const clientInfo = clients.find(client => client.sessionName === phoneNumber);

        if (!clientInfo) {
            res.status(400).send("Session not found for the provided phone number.");
            return;
        }

        const { client, sessionName } = clientInfo;

        await client.sendText(`${group}@g.us`, message); // Correção aqui: use sendText em vez de sendMessage

        res.send("Message sent successfully to the group.");
    } catch (error) {
        console.log("sendMessage error", error);
        res.status(500).send("Error sending message to the group.");
    }
});



// Função para criar uma nova sessão
async function createSession(sessionName) {
    return wppconnect.create({
        session: sessionName,
        puppeteerOptions: {
            userDataDir: `./tokens/${sessionName}`,
            args: ['--no-sandbox', '--disable-gpu','--enable-chrome-browser-cloud-management']
        },
       
        statusFind: (statusSession, session) => {
            console.log('Status Session: ', statusSession);
            console.log('Session name: ', session);
        },
        headless: "new",
        logQR: true,
        disableWelcome: false,
        updatesLog: true,
        autoClose: 90000,
        
    });
}

// Função para iniciar o cliente para uma sessão específica
function startSession(client, sessionName) {
    
    client.onMessage((message) => {
        if (message.body === 'Hello') {
            console.log(message.chatId)
               
        }
    });
}

// Função para obter os nomes das sessões a partir da pasta "tokens"
async function getSessionNames() {
    try {
        const tokenFolder = './tokens';
        const sessionNames = await fs.readdir(tokenFolder);
        return sessionNames;
    } catch (error) {
        console.error('Error reading session names: ', error);
        return [];
    }
}

// Exemplo de como criar e iniciar sessões a partir da pasta "tokens"
async function createAndStartSessions() {
    const sessionNames = await getSessionNames();

    if (sessionNames.length === 0) {
        console.log('No sessions found in the "tokens" folder.');
        return;
    }

    sessionNames.forEach(async (sessionName) => {
        const client = await createSession(sessionName);
        clients.push({ sessionName, client });
        startSession(client, sessionName);
    });
}

// Chamada da função principal
 createAndStartSessions();
 console.log('Sessoes: ', clients);
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});