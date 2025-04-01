import { Node as ProseMirrorNode } from 'prosemirror-model';

/**
 * ProseMirror序列化工具
 * 直接将ProseMirror文档转换为系统标识符格式(rawtext)，
 * 特别处理变量节点，确保变量信息完整保留
 * 
 * 核心优势：绕过HTML中间层，直接从文档状态生成rawText，
 * 避免DOM解析过程中可能丢失的变量信息
 */

/**
 * 将ProseMirror文档序列化为rawText格式
 * 这避免了通过HTML中间层转换的不可靠性
 */
export function serializeToRawText(doc: ProseMirrorNode): string {
  let result = '';
  
  // 递归遍历并序列化节点 
  doc.forEach(node => {
    result += serializeNodeToRawText(node);
  });
  
  return result;
}

/**
 * 序列化单个节点到rawText格式
 */
function serializeNodeToRawText(node: ProseMirrorNode): string {
  // 如果是变量节点，直接生成系统标识符
  if (node.type.name === 'variable') {
    // 从节点属性中提取必要信息
    const id = node.attrs.id || 'unknown';
    const field = node.attrs.field || 'unknown';
    const sourceType = node.attrs.sourceType || 'custom';
    const type = node.attrs.type || sourceType;
    
    // 检查ID是否已经是v3.0格式 (type_entityId_field)
    let entityId = id;
    if (id && id.includes('_')) {
      const idParts = id.split('_');
      if (idParts.length >= 3) {
        // 只取UUID部分作为实体ID
        entityId = idParts.slice(1, -1).join('_');
      }
    }
    
    console.log(`[v3.0 Serializer] 生成标识符: type=${type}, id=${entityId}, field=${field}`);
    
    // 生成v3.0格式系统标识符，包括结束标记
    return `@gv_${type}_${entityId}_${field}-=`;
  }
  
  // 如果是文本节点，直接返回文本内容
  if (node.isText) {
    return node.text || '';
  }
  
  // 对于有子节点的节点（如段落、块等），递归处理子节点
  let content = '';
  if (node.content && node.content.size > 0) {
    node.content.forEach(child => {
      content += serializeNodeToRawText(child);
    });
  }
  
  // 特殊处理段落节点，添加换行符
  if (node.type.name === 'paragraph') {
    return content + '\n';
  }
  
  // 其他类型节点，仅返回其内容
  return content;
}

/**
 * 从编辑器实例获取rawText
 * 这是暴露给外部的主要API
 */
export function getRawTextFromEditor(editor: any): string {
  if (!editor) {
    return '';
  }
  
  try {
    // 获取文档对象
    const { doc } = editor.state;
    
    // 序列化文档
    return serializeToRawText(doc);
  } catch (error) {
    console.error('从编辑器获取rawText出错:', error);
    return '';
  }
}
