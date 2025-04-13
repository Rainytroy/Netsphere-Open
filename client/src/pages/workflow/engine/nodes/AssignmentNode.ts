/**
 * 赋值节点处理器
 * 用于变量赋值，支持多个赋值操作
 */

import { AssignmentNodeOutput, ExecutionNode } from '../../types';
import { BaseNodeHandler, NodeExecutionContext } from './BaseNode';
import { parseRawText } from '../utils/VariableParser';
import IdentifierFormatterService from '../../../../services/IdentifierFormatterService';

interface Assignment {
  sourceVariable: string;
  targetVariable: string;
  value?: string;
}

export class AssignmentNodeHandler extends BaseNodeHandler {
  /**
   * 解析变量标识符，支持v3.0系统标识符
   * @param identifier 变量标识符（系统标识符或显示标识符）
   * @returns 解析结果，包含id和field
   */
  private parseVariableIdentifier(identifier: string): { id: string; field: string; fullId: string; type: string } | null {
    if (!identifier) return null;
    
    console.log(`[AssignmentNode] 解析变量标识符: ${identifier}`);
    
    // 使用系统服务解析标识符
    if (identifier.startsWith('@gv_') && identifier.endsWith('-=')) {
      // 使用IdentifierFormatterService解析系统标识符
      const parseResult = IdentifierFormatterService.parseIdentifier(identifier);
      
      // 提取类型信息
      const typeMatch = identifier.match(/@gv_([a-zA-Z0-9]+)_/);
      const type = typeMatch ? typeMatch[1].toLowerCase() : 'custom';
      
      // 构建完整的数据库ID格式：type_id_field
      const fullId = parseResult ? `${type}_${parseResult.id}_${parseResult.field}` : '';
      
      const result = parseResult ? {
        ...parseResult,
        fullId,
        type
      } : null;
      
      console.log(`[AssignmentNode] 系统标识符解析结果:`, result);
      return result;
    }
    
    // 处理友好标识符格式 @source.field#id
    if (identifier.startsWith('@') && identifier.includes('.')) {
      try {
        // 移除@前缀
        const withoutPrefix = identifier.substring(1);
        // 分离ID后缀
        const hashIndex = withoutPrefix.indexOf('#');
        let path = withoutPrefix;
        let id = '';
        
        if (hashIndex > 0) {
          path = withoutPrefix.substring(0, hashIndex);
          id = withoutPrefix.substring(hashIndex + 1);
        }
        
        // 分离source和field
        const dotIndex = path.indexOf('.');
        if (dotIndex > 0) {
          const source = path.substring(0, dotIndex);
          const field = path.substring(dotIndex + 1);
          // 构建完整的数据库ID格式：type_id_field
          const type = source.toLowerCase();
          const fullId = `${type}_${id}_${field}`;
          
          console.log(`[AssignmentNode] 友好标识符解析结果: source=${source}, field=${field}, id=${id}, fullId=${fullId}`);
          return { id, field, fullId, type };
        }
      } catch (err) {
        console.error(`[AssignmentNode] 解析友好标识符失败:`, err);
      }
    }
    
    return null;
  }
  
  /**
   * 从系统标识符生成友好标识符
   * @param systemId 系统标识符
   * @param variables 变量上下文
   * @returns 友好标识符
   */
  private generateFriendlyId(systemId: string, variables: Record<string, any>): string {
    if (!systemId || !systemId.startsWith('@gv_') || !systemId.endsWith('-=')) {
      return systemId; // 如果不是系统标识符，则原样返回
    }
    
    try {
      const match = systemId.match(/@gv_([a-z]+)_([a-z0-9-]+)_([a-z]+)-=/i);
      if (!match) return systemId;
      
      const type = match[1]; // 例如 npc, custom, workflow
      const id = match[2];   // UUID
      const field = match[3]; // 字段名
      const shortId = id.substring(0, 4);
      
      // 为不同类型生成适当的显示名称
      let entityName = '';
      switch (type.toLowerCase()) {
        case 'npc': 
          // 尝试在变量中寻找NPC名称
          for (const [k, v] of Object.entries(variables)) {
            if (k.includes(id) && k.includes('name')) {
              entityName = String(v || 'NPC');
              break;
            }
          }
          if (!entityName) entityName = 'NPC';
          break;
        case 'custom': entityName = '变量'; break;
        case 'workflow': entityName = '工作流'; break;
        case 'task': entityName = '任务'; break;
        case 'system': entityName = '系统'; break;
        case 'file': entityName = '文件'; break;
        default: entityName = type;
      }
      
      return `@${entityName}.${field}#${shortId}`;
    } catch (err) {
      console.error(`[AssignmentNode] 生成友好标识符失败:`, err);
      return systemId;
    }
  }
  
