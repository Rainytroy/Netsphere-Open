import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Space, Button, Tooltip, Typography, message, Select, Input, Tag, Empty } from 'antd';
import { CopyOutlined, EditOutlined, DeleteOutlined, UserOutlined, ExperimentOutlined, FileOutlined, PartitionOutlined, SearchOutlined, FormOutlined, InfoCircleOutlined, ReloadOutlined, ClearOutlined, AppstoreOutlined } from '@ant-design/icons';
import { Variable, VariableType, timestampToUUID } from '../../services/variableService';
import VariableTag from '../common/VariableTag';
import DeleteConfirmModal from '../npc/DeleteConfirmModal';
import VariableThemeService from '../../services/VariableThemeService';
import VariableSchemaService from '../../services/VariableSchemaService';

interface VariableTableProps {
  variables: Variable[];
  loading?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onRefresh?: () => void; // 添加刷新回调
}

/**
 * 变量表格组件
 * 显示变量列表并提供过滤、编辑和删除功能
 */
const VariableTable: React.FC<VariableTableProps> = ({
  variables = [],
  loading = false,
  onEdit,
  onDelete,
  onRefresh
}) => {
  // 搜索和过滤
  const [searchText, setSearchText] = useState('');
  const [typeFilter, setTypeFilter] = useState<VariableType | 'all'>('all');
  const [internalLoading, setInternalLoading] = useState(false);
  const [localVariables, setLocalVariables] = useState<Variable[]>([]);
  
  // 状态追踪
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<Variable | null>(null);
  
  // 当外部变量列表变化时，更新本地副本和时间
  useEffect(() => {
    const now = new Date();
    setLastUpdateTime(now);
    
    // 使用Map来确保唯一性，以identifier为键
    const uniqueVars = new Map<string, Variable>();
    
    // 添加所有变量，仅保留最新的版本（如果有重复）
    variables.forEach(variable => {
      uniqueVars.set(variable.identifier, variable);
    });
    
    // 转换回数组
    const deduplicatedVars = Array.from(uniqueVars.values());
    
    // 更新本地变量列表
    setLocalVariables(deduplicatedVars);
    
    console.log(`[VariableTable] 收到 ${variables.length} 个变量，去重后剩余 ${deduplicatedVars.length} 个`);
  }, [variables]);
  
  // 获取字段的英文名称
  const getEnglishFieldName = useCallback((record: Variable): string | null => {
    // 自定义变量固定返回"value"
    if (record.type === VariableType.CUSTOM) {
      return 'value';
    }

    // 从标识符提取字段名
    const match = record.identifier.match(/_([^_]+)$/);
    if (match && match[1]) {
      return match[1];
    }

    return null;
  }, []);

  // 处理搜索文本变更
  const handleSearchChange = useCallback((value: string) => {
    setInternalLoading(true);
    // 延迟更新以模拟筛选过程，让用户感知到变化
    setTimeout(() => {
      setSearchText(value);
      setInternalLoading(false);
    }, 200);
  }, []);

  // 处理类型筛选变更
  const handleTypeFilterChange = useCallback((value: any) => {
    setInternalLoading(true);
    // 清空当前列表，并延迟更新类型过滤器值，以便用户感知到变化
    setTimeout(() => {
      // 确保重置空值为'all'而不是null
      if (value === undefined || value === null) {
        setTypeFilter('all');
      } else {
        setTypeFilter(value as VariableType | 'all');
      }
      setInternalLoading(false);
    }, 200);
  }, []);

  // 过滤变量列表 - 优化的搜索逻辑，与编辑器X一致
  const filteredVariables = useMemo(() => {
    return localVariables.filter(variable => {
      // 类型过滤
      if (typeFilter !== 'all' && variable.type !== typeFilter) {
        return false;
      }
      
      // 搜索文本过滤
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        
        // 预处理特殊字符，移除可能的前缀@
        const normalizedSearch = searchLower.startsWith('@') 
          ? searchLower.substring(1) 
          : searchLower;
        
        // 获取显示标识符
        let displayIdentifier = variable.displayIdentifier;
        if (!displayIdentifier && variable.type === VariableType.CUSTOM) {
          displayIdentifier = `@自定义.${variable.name}`;
        }
        
        // 获取字段名称
        const fieldName = getEnglishFieldName(variable);
        
        // 提取系统标识符的主要部分(不含@前缀)
        const systemIdWithoutPrefix = variable.identifier.startsWith('@')
          ? variable.identifier.substring(1)
          : variable.identifier;
        
        return (
          // 搜索系统标识符（含完整标识符和去除前缀后的标识符）
          variable.identifier.toLowerCase().includes(normalizedSearch) ||
          systemIdWithoutPrefix.toLowerCase().includes(normalizedSearch) ||
          
          // 搜索变量名称
          variable.name.toLowerCase().includes(normalizedSearch) ||
          
          // 搜索来源名称
          (variable.source?.name?.toLowerCase().includes(normalizedSearch)) ||
          
          // 搜索字段名称
          (fieldName && fieldName.toLowerCase().includes(normalizedSearch)) ||
          
          // 搜索显示标识符（支持完整标识符、不带前缀、仅ID部分）
          (displayIdentifier && displayIdentifier.toLowerCase().includes(normalizedSearch)) ||
          (displayIdentifier && displayIdentifier.toLowerCase().substring(1).includes(normalizedSearch)) ||
          (displayIdentifier && displayIdentifier.includes('#') && 
          displayIdentifier.toLowerCase().split('#')[1].includes(normalizedSearch))
        );
      }
      
      return true;
    });
  }, [localVariables, typeFilter, searchText, getEnglishFieldName]);

  // 显示删除确认对话框
  const showDeleteConfirm = (variable: Variable) => {
    setSelectedVariable(variable);
    setDeleteModalVisible(true);
  };

  // 处理删除确认
  const handleDeleteConfirm = () => {
    if (selectedVariable && onDelete) {
      onDelete(selectedVariable.id);
    }
    setDeleteModalVisible(false);
  };

  // 处理复制变量标识符 - 确保复制UUID格式的标识符
  const handleCopyIdentifier = async (identifier: string, record: Variable) => {
    try {
      // 检查是否是自定义变量，需要处理标识符
      let textToCopy = identifier;
      
      if (record.type === VariableType.CUSTOM) {
        const recordId = record.id;
        
        // 对于时间戳ID，转换为UUID格式
        if (/^\d{10,13}$/.test(recordId)) {
          try {
            const uuid = timestampToUUID(recordId);
            textToCopy = `@gv_${uuid}_value`;
            console.log(`[VariableTable] 复制时转换标识符: ${identifier} => ${textToCopy}`);
          } catch (error) {
            console.error(`[VariableTable] 复制时标识符转换失败: ${error}`);
          }
        } else if (recordId && recordId.includes('-')) {
          // 已经是UUID格式，确保字段为value
          textToCopy = `@gv_${recordId}_value`;
        }
      }
      
      await navigator.clipboard.writeText(textToCopy);
      message.success('已复制到剪贴板');
    } catch (error) {
      console.error('复制到剪贴板失败:', error);
      message.error('复制失败');
    }
  };

  // 处理重置筛选条件
  const handleResetFilters = () => {
    setInternalLoading(true);
    setTimeout(() => {
      setSearchText('');
      setTypeFilter('all');
      setInternalLoading(false);
    }, 200);
  };
  
  // 处理刷新数据
  const handleRefreshData = useCallback(() => {
    if (onRefresh) {
      setInternalLoading(true);
      // 清空搜索和筛选条件
      setSearchText('');
      setTypeFilter('all');
      
      // 调用外部刷新回调
      onRefresh();
      
      // 延迟关闭加载状态
      setTimeout(() => {
        setInternalLoading(false);
      }, 500);
    }
  }, [onRefresh]);

  // 变量类型图标配置 - 使用VariableThemeService确保样式一致
  const typeIcons = {
    [VariableType.NPC]: <UserOutlined style={{ color: VariableThemeService.getMainColor(VariableType.NPC) }} />,
    [VariableType.TASK]: <ExperimentOutlined style={{ color: VariableThemeService.getMainColor(VariableType.TASK) }} />,
    [VariableType.CUSTOM]: <EditOutlined style={{ color: VariableThemeService.getMainColor(VariableType.CUSTOM) }} />,
    [VariableType.FILE]: <FileOutlined style={{ color: VariableThemeService.getMainColor(VariableType.FILE) }} />,
    [VariableType.WORKFLOW]: <PartitionOutlined style={{ color: VariableThemeService.getMainColor(VariableType.WORKFLOW) }} />
  };

  // 表格列配置
  const columns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: VariableType) => {
        return <Tooltip title={VariableSchemaService.getTypeDisplayName(type)}>{typeIcons[type]}</Tooltip>;
      },
      width: 80
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      render: (source: any, record: Variable) => {
        // 为自定义变量显示变量名称作为来源
        if (record.type === VariableType.CUSTOM) {
          return record.name;
        }
        return source?.name || '-';
      },
      width: 120
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Variable) => {
        // 为自定义变量固定显示"值"
        if (record.type === VariableType.CUSTOM) {
          return (
            <span>
              值 <Typography.Text type="secondary" style={{ fontSize: '12px' }}>(value)</Typography.Text>
            </span>
          );
        }
        
        // 获取英文字段名
        const englishField = getEnglishFieldName(record);
        
        return (
          <span>
            {name} {englishField && <Typography.Text type="secondary" style={{ fontSize: '12px' }}>({englishField})</Typography.Text>}
          </span>
        );
      },
      width: 150
    },
    {
      title: '系统标识符',
      dataIndex: 'identifier',
      key: 'identifier',
      render: (identifier: string, record: Variable) => {
        // 根据ID生成正确的系统标识符
        let displayId = identifier;
        
        // 检查是否是自定义变量
        if (record.type === VariableType.CUSTOM) {
          // 获取记录中的ID
          const recordId = record.id;
          
          // 检查是否为时间戳格式的ID（自定义变量）
          if (/^\d{10,13}$/.test(recordId)) {
            try {
              // 将时间戳转换为UUID
              const uuid = timestampToUUID(recordId);
              // 生成UUID格式的系统标识符
              displayId = `@gv_${uuid}_value`;
              console.log(`[VariableTable] 将系统标识符从 ${identifier} 转换为 ${displayId}`);
            } catch (error) {
              console.error(`[VariableTable] 标识符转换失败: ${error}`);
            }
          } else if (recordId && recordId.includes('-')) {
            // 已经是UUID格式，确保字段为value
            displayId = `@gv_${recordId}_value`;
          }
        }
        
        return (
          <Typography.Text ellipsis style={{ maxWidth: '100%' }}>
            {displayId}
          </Typography.Text>
        );
      },
      width: 320,
      ellipsis: true
    },
    {
      title: '显示标识符',
      dataIndex: 'displayIdentifier',
      key: 'displayIdentifier',
      render: (displayId: string, record: Variable) => {
        // 为自定义变量生成默认显示标识符
        let displayIdentifier = displayId;
        if (!displayIdentifier && record.type === VariableType.CUSTOM) {
          displayIdentifier = `@自定义.${record.name}`;
        }
        
        return (
          <VariableTag
            identifier={record.identifier}
            displayIdentifier={displayIdentifier}
            type={record.type}
            value={record.value}
            readOnly={true}
          />
        );
      },
      width: 180
    },
    {
      title: '值',
      dataIndex: 'value',
      key: 'value',
      ellipsis: true,
      render: (value: string) => (
        <Tooltip title={value}>
          <Typography.Text ellipsis style={{ maxWidth: 300 }}>
            {value || '(空)'}
          </Typography.Text>
        </Tooltip>
      )
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Variable) => (
        <Space size="middle">
          <Tooltip title="复制系统标识符">
            <Button 
              type="text" 
              icon={<CopyOutlined />} 
              onClick={() => handleCopyIdentifier(record.identifier, record)} 
            />
          </Tooltip>
          
          {record.type === VariableType.CUSTOM && onEdit && (
            <Tooltip title="编辑">
              <Button 
                type="text" 
                icon={<EditOutlined />} 
                onClick={() => onEdit(record.id)} 
              />
            </Tooltip>
          )}
          
          {record.type === VariableType.CUSTOM && onDelete && (
            <Tooltip title="删除">
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />} 
                onClick={() => showDeleteConfirm(record)} 
              />
            </Tooltip>
          )}
        </Space>
      ),
      width: 180
    }
  ];

  // 复合加载状态：组件外部loading或组件内部处理引起的loading
  const isLoading = loading || internalLoading;

  return (
    <div>
      {/* 工具栏区域 */}
      <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Input.Search
              placeholder="搜索变量（支持名称、来源、字段、标识符）"
              allowClear
              onSearch={handleSearchChange}
              style={{ width: 280 }}
              disabled={isLoading}
              loading={isLoading}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
            <Select
              placeholder="筛选类型"
              allowClear
              value={typeFilter}
              onChange={handleTypeFilterChange}
              style={{ width: 150 }}
              disabled={isLoading}
              loading={isLoading}
            >
              <Select.Option value="all">全部</Select.Option>
              <Select.Option value={VariableType.NPC}>NPC</Select.Option>
              <Select.Option value={VariableType.TASK}>工作任务</Select.Option>
              <Select.Option value={VariableType.CUSTOM}>自定义</Select.Option>
              <Select.Option value={VariableType.FILE}>文件</Select.Option>
              <Select.Option value={VariableType.WORKFLOW}>工作流</Select.Option>
            </Select>
            <Tooltip title="重置筛选条件">
              <Button 
                type="default"
                icon={<ClearOutlined />} 
                onClick={handleResetFilters}
                disabled={isLoading}
              />
            </Tooltip>
            {onRefresh && (
              <Tooltip title="刷新变量数据">
                <Button 
                  type="default"
                  icon={<ReloadOutlined spin={isLoading} />}
                  onClick={handleRefreshData}
                  disabled={isLoading}
                />
              </Tooltip>
            )}
          </Space>
          
          <Space>
            <Tooltip title={`最后更新: ${lastUpdateTime.toLocaleString()}`}>
              <Tag color="#f0f0f0" style={{ color: '#666' }} icon={<InfoCircleOutlined />}>
                共 {filteredVariables.length} 个变量，更新时间: {lastUpdateTime.toLocaleTimeString()}
              </Tag>
            </Tooltip>
            <Tooltip title="变量调试工具">
              <Button 
                type="default"
                icon={<SearchOutlined />}
                onClick={() => window.location.href = '/variable/debug'}
              />
            </Tooltip>
            <Tooltip title="变量编辑器X">
              <Button 
                type="default"
                icon={<FormOutlined />}
                onClick={() => window.location.href = '/demo/variable-editor-x'}
              />
            </Tooltip>
            <Tooltip title="变量编辑器封装">
              <Button 
                type="default"
                icon={<AppstoreOutlined />}
                onClick={() => window.location.href = '/demo/variable-editor-wrapper'}
              />
            </Tooltip>
          </Space>
        </Space>
      </Space>
      
      {/* 表格区域 */}
      <Table
        columns={columns}
        dataSource={filteredVariables}
        rowKey="identifier" // 使用identifier作为唯一键，更加可靠
        loading={isLoading}
        pagination={{ 
          pageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          showTotal: (total) => `共 ${total} 条数据`
        }}
        locale={{
          emptyText: searchText || typeFilter !== 'all' ? 
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="没有找到匹配的变量，请尝试调整筛选条件"
            /> : 
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无数据"
            />
        }}
      />
      
      {/* 删除确认对话框 */}
      {selectedVariable && (
        <DeleteConfirmModal
          visible={deleteModalVisible}
          onCancel={() => setDeleteModalVisible(false)}
          onConfirm={handleDeleteConfirm}
          title="确认删除"
          content={`确定要删除变量 "${selectedVariable.name}" 吗？`}
        />
      )}
    </div>
  );
};

export default VariableTable;
