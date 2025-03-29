/**
 * 简单的UUID v4实现
 * 生成随机的UUID v4格式字符串
 */
export function v4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * 生成简单的基于时间戳的唯一ID
 * 不是标准的UUID v1，但可以满足基本需求
 */
export function v1(): string {
  const now = new Date().getTime();
  return 'xxxxxxxx-xxxx-1xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (now + Math.random() * 16) % 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default {
  v4,
  v1
};
