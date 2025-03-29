import * as React from 'react';
import { Card } from 'antd';
import { VariableView } from './VariableList';
import VariableList from './VariableList';
import createLogger from '../../utils/logger';
import { VariableType } from '../../services/variableService';

const logger = createLogger('AvailableVariablePanel');

interface AvailableVariablePanelProps {
  onVariableClick: (variable: VariableView) => void;
  inputEditorRef?: React.RefObject<any>; // 可选参数，保持接口兼容
  promptEditorRef?: React.RefObject<any>; // 可选参数，保持接口兼容
}

/**
 * 可用变量面板
 * 显示系统中所有可用的变量供用户选择
 */
const AvailableVariablePanel: React.ForwardRefRenderFunction<
  { refresh: () => void },
  AvailableVariablePanelProps
> = ({ onVariableClick, inputEditorRef, promptEditorRef }, ref) => {
  // 存储可用变量
  const [variables, setVariables] = React.useState<VariableView[]>([]);
  
  // 加载变量列表
  const loadVariables = React.useCallback(async () => {
    try {
      const { variableService } = await import('../../services/variableService');
      const variableResponse = await variableService.getVariables();
      
      // 将API返回的Variable转换为VariableView
      const variableData = Array.isArray(variableResponse.data) ? variableResponse.data : [];
      const variableViews = variableData.map((v: any) => ({
        id: v.id,
        name: v.name,
        identifier: v.identifier,
        displayIdentifier: v.displayIdentifier,
        type: v.type || VariableType.CUSTOM, // 确保有类型
        sourceId: v.source?.id || '',
        sourceName: v.source?.name || v.name,
        value: v.value || ''
      }));
      
      // 使用Map来确保唯一性，以identifier为键，保持与VariableTable相同的去重逻辑
      const uniqueVars = new Map<string, VariableView>();
      
      // 添加所有变量，仅保留最新的版本（如果有重复）
      variableViews.forEach(variable => {
        uniqueVars.set(variable.identifier, variable);
      });
      
      // 转换回数组
      const deduplicatedVars = Array.from(uniqueVars.values());
      
      setVariables(deduplicatedVars);
      logger.debug('加载变量列表成功:', { 
        count: variableViews.length, 
        uniqueCount: deduplicatedVars.length 
      });
    } catch (error) {
      logger.error('加载变量列表失败:', error);
    }
  }, []);
  
  // 组件挂载时初始化
  React.useEffect(() => {
    // 立即加载一次
    loadVariables();
    
    // 设置定期刷新
    const refreshTimer = setInterval(() => {
      loadVariables();
    }, 30000); // 每30秒刷新一次
    
    return () => {
      clearInterval(refreshTimer);
    };
  }, [loadVariables]);
  
  // 提供手动刷新方法，供父组件调用
  React.useImperativeHandle(ref, () => ({
    refresh: loadVariables
  }));
  
  return (
    <Card style={{ backgroundColor: '#F5F5F5' }}>
      <VariableList usedVariables={variables} />
    </Card>
  );
};

export default React.forwardRef(AvailableVariablePanel);
