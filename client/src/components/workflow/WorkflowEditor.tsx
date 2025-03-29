import React, { useCallback, useRef, useState } from 'react';
import { Button, Card, message, Modal } from 'antd';
import CardSelector from './CardSelector';
import FlowCanvas from './FlowCanvas';
import { Workflow, CreateWorkflowParams } from '../../services/workflowService';
import WorkflowToolbar from './WorkflowToolbar';
import { WorkflowEditorProvider, useWorkflowEditor } from './WorkflowEditorContext';
import { defaultProcessCards } from './defaultCards';

interface WorkflowEditorProps {
  workflow?: Workflow;
  onSave: (data: CreateWorkflowParams) => Promise<void>;
  onBack: () => void;
  onUse?: () => void;
  loading?: boolean;
}

/**
 * 工作流编辑器内部内容组件
 * 使用上下文提供的状态和函数
 */
const WorkflowEditorContent: React.FC<WorkflowEditorProps> = ({
  workflow,
  onSave,
  onBack,
  onUse,
  loading = false
}) => {
  const {
    name,
    setName,
    isEditingName,
    setIsEditingName,
    cardPanelVisible,
    toggleCardPanel,
    nodes,
    edges,
    handleNodesChange,
    handleEdgesChange,
    handleCardSelect,
    prepareFormData,
    selectedCardCounts,
    taskCards,
    saveWorkflow
  } = useWorkflowEditor();

  // 处理保存
  const handleSave = async () => {
    try {
      const data = prepareFormData();
      await onSave(data);
      // 移除成功提示，由页面组件处理
    } catch (error) {
      console.error('[WorkflowEditor] 保存工作流失败:', error);
      message.error('保存失败，请重试');
    }
  };

  // 创建Modal实例
  const [modal, contextHolder] = Modal.useModal();
  // 保存Modal引用以便控制它的状态
  const modalRef = useRef<any>(null);
  // 保存按钮加载状态
  const [saveLoading, setSaveLoading] = useState(false);
  
  // 处理退出和返回
  const handleExitOrBack = () => {
    // 创建并保存Modal实例引用
    const instance = modal.confirm({
      title: '退出工作流编辑器',
      content: '请选择退出方式',
      okText: saveLoading ? '保存中...' : '保存并退出',
      cancelText: '直接退出',
      okButtonProps: { 
        type: 'primary',
        loading: saveLoading,
        disabled: saveLoading
      },
      cancelButtonProps: { 
        type: 'default',
        disabled: saveLoading 
      },
      onOk: async () => {
        // 阻止Modal自动关闭
        return new Promise(async (resolve, reject) => {
          try {
            // 设置保存按钮为加载状态
            setSaveLoading(true);
            // 更新Modal按钮状态
            instance.update({
              okButtonProps: {
                loading: true,
                disabled: true
              },
              okText: '保存中...',
              cancelButtonProps: {
                disabled: true
              }
            });
            
            // 保存工作流
            const data = prepareFormData();
            await onSave(data);
            
            // 更新按钮文本，表示已保存成功
            instance.update({
              okText: '保存成功!',
              okButtonProps: {
                loading: false,
                disabled: true
              }
            });
            
            // 延迟500ms后自动关闭弹窗并退出
            setTimeout(() => {
              // 关闭弹窗
              instance.destroy();
              // 返回列表页
              onBack();
              // 重置状态
              setSaveLoading(false);
            }, 500);
          } catch (error) {
            console.error('[WorkflowEditor] 保存并退出失败:', error);
            message.error('保存失败，请重试');
            // 恢复按钮状态
            instance.update({
              okButtonProps: {
                loading: false,
                disabled: false
              },
              okText: '保存并退出',
              cancelButtonProps: {
                disabled: false
              }
            });
            setSaveLoading(false);
            // 允许Modal可关闭
            resolve(undefined);
          }
        });
      },
      onCancel: () => {
        if (!saveLoading) {
          // 直接退出不保存
          onBack();
        }
      },
      // 添加一个自定义按钮用于关闭弹窗
      closeIcon: true
    });
    
    // 保存Modal引用
    modalRef.current = instance;
  };

  // 处理使用
  const handleUse = () => {
    if (onUse) {
      onUse();
    } else {
      message.info('使用功能尚未实现');
    }
  };

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: '100%', 
      overflow: 'hidden',
      background: 'white',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Modal上下文提供器 */}
      {contextHolder}
      {/* 工具栏 */}
      <WorkflowToolbar
        name={name}
        isEditingName={isEditingName}
        setName={setName}
        setIsEditingName={setIsEditingName}
        onBack={handleExitOrBack}  // 将onBack也改为使用handleExitOrBack，这样返回按钮也会显示确认对话框
        onSave={handleSave}
        onUse={handleUse}
        onExit={handleExitOrBack}
        toggleCardPanel={toggleCardPanel}
        cardPanelVisible={cardPanelVisible}
        loading={loading}
        isNewWorkflow={!workflow}
      />
      
      {/* 主编辑区域 */}
      <div style={{ 
        position: 'relative', 
        flex: 1,
        overflow: 'hidden',
      }}>
        {/* 基础层 - 画布 */}
        <div style={{ 
          width: '100%',
          height: '100%',
          zIndex: 1
        }}>
          <FlowCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onSaveWorkflow={saveWorkflow}
          />
        </div>
        
        {/* 悬浮层 - 卡片选择区域 */}
        {cardPanelVisible && (
          <div style={{ 
            position: 'absolute',
            top: 24,
            left: 24,
            width: 300, 
            height: 'calc(100% - 48px)', // 减去上下边距
            background: 'white',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
            borderRadius: '0 8px 8px 0',
            zIndex: 5,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Card
              bordered={false}
              style={{ 
                height: '100%',
                boxShadow: 'none', // 无阴影
                display: 'flex',
                flexDirection: 'column'
              }}
              bodyStyle={{ 
                padding: '24px',
                flex: 1, 
                overflow: 'auto'
              }}
            >
              <CardSelector 
                onCardSelect={handleCardSelect}
                processCards={defaultProcessCards.map(card => ({
                  ...card,
                  usageCount: selectedCardCounts[card.id] || 0
                }))}
                taskCards={taskCards.map(card => ({
                  ...card,
                  usageCount: selectedCardCounts[card.id] || 0
                }))}
              />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * 工作流编辑器组件
 * 集成卡片选择器和流程画布，提供工作流编辑功能
 */
const WorkflowEditor: React.FC<WorkflowEditorProps> = (props) => {
  return (
    <WorkflowEditorProvider workflow={props.workflow} onSave={props.onSave}>
      <WorkflowEditorContent {...props} />
    </WorkflowEditorProvider>
  );
};

export default WorkflowEditor;
