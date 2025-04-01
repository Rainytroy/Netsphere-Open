import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Button, Input, Spin, Typography, Select, Space, Tooltip } from 'antd';
import { SearchOutlined, BugOutlined, ArrowLeftOutlined, RollbackOutlined } from '@ant-design/icons';
import { workflowService, Workflow } from '../../services/workflowService';
import { workflowVariableService } from '../../services/workflowVariableService';

const { TabPane } = Tabs;
const { Text, Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface WorkflowDiagnosticModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * 工作流诊断模态窗口
 * 用于诊断工作流相关问题，查看工作流数据和变量
 */
const WorkflowDiagnosticModal: React.FC<WorkflowDiagnosticModalProps> = ({ visible, onClose }) => {
  const [activeTab, setActiveTab] = useState('workflow-data');
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const [workflowDetail, setWorkflowDetail] = useState<any>(null);
  const [workflowVariables, setWorkflowVariables] = useState<any[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingVariables, setLoadingVariables] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载工作流列表
  useEffect(() => {
    if (visible) {
      fetchWorkflows();
    }
  }, [visible]);

  // 获取工作流列表
  const fetchWorkflows = async () => {
    setLoadingWorkflows(true);
    setError(null);
    try {
      const response = await workflowService.getWorkflows();
      setWorkflows(response.workflows || []);
      // 如果有工作流，默认选择第一个
      if (response.workflows && response.workflows.length > 0) {
        setSelectedWorkflowId(response.workflows[0].id);
      }
    } catch (err) {
      console.error('获取工作流列表失败:', err);
      setError('获取工作流列表失败，请重试');
    } finally {
      setLoadingWorkflows(false);
    }
  };

  // 获取工作流详情
  const fetchWorkflowDetail = async (id: string) => {
    if (!id) return;
    
    setLoadingDetail(true);
    setError(null);
    try {
      const workflow = await workflowService.getWorkflow(id);
      setWorkflowDetail(workflow);
    } catch (err) {
      console.error(`获取工作流 ${id} 详情失败:`, err);
      setError(`获取工作流详情失败，请重试`);
    } finally {
      setLoadingDetail(false);
    }
  };

  // 获取工作流变量
  const fetchWorkflowVariables = async (id: string) => {
    if (!id) return;
    
    setLoadingVariables(true);
    setError(null);
    try {
      const variables = await workflowVariableService.getWorkflowVariables(id);
      setWorkflowVariables(variables || []);
    } catch (err) {
      console.error(`获取工作流 ${id} 变量失败:`, err);
      setError(`获取工作流变量失败，请重试`);
    } finally {
      setLoadingVariables(false);
    }
  };

  // 处理工作流选择变更
  const handleWorkflowChange = (workflowId: string) => {
    setSelectedWorkflowId(workflowId);
    
    // 根据当前标签页，加载相应数据
    if (activeTab === 'workflow-data') {
      fetchWorkflowDetail(workflowId);
    } else if (activeTab === 'variable-data') {
      fetchWorkflowVariables(workflowId);
    }
  };

  // 处理标签页切换
  const handleTabChange = (key: string) => {
    setActiveTab(key);
    
    // 如果有选中的工作流，根据标签页加载相应数据
    if (selectedWorkflowId) {
      if (key === 'workflow-data') {
        fetchWorkflowDetail(selectedWorkflowId);
      } else if (key === 'variable-data') {
        fetchWorkflowVariables(selectedWorkflowId);
      }
    }
  };

  // 查找描述变量（如果存在）
  const getDescriptionVariable = () => {
    return workflowVariables.find(v => 
      v.identifier && v.identifier.endsWith('.description')
    );
  };

      // 格式化JSON显示
      const formatJSON = (data: any) => {
        try {
          return JSON.stringify(data, null, 2);
        } catch (e) {
          return String(data);
        }
      };
      
      // 尝试解析JSON字符串
      const parseJSON = (jsonString: string) => {
        try {
          return JSON.parse(jsonString);
        } catch (e) {
          console.error('JSON解析失败:', e);
          return null;
        }
      };
      
      // 获取节点数据列表
      const getNodesList = () => {
        if (!workflowDetail?.metadata?.nodes) return [];
        
        // 如果nodes是字符串，尝试解析
        if (typeof workflowDetail.metadata.nodes === 'string') {
          const parsed = parseJSON(workflowDetail.metadata.nodes);
          return Array.isArray(parsed) ? parsed : [];
        }
        
        // 如果已经是数组就直接返回
        if (Array.isArray(workflowDetail.metadata.nodes)) {
          return workflowDetail.metadata.nodes;
        }
        
        return [];
      };
      
      const nodesList = getNodesList();

  const descriptionVar = getDescriptionVariable();

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            type="text" 
            onClick={onClose}
            style={{ marginRight: 8 }}
          />
          <span>工作流诊断工具</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      style={{ top: 20 }}
      bodyStyle={{ padding: '16px 24px' }}
    >
      <Spin spinning={loadingWorkflows}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>
            <Text strong>选择工作流:</Text>
          </div>
          <Select
            placeholder="选择要诊断的工作流"
            style={{ width: '100%' }}
            value={selectedWorkflowId}
            onChange={handleWorkflowChange}
            disabled={loadingWorkflows}
          >
            {workflows.map(workflow => (
              <Option key={workflow.id} value={workflow.id}>
                {workflow.name}
              </Option>
            ))}
          </Select>
        </div>

        {error && (
          <div style={{ 
            padding: '8px 12px', 
            backgroundColor: '#fff2f0', 
            border: '1px solid #ffccc7', 
            borderRadius: 4,
            marginBottom: 16 
          }}>
            <Text type="danger">{error}</Text>
          </div>
        )}

        <Tabs activeKey={activeTab} onChange={handleTabChange}>
          <TabPane tab="工作流数据" key="workflow-data">
            <Spin spinning={loadingDetail}>
              {workflowDetail ? (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <Title level={5}>数据库字段</Title>
                    <div style={{ padding: 8, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#e6f7ff' }}>
                            <th style={{ padding: 8, textAlign: 'left', border: '1px solid #ddd' }}>字段名称</th>
                            <th style={{ padding: 8, textAlign: 'left', border: '1px solid #ddd' }}>数据库字段</th>
                            <th style={{ padding: 8, textAlign: 'left', border: '1px solid #ddd' }}>值</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}><Text strong>ID</Text></td>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}><Text code>id</Text></td>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}>{workflowDetail.id}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}><Text strong>名称</Text></td>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}><Text code>name</Text></td>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}>{workflowDetail.name}</td>
                          </tr>
                          <tr>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}><Text strong>描述</Text></td>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}><Text code>description</Text></td>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}>
                              <Text type="secondary">长度: {workflowDetail.description ? workflowDetail.description.length : 0}字符</Text>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}><Text strong>状态</Text></td>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}><Text code>isActive</Text></td>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}>
                              {workflowDetail.isActive ? (
                                <Text type="success">已启用 (true)</Text>
                              ) : (
                                <Text type="warning">未启用 (false)</Text>
                              )}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}><Text strong>元数据</Text></td>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}><Text code>metadata</Text></td>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}>
                              <Text type="secondary">JSON对象，见下方详情</Text>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}><Text strong>创建时间</Text></td>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}><Text code>createdAt</Text></td>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}>
                              {new Date(workflowDetail.createdAt).toLocaleString()}
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}><Text strong>更新时间</Text></td>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}><Text code>updatedAt</Text></td>
                            <td style={{ padding: 8, border: '1px solid #ddd' }}>
                              {new Date(workflowDetail.updatedAt).toLocaleString()}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: 16 }}>
                    <Title level={5}>描述内容 (<Text code>description</Text>)</Title>
                    <TextArea
                      value={workflowDetail.description || '(无描述)'}
                      autoSize={{ minRows: 3, maxRows: 6 }}
                      readOnly
                      style={{ marginBottom: 8 }}
                    />
                    <div>
                      <Text type="secondary">该字段存储在数据库 <Text code>workflows</Text> 表的 <Text code>description</Text> 列中，同时也会同步到变量系统</Text>
                    </div>
                  </div>
                  
                  {workflowDetail.metadata && (
                    <div>
                      <Title level={5}>元数据 (<Text code>metadata</Text>)</Title>
                      <div style={{ marginBottom: 8 }}>
                        <Text type="secondary">存储在数据库 <Text code>workflows</Text> 表的 <Text code>metadata</Text> 列中，类型为 <Text code>simple-json</Text></Text>
                      </div>
                      
                      {workflowDetail.metadata.nodes && (
                        <div style={{ marginBottom: 16 }}>
                          <Title level={5} style={{ fontSize: 14, margin: '8px 0' }}>节点数据 (<Text code>metadata.nodes</Text>)</Title>
                          <div style={{ marginBottom: 8 }}>
                            <Text type="secondary">包含了 {nodesList.length} 个节点的配置信息</Text>
                          </div>
                          <TextArea
                            value={workflowDetail.metadata.nodes}
                            autoSize={{ minRows: 3, maxRows: 6 }}
                            readOnly
                            style={{ marginBottom: 8 }}
                          />
                        </div>
                      )}
                      
                      {workflowDetail.metadata.edges && (
                        <div style={{ marginBottom: 16 }}>
                          <Title level={5} style={{ fontSize: 14, margin: '8px 0' }}>连接数据 (<Text code>metadata.edges</Text>)</Title>
                          <TextArea
                            value={workflowDetail.metadata.edges}
                            autoSize={{ minRows: 3, maxRows: 6 }}
                            readOnly
                            style={{ marginBottom: 8 }}
                          />
                        </div>
                      )}
                      
                      <Title level={5} style={{ fontSize: 14, margin: '8px 0' }}>完整元数据</Title>
                      <TextArea
                        value={formatJSON(workflowDetail.metadata)}
                        autoSize={{ minRows: 5, maxRows: 10 }}
                        readOnly
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  {selectedWorkflowId ? '加载中...' : '请选择工作流'}
                </div>
              )}
            </Spin>
          </TabPane>
          
          <TabPane tab="节点详情" key="node-details">
            <Spin spinning={loadingDetail}>
              {workflowDetail && nodesList.length > 0 ? (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <Title level={5}>工作流节点列表</Title>
                    <div style={{ marginBottom: 8 }}>
                      <Text type="secondary">共 {nodesList.length} 个节点</Text>
                    </div>
                    
                    {nodesList.map((node: any, index: number) => (
                      <div 
                        key={node.id || index}
                        style={{ 
                          marginBottom: 16, 
                          padding: 16, 
                          border: '1px solid #d9d9d9', 
                          borderRadius: 4,
                          backgroundColor: node.type === 'start' ? '#f6ffed' : '#f9f9f9' 
                        }}
                      >
                        <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Title level={5} style={{ margin: 0 }}>
                            {node.type === 'start' ? '🔰 起点卡' : node.data?.label || `节点 ${index + 1}`}
                            {node.type === 'start' && <Text type="success" style={{ marginLeft: 8 }}>(起点卡)</Text>}
                          </Title>
                          <Text code>{node.id}</Text>
                        </div>
                        
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
                          <thead>
                            <tr style={{ backgroundColor: '#e6f7ff' }}>
                              <th style={{ padding: 8, textAlign: 'left', border: '1px solid #ddd' }}>属性</th>
                              <th style={{ padding: 8, textAlign: 'left', border: '1px solid #ddd' }}>字段名</th>
                              <th style={{ padding: 8, textAlign: 'left', border: '1px solid #ddd' }}>值</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td style={{ padding: 8, border: '1px solid #ddd' }}><Text strong>节点类型</Text></td>
                              <td style={{ padding: 8, border: '1px solid #ddd' }}><Text code>type</Text></td>
                              <td style={{ padding: 8, border: '1px solid #ddd' }}>{node.type}</td>
                            </tr>
                            <tr>
                              <td style={{ padding: 8, border: '1px solid #ddd' }}><Text strong>节点ID</Text></td>
                              <td style={{ padding: 8, border: '1px solid #ddd' }}><Text code>id</Text></td>
                              <td style={{ padding: 8, border: '1px solid #ddd' }}>{node.id}</td>
                            </tr>
                            {node.data?.label && (
                              <tr>
                                <td style={{ padding: 8, border: '1px solid #ddd' }}><Text strong>节点标签</Text></td>
                                <td style={{ padding: 8, border: '1px solid #ddd' }}><Text code>data.label</Text></td>
                                <td style={{ padding: 8, border: '1px solid #ddd' }}>{node.data.label}</td>
                              </tr>
                            )}
                            {node.position && (
                              <tr>
                                <td style={{ padding: 8, border: '1px solid #ddd' }}><Text strong>位置</Text></td>
                                <td style={{ padding: 8, border: '1px solid #ddd' }}><Text code>position</Text></td>
                                <td style={{ padding: 8, border: '1px solid #ddd' }}>
                                  x: {node.position.x?.toFixed(2)}, y: {node.position.y?.toFixed(2)}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                        
                        {node.type === 'start' && node.data?.config?.promptText && (
                          <div style={{ marginBottom: 16 }}>
                            <Title level={5} style={{ fontSize: 14, margin: '8px 0' }}>提示文本 (<Text code>data.config.promptText</Text>)</Title>
                            <TextArea
                              value={node.data.config.promptText}
                              autoSize={{ minRows: 3, maxRows: 6 }}
                              readOnly
                              style={{ marginBottom: 8 }}
                            />
                            <Text type="secondary">提示文本长度: {node.data.config.promptText.length} 字符</Text>
                          </div>
                        )}
                        
                        <div>
                          <Title level={5} style={{ fontSize: 14, margin: '8px 0' }}>节点完整配置</Title>
                          <TextArea
                            value={formatJSON(node)}
                            autoSize={{ minRows: 3, maxRows: 8 }}
                            readOnly
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  {selectedWorkflowId ? '没有节点数据或正在加载中...' : '请选择工作流'}
                </div>
              )}
            </Spin>
          </TabPane>
          
          <TabPane tab="变量数据" key="variable-data">
            <Spin spinning={loadingVariables}>
              {selectedWorkflowId ? (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <Space>
                      <Button 
                        type="primary" 
                        onClick={() => fetchWorkflowVariables(selectedWorkflowId)}
                        icon={<SearchOutlined />}
                      >
                        刷新变量数据
                      </Button>
                      <Text type="secondary">共 {workflowVariables.length} 个变量</Text>
                    </Space>
                  </div>
                  
                  {descriptionVar && (
                    <div style={{ marginBottom: 16 }}>
                      <Title level={5}>描述变量 ({descriptionVar.identifier})</Title>
                      <TextArea
                        value={descriptionVar.value || '(无值)'}
                        autoSize={{ minRows: 3, maxRows: 6 }}
                        readOnly
                        style={{ marginBottom: 8 }}
                      />
                      <Text type="secondary">描述变量长度: {descriptionVar.value ? descriptionVar.value.length : 0}</Text>
                    </div>
                  )}
                  
                  <div>
                    <Title level={5}>所有变量</Title>
                    {workflowVariables.length > 0 ? (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#f5f5f5' }}>
                              <th style={{ padding: 8, textAlign: 'left', border: '1px solid #ddd' }}>标识符 <Text code>identifier</Text></th>
                              <th style={{ padding: 8, textAlign: 'left', border: '1px solid #ddd' }}>名称 <Text code>name</Text></th>
                              <th style={{ padding: 8, textAlign: 'left', border: '1px solid #ddd' }}>类型 <Text code>type</Text></th>
                              <th style={{ padding: 8, textAlign: 'left', border: '1px solid #ddd' }}>值 <Text code>value</Text></th>
                            </tr>
                          </thead>
                          <tbody>
                            {workflowVariables.map((variable, index) => (
                              <tr key={index} style={{ backgroundColor: variable.identifier?.endsWith('.description') ? '#f6ffed' : 'inherit' }}>
                                <td style={{ padding: 8, border: '1px solid #ddd' }}>{variable.identifier}</td>
                                <td style={{ padding: 8, border: '1px solid #ddd' }}>{variable.name}</td>
                                <td style={{ padding: 8, border: '1px solid #ddd' }}>{variable.type}</td>
                                <td style={{ padding: 8, border: '1px solid #ddd' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <Tooltip title={variable.value}>
                                      <Text ellipsis style={{ maxWidth: 150 }}>{variable.value || '(空)'}</Text>
                                    </Tooltip>
                                    <Text type="secondary">[{variable.value ? variable.value.length : 0}字符]</Text>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '20px 0', backgroundColor: '#f5f5f5', borderRadius: 4 }}>
                        <Text type="secondary">没有找到变量数据</Text>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  请选择工作流
                </div>
              )}
            </Spin>
          </TabPane>
          
          <TabPane tab="数据库与变量一致性" key="consistency-check">
            <Spin spinning={loadingDetail || loadingVariables}>
              {selectedWorkflowId ? (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <Space>
                      <Button 
                        type="primary" 
                        onClick={() => {
                          fetchWorkflowDetail(selectedWorkflowId);
                          fetchWorkflowVariables(selectedWorkflowId);
                        }}
                        icon={<BugOutlined />}
                      >
                        执行诊断
                      </Button>
                    </Space>
                  </div>
                  
                  {workflowDetail && workflowVariables.length > 0 && (
                    <div>
                      <Title level={5}>诊断结果</Title>
                      
                      <div style={{ padding: 16, backgroundColor: '#f9f9f9', borderRadius: 4, marginBottom: 16 }}>
                        <div style={{ marginBottom: 8 }}>
                          <Text strong>描述字段一致性:</Text>
                        </div>
                        
                        {(() => {
                          const workflowDesc = workflowDetail.description || '';
                          const varDesc = descriptionVar?.value || '';
                          const isConsistent = workflowDesc === varDesc;
                          
                          return (
                            <div>
                              <div style={{ 
                                padding: 8, 
                                backgroundColor: isConsistent ? '#f6ffed' : '#fff2f0', 
                                borderRadius: 4,
                                border: `1px solid ${isConsistent ? '#b7eb8f' : '#ffccc7'}`,
                                marginBottom: 16
                              }}>
                                <Text type={isConsistent ? 'success' : 'danger'}>
                                  {isConsistent 
                                    ? '✓ 工作流描述与变量描述一致' 
                                    : '✗ 工作流描述与变量描述不一致'}
                                </Text>
                                <div style={{ marginTop: 8 }}>
                                  <Text>
                                    数据库字段: <Text code>workflows.description</Text> 与 
                                    变量系统: <Text code>{descriptionVar?.identifier || '未找到描述变量'}</Text>
                                  </Text>
                                </div>
                              </div>
                              
                              {!isConsistent && (
                                <div>
                                  <div style={{ marginBottom: 8 }}>
                                    <Text>工作流描述 (长度: {workflowDesc.length}):</Text>
                                  </div>
                                  <TextArea
                                    value={workflowDesc || '(无描述)'}
                                    autoSize={{ minRows: 2, maxRows: 4 }}
                                    readOnly
                                    style={{ marginBottom: 16 }}
                                  />
                                  
                                  <div style={{ marginBottom: 8 }}>
                                    <Text>变量描述 (长度: {varDesc.length}):</Text>
                                  </div>
                                  <TextArea
                                    value={varDesc || '(无描述)'}
                                    autoSize={{ minRows: 2, maxRows: 4 }}
                                    readOnly
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      
                      <div style={{ marginTop: 16 }}>
                        <Title level={5}>建议操作</Title>
                        <div style={{ padding: 16, backgroundColor: '#f9f9f9', borderRadius: 4 }}>
                          <ul style={{ paddingLeft: 20, margin: 0 }}>
                              <li>
                                <Text>如果发现描述不一致，可以尝试在工作流编辑页面再次保存工作流</Text>
                              </li>
                              <li>
                                <Text>检查<Text code>StartNodeConfig.tsx</Text>组件中是否同时调用了<Text code>workflowService.updateWorkflow</Text>和<Text code>workflowVariableService.createOrUpdateWorkflowVariable</Text></Text>
                              </li>
                              <li>
                                <Text>不一致的根本原因: 起点卡内容需要同时保存到两个地方：</Text>
                                <ul>
                                  <li><Text code>workflows.description</Text> (数据库字段)</li>
                                  <li><Text code>workflow_variables</Text> 表中对应的描述变量</li>
                                </ul>
                              </li>
                          </ul>
                        </div>
                      </div>
                      
                      {nodesList.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <Title level={5}>起点卡与工作流描述一致性</Title>
                          <div style={{ padding: 16, backgroundColor: '#f9f9f9', borderRadius: 4 }}>
                            {(() => {
                              // 查找起点卡节点
                              const startNode = nodesList.find((node: any) => node.type === 'start');
                              const startNodeText = startNode?.data?.config?.promptText || '';
                              const workflowDesc = workflowDetail.description || '';
                              const isStartNodeConsistent = startNodeText === workflowDesc;
                              
                              return (
                                <div>
                                  <div style={{ 
                                    padding: 8, 
                                    backgroundColor: isStartNodeConsistent ? '#f6ffed' : '#fff2f0', 
                                    borderRadius: 4,
                                    border: `1px solid ${isStartNodeConsistent ? '#b7eb8f' : '#ffccc7'}`,
                                    marginBottom: 16
                                  }}>
                                    <Text type={isStartNodeConsistent ? 'success' : 'danger'}>
                                      {isStartNodeConsistent 
                                        ? '✓ 起点卡提示文本与工作流描述一致' 
                                        : '✗ 起点卡提示文本与工作流描述不一致'}
                                    </Text>
                                    <div style={{ marginTop: 8 }}>
                                      <Text>
                                        起点卡提示文本: <Text code>metadata.nodes[].data.config.promptText</Text> 与 
                                        数据库字段: <Text code>workflows.description</Text>
                                      </Text>
                                    </div>
                                  </div>
                                  
                                  {!isStartNodeConsistent && startNode && (
                                    <div>
                                      <div style={{ marginBottom: 8 }}>
                                        <Text>起点卡提示文本 (长度: {startNodeText.length}):</Text>
                                      </div>
                                      <TextArea
                                        value={startNodeText || '(无提示文本)'}
                                        autoSize={{ minRows: 2, maxRows: 4 }}
                                        readOnly
                                        style={{ marginBottom: 16 }}
                                      />
                                      
                                      <div style={{ marginBottom: 8 }}>
                                        <Text>工作流描述 (长度: {workflowDesc.length}):</Text>
                                      </div>
                                      <TextArea
                                        value={workflowDesc || '(无描述)'}
                                        autoSize={{ minRows: 2, maxRows: 4 }}
                                        readOnly
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  请选择工作流
                </div>
              )}
            </Spin>
          </TabPane>
        </Tabs>
      </Spin>
    </Modal>
  );
};

export default WorkflowDiagnosticModal;
