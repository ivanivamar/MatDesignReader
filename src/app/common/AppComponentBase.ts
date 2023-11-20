export class AppComponentBase {
    constructor() {
    }

    IsNullOrEmpty = (value: string) => {
        return value === undefined || value === null || value.trim() === '';
    }

    IdGenerator(): string {
        let id = '';
        // mix of numbers and letters
        const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (let i = 0; i < 20; i++) {
            id += chars[Math.floor(Math.random() * chars.length)];
        }
        return id;
    }
}
