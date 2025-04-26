import React, { useState, useEffect, useRef } from 'react';
import { Button, Space, Descriptions, Typography, Divider, Spin } from 'antd';
import { CopyOutlined, DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { DisplayNodeOutput, ExecutionNode } from '../../types';
import { variableService } from '../../../../services/variableService';
import IdentifierFormatterService from '../../../../services/IdentifierFormatterService';

const { Text } = Typography;

// V3.0标识符格式正则表达式
const V3_IDENTIFIER_REGEX = /@gv_([a-zA-Z0-9]+)_([a-zA-Z0-9-]+)_([a-zA-Z0-9_]+)-=/g;
const V3_IDENTIFIER_EXACT_REGEX = /@gv_([a-zA-Z0-9]+)_([a-zA-Z0-9-]+)_([a-zA-Z0-9_]+)-=$/;

// 为window.workflowEngine添加类型定义
declare global {
  interface Window {
    workflowEngine?: {
      updateNode: (nodeId: string, updates: Partial<ExecutionNode>) => void;
      getNode?: (nodeId: string) => ExecutionNode | undefined;
      getVariables?: () => Record<string, any>;
    };
  }
}

interface DisplayNodeContentProps {
  node: ExecutionNode;
}

/**
 * 展示卡内容组件
 * 负责渲染展示节点的内容，支持Markdown格式
 */
const DisplayNodeContent: React.FC<DisplayNodeContentProps> = ({ node }) => {
  const [showDebug, setShowDebug] = useState(false);
  const output = node.output as DisplayNodeOutput | undefined;
  // 使用空对象作为默认值，避免解构undefined
  const { content, rawText, animationComplete, timestamps = {} } = output || {};
  
  // 实时解析结果状态
  const [realtimeParseResult, setRealtimeParseResult] = useState<string>('');
  const [parsingInProgress, setParsingInProgress] = useState(false);
  const [parsingErrors, setParsingErrors] = useState<string[]>([]);
  const [forceTestMode, setForceTestMode] = useState(false); // 添加强制测试模式状态
  
  // 添加渲染键，强制ReactMarkdown在内容变化时重新渲染
  const [renderKey, setRenderKey] = useState(0);
  
  // 极简动画状态
  const [displayedContent, setDisplayedContent] = useState<string>('');
  const intervalRef = useRef<number | null>(null);
  
  // 清理定时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);
  
  /**
   * 辅助函数：转义正则表达式特殊字符
   */
  const escapeRegExp = (string: string): string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  /**
   * 解析变量标识符，提取类型、ID和字段
   * 参考 AssignmentNode.ts 中的实现
   */
  const parseVariableIdentifier = (identifier: string): { type: string; id: string; field: string; fullId: string } | null => {
    if (!identifier) return null;
    
    // 解析系统标识符
    if (identifier.startsWith('@gv_') && identifier.endsWith('-=')) {
      // 方法1: 使用正则表达式解析
      const match = identifier.match(V3_IDENTIFIER_EXACT_REGEX);
      if (!match) return null;
      
      const [_, type, id, field] = match;
      const fullId = `${type}_${id}_${field}`;
      
      return { type, id, field, fullId };
      
      // 方法2: 使用IdentifierFormatterService (如需要)
      // const parseResult = IdentifierFormatterService.parseIdentifier(identifier);
      // if (!parseResult) return null;
      // const typeMatch = identifier.match(/@gv_([a-zA-Z0-9]+)_/);
      // const type = typeMatch ? typeMatch[1].toLowerCase() : 'custom';
      // return { ...parseResult, type, fullId: `${type}_${parseResult.id}_${parseResult.field}` };
    }
    
    return null;
  };

  /**
   * 解析文本中的变量标识符并替换为实际值
   * 直接从API获取变量值，而不依赖内存中的变量列表
   */
  const parseVariableIdentifiers = async (text: string): Promise<string> => {
    if (!text) return '';
    
    // 复制文本作为结果
    let result = text;
    
    // 提取并去重所有V3格式标识符
    const matches = Array.from(new Set(text.match(V3_IDENTIFIER_REGEX) || []));
    
    if (matches.length === 0) {
      return text;
    }
    
    // 清除之前的错误
    setParsingErrors([]);
    const errors: string[] = [];
    
    // 对每个标识符处理
    for (const match of matches) {
      try {
        // 解析变量标识符
        const parsed = parseVariableIdentifier(match);
        if (!parsed) {
          console.warn(`[DisplayNodeContent] 无法解析标识符: ${match}`);
          errors.push(`无法解析标识符: ${match}`);
          continue;
        }
        
        const { type, id, field, fullId } = parsed;
        
        try {
          // 使用完整ID直接从API获取变量 - 这是关键变化
          const apiUrl = `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api'}/variables/${fullId}`;
          console.log(`[DisplayNodeContent][API] 调用API获取变量: ${fullId}, URL: ${apiUrl}`);
          const response = await variableService.getVariable(fullId);
          
          // 检查响应结构
          if (response && response.data) {
            // 使用类型断言处理响应数据
            const variable = response.data as { id?: string; value?: string; [key: string]: any };
            
            // 获取变量值
            const value = variable.value || '';
            
            // 替换文本中的所有标识符
            result = result.replace(new RegExp(escapeRegExp(match), 'g'), value);
            console.log(`[DisplayNodeContent] 替换 ${match} => ${value}`);
          } else {
            console.warn(`[DisplayNodeContent] API返回格式错误:`, response);
            errors.push(`API返回格式错误: ${fullId}`);
          }
        } catch (apiError: any) {
          // 使用一般的错误处理，避免特定于Axios的类型问题
          const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
          
          // 提取有用的错误信息
          let errorDetails: any = {};
          if (apiError.response) {
            errorDetails = {
              status: apiError.response.status,
              statusText: apiError.response.statusText,
              data: apiError.response.data
            };
          }
          
          console.error(`[DisplayNodeContent][API] 变量请求失败(${fullId}):`, {
            error: errorMessage,
            fullId,
            ...errorDetails
          });
          
          errors.push(`获取变量失败(${fullId}): ${errorMessage}`);
          
          // 尝试备用方法: 使用工作流引擎变量（如果可用）
          if (window.workflowEngine && window.workflowEngine.getVariables) {
            console.log(`[DisplayNodeContent][BACKUP] 尝试从工作流引擎获取变量: ${fullId}`);
            const engineVars = window.workflowEngine.getVariables();
            
            if (engineVars && engineVars[fullId] !== undefined) {
              const value = String(engineVars[fullId] || '');
              result = result.replace(new RegExp(escapeRegExp(match), 'g'), value);
              console.log(`[DisplayNodeContent][BACKUP] 从引擎获取变量成功: ${fullId} => ${value}`);
            } else {
              console.log(`[DisplayNodeContent][BACKUP] 引擎中未找到变量: ${fullId}`);
            }
          } else {
            console.log(`[DisplayNodeContent][BACKUP] 工作流引擎变量不可用`);
          }
        }
      } catch (error) {
        console.error(`[DisplayNodeContent] 处理标识符错误:`, error);
        errors.push(`处理标识符错误: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // 更新错误状态
    if (errors.length > 0) {
      setParsingErrors(errors);
    }
    
    return result;
  };

  // 在显示调试面板时实时解析原始文本
  useEffect(() => {
    const parseText = async () => {
      // 使用rawText或node.config.rawText作为文本源 - 修复关键Bug
      const textToUse = rawText || node.config?.rawText;
      
      if (showDebug && (textToUse || forceTestMode)) {
        try {
          setParsingInProgress(true);
          
          // 使用直接API调用解析变量
          let parsed = '';
          
          if (textToUse) {
            parsed = await parseVariableIdentifiers(textToUse);
          } else if (forceTestMode) {
            // 在强制测试模式下使用测试变量
            const testText = '@gv_task_c05d073b-081e-4337-a249-fe13e03ca7d4_output-=\n+++++\n@gv_task_ab56493f-c13d-4bd1-b7b2-70f8f177f3e9_output-=';
            parsed = await parseVariableIdentifiers(testText);
          }
          
          setRealtimeParseResult(parsed);
          
          // 增加渲染键，强制React组件重新渲染
          setRenderKey(prevKey => prevKey + 1);
          
          // 如果工作流引擎可用，更新节点内容，实现实时显示
          if (window.workflowEngine && window.workflowEngine.updateNode) {
            try {
              // 如果实际节点解析的结果与我们的解析不同，更新节点内容
              const currentNode = window.workflowEngine.getNode?.(node.id);
              const currentContent = (currentNode?.output as DisplayNodeOutput)?.content;
              
              if (currentContent !== parsed) {
                // 复制当前节点输出，替换content字段
                const currentOutput = (currentNode?.output as DisplayNodeOutput) || {};
                const newOutput = {
                  ...currentOutput,
                  content: parsed
                };
                
                // 更新节点
                window.workflowEngine.updateNode(node.id, {
                  output: newOutput
                });
                
                // 注意：不再在这里额外触发一次setRenderKey，避免闪动
              }
            } catch (error) {
              console.error('[DisplayNodeContent] 更新节点内容失败:', error);
            }
          }
        } catch (error) {
          console.error('[DisplayNodeContent] 实时解析失败:', error);
          setRealtimeParseResult('解析出错: ' + (error instanceof Error ? error.message : String(error)));
          setParsingErrors([`解析失败: ${error instanceof Error ? error.message : String(error)}`]);
        } finally {
          setParsingInProgress(false);
        }
      }
    };
    
    parseText();
  }, [showDebug, rawText, node.config?.rawText, forceTestMode, node.id]);

  // 处理复制文本
  const handleCopyText = () => {
    if (content) {
      navigator.clipboard.writeText(content);
      // 使用alert代替message组件
      alert('内容已复制到剪贴板');
    }
  };
  
  // 处理下载Markdown
  const handleDownloadMarkdown = () => {
    if (!content) return;
    
    const element = document.createElement('a');
    const file = new Blob([content], {type: 'text/markdown'});
    element.href = URL.createObjectURL(file);
    element.download = `${node.name.replace(/\s+/g, '-').toLowerCase()}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    alert('Markdown文件已下载');
  };
  
  // 切换强制测试模式
  const toggleForceTestMode = () => {
    const newMode = !forceTestMode;
    setForceTestMode(newMode);
  };
  
  // 手动刷新实时解析结果
  const handleRefreshParse = async () => {
    // 获取要解析的文本（优先级：output.rawText > node.config.rawText > 测试文本）
    const textToUse = rawText || node.config?.rawText;
    
    if (!textToUse && !forceTestMode) {
      console.warn('[DisplayNodeContent] 没有可用的文本源，无法刷新解析');
      return;
    }
    
    try {
      setParsingInProgress(true);
      
      let parsed = '';
      
      if (textToUse) {
        // 使用直接API调用解析变量
        parsed = await parseVariableIdentifiers(textToUse);
      } else if (forceTestMode) {
        // 在强制测试模式下使用测试变量
        const testText = '@gv_task_c05d073b-081e-4337-a249-fe13e03ca7d4_output-=\n+++++\n@gv_task_ab56493f-c13d-4bd1-b7b2-70f8f177f3e9_output-=';
        parsed = await parseVariableIdentifiers(testText);
      }
      
      setRealtimeParseResult(parsed);
      
      // 增加渲染键，强制更新
      setRenderKey(prevKey => prevKey + 1);
      
    } catch (error) {
      console.error('[DisplayNodeContent] 手动刷新解析失败:', error);
      setRealtimeParseResult('解析出错: ' + (error instanceof Error ? error.message : String(error)));
      setParsingErrors([`刷新解析失败: ${error instanceof Error ? error.message : String(error)}`]);
    } finally {
      setParsingInProgress(false);
    }
  };
  
  // 自动解析变量，无需等待用户点击"查看详情"
  useEffect(() => {
    // 只在节点处于执行或完成状态时才解析变量
    const autoParseText = async () => {
      // 检查节点状态 - 关键修改：只在executing或completed状态才解析
      if (node.status !== 'executing' && node.status !== 'completed') {
        console.log(`[DisplayNodeContent] 跳过解析 - 节点 ${node.id} 状态为 ${node.status}，等待节点执行`);
        return;
      }
      
      const textToUse = rawText || node.config?.rawText;
      
      if (textToUse) {
        try {
          console.log(`[DisplayNodeContent] 自动解析变量开始 - 节点 ${node.id} 状态为 ${node.status}`);
          setParsingInProgress(true);
          const parsed = await parseVariableIdentifiers(textToUse);
          
          // 立即更新解析结果状态，但只在结果变化时触发重新渲染
          if (parsed !== realtimeParseResult) {
            setRealtimeParseResult(parsed);
            
            // 仅在结果确实变化时才增加渲染键
            setRenderKey(prevKey => prevKey + 1);
            
            // 如果有工作流引擎，也更新节点内容，确保两边保持一致
            if (window.workflowEngine && window.workflowEngine.updateNode) {
              try {
                const currentNode = window.workflowEngine.getNode?.(node.id);
                if (currentNode) {
                  const currentOutput = (currentNode.output as DisplayNodeOutput) || {};
                  if (currentOutput.content !== parsed) {
                    console.log(`[DisplayNodeContent] 更新工作流引擎节点内容 - 节点 ${node.id}`);
                    window.workflowEngine.updateNode(node.id, {
                      output: {
                        ...currentOutput,
                        content: parsed
                      }
                    });
                  }
                }
              } catch (error) {
                console.error('[DisplayNodeContent] 更新节点内容失败:', error);
              }
            }
          }
        } catch (error) {
          console.error('[DisplayNodeContent] 自动解析失败:', error);
        } finally {
          setParsingInProgress(false);
        }
      }
    };
    
    // 立即执行解析
    autoParseText();
  }, [node.id, node.status, rawText, node.config?.rawText, realtimeParseResult]); // 添加node.status作为依赖项

  // 监听节点状态变化，触发生成式动画
  useEffect(() => {
    // 如果已经有动画在运行，先清除
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // 只在节点状态变为completed时触发动画
    if (node.status === 'completed') {
      const contentToAnimate = realtimeParseResult || content;
      
      // 检查是否有动画配置
      const hasAnimationConfig = 
        node.config?.animatedDisplay === true || 
        node.config?.displayMode === 'animated' ||
        node.config?.displayMode === 'typing' ||
        node.config?.displayMode === 'generative';
      
      console.log(`[DisplayNodeContent] 节点完成，检查动画配置:`, {
        节点ID: node.id,
        显示模式: node.config?.displayMode || '未设置',
        动画配置: hasAnimationConfig ? '已启用' : '未启用',
        内容长度: contentToAnimate?.length || 0
      });
      
      // 如果配置了动画且有内容，开始动画
      if (hasAnimationConfig && contentToAnimate) {
        console.log(`[DisplayNodeContent] 开始生成式动画，内容长度: ${contentToAnimate.length}字符`);
        
        // 直接从第一个字符开始，不清空内容
        let currentChar = 1; // 从第一个字符开始
        setDisplayedContent(contentToAnimate.substring(0, 1));
        
        // 设置动画间隔
        intervalRef.current = window.setInterval(() => {
          currentChar++;
          if (currentChar <= contentToAnimate.length) {
            setDisplayedContent(contentToAnimate.substring(0, currentChar));
          } else {
            // 动画结束时清除定时器
            if (intervalRef.current !== null) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }
        }, 15); // 每15毫秒显示一个字符
      }
    }
    
    // 组件卸载时清除定时器
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [node.status, realtimeParseResult, content, node.id, node.config?.animatedDisplay, node.config?.displayMode]);
  
  // 渲染内容展示区域
  const renderContent = () => {
    // 如果节点状态为executing，不显示任何内容
    if (node.status === 'executing') {
      return (
        <div className="markdown-content">
          <Spin size="small" tip="内容生成中..." />
        </div>
      );
    }
    
    // 始终优先使用实时解析的变量值，确保显示最新内容
    const contentToShow = realtimeParseResult || content;
    
    // 如果没有任何内容，显示无内容提示
    if (!contentToShow) {
      return <div className="no-content">暂无内容</div>;
    }
    
    try {
      // 展示动画内容或完整内容
      const textToShow = intervalRef.current !== null ? displayedContent : contentToShow;
      
      return (
        <div className="markdown-content">
          {parsingInProgress ? (
            <Spin size="small" tip="解析中..." />
          ) : (
            <ReactMarkdown
              key={renderKey}
              skipHtml={false}
              children={textToShow}
            />
          )}
        </div>
      );
    } catch (error) {
      // 渲染错误时回退到纯文本显示
      return (
        <div className="markdown-content fallback">
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {intervalRef.current !== null ? displayedContent : contentToShow}
          </pre>
        </div>
      );
    }
  };

  return (
    <div>
      {renderContent()}
      
      {/* 添加刷新按钮，但要保持简洁性 */}
      {realtimeParseResult && realtimeParseResult !== content && (
        <div style={{ textAlign: 'right', marginTop: '4px' }}>
          <Button
            type="text"
            icon={<ReloadOutlined />}
            onClick={handleRefreshParse}
            size="small"
            title="重新解析变量"
          />
        </div>
      )}
      
      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <Button 
          type="link" 
          onClick={() => setShowDebug(!showDebug)}
          style={{ padding: 0, color: '#1890ff' }}
        >
          {showDebug ? '隐藏详情' : '查看详情'}
        </Button>
        
        {animationComplete && (
          <Space>
            <Button 
              icon={<CopyOutlined />} 
              onClick={handleCopyText}
            >
              复制文本
            </Button>
            <Button 
              icon={<DownloadOutlined />} 
              onClick={handleDownloadMarkdown}
            >
              下载Markdown
            </Button>
          </Space>
        )}
      </div>
      
      {showDebug && (
        <div style={{ 
          padding: '12px', 
          marginTop: '16px',
          marginBottom: '10px',
          backgroundColor: '#f5f5f5',
          borderRadius: '6px',
          border: '1px solid #e8e8e8'
        }}>
          <Typography.Title level={5} style={{ marginTop: 0, marginBottom: '16px' }}>
            展示内容对比
          </Typography.Title>
          
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="原始文本 (从配置中获取)">
              <div style={{ 
                maxHeight: '150px', 
                overflow: 'auto', 
                padding: '8px', 
                backgroundColor: '#fff',
                borderRadius: '4px',
                border: '1px solid #d9d9d9'
              }}>
                <Text code copyable style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {rawText || node.config?.rawText || '未找到原始文本'}
                </Text>
              </div>
            </Descriptions.Item>
            
            <Descriptions.Item 
              label={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span>前端实时解析 (直接从API获取变量值)</span>
                  <Space>
                    <Button 
                      type={forceTestMode ? "primary" : "default"}
                      onClick={toggleForceTestMode}
                      size="small"
                      danger={forceTestMode}
                      title={forceTestMode ? "禁用强制测试模式" : "启用强制测试模式"}
                    >
                      {forceTestMode ? "测试中" : "强制测试"}
                    </Button>
                    <Button 
                      type="text" 
                      icon={<ReloadOutlined />} 
                      onClick={handleRefreshParse}
                      size="small"
                      title="重新解析变量"
                    />
                  </Space>
                </div>
              }
            >
              <div style={{ 
                maxHeight: '150px', 
                overflow: 'auto', 
                padding: '8px', 
                backgroundColor: '#fff',
                borderRadius: '4px',
                border: '1px solid #d9d9d9',
                position: 'relative'
              }}>
                {parsingInProgress ? (
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                    <Spin size="small" tip="解析中..." />
                  </div>
                ) : (
                  <>
                    <Text code copyable style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {realtimeParseResult || '(无解析结果)'}
                    </Text>
                    
                    {parsingErrors.length > 0 && (
                      <div style={{ 
                        marginTop: '8px', 
                        padding: '8px', 
                        backgroundColor: '#fff1f0', 
                        border: '1px solid #ffccc7',
                        borderRadius: '4px'
                      }}>
                        <Typography.Text type="danger" strong>解析错误:</Typography.Text>
                        <ul style={{ margin: '4px 0 0 0', paddingLeft: '20px' }}>
                          {parsingErrors.map((error, index) => (
                            <li key={index}><Typography.Text type="danger">{error}</Typography.Text></li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Descriptions.Item>
            
            <Descriptions.Item label="解析后文本 (引擎解析)">
              <div style={{ 
                maxHeight: '150px', 
                overflow: 'auto', 
                padding: '8px', 
                backgroundColor: '#fff',
                borderRadius: '4px',
                border: '1px solid #d9d9d9'
              }}>
                <Text code copyable style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {content || ''}
                </Text>
              </div>
            </Descriptions.Item>
          </Descriptions>
        </div>
      )}
    </div>
  );
};

export default DisplayNodeContent;
