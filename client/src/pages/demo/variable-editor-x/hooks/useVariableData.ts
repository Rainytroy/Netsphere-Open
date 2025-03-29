import { useState, useEffect, useCallback } from 'react';
import { VariableData } from '../types';
import useHookVariableData from '../../../../hooks/useVariableData';

/**
 * 变量数据Hook - 编辑器X专用版本
 * 基于全局变量Hook，提供编辑器X所需的变量数据格式
 */
export const useVariableData = () => {
  // 使用全局变量Hook
  const { variables, loading, error, refreshVariables } = useHookVariableData();
  
  // 转换后的变量集合
  const [editorVariables, setEditorVariables] = useState<VariableData[]>([]);
  
  // 将全局变量数据转换为编辑器X所需的格式
  useEffect(() => {
    if (!variables || !Array.isArray(variables)) {
      setEditorVariables([]);
      return;
    }
    
    // 去重处理 - 使用Map以identifier为键确保唯一性
    const uniqueVars = new Map<string, VariableData>();
    
    // 转换变量格式并去重
    const convertedVars = variables.map(v => {
      return {
        id: v.id,
        field: v.field,
        sourceName: v.sourceName || v.source?.name || '',
        sourceType: v.sourceType || v.type || '',
        value: v.value || '',
        displayIdentifier: v.displayIdentifier || `@${v.sourceName || v.source?.name || 'Unknown'}.${v.field}`,
        identifier: v.identifier
      } as VariableData;
    });
    
    // 使用Map确保唯一性
    convertedVars.forEach(v => {
      uniqueVars.set(v.identifier, v);
    });
    
    // 从Map中获取所有唯一的变量
    const uniqueVariables = Array.from(uniqueVars.values());
    
    // 更新状态
    setEditorVariables(uniqueVariables);
    
    console.log(`[useVariableData] 已将${variables.length}个全局变量转换为${uniqueVariables.length}个编辑器变量（已去重）`);
  }, [variables]);
  
  // 刷新变量
  const refreshEditorVariables = useCallback(async () => {
    console.log('[useVariableData] 刷新编辑器变量数据');
    return await refreshVariables();
  }, [refreshVariables]);
  
  return {
    variables: editorVariables,
    loading,
    error,
    refreshVariables: refreshEditorVariables
  };
};
