import React, { useEffect, useState } from 'react';
import { Button, Input, Row, Col, Typography, Spin, message, Empty, Space, Pagination, Card, Divider } from 'antd';
import { PlusOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { Workflow, workflowService } from '../../services/workflowService';
import WorkflowCard from '../../components/workflow/WorkflowCard';
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

  // 处理创建工作流
  const handleCreate = () => {
    navigate('/workflow/create');
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

      {/* 搜索栏 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Input
              placeholder="搜索工作流名称"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyPress={handleSearchInputKeyPress}
              suffix={<SearchOutlined />}
              style={{ width: '100%' }}
            />
          </Col>
          <Col>
            <Space>
              <Button onClick={handleSearch} icon={<SearchOutlined />}>
                搜索
              </Button>
              <Button 
                icon={<ReloadOutlined />}
                onClick={() => {
                  setSearchText('');
                  fetchWorkflows(1, '');
                }}
              >
                重置
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 工作流列表 */}
      <Spin spinning={loading}>
        {workflows.length > 0 ? (
          <div>
            <Card>
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
            </Card>
            
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
          </div>
        ) : (
          <Empty 
            description={searchText ? "没有找到匹配的工作流" : "暂无工作流，点击「创建工作流」开始设计"} 
            style={{ marginTop: 48 }}
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
      </Spin>
    </div>
  );
};

export default WorkflowListPage;
