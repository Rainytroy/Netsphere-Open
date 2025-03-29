/**
 * 模板工具函数
 * 提供NPC模板相关的共享工具函数
 */

/**
 * 工具函数: 将显示标识符转换为系统标识符
 * 例如: @云透.name#3c4fe8 -> @gv_uuid_name
 */
export const convertToSystemIdentifiers = (template: string, npcs: any[]): string => {
  if (!template) return '';
  
  // 如果已经是系统标识符格式，不做处理
  if (template.includes('@gv_') && !template.includes('#')) {
    return template;
  }
  
  // 构建NPC名称到ID的映射
  const npcMap = new Map();
  npcs.forEach(npc => {
    if (npc && npc.name && npc.id) {
      npcMap.set(npc.name, npc.id);
    }
  });
  
  // 替换显示标识符为系统标识符
  return template.replace(/@([^.]+)\.([^#\s]+)(?:#[a-f0-9]+)?/g, 
    (match, npcName, field) => {
      const npcId = npcMap.get(npcName);
      if (npcId) {
        return `@gv_${npcId}_${field}`;
      }
      // 如果找不到对应的NPC ID，保持原样
      return match;
    }
  );
};

/**
 * 生成NPC默认模板 - 使用系统标识符格式
 * @param npcName NPC名称
 * @param npcId 可选的NPC ID
 * @returns 生成的默认模板
 */
export const generateDefaultTemplate = async (npcName: string, npcId?: string): Promise<string> => {
  if (!npcId) {
    // 没有ID时使用简单格式（向后兼容）
    return `你是@${npcName}.name，现在你具备的知识背景是：@${npcName}.knowledge，根据你的行动原则：@${npcName}.act，请你给出以上输入的反馈。`;
  }
  
  // 使用系统标识符格式生成模板
  return `你是@gv_${npcId}_name，现在你具备的知识背景是：@gv_${npcId}_knowledge，根据你的行动原则：@gv_${npcId}_act，请你给出以上输入的反馈。`;
};
