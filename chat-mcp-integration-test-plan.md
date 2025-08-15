# 🧪 Chat MCP Integration Test Plan

**Test Date:** _______________  
**Tester:** _______________  
**Application Version:** _______________  
**MCP Server Status:** _______________  

---

## 📋 Pre-Test Setup Checklist

- [ ] Main Tasky application is running
- [ ] MCP server is running on port 7844
- [ ] Chat module is accessible
- [ ] No existing tasks/reminders (or document current state)
- [ ] Console/DevTools open for debugging logs

**Setup Notes:**
```
Current Tasks: _______________
Current Reminders: _______________
Console Logs Visible: _______________
```

---

## 🎯 Test Categories

### **Category 1: Task Management**

#### **Test 1.1: Task Creation - Basic**
**Input:** `"Create a task called 'Test Task 1' with description 'This is a test task'"`

**Expected Result:** Task created with title "Test Task 1" and description "This is a test task"

**Actual Result:** 
```
✅ Pass / ❌ Fail

AI Response: _______________

Tool Called: _______________
Parameters Passed: _______________
MCP Response: _______________
Task Created: _______________
Notification Shown: _______________
```

**Console Logs:**
```
[MCP] Executing tool: _______________
[MCP] Parameters: _______________
[MCP] Sending request to MCP server: _______________
```

---

#### **Test 1.2: Task Creation - Complex**
**Input:** `"Create a task titled 'Complex Task' with description 'Multi-line description here' due tomorrow with tags work and urgent"`

**Expected Result:** Task created with all specified properties

**Actual Result:** 
```
✅ Pass / ❌ Fail

AI Response: _______________
Task Title: _______________
Task Description: _______________
Due Date: _______________
Tags: _______________
```

---

#### **Test 1.3: Task Listing**
**Input:** `"List all my tasks"`

**Expected Result:** Display of all existing tasks

**Actual Result:** 
```
✅ Pass / ❌ Fail

AI Response: _______________
Number of Tasks Listed: _______________
Task Details Shown: _______________
```

---

#### **Test 1.4: Task Listing with Filter**
**Input:** `"Show me all pending tasks"`

**Expected Result:** Only pending tasks displayed

**Actual Result:** 
```
✅ Pass / ❌ Fail

AI Response: _______________
Filter Applied: _______________
Results: _______________
```

---

#### **Test 1.5: Task Update - Status**
**Input:** `"Mark task 'Test Task 1' as in progress"`

**Expected Result:** Task status updated to IN_PROGRESS

**Actual Result:** 
```
✅ Pass / ❌ Fail

AI Response: _______________
Task Found: _______________
Status Updated: _______________
```

---

#### **Test 1.6: Task Update - Content**
**Input:** `"Update task 'Test Task 1' to have description 'Updated description'"`

**Expected Result:** Task description updated

**Actual Result:** 
```
✅ Pass / ❌ Fail

AI Response: _______________
Task Found: _______________
Description Updated: _______________
```

---

#### **Test 1.7: Task Execution**
**Input:** `"Start working on task 'Test Task 1'"`

**Expected Result:** Task executed and status set to IN_PROGRESS

**Actual Result:** 
```
✅ Pass / ❌ Fail

AI Response: _______________
Task Executed: _______________
External Agent Launched: _______________
```

---

#### **Test 1.8: Task Deletion**
**Input:** `"Delete task 'Test Task 1'"`

**Expected Result:** Task removed from system

**Actual Result:** 
```
✅ Pass / ❌ Fail

AI Response: _______________
Task Found: _______________
Task Deleted: _______________
UI Updated: _______________
```

---

### **Category 2: Reminder Management**

#### **Test 2.1: Reminder Creation - Relative Time**
**Input:** `"Remind me to call mom in 10 minutes"`

**Expected Result:** One-time reminder created for "call mom" in 10 minutes

**Actual Result:** 
```
✅ Pass / ❌ Fail

AI Response: _______________
Reminder Message: _______________
Time Setting: _______________
One-Time Setting: _______________
Days Array: _______________
```

---

#### **Test 2.2: Reminder Creation - Specific Time**
**Input:** `"Remind me to take medicine at 2:00 PM every day"`

**Expected Result:** Daily recurring reminder at 14:00

**Actual Result:** 
```
✅ Pass / ❌ Fail

AI Response: _______________
Reminder Message: _______________
Time: _______________
Days: _______________
Recurring: _______________
```

---

#### **Test 2.3: Reminder Creation - Specific Days**
**Input:** `"Remind me to submit timesheet every Friday at 5 PM"`

**Expected Result:** Weekly reminder on Fridays at 17:00

**Actual Result:** 
```
✅ Pass / ❌ Fail

AI Response: _______________
Message: _______________
Time: _______________
Days: _______________
```

---

#### **Test 2.4: Reminder Listing**
**Input:** `"List all my reminders"`

**Expected Result:** Display of all existing reminders

**Actual Result:** 
```
✅ Pass / ❌ Fail

AI Response: _______________
Number of Reminders: _______________
Details Shown: _______________
```

---

#### **Test 2.5: Reminder Update - Message**
**Input:** `"Update reminder 'call mom' to 'call mom and dad'"`

**Expected Result:** Reminder message updated

**Actual Result:** 
```
✅ Pass / ❌ Fail

AI Response: _______________
Reminder Found: _______________
Message Updated: _______________
```

---

#### **Test 2.6: Reminder Update - Time**
**Input:** `"Change the 'call mom' reminder time to 3 PM"`

