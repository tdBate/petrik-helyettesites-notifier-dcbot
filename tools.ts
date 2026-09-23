import { RootSubstitution, Lesson, Day, Period, Subject, Teacher, Substitution, Teacher2, ShortSubstitution, ShortNews, RootNews } from "./models/Models";
import { ServerData } from "./models/Models";
import fs from "node:fs";

const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function parseSubstitution(data: RootSubstitution): ShortSubstitution | null {
    try {
        const base_lesson: Lesson = data.lessons[0];

        // lessons
        let lessonSubject = "N/A";
        try {
            lessonSubject = base_lesson.subject.short;
        } catch (err) { console.error(err); }
        const cohort = base_lesson.cohorts.join(", ");
        const date = data.substitution.date;
        const classroom = base_lesson.classrooms.map(c => c.name || '').join(', ') || "N/A";
        const teacher = base_lesson.teachers.map(a => a.name).join(", ");

        let ido = data.lessons.map(a => a.period.period).sort((a, b) => a - b).join("-") + " óra";

        let subteacher: string;
        if (data.substitution.substituter == null) {
            subteacher = "Elmarad";
        } else { subteacher = `${data.teacher.firstName} ${data.teacher.lastName}`; }

        const comment = data.substitution.comment;

        const shortSub = {
            lessons: lessonSubject,
            cohorts: cohort,
            date: date,
            time: ido,
            classroom: classroom,
            teacher: teacher,
            subteacher: subteacher,
            comment: comment
        }
        return shortSub;
    } catch (err) { console.error(err); return null; }
}

export function parseNews(data: RootNews): ShortNews | null {
    try {
        const shortNew: ShortNews = {
            title: data.title,
            content: data.content.map(item => item.content).join("\n"),
            time: new Date(data.validUntil)
        };

        return shortNew;

    } catch (err) { console.error(err); return null; }
}

//check for empty records
export function filterData(data: RootSubstitution[]): RootSubstitution[] {
    return data.filter(item => item.lessons && item.lessons.length > 0);
}


export function detectSubChanges(oldData: RootSubstitution[], newData: RootSubstitution[]) {
    let addedSubstitutions: RootSubstitution[] = [];
    for (let i = 0; i < newData.length; i++) {
        const newItem: RootSubstitution = newData[i];

        if (!oldData.some((oldItem: RootSubstitution) => oldItem.substitution.id == newItem.substitution.id)) {
            addedSubstitutions.push(newItem);
        }
    }
    return addedSubstitutions;
}

export function detectNewsChanges(oldData: ShortNews[], newData: ShortNews[]): ShortNews[] {
    let addedNews: ShortNews[] = [];
    for (let i = 0; i < newData.length; i++) {
        const item: ShortNews = newData[i];

        if (!oldData.some((a: ShortNews) => JSON.stringify(a) == JSON.stringify(item))) {
            addedNews.push(item);
        }
    }
    return addedNews;
}

export function createMessageText(data: ShortSubstitution): string {
    const date = new Date(data.date);
    const message = `## **Substitution Notice**
> *Time*   :: ${date.toLocaleDateString("hu-HU")} **${weekday[date.getDay()]}** @ ${data.time}
> *Class*  :: ${data.cohorts} (Room: ${data.classroom})
> *Lesson* :: **${data.lessons}**
> *Staff*  :: **${data.subteacher}** (covering ${data.teacher})
> *Note*   :: ${data.comment || "None"}`;

    return message;
}

export function createNewsMessageText(data: ShortNews): string {
    let message = `## **Announcements Notice**
> **${data.title}**`;

    if (data.content) {
        message += `\n > ${data.content.replaceAll("\n", "\n > ")}`
    }

    message += `\n > *${data.time.toLocaleDateString("hu-HU")} ${weekday[data.time.getDay()]}*`;

    return message;
}

export function isClassImpacted(data: ShortSubstitution, cohort: string): boolean {
    const impactedCohorts: string[] = data.cohorts.split(", ");

    if (cohort == "ALL") { return true; }
    else if (impactedCohorts.includes(cohort)) { return true; }
    return false;
};

export function isNewsClassImpacted(data: ShortNews, cohort: string): boolean {
    const title = data.title.toUpperCase()
    const content = data.content.toUpperCase();

    const cohortWithoutDot = cohort.replace(".", "");
    return (cohort == "ALL" || content.includes(cohort) || title.includes(cohort) || content.includes(cohortWithoutDot) || title.includes(cohortWithoutDot));
}

export function saveServerData(serverData: ServerData[]) {
    fs.writeFileSync("./data/servers.json", JSON.stringify(serverData));
}