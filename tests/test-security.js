// 安全测试套件
// 测试输入验证、XSS防护、权限控制等安全功能

window.securityTests = {
  name: '安全测试套件',
  category: 'security',
  tests: [
    {
      name: '输入验证 - 姓名验证',
      fn: async () => {
        const startTime = Date.now();
        
        // 测试有效姓名
        const validName = window.securityManager.validateName('张三');
        if (!validName.valid) {
          return { passed: false, message: '有效姓名验证失败' };
        }
        
        // 测试无效姓名
        const invalidName = window.securityManager.validateName('<script>alert("xss")</script>');
        if (invalidName.valid) {
          return { passed: false, message: 'XSS攻击未阻止' };
        }
        
        // 测试空姓名
        const emptyName = window.securityManager.validateName('');
        if (emptyName.valid) {
          return { passed: false, message: '空姓名验证失败' };
        }
        
        // 测试过长姓名
        const longName = window.securityManager.validateName('这是一个非常非常非常非常非常非常非常非常非常非常长的姓名');
        if (longName.valid) {
          return { passed: false, message: '过长姓名验证失败' };
        }
        
        const duration = Date.now() - startTime;
        return { passed: true, message: '姓名验证测试通过', duration };
      }
    },
    
    {
      name: '输入验证 - 手机号验证',
      fn: async () => {
        const startTime = Date.now();
        
        // 测试有效手机号
        const validPhone = window.securityManager.validatePhone('13800138000');
        if (!validPhone.valid) {
          return { passed: false, message: '有效手机号验证失败' };
        }
        
        // 测试无效手机号
        const invalidPhone = window.securityManager.validatePhone('1234567890');
        if (invalidPhone.valid) {
          return { passed: false, message: '无效手机号验证失败' };
        }
        
        // 测试空手机号（应该允许为空）
        const emptyPhone = window.securityManager.validatePhone('');
        if (!emptyPhone.valid) {
          return { passed: false, message: '空手机号验证失败' };
        }
        
        const duration = Date.now() - startTime;
        return { passed: true, message: '手机号验证测试通过', duration };
      }
    },
    
    {
      name: 'XSS防护测试',
      fn: async () => {
        const startTime = Date.now();
        
        // 测试HTML标签清理
        const maliciousInput = '<script>alert("xss")</script>正常文本';
        const cleaned = window.securityManager.sanitizeHTML(maliciousInput);
        
        if (cleaned.includes('<script>') || cleaned.includes('</script>')) {
          return { passed: false, message: 'HTML标签清理失败' };
        }
        
        if (!cleaned.includes('正常文本')) {
          return { passed: false, message: '正常文本被误删' };
        }
        
        // 测试危险字符清理
        const dangerousInput = 'test<>"&\'';
        const sanitized = window.securityManager.sanitizeText(dangerousInput);
        
        if (sanitized.includes('<') || sanitized.includes('>') || 
            sanitized.includes('"') || sanitized.includes('&')) {
          return { passed: false, message: '危险字符清理失败' };
        }
        
        const duration = Date.now() - startTime;
        return { passed: true, message: 'XSS防护测试通过', duration };
      }
    },
    
    {
      name: '数据长度限制测试',
      fn: async () => {
        const startTime = Date.now();
        
        // 测试文本长度限制
        const longText = 'a'.repeat(200);
        const limited = window.securityManager.sanitizeText(longText, 100);
        
        if (limited.length > 100) {
          return { passed: false, message: '文本长度限制失败' };
        }
        
        // 测试姓名长度限制
        const longName = '张'.repeat(30);
        const nameValidation = window.securityManager.validateName(longName);
        
        if (nameValidation.valid) {
          return { passed: false, message: '姓名长度限制失败' };
        }
        
        const duration = Date.now() - startTime;
        return { passed: true, message: '数据长度限制测试通过', duration };
      }
    },
    
    {
      name: '邮箱格式验证测试',
      fn: async () => {
        const startTime = Date.now();
        
        // 测试有效邮箱
        const validEmail = window.securityManager.validateEmail('test@example.com');
        if (!validEmail.valid) {
          return { passed: false, message: '有效邮箱验证失败' };
        }
        
        // 测试无效邮箱
        const invalidEmail = window.securityManager.validateEmail('invalid-email');
        if (invalidEmail.valid) {
          return { passed: false, message: '无效邮箱验证失败' };
        }
        
        // 测试空邮箱
        const emptyEmail = window.securityManager.validateEmail('');
        if (emptyEmail.valid) {
          return { passed: false, message: '空邮箱验证失败' };
        }
        
        const duration = Date.now() - startTime;
        return { passed: true, message: '邮箱格式验证测试通过', duration };
      }
    },
    
    {
      name: '签到记录验证测试',
      fn: async () => {
        const startTime = Date.now();
        
        // 测试有效签到记录
        const validRecord = {
          name: '张三',
          group: '测试组',
          time: '2024-01-01 09:00:00',
          timeSlot: 'onTime'
        };
        
        const recordValidation = window.securityManager.validateAttendanceRecord(validRecord);
        if (!recordValidation.valid) {
          return { passed: false, message: '有效签到记录验证失败', error: recordValidation.errors.join(', ') };
        }
        
        // 测试无效签到记录
        const invalidRecord = {
          name: '<script>alert("xss")</script>',
          group: '',
          time: '',
          timeSlot: 'invalid'
        };
        
        const invalidValidation = window.securityManager.validateAttendanceRecord(invalidRecord);
        if (invalidValidation.valid) {
          return { passed: false, message: '无效签到记录验证失败' };
        }
        
        const duration = Date.now() - startTime;
        return { passed: true, message: '签到记录验证测试通过', duration };
      }
    },
    
    {
      name: '成员数据验证测试',
      fn: async () => {
        const startTime = Date.now();
        
        // 测试有效成员数据
        const validMember = {
          name: '李四',
          phone: '13900139000',
          gender: '男',
          baptized: '是',
          age: '90后',
          nickname: '小李'
        };
        
        const memberValidation = window.securityManager.validateMemberData(validMember);
        if (!memberValidation.valid) {
          return { passed: false, message: '有效成员数据验证失败', error: memberValidation.errors.join(', ') };
        }
        
        // 测试无效成员数据
        const invalidMember = {
          name: '',
          phone: 'invalid',
          gender: '未知',
          baptized: 'maybe',
          age: '未来',
          nickname: 'a'.repeat(50)
        };
        
        const invalidValidation = window.securityManager.validateMemberData(invalidMember);
        if (invalidValidation.valid) {
          return { passed: false, message: '无效成员数据验证失败' };
        }
        
        const duration = Date.now() - startTime;
        return { passed: true, message: '成员数据验证测试通过', duration };
      }
    }
  ]
};
