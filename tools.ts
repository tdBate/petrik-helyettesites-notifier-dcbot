import { RootSubstitution, Lesson, Day, Period, Subject, Teacher, Substitution, Teacher2, ShortSubstitution } from "./models/Models";
import { ServerData } from "./models/Models";
import fs from "node:fs";

export function parseSubstitution(data: RootSubstitution) {
    try {
        const base_lesson: Lesson = data.lessons[0];

        // lessons
        const lessonSubject = base_lesson.subject.short;
        const cohort = base_lesson.cohorts.join(", ");
        const date = data.substitution.date;
        const classroom = base_lesson.classrooms.map(c => c.name || '').join(', ') || "N/A";
        const teacher = base_lesson.teachers.map(a => a.name).join(", ");

        let ido = "";

        for (let i = 0; i < data.lessons.length; i++) {
            const base_lesson: Lesson = data.lessons[i];

            // time
            const startTime = base_lesson.period.startTime.substring(0, 5);
            const endTime = base_lesson.period.endTime.substring(0, 5);
            ido += `${base_lesson.period.period}. óra (${startTime} - ${endTime}) `;
        }

        let subteacher: string;
        if (data.substitution.substituter == null) {
            subteacher = "Elmarad";
        } else { subteacher = `${data.teacher.firstName} ${data.teacher.lastName}`; }

        const comment = data.substitution.comment;

        return {
            lessons: lessonSubject,
            cohorts: cohort,
            date: date,
            time: ido,
            classroom: classroom,
            teacher: teacher,
            subteacher: subteacher,
            comment: comment
        } as ShortSubstitution
    } catch (err) { console.error(err); }
}

//check for empty records
export function filterData(data: RootSubstitution[]): RootSubstitution[] {
    for (let i = data.length - 1; i >= 0; i--) {
        if (data[i].lessons.length == 0) {
            data.splice(i, 1);
        };
    }
    return data;
}


export function detecChanges(oldData: RootSubstitution[], newData: RootSubstitution[]) {
    let addedSubstitutions: RootSubstitution[] = [];
    for (let i = 0; i < newData.length; i++) {
        const item: RootSubstitution = newData[i];

        if (!oldData.some((a: RootSubstitution) => JSON.stringify(a) == JSON.stringify(item))) {
            addedSubstitutions.push(item);
        }
    }
    return addedSubstitutions
}

export function createMessageText(data: ShortSubstitution): string {
    const message = `🚨 **Substitution Notice** 🚨

📅 **Date:** ${data.date}
⏰ **Time:** ${data.time}
📚 **Lesson(s):** ${data.lessons}
🎓 **Class/Cohort:** ${data.cohorts}
🚪 **Classroom:** ${data.classroom}

👤 **Original Teacher:** ${data.teacher}
🧑‍🏫 **Substitute Teacher:** ${data.subteacher}
📝 **Comment:** ${data.comment || "None"}`;

    return message;
}

export function isClassImpacted(data: ShortSubstitution, cohort: string): boolean {
    const impactedCohorts: string[] = data.cohorts.split(", ");

    if (impactedCohorts.includes(cohort)) { return true; }
    return false;
};

export function saveServerData(serverData: ServerData[]) {
    fs.writeFileSync("./data/servers.json", JSON.stringify(serverData));
}