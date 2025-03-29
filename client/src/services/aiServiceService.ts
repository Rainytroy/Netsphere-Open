import axios from 'axios';
import { message } from 'antd';

// 环境变量中的API基础路径
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

// AI服务类型枚举
export enum AiServiceType {
  DEEPSEEK = 'deepseek',
  ANTHROPIC = 'anthropic'
}

// AI服务数据模型
export interface AiService {
  id: string;                     // 唯一标识
  name: string;                   // 服务名称
  type: AiServiceType;            // 服务类型
  apiKey: string;                 // API密钥
  baseUrl?: string;               // 基础URL
  defaultModel?: string;          // 默认模型
  config?: Record<string, any>;   // 其他配置参数
  isDefault?: boolean;            // 是否为默认服务
  createdAt: Date;                // 创建时间
  updatedAt: Date;                // 更新时间
}

// 统一的错误处理函数
const handleApiError = (error: any) => {
  if (error.response) {
    // 服务器响应了错误状态码
    const errorMsg = error.response.data?.message || '服务器错误';
    message.error(errorMsg);
    console.error('API错误:', error.response.data);
  } else if (error.request) {
    // 请求已发出，但未收到响应
    message.error('无法连接到服务器，请检查网络连接');
    console.error('网络错误:', error.request);
  } else {
    // 请求设置出错
    message.error('请求错误: ' + error.message);
    console.error('请求错误:', error.message);
  }
};

// AI服务API接口
export const aiServiceService = {
  // 获取所有AI服务
  getServices: async () => {
    try {
      return await axios.get<AiService[]>(`${API_BASE_URL}/api/ai-services`);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  // 获取单个AI服务
  getService: async (id: string) => {
    try {
      return await axios.get<AiService>(`${API_BASE_URL}/api/ai-services/${id}`);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  // 创建AI服务
  createService: async (service: Omit<AiService, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      return await axios.post<AiService>(`${API_BASE_URL}/api/ai-services`, service);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  // 更新AI服务
  updateService: async (id: string, service: Partial<AiService>) => {
    try {
      return await axios.put<AiService>(`${API_BASE_URL}/api/ai-services/${id}`, service);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  // 删除AI服务
  deleteService: async (id: string) => {
    try {
      return await axios.delete(`${API_BASE_URL}/api/ai-services/${id}`);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  // 设置默认AI服务
  setDefault: async (id: string) => {
    try {
      return await axios.put<AiService>(`${API_BASE_URL}/api/ai-services/${id}/default`);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  // 获取默认AI服务
  getDefaultService: async () => {
    try {
      return await axios.get<AiService>(`${API_BASE_URL}/api/ai-services/default`);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  // 测试AI服务连接
  testConnection: async (service: Partial<AiService>) => {
    try {
      if (service.id) {
        // 测试已存在的服务
        return await axios.post<{success: boolean, message: string}>(
          `${API_BASE_URL}/api/ai-services/${service.id}/test`
        );
      } else {
        // 测试新配置
        return await axios.post<{success: boolean, message: string}>(
          `${API_BASE_URL}/api/ai-services/test`, 
          service
        );
      }
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  }
};

// 服务配置模板（针对不同服务类型的配置项定义）
export const serviceConfigTemplates: Record<AiServiceType, {
  requiresBaseUrl: boolean;
  availableModels: Array<{value: string, label: string}>;
  defaultModel: string;
  configFields: Array<{
    name: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'switch';
    defaultValue: any;
    options?: Array<{value: any, label: string}>;
  }>;
}> = {
  [AiServiceType.DEEPSEEK]: {
    requiresBaseUrl: true,
    availableModels: [
      { value: 'deepseek-chat', label: 'DeepSeek Chat' },
      { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner' }
    ],
    defaultModel: 'deepseek-chat',
    configFields: [
      {
        name: 'temperature',
        label: '温度',
        type: 'number',
        defaultValue: 0.7
      },
      {
        name: 'maxTokens',
        label: '最大Token数',
        type: 'number',
        defaultValue: 2000
      }
    ]
  },
  [AiServiceType.ANTHROPIC]: {
    requiresBaseUrl: false,
    availableModels: [
      { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
      { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
      { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' }
    ],
    defaultModel: 'claude-3-sonnet-20240229',
    configFields: [
      {
        name: 'temperature',
        label: '温度',
        type: 'number',
        defaultValue: 0.7
      },
      {
        name: 'maxTokens',
        label: '最大Token数',
        type: 'number',
        defaultValue: 4000
      }
    ]
  }
};

export function getServiceTypeLabel(type: AiServiceType): string {
  switch (type) {
    case AiServiceType.DEEPSEEK:
      return 'DeepSeek';
    case AiServiceType.ANTHROPIC:
      return 'Anthropic Claude';
    default:
      return type;
  }
}
