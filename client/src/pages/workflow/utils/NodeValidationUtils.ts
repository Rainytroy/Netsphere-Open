/**
 * 节点验证工具类
 * 提供节点配置验证、检查等功能
 */

import { ExecutionNode } from '../types';
import { createWorkflowEngineLogger } from './LogUtils';

const logger = createWorkflowEngineLogger();

/**
 * 节点配置验证选项
 */
export interface NodeValidationOptions {
  /**
   * 是否验证节点类型
   */
  validateType?: boolean;
  
  /**
   * 是否验证必需字段
   */
  validateRequiredFields?: boolean;
  
  /**
   * 是否记录验证结果
   */
  logValidation?: boolean;
  
  /**
   * 是否验证下一节点ID
   */
  validateNextNodeId?: boolean;
  
  /**
   * 是否允许该节点作为结束节点（无下一节点）
   */
  allowAsEndNode?: boolean;
  
  /**
   * 必需的配置字段列表
   */
  requiredConfigFields?: string[];
}

/**
 * 验证节点配置是否有效
 * @param node 要验证的节点
 * @param expectedType 期望的节点类型
 * @param options 验证选项
 * @returns 是否验证通过
 */
export function validateNodeConfig(
  node: ExecutionNode,
  expectedType: string,
  options: NodeValidationOptions = {}
): boolean {
  const {
    validateType = true,
    validateRequiredFields = true,
    logValidation = true,
    validateNextNodeId = true,
    allowAsEndNode = false,
    requiredConfigFields = []
  } = options;
  
  // 检查节点是否存在
  if (!node) {
    if (logValidation) logger.error(`节点对象不存在`);
    return false;
  }
  
  // 检查节点类型
  if (validateType && node.type !== expectedType) {
    if (logValidation) logger.warn(`节点 ${node.id} 类型不是 ${expectedType}:`, node.type);
    return false;
  }
  
  // 检查节点ID
  if (!node.id) {
    if (logValidation) logger.error(`节点缺少ID`);
    return false;
  }
  
  // 检查节点配置
  if (validateRequiredFields) {
    if (!node.config) {
      if (logValidation) logger.error(`节点 ${node.id} 配置完全丢失`);
      return false;
    }
    
    // 验证必需字段
    for (const field of requiredConfigFields) {
      if (node.config[field] === undefined) {
        if (logValidation) logger.warn(`节点 ${node.id} 缺少必需配置字段: ${field}`);
        return false;
      }
    }
  }
  
  // 检查下一个节点ID
  if (validateNextNodeId && !node.nextNodeId && !allowAsEndNode && !node.config?.isEndNode) {
    if (logValidation) logger.warn(`节点 ${node.id} 没有下一个节点ID且不是结束节点`);
    return false;
  }
  
  return true;
}

/**
 * 获取节点配置摘要，方便日志记录
 * @param node 节点对象
 * @param includeFields 要包含的特定字段
 * @returns 配置摘要对象
 */
export function getNodeConfigSummary(
  node: ExecutionNode,
  includeFields: string[] = []
): Record<string, any> {
  const config = node.config || {};
  const summary: Record<string, any> = {
    id: node.id,
    type: node.type,
    name: node.name,
    hasConfig: !!node.config,
    configFieldCount: Object.keys(config).length,
    nextNodeId: node.nextNodeId || '无'
  };
  
  // 添加指定的配置字段
  includeFields.forEach(field => {
    if (config[field] !== undefined) {
      // 为了避免日志过大，对对象和数组类型特殊处理
      if (typeof config[field] === 'object' && config[field] !== null) {
        if (Array.isArray(config[field])) {
          summary[field] = `Array(${config[field].length})`;
        } else {
          summary[field] = `Object(${Object.keys(config[field]).length} props)`;
        }
      } else if (typeof config[field] === 'string' && config[field].length > 50) {
        // 对于长字符串，截断显示
        summary[field] = `${config[field].substring(0, 47)}...`;
      } else {
        summary[field] = config[field];
      }
    } else {
      summary[field] = '未定义';
    }
  });
  
  return summary;
}

/**
 * 验证显示节点配置
 * @param node 显示节点
 * @returns 是否验证通过
 */
export function validateDisplayNode(node: ExecutionNode): boolean {
  return validateNodeConfig(node, 'display', {
    allowAsEndNode: true,
    // 显示节点不强制要求特定配置字段，但应该至少有以下字段之一
    validateRequiredFields: false
  });
}

/**
 * 检查显示节点是否有有效内容配置
 * @param node 显示节点
 * @returns 有效内容来源或null
 */
export function getDisplayNodeContentSource(node: ExecutionNode): string | null {
  if (!node || !node.config) return null;
  
  const { parsedContent, rawText, variablePath, template, richContent } = node.config;
  
  if (parsedContent) return 'parsedContent';
  if (rawText) return 'rawText';
  if (richContent) return 'richContent';
  if (variablePath) return 'variablePath';
  if (template) return 'template';
  
  return null;
}

/**
 * 获取节点的辅助ID（用于日志和调试）
 * @param node 节点对象
 * @returns 辅助ID字符串
 */
export function getNodeDebugId(node: ExecutionNode): string {
  if (!node) return 'unknown';
  return `${node.id}(${node.name || node.type})`;
}
