// 公共工具函数模块
// 用于减少代码重复，提高可维护性

// 加载不统计人员列表
function loadExcludedMembers() {
  let excludedMembers = [];
  try {
    const localData = localStorage.getItem('msh_excludedMembers');
    if (localData) {
      excludedMembers = JSON.parse(localData);
    }
  } catch (error) {
    console.error('加载不统计人员列表失败:', error);
  }
  return excludedMembers;
}

// 小组排序函数（"未分组"永远排在最后）
function sortGroups(groups, groupNames) {
  return Object.keys(groups).sort((a, b) => {
    const nameA = groupNames[a] || a;
    const nameB = groupNames[b] || b;
    
    // "未分组"永远排在最后
    if (nameA === "未分组") return 1;
    if (nameB === "未分组") return -1;
    
    return nameA.localeCompare(nameB, 'zh-CN');
  });
}

// 成员按姓名排序
function sortMembersByName(members) {
  return members.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}

// 检查成员是否在不统计列表中
function isMemberExcluded(member, group, excludedMembers) {
  return excludedMembers.some(excluded => 
    excluded.name === member.name && excluded.group === group
  );
}

// 过滤不统计的人员
function filterExcludedMembers(members, group, excludedMembers) {
  return members.filter(member => !isMemberExcluded(member, group, excludedMembers));
}

// 获取签到时间段类型
function getAttendanceType(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const timeInMinutes = hours * 60 + minutes;
  
  if (timeInMinutes < 9 * 60 + 20) return '早到'; // 9:20之前
  if (timeInMinutes < 9 * 60 + 30) return '准时'; // 9:20-9:30
  if (timeInMinutes < 10 * 60 + 40) return '迟到'; // 9:30-10:40
  return '迟到';
}

// 格式化日期为中文格式
function formatDateToChinese(date) {
  return date.toLocaleDateString('zh-CN');
}

// 获取今天的日期字符串
function getTodayString() {
  return formatDateToChinese(new Date());
}

// 检查是否为当日新增人员（通过新朋友按钮添加）
function isTodayNewcomer(member) {
  if (!member.joinDate || !member.addedViaNewcomerButton) return false;
  return formatDateToChinese(new Date(member.joinDate)) === getTodayString();
}

// 导出函数到全局作用域
if (typeof window !== 'undefined') {
  window.utils = {
    loadExcludedMembers,
    sortGroups,
    sortMembersByName,
    isMemberExcluded,
    filterExcludedMembers,
    getAttendanceType,
    formatDateToChinese,
    getTodayString,
    isTodayNewcomer
  };
}
