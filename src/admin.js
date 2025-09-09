// src/admin.js
// 使用全局 firebase 对象和 window.firebaseConfig

// Initialize Firebase
let app, db;
try {
  app = firebase.app();
  db = firebase.database();
} catch (error) {
  if (window.firebaseConfig) {
    app = firebase.initializeApp(window.firebaseConfig);
    db = firebase.database();
  } else {
    console.error('Firebase配置未找到');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.log("Admin page loaded");
  
  // 简单密码验证
  const passwordDialog = document.getElementById('passwordDialog');
  const adminContent = document.getElementById('adminContent');
  const adminPasswordInput = document.getElementById('adminPasswordInput');
  const loginBtn = document.getElementById('loginBtn');
  const cancelLoginBtn = document.getElementById('cancelLoginBtn');
  const loginError = document.getElementById('loginError');
  const logoutButton = document.getElementById('logoutButton');
  
  // 显示登录对话框
  passwordDialog.style.display = 'flex';
  adminContent.classList.add('hidden-form');
  
  // 登录按钮事件
  loginBtn.addEventListener('click', async () => {
    const password = adminPasswordInput.value;
    
    if (!password) {
      showLoginError('请输入密码');
      return;
    }
    
    // 显示加载状态
    loginBtn.disabled = true;
    loginBtn.textContent = '登录中...';
    hideLoginError();
    
    try {
      // 使用简单密码验证
      if (window.firebaseAuth && window.firebaseAuth.verifyAdminPassword) {
        const isValid = window.firebaseAuth.verifyAdminPassword(password);
        
        if (isValid) {
          // 登录成功
          passwordDialog.style.display = 'none';
          adminContent.classList.remove('hidden-form');
          console.log('管理员登录成功');
        } else {
          // 登录失败
          showLoginError('密码错误');
          adminPasswordInput.value = '';
        }
      } else {
        showLoginError('认证系统未加载，请刷新页面重试');
      }
    } catch (error) {
      console.error('登录过程出错:', error);
      showLoginError('登录过程出错，请重试');
    } finally {
      // 恢复按钮状态
      loginBtn.disabled = false;
      loginBtn.textContent = '登录';
    }
  });
  
  // 取消按钮事件
  cancelLoginBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
  
  // 登出按钮事件
  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      if (confirm('确定要登出吗？')) {
        // 重新显示登录界面
        passwordDialog.style.display = 'flex';
        adminContent.classList.add('hidden-form');
        adminPasswordInput.value = '';
        hideLoginError();
      }
    });
  }
  
  // 回车键登录
  adminPasswordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      loginBtn.click();
    }
  });
  
  adminEmailInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      adminPasswordInput.focus();
    }
  });
  
  // 显示登录错误
  function showLoginError(message) {
    if (loginError) {
      loginError.textContent = message;
      loginError.style.display = 'block';
    }
  }
  
  // 隐藏登录错误
  function hideLoginError() {
    if (loginError) {
      loginError.style.display = 'none';
    }
  }
  
  // 监听认证状态变化
  window.firebaseAuth.onAuthStateChanged((authState) => {
    if (authState.isAdmin) {
      // 管理员已登录
      passwordDialog.style.display = 'none';
      adminContent.classList.remove('hidden-form');
      console.log('管理员已登录:', authState.user.email);
    } else {
      // 未登录或非管理员
      passwordDialog.style.display = 'flex';
      adminContent.classList.add('hidden-form');
    }
  });
  
  const groupSelect = document.getElementById('groupSelect');
  const memberList = document.getElementById('memberList');
  const saveButton = document.getElementById('saveButton');
  const addMemberButton = document.getElementById('addMemberButton');
  const backButton = document.getElementById('backButton');
  const summaryButton = document.getElementById('summaryButton');
  const exportButton = document.getElementById('exportButton');
  const importButton = document.getElementById('importButton');
  const importFile = document.getElementById('importFile');
  const addGroupButton = document.getElementById('addGroupButton');
  const addGroupForm = document.getElementById('addGroupForm');
  const newGroupName = document.getElementById('newGroupName');
  const saveGroupButton = document.getElementById('saveGroupButton');
  const cancelGroupButton = document.getElementById('cancelGroupButton');
  const deleteGroupButton = document.getElementById('deleteGroupButton');
  const editGroupNameButton = document.getElementById('editGroupNameButton');
  const editGroupForm = document.getElementById('editGroupForm');
  const editGroupName = document.getElementById('editGroupName');
  const saveEditGroupButton = document.getElementById('saveEditGroupButton');
  const cancelEditGroupButton = document.getElementById('cancelEditGroupButton');

  let groups = {};
  let groupNames = {};
  let attendanceRecords = [];

  // 为每个小组分配唯一的字母前缀
  function getGroupPrefix(groupId) {
    // 预定义的小组前缀映射，确保每个小组都有唯一的字母前缀
    const groupPrefixes = {
      '陈薛尚': 'AA',
      '乐清1组': 'AB', 
      '乐清2组': 'AC',
      '乐清3组': 'AD',
      '乐清4组': 'AE',
      '乐清5组': 'AF',
      '乐清6组': 'AG',
      '乐清7组': 'AH',
      '乐清8组': 'AI',
      '乐清9组': 'AJ',
      '乐清10组': 'AK',
      '美团组': 'AL',
      '未分组': 'AM'
    };
    
    // 如果小组名在预定义列表中，使用预定义前缀
    if (groupPrefixes[groupId]) {
      return groupPrefixes[groupId];
    }
    
    // 对于新小组，动态生成唯一前缀
    const usedPrefixes = new Set(Object.values(groupPrefixes));
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    // 找到第一个未使用的前缀
    for (let i = 0; i < 26; i++) {
      for (let j = 0; j < 26; j++) {
        const prefix = letters[i] + letters[j];
        if (!usedPrefixes.has(prefix)) {
          return prefix;
        }
      }
    }
    
    // 如果所有前缀都用完了，使用数字后缀
    return 'ZZ';
  }

  // 重新生成所有成员的序号（按姓名排序）
  function regenerateAllMemberIds() {
    const allGroups = Object.keys(groups);
    
    allGroups.forEach(groupId => {
      if (groups[groupId] && groups[groupId].length > 0) {
        const prefix = getGroupPrefix(groupId);
        
        // 按姓名排序
        const sortedMembers = window.utils.sortMembersByName([...groups[groupId]]);
        
        // 重新分配序号
        sortedMembers.forEach((member, index) => {
          const newId = prefix + String(index + 1).padStart(3, '0');
          member.id = newId;
        });
        
        // 更新原始数组顺序
        groups[groupId] = sortedMembers;
      }
    });
  }

  // 为单个成员生成序号（在添加新成员时使用）
  function generateMemberId(groupId, memberName) {
    const prefix = getGroupPrefix(groupId);
    const groupMembers = groups[groupId] || [];
    
    // 创建包含新成员的临时数组
    const tempMembers = [...groupMembers];
    if (memberName) {
      tempMembers.push({ name: memberName });
    }
    
    // 按姓名排序
    const sortedMembers = window.utils.sortMembersByName(tempMembers);
    
    // 找到新成员在排序后的位置
    const memberIndex = sortedMembers.findIndex(member => member.name === memberName);
    
    return prefix + String(memberIndex + 1).padStart(3, '0');
  }

  // 加载数据从 Firebase
  async function loadDataFromFirebase() {
    try {
      // 加载 groups
      const groupsRef = firebase.database().ref('groups');
      const groupsSnapshot = await groupsRef.once('value');
      if (groupsSnapshot.exists()) {
        groups = groupsSnapshot.val() || {};
      }

      // 加载 groupNames
      const groupNamesRef = firebase.database().ref('groupNames');
      const groupNamesSnapshot = await groupNamesRef.once('value');
      if (groupNamesSnapshot.exists()) {
        groupNames = groupNamesSnapshot.val() || {};
      }

      // 确保有"未分组"组和映射
      if (!groups["未分组"]) {
        groups["未分组"] = [];
        await firebase.database().ref('groups').update({ "未分组": [] });
        console.log("管理页面：已添加未分组组");
      }
      
      if (!groupNames["未分组"]) {
        groupNames["未分组"] = "未分组";
        await firebase.database().ref('groupNames').update({ "未分组": "未分组" });
        console.log("管理页面：已添加未分组映射");
      }

      // 加载 attendanceRecords
      const attendanceRef = firebase.database().ref('attendanceRecords');
      const attendanceSnapshot = await attendanceRef.once('value');
      if (attendanceSnapshot.exists()) {
        attendanceRecords = Object.values(attendanceSnapshot.val() || {});
      }

      // 重新生成所有成员的序号（按姓名排序）
      regenerateAllMemberIds();
      
      loadGroups();
      loadMembers(groupSelect ? groupSelect.value : '');
      console.log("Admin data loaded from Firebase");
    } catch (error) {
      console.error("Error loading admin data from Firebase:", error);
      console.log("Using local storage as fallback");
      loadFromLocalStorage();
    }
  }

  // 本地存储备选方案
  function loadFromLocalStorage() {
    try {
      const localGroups = localStorage.getItem('msh_groups');
      const localGroupNames = localStorage.getItem('msh_groupNames');
      const localAttendance = localStorage.getItem('msh_attendanceRecords');

      if (localGroups) {
        groups = JSON.parse(localGroups);
      } else {
        groups = window.sampleData.groups;
        localStorage.setItem('msh_groups', JSON.stringify(groups));
      }

      if (localGroupNames) {
        groupNames = JSON.parse(localGroupNames);
      } else {
        groupNames = window.sampleData.groupNames;
        localStorage.setItem('msh_groupNames', JSON.stringify(groupNames));
      }

      if (localAttendance) {
        attendanceRecords = JSON.parse(localAttendance);
      } else {
        attendanceRecords = [];
        localStorage.setItem('msh_attendanceRecords', JSON.stringify(attendanceRecords));
      }

      loadGroups();
      loadMembers(groupSelect ? groupSelect.value : '');
      console.log("Admin data loaded from local storage");
    } catch (error) {
      console.error("Error loading from local storage:", error);
    }
  }

  // 安全同步数据到Firebase
  async function syncToFirebase() {
    try {
      if (groups && Object.keys(groups).length > 0) {
        await window.utils.safeSyncToFirebase(groups, 'groups');
      }
      if (groupNames && Object.keys(groupNames).length > 0) {
        await window.utils.safeSyncToFirebase(groupNames, 'groupNames');
      }
      if (attendanceRecords && attendanceRecords.length > 0) {
        await window.utils.safeSyncToFirebase(attendanceRecords, 'attendanceRecords');
      }
      console.log("Admin data safely synced to Firebase");
    } catch (error) {
      console.error("Safe sync to Firebase failed:", error);
    }
  }

  function loadGroups() {
    if (groupSelect) {
      groupSelect.innerHTML = '<option value="">--请选择小组--</option>';
      // 按字母顺序排序小组，"未分组"永远排在最后
      const sortedGroups = window.utils.sortGroups(groups, groupNames);
      sortedGroups.forEach(group => {
        const option = document.createElement('option');
        option.value = group;
        // 如果groupNames中没有对应的名称，使用group作为显示名称
        option.textContent = groupNames[group] || group;
        groupSelect.appendChild(option);
      });
    }
  }

  function loadMembers(group) {
    console.log('loadMembers被调用，group:', group);
    if (memberList) {
    memberList.innerHTML = '';
      if (groups[group]) {
        console.log('找到小组数据，成员数量:', groups[group].length);
        
        // 强制初始化所有成员的nickname字段
        groups[group].forEach((member, index) => {
          if (!member.hasOwnProperty('nickname')) {
            member.nickname = '';
            console.log('为成员', member.name, '初始化nickname字段');
          }
        });
        // 按姓名字母顺序排序，但保持原始索引
        const membersWithIndex = groups[group].map((member, originalIndex) => ({
          ...member,
          originalIndex
        }));
        const sortedMembers = window.utils.sortMembersByName(membersWithIndex);
        sortedMembers.forEach((member) => {
          // 确保成员有nickname字段（同时更新原始数据）
          if (!member.hasOwnProperty('nickname')) {
            member.nickname = '';
            // 同时更新原始数据中的成员
            if (groups[group] && groups[group][member.originalIndex]) {
              groups[group][member.originalIndex].nickname = '';
            }
          }
          console.log('成员:', member.name, '花名:', member.nickname);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${member.id || getGroupPrefix(group) + '000'}</td>
            <td><input type="text" value="${member.name}" data-field="name" data-index="${member.originalIndex}"></td>
            <td><input type="text" value="${member.nickname || ''}" data-field="nickname" data-index="${member.originalIndex}" placeholder="花名"></td>
          <td>
              <select data-field="gender" data-index="${member.originalIndex}">
              <option value="男" ${member.gender === '男' ? 'selected' : ''}>男</option>
              <option value="女" ${member.gender === '女' ? 'selected' : ''}>女</option>
            </select>
          </td>
            <td><input type="text" value="${member.phone}" data-field="phone" data-index="${member.originalIndex}"></td>
          <td>
              <select data-field="baptized" data-index="${member.originalIndex}">
              <option value="是" ${member.baptized === '是' ? 'selected' : ''}>是</option>
              <option value="否" ${member.baptized === '否' ? 'selected' : ''}>否</option>
            </select>
          </td>
          <td>
              <select data-field="age" data-index="${member.originalIndex}">
                <option value="10后" ${member.age === '10后' ? 'selected' : ''}>10后</option>
                <option value="05后" ${member.age === '05后' ? 'selected' : ''}>05后</option>
                <option value="00后" ${member.age === '00后' ? 'selected' : ''}>00后</option>
                <option value="95后" ${member.age === '95后' ? 'selected' : ''}>95后</option>
                <option value="90后" ${member.age === '90后' ? 'selected' : ''}>90后</option>
                <option value="85后" ${member.age === '85后' ? 'selected' : ''}>85后</option>
                <option value="80后" ${member.age === '80后' ? 'selected' : ''}>80后</option>
                <option value="70后" ${member.age === '70后' ? 'selected' : ''}>70后</option>
                <option value="60后" ${member.age === '60后' ? 'selected' : ''}>60后</option>
                <option value="50后" ${member.age === '50后' ? 'selected' : ''}>50后</option>
            </select>
          </td>
            <td><button onclick="deleteMember('${group}', ${member.originalIndex})">删除</button></td>
        `;
        memberList.appendChild(row);
      });
      console.log('表格行数:', memberList.querySelectorAll('tr').length);
      console.log('花名列数:', memberList.querySelectorAll('input[data-field="nickname"]').length);
    } else {
      console.log('没有找到小组数据');
    }
  }
  }

  // 全局函数供HTML调用
  window.deleteMember = function(group, index) {
    if (confirm('确定删除这个成员吗？')) {
      groups[group].splice(index, 1);
      loadMembers(group);
      saveData();
    }
  };

  function saveData() {
    // 先保存到本地存储
    localStorage.setItem('msh_groups', JSON.stringify(groups));
    localStorage.setItem('msh_groupNames', JSON.stringify(groupNames));
    localStorage.setItem('msh_attendanceRecords', JSON.stringify(attendanceRecords));
    
    // 然后安全同步到Firebase
    syncToFirebase();
  }

  if (groupSelect) {
  groupSelect.addEventListener('change', () => {
      loadMembers(groupSelect.value);
    });
  }

  // 添加成员功能
  if (addMemberButton) {
    addMemberButton.addEventListener('click', () => {
      const selectedGroup = groupSelect.value;
      if (!selectedGroup) {
        alert('请先选择小组！');
        return;
      }
      
      // 创建添加成员对话框
      const dialog = document.createElement('div');
      dialog.className = 'add-member-dialog';
      dialog.innerHTML = `
        <div class="dialog-content">
          <h3>添加成员</h3>
          <div class="form-group">
            <label for="addMemberName">姓名：</label>
            <input type="text" id="addMemberName" placeholder="请输入成员姓名" required>
          </div>
          <div class="form-group">
            <label for="addMemberPhone">联系方式：</label>
            <input type="text" id="addMemberPhone" placeholder="请输入联系方式">
          </div>
          <div class="form-group">
            <label for="addMemberGender">性别：</label>
            <select id="addMemberGender" required>
              <option value="">--请选择性别--</option>
              <option value="男">男</option>
              <option value="女">女</option>
            </select>
          </div>
          <div class="form-group">
            <label for="addMemberBaptized">是否受洗：</label>
            <select id="addMemberBaptized" required>
              <option value="">--请选择--</option>
              <option value="是">是</option>
              <option value="否">否</option>
            </select>
          </div>
          <div class="form-group">
            <label for="addMemberAge">年龄段：</label>
            <select id="addMemberAge" required>
              <option value="">--请选择年龄段--</option>
              <option value="10后">10后</option>
              <option value="05后">05后</option>
              <option value="00后">00后</option>
              <option value="95后">95后</option>
              <option value="90后">90后</option>
              <option value="85后">85后</option>
              <option value="80后">80后</option>
              <option value="70后">70后</option>
              <option value="60后">60后</option>
              <option value="50后">50后</option>
            </select>
          </div>
          <div class="dialog-buttons">
            <button id="saveAddMemberBtn" type="button">保存</button>
            <button id="cancelAddMemberBtn" type="button">取消</button>
          </div>
        </div>
      `;
      
      // 添加样式
      dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
      `;
      
      const content = dialog.querySelector('.dialog-content');
      content.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        min-width: 400px;
        max-width: 500px;
      `;
      
      document.body.appendChild(dialog);
      
      // 事件监听器
      const saveBtn = dialog.querySelector('#saveAddMemberBtn');
      const cancelBtn = dialog.querySelector('#cancelAddMemberBtn');
      
      saveBtn.addEventListener('click', () => {
        const name = dialog.querySelector('#addMemberName').value.trim();
        const phone = dialog.querySelector('#addMemberPhone').value.trim();
        const gender = dialog.querySelector('#addMemberGender').value;
        const baptized = dialog.querySelector('#addMemberBaptized').value;
        const age = dialog.querySelector('#addMemberAge').value;
        
        if (!name) {
          alert('请输入成员姓名！');
          return;
        }
        
        if (!gender || !baptized || !age) {
          alert('请填写完整信息！');
          return;
        }
        
        const newMember = {
          id: generateMemberId(selectedGroup, name),
          name,
          phone,
          gender,
          baptized,
          age,
          joinDate: new Date().toISOString()
        };
        
        if (!groups[selectedGroup]) {
          groups[selectedGroup] = [];
        }
        groups[selectedGroup].push(newMember);
        
        // 重新排序并重新分配序号
        regenerateAllMemberIds();
        
        saveData();
        loadMembers(selectedGroup);
        document.body.removeChild(dialog);
        window.systemLogger.success('新成员已添加', { 
          group: selectedGroup, 
          memberName: memberName, 
          memberPhone: memberPhone,
          memberGender: memberGender,
          memberBaptized: memberBaptized,
          memberAge: memberAge
        });
        alert('成员添加成功！');
      });
      
      cancelBtn.addEventListener('click', () => {
        document.body.removeChild(dialog);
      });
      
      // 点击背景关闭对话框
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
          document.body.removeChild(dialog);
        }
      });
    });
  }

  // 重新生成序号按钮
  const regenerateIdsButton = document.getElementById('regenerateIdsButton');
  if (regenerateIdsButton) {
    regenerateIdsButton.addEventListener('click', () => {
      if (confirm('确定要重新生成所有成员的序号吗？这将按姓名重新排序并分配新的序号。')) {
        regenerateAllMemberIds();
        saveData();
        const currentGroup = groupSelect ? groupSelect.value : '';
        if (currentGroup) {
          loadMembers(currentGroup);
        }
        alert('序号重新生成完成！');
        
        // 记录日志
        if (window.systemLogger) {
          window.systemLogger.info('重新生成所有成员序号');
        }
      }
    });
  }

  if (saveButton) {
    saveButton.addEventListener('click', () => {
      const group = groupSelect ? groupSelect.value : '';
      if (!group) {
        alert('请选择小组！');
        return;
      }

      // 收集所有输入的数据并验证
      const inputs = memberList.querySelectorAll('input, select');
      let hasValidationError = false;
      
      inputs.forEach(input => {
        const field = input.dataset.field;
        const index = parseInt(input.dataset.index);
        if (field && index >= 0 && groups[group][index]) {
          const value = input.value;
          
          // 验证手机号码
          if (field === 'phone' && value) {
            if (!window.utils.IdentifierManager.validatePhoneNumber(value)) {
              alert(`第${index + 1}个成员的手机号码格式不正确！\n请输入正确的11位手机号码。`);
              hasValidationError = true;
              return;
            }
            
            // 检查手机号码重复
            if (window.utils.IdentifierManager.checkPhoneExists(value, groups, groups[group][index])) {
              alert(`第${index + 1}个成员的手机号码已存在！\n请使用不同的手机号码。`);
              hasValidationError = true;
              return;
            }
          }
          
          groups[group][index][field] = value;
        }
      });
      
      if (hasValidationError) {
        return;
      }

      saveData();
      window.systemLogger.success('成员信息已保存', { group: group, membersCount: groups[group].length });
      alert('保存成功！');
    });
  }

  if (backButton) {
  backButton.addEventListener('click', () => {
    window.location.href = "index.html";
  });
  }

  if (summaryButton) {
  summaryButton.addEventListener('click', () => {
    window.location.href = "summary.html";
  });
  }


  // 小组管理功能
  if (addGroupButton) {
    addGroupButton.addEventListener('click', () => {
      if (addGroupForm) {
        if (addGroupForm.classList.contains('hidden-form')) {
          addGroupForm.classList.remove('hidden-form');
    } else {
          addGroupForm.classList.add('hidden-form');
        }
      }
    });
  }

  if (saveGroupButton) {
    saveGroupButton.addEventListener('click', () => {
      const groupName = newGroupName ? newGroupName.value.trim() : '';
      
      if (!groupName) {
        alert('请输入小组名称！');
        return;
      }

      // 使用组名作为ID，确保唯一性
      const groupId = groupName;
      groups[groupId] = []; // 创建空的小组
      groupNames[groupId] = groupName;

      saveData();
      loadGroups();
      window.systemLogger.success('新小组已创建', { groupName: groupName });
      alert('小组添加成功！');
      
      if (addGroupForm) {
        addGroupForm.classList.add('hidden-form');
      }
      
      // 清空表单
      if (newGroupName) newGroupName.value = '';
    });
  }

  // 修改小组名称功能
  if (editGroupNameButton) {
    editGroupNameButton.addEventListener('click', () => {
      const selectedGroup = groupSelect.value;
      if (!selectedGroup) {
        alert('请先选择要修改的小组！');
        return;
      }
      
      const currentGroupName = groupNames[selectedGroup] || selectedGroup;
      const newName = prompt(`当前小组名称：${currentGroupName}\n请输入新的小组名称：`, currentGroupName);
      
      if (newName && newName.trim() !== '' && newName.trim() !== currentGroupName) {
        groupNames[selectedGroup] = newName.trim();
        saveData();
        loadGroups();
        alert('小组名称修改成功！');
      }
    });
  }

  if (cancelGroupButton) {
    cancelGroupButton.addEventListener('click', () => {
      if (addGroupForm) {
        addGroupForm.classList.add('hidden-form');
      }
      if (newGroupName) newGroupName.value = '';
    });
  }

  if (deleteGroupButton) {
    deleteGroupButton.addEventListener('click', () => {
      const group = groupSelect ? groupSelect.value : '';
      if (!group) {
        alert('请选择要删除的小组！');
        return;
      }

      if (confirm(`确定删除小组"${groupNames[group]}"吗？这将删除该小组的所有成员！`)) {
        const groupName = groupNames[group];
        const memberCount = groups[group] ? groups[group].length : 0;
        delete groups[group];
        delete groupNames[group];
        saveData();
        loadGroups();
        if (memberList) memberList.innerHTML = '';
        window.systemLogger.warning('小组已删除', { 
          groupName: groupName, 
          memberCount: memberCount 
        });
        alert('小组删除成功！');
      }
    });
  }


  if (saveEditGroupButton) {
    saveEditGroupButton.addEventListener('click', () => {
      const group = groupSelect ? groupSelect.value : '';
      const newName = editGroupName ? editGroupName.value.trim() : '';
      
      if (!group) {
        alert('请选择要修改的小组！');
        return;
      }

      if (!newName) {
        alert('请输入新的小组名称！');
        return;
      }

      groupNames[group] = newName;
      saveData();
      loadGroups();
      alert('小组名称修改成功！');
      
      if (editGroupForm) {
        editGroupForm.classList.add('hidden-form');
      }
    });
  }

  if (cancelEditGroupButton) {
    cancelEditGroupButton.addEventListener('click', () => {
      if (editGroupForm) {
        editGroupForm.classList.add('hidden-form');
      }
    });
  }

  // 数据导出导入功能
  if (exportButton) {
    exportButton.addEventListener('click', () => {
      const data = { groups, groupNames, attendanceRecords };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "msh-signin-data.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    });
  }

  if (importButton && importFile) {
    importButton.addEventListener('click', () => {
      importFile.click();
    });

    importFile.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      if (!confirm("导入将覆盖现有数据，确定吗？")) return;
      
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = JSON.parse(e.target.result);
          if (data.groups) groups = data.groups;
          if (data.groupNames) groupNames = data.groupNames;
          if (data.attendanceRecords) attendanceRecords = data.attendanceRecords;
          // 注意：管理员密码现在由Firebase Authentication管理，不再从导入数据中恢复
          
          saveData();
          loadGroups();
          loadMembers(groupSelect ? groupSelect.value : '');
          alert('数据导入成功！');
        } catch (error) {
          alert('导入失败：文件格式错误或数据无效。' + error.message);
        }
      };
      reader.readAsText(file);
    });
  }

  // 日志功能
  const viewLogsButton = document.getElementById('viewLogsButton');
  const logsView = document.getElementById('logsView');
  const refreshLogsButton = document.getElementById('refreshLogsButton');
  const clearLogsButton = document.getElementById('clearLogsButton');
  const exportLogsButton = document.getElementById('exportLogsButton');
  const closeLogsButton = document.getElementById('closeLogsButton');
  const logsList = document.getElementById('logsList');
  
  // 未签到不统计相关元素
  const excludeStatsButton = document.getElementById('excludeStatsButton');
  const excludeStatsView = document.getElementById('excludeStatsView');
  
  // 管理员管理相关元素
  const manageAdminsButton = document.getElementById('manageAdminsButton');
  const adminManagementView = document.getElementById('adminManagementView');
  const addAdminEmailInput = document.getElementById('adminEmailInput');
  const addAdminButton = document.getElementById('addAdminButton');
  const adminList = document.getElementById('adminList');
  const excludeSearchInput = document.getElementById('excludeSearchInput');
  const excludeSuggestions = document.getElementById('excludeSuggestions');
  const addToExcludeButton = document.getElementById('addToExcludeButton');
  const removeFromExcludeButton = document.getElementById('removeFromExcludeButton');
  const excludeList = document.getElementById('excludeList');
  const closeExcludeButton = document.getElementById('closeExcludeButton');

  // 显示日志界面
  viewLogsButton.addEventListener('click', () => {
    logsView.classList.remove('hidden-form');
    refreshLogs();
  });

  // 关闭日志界面
  closeLogsButton.addEventListener('click', () => {
    logsView.classList.add('hidden-form');
  });

  // 未签到不统计功能
  let excludedMembers = []; // 存储不统计的人员列表
  let selectedMember = null; // 当前选中的成员

  // 显示未签到不统计界面
  excludeStatsButton.addEventListener('click', () => {
    excludeStatsView.classList.remove('hidden-form');
    loadExcludedMembers();
  });

  // 管理员管理功能
  let adminEmails = [];

  // 显示管理员管理界面
  manageAdminsButton.addEventListener('click', () => {
    adminManagementView.classList.remove('hidden-form');
    loadAdminEmails();
  });

  // 加载管理员邮箱列表
  async function loadAdminEmails() {
    try {
      const db = firebase.database();
      const adminEmailsRef = db.ref('adminEmails');
      const snapshot = await adminEmailsRef.once('value');
      
      if (snapshot.exists()) {
        const adminEmailsData = snapshot.val();
        adminEmails = Object.keys(adminEmailsData).filter(email => adminEmailsData[email] === true);
      } else {
        adminEmails = [];
      }
      
      displayAdminEmails();
    } catch (error) {
      console.error('加载管理员邮箱失败:', error);
      alert('加载管理员邮箱失败: ' + error.message);
    }
  }

  // 显示管理员邮箱列表
  function displayAdminEmails() {
    if (!adminList) return;
    
    adminList.innerHTML = '';
    
    if (adminEmails.length === 0) {
      adminList.innerHTML = '<div class="empty-list">暂无管理员</div>';
      return;
    }
    
    adminEmails.forEach(email => {
      const adminItem = document.createElement('div');
      adminItem.className = 'admin-item';
      adminItem.innerHTML = `
        <span class="admin-email">${email}</span>
        <button class="remove-admin-btn" onclick="removeAdmin('${email}')">移除</button>
      `;
      adminList.appendChild(adminItem);
    });
  }

  // 添加管理员
  addAdminButton.addEventListener('click', async () => {
    const email = addAdminEmailInput.value.trim();
    
    if (!email) {
      alert('请输入管理员邮箱');
      return;
    }
    
    // 验证邮箱格式
    const emailValidation = window.securityManager.validateEmail(email);
    if (!emailValidation.valid) {
      alert(emailValidation.error);
      return;
    }
    
    if (adminEmails.includes(email)) {
      alert('该邮箱已经是管理员');
      return;
    }
    
    try {
      const db = firebase.database();
      const adminEmailsRef = db.ref('adminEmails');
      await adminEmailsRef.child(email).set(true);
      
      adminEmails.push(email);
      displayAdminEmails();
      addAdminEmailInput.value = '';
      
      alert('管理员添加成功');
      
      // 记录日志
      if (window.systemLogger) {
        window.systemLogger.info(`添加管理员: ${email}`);
      }
    } catch (error) {
      console.error('添加管理员失败:', error);
      alert('添加管理员失败: ' + error.message);
    }
  });

  // 移除管理员
  window.removeAdmin = async function(email) {
    if (!confirm(`确定要移除管理员 ${email} 吗？`)) {
      return;
    }
    
    try {
      const db = firebase.database();
      const adminEmailsRef = db.ref('adminEmails');
      await adminEmailsRef.child(email).remove();
      
      adminEmails = adminEmails.filter(e => e !== email);
      displayAdminEmails();
      
      alert('管理员移除成功');
      
      // 记录日志
      if (window.systemLogger) {
        window.systemLogger.info(`移除管理员: ${email}`);
      }
    } catch (error) {
      console.error('移除管理员失败:', error);
      alert('移除管理员失败: ' + error.message);
    }
  };

  // 关闭未签到不统计界面
  closeExcludeButton.addEventListener('click', () => {
    excludeStatsView.classList.add('hidden-form');
    excludeSearchInput.value = '';
    excludeSuggestions.innerHTML = '';
    selectedMember = null;
  });

  // 搜索人员功能（与index页面保持一致）
  excludeSearchInput.addEventListener('input', () => {
    const query = excludeSearchInput.value.toLowerCase();
    excludeSuggestions.innerHTML = '';
    excludeSuggestions.style.display = 'none';
    if (query.length < 1) {
      selectedMember = null;
      return;
    }
    
    // 获取所有成员信息，包括组别
    const allMembers = [];
    Object.keys(groups).forEach(group => {
      if (groups[group]) {
        groups[group].forEach(member => {
          allMembers.push({
            ...member,
            group: group
          });
        });
      }
    });

    // 过滤匹配的人员（排除已在不统计列表中的人员）
    const matches = allMembers.filter(member => 
      (member.name.toLowerCase().includes(query) ||
       (member.nickname && member.nickname.trim() && member.nickname.toLowerCase().includes(query))) &&
      !excludedMembers.some(excluded => excluded.name === member.name && excluded.group === member.group)
    );
    
    if (matches.length > 0) {
      excludeSuggestions.style.display = 'block';
      matches.forEach(member => {
        const div = document.createElement('div');
        div.innerHTML = `
          <span class="member-name">${member.name}${member.nickname ? ` (${member.nickname})` : ''}</span>
          <span class="member-group">(${groupNames[member.group] || member.group})</span>
        `;
        div.className = 'suggestion-item';
        div.addEventListener('click', () => {
          excludeSearchInput.value = member.name;
          excludeSuggestions.style.display = 'none';
          selectedMember = {
            name: member.name,
            group: member.group,
            groupName: groupNames[member.group] || member.group
          };
        });
        excludeSuggestions.appendChild(div);
      });
    }
  });

  // 添加到不统计列表
  addToExcludeButton.addEventListener('click', () => {
    if (!selectedMember) {
      alert('请先搜索并选择要添加的人员！');
      return;
    }

    // 检查是否已经存在
    const exists = excludedMembers.some(excluded => 
      excluded.name === selectedMember.name && excluded.group === selectedMember.group
    );

    if (exists) {
      alert('该人员已经在不统计列表中！');
      return;
    }

    // 添加到列表
    excludedMembers.push(selectedMember);
    saveExcludedMembers();
    loadExcludedMembers();
    
    // 清空搜索
    excludeSearchInput.value = '';
    excludeSuggestions.innerHTML = '';
    selectedMember = null;

    // 记录日志
    if (window.systemLogger) {
      window.systemLogger.info(`添加人员到不统计列表: ${selectedMember.name} (${selectedMember.groupName})`);
    }

    alert('已添加到不统计列表！');
  });

  // 从列表中移除
  removeFromExcludeButton.addEventListener('click', () => {
    if (!selectedMember) {
      alert('请先搜索并选择要移除的人员！');
      return;
    }

    // 从列表中移除
    excludedMembers = excludedMembers.filter(excluded => 
      !(excluded.name === selectedMember.name && excluded.group === selectedMember.group)
    );
    
    saveExcludedMembers();
    loadExcludedMembers();
    
    // 清空搜索
    excludeSearchInput.value = '';
    excludeSuggestions.innerHTML = '';
    selectedMember = null;

    // 记录日志
    if (window.systemLogger) {
      window.systemLogger.info(`从不统计列表移除人员: ${selectedMember.name} (${selectedMember.groupName})`);
    }

    alert('已从列表中移除！');
  });

  // 加载不统计人员列表
  function loadExcludedMembers() {
    if (!excludeList) return;

    if (excludedMembers.length === 0) {
      excludeList.innerHTML = '<div class="empty-exclude-list">暂无人员</div>';
      return;
    }

    excludeList.innerHTML = '';
    excludedMembers.forEach((member, index) => {
      const item = document.createElement('div');
      item.className = 'exclude-item';
      item.innerHTML = `
        <div class="exclude-item-info">
          <div class="exclude-item-name">${member.name}</div>
          <div class="exclude-item-group">${member.groupName}</div>
        </div>
        <button class="exclude-item-remove" onclick="removeExcludedMember(${index})">移除</button>
      `;
      excludeList.appendChild(item);
    });
  }

  // 移除不统计人员（全局函数）
  window.removeExcludedMember = function(index) {
    const member = excludedMembers[index];
    if (confirm(`确定要从不统计列表中移除 ${member.name} 吗？`)) {
      excludedMembers.splice(index, 1);
      saveExcludedMembers();
      loadExcludedMembers();
      
      // 记录日志
      if (window.systemLogger) {
        window.systemLogger.info(`从不统计列表移除人员: ${member.name} (${member.groupName})`);
      }
    }
  };

  // 保存不统计人员列表
  function saveExcludedMembers() {
    try {
      localStorage.setItem('msh_excludedMembers', JSON.stringify(excludedMembers));
      // 安全同步到Firebase
      if (db) {
        window.utils.safeSyncToFirebase(excludedMembers, 'excludedMembers').catch(error => {
          console.error('安全同步不统计人员列表到Firebase失败:', error);
        });
      }
    } catch (error) {
      console.error('保存不统计人员列表失败:', error);
    }
  }

  // 加载不统计人员列表
  function loadExcludedMembersFromStorage() {
    try {
      // 从本地存储加载
      const localData = localStorage.getItem('msh_excludedMembers');
      if (localData) {
        excludedMembers = JSON.parse(localData);
      }
      
      // 从Firebase加载
      if (db) {
        db.ref('excludedMembers').once('value').then(snapshot => {
          const firebaseData = snapshot.val();
          if (firebaseData && Array.isArray(firebaseData)) {
            excludedMembers = firebaseData;
            localStorage.setItem('msh_excludedMembers', JSON.stringify(excludedMembers));
          }
        }).catch(error => {
          console.error('从Firebase加载不统计人员列表失败:', error);
        });
      }
    } catch (error) {
      console.error('加载不统计人员列表失败:', error);
    }
  }

  // 初始化时加载不统计人员列表
  loadExcludedMembersFromStorage();

  // 全局函数：获取不统计人员列表
  window.getExcludedMembers = function() {
    return excludedMembers;
  };

  // 刷新日志
  refreshLogsButton.addEventListener('click', () => {
    refreshLogs();
  });

  // 清空日志
  clearLogsButton.addEventListener('click', () => {
    if (confirm('确定要清空所有日志吗？此操作不可逆！')) {
      window.systemLogger.clearLogs();
      refreshLogs();
    }
  });

  // 导出日志
  exportLogsButton.addEventListener('click', () => {
    const format = confirm('选择导出格式：\n确定 = JSON格式\n取消 = 文本格式') ? 'json' : 'txt';
    window.systemLogger.exportLogs(format);
  });

  // 刷新日志显示
  function refreshLogs() {
    const logs = window.systemLogger.getAllLogs();
    logsList.innerHTML = '';

    if (logs.length === 0) {
      logsList.innerHTML = '<div class="log-entry info"><div class="log-content">暂无日志记录</div></div>';
      return;
    }

    logs.forEach(log => {
      const logEntry = document.createElement('div');
      logEntry.className = `log-entry ${log.type}`;
      
      const time = new Date(log.timestamp).toLocaleString('zh-CN');
      const details = log.details ? ` - ${JSON.stringify(log.details)}` : '';
      
      logEntry.innerHTML = `
        <div class="log-time">${time}</div>
        <div class="log-content">
          <span class="log-type ${log.type}">[${log.type.toUpperCase()}]</span>
          ${log.message}${details}
        </div>
      `;
      
      logsList.appendChild(logEntry);
    });
  }

  // 初始加载数据 - 优先使用Firebase
  console.log("管理页面正在连接Firebase数据库...");
  loadDataFromFirebase();

  // 启动实时数据同步
  if (window.utils && window.utils.dataSyncManager) {
    window.utils.dataSyncManager.startListening((dataType, data) => {
      console.log(`管理页面收到${dataType}数据更新:`, data);
      
      switch (dataType) {
        case 'attendanceRecords':
          attendanceRecords = data;
          localStorage.setItem('msh_attendanceRecords', JSON.stringify(attendanceRecords));
          break;
        case 'groups':
          groups = data;
          localStorage.setItem('msh_groups', JSON.stringify(groups));
          loadGroups();
          loadMembers(groupSelect ? groupSelect.value : '');
          break;
        case 'groupNames':
          groupNames = data;
          localStorage.setItem('msh_groupNames', JSON.stringify(groupNames));
          loadGroups();
          break;
      }
    });

    // 设置页面可见性监听
    window.utils.dataSyncManager.setupVisibilityListener(() => {
      console.log('管理页面重新可见，检查数据同步...');
      loadDataFromFirebase();
    });

    // 页面卸载时确保数据同步
    window.addEventListener('beforeunload', async (event) => {
      console.log('页面即将关闭，确保数据同步');
      try {
        // 同步所有数据到Firebase
        if (db) {
          await window.utils.safeSyncToFirebase(groups, 'groups');
          await window.utils.safeSyncToFirebase(groupNames, 'groupNames');
          await window.utils.safeSyncToFirebase(attendanceRecords, 'attendanceRecords');
          console.log('页面关闭前数据同步完成');
        }
      } catch (error) {
        console.error('页面关闭前数据同步失败:', error);
      }
    });
  }
});