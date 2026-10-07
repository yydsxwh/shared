import assert from "node:assert/strict";
import test from "node:test";

import { catalogEntry } from "../src/contracts/config";
import {
  applyWechatFieldMap,
  inspectWechatFieldMap,
  assertAudienceAllowed,
  assertSafeNotificationLink,
  explainDeliveryStatus,
  forumReplyEventId,
  lowBalanceDedupeKey,
  mainlandPhone,
  NOTIFICATION_EVENT_CATALOG,
  NOTIFICATION_EVENT_TYPES,
  pickTemplateData,
  preferenceCategoryFor,
  privacyViolation,
  routeFor,
  suggestWechatFieldRows,
  wechatPreferenceAllows,
  yuanFromCents,
} from "../src/contracts/notifications";

test("通知密钥不能进浏览器，也不能下发给产品", () => {
  for (const key of [
    "notifications.wechat.officialAccount.appSecret",
    "notifications.wechat.miniProgram.appSecret",
    "sms.tencent.secretKey",
    "sms.tencent.secretId",
  ]) {
    const entry = catalogEntry(key);
    assert.ok(entry, key);
    assert.equal(entry!.sensitivity, "SECRET");
    assert.equal(entry!.clientVisibility, "SERVER_ONLY");
    assert.equal(entry!.runtimeDeliverable, false);
    assert.equal(entry!.builtinDefault, undefined);
  }
});

test("续费短信默认开启，私密异议默认不发短信，站内始终开启", () => {
  assert.equal(routeFor("ACADEMIC_LOW_BALANCE_RENEWAL_ALERT", "").sms, true);
  assert.equal(routeFor("ACADEMIC_PRIVATE_ADMIN_ALERT", "").sms, false);
  assert.equal(routeFor("ACADEMIC_PRIVATE_ADMIN_ALERT", "").inApp, true);
  const overridden = routeFor(
    "ACADEMIC_PRIVATE_ADMIN_ALERT",
    JSON.stringify({ ACADEMIC_PRIVATE_ADMIN_ALERT: { wechat: true, sms: true, inApp: false } }),
  );
  assert.equal(overridden.sms, true);
  assert.equal(overridden.inApp, true, "站内通知不能被路由关掉");
});

test("老师和学生的价格字段会被拦住", () => {
  assert.ok(privacyViolation("TEACHER", { availableBalance: "10" }));
  assert.equal(privacyViolation("ADMIN", { availableBalance: "10" }), null);
  assert.ok(privacyViolation("STUDENT", { teacherCostCents: "1" }));
  assert.equal(privacyViolation("TEACHER", { courseName: "高数" }), null);
  assert.match(assertAudienceAllowed("ACADEMIC_PRIVATE_ADMIN_ALERT", "TEACHER") ?? "", /不能发给/);
  assert.equal(assertAudienceAllowed("ACADEMIC_PRIVATE_ADMIN_ALERT", "ADMIN"), null);
});

test("模板缺字段不发半截，字段映射不能执行表达式", () => {
  const missing = pickTemplateData("ACADEMIC_LOW_BALANCE_RENEWAL_ALERT", { learnerName: "甲" });
  assert.equal(missing.ok, false);
  const ok = pickTemplateData("ACADEMIC_LOW_BALANCE_RENEWAL_ALERT", {
    learnerName: "甲",
    availableBalance: "64.00",
    courseName: "高数",
    teacherCostCents: "999",
  });
  assert.equal(ok.ok, true);
  if (ok.ok) assert.equal(ok.data.teacherCostCents, undefined);
  const mapped = applyWechatFieldMap({ thing1: "learnerName", amount2: "availableBalance" }, {
    learnerName: "甲",
    availableBalance: "64.00",
    courseName: "高数",
  }, ["learnerName", "availableBalance", "courseName"]);
  assert.equal(mapped.ok, true);
  const evil = applyWechatFieldMap({ thing1: "learnerName;process.exit()" }, { learnerName: "甲" }, ["learnerName"]);
  assert.equal(evil.ok, false);
});

test("通知链接拒绝外站和 javascript", () => {
  assert.equal(assertSafeNotificationLink({ webUrl: "javascript:alert(1)", allowedOrigins: [] }).ok, false);
  assert.equal(assertSafeNotificationLink({ webUrl: "https://evil.example/a", allowedOrigins: ["https://yydsxwh.com"] }).ok, false);
  const relative = assertSafeNotificationLink({ webUrl: "/forum/post/1", allowedOrigins: [] });
  assert.equal(relative.ok, true);
  assert.equal(assertSafeNotificationLink({ miniProgramPage: "https://evil.example", allowedOrigins: [] }).ok, false);
  const page = assertSafeNotificationLink({ miniProgramPage: "/pages/forum/post?id=1", allowedOrigins: [] });
  assert.equal(page.ok, true);
  if (page.ok) assert.equal(page.miniProgramPage, "pages/forum/post?id=1");
});

test("手机号、去重键和金额格式", () => {
  assert.deepEqual(mainlandPhone("13800138000"), { e164: "+8613800138000", domestic: "13800138000" });
  assert.equal(mainlandPhone("+8613800138000")?.e164, "+8613800138000");
  assert.equal(mainlandPhone("+14155552671"), null);
  assert.equal(forumReplyEventId("c1", "usr_a"), forumReplyEventId("c1", "usr_a"));
  assert.notEqual(forumReplyEventId("c1", "usr_a"), forumReplyEventId("c1", "usr_b"));
  assert.equal(lowBalanceDedupeKey("cust", 2), "academic-low-balance:cust:2");
  assert.equal(yuanFromCents(640000), "6400.00");
});

