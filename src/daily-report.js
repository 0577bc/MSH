const reportDate = document.getElementById('reportDate');
const dailyReportList = document.getElementById('dailyReportList');
const backButton = document.getElementById('backButton');
const newMembersNames = document.getElementById('newMembersNames');
const newMembersCount = document.getElementById('newMembersCount');

// 加载签到记录
let attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];

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

// 加载小组成员（使用对象数组，与 localStorage 一致）
const groups = JSON.parse(localStorage.getItem('groups')) || {
    group1: [{ name: "成员A", phone: "", gender: "男", baptized: "否", age: "90后", addedDate: "" }],
    group2: [{ name: "成员D", phone: "", gender: "男", baptized: "否", age: "90后", addedDate: "" }],
    group3: [{ name: "成员G", phone: "", gender: "男", baptized: "否", age: "90后", addedDate: "" }],
    group4: [{ name: "成员J", phone: "", gender: "男", baptized: "否", age: "90后", addedDate: "" }],
    group5: [{ name: "成员M", phone: "", gender: "男", baptized: "否", age: "90后", addedDate: "" }],
    group6: [{ name: "成员P", phone: "", gender: "男", baptized: "否", age: "90后", addedDate: "" }],
    group7: [{ name: "成员S", phone: "", gender: "男", baptized: "否", age: "90后", addedDate: "" }]
};

const db = firebase.firestore();

function getToday() {
    return new Date().toISOString().split('T')[0]; // 使用 ISO 格式
}

function generateDailyReport() {
    const today = getToday();
    const totalSigned = attendanceRecords.filter(record => record.date === today).length;
    reportDate.textContent = `日期：${today}（总签到人数：${totalSigned}人）`;

    dailyReportList.innerHTML = '';
    for (let group in groups) {
        const todayRecords = attendanceRecords.filter(record => record.date === today && record.group === group);
        const groupMembers = groups[group].map(member => member.name); // 提取成员姓名作为字符串数组
        const signedMembers = todayRecords.map(record => record.member); // 签到成员姓名数组
        const unsignedMembers = groupMembers.filter(member => !signedMembers.includes(member)); // 过滤未签到成员

        // 按时间段分类签到人员（只提取姓名）
        const early = [];
        const onTime = [];
        const late = [];
        todayRecords.forEach(record => {
            const timeParts = record.time.split(':');
            const hours = parseInt(timeParts[0], 10);
            const minutes = parseInt(timeParts[1], 10);
            if (hours < 9 || (hours === 9 && minutes === 0)) {
                early.push(record.member);
            } else if (hours === 9 && minutes <= 30) {
                onTime.push(record.member);
            } else {
                late.push(record.member);
            }
        });

        // 生成表格行，直接显示姓名列表
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${groupNames[group] || group}</td>
            <td>${early.join(', ') || '-'}</td>
            <td>${onTime.join(', ') || '-'}</td>
            <td>${late.join(', ') || '-'}</td>
            <td>${unsignedMembers.join(', ') || '-'}</td>
        `;
        dailyReportList.appendChild(row);
    }

    // 添加当天新增人员
    const newMembers = getNewMembersToday(today);
    newMembersNames.textContent = newMembers.join(', ') || '-';
    newMembersCount.textContent = newMembers.length;
}

// 获取当天新增成员
function getNewMembersToday(today) {
    const newMembers = [];
    for (let group in groups) {
        groups[group].forEach(member => {
            if (member.addedDate === today) {
                newMembers.push(member.name);
            }
        });
    }
    return newMembers;
}

generateDailyReport();

backButton.addEventListener('click', () => {
    window.location.href = "index.html";
});