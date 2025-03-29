import React, { useState, useRef, useEffect } from 'react';
import { Card, Row, Col, Button, Select, Form, Input, message, Typography, Space, Divider } from 'antd';
import { useNavigate } from 'react-router-dom';
import { Breadcrumb } from 'antd';
import VexPromptEditor, { VexPromptEditorRef } from '../../../components/workTask/VexPromptEditor';
import { npcService } from '../../../services/npcService';
import workTaskService, { NpcPromptTemplate } from '../../../services/workTaskService';

const { Title, Text } = Typography;
const { Option } = Select;

/**
 * VEX NPC提示词模板集成演示
 * 此页面演示了VariableEditorX与NPC提示词模板系统的集成，以及模板持久化功能
 */
const VexNpcTemplateDemo: React.FC = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [npcs, setNpcs] = useState<any[]>([]);
  const [selectedNpcId, setSelectedNpcId] = useState<string>('');
  const [selectedNpcName, setSelectedNpcName] = useState<string>('');
  const [npcTemplates, setNpcTemplates] = useState<Record<string, NpcPromptTemplate>>({});
  const [savingTemplate, setSavingTemplate] = useState<boolean>(false);
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(false);
  const promptEditorRef = useRef<VexPromptEditorRef>(null);
  
  // 模拟任务ID - 实际项目中应该从路由参数或状态中获取
  const mockTaskId = 'demo-task-2025-03-26';
  
  // 加载NPC数据
  useEffect(() => {
    const loadNpcs = async () => {
      setLoading(true);
      try {
        const response = await npcService.getNpcs();
        setNpcs(response.data || []);
      } catch (error) {
        console.error('加载NPC数据失败:', error);
        message.error('加载NPC数据失败');
      } finally {
        setLoading(false);
      }
    };
    
    loadNpcs();
    
    // 尝试加载已保存的模板
    loadStoredTemplates();
  }, []);
  
  // 生成默认模板
  const generateDefaultTemplate = (npcName: string, npcId: string): string => {
    const shortId = npcId.substring(0, 6);
    return `你是@${npcName}.name#${shortId}，现在你具备的知识背景是：@${npcName}.knowledge#${shortId}，根据你的行动原则：@${npcName}.act#${shortId}，请你给出以上输入的反馈。`;
  };
  
  // 处理NPC选择变更
  const handleNpcChange = (npcId: string) => {
    setSelectedNpcId(npcId);
    
    if (!npcId) {
      setSelectedNpcName('');
      form.setFieldsValue({
        template: '',
        isCustomized: false
      });
      
      // 清空编辑器内容
      if (promptEditorRef.current) {
        promptEditorRef.current.parseExternalContent('');
      }
      return;
    }
    
    const selectedNpc = npcs.find(npc => npc.id === npcId);
    if (selectedNpc) {
      setSelectedNpcName(selectedNpc.name);
      
      // 检查是否有缓存的模板
      if (npcTemplates[npcId]) {
        const savedTemplate = npcTemplates[npcId];
        
        form.setFieldsValue({
          template: savedTemplate.template,
          isCustomized: savedTemplate.isCustomized
        });
        
        if (promptEditorRef.current) {
          promptEditorRef.current.parseExternalContent(savedTemplate.template);
        }
      } else {
        // 生成默认模板
        const defaultTemplate = generateDefaultTemplate(selectedNpc.name, selectedNpc.id);
        
        form.setFieldsValue({
          template: defaultTemplate,
          isCustomized: false
        });
        
        if (promptEditorRef.current) {
          promptEditorRef.current.parseExternalContent(defaultTemplate);
        }
      }
    }
  };
  
  // 保存模板
  const handleSaveTemplate = async () => {
    if (!selectedNpcId) {
      message.warning('请先选择NPC');
      return;
    }
    
    // 获取编辑器原始文本内容
    let templateContent = '';
    if (promptEditorRef.current) {
      const { rawText } = promptEditorRef.current.getRichContent();
      templateContent = rawText;
    } else {
      templateContent = form.getFieldValue('template') || '';
    }
    
    if (!templateContent.trim()) {
      message.warning('模板内容不能为空');
      return;
    }
    
    // 更新表单值
    form.setFieldsValue({
      template: templateContent,
      isCustomized: true
    });
    
    // 创建模板对象，添加时间戳
    const templateObj = {
      template: templateContent,
      isCustomized: true,
      lastModified: new Date().toISOString()
    };
    
    // 更新模板缓存
    const updatedTemplates = {
      ...npcTemplates,
      [selectedNpcId]: templateObj
    };
    
    setNpcTemplates(updatedTemplates);
    message.success('模板已保存');
    
    // 保存到数据库
    await persistTemplates(updatedTemplates);
  };
  
  // 重置模板为默认
  const handleResetTemplate = async () => {
    if (!selectedNpcId) {
      message.warning('请先选择NPC');
      return;
    }
    
    const selectedNpc = npcs.find(npc => npc.id === selectedNpcId);
    if (!selectedNpc) {
      message.warning('找不到所选NPC');
      return;
    }
    
    // 生成默认模板
    const defaultTemplate = generateDefaultTemplate(selectedNpc.name, selectedNpc.id);
    
    // 更新表单值
    form.setFieldsValue({
      template: defaultTemplate,
      isCustomized: false
    });
    
    // 更新编辑器内容
    if (promptEditorRef.current) {
      promptEditorRef.current.parseExternalContent(defaultTemplate);
    }
    
    // 从模板缓存中移除
    const updatedTemplates = { ...npcTemplates };
    delete updatedTemplates[selectedNpcId];
    
    // 更新状态
    setNpcTemplates(updatedTemplates);
    message.success('已恢复默认模板');
    
    // 同步到数据库
    await persistTemplates(updatedTemplates);
  };
  
  // 加载已存储的模板
  const loadStoredTemplates = async () => {
    setLoadingTemplates(true);
    try {
      // 在实际应用中，这应该由workTaskService.getTaskTemplates(taskId)提供
      // 为了演示，我们仍然调用服务，但模拟ID
      const templates = await workTaskService.getTaskTemplates(mockTaskId);
      
      console.log('加载到模板:', templates);
      
      if (templates && Object.keys(templates).length > 0) {
        setNpcTemplates(templates);
        message.success('已加载保存的模板');
        
        // 如果当前已选择了NPC并且有对应模板，立即加载
        if (selectedNpcId && templates[selectedNpcId]) {
          const template = templates[selectedNpcId];
          form.setFieldsValue({
            template: template.template,
            isCustomized: template.isCustomized
          });
          
          if (promptEditorRef.current) {
            promptEditorRef.current.parseExternalContent(template.template);
          }
        }
      } else {
        message.info('没有找到已保存的模板');
      }
    } catch (error) {
      console.error('加载模板失败:', error);
      message.error('无法从服务器加载模板');
    } finally {
      setLoadingTemplates(false);
    }
  };
  
  // 持久化保存模板到数据库
  const persistTemplates = async (templates: Record<string, NpcPromptTemplate>) => {
    setSavingTemplate(true);
    try {
      await workTaskService.updateTaskTemplates(mockTaskId, templates);
      message.success('模板已同步到数据库');
    } catch (error) {
      console.error('保存模板到数据库失败:', error);
      message.error('模板同步失败');
    } finally {
      setSavingTemplate(false);
    }
  };
  
  // 处理编辑器内容变化
  const handleEditorChange = (content: string) => {
    // 如果需要处理编辑器内容变化，可以在这里实现
    // 目前我们只在保存时获取内容
  };
  
  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Breadcrumb>
          <Breadcrumb.Item>首页</Breadcrumb.Item>
          <Breadcrumb.Item>演示</Breadcrumb.Item>
          <Breadcrumb.Item>VEX提示词集成</Breadcrumb.Item>
        </Breadcrumb>
        <Title style={{ margin: '16px 0 8px 0' }}>VEX NPC提示词模板集成演示</Title>
        <Text type="secondary">演示VariableEditorX与NPC提示词模板系统集成</Text>
      </div>
      <Card loading={loading}>
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item label="选择NPC">
                <Select
                  placeholder="请选择NPC"
                  value={selectedNpcId}
                  onChange={handleNpcChange}
                  style={{ width: '100%' }}
                  loading={loading}
                >
                  <Option value="">不使用NPC</Option>
                  {npcs.map(npc => (
                    <Option key={npc.id} value={npc.id}>{npc.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          {selectedNpcId && (
            <>
              <Row>
                <Col span={24}>
                  <Title level={5}>提示词模板</Title>
                  {npcTemplates[selectedNpcId]?.isCustomized && (
                    <Text type="success" style={{ marginLeft: 8, fontSize: 12 }}>
                      (已自定义，上次修改: {new Date(npcTemplates[selectedNpcId]?.lastModified || new Date()).toLocaleString()})
                    </Text>
                  )}
                </Col>
              </Row>
              
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item name="template" style={{ marginBottom: 8 }}>
                    <div className="prompt-editor-container" style={{ border: '1px solid #d9d9d9', borderRadius: 4, padding: 1, minHeight: 150 }}>
                      <VexPromptEditor
                        ref={promptEditorRef}
                        defaultValue={form.getFieldValue('template') || ''}
                        onChange={handleEditorChange}
                        placeholder="输入提示词模板"
                        minHeight={150}
                      />
                    </div>
                  </Form.Item>
                  
                  <Form.Item name="isCustomized" hidden>
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              
              <Row>
                <Col span={24}>
                  <Space style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <Space>
                      <Button 
                        onClick={loadStoredTemplates} 
                        loading={loadingTemplates}
                      >
                        从数据库加载
                      </Button>
                    </Space>
                    
                    <Space>
                      <Button onClick={handleResetTemplate}>重置为默认</Button>
                      <Button 
                        type="primary" 
                        onClick={handleSaveTemplate}
                        loading={savingTemplate}
                      >
                        保存模板
                      </Button>
                    </Space>
                  </Space>
                </Col>
              </Row>
            </>
          )}
          
          <Divider />
          
          <Row>
            <Col span={24}>
              <Title level={5}>当前保存的模板</Title>
              <div style={{ backgroundColor: '#f5f5f5', padding: 16, borderRadius: 4 }}>
                {Object.keys(npcTemplates).length > 0 ? (
                  <pre style={{ whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(npcTemplates, null, 2)}
                  </pre>
                ) : (
                  <Text type="secondary">暂无保存的模板</Text>
                )}
              </div>
            </Col>
          </Row>
        </Form>
      </Card>
    </div>
  );
};

export default VexNpcTemplateDemo;
