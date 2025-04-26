import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Card, Typography, Switch, message, Divider, Space, Badge, Row, Col } from 'antd';
import { GlobalOutlined, SaveOutlined, ReloadOutlined, SettingOutlined, LinkOutlined, ApiOutlined } from '@ant-design/icons';
// @ts-ignore - 忽略导入错误，服务模块已正确存在但TypeScript可能未正确检测到
import { getServerAddress, setServerAddress, useServerConfig } from '../../services/serverConfigService';
import './SettingsPage.css';

const { Title, Paragraph, Text } = Typography;

/**
 * 设置页面组件
 * 提供系统设置功能，包括远程访问配置
 */
const SettingsPage: React.FC = () => {
  const [form] = Form.useForm();
  const { serverAddress, isRemoteMode, setRemoteMode } = useServerConfig();
  const [testStatus, setTestStatus] = useState<'success' | 'error' | 'default'>('default');
  const [testMessage, setTestMessage] = useState<string>('未测试');
  const [loading, setLoading] = useState(false);

  // 初始化表单值
  useEffect(() => {
    form.setFieldsValue({
      serverAddress: serverAddress || 'localhost',
      remoteMode: isRemoteMode
    });
  }, [form, serverAddress, isRemoteMode]);

  // 保存配置
  const handleSave = async (values: any) => {
    setLoading(true);
    
    try {
      // 保存服务器地址
      setServerAddress(values.serverAddress);
      setRemoteMode(values.remoteMode);
      
      message.success('配置已保存！');
      
      // 如果启用了远程模式，提示用户刷新页面
      if (values.remoteMode) {
        message.info('请刷新页面以应用新的服务器地址');
      }
    } catch (error) {
      message.error('保存配置失败');
      console.error('保存配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 测试服务器连接
  const testConnection = async () => {
    setLoading(true);
    setTestStatus('default');
    setTestMessage('测试中...');

    const address = form.getFieldValue('serverAddress');
    
    try {
      // 尝试连接服务器
      const response = await fetch(`http://${address}:3001/api/variables?page=1&pageSize=1`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // 设置超时
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        setTestStatus('success');
        setTestMessage('连接成功！服务器可访问。');
      } else {
        setTestStatus('error');
        setTestMessage(`服务器返回错误: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      setTestStatus('error');
      setTestMessage(`连接失败: ${error instanceof Error ? error.message : '未知错误'}`);
      console.error('测试连接失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取当前连接状态标签
  const getConnectionStatusBadge = () => {
    const status = isRemoteMode ? '远程模式' : '本地模式';
    const color = isRemoteMode ? 'processing' : 'success';
    return <Badge status={color} text={status} />;
  };

  return (
    <div className="settings-page">
      <div style={{ marginBottom: 24 }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Typography.Title level={4} style={{ margin: 0 }}>系统设置</Typography.Title>
              <Typography.Text type="secondary">在这里配置系统的全局设置项，包括远程访问地址等</Typography.Text>
            </div>
            <div>
              {getConnectionStatusBadge()}
            </div>
          </div>
          <Divider style={{ margin: '12px 0' }} />
        </Space>
      </div>
      
      <Card title={<><GlobalOutlined /> 远程访问设置</>}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
        >
          <Form.Item
            name="serverAddress"
            label="服务器地址"
            rules={[
              { required: true, message: '请输入服务器IP地址或域名' },
              { 
                pattern: /^[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+\.?$|^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^localhost$/,
                message: '请输入有效的IP地址、域名或localhost' 
              }
            ]}
            tooltip="设置远程服务器的IP地址或域名，例如：192.168.1.100 或 example.com"
          >
            <Input placeholder="例如：192.168.1.100 或 example.com 或 localhost" />
          </Form.Item>
          
          <Form.Item
            name="remoteMode"
            label="启用远程模式"
            valuePropName="checked"
            tooltip="启用后将使用上面配置的服务器地址，而非本地地址localhost"
          >
            <Switch />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                icon={<SaveOutlined />}
                loading={loading}
              >
                保存配置
              </Button>
              
              <Button 
                onClick={testConnection}
                icon={<ReloadOutlined />}
                loading={loading}
              >
                测试连接
              </Button>
              
              {testStatus !== 'default' && (
                <Text type={testStatus === 'success' ? 'success' : 'danger'}>
                  {testMessage}
                </Text>
              )}
            </Space>
          </Form.Item>
        </Form>
      </Card>
      
      <Card title="当前配置信息" style={{ marginTop: 20 }}>
        <div className="server-info-item">
          <span className="server-info-label">当前模式：</span>
          <span className="server-info-value">
            {isRemoteMode ? '远程模式' : '本地模式'}
            <Badge 
              className="status-badge"
              status={isRemoteMode ? 'processing' : 'success'} 
            />
          </span>
        </div>
        
        <div className="server-info-item">
          <span className="server-info-label">服务器地址：</span>
          <span className="server-info-value">{serverAddress || 'localhost'}</span>
        </div>
        
        <div className="server-info-item">
          <span className="server-info-label">
            <LinkOutlined style={{ marginRight: 8 }} />
            客户端访问地址：
          </span>
          <span className="server-info-value">
            http://{serverAddress || 'localhost'}:3000
          </span>
        </div>
        
        <div className="server-info-item">
          <span className="server-info-label">
            <ApiOutlined style={{ marginRight: 8 }} />
            API访问地址：
          </span>
          <span className="server-info-value">
            http://{serverAddress || 'localhost'}:3001/api
          </span>
        </div>
      </Card>
      
      <div style={{ marginTop: 20 }}>
        <Paragraph type="secondary">
          <Text strong>提示：</Text>设置远程访问地址后，确保服务器的 3000 和 3001 端口已开放。
          修改配置后需要刷新页面以应用新设置。
        </Paragraph>
      </div>
    </div>
  );
};

export default SettingsPage;
