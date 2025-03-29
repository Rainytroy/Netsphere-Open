/**
 * 变量标识符转换工具
 * 用于在显示标识符和系统标识符之间转换
 */
import createLogger from './logger';

const logger = createLogger('identifierConverter');

/**
 * 将显示标识符转换为系统标识符
 * @param template 包含变量标识符的模板字符串
 * @param npcs NPC数据数组
 * @returns 转换后的字符串
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
