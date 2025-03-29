import { Request, Response } from 'express';
import { VariableService, variableService } from '../services/VariableService';
import { VariableType } from '../models/Variable';

/**
 * 全局变量控制器
 * 处理变量相关的HTTP请求
 */
export class VariableController {
  private variableService: VariableService;

  constructor() {
    // 使用单例实例而不是创建新实例
    this.variableService = variableService;
  }

  /**
   * 获取所有变量
   */
  public getVariables = async (req: Request, res: Response): Promise<void> => {
    try {
      // 获取查询参数
      const type = req.query.type as VariableType | undefined;
      const sourceId = req.query.sourceId as string | undefined;

      // 获取变量列表
      const variables = await this.variableService.getVariables({
        type,
        sourceId
      });

      res.status(200).json(variables);
    } catch (error) {
      console.error('获取变量列表失败:', error);
      res.status(500).json({
        message: '获取变量列表失败',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  };

  /**
   * 获取单个变量
   */
  public getVariableById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id;
      const variable = await this.variableService.getVariableById(id);
      res.status(200).json(variable);
    } catch (error) {
      console.error(`获取变量失败 ID=${req.params.id}:`, error);
      
      // 判断错误类型，返回适当的状态码
      if (error instanceof Error && error.message.includes('不存在')) {
        res.status(404).json({
          message: '变量不存在',
          error: error.message
        });
      } else {
        res.status(500).json({
          message: '获取变量失败',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  };

  /**
   * 创建自定义变量
   */
  public createVariable = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, value, entityId } = req.body;

      // 验证必填字段
      if (!name || value === undefined) {
        res.status(400).json({
          message: '缺少必要的字段',
          error: '必须提供name和value字段'
        });
        return;
      }

      // 创建变量
      const newVariable = await this.variableService.createVariable({
        name,
        value,
        entityId: entityId, // 使用客户端传入的UUID，而不是固定值
        isValid: true, // 默认设置为有效
        displayIdentifier: "" // 由服务层自动生成显示标识符
      });

      res.status(201).json(newVariable);
    } catch (error) {
      console.error('创建变量失败:', error);
      
      // 判断错误类型，返回适当的状态码
      if (error instanceof Error && error.message.includes('已存在')) {
        res.status(409).json({
          message: '创建变量失败',
          error: error.message
        });
      } else {
        res.status(500).json({
          message: '创建变量失败',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  };

  /**
   * 更新自定义变量
   */
  public updateVariable = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id;
      const { name, value } = req.body;

      // 至少需要提供一个更新字段
      if (!name && value === undefined) {
        res.status(400).json({
          message: '缺少更新字段',
          error: '必须提供至少一个要更新的字段(name或value)'
        });
        return;
      }

      // 更新变量
      const updatedVariable = await this.variableService.updateVariable(id, {
        name,
        value,
        displayIdentifier: "" // 由服务层自动生成显示标识符
      });

      res.status(200).json(updatedVariable);
    } catch (error) {
      console.error(`更新变量失败 ID=${req.params.id}:`, error);
      
      // 判断错误类型，返回适当的状态码
      if (error instanceof Error) {
        if (error.message.includes('不存在')) {
          res.status(404).json({
            message: '变量不存在',
            error: error.message
          });
        } else if (error.message.includes('只能更新自定义变量')) {
          res.status(403).json({
            message: '无法更新非自定义变量',
            error: error.message
          });
        } else if (error.message.includes('已存在')) {
          res.status(409).json({
            message: '更新变量失败',
            error: error.message
          });
        } else {
          res.status(500).json({
            message: '更新变量失败',
            error: error.message
          });
        }
      } else {
        res.status(500).json({
          message: '更新变量失败',
          error: String(error)
        });
      }
    }
  };

  /**
   * 删除自定义变量
   */
  public deleteVariable = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = req.params.id;
      await this.variableService.deleteVariable(id);
      res.status(204).send();
    } catch (error) {
      console.error(`删除变量失败 ID=${req.params.id}:`, error);
      
      // 判断错误类型，返回适当的状态码
      if (error instanceof Error) {
        if (error.message.includes('不存在')) {
          res.status(404).json({
            message: '变量不存在',
            error: error.message
          });
        } else if (error.message.includes('只能删除自定义变量')) {
          res.status(403).json({
            message: '无法删除非自定义变量',
            error: error.message
          });
        } else {
          res.status(500).json({
            message: '删除变量失败',
            error: error.message
          });
        }
      } else {
        res.status(500).json({
          message: '删除变量失败',
          error: String(error)
        });
      }
    }
  };
}
