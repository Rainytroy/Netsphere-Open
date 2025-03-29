/**
 * 节点配置组件接口
 * 所有节点配置组件共享的Props定义
 */
export interface NodeConfigProps {
  nodeId: string;
  initialConfig: any;
  onSave: (nodeId: string, config: any) => void;
}
