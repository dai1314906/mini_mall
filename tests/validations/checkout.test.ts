import { describe, expect, it } from "vitest";
import { checkoutSchema } from "@/lib/validations/checkout";

const valid = {
  receiverName: "张三",
  receiverPhone: "13800138000",
  receiverAddress: "北京市朝阳区某某街道 1 号",
};

describe("checkoutSchema 结算表单校验", () => {
  it("接受合法输入", () => {
    expect(checkoutSchema.safeParse(valid).success).toBe(true);
  });

  it("拒绝过短收货人", () => {
    expect(checkoutSchema.safeParse({ ...valid, receiverName: "张" }).success).toBe(false);
  });

  it("拒绝非法手机号", () => {
    expect(checkoutSchema.safeParse({ ...valid, receiverPhone: "12345" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...valid, receiverPhone: "23800138000" }).success).toBe(false);
  });

  it("拒绝过短地址", () => {
    expect(checkoutSchema.safeParse({ ...valid, receiverAddress: "北京" }).success).toBe(false);
  });
});
