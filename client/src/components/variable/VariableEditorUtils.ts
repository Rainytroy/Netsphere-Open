import { variableService } from '../../services/variableService';
import { clearVariableCache, updateVariableIdentifiers } from '../../utils/VariableResolver';
import { resolveVariables, getVariables } from '../../utils/VariableResolverDebug';
import { message } from 'antd';

// 富文本内容格式，统一管理编辑器各种表示形式
export interface RichTextContent {
  html: string;        // 完整HTML，包含变量标记和样式
  rawText: string;     // 原始文本，包含@变量标记
  plainText?: string;  // 纯文本，不包含HTML和变量标记（可选）
}

// 导出类型定义
export interface VariableEditorRef {
  insertVariable: (variable: any) => void;
  updateContent: (content: string) => void;
  focusEditor: () => void;
  parseExternalContent: (text: string) => void;
  getRawContent: () => string;
  getResolvedContent: () => Promise<string>;
  
  // 新增方法 - 富文本内容支持
  getRichContent: () => RichTextContent;
  updateRichContent: (content: RichTextContent) => void;
}

export interface VariableEditor2Props {
  variables: any[];
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
  currentTaskName?: string;
}

export interface PreviewData {
  rawHtml: string;
  rawText: string;
  resolvedHtml: string;
  resolvedText: string;
}

// 工具函数
export const convertToVariableItem = (apiVar: any): any => {
  return {
    id: apiVar.id,
    identifier: apiVar.identifier,
    sourceName: apiVar.sourceName || apiVar.source?.name || '系统变量',
    type: apiVar.type,
    value: apiVar.value,
  };
};

