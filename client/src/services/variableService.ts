import axios from 'axios';
import VariableEventService from './VariableEventService';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

/**
 * 生成UUID
 * 用于创建自定义变量时确保使用UUID格式的ID
 * @returns UUID字符串，如 "f9c17d21-a0a0-476f-973e-433e08f7be38"
 */
export const generateUUID = (): string => {
  // RFC4122 v4 标准的UUID生成
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * 将时间戳转换为UUID格式
 * 用于转换时间戳格式的ID为UUID格式
 * @param timestamp 时间戳字符串或数字
 * @returns UUID格式的字符串
 */
export const timestampToUUID = (timestamp: string | number): string => {
  const ts = String(timestamp).padStart(13, '0');
  const date = new Date(Number(ts));
  
  // 生成UUID的各个部分
  const p1 = (date.getTime() & 0xffffffff).toString(16).padStart(8, '0');
  const p2 = ((date.getTime() >> 32) & 0xffff).toString(16).padStart(4, '0');
  const p3 = ((1 << 12) | (date.getTime() & 0x0fff)).toString(16).padStart(4, '0');
  
  // y是版本位，取值范围是8-b
  const p4 = ((8 + (date.getTime() % 4)) << 12 | (date.getTime() & 0x0fff)).toString(16).padStart(4, '0');
  
  // 生成剩余的12个随机字符
  const p5 = Array.from({length: 12}, () => 
    Math.floor(Math.random() * 16).toString(16)).join('');
  
  // 组合UUID
  return `${p1}-${p2}-${p3}-${p4}-${p5}`;
};

/**
 * 全局变量服务
 * 处理与变量API的通信
 */
export const variableService = {
  /**
   * 获取变量列表
   * @param filters 过滤条件 
   */
  getVariables: async (filters?: { type?: string, sourceId?: string }) => {
    try {
      return await axios.get(`${API_BASE_URL}/variables`, { params: filters });
    } catch (error) {
      console.error('获取变量列表失败:', error);
      throw error;
    }
  },
  
  /**
   * 获取单个变量详情
   * @param id 变量ID
   */
  getVariable: async (id: string) => {
    try {
      return await axios.get(`${API_BASE_URL}/variables/${id}`);
    } catch (error) {
      console.error(`获取变量详情失败 ID=${id}:`, error);
      throw error;
    }
  },
  
  /**
   * 创建自定义变量
   * @param data 变量数据
   */
  createVariable: async (data: { name: string, value: string }) => {
    try {
      // 不再由前端生成UUID和标识符，这部分交给后端处理
      // 只发送必要的数据给后端API
      const createData = {
        ...data,
        entityId: generateUUID(), // 提供entityId但让后端格式化标识符
      };
      
      console.log('[variableService] 创建自定义变量');
      
      const result = await axios.post(`${API_BASE_URL}/variables`, createData);
      // 通知变量发生变更
      VariableEventService.notifyVariableChange();
      return result;
    } catch (error) {
      console.error('创建变量失败:', error);
      throw error;
    }
  },
  
  /**
   * 更新自定义变量
   * @param id 变量ID
   * @param data 更新数据
   */
  updateVariable: async (id: string, data: { name?: string, value?: string }) => {
    try {
      const result = await axios.put(`${API_BASE_URL}/variables/${id}`, data);
      // 通知变量发生变更
      VariableEventService.notifyVariableChange();
      return result;
    } catch (error) {
      console.error(`更新变量失败 ID=${id}:`, error);
      throw error;
    }
  },
  
  /**
   * 删除自定义变量
   * @param id 变量ID
   */
  deleteVariable: async (id: string) => {
    try {
      const result = await axios.delete(`${API_BASE_URL}/variables/${id}`);
      // 通知变量发生变更
      VariableEventService.notifyVariableChange();
      return result;
    } catch (error) {
      console.error(`删除变量失败 ID=${id}:`, error);
      throw error;
    }
  },
  
  /**
   * 复制变量标识符到剪贴板
   * @param identifier 变量标识符
   * @returns 是否复制成功
   */
  copyIdentifierToClipboard: async (identifier: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(identifier);
      return true;
    } catch (error) {
      console.error('复制到剪贴板失败:', error);
      return false;
    }
  }
};

/**
 * 变量类型枚举
 */
export enum VariableType {
  NPC = 'npc',
  TASK = 'task',
  CUSTOM = 'custom',
  FILE = 'file',
  WORKFLOW = 'workflow'
}

/**
 * 变量来源类型
 */
export interface VariableSource {
  id: string;
  name: string;
  type: string;
}

/**
 * 变量数据模型
 */
export interface Variable {
  id: string;
  name: string;
  type: VariableType;
  source: VariableSource;
  identifier: string;
  displayIdentifier?: string; // 用于UI显示的标识符
  value: string;
  createdAt: Date;
  updatedAt: Date;
}
