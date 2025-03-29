import * as React from 'react';
import { Form, Input, InputNumber, Button, message } from 'antd';
import { Npc } from '../../services/npcService';

const { TextArea } = Input;

interface NpcFormProps {
  initialValues?: Partial<Npc>;
  onSubmit: (values: Omit<Npc, 'id' | 'createdAt' | 'updatedAt'>) => void;
  submitButtonText: string;
  loading?: boolean;
}

/**
 * NPC表单组件，用于创建和编辑NPC
 */
const NpcForm: React.FC<NpcFormProps> = ({
  initialValues,
  onSubmit,
  submitButtonText = '创建',
  loading = false,
}) => {
  const [form] = Form.useForm();

  // 处理表单提交
  const handleSubmit = (values: any) => {
    const formData = {
      ...values
    };

    // 默认积极性参数为1
    if (formData.activityLevel === undefined) {
      formData.activityLevel = 1;
    }

    onSubmit(formData);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onFinish={handleSubmit}
      autoComplete="off"
    >
      <Form.Item
        label="NPC名称"
        name="name"
        rules={[{ required: true, message: '请输入NPC名称' }]}
      >
        <Input placeholder="请输入NPC名称" />
      </Form.Item>

      <Form.Item
        label="知识背景"
        name="knowledgeBackground"
        rules={[{ required: true, message: '请输入知识背景' }]}
      >
        <TextArea
          rows={6}
          placeholder="请描述NPC的知识范围、专业领域、背景故事等"
        />
      </Form.Item>

      <Form.Item
        label="行动原则"
        name="actionPrinciples"
        rules={[{ required: true, message: '请输入行动原则' }]}
      >
        <TextArea
          rows={6}
          placeholder="请描述NPC的行为准则、道德标准、决策原则等"
        />
      </Form.Item>

      <Form.Item
        label="积极性参数"
        name="activityLevel"
        initialValue={1}
        rules={[{ required: true, message: '请输入积极性参数' }]}
      >
        <InputNumber min={0} max={1} step={0.1} style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item
        label="积极性参数描述"
        name="activityLevelDescription"
        rules={[{ required: true, message: '请输入积极性参数描述' }]}
      >
        <TextArea
          rows={4}
          placeholder="请描述积极性参数的影响和作用"
        />
      </Form.Item>

      <Form.Item
        label="描述"
        name="description"
      >
        <TextArea
          rows={3}
          placeholder="（选填）简短描述NPC的特点和职责"
        />
      </Form.Item>

      <Form.Item>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          style={{ backgroundColor: '#1A1F2C' }}
        >
          {submitButtonText}
        </Button>
      </Form.Item>
    </Form>
  );
};

export default NpcForm;
