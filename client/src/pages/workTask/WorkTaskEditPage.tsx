import * as React from 'react';
import { Typography, Spin, message, Card, Space, Divider } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import WorkTaskForm from '../../components/workTask/WorkTaskForm';
import workTaskService, { WorkTask } from '../../services/workTaskService';
import outputPersistenceService from '../../services/outputPersistenceService';

const { Title } = Typography;

/**
 * 工作任务编辑页面
 */
const WorkTaskEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState<boolean>(true);
  const [task, setTask] = React.useState<WorkTask | null>(null);

  // 返回列表页
  const goBack = () => {
    navigate('/task');
  };

  React.useEffect(() => {
    const loadTask = async () => {
      if (!id) {
        message.error('缺少工作任务ID');
        navigate('/task');
        return;
      }

      try {
        setLoading(true);
        const data = await workTaskService.getWorkTaskById(id);
        
        // 检查是否存在持久化的任务执行结果
        const storedOutput = outputPersistenceService.getTaskOutput(id);
        
        if (storedOutput) {
          console.log('发现持久化的任务执行结果:', storedOutput);
          
          // 检查持久化数据的时间是否比服务器数据新
          const persistedTime = new Date(storedOutput.timestamp);
          const serverTime = data.lastRunAt ? new Date(data.lastRunAt) : new Date(0);
          
          if (persistedTime > serverTime) {
            console.log('使用本地持久化的任务执行结果，比服务器数据更新');
            
            // 合并服务器数据和持久化的输出结果
            setTask({
              ...data,
              output: storedOutput.output,
              // 确保executionStatus的类型正确
              executionStatus: storedOutput.executionStatus as ('idle' | 'running' | 'completed' | 'failed')
            });
            return;
          }
        }
        
        // 如果没有持久化数据或服务器数据更新，使用服务器数据
        setTask(data);
      } catch (error) {
        console.error('加载工作任务失败:', error);
        message.error('加载工作任务失败');
        navigate('/task');
      } finally {
        setLoading(false);
      }
    };

    loadTask();
  }, [id, navigate]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin tip="加载中..." />
      </div>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <div className="work-task-edit-page">
      <div style={{ marginBottom: 24 }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ArrowLeftOutlined 
              onClick={goBack} 
              style={{ marginRight: 16, fontSize: 16, cursor: 'pointer' }}
            />
            <Typography.Title level={4} style={{ margin: 0 }}>
              编辑工作任务: {task.name}
            </Typography.Title>
          </div>
          <Divider style={{ margin: '12px 0' }} />
        </Space>
      </div>
      
      <WorkTaskForm initialValues={task} isEdit={true} />
    </div>
  );
};

export default WorkTaskEditPage;
