import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Select, Spin, Tooltip, Tag, message } from 'antd';
import { SelectProps } from 'antd/es/select';
import { VariableType, variableService } from '../../services/variableService';
import VariableEventService from '../../services/VariableEventService';
import VariableTag from '../workTask/VariableTag';
import useVariableData, { VariableCommonData } from '../../hooks/useVariableData';

// 扩展统一的变量数据接口，添加直接获取的功能

// 变量选择器接口定义
export interface VariableSelectorProps extends Omit<SelectProps<string>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  excludeSourceName?: string; // 排除指定来源的变量，例如当前任务
  filterTypes?: VariableType[]; // 只显示特定类型的变量
  currentTaskName?: string; // 当前任务名称，用于排除当前任务的变量
}

/**
 * 变量选择器组件
 * 专用于选择单个变量，自动添加@前缀，并以标签形式显示
 */
const VariableSelector: React.FC<VariableSelectorProps> = ({
  value,
  onChange,
  placeholder = '选择变量',
  disabled = false,
  excludeSourceName,
  filterTypes,
  currentTaskName,
  ...restProps
}) => {
  // 使用统一的变量数据钩子获取缓存变量
  const { variables: cachedVariables, loading: cacheLoading, error } = useVariableData({
    filterTypes,
    excludeSourceName,
    currentTaskName
  });
  
  // 添加状态跟踪直接获取的变量
  const [directVariables, setDirectVariables] = useState<VariableCommonData[]>([]);
  const [directLoading, setDirectLoading] = useState(false);
  const [useDirectData, setUseDirectData] = useState(true); // 默认使用直接数据
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [searchText, setSearchText] = useState<string>('');
  
  // 引用保存上次打开下拉框的时间
  const lastOpenTime = useRef(0);
  
  // 选择使用哪个数据源
  const variables = useDirectData ? directVariables : cachedVariables;
  const loading = cacheLoading || directLoading;
  
  // 直接从API获取变量数据
  const fetchDirectFromAPI = useCallback(async (showMessage = false) => {
    // 防抖动：3秒内不重复获取
    const now = Date.now();
    if (now - lastRefreshTime < 3000) {
      console.log('[VariableSelector] 刷新太频繁，跳过');
      return;
    }
    
    setDirectLoading(true);
    setLastRefreshTime(now);
    
    try {
      console.log('[VariableSelector] 开始强制刷新变量数据');
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
      
      if (responseData.length === 0) {
        if (showMessage) {
          message.warning('API返回的变量数据为空');
        }
        return;
      }
      
      // 转换为VariableCommonData格式
      const processedVars = responseData.map((apiVar: any) => {
        const id = apiVar.id || apiVar._id;
        const sourceType = apiVar.sourceType || apiVar.source?.type || apiVar.type || 'unknown';
        
        let field = apiVar.field;
        if (!field || typeof field !== 'string') {
          field = sourceType === 'task' ? 'output' : 'name';
        }
        
        let sourceName;
        if (sourceType === 'custom') {
          sourceName = apiVar.name || '自定义变量';
        } else {
          sourceName = apiVar.sourceName || apiVar.source?.name || 'Unknown';
        }
        
        // 确定正确的变量类型
        let type: VariableType;
        const typeStr = String(sourceType).toLowerCase();
        if (typeStr.includes('npc')) {
          type = VariableType.NPC;
        } else if (typeStr.includes('task')) {
          type = VariableType.TASK;
        } else if (typeStr.includes('custom')) {
          type = VariableType.CUSTOM;
        } else if (typeStr.includes('file')) {
          type = VariableType.FILE;
        } else if (typeStr.includes('workflow')) {
          type = VariableType.WORKFLOW;
        } else {
          type = VariableType.CUSTOM;
        }
        
        // 构建变量对象
        return {
          id,
          field,
          name: apiVar.name || '',
          sourceName,
          sourceType,
          type,
          value: apiVar.value || '',
          displayIdentifier: apiVar.displayIdentifier || '',
          identifier: apiVar.identifier || `gv_${id}_${field}`,
          updatedAt: apiVar.updatedAt,
          source: apiVar.source || { id, name: sourceName, type: sourceType }
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
      
      // 根据过滤条件筛选变量
      let filteredVars = uniqueVariables;
      
      // 按类型过滤
      if (filterTypes && filterTypes.length > 0) {
        filteredVars = filteredVars.filter(v => 
          filterTypes.includes(v.type as VariableType) || 
          filterTypes.includes(v.sourceType as any)
        );
      }
      
      // 排除指定来源
      if (excludeSourceName) {
        filteredVars = filteredVars.filter(v => 
          v.sourceName !== excludeSourceName
        );
      }
      
      // 排除当前任务
      if (currentTaskName) {
        filteredVars = filteredVars.filter(v => 
          v.sourceName !== currentTaskName
        );
      }
      
      // 更新状态
      setDirectVariables(filteredVars);
      setUseDirectData(true);
      
      if (showMessage) {
        message.success('已获取最新变量数据');
      }
      
      console.log(`[VariableSelector] 获取到 ${filteredVars.length} 个变量`);
    } catch (error) {
      console.error('获取变量失败:', error);
      if (showMessage) {
        message.error('获取变量数据失败');
      }
    } finally {
      setDirectLoading(false);
    }
  }, [excludeSourceName, filterTypes, currentTaskName, lastRefreshTime]);
  
  // 组件挂载时自动获取一次数据
  useEffect(() => {
    console.log('[VariableSelector] 组件挂载，自动获取变量数据');
    fetchDirectFromAPI(false);
    
    // 订阅变量事件，当有变量变更时自动刷新
    const unsubscribe = VariableEventService.subscribe(() => {
      console.log('[VariableSelector] 收到变量变更通知，自动刷新数据');
      fetchDirectFromAPI(false);
    });
    
    // 组件卸载时取消订阅
    return () => {
      unsubscribe();
    };
  }, [fetchDirectFromAPI]);

  // 根据搜索文本过滤变量
  const filteredVariables = variables.filter(v => {
    // 根据搜索文本过滤
    if (searchText) {
      return (
        v.identifier.toLowerCase().includes(searchText.toLowerCase()) ||
        v.sourceName.toLowerCase().includes(searchText.toLowerCase()) ||
        (v.name && v.name.toLowerCase().includes(searchText.toLowerCase()))
      );
    }
    
    return true;
  });

  // 处理选择变更
  const handleChange = (selectedIdentifier: string) => {
    if (onChange) {
      onChange(selectedIdentifier);
    }
  };


  // 格式化变量类型标签
  const formatTypeLabel = (type: string): string => {
    switch (type) {
      case 'npc':
        return 'NPC';
      case 'task':
        return '任务';
      case 'workflow':
        return '工作流';
      case 'custom':
        return '自定义';
      case 'file':
        return '文件';
      default:
        return type;
    }
  };

  // 渲染下拉菜单选项
  const renderOption = (variable: VariableCommonData) => {
    // 处理标识符，确保格式一致
    const identifier = variable.identifier.startsWith('@') 
      ? variable.identifier.substring(1) 
      : variable.identifier;
    
    // 构建显示标识符
    const displayIdentifier = variable.displayIdentifier || 
      `@${variable.sourceName}.${variable.name}#${variable.id.substring(0, 4)}`;
    
    return (
      <Select.Option 
        key={variable.identifier} 
        value={variable.identifier} 
        data-value={variable.identifier}
        data-display-id={variable.displayIdentifier}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div>
            {/* 使用VariableTag组件渲染变量标签 */}
            <VariableTag
              identifier={identifier}
              displayIdentifier={displayIdentifier}
              type={variable.type as VariableType}
              value={variable.value}
              readOnly={true}
            />
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: '12px',
            paddingTop: '4px'
          }}>
            <span style={{ color: '#666' }}>{variable.value || '无值'}</span>
          </div>
        </div>
      </Select.Option>
    );
  };

  // 渲染选中的标签
  const tagRender = (props: any) => {
    const { value: tagValue, closable, onClose } = props;
    // 如果值不符合预期格式，使用原始Tag组件
    if (!tagValue || typeof tagValue !== 'string' || !tagValue.startsWith('@')) {
      return (
        <Tag closable={closable} onClose={onClose}>
          {tagValue}
        </Tag>
      );
    }
    
    // 查找变量的显示标识符
    const identifier = tagValue.substring(1); // 移除@前缀
    const variable = variables.find(v => v.identifier === identifier || `@${v.identifier}` === tagValue);
    const displayIdentifier = variable?.displayIdentifier;
    
    // 使用自定义VariableTag组件
    return (
      <VariableTag
        identifier={identifier}
        displayIdentifier={displayIdentifier}
        readOnly={!closable}
        onDelete={closable ? onClose : undefined}
        type={variable?.type as VariableType}
        value={variable?.value}
      />
    );
  };

  // 下拉框打开时自动刷新并聚焦搜索框
  const handleDropdownVisibleChange = (open: boolean) => {
    if (open) {
      // 重置搜索文本
      setSearchText('');
      
      // 检查是否需要刷新
      const now = Date.now();
      if (now - lastOpenTime.current > 10000) { // 如果上次打开超过10秒，则刷新
        console.log('[VariableSelector] 下拉框打开，刷新变量数据');
        fetchDirectFromAPI(false);
      }
      lastOpenTime.current = now;
    }
  };

  // 处理搜索过滤
  const handleSearch = (text: string) => {
    // 如果搜索文本以@开头或@gv_开头，移除它进行搜索
    if (text.startsWith('@gv_')) {
      setSearchText(text.substring(4));
    } else if (text.startsWith('@')) {
      setSearchText(text.substring(1));
    } else {
      setSearchText(text);
    }
  };

  // 为选项添加正确的标签和值，确保键唯一
  const prepareVariableOptions = (variables: VariableCommonData[]): any[] => {
    return variables.map(variable => ({
      ...variable,
      // 保持原始标识符
      value: variable.identifier,
      // 创建一个适合显示的标签
      label: variable.name || variable.identifier,
      // 使用id和field组合作为唯一键
      key: `${variable.id}_${variable.name}_${Math.random().toString(36).substring(2, 7)}`
    }));
  };

  // 为Select组件准备的选项数据 
  const options = prepareVariableOptions(filteredVariables);

  // 如果加载中，显示加载状态
  if (loading) {
    return <Spin size="small" />;
  }

  return (
    <Select
      showSearch
      value={value}
      placeholder={placeholder}
      style={{ width: '100%' }}
      onChange={handleChange}
      onSearch={handleSearch}
      onDropdownVisibleChange={handleDropdownVisibleChange}
      filterOption={false} // 使用自定义过滤
      tagRender={tagRender} // 自定义标签渲染
      optionLabelProp="label" // 使用label作为标签属性
      disabled={disabled}
      notFoundContent={loading ? <Spin size="small" /> : "没有找到变量"}
      {...restProps}
    >
      {options.map(option => renderOption(option))}
    </Select>
  );
};

export default VariableSelector;
