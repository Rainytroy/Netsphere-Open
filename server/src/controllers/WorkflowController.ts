import { Request, Response } from "express";
import { WorkflowService } from "../services/WorkflowService";
import { ExecutionStatus } from "../models/WorkflowExecution";

/**
 * 工作流控制器
 * 处理工作流相关的HTTP请求
 */
export class WorkflowController {
  private workflowService: WorkflowService;

  constructor() {
    this.workflowService = new WorkflowService();
  }

  /**
   * 获取工作流列表
   */
  getWorkflows = async (req: Request, res: Response) => {
    try {
      const { page, limit, status, search } = req.query;

      const result = await this.workflowService.getAllWorkflows({
        page: page ? parseInt(page as string) : undefined,
        pageSize: limit ? parseInt(limit as string) : undefined,
        status: status as string,
        search: search as string
      });

      return res.status(200).json(result);
    } catch (error: any) {
      console.error("获取工作流列表失败:", error);
      return res.status(500).json({
        message: "获取工作流列表失败",
        error: error.message
      });
    }
  };

  /**
   * 获取工作流详情
   */
  getWorkflowById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const workflow = await this.workflowService.getWorkflowById(id);

      return res.status(200).json(workflow);
    } catch (error: any) {
      console.error(`获取工作流 ${req.params.id} 详情失败:`, error);
      return res.status(404).json({
        message: "获取工作流详情失败",
        error: error.message
      });
    }
  };

  /**
   * 获取工作流完整结构（含节点和连接）
   */
  getWorkflowStructure = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const workflow = await this.workflowService.getWorkflowWithNodesAndEdges(id);

      return res.status(200).json(workflow);
    } catch (error: any) {
      console.error(`获取工作流 ${req.params.id} 结构失败:`, error);
      return res.status(404).json({
        message: "获取工作流结构失败",
        error: error.message
      });
    }
  };

  /**
   * 创建工作流
   */
  createWorkflow = async (req: Request, res: Response) => {
    try {
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({
          message: "工作流名称不能为空"
        });
      }

      const workflow = await this.workflowService.createWorkflow({
        name,
        description
      });

      return res.status(201).json(workflow);
    } catch (error: any) {
      console.error("创建工作流失败:", error);
      return res.status(500).json({
        message: "创建工作流失败",
        error: error.message
      });
    }
  };

  /**
   * 更新工作流
   */
  updateWorkflow = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, isActive, metadata } = req.body;

      const workflow = await this.workflowService.updateWorkflow(id, {
        name,
        description,
        isActive,
        metadata
      });

      return res.status(200).json(workflow);
    } catch (error: any) {
      console.error(`更新工作流 ${req.params.id} 失败:`, error);
      return res.status(500).json({
        message: "更新工作流失败",
        error: error.message
      });
    }
  };

  /**
   * 删除工作流
   */
  deleteWorkflow = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const result = await this.workflowService.deleteWorkflow(id);

      return res.status(200).json(result);
    } catch (error: any) {
      console.error(`删除工作流 ${req.params.id} 失败:`, error);
      return res.status(500).json({
        message: "删除工作流失败",
        error: error.message
      });
    }
  };

  /**
   * 复制工作流
   */
  copyWorkflow = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name } = req.body;

      console.log(`[WorkflowController] 开始复制工作流 ${id}，新名称:`, name);

      // 先获取原工作流，打印其metadata中的关键信息
      const originalWorkflow = await this.workflowService.getWorkflowById(id);
      console.log(`[WorkflowController] 原工作流metadata:`, originalWorkflow.metadata);
      
      // 使用类型断言检查元数据中是否保存了节点和边信息
      const metadataAny = originalWorkflow.metadata as any;
      console.log(`[WorkflowController] 原工作流metadata包含nodes:`, 
        !!metadataAny.nodes,
        `edges:`, !!metadataAny.edges);
      
      const workflow = await this.workflowService.copyWorkflow(id, name);
      
      // 检查复制后的工作流
      const newMetadataAny = workflow.metadata as any;
      console.log(`[WorkflowController] 复制后的工作流ID: ${workflow.id}`);
      console.log(`[WorkflowController] 复制后的metadata:`, workflow.metadata);
      console.log(`[WorkflowController] 复制后的metadata包含nodes:`, 
        !!newMetadataAny.nodes,
        `edges:`, !!newMetadataAny.edges);

      return res.status(201).json(workflow);
    } catch (error: any) {
      console.error(`复制工作流 ${req.params.id} 失败:`, error);
      return res.status(500).json({
        message: "复制工作流失败",
        error: error.message
      });
    }
  };

  /**
   * 执行工作流
   */
  executeWorkflow = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { input } = req.body;

      // 第一阶段只创建执行记录，实际执行功能将在后续阶段实现
      const execution = await this.workflowService.createExecutionRecord(id, input);

      return res.status(202).json({
        message: "工作流执行请求已接受",
        executionId: execution.id,
        status: execution.status
      });
    } catch (error: any) {
      console.error(`执行工作流 ${req.params.id} 失败:`, error);
      return res.status(500).json({
        message: "执行工作流失败",
        error: error.message
      });
    }
  };

  /**
   * 获取执行记录
   */
  getExecution = async (req: Request, res: Response) => {
    try {
      const { executionId } = req.params;

      const execution = await this.workflowService.getExecution(executionId);

      return res.status(200).json(execution);
    } catch (error: any) {
      console.error(`获取执行记录 ${req.params.executionId} 失败:`, error);
      return res.status(404).json({
        message: "获取执行记录失败",
        error: error.message
      });
    }
  };
}
