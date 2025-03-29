import * as React from 'react';
import { Card } from 'antd';
import { VariableData } from '../../pages/demo/variable-editor-x/types';
import VariableList, { VariableView } from './VariableList';
import createLogger from '../../utils/logger';

const logger = createLogger('UsedVariablePanel');

interface UsedVariablePanelProps {
  inputEditorRef: React.RefObject<any>;
  promptEditorRef: React.RefObject<any>;
  onVariableClick: (variable: any) => void;
}

/**
 * 已使用变量面板
 * 显示当前编辑器中使用的变量列表
 * 在变量插入或编辑器打开时更新列表
 */
const UsedVariablePanel: React.FC<UsedVariablePanelProps> = ({
  inputEditorRef,
  promptEditorRef,
  onVariableClick
}) => {
  // 存储已使用的变量
  const [usedVariables, setUsedVariables] = React.useState<VariableView[]>([]);
  
  // 保存原始插入变量方法
  const originalMethods = React.useRef({
    inputInsertVariable: null as Function | null,
    promptInsertVariable: null as Function | null,
    inputFocusEditor: null as Function | null,
    promptFocusEditor: null as Function | null
  });
  
  // 引用最新的编辑器实例
  const latestRefs = React.useRef({
    inputEditor: null as any,
    promptEditor: null as any
  });
  
// 安全地获取编辑器变量的辅助函数
  const safeGetEditorVariables = React.useCallback((editor: any) => {
    if (!editor) return [];
    
    try {
      // 直接调用getUsedVariables方法
      if (typeof editor.getUsedVariables === 'function') {
        const vars = editor.getUsedVariables();
        logger.debug('直接从编辑器获取变量:', { count: vars.length });
        return vars || [];
      }
      
      // 记录警告，但不抛出错误
      logger.warn('编辑器未实现getUsedVariables方法:', { 
        editorType: editor.constructor?.name || typeof editor 
      });
      return [];
    } catch (error) {
      logger.error('获取编辑器变量异常:', error);
      return [];
    }
  }, []);
  
  // 收集变量函数 - 同时获取两个编辑器中使用的变量并更新列表
  const collectVariables = React.useCallback(() => {
    try {
      // 获取最新的编辑器实例
      const inputEditor = inputEditorRef.current || latestRefs.current.inputEditor;
      const promptEditor = promptEditorRef.current || latestRefs.current.promptEditor;
      
      logger.debug('开始收集变量:', { 
        inputEditorExists: !!inputEditor,
        promptEditorExists: !!promptEditor
      });
      
      // 尝试从两个编辑器获取变量
      const inputVars = safeGetEditorVariables(inputEditor);
      const promptVars = safeGetEditorVariables(promptEditor);
      
      // 合并并去重
      const uniqueVariables: VariableView[] = [];
      const idSet = new Set<string>();
      
      // 处理来自两个编辑器的变量，转换为VariableView类型
      [...inputVars, ...promptVars].forEach(variable => {
        if (!variable) return; // 跳过无效变量
        
        const identifier = variable.identifier || '';
        if (!identifier || idSet.has(identifier)) return;
        
        idSet.add(identifier);
        // 转换VariableData到VariableView
        uniqueVariables.push({
          id: variable.id,
          name: variable.field,
          identifier: identifier,
          displayIdentifier: variable.displayIdentifier,
          type: variable.sourceType,
          sourceId: variable.id,
          sourceName: variable.sourceName,
          value: variable.value || ''
        });
      });
      
      // 更新状态 - 完全替换列表，确保移除不再使用的变量
      setUsedVariables(uniqueVariables);
      
      logger.debug('变量列表已更新:', {
        count: uniqueVariables.length,
        sources: {
          input: inputVars.length,
          prompt: promptVars.length
        }
      });
    } catch (error) {
      logger.error('收集变量失败:', error);
    }
  }, [inputEditorRef, promptEditorRef, safeGetEditorVariables]);
  
  // 更新引用缓存
  React.useEffect(() => {
    if (inputEditorRef.current) {
      latestRefs.current.inputEditor = inputEditorRef.current;
    }
    if (promptEditorRef.current) {
      latestRefs.current.promptEditor = promptEditorRef.current;
    }
  }, [inputEditorRef.current, promptEditorRef.current]);
  
  // 组件挂载时劫持方法和初始化
  React.useEffect(() => {
    // 立即收集一次 - 但可能此时编辑器还未就绪
    collectVariables();
    
    // 延迟收集 - 确保编辑器初始化后再收集一次
    const initialTimerId = setTimeout(() => {
      logger.debug('执行延迟初始化变量收集');
      collectVariables();
    }, 800);
    
    // 处理输入编辑器
    if (inputEditorRef.current) {
      // 保存原始插入变量方法
      originalMethods.current.inputInsertVariable = inputEditorRef.current.insertVariable;
      
      // 劫持插入变量方法
      inputEditorRef.current.insertVariable = (variable: any) => {
        // 先调用原始方法插入变量
        if (originalMethods.current.inputInsertVariable) {
          originalMethods.current.inputInsertVariable(variable);
        }
        
        // 延迟执行收集
        setTimeout(collectVariables, 100);
      };
      
      // 保存原始聚焦方法
      originalMethods.current.inputFocusEditor = inputEditorRef.current.focusEditor;
      
      // 劫持聚焦方法 - 用户打开编辑时触发
      inputEditorRef.current.focusEditor = () => {
        // 先调用原始方法
        if (originalMethods.current.inputFocusEditor) {
          originalMethods.current.inputFocusEditor();
        }
        
        // 延迟执行收集
        setTimeout(collectVariables, 100);
      };
    }
    
    // 同样处理提示词编辑器
    if (promptEditorRef.current) {
      // 保存原始插入变量方法
      originalMethods.current.promptInsertVariable = promptEditorRef.current.insertVariable;
      
      // 劫持插入变量方法
      promptEditorRef.current.insertVariable = (variable: any) => {
        // 先调用原始方法插入变量
        if (originalMethods.current.promptInsertVariable) {
          originalMethods.current.promptInsertVariable(variable);
        }
        
        // 延迟执行收集
        setTimeout(collectVariables, 100);
      };
      
      // 保存原始聚焦方法
      originalMethods.current.promptFocusEditor = promptEditorRef.current.focusEditor;
      
      // 劫持聚焦方法 - 用户打开编辑时触发
      promptEditorRef.current.focusEditor = () => {
        // 先调用原始方法
        if (originalMethods.current.promptFocusEditor) {
          originalMethods.current.promptFocusEditor();
        }
        
        // 延迟执行收集
        setTimeout(collectVariables, 100);
      };
    }
    
    // 组件卸载时恢复原始方法
    return () => {
      // 恢复输入编辑器方法
      if (inputEditorRef.current) {
        if (originalMethods.current.inputInsertVariable) {
          inputEditorRef.current.insertVariable = originalMethods.current.inputInsertVariable;
        }
        if (originalMethods.current.inputFocusEditor) {
          inputEditorRef.current.focusEditor = originalMethods.current.inputFocusEditor;
        }
      }
      
      // 恢复提示词编辑器方法
      if (promptEditorRef.current) {
        if (originalMethods.current.promptInsertVariable) {
          promptEditorRef.current.insertVariable = originalMethods.current.promptInsertVariable;
        }
        if (originalMethods.current.promptFocusEditor) {
          promptEditorRef.current.focusEditor = originalMethods.current.promptFocusEditor;
        }
      }
    };
  }, [collectVariables]);
  
  // 编辑器引用变化时重新劫持方法
  React.useEffect(() => {
    // 初始化时可能编辑器引用尚未建立，等待引用变化时再次尝试劫持
    const timerId = setTimeout(() => {
      logger.debug('编辑器引用变化，重新劫持方法');
      // 检查是否有新的编辑器实例需要劫持
      const newInputEditorAvailable = 
        inputEditorRef.current && 
        inputEditorRef.current !== latestRefs.current.inputEditor;
        
      const newPromptEditorAvailable = 
        promptEditorRef.current && 
        promptEditorRef.current !== latestRefs.current.promptEditor;
        
      if (newInputEditorAvailable || newPromptEditorAvailable) {
        // 重新执行劫持逻辑
        // 先恢复原始方法，防止多次劫持
        if (latestRefs.current.inputEditor && originalMethods.current.inputInsertVariable) {
          try {
            latestRefs.current.inputEditor.insertVariable = originalMethods.current.inputInsertVariable;
          } catch (e) {
            // 忽略可能的错误
          }
        }
        
        if (latestRefs.current.promptEditor && originalMethods.current.promptInsertVariable) {
          try {
            latestRefs.current.promptEditor.insertVariable = originalMethods.current.promptInsertVariable;
          } catch (e) {
            // 忽略可能的错误
          }
        }
        
        // 更新引用
        if (newInputEditorAvailable) {
          latestRefs.current.inputEditor = inputEditorRef.current;
        }
        if (newPromptEditorAvailable) {
          latestRefs.current.promptEditor = promptEditorRef.current;
        }
        
        // 执行变量收集
        collectVariables();
        
        // 重新劫持方法 - 更加健壮的方式
        if (newInputEditorAvailable && inputEditorRef.current) {
          // 确保之前的方法已恢复 
          if (latestRefs.current.inputEditor && originalMethods.current.inputInsertVariable) {
            try {
              latestRefs.current.inputEditor.insertVariable = originalMethods.current.inputInsertVariable;
            } catch (e) {
              logger.warn('恢复原始insertVariable方法失败', e);
            }
          }
          
          // 劫持新的插入变量方法
          try {
            // 保存原始插入变量方法
            originalMethods.current.inputInsertVariable = inputEditorRef.current.insertVariable;
            
            // 劫持插入变量方法
            inputEditorRef.current.insertVariable = (variable: any) => {
              // 先调用原始方法插入变量
              if (originalMethods.current.inputInsertVariable) {
                originalMethods.current.inputInsertVariable(variable);
              }
              
              // 延迟执行收集
              setTimeout(() => {
                logger.debug('输入编辑器变量插入检测到，刷新变量列表');
                collectVariables();
              }, 100);
            };
          } catch (error) {
            logger.error('劫持输入编辑器insertVariable方法失败:', error);
          }
          
          // 尝试劫持聚焦方法
          try {
            // 保存原始聚焦方法
            originalMethods.current.inputFocusEditor = inputEditorRef.current.focusEditor;
            
            // 劫持聚焦方法
            inputEditorRef.current.focusEditor = () => {
              // 先调用原始方法
              if (originalMethods.current.inputFocusEditor) {
                originalMethods.current.inputFocusEditor();
              }
              
              // 延迟执行收集
              setTimeout(() => {
                logger.debug('输入编辑器获得焦点，刷新变量列表');
                collectVariables();
              }, 100);
            };
          } catch (error) {
            logger.error('劫持输入编辑器focusEditor方法失败:', error);
          }
        }
        
        if (newPromptEditorAvailable && promptEditorRef.current) {
          // 确保之前的方法已恢复
          if (latestRefs.current.promptEditor && originalMethods.current.promptInsertVariable) {
            try {
              latestRefs.current.promptEditor.insertVariable = originalMethods.current.promptInsertVariable;
            } catch (e) {
              logger.warn('恢复原始promptInsertVariable方法失败', e);
            }
          }
          
          // 劫持新的插入变量方法
          try {
            // 保存原始插入变量方法
            originalMethods.current.promptInsertVariable = promptEditorRef.current.insertVariable;
            
            // 劫持插入变量方法
            promptEditorRef.current.insertVariable = (variable: any) => {
              // 先调用原始方法插入变量
              if (originalMethods.current.promptInsertVariable) {
                originalMethods.current.promptInsertVariable(variable);
              }
              
              // 延迟执行收集
              setTimeout(() => {
                logger.debug('提示词编辑器变量插入检测到，刷新变量列表');
                collectVariables();
              }, 100);
            };
          } catch (error) {
            logger.error('劫持提示词编辑器insertVariable方法失败:', error);
          }
          
          // 尝试劫持聚焦方法
          try {
            // 保存原始聚焦方法
            originalMethods.current.promptFocusEditor = promptEditorRef.current.focusEditor;
            
            // 劫持聚焦方法
            promptEditorRef.current.focusEditor = () => {
              // 先调用原始方法
              if (originalMethods.current.promptFocusEditor) {
                originalMethods.current.promptFocusEditor();
              }
              
              // 延迟执行收集
              setTimeout(() => {
                logger.debug('提示词编辑器获得焦点，刷新变量列表');
                collectVariables();
              }, 100);
            };
          } catch (error) {
            logger.error('劫持提示词编辑器focusEditor方法失败:', error);
          }
        }
      }
    }, 500); // 延迟500ms，确保编辑器已完全加载
    
    // 增加定期检查，作为后备方案
    const periodicTimerId = setInterval(() => {
      collectVariables();
    }, 5000); // 每5秒钟检查一次，频率较低以避免性能问题
    
    return () => {
      clearTimeout(timerId);
      clearInterval(periodicTimerId); // 清理定期检查
    };
  }, [inputEditorRef.current, promptEditorRef.current, collectVariables]);
  
  // 提供公共方法，供父组件调用
  React.useImperativeHandle(
    { current: { refresh: collectVariables } },
    () => ({
      // 手动刷新方法
      refresh: collectVariables
    })
  );
  
  return (
    <Card style={{ backgroundColor: '#F5F5F5' }}>
      <VariableList onVariableClick={onVariableClick} usedVariables={usedVariables} />
    </Card>
  );
};

export default UsedVariablePanel;
