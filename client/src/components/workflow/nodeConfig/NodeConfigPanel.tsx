import React, { useState } from 'react';
import { Modal, Typography, Button, Spin, message } from 'antd';
import { Node } from 'reactflow';
import StartNodeConfig from './StartNodeConfig';
import WorkTaskNodeConfig from './WorkTaskNodeConfig';
import AssignmentNodeConfig from './AssignmentNodeConfig';
import LoopNodeConfig from './LoopNodeConfig';
import DisplayNodeConfig from './DisplayNodeConfig';

const { Title } = Typography;

export interface NodeConfigPanelProps {
  node: Node | null;
  visible: boolean;
  onClose: () => void;
  onSave: (nodeId: string, config: any) => void;
  onDelete?: (nodeId: string) => void; // 新增删除节点的回调
  loading?: boolean;
  // 新增工作流相关属性，用于同步更新工作流编辑器状态
  workflowContext?: any; // 工作流编辑器上下文
  saveWorkflow?: () => Promise<void>; // 工作流保存方法
  updateEditorState?: (field: string, value: any) => void; // 更新编辑器状态
}

/**
 * 节点配置面板组件
 * 根据节点类型显示不同的配置表单
 */
const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({
  node,
  visible,
  onClose,
  onSave,
  onDelete,
  loading = false,
  workflowContext,
  saveWorkflow,
  updateEditorState
}) => {
  // 记录弹窗打开状态和保存状态
  const [isModalFullyOpen, setIsModalFullyOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // 处理弹窗打开状态变化
  const handleAfterOpenChange = (open: boolean) => {
    console.log('[NodeConfigPanel] Modal open state changed:', open);
    setIsModalFullyOpen(open);
    if (!open) {
      // 确保在关闭弹窗时重置保存状态
      setIsSaving(false);
    }
  };
  
  // 处理节点配置保存
  const handleSave = async (nodeId: string, config: any) => {
    try {
      // 设置保存状态为加载中
      setIsSaving(true);
      
      // 调用保存回调
      onSave(nodeId, config);

      // 显示保存成功的消息 - 确保node不为null
      if (!node) return;
      
      const nodeType = node.type || '未知';
      let nodeTypeName = '节点';
      switch (nodeType) {
        case 'start': nodeTypeName = '起点卡'; break;
        case 'worktask': nodeTypeName = '工作任务卡'; break;
        case 'assign': nodeTypeName = '赋值卡'; break;
        case 'loop': nodeTypeName = '循环卡'; break;
        case 'display': nodeTypeName = '展示卡'; break;
      }
      
      // 针对起点卡的特殊处理 - 同步更新工作流上下文中的描述
      if (nodeType === 'start' && updateEditorState && config.promptText) {
        console.log('[NodeConfigPanel] 更新工作流编辑器中的description状态:', config.promptText);
        updateEditorState('description', config.promptText);
      }
      
      // 移除: 自动保存整个工作流的逻辑
      // 不再调用saveWorkflow，避免触发全局状态更新
      
      // 使用消息提示 - 修改提示信息
      const successMsg = `${nodeTypeName}配置已保存`;
      message.success(successMsg);
    } catch (error) {
      console.error('[NodeConfigPanel] 保存出错:', error);
      message.error('保存失败，请检查控制台错误信息');
    } finally {
      // 短暂延迟后关闭面板
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 500); // 短暂延迟以保证用户看到保存成功的反馈
    }
  };
  
  if (!node) {
    return null;
  }

  // 根据节点类型选择对应的配置组件
  const renderConfigComponent = () => {
    const nodeType = node.type;
    const nodeConfig = node.data?.config || {};

    switch (nodeType) {
      case 'start':
        return (
          <StartNodeConfig 
            nodeId={node.id}
            initialConfig={nodeConfig}
            onSave={handleSave}
            updateEditorState={updateEditorState}
            saveWorkflow={saveWorkflow}
          />
        );
        case 'worktask':
        return (
          <WorkTaskNodeConfig 
            nodeId={node.id}
            initialConfig={nodeConfig}
            onSave={handleSave}
            workTaskId={node.data.taskId || node.data.id} // 优先使用taskId，兼容旧版本
          />
        );
      case 'assign':
        return (
          <AssignmentNodeConfig 
            nodeId={node.id}
            initialConfig={nodeConfig}
            onSave={handleSave}
          />
        );
      case 'loop':
        return (
          <LoopNodeConfig 
            nodeId={node.id}
            initialConfig={nodeConfig}
            onSave={handleSave}
          />
        );
      case 'display':
        return (
          <DisplayNodeConfig 
            nodeId={node.id}
            initialConfig={nodeConfig}
            onSave={handleSave}
          />
        );
      default:
        return <div>暂不支持此节点类型的配置</div>;
    }
  };

  // 获取节点标题
  const getNodeTitle = () => {
    const nodeType = node.type;
    switch (nodeType) {
      case 'start': return '起点卡配置';
      case 'worktask': return '工作任务卡配置';
      case 'assign': return '赋值卡配置';
      case 'loop': return '循环卡配置';
      case 'display': return '展示卡配置';
      default: return '节点配置';
    }
  };

  // 处理节点删除
  const handleDelete = () => {
    if (onDelete && node) {
      onDelete(node.id);
      onClose(); // 关闭弹窗
    }
  };


  return (
    <Modal
      title={<Title level={4}>{getNodeTitle()}</Title>}
      open={visible}
      onCancel={onClose}
      afterOpenChange={handleAfterOpenChange}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button 
            danger 
            type="primary" 
            onClick={handleDelete}
            disabled={!onDelete || node.type === 'start'}
            title={node.type === 'start' ? '起点卡不可删除' : '删除此节点'}
          >
            删除节点
          </Button>
          <div>
            <Button onClick={onClose} style={{ marginRight: 8 }}>
              取消
            </Button>
          <Button 
            type="primary" 
            form={`node-config-form-${node.id}`} 
            htmlType="submit"
            loading={isSaving}
            disabled={isSaving}
          >
            {isSaving ? '保存中...' : '保存配置'}
          </Button>
          </div>
        </div>
      }
      width={600}
      destroyOnClose={true} // 改为true，确保每次打开都是全新的组件实例
      keyboard={false}
      maskClosable={false}
    >
      <Spin spinning={loading}>
        {renderConfigComponent()}
      </Spin>
    </Modal>
  );
};

export default NodeConfigPanel;
