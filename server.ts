import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } from "discord.js";
import { RootSubstitution, ShortSubstitution, ServerData, ShortNews, RootNews } from "./models/Models";
import { createMessageText, detectSubChanges, filterData, isClassImpacted, parseNews, parseSubstitution, saveServerData, detectNewsChanges, isNewsClassImpacted, createNewsMessageText } from "./tools";
import fs from "node:fs";
import "dotenv/config";

//data stuff
const URL_SUBSTITUTIONS: string = "https://filc.petrik.hu/api/timetable/substitutions";
const URL_NEWS: string = "https://filc.petrik.hu/api/news/announcements";

let substitutionData: RootSubstitution[];
let newsData: ShortNews[];
let serverData: ServerData[];

async function setup() {
    substitutionData = JSON.parse(fs.readFileSync("./data/substitutions.json").toString());
    newsData = JSON.parse(fs.readFileSync("./data/announcements.json").toString());
    serverData = JSON.parse(fs.readFileSync("./data/servers.json").toString());
}

async function getSubData() {
    try {
        const response: Response = await fetch(URL_SUBSTITUTIONS);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const new_substitutionData: RootSubstitution[] = filterData(JSON.parse(await response.text()).data);

        //check for changes
        if (JSON.stringify(new_substitutionData) != JSON.stringify(substitutionData)) {
            const changes: RootSubstitution[] = detectSubChanges(substitutionData, new_substitutionData);
            //if (changes.length>10) {throw new Error("Too much new data");}
            for (let i = 0; i < changes.length; i++) {
                const shortSub = parseSubstitution(changes[i]);
                if (shortSub != null) {
                    sendMessage(shortSub);
                }
            }

            substitutionData = new_substitutionData;
            fs.writeFileSync("./data/substitutions.json", JSON.stringify(substitutionData));
            console.log("Update detected...");
        }
    } catch (err) { console.error(err); }
}

async function getNewsData() {
    try {
        const response: Response = await fetch(URL_NEWS, {
            method: "GET",
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                "Cookie": `__Secure-filc.session_token=${process.env.SESSION_TOKEN}`
            }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const new_newsData = (JSON.parse(await response.text()).data).map((item: RootNews) => parseNews(item)) as ShortNews[];
        if (!new_newsData) { throw new Error("Error in parsing new"); }

        //check for changes
        if (JSON.stringify(new_newsData) != JSON.stringify(newsData)) {
            const changes: ShortNews[] = detectNewsChanges(newsData, new_newsData);
            //if (changes.length>10) {throw new Error("Too much new data");}
            for (let i = 0; i < changes.length; i++) {
                const shortNew = changes[i];
                if (shortNew != null) {
                    console.log(shortNew);
                    sendNewsMessage(shortNew);
                }
            }

            newsData = new_newsData;
            fs.writeFileSync("./data/announcements.json", JSON.stringify(newsData));
            console.log("Update detected...");
        }
    } catch (err) { console.error(err); }
}

//discord stuff
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

function setupDiscord() {
    client.login(process.env.DISCORD_TOKEN);

    const commands = [
        new SlashCommandBuilder()
            .setName('set-output-channel')
            .setDescription('Sets bot output to current channel'),
        new SlashCommandBuilder()
            .setName("set-class")
            .setDescription("Selects what class to filter")
            .addStringOption(option =>
                option.setName("class")
                    .setDescription('Format: "13.e" or "all"')
            )
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN as string);

    (async () => {
        try {
            console.log('Registering slash commands...');
            await rest.put(
                Routes.applicationCommands(process.env.APPLICATION_ID as string),
                { body: commands }
            );
            console.log('Slash commands registered successfully.');
        } catch (error) {
            console.error('Error registering commands:', error);
        }
    })();

    client.on('interactionCreate', async interaction => {
        if (!interaction.isChatInputCommand()) return;
        if (!interaction.guildId) { return interaction.reply("Can only be used in a server") }

        if (interaction.commandName == 'set-output-channel') {
            const serverIndex = serverData.findIndex(item => item.server_id == interaction.guildId);
            if (serverIndex != -1) {
                serverData[serverIndex].channel_id = interaction.channelId;
            } else {
                const server: ServerData = {
                    server_id: interaction.guildId,
                    channel_id: interaction.channelId,
                    cohort: ""
                }
                serverData.push(server);
            }
            saveServerData(serverData);

            await interaction.reply('Bot added to channel');
        } else if (interaction.commandName == "set-class") {
            const userInput = interaction.options.getString("class")?.toUpperCase().trim();

            const serverIndex = serverData.findIndex(item => item.server_id == interaction.guildId);

            if (serverIndex != -1) {
                serverData[serverIndex].cohort = userInput!;
            } else {
                return interaction.reply("Error: first set bot output");
            }
            saveServerData(serverData);
            return interaction.reply("Class selected");

        }
    });

    client.once("clientReady", () => {
        client.user?.setStatus('online');
        console.log("bot online");
        main();
    })
}

function sendMessage(data: ShortSubstitution) {
    for (let i = 0; i < serverData.length; i++) {
        if (isClassImpacted(data, serverData[i].cohort)) { //check if selected class is impacted
            client.channels.fetch(serverData[i].channel_id).then(channel => {
                if (channel && channel.isSendable()) {
                    channel.send(createMessageText(data));
                }
            })
        }
    }
}

function sendNewsMessage(data: ShortNews) {
    for (let i = 0; i < serverData.length; i++) {
        if (isNewsClassImpacted(data, serverData[i].cohort)) {
            client.channels.fetch(serverData[i].channel_id).then(channel => {
                if (channel && channel.isSendable()) {
                    channel.send(createNewsMessageText(data));
                }
            })
        }
    }
}


async function main() {
    await setup();
    await getSubData();
    await getNewsData();

    setInterval(() => {
        getSubData();
        getNewsData();
    }, (1000 * 60) * 5);
}

setupDiscord();
