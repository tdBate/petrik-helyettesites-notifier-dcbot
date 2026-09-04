export interface RootSubstitution {
  lessons: Lesson[]
  substitution: Substitution
  teacher: Teacher2
}


export interface Lesson {
  classrooms: any[]
  cohorts: string[]
  day: Day
  id: string
  period: Period
  periodsPerWeek: number
  subject: Subject
  teachers: Teacher[]
  termDefinitionId: string
  weeksDefinitionId: string
}

export interface Day {
  days: string[]
  id: string
  name: string
  short: string
  createdAt: string
  updatedAt: string
}

export interface Period {
  endTime: string
  id: string
  period: number
  startTime: string
}

export interface Subject {
  id: string
  name: string
  short: string
}

export interface Teacher {
  id: string
  name: string
  short: string
}

export interface Substitution {
  comment: string
  date: string
  id: string
  substituter: string
}

export interface Teacher2 {
  firstName: string
  id: string
  lastName: string
  short: string
}
