const groupSelect = document.getElementById('groupSelect');
const memberSelect = document.getElementById('memberSelect');
const signinButton = document.getElementById('signinButton');
const morningList = document.getElementById('morningList');
const midMorningList = document.getElementById('midMorningList');
const lateMorningList = document.getElementById('lateMorningList');
const adminButton = document.getElementById('adminButton');
const addNewcomerButton = document.getElementById('addNewcomerButton');
const addMemberForm = document.getElementById('addMemberForm');
const newGroupSelect = document.getElementById('newGroupSelect');
const newMemberName = document.getElementById('newMemberName');
const newMemberPhone = document.getElementById('newMemberPhone');
const saveNewMemberButton = document.getElementById('saveNewMemberButton');
const cancelNewMemberButton = document.getElementById('cancelNewMemberButton');
const dailyReportButton = document.getElementById('dailyReportButton');
const memberSearch = document.getElementById('memberSearch');
const suggestions = document.getElementById('suggestions');

// 加载 groups 数据
let groups = JSON.parse(localStorage.getItem('groups')) || {
    group1: [{ name: "成员A", phone: "", gender: "男", baptized: "否", age: "90后" }],
    group2: [{ name: "成员D", phone: "", gender: "男", baptized: "否", age: "90后" }],
    group3: [{ name: "成员G", phone: "", gender: "男", baptized: "否", age: "90后" }],
    group4: [{ name: "成员J", phone: "", gender: "男", baptized: "否", age: "90后" }],
    group5: [{ name: "成员M", phone: "", gender: "男", baptized: "否", age: "90后" }],
    group6: [{ name: "成员P", phone: "", gender: "男", baptized: "否", age: "90后" }],
    group7: [{ name: "成员S", phone: "", gender: "男", baptized: "否", age: "90后" }]
};

// 加载密码
let adminPassword = localStorage.getItem('adminPassword') || "1234";

// 加载小组名称
const groupNames = JSON.parse(localStorage.getItem('groupNames')) || {
    group1: "小组1",
    group2: "小组2",
    group3: "小组3",
    group4: "小组4",
    group5: "小组5",
    group6: "小组6",
    group7: "小组7"
};

// 加载签到记录
let attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
loadAttendanceRecords();

// 更新小组选择框
function updateGroupSelect(selectElement) {
    selectElement.innerHTML = '<option value="">--请选择小组--</option>';
    for (let key in groupNames) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = groupNames[key];
        selectElement.appendChild(option);
    }
}

// 更新成员选择框
function updateMemberSelect(group) {
    memberSelect.innerHTML = '<option value="">--请选择成员--</option>';
    if (groups[group]) {
        groups[group].forEach(member => {
            const option = document.createElement('option');
            option.value = member.name;
            option.textContent = member.name;
            memberSelect.appendChild(option);
        });
    }
}

// 初始化选择框
updateGroupSelect(groupSelect);
updateGroupSelect(newGroupSelect);

// 监听小组选择变化
groupSelect.addEventListener('change', () => {
    updateMemberSelect(groupSelect.value);
});

// 姓名检索功能
function searchMembers(query) {
    suggestions.innerHTML = '';
    suggestions.style.display = 'none';
    if (!query) return;

    const allMembers = {};
    for (let group in groups) {
        groups[group].forEach(member => {
            const memberName = member.name;
            if (memberName.includes(query)) {
                if (!allMembers[group]) allMembers[group] = [];
                allMembers[group].push(member);
            }
        });
    }

    if (Object.keys(allMembers).length > 0) {
        suggestions.style.display = 'block';
        for (let group in allMembers) {
            allMembers[group].forEach(member => {
                const div = document.createElement('div');
                div.textContent = `${member.name} (小组: ${groupNames[group]})`;
                div.onclick = () => selectMember(member.name, group);
                suggestions.appendChild(div);
            });
        }
    }
}

memberSearch.addEventListener('input', (e) => {
    searchMembers(e.target.value);
});

document.addEventListener('click', (e) => {
    if (!suggestions.contains(e.target) && e.target !== memberSearch) {
        suggestions.style.display = 'none';
    }
});

// 选中候选姓名
function selectMember(memberName, group) {
    groupSelect.value = group;
    updateMemberSelect(group);
    memberSelect.value = memberName;
    memberSearch.value = '';
    suggestions.style.display = 'none';
}

// 检查签到限制
function isAlreadySignedIn(member, date) {
    const now = new Date();
    const hours = now.getHours();
    let timePeriod;

    if (hours < 12) {
        timePeriod = 'morning'; // 中午12点前
    } else if (hours < 18) {
        timePeriod = 'afternoon'; // 下午6点前
    } else {
        timePeriod = 'evening'; // 晚上12点前
    }

    // 过滤当天该成员的签到记录
    const memberRecords = attendanceRecords.filter(record => 
        record.date === date && record.member === member
    );

    // 检查当前时间段内的签到次数
    return memberRecords.some(record => {
        const recordTime = new Date(`${date} ${record.time}`);
        const recordHours = recordTime.getHours();
        if (timePeriod === 'morning' && recordHours < 12) return true;
        if (timePeriod === 'afternoon' && recordHours >= 12 && recordHours < 18) return true;
        if (timePeriod === 'evening' && recordHours >= 18) return true;
        return false;
    });
}

