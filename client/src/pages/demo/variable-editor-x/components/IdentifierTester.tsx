import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input, Card, Typography, Divider, Empty, Descriptions, Tag, Button, Tooltip, Space } from 'antd';
import { SearchOutlined, InfoCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { variableService } from '../../../../services/variableService';
import VariableEventService from '../../../../services/VariableEventService';
import useVariableData, { VariableCommonData } from '../../../../hooks/useVariableData';
import VariableThemeService from '../../../../services/VariableThemeService';
import IdentifierFormatterService from '../../../../services/IdentifierFormatterService';
import VariableSchemaService from '../../../../services/VariableSchemaService';

const { Text, Paragraph, Title } = Typography;

/**
 * 系统标识符测试工具组件 - 增强版
 * 让用户输入系统标识符，然后显示对应的显示标识符、解析后的值和变量信息
 * 直接从API获取最新数据，确保始终显示变量的当前状态
 */
const IdentifierTester: React.FC = () => {
  // 状态管理
  const [identifier, setIdentifier] = useState<string>('');
  const [normalizedIdentifier, setNormalizedIdentifier] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // 添加直接API获取数据相关状态
  const [directVariables, setDirectVariables] = useState<VariableCommonData[]>([]);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number>(0);
  
  // 引用保存上次API调用时间，防抖动控制
  const lastApiCallTime = useRef<number>(0);
  
  // 标识符解析结果
  const [variable, setVariable] = useState<any>(null);
  
  // 提取变量处理逻辑为纯函数，避免在React Hook规则之外调用Hooks
  const processApiResponse = (response: any): any[] => {
    // 处理响应数据，提取有效数组
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
    return responseData;
  };
  
  // 将API数据转换为标准变量格式的纯函数 - 整合VariableSchemaService逻辑
  const convertToVariableFormat = (apiItem: any): VariableCommonData => {
    // 提取并规范化基础数据
    const rawId = apiItem.id || apiItem._id;
    const rawType = apiItem.sourceType || apiItem.source?.type || apiItem.type || 'unknown';
    const rawField = apiItem.field || (rawType === 'task' ? 'output' : 'name');
    const sourceName = rawType === 'custom' 
      ? (apiItem.name || '自定义变量') 
      : (apiItem.sourceName || apiItem.source?.name || 'Unknown');
    
    // 使用服务进行规范化处理
    const cleanId = cleanVariableId(rawId);
    const normalizedType = VariableSchemaService.normalizeSourceType(rawType, rawField);
    const normalizedField = VariableSchemaService.normalizeFieldName(rawField, normalizedType);
    
    // 详细日志用于调试
    console.log(`[IdentifierTester] 变量处理: ID=${cleanId}, 类型=${normalizedType}, 字段=${normalizedField}, 原始字段=${rawField}`);
    
    // 使用服务生成标准化标识符
    const displayIdentifier = apiItem.displayIdentifier || 
      IdentifierFormatterService.formatDisplayIdentifier(sourceName, normalizedField, cleanId);
    
    // 生成系统标识符
    const identifier = `@gv_${cleanId}_${normalizedField}`;
    
    return {
      id: cleanId,
      field: normalizedField,
      name: apiItem.name || '',
      sourceName,
      sourceType: normalizedType,
      type: normalizedType,
      value: apiItem.value || '',
      displayIdentifier,
      identifier,
      updatedAt: apiItem.updatedAt || new Date().toISOString(),
      source: {
        id: apiItem.source?.id || cleanId,
        name: sourceName,
        type: normalizedType
      }
    } as VariableCommonData;
  };
  
  /**
   * 清理变量ID，移除可能的类型前缀和字段后缀
   * @param id 原始ID，可能含有前缀或后缀
   * @returns 清理后的纯UUID
   */
  const cleanVariableId = (id: string): string => {
    if (!id) return '';
    
    // 移除类型前缀 (如 npc_, task_, workflow_)
    let cleanedId = id;
    const typePrefixes = ['npc_', 'task_', 'workflow_', 'custom_', 'file_', 'system_'];
    typePrefixes.forEach(prefix => {
      if (cleanedId.startsWith(prefix)) {
        cleanedId = cleanedId.substring(prefix.length);
      }
    });
    
    // 如果ID包含下划线且后面跟着字段名，则也需要移除
    const lastUnderscoreIndex = cleanedId.lastIndexOf('_');
    if (lastUnderscoreIndex > 0 && lastUnderscoreIndex < cleanedId.length - 1) {
      const potentialFieldName = cleanedId.substring(lastUnderscoreIndex + 1);
      // 检查是否是常见字段名（如果是则移除）
      const commonFields = ['name', 'input', 'output', 'status', 'description', 'knowledge', 'act', 'actlv', 'value'];
      if (commonFields.includes(potentialFieldName) || 
          commonFields.some(field => potentialFieldName.endsWith(`_${field}`)) ||
          potentialFieldName.startsWith('node_')) {
        cleanedId = cleanedId.substring(0, lastUnderscoreIndex);
      }
    }
    
    return cleanedId;
  };
  
  // 去重变量数组的纯函数
  const deduplicateVariables = (variables: VariableCommonData[]): VariableCommonData[] => {
    const uniqueMap = new Map<string, VariableCommonData>();
    
    variables.forEach(v => {
      const key = `${v.id}_${v.field}`;
      
      // 如果这个键还不存在，或者当前变量比已存在的更新，则替换
      if (!uniqueMap.has(key) || 
          (v.updatedAt && uniqueMap.get(key)?.updatedAt &&
            new Date(v.updatedAt) > new Date(uniqueMap.get(key)!.updatedAt!))) {
        uniqueMap.set(key, v);
      }
    });
    
    return Array.from(uniqueMap.values());
  };
  
  // 直接从API获取全部变量数据 - 不使用钩子
  const fetchDirectFromAPI = useCallback(async () => {
    // 防抖动：1秒内不重复调用API
    const now = Date.now();
    if (now - lastApiCallTime.current < 1000) {
      console.log('[IdentifierTester] 防抖动：跳过此次API调用');
      return;
    }
    
    lastApiCallTime.current = now;
    setRefreshing(true);
    setLastRefreshTime(now);
    
    try {
      console.log('[IdentifierTester] 开始直接从API获取最新变量数据');
      const response = await variableService.getVariables();
      
      // 处理API响应 - 添加详细日志
      const responseData = processApiResponse(response);
      console.log(`[IdentifierTester] API返回 ${responseData.length} 条原始数据`);
      
      // 检查特定ID是否存在
      const targetId = '4b788411-c1cb-4082-9645-9848629570a7';
      const hasTargetId = responseData.some(item => {
        const itemId = item.id || item._id;
        return itemId === targetId || itemId.includes(targetId);
      });
      
      if (hasTargetId) {
        console.log(`[IdentifierTester] 找到目标ID: ${targetId}`);
      } else {
        console.log(`[IdentifierTester] API返回中未找到目标ID: ${targetId}`);
      }
      
      // 转换为标准变量格式
      let processedVariables: VariableCommonData[] = [];
      
      if (responseData.length > 0) {
        try {
          // 将每个API返回项转换为标准格式
          const mappedVariables = responseData.map(convertToVariableFormat);
          
          // 去重处理
          processedVariables = deduplicateVariables(mappedVariables);
          
          console.log(`[IdentifierTester] 获取并处理了 ${processedVariables.length} 个变量`);
        } catch (error) {
          console.error('[IdentifierTester] 处理变量数据出错:', error);
        }
      } else {
        console.warn('[IdentifierTester] API返回的变量数据为空');
      }
      
      // 更新状态
      setDirectVariables(processedVariables);
      
      // 如果当前有正在查看的标识符，立即更新其内容
      if (normalizedIdentifier) {
        handleSearch(processedVariables);
      }
      
    } catch (error) {
      console.error('[IdentifierTester] 获取变量失败:', error);
      setError('从API获取变量数据失败，请稍后重试');
    } finally {
      setRefreshing(false);
    }
  }, [normalizedIdentifier]);
  
  // 组件挂载时获取数据
  useEffect(() => {
    console.log('[IdentifierTester] 组件挂载，初始化获取变量数据');
    fetchDirectFromAPI();
    
    // 订阅变量变更事件
    const unsubscribe = VariableEventService.subscribe(() => {
      console.log('[IdentifierTester] 收到变量变更通知，强制刷新数据');
      fetchDirectFromAPI();
    });
    
    // 组件卸载时取消订阅
    return () => {
      console.log('[IdentifierTester] 取消订阅变量变更事件');
      unsubscribe();
    };
  }, [fetchDirectFromAPI]);
  
  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setIdentifier(value);
    
    // 预处理标识符 - 移除可能的@前缀
    const processedIdentifier = value.startsWith('@') ? value.substring(1) : value;
    setNormalizedIdentifier(processedIdentifier);
    
    // 重置错误和结果
    setError(null);
    setVariable(null);
  };
  
  // 查找变量 - 从直接获取的最新数据中查找 - 增强版
  const findVariableByIdentifier = (identifier: string, variables: VariableCommonData[]): VariableCommonData | null => {
    // 处理可能的@前缀
    const normalizedId = identifier.startsWith('@') ? identifier.substring(1) : identifier;
    
    // 尝试直接匹配
    let found = variables.find(v => 
      v.identifier === normalizedId || v.identifier === identifier
    );
    
    if (found) {
      console.log(`[IdentifierTester] 通过完整标识符找到变量: ${found.identifier}`);
      return found;
    }
    
    // 尝试解析标识符
    if (normalizedId.includes('_')) {
      // 解析gv_id_field格式
      const parts = normalizedId.split('_');
      if (parts.length >= 3 && parts[0] === 'gv') {
        const idPart = parts[1];
        const fieldPart = parts[2];
        
        // 使用更灵活的ID匹配 - 部分匹配
        found = variables.find(v => 
          (v.id === idPart || v.id.includes(idPart) || idPart.includes(v.id)) && 
          v.field === fieldPart
        );
        
        if (found) {
          console.log(`[IdentifierTester] 通过ID部分匹配找到变量: ${found.identifier}, 原查询ID: ${idPart}`);
          return found;
        }
        
        // 尝试使用规范化字段
        const normalizedField = VariableSchemaService.normalizeFieldName(fieldPart, 'task');
        found = variables.find(v => 
          (v.id === idPart || v.id.includes(idPart) || idPart.includes(v.id)) && 
          v.field === normalizedField
        );
        
        if (found) {
          console.log(`[IdentifierTester] 通过规范化字段找到变量: ${found.identifier}, 规范化: ${fieldPart} => ${normalizedField}`);
          return found;
        }
      }
    }
    
    // 尝试使用parsed内容进行更灵活的匹配
    const parsed = IdentifierFormatterService.parseIdentifier(identifier);
    if (parsed) {
      // 尝试只匹配ID的一部分（可能是因为前缀或后缀问题）
      found = variables.find(v => 
        v.id.includes(parsed.id) || parsed.id.includes(v.id)
      );
      
      if (found) {
        console.log(`[IdentifierTester] 通过ID子串匹配找到变量: ${found.identifier}`);
        return found;
      }
    }
    
    console.log(`[IdentifierTester] 未找到匹配变量: ${identifier}`);
    return null;
  };
  
  // 处理搜索按钮点击或回车 - 优先从直接API获取的数据中查找
  const handleSearch = (customVariables?: VariableCommonData[]) => {
    if (!normalizedIdentifier) {
      setError('请输入系统标识符');
      return;
    }
    
    try {
      // 基础格式校验 - 允许带或不带@前缀
      const checkId = normalizedIdentifier.startsWith('@') ? normalizedIdentifier.substring(1) : normalizedIdentifier;
      
      if (!checkId.startsWith('gv_')) {
        setError('无效的系统标识符格式，应以"@gv_"或"gv_"开头');
        return;
      }
      
      // 尝试解析标识符
      const parsed = IdentifierFormatterService.parseIdentifier(normalizedIdentifier);
      if (!parsed) {
        setError('无法解析系统标识符，请检查格式');
        return;
      }
      
      // 检测可能存在的格式问题并警告
      const standardFormat = `@gv_${parsed.id}_${parsed.field}`;
      const currentFormat = normalizedIdentifier.startsWith('@') ? normalizedIdentifier : `@${normalizedIdentifier}`;
      const hasFormatIssue = standardFormat !== currentFormat;
      
      // 查找匹配的变量 - 添加详细日志
      const variablesToSearch = customVariables || directVariables;
      console.log(`[IdentifierTester] 在 ${variablesToSearch.length} 个变量中搜索: ${normalizedIdentifier}`);
      
      // 记录所有变量的ID和字段方便调试
      if (variablesToSearch.length < 20) {  // 只在变量数量较少时打印详情
        variablesToSearch.forEach(v => {
          console.log(`[IdentifierTester] 可用变量: ID=${v.id}, 字段=${v.field}, 标识符=${v.identifier}`);
        });
      }
      
      // 首先尝试从最新API数据中查找
      const found = findVariableByIdentifier(normalizedIdentifier, variablesToSearch);
      
      if (found) {
        setVariable(found);
        if (hasFormatIssue) {
          setError(`警告：标识符格式不规范，标准格式应为 ${standardFormat}`);
        } else {
          setError(null);
        }
      } else {
        // 尝试使用标准格式再次查找
        const foundWithStandard = findVariableByIdentifier(standardFormat, variablesToSearch);
        if (foundWithStandard) {
          setVariable(foundWithStandard);
          setError(`警告：已找到变量，但标识符格式不规范，已自动转换为 ${standardFormat}`);
        } else {
          setError('未找到匹配的变量，请检查标识符是否正确');
        }
      }
    } catch (err) {
      console.error('解析标识符失败:', err);
      setError(`解析失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  };
  
  // 在输入更改时尝试搜索
  useEffect(() => {
    if (normalizedIdentifier) {
      handleSearch();
    } else {
      setVariable(null);
    }
  }, [normalizedIdentifier]);
  
  // 手动解析identifer
  const parsedIdentifier = normalizedIdentifier ? 
    IdentifierFormatterService.parseIdentifier(normalizedIdentifier) : null;
  
  // 获取变量类型样式
  const typeColors = variable ? VariableThemeService.getTypeColor(variable.sourceType) : null;
  
  // 格式化创建/更新时间
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '未知';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    
    try {
      return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(d);
    } catch (e) {
      return '日期格式错误';
    }
  };
  
  // 获取类型标签
  const getTypeTag = (type: string) => {
    const colors = VariableThemeService.getTypeColor(type);
    const tagName = type.toUpperCase();
    
    // 为不同类型添加不同的额外信息
    let description = '';
    switch (type.toLowerCase()) {
      case 'npc':
        description = ' - 角色/NPC';
        break;
      case 'task':
        description = ' - 工作任务';
        break;
      case 'workflow':
        description = ' - 工作流';
        break;
      case 'custom':
        description = ' - 自定义变量';
        break;
      case 'file':
        description = ' - 文件';
        break;
      default:
        description = '';
    }
    
    return (
      <Tag color={colors.borderColor}>
        {tagName}{description}
      </Tag>
    );
  };

  return (
    <Card 
      title="系统标识符测试工具" 
      style={{ marginBottom: 24 }}
      extra={
        <Space>
          {lastRefreshTime > 0 && (
            <Tooltip title={`上次刷新: ${formatDate(new Date(lastRefreshTime))}`}>
              <Tag color="green">
                {refreshing ? '正在刷新...' : '自动刷新已启用'}
              </Tag>
            </Tooltip>
          )}
          <Tooltip title="强制从API获取最新数据">
            <Button 
              type="text" 
              icon={<ReloadOutlined />} 
              loading={refreshing}
              onClick={fetchDirectFromAPI}
            />
          </Tooltip>
        </Space>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="输入系统标识符，例如：gv_123456_field 或 @gv_123456_field"
          value={identifier}
          onChange={handleInputChange}
          onPressEnter={() => handleSearch()}
          allowClear
          prefix={<SearchOutlined />}
          suffix={
            <InfoCircleOutlined
              title="输入系统标识符（以gv_开头）查看对应的显示形式和解析后的值"
            />
          }
          size="large"
          style={{ width: '100%' }}
        />
        {error && (
          <Text type="danger" style={{ display: 'block', marginTop: 8 }}>
            {error}
          </Text>
        )}
      </div>

      <Divider />
      
      <div style={{ marginBottom: 8 }}>
        <Text type="secondary">
          提示：标准格式为 <code>@gv_UUID_field</code>，例如：<code>@gv_4b788411-c1cb-4082-9645-9848629570a7_input</code>
        </Text>
      </div>

      {!variable && !error && (
        <Empty
          description="输入系统标识符后查看结果"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}

      {variable && (
        <div>
          <Title level={5}>显示标识符</Title>
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                ...VariableThemeService.getTagStyle(variable.sourceType),
                display: 'inline-block',
                marginRight: 8,
              }}
            >
              {variable.displayIdentifier}
            </div>
          </div>

          <Title level={5}>解析值</Title>
          <Paragraph
            style={{
              background: '#f6f6f6',
              padding: 16,
              borderRadius: 4,
              marginBottom: 16,
            }}
          >
            {variable.value !== undefined && variable.value !== null
              ? String(variable.value)
              : <Text type="secondary">无值</Text>}
          </Paragraph>

          <Title level={5}>变量信息</Title>
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item 
              label="类型" 
              labelStyle={{ width: '120px' }}
            >
              {getTypeTag(variable.sourceType)}
              <div style={{ 
                display: 'inline-block', 
                width: '20px', 
                height: '20px', 
                backgroundColor: typeColors?.bgColor,
                border: `1px solid ${typeColors?.borderColor}`,
                marginLeft: '8px',
                position: 'relative',
                top: '5px',
                borderRadius: '4px'
              }} />
              <div style={{ 
                display: 'inline-block', 
                fontSize: '12px',
                marginLeft: '8px',
                color: '#999',
              }}>
                背景色: {typeColors?.bgColor}, 边框色: {typeColors?.borderColor}, 文本色: {typeColors?.textColor}
              </div>
            </Descriptions.Item>
            
            <Descriptions.Item label="来源">
              {variable.sourceName || '无'}
            </Descriptions.Item>
            
            <Descriptions.Item label="字段">
              {variable.field}
            </Descriptions.Item>
            
            <Descriptions.Item label="规范颜色">
              <div style={{ 
                display: 'flex', 
                flexDirection: 'row',
                alignItems: 'center'
              }}>
                <div style={{ 
                  display: 'inline-block', 
                  width: '20px', 
                  height: '20px', 
                  backgroundColor: typeColors?.bgColor,
                  marginRight: '5px',
                  borderRadius: '2px'
                }} />
                <div style={{ 
                  display: 'inline-block', 
                  width: '20px', 
                  height: '20px', 
                  backgroundColor: typeColors?.textColor,
                  marginRight: '5px',
                  borderRadius: '2px'
                }} />
                <div style={{ 
                  display: 'inline-block', 
                  width: '20px', 
                  height: '20px', 
                  border: `1px solid ${typeColors?.borderColor}`,
                  marginRight: '5px',
                  borderRadius: '2px'
                }} />
              </div>
            </Descriptions.Item>
            
            <Descriptions.Item label="最后更新">
              {formatDate(variable.updatedAt || new Date())}
            </Descriptions.Item>
            
            <Descriptions.Item label="变量ID">
              {variable.id}
            </Descriptions.Item>
            
            <Descriptions.Item label="系统标识符">
              <Text style={{ 
                color: !variable.identifier.startsWith('@') ? '#ff4d4f' : 'inherit' 
              }}>
                {variable.identifier}
              </Text>
              {!variable.identifier.startsWith('@') && (
                <Tag color="error" style={{ marginLeft: 8 }}>格式错误</Tag>
              )}
            </Descriptions.Item>
            
            <Descriptions.Item label="显示标识符">
              {variable.displayIdentifier}
            </Descriptions.Item>
          </Descriptions>
        </div>
      )}
      
      {parsedIdentifier && !variable && (
        <div>
          <Title level={5}>标识符解析</Title>
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="ID">
              {parsedIdentifier.id}
            </Descriptions.Item>
            <Descriptions.Item label="字段">
              {parsedIdentifier.field}
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color="warning">未找到匹配变量</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="标准格式">
              <Text copyable>{`@gv_${parsedIdentifier.id}_${parsedIdentifier.field}`}</Text>
            </Descriptions.Item>
          </Descriptions>
          <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            系统可以解析此标识符，但未找到对应的变量数据
          </Text>
        </div>
      )}
      
    </Card>
  );
};

export default IdentifierTester;
