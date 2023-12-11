import dayjs from 'dayjs'

export function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
    return dayjs(date).format(format)
}

export function ISOStringDate(date) {
    return dayjs(date).toISOString()
}

export function randText(length = 8) {
    let result = 'j'
    for (let i = 0; i < length + 1; i++) {
        const padding = result.length < length ? length - result.length : 0
        result += Math.random().toString(36).substring(2, 2 + padding)
    }
    return result
}

export function getFirstLetter(str) {
    let firstChar = str.charAt(0).toUpperCase()
    if (firstChar >= 'A' && firstChar <= 'Z') {
        return firstChar
    }

    if (firstChar >= '0' && firstChar <= '9') {
        return firstChar

    }
    if (typeof pinyin === 'undefined') {
        return '#'
    }
    if (firstChar >= '\u4e00' && firstChar <= '\u9fa5') {
        // Chinese
        let r = pinyin(firstChar, { toneType: 'none', style: pinyin.STYLE_FIRST_LETTER })
        if (r) return r[0].toUpperCase()
    }
    return '#'
}

export class Logger {
    constructor() {
        this.level = 'debug'

        this.debug = console.log
        this.info = console.log
        this.warn = console.log
        this.error = console.log
    }
}
export const logger = new Logger()
