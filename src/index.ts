import { wait } from './core/utils';
import { Workflow } from './core/Workflow2';
import { Task } from './types/TaskTypes';
export { Workflow, Task };

const workflow = new Workflow(
    'exampleWorkflow',
    [{
        name: 'start',
        action: async () => {
            await wait(1000); // Simulate some async operation
            return { type: 'A' }; // Example result
        },
        branches: [
            {
                condition: (result) => result['start'].type === 'A',
                next: ['taskA', 'taskB'], // Parallel tasks A and B
            },
            {
                condition: (result) => result['start'].type === 'B',
                next: ['taskB'],
            },
        ],
        default: ['taskC'],
        timeout: 5000, // Timeout for the task
        retry: { maxAttempts: 3, delay: 1000 }, // Retry logic for this task
        onComplete: async (result) => {
            console.log('Start task completed. Result:', result);
        },
    },
    {
        name: 'taskA',
        action: async () => {
            await wait(2000); // Simulate some async operation

        },
        next: ['taskB'], // Task C depends on Task A and Task B
        timeout: 5000, // Timeout for this task
        retry: { maxAttempts: 2, delay: 5000 }, // Retry logic for this task
        onComplete: async (result) => {
            console.log('Task A completed. Result:', result);
        },
    },
    {
        name: 'taskB',
        action: async () => {
            await wait(4000); // Simulate some async operation

        },
        next: ['taskC'], // Task C depends on Task A and Task B
        timeout: 5000, // Timeout for this task
        retry: { maxAttempts: 1, delay: 2000 }, // Retry logic for this task
        onComplete: async (result) => {
            console.log('Task B completed. Result:', result);
        },
    },
    {
        name: 'taskC',
        action: async () => {
            await wait(1000); // Simulate some async operation
            return { success: true };
        },
        timeout: 4000, // Timeout for this task
        retry: { maxAttempts: 2, delay: 2000 }, // Retry logic for this task
        onComplete: async (result) => {
            console.log('Task C completed. Result:', result);
        },
        onError: async (error, task, results) => {
            console.error('Task C failed:', error);
        }
    },
], {verbose: true});



async function runWorkflow() {
    try {
        await workflow.start(); // This will wait until the workflow completes
        console.log('Workflow has completed!');
        const logs = workflow.getLog()
        const dependencies = workflow.getDependenciesList()
        console.log('Log:', JSON.stringify(logs, null, 2));
        console.log('dependencies:', dependencies);
    } catch (error) {
        console.error('An error occurred while running the workflow:', error);
    }
}

// Call the runWorkflow function
runWorkflow();