// 将外部文本转换为编辑器内容
export const parseTextToEditorContent = (text: string): string => {
  if (!text) return '';
  
  console.log('[parseTextToEditorContent] 开始处理文本:', text);
  
  // 增强版正则表达式，用于匹配变量标识符，添加明确的边界限制
  const variablePattern = /(@[a-zA-Z0-9_\u4e00-\u9fa5]+\.[a-zA-Z0-9_]+(?:#[a-zA-Z0-9-]+)?)/g;
  
  // 预处理：在连续变量之间添加空格，避免它们被粘连
  let processedText = text.replace(variablePattern, '$1 ');
  console.log('[parseTextToEditorContent] 预处理后文本:', processedText);
  
  // 将文本包装在段落标签中，如果它没有HTML格式
  let htmlContent = processedText.trim().startsWith('<') ? processedText : `<p>${processedText}</p>`;
  
  // 使用更严格的正则表达式重新扫描变量
  // 避免将连续变量的一部分误识别为变量
  const refinedPattern = /(?<!\w)@([a-zA-Z0-9_\u4e00-\u9fa5]+)\.([a-zA-Z0-9_]+)(?:#([a-zA-Z0-9-]+))?(?!\w)/g;
  
  // 使用exec循环查找所有变量标识符（兼容性更好）
  let match;
  const matches = [];
  while ((match = refinedPattern.exec(processedText)) !== null) {
    matches.push(match);
  }
  
  // 如果没有变量标识符，直接返回
  if (matches.length === 0) {
    console.log('[parseTextToEditorContent] 未找到变量标识符');
    return htmlContent;
  }
  
  console.log('[parseTextToEditorContent] 找到变量标识符:', matches.length, '个');
  
  // 跟踪已处理的标识符，避免重复处理
  const processedIdentifiers = new Set();
  
  // 遍历所有找到的变量标识符
  for (const match of matches) {
    const fullMatch = match[0];
    const source = match[1];
    const field = match[2];
    const id = match[3] || ''; // 确保id有值，即使是空字符串
    
    // 检查是否已处理过该标识符
    if (processedIdentifiers.has(fullMatch)) {
      console.log('[parseTextToEditorContent] 跳过已处理的标识符:', fullMatch);
      continue;
    }
    
    // 标记为已处理
    processedIdentifiers.add(fullMatch);
    
    // 变量完整标识符
    const identifier = fullMatch; // 使用完整匹配作为标识符，确保格式正确
    
    console.log('[parseTextToEditorContent] 处理变量标识符:', fullMatch, '源:', source, '字段:', field, 'ID:', id);
    
    // 确定变量类型
    let type = 'unknown';
    let sourceName = source;
    
    // 基于ID或变量名判断变量类型 - 改进的判断逻辑
    if (id === 'custom' || id === '152957') {
      // 特殊处理 - 自定义变量ID
      type = 'custom';
      // 对于自定义变量，保留原始源名称，不做修改
      console.log('[parseTextToEditorContent] 检测到自定义变量ID:', id, '保留原始源名称:', source);
    } else if (id) {
      // 更精确的ID格式判断 - 不再只依赖六位十六进制
      if (id.startsWith('d7') && id.length === 6) { 
        // 工作流ID格式
        type = 'workflow';
      } else if (id.startsWith('3a') && id.length === 6) { 
        // NPC ID格式
        type = 'npc';
      } else if (id.startsWith('ef') && id.length === 6) { 
        // 任务ID格式
        type = 'task';
      } else if (id.startsWith('df') && id.length === 6) { 
        // 另一种NPC ID格式
        type = 'npc';
      } else {
        // 其他ID格式，尝试从源名称猜测
        console.log('[parseTextToEditorContent] 未知ID格式:', id, '使用源名称推断类型');
        type = inferTypeFromSourceName(source);
      }
    } else {
      // 没有ID的情况，从源名称猜测
      type = inferTypeFromSourceName(source);
    }
    
    console.log('[parseTextToEditorContent] 确定变量类型:', type);
    
    // 创建变量节点的HTML表示，使用与Variable扩展一致的格式
    const variableHtml = `<span identifier="${identifier}" sourcename="${sourceName}" type="${type}" data-variable="" data-identifier="${identifier}" data-type="${type}" class="variable-tag" contenteditable="false">${fullMatch}</span>`;
    
    // 替换文本中的变量标识符为变量节点 - 使用更安全的方式
    // 确保只替换完整的变量标识符，而不是部分匹配
    const safeReplacePattern = new RegExp(escapeRegExp(fullMatch), 'g');
    htmlContent = htmlContent.replace(safeReplacePattern, variableHtml);
  }
  
  console.log('[parseTextToEditorContent] 最终HTML内容长度:', htmlContent.length);
  return htmlContent;
};

// 辅助函数：转义正则表达式特殊字符
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 辅助函数：根据源名称推断变量类型
function inferTypeFromSourceName(source: string): string {
  if (source.includes('工作流')) {
    return 'workflow';
  } else if (source.includes('任务') || source.endsWith('是谁')) {
    return 'task';
  } else if (source.includes('NPC') || source.includes('npc')) {
    return 'npc';
  } else {
    return 'custom'; // 默认为自定义
  }
}

// 提取编辑器内容中的原始文本（包含变量标识符）
export const extractRawContent = (content: string): string => {
  if (!content) return '';
  
  // 创建临时DOM元素来解析HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;
  
  // 增强型变量节点查找 - 支持多种可能的变量标记方式
  // 使用Array.from转换NodeListOf为数组，避免展开运算符TypeScript兼容性问题
  const variableNodes = Array.from(tempDiv.querySelectorAll('span[data-type="variable"]'))
    .concat(Array.from(tempDiv.querySelectorAll('.variable-tag')))
    .concat(Array.from(tempDiv.querySelectorAll('span[identifier]')));
  
  console.log('[VariableEditor2] 找到变量节点数量:', variableNodes.length);
  
  // 替换变量节点为其标识符
  variableNodes.forEach(node => {
    // 支持多种属性格式
    const identifier = 
      node.getAttribute('data-identifier') || 
      node.getAttribute('identifier') ||
      node.textContent?.trim().replace(/^@/, ''); // 尝试从节点内容提取变量标识符
      
    if (identifier) {
      console.log('[VariableEditor2] 处理变量节点，标识符:', identifier);
      // 确保标识符格式正确（以@开头）
      const formattedIdentifier = identifier.startsWith('@') ? identifier : `@${identifier}`;
      // 创建文本节点，替换变量节点
      const textNode = document.createTextNode(formattedIdentifier);
      node.parentNode?.replaceChild(textNode, node);
    }
  });
  
  // 返回处理后的内容
  return tempDiv.innerHTML;
};

// 获取纯文本内容（去除HTML标签）
export const getPlainText = (htmlContent: string): string => {
  if (!htmlContent) return '';
  
  // 创建临时DOM元素来解析HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  // 获取纯文本内容
  return tempDiv.textContent || tempDiv.innerText || '';
};

// 模拟变量数据
export const dummyVariables = [
  {
    id: 'test-1',
    identifier: '@测试.value#custom',
    sourceName: '测试来源',
    type: 'custom',
    value: '我是谁'
  },
  {
    id: 'test-2',
    identifier: '@test.var2',
    sourceName: '测试来源',
    type: 'npc',
    value: '测试值2'
  }
];

// 运行变量解析调试
export const runDebugTests = async (): Promise<void> => {
  message.info("开始运行变量解析测试...");
  try {
    clearVariableCache();
    await getVariables();
    
    // 测试用例
    const testCases = [
      '@测试.value#custom',
      '@测试.value',
      '测试文本 @测试.value#custom 测试文本'
    ];
    
    // 依次测试每个用例
    for (const testCase of testCases) {
      await resolveVariables(testCase, false);
    }
    
    message.success("变量解析完成");
  } catch (error) {
    console.error('变量解析测试失败:', error);
    message.error("变量解析测试失败");
  }
};

// 从API加载全局变量
export const loadGlobalVariables = async (setLoading: (value: boolean) => void, setEditorVariables: any, testVariablesEnabled: boolean = true) => {
  try {
    setLoading(true);
    console.log('[VariableEditor2] 开始加载全局变量...');
    
    // 始终添加一些测试变量
    if (testVariablesEnabled) {
      console.log('[VariableEditor2] 调试模式启用，添加测试变量');
      setEditorVariables((prev: any[]) => {
        // 确保不重复添加
        const existingIds = new Set(prev.map(v => v.id));
        const newVars = dummyVariables.filter(v => !existingIds.has(v.id));
        
        // 合并原有变量和测试变量
        const merged = [...prev, ...newVars];
        console.log('[VariableEditor2] 添加测试变量后总数:', merged.length);
        console.log('[VariableEditor2] 测试变量列表:', merged);
        
        return merged;
      });
    }
    
    // 调用API获取变量
    const response = await variableService.getVariables();
    console.log('[VariableEditor2] API响应:', response);
    
    // 处理响应数据，确保我们有一个有效的数组
    let responseData: any[] = [];
    if (response) {
      if (Array.isArray(response)) {
        responseData = response;
        console.log('[VariableEditor2] 响应直接是数组');
      } else if (response && typeof response === 'object') {
        // 检查response.data
        const responseObj = response as any;
        if (responseObj.data && Array.isArray(responseObj.data)) {
          responseData = responseObj.data;
          console.log('[VariableEditor2] 响应.data是数组');
        } else if (responseObj.data && responseObj.data.data && Array.isArray(responseObj.data.data)) {
          responseData = responseObj.data.data;
          console.log('[VariableEditor2] 响应.data.data是数组');
        }
      }
    }
    
    console.log('[VariableEditor2] 处理后的响应数据长度:', responseData.length);
    
    // 转换变量为编辑器可用的格式
    const variableItems = responseData.map(convertToVariableItem);
    console.log('[VariableEditor2] 转换后的变量项:', variableItems.length);
    
    // 合并现有变量和新加载的变量
    setEditorVariables((prevVars: any[]) => {
      // 创建一个新的Map，用变量ID作为键来去重
      const varMap = new Map();
      
      // 添加已有的变量
      prevVars.forEach(v => varMap.set(v.id, v));
      
      // 添加新加载的变量
      variableItems.forEach(v => {
        if (!varMap.has(v.id)) {
          varMap.set(v.id, v);
        }
      });
      
      // 转换回数组
      const result = Array.from(varMap.values());
      console.log('[VariableEditor2] 最终合并的变量总数:', result.length);
      
      return result;
    });
  } catch (error) {
    console.error('[VariableEditor2] 加载变量列表失败:', error);
  } finally {
    setLoading(false);
  }
};
