export interface Task {
    name: string;
    action: (input?: any) => Promise<any>;
    dependencies?: string[];
    branches?: Array<{
        condition: (result: any) => boolean;
        next: string[];
    }>;
    default?: string[];
    next?: string;
    input?: (results: Record<string, any>) => any;
    timeout?: number;
    retry?: { maxAttempts: number; delay: number; exponentialBackoff?: boolean };
    onStart?: (task: Task) => void | Promise<void>;
    onComplete?: (result: Record<string, any>) => Task | Task[] | null | Promise<Task | Task[] | null | any>;
    onError?: (error: Error, task: Task, results: Record<string, any>) => void | Promise<Task | Task[] | null | any>;
    metadata?: Record<string, any>;
    
    // New Features
    priority?: number;
    type?: string;
    progress?: number;
    onNotification?: (message: string) => void;
    state?: 'Pending' | 'Running' | 'Completed' | 'Failed' | 'Cancelled';
    runIf?: (results: Record<string, any>) => boolean;
    context?: Record<string, any>;
    logs?: string[];
    resourceLimits?: { memory: number; cpu: number; network: number };
    executionTime?: { start: number; end: number };
}
