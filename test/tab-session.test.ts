import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  accountCards,
  hintSub,
  isTabContextId,
  maskEmail,
  maskPhone,
  multiAccountTabsEnabled,
  planAddAccount,
  planAuthorize,
  planLogout,
  planResume,
  planRoleSwitch,
  resolveAccess,
  tabBootstrapScript,
  type AccountRecord,
  type BrokerState,
} from "../src/auth/tab-session";

const TAB_A = "tabcontextaaaaaa01";
const TAB_B = "tabcontextbbbbbb02";
const TAB_C = "tabcontextcccccc03";

function account(partial: Partial<AccountRecord> & Pick<AccountRecord, "sessionId" | "userId">): AccountRecord {
  return {
    active: true,
    grantedRoles: ["STUDENT"],
    defaultRole: "STUDENT",
    pendingReview: false,
    authTimeSec: 1_700_000_000,
    display: {
      name: partial.userId,
      kkNumber: null,
      emailMasked: maskEmail(`${partial.userId}@example.com`),
      phoneMasked: "",
      avatarUrl: "",
      subHint: hintSub(partial.userId),
    },
    ...partial,
  };
}

function state(accounts: AccountRecord[], extra: Partial<BrokerState> = {}): BrokerState {
  return {
    explicitPick: accounts.filter((item) => item.active).length > 1,
    defaultSessionId: null,
    accounts,
    tabs: [],
    ...extra,
  };
}

const admin = account({
  sessionId: "sess-admin",
  userId: "usr_admin",
  grantedRoles: ["ADMIN", "TEACHER"],
  defaultRole: "ADMIN",
  display: {
    name: "站长",
    kkNumber: "100",
    emailMasked: "a***@yyds.local",
    phoneMasked: "138****0000",
    avatarUrl: "",
    subHint: "usr_ad…min",
  },
});
const teacher = account({
  sessionId: "sess-teacher",
  userId: "usr_teacher",
  grantedRoles: ["TEACHER"],
  defaultRole: "TEACHER",
  display: {
    name: "老师",
    kkNumber: "101",
    emailMasked: "t***@yyds.local",
    phoneMasked: "",
    avatarUrl: "",
    subHint: "usr_te…her",
  },
});
const student = account({
  sessionId: "sess-student",
  userId: "usr_student",
  grantedRoles: ["STUDENT"],
  defaultRole: "STUDENT",
  display: {
    name: "学生",
    kkNumber: "102",
    emailMasked: "s***@yyds.local",
    phoneMasked: "",
    avatarUrl: "",
    subHint: "usr_st…ent",
  },
});
const parent = account({
  sessionId: "sess-parent",
  userId: "usr_parent",
  grantedRoles: ["PARENT"],
  defaultRole: "PARENT",
});
const member = account({
  sessionId: "sess-member",
  userId: "usr_member",
  grantedRoles: ["STUDENT"],
  defaultRole: "STUDENT",
});

