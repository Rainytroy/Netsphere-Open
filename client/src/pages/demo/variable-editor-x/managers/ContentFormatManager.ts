import { Editor } from '@tiptap/core';
import { variableNodeEngine } from '../utils/VariableNodeEngine';
import { getRawTextFromEditor } from '../utils/proseMirrorSerializer';

/**
 * 内容格式管理器
 * 负责处理不同格式的内容转换：HTML、JSON、纯文本(rawText)
 * 拆分自VariableEditorX组件中的格式转换逻辑
 */
export class ContentFormatManager {
  private static instance: ContentFormatManager;
  
  private constructor() {
    // 私有构造函数确保单例模式
  }
  
  /**
   * 获取单例实例
   */
  public static getInstance(): ContentFormatManager {
    if (!ContentFormatManager.instance) {
      ContentFormatManager.instance = new ContentFormatManager();
    }
    return ContentFormatManager.instance;
  }
  
  /**
   * 从HTML内容中提取纯文本版本，保留变量标识符
   */
  public convertHtmlToRawText(html: string): string {
    if (!html) return '';
    
    try {
      // 创建临时DOM来解析HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      // 收集文本内容，将变量标签替换为系统标识符
      let result = '';
      
      // 递归处理节点，保留变量标识符
      const processNode = (node: Node) => {
        // 变量标签处理
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          
          // 检查是否是变量标签
          if (element.hasAttribute('data-variable')) {
            // 获取系统标识符或生成一个
            const identifier = element.getAttribute('data-identifier') ||
                              `@gv_${element.getAttribute('data-id')}_${element.getAttribute('data-field')}`;
            
            // 使用系统标识符表示变量
            result += identifier + ' ';
            return;
          }
        }
        
        // 文本节点处理
        if (node.nodeType === Node.TEXT_NODE) {
          result += node.textContent;
          return;
        }
        
        // 递归处理子节点
        node.childNodes.forEach(processNode);
      };
      
      // 处理所有顶层节点
      tempDiv.childNodes.forEach(processNode);
      
      // 清理多余空格和换行
      return result.trim();
    } catch (error) {
      console.error('转换HTML到纯文本失败:', error);
      return html;
    }
  }
  
  /**
   * 转换HTML到JSON格式
   */
  public convertHtmlToJson(html: string): any {
    if (!html) return { type: 'doc', content: [] };
    
    try {
      // 创建临时DOM
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      // 构建JSON结构
      const result = {
        type: 'doc',
        content: [] as any[]
      };
      
      // TODO: 实现HTML到JSON的转换逻辑
      // 这需要深入的HTML解析和ProseMirror节点结构构建
      // 暂时返回一个基本结构，完整实现需要更深入的解析
      
      const paragraphs = tempDiv.querySelectorAll('p');
      paragraphs.forEach(p => {
        const paragraph = {
          type: 'paragraph',
          content: [] as any[]
        };
        
        // 处理文本和变量标签
        Array.from(p.childNodes).forEach(node => {
          if (node.nodeType === Node.TEXT_NODE && node.textContent) {
            paragraph.content.push({
              type: 'text',
              text: node.textContent
            });
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const elem = node as HTMLElement;
            if (elem.hasAttribute('data-variable')) {
              // 提取变量属性
              const attrs = {
                id: elem.getAttribute('data-id') || 'unknown',
                field: elem.getAttribute('data-field') || 'unknown',
                sourceName: elem.getAttribute('data-source-name') || 'Unknown',
                sourceType: elem.getAttribute('data-type') || 'system',
                displayIdentifier: elem.getAttribute('data-display-identifier') || undefined
              };
              
              // 添加变量节点
              paragraph.content.push({
                type: 'variable',
                attrs
              });
            }
          }
        });
        
        // 添加段落
        if (paragraph.content.length > 0) {
          result.content.push(paragraph);
        }
      });
      
      return result;
    } catch (error) {
      console.error('转换HTML到JSON失败:', error);
      return { type: 'doc', content: [] };
    }
  }
  
  /**
   * 从JSON格式转换到HTML
   */
  public convertJsonToHtml(json: any): string {
    if (!json) return '<p></p>';
    
    try {
      // 创建临时DOM
      const tempDiv = document.createElement('div');
      
      // 递归处理JSON结构
      const processNode = (node: any): Node => {
        if (!node || !node.type) {
          return document.createTextNode('');
        }
        
        // 处理文本节点
        if (node.type === 'text') {
          return document.createTextNode(node.text || '');
        }
        
        // 处理段落节点
        if (node.type === 'paragraph') {
          const p = document.createElement('p');
          
          // 处理子节点
          if (node.content && Array.isArray(node.content)) {
            node.content.forEach((child: any) => {
              p.appendChild(processNode(child));
            });
          }
          
          return p;
        }
        
        // 处理变量节点
        if (node.type === 'variable' && node.attrs) {
          // 使用变量节点引擎生成HTML
          const span = document.createElement('span');
          const html = variableNodeEngine.generateHtml(node.attrs);
          
          // 创建临时容器
          const container = document.createElement('div');
          container.innerHTML = html;
          
          // 返回第一个子节点（变量标签）
          return container.firstChild || span;
        }
        
        // 默认返回空文本节点
        return document.createTextNode('');
      };
      
      // 处理内容
      if (json.content && Array.isArray(json.content)) {
        json.content.forEach((node: any) => {
          tempDiv.appendChild(processNode(node));
        });
      }
      
      // 确保至少有一个段落
      if (tempDiv.innerHTML === '') {
        tempDiv.innerHTML = '<p></p>';
      }
      
      return tempDiv.innerHTML;
    } catch (error) {
      console.error('转换JSON到HTML失败:', error);
      return '<p></p>';
    }
  }
  
  /**
   * 将纯文本转换为HTML，尝试识别和转换变量标识符
   */
  public convertTextToHtml(text: string): string {
    if (!text) return '<p></p>';
    
    try {
      // 分割文本行
      const lines = text.split(/\r?\n\r?\n/);
      const result: string[] = [];
      
      // 识别系统标识符的正则表达式
      const sysIdRegex = /@gv_([a-zA-Z0-9-]+)_([a-zA-Z0-9_]+)/g;
      
      // 处理每一行文本
      lines.forEach(line => {
        // 查找并替换系统标识符
        let processedLine = line.replace(sysIdRegex, (match, id, field) => {
          // 解析标识符
          const parsedId = variableNodeEngine.parseIdentifier(match);
          
          if (parsedId && parsedId.id) {
            // 构建变量属性
            const attrs = variableNodeEngine.createNodeAttributes({
              id: parsedId.id,
              field: parsedId.field || 'unknown',
              sourceName: 'Unknown', // 无法从标识符获取
              sourceType: 'system'    // 无法从标识符获取
            });
            
            // 生成HTML
            return variableNodeEngine.generateHtml(attrs);
          }
          
          // 无法解析时保留原始文本
          return match;
        });
        
        // 包装在段落标签中
        result.push(`<p>${processedLine}</p>`);
      });
      
      // 返回HTML字符串
      return result.join('') || '<p></p>';
    } catch (error) {
      console.error('转换文本到HTML失败:', error);
      return `<p>${text}</p>`;
    }
  }
  
  /**
   * 从编辑器获取纯文本内容，保留变量标识符
   */
  public getRawTextFromEditor(editor: Editor): string {
    if (!editor) return '';
    
    try {
      // 使用专用的序列化器获取原始文本
      return getRawTextFromEditor(editor);
    } catch (error) {
      console.error('从编辑器获取原始文本失败:', error);
      
      // 降级方案：先获取HTML然后转换
      const html = editor.getHTML();
      return this.convertHtmlToRawText(html);
    }
  }
  
  /**
   * 检测内容类型：HTML、JSON、纯文本
   */
  public detectContentType(content: string): 'html' | 'json' | 'text' {
    if (!content) return 'text';
    
    const trimmedContent = content.trim();
    
    // 检查是否可能是JSON格式
    if (trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) {
      try {
        JSON.parse(trimmedContent);
        return 'json';
      } catch (e) {
        // 解析失败，不是有效的JSON
      }
    }
    
    // 检查是否为HTML格式
    if (/<\/?[a-z][\s\S]*>/i.test(trimmedContent)) {
      return 'html';
    }
    
    // 默认为纯文本
    return 'text';
  }
  
  /**
   * 通用的内容格式转换器
   * 自动检测源格式，转换为目标格式
   */
  public convertContent(
    content: string,
    targetFormat: 'html' | 'json' | 'text'
  ): string | object {
    if (!content) {
      return targetFormat === 'json' ? { type: 'doc', content: [] } : 
             targetFormat === 'html' ? '<p></p>' : '';
    }
    
    // 检测源格式
    const sourceFormat = this.detectContentType(content);
    
    // 如果源格式和目标格式相同，直接返回
    if (sourceFormat === targetFormat) {
      return sourceFormat === 'json' ? JSON.parse(content) : content;
    }
    
    // 转换逻辑
    if (sourceFormat === 'html') {
      if (targetFormat === 'json') {
        return this.convertHtmlToJson(content);
      } else if (targetFormat === 'text') {
        return this.convertHtmlToRawText(content);
      }
    } else if (sourceFormat === 'json') {
      const jsonContent = typeof content === 'string' ? JSON.parse(content) : content;
      if (targetFormat === 'html') {
        return this.convertJsonToHtml(jsonContent);
      } else if (targetFormat === 'text') {
        const html = this.convertJsonToHtml(jsonContent);
        return this.convertHtmlToRawText(html);
      }
    } else if (sourceFormat === 'text') {
      if (targetFormat === 'html') {
        return this.convertTextToHtml(content);
      } else if (targetFormat === 'json') {
        const html = this.convertTextToHtml(content);
        return this.convertHtmlToJson(html);
      }
    }
    
    // 如果没有匹配的转换路径，直接返回原始内容
    return content;
  }
}

// 导出单例实例
export const contentFormatManager = ContentFormatManager.getInstance();
