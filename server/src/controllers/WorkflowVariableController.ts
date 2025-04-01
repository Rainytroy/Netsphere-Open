import { Request, Response } from 'express';
import { workflowVariableService } from '../services/WorkflowVariableService';

/**
 * 工作流变量控制器
 * 提供API接口来管理工作流变量
 */
export class WorkflowVariableController {
  /**
   * 获取工作流变量
   * @param req 请求对象，包含工作流ID
   * @param res 响应对象
   */
  public async getWorkflowVariables(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      
      if (!workflowId) {
        res.status(400).json({
          success: false,
          message: '缺少必要参数: workflowId'
        });
        return;
      }
      
      const variables = await workflowVariableService.getWorkflowVariables(workflowId);
      
      res.status(200).json({
        success: true,
        data: variables
      });
    } catch (error) {
      const e = error as Error;
      res.status(500).json({
        success: false,
        message: '获取工作流变量失败',
        error: e.message
      });
    }
  }
  
  /**
   * 创建或更新工作流变量
   * @param req 请求对象，包含工作流ID、字段名和值
   * @param res 响应对象
   */
  public async createOrUpdateWorkflowVariable(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const { workflowName, field, value } = req.body;
      
      if (!workflowId || !workflowName || !field) {
        res.status(400).json({
          success: false,
          message: '缺少必要参数: workflowId, workflowName, field'
        });
        return;
      }
      
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
      const e = error as Error;
      res.status(500).json({
        success: false,
        message: '创建或更新工作流变量失败',
        error: e.message
      });
    }
  }
  
  /**
   * 删除工作流变量
   * @param req 请求对象，包含工作流ID和可选的字段名
   * @param res 响应对象
   */
  public async deleteWorkflowVariables(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const { field } = req.query;
      
      if (!workflowId) {
        res.status(400).json({
          success: false,
          message: '缺少必要参数: workflowId'
        });
        return;
      }
      
      await workflowVariableService.deleteWorkflowVariables(workflowId, field as string | undefined);
      
      res.status(200).json({
        success: true,
        message: `已删除工作流 ${workflowId} ${field ? `的 ${field} 变量` : '的所有变量'}`
      });
    } catch (error) {
      const e = error as Error;
      res.status(500).json({
        success: false,
        message: '删除工作流变量失败',
        error: e.message
      });
    }
  }
  
  /**
   * 创建或更新工作流输出变量
   * @param req 请求对象，包含工作流ID、工作流名称、输出编号和值
   * @param res 响应对象
   */
  public async createOrUpdateOutputVariable(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const { workflowName, outputNumber, value } = req.body;
      
      if (!workflowId || !workflowName || outputNumber === undefined) {
        res.status(400).json({
          success: false,
          message: '缺少必要参数: workflowId, workflowName, outputNumber'
        });
        return;
      }
      
      const variable = await workflowVariableService.createOrUpdateOutputVariable(
        workflowId,
        workflowName,
        outputNumber,
        value || ''
      );
      
      res.status(200).json({
        success: true,
        data: variable
      });
    } catch (error) {
      const e = error as Error;
      res.status(500).json({
        success: false,
        message: '创建或更新工作流输出变量失败',
        error: e.message
      });
    }
  }
  
  /**
   * 删除工作流输出变量
   * @param req 请求对象，包含工作流ID和输出编号
   * @param res 响应对象
   */
  public async deleteOutputVariable(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      const { outputNumber } = req.query;
      
      if (!workflowId || outputNumber === undefined) {
        res.status(400).json({
          success: false,
          message: '缺少必要参数: workflowId, outputNumber'
        });
        return;
      }
      
      await workflowVariableService.deleteOutputVariable(
        workflowId,
        parseInt(outputNumber as string, 10)
      );
      
      res.status(200).json({
        success: true,
        message: `已删除工作流 ${workflowId} 的输出 ${outputNumber} 变量`
      });
    } catch (error) {
      const e = error as Error;
      res.status(500).json({
        success: false,
        message: '删除工作流输出变量失败',
        error: e.message
      });
    }
  }
  
  /**
   * 初始化工作流基本变量
   * @param req 请求对象，包含工作流ID、名称、描述和激活状态
   * @param res 响应对象
   */
  public async initWorkflowBaseVariables(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId, name, description, isActive } = req.body;
      
      if (!workflowId || !name) {
        res.status(400).json({
          success: false,
          message: '缺少必要参数: workflowId, name'
        });
        return;
      }
      
      await workflowVariableService.initWorkflowBaseVariables(
        workflowId,
        name,
        description || '',
        isActive || false
      );
      
      res.status(200).json({
        success: true,
        message: `已初始化工作流 ${name} 的基本变量`
      });
    } catch (error) {
      const e = error as Error;
      res.status(500).json({
        success: false,
        message: '初始化工作流基本变量失败',
        error: e.message
      });
    }
  }
}

// 导出单例实例
export const workflowVariableController = new WorkflowVariableController();
