import { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } from "discord.js";
import { RootSubstitution, Lesson, Day, Period, Subject, Teacher, Substitution, Teacher2, ShortSubstitution, ServerData } from "./models/Models";
import { createMessageText, detecChanges, filterData, isClassImpacted, parseSubstitution, saveServerData } from "./tools";
import fs from "node:fs";
import "dotenv/config";

//data stuff
const URL_SUBSTITUTIONS: string = "https://filc.petrik.hu/api/timetable/substitutions";
let substitutionData: RootSubstitution[];
let serverData: ServerData[];

async function setup() {
    substitutionData = JSON.parse(fs.readFileSync("./data/substitutions.json").toString());
    serverData = JSON.parse(fs.readFileSync("./data/servers.json").toString());
}

async function getData() {
    try {
        const response: Response = await fetch(URL_SUBSTITUTIONS);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const new_substitutionData: RootSubstitution[] = filterData(JSON.parse(await response.text()).data);

        //check for changes
        if (JSON.stringify(new_substitutionData) != JSON.stringify(substitutionData)) {
            const changes: RootSubstitution[] = detecChanges(substitutionData, new_substitutionData);
            for (let i = 0; i < changes.length; i++) {
                const shortSub: ShortSubstitution = parseSubstitution(changes[i]);
                sendMessage(shortSub);
            }

            substitutionData = new_substitutionData;
            fs.writeFileSync("./data/substitutions.json", JSON.stringify(substitutionData));
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
        client.channels.fetch(serverData[i].channel_id).then(channel => {
            if (channel && channel.isSendable()) {
                if (isClassImpacted(data, serverData[i].cohort)) { //check if selected class is impacted
                    channel.send(createMessageText(data));
                }
            }
        })
    }
}


async function main() {
    await setup();
    await getData();

    setInterval(() => {
        getData();
    }, (1000 * 60) * 5);
}

setupDiscord();