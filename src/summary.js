const summaryList = document.getElementById('summaryList');
const showAttendanceButton = document.getElementById('showAttendanceButton');
const dailyReportButton = document.getElementById('dailyReportButton');
const quarterlyReportButton = document.getElementById('quarterlyReportButton');
const yearlyReportButton = document.getElementById('yearlyReportButton');
const backButton = document.getElementById('backButton');
const summaryTable = document.getElementById('summaryTable');
const dailyReportSection = document.getElementById('dailyReportSection');
const dailyDate = document.getElementById('dailyDate');
const generateDailyReport = document.getElementById('generateDailyReport');
const exportDailyReport = document.getElementById('exportDailyReport');
const dailyReportList = document.getElementById('dailyReportList');
const dailyReportTable = document.getElementById('dailyReportTable');
const quarterlyReportSection = document.getElementById('quarterlyReportSection');
const quarterlyYear = document.getElementById('quarterlyYear');
const quarterlyQuarter = document.getElementById('quarterlyQuarter');
const generateQuarterlyReport = document.getElementById('generateQuarterlyReport');
const exportQuarterlyReport = document.getElementById('exportQuarterlyReport');
const quarterlyReportList = document.getElementById('quarterlyReportList');
const quarterlyReportTable = document.getElementById('quarterlyReportTable');
const yearlyReportSection = document.getElementById('yearlyReportSection');
const yearlyYear = document.getElementById('yearlyYear');
const generateYearlyReport = document.getElementById('generateYearlyReport');
const exportYearlyReport = document.getElementById('exportYearlyReport');
const clearYearlyRecords = document.getElementById('clearYearlyRecords');
const yearlyReportList = document.getElementById('yearlyReportList');
const yearlyReportTable = document.getElementById('yearlyReportTable');

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
    group1: [{ name: "成员A", phone: "", gender: "男", baptized: "否", age: "90后" }],
    group2: [{ name: "成员D", phone: "", gender: "男", baptized: "否", age: "90后" }],
    group3: [{ name: "成员G", phone: "", gender: "男", baptized: "否", age: "90后" }],
    group4: [{ name: "成员J", phone: "", gender: "男", baptized: "否", age: "90后" }],
    group5: [{ name: "成员M", phone: "", gender: "男", baptized: "否", age: "90后" }],
    group6: [{ name: "成员P", phone: "", gender: "男", baptized: "否", age: "90后" }],
    group7: [{ name: "成员S", phone: "", gender: "男", baptized: "否", age: "90后" }]
};

function isSunday(dateStr) {
    const date = new Date(dateStr);
    return date.getDay() === 0; // 0 表示周日
}

