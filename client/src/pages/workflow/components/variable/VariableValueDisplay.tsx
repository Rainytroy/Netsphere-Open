import React, { useState, useEffect } from 'react';
import { Spin, Typography, Input, Button, Space, Tooltip } from 'antd';
import { SyncOutlined, EditOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import useExecutionVariable from './useExecutionVariable';

const { Text } = Typography;

interface VariableValueDisplayProps {
  fullId: string; // 变量完整ID，例如 "workflow_uuid_name"
  systemId?: string; // 可选：系统标识符，如果提供则优先使用
  editable?: boolean; // 是否允许编辑
  autoRefresh?: boolean; // 是否自动刷新
  refreshInterval?: number; // 刷新间隔（毫秒）
}

/**
 * 变量值显示组件
 * 从服务器获取变量的值并显示，支持编辑
 */
const VariableValueDisplay: React.FC<VariableValueDisplayProps> = ({
  fullId,
  systemId,
  editable = false,
  autoRefresh = false,
  refreshInterval = 5000 // 默认5秒刷新一次
}) => {
  const [value, setValue] = useState<string>('');
  const [editValue, setEditValue] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const { loading, error, getVariableValue, getVariableValueBySystemId, updateVariableValue } = useExecutionVariable();

  // 加载变量值
  const loadVariableValue = async (forceRefresh: boolean = false) => {
    setRefreshing(true);
    try {
      // 优先使用系统标识符
      const result = systemId 
        ? await getVariableValueBySystemId(systemId)
        : await getVariableValue(fullId, forceRefresh);
      
      if (result.success && result.value !== undefined) {
        setValue(result.value);
        setEditValue(result.value);
      }
    } finally {
      setRefreshing(false);
    }
  };

  // 组件挂载时加载一次
  useEffect(() => {
    loadVariableValue(true);
  }, [fullId, systemId]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      loadVariableValue();
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fullId, systemId]);

  // 手动刷新
  const handleRefresh = () => {
    loadVariableValue(true);
  };

  // 开始编辑
  const handleEdit = () => {
    setIsEditing(true);
    setEditValue(value);
  };

  // 保存编辑
  const handleSave = async () => {
    const result = await updateVariableValue(fullId, editValue);
    if (result.success) {
      setValue(editValue);
      setIsEditing(false);
    }
  };

  // 取消编辑
  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value);
  };

  if (loading && !refreshing) {
    return <Spin size="small" /> 
  }

  if (error) {
    return <Text type="danger">错误: {error}</Text>
  }

  // 编辑模式
  if (isEditing) {
    return (
      <Space>
        <Input 
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          style={{ width: '200px' }}
          onPressEnter={handleSave}
        />
        <Button 
          type="primary" 
          size="small" 
          icon={<CheckOutlined />}
          onClick={handleSave}
        />
        <Button 
          size="small" 
          icon={<CloseOutlined />}
          onClick={handleCancel}
        />
      </Space>
    );
  }

  // 查看模式
  return (
    <Space>
      <Text code>{value || '(空)'}</Text>
      {editable && (
        <Button 
          type="text" 
          size="small" 
          icon={<EditOutlined />} 
          onClick={handleEdit}
        />
      )}
      <Tooltip title="刷新">
        <Button
          type="text"
          size="small"
          icon={<SyncOutlined spin={refreshing} />}
          onClick={handleRefresh}
        />
      </Tooltip>
    </Space>
  );
};

export default VariableValueDisplay;
