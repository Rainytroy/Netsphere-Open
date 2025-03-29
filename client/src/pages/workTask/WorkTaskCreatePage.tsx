import * as React from 'react';
import { Typography, Card, Space, Divider } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import WorkTaskForm from '../../components/workTask/WorkTaskForm';

const { Title } = Typography;

/**
 * 工作任务创建页面
 */
const WorkTaskCreatePage: React.FC = () => {
  const navigate = useNavigate();
  
  // 返回列表页
  const goBack = () => {
    navigate('/task');
  };
  return (
    <div className="work-task-create-page">
      <div style={{ marginBottom: 24 }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ArrowLeftOutlined 
              onClick={goBack} 
              style={{ marginRight: 16, fontSize: 16, cursor: 'pointer' }}
            />
            <Typography.Title level={4} style={{ margin: 0 }}>创建工作任务</Typography.Title>
          </div>
          <Divider style={{ margin: '12px 0' }} />
        </Space>
      </div>
      
      <Card>
        <WorkTaskForm />
      </Card>
    </div>
  );
};

export default WorkTaskCreatePage;
