/**
 * 全局变量系统v3.0测试脚本
 * 用于测试新的变量系统功能，包括:
 * 1. 变量创建和标识符格式
 * 2. 变量查询和解析
 * 3. 变量标识符解析
 */

// 导入必要的模块
const { AppDataSource } = require('../server/dist/database');
const { variableService } = require('../server/dist/services/VariableService');
const { IdentifierFormatterService } = require('../server/dist/services/IdentifierFormatterService');
const { VariableResolver } = require('../server/dist/services/VariableResolver');
const { Variable, VariableType } = require('../server/dist/models/Variable');

// 测试用UUID
const TEST_UUID = '12345678-abcd-4efg-9hij-0klmnopqrstu';

// 测试开始
async function runTests() {
  try {
    console.log('========== 全局变量系统v3.0测试 ==========');
    // 初始化数据库连接
    console.log('初始化数据库连接...');
    await AppDataSource.initialize();
    console.log('数据库连接成功');

    // 获取服务实例
    const identifierFormatter = IdentifierFormatterService.getInstance();
    const { VariableServiceAdapter } = require('../server/dist/services/adapters/VariableServiceAdapter');
    const variableAdapter = new VariableServiceAdapter(variableService);
    const resolver = new VariableResolver(variableAdapter);

    // 1. 测试变量标识符格式
    console.log('\n----- 测试1: 变量标识符格式 -----');
    
    // 生成数据库ID
    const dbId = identifierFormatter.formatDatabaseId('custom', TEST_UUID, 'value');
    console.log(`数据库ID: ${dbId}`);
    
    // 生成系统标识符
    const sysId = identifierFormatter.formatIdentifier('custom', '测试变量', 'value', TEST_UUID);
    console.log(`系统标识符: ${sysId}`);
    
    // 生成显示标识符
    const dispId = identifierFormatter.formatDisplayIdentifier('custom', '测试变量', 'value', TEST_UUID);
    console.log(`显示标识符: ${dispId}`);

    // 2. 测试变量创建
    console.log('\n----- 测试2: 创建自定义变量 -----');
    let testVariable;
    try {
      // 创建一个测试变量
      testVariable = await variableService.createVariable({
        name: '测试变量',
        value: '这是一个测试值',
        fieldname: 'value',
        entityId: TEST_UUID
      });
      
      console.log('变量创建成功:');
      console.log(` - ID: ${testVariable.id}`);
      console.log(` - 名称: ${testVariable.name}`);
      console.log(` - 字段名: ${testVariable.fieldname}`);
      console.log(` - 实体ID: ${testVariable.entityId}`);
      console.log(` - 系统标识符: ${testVariable.identifier}`);
      console.log(` - 显示标识符: ${testVariable.displayIdentifier}`);
      console.log(` - 值: ${testVariable.value}`);
    } catch (error) {
      console.error('变量创建失败:', error.message);
      // 如果是标识符已存在错误，尝试通过系统标识符查找变量
      if (error.message.includes('标识符已存在')) {
        const existingVariable = await variableService.getVariableBySystemIdentifier(sysId);
        if (existingVariable) {
          console.log('找到已存在的变量:');
          console.log(` - ID: ${existingVariable.id}`);
          console.log(` - 名称: ${existingVariable.name}`);
          console.log(` - 标识符: ${existingVariable.identifier}`);
          testVariable = existingVariable;
        }
      }
    }

    // 如果变量创建成功或找到已存在的变量，继续测试
    if (testVariable) {
      // 3. 测试变量查询
      console.log('\n----- 测试3: 变量查询 -----');
      
      // 通过ID查询
      console.log('通过ID查询...');
      try {
        const varById = await variableService.getVariableById(testVariable.id);
        console.log(`通过ID查询成功: ${varById.name}`);
      } catch (error) {
        console.error('通过ID查询失败:', error.message);
      }
      
      // 通过系统标识符查询
      console.log('通过系统标识符查询...');
      const varBySystemId = await variableService.getVariableBySystemIdentifier(testVariable.identifier);
      if (varBySystemId) {
        console.log(`通过系统标识符查询成功: ${varBySystemId.name}`);
      } else {
        console.error('通过系统标识符查询失败');
      }
      
      // 4. 测试标识符解析
      console.log('\n----- 测试4: 标识符解析 -----');
      
      // 创建测试文本
      const testText = `这是一个测试文本，包含一个变量引用: ${testVariable.identifier}。
还有一个显示标识符引用: ${testVariable.displayIdentifier}。
以及旧格式的标识符引用: @测试变量.value。`;
      
      console.log('原始文本:');
      console.log(testText);
      
      // 解析变量
      console.log('尝试解析变量...');
      try {
        const resolvedText = await resolver.resolveText(testText);
        console.log('解析后文本:');
        console.log(resolvedText);
      } catch (error) {
        console.error('变量解析失败:', error.message);
      }
      
      // 5. 测试变量更新
      console.log('\n----- 测试5: 变量更新 -----');
      
      // 更新变量值
      try {
        const updatedVariable = await variableService.updateVariable(testVariable.id, {
          value: '这是更新后的值 - ' + new Date().toISOString()
        });
        
        console.log('变量更新成功:');
        console.log(` - 新值: ${updatedVariable.value}`);
      } catch (error) {
        console.error('变量更新失败:', error.message);
      }
      
      // 6. 测试删除变量 (可选，注释掉以保留测试变量)
      /*
      console.log('\n----- 测试6: 变量删除 -----');
      
      try {
        await variableService.deleteVariable(testVariable.id);
        console.log('变量删除成功');
      } catch (error) {
        console.error('变量删除失败:', error.message);
      }
      */
    }

    console.log('\n========== 测试完成 ==========');
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  } finally {
    // 关闭数据库连接
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('数据库连接已关闭');
    }
  }
}

// 运行测试
runTests().catch(error => {
  console.error('测试脚本执行失败:', error);
  
  // 确保数据库连接被关闭
  if (AppDataSource.isInitialized) {
    AppDataSource.destroy().then(() => {
      console.log('数据库连接已关闭');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});
