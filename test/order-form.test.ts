import { test } from "node:test";
import assert from "node:assert/strict";

import {
  activeOrderFormFields,
  answersComplete,
  parseOrderForm,
  parseStoredAnswers,
  stringifyOrderForm,
  validateOrderFormAnswers,
} from "../src/validation/order-form";

const CONFIG_JSON = stringifyOrderForm({
  enabled: true,
  title: "请填写收货信息",
  fields: [
    {
      id: "name",
      label: "收货人",
      placeholder: "",
      type: "text",
      required: true,
      enabled: true,
      options: [],
    },
    {
      id: "size",
      label: "尺码",
      placeholder: "",
      type: "select",
      required: false,
      enabled: true,
      options: ["S", "M"],
    },
  ],
});

test("空配置与坏 JSON 都回落到默认关闭，不阻断下单", () => {
  assert.equal(parseOrderForm(null).enabled, false);
  assert.equal(parseOrderForm("{ not json").enabled, false);
  assert.deepEqual(parseOrderForm("").fields, []);
});

test("旧配置缺 enabled 字段时默认启用，站长配置不会突然消失", () => {
  const parsed = parseOrderForm(
    JSON.stringify({
      enabled: true,
      title: "t",
      fields: [{ id: "a", label: "备注", type: "text" }],
    }),
  );
  assert.equal(parsed.fields[0].enabled, true);
  assert.equal(activeOrderFormFields(parsed).length, 1);
});

test("必填缺失与非法 select 选项都要拦下", () => {
  const config = parseOrderForm(CONFIG_JSON);
  assert.equal(validateOrderFormAnswers(config, {}).ok, false);
  assert.equal(
    validateOrderFormAnswers(config, { name: "张三", size: "XL" }).ok,
    false,
  );

  const ok = validateOrderFormAnswers(config, { name: "张三", size: "M" });
  assert.equal(ok.ok, true);
  assert.equal(ok.ok && ok.stored.labels.name, "收货人");
});

test("历史扁平答案也能读出来", () => {
  assert.deepEqual(parseStoredAnswers('{"name":"张三"}').values, {
    name: "张三",
  });
  assert.deepEqual(parseStoredAnswers(null), { values: {}, labels: {} });

  const config = parseOrderForm(CONFIG_JSON);
  assert.equal(answersComplete(config, '{"values":{"name":"张三"}}'), true);
  assert.equal(answersComplete(config, '{"values":{}}'), false);
});
