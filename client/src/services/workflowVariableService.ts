import axios from 'axios';
import { API_BASE_URL } from '../config';
import { VariableEventService } from './VariableEventService';
// 使用接口定义而不是导入来避免类型错误
interface Variable {
  id: string;
  name: string;
  identifier: string;
  displayIdentifier: string;
  value: string;
  type: string;
  entityId?: string;
  source?: {
    id: string;
    name: string;
    type: string;
  };
}

// API响应格式定义
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * 工作流变量服务
 * 用于前端调用工作流变量相关的API接口
 */
class WorkflowVariableService {
  /**
   * 获取工作流变量
   * @param workflowId 工作流ID
   * @returns 工作流变量列表
   */
  async getWorkflowVariables(workflowId: string): Promise<Variable[]> {
    try {
      // 修正URL路径，避免/api重复
      const response = await axios.get<ApiResponse<Variable[]>>(`${API_BASE_URL}/workflows/${workflowId}/variables`);
      return response.data.data as Variable[];
    } catch (error) {
      console.error('获取工作流变量失败:', error);
      throw error;
    }
  }
  
  /**
   * 创建或更新工作流变量
   * @param workflowId 工作流ID
   * @param workflowName 工作流名称
   * @param field 字段名
   * @param value 变量值
   * @returns 创建或更新的变量
   */
  async createOrUpdateWorkflowVariable(
    workflowId: string,
    workflowName: string,
    field: string,
    value: string
  ): Promise<Variable> {
    try {
      const response = await axios.post<ApiResponse<Variable>>(`${API_BASE_URL}/workflows/${workflowId}/variables`, {
        workflowName,
        field,
        value
      });
      
      // 通知变量事件服务，触发变量变更事件
      VariableEventService.notifyVariableChange();
      
      return response.data.data as Variable;
    } catch (error) {
      console.error('创建或更新工作流变量失败:', error);
      throw error;
    }
  }
  
  /**
   * 删除工作流变量
   * @param workflowId 工作流ID
   * @param field 可选，字段名。不提供则删除所有变量
   */
  async deleteWorkflowVariables(workflowId: string, field?: string): Promise<void> {
    try {
      const url = `${API_BASE_URL}/workflows/${workflowId}/variables`;
      const params = field ? { field } : {};
      
      await axios.delete(url, { params });
      
      // 通知变量事件服务，触发变量变更事件
      VariableEventService.notifyVariableChange();
    } catch (error) {
      console.error('删除工作流变量失败:', error);
      throw error;
    }
  }
  
  /**
   * 创建或更新工作流输出变量
   * @param workflowId 工作流ID
   * @param workflowName 工作流名称
   * @param outputNumber 输出编号
   * @param value 输出值
   * @returns 创建或更新的变量
   */
  async createOrUpdateOutputVariable(
    workflowId: string,
    workflowName: string,
    outputNumber: number,
    value: string
  ): Promise<Variable> {
    try {
      const response = await axios.post<ApiResponse<Variable>>(`${API_BASE_URL}/workflows/${workflowId}/output-variables`, {
        workflowName,
        outputNumber,
        value
      });
      
      // 通知变量事件服务，触发变量变更事件
      VariableEventService.notifyVariableChange();
      
      return response.data.data as Variable;
    } catch (error) {
      console.error('创建或更新工作流输出变量失败:', error);
      throw error;
    }
  }
  
  /**
   * 删除工作流输出变量
   * @param workflowId 工作流ID
   * @param outputNumber 输出编号
   */
  async deleteOutputVariable(workflowId: string, outputNumber: number): Promise<void> {
    try {
      const url = `${API_BASE_URL}/workflows/${workflowId}/output-variables`;
      const params = { outputNumber };
      
      await axios.delete(url, { params });
      
      // 通知变量事件服务，触发变量变更事件
      VariableEventService.notifyVariableChange();
    } catch (error) {
      console.error('删除工作流输出变量失败:', error);
      throw error;
    }
  }
  
  /**
   * 初始化工作流基本变量
   * @param workflowId 工作流ID
   * @param name 工作流名称
   * @param description 工作流描述
   * @param isActive 工作流是否激活
   */
  async initWorkflowBaseVariables(
    workflowId: string,
    name: string,
    description: string = '',
    isActive: boolean = false
  ): Promise<void> {
    // 生成请求ID用于日志跟踪
    const reqId = new Date().getTime().toString(36) + Math.random().toString(36).substring(2, 5);
    
    console.log(`[workflowVariableService] [${reqId}] 初始化工作流基本变量:`, {
      workflowId: workflowId, 
      name, 
      description: description ? description.substring(0, 30) + '...' : '',
      isActive,
      isActiveType: typeof isActive
    });
    
    try {
      await axios.post(`${API_BASE_URL}/workflows/init-variables`, {
        workflowId,
        name,
        description,
        // 确保isActive是布尔类型
        isActive: isActive === true
      });
      
      console.log(`[workflowVariableService] [${reqId}] 初始化工作流变量成功，isActive=${isActive}`);
      
      // 通知变量事件服务，触发变量变更事件
      VariableEventService.notifyVariableChange();
    } catch (error) {
      console.error(`[workflowVariableService] [${reqId}] 初始化工作流基本变量失败:`, error);
      throw error;
    }
  }
  
  /**
   * 更新工作流变量 - 仅更新提供的值，不使用默认值
   * 这个函数与initWorkflowBaseVariables不同，它不会使用任何默认值，只会更新传入的值
   * @param workflowId 工作流ID
   * @param name 工作流名称
   * @param description 工作流描述
   * @param isActive 工作流是否激活
   */
  async updateWorkflowVariables(
    workflowId: string,
    name: string,
    description: string,
    isActive: boolean
  ): Promise<void> {
    // 生成请求ID用于日志跟踪
    const reqId = new Date().getTime().toString(36) + Math.random().toString(36).substring(2, 5);
    
    console.log(`[workflowVariableService] [${reqId}] 更新工作流变量(专用更新函数):`, {
      workflowId,
      name,
      description: description ? description.substring(0, 30) + '...' : '',
      isActive,
      isActiveType: typeof isActive
    });
    
    try {
      // 注意：这里使用的是与initWorkflowBaseVariables相同的API端点
      // 因为服务器端可能没有专门的更新端点
      await axios.post(`${API_BASE_URL}/workflows/init-variables`, {
        workflowId,
        name,
        description,
        // 不使用isActive === true转换，直接传递用户设置的值
        isActive: isActive
      });
      
      console.log(`[workflowVariableService] [${reqId}] 更新工作流变量成功，isActive=${isActive} (${typeof isActive})`);
      
      // 通知变量事件服务，触发变量变更事件
      VariableEventService.notifyVariableChange();
    } catch (error) {
      console.error(`[workflowVariableService] [${reqId}] 更新工作流变量失败:`, error);
      throw error;
    }
  }
  
  /**
   * 在workflow.ts服务的CRUD操作成功后调用
   * 用于确保工作流变量与工作流同步
   * @param workflow 工作流对象
   */
  async syncWorkflowVariables(workflow: any): Promise<void> {
    try {
      await this.initWorkflowBaseVariables(
        workflow.id,
        workflow.name,
        workflow.description,
        workflow.isActive
      );
    } catch (error) {
      // 变量同步失败不应影响工作流CRUD操作
      console.error('同步工作流变量失败:', error);
    }
  }
}

// 导出单例实例
export const workflowVariableService = new WorkflowVariableService();
