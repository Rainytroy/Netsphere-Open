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

// 创建一个axios实例，设置基础URL
const apiClient = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 工作任务状态枚举
export enum WorkTaskStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived'
}

// 执行状态枚举
export enum ExecutionStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// 工作任务接口
export interface WorkTask {
  id: string;
  name: string;
  input: string;
  npcId: string;
  npcName: string;
  aiServiceId: string;
  aiServiceName: string;
  npcPromptTemplate: {
    template: string;
    isCustomized: boolean;
  };
  output: string;
  status: 'draft' | 'active' | 'archived';
  executionStatus: 'idle' | 'running' | 'completed' | 'failed';
  executionMessage?: string;
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
  // 富文本内容 - 用于支持变量编辑器2
  richInput?: {
    html: string;     // 带格式和变量标记的HTML
    rawText: string;  // 带@变量标记的纯文本
  };
  // NPC模板集合 - 用于保存不同NPC的提示词模板
  npcTemplates?: Record<string, {
    template: string;      // 模板内容
    isCustomized: boolean; // 是否为自定义模板
    lastModified?: string; // 最后修改时间
  }>;
}

// 创建工作任务请求参数
export interface CreateWorkTaskParams {
  name: string;
  input: string;
  npcId?: string; // 现在是可选的
  npcName?: string; // 现在是可选的
  aiServiceId: string;
  aiServiceName: string;
  npcPromptTemplate?: {
    template: string;
    isCustomized: boolean;
  };
  status?: 'draft' | 'active' | 'archived';
  // 富文本内容 - 用于支持变量编辑器2
  richInput?: {
    html: string;
    rawText: string;
  };
}

// 更新工作任务请求参数
export interface UpdateWorkTaskParams {
  name?: string;
  input?: string;
  npcId?: string;
  npcName?: string;
  aiServiceId?: string;
  aiServiceName?: string;
  npcPromptTemplate?: {
    template: string;
    isCustomized: boolean;
  };
  status?: 'draft' | 'active' | 'archived';
  // 富文本内容 - 用于支持变量编辑器2
  richInput?: {
    html: string;
    rawText: string;
  };
}

/**
 * 变量解析详细信息
 */
export interface VariableResolutionDetail {
  originalText?: string;
  matches?: any[];
  variables?: any[];
  replacements?: any[];
  errors?: any[];
  resolvedText?: string;
  totalReplacements?: number;
  executionTimeMs?: number;
  success?: boolean;
  changed?: boolean;
  firstDifference?: any;
}

/**
 * 测试执行工作任务的调试信息
 */
export interface TestExecuteDebugInfo {
  originalInput: string;
  resolvedInput: string;
  originalTemplate: string;
  resolvedTemplate: string;
  fullPrompt: string;
  serverLogs?: string[]; // 服务端处理日志
  variableResolution?: {
    input?: VariableResolutionDetail;
    template?: VariableResolutionDetail;
  };
}

/**
 * 测试执行工作任务的响应
 */
export interface TestExecuteResponse {
  output: string;
  debug?: TestExecuteDebugInfo;
  serverLogs?: string[]; // 服务端处理日志
}

/**
 * NPC提示词模板接口
 */
export interface NpcPromptTemplate {
  template: string;      // 模板内容
  isCustomized: boolean; // 是否为自定义模板
  lastModified?: string; // 最后修改时间，ISO格式
}

/**
 * 工作任务的模板集合
 */
export type NpcTemplates = Record<string, NpcPromptTemplate>;

/**
 * 工作任务服务
 * 提供与工作任务相关的API调用
 */