**Expected Result:** Reminder time updated to 15:00

**Actual Result:** 
```
✅ Pass / ❌ Fail

AI Response: _______________
Reminder Found: _______________
Time Updated: _______________
```

---

#### **Test 2.7: Reminder Enable/Disable**
**Input:** `"Disable the 'call mom' reminder"`

**Expected Result:** Reminder disabled but not deleted

**Actual Result:** 
```
✅ Pass / ❌ Fail

AI Response: _______________
Reminder Found: _______________
Status Changed: _______________
```

---

#### **Test 2.8: Reminder Deletion**
**Input:** `"Delete the 'call mom' reminder"`

**Expected Result:** Reminder removed from system

**Actual Result:** 
```
✅ Pass / ❌ Fail

AI Response: _______________
Reminder Found: _______________
Reminder Deleted: _______________
```

---

### **Category 3: Error Handling & Edge Cases**

#### **Test 3.1: Invalid Task ID**
**Input:** `"Update task 'nonexistent-task' to completed"`

**Expected Result:** Error message about task not found

**Actual Result:** 
```
✅ Pass / ❌ Fail

AI Response: _______________
Error Handled: _______________
```

---

#### **Test 3.2: Invalid Reminder ID**
**Input:** `"Delete reminder 'nonexistent-reminder'"`

**Expected Result:** Error message about reminder not found

**Actual Result:** 
```
✅ Pass / ❌ Fail

AI Response: _______________
Error Handled: _______________
```

---

#### **Test 3.3: Malformed Request**
**Input:** `"Create task without title"`

**Expected Result:** Error or request for required information

**Actual Result:** 
```
✅ Pass / ❌ Fail

AI Response: _______________
Error Handling: _______________
```

---

#### **Test 3.4: MCP Server Offline**
**Prerequisite:** Stop MCP server  
**Input:** `"Create a task called 'Test'"`

**Expected Result:** Connection error message

**Actual Result:** 
```
✅ Pass / ❌ Fail

AI Response: _______________
Error Message: _______________
```

---

### **Category 4: Parameter Extraction**

#### **Test 4.1: Natural Language Parsing**
**Input:** `"I need a task for buying groceries tomorrow with high priority"`

**Expected Result:** Task created with extracted title, due date, and priority/tags

**Actual Result:** 
```
✅ Pass / ❌ Fail

Title Extracted: _______________
Due Date Extracted: _______________
Priority/Tags Extracted: _______________
```

---

#### **Test 4.2: Complex Sentence Structure**
**Input:** `"Please remind me that I should call the doctor about my appointment next Tuesday at 2 PM"`

**Expected Result:** Reminder created with proper message and time

**Actual Result:** 
```
✅ Pass / ❌ Fail

Message Extracted: _______________
Time Extracted: _______________
```

---

#### **Test 4.3: Multiple Parameters**
**Input:** `"Create a work task titled 'Review PR' with description 'Review pull request #123' due Friday tagged as urgent and review"`

**Expected Result:** All parameters correctly extracted and applied

**Actual Result:** 
```
✅ Pass / ❌ Fail

Title: _______________
Description: _______________
Due Date: _______________
Tags: _______________
```

---

### **Category 5: UI Integration**

#### **Test 5.1: Task Creation Notification**
**Input:** Create any task via chat

**Expected Result:** Notification appears with task name in title

**Actual Result:** 
```
✅ Pass / ❌ Fail

Notification Shown: _______________
Title Format: _______________
Body Content: _______________
```

---

#### **Test 5.2: Real-time UI Updates**
**Input:** Create/update/delete items via chat while Tasks tab is visible

**Expected Result:** UI updates immediately without refresh

**Actual Result:** 
```
✅ Pass / ❌ Fail

Tasks Tab Updated: _______________
Reminders Tab Updated: _______________
Real-time Sync: _______________
```

---

#### **Test 5.3: Tool Confirmation Flow**
**Input:** Any tool call that requires confirmation

**Expected Result:** Confirmation popup appears, works correctly

**Actual Result:** 
```
✅ Pass / ❌ Fail

Confirmation Shown: _______________
Accept Works: _______________
Cancel Works: _______________
```

---

## 📊 Test Summary

**Total Tests:** 23  
**Passed:** _____ / 23  
**Failed:** _____ / 23  
**Pass Rate:** _____%  

### **Critical Issues Found:**
```
1. _______________
2. _______________
3. _______________
```

### **Minor Issues Found:**
```
1. _______________
2. _______________
3. _______________
```

### **Performance Notes:**
```
Average Response Time: _______________
MCP Call Latency: _______________
UI Update Speed: _______________
```

---

## 🔧 Debug Information

### **Console Log Examples:**
```
[MCP] Executing tool: _______________
[MCP] Parameters: _______________
[MCP] Sending request to MCP server: _______________
Tool call response: _______________
```

### **Network Requests:**
```
MCP Server Requests: _______________
Response Times: _______________
Error Responses: _______________
```

### **Database State:**
```
Tasks Created: _______________
Reminders Created: _______________
Data Persistence: _______________
```

---

## ✅ Recommendations

### **High Priority Fixes:**
```
1. _______________
2. _______________
3. _______________
```

### **Medium Priority Improvements:**
```
1. _______________
2. _______________
3. _______________
```

### **Future Enhancements:**
```
1. _______________
2. _______________
3. _______________
```

---

**Test Completed By:** _______________  
**Date:** _______________  
**Sign-off:** _______________
