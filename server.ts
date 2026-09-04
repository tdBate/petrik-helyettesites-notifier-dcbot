import { urlSafeCharacters } from "discord.js";
import { RootSubstitution, Lesson, Day, Period, Subject, Teacher, Substitution, Teacher2 } from "./models/Models";

const URL_SUBSTITUTIONS: string = "https://filc.petrik.hu/api/timetable/substitutions";
let substitutionData: RootSubstitution[]

function filterData() {
    for (let i = substitutionData.length - 1; i >= 0; i--) {
        if (substitutionData[i].lessons.length == 0) {
            substitutionData.splice(i,1);
        };
    }
}

async function getData() {
    const response: Response = await fetch(URL_SUBSTITUTIONS);
    substitutionData = await JSON.parse(await response.text()).data;

    filterData();
}

getData();