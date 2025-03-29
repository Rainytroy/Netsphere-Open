import { Request, Response } from "express";
import { AppDataSource } from "../database";
import { WorkflowConnection } from "../models/WorkflowConnection";
import { WorkflowNode } from "../models/WorkflowNode";
import { Workflow } from "../models/Workflow";

/**
 * 工作流连接控制器
 * 处理工作流节点连接相关的HTTP请求
 */
export class WorkflowConnectionController {
  /**
   * 获取指定工作流的所有连接
   */
  getConnections = async (req: Request, res: Response) => {
    try {
      const { workflowId } = req.params;
      const connectionRepository = AppDataSource.getRepository(WorkflowConnection);
      
      const connections = await connectionRepository.find({
        where: { workflowId },
        order: { createdAt: "ASC" }
      });
      
      return res.status(200).json(connections);
    } catch (error: any) {
      console.error("获取连接列表失败:", error);
      return res.status(500).json({
        message: "获取连接列表失败",
        error: error.message
      });
    }
  };
  
  /**
   * 创建新连接
   */
  createConnection = async (req: Request, res: Response) => {
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
      
      const { sourceNodeId, targetNodeId, label, config } = req.body;
      
      if (!sourceNodeId || !targetNodeId) {
        return res.status(400).json({
          message: "源节点ID和目标节点ID都是必须的"
        });
      }
      
      // 验证节点是否存在
      const nodeRepository = AppDataSource.getRepository(WorkflowNode);
      const sourceNode = await nodeRepository.findOne({ where: { id: sourceNodeId, workflowId } });
      const targetNode = await nodeRepository.findOne({ where: { id: targetNodeId, workflowId } });
      
      if (!sourceNode) {
        return res.status(404).json({
          message: `找不到ID为'${sourceNodeId}'的源节点`
        });
      }
      
      if (!targetNode) {
        return res.status(404).json({
          message: `找不到ID为'${targetNodeId}'的目标节点`
        });
      }
      
      const connectionRepository = AppDataSource.getRepository(WorkflowConnection);
      
      // 检查是否已存在相同的连接
      const existingConnection = await connectionRepository.findOne({
        where: { workflowId, sourceNodeId, targetNodeId }
      });
      
      if (existingConnection) {
        return res.status(409).json({
          message: "已存在相同的连接",
          connection: existingConnection
        });
      }
      
      const connection = new WorkflowConnection();
      connection.workflowId = workflowId;
      connection.sourceNodeId = sourceNodeId;
      connection.targetNodeId = targetNodeId;
      connection.label = label;
      connection.config = config || {};
      
      const savedConnection = await connectionRepository.save(connection);
      
      return res.status(201).json(savedConnection);
    } catch (error: any) {
      console.error("创建连接失败:", error);
      return res.status(500).json({
        message: "创建连接失败",
        error: error.message
      });
    }
  };
  
  /**
   * 获取指定连接详情
   */
  getConnectionById = async (req: Request, res: Response) => {
    try {
      const { workflowId, connectionId } = req.params;
      const connectionRepository = AppDataSource.getRepository(WorkflowConnection);
      
      const connection = await connectionRepository.findOne({
        where: { id: connectionId, workflowId }
      });
      
      if (!connection) {
        return res.status(404).json({
          message: `找不到ID为'${connectionId}'的连接`
        });
      }
      
      return res.status(200).json(connection);
    } catch (error: any) {
      console.error(`获取连接 ${req.params.connectionId} 详情失败:`, error);
      return res.status(500).json({
        message: "获取连接详情失败",
        error: error.message
      });
    }
  };
  
  /**
   * 更新连接信息
   */
  updateConnection = async (req: Request, res: Response) => {
    try {
      const { workflowId, connectionId } = req.params;
      const connectionRepository = AppDataSource.getRepository(WorkflowConnection);
      
      const connection = await connectionRepository.findOne({
        where: { id: connectionId, workflowId }
      });
      
      if (!connection) {
        return res.status(404).json({
          message: `找不到ID为'${connectionId}'的连接`
        });
      }
      
      const { label, config } = req.body;
      
      if (label !== undefined) connection.label = label;
      if (config !== undefined) connection.config = config;
      
      const updatedConnection = await connectionRepository.save(connection);
      
      return res.status(200).json(updatedConnection);
    } catch (error: any) {
      console.error(`更新连接 ${req.params.connectionId} 失败:`, error);
      return res.status(500).json({
        message: "更新连接失败",
        error: error.message
      });
    }
  };
  
  /**
   * 删除连接
   */
  deleteConnection = async (req: Request, res: Response) => {
    try {
      const { workflowId, connectionId } = req.params;
      const connectionRepository = AppDataSource.getRepository(WorkflowConnection);
      
      const connection = await connectionRepository.findOne({
        where: { id: connectionId, workflowId }
      });
      
      if (!connection) {
        return res.status(404).json({
          message: `找不到ID为'${connectionId}'的连接`
        });
      }
      
      await connectionRepository.remove(connection);
      
      return res.status(200).json({
        message: "连接已成功删除"
      });
    } catch (error: any) {
      console.error(`删除连接 ${req.params.connectionId} 失败:`, error);
      return res.status(500).json({
        message: "删除连接失败",
        error: error.message
      });
    }
  };
}
