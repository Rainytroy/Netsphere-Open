import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Typography, Space, Tag, Tooltip } from 'antd';
import VariableSelector from './VariableSelector';
import { variableService } from '../../services/variableService';
import VariableEventService from '../../services/VariableEventService';
import useVariableData, { VariableCommonData } from '../../hooks/useVariableData';

const { Text } = Typography;

interface VariableSelectorModalProps {
  visible: boolean;
  onCancel: () => void;
  onSelect: (identifier: string, displayIdentifier?: string) => void;
  currentTaskName?: string;
}

/**
 * 变量选择模态窗口
 * 用于在编辑器中选择变量
 */
const VariableSelectorModal: React.FC<VariableSelectorModalProps> = ({
  visible,
  onCancel,
  onSelect,
  currentTaskName
}) => {
  const [selectedVariable, setSelectedVariable] = useState<string>('');

  // 选择变更处理
  const handleChange = (value: string) => {
    setSelectedVariable(value);
  };

  // 标记模态框是否已显示过
  const hasOpened = useRef(false);
  // 标记上次刷新时间
  const lastRefreshTime = useRef(0);
  
  // 添加状态跟踪直接获取的变量
  const [directVariables, setDirectVariables] = useState<VariableCommonData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // 使用变量数据钩子获取变量信息 - 提供基础缓存数据
  const { getVariableByIdentifier } = useVariableData();
  
  // 从最新API数据中查找变量
  const getVariableFromLatestData = (identifier: string): VariableCommonData | null => {
    // 处理可能带@前缀的情况
    const normalizedId = identifier.startsWith('@') ? identifier.substring(1) : identifier;
    
    // 优先从直接数据中查找
    const variable = directVariables.find(v => 
      v.identifier === normalizedId || v.identifier === identifier
    );
    
    if (variable) {
      console.log(`[VariableSelectorModal] 从最新数据中找到变量: ${identifier}`);
      return variable;
    }
    
    // 回退到缓存数据
    const cachedVariable = getVariableByIdentifier(identifier);
    if (cachedVariable) {
      console.log(`[VariableSelectorModal] 从缓存数据中找到变量: ${identifier}`);
    } else {
      console.warn(`[VariableSelectorModal] 未找到变量: ${identifier}`);
    }
    
    return cachedVariable;
  };
  
  // 直接从API获取最新变量数据
  const refreshVariables = async () => {
    // 防抖动：3秒内不重复获取
    const now = Date.now();
    if (now - lastRefreshTime.current < 3000) {
      console.log('[VariableSelectorModal] 刷新太频繁，跳过');
      return;
    }
    
    lastRefreshTime.current = now;
    setRefreshing(true);
    
    try {
      console.log('[VariableSelectorModal] 开始获取最新变量数据');
      const response = await variableService.getVariables();
      
      // 处理响应数据
      let responseData: any[] = [];
      if (response) {
        if (Array.isArray(response)) {
          responseData = response;
        } else if (response && typeof response === 'object' && 'data' in response) {
          const responseObj = response as any;
          if (Array.isArray(responseObj.data)) {
            responseData = responseObj.data;
          } else if (responseObj.data && typeof responseObj.data === 'object' && 'data' in responseObj.data) {
            const dataObj = responseObj.data as any;
            if (Array.isArray(dataObj.data)) {
              responseData = dataObj.data;
            }
          }
        }
      }
      
      // 转换为VariableCommonData格式
      const processedVars = responseData.map((apiVar: any) => {
        // 提取基本信息
        const id = apiVar.id || apiVar._id;
        const type = apiVar.type || apiVar.sourceType || apiVar.source?.type || 'unknown';
        
        // 提取字段和来源名称
        let field = apiVar.field;
        if (!field || typeof field !== 'string') {
          field = type === 'task' ? 'output' : 'name';
        }
        
        let sourceName;
        if (type === 'custom') {
          sourceName = apiVar.name || '自定义变量';
        } else {
          sourceName = apiVar.sourceName || apiVar.source?.name || 'Unknown';
        }
        
        // 创建变量对象
        return {
          id,
          field,
          name: apiVar.name || '',
          sourceName,
          sourceType: type,
          type,
          value: apiVar.value || '',
          displayIdentifier: apiVar.displayIdentifier || '',
          identifier: apiVar.identifier || `gv_${id}_${field}`,
          updatedAt: apiVar.updatedAt,
          source: apiVar.source || { id, name: sourceName, type }
        } as VariableCommonData;
      });
      
      // 去重处理
      const uniqueMap = new Map<string, VariableCommonData>();
      processedVars.forEach(variable => {
        const uniqueKey = `${variable.id}_${variable.field}`;
        
        if (!uniqueMap.has(uniqueKey) || 
            (variable.updatedAt && uniqueMap.get(uniqueKey)?.updatedAt && 
             new Date(variable.updatedAt) > new Date(uniqueMap.get(uniqueKey)!.updatedAt!))) {
          uniqueMap.set(uniqueKey, variable);
        }
      });
      
      // 使用去重后的数据
      const uniqueVariables = Array.from(uniqueMap.values());
      
      // 根据过滤条件筛选
      let filteredVars = uniqueVariables;
      
      // 排除当前任务
      if (currentTaskName) {
        filteredVars = filteredVars.filter(v => 
          v.sourceName !== currentTaskName
        );
      }
      
      setDirectVariables(filteredVars);
      console.log(`[VariableSelectorModal] 获取到 ${filteredVars.length} 个变量`);
    } catch (error) {
      console.error('变量选择器对话框获取变量失败:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // 确认选择
  const handleConfirm = () => {
    if (selectedVariable) {
      // 使用最新数据查找变量信息，获取准确的显示标识符
      const variable = getVariableFromLatestData(selectedVariable);
      const displayId = variable?.displayIdentifier;
      
      // 传递系统标识符和显示标识符（如果有）
      onSelect(selectedVariable, displayId || undefined);
      setSelectedVariable(''); // 重置选择
    }
    onCancel(); // 关闭对话框
  };

  // 对话框可见性变化时执行
  useEffect(() => {
    if (visible) {
      // 对话框打开时，刷新变量数据
      console.log('[VariableSelectorModal] 对话框打开，获取最新变量数据');
      refreshVariables();
      hasOpened.current = true;
    } else {
      // 对话框关闭时，清空选择
      setSelectedVariable('');
    }
  }, [visible]);
  
  // 订阅变量变更事件
  useEffect(() => {
    // 只在第一次显示后订阅
    if (!hasOpened.current) return;
    
    console.log('[VariableSelectorModal] 订阅变量变更事件');
    const unsubscribe = VariableEventService.subscribe(() => {
      console.log('[VariableSelectorModal] 收到变量变更通知，自动刷新');
      refreshVariables();
    });
    
    return () => {
      console.log('[VariableSelectorModal] 取消订阅变量事件');
      unsubscribe();
    };
  }, []);

  return (
    <Modal
      title="选择变量"
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button 
          key="confirm" 
          type="primary" 
          onClick={handleConfirm}
          disabled={!selectedVariable}
        >
          确认
        </Button>
      ]}
      width={500}
      maskClosable={false}
      destroyOnClose={true}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text>从下列变量中选择一个插入到编辑器中：</Text>
          <Tooltip title="自动加载最新变量数据">
            <Tag color="green">
              {refreshing ? '正在刷新...' : '自动刷新已启用'}
            </Tag>
          </Tooltip>
        </div>
        <VariableSelector
          onChange={handleChange}
          currentTaskName={currentTaskName}
          value={selectedVariable}
          placeholder="请选择变量"
          style={{ width: '100%' }}
        />
      </Space>
    </Modal>
  );
};

export default VariableSelectorModal;
