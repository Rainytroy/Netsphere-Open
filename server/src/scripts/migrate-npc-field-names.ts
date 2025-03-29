import { AppDataSource } from '../database';
import { Variable, VariableType } from '../models/Variable';
import { IdentifierFormatterService } from '../services/IdentifierFormatterService';
import { Npc } from '../models/Npc';

/**
 * 迁移NPC变量字段名的脚本
 * 将旧字段名(kb, ap, al)更改为新字段名(knowledge, act, actlv)
 */
async function migrateNpcFieldNames() {
  console.log('开始迁移NPC变量字段名...');
  
  try {
    // 初始化数据库连接
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('数据库连接初始化成功');
    }
    
    const variableRepo = AppDataSource.getRepository(Variable);
    const npcRepo = AppDataSource.getRepository(Npc);
    const identifierFormatter = IdentifierFormatterService.getInstance();
    
    // 获取所有NPC变量
    const npcVariables = await variableRepo.find({
      where: { type: VariableType.NPC }
    });
    
    console.log(`找到 ${npcVariables.length} 个NPC变量`);
    
    // 获取所有NPC
    const npcs = await npcRepo.find();
    console.log(`找到 ${npcs.length} 个NPC`);
    
    // 创建NPC ID到NPC对象的映射，便于查找
    const npcMap = new Map<string, Npc>();
    for (const npc of npcs) {
      npcMap.set(npc.id, npc);
    }
    
    // 需要删除的旧变量
    const variablesToDelete: Variable[] = [];
    
    // 需要创建的新变量
    const variablesToCreate: Variable[] = [];
    
    // 按照字段名分类变量
    const fieldVariablesMap = new Map<string, Variable[]>();
    
    // 1. 收集旧变量
    for (const variable of npcVariables) {
      // 尝试从标识符中提取字段名
      const identifierParts = variable.identifier.split('.');
      if (identifierParts.length < 2) continue;
      
      const fieldPart = identifierParts[identifierParts.length - 1];
      
      // 检查是否为旧字段名
      if (['kb', 'ap', 'al'].includes(fieldPart)) {
        console.log(`找到旧字段名变量: ${variable.identifier}`);
        
        // 添加到删除列表
        variablesToDelete.push(variable);
        
        // 收集按字段名分类的变量
        if (!fieldVariablesMap.has(fieldPart)) {
          fieldVariablesMap.set(fieldPart, []);
        }
        fieldVariablesMap.get(fieldPart)!.push(variable);
      }
    }
    
    console.log(`找到 ${variablesToDelete.length} 个使用旧字段名的变量`);
    
    // 2. 创建新变量
    for (const [oldField, variables] of fieldVariablesMap.entries()) {
      let newField: string;
      
      // 映射旧字段名到新字段名
      switch (oldField) {
        case 'kb': newField = 'knowledge'; break;
        case 'ap': newField = 'act'; break;
        case 'al': newField = 'actlv'; break;
        default: continue; // 跳过未知字段
      }
      
      console.log(`处理字段 ${oldField} -> ${newField}, 变量数量: ${variables.length}`);
      
      for (const variable of variables) {
        // 从source中获取NPC ID
        const source = typeof variable.source === 'string' 
          ? JSON.parse(variable.source) 
          : variable.source;
        
        // 查找对应的NPC
        const npcId = source?.id;
        if (!npcId || !npcMap.has(npcId)) {
          console.warn(`无法找到NPC(ID: ${npcId})，跳过变量 ${variable.identifier}`);
          continue;
        }
        
        const npc = npcMap.get(npcId)!;
        
        // 创建新的变量实体
        const newVariable = new Variable();
        newVariable.name = variable.name; // 保持相同名称
        newVariable.type = VariableType.NPC;
        newVariable.source = {
          id: npc.id,
          name: npc.name,
          type: 'npc'
        };
        
        // 根据字段名决定值
        switch (newField) {
          case 'knowledge': 
            newVariable.value = npc.knowledgeBackground;
            break;
          case 'act':
            newVariable.value = npc.actionPrinciples;
            break;
          case 'actlv':
            newVariable.value = npc.activityLevelDescription;
            break;
        }
        
        // 创建唯一标识符 - 使用新字段名
        newVariable.identifier = identifierFormatter.formatIdentifier(
          'npc',
          npc.name,
          newField,
          npc.id
        );
        
        // 创建显示用标识符
        newVariable.displayIdentifier = identifierFormatter.formatDisplayIdentifier(
          'npc',
          npc.name,
          newField,
          npc.id
        );
        
        // 设置实体ID和有效标志
        newVariable.entityId = npc.id;
        newVariable.isValid = true;
        
        // 添加到创建列表
        variablesToCreate.push(newVariable);
        
        console.log(`准备创建新变量: ${newVariable.identifier}, 显示为: ${newVariable.displayIdentifier}`);
      }
    }
    
    // 3. 执行删除和创建操作
    console.log(`准备删除 ${variablesToDelete.length} 个旧变量...`);
    if (variablesToDelete.length > 0) {
      const deleteResult = await variableRepo.remove(variablesToDelete);
      console.log(`成功删除 ${deleteResult.length} 个旧变量`);
    }
    
    console.log(`准备创建 ${variablesToCreate.length} 个新变量...`);
    if (variablesToCreate.length > 0) {
      const createResult = await variableRepo.save(variablesToCreate);
      console.log(`成功创建 ${createResult.length} 个新变量`);
    }
    
    console.log('NPC变量字段名迁移完成');
    
  } catch (error) {
    console.error('迁移过程中发生错误:', error);
  } finally {
    // 关闭数据库连接
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('数据库连接已关闭');
    }
  }
}

// 执行迁移
migrateNpcFieldNames()
  .then(() => {
    console.log('迁移脚本执行完成');
    process.exit(0);
  })
  .catch(error => {
    console.error('迁移脚本执行失败:', error);
    process.exit(1);
  });
