import "./main.js";

function exportData() {
  const groups = JSON.parse(localStorage.getItem('groups')) || {};
  const attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
  const adminPassword = localStorage.getItem('adminPassword') || "1234";
  const groupNames = JSON.parse(localStorage.getItem('groupNames')) || {};

  const data = { groups, attendanceRecords, adminPassword, groupNames };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", "signin-system-data.json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!confirm("导入将覆盖现有数据，确定吗？")) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data.groups) localStorage.setItem('groups', JSON.stringify(data.groups));
      if (data.attendanceRecords) localStorage.setItem('attendanceRecords', JSON.stringify(data.attendanceRecords));
      if (data.adminPassword) localStorage.setItem('adminPassword', data.adminPassword);
      if (data.groupNames) localStorage.setItem('groupNames', JSON.stringify(data.groupNames));
      alert('数据导入成功！请刷新页面以查看更新。');
      window.location.reload();
    } catch (error) {
      alert('导入失败：文件格式错误或数据无效。' + error.message);
    }
  };
  reader.readAsText(file);
}

document.addEventListener('DOMContentLoaded', () => {
  const groupSelect = document.getElementById('groupSelect');
  const memberList = document.getElementById('memberList');
  const saveButton = document.getElementById('saveButton');
  const backButton = document.getElementById('backButton');
  const summaryButton = document.getElementById('summaryButton');
  const changePasswordButton = document.getElementById('changePasswordButton');
  const changePasswordForm = document.getElementById('changePasswordForm');
  const oldPassword = document.getElementById('oldPassword');
  const newPassword = document.getElementById('newPassword');
  const confirmPassword = document.getElementById('confirmPassword');
  const savePasswordButton = document.getElementById('savePasswordButton');
  const cancelPasswordButton = document.getElementById('cancelPasswordButton');
  const viewLogButton = document.getElementById('viewLogButton');
  const logContainer = document.getElementById('logContainer');
  const logList = document.getElementById('logList');
  const closeLogButton = document.getElementById('closeLogButton');
  const changeGroupNameButton = document.getElementById('changeGroupNameButton');
  const changeGroupNameForm = document.getElementById('changeGroupNameForm');
  const currentGroupSelect = document.getElementById('currentGroupSelect');
  const newGroupName = document.getElementById('newGroupNameChange');
  const saveGroupNameButton = document.getElementById('saveGroupNameButton');
  const cancelGroupNameButton = document.getElementById('cancelGroupNameButton');
  const addGroupButton = document.getElementById('addGroupButton');
  const newGroupNameInput = document.getElementById('newGroupName');
  const newGroupMembers = document.getElementById('newGroupMembers');
  const removeGroupSelect = document.getElementById('removeGroupSelect');
  const removeGroupButton = document.getElementById('removeGroupButton');
  const exportDataButton = document.getElementById('exportDataButton');
  const importDataButton = document.getElementById('importDataButton');
  const importFileInput = document.getElementById('importFileInput');

  let groups = JSON.parse(localStorage.getItem('groups')) || {
    group1: [{ name: "成员A", phone: "", gender: "男", baptized: "否", age: "90后" }],
    group2: [{ name: "成员D", phone: "", gender: "男", baptized: "否", age: "90后" }],
    group3: [{ name: "成员G", phone: "", gender: "男", baptized: "否", age: "90后" }],
    group4: [{ name: "成员J", phone: "", gender: "男", baptized: "否", age: "90后" }],
    group5: [{ name: "成员M", phone: "", gender: "男", baptized: "否", age: "90后" }],
    group6: [{ name: "成员P", phone: "", gender: "男", baptized: "否", age: "90后" }],
    group7: [{ name: "成员S", phone: "", gender: "男", baptized: "否", age: "90后" }]
  };
  let adminPassword = localStorage.getItem('adminPassword') || "1234";
  let modificationLogs = JSON.parse(localStorage.getItem('modificationLogs')) || [];
  const groupNames = JSON.parse(localStorage.getItem('groupNames')) || {
    group1: "小组1",
    group2: "小组2",
    group3: "小组3",
    group4: "小组4",
    group5: "小组5",
    group6: "小组6",
    group7: "小组7"
  };

  function updateGroupSelects() {
    const options = [];
    for (let key in groupNames) {
      options.push({ value: key, text: groupNames[key] });
    }
    [groupSelect, currentGroupSelect, removeGroupSelect].forEach(select => {
      select.innerHTML = '<option value="">--请选择小组--</option>';
      options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.text;
        select.appendChild(opt);
      });
    });
  }

  function renderMemberTable(group) {
    memberList.innerHTML = '';
    if (group && groups[group]) {
      groups[group].forEach((member, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${index + 1}</td>
          <td><input type="text" value="${member.name}"></td>
          <td>
            <select>
              <option value="男" ${member.gender === '男' ? 'selected' : ''}>男</option>
              <option value="女" ${member.gender === '女' ? 'selected' : ''}>女</option>
            </select>
          </td>
          <td><input type="text" value="${member.phone || ''}" placeholder="联系方式"></td>
          <td>
            <select>
              <option value="是" ${member.baptized === '是' ? 'selected' : ''}>是</option>
              <option value="否" ${member.baptized === '否' ? 'selected' : ''}>否</option>
            </select>
          </td>
          <td>
            <select>
              <option ${member.age === '70后' ? 'selected' : ''}>70后</option>
              <option ${member.age === '75后' ? 'selected' : ''}>75后</option>
              <option ${member.age === '80后' ? 'selected' : ''}>80后</option>
              <option ${member.age === '85后' ? 'selected' : ''}>85后</option>
              <option ${member.age === '90后' ? 'selected' : ''}>90后</option>
              <option ${member.age === '95后' ? 'selected' : ''}>95后</option>
              <option ${member.age === '00后' ? 'selected' : ''}>00后</option>
              <option ${member.age === '05后' ? 'selected' : ''}>05后</option>
            </select>
          </td>
          <td>
            <button class="deleteButton" data-group="${group}" data-index="${index}">删除</button>
            <button class="moveButton" data-group="${group}" data-index="${index}">移动</button>
          </td>
        `;
        memberList.appendChild(row);
      });
    }
  }

  groupSelect.addEventListener('change', () => {
    renderMemberTable(groupSelect.value);
  });

  saveButton.addEventListener('click', () => {
    const group = groupSelect.value;
    if (group) {
      const rows = memberList.getElementsByTagName('tr');
      const updatedMembers = Array.from(rows).map(row => {
        const inputs = row.getElementsByTagName('input');
        const selects = row.getElementsByTagName('select');
        return {
          name: inputs[0].value,
          phone: inputs[1].value || '',
          gender: selects[0].value,
          baptized: selects[1].value,
          age: selects[2].value
        };
      });
      groups[group] = updatedMembers;
      localStorage.setItem('groups', JSON.stringify(groups));
      alert('修改已保存！');
    }
  });

  memberList.addEventListener('click', (e) => {
    if (e.target.classList.contains('deleteButton')) {
      const group = e.target.dataset.group;
      const index = parseInt(e.target.dataset.index);
      const memberName = groups[group][index].name;
      if (confirm(`确定删除 ${memberName} 吗？`)) {
        groups[group].splice(index, 1);
        localStorage.setItem('groups', JSON.stringify(groups));
        renderMemberTable(group);
      }
    }
    if (e.target.classList.contains('moveButton')) {
      const fromGroup = e.target.dataset.group;
      const index = parseInt(e.target.dataset.index);
      const memberName = groups[fromGroup][index].name;
      const toGroup = prompt("请输入目标小组（group1 到 group7 或更高）：");
      if (toGroup && groups.hasOwnProperty(toGroup)) {
        if (confirm(`确定将 ${memberName} 移动到 ${groupNames[toGroup] || toGroup} 吗？`)) {
          const member = groups[fromGroup][index];
          groups[toGroup].push(member);
          groups[fromGroup].splice(index, 1);
          localStorage.setItem('groups', JSON.stringify(groups));
          renderMemberTable(fromGroup);
        }
      } else {
        alert("无效的小组！请输入有效的 group ID（如 group1）。");
      }
    }
  });

  backButton.addEventListener('click', () => {
    window.location.href = "index.html";
  });

  summaryButton.addEventListener('click', () => {
    window.location.href = "summary.html";
  });

  changePasswordButton.addEventListener('click', () => {
    changePasswordForm.style.display = 'block';
  });

  savePasswordButton.addEventListener('click', () => {
    const oldPass = oldPassword.value;
    const newPass = newPassword.value;
    const confirmPass = confirmPassword.value;
    if (oldPass === adminPassword) {
      if (newPass === confirmPass && newPass.length > 0) {
        adminPassword = newPass;
        localStorage.setItem('adminPassword', adminPassword);
        alert('密码修改成功！');
        changePasswordForm.style.display = 'none';
        oldPassword.value = '';
        newPassword.value = '';
        confirmPassword.value = '';
      } else {
        alert('新密码和确认密码不一致或为空！');
      }
    } else {
      alert('当前密码错误！');
    }
  });

  cancelPasswordButton.addEventListener('click', () => {
    changePasswordForm.style.display = 'none';
    oldPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
  });

  changeGroupNameButton.addEventListener('click', () => {
    changeGroupNameForm.style.display = 'block';
    updateGroupSelects();
  });

  saveGroupNameButton.addEventListener('click', () => {
    const group = currentGroupSelect.value;
    const newName = newGroupName.value.trim();
    if (group && newName) {
      groupNames[group] = newName;
      localStorage.setItem('groupNames', JSON.stringify(groupNames));
      alert('小组名称已更改！');
      changeGroupNameForm.style.display = 'none';
      newGroupName.value = '';
      updateGroupSelects();
    } else {
      alert('请选择小组并输入新名称！');
    }
  });

  cancelGroupNameButton.addEventListener('click', () => {
    changeGroupNameForm.style.display = 'none';
    newGroupName.value = '';
  });

  viewLogButton.addEventListener('click', () => {
    logContainer.style.display = 'block';
    renderLogs();
  });

  closeLogButton.addEventListener('click', () => {
    logContainer.style.display = 'none';
  });

  function logModification(action) {
    const now = new Date().toLocaleString('zh-CN');
    modificationLogs.push({ date: now, action });
    localStorage.setItem('modificationLogs', JSON.stringify(modificationLogs));
  }

  function renderLogs() {
    logList.innerHTML = '';
    modificationLogs.forEach(log => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${log.date}</td>
        <td>${log.action}</td>
      `;
      logList.appendChild(row);
    });
  }

  addGroupButton.addEventListener('click', () => {
    const groupName = newGroupNameInput.value.trim();
    const membersStr = newGroupMembers.value.trim();
    if (groupName && membersStr) {
      const groupIds = Object.keys(groupNames).map(id => parseInt(id.replace('group', '')));
      const newGroupId = `group${groupIds.length ? Math.max(...groupIds) + 1 : 8}`;
      const members = membersStr.split(/\s+/).map(name => ({
        name: name.trim(),
        phone: "",
        gender: "男",
        baptized: "否",
        age: "90后"
      }));
      groupNames[newGroupId] = groupName;
      groups[newGroupId] = members;
      localStorage.setItem('groupNames', JSON.stringify(groupNames));
      localStorage.setItem('groups', JSON.stringify(groups));
      updateGroupSelects();
      newGroupNameInput.value = '';
      newGroupMembers.value = '';
      alert('小组已成功添加！');
    } else {
      alert('请输入小组名称和成员姓名！');
    }
  });

  removeGroupButton.addEventListener('click', () => {
    const groupId = removeGroupSelect.value;
    if (groupId) {
      if (confirm(`确定删除 ${groupNames[groupId]} 吗？这将删除该小组的所有成员和相关记录！`)) {
        delete groupNames[groupId];
        delete groups[groupId];
        const attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
        const updatedRecords = attendanceRecords.filter(record => record.group !== groupId);
        localStorage.setItem('attendanceRecords', JSON.stringify(updatedRecords));
        localStorage.setItem('groupNames', JSON.stringify(groupNames));
        localStorage.setItem('groups', JSON.stringify(groups));
        updateGroupSelects();
        alert('小组已成功删除！');
      }
    } else {
      alert('请选择要删除的小组！');
    }
  });

  updateGroupSelects();
  renderLogs();
  memberList.innerHTML = ''; // 初始不显示成员列表

  exportDataButton.style.display = 'none';
  importDataButton.style.display = 'none';

  function checkAdminAccess() {
    const password = localStorage.getItem('adminPassword') || "1234";
    const enteredPassword = prompt("请输入管理员密码：");
    return enteredPassword === password;
  }

  if (checkAdminAccess()) {
    exportDataButton.style.display = 'inline-block';
    importDataButton.style.display = 'inline-block';
    exportDataButton.addEventListener('click', exportData);
    importDataButton.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', importData);
  } else {
    exportDataButton.style.display = 'none';
    importDataButton.style.display = 'none';
    alert('管理员验证失败，请返回签到页面。');
    window.location.href = "index.html";
  }
});