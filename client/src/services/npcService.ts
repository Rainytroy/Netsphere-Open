import axios from 'axios';
import VariableEventService from './VariableEventService';

// 默认的错误处理助手函数
const handleApiError = (error: any) => {
  console.error('API请求失败:', error);
  
  // 尝试获取详细的错误信息
  let errorMessage = '操作失败';
  
  if (error.response) {
    // 服务器回应了请求，但返回了错误状态码
    const responseData = error.response.data;
    if (responseData && responseData.message) {
      errorMessage = responseData.message;
      
      // 显示缺失字段信息
      if (responseData.missingFields) {
        errorMessage += '：';
        const missingKeys = Object.keys(responseData.missingFields).filter(key => responseData.missingFields[key]);
        errorMessage += missingKeys.join(', ');
      }
    }
  } else if (error.request) {
    // 请求已发送但没有收到回应
    errorMessage = '服务器无响应，请检查网络连接';
  }
  
  throw new Error(errorMessage);
};

// 定义NPC数据模型接口
export interface Npc {
  id: string;
  name: string;
  avatar?: string;
  knowledgeBackground: string;
  actionPrinciples: string;
  activityLevel: number;
  activityLevelDescription: string;
  description?: string;
  promptTemplate?: string;
  files?: {
    images: string[];
    documents: string[];
    searchResults: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

// 创建一个axios实例，设置基础URL
const apiClient = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// NPC服务对象
export const npcService = {
  // 获取NPC列表
  getNpcs: async () => {
    try {
      return await apiClient.get<Npc[]>('/npc');
    } catch (error) {
      handleApiError(error);
      throw error; // 这行应该不会执行，因为handleApiError会抛出错误
    }
  },
  
  // 获取单个NPC详情
  getNpc: async (id: string) => {
    try {
      return await apiClient.get<Npc>(`/npc/${id}`);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  // 创建新NPC
  createNpc: async (npc: Omit<Npc, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const response = await apiClient.post<Npc>('/npc', npc);
      // 通知变量系统更新
      VariableEventService.notifyVariableChange();
      return response;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  // 更新NPC
  updateNpc: async (id: string, npc: Partial<Npc>) => {
    try {
      const response = await apiClient.put<Npc>(`/npc/${id}`, npc);
      // 通知变量系统更新
      VariableEventService.notifyVariableChange();
      return response;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  // 删除NPC
  deleteNpc: async (id: string) => {
    try {
      const response = await apiClient.delete(`/npc/${id}`);
      // 通知变量系统更新
      VariableEventService.notifyVariableChange();
      return response;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  // 上传NPC头像
  uploadAvatar: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    
    return apiClient.post(`/npc/${id}/avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};
