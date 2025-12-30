import { Project, Task, Phase } from './schema';

/**
 * Calculate the current day number relative to project start
 */
export function computeTodayNumber(startDate: string, todayDate: Date = new Date()): number {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    todayDate.setHours(0, 0, 0, 0);
    const diffTime = todayDate.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

/**
 * Pick up to 3 tasks for Today Card based on:
 * - pending (todo state)
 * - dependencies satisfied
 * - recommendedDay near today
 * - mix of types preferred
 */
export function pickTodayTasks(project: Project, todayNumber: number): Task[] {
    const pendingTasks = project.tasks.filter(t => t.state === 'todo');
    const doneTasks = new Set(project.tasks.filter(t => t.state === 'done').map(t => t.taskId));

    const availableTasks = pendingTasks.filter(task => {
        return task.dependsOnTaskIds.every(depId => doneTasks.has(depId));
    });

    const scoredTasks = availableTasks.map(task => {
        const dayDiff = task.schedule.recommendedDay - todayNumber;
        let score = 0;
        if (dayDiff <= 0) {
            score = 1000 - Math.abs(dayDiff);
        } else {
            score = 500 - dayDiff;
        }
        return { task, score };
    });

    scoredTasks.sort((a, b) => b.score - a.score);

    const selected: Task[] = [];
    const usedTypes = new Set<string>();

    for (const { task } of scoredTasks) {
        if (selected.length >= 3) break;
        if (!usedTypes.has(task.type)) {
            selected.push(task);
            usedTypes.add(task.type);
        }
    }

    for (const { task } of scoredTasks) {
        if (selected.length >= 3) break;
        if (!selected.includes(task)) {
            selected.push(task);
        }
    }

    return selected;
}

/**
 * Apply local task state changes without LLM call
 */
export function applyLocalTaskStateChange(
    project: Project,
    taskId: string,
    newState: 'done' | 'skipped'
): Project {
    const now = new Date().toISOString();
    const updatedTasks = project.tasks.map(task => {
        if (task.taskId === taskId) {
            return { ...task, state: newState, lastUpdated: now };
        }
        return task;
    });

    let updatedSkills = project.skillTree.skills;
    if (newState === 'done') {
        const completedTask = project.tasks.find(t => t.taskId === taskId);
        if (completedTask) {
            updatedSkills = project.skillTree.skills.map(skill => {
                const impact = completedTask.skillImpact.find(si => si.skillId === skill.skillId);
                if (impact) {
                    const newLevel = Math.min(skill.level + impact.delta, skill.maxLevel);
                    return { ...skill, level: newLevel };
                }
                return skill;
            });
        }
    }

    return {
        ...project,
        tasks: updatedTasks,
        skillTree: { skills: updatedSkills },
        updatedAt: now
    };
}

/**
 * Generate ICS calendar file content
 */
export function buildIcs(project: Project, taskTypesFilter?: string[]): string {
    const lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Axiom//Axiom PWA//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:${project.name}`
    ];

    const startDate = new Date(project.startDate);

    const filteredTasks = taskTypesFilter
        ? project.tasks.filter(t => taskTypesFilter.includes(t.type))
        : project.tasks;

    for (const task of filteredTasks) {
        if (task.state === 'done') continue;

        const eventDate = new Date(startDate);
        eventDate.setDate(eventDate.getDate() + task.schedule.recommendedDay);

        const dateStr = formatICSDate(eventDate);
        const endTime = new Date(eventDate);
        endTime.setMinutes(endTime.getMinutes() + task.durationMinutes);
        const endStr = formatICSDate(endTime);

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${task.taskId}@axiom`);
        lines.push(`DTSTAMP:${formatICSDate(new Date())}`);
        lines.push(`DTSTART:${dateStr}`);
        lines.push(`DTEND:${endStr}`);
        lines.push(`SUMMARY:[${project.name}] ${task.name}`);
        lines.push(`DESCRIPTION:${task.details.steps.join('\\n')}`);
        lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
}

function formatICSDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get date from project start + day number
 */
export function getDateFromDay(startDate: string, dayNumber: number): Date {
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayNumber);
    return date;
}

/**
 * Calculate phase progress percentage
 */
export function getPhaseProgress(phase: Phase, tasks: Task[]): number {
    const phaseTasks = tasks.filter(t => t.phaseId === phase.phaseId);
    if (phaseTasks.length === 0) return 0;
    const doneTasks = phaseTasks.filter(t => t.state === 'done').length;
    return Math.round((doneTasks / phaseTasks.length) * 100);
}

/**
 * Get overall project progress
 */
export function getProjectProgress(project: Project): number {
    if (project.tasks.length === 0) return 0;
    const doneTasks = project.tasks.filter(t => t.state === 'done').length;
    return Math.round((doneTasks / project.tasks.length) * 100);
}

/**
 * Check if project is paused and should show pause UI
 */
export function isProjectActivelyPaused(project: Project): boolean {
    if (!project.pause.isPaused) return false;
    if (!project.pause.pauseUntil) return true;

    const pauseUntil = new Date(project.pause.pauseUntil);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    pauseUntil.setHours(0, 0, 0, 0);

    return today <= pauseUntil;
}

/**
 * Generate Mermaid Gantt chart definition
 */
export function generateGanttDefinition(project: Project): string {
    const lines: string[] = [
        'gantt',
        `    title ${project.name}`,
        '    dateFormat YYYY-MM-DD',
        `    axisFormat %m/%d`
    ];

    const startDate = new Date(project.startDate);

    for (const phase of project.roadmap.phases.sort((a, b) => a.order - b.order)) {
        lines.push(`    section ${phase.name}`);

        const phaseTasks = project.tasks
            .filter(t => t.phaseId === phase.phaseId)
            .sort((a, b) => a.schedule.recommendedDay - b.schedule.recommendedDay);

        for (const task of phaseTasks.slice(0, 10)) {
            const taskStart = new Date(startDate);
            taskStart.setDate(taskStart.getDate() + task.schedule.recommendedDay);
            const duration = Math.max(1, Math.ceil(task.durationMinutes / 60 / 8));

            const status = task.state === 'done' ? 'done,' : task.state === 'skipped' ? 'crit,' : '';
            const taskName = task.name.replace(/[:\[\]]/g, '').substring(0, 30);

            lines.push(`    ${taskName} :${status} ${formatDate(taskStart)}, ${duration}d`);
        }
    }

    return lines.join('\n');
}

/**
 * Generate a simple user ID for cloud sync
 */
export function generateUserId(): string {
    return 'user_' + Math.random().toString(36).substring(2, 15);
}
