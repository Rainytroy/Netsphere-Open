/**
 * 内容处理工具
 * 用于处理工作流中展示卡的内容处理和动画效果
 */

/**
 * 处理内容结果
 */
interface ProcessContentResult {
  content: string;
  source: 'rawText' | 'parsedContent' | 'richContent' | 'variablePath';
  hasUnresolvedVars: boolean;
}

/**
 * 处理展示卡内容
 * 根据配置处理展示卡内容，包括变量替换和格式化
 * 
 * @param rawText 原始文本内容
 * @param parsedContent 已解析的内容
 * @param variables 变量集合
 * @returns 处理结果
 */
export const processContent = (
  rawText?: string,
  parsedContent?: string,
  variables?: Record<string, any>
): ProcessContentResult => {
  // 默认结果
  const result: ProcessContentResult = {
    content: '',
    source: 'rawText',
    hasUnresolvedVars: false
  };
  
  // 处理变量占位符
  const processVariables = (text: string): { processed: string; hasUnresolved: boolean } => {
    if (!text || !variables) {
      return { processed: text || '', hasUnresolved: false };
    }
    
    let hasUnresolved = false;
    
    // 替换变量占位符 ${var_name}
    const processed = text.replace(/\${([^}]+)}/g, (match, varName) => {
      if (variables[varName] !== undefined) {
        return String(variables[varName]);
      }
      
      // 变量不存在，保留占位符
      hasUnresolved = true;
      return match;
    });
    
    return { processed, hasUnresolved };
  };
  
  // 1. 优先使用已解析的内容
  if (parsedContent) {
    const { processed, hasUnresolved } = processVariables(parsedContent);
    result.content = processed;
    result.source = 'parsedContent';
    result.hasUnresolvedVars = hasUnresolved;
    return result;
  }
  
  // 2. 如果没有已解析内容，使用原始文本
  if (rawText) {
    const { processed, hasUnresolved } = processVariables(rawText);
    result.content = processed;
    result.source = 'rawText';
    result.hasUnresolvedVars = hasUnresolved;
    return result;
  }
  
  // 3. 如果都没有，返回空结果
  return result;
};

/**
 * 渐进式显示内容
 * 实现类似打字机效果的内容渐进显示
 * 
 * @param content 要显示的内容
 * @param updateCallback 更新回调函数，用于更新UI显示
 * @param disableAnimation 是否禁用动画
 * @returns Promise，动画完成后解析
 */
export const displayContentProgressively = async (
  content: string,
  updateCallback: (content: string, animationComplete: boolean) => void,
  disableAnimation: boolean = false
): Promise<void> => {
  if (!content) {
    updateCallback('', true);
    return;
  }
  
  // 如果禁用动画，直接显示完整内容
  if (disableAnimation) {
    updateCallback(content, true);
    return;
  }
  
  // 字符显示延迟（毫秒）
  const charDelay = 30;
  // 段落间延迟（毫秒）
  const paragraphDelay = 300;
  
  // 将内容分成段落
  const paragraphs = content.split('\n');
  let displayedContent = '';
  
  // 逐段落显示
  for (let p = 0; p < paragraphs.length; p++) {
    const paragraph = paragraphs[p];
    
    // 逐字符显示
    for (let i = 0; i < paragraph.length; i++) {
      displayedContent += paragraph[i];
      updateCallback(displayedContent, false);
      await new Promise(resolve => setTimeout(resolve, charDelay));
    }
    
    // 添加换行
    if (p < paragraphs.length - 1) {
      displayedContent += '\n';
      updateCallback(displayedContent, false);
      await new Promise(resolve => setTimeout(resolve, paragraphDelay));
    }
  }
  
  // 动画完成
  updateCallback(content, true);
};
