/**
 * 变量工具类
 * 提供解析变量ID、处理变量格式等功能
 */

/**
 * 解析完整ID
 * 例如 "workflow_3cf313b1-84a9-4156-bbf2-01c54125a5bf_name" =>
 * { type: "workflow", entityId: "3cf313b1-84a9-4156-bbf2-01c54125a5bf", field: "name" }
 */
export const parseFullId = (fullId: string): { type: string; entityId: string; field: string } | null => {
  if (!fullId) return null;
  
  // 分割ID
  const parts = fullId.split('_');
  if (parts.length < 3) {
    return null;
  }
  
  // 提取类型、实体ID和字段
  const type = parts[0];
  const field = parts[parts.length - 1];
  
  // 中间部分全部作为entityId（处理可能包含下划线的ID）
  const entityIdParts = parts.slice(1, parts.length - 1);
  const entityId = entityIdParts.join('_');
  
  return { type, entityId, field };
};

/**
 * 从系统标识符中提取完整ID
 * 例如：从 "@gv_workflow_123_name-=" 提取 "workflow_123_name"
 */
export const extractFullIdFromSystemId = (systemId: string): string | null => {
  if (!systemId) return null;
  
  // 格式: @gv_type_id_field-=
  const match = systemId.match(/@gv_([a-z]+)_([a-zA-Z0-9-]+)_([a-z]+)-=/i);
  if (!match) return null;
  
  const type = match[1];
  const id = match[2];
  const field = match[3];
  
  return `${type}_${id}_${field}`;
};

/**
 * 构建完整ID
 */
export const buildFullId = (type: string, entityId: string, field: string): string => {
  return `${type}_${entityId}_${field}`;
};

/**
 * 获取变量类型显示名称
 */
export const getVariableTypeDisplayName = (type: string): string => {
  switch (type.toLowerCase()) {
    case 'npc': return 'NPC';
    case 'task': return '任务';
    case 'workflow': return '工作流';
    case 'file': return '文件';
    case 'custom': return '自定义';
    default: return type;
  }
};
