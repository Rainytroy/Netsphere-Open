import * as React from 'react';
import { useEffect, useState } from 'react';
import { Form, Button, Collapse, message, Typography, Spin } from 'antd';
import createLogger from '../../utils/logger';
import { UndoOutlined, SaveOutlined, SyncOutlined } from '@ant-design/icons';
import VexPromptEditor, { VexPromptEditorRef } from './VexPromptEditor';
import { NpcPromptTemplate } from '../../services/workTaskService';
import { convertToSystemIdentifiers, generateDefaultTemplate } from '../../utils/templateUtils';

const { Text } = Typography;

// 创建日志实例
const logger = createLogger('PromptTemplateManager');

interface PromptTemplateManagerProps {
  selectedNpcId: string;
  selectedNpcName: string;
  npcs: any[];
  promptEditorRef: React.RefObject<VexPromptEditorRef>;
  form: any;  // Form实例
  npcTemplates: Record<string, NpcPromptTemplate>;
  setNpcTemplates: React.Dispatch<React.SetStateAction<Record<string, NpcPromptTemplate>>>;
  activeCollapseKeys: string[];
  setActiveCollapseKeys: React.Dispatch<React.SetStateAction<string[]>>;
  variables: any[];
  currentTaskName: string;
  // 新增：持久化保存函数（可选）
  saveTemplateToDatabase?: (taskId: string, templates: Record<string, NpcPromptTemplate>) => Promise<void>;
  // 新增：工作任务ID（用于持久化，可选）
  taskId?: string;
}

/**
 * 提示词模板管理器组件
 * 负责NPC提示词模板的展示、编辑、保存和重置
 */
