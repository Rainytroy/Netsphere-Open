import * as React from 'react';
import { useState, useEffect } from 'react';
import { Typography, Card, Row, Col, Statistic, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  UserOutlined,
  ExperimentOutlined,
  PartitionOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { npcService } from '../services/npcService';
import { variableService } from '../services/variableService';
import workTaskService from '../services/workTaskService';
import { workflowService } from '../services/workflowService';

const { Title, Paragraph } = Typography;

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [npcCount, setNpcCount] = useState<number>(0);
  const [taskCount, setTaskCount] = useState<number>(0);
  const [variableCount, setVariableCount] = useState<number>(0);
  const [workflowCount, setWorkflowCount] = useState<number>(0);
  
  useEffect(() => {
    const fetchCounts = async () => {
      setLoading(true);
      try {
        // 获取NPC数量
        const npcResponse = await npcService.getNpcs();
        setNpcCount(npcResponse.data.length);
        
        // 获取工作任务数量
        const tasksResponse = await workTaskService.getAllWorkTasks();
        setTaskCount(tasksResponse.length);
        
        // 获取全局变量数量，并对结果进行去重
        const variablesResponse = await variableService.getVariables();
        // 处理返回数据，确保数据类型正确
        if (variablesResponse.data && Array.isArray(variablesResponse.data)) {
          // 对变量基于标识符去重
          const uniqueIdentifiers = new Set<string>();
          const uniqueVariables = variablesResponse.data.filter((variable: any) => {
            if (!variable.identifier) return true; // 如果没有标识符，保留
            
            // 如果标识符已存在，跳过这个变量
            if (uniqueIdentifiers.has(variable.identifier)) {
              return false;
            }
            
            // 否则添加到已见过的标识符集合，并保留这个变量
            uniqueIdentifiers.add(variable.identifier);
            return true;
          });
          
          // 设置去重后的变量数量
          setVariableCount(uniqueVariables.length);
          
          // 日志记录重复情况
          if (uniqueVariables.length < variablesResponse.data.length) {
            console.warn(`首页统计: 发现 ${variablesResponse.data.length - uniqueVariables.length} 个重复变量，已自动去重`);
          }
        }
        
        // 获取工作流数量
        const workflowsResponse = await workflowService.getWorkflows();
        if (workflowsResponse && workflowsResponse.pagination) {
          setWorkflowCount(workflowsResponse.pagination.total);
        }
      } catch (error) {
        console.error('获取主页数据失败:', error);
        message.error('获取系统数据统计失败，请刷新页面重试');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCounts();
  }, []);

  // 卡片点击样式
  const cardStyle = {
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    ':hover': {
      boxShadow: '0 3px 6px rgba(0,0,0,0.1)',
      transform: 'translateY(-2px)'
    }
  };

  return (
    <div>
      <Typography>
        <Title level={2}>欢迎使用 Netsphere</Title>
        <Paragraph>
          Netsphere是一个基于AI的工作流平台，允许用户创建AI驱动的NPC、设计工作任务和编排工作流程。
        </Paragraph>
      </Typography>

      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={6}>
          <Card 
            style={cardStyle} 
            onClick={() => navigate('/npc/list')}
            hoverable
          >
            <Statistic
              title="NPC数量"
              value={npcCount}
              loading={loading}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card 
            style={cardStyle} 
            onClick={() => navigate('/task')}
            hoverable
          >
            <Statistic
              title="工作任务"
              value={taskCount}
              loading={loading}
              prefix={<ExperimentOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card 
            style={cardStyle} 
            onClick={() => navigate('/workflow')}
            hoverable
          >
            <Statistic
              title="工作流"
              value={workflowCount}
              loading={loading}
              prefix={<PartitionOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card 
            style={cardStyle} 
            onClick={() => navigate('/variable/list')}
            hoverable
          >
            <Statistic
              title="全局变量"
              value={variableCount}
              loading={loading}
              prefix={<DatabaseOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 24 }}>
        <Title level={3}>快速入门</Title>
        <Paragraph>
          1. 创建NPC：在"NPC管理"中创建您的AI助手，设置它们的知识背景和行动原则。
        </Paragraph>
        <Paragraph>
          2. 创建工作任务：在"工作任务"中设计您的提示词(prompts)，并分配NPC处理任务。
        </Paragraph>
        <Paragraph>
          3. 定义全局变量：在"全局变量"中创建可在任务之间共享的变量。
        </Paragraph>
        <Paragraph>
          4. 设计工作流：在"工作流"中将多个任务连接起来，形成完整的工作流程。
        </Paragraph>
      </Card>
    </div>
  );
};

export default HomePage;
