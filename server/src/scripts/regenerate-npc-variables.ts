import { AppDataSource } from '../database';
import { Npc } from '../models/Npc';
import { Variable, VariableType } from '../models/Variable';
import { NpcVariableSourceProvider } from '../services/NpcVariableSourceProvider';

/**
 * 重新生成NPC变量的脚本
 * 使用新的标识符格式，为每个NPC字段生成独立的标识符
 */
async function regenerateNpcVariables() {
  try {
    console.log('开始重新生成NPC变量...');
    
    // 初始化数据库连接
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('数据库连接已初始化');
    }

    // 获取变量仓库和NPC仓库
    const variableRepo = AppDataSource.getRepository(Variable);
    const npcRepo = AppDataSource.getRepository(Npc);
    
    // 查询所有NPC类型的变量
    const npcVariables = await variableRepo.find({
      where: {
        type: VariableType.NPC
      }
    });
    console.log(`找到 ${npcVariables.length} 个NPC类型的变量`);
    
    // 删除所有NPC类型的变量
    if (npcVariables.length > 0) {
      await variableRepo.remove(npcVariables);
      console.log(`已删除 ${npcVariables.length} 个现有NPC变量`);
    }
    
    // 查询所有NPC
    const npcs = await npcRepo.find();
    console.log(`找到 ${npcs.length} 个NPC`);
    
    if (npcs.length === 0) {
      console.log('没有NPC数据，无需重新生成变量');
      return;
    }
    
    // 创建NPC变量提供者
    const npcVariableProvider = new NpcVariableSourceProvider();
    
    // 同步所有NPC变量到数据库
    await npcVariableProvider.syncVariablesToDatabase();
    
    // 查询新生成的NPC变量数量
    const newNpcVariables = await variableRepo.find({
      where: {
        type: VariableType.NPC
      }
    });
    
    console.log(`成功重新生成了 ${newNpcVariables.length} 个NPC变量`);
    console.log('变量重新生成完成，每个NPC字段现在拥有独立的标识符');
    
  } catch (error) {
    console.error('重新生成NPC变量时发生错误:', error);
  } finally {
    // 关闭数据库连接
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('数据库连接已关闭');
    }
  }
}

// 执行脚本
regenerateNpcVariables().catch(console.error);
