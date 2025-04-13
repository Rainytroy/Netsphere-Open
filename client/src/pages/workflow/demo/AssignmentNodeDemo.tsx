import React from 'react';
import { Card, Divider, Typography, Layout } from 'antd';
import { ExecutionNode } from '../types';
import VariableThemeService from '../../../services/VariableThemeService';
import ExecutionNodeCard from '../components/ExecutionNodeCard';
import { getNodeIcon } from '../engine/utils/UIHelper';
import { SwapOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;
const { Content } = Layout;

/**
 * 赋值节点Demo页面
 * 用于展示重构后的赋值卡组件效果
 */
const AssignmentNodeDemo: React.FC = () => {
  // 构造演示用的变量上下文数据
  const mockVariableContext = {
    // NPC变量
    '@gv_npc_c296ce94-e3b2-48d0-b089-0bd1faa68eee_name-=': '茶叶蛋',
    '@gv_npc_c296ce94-e3b2-48d0-b089-0bd1faa68eee_act-=': '给钱干活',
    '@gv_npc_c296ce94-e3b2-48d0-b089-0bd1faa68eee_actlvdesc-=': '只要夸了就会很积极',
    '@茶叶蛋.name#c296': '@gv_npc_c296ce94-e3b2-48d0-b089-0bd1faa68eee_name-=',
    '@茶叶蛋.act#c296': '@gv_npc_c296ce94-e3b2-48d0-b089-0bd1faa68eee_act-=',
    '@茶叶蛋.actlvdesc#c296': '@gv_npc_c296ce94-e3b2-48d0-b089-0bd1faa68eee_actlvdesc-=',
    
    // 自定义变量
    '@gv_custom_445ff7ff-f7d1-4d6b-829f-d80587a617aa_value-=': '3.1415926',
    '@gv_custom_117e02d2-3dee-4901-920e-00412d4d7d10_value-=': 'π的近似值',
    '@来源值.value#445f': '@gv_custom_445ff7ff-f7d1-4d6b-829f-d80587a617aa_value-=',
    '@目标值.value#117e': '@gv_custom_117e02d2-3dee-4901-920e-00412d4d7d10_value-=',
    
    // 工作流变量
    '@gv_workflow_b2a1b697-420e-4b9c-ac3d-81d0f5319155_startinput-=': '计算宇宙终极问题的答案',
    '@gv_workflow_b2a1b697-420e-4b9c-ac3d-81d0f5319155_result-=': '42',
    '@宇宙问题.startinput#b2a1': '@gv_workflow_b2a1b697-420e-4b9c-ac3d-81d0f5319155_startinput-=',
    '@宇宙问题.result#b2a1': '@gv_workflow_b2a1b697-420e-4b9c-ac3d-81d0f5319155_result-=',
    
    // 工作任务变量
    '@gv_task_a4957553-8899-4b3b-a197-3d802ab12af4_name-=': '分析数据',
    '@gv_task_a4957553-8899-4b3b-a197-3d802ab12af4_output-=': '数据分析完成，发现了重要模式',
    '@分析数据.name#a495': '@gv_task_a4957553-8899-4b3b-a197-3d802ab12af4_name-=',
    '@分析数据.output#a495': '@gv_task_a4957553-8899-4b3b-a197-3d802ab12af4_output-='
  };

  // 创建模拟的赋值节点对象
  const mockAssignmentNodes: ExecutionNode[] = [
    // NPC变量的赋值示例
    {
      id: 'assign-npc-1',
      type: 'assign',
      name: 'NPC变量赋值',
      icon: <SwapOutlined style={{ color: '#fa8c16' }} />,
      config: {
        sourceVariable: '@gv_npc_c296ce94-e3b2-48d0-b089-0bd1faa68eee_act-=',
        targetVariable: '@gv_npc_c296ce94-e3b2-48d0-b089-0bd1faa68eee_actlvdesc-='
      },
      status: 'completed',
      output: {
        assignments: [
          {
            sourceDisplayId: '@gv_npc_c296ce94-e3b2-48d0-b089-0bd1faa68eee_act-=',
            targetDisplayId: '@gv_npc_c296ce94-e3b2-48d0-b089-0bd1faa68eee_actlvdesc-=',
            value: '给钱干活',
            variableContext: {
              variables: mockVariableContext
            }
          }
        ]
      },
      executionData: {
        variables: mockVariableContext
      }
    },
    
    // 自定义变量的赋值示例
    {
      id: 'assign-custom-1',
      type: 'assign',
      name: '自定义变量赋值',
      icon: <SwapOutlined style={{ color: '#fa8c16' }} />,
      config: {
        sourceVariable: '@gv_custom_445ff7ff-f7d1-4d6b-829f-d80587a617aa_value-=',
        targetVariable: '@gv_custom_117e02d2-3dee-4901-920e-00412d4d7d10_value-='
      },
      status: 'completed',
      output: {
        assignments: [
          {
            sourceDisplayId: '@gv_custom_445ff7ff-f7d1-4d6b-829f-d80587a617aa_value-=',
            targetDisplayId: '@gv_custom_117e02d2-3dee-4901-920e-00412d4d7d10_value-=',
            value: '3.1415926',
            variableContext: {
              variables: mockVariableContext
            }
          }
        ]
      },
      executionData: {
        variables: mockVariableContext
      }
    },
    
    // 工作流变量的赋值示例
    {
      id: 'assign-workflow-1',
      type: 'assign',
      name: '工作流变量赋值',
      icon: <SwapOutlined style={{ color: '#fa8c16' }} />,
      config: {
        sourceVariable: '@gv_workflow_b2a1b697-420e-4b9c-ac3d-81d0f5319155_result-=',
        targetVariable: '@gv_task_a4957553-8899-4b3b-a197-3d802ab12af4_name-='
      },
      status: 'completed',
      output: {
        assignments: [
          {
            sourceDisplayId: '@gv_workflow_b2a1b697-420e-4b9c-ac3d-81d0f5319155_result-=',
            targetDisplayId: '@gv_task_a4957553-8899-4b3b-a197-3d802ab12af4_name-=',
            value: '42',
            variableContext: {
              variables: mockVariableContext
            }
          }
        ]
      },
      executionData: {
        variables: mockVariableContext
      }
    },
    
    // 多个赋值的示例
    {
      id: 'assign-multiple-1',
      type: 'assign',
      name: '多变量赋值',
      icon: <SwapOutlined style={{ color: '#fa8c16' }} />,
      config: {
        assignments: [
          {
            sourceVariable: '@gv_npc_c296ce94-e3b2-48d0-b089-0bd1faa68eee_name-=',
            targetVariable: '@gv_task_a4957553-8899-4b3b-a197-3d802ab12af4_output-='
          },
          {
            sourceVariable: '@gv_custom_445ff7ff-f7d1-4d6b-829f-d80587a617aa_value-=',
            targetVariable: '@gv_workflow_b2a1b697-420e-4b9c-ac3d-81d0f5319155_startinput-='
          }
        ]
      },
      status: 'completed',
      output: {
        assignments: [
          {
            sourceDisplayId: '@gv_npc_c296ce94-e3b2-48d0-b089-0bd1faa68eee_name-=',
            targetDisplayId: '@gv_task_a4957553-8899-4b3b-a197-3d802ab12af4_output-=',
            value: '茶叶蛋',
            variableContext: {
              variables: mockVariableContext
            }
          },
          {
            sourceDisplayId: '@gv_custom_445ff7ff-f7d1-4d6b-829f-d80587a617aa_value-=',
            targetDisplayId: '@gv_workflow_b2a1b697-420e-4b9c-ac3d-81d0f5319155_startinput-=',
            value: '3.1415926',
            variableContext: {
              variables: mockVariableContext
            }
          }
        ]
      },
      executionData: {
        variables: mockVariableContext
      }
    }
  ];

  return (
    <Layout style={{ padding: 24, background: '#f0f2f5' }}>
      <Content style={{ padding: 24, background: '#fff', borderRadius: 4 }}>
        <Title level={2}>赋值节点组件演示</Title>
        <Paragraph>
          此页面展示了重构后的赋值节点组件在各种变量类型下的显示效果。
          每个卡片代表一个赋值节点的执行结果，展示源变量和目标变量的标识符和值。
        </Paragraph>
        
        <Divider orientation="left">NPC变量赋值</Divider>
        <ExecutionNodeCard node={mockAssignmentNodes[0]} isActive={false} />
        
        <Divider orientation="left">自定义变量赋值</Divider>
        <ExecutionNodeCard node={mockAssignmentNodes[1]} isActive={false} />
        
        <Divider orientation="left">工作流变量赋值</Divider>
        <ExecutionNodeCard node={mockAssignmentNodes[2]} isActive={false} />
        
        <Divider orientation="left">多变量赋值示例</Divider>
        <ExecutionNodeCard node={mockAssignmentNodes[3]} isActive={false} />
        
        <Divider />
        <Paragraph>
          <strong>组件特点：</strong>
          <ul>
            <li>正确解析并显示变量标识符</li>
            <li>不同类型变量使用对应的主题颜色</li>
            <li>支持直接变量引用和文本内变量替换</li>
            <li>多变量赋值在同一卡片中显示</li>
          </ul>
        </Paragraph>
      </Content>
    </Layout>
  );
};

export default AssignmentNodeDemo;
