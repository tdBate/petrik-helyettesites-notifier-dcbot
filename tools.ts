import { RootSubstitution, Lesson, Day, Period, Subject, Teacher, Substitution, Teacher2, ShortSubstitution } from "./models/Models";

export function parseSubstitution(data: RootSubstitution) {
    try {
        const base_lesson = data.lessons[0];

        // lessons
        const lessonSubject = base_lesson.subject.short;
        const cohort = base_lesson.cohorts.join(", ");

        const date = data.substitution.date;


        // time
        const startTime = base_lesson.period.startTime.substring(0, 5);
        const endTime = base_lesson.period.endTime.substring(0, 5);
        const ido = `${base_lesson.day.name}, ${base_lesson.period.period}. óra (${startTime} - ${endTime})`;

        const classroom = base_lesson.classrooms.map(c => c.name || '').join(', ') || "N/A";

        const teacher = base_lesson.teachers.map(a => a.name).join(", ");

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
    } catch (err) { console.error(err) }
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