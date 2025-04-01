import { AppDataSource } from "../database";
import { Workflow } from "../models/Workflow";
import { WorkflowNode } from "../models/WorkflowNode";
import { WorkflowConnection } from "../models/WorkflowConnection";
import { WorkflowExecution, ExecutionStatus } from "../models/WorkflowExecution";
import { WorkflowVariableSourceProvider } from "./WorkflowVariableSourceProvider";
import { workflowVariableService } from "./WorkflowVariableService";

/**
 * 工作流服务类
 * 提供工作流相关的业务逻辑操作
 */
export class WorkflowService {
  /**
   * 获取所有工作流列表
   * @param options 查询选项
   * @returns 工作流列表
   */
  async getAllWorkflows(options: {
    page?: number;
    pageSize?: number;
    status?: string;
    search?: string;
  } = {}) {
    const { page = 1, pageSize = 10, status, search } = options;
    const skip = (page - 1) * pageSize;

    const workflowRepository = AppDataSource.getRepository(Workflow);

    // 构建查询
    let query = workflowRepository.createQueryBuilder("workflow");

    // 根据状态筛选
    if (status) {
      query = query.where("workflow.isActive = :isActive", {
        isActive: status === 'active'
      });
    }

    // 根据关键词搜索
    if (search) {
      query = query.andWhere(
        "(workflow.name LIKE :search OR workflow.description LIKE :search)",
        { search: `%${search}%` }
      );
    }

    // 获取总数
    const total = await query.getCount();

    // 获取分页数据
    const workflows = await query
      .orderBy("workflow.updatedAt", "DESC")
      .skip(skip)
      .take(pageSize)
      .getMany();

    return {
      workflows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * 根据ID获取工作流详情
   * @param id 工作流ID
   * @returns 工作流详情
   */
  async getWorkflowById(id: string) {
    const workflowRepository = AppDataSource.getRepository(Workflow);
    const workflow = await workflowRepository.findOne({ where: { id } });

    if (!workflow) {
      throw new Error(`找不到ID为'${id}'的工作流`);
    }

    return workflow;
  }

  /**
   * 获取工作流详情，包含节点和连接
   * @param id 工作流ID
   * @returns 工作流详情，包含节点和连接
   */
  async getWorkflowWithNodesAndEdges(id: string) {
    const workflowRepository = AppDataSource.getRepository(Workflow);
    const workflow = await workflowRepository.findOne({
      where: { id },
      relations: ["nodes", "connections"]
    });

    if (!workflow) {
      throw new Error(`找不到ID为'${id}'的工作流`);
    }

    return workflow;
  }

  /**
   * 创建新工作流
   * @param data 工作流数据
   * @returns 创建后的工作流
   */
  async createWorkflow(data: {
    name: string;
    description?: string;
  }) {
    const workflowRepository = AppDataSource.getRepository(Workflow);

    // 创建新工作流
    const workflow = new Workflow();
    workflow.name = data.name;
    workflow.description = data.description || "";
    workflow.isActive = false;
    workflow.metadata = {
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1
    };

    // 保存工作流
    const savedWorkflow = await workflowRepository.save(workflow);
    
    try {
      // 工作流创建后，立即初始化其基本变量
      // 这确保变量标识符一致性，避免孤儿变量
      console.log(`[WorkflowService] 初始化工作流 ${savedWorkflow.id} 的基本变量`);
      await workflowVariableService.initWorkflowBaseVariables(
        savedWorkflow.id,
        savedWorkflow.name,
        savedWorkflow.description,
        savedWorkflow.isActive
      );
    } catch (error) {
      // 变量初始化失败不应影响工作流创建
      console.error(`[WorkflowService] 初始化工作流变量失败:`, error);
    }

    return savedWorkflow;
  }

  /**
   * 更新工作流
   * @param id 工作流ID
   * @param data 更新数据
   * @returns 更新后的工作流
   */
  async updateWorkflow(id: string, data: {
    name?: string;
    description?: string;
    isActive?: boolean;
    metadata?: any;
  }) {
    const workflowRepository = AppDataSource.getRepository(Workflow);

    // 获取现有工作流
    const workflow = await this.getWorkflowById(id);

    // 更新字段
    if (data.name !== undefined) workflow.name = data.name;
    if (data.description !== undefined) workflow.description = data.description;
    if (data.isActive !== undefined) workflow.isActive = data.isActive;

    // 更新元数据
    if (data.metadata) {
      // 保留原始元数据的基本版本信息
      workflow.metadata = {
        ...data.metadata,
        updatedAt: new Date(),
        version: (workflow.metadata.version || 0) + 1
      };
    } else {
      workflow.metadata = {
        ...workflow.metadata,
        updatedAt: new Date(),
        version: (workflow.metadata.version || 0) + 1
      };
    }

    // 保存更新
    return await workflowRepository.save(workflow);
  }

  /**
   * 删除工作流
   * @param id 工作流ID
   * @returns 删除结果
   */
  async deleteWorkflow(id: string) {
    const workflowRepository = AppDataSource.getRepository(Workflow);
    const nodeRepository = AppDataSource.getRepository(WorkflowNode);
    const connectionRepository = AppDataSource.getRepository(WorkflowConnection);

    // 获取现有工作流
    const workflow = await this.getWorkflowById(id);
    
    // 保存工作流名称用于删除变量
    const workflowName = workflow.name;

    // 删除关联的节点和连接
    await connectionRepository.delete({ workflowId: id });
    await nodeRepository.delete({ workflowId: id });
    
    // 删除相关数据
    try {
      console.log(`开始清理工作流(ID: ${id})相关数据`);
      
      // 删除工作流关联的变量
      try {
        console.log(`[WorkflowService] 删除工作流 ${id} 的所有变量`);
        await workflowVariableService.deleteWorkflowVariables(id);
      } catch (varError) {
        console.error(`[WorkflowService] 删除工作流变量失败:`, varError);
        // 继续删除其他相关数据，不因变量删除失败而中断
      }
      
      // 如果有其他相关数据需要清理，可以在这里添加
    } catch (cleanupError) {
      console.error(`清理工作流(ID: ${id})数据失败:`, cleanupError);
      // 继续删除工作流，不因清理失败而中断
    }

    // 删除工作流
    await workflowRepository.remove(workflow);

    return { success: true, message: "工作流已成功删除" };
  }

  /**
   * 复制工作流
   * @param id 原工作流ID
   * @param newName 新工作流名称
   * @returns 新创建的工作流
   */
  async copyWorkflow(id: string, newName?: string) {
    // 获取原工作流及其节点和连接
    const originalWorkflow = await this.getWorkflowWithNodesAndEdges(id);

    // 创建新工作流
    const workflowRepository = AppDataSource.getRepository(Workflow);
    const nodeRepository = AppDataSource.getRepository(WorkflowNode);
    const connectionRepository = AppDataSource.getRepository(WorkflowConnection);

    const newWorkflow = new Workflow();
    newWorkflow.name = newName || `${originalWorkflow.name}-副本`;
    newWorkflow.description = originalWorkflow.description;
    newWorkflow.isActive = false;
    // 合并原工作流的metadata，确保节点数据得到复制
    // 使用类型断言避免TypeScript编译错误
    const metadata = originalWorkflow.metadata || {};
    const metadataAny = metadata as any;
    
    // 使用类型断言来解决TypeScript类型问题
    newWorkflow.metadata = {
      createdAt: new Date(),         // 使用新的创建时间
      updatedAt: new Date(),         // 使用新的更新时间
      version: 1                     // 新工作流版本重置为1
    };
    
    // 通过as any绕过TypeScript的类型检查，添加额外属性
    (newWorkflow.metadata as any).nodes = metadataAny.nodes;
    (newWorkflow.metadata as any).edges = metadataAny.edges;
    
    console.log("[WorkflowService] 复制工作流metadata:", newWorkflow.metadata);

    // 保存新工作流
    const savedWorkflow = await workflowRepository.save(newWorkflow);

    // 复制节点
    const nodeIdMap = new Map<string, string>();

    for (const node of originalWorkflow.nodes) {
      const newNode = new WorkflowNode();
      newNode.workflowId = savedWorkflow.id;
      newNode.type = node.type;
      newNode.name = node.name;
      newNode.position = { ...node.position };
      newNode.config = { ...node.config };

      const savedNode = await nodeRepository.save(newNode);
      nodeIdMap.set(node.id, savedNode.id);
    }

    // 复制连接
    for (const connection of originalWorkflow.connections) {
      const newConnection = new WorkflowConnection();
      newConnection.workflowId = savedWorkflow.id;
      const sourceId = nodeIdMap.get(connection.sourceNodeId);
      const targetId = nodeIdMap.get(connection.targetNodeId);

      if (sourceId && targetId) {
        newConnection.sourceNodeId = sourceId;
        newConnection.targetNodeId = targetId;
      } else {
        continue; // 跳过此连接
      }
      newConnection.label = connection.label;
      newConnection.config = { ...connection.config };

      await connectionRepository.save(newConnection);
    }
    
    try {
      // 复制工作流后，也需要初始化其基本变量
      // 这确保变量标识符一致性，避免孤儿变量
      console.log(`[WorkflowService] 初始化复制的工作流 ${savedWorkflow.id} 的基本变量`);
      await workflowVariableService.initWorkflowBaseVariables(
        savedWorkflow.id,
        savedWorkflow.name,
        savedWorkflow.description,
        savedWorkflow.isActive
      );
    } catch (error) {
      // 变量初始化失败不应影响工作流复制
      console.error(`[WorkflowService] 初始化复制的工作流变量失败:`, error);
    }

    return savedWorkflow;
  }

  /**
   * 创建执行记录
   * @param workflowId 工作流ID
   * @param input 输入数据
   * @returns 执行记录
   */
  async createExecutionRecord(workflowId: string, input?: any) {
    const workflowRepository = AppDataSource.getRepository(Workflow);
    const executionRepository = AppDataSource.getRepository(WorkflowExecution);

    // 检查工作流是否存在
    const workflow = await workflowRepository.findOne({ where: { id: workflowId } });
    if (!workflow) {
      throw new Error(`找不到ID为'${workflowId}'的工作流`);
    }

    // 创建执行记录
    const execution = new WorkflowExecution();
    execution.workflowId = workflowId;
    execution.status = ExecutionStatus.IDLE;
    execution.input = input || {};
    execution.nodeStates = {};

    return await executionRepository.save(execution);
  }

  /**
   * 更新执行记录
   * @param execution 执行记录
   * @returns 更新后的执行记录
   */
  async updateExecution(execution: WorkflowExecution) {
    const executionRepository = AppDataSource.getRepository(WorkflowExecution);
    return await executionRepository.save(execution);
  }

  /**
   * 获取执行记录
   * @param executionId 执行记录ID
   * @returns 执行记录
   */
  async getExecution(executionId: string) {
    const executionRepository = AppDataSource.getRepository(WorkflowExecution);
    const execution = await executionRepository.findOne({ where: { id: executionId } });

    if (!execution) {
      throw new Error(`找不到ID为'${executionId}'的执行记录`);
    }

    return execution;
  }
}
