/**
 * 日志工具类
 * 统一管理项目中的日志输出
 */

// 检查环境，只在开发环境下显示详细日志
const isDevelopment = process.env.NODE_ENV === 'development';

export class Logger {
  private prefix: string;
  
  constructor(prefix: string) {
    this.prefix = prefix;
  }
  
  /**
   * 调试日志 - 仅在开发环境显示
   */
  debug(message: string, ...args: any[]): void {
    if (isDevelopment) {
      console.log(`[${this.prefix}] ${message}`, ...args);
    }
  }
  
  /**
   * 信息日志 - 仅在开发环境显示
   */
  info(message: string, ...args: any[]): void {
    if (isDevelopment) {
      console.info(`[${this.prefix}] ${message}`, ...args);
    }
  }
  
  /**
   * 警告日志 - 所有环境都显示
   */
  warn(message: string, ...args: any[]): void {
    console.warn(`[${this.prefix}] ${message}`, ...args);
  }
  
  /**
   * 错误日志 - 所有环境都显示
   */
  error(message: string, ...args: any[]): void {
    console.error(`[${this.prefix}] ${message}`, ...args);
  }
  
  /**
   * 向后兼容的日志方法 - 转为普通info日志
   * @deprecated 使用标准日志方法替代
   */
  log(message: string, ...args: any[]): void {
    this.info(message, ...args);
  }
}

/**
 * 创建日志实例
 */
export const createLogger = (prefix: string): Logger => {
  return new Logger(prefix);
};

export default createLogger;