  /**
   * 从标识符提取变量类型，支持系统标识符和友好标识符
   * @param identifier 变量标识符
   * @returns 变量类型字符串（npc, task, workflow, file, system, custom）
   */
  private extractVariableType(identifier: string): string {
    if (!identifier) return 'custom';
    
    // 从系统标识符中提取类型
    if (identifier.startsWith('@gv_')) {
      const match = identifier.match(/@gv_([a-zA-Z0-9]+)_/);
      if (match) return match[1].toLowerCase();
    }
    
    // 从友好标识符中提取类型
    if (identifier.startsWith('@') && identifier.includes('.')) {
      const sourceMatch = identifier.match(/@([^.]+)\./i);
      if (sourceMatch) {
        const sourceName = sourceMatch[1].toLowerCase();
        
        // 根据常见名称推断类型
        if (sourceName.includes('npc') || sourceName === '茶叶蛋' || sourceName === '云透') {
          return 'npc';
        } else if (sourceName.includes('任务') || sourceName.includes('task')) {
          return 'task';
        } else if (sourceName.includes('workflow') || sourceName.includes('工作流')) {
          return 'workflow';
        } else if (sourceName.includes('file') || sourceName.includes('文件')) {
          return 'file';
        } else if (sourceName.includes('system') || sourceName.includes('系统')) {
          return 'system';
        }
      }
    }
    
    return 'custom';
  }
  
  /**
   * 获取变量颜色方案标识
   * 此方法为UI组件提供标准化的颜色方案标识
   * @param variableType 变量类型
   * @returns 颜色方案标识
   */
  private getVariableColorScheme(variableType: string): string {
    const type = variableType.toLowerCase();
    
    switch (type) {
      case 'npc': return 'npc';
      case 'task': return 'task';
      case 'workflow': return 'workflow';
      case 'file': return 'file';
      case 'system': return 'system';
      case 'custom':
      default: return 'custom';
    }
  }
  
  /**
   * 规范化变量键
   * @param variableIdentifier 变量标识符
   * @returns 规范化后的键
   */
  private normalizeVariableKey(variableIdentifier: string): string {
    if (!variableIdentifier) return '';
    
    // 系统标识符保持原样
    if (variableIdentifier.startsWith('@gv_') && variableIdentifier.endsWith('-=')) {
      return variableIdentifier;
    }
    
    // 处理显示标识符格式：@source.field#shortId
    if (variableIdentifier.startsWith('@') && variableIdentifier.includes('.')) {
      // 移除@前缀和#id后缀
      let normalized = variableIdentifier.substring(1);
      const hashIndex = normalized.indexOf('#');
      if (hashIndex > 0) {
        normalized = normalized.substring(0, hashIndex);
      }
      return normalized;
    }
    
    // 其他格式处理
    if (variableIdentifier.startsWith('@')) {
      return variableIdentifier.substring(1);
    }
    
    return variableIdentifier;
  }

  /**
   * 从上下文获取变量值 - 极简版
   * @param variableIdentifier 变量标识符
   * @param variables 变量上下文
   * @returns 变量值
   */
  private getVariableValue(variableIdentifier: string, variables: Record<string, any>): string {
    if (!variableIdentifier) return '';
    
    // 如果是系统标识符，直接提取变量ID并查找
    if (variableIdentifier.startsWith('@gv_') && variableIdentifier.endsWith('-=')) {
      // 提取完整变量ID: 去掉前缀@gv_和后缀-=
      const variableId = variableIdentifier.substring(4, variableIdentifier.length - 2);
      
      if (variables[variableId] !== undefined) {
        // 处理对象类型，避免[object Object]
        let value = variables[variableId];
        if (typeof value === 'object' && value !== null) {
          try {
            value = JSON.stringify(value);
          } catch (e) {
            value = "[复杂对象]";
          }
        }
        return String(value || '');
      }
      return '';
    }
    
    // 非系统标识符情况，查找是否有直接匹配
    if (variables[variableIdentifier] !== undefined) {
      // 处理对象类型
      let value = variables[variableIdentifier];
      if (typeof value === 'object' && value !== null) {
        try {
          value = JSON.stringify(value);
        } catch (e) {
          value = "[复杂对象]";
        }
      }
      return String(value || '');
    }
    
    return '';
  }
  
