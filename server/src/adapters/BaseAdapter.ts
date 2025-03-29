import { AiService } from "../models/AiService";

/**
 * 聊天消息接口
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * AI服务适配器接口
 * 所有AI服务适配器必须实现此接口
 */
export interface AiServiceAdapter {
  /**
   * 初始化适配器
   * @param service AI服务配置
   */
  initialize(service: AiService): void;
  
  /**
   * 发送聊天请求
   * @param messages 消息列表
   * @param options 可选配置参数
   */
  chat(messages: ChatMessage[], options?: any): Promise<{
    content: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    }
  }>;
  
  /**
   * 测试连接
   * 返回连接测试结果
   */
  testConnection(): Promise<{success: boolean, message: string}>;
  
  /**
   * 获取适配器支持的模型列表
   */
  getSupportedModels(): Array<{value: string, label: string}>;
}
