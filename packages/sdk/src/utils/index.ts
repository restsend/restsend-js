/* eslint-disable @typescript-eslint/no-explicit-any */
export function formatDate(date: Date | string | undefined): Date {
  if (!date) return new Date();
  if (typeof date === "string") {
    date = new Date(date);
  }
  return date;
}

/**
 * 将输入的日期转换为时间戳（毫秒）
 * @param date 可能为 null、string 或 Date
 * @returns 时间戳（毫秒），无效日期返回 -Infinity
 */
export function toDateTimestamp(date: Date | string | null | undefined): number {
  if (!date) return -Infinity;

  const parsedDate = typeof date === "string" ? new Date(date) : date;
  return parsedDate instanceof Date && !isNaN(parsedDate.getTime())
    ? parsedDate.getTime()
    : -Infinity;
}

export function randText(length = 8) {
  let result = "j";
  for (let i = 0; i < length + 1; i++) {
    const padding = result.length < length ? length - result.length : 0;
    result += Math.random()
      .toString(36)
      .substring(2, 2 + padding);
  }
  return result;
}

export class Logger {
  level: string;
  debug: (message?: any, ...optionalParams: any[]) => void;
  info: (message?: any, ...optionalParams: any[]) => void;
  warn: (message?: any, ...optionalParams: any[]) => void;
  error: (message?: any, ...optionalParams: any[]) => void;

  constructor() {
    this.level = "debug";
    this.debug = console.debug;
    this.info = console.info;
    this.warn = console.warn;
    this.error = console.error;
  }
}
export const logger = new Logger();


export * from "./type_tools";