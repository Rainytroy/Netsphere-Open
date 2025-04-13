/**
 * 日志工具类
 * 提供统一的日志输出格式，便于调试和追踪
 */

enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

interface LogOptions {
  /**
   * 是否显示时间戳
   */
  showTimestamp?: boolean;
  
  /**
   * 日志前缀
   */
  prefix?: string;
  
  /**
   * 是否在生产环境输出（默认不输出）
   */
  logInProduction?: boolean;
  
  /**
   * 是否格式化对象输出
   */
  formatObjects?: boolean;
}

/**
 * 工作流日志工具
 * 集中处理日志输出，提供更好的格式化和控制
 */
export class WorkflowLogger {
  private static readonly DEFAULT_OPTIONS: LogOptions = {
    showTimestamp: true,
    prefix: '[Workflow]',
    logInProduction: false,
    formatObjects: true
  };
  
  private readonly options: LogOptions;
  private readonly logPrefix: string;
  
  /**
   * 创建一个新的日志记录器
   * @param module 模块名称，会添加到日志前缀
   * @param options 日志选项
   */
  constructor(module: string, options: LogOptions = {}) {
    this.options = { ...WorkflowLogger.DEFAULT_OPTIONS, ...options };
    this.logPrefix = options.prefix 
      ? `${options.prefix} [${module}]` 
      : `[Workflow] [${module}]`;
  }
  
  /**
   * 格式化日志消息
   * @param level 日志级别
   * @param message 消息内容
   * @returns 格式化后的消息
   */
  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = this.options.showTimestamp 
      ? `[${new Date().toISOString()}] `
      : '';
    
    return `${timestamp}${this.logPrefix} ${level}: ${message}`;
  }
  
  /**
   * 格式化对象参数
   * @param args 参数列表
   * @returns 处理后的参数列表
   */
  private formatArgs(args: any[]): any[] {
    if (!this.options.formatObjects) return args;
    
    return args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        try {
          // 尝试转换对象为有缩进的JSON字符串
          return typeof arg.toJSON === 'function' 
            ? arg.toJSON()
            : JSON.stringify(arg, null, 2);
        } catch (e) {
          return arg;
        }
      }
      return arg;
    });
  }
  
  /**
   * 是否应该记录日志
   * @returns 是否记录
   */
  private shouldLog(): boolean {
    // 在生产环境下，根据配置决定是否输出
    if (process.env.NODE_ENV === 'production') {
      return !!this.options.logInProduction;
    }
    return true;
  }
  
  /**
   * 记录调试信息
   * @param message 消息内容
   * @param args 附加参数
   */
  debug(message: string, ...args: any[]): void {
    if (!this.shouldLog()) return;
    console.debug(this.formatMessage(LogLevel.DEBUG, message), ...this.formatArgs(args));
  }
  
  /**
   * 记录一般信息
   * @param message 消息内容
   * @param args 附加参数
   */
  info(message: string, ...args: any[]): void {
    if (!this.shouldLog()) return;
    console.log(this.formatMessage(LogLevel.INFO, message), ...this.formatArgs(args));
  }
  
  /**
   * 记录警告信息
   * @param message 消息内容
   * @param args 附加参数
   */
  warn(message: string, ...args: any[]): void {
    if (!this.shouldLog()) return;
    console.warn(this.formatMessage(LogLevel.WARN, message), ...this.formatArgs(args));
  }
  
  /**
   * 记录错误信息
   * @param message 消息内容
   * @param args 附加参数
   */
  error(message: string, ...args: any[]): void {
    if (!this.shouldLog()) return;
    console.error(this.formatMessage(LogLevel.ERROR, message), ...this.formatArgs(args));
  }
  
  /**
   * 记录对象摘要 - 适用于大型对象的日志记录
   * @param label 标签
   * @param obj 要记录的对象
   * @param keys 要包含的关键字段，如果未指定则尝试提取所有顶级字段
   */
  logObjectSummary(label: string, obj: any, keys?: string[]): void {
    if (!this.shouldLog() || !obj) return;
    
    try {
      const summary: Record<string, any> = {};
      
      if (keys && keys.length > 0) {
        // 提取指定的字段
        keys.forEach(key => {
          if (obj[key] !== undefined) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
              // 对于对象类型，只记录类型和大小信息
              const isArray = Array.isArray(obj[key]);
              summary[key] = isArray 
                ? `Array(${obj[key].length})` 
                : `Object(${Object.keys(obj[key]).length} props)`;
            } else {
              summary[key] = obj[key];
            }
          }
        });
      } else {
        // 尝试提取所有顶级字段，但限制大小
        Object.keys(obj).slice(0, 10).forEach(key => {
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            const isArray = Array.isArray(obj[key]);
            summary[key] = isArray 
              ? `Array(${obj[key].length})` 
              : `Object(${Object.keys(obj[key]).length} props)`;
          } else {
            summary[key] = obj[key];
          }
        });
        
        // 如果有更多字段，添加提示
        if (Object.keys(obj).length > 10) {
          summary['...'] = `(${Object.keys(obj).length - 10} more fields)`;
        }
      }
      
      this.info(`${label}:`, summary);
    } catch (error) {
      this.warn(`Failed to log object summary for ${label}:`, error);
      this.info(`${label} (fallback):`, obj);
    }
  }
}

/**
 * 创建针对显示节点的日志记录器
 * @returns 显示节点日志记录器
 */
export function createDisplayNodeLogger(): WorkflowLogger {
  return new WorkflowLogger('DisplayNode');
}

/**
 * 创建针对工作流引擎的日志记录器
 * @returns 工作流引擎日志记录器
 */
export function createWorkflowEngineLogger(): WorkflowLogger {
  return new WorkflowLogger('Engine');
}

/**
 * 创建针对变量处理的日志记录器
 * @returns 变量处理日志记录器
 */
export function createVariableLogger(): WorkflowLogger {
  return new WorkflowLogger('Variables');
}
