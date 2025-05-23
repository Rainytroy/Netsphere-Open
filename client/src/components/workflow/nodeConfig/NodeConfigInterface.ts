/**
 * 节点配置组件接口
 * 所有节点配置组件共享的Props定义
 */
export interface NodeConfigProps {
  nodeId: string;
  initialConfig: any;
  onSave: (nodeId: string, config: any) => void;
  // 可选的编辑器状态更新回调
  updateEditorState?: (field: string, value: any) => void;
  // 可选的工作流保存回调
  saveWorkflow?: () => Promise<void>;
}
