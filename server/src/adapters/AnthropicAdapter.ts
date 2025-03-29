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

// Anthropic API响应接口定义
interface AnthropicResponse {
  content: Array<{
    text: string;
  }>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Anthropic Claude API适配器
 */
export class AnthropicAdapter implements AiServiceAdapter {
  private service: AiService | null = null;
  private apiKey: string = '';
  
  /**
   * 初始化适配器
   */
  initialize(service: AiService): void {
    if (service.type !== AiServiceType.ANTHROPIC) {
      throw new Error('服务类型不匹配');
    }
    
    this.service = service;
    this.apiKey = service.decryptApiKey();
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
      const model = options?.model || this.service.defaultModel || 'claude-3-sonnet-20240229';
      const temperature = options?.temperature ?? this.service.config?.temperature ?? 0.7;
      const maxTokens = options?.maxTokens ?? this.service.config?.maxTokens ?? 4000;
      
      // 转换消息格式为Anthropic格式
      // Claude API消息格式与标准格式有所不同，需要转换
      const systemMessage = messages.find(m => m.role === 'system');
      const userAssistantMessages = messages.filter(m => m.role !== 'system');
      
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model,
          system: systemMessage?.content || '',
          messages: userAssistantMessages.map(m => ({
            role: m.role,
            content: m.content
          })),
          temperature,
          max_tokens: maxTokens
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01'
          }
        }
      );
      
      const data = response.data as AnthropicResponse;
      
      return {
        content: data.content[0].text,
        usage: data.usage ? {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens
        } : undefined
      };
    } catch (error) {
      const axiosError = error as any;
      if (axiosError.response) {
        console.error('Anthropic API调用失败:', axiosError.response?.data || axiosError.message);
        throw new Error(`Anthropic API调用失败: ${
          axiosError.response?.data && typeof axiosError.response.data === 'object' 
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
        'https://api.anthropic.com/v1/messages',
        {
          model: this.service.defaultModel || 'claude-3-sonnet-20240229',
          system: '',
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 5
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01'
          }
        }
      );
      
      return { 
        success: true, 
        message: `连接成功: 模型 ${this.service.defaultModel || 'claude-3-sonnet-20240229'} 可用` 
      };
    } catch (error) {
      const axiosError = error as any;
      if (axiosError.response) {
        return { 
          success: false, 
          message: `连接测试失败: ${
            axiosError.response?.data && typeof axiosError.response.data === 'object' 
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
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
      { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
      { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' }
    ];
  }
}