// 通用渲染函数
function renderTable(list, tableId, headers) {
    const tbody = document.getElementById(list);
    const table = document.getElementById(tableId);
    tbody.innerHTML = '';
    if (attendanceRecords.length === 0) {
        tbody.innerHTML = '<tr><td colspan="' + headers.length + '">无签到记录</td></tr>';
    } else {
        attendanceRecords.forEach(record => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${record.date}</td>
                <td>${groupNames[record.group] || record.group}</td>
                <td>${record.member}</td>
                <td>${record.time}</td>
            `;
            tbody.appendChild(row);
        });
    }
    table.style.display = 'table';
}

// 签到记录
function renderSummary() {
    renderTable('summaryList', 'summaryTable', ['日期', '组别', '姓名', '时间']);
}

// 导出 CSV 文件
function exportToCSV(data, filename) {
    const csv = [];
    const headers = ['日期,组别,姓名,时间\n'].join('');
    csv.push(headers);
    data.forEach(row => {
        csv.push(`${row.date},${groupNames[row.group] || row.group},${row.member},${row.time}\n`);
    });
    const csvContent = csv.join('');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// 每日报表
function generateDailyReportSummary(date) {
    const todayRecords = attendanceRecords.filter(record => record.date === date);
    const totalSigned = todayRecords.length;
    const reportDateElement = document.getElementById('reportDate');
    if (reportDateElement) {
        reportDateElement.textContent = `日期：${date}（总签到人数：${totalSigned}人）`;
    } else {
        console.error("Element 'reportDate' not found in the DOM.");
    }

    dailyReportList.innerHTML = '';
    for (let group in groups) {
        const groupRecords = todayRecords.filter(record => record.group === group);
        const groupMembers = groups[group].map(member => member.name); // 提取成员姓名作为字符串数组
        const signedMembers = groupRecords.map(record => record.member); // 签到成员姓名数组
        const unsignedMembers = groupMembers.filter(member => !signedMembers.includes(member)); // 过滤未签到成员

        const early = [];
        const onTime = [];
        const late = [];
        groupRecords.forEach(record => {
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
    dailyReportTable.style.display = 'table';
    exportDailyReport.style.display = 'inline-block';
}

// 季度报表
function generateQuarterlyReportSummary(year, quarter) {
    const startMonth = (quarter - 1) * 3;
    const endMonth = startMonth + 2;
    const sundayRecords = attendanceRecords.filter(record => {
        const date = new Date(record.date);
        return isSunday(record.date) &&
               date.getFullYear() === parseInt(year) &&
               date.getMonth() >= startMonth && date.getMonth() <= endMonth;
    });
    renderTable('quarterlyReportList', 'quarterlyReportTable', ['日期', '组别', '姓名', '时间']);
    exportQuarterlyReport.style.display = 'inline-block';
}

// 年度报表
function generateYearlyReportSummary(year) {
    const sundayRecords = attendanceRecords.filter(record => {
        const date = new Date(record.date);
        return isSunday(record.date) && date.getFullYear() === parseInt(year);
    });
    renderTable('yearlyReportList', 'yearlyReportTable', ['日期', '组别', '姓名', '时间']);
    exportYearlyReport.style.display = 'inline-block';
    clearYearlyRecords.style.display = 'inline-block';
}

// 清空某年签到记录
function clearYearlyRecordsFunc(year) {
    const originalRecords = [...attendanceRecords];
    attendanceRecords = attendanceRecords.filter(record => {
        const date = new Date(record.date);
        return date.getFullYear() !== parseInt(year);
    });
    localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));
    logModification(`清空 ${year} 年的签到记录：${JSON.stringify(originalRecords.filter(r => new Date(r.date).getFullYear() === parseInt(year)))}`);
    generateYearlyReportSummary(year);
    alert(`已清空 ${year} 年的所有签到记录！`);
}

// 记录修改日志
function logModification(action) {
    let modificationLogs = JSON.parse(localStorage.getItem('modificationLogs')) || [];
    const now = new Date().toLocaleString('zh-CN');
    modificationLogs.push({ date: now, action: action });
    localStorage.setItem('modificationLogs', JSON.stringify(modificationLogs));
}

// 事件监听
showAttendanceButton.addEventListener('click', () => {
    hideAllSections();
    renderSummary();
    exportDailyReport.style.display = 'none';
    exportQuarterlyReport.style.display = 'none';
    exportYearlyReport.style.display = 'none';
    clearYearlyRecords.style.display = 'none';
});

dailyReportButton.addEventListener('click', () => {
    hideAllSections();
    dailyReportSection.style.display = 'block';
    dailyDate.value = new Date().toISOString().split('T')[0];
    generateDailyReportSummary(dailyDate.value);
});

generateDailyReport.addEventListener('click', () => {
    generateDailyReportSummary(dailyDate.value);
});

exportDailyReport.addEventListener('click', () => {
    const date = dailyDate.value;
    const todayRecords = attendanceRecords.filter(record => record.date === date);
    exportToCSV(todayRecords, `日报表_${date}`);
});

quarterlyReportButton.addEventListener('click', () => {
    hideAllSections();
    quarterlyReportSection.style.display = 'block';
    generateQuarterlyReportSummary(quarterlyYear.value, quarterlyQuarter.value);
});

generateQuarterlyReport.addEventListener('click', () => {
    generateQuarterlyReportSummary(quarterlyYear.value, quarterlyQuarter.value);
});

exportQuarterlyReport.addEventListener('click', () => {
    const year = quarterlyYear.value;
    const quarter = quarterlyQuarter.value;
    const startMonth = (quarter - 1) * 3;
    const endMonth = startMonth + 2;
    const sundayRecords = attendanceRecords.filter(record => {
        const date = new Date(record.date);
        return isSunday(record.date) &&
               date.getFullYear() === parseInt(year) &&
               date.getMonth() >= startMonth && date.getMonth() <= endMonth;
    });
    exportToCSV(sundayRecords, `季度报表_${year}_Q${quarter}`);
});

yearlyReportButton.addEventListener('click', () => {
    hideAllSections();
    yearlyReportSection.style.display = 'block';
    generateYearlyReportSummary(yearlyYear.value);
});

generateYearlyReport.addEventListener('click', () => {
    generateYearlyReportSummary(yearlyYear.value);
});

exportYearlyReport.addEventListener('click', () => {
    const year = yearlyYear.value;
    const sundayRecords = attendanceRecords.filter(record => {
        const date = new Date(record.date);
        return isSunday(record.date) && date.getFullYear() === parseInt(year);
    });
    exportToCSV(sundayRecords, `年度报表_${year}`);
});

clearYearlyRecords.addEventListener('click', () => {
    const year = yearlyYear.value;
    if (confirm(`确定清空 ${year} 年的所有签到记录吗？这将影响相关报表！`)) {
        clearYearlyRecordsFunc(year);
    }
});

backButton.addEventListener('click', () => {
    window.location.href = "admin.html";
});

// 隐藏所有报表部分
function hideAllSections() {
    summaryTable.style.display = 'none';
    dailyReportSection.style.display = 'none';
    quarterlyReportSection.style.display = 'none';
    yearlyReportSection.style.display = 'none';
    exportDailyReport.style.display = 'none';
    exportQuarterlyReport.style.display = 'none';
    exportYearlyReport.style.display = 'none';
    clearYearlyRecords.style.display = 'none';
}

// 初始隐藏所有报表
hideAllSections();
renderSummary();

const db = firebase.firestore();