import { useState, useCallback, useMemo, useEffect } from 'react';
import { debounce } from 'lodash';
import { VariableView } from '../VariableList';
import { VariableData, VariableEditorXRef } from '../../../components/VariableEditorXWrapper';
import { VexPromptEditorRef } from '../VexPromptEditor';
import { VariableType } from '../../../services/variableService';
import createLogger from '../../../utils/logger';

// 声明lodash模块类型，解决类型问题
declare module 'lodash' {
  export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait?: number,
    options?: any
  ): T & { cancel(): void };
}

const logger = createLogger('useVariableCollection');

interface UseVariableCollectionProps {
  inputEditorRef: React.RefObject<VariableEditorXRef>;
  promptEditorRef: React.RefObject<VexPromptEditorRef>;
}

/**
 * 用于收集和管理编辑器中已使用变量的自定义Hook
 */
export const useVariableCollection = ({ 
  inputEditorRef, 
  promptEditorRef 
}: UseVariableCollectionProps) => {
  // 全部可用变量
  const [variables, setVariables] = useState<VariableView[]>([]);
  // 已使用变量
  const [usedVariables, setUsedVariables] = useState<VariableView[]>([]);

  // 收集已使用变量的函数
  const collectUsedVariables = useCallback(() => {
    try {
      const usedVars: VariableView[] = [];
      
      // 收集输入编辑器中的变量
      if (inputEditorRef.current) {
        const inputVars = inputEditorRef.current.getUsedVariables() || [];
        
        // 将VariableData转换为VariableView
        inputVars.forEach((v: VariableData) => {
          usedVars.push({
            id: v.id,
            name: v.field,
            identifier: v.identifier,
            displayIdentifier: v.displayIdentifier,
            type: v.sourceType as VariableType,
            sourceId: v.id,
            sourceName: v.sourceName,
            value: v.value || ''
          });
        });
      }
      
      // 收集模板编辑器中的变量
      // 注意：VexPromptEditor目前不支持getUsedVariables方法
      // 目前使用空数组模拟
      if (promptEditorRef.current) {
        // 模拟空数组
        const promptVars: VariableData[] = [];
        
        // 将VariableData转换为VariableView
        promptVars.forEach((v: VariableData) => {
          // 检查是否已添加该变量（避免重复）
          const existingVarIndex = usedVars.findIndex(uv => uv.identifier === v.identifier);
          if (existingVarIndex === -1) {
            usedVars.push({
              id: v.id,
              name: v.field,
              identifier: v.identifier,
              displayIdentifier: v.displayIdentifier,
              type: v.sourceType as VariableType,
              sourceId: v.id,
              sourceName: v.sourceName,
              value: v.value || ''
            });
          }
        });
      }
      
      // 更新已使用变量列表
      setUsedVariables(usedVars);
      logger.debug('已收集已使用变量:', { count: usedVars.length });
    } catch (error) {
      logger.error('收集已使用变量失败:', error);
    }
  }, [inputEditorRef, promptEditorRef]);
  
  // 防抖处理的变量收集函数
  const debouncedCollectUsedVariables = useMemo(
    () => debounce(collectUsedVariables, 500),
    [collectUsedVariables]
  );

  // 将VariableView转换为VariableData
  const convertToVariableData = useCallback((variable: VariableView): VariableData => {
    return {
      id: variable.id,
      field: variable.identifier.split('_').pop() || 'unknown', // 从标识符提取字段名
      sourceName: variable.sourceName,
      sourceType: variable.type,
      value: variable.value,
      displayIdentifier: variable.displayIdentifier,
      // 实现getter
      get identifier() {
        return variable.identifier;
      }
    };
  }, []);

  // 处理变量点击，将变量插入到输入框或提示词编辑器
  const handleVariableClick = useCallback((variable: VariableView, taskName?: string) => {
    // 检查是否为当前任务的变量
    if (taskName && variable.sourceName === taskName) {
      return { success: false, message: '不能引用当前任务的变量' };
    }

    // 判断焦点在哪个编辑器上
    if (document.activeElement?.closest('.prompt-editor-container')) {
      // 插入到提示词编辑器
      if (promptEditorRef.current && promptEditorRef.current.insertVariable) {
        promptEditorRef.current.insertVariable(variable);
        return { success: true };
      }
    } else {
      // 插入到输入编辑器
      if (inputEditorRef.current) {
        // 转换为VariableData类型
        const variableData = convertToVariableData(variable);
        inputEditorRef.current.insertVariable(variableData);
        return { success: true };
      }
    }
    
    return { success: false, message: '没有找到活动的编辑器' };
  }, [promptEditorRef, inputEditorRef, convertToVariableData]);

  // 更新编辑器内容后触发变量收集
  const handleEditorContentChange = useCallback(() => {
    debouncedCollectUsedVariables();
  }, [debouncedCollectUsedVariables]);

  // 清理资源
  useEffect(() => {
    return () => {
      debouncedCollectUsedVariables.cancel();
    };
  }, [debouncedCollectUsedVariables]);

  return {
    variables,
    setVariables,
    usedVariables,
    setUsedVariables,
    collectUsedVariables,
    debouncedCollectUsedVariables,
    convertToVariableData,
    handleVariableClick,
    handleEditorContentChange
  };
};
