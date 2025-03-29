import React, { useState, useEffect } from 'react';
import { Card, message, Typography, Spin, Space, Divider } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import VariableForm from '../../components/variable/VariableForm';
import { variableService, Variable } from '../../services/variableService';

/**
 * 编辑自定义变量页面
 */
const VariableEditPage: React.FC = () => {
  const [variable, setVariable] = useState<Variable | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // 加载变量详情
  useEffect(() => {
    if (!id) return;
    
    const loadVariable = async () => {
      setLoading(true);
      try {
        const response = await variableService.getVariable(id);
        const variableData = response.data as Variable;
        
        // 检查是否是自定义类型
        if (variableData.type !== 'custom') {
          message.error('只能编辑自定义变量');
          navigate('/variable/list');
          return;
        }
        
        setVariable(variableData);
      } catch (error) {
        console.error(`加载变量失败 ID=${id}:`, error);
        message.error('加载变量失败');
        navigate('/variable/list');
      } finally {
        setLoading(false);
      }
    };
    
    loadVariable();
  }, [id, navigate]);
  
  // 处理表单提交
  const handleSubmit = async (values: { name: string; value: string }) => {
    if (!id) return;
    
    setSubmitting(true);
    try {
      await variableService.updateVariable(id, values);
      message.success('更新成功');
      navigate('/variable/list');
    } catch (error: any) {
      console.error(`更新变量失败 ID=${id}:`, error);
      
      // 处理不同类型的错误
      if (error.response?.status === 403) {
        message.error('无法更新非自定义变量');
        navigate('/variable/list');
      } else if (error.response?.status === 409) {
        message.error('变量标识符已存在，请使用其他名称');
      } else {
        message.error('更新失败: ' + (error.response?.data?.message || '未知错误'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 返回列表页
  const goBack = () => {
    navigate('/variable/list');
  };

  return (
    <div className="variable-edit-page">
      <div style={{ marginBottom: 24 }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ArrowLeftOutlined 
              onClick={goBack} 
              style={{ marginRight: 16, fontSize: 16, cursor: 'pointer' }}
            />
            <Typography.Title level={4} style={{ margin: 0 }}>
              {variable ? `编辑全局变量: ${variable.name}` : '编辑全局变量'}
            </Typography.Title>
          </div>
          <Divider style={{ margin: '12px 0' }} />
        </Space>
      </div>
      
      <Card>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <Spin tip="加载中..." />
          </div>
        ) : variable ? (
          <VariableForm
            initialValues={{
              name: variable.name,
              value: variable.value
            }}
            onSubmit={handleSubmit}
            submitButtonText="保存"
            loading={submitting}
          />
        ) : null}
      </Card>
    </div>
  );
};

export default VariableEditPage;
