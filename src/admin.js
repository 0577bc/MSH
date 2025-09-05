// src/admin.js
import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, setDoc, doc, deleteDoc, writeBatch, query, where, getDoc } from 'firebase/firestore';

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
  const removeGroupButton = document.getElementById('removeGroupButton');
  const removeGroupSelect = document.getElementById('removeGroupSelect');

  // 数据变量
  let groupNames = {};
  let groups = {};
  let modificationLogs = [];
  let adminPassword = "1234";

  // 加载管理员密码
  async function loadAdminPassword() {
    try {
      const docRef = doc(db, 'settings', 'adminPassword');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        adminPassword = docSnap.data().password || "1234";
      } else {
        await setDoc(docRef, { password: "1234" });
      }
    } catch (error) {
      console.error('加载管理员密码失败:', error);
      alert('加载管理员密码失败，请检查网络或 Firebase 配置');
    }
  }

  // 加载小组名称
  async function loadGroupNames() {
    try {
      const docRef = doc(db, 'settings', 'groupNames');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        groupNames = docSnap.data() || {
          group1: "小组1",
          group2: "小组2",
          group3: "小组3",
          group4: "小组4",
          group5: "小组5",
          group6: "小组6",
          group7: "小组7",
        };
      } else {
        groupNames = {
          group1: "小组1",
          group2: "小组2",
          group3: "小组3",
          group4: "小组4",
          group5: "小组5",
          group6: "小组6",
          group7: "小组7",
        };
        await setDoc(docRef, groupNames);
      }
    } catch (error) {
      console.error('加载小组名称失败:', error);
      alert('加载小组名称失败，请检查网络或 Firebase 配置');
    }
  }

  // 加载小组成员
  async function loadGroups() {
    try {
      const querySnapshot = await getDocs(collection(db, 'members'));
      groups = {};
      querySnapshot.forEach(doc => {
        const member = doc.data();
        if (!groups[member.group]) groups[member.group] = [];
        groups[member.group].push({
          name: member.name,
          phone: member.phone,
          gender: member.gender,
          baptized: member.baptized,
          age: member.age,
          addedDate: member.addedDate,
          id: doc.id
        });
      });
      if (Object.keys(groups).length === 0) {
        groups = {
          group1: [{ name: "成员A", phone: "", gender: "男", baptized: "否", age: "90后", addedDate: "" }],
          group2: [{ name: "成员D", phone: "", gender: "男", baptized: "否", age: "90后", addedDate: "" }],
          group3: [{ name: "成员G", phone: "", gender: "男", baptized: "否", age: "90后", addedDate: "" }],
          group4: [{ name: "成员J", phone: "", gender: "男", baptized: "否", age: "90后", addedDate: "" }],
          group5: [{ name: "成员M", phone: "", gender: "男", baptized: "否", age: "90后", addedDate: "" }],
          group6: [{ name: "成员P", phone: "", gender: "男", baptized: "否", age: "90后", addedDate: "" }],
          group7: [{ name: "成员S", phone: "", gender: "男", baptized: "否", age: "90后", addedDate: "" }],
        };
        for (let group in groups) {
          for (let member of groups[group]) {
            await addDoc(collection(db, 'members'), { ...member, group });
          }
        }
      }
    } catch (error) {
      console.error('加载小组成员失败:', error);
      alert('加载小组成员失败，请检查网络或 Firebase 配置');
    }
  }

  // 加载修改日志
  async function loadLogs() {
    try {
      const querySnapshot = await getDocs(collection(db, 'logs'));
      modificationLogs = querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('加载修改日志失败:', error);
      alert('加载修改日志失败，请检查网络或 Firebase 配置');
    }
  }

  // 更新小组选择下拉框
  function updateGroupSelects() {
    groupSelect.innerHTML = '<option value="">--请选择小组--</option>';
    currentGroupSelect.innerHTML = '<option value="">--请选择小组--</option>';
    removeGroupSelect.innerHTML = '<option value="">--请选择小组--</option>';
    for (let group in groupNames) {
      const option = document.createElement('option');
      option.value = group;
      option.textContent = groupNames[group];
      groupSelect.appendChild(option);
      currentGroupSelect.appendChild(option.cloneNode(true));
      removeGroupSelect.appendChild(option.cloneNode(true));
    }
    renderMemberTable(groupSelect.value || Object.keys(groupNames)[0] || 'group1');
  }

  // 渲染成员表格
  function renderMemberTable(groupId) {
    memberList.innerHTML = '';
    if (groupId && groups[groupId]) {
      groups[groupId].forEach((member, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${index + 1}</td>
          <td><input type="text" value="${member.name}" class="member-name"></td>
          <td><select class="member-gender">
            <option value="男" ${member.gender === '男' ? 'selected' : ''}>男</option>
            <option value="女" ${member.gender === '女' ? 'selected' : ''}>女</option>
          </select></td>
          <td><input type="text" value="${member.phone}" class="member-phone"></td>
          <td><select class="member-baptized">
            <option value="是" ${member.baptized === '是' ? 'selected' : ''}>是</option>
            <option value="否" ${member.baptized === '否' ? 'selected' : ''}>否</option>
          </select></td>
          <td><select class="member-age">
            <option value="90后" ${member.age === '90后' ? 'selected' : ''}>90后</option>
            <option value="00后" ${member.age === '00后' ? 'selected' : ''}>00后</option>
            <option value="80后" ${member.age === '80后' ? 'selected' : ''}>80后</option>
          </select></td>
          <td><button class="delete-member" data-id="${member.id}">删除</button></td>
        `;
        memberList.appendChild(row);
      });
    }
  }

  // 记录修改日志
  async function logModification(action) {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    try {
      await addDoc(collection(db, 'logs'), { date, action });
      await loadLogs();
    } catch (error) {
      console.error('记录日志失败:', error);
      alert('记录日志失败，请检查网络或 Firebase 配置');
    }
  }

  // 渲染修改日志
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

  // 事件监听器
  groupSelect.addEventListener('change', () => {
    renderMemberTable(groupSelect.value);
  });

  saveButton.addEventListener('click', async () => {
    const groupId = groupSelect.value;
    if (groupId) {
      const rows = memberList.querySelectorAll('tr');
      const updatedMembers = [];
      rows.forEach(row => {
        const name = row.querySelector('.member-name').value.trim();
        const gender = row.querySelector('.member-gender').value;
        const phone = row.querySelector('.member-phone').value.trim();
        const baptized = row.querySelector('.member-baptized').value;
        const age = row.querySelector('.member-age').value;
        const id = row.querySelector('.delete-member').dataset.id;
        if (name) {
          updatedMembers.push({ name, gender, phone, baptized, age, id });
        }
      });

      try {
        const batch = writeBatch(db);
        const q = query(collection(db, 'members'), where('group', '==', groupId));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(doc => batch.delete(doc.ref));
        for (let member of updatedMembers) {
          if (member.id) {
            batch.set(doc(db, 'members', member.id), {
              name: member.name,
              gender: member.gender,
              phone: member.phone,
              baptized: member.baptized,
              age: member.age,
              group: groupId
            });
          } else {
            batch.set(doc(collection(db, 'members')), {
              name: member.name,
              gender: member.gender,
              phone: member.phone,
              baptized: member.baptized,
              age: member.age,
              group: groupId
            });
          }
        }
        await batch.commit();
        await loadGroups();
        renderMemberTable(groupId);
        await logModification(`更新小组 ${groupNames[groupId]} 的成员信息`);
        alert('成员信息已保存！');
      } catch (error) {
        console.error('保存成员失败:', error);
        alert('保存成员失败，请检查网络或 Firebase 配置');
      }
    } else {
      alert('请选择小组！');
    }
  });

  memberList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('delete-member')) {
      const groupId = groupSelect.value;
      if (groupId) {
        const id = e.target.dataset.id;
        const member = groups[groupId].find(m => m.id === id);
        try {
          await deleteDoc(doc(db, 'members', id));
          await loadGroups();
          renderMemberTable(groupId);
          await logModification(`删除成员：${member.name} 从 ${groupNames[groupId]}`);
          alert('成员已删除！');
        } catch (error) {
          console.error('删除成员失败:', error);
          alert('删除成员失败，请检查网络或 Firebase 配置');
        }
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

  cancelPasswordButton.addEventListener('click', () => {
    changePasswordForm.style.display = 'none';
    oldPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
  });

  savePasswordButton.addEventListener('click', async () => {
    await loadAdminPassword();
    if (oldPassword.value === adminPassword && newPassword.value === confirmPassword.value && newPassword.value) {
      adminPassword = newPassword.value;
      try {
        await setDoc(doc(db, 'settings', 'adminPassword'), { password: adminPassword });
        await logModification(`修改密码：旧密码 -> 新密码（隐藏）`);
        alert('密码修改成功！');
        changePasswordForm.style.display = 'none';
        oldPassword.value = '';
        newPassword.value = '';
        confirmPassword.value = '';
      } catch (error) {
        console.error('保存密码失败:', error);
        alert('保存密码失败，请检查网络或 Firebase 配置');
      }
    } else {
      alert('密码错误或新密码不匹配！');
    }
  });

  viewLogButton.addEventListener('click', () => {
    logContainer.style.display = 'block';
    renderLogs();
  });

  closeLogButton.addEventListener('click', () => {
    logContainer.style.display = 'none';
  });

  changeGroupNameButton.addEventListener('click', () => {
    changeGroupNameForm.style.display = 'block';
  });

  cancelGroupNameButton.addEventListener('click', () => {
    changeGroupNameForm.style.display = 'none';
    currentGroupSelect.value = '';
    newGroupName.value = '';
  });

  saveGroupNameButton.addEventListener('click', async () => {
    const groupId = currentGroupSelect.value;
    const newName = newGroupName.value.trim();
    if (groupId && newName) {
      const oldName = groupNames[groupId];
      groupNames[groupId] = newName;
      try {
        await setDoc(doc(db, 'settings', 'groupNames'), groupNames);
        await loadGroupNames();
        updateGroupSelects();
        changeGroupNameForm.style.display = 'none';
        newGroupName.value = '';
        await logModification(`更改小组名称：${oldName} -> ${newName}`);
        alert('小组名称已更改！');
      } catch (error) {
        console.error('更改小组名称失败:', error);
        alert('更改小组名称失败，请检查网络或 Firebase 配置');
      }
    } else {
      alert('请选择小组并输入新名称！');
    }
  });

  addGroupButton.addEventListener('click', async () => {
    const groupName = newGroupNameInput.value.trim();
    const membersStr = newGroupMembers.value.trim();
    if (groupName && membersStr) {
      const groupIds = Object.keys(groupNames).map(id => parseInt(id.replace('group', '')));
      const newGroupId = `group${groupIds.length ? Math.max(...groupIds) + 1 : 8}`;
      const members = membersStr.split(',').map(name => ({
        name: name.trim(),
        phone: "",
        gender: "男",
        baptized: "否",
        age: "90后",
        addedDate: new Date().toISOString().split('T')[0]
      }));

      try {
        groupNames[newGroupId] = groupName;
        await setDoc(doc(db, 'settings', 'groupNames'), groupNames);
        const batch = writeBatch(db);
        for (let member of members) {
          batch.set(doc(collection(db, 'members')), { ...member, group: newGroupId });
        }
        await batch.commit();
        await loadGroupNames();
        await loadGroups();
        updateGroupSelects();
        newGroupNameInput.value = '';
        newGroupMembers.value = '';
        await logModification(`新增小组：${groupName} (ID: ${newGroupId})`);
        alert('小组已成功添加！');
      } catch (error) {
        console.error('添加小组失败:', error);
        alert('添加小组失败，请检查网络或 Firebase 配置');
      }
    } else {
      alert('请输入小组名称和成员姓名！');
    }
  });

  removeGroupButton.addEventListener('click', async () => {
    const groupId = removeGroupSelect.value;
    if (groupId) {
      const groupName = groupNames[groupId];
      if (confirm(`确定删除 ${groupName} 吗？这将删除该小组的所有成员和相关记录！`)) {
        try {
          const batch = writeBatch(db);
          const memberQuery = query(collection(db, 'members'), where('group', '==', groupId));
          const memberSnapshot = await getDocs(memberQuery);
          memberSnapshot.forEach(doc => batch.delete(doc.ref));
          const attendanceQuery = query(collection(db, 'attendance'), where('group', '==', groupId));
          const attendanceSnapshot = await getDocs(attendanceQuery);
          attendanceSnapshot.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
          delete groupNames[groupId];
          await setDoc(doc(db, 'settings', 'groupNames'), groupNames);
          await loadGroupNames();
          await loadGroups();
          updateGroupSelects();
          await logModification(`删除小组：${groupName} (ID: ${groupId})`);
          alert('小组已成功删除！');
        } catch (error) {
          console.error('删除小组失败:', error);
          alert('删除小组失败，请检查网络或 Firebase 配置');
        }
      }
    } else {
      alert('请选择要删除的小组！');
    }
  });

  // 初始加载
  Promise.all([loadAdminPassword(), loadGroupNames(), loadGroups(), loadLogs()]).then(() => {
    updateGroupSelects();
    renderLogs();
  });
});