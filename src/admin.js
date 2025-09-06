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
  
  // 密码验证
  const passwordDialog = document.getElementById('passwordDialog');
  const adminContent = document.getElementById('adminContent');
  const adminPasswordInput = document.getElementById('adminPasswordInput');
  const loginBtn = document.getElementById('loginBtn');
  const cancelLoginBtn = document.getElementById('cancelLoginBtn');
  
  const ADMIN_PASSWORD = window.adminPassword || 'admin123';
  
  // 显示密码对话框
  passwordDialog.style.display = 'flex';
  adminContent.classList.add('hidden-form');
  
  loginBtn.addEventListener('click', () => {
    const inputPassword = adminPasswordInput.value;
    if (inputPassword === ADMIN_PASSWORD) {
      passwordDialog.style.display = 'none';
      adminContent.classList.remove('hidden-form');
    } else {
      alert('密码错误！');
      adminPasswordInput.value = '';
    }
  });
  
  cancelLoginBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
  
  // 按回车键登录
  adminPasswordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      loginBtn.click();
    }
  });
  
  const groupSelect = document.getElementById('groupSelect');
  const memberList = document.getElementById('memberList');
  const saveButton = document.getElementById('saveButton');
  const addMemberButton = document.getElementById('addMemberButton');
  const backButton = document.getElementById('backButton');
  const summaryButton = document.getElementById('summaryButton');
  const changePasswordButton = document.getElementById('changePasswordButton');
  const changePasswordForm = document.getElementById('changePasswordForm');
  const oldPassword = document.getElementById('oldPassword');
  const newPassword = document.getElementById('newPassword');
  const confirmPassword = document.getElementById('confirmPassword');
  const savePasswordButton = document.getElementById('savePasswordButton');
  const cancelPasswordButton = document.getElementById('cancelPasswordButton');
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
  let memberIdCounter = 1; // 成员编号计数器

  // 生成成员编号：字母2位+数字3位，同组别使用相同字母前缀
  function generateMemberId(groupId) {
    // 为每个组别生成固定的字母前缀
    const groupPrefixes = {
      'group1': 'AB',
      'group2': 'CD', 
      'group3': 'EF',
      'group4': 'GH',
      'group5': 'IJ',
      'group6': 'KL',
      'group7': 'MN',
      'group8': 'OP',
      'group9': 'QR',
      'group10': 'ST'
    };
    
    // 如果没有预定义前缀，根据组别ID生成
    let prefix = groupPrefixes[groupId];
    if (!prefix) {
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const groupNum = parseInt(groupId.replace('group', '')) || 1;
      const letter1 = letters[(groupNum - 1) % 26];
      const letter2 = letters[Math.floor((groupNum - 1) / 26) % 26];
      prefix = letter1 + letter2;
    }
    
    // 计算该组别中已有的成员数量
    const existingMembers = groups[groupId] || [];
    const nextNumber = existingMembers.length + 1;
    
    return prefix + String(nextNumber).padStart(3, '0');
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

      // 加载 attendanceRecords
      const attendanceRef = firebase.database().ref('attendanceRecords');
      const attendanceSnapshot = await attendanceRef.once('value');
      if (attendanceSnapshot.exists()) {
        attendanceRecords = Object.values(attendanceSnapshot.val() || {});
      }

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

  // 同步数据到Firebase
  async function syncToFirebase() {
    try {
      if (groups && Object.keys(groups).length > 0) {
        await firebase.database().ref('groups').set(groups);
      }
      if (groupNames && Object.keys(groupNames).length > 0) {
        await firebase.database().ref('groupNames').set(groupNames);
      }
      if (attendanceRecords && attendanceRecords.length > 0) {
        await firebase.database().ref('attendanceRecords').set(attendanceRecords);
      }
      console.log("Admin data synced to Firebase");
    } catch (error) {
      console.error("Sync to Firebase failed:", error);
    }
  }

  function loadGroups() {
    if (groupSelect) {
      groupSelect.innerHTML = '<option value="">--请选择小组--</option>';
      for (let group in groupNames) {
        const option = document.createElement('option');
        option.value = group;
        option.textContent = groupNames[group];
        groupSelect.appendChild(option);
      }
    }
  }

  function loadMembers(group) {
    if (memberList) {
    memberList.innerHTML = '';
      if (groups[group]) {
      groups[group].forEach((member, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${member.id || generateMemberId(group)}</td>
            <td><input type="text" value="${member.name}" data-field="name" data-index="${index}"></td>
          <td>
              <select data-field="gender" data-index="${index}">
              <option value="男" ${member.gender === '男' ? 'selected' : ''}>男</option>
              <option value="女" ${member.gender === '女' ? 'selected' : ''}>女</option>
            </select>
          </td>
            <td><input type="text" value="${member.phone}" data-field="phone" data-index="${index}"></td>
          <td>
              <select data-field="baptized" data-index="${index}">
              <option value="是" ${member.baptized === '是' ? 'selected' : ''}>是</option>
              <option value="否" ${member.baptized === '否' ? 'selected' : ''}>否</option>
            </select>
          </td>
          <td>
              <select data-field="age" data-index="${index}">
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
            <td><button onclick="deleteMember('${group}', ${index})">删除</button></td>
        `;
        memberList.appendChild(row);
      });
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
    
    // 然后同步到Firebase
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
          id: generateMemberId(selectedGroup),
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
        
        saveData();
        loadMembers(selectedGroup);
        document.body.removeChild(dialog);
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

  if (saveButton) {
    saveButton.addEventListener('click', () => {
      const group = groupSelect ? groupSelect.value : '';
      if (!group) {
        alert('请选择小组！');
        return;
      }

      const inputs = memberList.querySelectorAll('input, select');
      inputs.forEach(input => {
        const field = input.dataset.field;
        const index = parseInt(input.dataset.index);
        if (field && index >= 0 && groups[group][index]) {
          groups[group][index][field] = input.value;
        }
      });

      saveData();
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

  // 密码修改功能
  if (changePasswordButton) {
  changePasswordButton.addEventListener('click', () => {
      if (changePasswordForm) {
        changePasswordForm.style.display = changePasswordForm.style.display === 'none' ? 'block' : 'none';
      }
  });
  }

  if (savePasswordButton) {
  savePasswordButton.addEventListener('click', () => {
      const oldPwd = oldPassword ? oldPassword.value : '';
      const newPwd = newPassword ? newPassword.value : '';
      const confirmPwd = confirmPassword ? confirmPassword.value : '';

      if (oldPwd !== window.adminPassword) {
        alert('原密码错误！');
        return;
      }

      if (newPwd !== confirmPwd) {
        alert('新密码确认不匹配！');
        return;
      }

      if (newPwd.length < 4) {
        alert('新密码长度至少4位！');
        return;
      }

      window.adminPassword = newPwd;
      localStorage.setItem('msh_adminPassword', newPwd);
        alert('密码修改成功！');
      
      if (changePasswordForm) {
        changePasswordForm.style.display = 'none';
      }
      if (oldPassword) oldPassword.value = '';
      if (newPassword) newPassword.value = '';
      if (confirmPassword) confirmPassword.value = '';
    });
  }

  if (cancelPasswordButton) {
  cancelPasswordButton.addEventListener('click', () => {
      if (changePasswordForm) {
    changePasswordForm.style.display = 'none';
      }
      if (oldPassword) oldPassword.value = '';
      if (newPassword) newPassword.value = '';
      if (confirmPassword) confirmPassword.value = '';
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

      const groupId = 'group' + (Object.keys(groups).length + 1);
      groups[groupId] = []; // 创建空的小组
      groupNames[groupId] = groupName;

      saveData();
      loadGroups();
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
        addGroupForm.style.display = 'none';
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
        delete groups[group];
        delete groupNames[group];
        saveData();
        loadGroups();
        if (memberList) memberList.innerHTML = '';
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
        editGroupForm.style.display = 'none';
      }
    });
  }

  if (cancelEditGroupButton) {
    cancelEditGroupButton.addEventListener('click', () => {
      if (editGroupForm) {
        editGroupForm.style.display = 'none';
      }
    });
  }

  // 数据导出导入功能
  if (exportButton) {
    exportButton.addEventListener('click', () => {
      const data = { groups, groupNames, attendanceRecords, adminPassword: window.adminPassword };
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
          if (data.adminPassword) window.adminPassword = data.adminPassword;
          
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

  // 初始加载数据 - 优先使用Firebase
  console.log("管理页面正在连接Firebase数据库...");
  loadDataFromFirebase();
});