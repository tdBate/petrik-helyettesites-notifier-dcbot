import { urlSafeCharacters } from "discord.js";
import { RootSubstitution, Lesson, Day, Period, Subject, Teacher, Substitution, Teacher2 } from "./models/Models";
import { detailedDiff, DetailedDiff } from "deep-object-diff";
import fs from "node:fs";
import { DiffEntry } from "node:util";

const URL_SUBSTITUTIONS: string = "https://filc.petrik.hu/api/timetable/substitutions";
let substitutionData: RootSubstitution[];

async function setup() {
    substitutionData= await JSON.parse(fs.readFileSync("./data/substitutions.json").toString());
}

function filterData(data:RootSubstitution[]):RootSubstitution[] {
    for (let i = data.length - 1; i >= 0; i--) {
        if (data[i].lessons.length == 0) {
            data.splice(i,1);
        };
    }
    return data;
}

async function getData() {
    const response: Response = await fetch(URL_SUBSTITUTIONS);
    const new_substitutionData:RootSubstitution[] = filterData(JSON.parse(await response.text()).data);

    //check for changes
    if (JSON.stringify(new_substitutionData) != JSON.stringify(substitutionData)) {
        const changes:DetailedDiff = detailedDiff(substitutionData,new_substitutionData);
        if (!(Object.keys(changes.added).length === 0)) {
            console.log(Object.entries(changes.added)[0][1]);
        }
        if (!(Object.keys(changes.updated).length === 0)) {
            //not implemented yet
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