const workTaskService = {
  /**
   * 获取所有工作任务
   */
  getAllWorkTasks: async (): Promise<WorkTask[]> => {
    try {
      const response = await apiClient.get<WorkTask[]>('/work-tasks');
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  /**
   * 获取单个工作任务
   * @param id 工作任务ID
   */
  getWorkTaskById: async (id: string): Promise<WorkTask> => {
    try {
      const response = await apiClient.get<WorkTask>(`/work-tasks/${id}`);
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  /**
   * 创建工作任务
   * @param taskData 工作任务数据
   */
  createWorkTask: async (taskData: CreateWorkTaskParams): Promise<WorkTask> => {
    try {
      const response = await apiClient.post<WorkTask>('/work-tasks', taskData);
      // 通知变量系统更新
      VariableEventService.notifyVariableChange();
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  /**
   * 更新工作任务
   * @param id 工作任务ID
   * @param taskData 更新的工作任务数据
   */
  updateWorkTask: async (id: string, taskData: UpdateWorkTaskParams): Promise<WorkTask> => {
    try {
      const response = await apiClient.put<WorkTask>(`/work-tasks/${id}`, taskData);
      // 通知变量系统更新
      VariableEventService.notifyVariableChange();
      return response.data;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  /**
   * 删除工作任务
   * @param id 工作任务ID
   */
  deleteWorkTask: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/work-tasks/${id}`);
      // 通知变量系统更新
      VariableEventService.notifyVariableChange();
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  /**
   * 执行工作任务
   * @param id 工作任务ID
   */
  executeWorkTask: async (id: string): Promise<WorkTask> => {
    try {
      const response = await apiClient.post<{task: WorkTask}>(`/work-tasks/${id}/execute`);
      // 通知变量系统更新，因为执行可能生成新的输出变量
      VariableEventService.notifyVariableChange();
      return response.data.task;
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },
  
  /**
   * 测试执行工作任务
   * 不保存结果，仅返回输出
   * @param data 工作任务数据
   * @returns 输出内容，如果debug=true还会返回变量解析调试信息
   */
  testExecuteWorkTask: async (data: {
    input: string;
    npcId?: string; // 现在是可选的
    aiServiceId: string;
    npcPromptTemplate?: {
      template: string;
      isCustomized: boolean;
    };
    debug?: boolean; // 是否返回调试信息
  }): Promise<string | TestExecuteResponse> => {
    try {
      // 使用any类型来绕过TypeScript的类型检查
      const response = await apiClient.post<any>('/work-tasks/test-execute', {
        ...data,
        // 添加参数指示服务器返回日志
        returnServerLogs: true 
      });
      
      if (!response.data) {
        return '';
      }
      
      // 检查响应格式
      if (typeof response.data === 'object') {
        if ('output' in response.data && 'debug' in response.data) {
          // 新格式，返回对象
          const result: TestExecuteResponse = {
            output: String(response.data.output || ''),
            debug: response.data.debug
          };
          
          // 如果有服务端日志，加入结果
          if (response.data.serverLogs) {
            result.serverLogs = Array.isArray(response.data.serverLogs) 
              ? response.data.serverLogs 
              : typeof response.data.serverLogs === 'string'
                ? response.data.serverLogs.split('\n').filter(Boolean)
                : [];
              
            // 确保调试信息中也有服务端日志
            if (result.debug && !result.debug.serverLogs) {
              result.debug.serverLogs = result.serverLogs;
            }
          }
          
          return result;
        } else if ('output' in response.data) {
          // 旧格式，只包含output
          return String(response.data.output || '');
        }
      }
      
      // 无法识别的格式或空响应
      return '';
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  /**
   * 获取工作任务的NPC模板
   * @param id 工作任务ID
   * @returns 包含所有NPC模板的对象
   */
  getTaskTemplates: async (id: string): Promise<NpcTemplates> => {
    try {
      const response = await apiClient.get<{templates: NpcTemplates}>(`/work-tasks/${id}/templates`);
      return response.data.templates || {};
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  },

  /**
   * 更新工作任务的NPC模板
   * @param id 工作任务ID
   * @param templates NPC模板集合
   * @returns 更新后的NPC模板集合
   */
  updateTaskTemplates: async (id: string, templates: NpcTemplates): Promise<NpcTemplates> => {
    try {
      // 直接发送templates对象，不要嵌套在{ templates }对象中
      const response = await apiClient.put<{data: NpcTemplates}>(`/work-tasks/${id}/templates`, templates);
      // 通知变量系统更新
      VariableEventService.notifyVariableChange();
      // 根据后端返回格式调整
      return response.data.data || {};
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  }
};

export default workTaskService;