  /**
   * 执行赋值节点
   * @param node 节点数据
   * @param context 执行上下文
   */
  async execute(node: ExecutionNode, context: NodeExecutionContext): Promise<void> {
    try {
      this.markExecuting(node, context);
      
      // 检查节点配置
      console.log(`[AssignmentNode] 节点 ${node.id} 的配置:`, {
        config: node.config,
        '配置为空': !node.config || Object.keys(node.config).length === 0,
        assignments: node.config?.assignments,
        displayIdMap: node.config?.displayIdMap ? Object.keys(node.config?.displayIdMap).length : 0,
        variableTypes: node.config?.variableTypes ? Object.keys(node.config?.variableTypes).length : 0
      });
      
      // 调试输出关键的变量映射信息
      if (node.config?.displayIdMap) {
        console.log('[AssignmentNode] 显示标识符映射表:', node.config.displayIdMap);
      }
      
      if (node.config?.variableTypes) {
        console.log('[AssignmentNode] 变量类型映射表:', node.config.variableTypes);
      }
      
      // 获取赋值配置
      const assignments = node.config?.assignments || [];
      const { displayIdMap = {} } = node.config || {};
      
      if (!assignments.length) {
        console.warn('[AssignmentNode] 赋值节点没有配置赋值操作:', node.id);
      }
      
      // 对变量进行深拷贝，避免直接修改上下文变量
      const newVariables = { ...context.variables };
      
      // 处理后的赋值结果
      const processedAssignments: any[] = [];
      
      // 变量类型信息
      const calculatedVariableTypes: Record<string, string> = {};
      
      // 处理每个赋值规则
      for (const assignment of assignments) {
        try {
          const { sourceVariable, targetVariable, value } = assignment;
          
          if (!sourceVariable && !value) {
            console.warn(`[AssignmentNode] 跳过无效赋值规则: 源和值都为空`);
            continue;
          }
          
          if (!targetVariable) {
            console.warn(`[AssignmentNode] 跳过无效赋值规则: 目标为空`);
            continue;
          }
          
          console.log(`\n[AssignmentNode] ---------- 处理赋值规则 ----------`);
          console.log(`[AssignmentNode] 源: ${sourceVariable || "固定值"}`);
          console.log(`[AssignmentNode] 目标: ${targetVariable}`);
          
          // 准备变量键名
          const sourceKey = this.normalizeVariableKey(sourceVariable);
          const targetKey = this.normalizeVariableKey(targetVariable);
          
          // 获取源变量值或使用固定值
          let assignValue: string = '';
          
          // 如果有固定值，直接使用
          if (value !== undefined) {
            assignValue = parseRawText(value, newVariables);
            console.log(`[AssignmentNode] 使用固定值: '${value}' -> 解析结果: '${assignValue}'`);
          } 
          // 否则从源变量获取值
          else if (sourceVariable) {
            // 获取源变量值
            assignValue = this.getVariableValue(sourceVariable, newVariables);
            
            // 检查并解析变量引用
            if (assignValue.includes('@gv_')) {
              const parsedValue = parseRawText(assignValue, newVariables);
              if (parsedValue !== assignValue) {
                console.log(`[AssignmentNode] 源变量值包含变量引用，解析结果: ${parsedValue}`);
                assignValue = parsedValue;
              }
            }
            
            // 如果值是对象，转换为JSON字符串
            if (typeof assignValue === 'object' && assignValue !== null) {
              try {
                assignValue = JSON.stringify(assignValue);
              } catch (e) {
                assignValue = "[复杂对象]";
              }
            }
            
            console.log(`[AssignmentNode] 最终获取的源变量值: ${assignValue}`);
          }
          
          // 设置目标变量
          if (targetVariable) {
            // 更新变量 - 存储到所有可能的位置，确保后续操作能找到
            console.log(`[AssignmentNode] 开始更新变量`);
            
            // 1. 使用规范化的键
            if (targetKey) {
              newVariables[targetKey] = assignValue;
              console.log(`[AssignmentNode] 已保存到 ${targetKey}`);
            }
            
            // 2. 保存到原始显示标识符
            newVariables[targetVariable] = assignValue;
            console.log(`[AssignmentNode] 已保存到 ${targetVariable}`);
            
            // 3. 在系统标识符和显示标识符之间建立双向映射
            // 这是关键：确保两种标识符之间互相引用，这样无论查找哪个都能找到对方
            const friendlyId = displayIdMap[targetVariable];
            if (friendlyId) {
              // 友好标识符指向系统标识符
              newVariables[friendlyId] = targetVariable;
              // 友好标识符也直接存储值
              newVariables[friendlyId + '_value'] = assignValue;
              console.log(`[AssignmentNode] 已保存友好标识符映射: ${friendlyId} -> ${targetVariable}`);
            }
            
            // 4. 如果是复合路径，也保存到字段部分
            if (targetKey.includes('.')) {
              // 对于没有使用标准解析方法解析出来的复合键，也使用简单拆分处理
              const [source, field] = targetKey.split('.');
              
              if (field) {
                // 保存到单独的字段（对于非通用字段）
                if (field !== 'value' && field !== 'output' && field !== 'input') {
                  newVariables[field] = assignValue;
                  console.log(`[AssignmentNode] 已保存到字段 ${field}`);
                }
                
                // 创建或更新嵌套对象
                if (!newVariables[source] || typeof newVariables[source] !== 'object') {
                  newVariables[source] = {};
                }
                
                if (typeof newVariables[source] === 'object') {
                  newVariables[source] = {
                    ...newVariables[source],
                    [field]: assignValue
                  };
                  console.log(`[AssignmentNode] 已保存到嵌套对象 ${source}.${field}`);
                }
              }
            }
            
            // 5. 如果是系统标识符，解析并设置额外的引用点
            if (targetVariable.startsWith('@gv_') && targetVariable.endsWith('-=')) {
              const parseResult = this.parseVariableIdentifier(targetVariable);
              
              if (parseResult) {
                const { id, field } = parseResult;
                
                // 提取变量类型（如npc, task等）
                const typeMatch = targetVariable.match(/@gv_([a-zA-Z0-9]+)_/);
                const type = typeMatch ? typeMatch[1] : null;
                
                // 记录变量类型
                if (type) {
                  calculatedVariableTypes[targetVariable] = type;
                }
                
                if (type && id) {
                  // 确保类型命名空间存在
                  if (!newVariables[type] || typeof newVariables[type] !== 'object') {
                    newVariables[type] = {};
                  }
                  
                  // 在类型命名空间下设置ID索引
                  if (typeof newVariables[type] === 'object') {
                    if (!newVariables[type][id] || typeof newVariables[type][id] !== 'object') {
                      newVariables[type][id] = {};
                    }
                    
                    // 设置字段值
                    if (typeof newVariables[type][id] === 'object') {
                      newVariables[type][id][field] = assignValue;
                      console.log(`[AssignmentNode] 设置类型变量: ${type}.${id}.${field} = ${assignValue}`);
                    }
                  }
                }
              }
            }
          }
          
          // 添加到处理结果 - 使用友好标识符
          let friendlySourceId = sourceVariable || 'custom';
          let friendlyTargetId = targetVariable;
          
          // 直接从displayIdMap中查找标识符映射
          if (displayIdMap && typeof displayIdMap === 'object') {
            // 源变量映射
            if (sourceVariable && displayIdMap[sourceVariable]) {
              friendlySourceId = displayIdMap[sourceVariable];
              console.log(`[AssignmentNode] 源变量从映射表中找到友好标识符: ${friendlySourceId}`);
            }
            
            // 目标变量映射
            if (targetVariable && displayIdMap[targetVariable]) {
              friendlyTargetId = displayIdMap[targetVariable];
              console.log(`[AssignmentNode] 目标变量从映射表中找到友好标识符: ${friendlyTargetId}`);
            }
          }
          
          // 如果没有从映射表中找到，尝试生成友好标识符
          if (friendlySourceId === sourceVariable && sourceVariable && sourceVariable.startsWith('@gv_')) {
            friendlySourceId = this.generateFriendlyId(sourceVariable, newVariables);
            console.log(`[AssignmentNode] 为源变量生成友好标识符: ${friendlySourceId}`);
            
            // 记录类型
            const sourceType = this.extractVariableType(sourceVariable);
            if (sourceType) {
              calculatedVariableTypes[sourceVariable] = sourceType;
            }
          }
          
          if (friendlyTargetId === targetVariable && targetVariable && targetVariable.startsWith('@gv_')) {
            friendlyTargetId = this.generateFriendlyId(targetVariable, newVariables);
            console.log(`[AssignmentNode] 为目标变量生成友好标识符: ${friendlyTargetId}`);
            
            // 记录类型
            const targetType = this.extractVariableType(targetVariable);
            if (targetType) {
              calculatedVariableTypes[targetVariable] = targetType;
            }
          }
          
          // 获取源变量和目标变量的类型
          const sourceType = this.extractVariableType(sourceVariable || 'custom');
          const targetType = this.extractVariableType(targetVariable);
          
          // 获取颜色方案标识
          const sourceColorScheme = this.getVariableColorScheme(sourceType);
          const targetColorScheme = this.getVariableColorScheme(targetType);
          
          // 解析源变量和目标变量的完整信息
          const sourceParsed = sourceVariable ? this.parseVariableIdentifier(sourceVariable) : null;
          const targetParsed = targetVariable ? this.parseVariableIdentifier(targetVariable) : null;
          
          // 创建最终赋值结果对象，添加完整的调试信息
          const assignmentResult = {
            // 源变量信息
            sourceSystemId: sourceVariable,
            sourceDisplayId: friendlySourceId,
            sourceValue: assignValue,
            sourceType,
            sourceColorScheme,
            sourceId: sourceParsed?.id || '',
            sourceFullId: sourceParsed?.fullId || '',
            
            // 目标变量信息
            targetSystemId: targetVariable,
            targetDisplayId: friendlyTargetId,
            targetValue: assignValue,
            targetType,
            targetColorScheme,
            targetId: targetParsed?.id || '',
            targetFullId: targetParsed?.fullId || `${targetType}_${targetParsed?.id || ''}_${targetParsed?.field || 'value'}`,
            
            // 赋值值
            value: assignValue
          };
          
          processedAssignments.push(assignmentResult);
          
          console.log(`[AssignmentNode] 赋值操作成功完成: ${sourceVariable || "固定值"} -> ${targetVariable} = ${assignValue}`);
          console.log(`[AssignmentNode] 赋值结果:`, JSON.stringify(assignmentResult, null, 2));
        } catch (error) {
          console.error(`[AssignmentNode] 赋值操作失败: ${assignment.sourceVariable || "固定值"} -> ${assignment.targetVariable}`, error);
          // 继续处理其他赋值
        }
      }
      
      // 更新变量上下文
      Object.assign(context.variables, newVariables);
      
      // 准备输出
      const output: AssignmentNodeOutput = {
        assignments: processedAssignments,
        variableContext: {
          variables: newVariables,
          displayIdMap: displayIdMap || {},
          variableTypes: calculatedVariableTypes
        }
      };
      
      // 输出赋值结果日志
      console.log(`[AssignmentNode] 全部赋值结果:`, 
        JSON.stringify(output.assignments, null, 2));
      
      // 更新节点输出
      context.updateNode(node.id, { output });
      
      // 标记完成
      this.markCompleted(node, context, output);
      
      // 继续执行下一个节点
      context.moveToNextNode(node.nextNodeId);
    } catch (error) {
      console.error('[AssignmentNode] 执行错误:', error);
      this.markError(node, context, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * 验证赋值节点配置
   * @param node 要验证的节点
   * @returns 是否验证通过
   */
  validate(node: ExecutionNode): boolean {
    if (!super.validate(node)) return false;

    // 赋值节点必须是assign类型
    if (node.type !== 'assign') {
      console.warn('[AssignmentNode] 节点类型不是assign:', node.type);
      return false;
    }

    // 赋值节点必须有赋值配置
    if (!node.config?.assignments || !Array.isArray(node.config.assignments)) {
      console.warn('[AssignmentNode] 赋值节点没有配置assignments数组');
      return false;
    }

    return true;
  }
}
