import { Request, Response } from 'express';
import { Variable } from '../models/Variable';
import { workflowVariableService } from '../services/WorkflowVariableService';

/**
 * 工作流变量控制器
 * 处理工作流变量的HTTP请求
 */
export class WorkflowVariableController {
  /**
   * 获取工作流变量
   * @param req 请求对象
   * @param res 响应对象
   */
  public getWorkflowVariables = async (req: Request, res: Response): Promise<void> => {
    try {
      const { workflowId } = req.params;
      
      if (!workflowId) {
        res.status(400).json({
          success: false,
          message: '缺少工作流ID'
        });
        return;
      }
      
      console.log(`[WorkflowVariableController] 获取工作流变量 (workflowId: ${workflowId})`);
      
      const variables = await workflowVariableService.getWorkflowVariables(workflowId);
      
      res.status(200).json({
        success: true,
        data: variables
      });
    } catch (error) {
      console.error('[WorkflowVariableController] 获取工作流变量失败:', error);
      res.status(500).json({
        success: false,
        message: '获取工作流变量失败',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };
  
  /**
   * 创建/更新工作流变量
   * @param req 请求对象
   * @param res 响应对象
   */
  public createOrUpdateWorkflowVariable = async (req: Request, res: Response): Promise<void> => {
    try {
      const { workflowId } = req.params;
      const { workflowName, field, value } = req.body;
      
      if (!workflowId || !workflowName || !field) {
        res.status(400).json({
          success: false,
          message: '缺少必要参数 (workflowId, workflowName, field)'
        });
        return;
      }
      
      console.log(`[WorkflowVariableController] 创建/更新工作流变量 (workflowId: ${workflowId}, field: ${field})`);
      
      const variable = await workflowVariableService.createOrUpdateWorkflowVariable(
        workflowId,
        workflowName,
        field,
        value || ''
      );
      
      res.status(200).json({
        success: true,
        data: variable
      });
    } catch (error) {
      console.error('[WorkflowVariableController] 创建/更新工作流变量失败:', error);
      res.status(500).json({
        success: false,
        message: '创建/更新工作流变量失败',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };
  
  /**
   * 初始化工作流基本变量
   * @param req 请求对象
   * @param res 响应对象
   */
  public initWorkflowBaseVariables = async (req: Request, res: Response): Promise<void> => {
    try {
      const { workflowId, name, description, isActive } = req.body;
      
      if (!workflowId || !name) {
        res.status(400).json({
          success: false,
          message: '缺少必要参数 (workflowId, name)'
        });
        return;
      }
      
      console.log(`[WorkflowVariableController] 初始化工作流基本变量 (workflowId: ${workflowId})`);
      
      await workflowVariableService.initWorkflowBaseVariables(
        workflowId,
        name,
        description || '',
        isActive || false
      );
      
      res.status(200).json({
        success: true,
        message: '初始化工作流基本变量成功'
      });
    } catch (error) {
      console.error('[WorkflowVariableController] 初始化工作流基本变量失败:', error);
      res.status(500).json({
        success: false,
        message: '初始化工作流基本变量失败',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };
  
  /**
   * 删除工作流变量
   * @param req 请求对象
   * @param res 响应对象
   */
  public deleteWorkflowVariables = async (req: Request, res: Response): Promise<void> => {
    try {
      const { workflowId } = req.params;
      const { field } = req.query;
      
      if (!workflowId) {
        res.status(400).json({
          success: false,
          message: '缺少工作流ID'
        });
        return;
      }
      
      console.log(`[WorkflowVariableController] 删除工作流变量 (workflowId: ${workflowId}, field: ${field})`);
      
      await workflowVariableService.deleteWorkflowVariables(
        workflowId,
        field as string
      );
      
      res.status(200).json({
        success: true,
        message: '删除工作流变量成功'
      });
    } catch (error) {
      console.error('[WorkflowVariableController] 删除工作流变量失败:', error);
      res.status(500).json({
        success: false,
        message: '删除工作流变量失败',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };
}

// 导出单例实例
export const workflowVariableController = new WorkflowVariableController();
