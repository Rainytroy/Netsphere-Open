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

// Volces API响应接口定义
interface VolcesResponse {
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
 * 火山引擎 AI API适配器
 * 
 * 注意：使用此适配器需要设置您自己的火山引擎API密钥
 * 在项目根目录的.env文件中设置ENCRYPTION_KEY环境变量
 * 然后通过Web界面配置服务
 */
export class VolcesAdapter implements AiServiceAdapter {
  private service: AiService | null = null;
  private apiKey: string = '';
  private baseUrl: string = '';
  
  /**
   * 初始化适配器
   */
  initialize(service: AiService): void {
    if (service.type !== AiServiceType.VOLCES) {
      throw new Error('服务类型不匹配');
    }
    
    this.service = service;
    this.apiKey = service.decryptApiKey();
    this.baseUrl = service.baseUrl || 'https://ark.cn-beijing.volces.com/api/v3';
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
      const model = options?.model || this.service.defaultModel || 'deepseek-v3-250324';
      const temperature = options?.temperature ?? this.service.config?.temperature ?? 0.7;
      const maxTokens = options?.maxTokens ?? this.service.config?.maxTokens ?? 2000;
      
      // 火山引擎特殊处理，针对doubao模型和多模态内容
      let formattedMessages = messages;
      let requestBody: any = {
        model,
        temperature,
        max_tokens: maxTokens,
        stream: this.service.useStream || false
      };
      
      // 如果是豆包模型，使用特殊的消息格式
      if (model === 'doubao-1-5-thinking-pro-250415') {
        // 转换消息格式为豆包模型所需的格式
        const transformedMessages = messages.map(msg => {
          // 只处理用户消息，系统消息和助手消息保持不变
          if (msg.role === 'user') {
            // 检查消息内容中是否包含图片标记
            if (typeof msg.content === 'string' && msg.content.includes('[IMAGE:')) {
              // 提取图片URL
              const imageMatches = msg.content.match(/\[IMAGE:([^\]]+)\]/g);
              const textContent = msg.content.replace(/\[IMAGE:[^\]]+\]/g, '').trim();
              
              // 构建多模态内容数组
              const contentArray: any[] = [];
              
              // 添加文本内容
              if (textContent) {
                contentArray.push({
                  text: textContent,
                  type: 'text'
                });
              }
              
              // 添加图片内容
              if (imageMatches) {
                imageMatches.forEach(match => {
                  const url = match.substring(7, match.length - 1);
                  contentArray.push({
                    image_url: {
                      url: url
                    },
                    type: 'image_url'
                  });
                });
              }
              
              // 返回多模态格式的消息
              return {
                role: 'user',
                content: contentArray
              };
            }
          }
          return msg;
        });
        
        requestBody.messages = transformedMessages;
      } else {
        // 其他模型使用标准消息格式
        requestBody.messages = formattedMessages;
      }
      
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      
      const data = response.data as VolcesResponse;
      
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
        console.error('火山引擎API调用失败:', axiosError.response?.data || axiosError.message);
        throw new Error(`火山引擎API调用失败: ${
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
      // 获取默认模型
      const model = this.service.defaultModel || 'deepseek-v3-250324';
      
      // 准备测试请求体
      let requestBody: any = {
        model,
        max_tokens: 5,
        stream: false
      };
      
      // 根据模型类型创建请求消息
      if (model === 'doubao-1-5-thinking-pro-250415') {
        // 测试连接时使用适合doubao模型的简单消息格式
        requestBody.messages = [{
          role: 'user',
          content: [{
            text: 'Hello',
            type: 'text'
          }]
        }];
      } else {
        // 其他模型使用标准消息格式
        requestBody.messages = [{ role: 'user', content: 'Hello' }];
      }
      
      // 发送测试请求
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      
      return { 
        success: true, 
        message: `连接成功: 模型 ${this.service.defaultModel || 'deepseek-v3-250324'} 可用` 
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
      { value: 'deepseek-v3-250324', label: 'DeepSeek V3' },
      { value: 'deepseek-r1-250120', label: 'DeepSeek R1' },
      { value: 'doubao-1-5-thinking-pro-250415', label: '豆包大模型' }
    ];
  }
}
