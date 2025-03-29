import axios from 'axios';
import { API_BASE_URL } from '../config';
import VariableEventService from './VariableEventService';

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
export interface WorkflowStructure {
  workflow: Workflow;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
}

// 创建工作流请求参数
export interface CreateWorkflowParams {
  name: string;
  description?: string;
  metadata?: any;
  isActive?: boolean;
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
    return response.data as WorkflowListResponse;
  }

  /**
   * 创建新工作流
   * @param data 工作流创建参数
   * @returns 创建的工作流
   */
  async createWorkflow(data: CreateWorkflowParams): Promise<Workflow> {
    const response = await axios.post(`${API_BASE_URL}/workflows`, data);
    // 通知变量系统更新
    VariableEventService.notifyVariableChange();
    return response.data as Workflow;
  }

  /**
   * 获取工作流详情
   * @param id 工作流ID
   * @returns 工作流详情
   */
  async getWorkflow(id: string): Promise<Workflow> {
    const response = await axios.get(`${API_BASE_URL}/workflows/${id}`);
    return response.data as Workflow;
  }

  /**
   * 获取工作流完整结构（包括节点和连接）
   * @param id 工作流ID
   * @returns 工作流结构
   */
  async getWorkflowStructure(id: string): Promise<WorkflowStructure> {
    const response = await axios.get(`${API_BASE_URL}/workflows/${id}/structure`);
    return response.data as WorkflowStructure;
  }

  /**
   * 更新工作流
   * @param id 工作流ID
   * @param data 更新数据
   * @returns 更新后的工作流
   */
  async updateWorkflow(id: string, data: Partial<CreateWorkflowParams>): Promise<Workflow> {
    const response = await axios.put(`${API_BASE_URL}/workflows/${id}`, data);
    // 通知变量系统更新
    VariableEventService.notifyVariableChange();
    return response.data as Workflow;
  }

  /**
   * 删除工作流
   * @param id 工作流ID
   */
  async deleteWorkflow(id: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/workflows/${id}`);
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
    return response.data as Workflow;
  }

  /**
   * 执行工作流
   * @param id 工作流ID
   * @param input 执行输入参数
   * @returns 执行ID
   */
  async executeWorkflow(id: string, input: any): Promise<{ executionId: string }> {
    const response = await axios.post(`${API_BASE_URL}/workflows/${id}/execute`, { input });
    return response.data as { executionId: string };
  }

  /**
   * 获取工作流所有节点
   * @param workflowId 工作流ID
   * @returns 节点列表
   */
  async getNodes(workflowId: string): Promise<WorkflowNode[]> {
    const response = await axios.get(`${API_BASE_URL}/workflows/${workflowId}/nodes`);
    return response.data as WorkflowNode[];
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
    return response.data as WorkflowNode;
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
    return response.data as WorkflowNode;
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
    return response.data as WorkflowConnection[];
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
    return response.data as WorkflowConnection;
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
    return response.data as WorkflowConnection;
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

export const workflowService = new WorkflowService();
