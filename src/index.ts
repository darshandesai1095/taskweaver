import { Workflow } from './core/Workflow';

// Example Workflow with Parallel Tasks, Dependencies, and Advanced Features

// const workflow = new Workflow(
//     'exampleWorkflow',
//     [{
//         name: 'start',
//         action: async () => {
//             console.log('Start task executed');
//             return { type: 'A' }; // Example result
//         },
//         branches: [
//             {
//                 condition: (result) => result.type === 'A',
//                 next: ['taskA', 'taskB'], // Parallel tasks A and B
//             },
//             {
//                 condition: (result) => result.type === 'B',
//                 next: ['taskB'],
//             },
//         ],
//         default: ['taskC'], // Fallback
//         timeout: 3000, // Timeout for the task
//         retry: { maxAttempts: 3, delay: 1000 }, // Retry logic for this task
//         onComplete: async (result) => {
//             console.log('Start task completed. Result:', result);
//         },
//     },
//     {
//         name: 'taskA',
//         action: async () => {
//             console.log('Task A executed');
//             return { value: 42 };
//         },
//         next: 'taskC', // Task C depends on Task A and Task B
//         timeout: 5000, // Timeout for this task
//         retry: { maxAttempts: 2, delay: 500 }, // Retry logic for this task
//         onComplete: async (result) => {
//             console.log('Task A completed. Result:', result);
//         },
//     },
//     {
//         name: 'taskB',
//         action: async () => {
//             console.log('Task B executed');
//             return { value: 100 };
//         },
//         next: 'taskC', // Task C depends on Task A and Task B
//         timeout: 3000, // Timeout for this task
//         retry: { maxAttempts: 1, delay: 2000 }, // Retry logic for this task
//         onComplete: async (result) => {
//             console.log('Task B completed. Result:', result);
//         },
//     },
//     {
//         name: 'taskC',
//         action: async () => {
//             console.log('Task C executed (both Task A and Task B completed)');
//             return { success: true };
//         },
//         dependencies: ['taskA', 'taskB'], // Task C depends on Task A and Task B
//         timeout: 4000, // Timeout for this task
//         retry: { maxAttempts: 2, delay: 500 }, // Retry logic for this task
//         onComplete: async (result) => {
//             console.log('Task C completed. Result:', result);
//         },
//         onError: async (error, task, results) => {
//             console.error('Task C failed:', error);
//         }
//     },
// ]);

const complexWorkflow = new Workflow(
    'complexWorkflow',
    [
        {
            name: 'init',
            action: async () => {
                console.log('Init task executed');
                return { userType: 'premium' };
            },
            branches: [
                {
                    condition: (result) => result.userType === 'premium',
                    next: ['fetchPremiumData', 'sendWelcomeEmail'],
                },
                {
                    condition: (result) => result.userType === 'basic',
                    next: ['fetchBasicData'],
                },
            ],
            default: ['fallbackTask'], // Fallback task
            timeout: 5000,
            retry: { maxAttempts: 2, delay: 1000 },
        },
        {
            name: 'fetchPremiumData',
            action: async () => {
                console.log('Fetching premium user data');
                return { data: 'Premium Data' };
            },
            next: 'processPremiumData',
        },
        {
            name: 'processPremiumData',
            action: async () => {
                console.log('Processing premium data');
            },
            next: 'generateReport',
        },
        {
            name: 'sendWelcomeEmail',
            action: async () => {
                console.log('Sending welcome email to premium user');
            },
        },
        {
            name: 'fetchBasicData',
            action: async () => {
                console.log('Fetching basic user data');
            },
            next: 'processBasicData',
        },
        {
            name: 'processBasicData',
            action: async () => {
                console.log('Processing basic data');
            },
            next: 'generateReport',
        },
        {
            name: 'generateReport',
            action: async () => {
                console.log('Generating report based on user data');
                return { report: 'User Report Generated' };
            },
            onComplete: async (result) => {
                console.log('Report generation completed:', result);
            },
        },
        {
            name: 'fallbackTask',
            action: async () => {
                console.log('Fallback task executed for unknown user type');
            },
            next: 'notifyAdmin',
        },
        {
            name: 'notifyAdmin',
            action: async () => {
                console.log('Notifying admin about unknown user type');
            },
        },
    ],
);


// Visualize the workflow
complexWorkflow.visualize();

// Execute the workflow
// workflow.executeWorkflow('start').then((results) => {
//     console.log('Workflow complete. Final Results:', results);
// }).catch((error) => {
//     console.error('Workflow execution failed:', error);
// });
