import React from 'react';
import { Row, Col, Form, Select, Typography, Input, FormInstance } from 'antd';
import { VexPromptEditorRef } from '../VexPromptEditor';
import { NpcPromptTemplate } from '../../../services/workTaskService';
import NpcSelector from '../NpcSelector';
import PromptTemplateManager from '../PromptTemplateManager';

const { Text, Title } = Typography;

interface TaskProcessSectionProps {
  form: FormInstance;
  selectedNpcId: string;
  selectedNpcName: string;
  npcs: any[];
  aiServices: any[];
  promptEditorRef: React.RefObject<VexPromptEditorRef>;
  npcTemplates: Record<string, NpcPromptTemplate>;
  setNpcTemplates: React.Dispatch<React.SetStateAction<Record<string, NpcPromptTemplate>>>;
  activeCollapseKeys: string[];
  setActiveCollapseKeys: React.Dispatch<React.SetStateAction<string[]>>;
  handleNpcChange: (npcId: string) => Promise<void>;
  handleAiServiceChange: (serviceId: string) => void;
  variables: any[];
  currentTaskName: string;
  saveTemplateToDatabase?: (taskId: string, templates: Record<string, NpcPromptTemplate>) => Promise<void>;
  taskId?: string;
}

/**
 * 工作任务表单的规则处理区域组件
 * 包含NPC选择、提示词模板管理和AI服务选择
 */
const TaskProcessSection: React.FC<TaskProcessSectionProps> = ({
  form,
  selectedNpcId,
  selectedNpcName,
  npcs,
  aiServices,
  promptEditorRef,
  npcTemplates,
  setNpcTemplates,
  activeCollapseKeys,
  setActiveCollapseKeys,
  handleNpcChange,
  handleAiServiceChange,
  variables,
  currentTaskName,
  saveTemplateToDatabase,
  taskId
}) => {
  return (
    <>
      <Title level={5}>规则 / PROCESS</Title>
      <div style={{ 
        backgroundColor: '#F5F5F5', 
        padding: 16, 
        borderRadius: 4, 
        border: '1px solid #e8e8e8',
        marginBottom: 16 
      }}>
        {/* NPC选择器 */}
        <NpcSelector 
          npcs={npcs} 
          selectedNpcId={selectedNpcId} 
          onNpcChange={handleNpcChange}
          form={form} 
        />
        
        {/* 提示词模板管理器 */}
        <PromptTemplateManager
          selectedNpcId={selectedNpcId}
          selectedNpcName={selectedNpcName}
          npcs={npcs}
          promptEditorRef={promptEditorRef}
          form={form}
          npcTemplates={npcTemplates}
          setNpcTemplates={setNpcTemplates}
          activeCollapseKeys={activeCollapseKeys}
          setActiveCollapseKeys={setActiveCollapseKeys}
          variables={variables}
          currentTaskName={currentTaskName}
          saveTemplateToDatabase={saveTemplateToDatabase}
          taskId={taskId}
        />
        
        {/* AI服务选择 */}
        <Row gutter={16}>
          <Col span={24}>
            <Row align="middle">
              <Col span={4}>
                <Text strong>AI服务:</Text>
              </Col>
              <Col span={20}>
                <Form.Item
                  name="aiServiceId"
                  rules={[{ required: true, message: '请选择AI服务' }]}
                  style={{ marginBottom: 0 }}
                >
                  <Select 
                    placeholder="请选择AI服务" 
                    onChange={handleAiServiceChange}
                    options={aiServices.map(service => ({ label: service.name, value: service.id }))}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Col>
        </Row>
      </div>
      
      {/* 隐藏字段 */}
      <Form.Item name="aiServiceName" hidden><Input /></Form.Item>
      <Form.Item name={['npcPromptTemplate', 'isCustomized']} hidden><Input /></Form.Item>
    </>
  );
};

export default TaskProcessSection;
