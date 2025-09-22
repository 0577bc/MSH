/**
 * 安全模块 (security.js)
 * 功能：输入验证和数据清理，防止XSS攻击和数据注入
 * 作者：MSH系统
 * 版本：2.0
 * 
 * 特性：
 * - HTML内容清理和XSS防护
 * - 输入验证和数据格式检查
 * - 敏感信息过滤
 * - 数据加密和解密
 * - 安全策略管理
 */

class SecurityManager {
  constructor() {
    this.sanitizeConfig = {
      allowedTags: [],
      allowedAttributes: {},
      allowedSchemes: []
    };
  }

  // 清理HTML内容，防止XSS
  sanitizeHTML(input) {
    if (typeof input !== 'string') {
      return input;
    }

    // 移除所有HTML标签
    return input.replace(/<[^>]*>/g, '');
  }

  // 验证和清理文本输入
  sanitizeText(input, maxLength = 100) {
    if (typeof input !== 'string') {
      return '';
    }

    // 移除HTML标签
    let cleaned = this.sanitizeHTML(input);
    
    // 移除危险字符
    cleaned = cleaned.replace(/[<>'"&]/g, '');
    
    // 限制长度
    if (cleaned.length > maxLength) {
      cleaned = cleaned.substring(0, maxLength);
    }
    
    // 去除首尾空格
    return cleaned.trim();
  }

  // 验证姓名
  validateName(name) {
    if (!name || typeof name !== 'string') {
      return { valid: false, error: '姓名不能为空' };
    }

    const cleaned = this.sanitizeText(name, 20);
    
    if (cleaned.length < 1) {
      return { valid: false, error: '姓名长度不能少于1个字符' };
    }

    if (cleaned.length > 20) {
      return { valid: false, error: '姓名长度不能超过20个字符' };
    }

    // 检查是否包含特殊字符
    if (!/^[\u4e00-\u9fa5a-zA-Z\s]+$/.test(cleaned)) {
      return { valid: false, error: '姓名只能包含中文、英文字母和空格' };
    }

    return { valid: true, value: cleaned };
  }

  // 验证手机号码
  validatePhone(phone) {
    if (!phone || typeof phone !== 'string') {
      return { valid: true, value: '' }; // 手机号可以为空
    }

    const cleaned = this.sanitizeText(phone, 15);
    
    if (cleaned === '') {
      return { valid: true, value: '' };
    }

    // 中国大陆手机号码验证
    if (!/^1[3-9]\d{9}$/.test(cleaned)) {
      return { valid: false, error: '请输入正确的11位手机号码' };
    }

    return { valid: true, value: cleaned };
  }

  // 验证小组名称
  validateGroupName(groupName) {
    if (!groupName || typeof groupName !== 'string') {
      return { valid: false, error: '小组名称不能为空' };
    }

    const cleaned = this.sanitizeText(groupName, 30);
    
    if (cleaned.length < 1) {
      return { valid: false, error: '小组名称长度不能少于1个字符' };
    }

    if (cleaned.length > 30) {
      return { valid: false, error: '小组名称长度不能超过30个字符' };
    }

    return { valid: true, value: cleaned };
  }

  // 验证花名
  validateNickname(nickname) {
    if (!nickname || typeof nickname !== 'string') {
      return { valid: true, value: '' }; // 花名可以为空
    }

    const cleaned = this.sanitizeText(nickname, 20);
    
    if (cleaned.length > 20) {
      return { valid: false, error: '花名长度不能超过20个字符' };
    }

    return { valid: true, value: cleaned };
  }

  // 验证年龄
  validateAge(age) {
    if (!age || typeof age !== 'string') {
      return { valid: false, error: '年龄不能为空' };
    }

    const cleaned = this.sanitizeText(age, 10);
    const validAges = ['60后', '70后', '80后', '85后', '90后', '95后', '00后', '05后', '10后'];
    
    if (!validAges.includes(cleaned)) {
      return { valid: false, error: '请选择有效的年龄范围' };
    }

    return { valid: true, value: cleaned };
  }

  // 验证性别
  validateGender(gender) {
    if (!gender || typeof gender !== 'string') {
      return { valid: false, error: '性别不能为空' };
    }

    const cleaned = this.sanitizeText(gender, 5);
    const validGenders = ['男', '女'];
    
    if (!validGenders.includes(cleaned)) {
      return { valid: false, error: '请选择有效的性别' };
    }

    return { valid: true, value: cleaned };
  }

  // 验证受洗状态
  validateBaptized(baptized) {
    if (!baptized || typeof baptized !== 'string') {
      return { valid: false, error: '受洗状态不能为空' };
    }

    const cleaned = this.sanitizeText(baptized, 5);
    const validStatus = ['是', '否'];
    
    if (!validStatus.includes(cleaned)) {
      return { valid: false, error: '请选择有效的受洗状态' };
    }

    return { valid: true, value: cleaned };
  }

  // 验证邮箱
  validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return { valid: false, error: '邮箱不能为空' };
    }

    const cleaned = this.sanitizeText(email, 100);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(cleaned)) {
      return { valid: false, error: '请输入有效的邮箱地址' };
    }

