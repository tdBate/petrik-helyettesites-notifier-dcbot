import { Client, GatewayIntentBits } from "discord.js";
import { RootSubstitution, Lesson, Day, Period, Subject, Teacher, Substitution, Teacher2, ShortSubstitution } from "./models/Models";
import { createMessageText, detecChanges, filterData, parseSubstitution } from "./tools";
import fs from "node:fs";
import "dotenv/config";

//data stuff
const URL_SUBSTITUTIONS: string = "https://filc.petrik.hu/api/timetable/substitutions";
let substitutionData: RootSubstitution[];

async function setup() {
    substitutionData = JSON.parse(fs.readFileSync("./data/substitutions.json").toString());
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
                sendMessage(createMessageText(parseSubstitution(changes[i]) as ShortSubstitution));
            }

            substitutionData = new_substitutionData;
            fs.writeFileSync("./data/substitutions.json", JSON.stringify(substitutionData));
            console.log("Update detected...");
        }
    } catch (err) {console.error(err);}
}

//discord stuff
const SERVER_ID = process.env.SERVER_ID;
const channel_id = process.env.CHANNEL_ID;
let guild;
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

function setupDiscord() {
    client.login(process.env.DISCORD_TOKEN);

    client.once("clientReady", () => {
        client.user?.setStatus('online');
        console.log("bot online");
        guild = client.guilds.cache.get(SERVER_ID!); //get server
        if (!guild) { console.log("No server found"); return; }
        main();
    })
}

function sendMessage(text: string) {
    client.channels.fetch(channel_id!).then(channel => {
        if (channel && channel.isSendable()) {
            channel.send(text);
        }
    })
}


async function main() {
    await setup();
    await getData();

    setInterval(() => {
        getData();
    }, (1000 * 60) * 5);
}

setupDiscord();