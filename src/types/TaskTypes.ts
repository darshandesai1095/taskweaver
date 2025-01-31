export interface Task {
    name: string;
    action: (input?: any) => Promise<any>;
    dependencies?: string[];
    branches?: Array<{
        condition: (results: Record<string, any>) => boolean;
        next: string[];
    }>;
    default?: string[];
    next?: string[];
    input?: (results: Record<string, any>) => any;
    timeout?: number;
    retry?: { maxAttempts: number; delay: number };
    onStart?: (task: Task) => void | Promise<void>;
    onComplete?: (result: Record<string, any>) => Task | Task[] | null | Promise<Task | Task[] | null | any>;
    onError?: (error: Error, task: Task, results: Record<string, any>) => void | Promise<Task | Task[] | null | any>;
    metadata?: Record<string, any>;
    progress?: number;
    runIf?: (results: Record<string, any>) => boolean | Promise<boolean>;
}
