import * as React from 'react';
import { message, Spin, Empty, Button, Typography, Space, Divider, Card, Input, Tooltip, Select } from 'antd';
import { PlusOutlined, SyncOutlined, DashboardOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import workTaskService, { WorkTask } from '../../services/workTaskService';
import outputPersistenceService from '../../services/outputPersistenceService';
import WorkTaskCard from '../../components/workTask/WorkTaskCard';

const { Title, Text } = Typography;
const { useState, useEffect, useRef } = React;

/**
 * 工作任务列表页面
 */
const WorkTaskListPage: React.FC = () => {
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<WorkTask[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [executingTaskId, setExecutingTaskId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchText, setSearchText] = useState<string>('');
  // 自动刷新默认设置为true，无需用户干预
  const [autoRefresh] = useState<boolean>(true);
  const autoRefreshIntervalRef = useRef<number | null>(null);
  const navigate = useNavigate();

  // 页面加载时获取工作任务列表
  useEffect(() => {
    loadTasks();

    // 组件挂载时开始自动刷新
    startAutoRefresh();

    // 组件卸载时清除自动刷新
    return () => {
      stopAutoRefresh();
    };
  }, []);

  // 开始自动刷新
  const startAutoRefresh = () => {
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
    }
    
    // 每3秒刷新一次任务列表
    autoRefreshIntervalRef.current = window.setInterval(() => {
      console.log('自动刷新工作任务列表...');
      loadTasks(false); // 静默刷新，不显示加载状态和成功提示
    }, 3000);
  };

  // 停止自动刷新
  const stopAutoRefresh = () => {
    if (autoRefreshIntervalRef.current) {
      clearInterval(autoRefreshIntervalRef.current);
      autoRefreshIntervalRef.current = null;
    }
  };

  // 当过滤条件或任务列表变化时，更新过滤后的任务列表
  useEffect(() => {
    filterTasks();
  }, [statusFilter, searchText, tasks]);

  // 根据搜索条件和状态过滤任务
  const filterTasks = () => {
    let filtered = [...tasks];
    
    // 应用状态过滤
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => task.status === statusFilter);
    }
    
    // 应用搜索过滤
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(task => 
        (task.name?.toLowerCase().includes(searchLower)) || 
        (task.input?.toLowerCase().includes(searchLower))
      );
    }
    
    setFilteredTasks(filtered);
  };
  
  // 处理搜索文本变更
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };
  
  // 手动刷新任务列表
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadTasks(true);
      message.success('工作任务列表已刷新');
    } catch (error) {
      // 错误处理已经在 loadTasks 中实现
    } finally {
      setRefreshing(false);
    }
  };

  // 处理状态过滤变更
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
  };

  // 加载工作任务列表数据
  const loadTasks = async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const taskList = await workTaskService.getAllWorkTasks();
      setTasks(taskList);
    } catch (error) {
      console.error('加载工作任务列表失败:', error);
      if (showLoading) {
        message.error('加载工作任务列表失败');
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // 处理工作任务删除
  const handleDeleteTask = async (id: string) => {
    try {
      await workTaskService.deleteWorkTask(id);
      message.success('工作任务删除成功');
      // 重新加载列表
      loadTasks();
    } catch (error) {
      console.error('删除工作任务失败:', error);
      message.error('删除工作任务失败');
    }
  };

  // 处理工作任务执行
  const handleExecuteTask = async (id: string) => {
    try {
      setExecutingTaskId(id);
      const updatedTask = await workTaskService.executeWorkTask(id);
      message.success('工作任务执行成功');
      
      // 更新任务列表中的对应任务
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === id ? updatedTask : task
        )
      );
      
      // 将执行结果持久化到本地存储
      if (updatedTask.output) {
        outputPersistenceService.saveTaskOutput(
          id,
          updatedTask.output,
          updatedTask.executionStatus as string,
          updatedTask.lastRunAt || new Date().toISOString(),
          null // 直接执行没有调试信息
        );
        console.log('已持久化任务执行结果到本地存储');
      }
    } catch (error) {
      console.error('执行工作任务失败:', error);
      message.error('执行工作任务失败');
    } finally {
      setExecutingTaskId(null);
    }
  };

  // 跳转到工作任务编辑页面
  const handleEditTask = (id: string) => {
    navigate(`/work-task/edit/${id}`);
  };

  // 跳转到工作任务创建页面
  const handleCreateTask = () => {
    navigate('/work-task/create');
  };

  return (
    <div className="work-task-list-page">
      <div style={{ marginBottom: 24 }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>工作任务</Typography.Title>
              <Text type="secondary">创建和管理系统中的工作任务</Text>
            </div>
            <Space>
              <Tooltip title="刷新列表">
                <Button
                  type="default"
                  icon={<SyncOutlined spin={refreshing} />}
                  onClick={handleRefresh}
                  disabled={loading || refreshing}
                />
              </Tooltip>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreateTask}
                style={{ backgroundColor: '#1A1F2C' }}
              >
                创建工作任务
              </Button>
            </Space>
          </div>
          <Divider style={{ margin: '12px 0' }} />
        </Space>
      </div>

      <Card>
        {/* 工具栏区域 */}
        <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <Input.Search
                placeholder="搜索工作任务（支持名称、内容）"
                allowClear
                onSearch={value => setSearchText(value)}
                style={{ width: 280 }}
                disabled={loading || refreshing}
                loading={loading || refreshing}
                value={searchText}
                onChange={handleSearchChange}
              />
              <Select
                placeholder="状态筛选"
                value={statusFilter}
                onChange={handleStatusFilterChange}
                style={{ width: 120 }}
                disabled={loading || refreshing}
              >
                <Select.Option value="all">全部</Select.Option>
                <Select.Option value="active">发布</Select.Option>
                <Select.Option value="archived">存档</Select.Option>
              </Select>
            </Space>
            
            <Space>
              <Tooltip title="状态组件演示">
                <Button
                  type="default"
                  icon={<DashboardOutlined />}
                  onClick={() => navigate('/demo/execution-status')}
                />
              </Tooltip>
            </Space>
          </Space>
        </Space>

        {loading || refreshing ? (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Spin tip="加载中..." />
          </div>
        ) : filteredTasks.length === 0 ? (
          <Empty
            description={searchText || statusFilter !== 'all' ? 
              "没有找到匹配的工作任务，请尝试调整筛选条件" : 
              "暂无工作任务数据"}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '24px',
            alignItems: 'flex-start'
          }}>
            {filteredTasks.map((task) => (
              <div key={task.id}>
                <WorkTaskCard
                  task={task}
                  onDelete={handleDeleteTask}
                  onClick={handleEditTask}
                  onExecute={handleExecuteTask}
                />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default WorkTaskListPage;
