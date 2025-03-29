import * as React from 'react';
import { useEffect } from 'react';
import { Form, Collapse, Button, Typography, message } from 'antd';
import { SaveOutlined, UndoOutlined, SyncOutlined } from '@ant-design/icons';
import VariableEditor, { VariableEditorRef } from './VariableEditor';
import { VariableView } from './VariableList';

const { Text } = Typography;

interface PromptTemplateEditorProps {
  form: any; // Form实例
  selectedNpcId: string;
  activeCollapseKeys: string[];
  onCollapseChange: (keys: string[]) => void;
  promptEditorRef: React.RefObject<VariableEditorRef>;
  variables: VariableView[];
  handleSaveTemplate: () => void;
  npcs: any[]; // NPC列表
  generateDefaultTemplate: (npcName: string, npcId?: string) => string;
  currentTaskName: string;
}

/**
 * 提示词模板编辑器组件
 * 处理提示词模板编辑、保存和重置功能
 */
const PromptTemplateEditor: React.FC<PromptTemplateEditorProps> = ({
  form,
  selectedNpcId,
  activeCollapseKeys,
  onCollapseChange,
  promptEditorRef,
  variables,
  handleSaveTemplate,
  npcs,
  generateDefaultTemplate,
  currentTaskName
}) => {
  // 监听变量标识符更新事件
  useEffect(() => {
    // 事件处理函数
    const handleVariableIdentifiersUpdated = (event: CustomEvent) => {
      if (!event.detail) return;
      
      const { originalText, updatedText } = event.detail;
      
      // 如果文本没有变化，无需更新
      if (originalText === updatedText) return;
      
      // 获取当前表单中的模板值
      const currentTemplate = form.getFieldValue(['npcPromptTemplate', 'template']);
      
      // 检查当前值是否包含原始文本（防止错误更新）
      if (currentTemplate && currentTemplate.includes(originalText)) {
        // 使用更新后的标识符替换模板中的旧标识符
        const updatedTemplate = currentTemplate.replace(
          new RegExp(originalText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 
          updatedText
        );
        
        // 更新表单值
        form.setFieldsValue({
          npcPromptTemplate: {
            ...form.getFieldValue('npcPromptTemplate'),
            template: updatedTemplate
          }
        });
        
        // 更新编辑器内容
        promptEditorRef.current?.updateContent(updatedTemplate);
        
        message.success('变量标识符已自动更新', 1);
      }
    };
    
    // 添加事件监听
    document.addEventListener(
      'variable-identifiers-updated', 
      handleVariableIdentifiersUpdated as EventListener
    );
    
    // 清理函数
    return () => {
      document.removeEventListener(
        'variable-identifiers-updated', 
        handleVariableIdentifiersUpdated as EventListener
      );
    };
  }, [form, promptEditorRef]);
  return (
    <Collapse 
      ghost 
      activeKey={activeCollapseKeys}
      onChange={onCollapseChange}
      style={{ marginBottom: 16, border: '1px solid #e8e8e8', borderRadius: 4, backgroundColor: '#F5F5F5' }}
    >
      <Collapse.Panel 
        header={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Text strong>NPC提示词控制</Text>
            {!selectedNpcId && <Text type="secondary" style={{ marginLeft: 8 }}>(请先选择NPC)</Text>}
          </div>
        } 
        key="promptControl"
      >
        <Form.Item
          name={['npcPromptTemplate', 'template']}
        >
          <div className="prompt-editor-container">
            <VariableEditor
              ref={promptEditorRef}
              defaultValue={form.getFieldValue(['npcPromptTemplate', 'template']) || ''}
              onChange={(value) => form.setFieldsValue({ 
                npcPromptTemplate: {
                  ...form.getFieldValue('npcPromptTemplate'),
                  template: value
                }
              })}
              placeholder="提示词模板，指导AI如何回应输入内容"
              minHeight="100px"
              variables={variables}
              currentTaskName={currentTaskName}
            />
          </div>
        </Form.Item>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button 
            size="small" 
            type="default" 
            icon={<SyncOutlined />}
            onClick={async () => {
              const currentTemplate = form.getFieldValue(['npcPromptTemplate', 'template']);
              if (!currentTemplate) return;
              
              try {
                // 导入updateVariableIdentifiers函数
                const { updateVariableIdentifiers } = await import('../../utils/VariableResolver');
                
                // 更新所有变量标识符
                const updatedTemplate = await updateVariableIdentifiers(currentTemplate);
                
                // 如果内容有变化，更新表单和编辑器
                if (updatedTemplate !== currentTemplate) {
                  // 更新表单值
                  form.setFieldsValue({
                    npcPromptTemplate: {
                      ...form.getFieldValue('npcPromptTemplate'),
                      template: updatedTemplate
                    }
                  });
                  
                  // 更新编辑器内容
                  promptEditorRef.current?.updateContent(updatedTemplate);
                  
                  message.success('变量标识符已更新', 1);
                } else {
                  message.info('所有变量标识符已是最新状态', 1);
                }
              } catch (error) {
                console.error('更新变量标识符失败:', error);
                message.error('更新变量标识符失败', 1);
              }
            }}
            title="更新变量标识符"
          >
            更新标识符
          </Button>
          <Button 
            size="small" 
            type="default" 
            icon={<UndoOutlined />}
            onClick={() => {
              const npcId = form.getFieldValue('npcId');
              if (npcId) {
                const selectedNpc = npcs.find(npc => npc.id === npcId);
                if (selectedNpc) {
                  // 传递NPC ID以生成包含ID的标识符
                  const defaultTemplate = generateDefaultTemplate(selectedNpc.name, selectedNpc.id);
                  // 更新表单值 - 设置isCustomized为false表示这是默认模板
                  form.setFieldsValue({
                    npcPromptTemplate: {
                      template: defaultTemplate,
                      isCustomized: false
                    }
                  });
                  // 直接更新编辑器内容
                  promptEditorRef.current?.updateContent(defaultTemplate);
                }
              }
            }}
          >
            重置为默认
          </Button>
          <Button 
            size="small" 
            type="primary" 
            icon={<SaveOutlined />}
            onClick={handleSaveTemplate}
            disabled={!selectedNpcId}
          >
            保存模板
          </Button>
        </div>
      </Collapse.Panel>
    </Collapse>
  );
};

export default PromptTemplateEditor;
