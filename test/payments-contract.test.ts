import { test } from "node:test";
import assert from "node:assert/strict";

import {
  PAYMENT_AMOUNT_MAX_CENTS,
  PAYMENT_AMOUNT_MIN_CENTS,
  isBoundedAmountCents,
  refundOccupiesQuota,
} from "../src/contracts/payments";
import { yuanToPaymentCents } from "../src/utils/money";

test("不认识的退款状态仍占用额度，只有明确失败才释放", () => {
  assert.equal(refundOccupiesQuota("PENDING"), true);
  assert.equal(refundOccupiesQuota("SUCCEEDED"), true);
  assert.equal(refundOccupiesQuota("PENDING_RECONCILIATION"), true);
  assert.equal(refundOccupiesQuota("SOME_FUTURE_STATUS"), true);
  assert.equal(refundOccupiesQuota("FAILED"), false);
});

test("金额边界：最小 1 分，最大 50 万元，拒绝小数分", () => {
  assert.equal(isBoundedAmountCents(PAYMENT_AMOUNT_MIN_CENTS), true);
  assert.equal(isBoundedAmountCents(PAYMENT_AMOUNT_MAX_CENTS), true);
  assert.equal(isBoundedAmountCents(0), false);
  assert.equal(isBoundedAmountCents(PAYMENT_AMOUNT_MAX_CENTS + 1), false);
  assert.equal(isBoundedAmountCents(1.5), false);
  assert.equal(yuanToPaymentCents("0.01"), 1);
  assert.equal(yuanToPaymentCents("500000"), PAYMENT_AMOUNT_MAX_CENTS);
  assert.throws(() => yuanToPaymentCents("500000.01"));
  assert.throws(() => yuanToPaymentCents("19.999"));
});