test("站长私信只允许摘要字段，不能把整段聊天塞进微信", () => {
  const entry = catalogEntry("notifications.wechat.officialAccount.template.siteOwnerDirectMessage");
  assert.equal(entry?.sensitivity, "INTERNAL");
  const picked = pickTemplateData("SITE_OWNER_DIRECT_MESSAGE", {
    senderName: "站长",
    messageExcerpt: "这是一条测试",
    occurredAt: "10-02 12:00",
    body: "完整正文不该出现",
  });
  assert.equal(picked.ok, true);
  if (picked.ok) {
    assert.equal(picked.data.body, undefined);
    assert.equal(picked.data.messageExcerpt, "这是一条测试");
  }
  assert.equal(assertAudienceAllowed("SITE_OWNER_DIRECT_MESSAGE", "STUDENT"), null);
  assert.equal(routeFor("SITE_OWNER_DIRECT_MESSAGE", "").wechat, true);
  assert.equal(routeFor("SITE_OWNER_DIRECT_MESSAGE", "").sms, false);
  assert.equal(routeFor("SITE_OWNER_DIRECT_MESSAGE", "").inApp, true);
});

test("事件目录覆盖全部事件，课程公告不带价格字段", () => {
  assert.equal(NOTIFICATION_EVENT_TYPES.length, Object.keys(NOTIFICATION_EVENT_CATALOG).length);
  const course = NOTIFICATION_EVENT_CATALOG.COURSE_TEACHER_ANNOUNCEMENT;
  assert.equal(course.productId, "course");
  assert.equal(course.preferenceCategory, "course");
  assert.equal(preferenceCategoryFor("KKCHAT_MESSAGE_RECEIVED"), "chat");
  assert.deepEqual(course.fields, ["courseName", "summary", "occurredAt"]);
  assert.equal(course.fields.includes("availableBalance"), false);
  assert.equal(routeFor("COURSE_TEACHER_ANNOUNCEMENT", "").wechat, true);
  assert.equal(routeFor("COURSE_TEACHER_ANNOUNCEMENT", "").sms, false);
  const picked = pickTemplateData("COURSE_TEACHER_ANNOUNCEMENT", {
    courseName: "高数",
    summary: "今晚课前看公告",
    occurredAt: "10-03 18:00",
    teacherCostCents: "1",
  });
  assert.equal(picked.ok, true);
  if (picked.ok) assert.equal(picked.data.teacherCostCents, undefined);
  const rows = suggestWechatFieldRows("COURSE_TEACHER_ANNOUNCEMENT");
  assert.deepEqual(rows.map((row) => row.systemField), ["courseName", "summary", "occurredAt"]);
  assert.equal(rows.some((row) => row.wechatField.startsWith("thing")), true);
  assert.match(explainDeliveryStatus("SENT"), /不代表/);
  assert.match(explainDeliveryStatus("NOT_CONFIGURED"), /微信公众平台/);
});

test("用户可以关掉聊天微信，站长告警仍可绕过偏好", () => {
  const prefs = { inApp: true, wechat: true, sms: false, categories: { chat: false, course: true } };
  assert.equal(wechatPreferenceAllows(prefs, "KKCHAT_MESSAGE_RECEIVED", true), false);
  assert.equal(wechatPreferenceAllows(prefs, "COURSE_TEACHER_ANNOUNCEMENT", true), true);
  assert.equal(wechatPreferenceAllows(prefs, "KKCHAT_MESSAGE_RECEIVED", false), true);
  assert.equal(wechatPreferenceAllows({ inApp: true, wechat: false, sms: false }, "ACADEMIC_PRIVATE_ADMIN_ALERT", true), false);
});

test("站长字段映射拒绝重复、非法字段名和越权数据", () => {
  const ok = inspectWechatFieldMap("ACADEMIC_LOW_BALANCE_RENEWAL_ALERT", [
    { wechatField: "thing1", systemField: "learnerName" },
    { wechatField: "amount2", systemField: "availableBalance" },
    { wechatField: "", systemField: "" },
  ]);
  assert.equal(ok.ok, true);
  if (ok.ok) assert.deepEqual(ok.map, { thing1: "learnerName", amount2: "availableBalance" });
  assert.equal(inspectWechatFieldMap("ACADEMIC_LOW_BALANCE_RENEWAL_ALERT", [
    { wechatField: "thing1", systemField: "learnerName" },
    { wechatField: "thing1", systemField: "courseName" },
  ]).ok, false);
  const badName = inspectWechatFieldMap("ACADEMIC_PRIVATE_ADMIN_ALERT", [
    { wechatField: "1bad", systemField: "summary" },
  ]);
  assert.equal(badName.ok, false);
  if (!badName.ok) assert.equal(badName.message, "微信字段名不合法");
  const leaked = inspectWechatFieldMap("ACADEMIC_SESSION_USAGE_CONFIRMED", [
    { wechatField: "thing1", systemField: "availableBalance" },
  ]);
  assert.equal(leaked.ok, false);
  const threshold = catalogEntry("notifications.academic.lowBalanceThresholdCents");
  assert.equal(threshold?.valueType, "number");
  assert.equal(threshold?.builtinDefault, "10000");
  assert.equal(threshold?.sensitivity, "INTERNAL");
});
