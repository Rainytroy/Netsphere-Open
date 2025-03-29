import React from 'react';
import { Modal, Typography, Divider, Button } from 'antd';

const { Title, Text, Paragraph } = Typography;

interface FormatInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * 格式说明对话框组件
 * 用于展示rawText格式相关的说明文档
 */
const FormatInfoModal: React.FC<FormatInfoModalProps> = ({ visible, onClose }) => {
  return (
    <Modal
      title={<span>rawText格式说明</span>}
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>
      ]}
      width={800}
      bodyStyle={{ maxHeight: '70vh', overflow: 'auto' }}
    >
      <Typography>
        <Title level={4}>变量编辑器中的变量处理完整流程</Title>
        
        <Paragraph>
          <Text strong>rawText格式</Text>是一种纯文本格式，保留变量标识符(如<Text code>@gv_abc123_field</Text>)，在加载时会自动转换为HTML并显示最新的变量信息。
        </Paragraph>
        <Paragraph>
          当变量来源(如NPC名称)改变时，重新加载相同内容会显示更新后的变量名称。
        </Paragraph>
        <Paragraph>
          <Text type="secondary">该保存格式确保内容在变量数据变化时保持最新状态。</Text>
        </Paragraph>
        
        <Divider />
        
        <Title level={5}>1. 变量插入流程</Title>
        
        <Paragraph strong>触发方式</Paragraph>
        <Paragraph>
          变量插入有两种触发方式：
          <ul>
            <li>
              <Text strong>@符号触发</Text>：用户在编辑器中输入@符号时
              <ul>
                <li>由<Text code>VariableKey</Text>扩展监听(@按键)</li>
                <li>触发<Text code>onAtKey</Text>回调，显示变量选择器</li>
              </ul>
            </li>
            <li>
              <Text strong>工具栏按钮触发</Text>：点击工具栏上的"插入变量"按钮
              <ul>
                <li><Text code>EditorToolbar</Text>组件中的按钮点击处理器调用<Text code>onInsertVariable</Text></li>
              </ul>
            </li>
          </ul>
        </Paragraph>
        
        <Paragraph strong>选择变量</Paragraph>
        <Paragraph>
          <ul>
            <li><Text code>VariableSelectorModal</Text>组件显示可用变量列表</li>
            <li>使用<Text code>useVariableData</Text> hook获取变量数据源</li>
            <li>用户选择变量后，调用<Text code>onSelect</Text>回调，传递选中的变量对象</li>
          </ul>
        </Paragraph>
        
        <Paragraph strong>插入变量节点</Paragraph>
        <Paragraph>
          <ol>
            <li>在<Text code>VariableEditorX</Text>组件中的<Text code>handleSelectVariable</Text>函数处理选择事件</li>
            <li>先调用<Text code>findAndDeleteAtSymbol</Text>删除触发的@符号(如果存在)</li>
            <li>调用<Text code>EditorCore</Text>的<Text code>insertVariable</Text>方法插入变量</li>
            <li><Text code>insertVariable</Text>方法实际调用<Text code>variableNodeManager.insertVariable</Text></li>
            <li><Text code>VariableNodeManager</Text>创建特殊的ProseMirror节点，包含变量数据</li>
          </ol>
        </Paragraph>
        
        <Divider />
        
        <Title level={5}>2. 内容保存流程</Title>
        
        <Paragraph strong>HTML获取</Paragraph>
        <Paragraph>
          <ul>
            <li>调用<Text code>editorRef.current.getContent()</Text>获取HTML内容</li>
            <li>这实际上调用<Text code>EditorCore</Text>的<Text code>getHTML</Text>方法，先同步变量节点再获取HTML</li>
          </ul>
        </Paragraph>
        
        <Paragraph strong>转换为rawText</Paragraph>
        <Paragraph>
          <ul>
            <li>使用<Text code>htmlToRawText</Text>函数将HTML转换为系统标识符格式</li>
            <li>该函数在<Text code>formatters.ts</Text>中实现，处理逻辑：
              <ol>
                <li>创建临时DOM解析HTML</li>
                <li>查找所有变量节点（span.variable-node元素）</li>
                <li>获取节点的id和field属性</li>
                <li>用系统标识符<Text code>@gv_[id]_[field]</Text>替换变量节点</li>
                <li>返回处理后的纯文本内容</li>
              </ol>
            </li>
          </ul>
        </Paragraph>
        
        <Paragraph strong>保存内容</Paragraph>
        <Paragraph>
          <ul>
            <li>将rawText格式存储在<Text code>SavedContentItem</Text>对象中</li>
            <li>保存变量数量，以显示统计信息</li>
            <li>也存储原始HTML用于调试</li>
          </ul>
        </Paragraph>
        
        <Divider />
        
        <Title level={5}>3. 内容加载流程</Title>
        
        <Paragraph strong>加载rawText</Paragraph>
        <Paragraph>
          <ul>
            <li>从<Text code>SavedContentItem</Text>中获取rawText内容</li>
          </ul>
        </Paragraph>
        
        <Paragraph strong>转换为HTML</Paragraph>
        <Paragraph>
          <ul>
            <li>使用<Text code>rawTextToHtml</Text>函数转换回HTML格式</li>
            <li>使用当前最新的变量数据</li>
            <li>该函数在<Text code>formatters.ts</Text>中实现，处理逻辑：
              <ol>
                <li>查找所有系统标识符<Text code>@gv_[id]_[field]</Text></li>
                <li>在变量数据中查找对应的变量信息</li>
                <li>创建HTML变量标签替换系统标识符</li>
                <li>未找到变量时保留原始标识符</li>
              </ol>
            </li>
          </ul>
        </Paragraph>
        
        <Paragraph strong>设置内容到编辑器</Paragraph>
        <Paragraph>
          <ul>
            <li>使用<Text code>EditorCore</Text>的<Text code>setContent</Text>方法设置HTML内容</li>
            <li>经过处理后的内容由<Text code>ContentFormatManager</Text>检测格式类型</li>
            <li>内容设置后，调用<Text code>variableNodeManager.syncVariableNodes</Text>同步变量节点</li>
          </ul>
        </Paragraph>
        
        <Divider />
        
        <Title level={5}>核心组件和模块</Title>
        
        <Paragraph>
          <ol>
            <li>
              <Text strong>Variable Extension</Text>
              <ul>
                <li>TipTap编辑器扩展，定义变量节点类型</li>
                <li>管理变量节点的渲染、解析和序列化</li>
              </ul>
            </li>
            <li>
              <Text strong>VariableNodeManager</Text>
              <ul>
                <li>核心模块，管理变量节点的CRUD操作</li>
                <li>提供插入、同步和更新变量节点的方法</li>
              </ul>
            </li>
            <li>
              <Text strong>ContentFormatManager</Text>
              <ul>
                <li>处理不同格式内容的检测和转换</li>
                <li>支持HTML、JSON和纯文本格式</li>
              </ul>
            </li>
            <li>
              <Text strong>formatters.ts</Text>
              <ul>
                <li>提供<Text code>htmlToRawText</Text>和<Text code>rawTextToHtml</Text>函数</li>
                <li>处理系统标识符和HTML之间的转换</li>
              </ul>
            </li>
            <li>
              <Text strong>EditorCore</Text>
              <ul>
                <li>底层编辑器组件，封装TipTap编辑器</li>
                <li>暴露API给上层组件使用</li>
              </ul>
            </li>
            <li>
              <Text strong>VariableEditorX</Text>
              <ul>
                <li>高级编辑器组件，包含变量选择器和工具栏</li>
                <li>协调各个子组件的交互</li>
              </ul>
            </li>
          </ol>
        </Paragraph>
        
        <Divider />
        
        <Title level={5}>最佳实践</Title>
        
        <Paragraph>
          <ol>
            <li><Text strong>系统标识符格式</Text>: 使用<Text code>@gv_[id]_[field]</Text>作为统一标识符</li>
            <li><Text strong>变量节点属性</Text>: 存储完整变量信息，包括ID、字段和显示文本</li>
            <li><Text strong>双向转换</Text>: 保存时HTML→rawText，加载时rawText→HTML</li>
            <li><Text strong>延迟处理</Text>: 使用setTimeout确保DOM操作顺序正确</li>
            <li><Text strong>变量数据分离</Text>: 编辑器仅存储变量引用，而非实际数据</li>
            <li><Text strong>动态更新</Text>: 加载时使用最新变量数据，确保引用始终指向最新状态</li>
          </ol>
        </Paragraph>
      </Typography>
    </Modal>
  );
};

export default FormatInfoModal;
