import React from 'react';
import { Card, Button, Row, Col, Collapse } from 'antd';
import { MethodTestPanelProps } from './types';
import { RichTextContent } from '../variable/VariableEditorUtils';

const { Panel } = Collapse;

/**
 * 组件方法测试按钮面板
 */
const MethodTestPanel: React.FC<MethodTestPanelProps> = ({
  variables,
  editorRef,
  testInputText,
  updateOutputs,
  showMethodResult
}) => {
  // 测试insertVariable方法
  const testInsertVariable = () => {
    if (editorRef.current && variables.length > 0) {
      const randomIndex = Math.floor(Math.random() * variables.length);
      const randomVariable = variables[randomIndex];
      editorRef.current.insertVariable(randomVariable);
      
      showMethodResult('insertVariable', {
        method: 'insertVariable',
        params: randomVariable,
        result: '变量已插入编辑器',
        variableInfo: randomVariable
      });
      
      updateOutputs();
    }
  };
  
  // 测试updateContent方法
  const testUpdateContent = () => {
    if (editorRef.current) {
      const newContent = '<p>这是通过updateContent方法更新的内容，包含一个<span data-type="variable" data-identifier="npc.name" data-source="npc" class="variable-node">@npc.name</span>变量</p>';
      editorRef.current.updateContent(newContent);
      
      showMethodResult('updateContent', {
        method: 'updateContent',
        params: newContent,
        result: '内容已更新'
      });
      
      updateOutputs();
    }
  };
  
  // 测试focusEditor方法
  const testFocusEditor = () => {
    if (editorRef.current) {
      editorRef.current.focusEditor();
      
      showMethodResult('focusEditor', {
        method: 'focusEditor',
        result: '编辑器已聚焦'
      });
    }
  };
  
  // 测试parseExternalContent方法
  const testParseExternalContent = () => {
    if (editorRef.current) {
      editorRef.current.parseExternalContent(testInputText);
      
      showMethodResult('parseExternalContent', {
        method: 'parseExternalContent',
        params: testInputText,
        result: '外部内容已解析并插入'
      });
      
      updateOutputs();
    }
  };
  
  // 测试getRawContent方法
  const testGetRawContent = () => {
    if (editorRef.current) {
      const rawContent = editorRef.current.getRawContent();
      
      showMethodResult('getRawContent', {
        method: 'getRawContent',
        result: rawContent
      });
    }
  };
  
  // 测试getResolvedContent方法
  const testGetResolvedContent = async () => {
    if (editorRef.current) {
      try {
        const resolvedContent = await editorRef.current.getResolvedContent();
        
        showMethodResult('getResolvedContent', {
          method: 'getResolvedContent',
          result: resolvedContent
        });
      } catch (error) {
        showMethodResult('getResolvedContent', {
          method: 'getResolvedContent',
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }
  };
  
  // 测试getRichContent方法
  const testGetRichContent = () => {
    if (editorRef.current) {
      const richContent = editorRef.current.getRichContent();
      
      showMethodResult('getRichContent', {
        method: 'getRichContent',
        result: richContent
      });
    }
  };
  
  // 测试updateRichContent方法
  const testUpdateRichContent = () => {
    if (editorRef.current) {
      const richContent: RichTextContent = {
        html: '<p>这是通过updateRichContent更新的内容</p>',
        rawText: '这是通过updateRichContent更新的内容',
        plainText: '这是通过updateRichContent更新的内容'
      };
      
      editorRef.current.updateRichContent(richContent);
      
      showMethodResult('updateRichContent', {
        method: 'updateRichContent',
        params: richContent,
        result: '富文本内容已更新'
      });
      
      updateOutputs();
    }
  };
  
  // 获取HTML格式内容
  const handleGetHTML = () => {
    if (editorRef.current) {
      const richContent = editorRef.current.getRichContent();
      
      showMethodResult('HTML内容', richContent.html);
    }
  };
  
  // 获取JSON格式内容
  const handleGetJSON = () => {
    if (editorRef.current) {
      try {
        const editor = editorRef.current as any;
        const jsonContent = editor.editor?.getJSON();
        
        showMethodResult('JSON内容', JSON.stringify(jsonContent, null, 2));
      } catch (error) {
        showMethodResult('JSON内容', '无法获取JSON内容: ' + (error instanceof Error ? error.message : '未知错误'));
      }
    }
  };

  return (
    <Card
      title="组件方法测试"
      size="small"
      bodyStyle={{ padding: '8px' }}
      style={{ marginBottom: '8px' }}
    >
      <Collapse bordered={false} size="small">
        <Panel header="基本操作方法" key="basic">
          <Row gutter={[4, 4]}>
            <Col span={8}>
              <Button size="small" block onClick={testInsertVariable}>
                insertVariable
              </Button>
            </Col>
            <Col span={8}>
              <Button size="small" block onClick={testUpdateContent}>
                updateContent
              </Button>
            </Col>
            <Col span={8}>
              <Button size="small" block onClick={testFocusEditor}>
                focusEditor
              </Button>
            </Col>
            <Col span={8}>
              <Button size="small" block onClick={testParseExternalContent}>
                parseExternalContent
              </Button>
            </Col>
            <Col span={8}>
              <Button size="small" block onClick={testUpdateRichContent}>
                updateRichContent
              </Button>
            </Col>
          </Row>
        </Panel>
        
        <Panel header="获取内容方法" key="get">
          <Row gutter={[4, 4]}>
            <Col span={8}>
              <Button size="small" block onClick={testGetRawContent}>
                getRawContent
              </Button>
            </Col>
            <Col span={8}>
              <Button size="small" block onClick={testGetResolvedContent}>
                getResolvedContent
              </Button>
            </Col>
            <Col span={8}>
              <Button size="small" block onClick={testGetRichContent}>
                getRichContent
              </Button>
            </Col>
            <Col span={8}>
              <Button size="small" block onClick={handleGetHTML}>
                获取HTML
              </Button>
            </Col>
            <Col span={8}>
              <Button size="small" block onClick={handleGetJSON}>
                获取JSON
              </Button>
            </Col>
          </Row>
        </Panel>
      </Collapse>
    </Card>
  );
};

export default MethodTestPanel;