// 签到按钮事件
signinButton.addEventListener('click', () => {
    const group = groupSelect.value;
    const memberName = memberSelect.value;
    if (group && memberName) {
        const now = new Date();
        // 使用 ISO 格式日期
        const date = now.toISOString().split('T')[0]; // 例如 "2025-03-02"
        const time = now.toLocaleTimeString().split(' ')[0]; // 例如 "14:30:00" 去掉 AM/PM
        const hours = now.getHours();
        const minutes = now.getMinutes();

        // 检查签到限制
        if (isAlreadySignedIn(memberName, date)) {
            alert('该成员在当前时间段内已签到，无法重复签到！');
            return;
        }

        const record = { group, member: memberName, date, time };

        attendanceRecords.push(record);
        localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));

        let tableBody, tableId;
        if (hours < 9 || (hours === 9 && minutes === 0)) {
            tableBody = morningList;
            tableId = 'morningTable';
        } else if (hours === 9 && minutes <= 30) {
            tableBody = midMorningList;
            tableId = 'midMorningTable';
        } else {
            tableBody = lateMorningList;
            tableId = 'lateMorningTable';
        }

        const row = document.createElement('tr');
        row.innerHTML = `<td>${groupNames[group] || group}</td><td>${memberName}</td><td>${time}</td>`;
        tableBody.appendChild(row);
        updateTableVisibility();
    }
});

// 加载签到记录到表格
function loadAttendanceRecords() {
    const today = new Date().toISOString().split('T')[0]; // 使用 ISO 格式
    attendanceRecords.filter(record => record.date === today).forEach(record => {
        const hours = new Date(`${record.date} ${record.time}`).getHours();
        const minutes = new Date(`${record.date} ${record.time}`).getMinutes();
        let tableBody;
        if (hours < 9 || (hours === 9 && minutes === 0)) {
            tableBody = morningList;
        } else if (hours === 9 && minutes <= 30) {
            tableBody = midMorningList;
        } else {
            tableBody = lateMorningList;
        }

        const row = document.createElement('tr');
        row.innerHTML = `<td>${groupNames[record.group] || record.group}</td><td>${record.member}</td><td>${record.time}</td>`;
        tableBody.appendChild(row);
    });
    updateTableVisibility();
}

// 更新表格显示/隐藏状态
function updateTableVisibility() {
    const tables = [
        { id: 'morningTable', tbody: morningList },
        { id: 'midMorningTable', tbody: midMorningList },
        { id: 'lateMorningTable', tbody: lateMorningList }
    ];

    tables.forEach(table => {
        const tableElement = document.getElementById(table.id);
        if (!tableElement || !table.tbody) return; // 防止空指针
        if (table.tbody.children.length === 0) {
            tableElement.classList.add('hidden');
        } else {
            tableElement.classList.remove('hidden');
        }
    });
}

// 初始化时隐藏空表格
updateTableVisibility();

// 新增新人按钮事件
addNewcomerButton.addEventListener('click', () => {
    addMemberForm.style.display = 'block';
});

// 保存新增新人
saveNewMemberButton.addEventListener('click', () => {
    const group = newGroupSelect.value;
    const name = newMemberName.value.trim();
    const phone = newMemberPhone.value.trim();
    if (group && name && phone) {
        const now = new Date();
        const addedDate = now.toISOString().split('T')[0];
        // 写入 Firestore
        db.collection('members').add({
            group,
            name,
            phone,
            gender: "男",
            baptized: "否",
            age: "90后",
            addedDate
        }).then((docRef) => {
            // 本地同步
            if (!groups[group]) groups[group] = [];
            groups[group].push({ name, phone, gender: "男", baptized: "否", age: "90后", addedDate });
            localStorage.setItem('groups', JSON.stringify(groups));
            updateMemberSelect(group);
            addMemberForm.style.display = 'none';
            newMemberName.value = '';
            newMemberPhone.value = '';
            alert('新人已新增！');
        }).catch((error) => {
            alert('保存失败: ' + error.message);
        });
    } else {
        alert('请选择小组并输入新人姓名和联系号码！');
    }
});

// 取消新增
cancelNewMemberButton.addEventListener('click', () => {
    addMemberForm.style.display = 'none';
    newMemberName.value = '';
    newMemberPhone.value = '';
});

// 管理按钮事件
adminButton.addEventListener('click', () => {
    const password = prompt("请输入管理员密码：");
    if (password === adminPassword) {
        window.location.href = "admin.html";
    } else {
        alert("密码错误！");
    }
});

// 日报表按钮事件
dailyReportButton.addEventListener('click', () => {
    window.location.href = "daily-report.html";
});

// 获取 Firestore 数据库对象
const db = firebase.firestore();
