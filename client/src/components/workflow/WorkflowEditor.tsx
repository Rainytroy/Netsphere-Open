import React, { useCallback, useRef, useState } from 'react';
import { Button, Card, message, Modal } from 'antd';
import { MenuUnfoldOutlined } from '@ant-design/icons';
import CardSelector from './CardSelector';
import FlowCanvas from './FlowCanvas';
import { Workflow, CreateWorkflowParams } from '../../services/workflowService';
import WorkflowToolbar from './WorkflowToolbar';
import { WorkflowEditorProvider, useWorkflowEditor, CardPanelMode } from './WorkflowEditorContext';
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
    description,
    setDescription,
    isEditingName,
    setIsEditingName,
    cardPanelVisible,
    toggleCardPanel,
    cardPanelMode,
    setCardPanelMode,
    nodes,
    edges,
    handleNodesChange,
    handleEdgesChange,
    handleCardSelect,
    prepareFormData,
    selectedCardCounts,
    taskCards,
    saveWorkflow,
    savePhase,
    saveMessage
  } = useWorkflowEditor();

  // 处理卡片面板收起
  const handleCollapsePanel = () => {
    setCardPanelMode(CardPanelMode.MINIMIZED);
  };
  
  // 处理最小化卡片面板展开
  const handleExpandPanel = () => {
    setCardPanelMode(CardPanelMode.EXPANDED);
  };

  // 处理保存 - 使用Context中的prepareFormData方法，该方法已移除description参数
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
  
  // 处理退出和返回 - 自动保存并返回
  const handleExitOrBack = async () => {
    try {
      // 保存工作流 - 使用Context中的prepareFormData方法
      const data = prepareFormData();
      await onSave(data);
      
      // 保存后直接返回列表页
      onBack();
    } catch (error) {
      console.error('[WorkflowEditor] 保存并退出失败:', error);
      message.error('保存失败，请重试');
    }
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
        onSave={saveWorkflow} // 使用Context中的saveWorkflow，它会更新保存状态
        onUse={handleUse}
        onExit={handleExitOrBack}
        toggleCardPanel={toggleCardPanel}
        cardPanelVisible={cardPanelVisible}
        loading={loading}
        isNewWorkflow={!workflow}
        savePhase={savePhase} // 传递保存阶段状态
        saveMessage={saveMessage} // 传递保存消息
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
            // 添加编辑器状态更新函数
            onUpdateEditorState={(field: string, value: any) => {
              console.log(`[WorkflowEditor] 更新编辑器状态 ${field}:`, value);
              
              // 根据字段类型调用相应的更新函数
              switch (field) {
                case 'name':
                  if (typeof value === 'string') {
                    setName(value);
                  }
                  break;
                  
                case 'description':
                  // 这是由起点卡编辑时更新的
                  // 使用context中的setDescription函数
                  if (typeof setDescription === 'function') {
                    console.log('[WorkflowEditor] 使用setDescription更新description值:', value);
                    setDescription(value);
                  } else {
                    console.warn('[WorkflowEditor] setDescription函数不可用，无法更新description');
                  }
                  break;
                  
                default:
                  console.warn(`[WorkflowEditor] 未知的状态字段: ${field}`);
              }
            }}
          />
        </div>
        
        {/* 悬浮层 - 卡片选择区域 */}
        {cardPanelMode === CardPanelMode.EXPANDED && (
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
                onCollapse={handleCollapsePanel}
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
        
        {/* 最小化后的卡片面板按钮 */}
        {cardPanelMode === CardPanelMode.MINIMIZED && (
          <div 
            style={{ 
              position: 'absolute',
              top: 24,
              left: 24,
              background: 'white',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
              borderRadius: '0 8px 8px 0',
              zIndex: 5,
              padding: '12px',
              cursor: 'pointer'
            }}
            onClick={handleExpandPanel}
            title="展开卡片选择器"
          >
            <MenuUnfoldOutlined style={{ fontSize: '20px' }} />
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