const PromptTemplateManager: React.FC<PromptTemplateManagerProps> = ({
  selectedNpcId,
  selectedNpcName,
  npcs,
  promptEditorRef,
  form,
  npcTemplates,
  setNpcTemplates,
  activeCollapseKeys,
  setActiveCollapseKeys,
  variables,
  currentTaskName,
  saveTemplateToDatabase,
  taskId
}) => {
  // 编辑器实例挂载状态
  const [templateEditorMounted, setTemplateEditorMounted] = useState<boolean>(false);
  
  // 持久化保存状态
  const [savingToDb, setSavingToDb] = useState<boolean>(false);

  // 监听编辑器实例挂载
  useEffect(() => {
    // 定时检查编辑器实例是否可用
    const checkTemplateEditorInterval = setInterval(() => {
      if (promptEditorRef.current) {
        setTemplateEditorMounted(true);
        clearInterval(checkTemplateEditorInterval);
        logger.info('模板编辑器实例已挂载');
      }
    }, 100); // 每100ms检查一次

    // 清理函数
    return () => {
      clearInterval(checkTemplateEditorInterval);
    };
  }, []); // 只在组件挂载时执行一次

  // 当组件挂载或NPC ID变化时确保编辑器内容更新，使用延迟初始化
  useEffect(() => {
    // 确保编辑器已挂载且有模板内容，且NPC数据已加载完成
    if (templateEditorMounted && selectedNpcId && npcs.length > 0) {
      const currentTemplate = form.getFieldValue(['npcPromptTemplate', 'template']);
      if (currentTemplate) {
        // 使用延迟执行，确保编辑器内部状态已完全初始化
        setTimeout(() => {
          try {
            // 先将模板转换为系统标识符格式
            logger.info('初始化模板编辑器内容，进行系统标识符转换');
            const convertedTemplate = convertToSystemIdentifiers(currentTemplate, npcs);
            
            if (convertedTemplate !== currentTemplate) {
              logger.info('模板内容已转换为系统标识符格式');
              // 更新表单值
              form.setFieldsValue({
                npcPromptTemplate: {
                  ...form.getFieldValue('npcPromptTemplate'),
                  template: convertedTemplate
                }
              });
            }
            
            if (promptEditorRef.current) {
              promptEditorRef.current.parseExternalContent(convertedTemplate);
              logger.info('模板编辑器内容初始化成功');
            }
          } catch (error) {
            logger.error('初始化模板编辑器内容失败:', error);
          }
        }, 300); // 延迟300ms执行，确保编辑器已完全准备好
      }
    }
  }, [templateEditorMounted, selectedNpcId, form, npcs]);
  

  // 保存当前NPC的模板
  const handleSaveTemplate = async () => {
    if (!selectedNpcId) return;
    
    // 获取原始模板文本
    let template = form.getFieldValue(['npcPromptTemplate', 'template']) || '';
    
    // 转换为系统标识符格式
    logger.debug('原始模板:', template);
    template = convertToSystemIdentifiers(template, npcs);
    logger.debug('转换后模板:', template);
    
    // 创建模板对象，添加时间戳
    const templateObj = {
      template,
      isCustomized: true,
      lastModified: new Date().toISOString()
    };
    
    // 更新模板缓存
    setNpcTemplates(prev => ({
      ...prev,
      [selectedNpcId]: templateObj
    }));
    
    // 更新表单值，标记为自定义
    form.setFieldsValue({
      npcPromptTemplate: {
        template,
        isCustomized: true
      }
    });
    
    // 如果提供了持久化函数和任务ID，执行自动持久化
    if (saveTemplateToDatabase && taskId) {
      try {
        // 更新后的所有模板
        const updatedTemplates = {
          ...npcTemplates,
          [selectedNpcId]: templateObj
        };
        
        // 调用持久化函数
        await saveTemplateToDatabase(taskId, updatedTemplates);
        message.success('模板已保存并同步到数据库');
      } catch (error) {
        logger.error('同步模板到数据库失败:', error);
        message.warning('模板已保存到本地，但同步到数据库失败');
      }
    } else {
      message.success('模板已保存');
    }
  };

  // 重置模板为默认
  const handleResetTemplate = async () => {
    try {
      if (!selectedNpcId) {
        message.warning('请先选择NPC');
        return;
      }
      
      const selectedNpc = npcs.find(npc => npc.id === selectedNpcId);
      if (!selectedNpc) {
        message.warning('找不到选定的NPC');
        return;
      }
      
      // 生成带ID的默认模板
      const defaultTemplate = await generateDefaultTemplate(selectedNpc.name, selectedNpc.id);
      
      // 更新表单值 - 设置isCustomized为false
      form.setFieldsValue({
        npcPromptTemplate: {
          template: defaultTemplate,
          isCustomized: false
        }
      });
      
      // 更新编辑器内容，使用parseExternalContent解析变量标记
      if (promptEditorRef.current) {
        promptEditorRef.current.parseExternalContent(defaultTemplate);
      }
      
      // 从缓存中移除该NPC的自定义模板
      const updatedTemplates = {...npcTemplates};
      delete updatedTemplates[selectedNpcId];
      
      // 更新状态
      setNpcTemplates(updatedTemplates);
      
      // 如果提供了持久化函数和任务ID，同步更新到数据库
      if (saveTemplateToDatabase && taskId) {
        try {
          await saveTemplateToDatabase(taskId, updatedTemplates);
          message.success('已恢复默认提示词模板并同步到数据库');
        } catch (error) {
          logger.error('同步模板重置到数据库失败:', error);
          message.warning('已恢复默认提示词模板，但同步到数据库失败');
        }
      } else {
        message.success('已恢复默认提示词模板');
      }
    } catch (error) {
      logger.error("重置为默认模板操作失败:", error);
      message.error("重置模板失败，请刷新页面重试");
    }
  };
  
  // 持久化保存模板到数据库
  const persistTemplates = async () => {
    // 如果没有持久化函数或任务ID，则不执行
    if (!saveTemplateToDatabase || !taskId) return;
    
    try {
      setSavingToDb(true);
      await saveTemplateToDatabase(taskId, npcTemplates);
      message.success('模板已持久化保存到数据库');
    } catch (error) {
      logger.error('持久化保存模板失败:', error);
      message.error('保存到数据库失败，请重试');
    } finally {
      setSavingToDb(false);
    }
  };

  return (
    <Collapse 
      ghost 
      activeKey={activeCollapseKeys}
      onChange={(keys) => setActiveCollapseKeys(keys as string[])}
      style={{ marginBottom: 16, border: '1px solid #e8e8e8', borderRadius: 4, backgroundColor: '#F5F5F5' }}
    >
      <Collapse.Panel 
        header={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div>
              <Text strong>NPC提示词控制</Text>
              {!selectedNpcId && <Text type="secondary" style={{ marginLeft: 8 }}>(请先选择NPC)</Text>}
            </div>
            {npcTemplates[selectedNpcId]?.isCustomized && (
              <Text type="success" style={{ fontSize: '12px' }}>已自定义</Text>
            )}
          </div>
        } 
        key="promptControl"
      >
        <Form.Item
          name={['npcPromptTemplate', 'template']}
        >
          <div className="prompt-editor-container" style={{ position: 'relative' }}>
            {!selectedNpcId && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                pointerEvents: 'none', // 允许点击穿透到下层
              }}>
                <Text type="secondary" style={{ fontSize: '14px' }}>请先在上方选择NPC后再编辑提示词</Text>
              </div>
            )}
            <VexPromptEditor
              ref={promptEditorRef}
              readOnly={!selectedNpcId} // 如果没有选择NPC则禁用编辑器
              defaultValue={form.getFieldValue(['npcPromptTemplate', 'template']) || ''}
            onChange={(value: string) => {
              // 使用富文本内容获取rawText
              if (promptEditorRef.current) {
                const richContent = promptEditorRef.current.getRichContent();
                // 只存储rawText到表单，用于后端API
                form.setFieldsValue({ 
                  npcPromptTemplate: {
                    ...form.getFieldValue('npcPromptTemplate'),
                    template: richContent.rawText
                  }
                });
              } else {
                // 降级处理，直接使用编辑器值
                form.setFieldsValue({ 
                  npcPromptTemplate: {
                    ...form.getFieldValue('npcPromptTemplate'),
                    template: value
                  }
                });
              }
            }}
            placeholder="提示词模板，指导AI如何回应输入内容"
            minHeight="120px"
            variables={variables}
            currentTaskName={currentTaskName}
            npcs={npcs} // 添加npcs数组，用于标识符转换
          />
          </div>
        </Form.Item>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {saveTemplateToDatabase && taskId && (
              <Button 
                size="small" 
                type="default" 
                icon={savingToDb ? <SyncOutlined spin /> : <SyncOutlined />}
                onClick={persistTemplates}
                disabled={!selectedNpcId || savingToDb}
                loading={savingToDb}
              >
                同步到数据库
              </Button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button 
              size="small" 
              type="default" 
              icon={<UndoOutlined />}
              onClick={handleResetTemplate}
              disabled={!selectedNpcId}
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
        </div>
      </Collapse.Panel>
    </Collapse>
  );
};

export default PromptTemplateManager;
