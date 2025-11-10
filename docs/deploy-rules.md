# 🚨 立即部署Firebase规则

## 快速步骤

1. **访问Firebase控制台**
   - 网址: https://console.firebase.google.com/
   - 选择您的MSH项目

2. **打开规则编辑器**
   - 点击左侧 "Realtime Database"
   - 点击 "规则" 标签页

3. **复制并粘贴以下规则**

```json
{
  "rules": {
    "attendanceRecords": {
      ".indexOn": ["date", "time", "timestamp"],
      ".read": true,
      ".write": true
    },
    "groups": {
      ".read": true,
      ".write": true
    },
    "groupNames": {
      ".read": true,
      ".write": true
    },
    "excludedMembers": {
      ".read": true,
      ".write": true
    },
    "trackingRecords": {
      ".read": true,
      ".write": true
    },
    "personalTracking": {
      ".read": true,
      ".write": true
    },
    "dailyNewcomers": {
      ".read": true,
      ".write": true
    },
    "metadata": {
      ".read": true,
      ".write": true
    },
    "dailyReports": {
      ".read": true,
      ".write": true
    },
    "sundayTrackingWeekly": {
      ".read": true,
      ".write": true
    },
    "absenceCalc": {
      ".read": true,
      ".write": true
    },
    "absenceEvents": {
      ".indexOn": ["memberUUID"],
      ".read": true,
      ".write": true
    }
  }
}
```

4. **点击"发布"按钮**

5. **刷新计算工具页面，重新运行**

---

## 新增内容说明

本次更新添加了：
- ✅ `timestamp` 索引（性能优化）
- ✅ `absenceCalc` 路径（缺勤计算结果）
- ✅ `absenceEvents` 路径（缺勤事件）

---

