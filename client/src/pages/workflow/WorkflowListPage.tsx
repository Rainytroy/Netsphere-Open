import React, { useEffect, useState } from 'react';
import { Button, Input, Row, Col, Typography, Spin, message, Empty, Space, Pagination, Card, Divider, Tooltip } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined, BugOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Workflow, workflowService } from '../../services/workflowService';
import WorkflowCard from '../../components/workflow/WorkflowCard';
import WorkflowDiagnosticModal from '../../components/workflow/WorkflowDiagnosticModal';
import { DEFAULT_PAGE_SIZE } from '../../config';

const { Title, Text } = Typography;

/**
 * 工作流列表页面
 * 展示所有工作流，支持搜索、分页和操作
 */
const WorkflowListPage: React.FC = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [diagnosticModalVisible, setDiagnosticModalVisible] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0
  });

  // 获取工作流列表
  const fetchWorkflows = async (page = 1, search = '') => {
    setLoading(true);
    try {
      const response = await workflowService.getWorkflows(page, pagination.pageSize, search);
      setWorkflows(response.workflows);
      setPagination({
        ...pagination,
        current: page,
        total: response.pagination.total
      });
    } catch (error) {
      console.error('获取工作流列表失败:', error);
      message.error('获取工作流列表失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 首次加载
  useEffect(() => {
    fetchWorkflows();
  }, []);

  // 处理搜索
  const handleSearch = () => {
    fetchWorkflows(1, searchText);
  };

  // 处理搜索输入框按下回车
  const handleSearchInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // 处理分页变化
  const handlePageChange = (page: number) => {
    fetchWorkflows(page, searchText);
  };

  // 处理创建工作流 - 改为先创建后编辑模式
  const handleCreate = async () => {
    try {
      setLoading(true);
      // 先在服务器创建一个空工作流
      const emptyWorkflow = await workflowService.createWorkflow({
        name: '未命名工作流',
        description: '',
        isActive: false
      });
      
      // 创建成功后直接跳转到编辑页面
      message.success('已创建新工作流');
      navigate(`/workflow/${emptyWorkflow.id}/edit`);
    } catch (error) {
      console.error('创建工作流失败:', error);
      message.error('创建工作流失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理复制工作流
  const handleCopy = async (id: string) => {
    try {
      setLoading(true);
      await workflowService.copyWorkflow(id);
      message.success('复制工作流成功');
      fetchWorkflows(pagination.current, searchText);
    } catch (error) {
      console.error('复制工作流失败:', error);
      message.error('复制工作流失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理删除工作流
  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await workflowService.deleteWorkflow(id);
      message.success('删除工作流成功');
      
      // 如果删除后当前页没有数据了，跳转到上一页
      const isLastItemOnPage = workflows.length === 1 && pagination.current > 1;
      if (isLastItemOnPage) {
        fetchWorkflows(pagination.current - 1, searchText);
      } else {
        fetchWorkflows(pagination.current, searchText);
      }
    } catch (error) {
      console.error('删除工作流失败:', error);
      message.error('删除工作流失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="workflow-list-page">
      {/* 顶部标题和操作 */}
      <div style={{ marginBottom: 24 }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={4} style={{ margin: 0 }}>工作流管理</Title>
              <Text type="secondary">创建和管理自定义工作流</Text>
            </div>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleCreate}
              style={{ backgroundColor: '#1A1F2C' }}
            >
              创建工作流
            </Button>
          </div>
          <Divider style={{ margin: '12px 0' }} />
        </Space>
      </div>

      {/* 搜索栏和工作流列表 */}
      <Spin spinning={loading}>
        <Card>
          {/* 搜索栏 */}
          <div style={{ marginBottom: 16 }}>
            <Row gutter={16} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Col flex="auto" style={{ display: 'flex', alignItems: 'center' }}>
                <Input
                  placeholder="搜索工作流名称"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyPress={handleSearchInputKeyPress}
                  suffix={
                    <SearchOutlined 
                      style={{ cursor: 'pointer' }} 
                      onClick={handleSearch}
                    />
                  }
                  style={{ width: 200, marginRight: 8 }}
                />
                <Button 
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    setSearchText('');
                    fetchWorkflows(1, '');
                  }}
                  size="middle"
                />
              </Col>
              <Col>
                <Tooltip title="工作流诊断工具" placement="top">
                  <Button 
                    icon={<BugOutlined />} 
                    onClick={() => setDiagnosticModalVisible(true)}
                    size="middle"
                  />
                </Tooltip>
              </Col>
            </Row>
          </div>
          
          <Divider style={{ margin: '0 0 16px 0' }} />
          
          {/* 工作流列表或空状态 */}
          {workflows.length > 0 ? (
            <>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '24px',
                alignItems: 'flex-start'
              }}>
                {workflows.map(workflow => (
                  <div key={workflow.id}>
                    <WorkflowCard
                      workflow={workflow}
                      onDelete={handleDelete}
                      onCopy={handleCopy}
                    />
                  </div>
                ))}
              </div>
              
              {/* 分页 */}
              <Row justify="end" style={{ marginTop: 24 }}>
                <Pagination
                  current={pagination.current}
                  pageSize={pagination.pageSize}
                  total={pagination.total}
                  onChange={handlePageChange}
                  showSizeChanger={false}
                  showTotal={(total) => `共 ${total} 条`}
                />
              </Row>
            </>
          ) : (
            <Empty 
              description={searchText ? "没有找到匹配的工作流" : "暂无工作流，点击「创建工作流」开始设计"} 
              style={{ marginTop: 24, marginBottom: 24 }}
            >
              {!searchText && (
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={handleCreate}
                >
                  创建工作流
                </Button>
              )}
            </Empty>
          )}
        </Card>
      </Spin>

      {/* 工作流诊断模态框 */}
      <WorkflowDiagnosticModal
        visible={diagnosticModalVisible}
        onClose={() => setDiagnosticModalVisible(false)}
      />
    </div>
  );
};

export default WorkflowListPage;
