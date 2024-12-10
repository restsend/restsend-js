
export function formatDate(date) {
    if (!date) return ''
    if (typeof data === 'string') {
        date = new Date(date)
    }
    return date
}

export function randText(length = 8) {
    let result = 'j'
    for (let i = 0; i < length + 1; i++) {
        const padding = result.length < length ? length - result.length : 0
        result += Math.random().toString(36).substring(2, 2 + padding)
    }
    return result
}

export class Logger {
    constructor() {
        this.level = 'debug'
        this.debug = console.debug
        this.info = console.info
        this.warn = console.warn
        this.error = console.error
    }
}
export const logger = new Logger()
