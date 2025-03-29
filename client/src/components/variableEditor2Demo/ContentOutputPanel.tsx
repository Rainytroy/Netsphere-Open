import React, { useState } from 'react';
import { Card, Tabs, Input, Button, Space, Row, Col, Divider, Typography, message } from 'antd';
import { ContentOutputProps } from './types';
import { ReloadOutlined, CodeOutlined, Html5Outlined, FileTextOutlined, BranchesOutlined, DiffOutlined } from '@ant-design/icons';

const { TextArea } = Input;
const { Title } = Typography;

/**
 * 内容输出展示面板 - 增强版
 * 增加主动获取内容按钮，以便调试编辑器输出
 */
const ContentOutputPanel: React.FC<ContentOutputProps> = ({
  htmlOutput,
  rawTextOutput,
  plainTextOutput,
  jsonOutput,
  editorRef
}) => {
  // 本地状态
  const [activeTab, setActiveTab] = useState<string>('html');
  
  // 当前显示内容
  const [currentHtml, setCurrentHtml] = useState<string>(htmlOutput);
  const [currentRawText, setCurrentRawText] = useState<string>(rawTextOutput);
  const [currentPlainText, setCurrentPlainText] = useState<string>(plainTextOutput);
  const [currentJson, setCurrentJson] = useState<string>(jsonOutput);
  const [resolvedContent, setResolvedContent] = useState<string>('');

  // 解析结果对比
  const [rawAndResolvedContent, setRawAndResolvedContent] = useState<string>('');
  const [resolveLoading, setResolveLoading] = useState<boolean>(false);
  
  // 手动获取HTML内容
  const handleGetHtml = () => {
    if (editorRef.current) {
      try {
        const richContent = editorRef.current.getRichContent();
        setCurrentHtml(richContent.html);
        message.success('获取HTML成功');
      } catch (error) {
        console.error('获取HTML失败:', error);
        message.error('获取HTML失败');
      }
    }
  };
  
  // 手动获取原始文本
  const handleGetRawText = () => {
    if (editorRef.current) {
      try {
        const rawContent = editorRef.current.getRawContent();
        setCurrentRawText(rawContent);
        message.success('获取原始文本成功');
      } catch (error) {
        console.error('获取原始文本失败:', error);
        message.error('获取原始文本失败');
      }
    }
  };
  
  // 手动获取纯文本
  const handleGetPlainText = () => {
    if (editorRef.current) {
      try {
        const richContent = editorRef.current.getRichContent();
        setCurrentPlainText(richContent.plainText || '');
        message.success('获取纯文本成功');
      } catch (error) {
        console.error('获取纯文本失败:', error);
        message.error('获取纯文本失败');
      }
    }
  };
  
  // 手动获取JSON
  const handleGetJson = () => {
    if (editorRef.current) {
      try {
        const richContent = editorRef.current.getRichContent();
        setCurrentJson(JSON.stringify(richContent, null, 2));
        message.success('获取JSON成功');
      } catch (error) {
        console.error('获取JSON失败:', error);
        message.error('获取JSON失败');
      }
    }
  };
  
  // 手动获取解析后内容
  const handleGetResolvedContent = async () => {
    if (editorRef.current) {
      try {
        const resolved = await editorRef.current.getResolvedContent();
        setResolvedContent(resolved);
        // 自动切换到解析后内容Tab
        setActiveTab('resolved');
        message.success('获取解析后内容成功');
      } catch (error) {
        console.error('获取解析后内容失败:', error);
        message.error('获取解析后内容失败');
      }
    }
  };

  // 对比解析前后内容（增强调试功能）
  const handleCompareResolvedContent = async () => {
    if (editorRef.current) {
      try {
        setResolveLoading(true);
        
        // 获取原始内容
        const rawContent = editorRef.current.getRawContent();
        
        // 获取解析后内容
        const resolved = await editorRef.current.getResolvedContent();
        
        // 创建对比视图
        const comparison = `原始内容：\n${rawContent}\n\n解析结果：\n${resolved}`;
        setRawAndResolvedContent(comparison);
        
        // 切换到对比Tab
        setActiveTab('comparison');
        message.success('解析对比完成');
      } catch (error) {
        console.error('解析对比失败:', error);
        message.error('解析对比失败: ' + (error instanceof Error ? error.message : '未知错误'));
      } finally {
        setResolveLoading(false);
      }
    }
  };
  
  // 获取当前所有内容
  const handleGetAll = () => {
    handleGetHtml();
    handleGetRawText();
    handleGetPlainText();
    handleGetJson();
    handleGetResolvedContent();
    message.success('获取所有内容成功');
  };
  
  return (
    <Card
      title={
        <Row justify="space-between" align="middle">
          <Col>内容输出</Col>
          <Col>
            <Button 
              type="primary" 
              size="small" 
              icon={<ReloadOutlined />}
              onClick={handleGetAll}
            >
              获取所有内容
            </Button>
          </Col>
        </Row>
      }
      size="small"
      bodyStyle={{ padding: '8px' }}
      style={{ marginBottom: '8px' }}
    >
      {/* 按钮区域 */}
      <Space wrap style={{ marginBottom: '8px' }}>
        <Title level={5} style={{ margin: 0, fontSize: '14px' }}>字段获取：</Title>
        <Button icon={<Html5Outlined />} onClick={handleGetHtml} size="small">获取HTML</Button>
        <Button icon={<CodeOutlined />} onClick={handleGetRawText} size="small">获取原始文本</Button>
        <Button icon={<FileTextOutlined />} onClick={handleGetPlainText} size="small">获取纯文本</Button>
        <Button icon={<CodeOutlined />} onClick={handleGetJson} size="small">获取JSON</Button>
        <Button icon={<BranchesOutlined />} onClick={handleGetResolvedContent} size="small">获取解析后内容</Button>
        <Button 
          type="primary" 
          icon={<DiffOutlined />} 
          onClick={handleCompareResolvedContent} 
          loading={resolveLoading} 
          size="small"
        >
          解析对比测试
        </Button>
      </Space>

      <Divider style={{ margin: '8px 0' }} />

      {/* 内容展示区域 */}
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab} 
        size="small"
      >
        <Tabs.TabPane tab="HTML" key="html">
          <TextArea
            value={currentHtml}
            readOnly
            autoSize={{ minRows: 3, maxRows: 6 }}
            style={{ fontFamily: 'monospace', fontSize: '12px' }}
          />
        </Tabs.TabPane>
        <Tabs.TabPane tab="原始文本(rawText)" key="rawText">
          <TextArea
            value={currentRawText}
            readOnly
            autoSize={{ minRows: 3, maxRows: 6 }}
            style={{ fontFamily: 'monospace', fontSize: '12px' }}
          />
        </Tabs.TabPane>
        <Tabs.TabPane tab="纯文本(plainText)" key="plainText">
          <TextArea
            value={currentPlainText}
            readOnly
            autoSize={{ minRows: 3, maxRows: 6 }}
            style={{ fontFamily: 'monospace', fontSize: '12px' }}
          />
        </Tabs.TabPane>
        <Tabs.TabPane tab="JSON" key="json">
          <TextArea
            value={currentJson}
            readOnly
            autoSize={{ minRows: 3, maxRows: 6 }}
            style={{ fontFamily: 'monospace', fontSize: '12px' }}
          />
        </Tabs.TabPane>
        <Tabs.TabPane tab="解析后内容" key="resolved">
          <TextArea
            value={resolvedContent}
            readOnly
            autoSize={{ minRows: 3, maxRows: 6 }}
            style={{ fontFamily: 'monospace', fontSize: '12px' }}
          />
        </Tabs.TabPane>
        <Tabs.TabPane tab="解析对比" key="comparison">
          <TextArea
            value={rawAndResolvedContent}
            readOnly
            autoSize={{ minRows: 5, maxRows: 8 }}
            style={{ fontFamily: 'monospace', fontSize: '12px' }}
          />
        </Tabs.TabPane>
      </Tabs>
    </Card>
  );
};

export default ContentOutputPanel;
