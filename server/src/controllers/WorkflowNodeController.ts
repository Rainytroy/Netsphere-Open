import { Request, Response } from "express";
import { AppDataSource } from "../database";
import { WorkflowNode } from "../models/WorkflowNode";
import { Workflow } from "../models/Workflow";

/**
 * 工作流节点控制器
 * 处理工作流节点相关的HTTP请求
 */
export class WorkflowNodeController {
  /**
   * 获取指定工作流的所有节点
   */
  getNodes = async (req: Request, res: Response) => {
    try {
      const { workflowId } = req.params;
      const nodeRepository = AppDataSource.getRepository(WorkflowNode);
      
      const nodes = await nodeRepository.find({
        where: { workflowId },
        order: { createdAt: "ASC" }
      });
      
      return res.status(200).json(nodes);
    } catch (error: any) {
      console.error("获取节点列表失败:", error);
      return res.status(500).json({
        message: "获取节点列表失败",
        error: error.message
      });
    }
  };
  
  /**
   * 创建新节点
   */
  createNode = async (req: Request, res: Response) => {
    try {
      const workflowId = req.params.workflowId || req.body.workflowId;
      
      if (!workflowId) {
        return res.status(400).json({
          message: "工作流ID是必须的"
        });
      }
      
      // 验证工作流是否存在
      const workflowRepository = AppDataSource.getRepository(Workflow);
      const workflow = await workflowRepository.findOne({ where: { id: workflowId } });
      
      if (!workflow) {
        return res.status(404).json({
          message: `找不到ID为'${workflowId}'的工作流`
        });
      }
      
      const { type, name, position, config } = req.body;
      
      if (!type) {
        return res.status(400).json({
          message: "节点类型是必须的"
        });
      }
      
      const nodeRepository = AppDataSource.getRepository(WorkflowNode);
      
      const node = new WorkflowNode();
      node.workflowId = workflowId;
      node.type = type;
      node.name = name || type;
      node.position = position || { x: 0, y: 0 };
      node.config = config || {};
      
      const savedNode = await nodeRepository.save(node);
      
      return res.status(201).json(savedNode);
    } catch (error: any) {
      console.error("创建节点失败:", error);
      return res.status(500).json({
        message: "创建节点失败",
        error: error.message
      });
    }
  };
  
  /**
   * 获取指定节点详情
   */
  getNodeById = async (req: Request, res: Response) => {
    try {
      const { workflowId, nodeId } = req.params;
      const nodeRepository = AppDataSource.getRepository(WorkflowNode);
      
      const node = await nodeRepository.findOne({
        where: { id: nodeId, workflowId }
      });
      
      if (!node) {
        return res.status(404).json({
          message: `找不到ID为'${nodeId}'的节点`
        });
      }
      
      return res.status(200).json(node);
    } catch (error: any) {
      console.error(`获取节点 ${req.params.nodeId} 详情失败:`, error);
      return res.status(500).json({
        message: "获取节点详情失败",
        error: error.message
      });
    }
  };
  
  /**
   * 更新节点信息
   */
  updateNode = async (req: Request, res: Response) => {
    try {
      const { workflowId, nodeId } = req.params;
      const nodeRepository = AppDataSource.getRepository(WorkflowNode);
      
      const node = await nodeRepository.findOne({
        where: { id: nodeId, workflowId }
      });
      
      if (!node) {
        return res.status(404).json({
          message: `找不到ID为'${nodeId}'的节点`
        });
      }
      
      const { name, position, config } = req.body;
      
      if (name !== undefined) node.name = name;
      if (position !== undefined) node.position = position;
      if (config !== undefined) node.config = config;
      
      const updatedNode = await nodeRepository.save(node);
      
      return res.status(200).json(updatedNode);
    } catch (error: any) {
      console.error(`更新节点 ${req.params.nodeId} 失败:`, error);
      return res.status(500).json({
        message: "更新节点失败",
        error: error.message
      });
    }
  };
  
  /**
   * 删除节点
   */
  deleteNode = async (req: Request, res: Response) => {
    try {
      const { workflowId, nodeId } = req.params;
      const nodeRepository = AppDataSource.getRepository(WorkflowNode);
      
      const node = await nodeRepository.findOne({
        where: { id: nodeId, workflowId }
      });
      
      if (!node) {
        return res.status(404).json({
          message: `找不到ID为'${nodeId}'的节点`
        });
      }
      
      await nodeRepository.remove(node);
      
      return res.status(200).json({
        message: "节点已成功删除"
      });
    } catch (error: any) {
      console.error(`删除节点 ${req.params.nodeId} 失败:`, error);
      return res.status(500).json({
        message: "删除节点失败",
        error: error.message
      });
    }
  };
}
