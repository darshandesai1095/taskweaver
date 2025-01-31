export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const log = (verbose: boolean, message: string): void => {
    if (verbose) {
        console.log(message);
    }
};
