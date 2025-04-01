import { useState, useEffect, useCallback } from 'react';
import { VariableData, VariableDataImpl } from '../types';
import useHookVariableData from '../../../../hooks/useVariableData';

/**
 * 变量数据Hook - v3.0版本
 * 基于全局变量Hook，提供符合v3.0规范的变量数据格式
 */
export const useVariableData = () => {
  // 使用全局变量Hook
  const { variables: globalVariables, loading, error, refreshVariables } = useHookVariableData();
  
  // 转换后的变量集合
  const [editorVariables, setEditorVariables] = useState<VariableData[]>([]);
  
  // 将全局变量数据转换为编辑器所需的格式
  useEffect(() => {
    if (!globalVariables || !Array.isArray(globalVariables)) {
      console.log('[v3.0 Debug] useVariableData: 变量为空或非数组');
      setEditorVariables([]);
      return;
    }
    
    console.log(`[v3.0 Debug] useVariableData: 处理 ${globalVariables.length} 个变量`);
    
    // 初步检查变量结构
    if (globalVariables.length > 0) {
      const sampleVar = globalVariables[0] as any;
      console.log('[v3.0 Debug] 变量样本:', {
        id: sampleVar.id,
        type: sampleVar.type,
        value: sampleVar.value?.substring(0, 30) || '(无值)'
      });
    }
    
    // 转换变量格式，使用VariableDataImpl确保正确实现getter方法
    const convertedVars = globalVariables.map(v => {
      // 将v作为any类型处理，避免TypeScript类型检查错误
      const vAny = v as any;
      
      // 提取必要数据，确保v3.0格式字段正确
      const id = vAny.entityId || vAny.id || '';
      const type = vAny.type?.toString()?.toLowerCase() || 'custom';
      const field = vAny.fieldname || vAny.field || 'value';
      const sourceName = vAny.name || vAny.sourceName || 
                         (vAny.source && vAny.source.name ? vAny.source.name : '') || 
                         'Unknown';
      
      // 使用VariableDataImpl创建变量对象，确保正确实现get type()和get identifier()
      return new VariableDataImpl({
        id,
        field,
        sourceName,
        sourceType: type,
        value: vAny.value || '',
        displayIdentifier: vAny.displayIdentifier || `@${sourceName}.${field}#${id.substring(0, Math.min(4, id.length))}`
      });
    });
    
    // 去重处理 - 直接使用变量ID+字段名作为唯一键
    const uniqueVars = new Map<string, VariableData>();
    
    convertedVars.forEach(v => {
      const key = `${v.type}_${v.id}_${v.field}`;
      
      // 确保变量对象具有正确的identifier属性
      if (!v.identifier.includes(`@gv_${v.type}_${v.id}_${v.field}-=`)) {
        console.warn(`[v3.0 Debug] 警告: 变量标识符格式不符合v3.0规范: ${v.identifier}`);
      }
      
      uniqueVars.set(key, v);
    });
    
    // 从Map中获取所有唯一的变量
    const uniqueVariables = Array.from(uniqueVars.values());
    
    // 打印变量列表示例
    if (uniqueVariables.length > 0) {
      console.log('[v3.0 Debug] 变量列表示例 (前3个):', 
        uniqueVariables.slice(0, 3).map(v => ({
          type: v.type,
          id: v.id,
          field: v.field,
          identifier: v.identifier,
          value: v.value?.substring(0, 20) || '(空值)'
        }))
      );
    }
    
    // 更新状态
    setEditorVariables(uniqueVariables);
    
    console.log(`[v3.0 Debug] 已将${globalVariables.length}个全局变量转换为${uniqueVariables.length}个编辑器变量（已去重）`);
  }, [globalVariables]);
  
  // 刷新变量
  const refreshEditorVariables = useCallback(async () => {
    console.log('[v3.0 Debug] 刷新变量数据');
    return await refreshVariables();
  }, [refreshVariables]);
  
  return {
    variables: editorVariables,
    loading,
    error,
    refreshVariables: refreshEditorVariables
  };
};
