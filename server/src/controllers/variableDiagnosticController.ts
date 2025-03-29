/**
 * 变量诊断控制器 (TypeScript版本)
 * 提供对变量解析系统的诊断接口
 */
import { Request, Response } from 'express';
import { variableService } from '../services/VariableService';

/**
 * 执行诊断并返回结果
 * @param {Request} req - Express请求对象
 * @param {Response} res - Express响应对象
 */
export const diagnoseSystem = async (req: Request, res: Response): Promise<void> => {
  try {
    // 返回占位诊断信息，不再调用不存在的方法
    const diagnosticInfo = {
      system: {
        status: "unavailable",
        message: "诊断功能暂时禁用",
        version: "0.3.1"
      },
      // 添加请求信息
      request: {
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        endpoint: req.originalUrl
      }
    };
    
    res.json({
      success: true,
      data: diagnosticInfo
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '诊断过程中出现未知错误';
    console.error('诊断系统出错:', error);
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
};

/**
 * 测试变量解析功能
 * @param {Request} req - Express请求对象
 * @param {Response} res - Express响应对象
 */
export const testVariableResolution = async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, debug } = req.body;
    
    if (!text) {
      res.status(400).json({
        success: false,
        error: '缺少必要的文本参数'
      });
      return;
    }
    
    // 返回占位响应，不再调用不存在的方法
    const originalText = text;
    const resolvedText = text; // 不进行任何变换
    
    res.json({
      success: true,
      data: {
        original: originalText,
        resolved: resolvedText,
        changed: false,
        message: "变量解析功能暂时禁用",
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '解析过程中出现未知错误';
    console.error('测试变量解析出错:', error);
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
};
