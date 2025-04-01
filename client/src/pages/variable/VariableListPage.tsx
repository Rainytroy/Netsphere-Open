import React, { useState, useCallback } from 'react';
import { Card, Button, message, Typography, Space, Divider, Tooltip } from 'antd';
import { PlusOutlined, SyncOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import VariableTable from '../../components/variable/VariableTable';
import { variableService } from '../../services/variableService';
import useVariableData from '../../hooks/useVariableData';

/**
 * 全局变量列表页面
 */
const VariableListPage: React.FC = () => {
  const navigate = useNavigate();
  
  // 内部刷新状态
  const [refreshing, setRefreshing] = useState(false);
  
  // 使用通用变量钩子获取变量列表
  const { variables, loading, error, refreshVariables } = useVariableData();
  
  // 组件内部错误处理
  if (error) {
    console.error('加载变量列表失败:', error);
    message.error('加载变量列表失败');
  }
  
  // 处理编辑变量
  const handleEditVariable = (id: string) => {
    navigate(`/variable/edit/${id}`);
  };
  
  // 处理删除变量
  const handleDeleteVariable = async (id: string) => {
    try {
      await variableService.deleteVariable(id);
      message.success('删除成功');
      // 不需要手动刷新，会通过事件系统自动更新
      // 但为了保险起见，我们仍然可以调用刷新方法
      refreshVariables();
    } catch (error) {
      console.error(`删除变量失败 ID=${id}:`, error);
      message.error('删除失败');
    }
  };
  
  // 手动刷新变量列表
  const handleRefreshVariables = useCallback(async () => {
    try {
      setRefreshing(true);
      console.log('[VariableListPage] 手动刷新变量列表...');
      // 调用钩子中的刷新方法强制从API获取最新数据
      await refreshVariables();
      message.success('变量列表已刷新');
    } catch (error) {
      console.error('刷新变量列表失败:', error);
      message.error('刷新失败');
    } finally {
      setRefreshing(false);
    }
  }, [refreshVariables]);

  return (
    <div className="variable-list-page">
      <div style={{ marginBottom: 24 }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>全局变量</Typography.Title>
              <Typography.Text type="secondary">创建和管理系统中的全局变量</Typography.Text>
            </div>
            <Space>
              <Tooltip title="刷新列表">
                <Button
                  type="default"
                  icon={<SyncOutlined spin={refreshing} />}
                  onClick={handleRefreshVariables}
                  disabled={loading || refreshing}
                />
              </Tooltip>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/variable/create')}
                style={{ backgroundColor: '#1A1F2C' }}
              >
                创建自定义变量
              </Button>
            </Space>
          </div>
          <Divider style={{ margin: '12px 0' }} />
        </Space>
      </div>
      
      <Card>
        <VariableTable
          variables={variables}
          loading={loading || refreshing}
          onEdit={handleEditVariable}
          onDelete={handleDeleteVariable}
          onRefresh={handleRefreshVariables}
        />
      </Card>
    </div>
  );
};

export default VariableListPage;