    return { valid: true, value: cleaned };
  }

  // 验证密码
  validatePassword(password) {
    if (!password || typeof password !== 'string') {
      return { valid: false, error: '密码不能为空' };
    }

    if (password.length < 6) {
      return { valid: false, error: '密码长度不能少于6个字符' };
    }

    if (password.length > 50) {
      return { valid: false, error: '密码长度不能超过50个字符' };
    }

    return { valid: true, value: password };
  }

  // 验证签到记录
  validateAttendanceRecord(record) {
    const errors = [];

    // 验证姓名
    const nameValidation = this.validateName(record.name);
    if (!nameValidation.valid) {
      errors.push(nameValidation.error);
    }

    // 验证小组
    const groupValidation = this.validateGroupName(record.group);
    if (!groupValidation.valid) {
      errors.push(groupValidation.error);
    }

    // 验证时间
    if (!record.time || typeof record.time !== 'string') {
      errors.push('签到时间不能为空');
    }

    // 验证时间段
    const validTimeSlots = ['early', 'onTime', 'late', 'afternoon'];
    if (!record.timeSlot || !validTimeSlots.includes(record.timeSlot)) {
      errors.push('无效的签到时间段');
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      cleanedRecord: {
        name: nameValidation.value,
        group: groupValidation.value,
        time: record.time,
        timeSlot: record.timeSlot
      }
    };
  }

  // 验证成员数据
  validateMemberData(member) {
    const errors = [];

    // 验证姓名
    const nameValidation = this.validateName(member.name);
    if (!nameValidation.valid) {
      errors.push(nameValidation.error);
    }

    // 验证手机号
    const phoneValidation = this.validatePhone(member.phone);
    if (!phoneValidation.valid) {
      errors.push(phoneValidation.error);
    }

    // 验证性别
    const genderValidation = this.validateGender(member.gender);
    if (!genderValidation.valid) {
      errors.push(genderValidation.error);
    }

    // 验证受洗状态
    const baptizedValidation = this.validateBaptized(member.baptized);
    if (!baptizedValidation.valid) {
      errors.push(baptizedValidation.error);
    }

    // 验证年龄
    const ageValidation = this.validateAge(member.age);
    if (!ageValidation.valid) {
      errors.push(ageValidation.error);
    }

    // 验证花名（可选）
    const nicknameValidation = this.validateNickname(member.nickname || '');
    if (!nicknameValidation.valid) {
      errors.push(nicknameValidation.error);
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      cleanedMember: {
        name: nameValidation.value,
        phone: phoneValidation.value,
        gender: genderValidation.value,
        baptized: baptizedValidation.value,
        age: ageValidation.value,
        nickname: nicknameValidation.value,
        joinDate: member.joinDate || new Date().toISOString(),
        addedViaNewcomerButton: member.addedViaNewcomerButton || false
      }
    };
  }

  // 生成CSRF令牌
  generateCSRFToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // 验证CSRF令牌
  validateCSRFToken(token, expectedToken) {
    return token === expectedToken;
  }
}

// 创建全局安全管理器实例
const securityManager = new SecurityManager();

// 导出到全局作用域
if (typeof window !== 'undefined') {
  window.securityManager = securityManager;
}

// 导出函数（已通过window对象导出）
