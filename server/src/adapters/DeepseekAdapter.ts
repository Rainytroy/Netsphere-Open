import { AiService, AiServiceType } from "../models/AiService";
import { AiServiceAdapter, ChatMessage } from "./BaseAdapter";
import axios from 'axios';

// 定义Axios错误类型
interface AxiosError {
  response?: {
    data?: any;
    status?: number;
    headers?: any;
  };
  request?: any;
  message: string;
  config?: any;
  code?: string;
}

// DeepSeek API响应接口定义
interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
    }
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * DeepSeek API适配器
 */
export class DeepseekAdapter implements AiServiceAdapter {
  private service: AiService | null = null;
  private apiKey: string = '';
  private baseUrl: string = '';
  
  /**
   * 初始化适配器
   */
  initialize(service: AiService): void {
    if (service.type !== AiServiceType.DEEPSEEK) {
      throw new Error('服务类型不匹配');
    }
    
    this.service = service;
    this.apiKey = service.decryptApiKey();
    this.baseUrl = service.baseUrl || 'https://api.deepseek.com';
  }
  
  /**
   * 发送聊天请求
   */
  async chat(messages: ChatMessage[], options?: any): Promise<{
    content: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    }
  }> {
    if (!this.service) {
      throw new Error('适配器未初始化');
    }
    
    try {
      const model = options?.model || this.service.defaultModel || 'deepseek-chat';
      const temperature = options?.temperature ?? this.service.config?.temperature ?? 0.7;
      const maxTokens = options?.maxTokens ?? this.service.config?.maxTokens ?? 2000;
      
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      
      const data = response.data as DeepSeekResponse;
      
      return {
        content: data.choices[0].message.content,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens
        } : undefined
      };
    } catch (error) {
      // 处理错误
      const axiosError = error as any;
      if (axiosError.response) {
        console.error('DeepSeek API调用失败:', axiosError.response?.data || axiosError.message);
        throw new Error(`DeepSeek API调用失败: ${
          axiosError.response.data && typeof axiosError.response.data === 'object' 
            ? JSON.stringify(axiosError.response.data)
            : axiosError.message
        }`);
      }
      throw error;
    }
  }
  
  /**
   * 测试连接
   */
  async testConnection(): Promise<{success: boolean, message: string}> {
    if (!this.service) {
      return { success: false, message: '适配器未初始化' };
    }
    
    try {
      // 发送简单的测试请求
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.service.defaultModel || 'deepseek-chat',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 5,
          stream: false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      
      return { 
        success: true, 
        message: `连接成功: 模型 ${this.service.defaultModel || 'deepseek-chat'} 可用` 
      };
    } catch (error) {
      // 处理错误
      const axiosError = error as any;
      if (axiosError.response) {
        return { 
          success: false, 
          message: `连接测试失败: ${
            axiosError.response.data && typeof axiosError.response.data === 'object' 
              ? JSON.stringify(axiosError.response.data)
              : axiosError.message
          }` 
        };
      }
      return { 
        success: false, 
        message: `连接测试失败: ${error instanceof Error ? error.message : '未知错误'}` 
      };
    }
  }
  
  /**
   * 获取支持的模型列表
   */
  getSupportedModels(): Array<{value: string, label: string}> {
    return [
      { value: 'deepseek-chat', label: 'DeepSeek Chat' },
      { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner' }
    ];
  }
}
