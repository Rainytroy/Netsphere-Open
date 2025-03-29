import * as React from 'react';
import { Form, Select, Row, Col, Typography, Input } from 'antd';
import { Npc } from '../../services/npcService';

const { Text } = Typography;

interface NpcSelectorProps {
  npcs: Npc[];
  selectedNpcId: string;
  onNpcChange: (npcId: string) => void;
  form: any; // Form实例，使用实际的Form类型
}

/**
 * NPC选择器组件
 * 负责NPC的选择和相关状态管理
 */
const NpcSelector: React.FC<NpcSelectorProps> = ({
  npcs,
  selectedNpcId,
  onNpcChange,
  form
}) => {
  return (
    <Row gutter={16} style={{ marginBottom: 16 }}>
      <Col span={24}>
        <Row align="middle">
          <Col span={4}>
            <Text strong>关联NPC:</Text>
          </Col>
          <Col span={20}>
            <Form.Item
              name="npcId"
              rules={[{ required: false }]} // 修改为非必填，允许空值
              style={{ marginBottom: 0 }}
              initialValue="" // 默认为空字符串，表示不选择NPC
            >
              <Select 
                placeholder="请选择关联NPC" 
                onChange={onNpcChange}
                options={[
                  { label: "不选择NPC", value: "" }, // 添加不选择NPC选项，值为空字符串
                  ...npcs.map(npc => ({ label: npc.name, value: npc.id }))
                ]}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>
      </Col>
      {/* 隐藏的表单项，用于存储NPC名称 */}
      <Form.Item name="npcName" hidden><Input /></Form.Item>
    </Row>
  );
};

export default NpcSelector;
