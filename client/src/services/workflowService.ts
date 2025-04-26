import axios from 'axios';
import { API_BASE_URL } from '../config';
import { VariableEventService } from './VariableEventService';
import { workflowVariableService } from './workflowVariableService';
import { WorkflowStructure } from '../pages/workflow/types';

// 工作流接口定义
export interface Workflow {
  id: string;
  name: string;
  description: string;
  metadata: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// 节点接口定义
export interface WorkflowNode {
  id: string;
  workflowId: string;
  type: string;
  name: string;
  position: {
    x: number;
    y: number;
  };
  config: any;
  data?: any;
  createdAt: string;
  updatedAt: string;
}

// 连接接口定义
export interface WorkflowConnection {
  id: string;
  workflowId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  data?: any;
  createdAt: string;
  updatedAt: string;
}

// 分页接口定义
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// 工作流列表响应接口
export interface WorkflowListResponse {
  workflows: Workflow[];
  pagination: Pagination;
}

// 工作流结构（包括节点和连接）
export interface WorkflowFullStructure {
  workflow: Workflow;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
}

// 创建工作流请求参数
export interface CreateWorkflowParams {
  id?: string;
  name: string;
  description?: string;
  metadata?: any;
  isActive?: boolean;
  nodes?: any[];
  connections?: any[];
}

// 创建节点请求参数
export interface CreateNodeParams {
  workflowId: string;
  type: string;
  name: string;
  position: {
    x: number;
    y: number;
  };
  config: any;
}

// 创建连接请求参数
export interface CreateConnectionParams {
  workflowId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  data?: any;
}

/**
 * 保存工作流状态枚举 - 用于前端显示和跟踪保存进度
 */
export enum SaveWorkflowPhase {
  IDLE = 'idle',               // 空闲状态
  SAVING = 'saving',           // 正在保存到服务器
  VERIFYING = 'verifying',     // 验证服务器保存结果
  SYNCING_VARIABLES = 'syncing_variables', // 同步到变量系统
  BROADCASTING = 'broadcasting', // 广播变更
  COMPLETED = 'completed'      // 完成所有流程
}

/**
 * 保存工作流进度回调接口
 */
export interface SaveProgressCallback {
  (phase: SaveWorkflowPhase, message: string): void;
}

/**
 * 保存选项接口
 */
export interface SaveWorkflowOptions {
  skipVariableSync?: boolean;   // 是否跳过变量同步
  skipBroadcast?: boolean;      // 是否跳过广播
  onProgress?: SaveProgressCallback; // 保存进度回调
}

/**
 * 工作流服务
 * 提供工作流、节点和连接的CRUD操作
 */
class WorkflowService {
  /**
   * 获取工作流列表
   * @param page 页码
   * @param pageSize 每页大小
   * @param search 搜索关键词
   * @returns 工作流列表响应
   */
  async getWorkflows(page = 1, pageSize = 10, search?: string): Promise<WorkflowListResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString()
    });
    
    if (search) {
      params.append('search', search);
    }

    const response = await axios.get(`${API_BASE_URL}/workflows?${params.toString()}`);
    return response.data;
  }

  /**
   * 创建新工作流
   * @param data 工作流创建参数
   * @returns 创建的工作流
   */
  async createWorkflow(data: CreateWorkflowParams): Promise<Workflow> {
    console.log('[WorkflowService] 创建新工作流:', data.name);
    
    // 确保metadata存在，但不再自动添加起点卡
    const updatedData = {
      ...data,
      // 如果未指定isActive，默认设置为true
      isActive: data.isActive !== undefined ? data.isActive : true,
      metadata: {
        ...(data.metadata || {}),
        nodes: JSON.stringify([]),
        edges: JSON.stringify([]),
        version: 1,
        updatedAt: new Date().toISOString()
      }
    };
    
    console.log('[WorkflowService] 创建了空工作流，用户需要手动添加卡片');
    
    const response = await axios.post(`${API_BASE_URL}/workflows`, updatedData);
    const workflow = response.data;
    
    try {
      // 初始化工作流变量
      await workflowVariableService.initWorkflowBaseVariables(
        workflow.id,
        workflow.name,
        workflow.description || '',
        workflow.isActive || false
      );
    } catch (error) {
      // 变量初始化失败不影响工作流创建
      console.error('工作流变量初始化失败:', error);
    }
    
    // 通知变量系统更新
    VariableEventService.notifyVariableChange();
    return workflow;
  }
  
  // createDefaultStartNode 方法已被删除，由用户手动添加起点卡

  /**
   * 获取工作流详情
   * @param id 工作流ID
   * @returns 工作流详情
   */
  async getWorkflow(id: string): Promise<Workflow> {
    const response = await axios.get(`${API_BASE_URL}/workflows/${id}`);
    return response.data;
  }

  /**
   * 获取工作流完整结构（包括节点和连接）
   * @param id 工作流ID
   * @returns 工作流结构
   */
  async getWorkflowStructure(id: string): Promise<WorkflowStructure> {
    const response = await axios.get(`${API_BASE_URL}/workflows/${id}/structure`);
    const data = response.data as WorkflowStructure;
    
    // 调试输出，查看返回的原始数据
    console.log('[workflowService] 获取到工作流结构原始数据:', data);
    
    // 确保从metadata中解析节点和连接
    if (data && data.metadata) {
      try {
        // 检查是否已经包含解析后的节点和连接数据
        if (!data.nodes || data.nodes.length === 0) {
          const metadata = data.metadata as any;
          
          if (metadata.nodes) {
            console.log('[workflowService] 从metadata.nodes解析节点数据');
            // 如果nodes是字符串，尝试解析
            if (typeof metadata.nodes === 'string') {
              data.nodes = JSON.parse(metadata.nodes);
            } else {
              data.nodes = metadata.nodes;
            }
          }
        }
        
        if (!data.connections || data.connections.length === 0) {
          const metadata = data.metadata as any;
          
          if (metadata.edges) {
            console.log('[workflowService] 从metadata.edges解析连接数据');
            // 如果edges是字符串，尝试解析
            if (typeof metadata.edges === 'string') {
              data.connections = JSON.parse(metadata.edges);
            } else {
              data.connections = metadata.edges;
            }
          }
        }
        
        console.log('[workflowService] 解析后的工作流结构:', {
          nodesCount: data.nodes?.length || 0,
          connectionsCount: data.connections?.length || 0
        });
      } catch (error) {
        console.error('[workflowService] 解析工作流结构数据失败:', error);
      }
    }
    
    return data;
  }

  /**
   * 更新工作流 - 重构版本
   * 支持按顺序执行保存步骤，并提供进度反馈
   * 
   * @param id 工作流ID
   * @param data 更新数据
   * @param options 保存选项
   * @returns 更新后的工作流
   */
  async updateWorkflow(
    id: string, 
    data: Partial<CreateWorkflowParams>,
    options: SaveWorkflowOptions = {}
  ): Promise<Workflow> {
    // 默认值
    const { 
      skipVariableSync = false,
      skipBroadcast = false,
      onProgress = () => {} // 空函数，如果调用者没有提供
    } = options;
    
    // 生成请求ID用于日志跟踪
    const reqId = new Date().getTime().toString(36) + Math.random().toString(36).substring(2, 5);
    
    console.log(`[WorkflowService] [${reqId}] 开始更新工作流 (ID: ${id}), 数据:`, {
      ...data,
      description: data.description ? `${data.description.substring(0, 50)}...` : undefined
    });
    
    // 通知进度：开始保存
    onProgress(SaveWorkflowPhase.SAVING, "正在保存工作流...");
    
    // 特别记录isActive字段的状态
    if ('isActive' in data) {
      console.log(`[WorkflowService] [${reqId}] 正在更新工作流启用状态: ${data.isActive} (${typeof data.isActive})`);
    }
    
    try {
      // 步骤1: 保存工作流数据到服务器
      const updateStartTime = Date.now();
      const url = `${API_BASE_URL}/workflows/${id}`;
      
      console.log(`[WorkflowService] [${reqId}] 发送PUT请求到 ${url}, 数据:`, {
        ...data,
        // 特别显示isActive字段的详细信息
        isActive: data.isActive !== undefined ? {
          value: data.isActive,
          type: typeof data.isActive,
          toString: String(data.isActive)
        } : undefined,
        description: data.description ? `${data.description.substring(0, 30)}...` : undefined
      });
      
      const response = await axios.put(url, data);
      
      const updateDuration = Date.now() - updateStartTime;
      console.log(`[WorkflowService] [${reqId}] PUT请求完成，耗时: ${updateDuration}ms, 状态码: ${response.status}`);
      
      // 解析响应
      const workflow = response.data;
      
      // 通知进度：保存完成，开始验证
      onProgress(SaveWorkflowPhase.VERIFYING, "验证服务器保存结果...");
      
      // 验证description是否正确更新
      if (data.description !== undefined && workflow.description !== data.description) {
        console.warn(`[WorkflowService] [${reqId}] 警告: 描述可能未正确更新`);
        // 这里不需要中断流程，但记录警告
      }
      
      // 跳过变量同步如果指定了选项
      if (!skipVariableSync && (data.name || data.description !== undefined || data.isActive !== undefined)) {
        // 通知进度：开始同步变量
        onProgress(SaveWorkflowPhase.SYNCING_VARIABLES, "同步到变量系统...");
        
        try {
          console.log(`[WorkflowService] [${reqId}] 同步工作流数据到变量系统...`);
          
          // 关键修改: 使用保存响应中的数据，而不是重新获取
          // 这样避免时序问题和额外的网络请求
          await workflowVariableService.initWorkflowBaseVariables(
            id,
            data.name || workflow.name,
            data.description !== undefined ? data.description : workflow.description || '',
            data.isActive !== undefined ? data.isActive : workflow.isActive
          );
          
          console.log(`[WorkflowService] [${reqId}] 变量系统同步完成`);
        } catch (error) {
          // 变量更新失败不影响工作流更新
          console.error(`[WorkflowService] [${reqId}] 工作流变量更新失败:`, error);
          // 不中断流程，只记录错误
        }
      } else {
        console.log(`[WorkflowService] [${reqId}] 已跳过变量同步`);
      }
      
      // 跳过广播如果指定了选项
      if (!skipBroadcast) {
        // 通知进度：开始广播
        onProgress(SaveWorkflowPhase.BROADCASTING, "广播变更通知...");
        
        console.log(`[WorkflowService] [${reqId}] 通知变量系统更新...`);
        // 延迟广播以确保所有操作完成
        setTimeout(() => {
          VariableEventService.notifyVariableChange();
          console.log(`[WorkflowService] [${reqId}] 广播完成`);
        }, 500);
      } else {
        console.log(`[WorkflowService] [${reqId}] 已跳过变更广播`);
      }
      
      // 通知进度：所有操作完成
      onProgress(SaveWorkflowPhase.COMPLETED, "保存完成");
      
      return workflow;
    } catch (error) {
      console.error(`[WorkflowService] [${reqId}] 更新工作流失败:`, error);
      
      // 重新抛出错误让调用方处理
      throw error;
    }
  }

  /**
   * 删除工作流
   * @param id 工作流ID
   */
  async deleteWorkflow(id: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/workflows/${id}`);
    
    try {
      // 删除工作流相关的所有变量
      await workflowVariableService.deleteWorkflowVariables(id);
    } catch (error) {
      // 变量删除失败不影响工作流删除
      console.error('工作流变量删除失败:', error);
    }
    
    // 通知变量系统更新
    VariableEventService.notifyVariableChange();
  }

  /**
   * 复制工作流
   * @param id 原工作流ID
   * @returns 复制后的新工作流
   */
  async copyWorkflow(id: string): Promise<Workflow> {
    const response = await axios.post(`${API_BASE_URL}/workflows/${id}/copy`);
    const newWorkflow = response.data;
    
    try {
      // 为复制的工作流创建变量
      await workflowVariableService.initWorkflowBaseVariables(
        newWorkflow.id,
        newWorkflow.name,
        newWorkflow.description || '',
        newWorkflow.isActive || false
      );
    } catch (error) {
      // 变量创建失败不影响工作流复制
      console.error('复制工作流的变量创建失败:', error);
    }
    
    return newWorkflow;
  }

  /**
   * 执行工作流
   * @param id 工作流ID
   * @param input 执行输入参数
   * @returns 执行ID
   */
  async executeWorkflow(id: string, input: any): Promise<{ executionId: string }> {
    const response = await axios.post(`${API_BASE_URL}/workflows/${id}/execute`, { input });
    return response.data;
  }

  /**
   * 获取工作流所有节点
   * @param workflowId 工作流ID
   * @returns 节点列表
   */
  async getNodes(workflowId: string): Promise<WorkflowNode[]> {
    const response = await axios.get(`${API_BASE_URL}/workflows/${workflowId}/nodes`);
    return response.data;
  }

  /**
   * 创建工作流节点
   * @param data 节点创建参数
   * @returns 创建的节点
   */
  async createNode(data: CreateNodeParams): Promise<WorkflowNode> {
    const { workflowId, ...nodeData } = data;
    const response = await axios.post(`${API_BASE_URL}/workflows/${workflowId}/nodes`, nodeData);
    // 通知变量系统更新
    VariableEventService.notifyVariableChange();
    return response.data;
  }

  /**
   * 更新节点
   * @param workflowId 工作流ID
   * @param nodeId 节点ID
   * @param data 更新数据
   * @returns 更新后的节点
   */
  async updateNode(workflowId: string, nodeId: string, data: Partial<CreateNodeParams>): Promise<WorkflowNode> {
    const response = await axios.put(`${API_BASE_URL}/workflows/${workflowId}/nodes/${nodeId}`, data);
    // 通知变量系统更新
    VariableEventService.notifyVariableChange();
    return response.data;
  }

  /**
   * 删除节点
   * @param workflowId 工作流ID
   * @param nodeId 节点ID
   */
  async deleteNode(workflowId: string, nodeId: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/workflows/${workflowId}/nodes/${nodeId}`);
    // 通知变量系统更新
    VariableEventService.notifyVariableChange();
  }

  /**
   * 获取工作流所有连接
   * @param workflowId 工作流ID
   * @returns 连接列表
   */
  async getConnections(workflowId: string): Promise<WorkflowConnection[]> {
    const response = await axios.get(`${API_BASE_URL}/workflows/${workflowId}/connections`);
    return response.data;
  }

  /**
   * 创建工作流连接
   * @param data 连接创建参数
   * @returns 创建的连接
   */
  async createConnection(data: CreateConnectionParams): Promise<WorkflowConnection> {
    const { workflowId, ...connectionData } = data;
    const response = await axios.post(`${API_BASE_URL}/workflows/${workflowId}/connections`, connectionData);
    // 通知变量系统更新
    VariableEventService.notifyVariableChange();
    return response.data;
  }

  /**
   * 更新连接
   * @param workflowId 工作流ID
   * @param connectionId 连接ID
   * @param data 更新数据
   * @returns 更新后的连接
   */
  async updateConnection(workflowId: string, connectionId: string, data: Partial<CreateConnectionParams>): Promise<WorkflowConnection> {
    const response = await axios.put(`${API_BASE_URL}/workflows/${workflowId}/connections/${connectionId}`, data);
    // 通知变量系统更新
    VariableEventService.notifyVariableChange();
    return response.data;
  }

  /**
   * 删除连接
   * @param workflowId 工作流ID
   * @param connectionId 连接ID
   */
  async deleteConnection(workflowId: string, connectionId: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/workflows/${workflowId}/connections/${connectionId}`);
    // 通知变量系统更新
    VariableEventService.notifyVariableChange();
  }
}

// 导出单例实例
export const workflowService = new WorkflowService();
