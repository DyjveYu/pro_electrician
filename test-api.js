const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// 测试API接口连通性
async function testAPIs() {
  console.log('🚀 开始测试API接口连通性...');
  
  const tests = [
    {
      name: '健康检查',
      method: 'GET',
      url: `${BASE_URL}/health`,
      expectedStatus: 200
    },
    {
      name: '获取电工列表',
      method: 'GET', 
      url: `${BASE_URL}/electricians`,
      expectedStatus: 200
    },
    {
      name: '搜索附近电工',
      method: 'GET',
      url: `${BASE_URL}/electricians/search?latitude=39.9042&longitude=116.4074`,
      expectedStatus: 200
    },
    {
      name: '发送短信验证码',
      method: 'POST',
      url: `${BASE_URL}/auth/send-sms`,
      data: { phone: '13800138000' },
      expectedStatus: 200
    },
    {
      name: '检查登录状态',
      method: 'GET',
      url: `${BASE_URL}/auth/check`,
      expectedStatus: 200
    },
    {
      name: '微信登录（预期失败）',
      method: 'POST',
      url: `${BASE_URL}/auth/wechat-login`,
      data: { code: 'test_code' },
      expectedStatus: 500
    },
    {
      name: '手机号登录（预期失败-用户不存在）',
      method: 'POST',
      url: `${BASE_URL}/auth/phone-login`,
      data: { phone: '13800138000', code: '123456' },
      expectedStatus: 404
    },
    {
      name: '获取工单列表（预期失败-需要认证）',
      method: 'GET',
      url: `${BASE_URL}/orders`,
      expectedStatus: 401
    }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    try {
      console.log(`\n📋 测试: ${test.name}`);
      
      const config = {
        method: test.method,
        url: test.url,
        validateStatus: () => true // 不抛出错误，让我们手动检查状态码
      };
      
      if (test.data) {
        config.data = test.data;
        config.headers = { 'Content-Type': 'application/json' };
      }
      
      const response = await axios(config);
      
      if (response.status === test.expectedStatus) {
        console.log(`✅ 通过 - 状态码: ${response.status}`);
        if (response.data) {
          console.log(`📄 响应: ${JSON.stringify(response.data).substring(0, 100)}...`);
        }
        passedTests++;
      } else {
        console.log(`❌ 失败 - 期望状态码: ${test.expectedStatus}, 实际状态码: ${response.status}`);
        console.log(`📄 响应: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      console.log(`❌ 错误 - ${error.message}`);
    }
  }

  console.log(`\n📊 测试结果: ${passedTests}/${totalTests} 通过`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有API接口测试通过！后端服务运行正常。');
  } else {
    console.log('⚠️ 部分API接口测试失败，请检查后端服务。');
  }
}

// 运行测试
testAPIs().catch(console.error);