# Firebase安全规则部署说明

**日期**: 2025-11-07

---

## ⚠️ 重要提示

修改 `firebase-database-rules.json` 文件后，需要将规则部署到Firebase服务器才能生效。

---

## 部署步骤

### 方法1: 使用Firebase控制台（推荐）

1. 访问 [Firebase Console](https://console.firebase.google.com/)
2. 选择您的项目
3. 点击左侧菜单 "Realtime Database"
4. 点击"规则"标签页
5. 复制 `firebase-database-rules.json` 的内容
6. 粘贴到规则编辑器中
7. 点击"发布"按钮

### 方法2: 使用Firebase CLI

```bash
# 确保已安装Firebase CLI
npm install -g firebase-tools

# 登录Firebase
firebase login

# 部署规则
firebase deploy --only database
```

---

## 当前需要部署的规则

已添加：
- `timestamp` 索引到 `attendanceRecords`
- `absenceCalc` 路径的读写权限
- `absenceEvents` 路径的读写权限

---

## 验证部署

部署成功后：
1. 控制台不应再显示索引警告
2. 缺勤计算工具应该能正常保存数据
3. 检查Firebase控制台规则页面，确认规则已更新

---

## 当前规则内容

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
      ".read": true,
      ".write": true
    }
  }
}
```

---

## 常见问题

**Q: 为什么修改规则文件后还是报错？**  
A: 规则文件只是本地文件，需要部署到Firebase服务器才能生效。

**Q: 部署后多久生效？**  
A: 通常立即生效，最多等待几秒钟。

**Q: 如何确认规则已生效？**  
A: 在Firebase控制台的"Realtime Database > 规则"页面查看当前生效的规则。

---


