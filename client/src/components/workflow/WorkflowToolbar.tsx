import React from 'react';
import { Space, Divider } from 'antd';
import { SaveWorkflowPhase } from '../../services/workflowService';
import BackButton from './toolbar/BackButton';
import WorkflowNameEditor from './toolbar/WorkflowNameEditor';
import UseWorkflowButton from './toolbar/UseWorkflowButton';
import SaveButton from './toolbar/SaveButton';
// 已删除白色保存按钮的导入

interface WorkflowToolbarProps {
  name: string;
  isEditingName: boolean;
  setName: (name: string) => void;
  setIsEditingName: (isEditing: boolean) => void;
  onBack: () => void;
  onSave: () => void;
  onUse: () => void;
  onExit: () => void;
  toggleCardPanel: () => void;
  cardPanelVisible: boolean;
  loading?: boolean;
  isNewWorkflow?: boolean;
  savePhase?: SaveWorkflowPhase;
  saveMessage?: string;
}

/**
 * 工作流编辑器工具栏组件
 * 包含工作栏上的按钮和操作，已模块化拆分
 */
const WorkflowToolbar: React.FC<WorkflowToolbarProps> = ({
  name,
  isEditingName,
  setName,
  setIsEditingName,
  onBack, 
  onSave,
  onUse,
  onExit,
  toggleCardPanel,
  cardPanelVisible,
  loading = false,
  isNewWorkflow = false,
  savePhase,
  saveMessage
}) => {
  return (
    <div style={{ background: 'white' }}>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {/* 返回按钮 */}
            <BackButton onClick={onExit} />
            
            {/* 名称编辑器 */}
            <WorkflowNameEditor 
              name={name}
              isEditingName={isEditingName}
              isNewWorkflow={isNewWorkflow}
              setName={setName}
              setIsEditingName={setIsEditingName}
            />
          </div>
          
          <Space>
            {/* 使用工作流按钮 - 只负责跳转 */}
            <UseWorkflowButton 
              onClick={onUse}
              disabled={loading}
            />
            
            {/* 保存按钮 */}
            <SaveButton 
              onClick={onSave}
              loading={loading}
              savePhase={savePhase}
              saveMessage={saveMessage}
            />
          </Space>
        </div>
        <Divider style={{ margin: '12px 0 0' }} />
      </Space>
    </div>
  );
};

export default WorkflowToolbar;
