import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Space, Button, Tooltip, Typography, message, Select, Input, Tag, Empty } from 'antd';
import { CopyOutlined, EditOutlined, DeleteOutlined, UserOutlined, ExperimentOutlined, FileOutlined, PartitionOutlined, SearchOutlined, FormOutlined, InfoCircleOutlined, ReloadOutlined, ClearOutlined, AppstoreOutlined } from '@ant-design/icons';
import { Variable, VariableType } from '../../services/variableService';
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
 * 变量表格组件 (简化版)
 * 显示变量列表并提供过滤、编辑和删除功能
 * 
 * 列显示规则:
 * - 类型：显示变量type字段
 * - 来源：显示name字段
 * - 名称：显示fieldname字段
 * - 系统标识符：显示identifier字段
 * - 显示标识符：显示displayIdentifier字段，不存在则显示错误
 * - 值：显示value字段
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
    // 延迟更新类型过滤器值，以便用户感知到变化
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

  // 过滤变量列表 - 简化的搜索逻辑
  const filteredVariables = useMemo(() => {
    return localVariables.filter(variable => {
      // 类型过滤
      if (typeFilter !== 'all' && variable.type !== typeFilter) {
        return false;
      }
      
      // 搜索文本过滤
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        
        return (
          // 搜索name字段（来源）
          (variable.name && variable.name.toLowerCase().includes(searchLower)) ||
          
          // 搜索fieldname字段（名称）
          (variable.fieldname && variable.fieldname.toLowerCase().includes(searchLower)) ||
          
          // 搜索identifier字段（系统标识符）
          (variable.identifier && variable.identifier.toLowerCase().includes(searchLower)) ||
          
          // 搜索displayIdentifier字段（显示标识符）
          (variable.displayIdentifier && variable.displayIdentifier.toLowerCase().includes(searchLower)) ||
          
          // 搜索value字段（值）
          (variable.value && variable.value.toLowerCase().includes(searchLower))
        );
      }
      
      return true;
    });
  }, [localVariables, typeFilter, searchText]);

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

  // 处理复制变量标识符
  const handleCopyIdentifier = async (identifier: string) => {
    try {
      await navigator.clipboard.writeText(identifier);
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

  // 表格列配置 - 简化版本
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
      dataIndex: 'name',
      key: 'source',
      render: (name: string) => {
        return name || '-';
      },
      width: 120
    },
    {
      title: '名称',
      dataIndex: 'fieldname',
      key: 'fieldname',
      render: (fieldname: string) => {
        return fieldname || '-';
      },
      width: 150
    },
    {
      title: '系统标识符',
      dataIndex: 'identifier',
      key: 'identifier',
      render: (identifier: string) => {
        return (
          <Typography.Text style={{ 
            wordBreak: 'break-all', 
            whiteSpace: 'normal',
            display: 'block',
            maxWidth: '100%' 
          }}>
            {identifier || '-'}
          </Typography.Text>
        );
      },
      width: 320
    },
    {
      title: '显示标识符',
      dataIndex: 'displayIdentifier',
      key: 'displayIdentifier',
      render: (displayId: string, record: Variable) => {
        if (!displayId) {
          return (
            <Typography.Text type="danger" style={{ fontSize: '12px' }}>
              错误：缺少显示标识符
            </Typography.Text>
          );
        }
        
        return (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <VariableTag
              identifier={record.identifier}
              displayIdentifier={displayId}
              type={record.type}
              value={record.value}
              readOnly={true}
            />
          </div>
        );
      },
      width: 250,
      onCell: () => ({
        style: {
          whiteSpace: 'normal',
          maxWidth: '250px',
          overflow: 'visible'
        }
      })
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
              onClick={() => handleCopyIdentifier(record.identifier)} 
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
