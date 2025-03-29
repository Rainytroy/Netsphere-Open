import { AppDataSource } from '../database';
import { Variable, VariableType } from '../models/Variable';
import { Npc } from '../models/Npc';
import { In, Like, Repository } from 'typeorm';
import { IdentifierFormatterService } from '../services/IdentifierFormatterService';

/**
 * NPC变量字段名简化迁移脚本
 * 
 * 该脚本将把旧格式的NPC变量字段名称：
 * - knowledge_background 重命名为 kb
 * - action_principles 重命名为 ap
 * - activity_level 重命名为 al
 * 
 * 同时将为变量添加entityId和更新标识符格式
 */

// 字段映射: 旧字段名 -> 新字段名
const FIELD_MAPPING = {
  'knowledge_background': 'kb',
  'action_principles': 'ap', 
  'activity_level': 'al'
};

// 显示名称映射
const DISPLAY_NAME_MAPPING = {
  'kb': '知识背景',
  'ap': '行为原则',
  'al': '活跃度',
};

/**
 * 执行字段简化迁移
 */
async function runMigration() {
  try {
    console.log('======== NPC变量字段简化迁移开始 ========');
    console.log('准备数据库连接...');
    
    // 确保数据库已初始化
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    
    const variableRepo = AppDataSource.getRepository(Variable);
    const npcRepo = AppDataSource.getRepository(Npc);
    const identifierFormatter = IdentifierFormatterService.getInstance();
    
    console.log('获取所有NPC...');
    const npcs = await npcRepo.find();
    console.log(`找到 ${npcs.length} 个NPC`);
    
    // 统计信息
    let updatedCount = 0;
    let skippedCount = 0;
    
    // 为每个NPC处理其变量
    for (const npc of npcs) {
      console.log(`\n处理NPC: ${npc.name} (ID: ${npc.id})`);
      
      // 查找该NPC的所有变量
      const variables = await findNpcVariables(variableRepo, npc.id);
      
      if (variables.length === 0) {
        console.log(`  未找到关联变量，跳过...`);
        continue;
      }
      
      console.log(`  找到 ${variables.length} 个关联变量，开始更新...`);
      
      // 处理每个变量
      for (const variable of variables) {
        const parsedIdentifier = identifierFormatter.parseIdentifier(variable.identifier);
        const field = parsedIdentifier.field;
        
        // 检查是否是需要简化的字段
        if (Object.keys(FIELD_MAPPING).includes(field)) {
          const newField = FIELD_MAPPING[field as keyof typeof FIELD_MAPPING];
          
          console.log(`  变量 ${variable.identifier} 的字段将改为 ${newField}`);
          
          // 更新字段名
          const newIdentifier = identifierFormatter.formatIdentifier(
            'npc',
            npc.name,
            newField,
            npc.id
          );
          
          // 检查新标识符是否已存在，避免冲突
          const existingVariable = await variableRepo.findOne({
            where: { identifier: newIdentifier }
          });
          
          if (existingVariable && existingVariable.id !== variable.id) {
            console.warn(`  警告: 标识符 ${newIdentifier} 已存在，跳过更新...`);
            skippedCount++;
            continue;
          }
          
          // 更新变量
          variable.identifier = newIdentifier;
          variable.name = DISPLAY_NAME_MAPPING[newField as keyof typeof DISPLAY_NAME_MAPPING] || newField;
          variable.entityId = npc.id;
          
          await variableRepo.save(variable);
          updatedCount++;
          
          console.log(`  √ 成功更新变量: ${variable.identifier}`);
        } else {
          console.log(`  变量 ${variable.identifier} 不需要更新字段，但会添加entityId`);
          
          // 更新entityId字段
          variable.entityId = npc.id;
          await variableRepo.save(variable);
          updatedCount++;
        }
      }
    }
    
    console.log('\n======== 迁移完成 ========');
    console.log(`总计:    ${updatedCount + skippedCount} 个变量`);
    console.log(`成功:    ${updatedCount} 个变量已更新`);
    console.log(`跳过:    ${skippedCount} 个变量因冲突或其他原因被跳过`);
    
  } catch (error: any) {
    console.error('迁移过程中发生错误:', error);
    console.error('错误栈:', error.stack);
  } finally {
    // 关闭数据库连接
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    console.log('数据库连接已关闭');
  }
}

/**
 * 使用多种方式查找NPC相关的变量
 * @param repo 变量仓库
 * @param npcId NPC ID
 * @returns 找到的变量数组
 */
async function findNpcVariables(repo: Repository<Variable>, npcId: string): Promise<Variable[]> {
  // 方法1：使用source.id
  let variables = await repo.find({
    where: {
      type: VariableType.NPC,
      source: {
        id: npcId
      }
    }
  });
  
  if (variables.length > 0) {
    return variables;
  }
  
  // 方法2：使用entityId
  variables = await repo.find({
    where: {
      type: VariableType.NPC,
      entityId: npcId
    }
  });
  
  if (variables.length > 0) {
    return variables;
  }
  
  // 方法3：使用Like操作
  variables = await repo.find({
    where: {
      type: VariableType.NPC,
      source: Like(`%"id":"${npcId}"%`)
    }
  });
  
  // 返回找到的变量（可能为空数组）
  return variables;
}

// 执行迁移
runMigration()
  .then(() => {
    console.log('NPC变量字段简化迁移已完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('迁移失败:', error);
    process.exit(1);
  });
