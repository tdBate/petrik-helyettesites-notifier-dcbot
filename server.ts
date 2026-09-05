import { urlSafeCharacters } from "discord.js";
import { RootSubstitution, Lesson, Day, Period, Subject, Teacher, Substitution, Teacher2, ShortSubstitution } from "./models/Models";
import { detecChanges, filterData, parseSubstitution } from "./tools";
import fs from "node:fs";
import { json } from "node:stream/consumers";

const URL_SUBSTITUTIONS: string = "https://filc.petrik.hu/api/timetable/substitutions";
let substitutionData: RootSubstitution[];

async function setup() {
    substitutionData= await JSON.parse(fs.readFileSync("./data/substitutions.json").toString());
}

async function getData() {
    const response: Response = await fetch(URL_SUBSTITUTIONS);
    const new_substitutionData:RootSubstitution[] = filterData(JSON.parse(await response.text()).data);

    //check for changes
    if (JSON.stringify(new_substitutionData) != JSON.stringify(substitutionData)) {
        const changes:RootSubstitution[] = detecChanges(substitutionData, new_substitutionData);
        for (let i = 0; i < changes.length; i++) {
            console.log(parseSubstitution(changes[i]));
        }

        substitutionData = new_substitutionData;
        fs.writeFileSync("./data/substitutions.json", JSON.stringify(substitutionData));
        console.log("Update detected...");
    }
}

function main() {
    setup();
    getData();
}

main();