describe("tab session decisions", () => {
  it("masks contact details and rejects short context ids", () => {
    assert.equal(maskEmail("Admin@YYDS.local"), "a***@yyds.local");
    assert.equal(maskPhone("13800138000"), "138****8000");
    assert.equal(hintSub("usr_9F3K2M7QX4T8BVZ1"), "usr_9F…BVZ1");
    assert.equal(isTabContextId("short"), false);
    assert.equal(isTabContextId(TAB_A), true);
    assert.equal(multiAccountTabsEnabled({ MULTI_ACCOUNT_TABS: "0" }), false);
    assert.equal(multiAccountTabsEnabled({}), true);
  });

  it("keeps five tabs on five users and ignores the shared cookie once a device exists", () => {
    const device = state([admin, teacher, student, parent, member], {
      tabs: [
        { contextId: TAB_A, sessionId: admin.sessionId, activeRole: "ADMIN", revoked: false },
        { contextId: TAB_B, sessionId: teacher.sessionId, activeRole: "TEACHER", revoked: false },
        { contextId: TAB_C, sessionId: student.sessionId, activeRole: "STUDENT", revoked: false },
      ],
    });
    const a = resolveAccess(device, { tabHeader: TAB_A });
    const b = resolveAccess(device, { tabHeader: TAB_B });
    assert.equal(a.kind, "ready");
    assert.equal(b.kind, "ready");
    if (a.kind === "ready" && b.kind === "ready") {
      assert.equal(a.account.userId, "usr_admin");
      assert.equal(b.account.userId, "usr_teacher");
      assert.deepEqual(a.permissionRoles, ["ADMIN"]);
      assert.notDeepEqual(a.account.userId, b.account.userId);
    }
    assert.equal(resolveAccess(device, { tabHeader: null }).kind, "ambiguous");
    assert.equal(resolveAccess(null, { tabHeader: null }).kind, "legacy");
  });

  it("does not let a tab switch or logout change another tab", () => {
    let device = state([admin, teacher], {
      tabs: [
        { contextId: TAB_A, sessionId: admin.sessionId, activeRole: "ADMIN", revoked: false },
        { contextId: TAB_B, sessionId: teacher.sessionId, activeRole: "TEACHER", revoked: false },
      ],
    });
    const switched = planRoleSwitch(device, { contextId: TAB_A, role: "TEACHER" });
    assert.equal(switched.decision.kind, "ready");
    if (switched.decision.kind === "ready") assert.deepEqual(switched.decision.permissionRoles, ["TEACHER"]);
    device = {
      ...device,
      tabs: device.tabs.map((tab) =>
        tab.contextId === TAB_A ? { ...tab, activeRole: "TEACHER" } : tab,
      ),
    };
    const loggedOut = planLogout(device, { scope: "tab", contextId: TAB_A });
    assert.deepEqual(loggedOut.mutations, [{ op: "clear-tab", contextId: TAB_A }]);
    const teacherStill = resolveAccess(
      { ...device, tabs: device.tabs.filter((tab) => tab.contextId !== TAB_A) },
      { tabHeader: TAB_B },
    );
    assert.equal(teacherStill.kind, "ready");
    if (teacherStill.kind === "ready") assert.equal(teacherStill.account.userId, "usr_teacher");
  });

  it("requires an explicit pick for a new tab when several accounts are signed in", () => {
    const device = state([admin, teacher], {
      tabs: [{ contextId: TAB_A, sessionId: admin.sessionId, activeRole: "ADMIN", revoked: false }],
    });
    const fresh = planResume(device, { contextId: TAB_C });
    assert.equal(fresh.decision.kind, "ambiguous");
    assert.equal(fresh.mutations.length, 0);
    const picked = planResume(device, { contextId: TAB_C, selectSessionId: student.sessionId });
    assert.equal(picked.decision.kind, "ambiguous");
    const ok = planResume(device, { contextId: TAB_C, selectSessionId: teacher.sessionId });
    assert.equal(ok.decision.kind, "ready");
    if (ok.decision.kind === "ready") assert.equal(ok.decision.account.userId, "usr_teacher");
  });

  it("clones the account choice for a duplicated tab but keeps a new context", () => {
    const device = state([admin, teacher], {
      tabs: [{ contextId: TAB_A, sessionId: admin.sessionId, activeRole: "TEACHER", revoked: false }],
    });
    const cloned = planResume(device, { contextId: TAB_B, cloneFrom: TAB_A });
    assert.equal(cloned.mutations[0]?.op, "bind");
    if (cloned.mutations[0]?.op === "bind") {
      assert.equal(cloned.mutations[0].contextId, TAB_B);
      assert.equal(cloned.mutations[0].sessionId, admin.sessionId);
      assert.notEqual(cloned.mutations[0].contextId, TAB_A);
    }
    const logoutCopy = planLogout(device, { scope: "tab", contextId: TAB_B });
    assert.deepEqual(logoutCopy.mutations, [{ op: "clear-tab", contextId: TAB_B }]);
    assert.equal(resolveAccess(device, { tabHeader: TAB_A }).kind, "ready");
  });

  it("adds a second account without revoking the first", () => {
    const first = planAddAccount(null, { contextId: TAB_A, account: admin });
    assert.equal(first.state.explicitPick, false);
    const second = planAddAccount(first.state, { contextId: TAB_B, account: teacher });
    assert.equal(second.state.accounts.length, 2);
    assert.equal(second.state.explicitPick, true);
    assert.equal(second.mutations.some((item) => item.op === "revoke-session"), false);
    assert.equal(second.state.accounts.some((item) => item.userId === "usr_admin"), true);
  });

  it("issues oauth codes only for the posted or already bound account", () => {
    const device = state([admin, teacher]);
    const ambiguous = planAuthorize({ state: device, tabHeader: null, prompt: "" });
    assert.equal(ambiguous.kind, "select");
    const hinted = planAuthorize({
      state: device,
      tabHeader: null,
      prompt: "",
      postedSessionId: null,
    });
    assert.notEqual(hinted.kind, "issue");
    const posted = planAuthorize({
      state: device,
      postedSessionId: teacher.sessionId,
    });
    assert.deepEqual(posted, { kind: "issue", sessionId: teacher.sessionId, userId: teacher.userId });
    const foreign = planAuthorize({ state: device, postedSessionId: "sess-stranger" });
    assert.equal(foreign.kind, "select");
    const bound = planAuthorize({
      state: {
        ...device,
        tabs: [{ contextId: TAB_A, sessionId: admin.sessionId, activeRole: "ADMIN", revoked: false }],
      },
      tabHeader: TAB_A,
    });
    assert.equal(bound.kind, "issue");
    if (bound.kind === "issue") assert.equal(bound.userId, "usr_admin");
    const selectPrompt = planAuthorize({
      state: device,
      tabHeader: TAB_A,
      prompt: "select_account",
    });
    assert.equal(selectPrompt.kind, "select");
  });

  it("keeps two concurrent authorize attempts from exchanging users", () => {
    const device = state([admin, student]);
    const tabA = planAuthorize({ state: device, postedSessionId: admin.sessionId });
    const tabB = planAuthorize({ state: device, postedSessionId: student.sessionId });
    assert.equal(tabA.kind, "issue");
    assert.equal(tabB.kind, "issue");
    if (tabA.kind === "issue" && tabB.kind === "issue") {
      assert.notEqual(tabA.sessionId, tabB.sessionId);
      assert.equal(tabA.userId, "usr_admin");
      assert.equal(tabB.userId, "usr_student");
    }
  });

  it("refuses forged context ids, stale sessions, and prompt=none guessing", () => {
    const device = state([admin, teacher], {
      tabs: [{ contextId: TAB_A, sessionId: "sess-dead", activeRole: "", revoked: false }],
    });
    assert.equal(resolveAccess(device, { tabHeader: "nope" }).kind, "anonymous");
    assert.equal(resolveAccess(device, { tabHeader: TAB_A }).kind, "anonymous");
    const none = planAuthorize({ state: device, prompt: "none" });
    assert.deepEqual(none, { kind: "error", error: "account_selection_required" });
    const login = planAuthorize({ state: state([admin]), prompt: "login", tabHeader: null });
    assert.deepEqual(login, { kind: "login", reason: "prompt_login" });
    const stale = planAuthorize({
      state: state([{ ...admin, authTimeSec: 100 }]),
      tabHeader: null,
      nowSec: 10_000,
      maxAgeSec: 60,
    });
    assert.deepEqual(stale, { kind: "login", reason: "max_age" });
  });

  it("removes one account or the whole browser without a fake sub", () => {
    const device = state([admin, teacher], {
      tabs: [
        { contextId: TAB_A, sessionId: admin.sessionId, activeRole: "ADMIN", revoked: false },
        { contextId: TAB_B, sessionId: teacher.sessionId, activeRole: "TEACHER", revoked: false },
      ],
    });
    const one = planLogout(device, { scope: "account", contextId: TAB_A });
    assert.deepEqual(one.mutations, [{ op: "revoke-session", sessionId: admin.sessionId }]);
    const all = planLogout(device, { scope: "browser" });
    assert.equal(all.mutations.filter((item) => item.op === "revoke-session").length, 2);
    assert.equal(all.mutations.some((item) => item.op === "revoke-device"), true);
    const cards = accountCards(device);
    assert.equal(cards.some((card) => "token" in card), false);
    assert.equal(JSON.stringify(cards).includes("secret"), false);
  });

  it("ships a bootstrap script that stamps the tab header and not a token", () => {
    const script = tabBootstrapScript();
    assert.match(script, /x-yyds-tab/);
    assert.match(script, /sessionStorage/);
    assert.doesNotMatch(script, /access_token|refresh_token|client_secret/i);
  });
});
